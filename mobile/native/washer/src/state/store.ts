// The washer's day, kept on this phone. A straight port of the web app's state and data layer
// (washer/index.html: S, Sync, Book, NewCar, Extra, Money, Hist, Route), so both behave the same:
// - every change to a car is one whole washes/{DATE}_{REG} doc, queued in an outbox that survives
//   no signal and an app restart, and sent one at a time;
// - a fresh 'scheduled' doc never overwrites a wash the server already has further along;
// - after three refused writes the app stops trying and says so.
// Screens read with useStore() and call the actions at the bottom; nothing else talks to the db.
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backend, type Data, type DbError, type Unsub } from '../backend';
import { isoIST, dateIST, addDaysStr, daysInMonth } from '../lib/time';
import { PLAN, TASK, tasksFor, normReg, isPlan, type TaskKey } from '../lib/schedule';
import {
  WASHERS, PHONE_TO_WASHER, DEMO_ROSTER, BOOK_URL, SHARE, REQ_KIND, cleanWash, cleanReq, shapeBookCar,
  type Car, type Wash, type Req, type Job, type WasherDoc, type KitItem, type KitKind, type WasherInfo, type Photo,
} from '../lib/data';
import { setLang, t } from '../lib/i18n';
import type { Lang } from '../lib/i18n';
import { guideAt, isSundayIST, nameClip, SPOTS, INTERIOR_SECS } from '../lib/washGuide';
import { SLOT_COUNT, slotRange, etaIn, lists, place } from '../lib/slots';
import { lateClips } from '../lib/hindiNumber';
import { setupWashAlerts, alertsReady, scheduleWashAlerts, cancelWashAlerts, cancelAllWashAlerts, scheduleLateAlert, cancelLateAlert, scheduleMorningAlarm } from '../lib/washAlerts';
import { ui } from '../ui/bus';
import { registerPushToken, clearPushToken } from '../lib/pushToken';

const { db, auth } = backend;
// a wash can only be closed once this many photos of the car are taken
export const MIN_PHOTOS = 2
/** What the photo gate needs. Mon-Sat: MIN_PHOTOS of the car. Sunday (interior day): MIN_PHOTOS of the car plus one photo of each inside spot. */
export function photoNeeds(w: { started_at?: string | null; photos: { kind: string; spot?: string }[] }) {
  const sunday = isSundayIST(w.started_at);
  const car = w.photos.filter(p => p.kind === 'after' && !p.spot).length;
  const have = new Set(w.photos.filter(p => p.spot).map(p => p.spot));
  const missing = sunday ? SPOTS.filter(s => !have.has(s.key)) : [];
  // the voice asks for the inside photos once the car photos are done
  return { sunday, car, missing, nextSpot: car >= MIN_PHOTOS ? missing[0] || null : null, ok: car >= MIN_PHOTOS && missing.length === 0 };
};
import type { Attend } from '../lib/rewards';
export const REAL = auth.real;
export const MODE = backend.mode;

/* ---------------- persisted state ---------------- */
type Session = { washerId: string | null; real?: boolean; name?: string; phone?: string; since?: string; at?: string };
// slots/order/locked: the round as a timeline (lib/slots.ts): which slot each car sits in, the order, and whether the washer locked it
type Day = { date: string; washer: string; started: boolean; startedAt: string | null; washes: Record<string, Wash>; slots?: Record<string, number>; order?: string[]; locked?: boolean; locked_at?: string | null; checkin_at?: string | null };
type Selfie = { date: string; washer: string; url?: string; asset_id?: string };
// the app language the washer picked in onboarding; only 'hinglish' and 'hi' are translated today, the rest fall back (see act.setLangPref)
export type LangPref = Lang;
type State = {
  session: Session | null; online: boolean; theme: 'light' | 'dark' | 'auto'; lang: Lang;
  lang_pref?: LangPref; onboarded?: Record<string, string>;   // onboarded: 10-digit phone -> when the first-run onboarding was finished
  day: Day | null; outbox: Record<string, Wash>; rejected?: Record<string, Wash>; current: string | null;
  selfie: Selfie | null; hist: Record<string, number>; attend?: Attend; rounds: Record<string, { at: string; cars: Data[] }>;
};
export let S: State = { session: null, online: true, theme: 'light', lang: 'hinglish', day: null, outbox: {}, current: null, selfie: null, hist: {}, rounds: {} };
const KEY = 'wd-washer-v1';
let saveT: ReturnType<typeof setTimeout> | null = null;
// attendance log for the rewards: one entry per day, `first` is only kept when it is the first car photo of that day
function noteAttend(v: { in?: string; first?: string }, onlyIfNew = false) {
  S.attend = S.attend || {}; const e = S.attend[DAY] = S.attend[DAY] || {};
  if (v.in && !e.in) e.in = v.in;
  if (v.first && !(onlyIfNew && e.first)) e.first = v.first;
  save();
  const id = myDocId();
  if (id && id !== '+91') db.doc('checkins/' + DAY + '_' + id).update(v).catch(() => {});
}
function save() {
  if (saveT) clearTimeout(saveT);
  saveT = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(() => {}) }, 150);
}

/* ---------------- live state (not persisted) ---------------- */
export let DAY = dateIST();
export let R: Record<string, Req> = {};       // requests by id, from the customer app
export let RT: Record<string, number> = {};   // today's ratings by reg
export type AuthStep = 'loading' | 'phone' | 'otp' | 'join' | 'wait' | 'blocked' | 'noround' | 'in';
export const view = {
  authStep: 'loading' as AuthStep,
  otpPhone: '',
  bookState: 'loading' as 'loading' | 'live' | 'cached' | 'empty' | 'demo',
  syncMode: 'connecting' as 'connecting' | 'live' | 'demo',
  readOnly: false,
  netOk: true,
  jobAlert: null as Job | null,
  pendingPhotos: {} as Record<string, { kind: Photo['kind']; display: string }[]>,
  onboarding: false,   // the one-time onboarding (screens/Onboarding.tsx) is showing; the sign-in waits for it
};
let booted = false;

/* ---------------- subscription ---------------- */
let version = 0;
const listeners = new Set<() => void>();
let emitT: ReturnType<typeof setTimeout> | null = null;
export function emit() {
  if (emitT) return;
  emitT = setTimeout(() => { emitT = null; version++; listeners.forEach(f => f()) }, 16);
}
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } };
export const useStore = () => useSyncExternalStore(subscribe, () => version, () => version);

/* ---------------- who is signed in ---------------- */
export const me = (): WasherInfo => {
  const b = WASHERS[S.session?.washerId || ''] || WASHERS.chotte;
  if (!REAL || !S.session?.real) return b;
  // the roster's photo and lifetime count belong to that washer; anyone else on the round starts fresh
  const same = (S.session.name || '').trim().toLowerCase() === b.name.toLowerCase();
  return same ? { ...b, phone: S.session.phone || b.phone }
    : { ...b, name: S.session.name || b.name, phone: S.session.phone || b.phone, img: null, lifetime: 0, rating: '–', since: S.session.since || '2026' };
};
const ROSTER: Record<string, Car[]> = REAL ? {} : JSON.parse(JSON.stringify(DEMO_ROSTER));
export const route = (): Car[] => {
  const r = ROSTER[me().id] || [], o = S.day?.order;
  if (!o || !o.length) return r;
  const at = (reg: string) => { const i = o.indexOf(reg); return i < 0 ? 1e6 : i };
  return r.map((c, i) => ({ c, i })).sort((a, b) => at(a.c.reg) - at(b.c.reg) || a.i - b.i).map(x => x.c);
};
export const carBy = (reg: string | null | undefined) => route().find(c => c.reg === reg);
export const W = (reg: string | null | undefined): Wash | null => (reg && S.day?.washes?.[reg]) || null;
export const isOnline = () => S.online !== false;
export function ensureDay() {
  if (!S.day || S.day.date !== DAY || S.day.washer !== me().id) {
    S.day = { date: DAY, washer: me().id, started: false, startedAt: null, washes: {} };
    S.current = null; save();
  }
}
export const myPhoto = () => (S.selfie && S.selfie.washer === me().id ? S.selfie : null);
export const photoSrc = (p: { asset_id?: string; url?: string }) => p.url || '';
function washerObj() {
  const w = me(), o: Wash['washer'] = { id: w.id, name: w.name }, s = myPhoto();
  if (s?.url) o.photo_url = s.url;
  return o;
}

