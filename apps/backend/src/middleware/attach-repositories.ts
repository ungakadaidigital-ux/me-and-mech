import type { NextFunction, Request, Response } from 'express';
import { createUserScopedClient } from '../db/user-client';
import { createRepositories, type Repositories } from '../db/repository-factory';
import { AppError } from '../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      repos: Repositories;
    }
  }
}

/**
 * Must run AFTER authenticate (needs req.auth.rawToken). Builds a fresh,
 * RLS-enforced client per request — this is the default, correct data
 * access path for every feature route in Part 4/5. Only Edge Functions /
 * workers reach for the admin client directly.
 */
export function attachRepositories(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(new AppError(ErrorCode.INTERNAL, 'attachRepositories used without authenticate running first', 500));
  }
  const client = createUserScopedClient(req.auth.rawToken);
  req.repos = createRepositories(client);
  next();
}
