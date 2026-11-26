# 15 — WhatsApp sign-in code (n8n)

Customers get their 6-digit sign-in code **on WhatsApp** instead of by SMS. Cheaper than SMS (Meta charges an
authentication conversation, well under a rupee in India, against roughly ₹6 for a Firebase SMS), it does not need the
app to pass Google's app check, and almost every customer already has WhatsApp. SMS stays in the app as the fallback
("Get code by SMS instead"), and the app falls back to SMS by itself while this workflow is not live.

| Webhook | Does |
|---|---|
| `POST /webhook/wd-wa-otp-send` | Body `{phone: "9876504210"}`. Sends a fresh code on WhatsApp. Answers `{ok:true}` or `{ok:false, code}`: `bad_number`, `use_sms` (admin numbers), `wait` (+ `wait` seconds, one code per 30 s), `too_many` (5 codes an hour per number), `busy` (spend cap reached: 20 codes an hour from one IP, 300 an hour in total), `not_on_whatsapp`, `server`. On anything but `wait` / `too_many` / `bad_number` the app sends an SMS instead. |
| `POST /webhook/wd-wa-otp-verify` | Body `{phone, code}`. Answers `{ok:true, token}` (a Firebase custom token) or `{ok:false, code}`: `bad_code`, `wrong_code`, `expired` (10 minutes, and each code works once), `too_many` (5 wrong tries kill the code), `server`. |

## How it works

1. **Send.** Reads `waotp/+91XXXXXXXXXX` (Firestore REST, service account), checks the 30 s / 5-per-hour limits, makes six
   random digits, stores only an HMAC of them (keyed with the service-account key, bound to the number and a random salt)
   with `expires_at` = now + 10 min and `tries` = 0, then sends Meta's standard **authentication template** (code in the body
   and in the copy-code button) through the WhatsApp Cloud API.
2. **Verify.** Compares in constant time. Wrong → `tries + 1` (written with an update-time precondition so two tries at once
   both count). Right → the code is burnt first, then the Firebase Auth user with that phone number is found (or made) and a
   custom token is signed for its uid — **the same uid an SMS sign-in uses**, so the Firestore rules
   (`request.auth.token.phone_number`), the customer doc and every n8n workflow work unchanged.
3. The app calls `signInWithCustomToken`.

Admin numbers (`+917701808924`, plus any in `WA_OTP_DENY`) never get a WhatsApp code: their number is their admin right
in the rules, so they sign in by SMS only. **Spend caps.** Every WhatsApp code costs money, so besides the per-number limits there is an hourly cap per client IP
(`waotp/ip_<keyed hash>`, the IP itself is never stored; Indian mobile networks share IPs, so going over it means SMS, not a
lock-out) and an hourly cap over all numbers (`waotp/_all`). Both are counted only when a number is actually allowed a code.

The `waotp` collection is closed to every app by the rules' catch-all
(`match /{other=**}`); only this workflow's service account reads it. The workflow keeps **no execution data**.

## Setup (once)

**Meta (WhatsApp Business):**
1. In [Meta Business Suite](https://business.facebook.com) → WhatsApp Manager, add a phone number for Washing Daddy
   (a number that is **not** already on the WhatsApp app) and verify the business.
2. Create a message template: category **Authentication**, name e.g. `wd_login`, language English, with the
   **Copy code** button. Meta approves authentication templates within minutes.
3. In the Meta developer app (WhatsApp → API Setup) note the **Phone number ID**, and create a **permanent access token**
   for a System User with `whatsapp_business_messaging` permission.

**n8n container** (`/root/docker-compose.yml`, same `environment:` list as workflow 12):
- `WA_TOKEN` = the permanent access token
- `WA_PHONE_ID` = the phone number ID
- `WA_OTP_TEMPLATE` = `wd_login` (the template name), optional `WA_OTP_LANG` (default `en`)
- `FIREBASE_SA_JSON`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`: already set for workflow 12.
  The service account needs **Firebase Authentication Admin** and **Cloud Datastore User** (same as 12).
- Optional `WA_OTP_DENY` = more numbers that must use SMS, comma separated, `+91...`.
- Optional `WA_OTP_IP_MAX` (default 20) and `WA_OTP_HOURLY_MAX` (default 300): the hourly spend caps.
- Optional `WA_GRAPH_VERSION` (default in `lib.js`): the Meta Graph API version, e.g. `v25.0` (valid until Jul 2028). Meta retires a version about
  two years after release; bump it here or in `lib.js` when Meta warns.

Then `docker compose -f /root/docker-compose.yml up -d n8n`, import `15-whatsapp-otp.json`, **Publish**.
Nothing to change in the app: the next time a customer asks for a code, it goes out on WhatsApp.

## Change and test

Edit `lib.js` / `logic.js`, then `node test.mjs` (fake Google + fake WhatsApp, throwaway key) and `node build.mjs`
(rewrites `15-whatsapp-otp.json`). Re-import and publish.
