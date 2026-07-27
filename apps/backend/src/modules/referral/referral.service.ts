import type { Repositories } from '../../db/repository-factory';
import { REFERRAL } from '@me-and-mech/shared';
import { isValidReferralCode } from '@me-and-mech/shared';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { enqueueInternalJob } from '../../lib/qstash';
import { logger } from '../../lib/logger';

/**
 * PKG-034 — Referral Rewards & Subscription Entitlements. GATED package.
 *
 * This service covers code application (referee side) and success
 * detection. Reward crediting itself lives in reward-worker.service.ts,
 * invoked asynchronously via QStash — never called synchronously from
 * here, so a slow/failed reward computation can never block a job card
 * creation request.
 */
export class ReferralService {
  constructor(private readonly repos: Repositories) {}

  async getMyStatus(workshopId: string) {
    const code = await this.repos.referralCodes.findByWorkshop(workshopId);
    const successCount = await this.repos.referralEntries.countSuccessfulByReferrer(workshopId);
    return { code: code?.code ?? null, successfulReferrals: successCount };
  }

  /**
   * Called once, right after a NEW workshop finishes onboarding, if they
   * entered a referral code. Deliberately NOT part of the onboarding
   * transaction (migration 027) — a bad/expired code must never block
   * account creation, and this can be retried independently if it fails.
   */
  async applyCode(refereeWorkshopId: string, rawCode: string) {
    if (!isValidReferralCode(rawCode)) {
      throw new ValidationError('Invalid referral code format');
    }
    const code = rawCode.trim().toUpperCase();

    const referralCode = await this.repos.referralCodes.findActiveByCode(code);
    if (!referralCode) {
      throw new NotFoundError('Referral code');
    }
    if (referralCode.workshopId === refereeWorkshopId) {
      throw new ValidationError('Cannot apply your own referral code');
    }

    return this.repos.referralEntries.create({
      referralCodeId: referralCode.id,
      referrerWorkshopId: referralCode.workshopId,
      refereeWorkshopId,
    });
  }

  /**
   * Called (best-effort, non-blocking) after every job card creation for
   * a workshop that might be someone's referee. Checks: pending entry
   * exists, ≥3 job cards created since the entry's created_at, still
   * within the 7-day window. On success, enqueues the reward worker —
   * never computes/applies the reward inline here.
   */
  async checkAndMarkSuccess(refereeWorkshopId: string): Promise<void> {
    try {
      const entry = await this.repos.referralEntries.findPendingByReferee(refereeWorkshopId);
      if (!entry) return;
      if (new Date(entry.expiresAt) < new Date()) return; // pg_cron sweep (020) will flip this to expired

      const jobCount = await this.repos.jobCards.countSince(refereeWorkshopId, entry.createdAt);
      if (jobCount < REFERRAL.successJobCardThreshold) return;

      const updated = await this.repos.referralEntries.markSuccess(entry.id, jobCount);

      await enqueueInternalJob(
        '/api/v1/internal/referral-reward-worker',
        { referral_entry_id: updated.id },
        { deduplicationId: `referral-reward-${updated.id}` },
      );
    } catch (err) {
      // Never let a referral-check failure block the job card creation
      // request that triggered it.
      logger.error({ err: (err as Error).message, refereeWorkshopId }, 'Referral success check failed (non-blocking)');
    }
  }
}
