import type { NextFunction, Request, Response } from 'express';
import { SubscriptionExpiredError } from '../lib/errors';

/**
 * PKG-021 — Subscription Guard Middleware.
 *
 * Locked rule: trial users get IDENTICAL features to paid subscribers —
 * zero degradation during the 30-day trial. After Day 30 (read_only),
 * new-creation actions lock; marking an existing invoice PAID is NEVER
 * blocked, under any subscription state — that route must never have this
 * middleware attached.
 *
 * Apply this middleware ONLY to: create job card, voice billing, generate
 * invoice, add customer, add vehicle, WhatsApp invoice send. Do NOT apply
 * it to: mark-paid, any GET/read route, or the upgrade/subscription
 * management routes themselves (a read_only workshop must still be able to
 * upgrade).
 */
const BLOCKED_STATUSES = new Set(['read_only', 'expired', 'churned']);

export function subscriptionGuard(req: Request, _res: Response, next: NextFunction) {
  const status = req.auth?.subscriptionStatus;
  if (status && BLOCKED_STATUSES.has(status)) {
    return next(new SubscriptionExpiredError());
  }
  next();
}
