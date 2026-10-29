/* App state and every action that changes it. Ported from the web app's script (customer/index.html).
   Contract for screens and sheets:
   - useApp() re-renders the caller on any change and returns the UI state {tab, tabNonce, theme, ready}.
   - Read S (persisted), A() account, car() selected car, doc(c) today's wash doc, plus the view helpers below
     (banners, todaySteps, history7, calendar, usage, ...). Treat everything read as read-only; change things only
     through act.* so the change is saved and redrawn.
   - act.* return promises; on failure they throw an Error whose message is ready to show in a toast.
   - UI hosts toast/openSheet/closeSheet/confetti/haptic come from ./ui/hosts and are re-exported here.
   Only this file and ./backend talk to Firebase, Cashfree, the n8n webhooks or storage. */
import { useSyncExternalStore } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { backend } from './backend/firebase';
import { cashfreeCheckout, CASHFREE_AVAILABLE } from './backend/cashfree';
import type { Db, Unsub } from './backend/types';
import { TODAY, refreshToday, iso, parse, addDays, fmt, inr, nowIST, hm, ampm, t2m, m2t, wait } from './data/dates';
import { PLANS, PRODUCTS, SERVICES, WASHER_FOR, AREA_COORDS, SUPPORT_PHONE, PlanId } from './data/reference';
import {
  Account, Car, Session, WashDoc, DEMO_PHONE, sampleAccount, fromCustomerDoc, regOf, planOf, maskPlate, extras, weekPlan,
  LABEL, TASK_LABEL, TASK_SUB, isPaused, canPause, pauseLog, pauseFits, startOf, startTxt, makeDoc, fromContract, planTasks,
  activeStage, chipText, hash, daysLeftOf, STAGES,
} from './data/model';
import { toast, openSheet, closeSheet, sheetOpen, confetti, haptic } from './ui/hosts';
export { toast, openSheet, closeSheet, confetti, haptic };

/* ---------- config ---------- */
const N8N = 'https://n8n.washingdaddy.com/webhook';
// Live payments: this flag plus SANDBOX in the n8n order node (see pay/README.md)
const PAY_LIVE = true;
export const REAL = !!backend;                 // phone app on Firebase; false in the preview (test data, OTP 1234)
export const OTP_N = REAL ? 6 : 4;
const DB: Db | null = backend ? backend.db : null;
const AUTH = backend ? backend.auth : null;

/* ---------- persisted state ---------- */
export type ThemePick = 'light' | 'dark' | 'system';
type Persist = { session: Session | null; acct: Account | null; carIdx: number; cart: Record<string, number>; theme: ThemePick };
export let S: Persist = { session: null, acct: null, carIdx: 0, cart: {}, theme: 'light' };
const KEY = 'wd-app-v2';
let saveT: any = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(() => {}) }, 120) }
async function load() {
  try { const x = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null'); if (x && typeof x === 'object') S = Object.assign(S, x) } catch (e) {}
}

/* ---------- UI state + change notification ---------- */
export type Tab = 'home' | 'live' | 'plan' | 'store' | 'profile';
export const TABS: Tab[] = ['home', 'live', 'plan', 'store', 'profile'];
type UI = { tab: Tab; tabNonce: number; ready: boolean; signedIn: boolean; carNonce: number; sim: boolean; v: number };
let ui: UI = { tab: 'home', tabNonce: 0, ready: false, signedIn: false, carNonce: 0, sim: false, v: 0 };
const subs = new Set<() => void>();
function emit() { ui = { ...ui, v: ui.v + 1, signedIn: !!(S.session && S.acct) }; subs.forEach(f => f()) }
export function commit() { save(); emit() }
export function useApp() { return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => ui, () => ui) }
export function go(t: Tab) { if (t === ui.tab) { ui = { ...ui, tabNonce: ui.tabNonce + 1 }; emit(); return } haptic(); ui = { ...ui, tab: t }; emit() }

