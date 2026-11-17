// The societies / areas the washer serves, as map points. Coordinates come from (in order): lat/lng or a Maps link on
// the car, the shared area table in data.ts, a lazy expo-location geocode of the area text (cached on the phone),
// else a spot near the washer's home area (marked approximate). Read-only: nothing here touches the store.
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AREA_LL, type Car } from './data';
import { me, route } from '../state/store';

export type Place = { id: string; label: string; lat: number; lng: number; approx: boolean; cars: { plate: string; model: string }[] };
export type LatLng = { lat: number; lng: number };

const CENTER: LatLng = { lat: 28.6695, lng: 77.0985 };   // Paschim Vihar
const KEY = 'wd.geo.v1';
const geo: Record<string, LatLng | null> = {};
let loaded = false;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

async function loadGeo() {
  if (loaded) return; loaded = true;
  try { Object.assign(geo, JSON.parse((await AsyncStorage.getItem(KEY)) || '{}')) } catch { /* no cache is fine */ }
}
const saveGeo = () => { AsyncStorage.setItem(KEY, JSON.stringify(geo)).catch(() => {}) };

/** "House 212" says nothing about the society: those cars belong to the washer's home area. */
export function societyOf(car: Car): string {
  const h = (car.house || '').trim();
  const home = me().areas.split(' · ')[0].trim();
  if (!h || /^(house|flat|h\.?\s?no\.?|plot|kothi)\s*[\w/-]*$/i.test(h)) return home;
  return h.split(',')[0].trim() || home;
}
function tableLL(label: string): LatLng | null {
  const l = norm(label);
  for (const [k, [lng, lat]] of Object.entries(AREA_LL)) {
    const kk = norm(k);
    if (kk.startsWith(l) || l.startsWith(kk.slice(0, 10)) || l.startsWith(kk)) return { lat, lng };
  }
  return null;
}
function carLL(car: Car): LatLng | null {
  const c = car as unknown as Record<string, unknown>;
  const lat = Number(c.lat), lng = Number(c.lng);
  if (c.lat != null && c.lng != null && isFinite(lat) && isFinite(lng) && (lat || lng)) return { lat, lng };
  const txt = [c.map, c.maps, c.note, c.address].filter((x) => typeof x === 'string').join(' ');
  const m = /(?:[?&]q=|@|destination=)(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(txt);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

/** The groups of cars by society, with coordinates (geocoded lazily; approximate ones are flagged). */
export function usePlaces(): Place[] {
  const cars = route();
  const sig = cars.map((c) => c.reg + '|' + societyOf(c)).join(',');
  const [, bump] = useState(0);
  const groups = useMemo(() => {
    const g = new Map<string, { label: string; cars: Car[] }>();
    cars.forEach((c) => { const label = societyOf(c), k = norm(label); const e = g.get(k) || { label, cars: [] }; e.cars.push(c); g.set(k, e) });
    return [...g.entries()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  useEffect(() => {
    let on = true;
    (async () => {
      await loadGeo();
      for (const [k, g] of groups) {
        if (!on) return;
        if (g.cars.some(carLL) || tableLL(g.label) || k in geo) continue;
        try {
          const r = await Location.geocodeAsync(`${g.label}, Paschim Vihar, Delhi`);
          geo[k] = r[0] ? { lat: r[0].latitude, lng: r[0].longitude } : null;
        } catch { geo[k] = null }   // web has no geocoder: the approximate spot is used
        saveGeo(); if (on) bump((n) => n + 1);
      }
    })();
    return () => { on = false };
  }, [groups]);
  return groups.map(([k, g], i) => {
    const exact = g.cars.map(carLL).find(Boolean) || tableLL(g.label) || geo[k] || null;
    const a = (i * 2.399) % (Math.PI * 2), r = 0.0035 + 0.0012 * (i % 3);
    const ll = exact || { lat: CENTER.lat + Math.sin(a) * r, lng: CENTER.lng + Math.cos(a) * r * 1.1 };
    return { id: k, label: g.label, lat: ll.lat, lng: ll.lng, approx: !exact, cars: g.cars.map((c) => ({ plate: c.plate, model: c.model })) };
  });
}

/** The washer's own position, only if the phone already allows it; `ask()` asks once (a button on the map screen). */
export function useMyPos(): { pos: LatLng | null; ask: () => void } {
  const [pos, setPos] = useState<LatLng | null>(null);
  const get = async (prompt: boolean) => {
    try {
      let p = await Location.getForegroundPermissionsAsync();
      if (p.status !== 'granted' && prompt) p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') return;
      const l = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (l) setPos({ lat: l.coords.latitude, lng: l.coords.longitude });
    } catch { /* no position: the map simply has no mint pin */ }
  };
  useEffect(() => { void get(false) }, []);
  return { pos, ask: () => { void get(true) } };
}
