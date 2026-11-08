# PKG-058 — Post-Launch Monitoring

North Star: DAU/MAU 70% by Month 3.

## First 48 hours
| Window | What |
|---|---|
| 0–6h | Check Sentry + Railway every 30 min |
| 6–24h | Sentry alerts on, check every 2h |
| 24–48h | PostHog funnels review |

Watch: OTP delivery >95%, voice transcription success >85%, WhatsApp delivery >90%, API p95 <500ms, 5xx rate <0.5%, crash-free sessions >99%.

## Weekly targets (from the Implementation Manual)
| Metric | Week 1 | Week 4 | Month 3 |
|---|---|---|---|
| DAU/MAU | >40% | >55% | >70% |
| Job cards per workshop per day | >3 | >5 | >5 |
| Invoices sent on WhatsApp | >60% | >70% | >75% |
| Trial → paid | n/a | >15% | >25% |
| OTP success | >95% | >95% | >97% |

## Events actually instrumented today
Backend PostHog: `invoice_generated`, `invoice_paid`. Mobile PostHog is initialised but **no screen or tap events are wired yet**, so DAU/MAU cannot be computed from PostHog until app-open and job-card-created events are added on the mobile side. That is the first monitoring task.

## Churn responses
| Signal | Action |
|---|---|
| No app open 3 days | Push (existing triggers) |
| Zero job cards in first 7 days | Personal WhatsApp from Raja |
| Voice failures rising | Check Sentry first, then in-app tip |
| Day 28 no payment intent | Existing one-time offer banner |
