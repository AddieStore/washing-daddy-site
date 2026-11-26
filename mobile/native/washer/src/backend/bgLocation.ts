// Background location while a round is active (contract: locations/{round} also written in the background).
//
// NOT ENABLED: this needs `expo-task-manager`, which is not in package.json (expo-location is). Not added silently.
// To turn on:
//   1. npx expo install expo-task-manager
//   2. app.config.ts: expo-location plugin -> isAndroidBackgroundLocationEnabled: true, isAndroidForegroundServiceEnabled: true,
//      and locationAlwaysAndWhenInUsePermission text (iOS); Play needs a background-location declaration + video.
//   3. Replace the body below with the commented code and call startBgLocation(roundId) from act.startRound and
//      stopBgLocation() when the round ends and on logout. Task definition must run at module load (import this file in _layout).
//
//   import * as TaskManager from 'expo-task-manager'; import * as Location from 'expo-location';
//   const TASK = 'wd-round-location';
//   TaskManager.defineTask(TASK, async ({ data, error }: any) => {
//     if (error || !data?.locations?.length) return;
//     const p = data.locations[data.locations.length - 1].coords;
//     await writeLoc(roundId, { lat: p.latitude, lng: p.longitude, accuracy: p.accuracy });   // db.doc('locations/'+round).set(...)
//   });
//   start: await Location.requestBackgroundPermissionsAsync();
//          await Location.startLocationUpdatesAsync(TASK, { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 25,
//            foregroundService: { notificationTitle: 'WD round chal raha hai', notificationBody: 'Customer ko aapki location dikh rahi hai' } });
//   stop:  await Location.stopLocationUpdatesAsync(TASK);
export const BG_LOCATION_ENABLED = false;
export async function startBgLocation(_roundId: string): Promise<void> { /* needs expo-task-manager, see above */ }
export async function stopBgLocation(): Promise<void> { /* see above */ }
