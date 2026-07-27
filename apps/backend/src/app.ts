import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { Sentry } from './lib/sentry';
import { logger } from './lib/logger';
import { correlationId } from './middleware/correlation-id';
import { requestTimeout } from './middleware/request-timeout';
import { defaultRateLimit } from './middleware/rate-limit';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { healthRouter } from './routes/health';
import { authRouter } from './modules/auth/auth.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { workshopRouter } from './modules/workshop/workshop.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { vehicleRouter } from './modules/vehicle/vehicle.routes';
import { jobCardRouter } from './modules/job-card/job-card.routes';
import { invoiceRouter } from './modules/invoice/invoice.routes';
import { voiceRouter } from './modules/voice/voice.routes';
import { watiWebhookRouter } from './modules/notification/wati-webhook.routes';
import { engagementRouter } from './modules/engagement/engagement.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { referralRouter } from './modules/referral/referral.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { subscriptionRouter } from './modules/subscription/subscription.routes';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * PKG-023 — API Architecture Foundation.
 *
 * Global middleware chain order is NON-NEGOTIABLE (per the locked spec):
 *   1. correlationId    2. requestLogger    3. security (Helmet)
 *   4. cors             5. compression      6. bodyParser
 *   7. timeout          8. globalRateLimiter
 * Sentry's request/tracing handlers wrap everything (from PKG-047), and
 * its error handler + our own errorHandler close the chain — see PKG-008.
 *
 * Per-route chain (applied in each feature module):
 *   authenticate → subscriptionGuard → authorize(Permission) → validate(schema) → controller
 *
 * Razorpay webhook note (PKG-036): rather than giving that one route a
 * separate express.raw() parser — which would never actually run, since
 * this global express.json() already consumes the body first — the global
 * parser's `verify` callback stashes the exact raw bytes on req.rawBody.
 * subscription.routes.ts verifies the HMAC signature against THAT, not
 * against a re-serialization of the parsed body (which can differ
 * byte-for-byte and fail verification even for a legitimate payload).
 */
export function createApp() {
  const app = express();

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  app.use(correlationId);           // 1
  app.use(pinoHttp({ logger }));    // 2
  app.use(helmet());                // 3
  app.use(cors());                  // 4
  app.use(compression());           // 5
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  ); // 6
  app.use(requestTimeout());        // 7
  app.use(defaultRateLimit);        // 8

  // --- Routes ---
  app.use(healthRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', onboardingRouter);
  app.use('/api/v1', workshopRouter);
  app.use('/api/v1', customerRouter);
  app.use('/api/v1', vehicleRouter);
  app.use('/api/v1', jobCardRouter);
  app.use('/api/v1', invoiceRouter);
  app.use('/api/v1', voiceRouter);
  app.use('/api/v1', watiWebhookRouter);
  app.use('/api/v1', engagementRouter);
  app.use('/api/v1', inventoryRouter);
  app.use('/api/v1', referralRouter);
  app.use('/api/v1', reportsRouter);
  app.use('/api/v1', subscriptionRouter);

  app.use(notFoundHandler);
  app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandler);

  return app;
}
