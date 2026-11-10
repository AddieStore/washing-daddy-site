# 11 — Razorpay checkout (n8n)

Razorpay Standard Web Checkout, added **beside** Cashfree (workflow 8 is untouched). The page is
`/pay/razorpay/`. The site is static and has no Node server, so the two endpoints are n8n webhooks,
like every other Washing Daddy backend.

| Webhook | Does |
|---|---|
| `POST /webhook/wd-rzp-order` | Browser sends `{item}` (`wash`, `deep`, `exclusive`, `test`). Priced **here**, never from the browser. Creates the order at `api.razorpay.com/v1/orders` and returns `{order_id, amount, currency, key_id, name}`. Under ₹1 refused. Razorpay auth failure → 401, other Razorpay failure → 500. |
| `POST /webhook/wd-rzp-verify` | Browser sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. Computes HMAC-SHA256(`order_id|payment_id`, key secret), compares in constant time. Missing fields or mismatch → 400. Match → `{ok:true}`. |

The secret only ever lives in n8n. Nothing is recorded as paid on a mismatch (and this first version
records nothing in Notion at all: a match just shows "Payment received" and the payment appears in
the Razorpay dashboard).

## Setup (once)

1. Add two env vars to the n8n service in `/root/docker-compose.yml` (same place as `CASHFREE_SECRET`),
   then `docker compose -f /root/docker-compose.yml up -d n8n`:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=...` (type it into the file with an editor; do not put it on a command line)
2. In n8n create a **Basic Auth** credential named *Razorpay live*: user = key id, password = key secret.
3. Import `11-razorpay.json`, pick that credential on the node **Razorpay order banao**, save, **Publish**.
4. Use **test** keys until you have tried it, then swap both values for live keys.

## Test

Open `washingdaddy.com/pay/razorpay/`, pick *Test payment ₹1*, pay with a Razorpay test card/UPI
(`success@razorpay` works as a test UPI id). You should see "Payment received" and the payment in the
Razorpay dashboard (Test mode).

Logic tests (no network): `node n8n/11-razorpay/test.mjs`. After editing `lib.js` or `logic.js`,
run `node build.mjs` to regenerate the JSON.
