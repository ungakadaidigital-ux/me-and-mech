import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * PKG-016 — Supabase Auth Configuration & JWT Strategy.
 *
 * MSG91 delivers the OTP; Supabase Auth's role here is JWT format and
 * session semantics, not GoTrue's phone-auth flow (MSG91 isn't a native
 * GoTrue provider). So instead of routing through GoTrue, the backend
 * mints its own tokens signed with the project's JWT secret. PostgREST/
 * Supabase only verify the signature and read claims — they don't require
 * the token to have literally been issued by the GoTrue service — so this
 * is a supported pattern, not a hack around RLS.
 *
 * Two claim families, deliberately kept separate:
 *   - `role` (Postgres/PostgREST role, must be "authenticated" for RLS-
 *     scoped queries to work at all)
 *   - `app_role` (our own OWNER | MECHANIC | VIEWER, read by RBAC — PKG-020)
 *
 * `sub` = users.id, which is what auth.uid() resolves to inside Postgres —
 * this is what migration 025's auth_workshop_id() helper joins against.
 */

export interface MeAndMechJwtPayload {
  sub: string; // users.id
  role: 'authenticated'; // Postgres role for RLS/PostgREST
  app_role: 'OWNER' | 'MECHANIC' | 'VIEWER';
  workshop_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  aud: 'authenticated';
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function mintAccessToken(params: {
  userId: string;
  workshopId: string;
  appRole: 'OWNER' | 'MECHANIC' | 'VIEWER';
  subscriptionStatus: string;
  trialEndsAt: string | null;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MeAndMechJwtPayload = {
    sub: params.userId,
    role: 'authenticated',
    app_role: params.appRole,
    workshop_id: params.workshopId,
    subscription_status: params.subscriptionStatus,
    trial_ends_at: params.trialEndsAt,
    aud: 'authenticated',
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256' });
}

export function verifyAccessToken(token: string): MeAndMechJwtPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as MeAndMechJwtPayload;
}

export function accessTokenExpirySeconds(): number {
  return ACCESS_TOKEN_TTL_SECONDS;
}

export function refreshTokenExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

/**
 * Short-lived proof that a phone number was just OTP-verified and belongs
 * to a NEW user (no workshop yet). Used as the Bearer token for POST
 * /workshop — it carries no workshop_id/role/RLS-relevant claims because
 * none exist yet; it exists purely to avoid re-sending an OTP for the
 * single next step of the flow.
 */
interface OnboardingProofPayload {
  type: 'onboarding_proof';
  phone: string;
  iat: number;
  exp: number;
}

const ONBOARDING_PROOF_TTL_SECONDS = 15 * 60; // 15 minutes

export function mintOnboardingProof(phone: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OnboardingProofPayload = {
    type: 'onboarding_proof',
    phone,
    iat: now,
    exp: now + ONBOARDING_PROOF_TTL_SECONDS,
  };
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256' });
}

export function verifyOnboardingProof(token: string): OnboardingProofPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as OnboardingProofPayload;
  if (payload.type !== 'onboarding_proof') {
    throw new Error('Not an onboarding proof token');
  }
  return payload;
}
