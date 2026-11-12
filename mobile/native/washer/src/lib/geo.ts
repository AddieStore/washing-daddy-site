// Where the washer is right now, as a short place name for the header ("Sector 62, Noida").
// Module state only (no storage). Never blocks rendering: callers read the state and call refreshLocality().
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Linking, Platform } from 'react-native';

export type GeoStatus = 'idle' | 'loading' | 'ok' | 'denied' | 'error';
export type GeoState = { status: GeoStatus; text: string };

let state: GeoState = { status: 'idle', text: '' };
let last: { text: string; at: number } | null = null;   // last good answer, kept for the session
let inflight: Promise<void> | null = null;
const subs = new Set<() => void>();
const set = (s: GeoState) => { state = s; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const snap = () => state;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** "Sector 62, Noida": the finest local name first, then the city, no repeats. */
export function placeText(a: Record<string, any> | null | undefined): string {
  if (!a) return '';
  const first = [a.district, a.street, a.name].map((x) => (typeof x === 'string' ? x.trim() : '')).find((x) => x && !/^\d+$/.test(x)) || '';
  const city = [a.city, a.subregion, a.region].map((x) => (typeof x === 'string' ? x.trim() : '')).find(Boolean) || '';
  const parts = [first, city].filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) parts.pop();
  const out = parts.join(', ');
  return out.length > 34 ? out.slice(0, 33) + '…' : out;
}

async function webPosition(): Promise<{ latitude: number; longitude: number } | null> {
  const g: any = (globalThis as any).navigator?.geolocation;
  if (!g) return null;
  return new Promise((res, rej) => g.getCurrentPosition((p: any) => res(p.coords), (e: any) => rej(e), { timeout: 7000, maximumAge: 120000 }));
}

async function run(): Promise<void> {
  try {
    const Location = await import('expo-location');
    let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!perm || (perm.status !== 'granted' && perm.canAskAgain !== false)) perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { set({ status: 'denied', text: '' }); return; }
    let pos: { latitude: number; longitude: number } | null = null;
    if (Platform.OS === 'web') pos = await webPosition();
    else {
      const lk = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lk && !last) { try { const a = await Location.reverseGeocodeAsync(lk.coords); const tx = placeText(a[0]); if (tx) { last = { text: tx, at: Date.now() }; set({ status: 'ok', text: tx }); } } catch { /* fresh fix below */ } }
      const cur = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 9000);
      pos = cur.coords;
    }
    if (!pos) throw new Error('no position');
    let tx = '';
    if (Platform.OS !== 'web') {
      const a = await withTimeout(Location.reverseGeocodeAsync({ latitude: pos.latitude, longitude: pos.longitude }), 8000);
      tx = placeText(a[0]);
    }
    if (tx) last = { text: tx, at: Date.now() };
    set({ status: 'ok', text: tx || last?.text || '' });
  } catch {
    if (last) set({ status: 'ok', text: last.text });
    else set({ status: 'error', text: '' });
  }
}

/** Looks the place up again. Safe to call any time; calls made while one is running share it. */
export function refreshLocality(): Promise<void> {
  if (inflight) return inflight;
  if (state.status !== 'ok') set({ status: 'loading', text: last?.text || '' });
  inflight = run().finally(() => { inflight = null; });
  return inflight;
}

export function openLocationSettings() {
  void Linking.openSettings().catch(() => {});
  // on the web there is no settings page: just ask the browser again
  if (Platform.OS === 'web') void refreshLocality();
}

/** Current place state; looks it up once on mount and every time the app comes to the front. */
export function useLocality(): GeoState {
  useEffect(() => {
    void refreshLocality();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refreshLocality(); });
    return () => sub.remove();
  }, []);
  return useSyncExternalStore(subscribe, snap, snap);
}
