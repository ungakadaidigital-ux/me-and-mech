PKG-052 — Security Hardening
Implemented
Per-endpoint rate limits now match the locked table exactly:
POST /auth/request-otp: 3/10min
POST /auth/verify-otp: 5/5min
POST /voice/transcribe: 20/hour (fixed this pass — was only covered by the 200/min global default before)
POST /referral/apply: 3/24h (fixed this pass — same gap)
All other routes: 200/min global default
Field encryption (AES-256-GCM): workshop.gstNumber, workshop.upiId — encrypted at rest, decrypted transparently in WorkshopRepository. customer.phone is explicitly not encrypted yet — see the long comment in lib/encryption.ts for why (AES-GCM's random IV breaks the exact-match queries findByPhone/dedup depend on; needs a deterministic HMAC lookup-hash column, which is a schema change, not a config flag).
Security audit logging: lib/security-audit.ts, wired into:
AUTH_SUCCESS / AUTH_FAILURE / AUTH_OTP_EXCEEDED — OTP verification
PERMISSION_DENIED — the authorize RBAC middleware
WORKSHOP_SETTINGS_CHANGED — workshop profile updates
SUBSCRIPTION_CHANGED — every Razorpay webhook outcome
OWASP security headers: helmet() applied globally (PKG-023) with its default policy set (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.). No custom CSP configured — this is an API-only service (no HTML rendering), so the default is appropriate; revisit only if the backend ever serves rendered HTML.
Honestly not implemented (flagged, not silently skipped)
REFERRAL_ABUSE_FLAGGED: the referral_entries.abuse_flagged column and the locked abuse heuristic (same device fingerprint as referrer, reused phone number, ≥2 registrations from the same IP within 24h) were designed back in Part 2/5, but the actual detection LOGIC that would set abuse_flagged = true and call recordSecurityEvent was never written — device_fingerprint/ip_address are captured on referral_entries rows but nothing currently inspects them. This is a real gap, not a documentation oversight: implementing it properly needs the mobile app to actually collect and send a device fingerprint (not yet wired in Part 6's onboarding flow either), so building the backend half alone would be incomplete. Flagging as a Part 8 (pre-launch) blocker for the referral system specifically, not something to fake with a partial server-side-only heuristic.
INVOICE_DELETED: no invoice-delete route exists anywhere in this codebase — invoices are immutable once created (the whole design, including the DB trigger in migration 019, treats them as append-only financial records). This audit event has no code path to fire from by design, not by oversight — kept in the SecurityAuditEvent enum for forward-compatibility only.
UNUSUAL_ACCESS_PATTERN: this requires actual anomaly-detection logic (rate-of-change baselines, geographic/device pattern comparison) that doesn't exist anywhere in the spec beyond the event name itself — no attempt made to invent a heuristic for it.
Redis-backed rate limiting: still the in-memory limiter flagged back in Part 4/PKG-050 — real gap if Railway ever runs >1 instance.
