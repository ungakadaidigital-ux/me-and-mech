import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { NotificationService } from './notification.service';
import { logger } from '../../lib/logger';

export const watiWebhookRouter = Router();

/**
 * Wati webhook — no `authenticate` (this isn't a workshop's own request,
 * it's a server-to-server callback from Wati). Signature/secret
 * verification should be added once Wati's webhook signing scheme is
 * confirmed in the Wati dashboard for this account — flagged as a
 * pre-launch hardening item, not implemented as a guess here.
 */
watiWebhookRouter.post(
  '/webhooks/wati',
  asyncHandler(async (req, res) => {
    const service = new NotificationService();
    const body = req.body ?? {};

    // Inbound message — check for opt-out keyword (TRAI compliance)
    if (body.eventType === 'message' && body.type === 'text') {
      const text = String(body.text ?? '').trim().toUpperCase();
      const phone = body.waId ? `+${body.waId}` : undefined;
      if (text === 'STOP' && phone) {
        await service.handleInboundStop(phone);
        logger.info('WhatsApp opt-out processed');
      }
    }

    // Delivery / read receipts
    if (body.eventType === 'sentMessageDELIVERED' && body.id) {
      await service.handleDeliveryWebhook(body.id, 'delivered');
    }
    if (body.eventType === 'sentMessageREAD' && body.id) {
      await service.handleDeliveryWebhook(body.id, 'read');
    }

    res.status(200).json({ received: true });
  }),
);