/* ---------------- the book: this washer's round (n8n workflow 9) ---------------- */
let bookCars: Car[] | null = null;
function composeRound(id: string) {
  const book = bookCars || [], have = new Set(book.map(c => c.reg));
  ROSTER[id] = book.concat(NewCar.mine.filter(c => !have.has(c.reg)));
}
const Book = {
  setRound(id: string, cars: Data[]) { bookCars = cars.filter(c => c && c.plate && normReg(c.plate)).map(shapeBookCar); composeRound(id) },
  async load() {
    if (!REAL) { view.bookState = 'demo'; emit(); return }
    const id = me().id;
    // yesterday's list first, so the washer can start walking before the network answers
    const cached = S.rounds[id];
    if (cached) { this.setRound(id, cached.cars); view.bookState = 'cached'; emit() }
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
      // wd-washer-cars needs the washer's Firebase ID token (demo backend has none, and never reaches this call)
      const tok = await backend.auth.idToken();
      if (!tok) throw new Error('not signed in');
      const r = await fetch(BOOK_URL + '?washer=' + encodeURIComponent(id), { cache: 'no-store', headers: { Authorization: 'Bearer ' + tok }, signal: ctl.signal });
      clearTimeout(to);
      const j = await r.json();
      if (!r.ok || !j || j.ok === false || !Array.isArray(j.cars)) throw new Error('book');
      this.setRound(id, j.cars); S.rounds[id] = { at: isoIST(), cars: j.cars }; save();
      view.bookState = j.cars.length ? 'live' : 'empty';
    } catch (e) {
      // a washer must never be shown a car that is not really on his round: no demo fallback here
      if (!cached) { this.setRound(id, []); view.bookState = 'empty' }
    }
    ensureDay(); Sync.listen(); emit();
  },
};

/* ---------- cars the washer sold himself: on his round today, earning once Ravi approves ---------- */
const NewCar = {
  mine: [] as Car[],
  set(docs: Data[]) {
    this.mine = docs.filter(d => d && d.reg && normReg(d.reg) && d.status !== 'rejected').map(d => ({
      plate: d.plate || d.reg, reg: normReg(d.reg), make: '', model: d.model || 'Gaadi', label: d.model || 'Gaadi',
      plan: isPlan(d.plan) ? d.plan : 'std', type: 'suv' as const, color: '#8a8f98', house: d.area || '', spot: '',
      customer: d.customer_name || 'Customer', phone: d.customer_phone || '', fee: typeof d.fee === 'number' ? d.fee : null,
      mine: true, pending: d.status !== 'approved', status: d.status || 'pending',
    }));
    if (REAL) composeRound(me().id);
    else { const id = me().id, base = DEMO_ROSTER[id] || [], have = new Set(base.map(c => c.reg)); ROSTER[id] = base.concat(this.mine.filter(c => !have.has(c.reg))) }
  },
};

/* ---------- extra jobs Ravi gives him, and customer bookings anyone can claim ---------- */
export const Extra = {
  jobs: [] as Job[],
  pending: [] as Job[],
  set(docs: Job[]) { this.jobs = docs.filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || '')) },
  setPending(docs: Job[]) { this.pending = docs.filter(Boolean).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) },
  open() { return this.jobs.filter(j => j.status !== 'done' && j.status !== 'declined') },
  allOpen() { return [...this.open(), ...this.pending] },
  // offline washers do not see (or get alerted about) unassigned customer bookings
  shown() { return isOnline() ? this.allOpen() : this.open() },
  doneOn(day: string) { return this.jobs.filter(j => j.status === 'done' && (j.finished_at || j.date || '').slice(0, 10) === day) },
  doneIn(month: string) { return this.jobs.filter(j => j.status === 'done' && (j.finished_at || j.date || '').slice(0, 7) === month) },
  byId(id: string) { return this.jobs.find(j => j.id === id) || this.pending.find(j => j.id === id) || null },
};

/* ---------- the money: half of what a car pays us is the washer's ---------- */
export const Money = {
  share(fee?: number | null) { return (typeof fee === 'number' ? fee : 0) * SHARE },
  // a car Ravi has not approved yet is not counted: he sets the fee
  earns(c?: Car) { return c && !c.pending ? this.share(c.fee) : 0 },
  perDay(c: Car) { return this.earns(c) / daysInMonth(DAY) },
  monthly() { return route().reduce((a, c) => a + this.earns(c), 0) },
  todayWashes() { return route().reduce((a, c) => { const w = W(c.reg); return a + (w && w.status === 'done' ? this.perDay(c) : 0) }, 0) },
  todayExtra() { return Extra.doneOn(DAY).reduce((a, j) => a + this.share(j.price), 0) },
  today() { return this.todayWashes() + this.todayExtra() },
  monthWashes() {
    const m = DAY.slice(0, 7); let sum = 0;
    Object.entries(Hist.done).forEach(([day, regs]) => {
      if (day.slice(0, 7) !== m) return;
      const dm = daysInMonth(day);
      regs.forEach(reg => { const c = carBy(reg); if (c && !c.pending) sum += this.share(c.fee) / dm });
    });
    return sum;
  },
  monthExtra() { return Extra.doneIn(DAY.slice(0, 7)).reduce((a, j) => a + this.share(j.price), 0) },
  month() { return this.monthWashes() + this.monthExtra() },
};
// which cars were finished on which day this month, so the month's earnings are counted, not guessed
export const Hist = {
  done: {} as Record<string, string[]>,
  key: '',
  add(day: string, reg: string) { const l = this.done[day] = this.done[day] || []; if (!l.includes(reg)) l.push(reg) },
  fromToday() { Object.values(S.day?.washes || {}).forEach(w => { if (w && w.status === 'done' && w.date === DAY) this.add(DAY, w.reg) }) },
  async load() {
    this.done = {}; this.fromToday();
    const rows = await Sync.washesSince(DAY.slice(0, 8) + '01');
    if (rows) rows.forEach(w => { if (w.status === 'done') this.add(w.date, w.reg) });
    this.fromToday(); emit();
  },
};

/* ---------------- the round ---------------- */
export const Route = {
  slotOf(reg: string): number | null { const s = S.day?.slots?.[reg]; return typeof s === 'number' ? s : null },
  isLocked() { return !!S.day?.locked },
  // cars per slot, in order, and the cars not placed yet
  layout() { const regs = route().map(c => c.reg); return lists(regs, S.day?.slots || {}) },
  // the ETA of a car from its place in the timeline, "HH:MM" (null when it has no slot)
  slotEta(reg: string): string | null {
    const s = Route.slotOf(reg); if (s == null) return null;
    const l = Route.layout().slots[s]; return etaIn(s, Math.max(0, l.indexOf(reg)), l.length);
  },
  // a car still not done once its slot is over
  isLate(reg: string, nowMs = Date.now()): boolean {
    const s = Route.slotOf(reg); const w = W(reg); if (s == null || !S.day?.locked || (w && ['done', 'skipped'].includes(w.status))) return false;
    return nowMs > Date.parse(DAY + 'T00:00:00+05:30') + slotRange(s).toMin * 60e3;
  },
  etaList() { // the slot times when the round is locked; else 6:00 or now, then ~12 minutes a car
    if (S.day?.locked && route().every(c => Route.slotOf(c.reg) != null)) return route().map(c => Route.slotEta(c.reg) as string);
    const now = Date.now(), six = Date.parse(DAY + 'T06:00:00+05:30'), base = Math.max(now, six);
    return route().map((_, i) => isoIST(base + i * 12 * 60e3).slice(11, 16));
  },
  nextReg() { const n = route().find(c => { const w = W(c.reg); return w && !['done', 'skipped'].includes(w.status) }); return n ? n.reg : null },
  liveReg() { const n = route().find(c => { const w = W(c.reg); return w && ['on_the_way', 'arrived', 'washing'].includes(w.status) }); return n ? n.reg : null },
  retime() { // only rewrite an ETA that has drifted by more than 10 minutes (a locked round keeps its slot times)
    if (S.day?.locked) return;
    let k = 0; const now = Date.now();
    route().forEach(c => {
      const w = W(c.reg); if (!w || w.status !== 'scheduled') return; k++;
      const want = isoIST(now + k * 12 * 60e3).slice(11, 16), [a, b] = w.eta.split(':').map(Number), [x, y] = want.split(':').map(Number);
      if (Math.abs((a * 60 + b) - (x * 60 + y)) > 10) mutate(c.reg, d => { d.eta = want });
    });
  },
  counts() { const ws = route().map(c => W(c.reg)).filter(Boolean) as Wash[]; return { total: route().length, done: ws.filter(w => w.status === 'done').length, skipped: ws.filter(w => w.status === 'skipped').length } },
};
export const openReqs = (reg: string) => Object.values(R)
  .filter(q => q.reg === reg && q.status !== 'done' && !(q.kind === 'skip_tomorrow' && addDaysStr((q.created_at || '').slice(0, 10) || DAY, 1) !== DAY))
  .sort((a, b) => ((a.created_at || '') < (b.created_at || '') ? -1 : 1));
