# Me & Mech — Mobile App (Part 6, PKG-037–045)

Expo (React Native), Android-only for MVP.

## Setup
```bash
cd apps/mobile
npm install
npx expo start
```
Requires `apps/mobile/assets/{icon.png, splash.png, adaptive-icon.png, notification-icon.png}` — not included (design assets, not code). App will fail to build without them; add placeholders before first run if final assets aren't ready.

## What's built

- **PKG-037 Navigation**: `src/navigation/` — Auth stack, bottom tabs (Dashboard/Jobs/Voice/Reports/Settings), root stack with an `accessToken`-based auth gate, deep linking (`meandmech://`).
- **PKG-038 Design System**: `src/theme/tokens.ts` (locked colors/typography), `src/components/` — Button, TamilText, StatusBadge, AmountDisplay, LoadingSkeleton, OfflineBanner, BottomSheet (built on core `PanResponder`, not `react-native-gesture-handler`/`reanimated` — a deliberate dependency-weight trade-off for one draggable sheet), TextField, Card.
- **PKG-039 API Client & React Query**: `src/api/client.ts` (token injection, one auto-refresh-on-401), `src/api/hooks/*` — one hook file per backend domain, matching Part 4/5's routes exactly.
- **PKG-040 Offline Sync**: `src/offline/` — SQLite cache + write queue (FIFO replay, drops unrecoverable 4xx mutations rather than retrying forever, preserves order on network failure). **Job card creation is offline-first** — the highest-value path to keep working with no signal.
- **PKG-041 Auth screens**: Phone entry → OTP verify → workshop registration, wired to the real Part 3 auth flow (including the onboarding-proof-token handoff for new users).
- **PKG-042 Dashboard & core screens**: Dashboard (trial/sync-pending banners, stats, recent jobs), Reports (revenue, voice-usage-as-time-saved framing).
- **PKG-043 Job card & invoice screens**: full create → start work → generate invoice → send WhatsApp / mark paid flow, plus customer/vehicle create screens.
- **PKG-044 Voice billing screen**: WAV/16kHz/mono recording (custom `RecordingOptions`, not a preset — presets don't hit this exact spec), trial cost-control banner matching the backend's `trialGate`.
- **PKG-045 Settings/Profile/Referral**: referral share (corrected `MM-` prefix and Me & Mech branding vs. the original `MX-`/"Mechanix OS" draft), server-controlled one-time Day-28 offer banner (`workshop.offerShown`, never re-shown even after reinstall since the flag lives server-side).

## Known gaps (honestly flagged, not silently shipped)
- **Design assets** (`assets/*.png`) are not included — app icon, splash image, adaptive icon, notification icon are design deliverables, not something to fabricate as placeholder code.
- **Voice → job card hand-off**: the extraction result (plate/customer/items) currently lands the mechanic on manual customer/vehicle selection with the transcript available, rather than auto-matching an extracted plate to an existing vehicle record. That matching logic needs a dedicated lookup endpoint and UI, not implemented as a guess.
- **Customer/vehicle picker inside NewJobCardScreen**: the screen currently expects `customerId`/`vehicleId` via navigation params (arriving from CustomerDetailScreen). An inline search-and-pick-or-create flow is a reasonable next iteration.
- **Push notification icon/config** assumes standard Expo/FCM setup; the actual `google-services.json` (Firebase Android config file) is an infra credential, not shipped in this ZIP — needs to be dropped into `apps/mobile/` per Expo's FCM setup docs before push actually works end-to-end on a built APK.
- Real device testing (Redmi 9A or equivalent, per the locked spec) has not happened — I cannot physically test hardware. Audio recording, microphone sensitivity, and Tamil font rendering on budget Android specifically all need that pass before launch.

## Architecture notes worth knowing before extending this
- Money fields are strings end-to-end, matching the backend convention — never coerce through JS floats.
- Every screen goes through `apiRequest()` (the one client), not ad hoc `fetch()` calls — keeps auth/refresh/error-shape consistent everywhere.
- `useNetworkStatus()` + `OfflineBanner` are meant to be composed into every screen that has a network-dependent action, not just the ones already wired (Dashboard, Invoice) — extend this pattern as new screens are added.
