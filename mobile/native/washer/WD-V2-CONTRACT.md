# WD Partner v2 sync contract (2026-11-23)

Extends .notes/sync-contract.md. Where they differ, this file wins. All times IST ISO with +05:30. REG and DATE as before.

## Decisions applied (Ravi said "go ahead" on lead's defaults; change here if he disagrees)
1. Skipped car: lost for that day, EXCEPT Sunday interior, which carries to the next day automatically. Customer sees the skip reason.
2. Start code applies to extra/on-demand jobs only (as today), not monthly washes.
3. Photos: 1 `before` mandatory, at least 2 `after` mandatory, `issue` optional. Sunday adds 5 spot photos (spots below).
4. Plan counts follow the app (standard foam once a month). Sunday interior is forced for EVERY plan every Sunday.
5. Payouts monthly; ledger in `earnings`.

## washes/{DATE}_{REG} additions
- status chain `scheduled > on_the_way > arrived > washing > done | skipped`; washer actions write `on_the_way_at`, `arrived_at`, `started_at`, `finished_at`.
- `photos[]`: `{kind: before|after|issue|inside, spot?: driver_mat|passenger_mat|back_seat|boot|dashboard, url, at, lat?, lng?}`. `url` is a Firebase Storage download URL (path `washphotos/{DATE}_{REG}/{n}.jpg`); inline data URLs only as offline fallback until upload finishes (`pending_upload: true`). Keep doc under 900 KB.
- `tasks[]` always includes `interior` on Sundays (`sunday: true` on the doc). Existing extras stay: slot, slot_from, slot_to, interior, interior_from, extra_minutes, addons, overdue_at.
- Carry-over: if Sunday interior not done at day end, `Sync.carryOver` creates next day's doc fields `carried_from: "<Sunday DATE>"`, `carried_task: "interior"`, and sets Sunday doc `interior_carried_to: "<DATE>"`. Customer/admin show "Sunday interior done Monday".
- `skip_reason` stays; unskip must clear it and set status back (fix outbox guard so a newer local `updated_at` wins).

## New collections
- `attendance/{DATE}_{+91phone}`: `{phone, name, date, check_in_at, check_in_photo?, check_out_at, cars_done, cars_skipped, hours, last_seen_at}` (washer writes own; admin reads). Replaces on-device-only log; checkins/ stays for the selfie.
- `earnings/{DATE}_{+91phone}`: `{phone, date, washes: [{reg, amount}], extras: [{id, amount}], bonus: [{kind, amount}], total, paid: false}`; `earnings_payouts/{YYYY-MM}_{phone}`: admin-written `{total, paid_at, ref}`. Washer reads own only; customer never reads.
- `washers/{phone}.last_seen_at` written every 60 s while app open.
- `locations/{round}`: also written in the background (expo task) while a round is active.
- `requests/{id}`: washer writes `status`, `seen_at`, `done_at`, `washer_reply?`; customer app listens and shows state.
- `ratings/{DATE}_{REG}`: customer app gains an entry point (stars + tag) after `done`.

## Notifications
Customer push (via n8n or Firestore trigger, workflow later): on_the_way, arrived, done (with first after photo), skipped (with reason). Washer push unchanged.

## Admin/ops reads
Live round board from `washes` (status counts per washer, late = `overdue_at`), attendance table, per-wash photo viewer, pending Sunday interiors (`interior_carried_to` or `carried_task`), skips with reasons, earnings ledger with Mark paid, low rating/complaint list.

## Rules
One new merged rules file firebase-rules/firestore.rules-merged-2026-11-23b.txt = 11-23 + attendance, earnings, earnings_payouts, washphotos storage rule, requests washer_reply. Never overwrite the older files.
