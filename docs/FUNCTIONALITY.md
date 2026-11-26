# Everything the apps and website can do

Generated from the register in `admin/hq/funcs.js`, the same list WD HQ shows under **All functions**. A function with a switch can be turned on or off from WD HQ (it writes `appcfg/customer`, which the apps and the website read live). "Core" functions have no switch: the apps need them to work, or the stores require them; where one can be edited, the section is named.

## Customer app (mobile/native/customer)

### Whole app

| Function | What it does | Control |
|---|---|---|
| Maintenance mode | Closes the app for customers with a notice. Turn ON only when you need it. | Switch: `maintenance.on` (off by default) |

### Booking

| Function | What it does | Control |
|---|---|---|
| Instant washes | Book a washer to come now, within opening hours. | Switch: `instant.on` (on by default) |
| Busy mode | Shows "we are busy" and blocks instant booking. Scheduled booking still works. | Switch: `instant.busy` (off by default) |
| Scheduled washes | Pick a day and a time slot. | Switch: `features.scheduled` (on by default) |
| Recurring washes | The Recurring option in the cart. | Switch: `features.recurring` (on by default) |
| Reschedule | Customers moving a booking. | Switch: `features.reschedule` (on by default) |
| Cancel booking | Customers cancelling a booking. | Switch: `features.cancel` (on by default) |
| Monthly plans | Daily wash plans and sign-up. | Switch: `features.plans` (on by default) |

### Money

| Function | What it does | Control |
|---|---|---|
| WD Money wallet | Balance, wallet payments and the wallet icon. | Switch: `features.wallet` (on by default) |
| Add money (top-up) | The Add money button and bonus chips. | Switch: `features.topup` (on by default) |
| Gift cards | Buy and redeem gift cards. | Switch: `features.giftcard` (on by default) |
| WD Pass | Prepaid visit passes and the pass promo. | Switch: `features.pass` (on by default) |
| Coupons | Apply a code at checkout. | Switch: `features.coupons` (on by default) |
| Refer a friend | Referral banner, page and rewards. | Switch: `features.refer` (on by default) |

### Account

| Function | What it does | Control |
|---|---|---|
| WhatsApp sign-in code | Off sends the sign-in code by SMS only. | Switch: `features.whatsappLogin` (on by default) |
| Skip login (guest browsing) | The Skip button on the sign-in screen. | Switch: `features.guest` (on by default) |
| Notify me / Count me in | The card that tells customers outside your areas how many neighbours are waiting. | Switch: `features.notify` (on by default) |
| Ratings | Ratings on cards and the rating after a wash. | Switch: `features.ratings` (on by default) |
| Car store | The Store and its entry on Home. | Switch: `features.store` (on by default) |

### Tabs

| Function | What it does | Control |
|---|---|---|
| Washes tab | Bookings and wash history. | Switch: `tabs.washes` (on by default) |
| Money tab | Also needs the wallet switch. | Switch: `tabs.money` (on by default) |
| Profile tab | Account, addresses, help. | Switch: `tabs.profile` (on by default) |

### Home sections

| Function | What it does | Control |
|---|---|---|
| Hero banner | The big header on Home | Switch: `sections.hero` (on by default) |
| Instant and Monthly cards | The two entry cards | Switch: `sections.instantCards` (on by default) |
| Wash packs | The packs carousel | Switch: `sections.packs` (on by default) |
| Refer banner | The refer a friend strip | Switch: `sections.referBanner` (on by default) |
| All services grid | The a la carte grid | Switch: `sections.services` (on by default) |
| Trust footer | Your car is in professional hands | Switch: `sections.trust` (on by default) |
| WD Pass promo | The pass sheet on Home | Switch: `sections.passPromo` (on by default) |
| Plans and Store row | Shortcuts under the services | Switch: `sections.more` (on by default) |

### Always on

