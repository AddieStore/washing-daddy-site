# Firebase native config

The app uses React Native Firebase (phone auth + Firestore). It needs two files that are
**not committed** (they are not secret, but are kept out of git via `.gitignore`):

- `firebase/google-services.json` (Android)
- `firebase/GoogleService-Info.plist` (iOS)

`app.config.ts` only enables the Firebase config plugins when `google-services.json` exists.
Without the files, `expo prebuild` still works and the app runs in demo mode.

## How to get them (Ravi)

1. Open the Firebase console, project `gen-lang-client-0799769592`.
2. Project settings, Your apps, **Add app, Android**.
   - Package name: `com.washingdaddy.washer` (exactly).
   - Add the **SHA-1 and SHA-256** fingerprints of the release signing key, and also of the
     Play App Signing key (Play Console, Setup, App signing). Phone auth fails without them.
   - Download `google-services.json` into this folder.
3. **Add app, iOS** with bundle ID `com.washingdaddy.washer`. Download
   `GoogleService-Info.plist` into this folder.
4. Authentication, Sign-in method: enable **Phone**.
5. Authentication, Phone, "Phone numbers for testing": add a test number and fixed code so
   Play Store and App Store reviewers can sign in.

## CI

GitHub Actions reads the Android file from the repository secret `WASHER_GOOGLE_SERVICES_JSON`
and writes it to `firebase/google-services.json` before `expo prebuild`. If the secret is empty,
the native build job is skipped.
