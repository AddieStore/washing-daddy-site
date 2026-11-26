/* Parking alerts ("parked somewhere new?"). Contract: /mnt/project-files/park-alerts-2026-11-26/CONTRACT.md.

   How it works on Android:
   - The customer links each car to the car's Bluetooth (the car stereo / Android Auto head unit) and confirms the car's
     usual parking spot. Settings are saved here and handed to the native module (modules/wd-park).
   - When the phone disconnects from that Bluetooth device, the native receiver takes ONE location fix. Near the usual
     spot: nothing to ask (and any "until I'm back" spot is ended). Away from it: a notification asks the customer,
     at once at night (21:00 to 05:00), or at 21:00 if the car is still there (a daytime office park that moves on is
     never asked about). No tracking between parks.
   - Tapping the notification opens the app on the "Parked somewhere new?" sheet. "Add this spot" writes
     requests/{id} kind 'spot' that WD Partner shows on the car for those wash days.
   iOS cannot see car Bluetooth or CarPlay in the background, so on iPhone the feature is off for now (see CONTRACT.md).
   In the preview (web) and the test login, simulate() fakes a park so every screen can be seen. */
import { useSyncExternalStore } from 'react';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import * as Location from 'expo-location';
import { WdPark } from '../../modules/wd-park/src';
import { TODAY, addDays, iso, parse, fmt, nowIST } from '../data/dates';
import { regOf, type Car } from '../data/model';
import { A, addresses, realAcct, spotDocs, sendSpot, endSpots, type SpotDoc, type Address } from '../state';

/* ---------------------------------------------------------------- types */
export type Perm = 'granted' | 'denied' | 'ask';
export type ParkDevice = { address: string; name: string };
export type Home = { lat: number; lng: number; label: string };
export type ParkCar = { carId: string; reg: string; name: string; device: ParkDevice | null; home: Home | null };
export type ParkSettings = { enabled: boolean; radiusM: number; cars: ParkCar[] };
/** one park the phone noticed. at = epoch ms. away = farther than radiusM from the usual spot (null home = away) */
export type Park = { id: string; carId: string; reg: string; lat: number; lng: number; acc: number; at: number; away: boolean; distM: number | null };
export type ParkHealth = { platform: 'android' | 'ios' | 'web'; supported: boolean; bt: Perm; location: Perm; background: Perm; notifications: Perm };
/** a spot the washer is using now or on a coming wash day */
export type Spot = { ids: string[]; lat: number; lng: number; note: string; from: string; to: string; untilBack: boolean; today: boolean; distM: number | null; label: string };
export type SpotLength = 1 | 2 | 3 | 7 | 'back';

/* ---------------------------------------------------------------- constants */
export const RADIUS_M = 150;            // parks inside this distance of the usual spot count as "usual"
export const NIGHT_FROM = 21 * 60;      // 21:00 IST: an away park still standing now is the overnight park
export const NIGHT_TILL = 5 * 60;       // 05:00 IST: parks before this count for the same morning's wash
export const MAX_DAYS = 14;             // a spot can last at most this many wash days (until_back renews on use)
const KEY = 'wd-park';
const IS_ANDROID = Platform.OS === 'android';
const NATIVE = IS_ANDROID && !!WdPark;

/* ---------------------------------------------------------------- store */
type Store = { settings: ParkSettings; pending: Park | null; health: ParkHealth; seen: string[] };
let st: Store = {
  settings: { enabled: false, radiusM: RADIUS_M, cars: [] },
  pending: null,
  health: { platform: IS_ANDROID ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web', supported: NATIVE || Platform.OS === 'web', bt: 'ask', location: 'ask', background: 'ask', notifications: 'ask' },
  seen: [],
};
const subs = new Set<() => void>();
const emit = () => { st = { ...st }; subs.forEach(f => f()) };
const save = () => { AsyncStorage.setItem(KEY, JSON.stringify({ settings: st.settings, seen: st.seen.slice(-40) })).catch(() => {}) };
export function useParkView() { return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => st, () => st) }
export const parkSettings = () => st.settings;
export const parkHealth = () => st.health;
export const pendingPark = () => st.pending;
export const isDemo = () => !NATIVE || !realAcct();

