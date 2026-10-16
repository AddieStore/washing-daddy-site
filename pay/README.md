# Payments — Cashfree

Live at **washingdaddy.com/pay/**. Three tabs:

- **My bill** — existing customer types their car number, we look it up in the
  Notion book through n8n and show what's due. One tap to pay it.
- **New plan** — the four monthly plans at list price.
- **One wash** — the three one-time prices.

## Before this can take real money

1. **Cashfree account, activated.** Business details and bank account are yours
   to enter — nothing here holds your keys.
2. **Whitelist the domain** `washingdaddy.com` in the Cashfree dashboard, or
   checkout refuses to open.
3. **Import `8-cashfree.json` into n8n** and set:
   - a Custom Auth credential named *Cashfree keys* holding
     `{"headers":{"x-client-id":"...","x-client-secret":"..."}}`
   - the Secret Key pasted into the **Signature banao** node
4. **Add the webhook** in Cashfree pointing at
   `https://n8n.washingdaddy.com/webhook/wd-pay-hook`
5. **Go live**: set `CF_MODE` to `"production"` in `index.html` here, and
   `SANDBOX = false` in the *Order banane ki tayyari* node in n8n. Both, or
   payments will quietly stay in test mode.

## What happens when someone pays

Cashfree calls the webhook. n8n verifies the signature against the raw body,
rejects anything older than five minutes, finds the car in the book by its
registration, moves Service Paid Up To forward by however many months the
amount covers, reduces Owes Now, and sends you a Telegram message. If the car
isn't on the book it creates a Lead instead and tells you.

The amount is checked server-side before the order is created, so the page
can't be used to pay an amount we didn't set.

## The customer app pays through the same endpoints

From the Android app, the pay button calls `wd-pay-order` the same way this page does, then
opens Cashfree in a modal so the app is not thrown away. The app never marks itself paid: it
shows "we're checking it with the bank" and waits for the book to change.

The app used to have no way of seeing the payment, because the webhook moves
`Service Paid Up To` in Notion while the app reads the car's `till` from Firestore. Rather than
give n8n a Google credential, the app now asks `wd-pay-lookup` for that car every couple of
seconds after paying, and takes the new date from the book. The book stays the one place the
money is recorded, and n8n needs no extra credential.

Going live in the app is a third flag: `PAY_LIVE = true` in the customer app source
(`/mnt/project-files/customer-app/index.html`), on top of the two above.

The workflow itself is `n8n/8-cashfree.json` in the project files, with setup notes beside it.
It was written from scratch on 16 Oct 2026: the original was never imported into n8n and the
file was lost.
