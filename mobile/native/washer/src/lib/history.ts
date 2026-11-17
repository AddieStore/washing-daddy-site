// Read-only day history for the Round tab's date strip and the Today / Day screens. Nothing here writes to the db
// or touches the store's sync: today comes from the store, older days from one small query on `washes`
// (where washer_id == me and date == day) plus `ratings/<date>_<reg>`; the demo builds believable sample days.
import { useEffect, useState } from 'react';
import { backend } from '../backend';
import { DAY, Extra, MODE, Money, RT, Route, S, Sync, W, carBy, me, route } from '../state/store';
import { cleanWash, type Car, type Wash, type WashStatus } from './data';
import { SLOTS } from './slots';
import { addDaysStr, daysInMonth } from './time';

export const HIST_DAYS = 45;

export type DayRow = {
  reg: string; plate: string; model: string; customer: string; house: string;
  slot: number | null; eta: string; started: string | null; finished: string | null; arrived: string | null;
  status: WashStatus; minutes: number | null; earn: number; photos: number; stars: number; skipReason: string | null;
};
export type DayData = {
  date: string; rows: DayRow[]; done: number; skipped: number; left: number; total: number;
  earn: number; extra: number; first: string | null; last: string | null; sample?: boolean;
};

const firstName = (s: string) => (s || '').trim().split(/\s+/)[0] || s;
const hhmm = (iso: string | null | undefined) => (iso ? iso.slice(11, 16) : '');
const sortRows = (a: DayRow, b: DayRow) => (a.slot ?? 99) - (b.slot ?? 99) || (a.eta || '99').localeCompare(b.eta || '99') || a.plate.localeCompare(b.plate);

function summarize(date: string, rows: DayRow[], extra: number, sample?: boolean, total = rows.length, keepOrder = false): DayData {
  rows = keepOrder ? rows.slice().sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99)) : rows.slice().sort(sortRows);   // today keeps the round's own order inside a slot
  const done = rows.filter((r) => r.status === 'done'), skipped = rows.filter((r) => r.status === 'skipped');
  const starts = rows.map((r) => r.started).filter(Boolean).sort() as string[];
  const ends = done.map((r) => r.finished).filter(Boolean).sort() as string[];
  return {
    date, rows, done: done.length, skipped: skipped.length, left: Math.max(0, total - done.length - skipped.length), total,
    earn: done.reduce((a, r) => a + r.earn, 0) + extra, extra, first: starts[0] || null, last: ends[ends.length - 1] || null, sample,
  };
}
// the washer's own share of one car for one day: half of what it pays, spread over the month (never the customer price)
const perDay = (car: Car | undefined, date: string) => (car && !car.pending ? Money.share(car.fee) / daysInMonth(date) : 0);
const rowOf = (car: Car | undefined, reg: string, w: Wash, date: string, stars: number, slot: number | null): DayRow => ({
  reg, plate: car?.plate || reg, model: car?.model || w.car_label || reg, customer: firstName(car?.customer || ''), house: car?.house || '',
  slot: typeof w.slot === 'number' ? w.slot : slot, eta: w.eta || '', started: w.started_at, finished: w.finished_at, arrived: w.arrived_at,
  status: w.status, minutes: w.minutes, earn: w.status === 'done' ? perDay(car, date) : 0, photos: (w.photos || []).length, stars, skipReason: w.skip_reason,
});

/** Today, live from the store: every car on the round (cars with no wash yet are "scheduled"). */
export function todayData(): DayData {
  const etas = Route.etaList();
  const rows = route().map((car, i) => {
    const w = W(car.reg);
    const base: Wash = w || ({ date: DAY, reg: car.reg, car_label: car.label, status: 'scheduled', eta: Route.slotEta(car.reg) || '', started_at: null, finished_at: null, arrived_at: null, minutes: null, photos: [], skip_reason: null } as unknown as Wash);
    return rowOf(car, car.reg, { ...base, eta: base.eta || Route.slotEta(car.reg) || etas[i] || '' }, DAY, RT[car.reg] || 0, Route.slotOf(car.reg));
  });
  const d = summarize(DAY, rows, Extra.doneOn(DAY).reduce((a, j) => a + Money.share(j.price), 0), false, rows.length, true);
  if (S.day?.startedAt && !d.first) d.first = S.day.startedAt;
  return d;
}

