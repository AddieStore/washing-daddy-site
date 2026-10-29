// Account, car and wash shapes, the weekly schedule and the pause rules. Ported one to one from the web app;
// the schedule must match the washer app (.notes/sync-contract.md, "The morning's task list").
import { PLANS, PlanId, WASHER_FOR } from './reference';
import { TODAY, iso, parse, addDays, fmt, hm, t2m, ampm } from './dates';

export type Pause = { from: string; to: string };
export type Car = {
  id: string; name: string; make: string; plate: string; img?: 'scorpio' | 'civic' | null; photo?: string | null; photoCut?: boolean;
  plan: PlanId; till: string | null; start?: string | null; status: 'active' | 'new'; washer: string; area?: string;
  parking: string; window: string; keys: string; doneAt?: string | null; mins: number; streak: number; washes: number;
  paused: Pause | null; pauses?: Pause[]; note: string | null; rating: number;
};
export type Payment = { d: string; what: string; amt: number; via: string; ref?: string; pending?: boolean };
export type Order = { id: string; total: number; status: string; items: { name: string; q: number }[] };
export type Rewash = { id: string; carId: string; spots: string[]; open: boolean; at: string };
export type Booking = { id: string; carId: string; type: string; what: string; date: string; slot: string };
export type Account = {
  name: string; phone: string; since: string; area: string; status?: string;
  prefs: { photo: boolean; pay: boolean; drops: boolean };
  cars: Car[]; payments: Payment[]; orders: Order[]; requests: Rewash[]; bookings: Booking[];
};
export type Session = { token: string; phone: string; real: boolean };

export const DEMO_PHONE = '9876504210';

export function sampleAccount(): Account {
  return {
    name: 'Arjun Malhotra', phone: DEMO_PHONE, since: 'March 2026', area: 'GH-9 Paschim Vihar',
    prefs: { photo: true, pay: true, drops: false },
    cars: [
      { id: 'c1', name: 'Scorpio N', make: 'Mahindra', plate: 'DL 4C AB 2731', img: 'scorpio', plan: 'pro', till: '2026-11-12', status: 'active', washer: 'Chotte',
        parking: 'House 212, outside the gate, under the neem tree', window: 'Before 7:30 AM', keys: 'Keys with the guard', doneAt: '6:42 AM', mins: 11, streak: 27, washes: 212, paused: null, note: null, rating: 0 },
      { id: 'c2', name: 'Civic', make: 'Honda', plate: 'DL 3C BK 0419', img: 'civic', plan: 'std', till: '2026-10-24', status: 'active', washer: 'Chotte',
        parking: 'House 212, inside the gate', window: 'Before 7:30 AM', keys: "I'll unlock it", doneAt: '6:31 AM', mins: 9, streak: 27, washes: 188, paused: null, note: null, rating: 0 },
    ],
    payments: [{ d: '2026-10-12', what: 'WD Pro · Scorpio N', amt: 1800, via: 'UPI' }, { d: '2026-09-24', what: 'WD Standard · Civic', amt: 999, via: 'UPI' },
      { d: '2026-09-12', what: 'WD Pro · Scorpio N', amt: 1800, via: 'Cash to washer' }, { d: '2026-09-03', what: 'Store · Microfibre set', amt: 349, via: 'UPI' }],
    orders: [], requests: [], bookings: [],
  };
}

export const maskPlate = (p: string) => String(p).replace(/^([A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,1})\s?([A-Z]{1,3})\s?(\d{1,4})$/i, (_m, a, _b, c) => `${a.trim()} •• ${c}`);
export const regOf = (c: { plate: string }) => String(c.plate).toUpperCase().replace(/[^A-Z0-9]/g, '');
export const planOf = (c: Car) => PLANS.find(p => p.id === c.plan) || PLANS[1];

