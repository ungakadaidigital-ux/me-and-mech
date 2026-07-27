import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { validate } from '../../middleware/validate';
import { verifyQStashSignature } from '../../middleware/verify-qstash';
import { asyncHandler } from '../../middleware/error-handler';
import { EngagementService } from './engagement.service';

export const engagementRouter = Router();

const registerTokenSchema = z.object({ fcm_token: z.string().min(10) });

// Client-facing: mobile app registers its own device token
engagementRouter.post(
  '/push-tokens',
  authenticate,
  attachRepositories,
  validate(registerTokenSchema),
  asyncHandler(async (req, res) => {
    await req.repos.pushTokens.register(req.auth!.workshopId, req.body.fcm_token);
    res.status(201).json({ success: true });
  }),
);

// Internal — QStash-invoked scheduled triggers, never called by a workshop directly
engagementRouter.post(
  '/internal/triggers/pending-payment-alert',
  verifyQStashSignature,
  asyncHandler(async (_req, res) => {
    const result = await new EngagementService().runPendingPaymentAlert();
    res.json({ success: true, data: result });
  }),
);

engagementRouter.post(
  '/internal/triggers/daily-summary',
  verifyQStashSignature,
  asyncHandler(async (_req, res) => {
    const result = await new EngagementService().runDailySummary();
    res.json({ success: true, data: result });
  }),
);

engagementRouter.post(
  '/internal/triggers/trial-reminder-sweep',
  verifyQStashSignature,
  asyncHandler(async (_req, res) => {
    const result = await new EngagementService().runTrialReminderSweep();
    res.json({ success: true, data: result });
  }),
);

engagementRouter.post(
  '/internal/triggers/onboarding-welcome',
  verifyQStashSignature,
  validate(z.object({ workshop_id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await new EngagementService().sendOnboardingWelcome(req.body.workshop_id);
    res.json({ success: true });
  }),
);
