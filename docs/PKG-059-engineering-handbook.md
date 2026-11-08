# PKG-059 — Engineering Handbook

## Local setup
1. Node 20, `npm ci` at repo root
2. `npm run build --workspace=packages/shared`
3. Copy `apps/backend/.env.example` to `.env`, fill values
4. Apply migrations with the Supabase CLI (`npm run migrate --workspace=apps/backend`)
5. Backend: `npm run dev --workspace=apps/backend`; mobile: `npx expo start` in `apps/mobile`

## Architecture in one page
Router → Controller → Service → Repository. Requests use a per-request Supabase client built from the caller's JWT, so RLS is the enforcement boundary. The admin (service-role) client is only for webhooks, QStash workers, onboarding and the invoice-number RPC. Money is a string everywhere. GST is 0 in the MVP. Job card status: draft → in_progress → invoiced → paid; only the invoice module moves it past `in_progress`.

## Code review checklist
- Security: no secrets in code; `workshop_id` comes from the JWT, never the body; no phone/OTP/JWT in logs
- Database: new column means a new migration; no `MAX()+1` numbering; queries scoped by workshop
- TypeScript: no `any` without a comment; typed errors only (`AppError` subclasses)
- Tamil UI: new user-visible strings are Tamil first; copy changes need Raja's approval
- Tests: new business rule has a unit test; new route has an integration test
- Performance: lists are paginated; no N+1 loops
- Locked rules untouched: pricing, trial/read-only matrix, referral tiers, template names

## Naming
Files kebab-case; classes PascalCase; functions camelCase; constants SCREAMING_SNAKE; DB tables and columns snake_case; routes kebab-case; Wati templates `me_mech_*`; referral codes `MM-XXXXX`.

## Agency boundary
Agency decides: implementation approach, minor library versions, test strategy, bug fixes, formatting. Agency never decides: schema changes, new endpoints, business rules, pricing/subscription logic, template content, security architecture, Tamil copy, vendors.

## Known follow-ups (carried forward, not hidden)
- `customer.phone` not encrypted (needs HMAC lookup column)
- Referral abuse detection logic missing
- Wati webhook signature verification missing
- Voice audio 24h deletion job missing
- In-memory rate limiter (single instance only)
- `src/lib/qstash-publish.ts` is an unused duplicate of `qstash.ts`
- NewJobCardScreen has no customer/vehicle picker; voice result is not auto-matched to a customer
- Mobile PostHog events not wired; app icon/splash assets missing
- Nothing has been compiled or run (`npm install` never executed)
