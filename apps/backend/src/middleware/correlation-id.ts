import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * PKG-023 — global middleware chain, step 1. Must run before requestLogger
 * so every log line for this request can include the same id, and before
 * everything else so downstream errors can be correlated across the
 * client, this API, and Sentry.
 */
export function correlationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
