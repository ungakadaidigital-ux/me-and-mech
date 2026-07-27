import { getAdminClient } from '../../db/admin-client';
import { createRazorpayOrder } from '../../lib/razorpay';
import { NotificationService } from '../notification/notification.service';
import { WATI_TEMPLATES } from '../../config/wati-templates';
import { AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { logger } from '../../lib/logger';
import { recordSecurityEvent, SecurityAuditEvent } from '../../lib/security-audit';

/**
 * PKG-036 — Razorpay Subscription Module. GATED — same idempotency/
 * revenue-impact risk class as PKG-034.
 *
 * Idempotency: subscription_events.razorpay_event_id has a UNIQUE
 * constraint (migration 012). Every webhook handler call attempts an
 * INSERT there FIRST; a unique-violation means "already processed,"
 * treated as a safe no-op — mirrors the reward worker's pattern exactly.
 * The webhook route always returns 200 immediately regardless of outcome,
 * per the locked "never leave Razorpay retrying a 4xx/5xx" rule.
 */
export class SubscriptionService {
  async createOrder(workshopId: string, planType: 'monthly' | 'annual') {
    const order = await createRazorpayOrder(planType, workshopId);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async handleWebhook(eventType: string, razorpayEventId: string, payload: Record<string, unknown>): Promise<void> {
    const admin = getAdminClient();

    const workshopId = this.extractWorkshopId(payload);
    if (!workshopId) {
      logger.warn({ eventType, razorpayEventId }, 'Razorpay webhook missing workshop_id in notes — cannot process');
      return;
    }

    const { data: subscription } = await admin.from('subscriptions').select('id').eq('workshop_id', workshopId).maybeSingle();
    const subscriptionId = subscription?.id;
    if (!subscriptionId) {
      logger.warn({ workshopId, eventType }, 'Razorpay webhook: no subscription record found for workshop');
      return;
    }

    // Idempotency gate — insert BEFORE applying any side effect.
    const { error: insertError } = await admin.from('subscription_events').insert({
      subscription_id: subscriptionId,
      event_type: eventType,
      razorpay_event_id: razorpayEventId,
      payload,
      processed_at: new Date().toISOString(),
    });

    if (insertError) {
      if (insertError.code === '23505') {
        logger.info({ razorpayEventId }, 'Razorpay webhook: already processed, safe replay');
        return;
      }
      throw new AppError(ErrorCode.INTERNAL, `Failed to record subscription event: ${insertError.message}`, 500);
    }

    await this.applyEventEffect(workshopId, eventType, payload);
  }

  private extractWorkshopId(payload: Record<string, unknown>): string | null {
    const entity = (payload as any)?.payload?.subscription?.entity ?? (payload as any)?.payload?.payment?.entity;
    return entity?.notes?.workshop_id ?? null;
  }

  private async applyEventEffect(workshopId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const admin = getAdminClient();
    const notifications = new NotificationService();
    const { data: workshop } = await admin.from('workshops').select('phone, shop_name').eq('id', workshopId).single();

    switch (eventType) {
      case 'subscription.charged':
      case 'order.paid': {
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // extend by billing cycle; exact cycle length comes from plan_type, refined by the agency against actual Razorpay subscription entity fields
        await admin
          .from('workshops')
          .update({ subscription_status: 'active', subscription_ends_at: periodEnd })
          .eq('id', workshopId);
        await admin.from('subscriptions').update({ status: 'active', current_period_end: periodEnd }).eq('workshop_id', workshopId);

        if (workshop) {
          await notifications.queueWhatsApp({
            workshopId,
            phone: workshop.phone,
            templateId: WATI_TEMPLATES.PAYMENT_SUCCESS,
            variables: [{ key: 'shop_name', value: workshop.shop_name }],
          });
        }
        await recordSecurityEvent({ event: SecurityAuditEvent.SUBSCRIPTION_CHANGED, workshopId, metadata: { eventType, newStatus: 'active' } });
        break;
      }

      case 'payment.failed': {
        await admin.from('workshops').update({ subscription_status: 'grace', reminder_sequence: 0 }).eq('id', workshopId);
        await admin.from('subscriptions').update({ status: 'past_due' }).eq('workshop_id', workshopId);

        if (workshop) {
          await notifications.queueWhatsApp({
            workshopId,
            phone: workshop.phone,
            templateId: WATI_TEMPLATES.PAYMENT_FAILED,
            variables: [{ key: 'shop_name', value: workshop.shop_name }],
          });
        }
        await recordSecurityEvent({ event: SecurityAuditEvent.SUBSCRIPTION_CHANGED, workshopId, metadata: { eventType, newStatus: 'grace' } });
        break;
      }

      case 'subscription.cancelled': {
        await admin.from('workshops').update({ subscription_status: 'expired', reminder_sequence: 0 }).eq('id', workshopId);
        await admin.from('subscriptions').update({ status: 'cancelled' }).eq('workshop_id', workshopId);
        await recordSecurityEvent({ event: SecurityAuditEvent.SUBSCRIPTION_CHANGED, workshopId, metadata: { eventType, newStatus: 'expired' } });
        break;
      }

      default:
        logger.info({ eventType }, 'Razorpay webhook: event type not handled, ignored');
    }
  }
}
