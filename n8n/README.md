# 8 — Cashfree payments (n8n)

`8-cashfree.json` is the whole payment backend: three webhooks in one workflow. Import it into
n8n, fill in the four things below, and payments work end to end.

Written from scratch on 16 Oct 2026. The original was never imported and its file was lost, so
nothing was carried over except what `pay/README.md` in the site repo described.

## What it does

| Webhook | Who calls it | What it does |
|---|---|---|
| `wd-pay-lookup` | the pay page and the customer app | Finds the car in Monthly Customers and says what it owes |
| `wd-pay-order` | both | Prices the order **itself**, then asks Cashfree for a payment session |
| `wd-pay-hook` | Cashfree | Checks the signature, moves the paid-up date, reduces what is owed, messages you |

The browser sends an amount, but `wd-pay-order` never trusts it for anything that moves a
paid-up date:

| What is paid | Priced from | What the hook does |
|---|---|---|
| Plan or bill, car on the book | the car's Notion row (Monthly Fee, Owes Now) | moves Service Paid Up To, reduces Owes Now |
| Plan, car not on the book yet (signed up in the app) | the plan's list price | logs a lead and tells you, so you add the car |
| Mid-month upgrade | (new plan price − current Monthly Fee) × days left ÷ 30, from the car's row | tells you, book untouched: change the car's Monthly Fee yourself |
| App store order | the item ids and quantities, priced from the workflow's own list | tells you what to deliver |
| One-time wash | the service id, priced from the workflow's own list | tells you, book untouched |
| Tip (₹20 to ₹500) | the app's amount, range-checked | tells you, book untouched |

The order carries `kind`, the car and the expected amount in its tags; the hook refuses if the
amount paid falls short.

Store and one-time wash prices live in **Daam tay karo** (`STORE`, `WASHES`). Change them there
whenever you change them in the customer app, or the app's price and the charge will differ.

`wd-pay-hook` refuses anything that is not signed with your Cashfree secret, and anything more
than five minutes old. It is also idempotent: each `cf_payment_id` is stored on the Notion row,
and a duplicate delivery from Cashfree moves the date only once.

`wd-pay-lookup` requires the full car registration (not just the last four digits) and returns
only what the payment screen needs — fee, balance and paid-up date — with no plate, address or
page id in the response.

## Alerts and safety nets (Oct 2026 hardening)

- Rejected webhooks (bad signature, too old, underpaid, wrong currency, order without an
  `expectedAmount` tag) answer 401 and send Ravi one Telegram line, at most one per reason per
  10 minutes. Refunds and failed payments are acked 200 quietly.
- `expectedAmount` is now mandatory and the currency must be INR.
- If Notion refuses the book update, Ravi gets "NOTION UPDATE FAILED - credit this by hand" and
  the webhook answers 500, so Cashfree retries (safe: see next point).
- Idempotency: the last 500 payment ids are kept in the workflow's static data (only works in
  published/production runs), and **Last Payment Id** in Notion holds the last 5 ids, comma
  separated (the column must be a Text property; the old single-id value still works).
  A duplicate delivery answers 200 and creates nothing, not even a lead.

## A note on the Code nodes

This n8n has `require()` turned off inside Code nodes (workflow 9 is the exception, see below), so the signature check carries its own
SHA-256 and base64 rather than calling Node's `crypto` and `Buffer`. That implementation is
checked byte-for-byte against Node's `crypto.createHmac` over 400 random inputs, and the
webhook test signs with Node and verifies with this code, which is the same path Cashfree uses.

## Setting it up

