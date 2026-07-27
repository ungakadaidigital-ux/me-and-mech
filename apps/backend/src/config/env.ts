import { z } from 'zod';

/**
 * PKG-003 — Environment Configuration
 * Validates all required environment variables at process startup.
 * The server refuses to boot if anything required is missing or malformed —
 * this is intentional. A backend that starts with a bad config is more
 * dangerous than one that fails loudly at 09:00 before mechanics wake up.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Session-mode pooler connection string — required per standing infra policy.
  // Do NOT point this at the transaction-mode pooler port.
  DATABASE_URL: z.string().min(1),

  // Auth / OTP
  MSG91_AUTH_KEY: z.string().min(1),
  MSG91_TEMPLATE_ID: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // WhatsApp
  WATI_API_ENDPOINT: z.string().url(),
  WATI_API_KEY: z.string().min(1),

  // Payments
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // Voice AI
  SARVAM_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1), // GPT-4o-mini for intent parsing

  // Scheduler
  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),

  // Observability
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),

  // Push notifications (Firebase Admin SDK) — the full service account JSON,
  // stored as a single-line string (e.g. base64-encoded, or the raw JSON if
  // your deploy platform supports multiline secrets). Parsed in lib/fcm.ts.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1),

  // Security
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be a 256-bit hex string (64 chars)'),

  // Domain
  API_BASE_URL: z.string().url().default('https://api.meandmech.ungakadaidigital.com'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:');
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
