// Where we wash today. Shown on the address map as soft violet zones; a pin outside every zone gets a gentle
// "not in this area yet" note. Edit this list as new societies go live (lat/lng = zone centre, r = radius in metres).
import { distance } from '../state';

export type ServiceArea = { id: string; name: string; lat: number; lng: number; r: number };

export const SERVICE_AREAS: ServiceArea[] = [
  { id: 'paschim-vihar', name: 'Paschim Vihar', lat: 28.6692, lng: 77.1006, r: 1300 },
];

/** the zone the point falls in, or null when we do not wash there yet */
export function areaAt(lat: number, lng: number): ServiceArea | null {
  for (const a of SERVICE_AREAS) if (distance(lat, lng, a.lat, a.lng) <= a.r) return a;
  return null;
}