/* ---------- demo: believable sample days, the same every time for the same date ---------- */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 };
const rnd = (seed: string) => { let a = hash(seed) || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } };
const pad = (n: number) => String(n).padStart(2, '0');
const at = (date: string, mins: number) => `${date}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00+05:30`;
function demoDay(date: string): DayData | null {
  const cars = route();
  if (!cars.length) return null;
  const r = rnd(me().id + date);
  if (r() < 0.12) return null;   // a day off
  const rows: DayRow[] = [];
  cars.forEach((car, i) => {
    const slot = Math.min(SLOTS.length - 1, Math.floor((i / cars.length) * SLOTS.length));
    const eta = 6 * 60 + 15 + i * 14;
    const x = r();
    if (x < 0.07) { rows.push(rowOf(car, car.reg, { status: 'skipped', eta: `${pad(Math.floor(eta / 60))}:${pad(eta % 60)}`, started_at: null, finished_at: null, arrived_at: null, minutes: null, photos: [], skip_reason: ['Gate band tha', 'Baarish', 'Gaadi nahi mili'][Math.floor(r() * 3)] } as unknown as Wash, date, 0, slot)); return }
    const start = eta + Math.floor(r() * 12) - 3, mins = 14 + Math.floor(r() * 12);
    rows.push(rowOf(car, car.reg, {
      status: 'done', eta: `${pad(Math.floor(eta / 60))}:${pad(eta % 60)}`, arrived_at: at(date, start - 2), started_at: at(date, start), finished_at: at(date, start + mins),
      minutes: mins, photos: new Array(2 + Math.floor(r() * 3)).fill({ kind: 'after', at: '' }), skip_reason: null,
    } as unknown as Wash, date, r() < 0.55 ? (r() < 0.8 ? 5 : 4) : 0, slot));
  });
  return summarize(date, rows, r() < 0.15 ? 150 : 0, true);
}

/* ---------- older days from the db ---------- */
const cache = new Map<string, { at: number; data: DayData }>();
export async function loadDay(date: string): Promise<DayData> {
  if (date === DAY) return todayData();
  if (MODE === 'demo') return demoDay(date) || summarize(date, [], 0, true, 0);
  const hit = cache.get(date);
  if (hit && Date.now() - hit.at < 60e3) return hit.data;
  const { db } = backend;
  const sn = await db.collection('washes').where('washer_id', '==', me().id).where('date', '==', date).get();
  const washes = sn.docs.map((d) => d.data()).filter((v) => v && v.reg).map((v) => cleanWash(v));
  const stars = await Promise.all(washes.map(async (w) => {
    if (w.status !== 'done') return 0;
    try { const g = await db.doc('ratings/' + date + '_' + w.reg).get(); return g.exists ? Number(g.data()?.stars) || 0 : 0 } catch { return 0 }
  }));
  const rows = washes.map((w, i) => rowOf(carBy(w.reg), w.reg, w, date, stars[i], typeof w.slot === 'number' ? w.slot : null));
  const extra = Extra.doneOn(date).reduce((a, j) => a + Money.share(j.price), 0);
  const data = summarize(date, rows, extra);
  cache.set(date, { at: Date.now(), data });
  return data;
}

/** Days (last HIST_DAYS) that have washes, for the dots under the date strip. */
let marks: { at: number; v: Record<string, number> } | null = null;
export function useDayMarks(): Record<string, number> {
  const [m, setM] = useState<Record<string, number>>(marks?.v || {});
  const done = Object.values(S.day?.washes || {}).filter((w) => w && w.status === 'done').length;
  useEffect(() => {
    let live = true;
    const out: Record<string, number> = {};
    const finish = () => { out[DAY] = Math.max(out[DAY] || 0, done, route().length ? 1 : 0); marks = { at: Date.now(), v: out }; if (live) setM({ ...out }) };
    if (MODE === 'demo') {
      for (let i = 1; i <= HIST_DAYS; i++) { const d = addDaysStr(DAY, -i); const x = demoDay(d); if (x) out[d] = x.done }
      finish(); return () => { live = false };
    }
    Object.entries(S.hist || {}).forEach(([d, n]) => { if (n) out[d] = n });
    if (marks && Date.now() - marks.at < 60e3) { Object.assign(out, marks.v); finish(); return () => { live = false } }
    Sync.washesSince(addDaysStr(DAY, -HIST_DAYS)).then((rows) => {
      (rows || []).forEach((w) => { if (w.status === 'done') out[w.date] = (out[w.date] || 0) + 1 });
    }).catch(() => {}).finally(finish);
    finish();
    return () => { live = false };
  }, [done]);
  return m;
}

/** A day's data as a hook; `data` is null while loading, `failed` when the db could not be read. */
export function useDay(date: string): { data: DayData | null; failed: boolean } {
  const [st, setSt] = useState<{ date: string; data: DayData | null; failed: boolean }>({ date, data: null, failed: false });
  const live = date === DAY ? todayData() : null;
  useEffect(() => {
    if (date === DAY) return;
    let on = true;
    setSt({ date, data: null, failed: false });
    loadDay(date).then((data) => { if (on) setSt({ date, data, failed: false }) }).catch(() => { if (on) setSt({ date, data: null, failed: true }) });
    return () => { on = false };
  }, [date]);
  if (live) return { data: live, failed: false };
  return st.date === date ? { data: st.data, failed: st.failed } : { data: null, failed: false };
}
