# Handoff — Washing Daddy

Written 15 October 2026. Picks up from the Business HQ handbook; this file
covers the current build and the one thing that is blocked.

---

## Goal

Run Washing Daddy — a doorstep pressure car wash in West Delhi, 36 cars, two
washers — on software instead of memory. Four audiences, four surfaces:

- **Customers** see proof their car was washed, and can pay.
- **Washers** (Chotte, Shahrukh) get told exactly what to do on each car, with a
  time budget per car and photo proof.
- **The owner** sees money and operations in one place without asking anyone.
- **The public** can find the service and sign up.

The business rule everything serves: nobody should have to be told twice, and
₹17,937 of unpaid washing should stop being invisible.

---

## Current State

### Live and working

| URL | What | State |
|---|---|---|
| `washingdaddy.com` | Public site | Working |
| `washingdaddy.com/w/?as=Chotte` | Washer duty app | Working, in daily use |
| `washingdaddy.com/boss-f2d818d6/` | Founder board — **PIN 5550** | Working, live data |
| `washingdaddy.com/app/` | APK download page for washers | Working |
| `washingdaddy.com/pay/` | Cashfree payments | Page works, **sandbox mode** |
| `washingdaddy.com/my/` | Customer app | Sign-in works, **data blocked** |

### n8n (`n8n.washingdaddy.com`)

| Workflow | State |
|---|---|
| WD 3 — Daily job list | Exists, not published |
| WD 6 — Washer app | **Published and working** |
| WD 7 — Payment bot | **Published**, date bug fixed, untested by a real payment |
| WD 9 — Customer app | Imported, credentials bound, **will not publish — blocker** |

Health: 294 production executions, **102 failed (34.7%)**. Most of those are
from the broken-board period earlier and should age out, but the failure rate is
worth watching rather than assuming.

### Firebase

Project `gen-lang-client-0799769592` ("Washing Daddy"), created originally by
Google AI Studio, on the **Blaze** plan. Phone sign-in enabled,
`washingdaddy.com` authorised. The web config is already wired into both
`/my/index.html` and WD 9. India SMS costs roughly ₹6 per code.

### Notion

- **Wash Log** gained `Photo ID` (text) — to hold the Telegram file id. Still
  empty, because WD 6 doesn't write it yet.
- **Monthly Customers** gained `Access Key` (text) — **unused, safe to delete**.
  It was for a link-based sign-in approach that was abandoned for OTP.

---

## Files Touched

### In the site repo (`AddieStore/washing-daddy-site`)

| Path | Why |
|---|---|
| `my/index.html`, `my/manifest.webmanifest` | New customer app |
| `w/index.html` | Time slots, running timer, beep, manifest + service worker |
| `w/sw.js`, `w/manifest.webmanifest`, `w/icons/*` | Offline cache and app icons |
| `pay/index.html`, `pay/README.md` | Cashfree payments page |
| `app/index.html`, `app/washing-daddy.apk` | APK download page and the APK itself |
| `android/**` | The Android WebView shell |
| `.github/workflows/android.yml` | CI that builds the APK and commits it |
| `index.html` | Footer link to the pay page |
| `boss-f2d818d6/wf/9.json` | **Temporary — delete this** (see below) |

### Workflow files (not in the repo, delivered in chat)

`6-washer-app.json`, `7-payment-bot.json`, `8-cashfree.json`,
`9-customer-app.json` — all under `/home/claude/n8n/`. 6, 7 and 9 now match
what is live. **8 does not** (see failures).

---

## What Changed

**The root cause of everything being broken.** Notion exposes two different
ids, and I had given n8n the wrong one. The n8n Notion node wants the
**database id**; I had supplied the **data-source (collection) id**. Every
Notion node in every workflow pointed at something that did not exist, so the
board, the washer feed and the bot all failed identically. Fixed by selecting
each database from n8n's own dropdown rather than pasting ids.

The correct ids:
- Monthly Customers — `ca0440e9f6ab4e15bf35b9d720e2952b`
- Wash Log — `3d263514209a42e4986f5e436dacfd9d`
- Leads — `9bb29c166c8446989c98eebffb0a1e6f`

**The second bug, which mattered more.** n8n returns Notion dates as objects
(`{start: "2026-10-29"}`), not strings. The text helper returned `''`, so every
car read as *never paid*. On the board that showed 36 unpaid and ₹1,126/day
instead of 20 and ₹675. In the **payment bot it would have been worse** — new
paid-up dates would have been calculated from today rather than from the end of
the last cycle, quietly wrong by weeks, on money. Fixed in 6, 7 and 9 by making
the helper understand `.start`.

**Washer app gained a schedule and a clock.** Every car has a time (07:00,
07:12, 07:24…), 10 minutes on the car plus 2 to walk, or 12 minutes when three
or more jobs are due. Opening a car starts a timer that turns amber at 80% and
red with a beep and a buzz at the limit. The real minutes now land in the Wash
Log, which makes *Minutes On Car* on the board mean something. Round start is
07:00 by default and the washers can shift it with **Badlo**.

**The washer app became a real APK.** `washingdaddy.com/app` serves a 1.9 MB
signed APK, built by GitHub Actions. It is a thin shell around `/w/`, so the
duty logic updates itself without anyone reinstalling. Three things that
normally break such wrappers were handled: the camera (a plain WebView ignores
`<input type=file capture>`), `localStorage` (off by default, and the offline
queue depends on it), and permissions (CAMERA deliberately left out of the
manifest so the phone's own camera app handles capture and the washer sees no
prompts).

