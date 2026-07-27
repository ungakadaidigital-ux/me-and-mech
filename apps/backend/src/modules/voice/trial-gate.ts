import type { NextFunction, Request, Response } from 'express';
import { VoiceTrialBlockedError } from '../../lib/errors';

/**
 * PKG-030 — Cost Control Gate, Non-Negotiable per the locked spec:
 * "Trial users (subscription_status = 'trial') receive HTTP 402 with
 * ERR_VOICE_TRIAL_BLOCKED. This gate must be implemented and tested before
 * voice is enabled in ANY environment. One unchecked Sarvam AI call costs
 * real money."
 *
 * This is DELIBERATELY separate from subscriptionGuard — subscriptionGuard
 * blocks read_only/expired workshops from most creation actions, but voice
 * is blocked specifically for TRIAL workshops too (every other feature is
 * full-access during trial). Do not replace this with subscriptionGuard;
 * they protect against different things.
 */
export function trialGate(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.subscriptionStatus === 'trial') {
    return next(new VoiceTrialBlockedError());
  }
  next();
}