export const skipAsk = (reg: string) => openReqs(reg).find(q => q.kind === 'skip_tomorrow');

/* ---------------- data layer: the only place that talks to the db ---------------- */
let unsubs: Unsub[] = [];
let flushing = false, refused = 0;
export const Sync = {
  stop() { unsubs.forEach(u => { try { u() } catch (e) { } }); unsubs = [] },
  listen() {
    this.stop(); if (!S.session?.washerId) return;
    const id = me().id, regs = route().map(c => c.reg), err = (e: DbError) => console.warn('sync', e?.code, e?.message);
    // my washes for today: a second phone, or a reinstall, picks up where the first left off
    unsubs.push(db.collection('washes').where('washer_id', '==', id).where('date', '==', DAY).onSnapshot(sn => {
      let ch = false; ensureDay();
      sn.docs.forEach(d => {
        const r = d.data(); if (!r || !r.reg || !carBy(r.reg)) return; if (S.outbox[DAY + '_' + r.reg]) return;
        const l = W(r.reg);
        if (!l || (r.updated_at || '') > (l.updated_at || '')) { S.day!.washes[r.reg] = cleanWash(r); ch = true }
      });
      if (sn.size && !S.day!.started) { S.day!.started = true; ch = true }
      if (ch) { save(); emit() }
    }, err));
    // customer requests for the cars on my round (an empty round has nothing to watch)
    let primedReq = false;
    if (regs.length) unsubs.push(db.collection('requests').where('reg', 'in', regs.slice(0, 30)).onSnapshot(sn => {
      const prev = R, first = !primedReq; R = {}; primedReq = true;
      sn.docs.forEach(d => { const v = d.data(); if (v) R[d.id] = cleanReq(v, d.id) });
      if (booted && !first) Object.values(R).forEach(q => {
        if (!prev[q.id] && q.status === 'open') { const c = carBy(q.reg); if (c) { ui.toast(t(`Naya: ${c.model} · ${REQ_KIND[q.kind] || 'note'}`)); ui.haptic([20, 60, 20]) } }
      });
      emit();
    }, err));
    // the cars he added himself: Ravi may approve one while he is walking
    unsubs.push(db.collection('newcars').where('washer_id', '==', id).onSnapshot(sn => {
      NewCar.set(sn.docs.map(d => ({ ...d.data(), reg: d.data()?.reg || d.id }))); ensureDay(); emit();
    }, err));
    // the extra jobs Ravi gives him (and customer-claimed jobs)
    // a listener's first answer is what was already there, not news: no alert for it
    let primedMine = false, primedOpen = false;
    unsubs.push(db.collection('ondemand').where('washer_id', '==', id).onSnapshot(sn => {
      const prevIds = new Set(Extra.open().map(j => j.id));
      Extra.set(sn.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      const first = !primedMine; primedMine = true;
      if (booted && !first) { const nj = Extra.open().find(j => !prevIds.has(j.id)); if (nj) showJobAlert(nj) }
      emit();
    }, err));
    // unassigned customer bookings: the first washer to accept claims it
    unsubs.push(db.collection('ondemand').where('washer_id', '==', '').onSnapshot(sn => {
      const prevIds = new Set(Extra.pending.map(j => j.id));
      Extra.setPending(sn.docs.map(d => ({ id: d.id, ...d.data() } as Job)).filter(j => j.status === 'new'));
      const first = !primedOpen; primedOpen = true;
      if (booted && !first && isOnline()) { const nj = Extra.pending.find(j => !prevIds.has(j.id)); if (nj) showJobAlert(nj) }
      emit();
    }, err));
    // today's ratings, one doc per car
    regs.forEach(reg => unsubs.push(db.doc('ratings/' + DAY + '_' + reg).onSnapshot(d => {
      const v = d.exists ? d.data() : null, seen = reg in RT, was = RT[reg]; RT[reg] = v && v.stars ? v.stars : 0;
      if (booted && seen && RT[reg] && !was) { const c = carBy(reg); if (c) { ui.toast(t(`${c.customer} ne ${RT[reg]}★ diya · ${c.model}`)); ui.haptic([10, 40, 10]); if (RT[reg] >= 5) ui.confetti(.5) } }
      emit();
    }, err)));
  },
  queue(doc: Wash) {
    S.outbox[doc.date + '_' + doc.reg] = doc; save(); emit(); this.flush();
    // demo: the customer "rates" a finished wash a few seconds later, so the loop is visible
    if (MODE === 'demo' && doc.status === 'done' && !RT[doc.reg]) setTimeout(() => {
      if (RT[doc.reg]) return;
      db.doc('ratings/' + doc.date + '_' + doc.reg).set({ date: doc.date, reg: doc.reg, stars: 5, at: isoIST() });
    }, 4500);
  },
  async flush() {
    if (flushing || view.readOnly) return; flushing = true;
    try {
      for (let guard = 0; guard < 50; guard++) {
        const key = Object.keys(S.outbox)[0]; if (!key) break; const doc = S.outbox[key];
        // a fresh 'scheduled' doc (new round, reset, new phone) must not wipe a wash the server already has
        if (doc.status === 'scheduled' && await this.adopt(key)) continue;
        try { await db.doc('washes/' + key).set(doc); view.netOk = true }
        catch (e: any) {
          if (e && (e.code === 'invalid_argument' || e.code === 'transform_error')) {
            // the store refused this car for good: set it aside, take the server's copy, keep sending the rest
            S.rejected = S.rejected || {}; S.rejected[key] = doc; delete S.outbox[key]; save(); await this.adopt(key, true);
            refused++;
            if (refused >= 3) { view.readOnly = true; ui.toast(t('Is account se customer tak update nahi jaa raha')); break }
            const c = carBy(doc.reg); ui.toast(t(`${c ? c.model : doc.reg}: update nahi gaya, Manager ko batao`)); continue;
          }
          if (e && e.code === 'unavailable') { view.netOk = false; emit(); await new Promise(r => setTimeout(r, 800 + Math.random() * 800)); continue }
          view.netOk = false; break;
        }
        refused = 0;
        if (S.outbox[key] && S.outbox[key].updated_at === doc.updated_at) delete S.outbox[key];
        save(); emit();
      }
    } finally { flushing = false; emit() }
  },
  // take the server's copy of a wash when it is further along (or always, after a refused write)
  async adopt(key: string, always?: boolean) {
    try {
      const g = await db.doc('washes/' + key).get(); if (!g.exists) return false; const r = g.data();
      if (!r || (!always && (r.status || 'scheduled') === 'scheduled')) return false;
      delete S.outbox[key];
      if (key.startsWith(DAY + '_') && r.reg && S.day?.washes) S.day.washes[r.reg] = cleanWash(r);
      save(); emit(); return true;
    } catch (e) { return false }
  },
  async setRequest(id: string, patch: Partial<Req>) {
    const q = R[id]; if (!q) return; R = { ...R, [id]: { ...q, ...patch } }; emit();
    try { await db.doc('requests/' + id).update(patch) } catch (e) { console.warn(e) }
  },
  async washesSince(from: string): Promise<Wash[] | null> {
    try {
      const sn = await db.collection('washes').where('washer_id', '==', me().id).where('date', '>=', from).get();
      return sn.docs.map(d => d.data() as Wash).filter(v => v && v.reg && v.date);
    } catch (e) { console.warn(e); return null }
  },
  async weekCounts(): Promise<Record<string, number> | null> {
    const rows = await this.washesSince(addDaysStr(DAY, -6)); if (!rows) return null;
    const out: Record<string, number> = {};
    rows.forEach(v => { if (v.status === 'done') out[v.date] = (out[v.date] || 0) + 1 });
    return out;
  },
  async extraSet(id: string, patch: Partial<Job> & Data) {
    const j = Extra.byId(id); if (!j) return;
    Object.assign(j, patch); emit();
    try { await db.doc('ondemand/' + id).update({ updated_at: isoIST(), ...patch }) }
    catch (e) { console.warn(e); ui.toast(t('Nahi gaya. Internet dekh ke dobara try karo.')) }
  },
};

/* ---------------- writes to a wash doc: always the whole doc, one at a time ---------------- */
function newWash(c: Car, seq: number, eta: string): Wash {
  return {
    date: DAY, reg: c.reg, car_label: c.label, washer: washerObj(), washer_id: me().id, status: 'scheduled', eta,
    on_the_way_at: null, arrived_at: null, started_at: null, finished_at: null, minutes: null,
    tasks: tasksFor(c.reg, c.plan, DAY).map(k => ({ key: k, label: TASK[k].en, done: false, done_at: null })),
    photos: [], water_litres: null, washer_note: null, skip_reason: null, customer_note_seen: false, seq, updated_at: isoIST(),
  };
}
// write the slot, ETA and position of every car that has not started (called when the round is locked)
function syncSlots() {
  const day = S.day!; const ls = Route.layout();
  route().forEach((c, i) => {
    const s = Route.slotOf(c.reg); if (s == null) return;
    const eta = Route.slotEta(c.reg) as string, r = slotRange(s);
    let w = W(c.reg);
    if (!w) { w = newWash(c, i + 1, eta); day.washes[c.reg] = w; }
    if (w.status !== 'scheduled') return;
    mutate(c.reg, d => { d.eta = eta; d.slot = s; d.slot_from = r.from; d.slot_to = r.to; d.seq = i + 1 });
  });
  void ls;
}
function lateAlerts() {
  route().forEach(c => {
    const s = Route.slotOf(c.reg), w = W(c.reg);
    if (!S.day?.locked || s == null || (w && ['done', 'skipped'].includes(w.status))) { void cancelLateAlert(c.reg); return }
    void scheduleLateAlert(c.reg, c.reg, new Date(Date.parse(DAY + 'T00:00:00+05:30') + slotRange(s).toMin * 60e3));
  });
}
function mutate(reg: string, fn: (d: Wash) => void) {
  const cur = W(reg); if (!cur) return null;
  const d: Wash = JSON.parse(JSON.stringify(cur)); fn(d); d.washer = { ...washerObj() }; d.updated_at = isoIST();
  S.day!.washes[reg] = d; save(); Sync.queue(d); return d;
}

/* ---------------- job alert ---------------- */
function showJobAlert(job: Job) { view.jobAlert = job; ui.haptic([20, 60, 20, 60, 20]); ui.alertSound(Math.round(Money.share(job.price))); emit() }

/* =====================================================================
   Actions the screens call
   ===================================================================== */
export const act = {
  setCurrent(reg: string) { S.current = reg; save(); emit() },
  currentReg() { return S.current || Route.liveReg() || Route.nextReg() },
  // ---- the round timeline: drag a car into a slot, then lock the round ----
  moveCar(reg: string, slot: number | null, index = 1e9) {
    ensureDay(); const day = S.day!;
    if (day.locked) { ui.toast(t('Round locked hai. Pehle unlock karo')); return false }
    const w = W(reg); if (w && w.status !== 'scheduled') { ui.toast(t('Yeh gaadi shuru ho chuki hai, ise hila nahi sakte')); return false }
    if (slot != null && (slot < 0 || slot >= SLOT_COUNT)) return false;
    const r = place(route().map(c => c.reg), day.slots || {}, reg, slot, index);
    day.order = r.order; day.slots = r.slots; save(); ui.haptic(8); emit(); return true;
  },
  lockRound() {
    ensureDay(); const day = S.day!;
    const open = route().filter(c => Route.slotOf(c.reg) == null);
    if (open.length) { ui.toast(t(`${open.length} gaadi abhi kisi slot mein nahi hai`)); ui.haptic(14); return false }
    day.locked = true; day.locked_at = isoIST(); syncSlots(); lateAlerts(); save(); emit(); Sync.flush();
    ui.haptic([20, 40, 20]); ui.confetti(.5); ui.toast(t('Round lock ho gaya. Customers ko unka time dikh raha hai')); return true;
  },
  unlockRound() {
    ensureDay(); const day = S.day!; day.locked = false; day.locked_at = null; lateAlerts(); save(); emit();
    ui.toast(t('Round khul gaya. Gaadiyan aage-peeche kar sakte ho')); return true;
  },
  // "Interior kar raha hoon": 10 extra minutes for this car, the guide gets an interior block, customer and dashboard see it
  addInterior(reg: string) {
    const w = W(reg); if (!w || w.status !== 'washing' || !w.started_at) { ui.toast(t('Pehle wash shuru karo')); return false }
    if (w.interior || isSundayIST(w.started_at)) { ui.toast(t('Interior pehle se jud chuka hai')); return false }
    const g = guideAt(w.started_at); if (!g) return false;
    const at = g.plan[g.idx + 1] ? g.plan[g.idx + 1].from : g.elapsed + 5;   // starts when the stage that is running now ends
    mutate(reg, d => {
      d.interior = true; d.interior_from = at; d.extra_minutes = (d.extra_minutes || 0) + INTERIOR_SECS / 60;
      d.addons = [...(d.addons || []), { key: 'interior', at: isoIST(), minutes: INTERIOR_SECS / 60 }];
      if (!d.tasks.some(x => x.key === 'interior')) d.tasks.push({ key: 'interior', label: TASK.interior.en, done: false, done_at: null });
    });
    ui.speak('ph_interior'); ui.haptic([20, 40, 20]); ui.toast(t('Interior jud gaya. 10 minute badh gaye')); emit();
    void scheduleWashAlerts(reg, w.started_at, me().name.split(' ')[0], at);
    return true;
  },
  // "Hub pahunch gaya": the morning check-in, seen live on the dashboard
  async checkIn() {
    ensureDay(); const day = S.day!; if (day.checkin_at) return true;
    day.checkin_at = isoIST(); noteAttend({ in: day.checkin_at }); save(); emit(); ui.haptic([20, 40, 20]);
    try {
      const id = myDocId();
      if (id && id !== '+91') await db.doc('checkins/' + DAY + '_' + id).set({ phone: id, name: me().name, date: DAY, at: day.checkin_at });
    } catch (e) { console.warn('checkin', e) }
    return true;
  },
  startRound() {
    if (REAL && view.bookState === 'loading') { ui.toast(t('Gaadiyon ki list aa rahi hai, ek minute ruko')); return false }
    ensureDay(); const etas = Route.etaList();
    route().forEach((c, i) => { if (!W(c.reg)) { const d = newWash(c, i + 1, etas[i]); S.day!.washes[c.reg] = d; S.outbox[DAY + '_' + c.reg] = d } });
    S.day!.started = true; S.day!.startedAt = isoIST(); S.current = S.current || Route.nextReg(); save(); emit(); Sync.flush();
    ui.haptic([20, 50, 20]); ui.confetti(.6); ui.toast(t(`Round shuru! ${route().length} customers ko time chala gaya`));
    Sync.listen(); return true;
  },
  startWash(reg: string) {
    mutate(reg, d => { d.status = 'washing'; d.started_at = isoIST(); if (!d.arrived_at) d.arrived_at = d.started_at });
    ui.haptic([20, 40, 20]); ui.toast(t(`Timer chalu · ${carBy(reg)?.customer} ko "Wash chal raha" dikh raha hai`)); emit();
    guideTick();
    const w0 = W(reg); if (w0?.started_at) void scheduleWashAlerts(reg, w0.started_at, me().name.split(' ')[0], w0.interior_from);
  },
  task(reg: string, key: TaskKey) {
    const wd = W(reg); if (!wd) return;
    if (wd.status !== 'washing') { ui.toast(t('Pehle "Wash shuru karo" slide karo')); ui.haptic(14); return }
    let nowDone = false;
    mutate(reg, d => { const tk = d.tasks.find(x => x.key === key); if (!tk) return; tk.done = !tk.done; tk.done_at = tk.done ? isoIST() : null; nowDone = tk.done });
    ui.haptic(nowDone ? [10, 30, 10] : 6);
    if (W(reg)!.tasks.every(x => x.done)) { ui.toast(t('Saare kaam ho gaye! Ab gaadi ki photo lo')); ui.confetti(.35) }
    emit();
  },
  // the photo arrives as a small data: URL (contract: url, ≤ ~30 KB), see lib/photo.ts
  addPhoto(reg: string, kind: Photo['kind'], url: string, spot?: string) {
    // a retake of an inside spot replaces that spot's earlier photo
    mutate(reg, d => {
      if (spot) d.photos = d.photos.filter(p => p.spot !== spot);
      if (d.photos.length >= 12) d.photos.shift();
      d.photos.push({ kind, at: isoIST(), url, ...(spot ? { spot } : {}) });
    });
    // the first car photo of the day, with its time, counts for the early-bird reward
    if (kind === 'after' && !spot) noteAttend({ first: isoIST() }, true);
    ui.toast(t(kind === 'issue' ? 'Problem ki photo customer ko gayi' : 'Photo customer ko gayi'));
    // Sunday: once the car photos are done, the voice asks for the next inside photo
    const w = W(reg); const nx = w && isSundayIST(w.started_at) && kind === 'after' ? photoNeeds(w).nextSpot : null;
    if (nx) ui.speak(nx.clip);
  },
  photoPending(reg: string, kind: Photo['kind'], display: string | null) {
    if (display) (view.pendingPhotos[reg] = view.pendingPhotos[reg] || []).push({ kind, display });
    else view.pendingPhotos[reg] = (view.pendingPhotos[reg] || []).filter(p => p.kind !== kind);
    emit();
  },
  delPhoto(reg: string, kind: Photo['kind']) {
    mutate(reg, d => { for (let i = d.photos.length - 1; i >= 0; i--) if (d.photos[i].kind === kind && !d.photos[i].spot) { d.photos.splice(i, 1); break } });
    ui.toast(t('Photo hata di'));
  },
  setNote(reg: string, text: string) {
    mutate(reg, d => { d.washer_note = text || null }); ui.toast(t(text ? 'Note bhej diya' : 'Note hata diya'));
  },
  // returns false when the photo gate stops it
  finish(reg: string) {
    const wd = W(reg); if (!wd) return false;
    if (!photoNeeds(wd).ok) { act.needPhoto(reg); return false }
    const litres = wd.tasks.reduce((a, x) => a + (x.done ? TASK[x.key].litres : 0), 0) || TASK.pressure.litres;
    const end = isoIST();
    mutate(reg, d => { d.status = 'done'; d.finished_at = end; d.minutes = Math.max(1, Math.round((Date.parse(end) - Date.parse(d.started_at || end)) / 60000)); d.water_litres = litres });
    void cancelWashAlerts(reg); void cancelLateAlert(reg);
    ui.haptic([20, 40, 20, 40, 60]); ui.confetti(1); Route.retime(); emit(); return true;
  },
  needPhoto(reg?: string) {
    const w = reg ? W(reg) : null; const n = w && isSundayIST(w.started_at) ? photoNeeds(w).missing.length : 0;
    ui.toast(t(n ? `Gaadi ki ${MIN_PHOTOS} photo aur andar ki ${n} photo baaki hain` : `Kam se kam ${MIN_PHOTOS} gaadi ki photo lo, phir wash band hogi`)); ui.haptic(14);
  },
  skip(reg: string, reason: string) {
    mutate(reg, d => { d.status = 'skipped'; d.skip_reason = reason });
    const sk = skipAsk(reg); if (sk) Sync.setRequest(sk.id, { status: 'done', done_at: isoIST() });
    void cancelWashAlerts(reg); void cancelLateAlert(reg);
    ui.haptic(14); Route.retime(); ui.toast(t('Skip kiya. Customer ko wajah dikh rahi hai')); emit();
  },
  unskip(reg: string) { mutate(reg, d => { d.status = d.arrived_at ? 'arrived' : 'scheduled'; d.skip_reason = null }); emit() },
  // opening a car with an open request counts as "seen"
  markSeen(reg: string) {
    const wd = W(reg); if (!wd || ['done', 'skipped'].includes(wd.status)) return;
    const open = openReqs(reg).filter(q => q.status === 'open'); if (!open.length) return;
    open.forEach(q => Sync.setRequest(q.id, { status: 'seen', seen_at: isoIST() }));
    if (!wd.customer_note_seen) mutate(reg, d => { d.customer_note_seen = true });
  },
  reqSeen(id: string) { Sync.setRequest(id, { status: 'seen', seen_at: isoIST() }); ui.haptic(6) },
  reqDone(id: string) { Sync.setRequest(id, { status: 'done', done_at: isoIST() }); ui.haptic([10, 30, 10]); ui.toast(t('Customer ko dikh gaya: kar diya')) },
  // A new customer signed up in front of the washer. One doc per car (the owner approves each); the extra details the
  // security rules have no field for (address, map pin, payment, the other cars of the same customer) travel in `note`.
  async addCar(car: { reg: string; plate: string; model: string; area: string; plan: string; fee: number; customer_name: string; customer_phone: string;
    address?: string; geo?: { lat: number; lng: number } | null; paid?: { method: 'cash' | 'upi'; amount: number } | null; others?: string[] }) {
    const bits: string[] = [];
    if (car.address) bits.push('Addr: ' + car.address.replace(/\s+/g, ' ').slice(0, 120));
    if (car.geo) bits.push(`Map: https://maps.google.com/?q=${car.geo.lat.toFixed(5)},${car.geo.lng.toFixed(5)}`);
    if (car.paid) bits.push(`Paid ${car.paid.method.toUpperCase()} Rs${Math.round(car.paid.amount)}`);
    const note = (bits.join(' | ') + (car.others && car.others.length ? ' | Same customer: ' + car.others.join(', ') : '')).slice(0, 300);
    const doc = {
      reg: car.reg, plate: car.plate, model: car.model, area: (car.area || '').slice(0, 80), plan: car.plan || 'std', fee: Number(car.fee) || 0,
      customer_name: car.customer_name || '', customer_phone: car.customer_phone || '', note, washer_id: me().id,
      added_by: auth.phone() || '', status: 'pending', created_at: isoIST(), updated_at: isoIST(),
    };
    await db.doc('newcars/' + doc.reg).set(doc);
    ui.haptic([20, 50, 20]); ui.confetti(.5); ui.toast(t('Gaadi round pe aa gayi. Manager ko bhej diya'));
  },
  toggleOnline() {
    S.online = !isOnline(); save(); ui.haptic(S.online ? [10, 30, 10] : 12);
    ui.toast(t(S.online ? 'Aap online ho. Naye kaam aayenge' : 'Aap offline ho. Naye kaam nahi aayenge')); emit();
  },
  exClaim(id: string) { Sync.extraSet(id, { washer_id: me().id }); ui.haptic([20, 40, 20]); ui.toast(t('Kaam mila! Shuru karo.')) },
  exStart(id: string) { Sync.extraSet(id, { status: 'doing', started_at: isoIST() }); ui.haptic([20, 40, 20]); ui.toast(t('Shuru. Ab kaam ki photo lo')) },
  exNeedPhoto() { ui.toast(t('Pehle kaam ki photo lo, phir kaam band hoga')); ui.haptic(14) },
  async exPhoto(id: string, url: string) { await Sync.extraSet(id, { photo: url, photo_at: isoIST() }); ui.toast(t('Photo lag gayi. Ab kaam khatam karo')) },
  exDone(id: string) {
    const j = Extra.byId(id); if (!j) return;
    if (!j.photo) { act.exNeedPhoto(); return }
    Sync.extraSet(id, { status: 'done', finished_at: isoIST() }); ui.haptic([20, 40, 20, 40, 60]); ui.confetti(.6);
    ui.toast(t(`Ho gaya. Aapke ₹${Math.round(Money.share(j.price))}`));
  },
  alertAccept() { const j = view.jobAlert; if (j && !j.washer_id) Sync.extraSet(j.id, { washer_id: me().id }); view.jobAlert = null; emit() },
  // only decline an already-assigned job; an unassigned booking is just dismissed
  alertPass() { const j = view.jobAlert; if (j && j.washer_id) Sync.extraSet(j.id, { status: 'declined', declined_at: isoIST() }); view.jobAlert = null; emit() },
  setSelfie(url: string) {
    S.selfie = { date: DAY, washer: me().id, url }; save();
    // show the face on every car still to come today
    route().forEach(c => { const w = W(c.reg); if (w && !['done', 'skipped'].includes(w.status)) mutate(c.reg, () => {}) });
    ui.toast(t('Photo save ho gayi. Customers ko dikhegi.')); ui.confetti(.3); emit();
  },
  setTheme(v: State['theme']) { S.theme = v; save(); emit() },
  setLang(v: Lang) { S.lang = v; S.lang_pref = v; setLang(v); save(); emit() },
  // any language can be picked; until it is translated the app speaks Hindi (Marathi, same script) or Hinglish
  setLangPref(v: LangPref) { act.setLang(v) },
  // last onboarding screen: remember it for this phone, then carry on with the sign-in it was holding back
  async finishOnboarding() {
    const go = afterOnboard;
    if (go) await go();   // a failure (no net) throws and keeps the onboarding up, so the washer can try again
    afterOnboard = null;
    S.onboarded = { ...(S.onboarded || {}), [onboardPhone()]: isoIST() }; save();
    view.onboarding = false; emit();
  },
  flushNow() { view.readOnly = false; refused = 0; Sync.flush(); ui.toast(t('Bhej raha hoon…')) },
  resetDay() {
    Object.keys(S.outbox).forEach(k => { if (k.startsWith(DAY)) delete S.outbox[k] });
    void cancelAllWashAlerts();
    S.day = null; S.current = null; ensureDay(); save(); ui.toast(t('Reset ho gaya')); emit();
  },
  // Logging out wipes this phone's round: customer names/addresses, the outbox and every photo (they all live in S).
  // Unsent updates are sent first; if some still cannot go, only an explicit `discard` (the sheet warned) goes on.
  async logout(discard = false): Promise<boolean> {
    if (outboxSize()) {
      view.readOnly = false; refused = 0;
      await Promise.race([Sync.flush(), new Promise(r => setTimeout(r, 8000))]);
      if (outboxSize() && !discard) { ui.toast(t('Kuch update abhi bheje nahi gaye. Net aane pe phir try karo.')); return false }
    }
    Sync.stop(); stopWatch(); stopKit(); stopGps(); void cancelAllWashAlerts();
    const { theme, lang, lang_pref, onboarded } = S;
    S = { session: null, online: true, theme, lang, lang_pref, onboarded, day: null, outbox: {}, current: null, selfie: null, hist: {}, rounds: {} };
    if (saveT) { clearTimeout(saveT); saveT = null }
    try { await AsyncStorage.setItem(KEY, JSON.stringify(S)) } catch (e) { }
    bookCars = null; R = {}; RT = {}; view.pendingPhotos = {}; view.jobAlert = null; view.readOnly = false;
    if (REAL) { NewCar.mine = []; Object.keys(ROSTER).forEach(k => delete ROSTER[k]) }
    if (REAL) await Promise.race([clearPushToken(), new Promise(r => setTimeout(r, 4000))]);   // needs the sign-in, so before signOut
    await auth.signOut(); view.authStep = 'phone'; emit();
    return true;
  },

  /* ----- sign-in ----- */
  async sendOtp(p10: string) {
    if (!REAL && !PHONE_TO_WASHER[p10]) throw Object.assign(new Error(''), { hi: 'Yeh number washer list mein nahi hai. Office se baat karo.' });
    await auth.send(p10); view.otpPhone = p10; view.authStep = 'otp'; emit();
  },
  // onOk runs once the code is accepted (the screen's success tick), before anything else changes
  async confirmOtp(code: string, onOk?: () => Promise<void>) {
    await auth.confirm(code);
    if (onOk) await onOk().catch(() => {});
    const next = REAL ? afterRealLogin
      : async () => { S.session = { washerId: PHONE_TO_WASHER[view.otpPhone], at: isoIST() }; save(); enterApp() };
    if (!isOnboarded()) { startOnboarding(next); return }
    await next();
  },
  async join(name: string, area: string, ref: string) {
    const phone = auth.phone()!; const doc: Data = { phone, name, area, status: 'pending', created_at: isoIST(), updated_at: isoIST() };
    // the code rides along when the rules accept it; sign-up still goes through without it
    try { await db.doc('washers/' + phone).set(ref ? { ...doc, ref } : doc) }
    catch (e) { if (!ref) throw e; await db.doc('washers/' + phone).set(doc) }
    view.authStep = 'wait'; emit(); watchMe();
  },
  backToPhone() { if (REAL) auth.signOut(); view.onboarding = false; afterOnboard = null; view.authStep = 'phone'; emit() },
  // remember how many cars were done on a day (the Paisa week bars read this)
  noteHist(day: string, n: number) { S.hist = S.hist || {}; if (S.hist[day] !== n) { S.hist[day] = n; save(); emit() } },
};

/* ---------- first-run onboarding: once per phone number, between the OTP and join/wait/in ---------- */
let afterOnboard: (() => Promise<void>) | null = null;
export const onboardPhone = () => (view.otpPhone || (auth.phone() || '').slice(-10) || S.session?.phone || '');
const isOnboarded = () => !!S.onboarded?.[onboardPhone()];
function startOnboarding(next: () => Promise<void>) {
  afterOnboard = next; view.onboarding = true;
  if (view.authStep === 'loading') view.authStep = 'phone';
  emit();
}

/* ---------- real sign-in: washers/{+91number} decides who gets in ---------- */
let meUnsub: Unsub | null = null;
/* ---------- the guided wash: tells the washer the next stage as it starts (voice + toast + buzz) ---------- */
const guided = new Set<string>();   // 'DATE_REG_stageIndex' already announced
export function guideTick() {
  if (!S.day || view.authStep !== 'in') return;
  for (const wd of Object.values(S.day.washes)) {
    if (wd.status !== 'washing' || !wd.started_at) continue;
    const g = guideAt(wd.started_at, Date.now(), wd.interior_from); if (!g) continue;
    const k = S.day.date + '_' + wd.reg + '_' + g.idx;
    if (guided.has(k)) continue;
    guided.add(k);
    // later stages are spoken by the phone's own scheduled alerts (they also work with the app closed); in the app only stage 0, or all if alerts are off
    if (g.idx === 0 || !alertsReady()) ui.speak([g.step.pre || null, nameClip(me().name), g.step.clip]);
    ui.haptic([20, 40, 20]);   // the banner on the car screen shows the stage, so no toast
  }
  lateTick();
}
// cars whose slot is over and which are not done: say the car number, the slot and the line, every 10 minutes (in the app;
// with the app closed the phone plays the scheduled 'kaam nahi hua' notification)
const lastLate: Record<string, number> = {};
function lateTick() {
  const now = Date.now();
  for (const c of route()) {
    if (!Route.isLate(c.reg, now)) continue;
    const w = W(c.reg);
    if (w && !w.overdue_at) mutate(c.reg, d => { d.overdue_at = isoIST() });   // synced: the dashboard and customer can see it
    if (now - (lastLate[c.reg] || 0) < 10 * 60e3) continue;
    lastLate[c.reg] = now;
    const s = Route.slotOf(c.reg); ui.speak([nameClip(me().name), ...lateClips(c.reg, s != null ? slotRange(s).from : null)]);
    ui.toast(t(`${c.reg}: is gaadi par kaam nahi hua`));
  }
}
/* ---------- kit and ID records (profile tab) ---------- */
// IDs and assigned clothes come from the washer's own washers/ doc (admin-written, read-only here);
// the kit list is washerkit/{phone}.items: add-only, the rules refuse any change to an existing item.
export const Kit = { items: [] as KitItem[], photos: {} as Record<string, string>, profile: null as WasherDoc | null, loaded: false };
let kitUnsub: Unsub | null = null, kitPhotoUnsub: Unsub | null = null;
const myDocId = () => (REAL ? auth.phone() : '+91' + (S.session?.phone || me().phone)) || '';
function watchKit() {
  watchDocs();
  const id = myDocId(); if (kitUnsub || !id || id === '+91') return;
  kitUnsub = db.doc('washerkit/' + id).onSnapshot(d => {
    const v = d.exists ? d.data() : null; Kit.items = Array.isArray(v?.items) ? v!.items : []; Kit.loaded = true; emit();
  }, e => console.warn('kit', e));
  // the photos of those items, one doc each: kitphotos/{phone}_{itemId}
  kitPhotoUnsub = db.collection('kitphotos').where('phone', '==', id).onSnapshot(sn => {
    const m: Record<string, string> = {}; sn.docs.forEach(d => { const v = d.data(); if (v?.item && v.photo) m[v.item] = v.photo });
    Kit.photos = m; emit();
  }, e => console.warn('kit photos', e));
}
function stopKit() { stopDocs(); if (kitUnsub) { try { kitUnsub() } catch (e) { } kitUnsub = null } if (kitPhotoUnsub) { try { kitPhotoUnsub() } catch (e) { } kitPhotoUnsub = null } Kit.items = []; Kit.photos = {}; Kit.profile = null; Kit.loaded = false }
export async function addKitItem(kind: KitKind, name: string, qty: number, photo?: string | null): Promise<void> {
  const id = myDocId(); const nm = name.trim().slice(0, 60);
  if (!id || id === '+91' || !nm || !(qty >= 1) || qty > 999) throw Object.assign(new Error('bad'), { hi: 'Naam aur ginti sahi daalo.' });
  const item: KitItem = { id: 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind, name: nm, qty: Math.floor(qty), at: isoIST(), ...(photo ? { has_photo: true } : {}) };
  // photo first (its own doc), then the item that points at it; a failed photo stops the whole add
  if (photo) await db.doc('kitphotos/' + id + '_' + item.id).set({ phone: id, item: item.id, photo, at: item.at });
  // read the latest list first, then write it back with the new item at the end (the rules require the old items untouched)
  const cur = await db.doc('washerkit/' + id).get();
  const items: KitItem[] = cur.exists && Array.isArray(cur.data()?.items) ? cur.data()!.items : [];
  await db.doc('washerkit/' + id).set({ phone: id, items: [...items, item], updated_at: isoIST() });
}
/* ---------- identity documents (Aadhaar front/back, PAN): a photo or a PDF each, washerdocs/{phone}_{kind} ---------- */
// Washers can upload while joining (before approval) and replace until an admin marks one 'verified'.
export type DocKind = 'aadhaar_front' | 'aadhaar_back' | 'pan';
export const DOC_KINDS: { kind: DocKind; label: string }[] = [
  { kind: 'aadhaar_front', label: 'Aadhaar (aage ka)' }, { kind: 'aadhaar_back', label: 'Aadhaar (peeche ka)' }, { kind: 'pan', label: 'PAN card' },
];
export type DocItem = { kind: DocKind; mime: string; name: string; data: string; at: string; status: 'submitted' | 'verified' | 'rejected'; note?: string };
export const Docs = { items: {} as Partial<Record<DocKind, DocItem>>, loaded: false };
let docsUnsub: Unsub | null = null;
export function watchDocs() {
  const id = myDocId(); if (docsUnsub || !id || id === '+91') return;
  docsUnsub = db.collection('washerdocs').where('phone', '==', id).onSnapshot(sn => {
    const m: Partial<Record<DocKind, DocItem>> = {};
    sn.docs.forEach(x => { const v = x.data() as DocItem; if (v?.kind && v.data) m[v.kind] = v });
    Docs.items = m; Docs.loaded = true; emit();
  }, e => console.warn('docs', e));
}
function stopDocs() { if (docsUnsub) { try { docsUnsub() } catch (e) { } docsUnsub = null } Docs.items = {}; Docs.loaded = false }
/** data is a data: URL (image/jpeg, image/webp, image/png or application/pdf), at most ~900 KB; the rules enforce it too. */
export async function uploadDoc(kind: DocKind, mime: string, name: string, data: string): Promise<void> {
  const id = myDocId();
  if (!id || id === '+91') throw Object.assign(new Error('no phone'), { hi: 'Pehle phone number se login karo.' });
  if (data.length > 900000) throw Object.assign(new Error('big'), { hi: 'File bahut badi hai. Chhoti photo ya PDF chuno.' });
  if (Docs.items[kind]?.status === 'verified') throw Object.assign(new Error('locked'), { hi: 'Yeh document verify ho chuka hai, badal nahi sakte.' });
  await db.doc('washerdocs/' + id + '_' + kind).set({ phone: id, kind, mime, name: name.slice(0, 120), data, at: isoIST(), status: 'submitted' });
}
export const clothesHave = () => Kit.items.filter(i => i.kind === 'clothes').reduce((n, i) => n + i.qty, 0);

function stopWatch() { if (meUnsub) { try { meUnsub() } catch (e) { } meUnsub = null } }
function applyWasher(v: WasherDoc | null): AuthStep {
  Kit.profile = v; if (v) watchKit();
  if (!v) return 'join';
  if (v.status === 'blocked') return 'blocked';
  if (v.status !== 'approved') return 'wait';
  if (!v.route_id || !WASHERS[v.route_id]) return 'noround';
  const was = S.session?.real && S.session.washerId;
  S.session = { ...(S.session || {}), real: true, washerId: v.route_id, name: v.name, phone: (auth.phone() || '').slice(-10), since: String(v.decided_at || v.created_at || '2026').slice(0, 4), at: S.session?.at || isoIST() };
  save();
  if (was && was !== v.route_id) { ensureDay(); Book.load() }
  return 'in';
}
function watchMe() {
  const phone = auth.phone(); if (meUnsub || !phone) return;
  meUnsub = db.doc('washers/' + phone).onSnapshot(d => {
    const r = applyWasher(d.exists ? (d.data() as WasherDoc) : null), inApp = view.authStep === 'in';
    if (r === 'in') { if (!inApp) { ui.toast(t('Approve ho gaye! Aaj ka round khul raha hai')); ui.haptic([20, 60, 20]); ui.confetti(.6); enterApp() } else emit() }
    else if (r !== 'join') { if (inApp) { Sync.stop(); S.session = { ...S.session!, washerId: null }; save() } view.authStep = r; emit() }
  }, e => console.warn('washer doc', e));
}
async function afterRealLogin() {
  let v: WasherDoc | null = null;
  try { const d = await db.doc('washers/' + auth.phone()).get(); v = d.exists ? (d.data() as WasherDoc) : null }
  catch (e) { throw Object.assign(new Error(''), { hi: 'Internet dekh ke dobara try karo.' }) }
  const r = applyWasher(v);
  if (r === 'in') { enterApp(); watchMe() } else { view.authStep = r; emit(); if (r !== 'join') watchMe() }
}
function enterApp() {
  void setupWashAlerts().then(() => scheduleMorningAlarm());   // asks for notification + exact-alarm permission up front (installed app only), then the 5:00 alarm
  watchKit();
  view.authStep = 'in'; ensureDay(); emit();
  if (MODE === 'demo') demoExtras();   // seeded before listening, so the sample jobs do not pop up as new
  Book.load();
  Sync.listen();
  if (REAL) { startGps(); void registerPushToken() }
}

/* ---------- live location for the customer's map (installed app only) ---------- */
let gpsSub: { remove(): void } | null = null;
async function startGps() {
  if (gpsSub) return;
  try {
    const Location = await import('expo-location');
    const p = await Location.requestForegroundPermissionsAsync(); if (p.status !== 'granted') return;
    gpsSub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 25 }, pos => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      db.doc('locations/' + me().id).set({ lat, lng, accuracy, washer_id: me().id, updated_at: isoIST() }).catch(e => console.warn('gps write', e));
    });
  } catch (e) { console.warn('gps', e) }
}
function stopGps() {
  if (gpsSub) { gpsSub.remove(); gpsSub = null }
  if (REAL) db.doc('locations/' + me().id).delete().catch(() => {});
}

