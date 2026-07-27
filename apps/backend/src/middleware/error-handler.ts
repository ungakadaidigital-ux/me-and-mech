import type { NextFunction, Request, Response } from 'express';
import { ErrorCode, type ApiError } from '@me-and-mech/shared';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { Sentry } from '../lib/sentry';

/** Wrap async route handlers so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Final error-handling middleware. Must be registered LAST, after
 * Sentry.Handlers.errorHandler() in the middleware chain — see PKG-047 for
 * the full ordering (requestHandler → tracingHandler → ...routes... →
 * Sentry.errorHandler → this).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, code: err.code, path: req.path }, 'Operational 5xx error');
    } else {
      logger.warn({ code: err.code, path: req.path }, err.message);
    }

    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    return res.status(err.statusCode).json(body);
  }

  // Unexpected error — never leaked to the client, always reported.
  logger.error({ err, path: req.path }, 'Unhandled error');
  Sentry.captureException(err);

  const body: ApiError = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL,
      message: 'சேவை தற்காலிகமாக நின்றுள்ளது. கொஞ்சம் பொறுங்கள்',
    },
  };
  return res.status(500).json(body);
}

/** 404 handler for unmatched routes — registered just before errorHandler. */
export function notFoundHandler(req: Request, res: Response) {
  const body: ApiError = {
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
}
