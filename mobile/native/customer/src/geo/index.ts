// Location + Google Maps web services for the address map: GPS (expo-location), reverse geocoding (Geocoding API) and
// place search (Places API New autocomplete). The key is NOT in the source: app.config.ts reads GOOGLE_MAPS_API_KEY at
// build time and exposes it as expo.extra.googleMapsKey. Without it hasKey is false and the app shows "Map unavailable".
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const X = (Constants.expoConfig?.extra || {}) as { googleMapsKey?: string; androidPackage?: string; androidCert?: string; iosBundle?: string };
export const KEY = (X.googleMapsKey || '').trim();
export const hasKey = KEY.length > 10;

/** a restricted Android key only works when the request names the app: package + release SHA-1 (no spaces/colons issues: Google wants the hex with or without colons) */
function keyHeaders(): Record<string, string> {
  if (Platform.OS === 'android' && X.androidPackage) return { 'X-Android-Package': X.androidPackage, ...(X.androidCert ? { 'X-Android-Cert': X.androidCert.replace(/:/g, '') } : {}) };
  if (Platform.OS === 'ios' && X.iosBundle) return { 'X-Ios-Bundle-Identifier': X.iosBundle };
  return {};
}

const timeout = (ms: number) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) } };
async function getJson(url: string, init: RequestInit & { headers?: Record<string, string> } = {}, ms = 8000) {
  const t = timeout(ms);
  try {
    const r = await fetch(url, { ...init, signal: t.signal, headers: { ...keyHeaders(), ...(init.headers || {}) } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { t.done() }
}

/* ---------------------------------------------------------------- GPS */
export type LL = { lat: number; lng: number };
export type Fix = LL & { source: 'gps' | 'fallback'; reason?: 'denied' | 'off' | 'error' };

/**
 * Real position. `prompt` shows our own friendly explainer first, then the system permission dialog, but only when the
 * user acted (Current location button, opening the map). Silent callers never ask. If permission is refused or GPS is off,
 * resolves to `fallback` (the area centre) with source 'fallback' so the screen can say so.
 */
export async function getPosition(fallback: LL, opts: { prompt?: boolean } = {}): Promise<Fix> {
  try {
    let p = await Location.getForegroundPermissionsAsync();
    if (!p.granted && opts.prompt && p.canAskAgain) {
      if (Platform.OS !== 'web') {
        const ok = await new Promise<boolean>(res => Alert.alert('Use your location?', 'We use your location only while you are on this screen, to put the pin at your door so our washer finds you quickly.',
          [{ text: 'Not now', style: 'cancel', onPress: () => res(false) }, { text: 'Continue', onPress: () => res(true) }], { cancelable: true, onDismiss: () => res(false) }));
        if (!ok) return { ...fallback, source: 'fallback', reason: 'denied' };
      }
      p = await Location.requestForegroundPermissionsAsync();
    }
    if (!p.granted) return { ...fallback, source: 'fallback', reason: 'denied' };
    if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) return { ...fallback, source: 'fallback', reason: 'off' };
    const last = Platform.OS === 'web' ? null : await Location.getLastKnownPositionAsync({ maxAge: 30000, requiredAccuracy: 200 }).catch(() => null);
    const pos = last || await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
    ]);
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' };
  } catch { return { ...fallback, source: 'fallback', reason: 'error' } }
}

/* ---------------------------------------------------------------- Geocoding */
export type Place = { title: string; sub: string };
const SHORT_TYPES = ['point_of_interest', 'premise', 'establishment', 'street_number', 'subpremise', 'route', 'neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality'];

/** short name for the tooltip ("3", "Echoes") + the full address for the card; null when the service is unavailable */
export async function reverseGeocode(lat: number, lng: number): Promise<Place | null> {
  if (!hasKey) return null;
  try {
    const j = await getJson(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat.toFixed(6)},${lng.toFixed(6)}&language=en&region=in&key=${KEY}`);
    if (j.status !== 'OK' || !j.results?.length) return null;
    const rs: any[] = j.results, best = rs.find(r => !(r.types || []).includes('plus_code') && !/^[A-Z0-9]{4}\+[A-Z0-9]{2,}/.test(r.formatted_address || '')) || rs[0];
    const comps: any[] = best.address_components || [];
    let title = '';
    for (const t of SHORT_TYPES) { const c = comps.find(x => (x.types || []).includes(t)); if (c) { title = c.short_name; break } }
    const full: string = (best.formatted_address || '').trim();
    return { title: title || full.split(',')[0] || 'Pinned location', sub: full };
  } catch { return null }
}

/* ---------------------------------------------------------------- Places (New) autocomplete */
export type Suggestion = { id: string; main: string; secondary: string };
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16) });

/** One token per search, reused for every keystroke and the final details call, then renewed (Google bills a session once). */
let token = uuid();
export const newSession = () => { token = uuid() };

export async function autocomplete(input: string, near?: LL, signal?: AbortSignal): Promise<Suggestion[]> {
  if (!hasKey || input.trim().length < 2) return [];
  try {
    const body: any = { input: input.trim(), sessionToken: token, languageCode: 'en', regionCode: 'IN' };
    if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 40000 } };
    const t = timeout(8000); signal?.addEventListener('abort', () => t.done());
    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', { method: 'POST', signal: signal || t.signal, body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, ...keyHeaders() } });
    t.done(); if (!r.ok) return [];
    const j = await r.json();
    return (j.suggestions || []).map((s: any) => s.placePrediction).filter(Boolean).slice(0, 5).map((p: any) => ({
      id: p.placeId, main: p.structuredFormat?.mainText?.text || p.text?.text || '', secondary: p.structuredFormat?.secondaryText?.text || '' }));
  } catch { return [] }
}

/** coordinates of a chosen suggestion; closes the billing session */
export async function placeLocation(id: string): Promise<(LL & { name: string; address: string }) | null> {
  try {
    const j = await getJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?sessionToken=${token}&languageCode=en`,
      { headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'location,displayName,formattedAddress' } });
    newSession();
    if (!j.location) return null;
    return { lat: j.location.latitude, lng: j.location.longitude, name: j.displayName?.text || '', address: j.formattedAddress || '' };
  } catch { newSession(); return null }
}
