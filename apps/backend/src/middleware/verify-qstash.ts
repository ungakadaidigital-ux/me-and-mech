import type { NextFunction, Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

/**
 * Every /internal/* route (cron-style triggers, reward worker, etc.) is
 * invoked by QStash, not by a workshop's JWT — this middleware replaces
 * `authenticate` for that class of route. Verifies the request actually
 * came from Upstash QStash, not an arbitrary caller who guessed the URL.
 */
export async function verifyQStashSignature(req: Request, _res: Response, next: NextFunction) {
  const signature = req.headers['upstash-signature'];
  if (typeof signature !== 'string') {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Missing QStash signature', 401));
  }

  try {
    const isValid = await receiver.verify({
      signature,
      body: JSON.stringify(req.body),
    });
    if (!isValid) {
      return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Invalid QStash signature', 401));
    }
    next();
  } catch {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'QStash signature verification failed', 401));
  }
}