/* ---------------------------------------------------------------- geometry and dates */
export function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export const distText = (m: number | null) => (m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);
const istParts = (ms: number) => { const d = new Date(ms + 5.5 * 3600e3); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() } };
/** the first wash morning a park at `at` affects: before 05:00 IST = that morning, else the next morning */
export function washDateFor(at: number): string {
  const p = istParts(at);
  return p.min < NIGHT_TILL ? p.date : iso(addDays(parse(p.date), 1));
}
export function spotDates(at: number, len: SpotLength) {
  const from = washDateFor(at), n = len === 'back' ? MAX_DAYS : len;
  return { from, to: iso(addDays(parse(from), n - 1)), untilBack: len === 'back' };
}
export const dayText = (d: string) => (d === iso(TODAY) ? 'today' : d === iso(addDays(TODAY, 1)) ? 'tomorrow' : fmt(d, { weekday: 'short', day: 'numeric', month: 'short' }));
export function spanText(from: string, to: string, untilBack = false) {
  if (untilBack) return `From ${dayText(from)} until the car is back at its usual spot`;
  return from === to ? `For ${dayText(from)}'s wash` : `${fmt(from, { day: 'numeric', month: 'short' })} to ${fmt(to, { day: 'numeric', month: 'short' })}`;
}

/* ---------------------------------------------------------------- settings */
/** keeps one row per car in the account, defaulting the usual spot to the Home address (or the first saved one) */
function reconcile() {
  if (!st.settings) return;
  let acct; try { acct = A() } catch { return }
  if (!acct || !acct.cars) return;
  const addr = addresses(), homeAddr: Address | undefined = addr.find(a => a.label === 'Home') || addr[0];
  const cars: ParkCar[] = acct.cars.map((c: Car) => {
    const old = st.settings.cars.find(x => x.carId === c.id);
    const home = old?.home || (homeAddr && Number.isFinite(homeAddr.lat) ? { lat: homeAddr.lat, lng: homeAddr.lng, label: homeAddr.label === 'Other' && homeAddr.other ? homeAddr.other : homeAddr.label } : null);
    return { carId: c.id, reg: regOf(c), name: c.name, device: old?.device || null, home };
  });
  if (JSON.stringify(cars) !== JSON.stringify(st.settings.cars)) { st.settings = { ...st.settings, cars }; save() }
}
function pushNative() {
  if (!NATIVE) return;
  const s = st.settings;
  try {
    WdPark!.configure(JSON.stringify({
      enabled: s.enabled, radiusM: s.radiusM, nightFromMin: NIGHT_FROM, nightTillMin: NIGHT_TILL,
      cars: s.cars.filter(c => c.device).map(c => ({ carId: c.carId, reg: c.reg, name: c.name, device: c.device!.address, homeLat: c.home?.lat ?? null, homeLng: c.home?.lng ?? null })),
      // regs whose "until I'm back" spots the phone may end by itself when the car parks at its usual spot again
      untilBack: s.cars.filter(c => activeSpotDocs(c.carId).some(r => r.until_back)).map(c => c.reg),
    }));
  } catch (e) { console.warn('park configure', e) }
}
function setSettings(patch: Partial<ParkSettings>) { st.settings = { ...st.settings, ...patch }; save(); pushNative(); emit() }
function setCar(carId: string, patch: Partial<ParkCar>) {
  reconcile();
  setSettings({ cars: st.settings.cars.map(c => (c.carId === carId ? { ...c, ...patch } : c)) });
}
export const carSetting = (carId: string) => { reconcile(); return st.settings.cars.find(c => c.carId === carId) || null };
/** the feature can actually fire: on, at least one linked car with a usual spot, and every permission granted */
export function ready() {
  const h = st.health, s = st.settings;
  return s.enabled && s.cars.some(c => c.device && c.home) && h.bt === 'granted' && h.location === 'granted' && h.background === 'granted' && h.notifications !== 'denied';
}