1. **Import** `8-cashfree.json`: Workflows → ⋯ → Import from File.
2. **Notion account** — a Notion API credential named `Notion account`, holding your Notion
   integration token as the Internal Integration Secret. Used by the five Notion nodes.
   (n8n's own Notion credential, not Header Auth: it adds the Authorization header itself.)
3. **Cashfree live** — a Custom Auth credential named `Cashfree live` holding
   `{"headers":{"x-client-id":"YOUR_APP_ID","x-client-secret":"YOUR_SECRET_KEY"}}`.
4. **The webhook secret, as an environment variable.** Set `CASHFREE_SECRET` on the n8n container
   to the same Secret Key (like `TELEGRAM_CHAT_ID`; needs `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`).
   A credential cannot be read from a Code node, and **Sach mein Cashfree hai?** needs it to check
   the signature. Never paste the key into the node: exports of this workflow are committed. If the
   variable is empty the node refuses to run (the webhook fails loudly instead of trusting anyone).
5. **Telegram** — set an n8n environment variable `TELEGRAM_CHAT_ID` to your Telegram chat id.
   The node reads `$env.TELEGRAM_CHAT_ID` and will skip silently if it is not set (it has
   "Continue on error" on, so a missing chat id never blocks a payment).
6. **Publish**, then in the Cashfree dashboard add a webhook pointing at
   `https://n8n.washingdaddy.com/webhook/wd-pay-hook`.

## Testing it

With sandbox keys, pay ₹1 from `washingdaddy.com/pay/`. You should see the Cashfree page open,
then within a few seconds: the car's **Service Paid Up To** moves a month, **Owes Now** drops,
and you get a Telegram message. If nothing moves, open the workflow's Executions tab; a failed
`wd-pay-hook` run almost always means `CASHFREE_SECRET` in step 4 doesn't match the one in step 3.

## Going live

Six flags, and all six must change together or it quietly stays in test mode:

- `SANDBOX = true` → `false`, in **Daam tay karo** (n8n Code node)
- `SANDBOX = true` → `false`, in **Sach mein Cashfree hai?** (n8n Code node; same file, separate copy)
- `CF_MODE = "sandbox"` → `"production"`, in `pay/index.html`
- `PAY_LIVE = false` → `true`, in the customer app source
- Switch the **Cashfree order banao** node's Base URL from `sandbox.cashfree.com` to `api.cashfree.com`
  (or update the URL field in the HTTP node; Daam tay karo already generates the right base from SANDBOX)
- In the Cashfree dashboard, update the webhook URL to the live `wd-pay-hook` endpoint

Whitelist `washingdaddy.com` in the Cashfree dashboard before using live keys, or checkout
refuses to open.

## What was checked, and what wasn't

The pricing, the signature check and the date arithmetic were tested on their own (35 checks),
and every Code node was run against realistic Notion and Cashfree data (24 checks). Two known
traps are covered: Notion hands dates back as `{start: "..."}` objects, and a late payer must
not lose the days they already paid for.

Nothing has been run inside n8n, because this session cannot reach it. If a node's settings
don't match your n8n version, the logic inside it is still right — it's the node's own fields
that would need adjusting.

---

# 9 — The washer's round (n8n)

`9-washer-cars.json` is what puts real cars on a washer's phone. **The washer app needs it.**
Until it is imported and published, a washer signing in sees an empty round with
"Aaj aapke naam koi gaadi nahi hai" — the app no longer falls back to the made-up demo list,
because a washer must never be sent to a car that isn't really theirs.

## What it does

| Webhook | Who calls it | What it does |
|---|---|---|
| `wd-washer-cars` | the washer app, on sign-in and whenever it comes back to the screen | Reads Monthly Customers and answers with that washer's cars |

Four nodes. It asks Notion for every row whose **Account Status** is `Active`, keeps the ones
whose **Washer** is Chotte or Shahrukh, and answers with the car's name, number, plan and area.
A row with no washer, or with a placeholder number, is left out rather than guessed at.
`?washer=chotte` or `?washer=shahrukh` returns that washer's list. The `washer` parameter is
required; requests without it are refused (the bulk all-rounds response has been removed to
prevent the full book being read without any credential).

## Setting it up

1. **Import** `9-washer-cars.json` the same way as 8: *Workflows → … → Import from File*.
2. The Notion node uses the **same `Notion account` credential** you already made for 8, so
   there is nothing new to fill in. If it shows a red triangle, open it and pick that credential.
3. **Environment** on the n8n container: `FIREBASE_PROJECT_ID` (the Firebase project id, required:
   the node throws if it is empty), `NODE_FUNCTION_ALLOW_BUILTIN=crypto` (the token check uses
   `require('crypto')`; without it the node errors and every request fails closed), and optionally
   `WASHER_PHONES` = `{"+91XXXXXXXXXX":"chotte","+91YYYYYYYYYY":"shahrukh"}`. Without it the node
   uses the same phone map as the washer apps (`WASHERS` in `data.ts` / `washer/index.html`).
4. **Publish.** The browser test is now a `401` unless you send a token:
   `curl -H "Authorization: Bearer <washer ID token>" '.../wd-washer-cars?washer=chotte'`.

## Sign-in required (Oct 2026)

Every request must carry `Authorization: Bearer <Firebase ID token>`. The node **Token check**
verifies the RS256 signature against Google's `securetoken` certificates (cached in static data,
refetched on expiry or an unknown key), then `aud` and `iss` = `FIREBASE_PROJECT_ID`, `exp`, and
that the token's `phone_number` is the washer named in `?washer=`. Anything else is a 401 and no
Notion query is made.

