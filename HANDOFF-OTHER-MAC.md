# Handoff for the Claude on the release Mac

You are picking up work done on another Mac. Read this whole file first. The owner (Ravi) wants to do a **security pass**, build **signed releases**, and send both apps to **Play Store review** from this Mac. Be honest about what was tested and what was not (section 7).

## 1. Where the work is

- Repo: `https://github.com/AddieStore/washing-daddy-site`
- Branch: **`customer-white-ui-whatsapp-otp`** (pull request #84 into `main`, open, mergeable, checks pass). Nothing is merged to `main` on purpose: merging runs the Android build job and makes the website's live-price script go live. Ravi decides when.
- Apps: `mobile/native/customer` (Washing Daddy, `com.washingdaddy.customer`) and `mobile/native/washer` (WD Partner, `com.washingdaddy.washer`). Both are Expo SDK 58 / React Native 0.88. One codebase serves iPhone and Android.
- Operations side: `admin/hq` (new command centre), `admin/app` (control panel), `admin/ops` (operations desk). Website: `index.html` + `wd-live-prices.js`. Backend: `n8n/*` workflows, `mobile/firebase/firestore.rules`, `firebase-rules/*`.
- Also read: `docs/FUNCTIONALITY.md` (every function, generated), `store/STORE-LISTING.md` (store texts, permission reasons, privacy answers, screenshot list), `PUSH-LATEST-APPS.md` is a local scratch file from the other Mac, ignore it.

```bash
git clone https://github.com/AddieStore/washing-daddy-site.git && cd washing-daddy-site && git checkout customer-white-ui-whatsapp-otp
```

## 2. What changed in this branch (so you know what to review)

**Customer app**: white pages, new type (Plus Jakarta Sans + Bricolage Grotesque), rotating hero headlines, hero with black road, far-side grass/flowers/hedge, small distant trees and lamps, puffy clouds; service areas drawn as circles (admin editor) with "not in your area yet" card (neighbours bar toward 25 cars, button "Count me in"); booking/payment blocked outside areas; Apple Maps on iPhone; WhatsApp sign-in code; photo strips on Daily and booking cards; animated car-detail icons in the day timeline; guest sees "Login" in Profile; login story (flat characters, crisp cards, Indian skyline and toran); new switches `notify`, `whatsappLogin`, `guest`.

**WD Partner app**: redesigned Round, Extra, Money, Profile; guided route (operations decides order and slots, washer sees one "do this now" card: Nikla, wash, **2 closing photos**, finish; car boxes grouped by society; tap a car for a detail sheet); round picker (demo list; live via n8n workflow 16); Hazri tab (time stamp on tap, front camera, **white or blue T-shirt** check on the phone, auto-send); Extra offers have Accept/Deny, assigned jobs cannot be denied; washer pay share and function switches come from `appcfg/customer`.

**Operations**: WD HQ (`admin/hq`): dashboard (KPIs, rings, weekly bars, needs-you, areas, price/status board, washers), isometric depot view, **All functions** register (62 functions; switches write `appcfg/customer`), embedded control panel and ops desk. Ops map uses OpenStreetMap tiles (CARTO showed an API key watermark). Washer pay share lives in control panel → Fees.

**Backend**: n8n 13 (`wd-waitlist` returns neighbours count and goal, peek mode; service-area check), 15 (WhatsApp OTP), 16 (**new**: list rounds / take a round; only free rounds or your own can be taken). Firestore rules: `attendance`, `earnings`, `earnings_payouts`, check-in photo/uniform fields added to `mobile/firebase/firestore.rules`, aligned with the fuller `firebase-rules/firestore.rules-merged-2026-11-23b.txt` (which also allows `shirt_color`).

## 3. Build the releases (do this on the release Mac)

Do **not** set `EXPO_PUBLIC_DEMO`. With it set, an app builds in demo mode (sample 10-car route, OTP 1234). Both apps have their Firebase files committed in `firebase/` (`GoogleService-Info.plist`, `google-services.json`).

```bash
cd mobile/native/washer && npm install      # repeat in mobile/native/customer
```

**Android**
```bash
npx expo prebuild --platform android
cd android && ./gradlew bundleRelease       # then sign the .aab with the release key
```
- Raise `versionCode` first (`washer`: 20 in `app.config.ts`, `customer`: 33 in `app.json`), above whatever is on Play.
- `native-washer.yml` also builds an unsigned release on GitHub for `main`/`claude/*` pushes and commits the APK back (that is how `out/*.apk.gz` got into `main`). `out/` is now in the washer's `.gitignore` on this branch. Manual run with `-f demo=true` builds a demo APK for looking at screens only.

**iOS**
```bash
npx expo prebuild --platform ios
cd ios && pod install
```
Open `*.xcworkspace`, Team = your **paid** team, bundle id `com.washingdaddy.washer` / `com.washingdaddy.customer`, Archive, upload. **Keep Push Notifications** on for the washer (job alerts). The test builds on the first Mac stripped `aps-environment` and used test bundle ids because a free Apple ID cannot sign push; do not copy those local hacks (the generated `ios/` folders are gitignored). `ITSAppUsesNonExemptEncryption=false` is already set in both apps.

## 4. Server steps that must be done before the apps go live

1. Publish the Firestore rules (use `firebase-rules/firestore.rules-merged-2026-11-23b.txt`; `mobile/firebase/firestore.rules` is the shorter copy kept in sync). Check `attendance`, `earnings`, `earnings_payouts`, `checkins` with `uniform.shirt_color`.
2. n8n: re-import and publish **13** (waitlist count + area check), **15** (WhatsApp OTP: env `WA_TOKEN`, `WA_PHONE_ID`, `WA_OTP_TEMPLATE`, `FIREBASE_SA_JSON`, Meta *Authentication* template), **16** (env `NOTION_TOKEN`, `NOTION_CARS_DB`; add a **Round** select property in the Notion Monthly Customers database and put each car on a round). Workflow 9 (washer cars) is unchanged.
3. Control panel → Fees: set "Washer gets %". Control panel → Settings: service-area circles. Both are stored in `appcfg/customer`.
4. The washer app is invite-only. Put a working **test washer login** in the Play review notes or the review will be rejected.
5. Play Console: data safety and permission answers are in `store/STORE-LISTING.md`.

## 5. Security review: what to look at first

- **Firestore rules**: two copies exist. The merged txt is the fuller one (todayIST checks). Make sure only one is deployed. `appcfg` and `catalog` are **publicly readable** by design (the apps and website read them); writes are owner-only (`isAdmin()`, hard-coded owner number `+917701808924`).
- **`wd-live-prices.js`** carries the public Firebase web API key and project id (these are client keys, but restrict the key by HTTP referrer and API in Google Cloud). It fetches `catalog` and `appcfg/customer` via REST.
- **n8n workflow 9/16 token check**: `WASHER_BY_PHONE` defaults to two test numbers (`+919000000001`, `+919000000002`). Set `WASHER_PHONES` in n8n so real numbers replace them.
- **Round taking (workflow 16)**: a round another washer holds cannot be taken; ops changes **Washer** in Notion. Check nobody can bypass this.
- **Hazri shirt check** is a colour hint (white or blue in the chest area), spoofable by a white wall. The manager reviews the photo in ops (shown with the verdict). Do not treat it as authentication.
- **Owner pages**: `admin/hq`, `admin/app`, `admin/ops` sign in with phone OTP and check the owner numbers; each embedded page signs in separately.
- **Demo flag**: confirm release builds have no `EXPO_PUBLIC_DEMO` (Android release workflow sets `WD_RELEASE=1`, which refuses a demo build; iOS has no such guard unless you export `WD_RELEASE=1`).
- **Tokens/keys**: nothing secret should be in the repo. Check `git grep -n "AIza\|secret\|token"` and the n8n JSON exports.
- A GitHub token for `AddieStore` was stored on the first Mac only.

## 6. How to see it without building

- Customer web preview (demo): `cd mobile/native/customer && EXPO_OFFLINE=1 npm run preview` then serve `dist-preview/index.html`.
- Washer web preview (demo): `cd mobile/native/washer && EXPO_OFFLINE=1 CI=1 EXPO_PUBLIC_DEMO=1 npx expo export -p web --output-dir /tmp/wd-washer-web` then serve it. Sign in with 9000000001, code 1234.
- HQ: serve the `admin/` folder and open `/hq/?demo=1` (sample data, nothing saved). Without `?demo=1` it asks for an owner phone code.
- Tests: `cd mobile/native/washer && npm test` (80 pass); `node n8n/13-pronto/test.mjs` (137 pass); `node n8n/16-washer-rounds/test.mjs`.

## 7. What was NOT tested (please check)

- **Camera paths on a real phone**: Hazri selfie + shirt check, and the 2 closing photos. Only the web preview (no camera) and the demo screens were seen.
- **Live data**: HQ dashboard against real Firestore, the price board writing `catalog`, function switches writing `appcfg/customer`, the website price/section sync, the washer pay share, the live round picker (workflow 16 needs the Notion property), the "Count me in" count (needs workflow 13 re-imported), WhatsApp OTP.
- **Android**: only the **demo** washer APK was installed on a Samsung S23 Ultra (Galaxy), with the latest car-box fix. The customer app has not been run on Android; the Android JS bundles build. Function switches were added after that APK.
- iOS release (signed, push, TestFlight) has never been built on this account; the test builds used a free Apple ID.
- The ops/HQ panels were clicked through in **demo** mode only.

## 8. Decisions and gotchas to keep

- The hero rider on the customer Home is the **original** design again (the redraws were rejected); do not restyle it.
- Photos: monthly washes ask for **2 photos at the close, none at the start**.
- The route order and time slots are planned by operations (auto-spread over the morning slots and locked); the washer never plans.
- Round order comes from the Notion book (workflow 9); `society` is the Area, `house` the flat.
- Android draws a shadow through see-through backgrounds: use solid fills under any card with elevation.
- Reviewing: the first code review of this PR found 8 items; 6 are fixed, the shirt-check spoofing is accepted, and the old built `.aab`/`.apk.gz` were removed from the branch.

## 9. Suggested order for you

1. Pull the branch and read sections 1 and 4.
2. Do the security pass (section 5); fix and push to the same branch.
3. Publish rules and n8n workflows (section 4).
4. Run the live checks in section 7 on a real phone with real data.
5. Bump versions, build signed bundles (section 3), upload to Play (and TestFlight).
6. Merge PR #84 only when Ravi says so.
