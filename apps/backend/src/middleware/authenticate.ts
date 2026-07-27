import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type MeAndMechJwtPayload } from '../lib/jwt';
import { AppError } from '../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';

export interface AuthContext {
  userId: string;
  workshopId: string;
  appRole: 'OWNER' | 'MECHANIC' | 'VIEWER';
  subscriptionStatus: string;
  trialEndsAt: string | null;
  rawToken: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * PKG-019 — JWT Auth Middleware.
 * Every route past this point can trust req.auth is populated and valid —
 * this is the single place token verification happens; do not re-verify
 * tokens ad hoc in individual route handlers.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Missing or malformed Authorization header', 401));
  }

  const token = header.slice('Bearer '.length);

  let payload: MeAndMechJwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Session expired or invalid — please login again', 401));
  }

  req.auth = {
    userId: payload.sub,
    workshopId: payload.workshop_id,
    appRole: payload.app_role,
    subscriptionStatus: payload.subscription_status,
    trialEndsAt: payload.trial_ends_at,
    rawToken: token,
  };

  next();
}