/* ---------------------------------------------------------------- permissions */
const AP = ((PermissionsAndroid as any)?.PERMISSIONS || {}) as any;   // undefined on web
const BT = AP.BLUETOOTH_CONNECT || 'android.permission.BLUETOOTH_CONNECT';
const NOTIF = AP.POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS';
const sdk = () => (IS_ANDROID ? Number(Platform.Version) || 0 : 0);
const toPerm = (granted: boolean, canAsk: boolean): Perm => (granted ? 'granted' : canAsk ? 'ask' : 'denied');

export async function refreshHealth(): Promise<ParkHealth> {
  const h = { ...st.health };
  if (!NATIVE) { emit(); return h }   // preview: the demo keeps whatever the customer tapped
  try { h.bt = sdk() < 31 ? 'granted' : (await PermissionsAndroid.check(BT)) ? 'granted' : h.bt === 'denied' ? 'denied' : 'ask' } catch {}
  try { const f = await Location.getForegroundPermissionsAsync(); h.location = toPerm(f.granted, f.canAskAgain) } catch {}
  try { const b = await Location.getBackgroundPermissionsAsync(); h.background = toPerm(b.granted, b.canAskAgain) } catch {}
  try { h.notifications = sdk() < 33 ? 'granted' : (await PermissionsAndroid.check(NOTIF)) ? 'granted' : h.notifications === 'denied' ? 'denied' : 'ask' } catch {}
  st.health = h; emit(); return h;
}
/** asks for one permission. 'background' must only be called after the in-app disclosure (Play policy): the UI shows
 *  the disclosure, then calls this. When Android will not show the dialog any more, opens the app's settings page. */
export async function grant(kind: 'bt' | 'location' | 'background' | 'notifications'): Promise<Perm> {
  if (!NATIVE) { st.health = { ...st.health, [kind]: 'granted' }; emit(); return 'granted' }
  const cur = st.health[kind];
  if (cur === 'denied') { Linking.openSettings().catch(() => {}); return cur }
  let r: Perm = cur;
  try {
    if (kind === 'bt') r = sdk() < 31 ? 'granted' : mapAndroid(await PermissionsAndroid.request(BT));
    else if (kind === 'notifications') r = sdk() < 33 ? 'granted' : mapAndroid(await PermissionsAndroid.request(NOTIF));
    else if (kind === 'location') { const f = await Location.requestForegroundPermissionsAsync(); r = toPerm(f.granted, f.canAskAgain) }
    else {
      if (st.health.location !== 'granted') { const f = await Location.requestForegroundPermissionsAsync(); if (!f.granted) { st.health = { ...st.health, location: toPerm(false, f.canAskAgain) }; emit(); return 'ask' } }
      // Android 11+ sends the customer to Settings > Location > "Allow all the time"; the result comes back on return
      const b = await Location.requestBackgroundPermissionsAsync(); r = toPerm(b.granted, b.canAskAgain);
    }
  } catch (e) { console.warn('park grant', kind, e) }
  st.health = { ...st.health, [kind]: r }; emit(); pushNative();
  return r;
}
const mapAndroid = (v: string): Perm => (v === 'granted' ? 'granted' : v === 'never_ask_again' ? 'denied' : 'ask');
export const openAppSettings = () => { if (NATIVE) { try { WdPark!.openBatterySettings() } catch { Linking.openSettings() } } else Linking.openSettings().catch(() => {}) };

