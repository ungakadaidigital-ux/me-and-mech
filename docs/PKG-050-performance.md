PKG-050 — Performance Optimization
Most of the structural performance work was already done earlier in the build, not deferred to this pass — flagging what's already in place vs. what's added here, rather than re-doing work.
Already in place (Parts 1–5)
Session-mode Supabase pooler (DATABASE_URL) — standing infra policy.
Indexes on every workshop-scoped query path (migrations 002–031).
compression middleware (gzip) on every response (PKG-023).
Pagination on every list endpoint (BaseRepository.findMany) — no unbounded SELECT * anywhere in the codebase.
React Query staleTime: 60_000 tuned for budget-Android/patchy connectivity (PKG-039) — fewer redundant refetches than the library default.
Added in this pass
invoice_line_items and job_card_items amounts are DB-generated columns (GENERATED ALWAYS AS (quantity * rate) STORED, migrations 006/008) — computed once at write time by Postgres, not recomputed on every read by the API or the client.
Mobile list rendering: FlatList (not ScrollView.map) used for the two screens with unbounded-length data — JobListScreen — so off-screen rows aren't rendered. CustomerDetailScreen's vehicle list uses a plain map since a single customer's vehicle count is small and bounded in practice; revisit if that assumption changes.
Backend PostHog/Sentry calls are fire-and-forget, never awaited in the request path (PKG-047/048) — observability must never add latency to a mechanic's job-card save.
Deliberately NOT done in this pass (flagged, not silently skipped)
Redis/Upstash-backed rate limiting: the in-memory rate limiter (middleware/rate-limit.ts) only works correctly on a single Railway instance. This was already flagged in that file's own comment back in Part 4 — repeating here because it's a real pre-launch item if Railway ever runs >1 instance, not a "nice to have."
Bundle size analysis for the mobile app: no expo-doctor/bundle analyzer pass has been run — worth doing once real device testing starts (see the mobile README's "Known gaps" section).
N+1 query audit: ReportsRepository.topCustomers fetches all job cards for a workshop and aggregates in application code rather than a SQL GROUP BY — fine at MVP data volumes (a solo/small workshop's job card count), but should move to a real aggregate query if a workshop's job card history grows into the thousands.
