import { getAdminClient } from '../../db/admin-client';
import { sendPushNotification } from '../../lib/fcm';
import { NotificationService } from '../notification/notification.service';
import { WATI_TEMPLATES, trialReminderTemplateForDaysLeft } from '../../config/wati-templates';
import { rowsToCamel } from '../../lib/case-mapping';
import { logger } from '../../lib/logger';

/**
 * PKG-032 — Push Notification & Engagement Trigger Engine.
 * These methods are invoked by QStash-scheduled HTTP calls (see
 * engagement.routes.ts), not by any user request — they always use the
 * admin client, scanning across all workshops.
 */
export class EngagementService {
  private readonly notifications = new NotificationService();

  /** Cron: 30 2 * * * (8 AM IST). ONLY fires if pending_payments > 0. */
  async runPendingPaymentAlert(): Promise<{ notified: number }> {
    const admin = getAdminClient();

    const { data, error } = await admin.from('invoices').select('workshop_id').eq('payment_status', 'PENDING');
    if (error) throw error;

    const workshopIds = [...new Set((data ?? []).map((r: any) => r.workshop_id))];
    let notified = 0;

    for (const workshopId of workshopIds) {
      const tokens = await admin.from('push_tokens').select('fcm_token').eq('workshop_id', workshopId);
      for (const row of rowsToCamel<{ fcmToken: string }>(tokens.data)) {
        const result = await sendPushNotification(row.fcmToken, 'நிலுவை பணம்', 'இன்று pending payments உள்ளன. பாருங்கள்.');
        if (result.success) notified++;
      }
    }

    logger.info({ workshopCount: workshopIds.length, notified }, 'Pending payment alert run complete');
    return { notified };
  }

  /** Cron: 30 12 * * * (6 PM IST). All active workshops, unconditional. */
  async runDailySummary(): Promise<{ notified: number }> {
    const admin = getAdminClient();
    const { data: workshops, error } = await admin.from('workshops').select('id').in('subscription_status', ['trial', 'active', 'grace']);
    if (error) throw error;

    let notified = 0;
    for (const workshop of workshops ?? []) {
      const tokens = await admin.from('push_tokens').select('fcm_token').eq('workshop_id', workshop.id);
      for (const row of rowsToCamel<{ fcmToken: string }>(tokens.data)) {
        const result = await sendPushNotification(row.fcmToken, 'இன்றைய சுருக்கம்', 'இன்று எத்தனை jobs முடிச்சீங்க பாருங்க.');
        if (result.success) notified++;
      }
    }
    return { notified };
  }

  /** QStash delayed job, scheduled at registration time (Day 1 +2hrs). */
  async sendOnboardingWelcome(workshopId: string): Promise<void> {
    const admin = getAdminClient();
    const { data: workshop } = await admin.from('workshops').select('phone, shop_name, owner_name').eq('id', workshopId).single();
    if (!workshop) return;

    await this.notifications.queueWhatsApp({
      workshopId,
      phone: workshop.phone,
      templateId: WATI_TEMPLATES.ONBOARDING_D1,
      variables: [{ key: 'owner_name', value: workshop.owner_name }],
    });

    await admin
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('workshop_id', workshopId)
      .eq('notification_type', 'onboarding_d1');
  }

  /** Trial reminder chain — invoked daily by a QStash cron, checks every trial workshop's days-remaining. */
  async runTrialReminderSweep(): Promise<{ notified: number }> {
    const admin = getAdminClient();
    const { data: workshops, error } = await admin
      .from('workshops')
      .select('id, phone, shop_name, trial_ends_at, reminder_sequence')
      .eq('subscription_status', 'trial');
    if (error) throw error;

    let notified = 0;
    const now = Date.now();

    for (const w of workshops ?? []) {
      const daysLeft = Math.ceil((new Date(w.trial_ends_at).getTime() - now) / (24 * 60 * 60 * 1000));
      const template = trialReminderTemplateForDaysLeft(daysLeft);
      if (!template) continue;

      const result = await this.notifications.queueWhatsApp({
        workshopId: w.id,
        phone: w.phone,
        templateId: template,
        variables: [
          { key: 'shop_name', value: w.shop_name },
          { key: 'days_left', value: String(daysLeft) },
        ],
      });

      if (result.sent) {
        await admin
          .from('workshops')
          .update({ last_reminded_at: new Date().toISOString(), reminder_sequence: (w.reminder_sequence ?? 0) + 1 })
          .eq('id', w.id);
        notified++;
      }
    }

    return { notified };
  }
}
