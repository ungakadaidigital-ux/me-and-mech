# PKG-060 — Master Package Index

Status key: **Built** = code written, never compiled or run. **Doc** = documentation only. **Partial** = see note. **Human** = needs a person, device, account or legal review.

| PKG | Package | Status | Note |
|---|---|---|---|
| 001–008 | Foundation (monorepo, TS, env, shared types/constants/utils, logging, errors) | Built | Zod env fails boot on bad config |
| 009 | Migrations | Built | 001–031; 013 reserved no-op |
| 010 | RLS policies (GATED) | Partial | Written; `test_rls.sql` **never run** |
| 011–015 | Supabase clients, repositories, seed, migration runner | Built | Seed is smaller than the 3-workshop spec |
| 016–022 | Auth, OTP, onboarding RPC, JWT, RBAC, subscription guard, tests | Built | Own-minted JWTs (MSG91 is not a GoTrue provider) |
| 023–029 | API foundation, workshop, customer, vehicle, job card, invoice, core tests | Built | Tests run only against an in-memory fake |
| 030 | Voice AI (GATED) | Partial | Trial gate built and unit-tested; 24h audio deletion job missing |
| 031 | WhatsApp engine | Partial | 3-layer dedup, TRAI cap, STOP built; Wati signature check missing |
| 032 | Push + engagement | Built | Real firebase-admin; QStash schedules are an ops step |
| 033 | Inventory | Built | Stock adjust is two writes, not one transaction |
| 034 | Referral rewards (GATED) | Partial | Rewards + idempotency built; abuse detection missing |
| 035 | Reports | Built | `topCustomers` is N+1-ish, noted in PKG-050 |
| 036 | Razorpay (GATED) | Built | Idempotent via unique event id; uses raw body |
| 037–045 | Mobile app (16 screens, offline queue, voice, referral) | Partial | No icon/splash assets, no customer picker in new-job screen, no device testing |
| 046 | Tamil PDF invoices | Partial | Needs Noto Sans Tamil TTFs (not included) |
| 047 | Sentry | Built | Needs DSNs |
| 048 | PostHog | Partial | Only 2 backend events; mobile events not wired |
| 049 | FCM | Doc + Human | Needs Firebase project and credential files |
| 050 | Performance | Doc | Lists what is not done |
| 051 | CI/CD | Built | Workflows + `railway.json`; need repo secrets and GitHub Environment approval |
| 052 | Security hardening | Partial | 4 of 9 audit events wired; phone encryption deferred |
| 053 | Play Store | Doc + Human | Screenshots, privacy policy, keystore |
| 054 | Unit test infra | Built | Coverage gate scoped to 6 logic files; never run |
| 055 | Integration/E2E | Doc | Detox not set up |
| 056 | UAT/beta | Doc | |
| 057 | Launch runbook | Doc | |
| 058 | Monitoring | Doc | |
| 059 | Handbook | Doc | |
| 060 | This index | Doc | |

## Locked decisions this repo follows
`workshops` is the parent table; money is a string; GST is 0; referral code `MM-`; reward tiers 1/3/5/10; read-only locks (new job cards, voice, invoices, customers/vehicles, WhatsApp send) while mark-paid stays open; voice blocked for trial; ₹499/₹4,999 flat; Android-only Expo.

## Gated packages and what still gates them
- **PKG-010** → run `test_rls.sql` on staging
- **PKG-030** → trial-gate test green in CI, plus audio deletion job
- **PKG-034** → decide and build abuse detection (needs a device fingerprint from the app)
- **PKG-036** → webhook replay test on staging

## Dependency order
Foundation (001–008) → DB (009–015) → Auth (016–022) → Core API (023–029) → Feature modules (030–036) in parallel with Mobile (037–045) → Hardening (046–053) → Test/launch (054–060).

## Highest launch risks, in order
1. Nothing has ever been compiled or executed
2. RLS never tested against a real database
3. Wati template approval and Razorpay KYC lead times
4. Referral abuse detection absent
5. Mobile app never run on a physical device