**The customer app was built.** OTP sign-in, then today's photo with the time
stamped on it, what was done, the plan, what is owed with a pay button, the last
eight days as thumbnails, and buttons to report a problem or skip tomorrow —
both of which Telegram the owner. Eleven customers own more than one car, so it
tabs between them. Unknown numbers get a signup path instead.

**A discovery worth recording: wash photos were never being stored.** They went
to Telegram and vanished; `Photo` is empty on every Wash Log row. Since Telegram
still holds them all, WD 9 streams them back through n8n's own Telegram
credential, so the bot token never reaches a browser. The `Photo ID` column
exists for this, but **WD 6 does not populate it yet**.

**Security choice worth keeping.** `/my` sends a Google token, never a phone
number. n8n exchanges it with Google and trusts only the number Google confirms,
so typing a neighbour's registration gets you nothing.

---

## What Failed

**1. WD 9 will not publish. This is the blocker.**
The workflow imported cleanly, all 18 nodes, credentials bound automatically.
But the **Publish button is disabled**, and so is Unpublish in its dropdown.
`GET /webhook/wd-photo` returns *"the requested webhook is not registered"*,
confirming it is inactive. WD 6 and WD 7 published from the same button without
trouble, so this is specific to this workflow or to newly-imported ones. Saving
with Ctrl+S first, reloading, and clicking via the accessibility tree all failed
to enable it. **Not diagnosed.**

**2. n8n's code editor corrupted two of my edits.** It only renders the visible
part of a long file, so a select-all through the page replaced just what was on
screen and left the rest, producing duplicated code and *"Unexpected token
const"*. This caused a stretch of board errors. The reliable method, which
worked afterwards: empty the editor completely first, verify it is empty, insert
once, then scroll the whole file and compare every line against the source
before publishing.

**3. Calling n8n's REST API from the browser logged the session out.** A `GET
/rest/workflows/...` returned 401 and killed the cookie, forcing a fresh sign-in.
Do not script against n8n's REST API from the console; use the UI.

**4. The DigitalOcean web console drops typed input.** Commands often need
sending twice, and output does not always render. Verify results by fetching
the live URL rather than by trusting the console.

**5. `android-actions/setup-android@v3` is broken.** It asks sdkmanager for the
retired `tools` package and exits 1. The runner already ships the SDK — point
Gradle at `$ANDROID_SDK_ROOT` instead.

**6. Workflow 8 (Cashfree) still carries the date bug** in its `Car se jodo`
node. It is not imported, so nothing is broken today, but it must be fixed
before import or payments will write wrong paid-up dates.

**7. Meta business verification is unresolved.** Still in review as of 14 Oct.
If it fails: the error was *"Input Business Tax ID/Registration Number is
invalid"* — a Pvt Ltd should enter CIN or GSTIN, not PAN — and the use case is
set to "App requires access to permissions on Meta for Developers" when it
should be "Setting up a WhatsApp Business account".

---

## Next Steps

**Do first — unblocks the customer app**

1. **Get WD 9 published.** If the button stays disabled, the pragmatic
   workaround is to not fight it: open the published WD 6, and add WD 9's three
   webhook branches into it as extra nodes, since WD 6 publishes fine. Or
   duplicate WD 9 (the row menu offers Duplicate) and try publishing the copy.
2. **Then test `/my` end to end** with a number on the book — `9891511404` is a
   good one, it owns three cars. Expect: code arrives, three tabs, correct
   amounts. The photo will be missing until step 3.
3. **Make WD 6 save the Photo ID.** Add a Notion *update* node after
   **Photo owner ko**, setting `Photo ID` to
   `{{ $json.photo[$json.photo.length - 1].file_id }}` on page
   `{{ $('Write to Wash Log').item.json.id }}`. Photos only appear for washes
   logged after this is done.

**Housekeeping — do soon**

4. **Delete `boss-f2d818d6/wf/9.json` from the repo and the server.** It was a
   one-time import trick and is publicly readable. It holds no passwords, but it
   exposes the Telegram chat id and Notion database ids.
5. Delete the unused `Access Key` column from Monthly Customers.
6. Fix the date bug in `8-cashfree.json` before importing it.

**Then**

7. **Cashfree**: create the account, whitelist `washingdaddy.com`, import
   workflow 8, add a Custom Auth credential named *Cashfree keys*, paste the
   Secret Key into *Signature banao*, point a webhook at
   `https://n8n.washingdaddy.com/webhook/wd-pay-hook`. Going live is **two**
   flags: `CF_MODE = "production"` in `pay/index.html` **and** `SANDBOX = false`
   in the order node. Both, or it silently stays in test mode.
8. **Confirm the 07:00 round start** is right for Chotte, or change it.
9. **Send the washers** `washingdaddy.com/app`.
10. Chase Meta, or proceed on Telegram alone.

**Business decisions nobody has made yet**

- Twelve cars pay between ₹500 and ₹850 for work priced at ₹999. That gap is
  the largest single thing on the book.
- Altroz DL 9209 is 34 days past paid-up. The three-car account on `9891511404`
  is 27 days over at ₹2,997/month. Brezza DL 6592 has never paid and is still
  being washed — call `8397974888`.
- Two cars still have no registration recorded: the Amaze in GH-9 house 317, and
  the Mercedes GLS Goa number.