// customers/{+91number} -> the account this app draws. Local-only bits (pauses, notes, orders) stay on the phone.
export function fromCustomerDoc(r: any, old: Account | null): Account {
  const active = r.status === 'active', prev = old && old.phone === String(r.phone).slice(-10) ? old : null;
  const cars: Car[] = (r.cars || []).map((c: any, i: number) => {
    const o = prev && prev.cars.find(x => regOf(x) === regOf(c));
    return Object.assign({ id: 'c' + i, name: '', make: '', plate: '', img: null, plan: 'std', till: null, washer: WASHER_FOR(r.area || ''),
      parking: (r.area || '') + ', parking spot to be confirmed', window: 'Before 7:30 AM', keys: "I'll unlock it", doneAt: null, mins: 0, streak: 0,
      washes: 0, paused: null, note: null, rating: 0 }, o || {}, c, { id: o ? o.id : (c.id || 'c' + i), status: active ? (c.status || 'active') : 'new' });
  });
  return Object.assign({ prefs: { photo: true, pay: true, drops: true }, payments: [], orders: [], requests: [], bookings: [] }, prev || {},
    { name: r.name || '', phone: String(r.phone).slice(-10), since: r.since || 'October 2026', area: r.area || '', status: r.status, cars });
}

/* ---------- schedule: weekly extras spread by a hash of the registration ---------- */
export function hash(s: string) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h }
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Extra = 'foam' | 'int' | 'tyre' | 'det';
export const dayKey = (d: Date) => DAYS[(d.getDay() + 6) % 7];
export function weekPlan(c: Car) {
  const f = planOf(c).f, h = hash(regOf(c)), w: Record<string, Extra[]> = {}; DAYS.forEach(d => w[d] = []);
  const spread = (k: Extra, n: number, off: number) => { if (n >= 7) { DAYS.forEach(d => w[d].push(k)); return } for (let i = 0; i < n; i++) w[DAYS[(off + Math.floor(i * 7 / n)) % 7]].push(k) };
  spread('foam', f.foam, h % 7); spread('int', f.int, (h >>> 3) % 7); spread('tyre', f.tyre, (h >>> 6) % 7);
  if (f.det >= 16) spread('det', 4, (h >>> 9) % 7);
  return w;
}
// Pro/Exclusive detailing falls on fixed days of the month (sync-contract.md)
export function detDays(c: Car) { const f = planOf(c).f; if (!f.det || f.det >= 16) return []; const d = ((hash(regOf(c)) >>> 9) % 28), gap = Math.floor(28 / f.det); return Array.from({ length: f.det }, (_, i) => (d + i * gap) % 28 + 1) }
export function extras(c: Car, dt: Date): Extra[] { const k = [...weekPlan(c)[dayKey(dt)]]; if (detDays(c).includes(dt.getDate())) k.push('det'); return k }
export const LABEL: Record<Extra, string> = { foam: 'Foam wash', int: 'Interior cleaning', tyre: 'Tyre & trim polish', det: 'Detailing' };

/* ---------- pausing: a WD Pro (and up) perk, at most PAUSE_MAX days in any calendar month ---------- */
export const isPaused = (c: Car, d: Date) => !!c.paused && iso(d) >= c.paused.from && iso(d) <= c.paused.to;
export const PAUSE_PLANS: PlanId[] = ['pro', 'exc', 'res'], PAUSE_MAX = 7;
export const canPause = (c: Car) => PAUSE_PLANS.includes(c.plan);
export const pauseLog = (c: Car) => { if (!c.pauses) c.pauses = c.paused ? [{ ...c.paused }] : []; return c.pauses };
export function pauseUsed(c: Car, ym: string) { let n = 0; pauseLog(c).forEach(r => { for (let d = parse(r.from); iso(d) <= r.to; d = addDays(d, 1)) if (iso(d).startsWith(ym)) n++ }); return n }
export function pauseFits(c: Car, from: Date, days: number) {
  const per: Record<string, number> = {}; for (let i = 0; i < days; i++) { const ym = iso(addDays(from, i)).slice(0, 7); per[ym] = (per[ym] || 0) + 1 }
  return Object.keys(per).every(ym => pauseUsed(c, ym) + per[ym] <= PAUSE_MAX);
}
export const pauseLeft = (c: Car, d: Date) => Math.max(0, PAUSE_MAX - pauseUsed(c, iso(d).slice(0, 7)));

