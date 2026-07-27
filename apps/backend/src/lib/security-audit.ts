import { getAdminClient } from '../db/admin-client';
import { logger } from './logger';

/**
 * PKG-052 — Security Audit Events. Writes to `audit_logs` (migration
 * 015). Always uses the admin client — this is a security control, not a
 * user-facing feature, and must never depend on the calling user's RLS
 * permissions succeeding.
 *
 * Fire-and-forget by design: an audit-log write failure must never block
 * the security-relevant action it's recording (e.g. a failed audit write
 * must not prevent a legitimate login) — logged locally as a fallback.
 */
export const SecurityAuditEvent = {
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  AUTH_OTP_EXCEEDED: 'AUTH_OTP_EXCEEDED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
  INVOICE_DELETED: 'INVOICE_DELETED',
  WORKSHOP_SETTINGS_CHANGED: 'WORKSHOP_SETTINGS_CHANGED',
  REFERRAL_ABUSE_FLAGGED: 'REFERRAL_ABUSE_FLAGGED',
  UNUSUAL_ACCESS_PATTERN: 'UNUSUAL_ACCESS_PATTERN',
} as const;

export type SecurityAuditEventType = (typeof SecurityAuditEvent)[keyof typeof SecurityAuditEvent];

export async function recordSecurityEvent(params: {
  event: SecurityAuditEventType;
  workshopId?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from('audit_logs').insert({
      workshop_id: params.workshopId ?? null,
      actor_user_id: params.actorUserId ?? null,
      action: params.event,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      // Never include phone/OTP/JWT/password in metadata — same rule as
      // application logging (PKG-007).
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message, event: params.event }, 'Security audit log write failed');
  }
}
