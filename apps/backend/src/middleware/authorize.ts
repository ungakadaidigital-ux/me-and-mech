import type { NextFunction, Request, Response } from 'express';
import { InsufficientPermissionError } from '../lib/errors';
import { recordSecurityEvent, SecurityAuditEvent } from '../lib/security-audit';

export type Permission =
  | 'workshop:update'
  | 'customer:write'
  | 'vehicle:write'
  | 'job_card:write'
  | 'invoice:write'
  | 'invoice:delete'
  | 'inventory:write'
  | 'subscription:manage';

/**
 * PKG-020 — RBAC.
 *
 * MVP has effectively one active role (OWNER) per workshop — MECHANIC/
 * VIEWER exist in the schema for the Month 6 multi-staff roadmap item, not
 * used yet. This map is deliberately permissive for MECHANIC on operational
 * writes (job cards, customers, vehicles) and restrictive on financial/
 * account actions (invoice delete, subscription, workshop settings),
 * anticipating that shape without having a real spec for it yet — flag
 * for revisit once Month 6 actually defines what a MECHANIC can do.
 */
const ROLE_PERMISSIONS: Record<'OWNER' | 'MECHANIC' | 'VIEWER', Set<Permission>> = {
  OWNER: new Set([
    'workshop:update',
    'customer:write',
    'vehicle:write',
    'job_card:write',
    'invoice:write',
    'invoice:delete',
    'inventory:write',
    'subscription:manage',
  ]),
  MECHANIC: new Set(['customer:write', 'vehicle:write', 'job_card:write', 'invoice:write', 'inventory:write']),
  VIEWER: new Set([]),
};

export function authorize(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.appRole;
    if (!role || !ROLE_PERMISSIONS[role].has(permission)) {
      recordSecurityEvent({
        event: SecurityAuditEvent.PERMISSION_DENIED,
        workshopId: req.auth?.workshopId,
        actorUserId: req.auth?.userId,
        metadata: { permission, role },
      });
      return next(new InsufficientPermissionError());
    }
    next();
  };
}
