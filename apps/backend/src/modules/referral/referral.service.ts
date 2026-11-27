import type { Repositories } from '../../db/repository-factory';
import { REFERRAL, isValidReferralCode } from '@me-and-mech/shared';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { enqueueInternalJob } from '../../lib/qstash';
import { logger } from '../../lib/logger';

/**
 * PKG-034 — Referral Rewards & Subscription Entitlements. GATED package.
 *
 * TRUST BOUNDARY (fixed after the first real-database RLS test, migration 033):
 *
 *  - `userRepos`  → the caller's own token. RLS applies. Used ONLY to read
 *                   data that belongs to the caller (their own code, their own
 *                   successful referrals).
 *  - `adminRepos` → service role, RLS bypassed. Required because referral
 *                   logic is inherently cross-workshop: a referee must look up
 *                   ANOTHER workshop's code, and referral_entries has no client
 *                   INSERT/UPDATE and only a referrer-side SELECT policy.
 *
 * Because adminRepos bypasses RLS, every admin call below is explicitly
 * scoped by a workshop id that comes from the verified JWT (never from the
 * request body), and nothing from another workshop is returned to the caller
 * beyond what the caller needs.
 *
 * Reward crediting lives in reward-worker.service.ts, invoked asynchronously
 * via QStash — never synchronously from here, so a slow/failed reward
 * computation can never block a job card creation request.
 */
export class ReferralService {
  constructor(
    private readonly userRepos: Repositories,
    private readonly adminRepos: Repositories,
  ) {}

  /** Caller's own referral code and their own successful-referral count. */
  async getMyStatus(workshopId: string) {
    const code = await this.userRepos.referralCodes.findByWorkshop(workshopId);
    const successCount = await this.userRepos.referralEntries.countSuccessfulByReferrer(workshopId);
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

    // Cross-workshop lookup: only the service role can see another workshop's code.
    const referralCode = await this.adminRepos.referralCodes.findActiveByCode(code);
    if (!referralCode) {
      throw new NotFoundError('Referral code');
    }
    if (referralCode.workshopId === refereeWorkshopId) {
      throw new ValidationError('Cannot apply your own referral code');
    }

    // The DB UNIQUE constraint on referee_workshop_id enforces "referred once ever".
    const entry = await this.adminRepos.referralEntries.create({
      referralCodeId: referralCode.id,
      referrerWorkshopId: referralCode.workshopId,
      refereeWorkshopId,
    });

    // Return only what the referee needs. The full row contains the
    // referrer's workshop id, which must not be revealed to the referee.
    return { id: entry.id, status: entry.status, expiresAt: entry.expiresAt };
  }

  /**
   * Called (best-effort, non-blocking) after every job card creation for
   * a workshop that might be someone's referee. Checks: pending entry
   * exists, ≥3 job cards created since the entry's created_at, still
   * within the 7-day window. On success, enqueues the reward worker —
   * never computes/applies the reward inline here.
   *
   * Runs on adminRepos: the referee has no SELECT policy on referral_entries
   * (only the referrer does) and no UPDATE right, so under the user's token
   * this check silently never fired.
   */
  async checkAndMarkSuccess(refereeWorkshopId: string): Promise<void> {
    try {
      const entry = await this.adminRepos.referralEntries.findPendingByReferee(refereeWorkshopId);
      if (!entry) return;
      if (new Date(entry.expiresAt) < new Date()) return; // pg_cron sweep (020) will flip this to expired

      const jobCount = await this.adminRepos.jobCards.countSince(refereeWorkshopId, entry.createdAt);
      if (jobCount < REFERRAL.successJobCardThreshold) return;

      const updated = await this.adminRepos.referralEntries.markSuccess(entry.id, jobCount);

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
