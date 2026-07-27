import * as Sentry from '@sentry/node';
import { env } from '../config/env';
import { scrubSensitiveData } from './logger';

export function initSentry() {
  if (!env.SENTRY_DSN) {
    // Sentry is optional in local dev; required in staging/production via env presence.
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      return scrubSensitiveData(event as unknown as Record<string, any>) as any;
    },
  });
}

export { Sentry };