export const startOf = (c: Car) => c.start ? parse(c.start) : null;
// headline for a car that has not had its first wash yet
export const startTxt = (c: Car) => { const s = startOf(c); if (!s) return 'Starts soon'; if (TODAY < s) return 'Starts ' + fmt(s, { weekday: 'long', day: 'numeric', month: 'short' }); return 'Not started yet' };
// a plan covers one month from its start; the last covered day is the day before the same date next month
export const tillOf = (start: string) => { const d = new Date(start + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) };
// days left: from the start date before the plan begins, from today after that
export function daysLeftOf(c: Car, real: boolean) {
  if (!c.till) return null;
  if (!real || !c.start) return Math.max(0, Math.round((parse(c.till).getTime() - TODAY.getTime()) / 864e5) + 1);
  const s = startOf(c)!, from = TODAY < s ? s : TODAY;
  return Math.max(0, Math.round((parse(c.till).getTime() - from.getTime()) / 864e5) + 1);
}

/* =====================================================================
   WASH DATA: one doc per car per morning, shape per .notes/sync-contract.md:
   washes/{YYYY-MM-DD}_{REG}, written by the washer app.
   ===================================================================== */
export type TaskKey = 'pressure' | 'foam' | 'interior' | 'tyre' | 'detailing' | 'dry';
export type Status = 'scheduled' | 'on_the_way' | 'arrived' | 'washing' | 'done' | 'skipped';
export type Photo = { kind: string; src: any; local?: 'before'; cut?: boolean };
export type WashDoc = {
  date: string; reg: string; car_label: string; washer: { id?: string; name: string; photo_url?: string };
  status: Status; eta?: string | null; on_the_way_at?: string | null; arrived_at?: string | null; started_at?: string | null; finished_at?: string | null;
  minutes?: number | null; tasks: { key: string; label: string; done: boolean; done_at?: string | null }[]; photos: Photo[];
  water_litres?: number | null; washer_note?: string | null; skip_reason?: string | null; customer_note_seen?: boolean;
  remote?: boolean; first?: boolean; notStarted?: boolean;
};
export const TASK_LABEL: Record<string, string> = { pressure: 'Pressure wash', foam: 'Foam wash', interior: 'Interior cleaning', tyre: 'Tyre & trim polish', detailing: 'Detailing', dry: 'Dried by hand' };
export const TASK_SUB: Record<string, string> = { pressure: 'Roof to rims, no cloth touches the paint', foam: 'Snow foam lifts the dust first', interior: 'Mats, dashboard, seats', tyre: 'Satin finish, not greasy', detailing: 'Clay, polish and wax', dry: 'Microfibre only' };
const KEYMAP: Record<Extra, TaskKey> = { foam: 'foam', int: 'interior', tyre: 'tyre', det: 'detailing' };
export const STAGES: Status[] = ['scheduled', 'on_the_way', 'arrived', 'washing', 'done'];
export const STAGE_LABEL = ['Booked', 'On the way', 'Reached', 'Washing', 'Done'];

