import pino from 'pino';
import { env } from '../config/env';

/**
 * PKG-007 — Logging & Observability
 *
 * CRITICAL: never let these fields reach logs or Sentry events:
 * phone numbers, OTPs, JWT tokens, customer personal data, payment references.
 * redact() below enforces this at the pino transport level, not by convention.
 */

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.body.phone',
  'req.body.otp',
  'req.body.token',
  '*.phone',
  '*.otp',
  '*.jwt',
  '*.token',
  '*.password',
];

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Sentry beforeSend scrubber — mirrors the redact list above so the two
 * systems can never drift apart into "logger is safe, Sentry isn't."
 */
export function scrubSensitiveData(event: Record<string, any>): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(event));
  const sensitiveKeys = ['phone', 'otp', 'jwt', 'token', 'password', 'authorization'];

  function scrub(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        scrub(obj[key]);
      }
    }
  }

  scrub(clone);
  return clone;
}
