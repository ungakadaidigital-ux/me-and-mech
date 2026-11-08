# PKG-057 — Launch Checklist & Go-Live Runbook

Domains (closed): app `meandmech.ungakadaidigital.com`, API `api.meandmech.ungakadaidigital.com`.
Launch Tuesday or Wednesday. Never Friday.

## T-14 days — accounts and approvals (start now, these have lead times)
- [ ] Wati: all `me_mech_` templates submitted (Tamil and English separately), then **approved**, not pending
- [ ] Razorpay KYC approved; live plans ₹499/month and ₹4,999/year created; webhook URL registered with secret
- [ ] Google Play developer account; internal-testing build uploaded; review status checked
- [ ] Keystore generated and held by Raja, backed up in 2 places
- [ ] DNS for both subdomains; SSL active
- [ ] Supabase production project (separate from staging); session-mode pooler string confirmed
- [ ] Railway production service; every variable from `apps/backend/.env.example` set
- [ ] Firebase project, `google-services.json` in the mobile build, `FIREBASE_SERVICE_ACCOUNT_JSON` set (see PKG-049)
- [ ] Storage buckets `voice-sessions` and `invoices` created, both private
- [ ] Noto Sans Tamil TTFs placed in `apps/backend/assets/fonts/`
- [ ] Privacy policy URL live (needs legal review, see PKG-053)
- [ ] OpenAI billing cap set; MSG91 balance topped up
- [ ] QStash schedules created for `/internal/triggers/*` (8 AM / 6 PM IST, trial sweep) and the voice-audio 24h cleanup (cleanup job is **not built yet**)

## T-7 days — quality gates
- [ ] `test_rls.sql` run on staging with two real workshops: **pass**
- [ ] CI green on main (typecheck, lint, tests with coverage, build)
- [ ] Webhook replay test: same Razorpay event twice → one extension
- [ ] Beta finished, zero open P1/P2
- [ ] Tamil text checked on 3 physical devices
- [ ] UPI QR on a real invoice scanned with a real UPI app
- [ ] Referral abuse detection decision made (currently **not implemented**, see PKG-052 doc)
- [ ] Wati webhook signature scheme confirmed and verification added (currently not implemented)

## Launch day
1. `GET /health` and `/health/db` return ok
2. Trigger the production deploy workflow, type `DEPLOY`, watch smoke test
3. Soft launch to the first 10 beta mechanics; watch Sentry and Railway CPU/memory
4. After 2 hours: OTP delivery rate, first invoice PDF opens, first WhatsApp delivered
5. Widen invite only if no P1

## Rollback
Redeploy the previous successful Railway deployment from the Railway dashboard (or `railway` CLI). **Rolling back code does not roll back the database.** Migrations in this repo are additive, but check any new migration before assuming a rollback is safe. Immediate rollback triggers: OTPs not delivering, any cross-workshop data visible, duplicate subscription extensions, crash rate above 5%, failing health check.

## Not verifiable from here
Play Store review time (3–7 days) and "2 weeks ahead" lead times come from the Implementation Manual, not from a source I could check.
