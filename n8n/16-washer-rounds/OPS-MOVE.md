# Ops: move a monthly car, hand over a round, see Notion cars

Ravi can do this from the ops page (admin/ops) without opening Notion:
- **Monthly** tab, open a customer, **Move car** on a car: new washer (and optionally another round).
- **Washers** tab, open a washer, **Hand over round**: a whole round goes to another washer.
- **Rounds** tab, **Notion cars**: read-only list of the Notion book per washer and round.

Every write shows a confirm step first. `?demo=1` works with sample data and writes nothing.

## Deploy in 4 steps

1. **n8n env** (Settings > Variables / the container env): keep what workflow 9 and 16 already use (`NOTION_TOKEN`,
   `FIREBASE_PROJECT_ID`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`). Add `WASHER_IDS=chotte,shahrukh` (all washer ids, comma
   list or JSON array; leave it out and the two original washers stay). Optional `ADMIN_PHONES=["+917701808924"]`
   (owner phones allowed to use ops actions; default is the owner number).
2. **Import** `n8n/16-washer-rounds/16-washer-rounds.json` (replaces the old 16) and `n8n/9-washer-cars.json`
   (replaces the old 9). Both Code nodes read `WASHER_IDS`, so there is one list. Workflow 9 now also reads every
   Notion page (the old one stopped at 100 cars). The Notion integration must be able to edit Monthly Customers.
3. **Publish** both workflows (webhook paths do not change: `wd-washer-rounds`, `wd-washer-cars`).
4. **Add a new washer later**: add his id to `WASHER_IDS` and his sign-in phone to `WASHER_PHONES`
   (`{"+91...":"aman",...}`, the same env both workflows already use; the default holds only chotte and shahrukh),
   restart/save n8n, and make the Notion **Washer** option have the same name as his id (any capitals, e.g. `Aman`).
   The id must be the round id the ops page shows on his washer card (`Round id`), single word, lowercase.

## Webhook

`POST https://n8n.washingdaddy.com/webhook/wd-washer-rounds?washer=ops`, header `Authorization: Bearer <Firebase ID token>`.
The token's phone must be in `ADMIN_PHONES`; a washer token on an `ops_*` action gets 401, and the washer actions do not
accept the owner token. Answers `{ ok:false, error }` on a problem (`forbidden`, `unknown washer`, `unknown round`,
`unknown car`, `notion write failed`).

| Body | Answer |
|---|---|
| `{ "action": "ops_list" }` | `{ ok, washerIds, washers:[{id,count,rounds:[{id,name,count,cars:[{id,reg,plate,name,area,round,roundId,washer,order}]}]}], unassigned:{count,rounds}, rounds:[{id,name}], total, truncated }` |
| `{ "action": "ops_move", "carPageId": "<notion page id>" or "reg": "DL4CAB2731", "washer": "aman", "washerName": "Aman", "round": "paschim-vihar-a" }` | `{ ok, moved:1, car, washer, round }` (`round` optional; a changed round also clears Round Order so the car goes last) |
| `{ "action": "ops_handover", "round": "paschim-vihar-a", "toWasher": "aman", "washerName": "Aman" }` | `{ ok, moved, total, round, washer }` (`ok:false` with `moved < total` if Notion refused some; run it again) |

## Notes

- Washer's list in the app (workflow 9) is every car whose Notion **Washer** is him, so a move shows on his phone at his next refresh.
- `ops_list` reads up to 30 pages of 100 cars; `truncated:true` means more exist.
- Not changed: the washer's own "take a round" flow, and the `Account Status` filter (only Active cars are listed/moved).
