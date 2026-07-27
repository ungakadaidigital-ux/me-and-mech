# Me & Mech — Monorepo

Tamil-first workshop management platform for Tamil Nadu mechanics.
Unga Kadai Digital.

## Structure

```
apps/backend    Node.js / Express API (Railway)
apps/mobile     Expo (React Native) app — Android-only for MVP
packages/shared TypeScript types, constants, and utils shared by both apps
```

## Setup

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
# fill in apps/backend/.env with real credentials
npm run build --workspace=packages/shared
supabase link --project-ref <your-project-ref>     # one-time per environment
npm run migrate --workspace=apps/backend             # applies all migrations in order
npm run seed --workspace=apps/backend                # local/staging only
npm test --workspace=apps/backend                    # unit tests
npm run dev:backend
```

Verify: `curl http://localhost:3000/health` → `{ "status": "ok", ... }`

## Part 1 — Foundation & Scaffolding (PKG-001–008)

- PKG-001: monorepo structure (npm workspaces)
- PKG-002: TypeScript configuration (base + per-package)
- PKG-003: environment configuration (`apps/backend/src/config/env.ts`, Zod-validated, fails fast)
- PKG-004: shared domain types (`packages/shared/src/types`)
- PKG-005: shared constants (`packages/shared/src/constants`) — pricing, referral rules, domains, rate limits. These mirror locked product decisions; do not edit values here without a recorded decision.
- PKG-006: shared utility functions (`packages/shared/src/utils`) — phone/vehicle/referral-code validation, currency formatting
- PKG-007: logging & observability (`apps/backend/src/lib/logger.ts`, `sentry.ts`) — PII-scrubbing enforced at the transport level
- PKG-008: error handling architecture (`apps/backend/src/lib/errors.ts`, `middleware/error-handler.ts`)

## Part 2 — Database Layer (PKG-009–015)

- `apps/backend/supabase/migrations/001–025` — every table, index, trigger,
  pg_cron job, and RLS policy, in strict apply order. Includes the finalized
  referral schema (021–023) and the idempotent legacy-cleanup migration (024).
  Migration 013 is intentionally reserved/empty — see the file for why.
- `apps/backend/supabase/test_rls.sql` — the two-workshop isolation test
  required before PKG-010 (GATED) sign-off. **Must be run against staging
  with two real workshop accounts before this module is considered done.**
- `apps/backend/src/db/admin-client.ts` / `user-client.ts` / `transaction.ts`
  — PKG-011. Service-role vs. RLS-enforced client boundary is explicit in
  the code, not just convention.
- `apps/backend/src/db/repositories/*` — PKG-012 (base pattern) + PKG-013
  (workshop, customer, vehicle, job card, invoice, and the full referral
  system). Inventory/notifications/subscription repositories ship with
  their feature modules in later parts — see the note in `repositories/index.ts`.
- `apps/backend/scripts/seed.ts` — PKG-014, refuses to run in production.
- `apps/backend/scripts/migrate.ts` + extended `/health/db` — PKG-015.

## Part 5 — Differentiating Feature Modules (PKG-030–036)

- **PKG-030 Voice AI** (`src/lib/sarvam.ts`, `gpt-extractor.ts`, `audio-storage.ts`,
  `src/modules/voice/*`) — Sarvam transcription (10s timeout, 3x backoff
  retry), GPT-4o-mini extraction with the locked system prompt verbatim,
  Supabase Storage upload (24h TTL — deletion is a separate scheduled job,
  not implemented as raw SQL since Storage deletion needs the Storage API).
  **Cost Control Gate** (`trial-gate.ts`) is deliberately separate from
  `subscriptionGuard` — trial workshops are blocked from voice specifically,
  even though every other feature is full-access during trial.
- **PKG-031 WhatsApp Engine** (`src/config/wati-templates.ts`, `src/lib/wati.ts`,
  `src/modules/notification/*`) — all 14 templates (`me_mech_` prefixed),
  `notification_log` + `whatsapp_opt_out` tables, 3-layer dedup, TRAI 2-message/
  24h cap enforced in code, inbound STOP handling, delivery/read webhooks.
- **PKG-032 Engagement Engine** (`src/lib/fcm.ts`, `src/modules/engagement/*`)
  — real `firebase-admin` FCM integration (flagging: I initially wrote this
  as a stub and caught/fixed it myself before delivery — see git history if
  this matters to your review). Pending-payment alert, daily summary,
  onboarding welcome, trial reminder sweep. All `/internal/triggers/*`
  routes are QStash-invoked and signature-verified
  (`middleware/verify-qstash.ts`) — never reachable with a workshop JWT.
