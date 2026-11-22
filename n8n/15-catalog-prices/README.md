# 15 — Catalog prices in workflow 8

Workflow 8 (`wd-pay-order`) now prices **monthly plans** and **one-time washes** from the Firestore `catalog`
docs that WD Operations > Prices edits and washingdaddy.com shows. Change a price in the admin panel and the
website checkout charges the new price.

| Website id | Catalog doc |
|---|---|
| `std` `pro` `exc` `res` | `plan-std` `plan-pro` `plan-exc` `plan-res` |
| `wash` `deep` `exclusive` (old app ids `interior`/`combo` → wash, `detailing` → deep) | `pack-wash` `pack-deep` `pack-exclusive` |

- New node **Catalog ke daam** (before *Daam tay karo*): one `documents:batchGet` for the 7 docs, field `price`.
  No credential and no env var: `catalog` is public (`allow read: if true`); the URL carries the website's
  public web API key. It never stops the workflow (5 s timeout, errors continue).
- A price is used only if the doc was found and `price` is a whole number from 1 to 50000. Otherwise (read
  failed, doc missing, bad value) the old hardcoded price stays. The browser's amount is never charged: if it
  differs from the server price the order is refused with "That price is out of date. Reload the page and try
  again." One-time washes now get the same check when the page sent an amount.
- Untouched: monthly bills and cars already on the book (Notion `Monthly Fee`), legacy plan, tips, store,
  invites/credit, the Pronto branch. Upgrades use the catalog plan prices.

## Files

- `patch-8.mjs` — applies the change to `n8n/2026-11-01/8-cashfree.json` (already applied, safe to re-run).
  The older `n8n/8-cashfree.json` is not patched (it is kept as it was).
- `test.mjs` — offline tests: `node n8n/15-catalog-prices/test.mjs`.

## Setup

Re-import `n8n/2026-11-01/8-cashfree.json` into n8n and publish. Nothing else.
