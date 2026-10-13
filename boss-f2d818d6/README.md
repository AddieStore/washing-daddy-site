# Boss board

Secret address with a PIN. Don't forward the link.

- PIN is the `PIN` constant at the top of the script in `index.html`.
- Changing the address means renaming this folder; the old link then 404s.

## Where the numbers come from

1. `n8n.washingdaddy.com/webhook/wd-board` — live: the Wash Log plus the
   customer book, totalled in n8n.
2. `board.json` — a snapshot of the book, used when n8n can't be reached.
   The header says which one you're looking at.

Refreshes itself every 90 seconds.

## What it reads

- **Abhi** — who is on the round, how far through, minutes per car, who has
  stalled for more than 30 minutes.
- **Paisa** — monthly revenue on the book, what's outstanding, and how many
  cars are being washed past their paid-up date, with what that costs a day.
- **Trend** — cars washed per day and on-demand earnings, last 30 days.
- **Area** — cars, revenue and arrears by area and washer.

Built to stay readable at 20 washers: the cards are a grid sorted so anyone
stalled or not started comes first.