/* ---------------------------------------------------------------- linking cars and usual spots */
const DEMO_DEVICES: ParkDevice[] = [
  { address: '00:1A:7D:DA:71:13', name: 'Mahindra Scorpio N' }, { address: '00:1A:7D:DA:71:14', name: 'Honda Civic' },
  { address: 'F4:4E:FD:12:9A:30', name: 'Car Multimedia' }, { address: '5C:FB:7C:22:10:8B', name: 'boAt Airdopes 141' },
];
/** Bluetooth devices this phone is paired with, cars first (best guess by name) */
export async function devices(): Promise<ParkDevice[]> {
  let list: ParkDevice[] = DEMO_DEVICES;
  if (NATIVE) { try { list = JSON.parse(await WdPark!.bondedDevices()) } catch (e) { console.warn('bonded', e); list = [] } }
  const carish = (d: ParkDevice) => /car|auto|kit|stereo|media|hyundai|maruti|suzuki|tata|mahindra|kia|honda|toyota|skoda|vw|volkswagen|mg |renault|nissan|ford|jeep|bmw|audi|mercedes|uconnect|sync|carplay|android auto/i.test(d.name) ? 0 : 1;
  return [...list].sort((a, b) => carish(a) - carish(b) || a.name.localeCompare(b.name));
}
export function link(carId: string, device: ParkDevice | null) { setCar(carId, { device }) }
export function setHome(carId: string, home: Home | null) { setCar(carId, { home }) }
/** saved addresses the customer can pick as the usual spot */
export const homeChoices = (): Home[] => addresses().filter(a => Number.isFinite(a.lat)).map(a => ({ lat: a.lat, lng: a.lng, label: a.label === 'Other' && a.other ? a.other : a.label }));
/** "my car is at its usual spot right now": uses the phone's current position */
export async function useHereAsHome(carId: string): Promise<Home> {
  let lat = 28.4595, lng = 77.0266;   // demo: Gurugram
  if (NATIVE || Platform.OS !== 'web') {
    const f = await Location.requestForegroundPermissionsAsync();
    if (!f.granted) throw new Error('Allow location to use where you are now.');
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    lat = p.coords.latitude; lng = p.coords.longitude;
  }
  const home = { lat, lng, label: 'Where I park' };
  setHome(carId, home); return home;
}
export function enable(on: boolean) { reconcile(); setSettings({ enabled: on }) }

/* ---------------------------------------------------------------- parks, the sheet and the washer's spot */
const carOf = (carId: string) => { try { return A().cars.find(c => c.id === carId) || null } catch { return null } };
function activeSpotDocs(carId: string): SpotDoc[] {
  const c = carOf(carId); if (!c) return [];
  const today = iso(TODAY);
  return spotDocs(c).filter(r => r.status !== 'cancelled' && r.status !== 'done' && r.to >= today);
}
/** the spot the washer uses for this car now or on the next wash day, or null */
export function spotFor(c: Car): Spot | null {
  const list = activeSpotDocs(c.id).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const r = list[0]; if (!r) return null;
  const home = carSetting(c.id)?.home || null, today = iso(TODAY);
  return { ids: list.map(x => x.id), lat: r.lat, lng: r.lng, note: r.text || '', from: r.from, to: r.to, untilBack: !!r.until_back,
    today: r.from <= today, distM: home ? distM(home, r) : null, label: spanText(r.from, r.to, !!r.until_back) };
}
/** opens the sheet for a park (from the notification tap, or from the in-app card) */
let opener: ((p: Park) => void) | null = null;
/** the sheet module registers how to open the "Parked somewhere new?" sheet (keeps this file free of UI imports) */
export function onShowPark(f: (p: Park) => void) { opener = f }
export function show(p: Park) { st.pending = p; emit(); if (opener) opener(p) }
export function dismiss(p: Park | null = st.pending) {
  if (p) { st.seen = [...st.seen, p.id]; save(); if (NATIVE) try { WdPark!.clearPark(p.id) } catch {} }
  st.pending = null; emit();
}
/** "Add this spot": the washer sees it for those wash days */
export async function addSpot(p: Park, len: SpotLength, note: string) {
  const c = carOf(p.carId); if (!c) throw new Error('That car is no longer on your account.');
  const d = spotDates(p.at, len);
  // a new spot replaces any older one for the same car
  const old = activeSpotDocs(c.id).map(r => r.id);
  await sendSpot(c, { lat: p.lat, lng: p.lng, acc: p.acc, text: note, parked_at: new Date(p.at + 5.5 * 3600e3).toISOString().replace(/\.\d+Z$/, '+05:30'), from: d.from, to: d.to, until_back: d.untilBack });
  if (old.length) await endSpots(c, old);
  dismiss(p); pushNative();
}
/** "Back at the usual spot" / "Remove": the washer goes back to the usual spot */
export async function endSpot(c: Car) { await endSpots(c, activeSpotDocs(c.id).map(r => r.id)); pushNative(); emit() }
/** "This is my usual spot now": moves the usual spot here and asks nothing */
export function makeUsual(p: Park) { setHome(p.carId, { lat: p.lat, lng: p.lng, label: 'Where I park' }); dismiss(p) }

