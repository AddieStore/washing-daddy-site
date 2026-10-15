# Boss board (English)

Secret address with a PIN. Don't forward the link.

- **The PIN is not in this folder.** It lives in n8n, as a header-auth
  credential on the `wd-board` webhook. This page sends whatever you type and
  n8n decides. Reading this page's source tells an attacker nothing.
- To change the PIN, change it in n8n — nothing here needs editing or
  redeploying.
- Changing the address means renaming this folder; the old link then 404s. The
  address is now only convenience, not protection.

## Where the numbers come from

One place only: `POST n8n.washingdaddy.com/webhook/wd-board`, with
`{"pin":"…"}` as the body — the Wash Log plus the customer book, totalled in
n8n. Wrong PIN or no PIN gets a 401 and no data.

There used to be a `board.json` snapshot next to this file as a fallback. It was
deleted because a file this page can read without a PIN is a file anyone on the
internet can read without a PIN — it was serving all 34 registrations, areas,
fees and arrears to anonymous requests. **Do not reintroduce a static
fallback.** If n8n is down the board shows "offline" and no figures, which is
the correct behaviour.

Refreshes itself every 90 seconds, and re-checks the PIN on every refresh.
**Lock** clears the remembered PIN from the phone.

## What it reads

- **Abhi** — who is on the round, how far through, minutes per car, who has
  stalled for more than 30 minutes.
- **Paisa** — monthly revenue on the book, what's outstanding, and how many
  cars are being washed past their paid-up date, with what that costs a day.
- **Trend** — cars washed per day and on-demand earnings, last 30 days.
- **Area** — cars, revenue and arrears by area and washer.

Built to stay readable at 20 washers: the cards are a grid sorted so anyone
stalled or not started comes first.
