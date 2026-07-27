import { getAdminClient } from '../../db/admin-client';
import { generateOtp, hashSecret, verifySecret } from '../../lib/crypto';
import { sendOtpSms } from '../../lib/msg91';
import { InvalidOtpError, OtpExpiredError, ValidationError } from '../../lib/errors';
import { isValidIndianPhone, normalizeIndianPhone } from '@me-and-mech/shared';
import { recordSecurityEvent, SecurityAuditEvent } from '../../lib/security-audit';

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_VERIFY_ATTEMPTS = 3;

/**
 * PKG-017 — OTP Auth Flow — Backend.
 * Custom OTP challenge/response, independent of GoTrue's phone provider —
 * see lib/jwt.ts for why. MSG91 is the delivery channel only.
 */

export async function requestOtp(rawPhone: string): Promise<{ expiresIn: number }> {
  if (!isValidIndianPhone(rawPhone)) {
    throw new ValidationError('Phone must be a valid 10-digit Indian mobile number');
  }
  const phone = normalizeIndianPhone(rawPhone);
  const otp = generateOtp();
  const otpHash = hashSecret(otp);

  const supabase = getAdminClient();
  const { error } = await supabase.from('otp_requests').insert({
    phone,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw error;

  await sendOtpSms(phone, otp);

  return { expiresIn: OTP_TTL_SECONDS };
}

export async function verifyOtp(rawPhone: string, otp: string): Promise<{ phone: string }> {
  if (!isValidIndianPhone(rawPhone)) {
    throw new ValidationError('Phone must be a valid 10-digit Indian mobile number');
  }
  const phone = normalizeIndianPhone(rawPhone);
  const supabase = getAdminClient();

  const { data: request, error } = await supabase
    .from('otp_requests')
    .select('*')
    .eq('phone', phone)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!request) throw new InvalidOtpError(0);

  if (new Date(request.expires_at) < new Date()) {
    throw new OtpExpiredError();
  }

  if (request.attempts >= MAX_VERIFY_ATTEMPTS) {
    await recordSecurityEvent({ event: SecurityAuditEvent.AUTH_OTP_EXCEEDED, metadata: { phoneLast4: phone.slice(-4) } });
    throw new InvalidOtpError(0);
  }

  const isValid = verifySecret(otp, request.otp_hash);

  if (!isValid) {
    await supabase.from('otp_requests').update({ attempts: request.attempts + 1 }).eq('id', request.id);
    await recordSecurityEvent({ event: SecurityAuditEvent.AUTH_FAILURE, metadata: { phoneLast4: phone.slice(-4), attempt: request.attempts + 1 } });
    throw new InvalidOtpError(MAX_VERIFY_ATTEMPTS - request.attempts - 1);
  }

  await supabase.from('otp_requests').update({ consumed_at: new Date().toISOString() }).eq('id', request.id);
  await recordSecurityEvent({ event: SecurityAuditEvent.AUTH_SUCCESS, metadata: { phoneLast4: phone.slice(-4) } });

  return { phone };
}
