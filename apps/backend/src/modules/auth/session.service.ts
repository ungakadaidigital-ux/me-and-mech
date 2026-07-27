import { getAdminClient } from '../../db/admin-client';
import { mintAccessToken, verifyAccessToken, accessTokenExpirySeconds, refreshTokenExpiryDate } from '../../lib/jwt';
import { generateOpaqueToken, hashSecret, verifySecret } from '../../lib/crypto';
import { AppError, NotFoundError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

/**
 * PKG-016 — session issuance built on our own auth_sessions ledger
 * (migration 026), since we mint our own JWTs rather than using GoTrue's
 * refresh-token machinery.
 */

interface WorkshopUserContext {
  userId: string;
  workshopId: string;
  appRole: 'OWNER' | 'MECHANIC' | 'VIEWER';
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

export async function issueSession(ctx: WorkshopUserContext) {
  const accessToken = mintAccessToken(ctx);
  const refreshToken = generateOpaqueToken();

  const supabase = getAdminClient();
  const { error } = await supabase.from('auth_sessions').insert({
    user_id: ctx.userId,
    refresh_token_hash: hashSecret(refreshToken),
    expires_at: refreshTokenExpiryDate().toISOString(),
  });
  if (error) throw error;

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpirySeconds(),
  };
}

export async function refreshSession(refreshToken: string) {
  const supabase = getAdminClient();

  // We can't index-lookup by a hashed value directly since the salt is
  // per-row — fetch active, unexpired sessions and check each. At MVP
  // scale (one session per workshop, occasional refresh) this is fine;
  // if refresh volume grows, switch to a deterministic HMAC lookup key
  // stored alongside the salted hash.
  const { data: sessions, error } = await supabase
    .from('auth_sessions')
    .select('*')
    .is('revoked_at', null)
    .gte('expires_at', new Date().toISOString());
  if (error) throw error;

  const match = (sessions ?? []).find((s) => verifySecret(refreshToken, s.refresh_token_hash));
  if (!match) {
    throw new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Invalid or expired refresh token — please login again', 401);
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*, workshops!inner(subscription_status, trial_ends_at)')
    .eq('id', match.user_id)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user) throw new NotFoundError('User');

  const accessToken = mintAccessToken({
    userId: user.id,
    workshopId: user.workshop_id,
    appRole: user.role,
    subscriptionStatus: (user as any).workshops.subscription_status,
    trialEndsAt: (user as any).workshops.trial_ends_at,
  });

  return { accessToken, expiresIn: accessTokenExpirySeconds() };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const supabase = getAdminClient();
  const { data: sessions, error } = await supabase.from('auth_sessions').select('*').is('revoked_at', null);
  if (error) throw error;

  const match = (sessions ?? []).find((s) => verifySecret(refreshToken, s.refresh_token_hash));
  if (!match) return; // already revoked/invalid — logout is idempotent

  await supabase.from('auth_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', match.id);
}

export { verifyAccessToken };
