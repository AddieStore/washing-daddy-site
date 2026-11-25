# 16 — Washer rounds (list and take a round)

A **round** is every car of one area collected into one list. Any approved washer can take a round from the washer
app (Round tab → the place chip under his name); every car of that round then moves to him and shows up in his app.

## What it does

`POST https://n8n.washingdaddy.com/webhook/wd-washer-rounds?washer=<id>` with `Authorization: Bearer <Firebase ID token>`
(same sign-in check as workflow 9: the token's phone must be that washer's).

| Body | Answer |
|---|---|
| `{ "action": "list" }` | `{ ok, rounds: [{ id, name, areas, count, washer }], mine }` |
| `{ "action": "pick", "round": "<id or name>" }` | sets **Washer** on every active car of that round, `{ ok, moved, total, round }` |

## Set up (once)

1. In the Notion **Monthly Customers** database add a **Round** property (select), for example `Paschim Vihar A`,
   `Paschim Vihar B`. Put each car on one round. Cars with no Round are not on any round.
2. In workflow 9 nothing changes: the washer's list is still every car whose **Washer** is him, so taking a round just
   rewrites **Washer**. (Optional: add a **Flat** text property; the app shows it next to the society, which is **Area**.)
3. n8n env: `NOTION_TOKEN` (a Notion integration that can read and edit Monthly Customers), `NOTION_CARS_DB`
   (defaults to the database in workflow 9), plus what workflow 9 already needs (`FIREBASE_PROJECT_ID`,
   `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, optional `WASHER_PHONES`).
4. Import `16-washer-rounds.json`, publish it.

## Notes

- Only washers listed in `ROUND_WASHERS` (lib.js, same two as workflow 9) can take a round. Add new washers in both places.
- A round that another washer already has cannot be taken (`error: taken`): ops changes **Washer** in Notion to hand it
  over. Only a round nobody has, or one the caller already has, can be picked. The app also only lets a washer switch
  before any car of his own round has started.
- `node test.mjs` runs the logic tests; `node build.mjs` regenerates the JSON from `lib.js` and `token.js`.
