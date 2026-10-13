# Washer duty app

Opens at **washingdaddy.com/w/** — no login. Each washer gets their own link:

- Chotte — `washingdaddy.com/w/?as=Chotte`
- Shahrukh — `washingdaddy.com/w/?as=Shahrukh`

## What it does

Shows today's round, grouped by area. Each car shows only the jobs due on
that car today, worked out from its Service Level in the Notion book and the
day of the week. Weekly extras are spread across the week per car, so the
whole round never lands on one morning.

Tap a car, take an after photo, tap **Ho gaya**. The photo and the record go
to n8n; if there's no signal they queue on the phone and go when it returns.

## Where the data comes from

1. `round.json` in this folder — loads instantly so the app is never blank.
2. `n8n.washingdaddy.com/webhook/wd-round?washer=NAME` — the live list from
   Notion, which replaces the local one as soon as it answers.

Keep `round.json` roughly in step with the book, but the live list wins.

## Service rules

Set per car by **Service Level** in *Monthly Customers — Live Status*.
Blank means WD Standard.

| Level | Pressure wash | Interior | Tyre & trim | Foam | Detailing |
|---|---|---|---|---|---|
| Legacy ₹500 | daily | 1×/week | — | — | — |
| WD Standard | daily | 1×/week | 2×/week | 1×/week | — |
| WD Pro | daily | 2×/week | daily | 2×/week | 1×/month |
| WD Exclusive | daily | 3×/week | daily | 4×/week | 2×/month |
| WD Reserve | daily | daily | daily | daily | 4×/week |
