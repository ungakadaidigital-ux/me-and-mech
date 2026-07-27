import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { verifyRazorpayWebhookSignature } from '../../lib/razorpay';
import { SubscriptionService } from './subscription.service';
import { logger } from '../../lib/logger';

export const subscriptionRouter = Router();

subscriptionRouter.post(
  '/subscription/create-order',
  authenticate,
  attachRepositories,
  validate(z.object({ plan_type: z.enum(['monthly', 'annual']) })),
  asyncHandler(async (req, res) => {
    const service = new SubscriptionService();
    const order = await service.createOrder(req.auth!.workshopId, req.body.plan_type);
    res.status(201).json({ success: true, data: order });
  }),
);

/**
 * GATED — Razorpay webhook. Signature is verified against req.rawBody,
 * captured by the global express.json() verify callback in app.ts — NOT
 * via a route-level express.raw() (that would never see the body; the
 * global JSON parser already consumes the request stream first). See
 * app.ts's comment on this for the full reasoning.
 */
subscriptionRouter.post(
  '/webhooks/razorpay',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody?.toString('utf-8');

    if (typeof signature !== 'string' || !rawBody || !verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Invalid Razorpay webhook signature', 401);
    }

    const payload = req.body; // already parsed by the global express.json()
    const eventType: string = payload.event;
    const razorpayEventId: string =
      (req.headers['x-razorpay-event-id'] as string) ??
      `${eventType}-${payload.payload?.subscription?.entity?.id ?? payload.payload?.payment?.entity?.id ?? Date.now()}`;

    try {
      const service = new SubscriptionService();
      await service.handleWebhook(eventType, razorpayEventId, payload);
    } catch (err) {
      // Log and STILL return 200 — per the locked "webhook always returns
      // 200 immediately" rule. A processing failure here should alert via
      // Sentry, not cause Razorpay to hammer retries.
      logger.error({ err: (err as Error).message, eventType, razorpayEventId }, 'Razorpay webhook processing failed');
    }

    res.status(200).json({ received: true });
  }),
);
