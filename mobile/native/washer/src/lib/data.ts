// Reference data and document shapes. Field names follow .notes/sync-contract.md exactly.
import { normReg, isPlan, type PlanId, type TaskKey } from './schedule.ts';

export type CarType = 'suv' | 'mpv' | 'sedan' | 'hatch';
export type Car = {
  plate: string; reg: string; make: string; model: string; label: string; plan: PlanId;
  img?: 'scorpio' | 'civic'; type: CarType; color: string; house: string; spot: string;
  customer: string; phone?: string; keys?: string; fee?: number | null;
  mine?: boolean; pending?: boolean; status?: string;   // cars the washer added himself (newcars/)
};
export type WashStatus = 'scheduled' | 'on_the_way' | 'arrived' | 'washing' | 'done' | 'skipped';
export type Photo = { kind: 'before' | 'after' | 'issue'; asset_id?: string; url?: string; at: string };
export type Wash = {
  date: string; reg: string; car_label: string; washer: { id: string; name: string; photo_url?: string }; washer_id: string;
  status: WashStatus; eta: string;
  on_the_way_at: string | null; arrived_at: string | null; started_at: string | null; finished_at: string | null;
  minutes: number | null; tasks: { key: TaskKey; label: string; done: boolean; done_at: string | null }[];
  photos: Photo[]; water_litres: number | null; washer_note: string | null; skip_reason: string | null;
  customer_note_seen: boolean; seq: number; updated_at: string;
};
export type Req = { id: string; reg: string; kind: string; text: string; spots: string[]; created_at: string; status: string; seen_at?: string; done_at?: string };
export type Job = {
  id: string; washer_id?: string; status?: string; service?: string; price?: number; car?: string; reg?: string;
  area?: string; customer_name?: string; phone?: string; note?: string; lat?: number; lng?: number; date?: string;
  created_at?: string; started_at?: string; finished_at?: string; photo?: string; photo_at?: string;
};
export type WasherDoc = { phone: string; name: string; area?: string; status: 'pending' | 'approved' | 'blocked'; route_id?: string; created_at?: string; decided_at?: string };

export type WasherInfo = { id: string; name: string; phone: string; areas: string; img: 'washer' | null; since: string; lifetime: number; rating: number | string };
export const WASHERS: Record<string, WasherInfo> = {
  chotte: { id: 'chotte', name: 'Chotte', phone: '9000000001', areas: 'GH-9 · GH-6 Paschim Vihar', img: 'washer', since: '2024', lifetime: 4180, rating: 4.9 },
  shahrukh: { id: 'shahrukh', name: 'Shahrukh', phone: '9000000002', areas: 'GH-14 · Meera Bagh · Sundar Vihar', img: null, since: '2025', lifetime: 2240, rating: 4.8 },
};
export const PHONE_TO_WASHER: Record<string, string> = Object.fromEntries(Object.values(WASHERS).map(w => [w.phone, w.id]));

export const OWNER_PHONE = '+917701808924';
export const OWNER_WA = '917701808924';
export const BOOK_URL = 'https://n8n.washingdaddy.com/webhook/wd-washer-cars';
export const SHARE = 0.5;   // half of what a car pays is the washer's

export const STATUS: Record<WashStatus, string> = { scheduled: 'Baaki', on_the_way: 'Raaste mein', arrived: 'Pahunch gaye', washing: 'Wash chal raha', done: 'Ho gaya', skipped: 'Skip' };
export const SKIPS = ['Gaadi nahi mili', 'Baarish', 'Gate band tha', 'Customer ne mana kiya', 'Gaadi nikal chuki thi'];
export const NOTE_CHIPS = ['Bird dropping saaf kar di', 'Tyre mein hawa kam lagi', 'Naya scratch dikha, photo bheji', 'Body cover fold kar diya', 'Andar kuch saman pada tha, chhua nahi'];
export const REQ_KIND: Record<string, string> = { note: 'Customer ka note', rewash: 'Dobara wash chahiye', skip_tomorrow: 'Aaj wash mat karna' };
export const JOIN_AREAS = ['GH-9 Paschim Vihar', 'GH-6 Paschim Vihar', 'GH-14 Paschim Vihar', 'Meera Bagh', 'Sundar Vihar', 'Guru Hari Apartments'];