**Deploy order (transition):** ship the updated washer apps first (native build and
`washer/index.html`, both now send the header), **then** import this workflow. The old apps send
no token, so importing first would give every washer an empty round. Cached rounds keep working
offline in the meantime. If the workflow was imported too early, re-import the previous version.

If the web app is called from a browser, the `Authorization` header makes the request
"preflighted": n8n answers the OPTIONS check itself; confirm once with the app after import.

## What the washers will see

The walking order is the book's **Round Order** column. That column is empty on every row today,
so the app falls back to area, then car name — the same order every day, but not necessarily the
order you'd walk it in. Fill in Round Order when you want a particular order.

The book has no customer-name column, so a washer's screen says "Customer" where a name would go.

## What was checked

The shaping logic was run against the real book's rows (28 checks), the Code node was run as
n8n runs it (13 checks), and the washer app was driven end to end against this webhook stubbed
out (13 checks): a live round, an empty book, an unreachable book, and a round that survives
with no signal. Nothing has been run inside n8n itself, because this session cannot reach it.

---

# 10 — On-demand GPS dispatch (n8n)

`10-ondemand-dispatch.json` auto-assigns an on-demand job to the nearest active washer the moment
a customer books. Without it, both washers see the job alert and the first to accept claims it
(the old behaviour still works as a fallback).

## What it does

| Webhook | Who calls it | What it does |
|---|---|---|
| `wd-ondemand-dispatch` | customer app, immediately after creating the `ondemand` Firestore doc | Reads `locations` collection, finds nearest active washer (updated ≤ 30 min ago), sets `washer_id` on the `ondemand` doc |

The customer app fires the webhook fire-and-forget — a network error never blocks the booking.
If no washer is broadcasting GPS, the workflow responds `{assigned:false}` and the job sits
unassigned so the old job-alert flow takes over.

Haversine distance is computed inside a Code node against a hardcoded centre-point for each of
the six service areas (all Paschim Vihar, Delhi). Add or update area coordinates inside
"Nazdeeki washer dhundo" as new areas open.

## Setting it up

1. **Import** `10-ondemand-dispatch.json`: Workflows → ⋯ → Import from File.
2. **Firebase service account credential** — in n8n, create a new credential of type
   *Google Firebase Cloud Firestore OAuth2 API*, name it `Firebase service account`, and
   paste the JSON key from a Firebase service account that has Firestore read/write access
   (Firebase console → Project settings → Service accounts → Generate new private key).
3. **Environment** on the n8n container: `FIREBASE_PROJECT_ID` (all three Firestore nodes read
   `$env.FIREBASE_PROJECT_ID`; the first Code node throws if it is empty). Cashfree is checked
   with the same `Cashfree live` credential as workflow 8, and alerts use `TELEGRAM_CHAT_ID`.
4. **Publish.**

## How a job is accepted (Oct 2026)

The webhook is now `POST`. A call is refused unless `doc_id` is a 20-character Firestore id, the
stored `ondemand` doc is `status: new`, unassigned and under 15 minutes old, and Cashfree says the
`pay_ref` order is `PAID`, in INR, for exactly the doc's `price` (an order can pay for one job
only). The area used is the one stored on the doc, never the request's. Unverified paid jobs are not
dispatched and Ravi gets one Telegram alert per job. The response is only `{ok:true}`.
Pay-on-arrival jobs still work: a doc with `paid:false` and no `pay_ref` is dispatched as
before, with no Cashfree call (the washer collects the cash). Only `paid:true` jobs are verified
with Cashfree; `paid:true` that fails verification, or `paid:false` carrying a `pay_ref`, is not
dispatched, answers 402 and alerts Ravi.

## Testing it

Book a real paid on-demand wash in the customer app, or POST to
`https://n8n.washingdaddy.com/webhook/wd-ondemand-dispatch` with `{"doc_id":"<id of a fresh ondemand doc>"}`.
- Fresh, paid job: `{"ok":true}`, and the doc's `washer_id` is set if a washer's `locations/…`
  doc was updated in the last 30 minutes (otherwise it stays unassigned: safe).
- Anything else: `400 bad request`, `409 not assignable` or `402 payment not confirmed`.

## GPS on the washer app

The washer app (installed APK) broadcasts GPS every time the device moves, via
`navigator.geolocation.watchPosition` → Firestore `locations/{washer_id}`. Location is
**only broadcast in the real app** (when `window.WDAuth` is present), not in the plain web preview.
Android 6+ shows a one-time "Allow location" prompt the first time; the WebChromeClient in
`MainActivity.java` handles the permission handshake.

Location is cleared from Firestore when the washer logs out, so stale positions do not
mislead the dispatch algorithm.