/* ---------- demo only: play the customer's side so the preview shows the whole loop ---------- */
let demoDone = false;
function demoExtras() {
  if (demoDone || !S.session) return; demoDone = true; const rs = route(); if (rs.length < 5) return;
  const y = addDaysStr(DAY, -1);
  const reqs: Data[] = [
    { reg: rs[0].reg, kind: 'note', text: 'Aaj boot ke andar bhi thoda saaf kar dena, mitti hai.', spots: [], created_at: DAY + 'T05:48:00+05:30', status: 'open' },
    { reg: rs[2].reg, kind: 'rewash', text: 'Kal roof pe daag reh gaye the.', spots: ['Roof', 'Peeche ka sheesha'], created_at: y + 'T19:10:00+05:30', status: 'open' },
    { reg: rs[4].reg, kind: 'skip_tomorrow', text: 'Kal gaadi garage mein hai.', spots: [], created_at: y + 'T21:30:00+05:30', status: 'open' },
  ];
  reqs.forEach((r, i) => db.doc('requests/demo' + (i + 1)).set(r));
  const id = me().id;
  // demo kit and ID records (in the live app the profile comes from the admin-written washers/ doc)
  Kit.profile = { phone: myDocId(), name: me().name, status: 'approved', assigned_clothes: 12, aadhaar_last4: '4821', aadhaar_verified_at: y, pcc: { status: 'clear', verified_at: addDaysStr(DAY, -20), ref: 'PCC/DL/2026/0457' } };
  db.doc('washerkit/' + myDocId()).set({ phone: myDocId(), updated_at: y + 'T09:00:00+05:30', items: [
    { id: 'kd1', kind: 'clothes', name: 'Microfiber kapde', qty: 8, at: y + 'T09:00:00+05:30' },
    { id: 'kd2', kind: 'shampoo', name: 'Car shampoo 1L', qty: 2, at: y + 'T09:00:00+05:30' },
    { id: 'kd3', kind: 'spray_gun', name: 'Foam spray gun', qty: 1, at: y + 'T09:00:00+05:30' }] });
  db.doc('ondemand/demoA').set({ washer_id: id, status: 'new', service: 'Interior deep clean', price: 799, car: 'Hyundai i20', area: 'GH-9 Paschim Vihar', customer_name: 'Pooja S.', phone: '9811009090', note: 'Seat pe coffee gir gayi thi', date: DAY, created_at: DAY + 'T07:10:00+05:30' });
  db.doc('ondemand/demoB').set({ washer_id: id, status: 'done', service: 'Foam wash', price: 399, car: 'Maruti Baleno', area: 'Meera Bagh', customer_name: 'Rakesh', date: addDaysStr(DAY, -2), finished_at: addDaysStr(DAY, -2) + 'T09:20:00+05:30', photo: '' });
  // a customer books a one-off wash a little later: the alert pops up
  setTimeout(() => db.doc('ondemand/demoC').set({ washer_id: '', status: 'new', service: 'Pressure wash (one-time)', price: 499, car: 'Kia Sonet', area: 'GH-6 Paschim Vihar', customer_name: 'Neeraj', phone: '9811007777', created_at: isoIST() }), 25000);
  // last week's washes, for the Paisa tab's bars and month total
  for (let i = 1; i <= 6; i++) {
    const d = addDaysStr(DAY, -i);
    rs.forEach((c, k) => { if ((k + i) % 7 !== 0) db.doc('washes/' + d + '_' + c.reg).set({ date: d, reg: c.reg, washer_id: id, status: 'done', updated_at: d + 'T08:00:00+05:30' }) });
  }
}