// where an area sits on the map, same table the customer app draws its map from [lng,lat]
const AREA_LL: Record<string, [number, number]> = {
  'GH-9 Paschim Vihar': [77.0989, 28.6680], 'GH-6 Paschim Vihar': [77.0970, 28.6695], 'GH-14 Paschim Vihar': [77.0982, 28.6705],
  'Meera Bagh': [77.1065, 28.6720], 'Sundar Vihar': [77.1110, 28.6710], 'Guru Hari Apartments': [77.0960, 28.6650],
};

// tel: link for a customer's number. Null when there is no usable number, so no dead button is drawn.
export const telOf = (p?: string | null) => {
  const d = String(p || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? 'tel:+91' + d : null;
};
export const waTo = (text: string) => `https://wa.me/${OWNER_WA}?text=${encodeURIComponent(text)}`;
// Google Maps link for an on-demand job: exact pin if the booking has one, else the area, else the plain address text
export const mapsOf = (j: { lat?: unknown; lng?: unknown; area?: string }) => {
  const lat = Number(j.lat), lng = Number(j.lng);
  if (j.lat != null && j.lng != null && isFinite(lat) && isFinite(lng) && (lat || lng)) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const a = String(j.area || '').trim();
  if (!a) return null;
  const ll = AREA_LL[a];
  return ll ? `https://www.google.com/maps/dir/?api=1&destination=${ll[1]},${ll[0]}&travelmode=driving` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a + ', Delhi')}`;
};
// Google Maps link for a round car: the area pin if we know it, else a search on society, spot and Paschim Vihar
export const navOf = (c?: Car | null) => {
  const a = String(c?.house || '').trim();
  if (!a) return null;
  return AREA_LL[a] ? mapsOf({ area: a }) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a, c!.spot, 'Paschim Vihar, Delhi'].filter(Boolean).join(', '))}`;
};
export const fmtPhone = (p: string) => p.replace(/(\d{5})(\d{5})/, '$1 $2');

// customers, co-washers and the webhook all feed these screens, so colours, plans and numbers are checked on the way in
export const safeColor = (v: unknown) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v || '')) ? String(v) : '#8a8f98');
export const numOr = <T,>(v: unknown, d: T): number | T => (v !== null && v !== '' && v !== undefined && Number.isFinite(+(v as number)) ? +(v as number) : d);
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export function cleanWash(r: unknown): Wash {
  const w = clone((r || {}) as Wash);
  w.tasks = Array.isArray(w.tasks) ? w.tasks.filter(t => t && typeof t === 'object') : [];
  w.photos = Array.isArray(w.photos) ? w.photos.filter(p => p && typeof p === 'object') : [];
  w.minutes = numOr(w.minutes, null);
  w.water_litres = numOr(w.water_litres, null);
  return w;
}
export function cleanReq(v: Record<string, unknown>, id: string): Req {
  return {
    ...(v as object), id, reg: String(v.reg || ''), kind: String(v.kind || 'note'), text: v.text == null ? '' : String(v.text),
    created_at: String(v.created_at || ''), status: String(v.status || 'open'), spots: Array.isArray(v.spots) ? v.spots.map(String) : [],
  } as Req;
}
// a car from the book (n8n workflow 9) into the shape the screens draw
export function shapeBookCar(c: Record<string, unknown>): Car {
  const model = String(c.model || ''), make = String(c.make || '');
  return {
    ...(c as object), plate: String(c.plate), reg: normReg(c.plate), make, model, label: (make ? make + ' ' : '') + model,
    plan: isPlan(c.plan) ? c.plan : 'std', type: (['suv', 'mpv', 'sedan', 'hatch'].includes(String(c.type)) ? c.type : 'suv') as CarType,
    color: safeColor(c.color), house: String(c.house || ''), spot: String(c.spot || ''), customer: String(c.customer || 'Customer'),
    phone: c.phone ? String(c.phone) : undefined, fee: numOr(c.fee, null), img: undefined,
  };
}

