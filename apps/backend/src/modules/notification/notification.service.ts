import { sendWhatsAppTemplate } from '../../lib/wati';
import { NotificationRepository } from './notification.repository';
import { logger } from '../../lib/logger';

const MAX_MESSAGES_PER_24H = 2; // TRAI compliance — locked, do not raise

export interface QueueWhatsAppParams {
  workshopId: string;
  phone: string;
  templateId: string;
  variables: Array<{ key: string; value: string }>;
}

/**
 * PKG-031 — WhatsApp Notification Engine.
 *
 * Dedup — 3 layers (per locked spec):
 *   Layer 1: last_reminded_at / reminder_sequence on workshops (checked by
 *            the CALLER — engagement-trigger cron jobs, not here, since
 *            only they know the reminder-chain position)
 *   Layer 2: QStash deduplicationId (set by the caller when enqueuing)
 *   Layer 3: notification_log unique index on (phone, template_id, day) —
 *            enforced here as the DB-level backstop
 *
 * TRAI compliance: never more than 2 messages to the same phone in any
 * rolling 24h window. Opted-out numbers (replied STOP) never receive
 * anything, ever, checked first.
 */
export class NotificationService {
  private readonly repo = new NotificationRepository();

  async queueWhatsApp(params: QueueWhatsAppParams): Promise<{ sent: boolean; reason?: string }> {
    if (await this.repo.isOptedOut(params.phone)) {
      logger.info({ templateId: params.templateId }, 'WhatsApp send skipped — recipient opted out');
      return { sent: false, reason: 'opted_out' };
    }

    if (await this.repo.wasSentToday(params.phone, params.templateId)) {
      return { sent: false, reason: 'dedup_layer3_already_sent_today' };
    }

    const sentInLast24h = await this.repo.countSentInLast24h(params.phone);
    if (sentInLast24h >= MAX_MESSAGES_PER_24H) {
      logger.warn({ templateId: params.templateId }, 'WhatsApp send blocked — TRAI 24h cap reached');
      return { sent: false, reason: 'trai_24h_cap' };
    }

    const result = await sendWhatsAppTemplate(params.phone, params.templateId, params.variables);

    await this.repo.logSend({
      workshopId: params.workshopId,
      templateId: params.templateId,
      phone: params.phone,
      status: result.success ? 'sent' : 'failed',
      watiMsgId: result.watiMessageId,
      metadata: { variables: params.variables },
    });

    return { sent: result.success };
  }

  async handleInboundStop(phone: string): Promise<void> {
    await this.repo.optOut(phone, 'User replied STOP');
  }

  async handleDeliveryWebhook(watiMsgId: string, status: 'delivered' | 'read'): Promise<void> {
    await this.repo.updateDeliveryStatus(watiMsgId, status);
  }
}
