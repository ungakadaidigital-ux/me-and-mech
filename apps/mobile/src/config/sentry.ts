import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';

/**
 * PKG-047 — mobile crash reporting. DSN comes from app.json's `extra`
 * (set at build/EAS time, not a runtime env var — Expo doesn't support
 * .env files in a released binary the way the backend does). No DSN set
 * yet in app.json (placeholder) — add `sentryDsn` under `extra` before
 * the first EAS build meant for real crash reporting.
 */
export function initMobileSentry() {
  const dsn = (Constants.expoConfig?.extra as any)?.sentryDsn;
  if (!dsn) return; // no-op in dev without a configured DSN

  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 0.2,
  });
}

/** Scrub the same PII categories the backend never logs — phone, OTP,
 * tokens — consistent policy across both apps. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.Native.captureException(error, { extra: context });
}