/* ---------- getters ---------- */
export const A = () => S.acct as Account;
export const car = () => A().cars[Math.min(S.carIdx, A().cars.length - 1)];
export const realAcct = () => !!(S.session && S.session.real);
export const payReal = () => PAY_LIVE && realAcct() && CASHFREE_AVAILABLE;
export const carImg = (c: Car): string | null => c.photo || c.img || null;   // an IMG key or a data/https URI; pass through img.src()
export const daysLeft = (c: Car) => daysLeftOf(c, realAcct());
export const pName = (p: { name: string; fit?: boolean }) => p.fit ? `${car().name} ${p.name}` : p.name;
export const refCode = () => (A().name.split(' ')[0] || 'WD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) + '200';
export const cartCount = () => Object.values(S.cart).reduce((a, b) => a + b, 0);
export const greeting = () => { const hr = new Date(Date.now() + 5.5 * 3600e3).getUTCHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening' };
export const fmtPhone = (p: string) => p.replace(/(\d{5})(\d+)/, '$1 $2');
export { maskPlate, planOf, regOf, chipText, activeStage, startTxt, startOf, canPause, isPaused, extras, weekPlan, LABEL, TASK_LABEL, TASK_SUB, STAGES };

/* ---------- wash data ---------- */
let REMOTE: Record<string, WashDoc[]> = {}, REQS: Record<string, any[]> = {}, DOCS: Record<string, WashDoc> = {};
let SIM: { carId: string; doc: WashDoc; t?: any } | null = null;
export const syncLive = () => !!DB && realAcct();
export function doc(c: Car = car()): WashDoc {
  if (SIM && SIM.carId === c.id) return SIM.doc;
  const r = (REMOTE[c.id] || []).find(d => d.date === iso(TODAY) || (c.status === 'new' && d.date === iso(addDays(TODAY, 1))));
  if (r) return r;
  // a real account with no washer record for today: nothing has happened yet, so nothing is shown
  if (realAcct() && c.status !== 'new') return { date: iso(TODAY), reg: regOf(c), car_label: c.name, washer: { name: c.washer }, photos: [], status: 'scheduled', eta: null, first: true, notStarted: true, tasks: [], washer_note: null, water_litres: null, customer_note_seen: false, remote: false };
  return DOCS[c.id] || (DOCS[c.id] = makeDoc(c));
}
export const requestsFor = (c: Car) => REQS[c.id] || [];

/* ---------- view helpers (what each screen draws) ---------- */
export type Banner = { icon: string; tint: string; title: string; sub: string; btn: string; act: () => void };
export function banners(): Banner[] {
  const c = car(), b: Banner[] = [], a = A();
  if (c.status === 'new' && !c.till) b.push({ icon: '🧾', tint: 'rgba(255,186,8,.2)', title: 'Pay after your first wash', sub: `${planOf(c).name}, ${inr(planOf(c).price)} a month`, btn: 'Pay now', act: () => sheetHooks.payPlan() });
  if (c.paused && c.paused.to >= iso(TODAY)) b.push({ icon: '⏸', tint: 'rgba(46,139,255,.18)', title: `Washes paused ${fmt(c.paused.from)} – ${fmt(c.paused.to)}`, sub: 'The days are added to your plan', btn: 'Resume', act: () => act.resume().catch(e => toast(e.message)) });
  const d = doc(c); if (activeStage(d)) b.unshift({ icon: '●', tint: 'rgba(255,186,8,.25)', title: 'Live now', sub: chipText(c, d), btn: 'Watch', act: () => go('live') });
  const seen = requestsFor(c).filter(r => r.kind === 'note').sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
  if (c.note) b.push({ icon: '✎', tint: 'rgba(255,106,26,.18)', title: `Note for ${c.washer}${seen && seen.status === 'done' ? ' · handled ✓' + (seen.done_at ? ' ' + ampm(hm(seen.done_at)) : '') : seen && seen.status === 'seen' ? ' · seen ✓' + (seen.seen_at ? ' ' + ampm(hm(seen.seen_at)) : '') : ''}`, sub: c.note, btn: 'Edit', act: () => sheetHooks.note() });
  a.bookings.filter(x => x.carId === c.id && x.date >= iso(TODAY)).forEach(x => b.push({ icon: '✦', tint: 'rgba(84,9,218,.15)', title: `One-time ${x.type} wash`, sub: `${fmt(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${x.slot}`, btn: 'Details', act: () => sheetHooks.bookings() }));
  a.orders.filter(o => o.status !== 'Delivered').forEach(o => b.push({ icon: '📦', tint: 'rgba(20,192,138,.16)', title: `Order ${o.id} arrives tomorrow`, sub: `${o.items.length} item${o.items.length > 1 ? 's' : ''}, with ${car().washer}'s wash`, btn: 'View', act: () => sheetHooks.orders() }));
  a.requests.filter(r => r.carId === c.id && r.open).forEach(r => b.push({ icon: '↺', tint: 'rgba(232,56,79,.14)', title: `${c.washer} is coming back`, sub: `Re-wash of ${r.spots.join(', ').toLowerCase()} by 11 AM`, btn: 'OK', act: () => act.closeReq(r.id) }));
  return b;
}
// The steps under "Today's wash": [label, sub, 'done'|'later', done_at]
export function todaySteps(c: Car = car()): [string, string, 'done' | 'later', string | null | undefined][] {
  const k = extras(c, TODAY), steps: [string, string, 'done' | 'later', string | null | undefined][] = doc(c).tasks.map(t => [t.label, TASK_SUB[t.key] || '', t.done ? 'done' : 'later', t.done_at]);
  for (let i = 1; i < 7; i++) { const d = addDays(TODAY, i), nk = extras(c, d).filter(x => !k.includes(x)); if (nk.length) { steps.push([LABEL[nk[0]], 'Next on ' + fmt(d, { weekday: 'long' }), 'later', null]); break } }
  return steps;
}
// Live headline and line under it
export function liveHead(c: Car = car()) {
  const d = doc(c), w = d.washer?.name || c.washer, done = d.tasks.filter(t => t.done).length, nowTask = d.tasks.find(t => !t.done);
  const big = d.notStarted ? startTxt(c) : ({ scheduled: d.first ? 'First wash tomorrow' : `${w} comes at ${ampm(d.eta) || '6:30 AM'}`, on_the_way: `${w} is on the way`, arrived: `${w} is at your car`, washing: `Washing · ${done} of ${d.tasks.length}`, done: `Done in ${d.minutes} min`, skipped: 'No wash today' } as Record<string, string>)[d.status];
  const s0 = startOf(c);
  const sub = d.notStarted ? (s0 && TODAY < s0 ? 'Your washer comes between 6 and 7:30 AM. Live updates start the moment they leave.' : 'Live updates start the moment your washer leaves for your car.')
    : ({ scheduled: 'Each step shows up here the moment it happens.', on_the_way: `Arriving around ${ampm(d.eta)}.`, arrived: `Reached at ${ampm(d.arrived_at)}. Wash starts in a minute.`, washing: `Started at ${ampm(d.started_at)}. Now: ${nowTask ? nowTask.label.toLowerCase() : 'finishing up'}.`, done: `Finished at ${ampm(d.finished_at)}${d.water_litres ? ` · ${d.water_litres} L of water, no pocha` : ''}.`, skipped: d.skip_reason || 'Your washer marked today as skipped.' } as Record<string, string>)[d.status];
  const si = d.status === 'skipped' ? -1 : STAGES.indexOf(d.status);
  return { big, sub, stage: si, washer: w, doc: d };
}
// Timeline rows on Live: state 'done'|'now'|'todo', icon, title, sub, time "HH:MM"
export type TLRow = { st: 'done' | 'now' | 'todo'; icon: string; title: string; sub: string; at: string | null | undefined };
export function timeline(c: Car = car()): TLRow[] {
  const d = doc(c), w = d.washer?.name || c.washer, nowTask = d.tasks.find(t => !t.done), rows: TLRow[] = [];
  const st = (cond: any, isNow: boolean): TLRow['st'] => cond ? 'done' : isNow ? 'now' : 'todo';
  if (d.notStarted) return [{ st: 'todo', icon: '🗓', title: startTxt(c), sub: 'Your washer will show each step here', at: null }];
  if (d.status === 'skipped') return [{ st: 'done', icon: '⏸', title: 'No wash today', sub: d.skip_reason || '', at: null }];
  rows.push({ st: st(d.on_the_way_at, d.status === 'scheduled' && !d.first), icon: '🛵', title: `${w} set off`, sub: 'Riding over with the pressure washer', at: d.on_the_way_at });
  rows.push({ st: st(d.arrived_at, d.status === 'on_the_way'), icon: '📍', title: 'Reached your car', sub: c.parking, at: d.arrived_at });
  if (c.note) rows.push({ st: st(d.customer_note_seen || d.status === 'done', false), icon: '✎', title: 'Read your note', sub: `"${c.note}"`, at: d.customer_note_seen ? d.arrived_at : null });
  d.tasks.forEach(t => rows.push({ st: t.done ? 'done' : d.status === 'washing' && t === nowTask ? 'now' : 'todo', icon: t.done ? '✓' : '', title: t.label, sub: TASK_SUB[t.key] || '', at: t.done_at }));
  rows.push({ st: st(d.status === 'done', false), icon: '✦', title: d.status === 'done' ? `Finished in ${d.minutes} min` : 'Finished', sub: 'Photo sent here and on WhatsApp', at: d.finished_at });
  return rows;
}
// Last 7 mornings: [date, title, sub]
export function history7(c: Car = car()): [Date, string, string][] {
  const remote = REMOTE[c.id] || [], h: [Date, string, string][] = [];
  for (let i = 1; i <= 7; i++) {
    const dt = addDays(TODAY, -i), r = remote.find(x => x.date === iso(dt));
    if (c.status === 'new') break;
    if (realAcct() && !r) continue;
    if (r) { h.push([dt, r.status === 'skipped' ? (r.skip_reason || 'Skipped') : `${r.washer?.name || c.washer} · ${ampm(r.finished_at)} · ${r.minutes} min`, r.tasks.filter(t => !['pressure', 'dry'].includes(t.key)).map(t => t.label).join(', ')]); continue }
    if (isPaused(c, dt)) { h.push([dt, 'Paused by you', '']); continue }
    const ex = planTasks(c, dt).filter(k => !['pressure', 'dry'].includes(k)).map(k => TASK_LABEL[k]), f = t2m('06:36') + ((hash(c.plate + i) % 9) - 4);
    h.push([dt, `${c.washer} · ${ampm(m2t(f))} · ${9 + (hash(c.plate + i) % 4)} min`, ex.join(', ')]);
  }
  return h;
}
// The month calendar on Home: one cell per day; washed days can be tapped (act: dayDetail)
export type CalCell = { d: number; date: string; washed: boolean; extra: boolean; paused: boolean; today: boolean } | null;
export function calendar(c: Car = car()): { month: string; cells: CalCell[] } {
  const y = TODAY.getFullYear(), mo = TODAY.getMonth(), off = (new Date(y, mo, 1).getDay() + 6) % 7, dim = new Date(y, mo + 1, 0).getDate(), td = TODAY.getDate();
  const real = realAcct(), s0 = startOf(c), rem = REMOTE[c.id] || [], cells: CalCell[] = Array(off).fill(null);
  for (let d = 1; d <= dim; d++) {
    const dt = new Date(y, mo, d), p = isPaused(c, dt);
    // a real account only colours washes that really happened
    const washed = real ? d <= td && !!s0 && dt >= s0 && !!rem.find(x => x.date === iso(dt) && x.status === 'done') : d <= td && c.status !== 'new' && !p;
    cells.push({ d, date: iso(dt), washed, extra: washed && extras(c, dt).some(k => k !== 'tyre'), paused: p, today: d === td });
  }
  return { month: fmt(TODAY, { month: 'long' }), cells };
}
// This week strip: Monday first
export function week(c: Car = car()) {
  const mon = addDays(TODAY, -((TODAY.getDay() + 6) % 7)), ti = (TODAY.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => { const dt = addDays(mon, i), p = isPaused(c, dt); return { label: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'][i], d: dt.getDate(), today: i === ti, paused: p, dots: p ? [] : extras(c, dt) } });
}
// Plan tab: usage this month [label, used, of, colourKey]
export function usage(c: Car = car()) {
  const f = planOf(c).f, used = c.status === 'new' ? 0 : 1, td = TODAY.getDate();
  let N: Record<string, number> | null = null;
  if (realAcct()) { N = { pressure: 0, interior: 0, foam: 0, tyre: 0, detailing: 0 }; (REMOTE[c.id] || []).forEach(d => { if (d.status !== 'done') return; N!.pressure++; (d.tasks || []).forEach(t => { if (t.done && N![t.key] !== undefined) N![t.key]++ }) }) }
  const pick = (k: string, fake: number) => N ? N[k] : fake;
  const cols: [string, number, number, 'violet' | 'orange' | 'sky' | 'gold' | 'mint'][] = [
    ['Pressure washes', pick('pressure', td), 30, 'violet'], ['Interior', pick('interior', Math.round(f.int * td / 7)), Math.round(f.int * 30 / 7), 'orange'],
    ['Foam wash', pick('foam', Math.round(f.foam * td / 7)), Math.round(f.foam * 30 / 7), 'sky'],
    f.det ? ['Detailing', pick('detailing', f.det >= 16 ? 8 : Math.floor(f.det / 2)), f.det >= 16 ? 17 : f.det, 'gold'] : ['Tyre & trim', pick('tyre', Math.min(Math.round(f.tyre * 30 / 7), Math.round(f.tyre * td / 7))), Math.round(f.tyre * 30 / 7), 'mint']];
  const range = realAcct() && c.start ? `From ${fmt(startOf(c)!, { day: 'numeric', month: 'short' })}` : `1–${td} ${fmt(TODAY, { month: 'short' })}`;
  return { range, hidden: c.status === 'new', cols: cols.map(u => ({ label: u[0], used: u[1] * used, of: u[2], color: u[3] })) };
}
export function planStatus(c: Car = car()): [string, string, string] {
  const left = daysLeft(c);
  return c.status === 'new' && !c.till ? ['Starts tomorrow', '#FFBA08', '#1A0A33'] : (left ?? 0) <= 3 ? ['Due soon', '#FF6A1A', '#fff'] : ['Active', '#14C08A', '#fff'];
}
// what paying for the plan moves the paid-up date to
export function planPayDates(c: Car = car()) { const from = c.till ? parse(c.till) : addDays(TODAY, 1), nt = new Date(from); nt.setMonth(nt.getMonth() + 1); return { from, to: nt } }
export function switchQuote(id: PlanId, c: Car = car()) {
  const np = PLANS.find(p => p.id === id)!, cp = planOf(c), left = c.till ? Math.max(0, Math.round((parse(c.till).getTime() - TODAY.getTime()) / 864e5)) : 0;
  return { np, cp, left, up: np.price > cp.price, diff: Math.max(0, Math.round((np.price - cp.price) * left / 30)) };
}
export function dayDetail(date: string, c: Car = car()) {
  const dt = parse(date), w = extras(c, dt), paused = isPaused(c, dt);
  return { title: fmt(dt, { weekday: 'long', day: 'numeric', month: 'long' }), paused, washer: c.washer, steps: ['Pressure wash', ...w.map(k => LABEL[k]), 'Dried by hand'], time: ['6:38', '6:41', '6:44', '6:36', '6:42'][+date.slice(-2) % 5] + ' AM' };
}
export const homeRail = () => PRODUCTS.filter(p => ['cover', 'ceramic', 'perfume', 'mats', 'micro'].includes(p.id));
export const totals = () => { const a = A(), w = a.cars.reduce((s, x) => s + x.washes, 0); return { washes: w, litres: w * 7, streak: Math.max(0, ...a.cars.map(x => x.streak)) } };
export function cartLines() {
  const ids = Object.keys(S.cart).filter(k => S.cart[k]);
  const lines = ids.map(k => { const p = PRODUCTS.find(x => x.id === k)!; return { p, q: S.cart[k], total: p.price * S.cart[k] } });
  const sub = lines.reduce((s, l) => s + l.total, 0), mrp = lines.reduce((s, l) => s + l.p.mrp * l.q, 0);
  return { lines, sub, save: mrp - sub };
}

/* ---------- sheets the state layer opens itself (banners); the sheets module registers these ---------- */
export const sheetHooks = { payPlan: () => {}, note: () => {}, bookings: () => {}, orders: () => {} };

/* ---------- requests to the washer: requests/{id}, read live by the washer app ---------- */
async function sendRequest(body: object) {
  if (!DB || !realAcct()) { await wait(500); return }
  const w = DB.collection('requests').doc().set({ ...body, created_at: nowIST(), status: 'open' });
  // an offline write is kept by Firestore and goes out later: say it's sent after 5 s either way
  try { await Promise.race([w, wait(5000)]) } catch (e) { console.warn('request', e); throw new Error(`That didn't go through. Call or WhatsApp us on 77018 08924.`) }
}

/* ---------- payments ---------- */
// The payment server (n8n workflow 8) prices every order itself. Amount here is only shown; the app never marks itself paid.
async function pay(kind: string, d: { amt: number; what: string; [k: string]: any }) {
  if (!payReal()) { await wait(1100); return { ref: 'CF' + Date.now().toString().slice(-8), pending: false } }
  const c = car(), a = A();
  let j: any = null, ok = false;
  try {
    const r = await fetch(N8N + '/wd-pay-order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: d.amt, name: a.name || '', phone: AUTH!.phone10(), car: c.name, num: c.plate, area: c.area || a.area || '', kind, label: d.what,
        planId: d.planId, toPlan: d.toPlan, fromPlan: d.fromPlan, till: d.till, items: d.items, service: d.service, page: 'app' }) });
    ok = r.ok; j = await r.json().catch(() => null);
  } catch (e) { throw new Error("Payment didn't go through. Nothing was charged.") }
  if (!ok || !j || !j.paymentSessionId) throw new Error(j && j.message ? j.message + ' Nothing was charged.' : "Payment didn't go through. Nothing was charged.");
  try { await cashfreeCheckout(j.paymentSessionId, j.orderId || j.order_id) }
  catch (e: any) { throw new Error(e && e.cancelled ? 'Payment cancelled. Nothing was charged.' : "Payment didn't go through. Nothing was charged.") }
  return { ref: j.orderId || j.order_id || '', pending: true };
}
// After a payment the book is the truth, not the app: the webhook moves the paid-up date a second or two later
async function pollPaidTo(c: Car, was: string) {
  if (!payReal() || !c.plate) return;
  for (let i = 0; i < 10; i++) {
    await wait(i < 3 ? 1500 : 4000);
    let j: any = null;
    try { const r = await fetch(N8N + '/wd-pay-lookup?car=' + encodeURIComponent(c.plate), { cache: 'no-store' } as any); j = await r.json() } catch (e) { continue }
    if (j && j.found && j.paidTo && j.paidTo !== was) {
      c.till = j.paidTo; const p = A().payments.slice(-1)[0]; if (p) p.pending = false;
      commit(); toast('Payment confirmed. Covered till ' + fmt(parse(j.paidTo))); return;
    }
  }
}
// -> {pending}: pending means the money is with Cashfree and the plan updates by itself once it clears
async function checkout(kind: string, amt: number, what: string, via: string, extra: object = {}) {
  const r = await pay(kind, { amt, what, ...extra });
  A().payments.push({ d: iso(TODAY), what, amt, via: payReal() ? 'Cashfree' : via, ref: r.ref, pending: !!r.pending && kind === 'plan' });
  return r;
}

/* ---------- sync: washes and requests for the selected car, the account doc, car photos ---------- */
let subFor: string | null = null, unsubs: Unsub[] = [], acctUnsub: Unsub | null = null, photoUnsubs: Unsub[] = [], lastStatus: Record<string, string> = {};
const stop = (l: Unsub[]) => { l.forEach(u => { try { u() } catch (e) {} }); l.length = 0 };
function subscribeCar() {
  if (!DB || !S.acct || !realAcct()) return; const c = car(); if (subFor === c.id) return;
  stop(unsubs); subFor = c.id; const reg = regOf(c), id = c.id;
  unsubs.push(DB.collection('washes').where('reg', '==', reg).onSnapshot(docs => {
    REMOTE[id] = docs.map(d => fromContract(d.data())).sort((x, y) => String(y.date).localeCompare(String(x.date)));
    if (car().id === id && !SIM) { emit(); toastStatus(id) }
  }, e => console.warn('washes', e)));
  unsubs.push(DB.collection('requests').where('reg', '==', reg).onSnapshot(docs => { REQS[id] = docs.map(d => ({ id: d.id, ...d.data() })); if (car().id === id) emit() }, () => {}));
}
function toastStatus(id: string) {
  const d = doc(car()), k = d.status + '|' + d.tasks.filter(t => t.done).length;
  if (lastStatus[id] && lastStatus[id] !== k && d.remote) { toast(chipText(car(), d)); haptic(); if (d.status === 'done') confetti() }
  lastStatus[id] = k;
}
function watchAccount() {
  if (acctUnsub) { try { acctUnsub() } catch (e) {} acctUnsub = null }
  if (!DB || !AUTH || !S.session || !AUTH.phone()) return;
  watchCarPhotos();
  acctUnsub = DB.doc('customers/' + AUTH.phone()).onSnapshot(g => {
    if (!g.exists || !S.acct) return; const was = S.acct.status;
    S.acct = fromCustomerDoc(g.data(), S.acct); S.carIdx = Math.min(S.carIdx, S.acct.cars.length - 1); subFor = null; subscribeCar(); commit(); watchCarPhotos();
    if (was && was !== 'active' && S.acct.status === 'active') toast("You're all set. Live wash updates are on.");
  }, () => {});
}
// photos live in carphotos/{+91number}_{carId}, so the customer can add one without touching the account doc
function watchCarPhotos() {
  stop(photoUnsubs); if (!DB || !AUTH || !realAcct() || !AUTH.phone() || !S.acct) return;
  A().cars.forEach(x => { const cid = x.id; photoUnsubs.push(DB.doc('carphotos/' + AUTH.phone() + '_' + cid).onSnapshot(g => {
    const t = A().cars.find(q => q.id === cid), v = g.exists ? g.data().photo : null;
    if (t && v && t.photo !== v) { t.photo = v; commit() } }, () => {})) });
}
function stopSync() { stop(unsubs); stop(photoUnsubs); subFor = null; if (acctUnsub) { try { acctUnsub() } catch (e) {} acctUnsub = null } REMOTE = {}; REQS = {}; DOCS = {}; lastStatus = {} }
function renderAll() { if (!SIM) DOCS = {}; subscribeCar(); emit() }

/* ---------- boot ---------- */
export async function boot() {
  await load();
  // older saves showed masked plates; keep the full number and mask it only on screen
  if (S.acct) S.acct.cars.forEach(c => { if (c.plate === 'DL 4C •• 2731') c.plate = 'DL 4C AB 2731'; if (c.plate === 'DL 3C •• 0419' || c.plate === 'DL 3C AF 0419') c.plate = 'DL 3C BK 0419' });
  // a saved test login has no place in the real app, and the other way round
  if (S.session && S.session.real !== REAL) { S.session = null; S.acct = null; S.carIdx = 0 }
  ui = { ...ui, ready: true }; renderAll();
  AppState.addEventListener('change', st => { if (st === 'active' && refreshToday() && !sheetOpen()) renderAll() });
  if (REAL && S.session && AUTH) {
    // the Firebase sign-in is the session: lost or a different number goes back to sign-in
    await AUTH.ready();
    if (!AUTH.phone() || AUTH.phone10() !== S.session.phone) { S.session = null; S.acct = null; S.carIdx = 0; stopSync(); commit(); return }
    watchAccount(); subscribeCar();
  }
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
const failed = () => new Error("That didn't go through. Call or WhatsApp us on 77018 08924.");
export const act = {
  /* --- sign-in --- */
  async sendOtp(phone10: string) {
    if (!/^[6-9]\d{9}$/.test(phone10)) throw new Error('Enter a 10-digit mobile number.');
    if (AUTH) { await AUTH.send(phone10); return } await wait(700);
  },
  // -> 'in' (account found, signed in) or 'new' (go through sign-up)
  async verifyOtp(phone10: string, code: string): Promise<'in' | 'new'> {
    let customer: Account | null = null, token = 'test-' + phone10;
    if (AUTH && DB) {
      const u = await AUTH.confirm(code); token = u.uid;
      try { const g = await DB.doc('customers/' + AUTH.phone()).get(); if (g.exists) customer = fromCustomerDoc(g.data(), S.acct) } catch (e) { console.warn(e) }
    } else { await wait(700); if (code !== '1234') throw new Error('That code is wrong. Try 1234 in this test version.'); if (phone10 === DEMO_PHONE) customer = sampleAccount() }
    if (!customer) { pendingSignup = { token, phone: phone10 }; return 'new' }
    S.session = { token, phone: phone10, real: REAL }; S.acct = customer; S.carIdx = 0; enter(false); return 'in';
  },
  // new customer: customers/{+91number}, status 'new' until the owner checks the car and activates it
  async signup(s: { name: string; area: string; model: string; plate: string; plan: PlanId }) {
    const p = pendingSignup; if (!p) throw new Error('Sign in again to continue.');
    const w = WASHER_FOR(s.area), plate = s.plate.trim().toUpperCase();
    const car0 = { id: 'c0', name: s.model, make: '', plate, plan: s.plan, washer: w, parking: s.area + ', parking spot to be confirmed', window: 'Before 7:30 AM', keys: "I'll unlock it" };
    if (DB && AUTH) {
      try { await DB.doc('customers/' + AUTH.phone()).set({ phone: AUTH.phone(), name: s.name, area: s.area, status: 'new', cars: [car0], regs: [regOf(car0)], since: fmt(TODAY, { month: 'long', year: 'numeric' }), created_at: nowIST(), updated_at: nowIST() }) }
      catch (e) { console.warn(e); throw new Error("Couldn't save your sign-up. Check your signal and try again.") }
    } else await wait(800);
    S.session = { token: p.token, phone: p.phone, real: REAL };
    S.acct = { name: s.name, phone: p.phone, since: fmt(TODAY, { month: 'long', year: 'numeric' }), area: s.area, prefs: { photo: true, pay: true, drops: true },
      cars: [{ ...car0, id: REAL ? 'c0' : 'c' + Date.now(), img: null, till: null, status: 'new', doneAt: null, mins: 0, streak: 0, washes: 0, paused: null, note: null, rating: 0 }],
      payments: [], orders: [], requests: [], bookings: [] };
    S.carIdx = 0; pendingSignup = null; enter(true);
  },
  async resendOtp(phone10: string) { await act.sendOtp(phone10); toast('New code sent') },
  async logout() {
    S.session = null; S.acct = null; S.cart = {}; S.carIdx = 0; stopSync(); if (SIM) { clearTimeout(SIM.t); SIM = null }
    if (AUTH) await AUTH.signOut(); ui = { ...ui, tab: 'home' }; commit();
  },

  /* --- cars --- */
  switchCar(dir: number) { if (A().cars.length < 2) return; haptic(); S.carIdx = (S.carIdx + dir + A().cars.length) % A().cars.length; ui = { ...ui, carNonce: ui.carNonce + 1 }; save(); renderAll() },
  pickCar(i: number) { if (i !== S.carIdx) { S.carIdx = i; ui = { ...ui, carNonce: ui.carNonce + 1 }; save(); renderAll(); toast(`Showing your ${car().name}`) } },
  async addCar(x: { name: string; plate: string; area: string; plan: PlanId }) {
    const name = x.name.trim(), plate = x.plate.trim().toUpperCase();
    if (!name || !plate) throw new Error('Add the car and its registration number.');
    // another car on a real account waits in requested_cars until the owner adds it from the approval page
    if (DB && AUTH && realAcct()) {
      try { const g = await DB.doc('customers/' + AUTH.phone()).get(); const cur = (g.exists && g.data().requested_cars) || [];
        await DB.doc('customers/' + AUTH.phone()).update({ requested_cars: cur.concat([{ name, make: '', plate, plan: x.plan, area: x.area, at: nowIST() }]).slice(-5), updated_at: nowIST() }) }
      catch (e) { console.warn(e); throw failed() }
    } else await wait(800);
    A().cars.push({ id: 'c' + Date.now(), name, make: '', plate, img: null, plan: x.plan, till: null, status: 'new', washer: WASHER_FOR(x.area), parking: x.area + ', spot to be confirmed', window: 'Before 7:30 AM', keys: "I'll unlock it", doneAt: null, mins: 0, streak: 0, washes: 0, paused: null, note: null, rating: 0 });
    S.carIdx = A().cars.length - 1; ui = { ...ui, tab: 'home', carNonce: ui.carNonce + 1 }; save(); renderAll(); toast(`${name} added. First wash tomorrow.`);
  },
  // car photo: the customer's own picture, shrunk to fit carphotos/ (max ~400 KB)
  async carPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (r.canceled || !r.assets || !r.assets[0]) return;
    const c = car();
    try {
      let out = '';
      for (const w of [900, 640, 480]) {
        const ref = await ImageManipulator.manipulate(r.assets[0].uri).resize({ width: Math.min(w, r.assets[0].width || w) }).renderAsync();
        const s = await ref.saveAsync({ base64: true, compress: .7, format: SaveFormat.JPEG });
        out = 'data:image/jpeg;base64,' + s.base64; if (out.length <= 390000) break;
      }
      c.photo = out; c.photoCut = false; ui = { ...ui, carNonce: ui.carNonce + 1 }; commit(); toast('Your car is in.');
      if (DB && AUTH && realAcct()) await DB.doc('carphotos/' + AUTH.phone() + '_' + c.id).set({ photo: c.photo, updated_at: nowIST() });
    } catch (e) { console.warn(e); toast("Couldn't save the photo. Check your signal and try again.") }
  },

  /* --- to the washer --- */
  async pause(start: Date, days: number) {
    const c = car(); if (!days || !pauseFits(c, start, days)) throw new Error('No pause days left this month.');
    const pz = { from: iso(start), to: iso(addDays(start, days - 1)) };
    await sendRequest({ reg: regOf(c), kind: pz.from === pz.to && pz.from === iso(addDays(TODAY, 1)) ? 'skip_tomorrow' : 'pause', from: pz.from, to: pz.to, text: `Paused ${pz.from} to ${pz.to}` });
    c.paused = pz; pauseLog(c).push({ ...pz }); if (c.till) c.till = iso(addDays(parse(c.till), days)); save(); renderAll();
    return pz;
  },
  async resume() {
    const c = car(); if (!c.paused) return;
    const unused = Math.max(0, Math.round((parse(c.paused.to).getTime() - Math.max(TODAY.getTime(), addDays(parse(c.paused.from), -1).getTime())) / 864e5));
    await sendRequest({ reg: regOf(c), kind: 'pause', text: 'Resumed' });
    if (c.till) c.till = iso(addDays(parse(c.till), -unused));
    const log = pauseLog(c), last = log.find(r => r.from === c.paused!.from && r.to === c.paused!.to);
    if (last) { if (last.from > iso(TODAY)) log.splice(log.indexOf(last), 1); else last.to = iso(TODAY) }
    c.paused = null; save(); renderAll(); toast(`Washes resume tomorrow. ${c.washer} has been told.`);
  },
  async note(text: string) { const c = car(), v = text.trim(); if (!v) throw new Error('Write a note first.'); await sendRequest({ reg: regOf(c), kind: 'note', text: v.slice(0, 1000) }); c.note = v; commit(); toast('Note sent to ' + c.washer) },
  removeNote() { car().note = null; commit(); toast('Note removed') },
  async issue(spots: string[]) {
    const c = car(); if (!spots.length) throw new Error('Tap where it was.');
    await sendRequest({ reg: regOf(c), kind: 'rewash', spots, text: 'Re-wash: ' + spots.join(', ') });
    A().requests.unshift({ id: 'R' + Date.now(), carId: c.id, spots, open: true, at: iso(TODAY) }); commit();
  },
  closeReq(id: string) { const r = A().requests.find(x => x.id === id); if (r) r.open = false; commit(); toast('Marked as fixed') },
  // ratings/{date_REG}
  rate(n: number) {
    const c = car(); c.rating = n; commit(); haptic();
    if (DB && realAcct()) DB.doc(`ratings/${iso(TODAY)}_${regOf(c)}`).set({ reg: regOf(c), date: iso(TODAY), stars: n, at: nowIST() }).catch(() => {});
    toast(n >= 4 ? `${c.washer} will see your ${n} stars` : 'Sorry. Tell us what was missed.');
  },

  /* --- payments: each returns {pending}; pending = money taken, waiting for the bank, plan updates by itself --- */
  async payPlan(via = 'UPI') {
    const c = car(), p = planOf(c), { to } = planPayDates(c), was = c.till || '';
    const r = await checkout('plan', p.price, `${p.name} · ${c.name}`, via, { planId: p.id });
    if (r.pending) { commit(); pollPaidTo(c, was); return { pending: true, till: to } }
    c.till = iso(to); commit(); return { pending: false, till: to };
  },
  async switchPlan(id: PlanId, via = 'UPI') {
    const c = car(), q = switchQuote(id, c);
    if (q.up && q.diff) await checkout('upgrade', q.diff, `Upgrade to ${q.np.name} · ${c.name}`, via, { toPlan: q.np.id, fromPlan: q.cp.id, till: c.till || '' });
    c.plan = id; commit();
  },
  async tip(amt: number, via = 'UPI') { await checkout('tip', amt, `Tip for ${car().washer}`, via); commit() },
  async checkoutCart(via = 'UPI') {
    const { lines, sub } = cartLines(); if (!lines.length) return;
    await checkout('order', sub, 'Store order', via, { items: lines.map(l => ({ id: l.p.id, q: l.q })) });
    await wait(payReal() ? 0 : 900); const id = 'WD' + Math.floor(1000 + Math.random() * 9000);
    A().orders.unshift({ id, total: sub, status: `Arriving tomorrow with ${car().washer}'s wash`, items: lines.map(l => ({ name: pName(l.p), q: l.q })) });
    A().payments[A().payments.length - 1].what = 'Store order ' + id; S.cart = {}; commit();
  },
  // On-demand wash: live accounts pay first (n8n prices it), then ondemand/{id} goes to the washers. -> doc id for tracking
  async book(serviceId: string, via = 'UPI'): Promise<{ id: string; paid: boolean }> {
    const c = car(), svc = SERVICES.find(s => s.id === serviceId)!; let paid = '';
    if (payReal()) { const r = await checkout('onetime', svc.price, `${svc.name} · ${c.name}`, via, { service: svc.id }); paid = r.ref || 'paid'; commit() }
    if (!DB || !AUTH || !realAcct()) { await wait(700); return { id: 'demo', paid: !!paid } }
    try {
      const ref = await DB.collection('ondemand').add({ service: svc.name, service_id: svc.id, price: svc.price, paid: !!paid, pay_ref: paid, car: c.name, reg: c.plate, area: c.area || A().area || '',
        phone: AUTH.phone(), customer_id: AUTH.phone(), status: 'new', washer_id: '', created_at: nowIST(), date: iso(TODAY) });
      fetch(N8N + '/wd-ondemand-dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc_id: ref.id, area: c.area || A().area || '' }) }).catch(() => {});
      return { id: ref.id, paid: !!paid };
    } catch (e) { console.warn('booking', e); throw new Error(paid ? "We have your payment. We'll call you to send a washer." : 'Booking failed. Try again.') }
  },
  cancelBooking(id: string) { const a = A(), b = a.bookings.find(x => x.id === id); a.bookings = a.bookings.filter(x => x.id !== id); commit(); toast(`Cancelled. Refund on its way to your ${a.payments.find(p => b && p.what.includes(b.type))?.via || 'UPI'}.`) },

  /* --- store --- */
  addToCart(id: string, q = 1) { S.cart[id] = (S.cart[id] || 0) + q; commit(); haptic(); const p = PRODUCTS.find(x => x.id === id)!; toast(`${q > 1 ? q + ' × ' : ''}${pName(p)} added`) },
  setQty(id: string, delta: number) { S.cart[id] = Math.max(0, (S.cart[id] || 0) + delta); if (!S.cart[id]) delete S.cart[id]; commit() },

  /* --- profile --- */
  setDetail(k: 'parking' | 'window' | 'keys', v: string) { const c = car(); if (v.trim()) c[k] = v.trim(); commit(); toast(k === 'parking' ? 'Saved. ' + c.washer + ' has the new spot.' : 'Saved') },
  togglePref(k: 'photo' | 'pay' | 'drops') { A().prefs[k] = !A().prefs[k]; commit(); haptic() },
  setName(v: string) { if (v.trim()) { A().name = v.trim(); commit() } toast('Saved') },
  setTheme(t: ThemePick) { S.theme = t; commit(); toast(t === 'light' ? 'Day look' : t === 'dark' ? 'Night look' : 'Follows your phone') },
  cycleTheme() { act.setTheme(S.theme === 'light' ? 'dark' : S.theme === 'dark' ? 'system' : 'light') },
  async copy(txt: string, msg: string) { try { await Clipboard.setStringAsync(txt); toast(msg) } catch (e) { toast(txt) } },
  copyRef() { return act.copy(`Washing Daddy pressure-washes my car every morning, no pocha. Use code ${refCode()} for ₹200 off your first month: washingdaddy.com`, 'Invite copied. Paste it on WhatsApp.') },
  whatsapp(text = '') { Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}${text ? '?text=' + encodeURIComponent(text) : ''}`).catch(() => toast(`WhatsApp us on 77018 08924`)) },
  call() { Linking.openURL(`tel:+91${SUPPORT_PHONE}`).catch(() => {}) },
  openUrl(u: string) { Linking.openURL(u).catch(() => {}) },
  // Stores require a way to delete the account. Only an admin can delete customers/{phone}, so the app
  // sends the request on WhatsApp with the number, then signs out.
  async deleteAccount() {
    const a = A(); act.whatsapp(`Please delete my Washing Daddy account and data. Number: +91 ${a.phone}. Name: ${a.name}.`);
    await act.logout();
  },

  /* --- replay: plays this morning back through the same screens the washer feed drives --- */
  replay() {
    const c = car(); if (c.status === 'new') { toast('Replay starts after your first wash'); return }
    if (SIM) return; const full = makeDoc(c); if (full.status !== 'done') { toast('No wash to replay today'); return }
    const d: WashDoc = { ...full, status: 'scheduled', on_the_way_at: null, arrived_at: null, started_at: null, finished_at: null, photos: [], customer_note_seen: false, tasks: full.tasks.map(t => ({ ...t, done: false, done_at: null })) };
    SIM = { carId: c.id, doc: d }; ui = { ...ui, sim: true }; emit();
    const steps = [() => { d.status = 'on_the_way'; d.on_the_way_at = full.on_the_way_at }, () => { d.status = 'arrived'; d.arrived_at = full.arrived_at; d.customer_note_seen = true },
      () => { d.status = 'washing'; d.started_at = full.started_at; d.photos = full.photos.filter(p => p.kind === 'before') },
      ...full.tasks.map((t, i) => () => { d.tasks[i] = { ...d.tasks[i], done: true, done_at: t.done_at } }), () => { d.status = 'done'; d.finished_at = full.finished_at; d.photos = full.photos }];
    let i = 0;
    const tick = () => { steps[i](); SIM!.doc = { ...d }; emit(); if (ui.tab !== 'live' || i === 0) toast(chipText(c, d)); i++;
      if (i < steps.length) SIM!.t = setTimeout(tick, 1700);
      else { confetti(); toast(`Your ${c.name} is done`); setTimeout(() => { SIM = null; ui = { ...ui, sim: false }; emit() }, 2500) } };
    SIM.t = setTimeout(tick, 900);
  },
};
let pendingSignup: { token: string; phone: string } | null = null;
function enter(isNew: boolean) {
  ui = { ...ui, tab: 'home', carNonce: ui.carNonce + 1 }; save();
  if (REAL) { watchAccount(); subscribeCar() } renderAll();
  if (isNew) setTimeout(() => { confetti(); toast(`You're in. ${car().washer} comes tomorrow morning.`) }, 700);
}

/* ---------- live tracking of an on-demand washer: ondemand/{id} -> locations/{washer_id} ---------- */
export type Track = { status: string; washer: string | null; lng: number | null; lat: number | null; home: [number, number] };
export function trackWasher(docId: string, cb: (t: Track) => void): Unsub {
  const home = AREA_COORDS[car().area || A().area] || [77.1, 28.67];
  if (!DB || docId === 'demo') {
    // preview: a washer rides in from about 900 m away
    let k = 0; const start: [number, number] = [home[0] - 0.006, home[1] - 0.0055];
    cb({ status: 'Assigning nearest washer…', washer: null, lng: null, lat: null, home });
    const t = setInterval(() => { k = Math.min(1, k + 0.06); cb({ status: k >= 1 ? 'Almost here' : 'Chotte is on the way', washer: 'Chotte', lng: start[0] + (home[0] - start[0]) * k, lat: start[1] + (home[1] - start[1]) * k, home }); if (k >= 1) clearInterval(t) }, 1500);
    return () => clearInterval(t);
  }
  let locUn: Unsub | null = null;
  const jobUn = DB.collection('ondemand').doc(docId).onSnapshot(s => {
    if (!s.exists) return; const job = s.data();
    if (!job.washer_id) { cb({ status: 'Assigning nearest washer…', washer: null, lng: null, lat: null, home }); return }
    if (locUn) return;
    locUn = DB.collection('locations').doc(job.washer_id).onSnapshot(ld => { const l = ld.exists ? ld.data() : null;
      cb({ status: `${job.washer_id} is on the way`, washer: job.washer_id, lng: l && +l.lng || null, lat: l && +l.lat || null, home }) }, e => console.warn('map loc', e));
  }, e => console.warn('map job', e));
  return () => { jobUn(); locUn && locUn() };
}
export function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, r = (x: number) => x * Math.PI / 180, dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export const isWeb = Platform.OS === 'web';