- **PKG-033 Inventory** (`src/modules/inventory/*`) — CRUD + stock
  adjustment with transaction logging. Flagged in-code: the two-table write
  (inventory + inventory_transactions) isn't atomic at MVP volume — would
  need an RPC function (same pattern as migration 027) if it becomes a real
  concurrency risk.
- **PKG-034 Referral Rewards & Subscription Entitlements** (`src/modules/referral/*`)
  — **GATED**. Wires the Part 2 referral repositories to real HTTP routes:
  apply-code (referee, separate call from onboarding by design — a bad code
  must never block account creation), success detection (best-effort,
  non-blocking, hooked into job card creation), and the reward worker
  (QStash-invoked only, idempotent via both a QStash deduplicationId AND
  the DB unique constraint from migration 023 — two independent layers).
- **PKG-035 Reports & Analytics** (`src/modules/reports/*`) — revenue
  summary, job card counts, voice usage (proxy for "time saved" — the
  actual minutes-saved framing is a mobile-side presentation choice, not
  computed here), top customers.
- **PKG-036 Razorpay Subscription Module** (`src/lib/razorpay.ts`,
  `src/modules/subscription/*`) — **GATED**. Order creation, and a webhook
  handler with the same idempotency pattern as PKG-034 (insert into
  `subscription_events` first, unique-violation = safe replay). **Real bug
  I caught while wiring this**: a route-level `express.raw()` on the
  webhook route would never actually see the raw body, because the global
  `express.json()` (PKG-023) already consumes the request stream first.
  Fixed by capturing raw bytes via `express.json()`'s `verify` callback
  (`req.rawBody`) instead — see `app.ts`'s comment. Webhook always returns
  200, even on internal processing failure, per the locked spec.

### New locked-adjacent additions this module
- `workshops.last_reminded_at` / `reminder_sequence` (migration 031) —
  WhatsApp dedup layer 1.
- `notification_log`, `whatsapp_opt_out`, `push_tokens` tables (029, 030).

### Try it
```bash
npm test --workspace=apps/backend
```

## Part 4 — Backend API Core Feature Modules (PKG-023–029)

**Bugfix discovered and corrected during this module (flagging for transparency):**
every repository since Part 2 was casting raw Supabase rows (snake_case,
e.g. `job_card_id`) directly to the shared camelCase domain types
(`jobCardId`) with `as Type` — a cast that doesn't transform data, so those
fields were `undefined` at runtime. It wasn't caught earlier because Part
2/3 code never read those specific fields back. Fixed via
`src/lib/case-mapping.ts` (`rowToCamel`/`rowsToCamel`), applied at every
repository read path. This is a bug fix, not a locked-decision or
architecture change — the domain types were always meant to be camelCase
(PKG-004); this closes a gap in the earlier implementation.

- **PKG-023** (`src/app.ts`, `src/middleware/correlation-id.ts`,
  `request-timeout.ts`, `validate.ts`, `attach-repositories.ts`) — the
  global middleware chain now matches the locked order exactly:
  correlationId → requestLogger → Helmet → cors → compression → bodyParser
  → timeout → globalRateLimiter. Per-route chain: authenticate →
  subscriptionGuard → authorize(Permission) → validate(schema) → controller.
- **PKG-024** (`src/modules/workshop/*`) — profile get/update. No
  subscriptionGuard on update — profile editing isn't in the locked list of
  actions blocked post-trial.
- **PKG-025** (`src/modules/customer/*`) — create/list/search/update, with
  workshop-scoped duplicate-phone detection (409 with the existing
  customer, per the API spec). subscriptionGuard on create only.
- **PKG-026** (`src/modules/vehicle/*`) — TN plate validation/normalization,
  workshop-scoped duplicate detection. subscriptionGuard on create only.
- **PKG-027** (`src/modules/job-card/*`) — status state machine
  (draft→in_progress only, directly; invoiced/paid are set exclusively by
  the invoice module, never via this route, so the two can't drift out of
  sync via separate write paths). subscriptionGuard on job card creation.
- **PKG-028** (`supabase/migrations/028_create_invoice_number_counter.sql`,
  `src/modules/invoice/*`) — invoice numbering via an atomic
  UPDATE...RETURNING counter table, not `MAX(invoice_number)+1` (the locked
  spec calls that out by name as a concurrency bug). **mark-paid
  deliberately has no subscriptionGuard, anywhere in the chain** — flagged
  in three places (migration, service, routes) so it can't be "fixed" by
  someone who didn't get the memo.
