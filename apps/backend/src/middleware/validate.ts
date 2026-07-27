import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * PKG-023 — per-route chain, step 4 (after authenticate → subscriptionGuard
 * → authorize, before the controller). Validates and REPLACES req.body
 * with the parsed/coerced result, so controllers can trust its shape
 * without re-validating.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ValidationError('Invalid request body', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}