// washers write these docs, so only https or inline images and plain text get through to the screen
const safeImg = (u: unknown) => typeof u === 'string' && (/^https:\/\/[^\s"'<>]{1,500}$/.test(u) || /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(u)) ? u : null;
const numOrNull = (v: any) => Number.isFinite(+v) && v !== null && v !== '' ? Math.round(+v) : null;
export function fromContract(r: any): WashDoc {
  r = r || {}; const w = r.washer || {};
  return { date: r.date, reg: r.reg, car_label: r.car_label, washer: { id: String(w.id || ''), name: String(w.name || ''), photo_url: safeImg(w.photo_url) || undefined },
    status: STAGES.includes(r.status) || r.status === 'skipped' ? r.status : 'scheduled',
    eta: hm(r.eta), on_the_way_at: hm(r.on_the_way_at), arrived_at: hm(r.arrived_at), started_at: hm(r.started_at), finished_at: hm(r.finished_at),
    minutes: numOrNull(r.minutes ?? (r.started_at && r.finished_at ? t2m(hm(r.finished_at)!) - t2m(hm(r.started_at)!) : null)),
    tasks: (Array.isArray(r.tasks) ? r.tasks : []).map((t: any) => ({ key: String(t.key), label: TASK_LABEL[t.key] || String(t.label || t.key), done: !!t.done, done_at: hm(t.done_at) })),
    photos: (Array.isArray(r.photos) ? r.photos : []).map((p: any) => ({ kind: p.kind, src: safeImg(p.url) })).filter((p: Photo) => p.src),
    water_litres: numOrNull(r.water_litres), washer_note: r.washer_note || '', skip_reason: r.skip_reason || '', customer_note_seen: !!r.customer_note_seen, remote: true };
}
export function planTasks(c: Car, d: Date): TaskKey[] { const w = extras(c, d); return ['pressure', ...w.map(k => KEYMAP[k]), 'dry'] }

// Test data: what a morning looks like for the sample account
export function makeDoc(c: Car): WashDoc {
  const base = { date: iso(TODAY), reg: regOf(c), car_label: c.name, washer: { name: c.washer }, photos: [] as Photo[] };
  if (c.status === 'new') return { ...base, date: iso(addDays(TODAY, 1)), status: 'scheduled', eta: '06:45', first: true, tasks: planTasks(c, addDays(TODAY, 1)).map(k => ({ key: k, label: TASK_LABEL[k], done: false })) };
  if (isPaused(c, TODAY)) return { ...base, status: 'skipped', skip_reason: 'Paused by you', tasks: [] };
  const keys = planTasks(c, TODAY), fin = t2m(c.img === 'civic' ? '06:31' : c.img === 'scorpio' ? '06:42' : '06:38'), mins = c.mins || 11, start = fin - mins;
  const m2 = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
  return { ...base, status: 'done', eta: m2(start + 2), on_the_way_at: m2(start - 9), arrived_at: m2(start - 1), started_at: m2(start), finished_at: m2(fin), minutes: mins,
    tasks: keys.map((k, i) => ({ key: k, label: TASK_LABEL[k], done: true, done_at: m2(start + Math.round(mins * (i + 1) / keys.length)) })),
    photos: c.img === 'scorpio' ? [{ kind: 'before', src: 'proof', local: 'before' }, { kind: 'after', src: 'proof' }] : c.img ? [{ kind: 'after', src: c.img, cut: true }] : [],
    water_litres: 7, washer_note: c.img === 'scorpio' ? 'Neem leaves on the roof, cleaned off. Front left tyre looks a little low, please check the pressure.' : 'All good today.', customer_note_seen: !!c.note };
}
export const activeStage = (d: WashDoc) => ['on_the_way', 'arrived', 'washing'].includes(d.status);
export function chipText(c: Car, d: WashDoc) {
  const w = d.washer?.name || c.washer;
  if (d.notStarted) return startTxt(c);
  if (c.status === 'new' && !d.remote) return 'First wash tomorrow, 6–7:30 AM';
  if (d.status === 'skipped') return d.skip_reason === 'Paused by you' && c.paused ? 'Paused till ' + fmt(c.paused.to) : 'No wash today';
  const done = d.tasks.filter(t => t.done).length;
  return ({ scheduled: `${w} comes around ${ampm(d.eta) || '6:30 AM'}`, on_the_way: `${w} is on the way`, arrived: `${w} has reached your car`, washing: `Washing now · ${done} of ${d.tasks.length}`, done: `Washed today · ${ampm(d.finished_at)}` } as Record<string, string>)[d.status];
}
