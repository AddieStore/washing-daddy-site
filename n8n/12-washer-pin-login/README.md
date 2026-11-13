# 12 — Washer PIN login (n8n)

Firebase phone OTP fails on many washers' phones (`missing-client-identifier`: the sideloaded APK cannot pass
Play Integrity / reCAPTCHA app verification). So washers sign in with **phone + PIN** instead: the manager sets
the PIN in the approvals page (`/admin/`), and this workflow checks it and hands the app a Firebase sign-in token.
No SMS and no Google app check. OTP stays as a second option in the app (new washers still join through it).

| Webhook | Does |
|---|---|
| `POST /webhook/wd-washer-pin` | Body `{phone: "9876504210", pin: "482913"}` (10 digits, 4-6 digit PIN). Answers `{ok:true, token}` or `{ok:false, code}` with `code` one of `bad_pin`, `locked`, `not_set`, `not_washer`, `server`, and nothing else. |

## How it decides

1. Malformed phone/PIN → `bad_pin`. The admin numbers (`+917701808924`, plus any in `PIN_DENY_PHONES`) → `not_washer`
   before anything is read: their number is their admin right in the rules, so they never get a PIN.
2. Gets a Google access token with the service account (signed RS256 JWT grant to `oauth2.googleapis.com/token`,
   scopes `datastore`, `identitytoolkit`, `cloud-platform`). Asked fresh for every login.
3. Reads Firestore `washerpins/+91XXXXXXXXXX` (REST). Missing, `active` not true, or no salt/hash → `not_set`.
   `locked_until` in the future → `locked`.
4. PBKDF2-SHA256(PIN, salt, 150000, 32 bytes), compared with `crypto.timingSafeEqual`.
   - Wrong: `fails + 1` is written back (PATCH with `updateMask` and `currentDocument.updateTime`, so two attempts at
     the same moment cannot both count from the same number; a clash re-reads and recounts). The 5th wrong one in a
     row sets `locked_until` = now + 15 min and `fails` = 0 → `locked`; otherwise `bad_pin`. If the count cannot be
     written the answer is `server`, never `bad_pin`.
   - Right: reads `washers/+91XXXXXXXXXX`; anything but `status == 'approved'` → `not_washer` (only someone holding
     the right PIN learns that). `fails`/`locked_until` are reset.
5. Finds the Firebase Auth user with that phone number (Identity Toolkit `accounts:lookup` by `phoneNumber`), or makes
   one (`projects/{project}/accounts` with `phoneNumber`). A washer who signed in with OTP before keeps **the same
   uid**. A disabled user → `not_washer`.
6. Signs a Firebase custom token (RS256 with the service-account key; `iss`/`sub` = `client_email`,
   `aud` = `https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit`, `uid`,
   `iat`, `exp` = `iat` + 3600) → `{ok:true, token}`.

Every failure waits 0.4-0.8 s before answering. `server` is HTTP 500, everything else HTTP 200.

The app then calls `signInWithCustomToken`. The ID token of that session carries `phone_number` because the user
record has it, so the Firestore rules (`request.auth.token.phone_number`) and workflow 9 (`phone_number` claim)
work exactly as after an OTP sign-in. Nothing in the rules or the workflows checks `sign_in_provider`.

The workflow keeps **no execution data** (`saveDataSuccessExecution`/`saveDataErrorExecution` = `none`): the
request carries a PIN and the answer a token. Don't turn that on, and don't add logging to the Code node.

## Setup (once)

On the n8n container (`/root/docker-compose.yml`, the same `environment:` list as `RAZORPAY_*`):

- `FIREBASE_SA_JSON` = the service account key JSON, either as-is or base64-encoded (the base64 form is one safe
  line for an env file). The owner note `notes/washer-pin-login-setup.md` puts it there without pasting it anywhere.
  Roles on that service account: **Firebase Authentication Admin** and **Cloud Datastore User**.
- `NODE_FUNCTION_ALLOW_BUILTIN=crypto` (already needed by workflow 9). Without it the node errors and every login
  fails closed (HTTP 500).
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (already needed by workflows 8-11).
- Optional `FIREBASE_PROJECT_ID` (already set for 9/10): if set it must equal the key's `project_id`, or every login
  is `server`. Optional `PIN_DENY_PHONES` = more numbers that may never use a PIN, comma separated, `+91...`.

Then `docker compose -f /root/docker-compose.yml up -d n8n`, import `12-washer-pin-login.json`, **Publish**.
Publish the Firestore rules with the `washerpins` block (admins only) before setting PINs in `/admin/`.

## Test

`node n8n/12-washer-pin-login/test.mjs` runs the whole login against a fake Google (token endpoint, Firestore
REST with update-time preconditions, Identity Toolkit) with a throwaway RSA key generated on each run, checks the
token signatures and claims, the lockout, races, every error code, that the admin page's WebCrypto hash matches,
and then runs the built JSON's Code node the way n8n calls it. After editing `lib.js` or `logic.js`, run
`node build.mjs` (the test fails if the JSON is stale).

Live check after setup (a washer with a PIN): `curl -s -X POST -H 'Content-Type: application/json'
-d '{"phone":"98XXXXXXXX","pin":"000000"}' https://n8n.washingdaddy.com/webhook/wd-washer-pin` → `{"ok":false,"code":"bad_pin"}`
(that counts as one wrong try).
