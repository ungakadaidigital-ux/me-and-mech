PKG-053 — Play Store Deployment Package
Store listing (Tamil-primary, founder-approved per PKG-053 decision log)
App Name:          Me & Mech
Short Description: பேசு Bill போடு மறக்காதே
Category:          Business
Content Rating:    Everyone / PEGI 3
Package name:      com.ungakadaidigital.meandmech
A full-length description, feature bullets, and localized (Tamil + English) long descriptions are marketing copy — Raja's call per the locked "Tamil UI copy is founder-controlled" rule, not something to draft here without that review.
Permissions justification (for Play Store review)
Permission
Justification
RECORD_AUDIO
Tamil voice billing feature. Audio processed by Sarvam AI for transcription. Deleted after 24 hours. No other use.
INTERNET
API communication, WhatsApp delivery, voice transcription, cloud sync.
ACCESS_NETWORK_STATE
Offline-mode detection (PKG-040) — the app queues writes locally when this permission reports no connectivity.
RECEIVE_BOOT_COMPLETED from the original draft spec is not included in app.json — Expo's push notification system (expo-notifications) doesn't require it for the current implementation (FCM tokens are re-registered on app foreground, not restored via a boot receiver). Flag for the agency to revisit only if a boot-persisted local-notification feature is added later.
Required screenshots (not producible here — design/QA deliverable)
8 screenshots at 1080×1920px, per the locked list: Dashboard, Voice billing (waveform visible), Invoice (Tamil + Mechanic Orange branding), WhatsApp delivery confirmation, Customer list, Vehicle history timeline, Reports/revenue chart, Referral dashboard. These require a running app on a real or emulated device — not something I can generate from source code review; flagging as a pre-submission task for whoever has the app running.
Keystore security — critical, non-negotiable
Raja must personally hold the keystore file. Losing it prevents all future app updates — there is no recovery path. The agency generates it during the EAS build setup, but ownership transfers to Raja immediately: back up to 2 separate secure locations (e.g. password manager + physical encrypted drive), never only in the agency's systems or a single cloud account.
Launch-blocking timelines (from Part 7, restated here since PKG-053 is
where they become concrete action items)
Play Store review: first-time submissions take 3–7 days. RECORD_AUDIO draws additional scrutiny. Submit to the internal testing track at least 2 weeks before intended public launch.
Wati template approval (PKG-031, already flagged in the Production Execution Plan): 24–72 hours, can be rejected — submit 2 weeks ahead.
Razorpay KYC (already flagged): 3–5 business days — start immediately if not already done.
Privacy policy
A hosted, public privacy policy URL is REQUIRED by Play Store submission and is not included in this ZIP — it needs actual legal review for a payments + voice-recording + WhatsApp-messaging consumer app, not a generated draft passed off as compliant. Flagging as a genuine pre-launch blocker requiring a human (ideally with legal input), not a documentation gap to fill with placeholder text.
What IS ready in this delivery
apps/mobile/eas.json — build profiles (preview/internal APK, production app-bundle) and a submit profile pointing at a Google Play service account key path (the key itself is a credential — not included, same reasoning as every other secret in this codebase).
apps/mobile/app.json — package name, permissions, scheme all finalized and consistent with the locked domain/branding decisions.
