// Where we wash today: circles (centre + radius in metres). Shown on the address map as soft violet zones, used by the Home
// "not in your area yet" banner and by the booking/payment guard in state.ts (nobody can book or pay outside them).
//
// LIVE: the admin dashboard (washingdaddy.com/admin/app -> Settings -> Service areas) draws the circles on a map and saves them to
// appcfg/customer.areas = [{ id, name, lat, lng, r }]. data/config.ts calls setAreas() on every change, so the app follows the
// dashboard with no update. The built-in list below is only used until the first config arrives (or if none was ever saved).
// Workflow 13 (wd-booking-create) checks the booking address against the same list on the server.

export type ServiceArea = { id: string; name: string; lat: number; lng: number; r: number };

export const DEFAULT_AREAS: ServiceArea[] = [
  { id: 'paschim-vihar', name: 'Paschim Vihar', lat: 28.6692, lng: 77.1006, r: 1300 },
];
/** the live list; changed IN PLACE so every reader (maps, banner, guard) sees the dashboard's circles */
export const SERVICE_AREAS: ServiceArea[] = DEFAULT_AREAS.map(a => ({ ...a }));

/** metres between two points (haversine). Kept here, not imported from state.ts, so config.ts can use this file without a cycle. */
export function metres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, r = Math.PI / 180, dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** a dashboard list -> clean circles (inside India, 100 m to 30 km). Nothing usable -> the built-in list. */
export function normAreas(v: unknown): ServiceArea[] {
  const out: ServiceArea[] = [];
  (Array.isArray(v) ? v : []).forEach((x: any, i: number) => {
    if (!x || typeof x !== 'object' || x.paused === true) return;
    const lat = +x.lat, lng = +x.lng, r = +x.r;
    if (!(lat > 6 && lat < 37 && lng > 68 && lng < 98 && r >= 100 && r <= 30000)) return;
    out.push({ id: String(x.id || 'area-' + i).slice(0, 40), name: String(x.name || 'Service area').slice(0, 60), lat, lng, r: Math.round(r) });
  });
  return out.length ? out : DEFAULT_AREAS.map(a => ({ ...a }));
}
export function setAreas(v: unknown) { const n = normAreas(v); SERVICE_AREAS.splice(0, SERVICE_AREAS.length, ...n) }

/** the zone the point falls in, or null when we do not wash there yet */
export function areaAt(lat: number, lng: number): ServiceArea | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const a of SERVICE_AREAS) if (metres(lat, lng, a.lat, a.lng) <= a.r) return a;
  return null;
}
