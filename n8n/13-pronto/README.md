# 13 — Pronto money (n8n)

`13-pronto.json` is the server for the new customer app's money screens (Pronto layer): bookings from the
cart, coupons, WD Money, gift cards and WD Pass. It fills in the endpoints the app has been calling since
15 Nov (`pronto-video-2026-11-15/BACKEND.md`), which until now answered 404.

Cashfree stays the payment gateway (production, proven since 23 Oct). Plans, monthly bills, tips, store
orders, one-time washes and upgrades still go through workflow 8 (`wd-pay-order`) exactly as before.

## Endpoints

All are `POST https://n8n.washingdaddy.com/webhook/<name>` with `Authorization: Bearer <Firebase ID token>`.

| Webhook | What it does |
|---|---|
| `wd-booking-create` | Prices the cart from Firestore (`catalog/{id}` price × size, packs fixed), checks the slot (`slots_cfg/default`, `slots/{date}`), instant hours (`appcfg/customer.instant`), coupon (`coupons/{CODE}` + `couponredemptions`), WD Pass (`passes` + `passes_cfg`), peak charge (`fees.slotSurcharge` + `fees.surcharge.<part>`), convenience fee and GST (`appcfg/customer.fees`). Writes `payorders/{id}` and opens a Cashfree order for what is left after WD Money. If nothing is left, the booking is made at once. |
| `wd-coupon-validate` | Read-only check: `{ valid, off, message }`. |
| `wd-booking-cancel` | Own booking, still new/scheduled, no washer yet (or ≥ 2 h before a scheduled slot). Refunds the Cashfree part through Cashfree's refund API and the WD Money part to the wallet, returns the pass visit and frees the slot. |
| `wd-booking-reschedule` | Own booking, not on the way. Checks the new slot. A dearer peak slot is charged to WD Money (refused if the wallet is short); a cheaper one is credited back. |
| `wd-wallet-topup` | ₹100 to ₹10,000 (whole rupees), wallet holds at most ₹10,000. On payment: cash credit (365 days) and 5% promo cashback (15 days). |
| `wd-gift-claim` | `giftcards/{CODE}` `{ amount, status:'live', bucket:'cash'|'promo', valid_till? }`, used once. 5 wrong codes an hour per number. |
| `wd-pass-buy` | `passes_cfg/{id}` price + GST, one active pass at a time. On payment: `passes/{id}` with the visits. |
| `wd-pronto-paid` | Not for the app. Workflow 8 forwards Cashfree's signed webhook here for orders of kind `booking`, `wallet_topup`, `pass`. Signature is checked again, then the order is fulfilled in one atomic Firestore commit. |

### Money safety

- The caller is the phone number in the verified ID token (RS256 against Google's certs, `aud`/`iss` =
  `FIREBASE_PROJECT_ID`, `exp`). Never a number from the body.
- Every amount comes from Firestore. `shownTotal` from the app is only used to refuse (409, nothing charged)
  when the server total is more than ₹1 above what the app showed.
- Same request from the same number within 2 minutes = the same order id: a retry never opens a second
  Cashfree order. A paid order is fulfilled once (the `payorders` doc's update time is a precondition of the
  commit; Cashfree's duplicate deliveries answer 200 and write nothing).
- WD Money, pass visits, coupon redemptions and slot counts are taken only when the payment has landed.
  If two payments race for the same wallet balance, the second is fulfilled and Ravi gets a Telegram line
  with the shortfall.
- Recurring bookings (Nov 2026): the first payment is the **first month**, `visits` (appcfg/customer.recurring.<freq>.visits,
  default weekly 4, twice 8, alt 15) x the per-visit total (catalog price - `off`% recurring discount + peak charge of the start
  day + convenience fee + GST). A coupon is taken once, on the first visit. This is the same sum as the app's bill rows
  ("Total per visit", "First month (N visits)", "To pay") and the Razorpay/Cashfree order amount. When it is paid, one
  scheduled `ondemand` doc is written per visit (`series_id`, `visit_no`, `share_gateway`, `share_wallet_*`); cancelling one
  visit refunds only its share. The next month is not billed automatically yet: the customer books again.
- 20 calls a minute per number. Errors are `{ ok:false, message }` ready for a toast. The workflow never
  answers 404 (the app reads 404 as "not live yet").
- Ravi gets a Telegram line for every paid order, cancellation and any problem (`⚠ ...`).
- Instant bookings paid through Cashfree are sent to workflow 10 (`wd-ondemand-dispatch`). Bookings paid
  fully by WD Money or a pass are not (workflow 10 can only verify Cashfree payments); washers see them
  through the normal job alert.

## Files

| File | |
|---|---|
| `lib.js` | All the logic. Edit this, then `node build.mjs`. |
| `build.mjs` | Writes `13-pronto.json` (each Code node embeds `lib.js`). |
| `patch-8.mjs` | Adds the Pronto branch to workflow 8's webhook (`n8n/2026-11-01/8-cashfree.json`, already applied, safe to re-run). |
| `test.mjs` | Offline tests (`node n8n/13-pronto/test.mjs`): real RSA tokens, real HMAC, fake Firestore/Google/Cashfree, and both workflow JSONs run end to end. |

## Setup

See `/mnt/project-files/dashboard-2026-11-16/PAYMENTS-DIAGNOSIS.md` ("What Ravi must do") for the
step-by-step. In short: four env vars on the n8n container (`CASHFREE_APP_ID`, `FIREBASE_SA_KEY_B64`, plus
the existing `CASHFREE_SECRET` and `FIREBASE_PROJECT_ID`), import 13 and the patched 8, pick the Telegram
credential, publish both, seed the `catalog`/`appcfg`/`passes_cfg`/`coupons` docs from the dashboard.
Secrets live only in `/root/docker-compose.yml` on the droplet, never in this repo.

Not built yet: the daily expiry job (promo 15 days, cash 365 days, passes past `valid_till`), referral
rewards, and automatic billing of the second and later months of a recurring booking. Monthly plans are
billed by Razorpay autopay in workflow 14 (`n8n/14-razorpay-autopay`).
