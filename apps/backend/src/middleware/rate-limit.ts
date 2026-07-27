import type { NextFunction, Request, Response } from 'express';
import { RATE_LIMITS } from '@me-and-mech/shared';
import { RateLimitError } from '../lib/errors';

/**
 * Minimal in-memory rate limiter for local dev / single-instance staging.
 * PRODUCTION NOTE: Railway deploys may run multiple instances — replace this
 * with a Redis/Upstash-backed limiter (Upstash is already in the stack for
 * QStash, so @upstash/ratelimit is the natural choice) before go-live.
 * Flagging this explicitly rather than silently shipping a limiter that only
 * works per-instance.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: { limit: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return next();
    }

    if (bucket.count >= config.limit) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      return next(new RateLimitError(retryAfterSeconds));
    }

    bucket.count += 1;
    next();
  };
}

export const defaultRateLimit = rateLimit({
  limit: RATE_LIMITS.default.limit,
  windowMs: RATE_LIMITS.default.windowMinutes * 60_000,
});
