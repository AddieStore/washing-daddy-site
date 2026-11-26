# Parking alerts ("Parked somewhere new?") — contract, 2026-11-26

Branch: `claude/project-thread-791cb6` (customer app, mobile/native/customer). Research: RESEARCH.md in this folder.

## Flow
1. Customer opens Profile > Parking alerts. Per car: pick the car's Bluetooth (stereo / Android Auto head unit) from
   paired devices, confirm the usual parking spot (defaults to Home address; "My car is there now" uses GPS).
2. Permissions in order: Nearby devices (BLUETOOTH_CONNECT), location, then an in-app disclosure, then
   "Allow all the time" (background location), then notifications.
3. Phone disconnects from that car's Bluetooth -> native receiver (modules/wd-park) takes ONE fix.
   - Within 150 m of the usual spot: no alert; any "until I'm back" spot for that car is ended.
   - Farther: 21:00-05:00 IST -> notification now. Daytime -> alarm at 21:00, notify only if no newer park.
4. Tap notification -> app opens `washingdaddy://park?id=<parkId>` -> sheet "Parked somewhere new?":
   map pin, how long (Tomorrow only / 2 days / 3 days / A week / Until it's back), note for washer
   (label on top), buttons "Add this spot", "Not now", link "This is my usual spot now".
5. "Add this spot" writes requests/{id} kind 'spot'. WD Partner shows it on that car for those wash days.
6. Home: banner on the car card while a spot is active, with "Back at usual spot" (ends it).

## Firestore: requests/{autoId}, kind 'spot'
{reg, kind:'spot', text (<=300, washer note), lat, lng, acc (m), parked_at ISO+05:30, from YYYY-MM-DD, to YYYY-MM-DD,
 until_back bool, created_at, status 'open'}. Customer may later set status 'cancelled' + ended_at. Washer: open->seen.
First wash day = park before 05:00 IST -> that morning, else next morning. Max 14 days.

## JS API (src/park/index.ts) for screens
useParkView() -> {settings, pending, health}; enable(on); grant('bt'|'location'|'background'|'notifications');
devices(); link(carId, device|null); setHome(carId, home|null); homeChoices(); useHereAsHome(carId);
carSetting(carId); ready(); show(park); dismiss(); addSpot(park, len, note); endSpot(car); makeUsual(park);
spotFor(car) -> Spot|null; simulate(carId, away) (preview/test); distText, spanText, dayText, spotDates.
Sheet: the sheet file calls onShowPark(p => openSheet(<ParkSpotSheet park={p}/>)) once at import. Page: openPage({k:'parkAlerts'}).

## iPhone
No public API tells a closed iOS app that car Bluetooth/CarPlay disconnected. Off on iPhone for now; options later:
a Shortcuts "CarPlay disconnects" automation that opens washingdaddy://park-here, or CLVisit monitoring.
