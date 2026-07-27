import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReferralCode, ReferralEntry, RewardTransaction, RewardType } from '@me-and-mech/shared';
import { generateReferralCodeCandidate } from '@me-and-mech/shared';
import { AppError, ValidationError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { rowToCamel } from '../../lib/case-mapping';

/**
 * Referral repositories are intentionally NOT built on BaseRepository:
 * these tables are read-only to the client (RLS enforces this — see
 * migrations 021-023/025), and every write here is meant to be called only
 * from service-role contexts (Edge Functions / the reward worker), never
 * from a per-user request handler. Keeping them separate makes that
 * boundary visible in the code, not just in a comment.
 */

export class ReferralCodeRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** Service-role only. Called once, at workshop registration (PKG-018). */
  async issueForWorkshop(workshopId: string, maxAttempts = 5): Promise<ReferralCode> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = generateReferralCodeCandidate();
      const { data, error } = await this.client
        .from('referral_codes')
        .insert({ workshop_id: workshopId, code })
        .select()
        .single();

      if (!error) return rowToCamel<ReferralCode>(data) as ReferralCode;
      // 23505 = unique_violation (collision on `code`) — retry with a new candidate.
      if (error.code !== '23505') {
        throw new AppError(ErrorCode.INTERNAL, `Referral code issuance failed: ${error.message}`, 500);
      }
    }
    throw new AppError(ErrorCode.INTERNAL, 'Referral code generation exhausted retries — check code space', 500);
  }

  /** Service-role only. Used at referee registration to validate a code
   * before creating a referral_entries row. Never exposed as a client-callable
   * "check if code X is valid" endpoint without rate limiting (RATE_LIMITS.referralApply). */
  async findActiveByCode(code: string): Promise<ReferralCode | null> {
    const { data, error } = await this.client
      .from('referral_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<ReferralCode>(data);
  }

  async findByWorkshop(workshopId: string): Promise<ReferralCode | null> {
    const { data, error } = await this.client
      .from('referral_codes')
      .select('*')
      .eq('workshop_id', workshopId)
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<ReferralCode>(data);
  }
}

export class ReferralEntryRepository {
  constructor(private readonly client: SupabaseClient) {}

  /** Service-role only, at referee registration. Enforces "referred once
   * ever" via the DB UNIQUE constraint on referee_workshop_id — a
   * unique-violation here should surface as a clear validation error, not
   * a raw 500. */
  async create(params: {
    referralCodeId: string;
    referrerWorkshopId: string;
    refereeWorkshopId: string;
    deviceFingerprint?: string;
    ipAddress?: string;
  }): Promise<ReferralEntry> {
    const { data, error } = await this.client
      .from('referral_entries')
      .insert({
        referral_code_id: params.referralCodeId,
        referrer_workshop_id: params.referrerWorkshopId,
        referee_workshop_id: params.refereeWorkshopId,
        device_fingerprint: params.deviceFingerprint,
        ip_address: params.ipAddress,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('This workshop has already been referred once — referral cannot be applied again.');
      }
      throw new AppError(ErrorCode.INTERNAL, `Referral entry creation failed: ${error.message}`, 500);
    }
    return rowToCamel<ReferralEntry>(data) as ReferralEntry;
  }

  async findPendingByReferee(refereeWorkshopId: string): Promise<ReferralEntry | null> {
    const { data, error } = await this.client
      .from('referral_entries')
      .select('*')
      .eq('referee_workshop_id', refereeWorkshopId)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<ReferralEntry>(data);
  }

  /** Service-role only — called by the referral-success-trigger Edge Function. */
  async markSuccess(id: string, refereeJobCount: number): Promise<ReferralEntry> {
    const { data, error } = await this.client
      .from('referral_entries')
      .update({ status: 'success', referee_job_count: refereeJobCount, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending') // guards against double-transition races
      .select()
      .single();
    if (error) throw new AppError(ErrorCode.INTERNAL, `Referral entry success transition failed: ${error.message}`, 500);
    return rowToCamel<ReferralEntry>(data) as ReferralEntry;
  }

  async countSuccessfulByReferrer(referrerWorkshopId: string): Promise<number> {
    const { count, error } = await this.client
      .from('referral_entries')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_workshop_id', referrerWorkshopId)
      .eq('status', 'success')
      .eq('abuse_flagged', false);
    if (error) throw error;
    return count ?? 0;
  }
}

export class RewardTransactionRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Service-role only, called from the reward worker (PKG-034). The
   * unique constraint on (referral_entry_id, reward_type) is the actual
   * idempotency mechanism — this method surfaces a duplicate insert as a
   * typed "already applied" signal rather than a generic error, so the
   * QStash consumer can treat it as a safe no-op replay.
   */
  async recordMilestoneReward(params: {
    referralEntryId: string;
    workshopId: string;
    rewardType: RewardType;
    rewardValueDays: number | null;
    idempotencyKey: string;
  }): Promise<{ transaction: RewardTransaction; alreadyApplied: boolean }> {
    const { data, error } = await this.client
      .from('reward_transactions')
      .insert({
        referral_entry_id: params.referralEntryId,
        workshop_id: params.workshopId,
        reward_type: params.rewardType,
        reward_value_days: params.rewardValueDays,
        idempotency_key: params.idempotencyKey,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already applied — safe replay. Fetch and return the existing row.
        const existing = await this.client
          .from('reward_transactions')
          .select('*')
          .eq('idempotency_key', params.idempotencyKey)
          .single();
        if (existing.error) throw existing.error;
        return { transaction: rowToCamel<RewardTransaction>(existing.data) as RewardTransaction, alreadyApplied: true };
      }
      throw new AppError(ErrorCode.INTERNAL, `Reward transaction insert failed: ${error.message}`, 500);
    }

    return { transaction: rowToCamel<RewardTransaction>(data) as RewardTransaction, alreadyApplied: false };
  }

  async markNotificationSent(id: string): Promise<void> {
    const { error } = await this.client.from('reward_transactions').update({ notification_sent: true }).eq('id', id);
    if (error) throw error;
  }
}
