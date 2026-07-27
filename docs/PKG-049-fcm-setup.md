PKG-049 — Firebase Cloud Messaging Setup
Functionally complete already (backend: apps/backend/src/lib/fcm.ts, Part 5; mobile: apps/mobile/src/push/registerPush.ts, Part 6). This package is the one-time infra setup that makes those already-written code paths actually work end-to-end.
Required, one-time setup (not code — credentials/config)
Firebase project: create one at https://console.firebase.google.com if it doesn't already exist for Me & Mech.
Android app registration: register package com.ungakadaidigital.meandmech (must match app.json's android.package exactly).
google-services.json: download from the Firebase console, place at apps/mobile/google-services.json. Required for the app to build with push support at all — not included in this ZIP (it's a project- specific credential file, not source code).
Service account JSON (backend): Firebase Console → Project Settings → Service Accounts → Generate new private key. Base64-encode the downloaded JSON file and set it as FIREBASE_SERVICE_ACCOUNT_JSON in Railway's environment variables (see apps/backend/.env.example).
EAS build config: if using EAS Build (recommended for Android release builds with push), confirm google-services.json is included in the build via eas.json's file patterns — not configured in this delivery since eas.json itself doesn't exist yet (see PKG-053).
Verification steps for whoever does this setup
Send a test push via sendPushNotification() (backend) to a real device token obtained from getPushToken() (mobile) — confirm it arrives.
Confirm a stale/uninstalled token produces the messaging/registration-token-not-registered code path (lib/fcm.ts already handles this — logs at warn, not error).