/** preview and test login: pretend the car was just parked (away = 1.2 km from home) and open the sheet */
export function simulate(carId: string, away = true) {
  reconcile();
  const c = st.settings.cars.find(x => x.carId === carId) || st.settings.cars[0]; if (!c) return;
  const home = c.home || { lat: 28.4595, lng: 77.0266, label: 'Home' };
  const lat = home.lat + (away ? 0.0085 : 0.0002), lng = home.lng + (away ? 0.0062 : 0.0001);
  const p: Park = { id: 'sim' + Date.now().toString(36), carId: c.carId, reg: c.reg, lat, lng, acc: 12, at: Date.now(), away, distM: distM(home, { lat, lng }) };
  if (away) show(p);
}

/* ---------------------------------------------------------------- native events and deep links */
async function takeNative() {
  if (!NATIVE) return;
  try {
    const list: Park[] = JSON.parse(await WdPark!.pendingParks());
    // back at the usual spot: end "until I'm back" spots the phone could not end itself (offline, signed out)
    for (const p of list.filter(x => !x.away)) { const c = carOf(p.carId); if (c) { const ids = activeSpotDocs(c.id).filter(r => r.until_back).map(r => r.id); if (ids.length) await endSpots(c, ids) } try { WdPark!.clearPark(p.id) } catch {} }
  } catch (e) { console.warn('park pending', e) }
}
async function fromUrl(url: string | null) {
  if (!url) return;
  try {
    const u = ExpoLinking.parse(url);
    if (!(u.hostname === 'park' || /(^|\/)park\/?$/.test(u.path || ''))) return;
    const id = String((u.queryParams || {}).id || ''); if (!id || st.seen.includes(id)) return;
    const p: Park | null = NATIVE ? JSON.parse((await WdPark!.getPark(id)) || 'null') : null;
    if (p && p.away) show(p);
  } catch (e) { console.warn('park link', e) }
}
let started = false;
/** called once after the account is loaded (App boot) and again whenever the app comes to the front */
export async function startPark() {
  if (!started) {
    started = true;
    try { const v = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null'); if (v?.settings) st.settings = { ...st.settings, ...v.settings }; if (Array.isArray(v?.seen)) st.seen = v.seen } catch {}
    try { fromUrl(await ExpoLinking.getInitialURL()); ExpoLinking.addEventListener('url', e => fromUrl(e.url)) } catch {}
  }
  reconcile(); await refreshHealth(); pushNative(); await takeNative();
  // a park the customer was asked about but has not answered yet (notification swiped away): offer it in the app
  if (NATIVE && !st.pending) { try { const p: Park | null = JSON.parse((await WdPark!.lastAsked()) || 'null'); if (p && p.away && !st.seen.includes(p.id) && washDateFor(p.at) >= iso(TODAY)) { st.pending = p; emit() } } catch {} }
}
export const nowStamp = nowIST;
