# Store listing kit: Washing Daddy (customer) and WD Partner (washer)

Everything the Play Console and App Store Connect ask for, ready to paste. Check each line once before submitting.

## Washing Daddy (customer) · com.washingdaddy.customer

**Name:** Washing Daddy · **Subtitle (iOS, 30):** Doorstep car wash, Delhi
**Short description (Play, 80):** Book a doorstep car wash in West Delhi. Pay in the app, track your washer live.
**Promo text (iOS, 170):** Pressure wash, foam, interior and detailing at your parking. Verified washers, photo proof after every wash.
**Keywords (iOS, 100):** car wash,doorstep,cleaning,detailing,foam wash,monthly,Delhi,car care,pressure wash

**Full description**
Washing Daddy sends a verified washer to your parking spot. No bucket, no cloth, no waiting at a service station.

- Monthly plans (daily or alternate-day wash) and one-time washes
- Instant booking: a washer near you, live on the map
- Photo proof of every wash, sent to your phone
- Pay by UPI or card, see every bill in the app
- Tell your washer anything: scratches, keys, skip a day
- Available in selected areas of West Delhi. New areas are added every month; tap Notify me to hear when we reach you.

**Category:** Lifestyle (iOS) / Auto & Vehicles (Play) · **Age rating:** 4+ / Everyone
**Support URL:** https://washingdaddy.com · **Privacy policy:** https://washingdaddy.com/privacy.html
**Account deletion URL (Play requires):** https://washingdaddy.com/privacy.html#deletion-of-account-and-personal-data (the app also has Profile > Delete account)

## WD Partner (washer) · com.washingdaddy.washer

**Name:** WD Partner · **Subtitle:** For Washing Daddy washers
**Short description (Play):** Your daily route, attendance and earnings for Washing Daddy.
**Full description:** WD Partner is the work app for Washing Daddy washers. It shows the cars on your route in order with the time slot, takes your attendance with a selfie, records the 2 photos after each wash, and shows your earnings and extra jobs. Sign-in is only for washers approved by Washing Daddy.
**Review notes (both stores, important):** the washer app is invite-only. Give the reviewers a test washer phone and its OTP/PIN, or a demo build, in the review notes; without it they cannot get past sign-in and will reject the app.

## Permissions: what to say

| App | Permission | Reason shown to the user |
|---|---|---|
| Customer | Location (while using) | Puts the pin at your door so the washer can find you; checks the area is served |
| Customer | Photos | Pick a photo of your car for the home screen |
| Customer | Notifications (Android 13+) | Washer on the way, wash done, payment receipts |
| Washer | Camera | Attendance selfie and after-wash photos |
| Washer | Location (while using) | Customers see you on your way; route distances |
| Washer | Photos | Pick a photo when the camera cannot be used |
| Washer | Notifications, exact alarms | New extra job alerts, round reminders |

Background location and microphone are blocked in the Android manifest and are not used.

## Privacy answers (data safety / App Privacy)

| Data | Customer | Washer | Linked to user | Purpose |
|---|---|---|---|---|
| Phone number | yes | yes | yes | Sign-in (OTP / WhatsApp code), contact |
| Name | yes | yes | yes | Account, booking |
| Address and precise location | yes | yes | yes | Service, navigation |
| Photos | car photo (optional) | attendance selfie, wash photos | yes | Service proof, attendance check |
| Payment | handled by Cashfree / Razorpay: the app never sees card numbers | n/a | n/a | Payment |
| Purchase history | yes | earnings | yes | Billing |
| Device ID / push token | yes | yes | yes | Notifications |
| Tracking across other apps | **no** | **no** | | |

Encryption: standard HTTPS only. `ITSAppUsesNonExemptEncryption = false` is set in both apps, so App Store Connect will not ask each upload.
Data is deleted on request (see the account-deletion URL above).

## Screenshots to take (6.7" iPhone and a 6.5" size, plus Play phone)

Customer: 1 Home (hero + services) 2 Service area banner / Notify me 3 Schedule a wash 4 Live wash tracking 5 Photo proof 6 Plans.
Washer (use the demo build, Chotte 9000000001, OTP 1234): 1 Round tab with the current car 2 Route list grouped by society 3 Hazri tab 4 Money tab 5 Extra job card with Accept / Deny.

## Before you submit

1. `GoogleService-Info.plist` and `google-services.json` in each app's `firebase/` folder; no `EXPO_PUBLIC_DEMO`.
2. Real bundle ids (above); version and build number bumped.
3. iOS: Distribution certificate and profile, Push Notifications capability on (the washer needs it for job alerts), archive and upload.
4. Android: signed AAB, upload key kept safe; target API per the current Play requirement.
5. Publish the Firestore rules (`firebase-rules/firestore.rules-merged-2026-11-23b.txt`) and import n8n workflows 13, 15, 16 first.
6. Washer app: provide the reviewers a working test login (see Review notes).
