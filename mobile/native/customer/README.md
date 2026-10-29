# Washing Daddy customer app (native)

The customer app as a real Android/iPhone app (Expo React Native), replacing the website wrapper that packaged
`/customer/index.html`. Same package id `com.washingdaddy.customer`, same Firebase project and Firestore rules
(`mobile/firebase/firestore.rules`, nothing to redeploy), same n8n webhooks and Cashfree flow.

What talks to what:

| | How |
|---|---|
| Sign-in | Firebase phone sign-in, native (6-digit SMS code, no reCAPTCHA) |
| Account, washes, requests, ratings, car photos, on-demand jobs | Firestore, same collections and fields as `.notes/sync-contract.md` |
| Payments | `POST n8n/wd-pay-order` prices the order, Cashfree's native checkout takes the money, `wd-pay-lookup` confirms the paid-up date |
| Live tracking of an on-demand washer | MapLibre with OpenFreeMap tiles (no API key), `ondemand/{id}` + `locations/{washer}` |

Code map: `src/state.ts` (all state and actions), `src/backend/` (Firebase, Cashfree; `.web` files are the preview's
stand-ins), `src/data/` (plans, schedule, pause rules), `src/ui/` (design kit), `src/screens/`, `src/sheets/`.

## Before the first real build (one-time, in the Firebase console)

1. Project `gen-lang-client-0799769592` → Project settings → Add app → Android, package `com.washingdaddy.customer`.
2. Add the SHA-1 and SHA-256 of the release key (`mobile/signing/washing-daddy-release.p12`) and, once the app is on
   Play, of the Play App Signing key. Phone sign-in on Android fails without them.
3. Download `google-services.json` to `firebase/google-services.json` (not in git) and paste its contents into the
   GitHub secret `CUSTOMER_GOOGLE_SERVICES_JSON`. For iPhone: add an iOS app with bundle id
   `com.washingdaddy.customer` and put `GoogleService-Info.plist` in `firebase/`.

Without these files the app builds and runs in demo mode (test data, code 1234), like the preview.

## Commands

```
npm install
npx tsc --noEmit                 # typecheck
npm run preview                  # one-file web preview in dist-preview/index.html (demo mode)
node tools/shots.mjs out steps.json   # screenshots of the preview
npx expo prebuild && npx expo run:android   # local native build
```

From a cloud session set `EXPO_OFFLINE=1` for expo commands (api.expo.dev is blocked there).

CI (`.github/workflows/native-customer.yml`) typechecks, exports the web build and builds a release APK + AAB as a
workflow artifact. Re-sign them with the release key before handing them out, so the new app installs as an update
over the old one.

## Differences from the web app

- Car photos are saved as picked (resized). The web app's background cut-out (ONNX model, 47 MB) is not in the native app.
- Profile has "Delete my account" (both stores require it): it sends the request on WhatsApp and signs out, because
  only an admin may delete `customers/{phone}`.