/* ---------------- boot ---------------- */
let started = false;
export async function boot() {
  if (started) return; started = true;
  try { const x = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null'); if (x && typeof x === 'object') S = Object.assign(S, x) } catch (e) { }
  S.rounds = S.rounds || {}; S.outbox = S.outbox || {};
  setLang(S.lang || 'hinglish');
  view.syncMode = MODE;
  booted = true;
  if (REAL) {
    // a saved test login (OTP 1234) is not a real sign-in
    if (S.session && !S.session.real) { S.session = null; save() }
    const phone = await auth.ready();
    if (S.session && (!phone || phone.slice(-10) !== S.session.phone)) { S.session = null; save() }
    if (S.session && WASHERS[S.session.washerId || '']) { enterApp(); watchMe() }
    else if (phone && !isOnboarded()) startOnboarding(afterRealLogin);   // the app was closed half-way through onboarding
    else if (phone) { try { await afterRealLogin() } catch (e) { view.authStep = 'phone' } }
    else view.authStep = 'phone';
  } else if (S.session && WASHERS[S.session.washerId || '']) enterApp();
  else view.authStep = 'phone';
  emit();
  // keep sending what is waiting; a new day starts a new round
  setInterval(() => { if (Object.keys(S.outbox).length) Sync.flush() }, 20000);
  setInterval(guideTick, 3000);
  setInterval(() => {
    const d = dateIST();
    if (d !== DAY && view.authStep === 'in') { DAY = d; RT = {}; ensureDay(); Book.load(); Sync.listen(); emit() }
  }, 60000);
}
export const onForeground = () => { Sync.flush() };

/* ---------------- sync status, as the chip shows it ---------------- */
export function syncState(): ['connecting' | 'demo' | 'wait' | 'offline' | 'live', string, string] {
  const n = Object.keys(S.outbox).length;
  if (view.syncMode === 'connecting') return ['connecting', 'Jud raha hai', 'Customer app se jud raha hai'];
  if (view.syncMode === 'demo') return ['demo', 'Demo', 'Demo mode. Is preview mein customer app se sync nahi hota.'];
  if (view.readOnly) return ['wait', 'Sirf phone pe', 'Is account ko likhne ki permission nahi. Round is phone pe safe hai.'];
  if (!view.netOk) return ['offline', `Net nahi · ${n}`, `Net nahi hai. ${n} update phone pe ruke hain, net aate hi jayenge.`];
  if (n) return ['wait', `Bhej raha · ${n}`, `${n} update customer tak jaa rahe hain`];
  return ['live', 'Live', 'Live. Har tap customer ke phone pe turant dikhta hai.'];
}
export const outboxSize = () => Object.keys(S.outbox).length;
export const planName = (c: Car) => PLAN[c.plan]?.name || 'WD Standard';
/** The attendance log behind the monthly rewards (read-only view). */
export const attendLog = (): Attend => S.attend || {};