// The preview's stand-in round. The two customer-app demo cars are real keys in the contract; the rest are made up.
// The installed app never shows these: its round comes from the book.
const demo = (c: Omit<Car, 'reg' | 'label'>): Car => ({ ...c, reg: normReg(c.plate), label: c.make + ' ' + c.model });
export const DEMO_ROSTER: Record<string, Car[]> = {
  chotte: [
    demo({ plate: 'DL 4C AB 2731', make: 'Mahindra', model: 'Scorpio N', plan: 'pro', img: 'scorpio', type: 'suv', color: '#3c4436', house: 'House 212', spot: 'Gate ke bahar, neem ke neeche', customer: 'Arjun M.', keys: 'Chaabi guard ke paas', phone: '9876504210', fee: 1800 }),
    demo({ plate: 'DL 3C BK 0419', make: 'Honda', model: 'Civic', plan: 'std', img: 'civic', type: 'sedan', color: '#e9e9ec', house: 'House 212', spot: 'Gate ke andar', customer: 'Arjun M.', keys: 'Customer khud kholenge', phone: '9876504210', fee: 999 }),
    demo({ plate: 'DL 8C AF 5521', make: 'Toyota', model: 'Fortuner', plan: 'pro', type: 'suv', color: '#f2f2f0', house: 'House 198', spot: 'Corner wali parking', customer: 'Mehra ji', phone: '9811000198', fee: 1800 }),
    demo({ plate: 'HR 26 DK 4471', make: 'Kia', model: 'Seltos', plan: 'pro', type: 'suv', color: '#b3261e', house: 'House 240', spot: 'Park ke saamne', customer: 'Sana K.', phone: '9811000240', fee: 1800 }),
    demo({ plate: 'DL 1C Z 4410', make: 'Maruti', model: 'Swift', plan: 'legacy', type: 'hatch', color: '#2e6fd8', house: 'House 251', spot: 'Lane 3, bijli ke khambe ke paas', customer: 'Gupta ji', phone: '9811000251', fee: 600 }),
    demo({ plate: 'DL 7C Q 1186', make: 'MG', model: 'Hector', plan: 'pro', type: 'suv', color: '#1d1d22', house: 'House 266', spot: 'Basement gate', customer: 'Rohit S.', phone: '9811000266', fee: 1800 }),
    demo({ plate: 'DL 9C AX 3302', make: 'Hyundai', model: 'Creta', plan: 'std', type: 'suv', color: '#8a8f98', house: 'House 289', spot: 'Ghar ke saamne', customer: 'Kapoor ji', phone: '9811000289', fee: 999 }),
    demo({ plate: 'DL 2C AR 6640', make: 'Toyota', model: 'Innova Hycross', plan: 'exc', type: 'mpv', color: '#cfc7b8', house: 'House 301', spot: 'Society gate no. 2', customer: 'Bhatia ji', phone: '9811000301', fee: 2500 }),
  ],
  shahrukh: [
    demo({ plate: 'DL 5C N 7720', make: 'Tata', model: 'Nexon', plan: 'std', type: 'suv', color: '#1f8a8a', house: 'GH-14, 88', spot: 'Tower B parking', customer: 'Anand R.', phone: '9811001488', fee: 999 }),
    demo({ plate: 'DL 6C M 3391', make: 'Hyundai', model: 'Verna', plan: 'std', type: 'sedan', color: '#6b6f76', house: 'GH-14, 102', spot: 'Gate ke paas', customer: 'Neha T.', phone: '9811001402', fee: 999 }),
    demo({ plate: 'DL 4C AN 9013', make: 'Mahindra', model: 'XUV 700', plan: 'pro', type: 'suv', color: '#0f2a4a', house: 'Meera Bagh, 41', spot: 'Ghar ke bahar', customer: 'Singh sahab', phone: '9811004141', fee: 1800 }),
    demo({ plate: 'DL 3C CE 2208', make: 'Maruti', model: 'Baleno', plan: 'legacy', type: 'hatch', color: '#c0392b', house: 'Sundar Vihar, 17', spot: 'Gali ke end mein', customer: 'Verma ji', phone: '9811001717', fee: 500 }),
    demo({ plate: 'DL 8C BB 6075', make: 'Skoda', model: 'Slavia', plan: 'std', type: 'sedan', color: '#e8e3d8', house: 'Guru Hari Apt, C-4', spot: 'Visitor parking', customer: 'Iyer ji', phone: '9811000004', fee: 999 }),
    demo({ plate: 'DL 1C AA 0550', make: 'Toyota', model: 'Camry', plan: 'res', type: 'sedan', color: '#121212', house: 'Sundar Vihar, 3', spot: 'Garage', customer: 'Malik sahab', phone: '9811000003', fee: 5555 }),
  ],
};
