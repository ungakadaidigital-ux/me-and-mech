import { getAdminClient } from '../../db/admin-client';
import { createRepositories } from '../../db/repository-factory';
import { REFERRAL } from '@me-and-mech/shared';
import { WATI_TEMPLATES } from '../../config/wati-templates';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../lib/logger';

/**
 * PKG-034 — Reward Worker. GATED. Invoked exclusively via
 * POST /internal/referral-reward-worker (QStash, signature-verified —
 * never called synchronously from request-handling code).
 *
 * Idempotency: the QStash deduplicationId (referral-reward-{entryId})
 * prevents duplicate ENQUEUES; the DB-level UNIQUE(referral_entry_id,
 * reward_type) constraint (migration 023) prevents duplicate CREDITS even
 * if QStash ever retries after a partial failure — two independent layers,
 * matching PKG-036's pattern for the same risk class.
 */
export class RewardWorkerService {
  async processMilestone(referralEntryId: string): Promise<void> {
    const admin = getAdminClient();
    const repos = createRepositories(admin);

    const { data: entry, error } = await admin.from('referral_entries').select('*').eq('id', referralEntryId).single();
    if (error || !entry) {
      logger.error({ referralEntryId }, 'Reward worker: referral entry not found');
      return;
    }

    const successCount = await repos.referralEntries.countSuccessfulByReferrer(entry.referrer_workshop_id);
    const milestone = this.milestoneForCount(successCount);
    if (!milestone) {
      logger.info({ referralEntryId, successCount }, 'Reward worker: no new milestone crossed, nothing to credit');
      return;
    }

    const tier = REFERRAL.tiers[milestone as keyof typeof REFERRAL.tiers];
    const idempotencyKey = `${referralEntryId}:${tier.rewardType}`;

    const { transaction, alreadyApplied } = await repos.rewardTransactions.recordMilestoneReward({
      referralEntryId,
      workshopId: entry.referrer_workshop_id,
      rewardType: tier.rewardType,
      rewardValueDays: tier.valueDays,
      idempotencyKey,
    });

    if (alreadyApplied) {
      logger.info({ idempotencyKey }, 'Reward worker: milestone already credited, safe replay');
      return;
    }

    await this.applyRewardEffect(entry.referrer_workshop_id, tier.rewardType, tier.valueDays);
    await this.sendRewardNotification(entry.referrer_workshop_id, tier.rewardType, transaction.id);
  }

  /** Which NEW milestone was just crossed, given the total successful count. Returns null if count doesn't land exactly on a threshold. */
  private milestoneForCount(count: number): number | null {
    const thresholds = Object.keys(REFERRAL.tiers).map(Number).sort((a, b) => a - b);
    return thresholds.includes(count) ? count : null;
  }

  private async applyRewardEffect(workshopId: string, rewardType: string, valueDays: number | null): Promise<void> {
    const admin = getAdminClient();

    if (rewardType === 'discount_20') {
      await admin.from('workshops').update({ discount_permanent: true }).eq('id', workshopId);
      return;
    }

    if (valueDays) {
      const { data: workshop } = await admin.from('workshops').select('subscription_ends_at, trial_ends_at').eq('id', workshopId).single();
      const currentEnd = workshop?.subscription_ends_at ?? workshop?.trial_ends_at ?? new Date().toISOString();
      const newEnd = new Date(new Date(currentEnd).getTime() + valueDays * 24 * 60 * 60 * 1000).toISOString();
      await admin.from('workshops').update({ subscription_ends_at: newEnd }).eq('id', workshopId);
    }
  }

  private async sendRewardNotification(workshopId: string, rewardType: string, transactionId: string): Promise<void> {
    const admin = getAdminClient();
    const { data: workshop } = await admin.from('workshops').select('phone, shop_name').eq('id', workshopId).single();
    if (!workshop) return;

    const notifications = new NotificationService();
    const result = await notifications.queueWhatsApp({
      workshopId,
      phone: workshop.phone,
      templateId: WATI_TEMPLATES.REFERRAL_REWARD,
      variables: [
        { key: 'shop_name', value: workshop.shop_name },
        { key: 'reward_type', value: rewardType },
      ],
    });

    if (result.sent) {
      await admin.from('reward_transactions').update({ notification_sent: true }).eq('id', transactionId);
    }
  }
}
