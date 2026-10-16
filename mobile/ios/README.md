# iPhone apps (TestFlight / App Store)

Two Xcode projects, one per app, made with Capacitor. Each wraps the same web app the website serves
(`/customer/` or `/washer/`), so a change to the web app reaches the iPhone build after `npm run sync`.

| Folder | App | Bundle id |
|---|---|---|
| `customer/` | Washing Daddy | `com.washingdaddy.customer` |
| `washer/` | WD Washer | `com.washingdaddy.washer` |

Today the iPhone route that needs nothing extra is **Add to Home Screen** from Safari
(`washingdaddy.com/customer/` and `washingdaddy.com/washer/`). These projects are for when you want
real App Store / TestFlight builds.

## What you need

- A Mac with Xcode 16 or newer, and Node 20+.
- An Apple Developer Program membership (US$99 a year) signed in to Xcode (Xcode → Settings → Accounts).

## TestFlight, per app

```
cd mobile/ios/customer        # or mobile/ios/washer
npm install
npm run sync                  # copies the web app into the Xcode project
npm run open                  # opens Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → pick your Team. Leave "Automatically manage signing" on.
2. Pick **Any iOS Device (arm64)** as the run destination.
3. **Product → Archive**. When the Organizer opens: **Distribute App → App Store Connect → Upload**.
4. In [App Store Connect](https://appstoreconnect.apple.com), the build appears under the app's **TestFlight**
   tab after processing. Add testers by email; they install with Apple's TestFlight app.

The first upload asks you to create the app record in App Store Connect with the bundle id above.

## Notes

- Camera and photo-library prompts are already described in `Info.plist` (washer photos).
- Live sync uses the same Firebase project as the website and the Android apps.
- To install on your own iPhone without TestFlight: plug it in, pick it as the run destination, press Run.
  With a free Apple ID the install expires after 7 days.
