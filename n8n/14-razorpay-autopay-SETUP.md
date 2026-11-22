# Setup: monthly plans on Razorpay autopay (workflow 14)

For Ravi. From now on a monthly plan in the customer app is always paid by autopay: the customer pays the
first month in Razorpay, gives a UPI autopay / card mandate, and Razorpay charges the same amount every month
by itself. The app shows "Autopay every month, cancel any time" and Profile has a "Cancel autopay" row.

No key or secret goes in this repo or in any n8n node. They live only in `/root/docker-compose.yml`.

## 1. Razorpay dashboard

1. **Turn on Subscriptions.** Dashboard → Subscriptions (left menu). If it asks, request activation.
   Test mode works at once. **Live mode needs Razorpay's approval for recurring payments / autopay mandates**
   (UPI autopay, card e-mandate). Until they approve it, live customers cannot start autopay: ask them
   (support ticket: "enable Subscriptions and recurring payments for live mode") before shipping the app.
2. **Add the webhook.** Dashboard → Account & Settings → Webhooks → Add new webhook:
   - URL: `https://n8n.washingdaddy.com/webhook/wd-sub-hook`
   - Secret: make up a long random string (keep it, you need it in step 2.1). Not the API key secret.
   - Active events: `subscription.charged`, `subscription.pending`, `subscription.halted`,
     `subscription.cancelled`, `subscription.completed`, `subscription.activated`, `payment.failed`
   - Save. Do this once in **Test mode** and again in **Live mode** (they are separate).
3. Nothing to create by hand: the workflow creates the Razorpay plans (monthly, every 1 month, at the plan
   price from the dashboard catalog) and caches them in Firestore `rzp_plans/`.

## 2. The droplet

1. Edit `/root/docker-compose.yml` with an editor (never type secrets on the command line). In the n8n
   service's `environment:` add, next to the existing `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`:
   ```
   - RAZORPAY_WEBHOOK_SECRET=<the webhook secret from step 1.2>
   ```
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_SA_KEY_B64`, `TELEGRAM_CHAT_ID`,
   `NODE_FUNCTION_ALLOW_BUILTIN=crypto` and `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` are already there for
   workflows 11 and 13; workflow 14 uses the same ones. Use test keys and the test webhook secret first.
2. Restart n8n: `docker compose -f /root/docker-compose.yml up -d n8n`
3. Get the new files: `cd` to the site repo on the droplet and `git pull`.

## 3. n8n

1. **Import** `n8n/14-razorpay-autopay/14-razorpay-autopay.json` (Workflows → ⋯ → Import from File).
2. Open the node **Ravi ko batao (14)** and pick your existing **Telegram account** credential.
3. **Publish** (activate) it.
4. **Re-import workflow 13** too (`n8n/13-pronto/13-pronto.json`, replace the old one, pick the Telegram
   credential again, publish): it now takes recurring bookings (first month paid up front) instead of
   answering "coming soon".

Do steps 1 to 3 **before** the new app build reaches customers: the new app no longer has the old one-time
plan payment, so until workflow 14 is live a customer tapping "Pay" on a plan sees "not available yet"
(nothing is charged).

## 4. Try it in test mode

1. In the app, open the Plan tab → Pay. Razorpay opens inside the app. Pay with the test UPI id
   `success@razorpay` (or a Razorpay test card).
2. Within seconds: the car's paid-up date moves one month, the plan shows "Autopay on", the payment shows
   under WD Money → Transactions, and you get a Telegram line "Autopay started …".
3. In the Razorpay dashboard → Subscriptions you see it as Active. Profile → Cancel autopay → it shows
   "cancelled at the end of the cycle"; the plan stays till its paid-up date.

## 5. Every month after that

- Razorpay charges the customer. Workflow 14 gets `subscription.charged`, moves the car's paid-up date one
  month in Firestore (`customers/{phone}.cars[i].till`) and sends you a Telegram line.
- **The Notion book is not updated by workflow 14.** Each Telegram line says which date to set; move
  **Service Paid Up To** in Notion by hand (or tell me and I'll add the Notion update).
- A failed charge: Telegram "Autopay payment failed …" (Razorpay retries by itself). If all retries fail:
  "Autopay HALTED …": call the customer; their plan is not extended.

## 6. Going live

1. Razorpay approved Subscriptions / autopay for live mode (step 1.1).
2. Add the webhook in Live mode (step 1.2) with its own secret.
3. In `/root/docker-compose.yml` swap `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
   `RAZORPAY_WEBHOOK_SECRET` for the live values, then restart n8n (step 2.2). Test and live Razorpay
   plans are cached separately, so nothing else changes.

## Good to know

- Prices come from the dashboard catalog (`catalog/std`, `catalog/pro`, …, `kind: plan`). If you change a
  plan's price, new autopays use the new price; customers already on autopay keep the price they signed up at
  (Razorpay cannot change a running subscription's amount). Tell them and ask them to restart autopay if needed.
- Plans paid before this change still work; their paid-up date is untouched until they start autopay.
- A customer with autopay on cannot switch plan in the app: they cancel autopay first (the app says so).
- The ₹200 invite discount and Referral Credit (workflow 8) are not applied to autopay payments yet.
- Tests: `node n8n/14-razorpay-autopay/test.mjs` (and `node n8n/13-pronto/test.mjs`). After editing
  `sub.js` or `13-pronto/lib.js`, run `node n8n/14-razorpay-autopay/build.mjs` and `node n8n/13-pronto/build.mjs`.
