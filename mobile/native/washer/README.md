# WD Partner (native)

The washer app, rebuilt as a real React Native app (Expo) instead of the website in a wrapper.
Package id stays `com.washingdaddy.washer`, so the Play Store and App Store listings carry over.

It does what `washer/index.html` does, with the same Firebase project, collections and rules
(`.notes/sync-contract.md`, `mobile/firebase/firestore.rules`): sign-in with an SMS code, waiting for
the owner's approval, the morning round from the book (n8n workflow 9), the four wash steps with the
photo gate, customer requests, skips, notes, cars the washer adds, extra jobs and their alert, the
money tab, live location, Hinglish/Hindi and day/night themes. Every change to a car is a whole
`washes/{DATE}_{REG}` doc in an outbox on the phone, so nothing is lost without signal.

## Layout

- `src/app/` screens (expo-router): `(tabs)/index` round, `extra`, `paisa`, `profile`; `job` the car being washed.
- `src/state/store.ts` all state and actions; screens never talk to the database directly.
- `src/backend/` Firestore + phone auth through React Native Firebase, or the in-memory demo (OTP 1234).
- `src/lib/` the task schedule, Hindi table, time and money formatting, photo capture.
- `src/ui/` design kit (tokens from the web app's CSS).

## Commands

```
npm ci
npm run typecheck && npm test
EXPO_OFFLINE=1 npx expo export -p web && node tools/inline-preview.mjs dist preview.html   # the Claude preview
npx expo prebuild -p android && cd android && ./gradlew assembleRelease                    # Android build
```

Without `firebase/google-services.json` (see `firebase/README.md`) the app builds in demo mode.
`EXPO_PUBLIC_DEMO=1` forces demo mode in any build.
