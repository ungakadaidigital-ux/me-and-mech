# PKG-055 — Integration & E2E Testing

## What exists in the repo (not yet run — see "Never executed" below)
| Layer | Location | Covers |
|---|---|---|
| Unit | `apps/backend/tests/unit/` | shared utils, Wati schedule, case-mapping, field encryption, voice trial gate, referral milestones |
| Auth/RBAC | `apps/backend/tests/auth/` | JWT claims, authenticate/authorize/subscription-guard |
| Core flow | `apps/backend/tests/integration/core-flow.test.ts` | customer → vehicle → job card → invoice → PAID against an in-memory fake |

`npm run test:coverage --workspace=apps/backend` runs all of it. CI runs the same command on every PR.

## Never executed
This sandbox has no network, so `npm install` and `vitest` have never run on any of these tests. Expect a first-run fix pass (import paths, shared-package build order). Treat "tests written" as different from "tests green".

## What the fake client can NOT prove
`tests/fakes/fake-supabase-client.ts` does not enforce RLS, constraints, triggers or unique violations. Three things therefore need a **real staging Supabase project**:
1. `apps/backend/supabase/test_rls.sql` — two-workshop isolation (PKG-010 gate, never run)
2. Invoice-number concurrency (`next_invoice_number` under parallel requests)
3. Razorpay webhook replay (same event id twice → one subscription extension)

## Staging API checks (run with curl or any REST client, after staging deploy)
1. `POST /auth/request-otp` then `verify-otp` → new user gets `onboardingToken`
2. `POST /workshop` → session + MM- referral code
3. Create customer, vehicle, job card; PATCH status `in_progress`; `POST /jobs/:id/invoice`
4. `POST /invoices/:id/mark-paid` while workshop is `read_only` → must succeed
5. `POST /jobs` while `read_only` → 402
6. `POST /voice/transcribe` while `trial` → 402 `ERR_VOICE_TRIAL_BLOCKED`
7. Workshop A token reading Workshop B customer id → 404

## Mobile E2E
The Implementation Manual specifies Detox. Detox needs a built APK, an emulator and a CI runner with KVM — none of that is configured, and no Detox specs were written. Flows 1–5 below are the manual QA script until someone sets Detox up:
1. Dashboard → new customer → vehicle → job card → invoice → WhatsApp → mark paid
2. Voice billing on a **paid** account (trial must show the upgrade card)
3. Offline: airplane mode → create job card → reconnect → queue drains
4. Referral share opens WhatsApp with an `MM-` code
5. Day-30 read-only: mark-paid still works, new job card is blocked

## Known test-vs-product gap
The Implementation Manual's old UAT text says trial voice uses Android native STT. The locked decision is **voice blocked for trial**. Tests and UAT follow the locked decision.
