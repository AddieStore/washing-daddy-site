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

The browser sends an amount, but `wd-pay-order` ignores it and prices **always from the car's
own Notion row** (Monthly Fee and Owes Now). The page cannot be used to pay a different amount
than the book says. The order carries the car's Notion page id and the expected amount in its
tags; the hook refuses if the amount paid falls short.

`wd-pay-hook` refuses anything that is not signed with your Cashfree secret, and anything more
than five minutes old. It is also idempotent: each `cf_payment_id` is stored on the Notion row,
and a duplicate delivery from Cashfree moves the date only once.

`wd-pay-lookup` requires the full car registration (not just the last four digits) and returns
only what the payment screen needs — fee, balance and paid-up date — with no plate, address or
page id in the response.

## A note on the Code nodes

This n8n has `require()` turned off inside Code nodes, so the signature check carries its own
SHA-256 and base64 rather than calling Node's `crypto` and `Buffer`. That implementation is
checked byte-for-byte against Node's `crypto.createHmac` over 400 random inputs, and the
webhook test signs with Node and verifies with this code, which is the same path Cashfree uses.

## Setting it up

1. **Import** `8-cashfree.json`: Workflows → ⋯ → Import from File.
2. **Notion account** — a Notion API credential named `Notion account`, holding your Notion
   integration token as the Internal Integration Secret. Used by the five Notion nodes.
   (n8n's own Notion credential, not Header Auth: it adds the Authorization header itself.)
3. **Cashfree keys** — a Custom Auth credential named `Cashfree keys` holding
   `{"headers":{"x-client-id":"YOUR_APP_ID","x-client-secret":"YOUR_SECRET_KEY"}}`.
4. **The secret, once more, in the open.** Open the node **Sach mein Cashfree hai?** and replace
   `PASTE_YOUR_CASHFREE_SECRET_KEY` with the same Secret Key. A credential cannot be read from a
   Code node, and that node needs it to check the signature.
5. **Telegram** — set an n8n environment variable `TELEGRAM_CHAT_ID` to your Telegram chat id.
   The node reads `$env.TELEGRAM_CHAT_ID` and will skip silently if it is not set (it has
   "Continue on error" on, so a missing chat id never blocks a payment).
6. **Publish**, then in the Cashfree dashboard add a webhook pointing at
   `https://n8n.washingdaddy.com/webhook/wd-pay-hook`.

## Testing it

With sandbox keys, pay ₹1 from `washingdaddy.com/pay/`. You should see the Cashfree page open,
then within a few seconds: the car's **Service Paid Up To** moves a month, **Owes Now** drops,
and you get a Telegram message. If nothing moves, open the workflow's Executions tab; a failed
`wd-pay-hook` run almost always means the secret in step 4 doesn't match the one in step 3.

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
3. **Publish.** Then open `https://n8n.washingdaddy.com/webhook/wd-washer-cars?washer=chotte`
   in a browser: you should see Chotte's round as JSON.

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
3. **Replace `YOUR_FIREBASE_PROJECT_ID`** in both Firestore nodes with your actual Firebase
   project ID (e.g. `washing-daddy-prod`).
4. **Publish.**

## Testing it

POST to `https://n8n.washingdaddy.com/webhook/wd-ondemand-dispatch` with body
`{"doc_id":"test123","area":"GH-9 Paschim Vihar"}`.
- If a washer's location in Firestore `locations/chotte` was updated in the last 30 min,
  the response will be `{assigned:true,washer_id:"chotte",...}`.
- If no location is fresh, it returns `{assigned:false,reason:"no_active_washers"}` — safe.

## GPS on the washer app

The washer app (installed APK) broadcasts GPS every time the device moves, via
`navigator.geolocation.watchPosition` → Firestore `locations/{washer_id}`. Location is
**only broadcast in the real app** (when `window.WDAuth` is present), not in the plain web preview.
Android 6+ shows a one-time "Allow location" prompt the first time; the WebChromeClient in
`MainActivity.java` handles the permission handshake.

Location is cleared from Firestore when the washer logs out, so stale positions do not
mislead the dispatch algorithm.