- **PKG-029** (`tests/integration/core-flow.test.ts`,
  `tests/fakes/fake-supabase-client.ts`) — a real integration test running
  the actual service/repository code (not mocked business logic) against
  an in-memory fake Postgres/PostgREST substitute. Covers the full
  customer→vehicle→job card→invoice→payment flow, invalid state
  transitions, duplicate detection, and invoice-number collision safety
  across concurrent-style sequential calls. Does NOT verify RLS or DB
  constraints/triggers — that needs a live Supabase project (PKG-055,
  Part 8).

### Try it
```bash
npm test --workspace=apps/backend   # PKG-022 + PKG-029 tests
```

## Part 3 — Authentication & Authorization (PKG-016–022)

- **PKG-016** (`src/lib/jwt.ts`, `src/modules/auth/session.service.ts`) —
  since MSG91 (not a native GoTrue provider) delivers OTPs, the backend
  mints its own Supabase-compliant JWTs (signed with `JWT_SECRET`, the
  project's JWT secret) rather than routing through GoTrue's phone-auth
  flow. `role: "authenticated"` satisfies PostgREST; `app_role` carries our
  OWNER/MECHANIC/VIEWER; `sub` = `users.id`, matching what `auth_workshop_id()`
  (migration 025) looks up. Refresh tokens are opaque, hashed, and tracked
  in `auth_sessions` (migration 026) — this is our own session ledger, not
  GoTrue's.
- **PKG-017** (`src/modules/auth/otp.service.ts`, `src/lib/msg91.ts`,
  `src/lib/crypto.ts`) — OTP generation/hashing/storage/verification, MSG91
  delivery. Rate-limited per the locked limits (3/10min request, 5/5min
  verify).
- **PKG-018** (`supabase/migrations/027_create_onboarding_function.sql`,
  `src/modules/onboarding/*`) — the corrected 6-step onboarding transaction,
  implemented as a single Postgres function for real atomicity (see the
  PKG-011 note on why this can't be a client-side transaction). Referral
  code generation goes through `referral_codes` with the `MM-` prefix, per
  the finalized schema — not a `workshops` column, not `MX-`.
- **PKG-019** (`src/middleware/authenticate.ts`) — verifies the access
  token, attaches `req.auth`. Single verification point; route handlers
  should never re-verify tokens themselves.
- **PKG-020** (`src/middleware/authorize.ts`) — RBAC. MVP effectively uses
  OWNER only; MECHANIC/VIEWER permission sets are a best-effort placeholder
  for the Month 6 multi-staff roadmap item and should be revisited once
  that feature has a real spec.
- **PKG-021** (`src/middleware/subscription-guard.ts`) — enforces the
  locked trial/read-only rule. **Must never be attached to the mark-paid
  route** — flagged explicitly in the file's own comment so it isn't
  attached by accident during Part 4 wiring.
- **PKG-022** (`tests/auth/*.test.ts`) — unit tests for JWT claim
  correctness, secret hashing, and all three middleware layers (auth/RBAC/
  subscription guard) — the logic that doesn't require a live database.
  OTP-service and session-service tests that need a real Supabase project
  are deferred to the staging integration pass (PKG-055, Part 8) rather
  than faked with mocks that wouldn't catch real RLS/DB issues.

Live-endpoint smoke test once migrated and running:
```bash
curl -X POST http://localhost:3000/api/v1/auth/request-otp -H 'Content-Type: application/json' -d '{"phone":"9840012345"}'
curl -X POST http://localhost:3000/api/v1/auth/verify-otp -H 'Content-Type: application/json' -d '{"phone":"9840012345","otp":"123456"}'
```

## Part 7 — Infrastructure, Observability & Production Hardening (PKG-046–053)

All 8 packages MVP-required per the locked spec, not deferred post-launch.

- **PKG-046 Tamil PDF Invoices** (`src/modules/pdf/`) — full PDFKit
  generator, embedded Noto Sans Tamil (font TTFs not included — binary
  assets, download from Google Fonts and place at
  `apps/backend/assets/fonts/`), Supabase Storage upload with 1hr signed
  URLs, wired into invoice generation (best-effort — a PDF failure never
  rolls back the invoice record).
- **PKG-047 Sentry**: backend already wired (Part 1/4); mobile side added
  this pass (`sentry-expo`, no-ops without a configured DSN).
- **PKG-048 PostHog**: server + mobile clients, `invoice_generated`/
  `invoice_paid` events wired server-side.
- **PKG-049 FCM Setup**: functionally complete since Part 5/6 — this
  pass adds the one-time infra setup doc (`docs/PKG-049-fcm-setup.md`) —
  `google-services.json` and the Firebase service account are credentials,
  not included.
- **PKG-050 Performance**: `docs/PKG-050-performance.md` — documents
  what's already in place vs. what's genuinely deferred (Redis rate
  limiting, bundle analysis, an N+1 in `topCustomers`), rather than
  padding with re-work of already-optimized paths.
- **PKG-051 CI/CD**: `.github/workflows/{ci,deploy-staging,deploy-production}.yml`,
  `railway.json`. CI = typecheck+lint+test+build+audit on every PR.
  Staging = auto-deploy on push to main + smoke test + EAS preview build.
  Production = `workflow_dispatch` only, requires typing `DEPLOY`, tags
  the release, uploads Sentry source maps. GitHub Environment protection
  should also be configured for a human-approval gate — the workflow's
  confirm-string is a second guard, not the only one.
- **PKG-052 Security Hardening**: `docs/PKG-052-security.md` — field
  encryption (AES-256-GCM) for `workshop.gstNumber`/`upiId` (customer.phone
  explicitly deferred, with the reason documented — it needs a schema
  change, not a config flag), fixed two real gaps (voice/referral rate
  limits weren't actually applying their locked per-endpoint values before
  this pass), security audit logging wired into 4 of the 9 locked event
  types. The other 5 are honestly documented as not-yet-implemented, with
  reasons — including one (`REFERRAL_ABUSE_FLAGGED`) that needs mobile-side
  work not yet done, and one (`INVOICE_DELETED`) that has no code path by
  design since invoices are immutable.
- **PKG-053 Play Store**: `apps/mobile/eas.json`,
  `docs/PKG-053-play-store.md` — listing metadata, permissions
  justification, keystore ownership rules, launch-blocking timelines.
  Screenshots, privacy policy, and full description copy are flagged as
  genuine human deliverables (device access / legal review), not filled
  with placeholder content.

## Part 6 — Mobile App: React Native / Expo (PKG-037–045)

See `apps/mobile/README.md` for full detail. Full Expo/Android app: navigation,
Tamil design system, API client, offline sync (SQLite queue, offline-first
job card creation), all 16 screens (auth, dashboard, jobs, invoices,
customers, vehicles, voice billing, settings/profile/referral).

**Known gaps, honestly flagged rather than faked**: design assets (icon/
splash PNGs) aren't code and aren't included; voice→job-card hand-off
currently requires manual customer/vehicle selection rather than
auto-matching; `google-services.json` (Firebase credential) isn't shipped;
no physical device testing has been done (can't test hardware from here) —
all detailed in the mobile README.

## Not yet included (upcoming modules)
- Part 8 (PKG-054–060): full test suite (beyond the unit/integration
  tests already in `apps/backend/tests`), UAT/beta framework, launch
  runbook, post-launch monitoring protocol, documentation package, master
  dependency index.
- Voice-session audio auto-deletion (24h) is designed but not implemented
  as a running scheduled job — needs a QStash-scheduled call to a cleanup
  endpoint using the Storage API, flagged in `audio-storage.ts`.
- Wati webhook signature verification is not yet implemented (flagged in
  `wati-webhook.routes.ts`) — pending confirmation of Wati's signing scheme
  for this account.
- QStash schedule registration (the actual cron setup calling
  `/internal/triggers/*` on a schedule) is an infra/ops step, not
  application code — needs to be run once per environment via the QStash
  dashboard or CLI, not shipped as a migration or script here.
- Referral abuse detection logic (`REFERRAL_ABUSE_FLAGGED`) — see
  `docs/PKG-052-security.md` for why this is a real gap, not an oversight.

## Engineering rules that apply to every future module
- Any internal tool touching production data connects via a scoped, read-only
  Supabase DB role — never the service-role key, never a personal login.
- Session-mode pooler only for `DATABASE_URL` — never transaction-mode.
- Money fields travel as strings end-to-end (mobile → API → DB) — never coerce
  through floating point.
- Never log or send to Sentry: phone numbers, OTPs, JWTs, payment references.
- `subscriptionGuard` never goes on the mark-paid route, or any read route.
