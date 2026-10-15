# Washing Daddy phone apps

Two apps, each one web app that installs three ways:

| App | Website (iPhone: Add to Home Screen) | Android APK | iPhone App Store build |
|---|---|---|---|
| Washing Daddy (customers) | `washingdaddy.com/customer/` | `washingdaddy.com/app/washing-daddy-customer.apk` | `ios/customer/` |
| WD Washer | `washingdaddy.com/washer/` | `washingdaddy.com/app/wd-washer.apk` | `ios/washer/` |

Download page for both: `washingdaddy.com/get/`.

## Live sync

Both apps were written against the claude.ai artifact database. `tools/wd-sync.js` gives them the same
interface backed by Firebase Firestore (project `gen-lang-client-0799769592`), so the app code is unchanged.
Collections `washes`, `requests`, `ratings`; rules and the one index are in `firebase/`.
Inside the artifact the shim stands aside and the artifact's own db is used.

## When the app source changes

The source pages live in the project (`customer-app/index.html`, `washer-app/index.html`). To rebuild:

```
cd mobile/tools && npm install && npm run sync-js && npm run icons
node package.js <customer-app/index.html> <washer-app/index.html> build/assets build/wd-sync.js ../..
```

That rewrites `/customer/` and `/washer/` at the repo root. Pushing them rebuilds both APKs on GitHub
(`.github/workflows/mobile-apps.yml`), which also installs them on an Android 14 emulator and commits the
APKs to `app/`. Deploy the website as usual: `cd /root/site && git pull` on the droplet.

The old duty app at `/w/` and its APK at `/app/washing-daddy.apk` are untouched.
