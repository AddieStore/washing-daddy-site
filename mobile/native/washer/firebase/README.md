# Firebase native config

The app uses React Native Firebase (phone auth + Firestore). It needs two config files, which
are **committed to git** (they are not secret; the API keys inside are restricted by package
name / bundle ID):

- `firebase/google-services.json` (Android)
- `firebase/GoogleService-Info.plist` (iOS)

`app.config.ts` only enables the Firebase config plugins when `google-services.json` exists.
Without the files, `expo prebuild` still works and the app runs in demo mode.

## CI

GitHub Actions uses the committed `firebase/google-services.json` as is when it runs
`expo prebuild`. No secret is needed.

## How to get them again (Ravi), e.g. to regenerate

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
