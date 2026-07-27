import type { NextFunction, Request, Response } from 'express';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * PKG-023 — global middleware chain, step 7. Voice transcription (Part 5,
 * PKG-030) will need a longer per-route override — do not raise this
 * global default to accommodate it; override at that specific route
 * instead, so every other endpoint keeps a tight 30s ceiling.
 */
export function requestTimeout(ms: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(ms, () => {
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: { code: 'ERR_REQUEST_TIMEOUT', message: 'Request took too long. Please try again.' },
        });
      }
    });
    next();
  };
}