| Function | What it does | Control |
|---|---|---|
| Phone sign-in | Code by SMS or WhatsApp, with the owner numbers handled on the server. | Core (edit in Texts) |
| Addresses and map pin | Apple Maps or Google map, the pin at the customer's door. | Core (edit in Service areas) |
| Service-area check | Nobody can book or pay outside your circles. | Core (edit in Service areas) |
| Cart and payment | Cashfree and Razorpay through the payment server. | Core (edit in Payments) |
| Live washer tracking | The washer's position and the status steps of every wash. | Core (edit in Washer map) |
| Photo proof of every wash | Photos on the Daily and Bookings cards. | Core (edit in Rounds and photos) |
| Notifications | Washer on the way, wash done, receipts. | Core |
| Profile, help and legal pages | Edit profile, delete account (the stores require it), help topics, terms. | Core (edit in Pages and help) |

## WD Partner app (mobile/native/washer)

### Tabs

| Function | What it does | Control |
|---|---|---|
| Extra tab | Extra jobs: accept or deny offers, work assigned jobs. | Switch: `features.washer.tab_extra` (on by default) |
| Hazri tab | Attendance with the selfie and the T-shirt check. | Switch: `features.washer.tab_hazri` (on by default) |
| Money tab | Earnings, week, target and lists. | Switch: `features.washer.tab_money` (on by default) |

### Round

| Function | What it does | Control |
|---|---|---|
| Round picker | The place chip under the name that lets a washer take a round. | Switch: `features.washer.round_picker` (on by default) |
| Add a new car | The washer signs up a customer's car from the app. | Switch: `features.washer.add_car` (on by default) |

### Money

| Function | What it does | Control |
|---|---|---|
| Bonus and rewards | The bonus card on Money and the Round tab. | Switch: `features.washer.rewards` (on by default) |

### Profile

| Function | What it does | Control |
|---|---|---|
| Refer and earn | The referral row in Profile. | Switch: `features.washer.refer` (on by default) |
| Help and SOS | The help button on Round and the SOS row in Profile. | Switch: `features.washer.help_sos` (on by default) |

### Always on

| Function | What it does | Control |
|---|---|---|
| Guided route | The first car on top with its slot, the one big button, the route track and car boxes. | Core (edit in Rounds) |
| Nikla, wash, 2 photos, finish | Each car's steps, with the 2 closing photos. | Core (edit in Live desk) |
| Location sharing | Washers share their position; you see it on the map. | Core (edit in Washer map) |
| Washer pay share | The share of each wash the washer earns (set in Fees). | Core (edit in Fees) |
| Job alerts | New extra jobs ring on the washer's phone. | Core (edit in Live desk) |
| Documents and kit | ID documents, kit list, language and theme. | Core (edit in Washers) |

## Website (index.html)

### Sections

| Function | What it does | Control |
|---|---|---|
| Monthly plans section | The plan cards. Prices follow Services and prices. | Switch: `features.web.plans` (on by default) |
| Street / how it works | The street story section. | Switch: `features.web.street` (on by default) |
| Before and after | The photo comparison. | Switch: `features.web.beforeAfter` (on by default) |
| Where we work (map) | The service-area map. | Switch: `features.web.map` (on by default) |
| Join as a washer | The sign-up section for washers. | Switch: `features.web.join` (on by default) |
| Enquiry form | The contact form. | Switch: `features.web.enquire` (on by default) |
| Choose a plan online | The Choose buttons. Off turns them into "Message us". | Switch: `features.web.buyOnline` (on by default) |

### Always on

| Function | What it does | Control |
|---|---|---|
| Plan prices and availability | Follow the catalog automatically: change them in Services and prices. | Core (edit in Services and prices) |
| WhatsApp contact | The WhatsApp links on the page. | Core |
| Privacy, terms and cancellation pages | The legal pages the stores link to. | Core (edit in Pages) |

## How a switch is enforced

- **Customer app**: `mobile/native/customer/src/data/config.ts` reads `features`, `sections`, `tabs`, `instant` and `maintenance`.
- **WD Partner app**: `mobile/native/washer/src/state/store.ts` (`wFeature`) reads `features.washer.*` at start and when the app comes back.
- **Website**: `wd-live-prices.js` reads `features.web.*` and hides the section; it also updates plan prices and availability from the catalog.
