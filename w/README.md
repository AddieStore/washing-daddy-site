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

## Time per car

Every car is 10 minutes, or 12 when three or more jobs fall due that day, plus
2 minutes to get to the next one. From the round's start time the app works out
a slot for each car and shows it on the card — `07:36 · 10 min` — and marks the
card red when that slot has already passed.

Opening a car starts a timer that counts up. It turns amber for the last fifth
of the time, then red at the limit with three beeps and a buzz. The washer can
restart the timer if they opened the car by mistake.

The real minutes spent go to the Wash Log, so **Minutes On Car** on the board is
measured rather than inferred.

The start time sits above the list and each washer sets their own; it defaults
to 07:00 and is remembered on that phone.

## Where the data comes from

`n8n.washingdaddy.com/webhook/wd-round?washer=NAME` — the live list from Notion.
That is the only source.

The app is still never blank: the last list it received is kept in the phone's
own `localStorage` and drawn immediately on open, then replaced when the live
list answers. Offline, yesterday's list is what the washer sees — same as before.

There used to be a `round.json` in this folder as the instant source. It was
deleted: it was publicly readable and held every customer's car, registration,
area, service level and address note. **Do not put it back.**

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
