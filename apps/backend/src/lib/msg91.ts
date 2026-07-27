import { env } from '../config/env';
import { logger } from './logger';
import { ThirdPartyOtpDeliveryError } from './errors';

/**
 * PKG-017 — MSG91 OTP delivery. Thin wrapper; the actual OTP generation,
 * hashing, storage, and verification logic lives in the auth module
 * (src/modules/auth) — this file only knows how to send an SMS.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const response = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID,
      mobile: phone.replace('+', ''),
      otp,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // Never log the phone number or OTP itself — see PKG-007 redaction rules.
    logger.error({ status: response.status }, 'MSG91 OTP send failed');
    throw new ThirdPartyOtpDeliveryError();
  }
}
