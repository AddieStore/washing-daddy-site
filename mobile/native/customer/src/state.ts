/* App state and every action that changes it. Ported from the web app's script (customer/index.html).
   Contract for screens and sheets:
   - useApp() re-renders the caller on any change and returns the UI state {tab, tabNonce, theme, ready}.
   - Read S (persisted), A() account, car() selected car, doc(c) today's wash doc, plus the view helpers below
     (banners, todaySteps, history7, calendar, usage, ...). Treat everything read as read-only; change things only
     through act.* so the change is saved and redrawn.
   - act.* return promises; on failure they throw an Error whose message is ready to show in a toast.
   - UI hosts toast/openSheet/closeSheet/confetti/haptic come from ./ui/hosts and are re-exported here.
   Only this file and ./backend talk to Firebase, Cashfree, the n8n webhooks or storage.
   Pronto layer (cart modes, bill, slots, coupons, addresses, wallet, pass, referral, bookings, deletion): see the
   PRONTO LAYER section and pronto-video-2026-11-15/CONTRACT.md. */
import { useSyncExternalStore } from 'react';
import { AppState, Linking, Platform, Share } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { areaAt, type ServiceArea } from './data/areas';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { cutout } from './img';
import { getPosition, type Fix } from './geo';
import { backend } from './backend/firebase';
import { cashfreeCheckout, CASHFREE_AVAILABLE } from './backend/cashfree';
import { razorpayCheckout, cashfreeWebCheckout, PAYWEB_AVAILABLE, type RzpOpen } from './backend/payweb';
import type { Db, Unsub } from './backend/types';
import { TODAY, refreshToday, iso, parse, addDays, fmt, inr, nowIST, hm, ampm, t2m, m2t, wait, istNow } from './data/dates';
import { AREAS, PLANS, PRODUCTS, SERVICES, CAR_SERVICES, WASHER_FOR, AREA_COORDS, PlanId, HIDDEN_FROM_NEW, DEFAULT_PLAN,
  CartMode, VariantId, VARIANTS, DEFAULT_VARIANT, variantPrice, packInfo, RecurId, RECURRING, FEES, DayPart, DAY_PARTS, SLOT_CFG, PART_SURCHARGE,
  SLOT_SURCHARGE, INSTANT_HOURS, Coupon, COUPONS, WALLET, PASS_PLANS, REFERRAL, AddressLabel, SUPPORT, showPhone } from './data/reference';
import { startConfig, onConfigChange, subscribeCoupons, overlayForPreview, appCfg, feature, unavailable, Features, UiButton } from './data/config';
export { appCfg, feature, section, tabOn, legalPages, legalPage, helpTopics, helpTopic, uiButtons, serviceCats, unavailable, configLoading, mdBlocks } from './data/config';
export type { UiButton, LegalPage, HelpCfg, MdBlock } from './data/config';
import { PX, emptyPX, demoPX, Address, Receiver, LedgerRow, Refund, PassHold, Job, JobLine, JobStatus } from './data/pronto';
import { server } from './backend/server';
export type { PX, Address, Receiver, LedgerRow, Refund, PassHold, Job, JobLine, JobStatus, Washer, Wallet, ReferralState } from './data/pronto';
export type { CartMode, VariantId, DayPart, Coupon, RecurId, AddressLabel, PassPlan } from './data/reference';
import type { PassPlan } from './data/reference';
import {
  Account, Car, Session, WashDoc, DEMO_PHONE, sampleAccount, fromCustomerDoc, regOf, planOf, maskPlate, extras, weekPlan,
  LABEL, TASK_LABEL, TASK_SUB, isPaused, canPause, pauseLog, pauseFits, startOf, startTxt, makeDoc, fromContract, planTasks,
  activeStage, chipText, hash, daysLeftOf, STAGES, foamDay,
} from './data/model';
import { toast, openSheet, closeSheet, sheetOpen, confetti, haptic } from './ui/hosts';
export { toast, openSheet, closeSheet, confetti, haptic };

/* ---------- config ---------- */
const N8N = 'https://n8n.washingdaddy.com/webhook';
// Live payments: this flag plus SANDBOX in the n8n order node (see pay/README.md)
const PAY_LIVE = true;
export const REAL = !!backend;                 // phone app on Firebase; false in the preview (test data, OTP 1234)
export const OTP_N = REAL ? 6 : 4;
/** where the sign-in code goes: WhatsApp (n8n workflow 15) or SMS (Firebase phone auth). Remembered so verify uses the same channel. */
export type OtpVia = 'whatsapp' | 'sms';
let otpVia: OtpVia = 'whatsapp';
const DB: Db | null = backend ? backend.db : null;
const AUTH = backend ? backend.auth : null;

/* ---------- persisted state ---------- */
export type ThemePick = 'light' | 'dark' | 'system';
// svc: service cart, key = lineKey(serviceId, variant) -> qty. px: per-account Pronto data (addresses, wallet, ...).
// cartMode/when/recur/coupon/useWallet/usePass: the cart's checkout choices (see PRONTO LAYER below).
export type Recur = { freq: RecurId; days: number[]; slot: string; start: string };
type Persist = {
  session: Session | null; acct: Account | null; carIdx: number; cart: Record<string, number>; svc: Record<string, number>; theme: ThemePick;
  px: PX | null; cartMode: CartMode; when: When; recur: Recur | null; coupon: string | null; useWallet: boolean; usePass: boolean;
};
export let S: Persist = { session: null, acct: null, carIdx: 0, cart: {}, svc: {}, theme: 'light', px: null, cartMode: 'instant', when: null, recur: null, coupon: null, useWallet: false, usePass: false };
const KEY = 'wd-app-v2';
let saveT: any = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(() => {}) }, 120) }
async function load() {
  try { const x = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null'); if (x && typeof x === 'object') S = Object.assign(S, x) } catch (e) {}
}

/* ---------- UI state + change notification ---------- */
export type Tab = 'home' | 'live' | 'plan' | 'store' | 'profile' | 'money';
export const TABS: Tab[] = ['home', 'live', 'plan', 'store', 'profile', 'money'];
// page: a full-screen page pushed over the tabs (Pronto-style), e.g. a service page. null = just the tabs.
// Every id here is registered in screens/Main.tsx (PAGES). Owners per page: pronto-video-2026-11-15/CONTRACT.md.
export type Page =
  | { k: 'svc'; id: string } | { k: 'cart' } | { k: 'schedule' }
  | { k: 'money' } | { k: 'refunds' } | { k: 'pass'; id?: string } | { k: 'coupons' } | { k: 'refer' }
  | { k: 'profile' } | { k: 'profileEdit' } | { k: 'addresses'; pick?: boolean } | { k: 'addressMap'; id?: string } | { k: 'addressForm'; id?: string; lat?: number; lng?: number; area?: string }
  | { k: 'help' } | { k: 'helpTopic'; id: string } | { k: 'legal' } | { k: 'legalDoc'; id: string } | { k: 'deleteAccount' } | { k: 'about' }
  | { k: 'bookings' } | { k: 'booking'; id: string } | { k: 'rate'; id: string } | { k: 'payResult' } | { k: 'parkAlerts' } | { k: 'txn'; id: string } | { k: 'orders' } | { k: 'washer'; id?: string; name?: string }
  | null;
export type PageKind = NonNullable<Page>['k'];
type UI = { tab: Tab; tabNonce: number; ready: boolean; signedIn: boolean; carNonce: number; sim: boolean; v: number; page: Page; pages: Page[] };
let ui: UI = { tab: 'home', tabNonce: 0, ready: false, signedIn: false, carNonce: 0, sim: false, v: 0, page: null, pages: [] };
const subs = new Set<() => void>();
function emit() { ui = { ...ui, v: ui.v + 1, signedIn: !!(S.session && S.acct) }; subs.forEach(f => f()) }
export function commit() { save(); emit() }
/* Firestore snapshots arrive in bursts (7+ listeners fire right after sign-in, and again on every local write echo).
   emitSoon coalesces them into one re-render; snapSame skips a snapshot whose data is identical to the last one. */
let soonT: ReturnType<typeof setTimeout> | null = null;
function emitSoon() { if (soonT) return; soonT = setTimeout(() => { soonT = null; emit() }, 40) }
const snapSeen: Record<string, string> = {};
function snapSame(k: string, v: unknown) { let j = ''; try { j = JSON.stringify(v) } catch (e) { return false } if (snapSeen[k] === j) return true; snapSeen[k] = j; return false }
export const subscribeUi = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } };
export const tabNow = (): Tab => ui.tab;
export function useApp() { return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => ui, () => ui) }
export function openPage(p: NonNullable<Page>) { haptic(); ui = { ...ui, pages: [...ui.pages, p], page: p }; emit() }
export function closePage() { const pages = ui.pages.slice(0, -1); ui = { ...ui, pages, page: pages[pages.length - 1] || null }; emit() }
export function go(t: Tab) {
  if ((t === 'store' && !feature('store')) || (t === 'plan' && !feature('plans')) || (t === 'money' && !feature('wallet'))) t = 'home'; if (ui.pages.length) ui = { ...ui, pages: [], page: null }; if (t === ui.tab) { ui = { ...ui, tabNonce: ui.tabNonce + 1 }; emit(); return } haptic(); ui = { ...ui, tab: t }; emit() }

/* ---------- getters ---------- */
export const A = () => S.acct as Account;
export const car = () => A().cars[Math.min(S.carIdx, A().cars.length - 1)];
export const realAcct = () => !!(S.session && S.session.real && !S.session.guest);
/** browsing without logging in ("Skip" on the sign-in screen): an empty local account, nothing is written anywhere */
export const isGuest = () => !!(S.session && S.session.guest);
export const payReal = () => PAY_LIVE && realAcct() && CASHFREE_AVAILABLE;
export const carImg = (c: Car): string | null => c.photo || c.img || null;   // an IMG key or a data/https URI; pass through img.src()
export const daysLeft = (c: Car) => daysLeftOf(c, realAcct());
export const pName = (p: { name: string; fit?: boolean }) => p.fit ? `${car().name} ${p.name}` : p.name;
// Invite code = 'WD' + last 6 digits of the account's 10-digit phone (same rule on the server, see invite contract)
const ownPhone10 = () => (AUTH && AUTH.phone10()) || (S.session && S.session.phone) || (pendingSignup && pendingSignup.phone) || '';
export const refCode = () => { const p = ownPhone10(); return /^\d{10}$/.test(p) ? 'WD' + p.slice(-6) : '' };
export const inviteLink = () => { const c = refCode(); return c ? 'https://washingdaddy.com/invite/?c=' + c : 'https://washingdaddy.com/' };
const CODE_RE = /^WD\d{6}$/;
/* ---- invite code received from a friend: kept until the first plan payment ---- */
const INVITE_KEY = 'wd-invite';
let pendingInvite = '';
export const pendingRef = () => (pendingInvite && pendingInvite !== refCode() ? pendingInvite : '');
export const validInvite = (c: string) => CODE_RE.test(c.trim().toUpperCase());
export function setPendingRef(code: string): boolean {
  const c = (code || '').trim().toUpperCase();
  if (!c) { pendingInvite = ''; AsyncStorage.removeItem(INVITE_KEY).catch(() => {}); return true }
  if (!CODE_RE.test(c) || c === refCode()) return false;
  pendingInvite = c; AsyncStorage.setItem(INVITE_KEY, c).catch(() => {}); return true;
}
function inviteFromUrl(url: string | null) {
  if (!url) return;
  try {
    const u = ExpoLinking.parse(url), isInvite = /(^|\/)invite\/?$/.test(u.path || '') || u.hostname === 'invite';
    const q = u.queryParams && u.queryParams.c; const c = String(Array.isArray(q) ? q[0] : q || '').toUpperCase();
    if (isInvite && setPendingRef(c) && pendingInvite) emit();
  } catch (e) {}
}
export const cartCount = () => Object.values(S.cart).reduce((a, b) => a + b, 0);
export const greeting = () => { const hr = new Date(Date.now() + 5.5 * 3600e3).getUTCHours(); return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening' };
export const fmtPhone = (p: string) => p.replace(/(\d{5})(\d+)/, '$1 $2');
export { maskPlate, planOf, regOf, chipText, activeStage, startTxt, startOf, canPause, isPaused, extras, weekPlan, LABEL, TASK_LABEL, TASK_SUB, STAGES };

/* ---------- wash data ---------- */
let REMOTE: Record<string, WashDoc[]> = {}, REQS: Record<string, any[]> = {}, DOCS: Record<string, WashDoc> = {}, RATED: Record<string, { stars: number; tag?: string }> = {}, DISMISSED: Record<string, boolean> = {};
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
/** demo only: what the washer's acknowledgement of a "skip tomorrow" request looks like (real accounts read requests/{id}) */
const demoReqs = (c: Car) => (REAL || c.img !== 'scorpio' ? [] : [{ id: 'demo-skip', reg: regOf(c), kind: 'skip_tomorrow', from: iso(addDays(TODAY, 1)), to: iso(addDays(TODAY, 1)), status: 'seen', seen_at: '2026-01-01T07:05:00+05:30', washer_reply: 'Ok sir, no wash tomorrow', created_at: iso(TODAY) }]);
export const requestsFor = (c: Car) => REQS[c.id] || demoReqs(c);
const byNewest = (a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at));
const reqTime = (v: any) => { const t = ampm(hm(v)); return t ? ' ' + t : '' };
/** real wash photos of a doc (after / issue / inside + spot); empty for a demo doc, which keeps its static images */
export const photosOf = (d: WashDoc) => (d.remote ? d.photos : []);
/** Sunday interior carry-over line for the selected car: "Sunday interior done Monday" (carried_from / interior_carried_to) */
export function carryNote(c: Car = car(), d: WashDoc = doc(c)): string | null {
  const day = (iso_: string) => fmt(parse(iso_), { weekday: 'long' });
  if (d.carried_from) { const it = d.tasks.find(t => t.key === 'interior'); return it && it.done ? `Sunday interior done ${day(d.date)}` : `Sunday interior is being done today`; }
  const src = d.interior_carried_to ? d : (REMOTE[c.id] || []).find(x => x.interior_carried_to && x.date >= iso(addDays(TODAY, -7)));
  if (src && src.interior_carried_to) {
    const nx = (REMOTE[c.id] || []).find(x => x.date === src.interior_carried_to), done = !!nx && nx.tasks.some(t => t.key === 'interior' && t.done);
    return done ? `Sunday interior done ${day(src.interior_carried_to)}` : `Sunday interior will be done ${day(src.interior_carried_to)}`;
  }
  return null;
}
/** the daily rating already given for today's wash (ratings/{DATE}_{REG}) */
export const ratedToday = (c: Car = car()) => RATED[c.id] || null;
export const canRateToday = (c: Car = car()) => { const d = doc(c); return (realAcct() || !REAL) && !!d.remote && d.status === 'done' && !RATED[c.id] };

/* ---------- view helpers (what each screen draws) ---------- */
export type Banner = { kind?: 'wash'; icon: string; tint: string; title: string; sub: string; btn: string; act: () => void };
export function banners(): Banner[] {
  const c = car(), b: Banner[] = [], a = A();
  if (c.status === 'new' && !c.till) b.push({ icon: '🧾', tint: 'rgba(255,186,8,.2)', title: 'Pay after your first wash', sub: `${planOf(c).name}, ${inr(planOf(c).price)} a month`, btn: 'Pay now', act: () => sheetHooks.payPlan() });
  if (c.paused && c.paused.to >= iso(TODAY)) b.push({ icon: '⏸', tint: 'rgba(46,139,255,.18)', title: `Washes paused ${fmt(c.paused.from)} – ${fmt(c.paused.to)}`, sub: 'The days are added to your plan', btn: 'Resume', act: () => act.resume().catch(e => toast(e.message)) });
  const d = doc(c); if (activeStage(d)) b.unshift({ icon: '●', tint: 'rgba(255,186,8,.25)', title: 'Live now', sub: chipText(c, d), btn: 'Watch', act: () => go('live') });
  const seen = requestsFor(c).filter(r => r.kind === 'note').sort(byNewest)[0];
  if (c.note) b.push({ kind: 'wash', icon: '✎', tint: 'rgba(255,106,26,.18)', title: `Note for ${c.washer}${seen && seen.status === 'done' ? ' · handled ✓' + reqTime(seen.done_at) : seen && seen.status === 'seen' ? ' · seen ✓' + reqTime(seen.seen_at) : ''}`, sub: seen && seen.washer_reply ? `${c.note}\n${c.washer}: ${seen.washer_reply}` : c.note, btn: 'Edit', act: () => sheetHooks.note() });
  // pause / skip-tomorrow acknowledgement from the washer
  const pz = requestsFor(c).filter(r => (r.kind === 'skip_tomorrow' || r.kind === 'pause') && r.from).sort(byNewest)[0];
  if (pz && (pz.status === 'seen' || pz.status === 'done') && pz.to >= iso(TODAY) && !DISMISSED[pz.id]) b.push({ kind: 'wash', icon: '⏸', tint: 'rgba(46,139,255,.18)', title: `${c.washer} ${pz.status === 'done' ? 'has marked it' : 'has seen it'} ✓${reqTime(pz.status === 'done' ? pz.done_at : pz.seen_at)}`, sub: pz.washer_reply || (pz.kind === 'skip_tomorrow' ? 'No wash tomorrow' : `No wash ${fmt(pz.from)} – ${fmt(pz.to)}`), btn: 'OK', act: () => { DISMISSED[pz.id] = true; emitSoon() } });
  // today's wash is done: ask for the daily rating
  if (canRateToday(c)) b.push({ kind: 'wash', icon: '★', tint: 'rgba(255,186,8,.22)', title: 'How was today\'s wash?', sub: `Rate ${c.washer}'s wash in one tap`, btn: 'Rate', act: () => sheetHooks.rateDay() });
  a.bookings.filter(x => x.carId === c.id && x.date >= iso(TODAY)).forEach(x => b.push({ icon: '✦', tint: 'rgba(84,9,218,.15)', title: `One-time ${x.type} wash`, sub: `${fmt(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${x.slot}`, btn: 'Details', act: () => sheetHooks.bookings() }));
  a.orders.filter(o => o.status !== 'Delivered').forEach(o => b.push({ icon: '📦', tint: 'rgba(20,192,138,.16)', title: `Order ${o.id} arrives tomorrow`, sub: `${o.items.length} item${o.items.length > 1 ? 's' : ''}, with ${car().washer}'s wash`, btn: 'View', act: () => sheetHooks.orders() }));
  if (realAcct()) {
    // re-wash status comes from requests/{id} (status, seen_at, done_at, washer_reply), not from the phone
    requestsFor(c).filter(r => r.kind === 'rewash' && !DISMISSED[r.id] && (r.status !== 'done' || String(r.done_at || '').slice(0, 10) === iso(TODAY))).sort(byNewest).slice(0, 2).forEach(r => {
      const spots = Array.isArray(r.spots) ? r.spots.join(', ').toLowerCase() : String(r.text || '').replace(/^Re-wash: /, '').toLowerCase();
      const st = r.status === 'done' ? `Fixed ✓${reqTime(r.done_at)}` : r.status === 'seen' ? `${c.washer} saw it ✓${reqTime(r.seen_at)}` : 'Sent, waiting for ' + c.washer;
      b.push({ kind: 'wash', icon: r.status === 'done' ? '✓' : '↺', tint: r.status === 'done' ? 'rgba(20,192,138,.16)' : 'rgba(232,56,79,.14)', title: r.status === 'done' ? 'Re-wash done' : `${c.washer} is coming back`, sub: `${st}. Re-wash of ${spots}${r.washer_reply ? '. ' + c.washer + ': ' + r.washer_reply : r.status === 'done' ? '' : ' by 11 AM'}`, btn: 'OK', act: () => { DISMISSED[r.id] = true; emitSoon() } });
    });
  } else a.requests.filter(r => r.carId === c.id && r.open).forEach(r => b.push({ kind: 'wash', icon: '↺', tint: 'rgba(232,56,79,.14)', title: `${c.washer} is coming back`, sub: `Re-wash of ${r.spots.join(', ').toLowerCase()} by 11 AM`, btn: 'OK', act: () => act.closeReq(r.id) }));
  return b;
}
/** the washer's replies and the rating prompt for the Daily tab (acknowledged notes, skip/pause, re-wash status, rate today's wash) */
export const washNotices = () => banners().filter(b => b.kind === 'wash');
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
    : ({ scheduled: 'Each step shows up here the moment it happens.', on_the_way: `Arriving around ${ampm(d.eta)}.`, arrived: `Reached at ${ampm(d.arrived_at)}. Wash starts in a minute.`, washing: `Started at ${ampm(d.started_at)}. Now: ${nowTask ? nowTask.label.toLowerCase() : 'finishing up'}.`, done: `Finished at ${ampm(d.finished_at)}${d.water_litres ? ` · ${d.water_litres} L of water, no pocha` : ''}.`, skipped: [d.skip_reason || 'Your washer marked today as skipped.', carryNote(c, d)].filter(Boolean).join('. ') } as Record<string, string>)[d.status];
  const si = d.status === 'skipped' ? -1 : STAGES.indexOf(d.status);
  return { big, sub, stage: si, washer: w, doc: d };
}
// Timeline rows on Live: state 'done'|'now'|'todo', icon, title, sub, time "HH:MM"
export type TLRow = { st: 'done' | 'now' | 'todo'; icon: string; title: string; sub: string; at: string | null | undefined };
export function timeline(c: Car = car()): TLRow[] {
  const d = doc(c), w = d.washer?.name || c.washer, nowTask = d.tasks.find(t => !t.done), rows: TLRow[] = [];
  const st = (cond: any, isNow: boolean): TLRow['st'] => cond ? 'done' : isNow ? 'now' : 'todo';
  if (d.notStarted) return [{ st: 'todo', icon: '🗓', title: startTxt(c), sub: 'Your washer will show each step here', at: null }];
  if (d.status === 'skipped') return [{ st: 'done', icon: '⏸', title: 'No wash today', sub: [d.skip_reason, carryNote(c, d)].filter(Boolean).join('. '), at: null }];
  rows.push({ st: st(d.on_the_way_at, d.status === 'scheduled' && !d.first), icon: '🛵', title: `${w} set off`, sub: 'Riding over with the pressure washer', at: d.on_the_way_at });
  rows.push({ st: st(d.arrived_at, d.status === 'on_the_way'), icon: '📍', title: 'Reached your car', sub: c.parking, at: d.arrived_at });
  if (c.note) rows.push({ st: st(d.customer_note_seen || d.status === 'done', false), icon: '✎', title: 'Read your note', sub: `"${c.note}"`, at: d.customer_note_seen ? (d.remote ? hm((requestsFor(c).filter(r => r.kind === 'note').sort(byNewest)[0] || {}).seen_at) || d.arrived_at : d.arrived_at) : null });
  d.tasks.forEach(t => rows.push({ st: t.done ? 'done' : d.status === 'washing' && t === nowTask ? 'now' : 'todo', icon: t.done ? '✓' : '', title: t.label, sub: TASK_SUB[t.key] || '', at: t.done_at }));
  const cn = carryNote(c, d); if (cn) rows.push({ st: 'todo', icon: '🧽', title: cn, sub: 'Interior is never lost on a Sunday', at: null });
  rows.push({ st: st(d.status === 'done', false), icon: '✦', title: d.status === 'done' ? `Finished${d.minutes ? ` in ${d.minutes} min` : ''}` : 'Finished', sub: 'Photo sent here and on WhatsApp', at: d.finished_at });
  return rows;
}
// Last 7 mornings: [date, title, sub]
export function history7(c: Car = car()): [Date, string, string][] {
  const remote = REMOTE[c.id] || [], h: [Date, string, string][] = [];
  for (let i = 1; i <= 7; i++) {
    const dt = addDays(TODAY, -i), r = remote.find(x => x.date === iso(dt));
    if (c.status === 'new') break;
    if (realAcct() && !r) continue;
    if (r) { h.push([dt, r.abandoned ? `Wash could not be completed${r.abandoned.reason ? ': ' + r.abandoned.reason : ''}` : r.status === 'skipped' ? (r.skip_reason || 'Skipped') : `${r.washer?.name || c.washer} · ${ampm(r.finished_at) || 'washed'} · ${r.minutes || 0} min`, r.tasks.filter(t => !['pressure', 'dry'].includes(t.key)).map(t => t.label).join(', ')]); continue }
    if (isPaused(c, dt)) { h.push([dt, 'Paused by you', '']); continue }
    if (!REAL && c.img === 'scorpio' && i === 2) { h.push([dt, 'Wash could not be completed: Rain', '']); continue }   // demo only: a wash stopped halfway (matches the day sheet)
    if (!REAL && c.img === 'scorpio' && i === 3) { h.push([dt, 'Gate was locked and no key was left', '']); continue }   // demo only: a skipped morning with the washer's reason
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
    ['Foam wash', pick('foam', Math.round(f.foam * td / 7) + (f.fm && foamDay(c) <= td ? f.fm : 0)), Math.round(f.foam * 30 / 7) + (f.fm || 0), 'sky'],
    f.det ? ['Detailing', pick('detailing', f.det >= 16 ? 8 : Math.floor(f.det / 2)), f.det >= 16 ? 17 : f.det, 'gold'] : ['Tyre & trim', pick('tyre', Math.min(Math.round(f.tyre * 30 / 7), Math.round(f.tyre * td / 7))), Math.round(f.tyre * 30 / 7), 'mint']];
  const range = realAcct() && c.start ? `From ${fmt(startOf(c)!, { day: 'numeric', month: 'short' })}` : `1–${td} ${fmt(TODAY, { month: 'short' })}`;
  return { range, hidden: c.status === 'new', cols: cols.map(u => ({ label: u[0], used: u[1] * used, of: u[2], color: u[3] })) };
}
export function planStatus(c: Car = car()): [string, string, string] {
  const left = daysLeft(c);
  return c.status === 'new' && !c.till ? ['Starts tomorrow', '#FFBA08', '#1A0A33'] : (left ?? 0) <= 3 ? ['Due soon', '#FF6A1A', '#fff'] : ['Active', '#14C08A', '#fff'];
}
// what paying for the plan moves the paid-up date to
/** monthly autopay for a car: on = Razorpay will charge again (cancelling = stops at the end of the paid month) */
const AUTOPAY_ON = ['active', 'authenticated', 'pending', 'past_due'];
export const autopayOn = (c: Car = car()) => !!(c && c.autopay && AUTOPAY_ON.includes(c.autopay.status));
export function autopayView(c: Car = car()) {
  const a = c && c.autopay, st = a ? a.status : '';
  const label = !a ? '' : st === 'cancelling' ? `Autopay stops after ${c.till ? fmt(parse(c.till)) : 'this month'}` : st === 'cancelled' || st === 'completed' ? 'Autopay is off'
    : st === 'past_due' || st === 'pending' ? 'Last autopay payment failed. Razorpay will try again.' : st === 'halted' ? 'Autopay stopped: payments failed. Pay again to restart.' : `Autopay on · ${inr(a.amount || planOf(c).price)} every month`;
  return { on: autopayOn(c), status: st, label };
}
export function planPayDates(c: Car = car()) { const from = c.till ? parse(c.till) : addDays(TODAY, 1), nt = new Date(from); nt.setMonth(nt.getMonth() + 1); return { from, to: nt } }
export function switchQuote(id: PlanId, c: Car = car()) {
  const np = PLANS.find(p => p.id === id)!, cp = planOf(c), left = c.till ? Math.max(0, Math.round((parse(c.till).getTime() - TODAY.getTime()) / 864e5)) : 0;
  return { np, cp, left, up: np.price > cp.price, diff: Math.max(0, Math.round((np.price - cp.price) * left / 30)) };
}
export function dayDetail(date: string, c: Car = car()) {
  const dt = parse(date), w = extras(c, dt), paused = isPaused(c, dt);
  if (realAcct()) {
    // real account: only what the washer wrote for that morning, no invented times
    const r = (REMOTE[c.id] || []).find(x => x.date === date);
    return { title: fmt(dt, { weekday: 'long', day: 'numeric', month: 'long' }), paused, washer: r?.washer?.name || c.washer, real: true as const, doc: r || null,
      steps: r ? r.tasks.map(t => ({ label: t.label, done: t.done, at: t.done_at ? ampm(t.done_at) : '' })) : [] as { label: string; done: boolean; at: string }[],
      time: r ? [r.started_at && 'Started ' + ampm(r.started_at), r.finished_at && 'finished ' + ampm(r.finished_at)].filter(Boolean).join(', ') : '', skip: r && r.status === 'skipped' ? r.skip_reason || 'Skipped' : null, carry: r ? carryNote(c, r) : null };
  }
  return { real: false as const, doc: null as WashDoc | null, skip: null as string | null, carry: null as string | null, title: fmt(dt, { weekday: 'long', day: 'numeric', month: 'long' }), paused, washer: c.washer, steps: ['Pressure wash', ...w.map(k => LABEL[k]), 'Dried by hand'].map((l, i) => ({ label: l, done: true, at: i === 0 ? ['6:38', '6:41', '6:44', '6:36', '6:42'][+date.slice(-2) % 5] + ' AM' : '' })), time: ['6:38', '6:41', '6:44', '6:36', '6:42'][+date.slice(-2) % 5] + ' AM' };
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
/* ---------- service cart (Home grid / service page / cart page) ---------- */
// One extra wash run: a la carte services from CAR_SERVICES and/or one pack id from SERVICES.
export const svcOf = (id: string) => CAR_SERVICES.find(s => s.id === id) || null;
// Cart line key: the service id, or 'id~variant' for a non-default car size (VARIANTS). Packs have no variant.
export const lineKey = (id: string, v?: VariantId | null) => (v && v !== DEFAULT_VARIANT && svcOf(id) ? id + '~' + v : id);
export const parseKey = (key: string): { id: string; v: VariantId } => { const [id, v] = key.split('~'); return { id, v: (VARIANTS.some(x => x.id === v) ? v : DEFAULT_VARIANT) as VariantId } };
/** qty of one cart line (a key from lineKey; a bare id is the default variant) */
export const svcQty = (key: string) => (S.svc || {})[key] || 0;
/** qty of a service across all its variants */
export const svcQtyAll = (id: string) => Object.keys(S.svc || {}).reduce((a, k) => a + (parseKey(k).id === id ? S.svc[k] : 0), 0);
/** price/mrp/mins of one service in one variant (or of a pack) */
export function priceOf(id: string, v: VariantId = DEFAULT_VARIANT) {
  const c = svcOf(id); if (c) return variantPrice(c, v);
  const p = packInfo(id); return p ? { price: p.price, mrp: p.mrp, mins: p.mins } : { price: 0, mrp: 0, mins: 30 };
}
export type CartLine = { key: string; id: string; variant?: VariantId; variantLabel: string | null; name: string; q: number; price: number; mrp: number; mins: number; total: number; pack: boolean };
export function svcLines() {
  const m = S.svc || {}, keys = Object.keys(m).filter(k => m[k]);
  const lines: CartLine[] = keys.map(key => {
    const { id, v } = parseKey(key), c = svcOf(id), p = packInfo(id), pr = priceOf(id, v);
    const name = c ? c.name : p ? p.name : id;
    return { key, id, variant: c ? v : undefined, variantLabel: c && v !== DEFAULT_VARIANT ? VARIANTS.find(x => x.id === v)!.label : null, name, q: m[key], price: pr.price, mrp: pr.mrp, mins: pr.mins, total: pr.price * m[key], pack: !c };
  });
  const sub = lines.reduce((a, l) => a + l.total, 0), mrp = lines.reduce((a, l) => a + l.mrp * l.q, 0), mins = lines.reduce((a, l) => a + l.mins * l.q, 0);
  return { lines, sub, mrp, saved: Math.max(0, mrp - sub), mins, count: lines.reduce((a, l) => a + l.q, 0) };
}
// Packs are paid online (n8n prices them); a la carte services are paid to the washer on arrival until n8n knows their prices.
export const svcPayOnline = () => { const { lines } = svcLines(); return lines.length === 1 && lines[0].pack && lines[0].q === 1 };
export type When = { date: string; slot: string } | null;   // null = instant (next free washer, 15 min)

export const sheetHooks = { rateDay: () => {}, payPlan: () => {}, note: () => {}, bookings: () => {}, orders: () => {} };

/* ---------- requests to the washer: requests/{id}, read live by the washer app ---------- */
async function sendRequest(body: object) {
  if (!DB || !realAcct()) { await wait(500); return }
  const w = DB.collection('requests').doc().set({ ...body, created_at: nowIST(), status: 'open' });
  // an offline write is kept by Firestore and goes out later: say it's sent after 5 s either way
  try { await Promise.race([w, wait(5000)]) } catch (e) { console.warn('request', e); throw new Error(`That didn't go through. Call or WhatsApp us on 77018 08924.`) }
}

/* ---------- parked-elsewhere spots: requests/{id} kind 'spot' (src/park, .notes contract park-alerts-2026-11-26) ---------- */
export type SpotDoc = { id: string; reg: string; kind: 'spot'; text?: string; lat: number; lng: number; acc?: number; parked_at?: string; from: string; to: string; created_at?: string; status: 'open' | 'seen' | 'done' | 'cancelled'; until_back?: boolean };
let DEMO_SPOTS: Record<string, SpotDoc[]> = {};
/** spot requests for a car (live from Firestore in a real account, kept on the phone in the demo) */
export const spotDocs = (c: Car): SpotDoc[] => (realAcct() ? (REQS[c.id] || []) : (DEMO_SPOTS[c.id] || [])).filter((r: any) => r && r.kind === 'spot') as SpotDoc[];
/** writes one spot request for a car; returns its id */
export async function sendSpot(c: Car, b: { lat: number; lng: number; acc?: number; text?: string; parked_at: string; from: string; to: string; until_back: boolean }): Promise<string> {
  const body = { reg: regOf(c), kind: 'spot' as const, lat: Math.round(b.lat * 1e6) / 1e6, lng: Math.round(b.lng * 1e6) / 1e6, acc: Math.round(b.acc || 0),
    text: (b.text || '').trim().slice(0, 300), parked_at: b.parked_at, from: b.from, to: b.to, until_back: b.until_back };
  if (!DB || !realAcct()) { await wait(400); const id = newId('spot'); (DEMO_SPOTS[c.id] = DEMO_SPOTS[c.id] || []).unshift({ id, ...body, created_at: nowIST(), status: 'open' }); emit(); return id }
  const ref = DB.collection('requests').doc();
  const w = ref.set({ ...body, created_at: nowIST(), status: 'open' });
  try { await Promise.race([w, wait(5000)]) } catch (e) { console.warn('spot', e); throw new Error(`That didn't go through. Call or WhatsApp us on 77018 08924.`) }
  return ref.id;
}
/** the customer ends a spot (car back at the usual place, or a mistake); the washer app stops showing it */
export async function endSpots(c: Car, ids: string[]) {
  if (!ids.length) return;
  if (!DB || !realAcct()) { (DEMO_SPOTS[c.id] || []).forEach(r => { if (ids.includes(r.id)) r.status = 'cancelled' }); emit(); return }
  await Promise.all(ids.map(id => DB!.doc('requests/' + id).update({ status: 'cancelled', ended_at: nowIST() }).catch((e: any) => console.warn('endSpot', e))));
}

/* ---------- payments ---------- */
// The payment server (n8n workflow 8) prices every order itself. Amount here is only shown; the app never marks itself paid.
async function pay(kind: string, d: { amt: number; what: string; [k: string]: any }) {
  if (!payReal()) { await wait(1100); return { ref: 'CF' + Date.now().toString().slice(-8), pending: false } }
  const c = car(), a = A();
  let j: any = null, ok = false, status = 0;
  try {
    const r = await fetch(N8N + '/wd-pay-order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: d.amt, name: a.name || '', phone: AUTH!.phone10(), car: c.name, num: c.plate, area: c.area || a.area || '', kind, label: d.what,
        planId: d.planId, ...(kind === 'plan' && pendingRef() ? { ref: pendingRef() } : {}), toPlan: d.toPlan, fromPlan: d.fromPlan, till: d.till, items: d.items, service: d.service, page: 'app',
        // wallet-pay hook (Pronto): n8n debits WD Money first, server-side, and opens Cashfree only for the rest
        ...(d.useWallet ? { useWallet: true } : {}) }) });
    ok = r.ok; status = r.status; j = await r.json().catch(() => null);
  } catch (e: any) { throw new Error(`Payment didn't go through. Nothing was charged. (no connection to the payment server: ${String(e && e.message || e).slice(0, 60)})`) }
  // the wallet covered the whole amount: n8n already marked the order paid, there is nothing to open
  if (ok && j && j.paid === true && j.wallet === true && !j.paymentSessionId) return { ref: j.orderId || j.order_id || 'WALLET', pending: false };
  if (!ok || !j || !j.paymentSessionId) throw new Error(j && j.message ? j.message + ' Nothing was charged.' : `Payment didn't go through. Nothing was charged. (payment server answered ${status}${j ? '' : ', not JSON'})`);
  // native Cashfree sheet, or Cashfree's page inside the app when the SDK refuses: never the browser
  try { await cashfreeAny(j.paymentSessionId, j.orderId || j.order_id) }
  catch (e: any) {
    if (e && e.cancelled) throw new Error('Payment cancelled. Nothing was charged.');
    throw new Error(`Payment didn't go through. Nothing was charged. (checkout: ${errOf(e).slice(0, 80)})`);
  }
  if (kind === 'plan') {
    if (Number(j.discount) > 0) toast('Invite applied: ₹200 off');
    if (pendingInvite) setPendingRef('');   // first plan payment is on its way: the code is spent
  }
  return { ref: j.orderId || j.order_id || '', pending: true };
}
// After a payment the book is the truth, not the app: the webhook moves the paid-up date a second or two later
async function pollPaidTo(c: Car, was: string) {
  if (!payReal() || !c.plate) return;
  for (let i = 0; i < 45; i++) {   // up to ~3 minutes: paying in the browser takes longer than the native sheet
    await wait(i < 3 ? 1500 : 4000);
    let j: any = null;
    try { const r = await fetch(N8N + '/wd-pay-lookup?car=' + encodeURIComponent(c.plate), { cache: 'no-store' } as any); j = await r.json() } catch (e) { continue }
    if (j && j.found && j.credit != null && Number.isFinite(Number(j.credit)) && S.acct && S.acct.credit !== Number(j.credit)) { S.acct.credit = Number(j.credit); commit() }
    if (j && j.found && j.paidTo && j.paidTo !== was) {
      c.till = j.paidTo; const p = A().payments.slice(-1)[0]; if (p) p.pending = false;
      commit(); toast('Payment confirmed. Covered till ' + fmt(parse(j.paidTo))); return;
    }
  }
}
// -> {pending}: pending means the money is with Cashfree and the plan updates by itself once it clears
async function checkout(kind: string, amt: number, what: string, via: string, extra: object = {}) {
  if (kind !== 'tip') assertServed();   // plans, upgrades, one-time washes, store orders: only inside a service area
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
    const next = docs.map(d => fromContract(d.data())).sort((x, y) => String(y.date).localeCompare(String(x.date)));
    if (snapSame('washes:' + id, next)) return;
    REMOTE[id] = next;
    if (car().id === id && !SIM) { emitSoon(); toastStatus(id) }
  }, e => console.warn('washes', e)));
  unsubs.push(DB.doc(`ratings/${iso(TODAY)}_${reg}`).onSnapshot((g: any) => { const was = !!RATED[id]; if (g.exists) RATED[id] = { stars: +g.data().stars || 0, tag: g.data().tag }; else delete RATED[id]; if (was !== !!RATED[id] && car().id === id) emitSoon() }, () => {}));
  unsubs.push(DB.collection('requests').where('reg', '==', reg).onSnapshot(docs => { const next = docs.map(d => ({ id: d.id, ...d.data() })); if (snapSame('reqs:' + id, next)) return; REQS[id] = next; if (car().id === id) emitSoon() }, () => {}));
}
function toastStatus(id: string) {
  const d = doc(car()), k = d.status + '|' + d.tasks.filter(t => t.done).length;
  if (lastStatus[id] && lastStatus[id] !== k && d.remote) { toast(chipText(car(), d)); haptic(); if (d.status === 'done') confetti() }
  lastStatus[id] = k;
}
function watchAccount() {
  if (acctUnsub) { try { acctUnsub() } catch (e) {} acctUnsub = null }
  if (!DB || !AUTH || !S.session || !AUTH.phone()) return;
  watchCarPhotos(); watchMoney();
  acctUnsub = DB.doc('customers/' + AUTH.phone()).onSnapshot(g => {
    if (!g.exists || !S.acct) return; const was = S.acct.status;
    AUTOPAY_PAYS = Array.isArray(g.data().autopay_payments) ? g.data().autopay_payments : [];
    S.acct = fromCustomerDoc(g.data(), S.acct); S.carIdx = Math.min(S.carIdx, S.acct.cars.length - 1); subFor = null; subscribeCar(); commit(); watchCarPhotos();
    if (was && was !== 'active' && S.acct.status === 'active') toast("You're all set. Live wash updates are on.");
  }, () => {});
}
// photos live in carphotos/{+91number}_{carId}, so the customer can add one without touching the account doc
function watchCarPhotos() {
  stop(photoUnsubs); if (!DB || !AUTH || !realAcct() || !AUTH.phone() || !S.acct) return;
  A().cars.forEach(x => { const cid = x.id; photoUnsubs.push(DB.doc('carphotos/' + AUTH.phone() + '_' + cid).onSnapshot(g => {
    const t = A().cars.find(q => q.id === cid), v = g.exists ? g.data().photo : null;
    if (t && v) t.photoCut = v.startsWith('data:image/webp');   // only cut-outs are saved as WebP (firestore.rules allows no extra field)
    if (t && v && t.photo !== v) { t.photo = v; commit() } }, () => {})) });
}
function stopSync() { stop(unsubs); stop(photoUnsubs); stop(moneyUnsubs); subscribeCoupons(null); subFor = null; if (acctUnsub) { try { acctUnsub() } catch (e) {} acctUnsub = null } REMOTE = {}; REQS = {}; DOCS = {}; RATED = {}; DISMISSED = {}; lastStatus = {}; for (const k in snapSeen) delete snapSeen[k]; AUTOPAY_PAYS = [] }
function renderAll() { if (!SIM) DOCS = {}; subscribeCar(); emit() }

/* ---------- boot ---------- */
export async function boot() {
  await load();
  // live config: cached last-known first, then Firestore (real builds); built-in content in the preview
  onConfigChange(() => { pruneCart(); emit() });
  await startConfig(DB);
  if (!REAL && isWeb && typeof window !== 'undefined' && /[?&]cfgdemo=1\b/.test(String(window.location && window.location.search))) previewOverlay();
  try { const v = await AsyncStorage.getItem(INVITE_KEY); if (v && CODE_RE.test(v)) pendingInvite = v } catch (e) {}
  try { inviteFromUrl(await ExpoLinking.getInitialURL()); ExpoLinking.addEventListener('url', e => inviteFromUrl(e.url)) } catch (e) {}
  // older saves showed masked plates; keep the full number and mask it only on screen
  if (S.acct) S.acct.cars.forEach(c => { if (c.plate === 'DL 4C •• 2731') c.plate = 'DL 4C AB 2731'; if (c.plate === 'DL 3C •• 0419' || c.plate === 'DL 3C AF 0419') c.plate = 'DL 3C BK 0419' });
  // a saved test login has no place in the real app, and the other way round
  if (S.session && S.session.real !== REAL) { S.session = null; S.acct = null; S.carIdx = 0 }
  if (S.session && S.acct && !S.px) S.px = S.session.real ? emptyPX() : demoPX();
  try { const v = await AsyncStorage.getItem(NOTIFY_KEY); if (v) NOTIFY = JSON.parse(v) } catch (e) {}
  ui = { ...ui, ready: true }; renderAll();
  AppState.addEventListener('change', st => { if (st === 'active' && refreshToday() && !sheetOpen()) renderAll() });
  if (REAL && S.session && !S.session.guest && AUTH) {
    // the Firebase sign-in is the session: lost or a different number goes back to sign-in
    await AUTH.ready();
    if (!AUTH.phone() || AUTH.phone10() !== S.session.phone) { S.session = null; S.acct = null; S.carIdx = 0; stopSync(); commit(); return }
    watchAccount(); subscribeCar();
    if (NOTIFY && !NOTIFY.sent) setTimeout(() => { sendNotify().then(ok => { if (ok) emit() }) }, 4000);
  }
}

/* =====================================================================
   PRONTO LAYER (2026-11-15): cart modes, bill, slots, coupons, addresses, profile, wallet, refunds, WD Pass,
   referral, booking ratings, help/legal, account deletion. Contract: pronto-video-2026-11-15/CONTRACT.md.
   Money rule: in real mode the phone only ASKS. Amounts, coupon redemption, wallet debits/credits, pass visits,
   referral rewards and refunds are decided by n8n (server.call, BACKEND.md) and land in Firestore docs that the
   rules make read-only for customers. The numbers computed here are for display; the demo (preview and the
   test login) runs the same rules locally.
   ===================================================================== */
const r2 = (n: number) => Math.round(n * 100) / 100;
/** true when money calls go to n8n (a real signed-in account on a Firebase build); false = demo logic on the phone */
export const moneyLive = () => !!server && !!DB && realAcct();
/** per-account Pronto data; never null for a signed-in account */
export const px = (): PX => { if (!S.px) S.px = realAcct() ? emptyPX() : demoPX(); return S.px };
function resetPX() { S.px = null; S.when = null; S.recur = null; S.coupon = null; S.useWallet = false; S.usePass = false; S.cartMode = 'instant' }
const fmtR = (n: number) => '₹' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
const newId = (p: string) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
const nowMin = () => { const n = istNow(); return n.getUTCHours() * 60 + n.getUTCMinutes() };

/* ---- remote config: Home hero and instant availability (appcfg/customer, admin dashboard; see data/config.ts) ---- */
export type HomeConfig = { heroTitle: string; heroSub: string; heroTheme: 'default' | 'festive' | 'monsoon' | 'winter'; instantBusy: boolean; referBanner: number; passPromo: boolean };
export const homeConfig = (): HomeConfig => { const c = appCfg(); return { heroTitle: c.home.heroTitle, heroSub: c.home.heroSub, heroTheme: c.home.heroTheme as HomeConfig['heroTheme'], instantBusy: c.instant.busy, referBanner: c.home.referAmount, passPromo: c.sections.passPromo && c.features.pass && PASS_PLANS.length > 0 } };
/** cart lines, store items and checkout choices that the live config no longer allows are dropped */
function pruneCart() {
  let ch = false;
  Object.keys(S.svc || {}).forEach(k => { const id = parseKey(k).id; if ((!svcOf(id) && !packInfo(id)) || unavailable(id)) { delete S.svc[k]; ch = true } });
  Object.keys(S.cart || {}).forEach(k => { if (!PRODUCTS.some(p => p.id === k) || unavailable(k)) { delete S.cart[k]; ch = true } });
  if (S.coupon && (!feature('coupons') || !COUPONS.some(c => c.code === S.coupon))) { S.coupon = null; ch = true }
  if (S.useWallet && !feature('wallet')) { S.useWallet = false; ch = true }
  if (S.usePass && !feature('pass')) { S.usePass = false; ch = true }
  if (!modeOn(S.cartMode || 'instant')) { const m = (['instant', 'scheduled', 'recurring'] as CartMode[]).find(modeOn); if (m && m !== S.cartMode) { S.cartMode = m; if (m === 'instant') S.when = null; ch = true } }
  if (ch) save();
}
/** a cart mode the admin has not switched off */
export const modeOn = (m: CartMode) => feature(m as keyof Features);
/** 'Coupons are' -> 'Coupons are not available right now.' */
const off = (what: string) => new Error(`${what} not available right now.`);
/** web preview ?cfgdemo=1: what a dashboard edit looks like (a paused service, a new service with no built-in art, a custom button) */
function previewOverlay() {
  overlayForPreview({
    catalog: { foam: { kind: 'service', name: 'Foam Wash', short: 'Foam Wash', cat: 'Exterior', price: 249, mrp: 399, mins: 35, blurb: 'Snow foam lifts grit off the paint.', steps: [{ t: 'Snow foam', d: 'Thick foam sits for 3 minutes' }], included: ['Full body foam'], excluded: [], art: { key: 'foam', tint: '#F3ECFF', accent: '#8B5CF6' }, order: 15, status: 'paused', pausedNote: 'Back on Monday' },
      sunroof: { kind: 'service', name: 'Sunroof Detailing', short: 'Sunroof Detail', cat: 'Exterior', price: 349, mrp: 499, mins: 30, blurb: 'Glass, seals and drain channels of the sunroof cleaned and treated.', steps: [{ t: 'Glass', d: 'Inside and out' }, { t: 'Seals', d: 'Cleaned and conditioned' }], included: ['Sunroof glass', 'Seals'], excluded: ['Motor repair'], art: { icon: 'glass', tint: '#EAF3FF', accent: '#2F8FF0' }, badge: 'NEW', order: 5, status: 'live' } },
    ui_buttons: { diwali: { placement: 'home_top', label: 'Diwali shine week', sub: 'Foam + wax at ₹699, this week only', icon: 'star', tint: '#5409DA', style: 'banner', action: { type: 'service', value: 'wax' }, order: 1, status: 'live' } },
  });
}

/* ---- instant hours ---- */
// "Get Instant Service" card: open, or closed with the reason line ("Back at 6AM" / all washers busy)
export function instantStatus(): { open: boolean; label: string; reason: 'open' | 'closed' | 'busy' | 'off' } {
  if (!feature('instant')) return { open: false, label: 'Instant service is not available right now', reason: 'off' };
  const m = nowMin(), o = t2m(INSTANT_HOURS.open), c = t2m(INSTANT_HOURS.close);
  const back = 'Back at ' + ampm(INSTANT_HOURS.open).replace(':00', '').replace(' ', '');
  if (m < o || m >= c) return { open: false, label: back, reason: 'closed' };
  if (homeConfig().instantBusy) return { open: false, label: appCfg().instant.busyMessage, reason: 'busy' };
  return { open: true, label: 'Washer in 15 min', reason: 'open' };
}

/* ---- cart mode, schedule choice, recurring ---- */
export const cartMode = () => S.cartMode || 'instant';
export const when = () => S.when;
export const recur = () => S.recur;

/* ---- slots ---- */
export type SlotDay = { date: string; label: string; short: string; d: number; disabled: boolean; soldOut: boolean };
export type Slot = { t: string; label: string; part: DayPart; surcharge: number; soldOut: boolean; past: boolean; ok: boolean };
const DOW_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// real: slots/{date} = { closed?: bool, sold?: ['HH:MM'], surcharge?: {'HH:MM': n} } written by admin/n8n; loaded by act.loadSlots()
let SLOT_LIVE: Record<string, { closed?: boolean; sold?: string[]; surcharge?: Record<string, number> } | null> = {};
const dayIdx = (date: string) => Math.round((parse(date).getTime() - TODAY.getTime()) / 864e5);
function soldOutDemo(date: string, t: string, part: DayPart) {
  const i = dayIdx(date);
  if (i === 2) return true;                          // a fully booked day, as in the video
  if (i === 3 && part === 'Morning') return true;    // a fully booked part of a day
  return hash(date + t) % 6 === 0;
}
export const slotLabel = (t: string) => ampm(t).toLowerCase();
export function slotsFor(date: string, part?: DayPart): Slot[] {
  const out: Slot[] = [], today = date === iso(TODAY), live = SLOT_LIVE[date];
  DAY_PARTS.filter(p => !part || p.id === part).forEach(p => {
    for (let m = t2m(p.from); m <= t2m(p.to); m += SLOT_CFG.step) {
      const t = m2t(m), past = today && m < nowMin() + SLOT_CFG.cutoff, closed = SLOT_CFG.closed.includes(date);
      const soldOut = closed || (moneyLive() ? !!(live && (live.closed || (live.sold || []).includes(t))) : REAL ? false : soldOutDemo(date, t, p.id));
      const surcharge = slotSurcharge(date, t, p.id);
      out.push({ t, label: slotLabel(t), part: p.id, surcharge, soldOut, past, ok: !soldOut && !past });
    }
  });
  return out;
}
export const partsFor = (date: string) => DAY_PARTS.map(p => { const s = slotsFor(date, p.id); return { id: p.id, soldOut: !s.some(x => x.ok), count: s.filter(x => x.ok).length } });
export function slotDays(n = SLOT_CFG.days): SlotDay[] {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(TODAY, i), date = iso(d), ok = slotsFor(date).some(x => x.ok), anyFuture = slotsFor(date).some(x => !x.past);
    return { date, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DOW_L[d.getDay()], short: DOW_L[d.getDay()].slice(0, 3), d: d.getDate(), disabled: !anyFuture, soldOut: anyFuture && !ok };
  });
}
const partOf = (t: string): DayPart => (DAY_PARTS.find(p => t2m(t) >= t2m(p.from) && t2m(t) <= t2m(p.to)) || DAY_PARTS[0]).id;
// same as n8n workflow 13 (surchargeFor): slots/{date}.surcharge[t] if set, else fees.slotSurcharge[t]; plus the flat fees.surcharge of the day part
export const slotSurcharge = (date: string, t: string, part: DayPart = partOf(t)) => (SLOT_LIVE[date]?.surcharge?.[t] ?? SLOT_SURCHARGE[t] ?? 0) + (PART_SURCHARGE[part] || 0);
/** "Wed 18 Nov, 1:00 pm" for a When */
export const whenText = (w: When = S.when) => (w ? `${fmt(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${/^\d\d:\d\d$/.test(w.slot) ? slotLabel(w.slot) : w.slot}` : 'Instant · 15 min');

/* ---- addresses ---- */
/** which of our served areas an address belongs to (for the washer); anything else keeps the map's locality line */
export function areaFor(text: string): string {
  const flat = (x: string) => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = flat(text);
  // 'GH-9 Paschim Vihar' matches on "gh9"; the others on their whole name ("meerabagh", "guruhariapartments", ...)
  const hit = AREAS.find(a => { const gh = /^GH-\d+/i.exec(a); return t.includes(flat(gh ? gh[0] : a)) });
  return hit || ((text || '').split(',').map(x => x.trim()).filter(Boolean).slice(-3, -1).join(', ') || 'New area');
}
let HERE: { lat: number; lng: number } | null = null;
export const here = () => HERE;
export const addresses = (): Address[] => (S.acct ? px().addresses : []);
export const selectedAddress = (): Address | null => { if (!S.acct) return null; const p = px(); return p.addresses.find(a => a.id === p.addrId) || p.addresses[0] || null };
export const addressOf = (id: string) => addresses().find(a => a.id === id) || null;
export const addrName = (a: Address) => (a.label === 'Other' && a.other ? a.other : a.label);
export const addrLine = (a: Address) => [a.flat, a.street, a.area].filter(Boolean).join(', ');
/** "12 m" / "1.4 km" from the last located position (act.locate), '' when unknown */
export function addrDistance(a: Address, from = HERE): string {
  if (!from) return ''; const m = distance(from.lat, from.lng, a.lat, a.lng);
  return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
}
export const receiverText = (r: Receiver) => (r.self ? 'For myself' : `${r.name}, ${fmtPhone(r.phone)}`);

/* ---- profile ---- */
export function profile() {
  const a = A(), parts = (a.name || '').trim().split(/\s+/);
  return { first: a.first ?? parts[0] ?? '', last: a.last ?? parts.slice(1).join(' '), email: a.email || '', phone: a.phone, since: a.since };
}

/* ---- coupons ---- */
// COUPONS is the live list (coupons where public == true, data/config.ts); a real build shows none until the admin adds some
export const couponList = (): Coupon[] => (feature('coupons') ? COUPONS : []);
export const couponOf = (code: string) => couponList().find(c => c.code === code.trim().toUpperCase()) || null;
export type CouponCheck = { ok: true; c: Coupon; off: number } | { ok: false; c: Coupon | null; why: string };
/** validates a coupon against the current cart (display; n8n validates again and redeems it when the order is paid) */
export function couponCheck(code: string, base?: number, mode: CartMode = cartMode()): CouponCheck {
  const c = couponOf(code); if (!c) return { ok: false, c: null, why: "That code isn't valid." };
  const amt = base ?? billBase(mode);
  if (c.till < iso(TODAY)) return { ok: false, c, why: 'This coupon has expired.' };
  if (c.validFrom && c.validFrom > iso(TODAY)) return { ok: false, c, why: 'This coupon is not active yet.' };
  if (c.modes && !c.modes.includes(mode)) return { ok: false, c, why: `Only for ${c.modes.join(' or ')} bookings.` };
  if (amt < c.minOrder) return { ok: false, c, why: `Add ${fmtR(r2(c.minOrder - amt))} more to use this coupon.` };
  if (S.acct && px().usedCoupons.includes(c.code)) return { ok: false, c, why: "You've already used this coupon." };
  if (c.firstOrder && S.acct && px().jobs.some(j => j.status !== 'cancelled')) return { ok: false, c, why: 'Only for your first booking.' };
  const off = c.kind === 'flat' ? Math.min(c.v, amt) : Math.min(r2(amt * c.v / 100), c.max ?? Infinity);
  return { ok: true, c, off: r2(off) };
}
export const couponsView = () => couponList().map(c => ({ ...c, check: couponCheck(c.code), applied: S.coupon === c.code }));

/* ---- wallet ---- */
export function wallet() {
  const w = S.acct ? px().wallet : { cash: 0, promo: 0, ledger: [] as LedgerRow[] }, soon = iso(addDays(TODAY, 7));
  const expiring = r2(w.ledger.filter(l => l.amt > 0 && l.bucket === 'promo' && l.expires && l.expires >= iso(TODAY) && l.expires <= soon).reduce((a, l) => a + l.amt, 0));
  return { balance: r2(w.cash + w.promo), cash: r2(w.cash), promo: r2(w.promo), ledger: [...w.ledger, ...paidOnlineRows()].sort((a, b) => b.at.localeCompare(a.at)), expiringSoon: Math.min(expiring, w.promo) };
}
/** Money paid by card / UPI (not WD Money), listed with the transactions so every payment shows up: one row per
 *  booking order (a recurring month's visits share one order) and one per monthly-plan autopay charge. The balance
 *  is never computed from these. Real: ondemand.order_paid and customers/{phone}.autopay_payments (written by n8n). */
function paidOnlineRows(): LedgerRow[] {
  if (!S.acct) return [];
  const out: LedgerRow[] = [], seen = new Set<string>();
  px().jobs.forEach(j => {
    const amt = +(j.paidOnline || 0), k = 'pay:' + (j.orderId || j.id);
    if (!(amt > 0) || seen.has(k)) return; seen.add(k);
    out.push({ id: k, at: j.createdAt || '', kind: 'payment', amt: -amt, note: jobTitle(j), bucket: 'cash', expires: null });
  });
  const ap = realAcct() ? AUTOPAY_PAYS : (A().payments || []).filter(p => p.autopay).map(p => ({ at: p.d + 'T09:00:00+05:30', amt: p.amt, what: p.what, ref: p.ref || p.d }));
  ap.forEach((p, i) => { if (+p.amt > 0) out.push({ id: 'ap:' + (p.ref || i), at: String(p.at || ''), kind: 'payment', amt: -(+p.amt), note: String(p.what || 'Monthly plan (autopay)'), bucket: 'cash', expires: null }) });
  return out;
}
let AUTOPAY_PAYS: { at: string; amt: number; what: string; ref?: string }[] = [];
/** read-only: one wallet ledger row plus the booking it was for (matched by title and time; payment and refund rows only) */
export function txnOf(id: string): { row: LedgerRow; job: Job | null; siblings: LedgerRow[] } | null {
  if (!S.acct) return null;
  const led = wallet().ledger, row = led.find(l => l.id === id); if (!row) return null;
  let job: Job | null = null;
  if (row.kind === 'payment' || row.kind === 'refund') {
    const t = row.note.replace(/^Refund · /, ''), at = +new Date(row.at);
    const c = [...px().jobs, ...(px().attempts || [])].filter(j => jobTitle(j) === t || j.lines.some(x => x.name === t));
    job = c.sort((a, b) => Math.abs(+new Date(a.createdAt) - at) - Math.abs(+new Date(b.createdAt) - at))[0] || null;
  }
  const siblings = job && row.kind === 'payment' ? led.filter(l => l.kind === 'payment' && l.note === row.note && Math.abs(+new Date(l.at) - +new Date(row.at)) < 5000) : [row];
  return { row, job, siblings };
}
export const topUpBonus = (amt: number) => r2(amt * WALLET.cashbackPct / 100);
export function topUpCheck(amt: number): string | null {
  if (!Number.isFinite(amt) || amt < WALLET.minTopUp) return `Add at least ₹${WALLET.minTopUp}.`;
  if (!Number.isInteger(amt)) return 'Add a whole rupee amount.';
  if (amt > WALLET.maxTopUp) return `You can add up to ₹${WALLET.maxTopUp} at a time.`;
  if (wallet().balance + amt > WALLET.maxBalance) return `Your wallet can hold up to ₹${WALLET.maxBalance}.`;
  return null;
}
export const refunds = (): Refund[] => (S.acct ? [...px().refunds].sort((a, b) => b.at.localeCompare(a.at)) : []);

/* ---- WD Pass ---- */
/** a pass plan by id (or the first one); null when the admin offers none */
export const passPlan = (id?: string): PassPlan | null => PASS_PLANS.find(p => p.id === id) || PASS_PLANS[0] || null;
export const activePass = (): PassHold | null => (S.acct ? px().passes.find(p => p.status === 'active' && p.visitsLeft > 0 && p.validTill >= iso(TODAY)) || null : null);
const NO_PASS: PassPlan = { id: '', name: 'WD Pass', title: 'WD Pass', visits: 1, price: 0, mrp: 0, days: 30, covers: [], maxMins: 0, benefits: [], faqs: [] };
/** price of a pass plan; `plan.id === ''` (check passView().plans.length) when there is none to sell */
export function passQuote(id?: string) { const p = passPlan(id) || NO_PASS, gst = r2(p.price * FEES.gstPct / 100); return { plan: p, price: p.price, mrp: p.mrp, gst, total: r2(p.price + gst), perVisit: Math.round(p.price / p.visits) } }
export const passView = () => ({ active: activePass(), plans: feature('pass') ? PASS_PLANS : [], quote: passQuote() });

/* ---- referral ---- */
export function referralView() {
  const r = S.acct ? px().referral : { completed: 0, earned: 0, pending: 0, ledger: [] }, T = REFERRAL.tiers;
  const tier = T.find(t => r.completed + 1 >= t.from && r.completed + 1 <= t.to) || T[T.length - 1];   // what the NEXT referral earns
  const next = T[T.indexOf(tier) + 1] || null;
  return { code: refCode(), link: inviteLink(), friendGets: REFERRAL.friendGets, tiers: T, tier, next, toNext: next ? next.from - 1 - r.completed : 0, ...r };
}

/* ---- bill ---- */
export type BillRow = { k: 'items' | 'discount' | 'recurring' | 'pass' | 'coupon' | 'slot' | 'convenience' | 'visit' | 'gst' | 'total' | 'wallet' | 'topay'; label: string; amt: number; strike?: number; tone?: 'pos' | 'mute' };
export type Bill = {
  mode: CartMode; count: number; mins: number; mrpTotal: number; itemTotal: number; discount: number; recurOff: number; passCover: number;
  coupon: { code: string; off: number } | null; couponError: string | null; surcharge: number; convenience: number; visitFee: number;
  taxable: number; gst: number; total: number; walletUse: number; toPay: number; saved: number; rows: BillRow[];
  // recurring: the first payment is the first month. total = that month (perVisit x visits, coupon once, on the first
  // visit); perVisit = one visit; taxable/gst are per visit. n8n workflow 13 (recurBillOf) charges exactly this.
  perMonth: { visits: number; total: number } | null;
  perVisit: number | null;
};
function passCoverFor(lines: CartLine[]) {
  const p = activePass(); if (!p || !feature('pass')) return 0; const plan = PASS_PLANS.find(x => x.id === p.plan); if (!plan) return 0;
  const ok = lines.filter(l => plan.covers.includes(l.id) && l.mins <= plan.maxMins).sort((a, b) => b.price - a.price)[0];
  return ok ? ok.price : 0;   // one visit covers one unit of the dearest covered service
}
function billBase(mode: CartMode) {
  const { lines, sub } = svcLines(), rc = mode === 'recurring' ? RECURRING.find(x => x.id === (S.recur ? S.recur.freq : 'weekly')) : null;
  const recurOff = rc ? Math.round(sub * rc.off / 100) : 0, pass = S.usePass && mode !== 'recurring' ? Math.min(passCoverFor(lines), sub - recurOff) : 0;
  return Math.max(0, sub - recurOff - pass);
}
/** The bill for the current cart and choices (or overrides). Display only: n8n prices the order again. */
export function bill(o: { mode?: CartMode; when?: When; coupon?: string | null; useWallet?: boolean; usePass?: boolean } = {}): Bill {
  const mode = o.mode ?? cartMode(), w = o.when !== undefined ? o.when : S.when, code = o.coupon !== undefined ? o.coupon : S.coupon;
  const useWallet = o.useWallet ?? S.useWallet, usePass = o.usePass ?? S.usePass;
  const { lines, sub, mrp, mins, count } = svcLines();
  const rc = mode === 'recurring' ? RECURRING.find(x => x.id === (S.recur ? S.recur.freq : 'weekly'))! : null;
  const recurOff = rc ? Math.round(sub * rc.off / 100) : 0;
  const passCover = usePass && mode !== 'recurring' ? Math.min(passCoverFor(lines), sub - recurOff) : 0;
  const base = Math.max(0, sub - recurOff - passCover);
  let coupon: Bill['coupon'] = null, couponError: string | null = null;
  if (code) { const ch = couponCheck(code, base, mode); if (ch.ok) coupon = { code: ch.c.code, off: ch.off }; else couponError = ch.why }
  const slotT = mode === 'scheduled' ? (w ? w.slot : null) : mode === 'recurring' ? (S.recur ? S.recur.slot : null) : null;
  const slotDate = mode === 'scheduled' ? (w ? w.date : '') : S.recur ? S.recur.start : '';
  const surcharge = count && slotT ? slotSurcharge(slotDate, slotT) : 0;
  // one visit's total for a coupon amount (recurring takes the coupon on the first visit only)
  const visit = (off: number) => {
    const after = Math.max(0, base - off);
    // convenience fee on small carts (item total under the free-above line), never on a visit the pass fully covers
    const convenience = count && sub < FEES.convenienceFreeAbove && !(passCover && after === 0) ? FEES.convenienceFee : 0;
    const taxable = r2(after + surcharge + convenience + visitFee), gst = r2(taxable * FEES.gstPct / 100);
    return { convenience, taxable, gst, total: r2(taxable + gst) };
  };
  const visitFee = count ? FEES.visitFee : 0, cOff = coupon ? coupon.off : 0;
  const one = visit(rc ? 0 : cOff), first = rc ? visit(cOff) : one, n = rc ? rc.perMonth : 1;
  const { convenience, taxable, gst } = one;
  // recurring: the first month is paid now (n visits; the coupon once). Same sum as n8n recurBillOf.
  const total = rc ? r2(one.total * (n - 1) + first.total) : one.total;
  const walletUse = useWallet ? r2(Math.min(wallet().balance, total)) : 0, toPay = r2(total - walletUse);
  const discount = Math.max(0, mrp - sub), saved = r2((discount + recurOff + passCover) * n + cOff);
  const rows: BillRow[] = [{ k: 'items', label: rc ? 'Item total per visit' : 'Item total', amt: sub, strike: discount ? mrp : undefined }];
  if (recurOff) rows.push({ k: 'recurring', label: `Recurring discount (${rc!.off}%)`, amt: -recurOff, tone: 'pos' });
  if (passCover) rows.push({ k: 'pass', label: 'WD Pass visit', amt: -passCover, tone: 'pos' });
  if (coupon && !rc) rows.push({ k: 'coupon', label: `Coupon ${coupon.code}`, amt: -coupon.off, tone: 'pos' });
  if (surcharge) rows.push({ k: 'slot', label: 'Peak slot charge', amt: surcharge });
  rows.push({ k: 'convenience', label: 'Convenience fee', amt: convenience, strike: convenience ? undefined : FEES.convenienceFee, tone: convenience ? undefined : 'pos' });
  if (visitFee) rows.push({ k: 'visit', label: 'Visit charge', amt: visitFee });
  rows.push({ k: 'gst', label: `GST (${FEES.gstPct}%)`, amt: gst, tone: 'mute' });
  if (rc) {
    const month = r2(one.total * n);
    rows.push({ k: 'total', label: 'Total per visit', amt: one.total });
    rows.push({ k: 'total', label: `First month (${n} visits)`, amt: month });
    if (coupon) rows.push({ k: 'coupon', label: `Coupon ${coupon.code} (first visit)`, amt: -r2(month - total), tone: 'pos' });
  } else rows.push({ k: 'total', label: 'Total', amt: total });
  if (walletUse) rows.push({ k: 'wallet', label: WALLET.name, amt: -walletUse, tone: 'pos' });
  rows.push({ k: 'topay', label: rc ? `To pay now · first month` : 'To pay', amt: toPay });
  return { mode, count, mins, mrpTotal: mrp, itemTotal: sub, discount, recurOff, passCover, coupon, couponError, surcharge, convenience, visitFee, taxable, gst, total, walletUse, toPay, saved, rows,
    perMonth: rc ? { visits: n, total } : null, perVisit: rc ? one.total : null };
}
/** recurring: the visit dates of the first month (same rule as n8n recurDates): the picked weekdays from the start day, or every other day */
export function recurDates(r: Recur, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < 400; i++) { const d = iso(addDays(parse(r.start), i)); if (r.freq === 'alt' ? i % 2 === 0 : r.days.includes(parse(d).getDay())) out.push(d) }
  return out;
}

/* ---- bookings (on-demand jobs) ---- */
/** What happened at the last checkout, for the result screen ({ k: 'payResult' }). Set by placeOrder / buyPass / payPlan. */
export type PayResult = {
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  kind: 'booking' | 'pass' | 'plan' | 'wallet' | 'order';
  title: string;              // "Foam Wash and 1 more", "WD Pass · 3 visits"
  amount: number;             // rupees charged (or that would have been)
  gateway?: 'Razorpay' | 'Cashfree' | 'WD Money' | 'WD Pass' | 'Demo';
  ref?: string;               // payment id from the gateway
  orderId?: string;           // our order id
  bookingId?: string;         // when a booking was made: open it with { k: 'booking', id }
  message?: string;           // why it failed / what happens next
  at: string;                 // nowIST()
  retry?: () => void;         // failed / cancelled: try the same payment again (same order, Razorpay first)
  backup?: () => void;        // failed on Razorpay: pay the same order with Cashfree instead
};
let LAST_PAY: PayResult | null = null;
export const lastPay = () => LAST_PAY;
export function showPayResult(r: PayResult) { LAST_PAY = r; openPage({ k: 'payResult' }) }

/* ---- in-app checkout: Razorpay first, Cashfree as the backup. Nothing opens in the browser. ----
   The server (n8n workflow 13) prices the order and creates it with Razorpay (body.rzp) or Cashfree (body.gateway
   'cashfree', same order id). The app only shows the payment page; wd-rzp-confirm checks Razorpay's signature and the
   payment with Razorpay before anything is booked. Cashfree's result comes by its webhook, so that one shows pending
   until the booking / pass / money lands in Firestore. */
type PayCtx = { kind: PayResult['kind']; title: string; amount: number; gatewayIfFree: PayResult['gateway']; landed: (j: any) => boolean };
const errOf = (e: any) => String((e && e.message) || e || '').slice(0, 140);
// Cashfree: the native sheet first, then Cashfree's page inside the app (the native SDK refuses some installs)
async function cashfreeAny(sessionId: string, orderId: string) {
  if (CASHFREE_AVAILABLE) {
    try { await cashfreeCheckout(sessionId, orderId); return }
    catch (e: any) { if (e && e.cancelled) throw e }
  }
  if (!PAYWEB_AVAILABLE) throw Object.assign(new Error('payment'), { failed: true });
  await cashfreeWebCheckout(sessionId, orderId);
}
type RzpPending = { orderId: string; r: any; at: string };
const rzpList = (): RzpPending[] => ((S as any).rzpPending as RzpPending[]) || [];
function rememberRzp(orderId: string, r: any) { if (!orderId) return; (S as any).rzpPending = [...rzpList().filter(x => x.orderId !== orderId), { orderId, r, at: nowIST() }].slice(-5); commit() }
function forgetRzp(orderId: string) { (S as any).rzpPending = rzpList().filter(x => x.orderId !== orderId); commit() }
let retrying = false;
/** a Razorpay payment the app could not confirm (app closed, no signal): confirm it now. The server checks Razorpay's signature itself. */
async function retryPendingRzp() {
  if (retrying || !server || !rzpList().length) return; retrying = true;
  try {
    for (const p of rzpList()) {
      try { const k: any = await server.call('wd-rzp-confirm', { orderId: p.orderId, ...p.r }); if (k && (k.paid || k.duplicate)) { forgetRzp(p.orderId); toast('Your payment is confirmed.') } }
      catch (e: any) { if (String((e && e.message) || '').match(/signature|unknown order|invalid/i)) forgetRzp(p.orderId) }
    }
  } finally { retrying = false }
}
async function payWith13(endpoint: string, body: object, c: PayCtx, force?: 'cashfree'): Promise<PayResult> {
  const base = { kind: c.kind, title: c.title, amount: c.amount, at: nowIST() };
  const again = (how?: 'cashfree') => () => { closePage(); payWith13(endpoint, body, c, how).then(finishPay).catch(e => toast(errOf(e) || "That didn't go through.")) };
  let j: any = await server!.call(endpoint, { ...body, rzp: true, ...(force ? { gateway: force } : {}) });   // throws: nothing was charged
  const ids = (x: any) => ({ orderId: x.orderId ? String(x.orderId) : undefined, bookingId: x.bookingId ? String(x.bookingId) : undefined });
  if (j.paid === true) return { ...base, ...ids(j), status: 'paid', gateway: c.gatewayIfFree, ref: j.ref };
  if (j.gateway === 'razorpay' && j.razorpay && PAYWEB_AVAILABLE) {
    let r;
    try { r = await razorpayCheckout(j.razorpay as RzpOpen) }
    catch (e: any) {
      if (e && e.cancelled) return { ...base, ...ids(j), status: 'cancelled', gateway: 'Razorpay', retry: again(), backup: again('cashfree') };
      if (!(e && e.unavailable)) return { ...base, ...ids(j), status: 'failed', gateway: 'Razorpay', message: errOf(e) ? errOf(e) + '. No money was taken.' : undefined, retry: again(), backup: again('cashfree') };
      r = null;   // Razorpay's page did not load: same order on Cashfree
    }
    if (r) {
      rememberRzp(String(j.orderId || ''), r);   // kept on the phone until the server confirms, and retried at the next app start
      try {
        const k: any = await server!.call('wd-rzp-confirm', { orderId: j.orderId, ...r });
        if (k && k.paid) forgetRzp(String(j.orderId || ''));
        return { ...base, ...ids(j), ...ids(k), status: k.paid ? 'paid' : 'pending', gateway: 'Razorpay', ref: r.razorpay_payment_id };
      } catch (e: any) {
        // the payment went through on Razorpay but we could not confirm it yet: Razorpay's webhook will
        return { ...base, ...ids(j), status: 'pending', gateway: 'Razorpay', ref: r.razorpay_payment_id, message: 'Your payment reached Razorpay. We are confirming it, this can take a few minutes. You will not be charged twice.' };
      }
    }
    j = await server!.call(endpoint, { ...body, rzp: true, gateway: 'cashfree' });
    if (j.paid === true) return { ...base, ...ids(j), status: 'paid', gateway: c.gatewayIfFree };
  }
  if (!j.paymentSessionId) throw new Error("Couldn't start the payment. Nothing was charged.");
  try { await cashfreeAny(String(j.paymentSessionId), String(j.orderId || '')) }
  catch (e: any) {
    if (e && e.cancelled) return { ...base, ...ids(j), status: 'cancelled', gateway: 'Cashfree', retry: again() };
    return { ...base, ...ids(j), status: 'failed', gateway: 'Cashfree', message: "The payment page didn't open. No money was taken.", retry: again() };
  }
  return { ...base, ...ids(j), status: 'pending', gateway: 'Cashfree' };
}
// show the result; a pending one turns paid when the server's write reaches the phone (up to 3 minutes)
let PAY_CTX: Record<string, PayCtx> = {};
function finishPay(r: PayResult) {
  showPayResult(r);
  if (r.status !== 'pending') return;
  const ctx = PAY_CTX[r.kind];
  (async () => {
    for (let i = 0; i < 90; i++) {
      await wait(2000);
      if (LAST_PAY !== r) return;
      if (ctx && ctx.landed(r)) { LAST_PAY = { ...r, status: 'paid', message: undefined }; commit(); haptic(); return }
    }
  })();
}
/** what a cancelled or failed booking payment leaves behind on the phone, so Bookings shows it */
function noteAttempt(r: PayResult, job: Omit<Job, 'pay' | 'status' | 'id'>) {
  if (r.status !== 'cancelled' && r.status !== 'failed') return;
  const p = px(), id = r.bookingId || r.orderId || newId('x');
  p.attempts = [{ ...job, id, status: 'cancelled', pay: r.status, payVia: r.gateway, orderId: r.orderId } as Job, ...(p.attempts || []).filter(a => a.id !== id)].slice(0, 20);
  commit();
}
export const UPCOMING: JobStatus[] = ['upcoming', 'assigned', 'on_the_way', 'in_progress'];
export function bookingsView() {
  const real = S.acct ? px().jobs : [], tried = S.acct ? (px().attempts || []).filter(a => !real.some(j => j.id === a.id)) : [];
  const jobs = [...real, ...tried];
  const upcoming = jobs.filter(j => UPCOMING.includes(j.status)).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const previous = jobs.filter(j => !UPCOMING.includes(j.status)).sort((a, b) => (b.date + b.slot).localeCompare(a.date + a.slot));
  return { upcoming, previous };
}
export const jobOf = (id: string): Job | null => (S.acct ? px().jobs.find(j => j.id === id) || (px().attempts || []).find(j => j.id === id) || null : null);
/** "Interior Cleaning and 2 more" */
export const jobTitle = (j: Job) => (j.lines[0] ? j.lines[0].name : 'Car wash') + (j.lines.length > 1 ? ` and ${j.lines.length - 1} more` : '');
export const jobWhen = (j: Job) => (j.slot ? whenText({ date: j.date, slot: j.slot }) : fmt(j.date, { weekday: 'short', day: 'numeric', month: 'short' }) + (j.mode === 'instant' ? ' · Instant' : ''));
export const canRate = (j: Job) => j.status === 'done' && feature('ratings');

/* ---- account deletion ---- */
/** what the "Before you delete your account" page warns about, for this account */
export function deletionBlockers(): string[] {
  const out: string[] = [], up = bookingsView().upcoming.length, w = wallet().balance, p = activePass();
  if (up) out.push(`${up} upcoming booking${up > 1 ? 's' : ''} will be cancelled`);
  if (w > 0) out.push(`${fmtR(w)} in ${WALLET.name} will be lost`);
  if (p) out.push(`${p.visitsLeft} WD Pass visit${p.visitsLeft > 1 ? 's' : ''} will be lost`);
  return out;
}

/* ---- checkout plumbing (Cashfree session from n8n) ---- */

/* ---- demo money (preview + test login): the same rules n8n runs, applied on the phone ---- */
function demoLedger(kind: LedgerRow['kind'], amt: number, note: string, bucket: 'cash' | 'promo') {
  const w = px().wallet, days = bucket === 'promo' ? WALLET.promoExpiryDays : WALLET.cashExpiryDays;
  w.ledger.unshift({ id: newId('l'), at: nowIST(), kind, amt: r2(amt), note, bucket, expires: amt > 0 ? iso(addDays(TODAY, days)) : null });
  if (bucket === 'promo') w.promo = r2(w.promo + amt); else w.cash = r2(w.cash + amt);
}
function demoDebit(amt: number, note: string) {   // promo first (it expires sooner), then cash
  const w = px().wallet, p = Math.min(w.promo, amt), c = r2(amt - p);
  if (p) demoLedger('payment', -p, note, 'promo'); if (c) demoLedger('payment', -c, note, 'cash');
}

/* ---- real-mode sync of the read-only money docs, addresses and bookings ---- */
/** every payment order of this customer, any status (payorders, read-only; the server writes them) */
export type OrderRow = { id: string; at: string; kind: string; title: string; status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded'; total: number; walletPart: number; toPay: number; payId: string; bookingId: string; why: string };
let ORDERS: OrderRow[] = [];
export const orders = (): OrderRow[] => ORDERS;
const orderStatus = (s: string): OrderRow['status'] => (s === 'paid' || s === 'failed' || s === 'cancelled' || s === 'refunded' ? s : 'pending');
let moneyUnsubs: Unsub[] = [], RATINGS: Record<string, { stars: number; review?: string }> = {};
const jobStatus = (d: any): JobStatus => ({ new: d.washer_id ? 'assigned' : 'upcoming', scheduled: 'upcoming', declined: 'upcoming', on_the_way: 'on_the_way', doing: 'in_progress', done: 'done', cancelled: 'cancelled' } as Record<string, JobStatus>)[d.status] || 'upcoming';
function fromOndemand(id: string, d: any): Job {
  const items: any[] = Array.isArray(d.services) && d.services.length ? d.services : [{ id: d.service_id, q: 1, price: d.price }];
  const lines: JobLine[] = items.map(x => { const { id: sid } = parseKey(String(x.id || '')), v = (x.variant || DEFAULT_VARIANT) as VariantId, pr = priceOf(sid, v), c = svcOf(sid), p = packInfo(sid);
    return { key: lineKey(sid, v), id: sid, name: c ? c.name : p ? p.name : String(d.service || sid), q: +x.q || 1, price: +x.price || pr.price, mrp: pr.mrp, mins: pr.mins, variant: c ? v : undefined } });
  const r = RATINGS[id];
  return { id, mode: d.mode || (d.slot ? 'scheduled' : 'instant'), status: jobStatus(d), date: d.date || '', slot: d.slot || '', lines, total: +(d.total ?? d.price) || 0, saved: +d.saved || 0,
    mins: lines.reduce((a, l) => a + l.mins * l.q, 0), addressId: d.address_id || undefined, pay: d.refunded ? 'refunded' : d.pass_id ? 'pass' : d.paid ? 'paid' : 'pay_on_arrival', payVia: d.pay_via || undefined,
    coupon: d.coupon || null, washer: d.washer_id ? { id: String(d.washer_id), name: d.washer_name || d.washer_id, rating: +d.washer_rating || 0, jobs: +d.washer_jobs || 0, photo: d.washer_photo || null, phone: d.washer_phone || null } : null,
    stars: r ? r.stars : undefined, review: r ? r.review : undefined, createdAt: d.created_at || '', photos: (Array.isArray(d.photos) ? d.photos : []).map((p: any) => ({ src: typeof p === 'string' ? p : String(p && (p.url || p.src) || ''), label: p && p.kind ? String(p.kind).replace(/^./, (c: string) => c.toUpperCase()) : undefined })).filter((p: any) => /^(https:|data:image\/(jpeg|webp|png);base64,)/.test(p.src)), photo: typeof d.photo === 'string' && /^(https:|data:image\/(jpeg|webp|png);base64,)/.test(d.photo) ? d.photo : null,
    payRef: d.gateway_ref || d.pay_ref || undefined, orderId: d.pay_ref || undefined, eta: d.eta || etaFrom(d.mode, d.created_at),
    // order_paid: what the gateway took for the whole order (bookings since Nov 2026); older paid docs: price was that amount
    recur: d.recur || undefined, paidOnline: +d.order_paid > 0 ? +d.order_paid : d.paid === true && d.pay_ref && !d.series_id && +d.price > 0 ? +d.price : undefined,
    washerAt: Number.isFinite(+d.washer_lat) && Number.isFinite(+d.washer_lng) && d.washer_lat !== '' ? { lat: +d.washer_lat, lng: +d.washer_lng, at: String(d.washer_loc_at || '') } : undefined,
    carAt: Number.isFinite(+d.lat) && Number.isFinite(+d.lng) && d.lat !== '' && d.lat != null ? { lat: +d.lat, lng: +d.lng } : undefined };
}
// instant: a washer within 1 km reaches the car in 15 minutes
export const ETA_MIN = 15;
function etaFrom(mode: any, created: any): string | undefined {
  if (mode !== 'instant' || !created) return undefined;
  const t = Date.parse(String(created).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(created)) ? '' : '+05:30'));
  return Number.isFinite(t) ? new Date(t + ETA_MIN * 60000).toISOString() : undefined;
}
/* ---- washer profile: washer_public/{id}, written by the ops dashboard. Counters add the app's ratings onto the manager's pre-app numbers. ---- */
export type WasherProfile = { id: string; name: string; phone: string | null; photo: string | null; since: string | null; area: string; languages: string[];
  verified: { id: boolean; police: boolean; training: boolean; assessment: boolean }; jobs: number; rating: number; ratingCount: number };
const OWNER_PHONES = ['7701808924'];   // never shown as a washer's number
const num = (v: any) => (Number.isFinite(+v) ? +v : 0);
export function washerPhone(v: any): string | null {
  const t = String(v || '').replace(/\D/g, '').slice(-10);
  return t.length === 10 && !OWNER_PHONES.includes(t) ? t : null;
}
export function fromWasherPublic(id: string, d: any, fb?: { name?: string; rating?: number; jobs?: number; photo?: string | null }): WasherProfile {
  const rc = num(d.rating_count_base) + num(d.rating_count_app), rs = num(d.rating_base) * num(d.rating_count_base) + num(d.rating_sum_app), v = d.verified || {};
  return { id, name: String(d.name || (fb && fb.name) || id), phone: washerPhone(d.phone), photo: d.photo || (fb && fb.photo) || null, since: d.since ? String(d.since) : null,
    area: String(d.area || ''), languages: Array.isArray(d.languages) ? d.languages.map(String) : [], verified: { id: !!v.id, police: !!v.police, training: !!v.training, assessment: !!v.assessment },
    jobs: num(d.jobs_base) + num(d.jobs_app) || (fb && fb.jobs) || 0, rating: rc > 0 ? rs / rc : (fb && fb.rating) || 0, ratingCount: rc };
}
const SAMPLE_WASHERS: Record<string, any> = {
  chotte: { name: 'Chotte', phone: '9876500011', since: '2024-03-01', area: 'Greater Kailash', languages: ['Hindi', 'English'], verified: { id: true, police: true, training: true, assessment: true }, jobs_base: 1180, rating_base: 4.8, rating_count_base: 240, jobs_app: 64, rating_sum_app: 96, rating_count_app: 20 },
  shahrukh: { name: 'Shahrukh', phone: '9876500022', since: '2025-01-15', area: 'Saket', languages: ['Hindi', 'Urdu'], verified: { id: true, police: true, training: true, assessment: false }, jobs_base: 620, rating_base: 4.7, rating_count_base: 120, jobs_app: 31, rating_sum_app: 46, rating_count_app: 10 },
};
/** load a washer's public profile; falls back to what the booking already told us, never throws */
export async function loadWasher(idOrName: string, fb?: { name?: string; rating?: number; jobs?: number; photo?: string | null }): Promise<WasherProfile | null> {
  const id = String(idOrName || '').trim();
  if (!id) return fb && fb.name ? fromWasherPublic(fb.name, {}, fb) : null;
  try {
    if (!DB) { const d = SAMPLE_WASHERS[id.toLowerCase()] || SAMPLE_WASHERS[String(fb && fb.name || '').toLowerCase()]; return d ? fromWasherPublic(id, d, fb) : fb && fb.name ? fromWasherPublic(id, {}, fb) : null }
    const g = await DB.doc('washer_public/' + id).get();
    if (g.exists) return fromWasherPublic(id, g.data() || {}, fb);
  } catch (e) { console.warn('washer_public', e) }
  return fb && fb.name ? fromWasherPublic(id, {}, fb) : { ...fromWasherPublic(id, {}, { name: id }) };
}

/* ---- start code: jobcodes/{bookingId} = { code, phone, created_at }. The washer types it in WD Partner to start the
   wash, so the right washer starts the right job. The phone creates it once if missing (the dashboard may too: a
   create that loses the race is refused by the rules and the snapshot then shows the dashboard's code). ---- */
let JOBCODES: Record<string, string> = {}, codeUnsubs: Record<string, Unsub> = {};
const rand4 = () => {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.getRandomValues === 'function') { const a = new Uint32Array(1); c.getRandomValues(a); return String(a[0] % 10000).padStart(4, '0') }
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
};
function watchCodes(jobs: Job[]) {
  if (!DB || !AUTH || !AUTH.phone()) return;
  const open = new Set(jobs.filter(j => UPCOMING.includes(j.status)).map(j => j.id));
  for (const id of Object.keys(codeUnsubs)) if (!open.has(id)) { try { codeUnsubs[id]() } catch (e) {} delete codeUnsubs[id] }
  open.forEach(id => {
    if (codeUnsubs[id]) return;
    let tried = false;
    codeUnsubs[id] = DB.doc('jobcodes/' + id).onSnapshot(g => {
      const d = g.exists ? g.data() : null;
      if (d && /^\d{4}$/.test(String(d.code))) { if (JOBCODES[id] !== String(d.code)) { JOBCODES[id] = String(d.code); emitSoon() } return }
      if (tried) return; tried = true;
      DB.doc('jobcodes/' + id).set({ code: rand4(), phone: AUTH!.phone(), created_at: nowIST() }).catch((e: any) => console.warn('jobcode', e));
    }, () => {});
  });
}
/** the 4-digit code the washer needs to start this booking (demo bookings get a fixed sample) */
export const jobCode = (id: string): string | null => (realAcct() ? JOBCODES[id] || null : String(1000 + (Array.from(id).reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 9000)));

function watchMoney() {
  stop(moneyUnsubs); if (!DB || !AUTH || !realAcct() || !AUTH.phone()) return;
  const ph = AUTH.phone()!, P = () => px(), q = (c: string, f: string) => DB.collection(c).where(f, '==', ph), warn = (w: string) => (e: any) => console.warn(w, e);
  moneyUnsubs.push(DB.doc('wallets/' + ph).onSnapshot(g => { const d = g.exists ? g.data() : {}; const cash = +d.cash || 0, promo = +d.promo || 0; if (P().wallet.cash === cash && P().wallet.promo === promo) return; P().wallet.cash = cash; P().wallet.promo = promo; emitSoon() }, warn('wallet')));
  moneyUnsubs.push(q('walletledger', 'phone').onSnapshot(ds => { const next = ds.map(s => { const d = s.data(); return { id: s.id, at: d.at || '', kind: d.kind, amt: +d.amt || 0, note: d.note || '', bucket: d.bucket === 'promo' ? 'promo' : 'cash', expires: d.expires || null } }); if (snapSame('ledger', next)) return; P().wallet.ledger = next as any; emitSoon() }, warn('ledger')));
  moneyUnsubs.push(q('payorders', 'phone').onSnapshot(ds => {
    ORDERS = ds.map(s => { const d = s.data(), names = Array.isArray(d.lines) ? d.lines.map((l: any) => l && l.name).filter(Boolean).join(', ') : '';
      return { id: s.id, at: d.paid_at || d.created_at || '', kind: String(d.kind || ''), title: d.kind === 'wallet_topup' ? 'Add money to WD Money' : d.kind === 'pass' ? String(d.plan_name || 'WD Pass') : d.kind === 'booking' ? (names || 'Booking') : String(d.plan_name || d.title || 'Payment'),
        status: orderStatus(String(d.status || '')), total: +d.total || +d.amount || 0, walletPart: +d.wallet_use || 0, toPay: +d.amount || 0, payId: String(d.rzp_payment_id || d.cf_payment_id || ''), bookingId: String(d.booking_id || ''), why: String(d.error || '') } as OrderRow }).sort((a, b) => b.at.localeCompare(a.at));
    emitSoon();
  }, warn('payorders')));
  retryPendingRzp();
  moneyUnsubs.push(q('refunds', 'phone').onSnapshot(ds => { const next = ds.map(s => { const d = s.data(); return { id: s.id, at: d.at || '', amt: +d.amt || 0, status: d.status || 'initiated', to: d.to === 'wallet' ? 'wallet' : 'source', what: d.what || '', bookingId: d.booking_id, eta: d.eta } }); if (snapSame('refunds', next)) return; P().refunds = next as any; emitSoon() }, warn('refunds')));
  moneyUnsubs.push(q('passes', 'phone').onSnapshot(ds => { const next = ds.map(s => { const d = s.data(); return { id: s.id, plan: d.plan, visitsTotal: +d.visits_total || 0, visitsLeft: +d.visits_left || 0, boughtAt: d.bought_at || '', validTill: d.valid_till || '', status: d.status || 'active' } }); if (snapSame('passes', next)) return; P().passes = next; emitSoon() }, warn('passes')));
  moneyUnsubs.push(DB.doc('referrals/' + ph).onSnapshot(g => { const d = g.exists ? g.data() : {}; const next = { completed: +d.completed || 0, earned: +d.earned || 0, pending: +d.pending || 0, ledger: Array.isArray(d.ledger) ? d.ledger : [] }; if (snapSame('referral', next)) return; P().referral = next; emitSoon() }, warn('referral')));
  moneyUnsubs.push(q('addresses', 'phone').onSnapshot(ds => { P().addresses = ds.map(s => { const d = s.data(); return { id: s.id, label: d.label, other: d.other || undefined, flat: d.flat || '', street: d.street || '', area: d.area || '', lat: +d.lat, lng: +d.lng, receiver: d.receiver_self === false ? { self: false, name: d.receiver_name || '', phone: d.receiver_phone || '' } : { self: true } } }); if (P().addrId && !P().addresses.some(a => a.id === P().addrId)) P().addrId = null; commit() }, warn('addresses')));
  moneyUnsubs.push(q('bookingratings', 'phone').onSnapshot(ds => { RATINGS = {}; ds.forEach(s => { const d = s.data(); RATINGS[d.booking_id] = { stars: d.stars, review: d.review } }); P().jobs = P().jobs.map(j => RATINGS[j.id] ? { ...j, stars: RATINGS[j.id].stars, review: RATINGS[j.id].review } : j); emit() }, () => {}));
  moneyUnsubs.push(q('ondemand', 'customer_id').onSnapshot(ds => { const next = ds.map(s => fromOndemand(s.id, s.data())); if (snapSame('jobs', next)) return; P().jobs = next; watchCodes(next); emitSoon() }, warn('jobs')));
  moneyUnsubs.push(() => { Object.values(codeUnsubs).forEach(u => { try { u() } catch (e) {} }); codeUnsubs = {}; JOBCODES = {} });
  subscribeCoupons(DB);   // public coupons -> COUPONS (data/config.ts)
}

const PX_ACTS = {
  /* --- cart mode, schedule, recurring --- */
  setCartMode(m: CartMode) { if (!modeOn(m)) throw off(m === 'instant' ? 'Instant service is' : m === 'scheduled' ? 'Scheduling is' : 'Recurring booking is'); S.cartMode = m; if (m === 'instant') S.when = null; if (S.coupon && !couponCheck(S.coupon, undefined, m).ok) S.coupon = null; commit(); haptic() },
  // date 'YYYY-MM-DD', slot 'HH:MM' from slotsFor(); null clears (instant)
  setWhen(w: When) {
    if (w) { const s = slotsFor(w.date).find(x => x.t === w.slot); if (!s) throw new Error('Pick a time slot.'); if (!s.ok) throw new Error(s.past ? 'That slot has passed. Pick another.' : 'That slot is fully booked. Pick another.') }
    S.when = w; if (w && S.cartMode === 'instant') S.cartMode = 'scheduled'; commit();
  },
  setRecur(r: Recur | null) {
    if (r) { if (!RECURRING.some(x => x.id === r.freq)) throw new Error('Pick how often.'); if (!r.days.length) throw new Error('Pick at least one day.'); if (!slotsFor(r.start).some(x => x.t === r.slot)) throw new Error('Pick a time slot.') }
    S.recur = r; if (r) S.cartMode = 'recurring'; commit();
  },
  /** add one unit of a service in a car size (or a pack); same as addSvc(lineKey(id, v)) */
  addLine(id: string, v?: VariantId) { act.addSvc(lineKey(id, v)) },
  subLine(id: string, v?: VariantId) { act.subSvc(lineKey(id, v)) },
  removeLine(key: string) { if (S.svc && S.svc[key]) { delete S.svc[key]; commit() } },
  /** sold-out and surcharge data for the next SLOT_DAYS days (real: slots/{date}); demo is computed */
  async loadSlots() {
    if (!moneyLive() || !DB) { await wait(350); return }
    await Promise.all(slotDays().map(async d => { try { const g = await DB!.doc('slots/' + d.date).get(); SLOT_LIVE[d.date] = g.exists ? g.data() : null } catch (e) { SLOT_LIVE[d.date] = null } }));
    emit();
  },

  /* --- coupons --- */
  async applyCoupon(code: string) {
    if (!feature('coupons')) throw off('Coupons are'); const c = code.trim().toUpperCase(); if (!c) throw new Error('Enter a coupon code.');
    const ch = couponCheck(c); if (!ch.ok) throw new Error(ch.why);
    if (moneyLive()) { const j = await server!.call('wd-coupon-validate', { code: c, mode: cartMode(), recur: cartMode() === 'recurring' ? S.recur : null, lines: svcLines().lines.map(l => ({ id: l.id, variant: l.variant || null, q: l.q })) }); if (!j.valid) throw new Error(j.message || "That code isn't valid.") }
    S.coupon = c; commit(); haptic(); toast(`${c} applied · you save ${fmtR(ch.off)}`); return ch.off;
  },
  removeCoupon() { S.coupon = null; commit() },
  setUseWallet(on: boolean) { S.useWallet = on && feature('wallet') && wallet().balance > 0; commit(); haptic() },
  setUsePass(on: boolean) { S.usePass = on && feature('pass') && !!activePass(); commit(); haptic() },

  /** Books the cart in its mode (instant / scheduled / recurring). Real: n8n wd-booking-create prices it, applies
   *  coupon, wallet and pass server-side, writes ondemand/{id}, and returns a Cashfree session for what is left.
   *  -> { id, paid, pending }: pending = paid online, the booking confirms when Cashfree's webhook lands. */
  async placeOrder(via = 'UPI'): Promise<{ id: string; paid: boolean; pending: boolean; shown?: boolean }> {
    const mode = cartMode(), { lines } = svcLines(), b = bill(), a = selectedAddress();
    if (!lines.length) throw new Error('Add a service first.');
    const gone = lines.find(l => unavailable(l.id) || (!svcOf(l.id) && !packInfo(l.id))); if (gone) throw new Error(`${gone.name}: ${unavailable(gone.id) || 'not available right now'}. Remove it to continue.`);
    if (!modeOn(mode)) throw off(mode === 'instant' ? 'Instant service is' : mode === 'scheduled' ? 'Scheduling is' : 'Recurring booking is');
    if (mode === 'instant' && !instantStatus().open) throw new Error(instantStatus().label + '. Schedule it for later.');
    if (mode === 'scheduled' && !S.when) throw new Error('Pick a time slot.');
    if (mode === 'recurring' && !S.recur) throw new Error('Pick how often and a time slot.');
    if (!a) throw new Error('Add the address where your car is parked.');
    if (b.couponError) throw new Error(b.couponError);
    const title = jobTitlePlain(lines) + (b.perMonth ? ` · first month, ${b.perMonth.visits} visits` : ''), snap = { mode, date: mode === 'scheduled' ? S.when!.date : mode === 'recurring' ? S.recur!.start : iso(TODAY), slot: mode === 'scheduled' ? S.when!.slot : mode === 'recurring' ? S.recur!.slot : '',
      lines: lines.map(l => ({ key: l.key, id: l.id, name: l.name, q: l.q, price: l.price, mrp: l.mrp, mins: l.mins, variant: l.variant })), total: b.total, saved: b.saved, mins: b.mins, addressId: a.id,
      coupon: b.coupon ? b.coupon.code : null, washer: null, createdAt: nowIST() };
    const clearCart = () => { S.svc = {}; S.coupon = null; S.when = null; S.useWallet = false; S.usePass = false; if (pendingRef()) setPendingRef(''); commit() };
    if (moneyLive()) {
      const ctx: PayCtx = PAY_CTX.booking = { kind: 'booking', title, amount: b.toPay, gatewayIfFree: b.walletUse ? 'WD Money' : 'WD Pass',
        landed: r => px().jobs.some(x => x.id === r.bookingId) };
      let r: PayResult;
      try {
        r = await payWith13('wd-booking-create', { mode, lines: lines.map(l => ({ id: l.id, variant: l.variant || null, q: l.q })), when: mode === 'scheduled' ? S.when : null, recur: mode === 'recurring' ? S.recur : null,
          coupon: S.coupon, useWallet: S.useWallet, usePass: S.usePass, addressId: a.id, name: A().name || '', car: (() => { try { const c = car(); return { name: c.name, reg: c.plate } } catch (e) { return null } })(), ref: pendingRef() || null, via, shownTotal: b.total }, ctx);
      } catch (e: any) {
        // Until wd-booking-create is live, only what the old path can really book goes through it: ONE instant pack on an
        // ACTIVE account (the rules refuse every other ondemand write from the phone). Never charge for anything else.
        if (e && e.notReady) {
          const one = lines.length === 1 && lines[0].pack && lines[0].q === 1 && mode === 'instant' && A().status === 'active';
          if (!one) throw new Error(`Online booking opens soon. WhatsApp us on ${showPhone(SUPPORT.whatsapp)} to book.`);
          const r = await act.bookServices(null, via); S.coupon = null; S.when = null; commit(); return { ...r, pending: false };
        }
        throw e;
      }
      if (r.status === 'paid' || r.status === 'pending') clearCart(); else noteAttempt(r, snap);
      finishPay(r);
      return { id: r.bookingId || '', paid: r.status === 'paid', pending: r.status === 'pending', shown: true };
    }
    await wait(900);
    const p = px(), id = newId('j');
    if (b.walletUse) demoDebit(b.walletUse, jobTitlePlain(lines));
    if (b.passCover) { const ps = activePass(); if (ps) { ps.visitsLeft--; if (!ps.visitsLeft) ps.status = 'used' } }
    if (b.coupon) p.usedCoupons.push(b.coupon.code);
    const job0 = { id, mode, status: 'upcoming' as JobStatus, date: mode === 'scheduled' ? S.when!.date : mode === 'recurring' ? S.recur!.start : iso(TODAY), slot: mode === 'scheduled' ? S.when!.slot : mode === 'recurring' ? S.recur!.slot : '',
      recur: mode === 'recurring' ? S.recur!.freq : undefined, lines: lines.map(l => ({ key: l.key, id: l.id, name: l.name, q: l.q, price: l.price, mrp: l.mrp, mins: l.mins, variant: l.variant })),
      total: b.total, saved: b.saved, mins: b.mins, addressId: a.id, pay: (b.toPay === 0 && b.passCover ? 'pass' : 'paid') as Job['pay'], payVia: b.toPay === 0 ? (b.walletUse ? WALLET.name : 'WD Pass is') : 'Razorpay · ' + via, coupon: b.coupon ? b.coupon.code : null, washer: null, createdAt: nowIST(),
      orderId: 'WDB' + id.slice(1).toUpperCase(), payRef: b.toPay ? 'pay_demo' + id.slice(-6) : undefined, paidOnline: b.toPay || undefined, eta: mode === 'instant' ? new Date(Date.now() + ETA_MIN * 60000).toISOString() : undefined };
    // recurring: the paid first month is one booking per visit, like the server writes them
    const visits = mode === 'recurring' && b.perMonth ? recurDates(S.recur!, b.perMonth.visits) : [];
    if (visits.length) p.jobs.unshift(...visits.map((date, i) => ({ ...job0, id: i ? id + '_' + (i + 1) : id, mode: 'scheduled' as CartMode, date, total: i || !b.coupon ? b.perVisit! : r2(b.total - b.perVisit! * (visits.length - 1)), coupon: i ? null : job0.coupon })));
    else p.jobs.unshift(job0);
    clearCart();
    finishPay({ status: 'paid', kind: 'booking', title, amount: b.toPay, gateway: b.toPay ? 'Razorpay' : b.walletUse ? 'WD Money' : 'WD Pass', ref: b.toPay ? 'pay_demo' + id.slice(-6) : undefined, orderId: 'WDB' + id.slice(1).toUpperCase(), bookingId: id, at: nowIST() });
    return { id, paid: true, pending: false, shown: true };
  },
  /** cancel an upcoming booking; refund goes to WD Money (demo) or per policy (n8n wd-booking-cancel) */
  async cancelJob(id: string) {
    if (!feature('cancel')) throw new Error('To cancel this booking, chat with us.');
    const j = jobOf(id); if (!j || !UPCOMING.includes(j.status)) throw new Error('This booking cannot be cancelled now.');
    if (moneyLive()) { await server!.call('wd-booking-cancel', { bookingId: id }); toast('Cancelled. Your refund is on its way.'); return }
    await wait(600); j.status = 'cancelled';
    if (j.pay === 'paid') { demoLedger('refund', j.total, 'Refund · ' + jobTitle(j), 'cash'); px().refunds.unshift({ id: newId('RF'), at: nowIST(), amt: j.total, status: 'credited', to: 'wallet', what: jobTitle(j) + ' · cancelled', bookingId: j.id }); j.pay = 'refunded' }
    commit(); toast(j.pay === 'refunded' ? `Cancelled. ${fmtR(j.total)} is back in ${WALLET.name}.` : 'Cancelled.');
  },
  /** move an upcoming booking to another slot (demo: edits the job; real: n8n wd-booking-reschedule, see BACKEND.md) */
  async rescheduleJob(id: string, to: { date: string; slot: string }) {
    if (!feature('reschedule')) throw new Error('To move this booking, chat with us.');
    const j = jobOf(id); if (!j || !UPCOMING.includes(j.status)) throw new Error('This booking cannot be rescheduled now.');
    if (j.status === 'on_the_way' || j.status === 'in_progress') throw new Error('Your washer is already on the way.');
    const s = slotsFor(to.date).find(x => x.t === to.slot);
    if (!s || !s.ok) throw new Error('That slot is not available. Pick another.');
    if (moneyLive()) { await server!.call('wd-booking-reschedule', { bookingId: id, date: to.date, slot: to.slot }) }
    else await wait(500);
    j.date = to.date; j.slot = to.slot; j.mode = j.mode === 'instant' ? 'scheduled' : j.mode; commit(); toast('Rescheduled to ' + whenText(to));
  },
  /** stars 1-5 (+ optional text) for a finished booking: bookingratings/{bookingId} */
  async rateJob(id: string, stars: number, review = '') {
    if (!feature('ratings')) throw off('Rating is');
    const j = jobOf(id); if (!j || !canRate(j)) throw new Error('You can rate a booking once it is done.');
    const n = Math.max(1, Math.min(5, Math.round(stars))), txt = review.trim().slice(0, 300);
    j.stars = n; j.review = txt || undefined; commit(); haptic();
    if (DB && AUTH && realAcct()) { try { await DB.doc('bookingratings/' + id).set({ booking_id: id, phone: AUTH.phone(), stars: n, review: txt, at: nowIST() }) } catch (e) { console.warn('rating', e); throw failed() } }
    toast(n >= 4 ? 'Thanks. Your washer will see your rating.' : 'Sorry. We will look into it and call you.');
  },

  /* --- addresses --- */
  /** current position for the map pin and the distance chips: the phone's GPS (expo-location). `prompt` is for taps by the user: it shows our
   *  explainer and then the system permission dialog. Without permission or GPS it resolves to the account's area centre with
   *  source 'fallback' (and leaves the distance chips off, since there is no real position). */
  async locate(opts: { prompt?: boolean } = {}): Promise<Fix> {
    const a = selectedAddress(), c = AREA_COORDS[(S.acct && A().area) || ''] || [77.0989, 28.668];
    const fix = await getPosition(a ? { lat: a.lat, lng: a.lng } : { lat: c[1], lng: c[0] }, opts);
    if (fix.source === 'gps') { HERE = { lat: fix.lat, lng: fix.lng }; emit() }
    return fix;
  },
  /** create (no id) or update an address -> its id. Receiver phone: 10 digits when it is for someone else. */
  async saveAddress(x: Omit<Address, 'id'> & { id?: string }): Promise<string> {
    const flat = (x.flat || '').trim(), label = x.label as AddressLabel;
    if (!flat) throw new Error('Add your flat or house number.');
    if (!Number.isFinite(x.lat) || !Number.isFinite(x.lng)) throw new Error('Pick the location on the map.');
    if (label === 'Other' && !(x.other || '').trim()) throw new Error('Give this address a name.');
    if (!x.receiver.self) { if (!x.receiver.name.trim()) throw new Error("Add the receiver's name."); if (!/^[6-9]\d{9}$/.test(x.receiver.phone.replace(/\D/g, '').slice(-10))) throw new Error("Add the receiver's 10-digit number.") }
    const p = px(), id = x.id || (DB && realAcct() ? DB.collection('addresses').doc().id : newId('a'));
    const a: Address = { id, label, other: label === 'Other' ? (x.other || '').trim().slice(0, 30) : undefined, flat: flat.slice(0, 120), street: (x.street || '').trim().slice(0, 120), area: (x.area || '').trim().slice(0, 160), lat: x.lat, lng: x.lng,
      receiver: x.receiver.self ? { self: true } : { self: false, name: x.receiver.name.trim().slice(0, 60), phone: x.receiver.phone.replace(/\D/g, '').slice(-10) } };
    if (DB && AUTH && realAcct()) {
      try { await DB.doc('addresses/' + id).set({ phone: AUTH.phone(), label: a.label, other: a.other || '', flat: a.flat, street: a.street, area: a.area, lat: a.lat, lng: a.lng,
        receiver_self: a.receiver.self, receiver_name: a.receiver.self ? '' : a.receiver.name, receiver_phone: a.receiver.self ? '' : a.receiver.phone, updated_at: nowIST() }) }
      catch (e) { console.warn('address', e); throw failed() }
    } else await wait(400);
    const i = p.addresses.findIndex(q => q.id === id); if (i >= 0) p.addresses[i] = a; else p.addresses.push(a);
    if (!p.addrId || i < 0) p.addrId = id; commit(); toast('Address saved'); return id;
  },
  async deleteAddress(id: string) {
    const p = px(); if (DB && realAcct()) { try { await DB.doc('addresses/' + id).delete() } catch (e) { console.warn('address', e); throw failed() } }
    p.addresses = p.addresses.filter(a => a.id !== id); if (p.addrId === id) p.addrId = p.addresses[0] ? p.addresses[0].id : null; commit(); toast('Address deleted');
  },
  selectAddress(id: string) { const p = px(); if (p.addresses.some(a => a.id === id)) { p.addrId = id; commit(); haptic() } },

  /* --- profile --- */
  async saveProfile(x: { first: string; last: string; email: string }) {
    const first = x.first.trim(), last = x.last.trim(), email = x.email.trim().toLowerCase();
    if (!first) throw new Error('Add your first name.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("That email doesn't look right.");
    const name = (first + ' ' + last).trim().slice(0, 80);
    if (DB && AUTH && realAcct()) { try { await DB.doc('customers/' + AUTH.phone()).update({ name, first_name: first.slice(0, 40), last_name: last.slice(0, 40), email: email.slice(0, 120), updated_at: nowIST() }) } catch (e) { console.warn(e); throw failed() } }
    else await wait(400);
    const a = A(); a.name = name; a.first = first; a.last = last; a.email = email; commit(); toast('Profile saved');
  },

  /* --- wallet --- */
  /** add money: Cashfree for amt, n8n credits amt (cash) + 5% cashback (promo) when the payment clears */
  async topUp(amt: number, via = 'UPI'): Promise<{ pending: boolean; shown?: boolean }> {
    if (!feature('wallet') || !feature('topup')) throw off('Adding money is');
    const err = topUpCheck(amt); if (err) throw new Error(err);
    if (moneyLive()) {
      const was = wallet().balance;
      const r = await payWith13('wd-wallet-topup', { amount: amt, via, name: S.acct ? A().name : '' }, PAY_CTX.wallet = { kind: 'wallet', title: `Add ${fmtR(amt)} to ${WALLET.name}`, amount: amt, gatewayIfFree: 'WD Money', landed: () => wallet().balance > was });
      finishPay(r); return { pending: r.status === 'pending', shown: true };
    }
    await wait(1000); demoLedger('topup', amt, 'Added to wallet', 'cash'); const bonus = topUpBonus(amt); if (bonus) demoLedger('cashback', bonus, `${WALLET.cashbackPct}% cashback on top-up`, 'promo');
    commit(); haptic();
    finishPay({ status: 'paid', kind: 'wallet', title: `Add ${fmtR(amt)} to ${WALLET.name}`, amount: amt, gateway: 'Razorpay', ref: 'pay_demo' + Date.now().toString(36).slice(-6), orderId: newId('WDW').toUpperCase(), at: nowIST() });
    return { pending: false, shown: true };
  },
  /** gift card: n8n checks the code, marks it used and credits WD Money. Demo: any 'WD' + 6-12 letters/digits = ₹100 */
  async claimGift(code: string): Promise<number> {
    if (!feature('wallet') || !feature('giftcard')) throw off('Gift cards are');
    const c = code.trim().toUpperCase().replace(/\s|-/g, ''); if (!/^[A-Z0-9]{8,16}$/.test(c)) throw new Error('Enter the 8-16 character gift card code.');
    if (moneyLive()) { const j = await server!.call('wd-gift-claim', { code: c }); toast(`${fmtR(+j.amount || 0)} added to ${WALLET.name}`); return +j.amount || 0 }
    await wait(800); if (!c.startsWith('WD')) throw new Error("That gift card isn't valid.");
    if (px().wallet.ledger.some(l => l.kind === 'gift' && l.note.endsWith(c.slice(-4)))) throw new Error('This gift card was already claimed.');
    demoLedger('gift', 100, 'Gift card ••' + c.slice(-4), 'cash'); commit(); toast(`₹100 added to ${WALLET.name}`); return 100;
  },

  /* --- WD Pass --- */
  async buyPass(id?: string, via = 'UPI'): Promise<{ pending: boolean; shown?: boolean }> {
    if (!feature('pass') || !passPlan(id)) throw off('WD Pass is'); const q = passQuote(id); if (activePass()) throw new Error('You already have an active pass.');
    const title = `${q.plan.name} · ${q.plan.visits} visits`;
    if (moneyLive()) {
      const r = await payWith13('wd-pass-buy', { plan: q.plan.id, via, useWallet: false, name: S.acct ? A().name : '' }, PAY_CTX.pass = { kind: 'pass', title, amount: q.total, gatewayIfFree: 'WD Money',
        landed: r => px().passes.some(p => p.id === 'P' + r.orderId) });
      finishPay(r); return { pending: r.status === 'pending', shown: true };
    }
    await wait(1000);
    px().passes.unshift({ id: newId('P'), plan: q.plan.id, visitsTotal: q.plan.visits, visitsLeft: q.plan.visits, boughtAt: nowIST(), validTill: iso(addDays(TODAY, q.plan.days)), status: 'active' });
    commit();
    finishPay({ status: 'paid', kind: 'pass', title, amount: q.total, gateway: 'Razorpay', ref: 'pay_demo' + Date.now().toString(36).slice(-6), orderId: newId('WDP').toUpperCase(), at: nowIST() });
    return { pending: false, shown: true };
  },

  /* --- referral --- */
  async shareReferral(): Promise<void> {
    if (!feature('refer')) throw off('Referral is');
    const v = referralView(), text = `Get your car pressure-washed at your parking spot by Washing Daddy. Use my link and get ₹${v.friendGets} off your first booking: ${v.link}`;
    try { await Share.share(Platform.OS === 'ios' ? { message: text } : { message: text, title: 'Washing Daddy invite' }); return } catch (e) {}
    return act.copy(text, 'Invite copied. Paste it on WhatsApp.');
  },
  /** "Find friends to refer": TODO(REFER) needs expo-contacts in a new native build; shares the link meanwhile */
  async findFriends(): Promise<void> { return PX_ACTS.shareReferral() },

  /* --- account deletion --- */
  /** files deletions/{phone} (admin deletes within 30 days; finance records kept as the law requires), then signs out */
  async requestDeletion(reason = '') {
    const a = A(), why = reason.trim().slice(0, 300);
    if (DB && AUTH && realAcct()) {
      try { await DB.doc('deletions/' + AUTH.phone()).set({ phone: AUTH.phone(), name: a.name.slice(0, 80), reason: why, status: 'requested', at: nowIST() }) }
      catch (e) { console.warn('deletion', e); act.whatsapp(`Please delete my Washing Daddy account and data. Number: +91 ${a.phone}. Name: ${a.name}.`) }
    } else await wait(600);
    toast('Deletion requested. We will remove your data within 30 days.'); await act.logout();
  },

  /** pull-to-refresh for money/bookings screens */
  async refresh() { if (moneyLive()) { watchMoney(); await act.loadSlots(); await wait(500) } else await wait(700); emit() },
};
const jobTitlePlain = (lines: { name: string }[]) => (lines[0] ? lines[0].name : 'Car wash') + (lines.length > 1 ? ` and ${lines.length - 1} more` : '');

/* =====================================================================
   ACTIONS
   ===================================================================== */
/** Android can read the sign-in SMS itself (Firebase uses the SMS Retriever API: no SMS permission needed) and sign in before
 *  the code is typed. The OTP screen listens for that and carries on by itself. */
export const onAutoSignIn = (f: () => void): (() => void) => (AUTH ? AUTH.onChange(b => { if (b && AUTH.phone()) f() }) : () => {});
/* ---------- where we wash (data/areas.ts, circles drawn in the admin dashboard) ----------
   coverage(): is the customer's spot inside a service circle? The spot is the selected address (it has map coordinates), or
   the phone's GPS fix when no address is picked yet. Outside -> Home shows the "not in your area yet" banner with Notify me,
   and every action that books or takes money for a service refuses (SERVED_ONLY below; workflow 13 checks bookings again). */
export const NOT_SERVED_TITLE = 'We are currently not available in this area';
export const NOT_SERVED_SUB = "We're adding new locations every month. Tap Notify me and we'll tell you the day we start here.";
export type Coverage = { known: boolean; ok: boolean; area: ServiceArea | null; lat: number; lng: number; label: string; src: 'address' | 'gps' | 'none' };
export function coverage(): Coverage {
  const a = selectedAddress();
  if (a && Number.isFinite(a.lat) && Number.isFinite(a.lng)) { const z = areaAt(a.lat, a.lng); return { known: true, ok: !!z, area: z, lat: a.lat, lng: a.lng, label: (a.area || a.street || '').split(',')[0].trim(), src: 'address' } }
  const h = here();
  if (h && Number.isFinite(h.lat) && Number.isFinite(h.lng)) { const z = areaAt(h.lat, h.lng); return { known: true, ok: !!z, area: z, lat: h.lat, lng: h.lng, label: '', src: 'gps' } }
  return { known: false, ok: true, area: null, lat: NaN, lng: NaN, label: '', src: 'none' };
}
/** throws before anything is booked or charged when the spot is outside every service circle (or not known at all) */
function assertServed() {
  const c = coverage();
  if (!c.known) throw new Error('Add the address where your car is parked first, so we can check that we wash there.');
  if (!c.ok) throw Object.assign(new Error(`${NOT_SERVED_TITLE}${c.label ? ' (' + c.label + ')' : ''}. We're adding new locations every month. Tap Notify me on Home and we'll tell you first.`), { notServed: true });
}
/* "Notify me": one request per phone, saved by workflow 13 (wd-waitlist) in waitlist/{+91number} with the spot. Kept on the phone
   too, so the banner says "You're on the list", and re-sent at the next start if the server could not take it. */
type NotifyRec = { lat: number; lng: number; label: string; at: string; sent: boolean; near?: number };
const NOTIFY_KEY = 'wd-notify-v1';
let NOTIFY: NotifyRec | null = null;
export const notifyState = () => NOTIFY;
async function saveNotify() { try { NOTIFY ? await AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(NOTIFY)) : await AsyncStorage.removeItem(NOTIFY_KEY) } catch (e) {} }
async function sendNotify(): Promise<boolean> {
  if (!NOTIFY || NOTIFY.sent) return true;
  if (!moneyLive() || !server) return false;
  try {
    const r: any = await server.call('wd-waitlist', { lat: NOTIFY.lat, lng: NOTIFY.lng, area: NOTIFY.label, name: S.acct ? A().name : '' });
    NOTIFY.sent = true; if (r && typeof r.near === 'number') { NOTIFY.near = r.near; INTEREST = { key: spotKey(NOTIFY.lat, NOTIFY.lng), near: r.near } }
    await saveNotify(); return true;
  }
  catch (e: any) { return false }
}
/* How many neighbours are waiting near this spot, toward the WAIT_GOAL cars that open a new area. Live: asked from the server
   (peek). Demo: a steady made-up number for the spot, so the bar can be shown. */
export const WAIT_GOAL = 25;
const spotKey = (lat: number, lng: number) => lat.toFixed(2) + ',' + lng.toFixed(2);
let INTEREST: { key: string; near: number } | null = null;
export function interest(): { near: number; goal: number; joined: boolean } {
  const c = coverage(), joined = !!NOTIFY && !!c.known && Math.abs(NOTIFY.lat - c.lat) < 0.01 && Math.abs(NOTIFY.lng - c.lng) < 0.01;
  let near = 0;
  if (c.known) {
    const k = spotKey(c.lat, c.lng);
    if (INTEREST && INTEREST.key === k) near = INTEREST.near;
    else if (!REAL) { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; near = 9 + (h % 11) + (joined ? 1 : 0) }
    else if (joined && NOTIFY && typeof NOTIFY.near === 'number') near = NOTIFY.near;
  }
  return { near: Math.min(near, WAIT_GOAL), goal: WAIT_GOAL, joined };
}
/** ask the server how many are waiting near the spot (live only); the banner re-reads interest() when it changes */
export async function loadInterest(): Promise<void> {
  const c = coverage(); if (!REAL || !c.known || !moneyLive() || !server) return;
  try { const r: any = await server.call('wd-waitlist', { lat: c.lat, lng: c.lng, peek: true }); if (r && typeof r.near === 'number') { INTEREST = { key: spotKey(c.lat, c.lng), near: r.near }; emit() } } catch (e) {}
}

const failed = () => new Error(`That didn't go through. Call or WhatsApp us on ${showPhone(SUPPORT.phone)}.`);
export const act = {
  ...PX_ACTS,
  /* --- sign-in --- */
  /** Sends the sign-in code. WhatsApp first (n8n workflow 15); SMS when asked, or by itself when WhatsApp is not live yet, the
   *  number is not on WhatsApp, or it is an admin number. Resolves to the channel the code actually went out on. */
  async sendOtp(phone10: string, via: OtpVia = 'whatsapp'): Promise<OtpVia> {
    if (!/^[6-9]\d{9}$/.test(phone10)) throw new Error('Enter a 10-digit mobile number.');
    if (via === 'whatsapp' && !feature('whatsappLogin')) via = 'sms';   // HQ switch
    if (!AUTH) { await wait(700); otpVia = via; return via }
    if (via === 'whatsapp' && AUTH.sendWhatsApp) {
      try { await AUTH.sendWhatsApp(phone10); otpVia = 'whatsapp'; return 'whatsapp' }
      catch (e: any) {
        const code = e && e.code;
        // rate limits for this number stand; anything else on WhatsApp's side (not live, cap reached, Meta down) falls back to SMS
        if (code === 'wait' || code === 'too_many' || code === 'bad_number' || code === 'offline') throw e;
        if (code === 'not_on_whatsapp') toast("This number isn't on WhatsApp. Sending an SMS instead.");
      }
    }
    await AUTH.send(phone10); otpVia = 'sms'; return 'sms';
  },
  // -> 'in' (account found, signed in) or 'new' (go through sign-up)
  async verifyOtp(phone10: string, code: string): Promise<'in' | 'new'> {
    let customer: Account | null = null, token = 'test-' + phone10;
    if (AUTH && DB) {
      const u = otpVia === 'whatsapp' && AUTH.confirmWhatsApp ? await AUTH.confirmWhatsApp(phone10, code) : await AUTH.confirm(code); token = u.uid;
      try { const g = await DB.doc('customers/' + AUTH.phone()).get(); if (g.exists) customer = fromCustomerDoc(g.data(), S.acct) } catch (e) { console.warn(e) }
    } else { await wait(700); if (code !== '1234') throw new Error('That code is wrong. Try 1234 in this test version.'); if (phone10 === DEMO_PHONE) customer = sampleAccount() }
    if (!customer) { pendingSignup = { token, phone: phone10 }; return 'new' }
    S.session = { token, phone: phone10, real: REAL }; S.acct = customer; S.carIdx = 0; S.px = REAL ? emptyPX() : demoPX(); enter(false); return 'in';
  },
  // new customer: customers/{+91number}, status 'new' until the owner checks the car and activates it
  /** New customer, after the OTP. `mode` is what they picked on "How should we wash?": 'instant' (one-time / instant service, no plan
   *  yet; lands on Home in instant mode) or 'monthly' (a plan; the car starts as 'new' until the first payment). `address` is the
   *  exact spot from the search box or the map pin; it becomes the first saved address and gives the car its parking line. */
  async signup(s: { name: string; model: string; plate: string; mode: 'instant' | 'monthly'; plan?: PlanId | null;
    address: { flat: string; street: string; area: string; lat: number; lng: number } }) {
    const p = pendingSignup; if (!p) throw new Error('Sign in again to continue.');
    const ad = s.address;
    if (!ad || !(ad.flat || '').trim()) throw new Error('Add your flat or house number.');
    if (!Number.isFinite(ad.lat) || !Number.isFinite(ad.lng)) throw new Error('Pick your location on the map.');
    const monthly = s.mode === 'monthly';
    let plan: PlanId = (monthly && s.plan) ? s.plan : DEFAULT_PLAN;
    if (HIDDEN_FROM_NEW.includes(plan)) plan = DEFAULT_PLAN;
    const area = areaFor(ad.area + ' ' + ad.street).slice(0, 80), w = WASHER_FOR(area), plate = s.plate.trim().toUpperCase().replace(/\s+/g, '');
    const spot = [ad.flat.trim(), ad.street.trim()].filter(Boolean).join(', ');
    const addr = { flat: ad.flat.trim().slice(0, 120), street: (ad.street || '').trim().slice(0, 120), area: (ad.area || '').trim().slice(0, 160), lat: ad.lat, lng: ad.lng };
    // The live Firestore rules only allow the listed top-level fields on customers/{phone} (hasOnly), so the exact spot and the
    // sign-up choice travel inside the car entry (cars is a free-form list) instead of as new top-level fields.
    const car0 = { id: 'c0', name: s.model, make: '', plate, plan, washer: w, parking: spot || (area + ', parking spot to be confirmed'), window: 'Before 7:30 AM', keys: "I'll unlock it",
      mode: s.mode, addr };
    if (DB && AUTH) {
      try { await DB.doc('customers/' + AUTH.phone()).set({ phone: AUTH.phone(), name: s.name, area, status: 'new', cars: [car0], regs: [regOf(car0)], since: fmt(TODAY, { month: 'long', year: 'numeric' }), created_at: nowIST(), updated_at: nowIST() }) }
      catch (e) { console.warn(e); throw new Error("Couldn't save your sign-up. Check your signal and try again.") }
    } else await wait(800);
    S.session = { token: p.token, phone: p.phone, real: REAL };
    S.acct = { name: s.name, phone: p.phone, since: fmt(TODAY, { month: 'long', year: 'numeric' }), area, mode: s.mode, prefs: { photo: true, pay: true, drops: true },
      cars: [{ ...car0, id: REAL ? 'c0' : 'c' + Date.now(), img: null, till: null, status: 'new', doneAt: null, mins: 0, streak: 0, washes: 0, paused: null, note: null, rating: 0 } as any],
      payments: [], orders: [], requests: [], bookings: [] };
    S.carIdx = 0; S.px = emptyPX(); pendingSignup = null;
    // first saved address = the signup spot, kept on the phone (no addresses rule is published yet, so no Firestore write here)
    S.px.addresses.push({ id: newId('a'), label: 'Home' as AddressLabel, ...addr, receiver: { self: true } }); S.px.addrId = S.px.addresses[0].id;
    enter(true);
    if (!monthly) { try { act.setCartMode('instant') } catch (e) {} }
  },
  /** "Notify me" on the Home banner: remember the spot and tell the server (or keep it and retry at the next start) */
  async notifyMe(): Promise<'saved' | 'queued'> {
    const c = coverage();
    if (!c.known) throw new Error('Add your address or turn on location first, so we know where to come.');
    const before = interest().near;
    NOTIFY = { lat: c.lat, lng: c.lng, label: c.label, at: nowIST(), sent: !REAL, near: before + 1 }; if (!REAL) INTEREST = { key: spotKey(c.lat, c.lng), near: before + 1 }; await saveNotify(); emit();
    if (!REAL) { await wait(500); return 'saved' }
    return (await sendNotify()) ? 'saved' : 'queued';
  },
  async resendOtp(phone10: string, via: OtpVia = otpVia): Promise<OtpVia> { const v = await act.sendOtp(phone10, via); toast(v === 'whatsapp' ? 'New code sent on WhatsApp' : 'New code sent by SMS'); return v },
  /** "Skip" on sign-in: straight into the app as a guest. Anything that needs an account sends them back to log in (see GUEST_BLOCKED). */
  continueAsGuest() {
    S.session = { token: 'guest', phone: '', real: REAL, guest: true };
    S.acct = { name: 'Guest', phone: '', since: fmt(TODAY, { month: 'long', year: 'numeric' }), area: '', prefs: { photo: true, pay: true, drops: true },
      cars: [{ id: 'g0', name: 'Your car', make: '', plate: '', plan: DEFAULT_PLAN, washer: '', parking: '', window: 'Before 7:30 AM', keys: "I'll unlock it",
        img: null, till: null, status: 'new', doneAt: null, mins: 0, streak: 0, washes: 0, paused: null, note: null, rating: 0 }],
      payments: [], orders: [], requests: [], bookings: [] } as any;
    S.carIdx = 0; S.px = emptyPX(); enter(false);
  },
  /** guest -> back to the sign-in screen; the cart and chosen services stay so they can finish after logging in */
  askLogin(why = 'Log in to continue') {
    if (!isGuest()) return; try { closeSheet() } catch (e) {} S.session = null; S.acct = null; S.carIdx = 0; resetPX(); ui = { ...ui, tab: 'home', page: null, pages: [] }; commit(); toast(why);
  },
  async logout() {
    // wipe the saved account (name, address, cars, orders) from the phone, not just from memory; only the theme stays
    S.session = null; S.acct = null; S.cart = {}; S.svc = {}; S.carIdx = 0; resetPX(); stopSync(); if (SIM) { clearTimeout(SIM.t); SIM = null }
    clearTimeout(saveT); try { await AsyncStorage.setItem(KEY, JSON.stringify(S)) } catch (e) {}
    if (AUTH) await AUTH.signOut(); ui = { ...ui, tab: 'home' }; commit();
  },

  /* --- cars --- */
  switchCar(dir: number) { if (A().cars.length < 2) return; haptic(); S.carIdx = (S.carIdx + dir + A().cars.length) % A().cars.length; ui = { ...ui, carNonce: ui.carNonce + 1 }; save(); renderAll() },
  pickCar(i: number) { if (i !== S.carIdx) { S.carIdx = i; ui = { ...ui, carNonce: ui.carNonce + 1 }; save(); renderAll(); toast(`Showing your ${car().name}`) } },
  async addCar(x: { name: string; plate: string; area: string; plan: PlanId }) {
    if (HIDDEN_FROM_NEW.includes(x.plan)) x = { ...x, plan: DEFAULT_PLAN };
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
      let out = '', cut = false;
      // Android: cut the car out of its background (transparent WebP); anything else falls through to the JPEG below
      const png = await cutout(r.assets[0].uri);
      if (png) {
        for (const w of [640, 480, 360]) {
          const ref = await ImageManipulator.manipulate(png).resize({ width: w }).renderAsync();
          const s = await ref.saveAsync({ base64: true, compress: .8, format: SaveFormat.WEBP });
          out = 'data:image/webp;base64,' + s.base64; if (out.length <= 390000) { cut = true; break }
        }
        if (!cut) out = '';
      }
      if (!cut) for (const w of [900, 640, 480]) {
        const ref = await ImageManipulator.manipulate(r.assets[0].uri).resize({ width: Math.min(w, r.assets[0].width || w) }).renderAsync();
        const s = await ref.saveAsync({ base64: true, compress: .7, format: SaveFormat.JPEG });
        out = 'data:image/jpeg;base64,' + s.base64; if (out.length <= 390000) break;
      }
      c.photo = out; c.photoCut = cut; ui = { ...ui, carNonce: ui.carNonce + 1 }; commit(); toast('Your car is in.');
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
  rate(n: number, tag?: string) {
    const c = car(); c.rating = n; if (!(DB && realAcct())) RATED[c.id] = { stars: n, tag }; commit(); haptic();
    if (DB && realAcct()) { RATED[c.id] = { stars: n, tag }; DB.doc(`ratings/${iso(TODAY)}_${regOf(c)}`).set({ reg: regOf(c), date: iso(TODAY), stars: n, ...(tag ? { tag } : {}), at: nowIST() }).catch(() => { delete RATED[c.id]; emitSoon(); toast("Couldn't save your rating. Try again.") }); }
    toast(n >= 4 ? `${c.washer} will see your ${n} stars` : 'Sorry. Tell us what was missed.');
  },

  /* --- payments: each returns {pending}; pending = money taken, waiting for the bank, plan updates by itself --- */
  /** A monthly plan is always paid by autopay: a Razorpay subscription (n8n workflow 14). wd-sub-create prices it from
   *  the Firestore catalog and makes the subscription; the customer authorises the mandate (and pays the first month) in
   *  Razorpay Checkout inside the app; wd-sub-confirm checks the signature and the payment with Razorpay and moves the
   *  paid-up date. Every later month Razorpay charges by itself and wd-sub-hook moves the date. Preview: simulated.
   *  -> { pending, till }: pending = paid, waiting for Razorpay to confirm; the plan updates by itself. */
  async payPlan(_via = 'UPI') {
    const c = car(), p = planOf(c), { to } = planPayDates(c), what = `${p.name} · ${c.name} (autopay)`;
    if (autopayOn(c)) throw new Error(`Autopay is already on for your ${c.name}. ${p.name} renews by itself every month.`);
    if (!realAcct() || !server) {
      await wait(1100);
      A().payments.push({ d: iso(TODAY), what, amt: p.price, via: 'Razorpay Autopay', ref: 'pay_demo' + Date.now().toString().slice(-6), autopay: true });
      c.till = iso(to); c.autopay = { sub: 'sub_demo' + c.id, status: 'active', plan: p.id, amount: p.price, since: iso(TODAY), last_paid: iso(TODAY) }; commit();
      return { pending: false, till: to };
    }
    if (!PAYWEB_AVAILABLE) throw new Error('Update the app to start autopay. Nothing was charged.');
    const j: any = await server.call('wd-sub-create', { plan: p.id, car: { reg: c.plate, name: c.name } });   // throws: nothing was charged
    let r;
    try { r = await razorpayCheckout({ keyId: String(j.keyId), subscriptionId: String(j.subscriptionId), recurring: true, name: j.name || 'Washing Daddy', description: j.description || what,
      prefill: { contact: (j.prefill && j.prefill.contact) || '', name: A().name || '' } }) }
    catch (e: any) {
      if (e && e.cancelled) throw new Error('Autopay was not set up. Nothing was charged.');
      throw new Error((errOf(e) && !(e && e.unavailable) ? errOf(e) + '. ' : "Razorpay didn't open. ") + 'No money was taken.');
    }
    let k: any = { paid: false };
    try { k = await server.call('wd-sub-confirm', { subscriptionId: j.subscriptionId, ...r }) } catch (e) { /* Razorpay's webhook confirms it */ }
    const amt = Number(j.amount) > 0 ? Number(j.amount) / 100 : p.price;
    A().payments.push({ d: iso(TODAY), what, amt, via: 'Razorpay Autopay', ref: r.razorpay_payment_id, pending: !k.paid, autopay: true });
    c.autopay = { sub: String(j.subscriptionId), status: k.paid ? 'active' : 'authenticated', plan: p.id, amount: amt };
    if (k.paid && /^\d{4}-\d{2}-\d{2}$/.test(String(k.till || ''))) c.till = String(k.till);
    commit();
    return { pending: !k.paid, till: k.paid && k.till ? parse(String(k.till)) : to };
  },
  /** stop autopay at the end of the paid month (n8n wd-sub-cancel); the plan runs till its paid-up date */
  async cancelAutopay() {
    const c = car(), ap = c.autopay;
    if (!ap || !(autopayOn(c) || ap.status === 'halted')) throw new Error('Autopay is not on for this car.');
    if (!realAcct() || !server) { await wait(600); c.autopay = { ...ap, status: 'cancelling' }; commit(); return { till: c.till } }
    const j: any = await server.call('wd-sub-cancel', { subscriptionId: ap.sub, car: { reg: c.plate } });
    c.autopay = { ...ap, status: String(j.status || 'cancelling') }; commit();
    return { till: (j.till as string) || c.till };
  },
  async switchPlan(id: PlanId, via = 'UPI') {
    if (HIDDEN_FROM_NEW.includes(id)) throw new Error('That plan is no longer available.');
    // autopay charges the plan it was set up for: switching first would leave the next charge on the old price
    if (autopayOn(car()) && id !== car().plan) throw new Error(`Autopay is on for ${planOf(car()).name}. Cancel autopay in Profile, then pick the new plan when this month ends.`);
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
    // the rules let only an ACTIVE account write ondemand/: never take money for a booking that cannot be saved
    if (payReal() && A().status !== 'active') throw new Error(`Online booking opens after your first wash. WhatsApp us on ${showPhone(SUPPORT.whatsapp)} to book.`);
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

  /* --- service cart --- */
  addSvc(id: string) {
    const sid = parseKey(id).id, u = unavailable(sid);
    if (u) { toast(u); haptic(); return }
    if (!svcOf(sid) && !packInfo(sid)) { toast('Not available right now'); return }
    if (!S.svc) S.svc = {}; S.svc[id] = (S.svc[id] || 0) + 1; commit(); haptic() },
  subSvc(id: string) { if (!S.svc) return; S.svc[id] = Math.max(0, (S.svc[id] || 0) - 1); if (!S.svc[id]) delete S.svc[id]; commit(); haptic() },
  clearSvc() { S.svc = {}; commit() },
  // Books the whole service cart as one ondemand doc. Pack-only carts pay first like act.book; everything else is
  // pay on arrival (paid:false) because n8n workflow 8 cannot price a la carte ids yet. when=null means instant.
  async bookServices(when: When, via = 'UPI'): Promise<{ id: string; paid: boolean }> {
    const { lines, sub } = svcLines(); if (!lines.length) throw new Error('Add a service first.');
    if (svcPayOnline() && !when) { const r = await act.book(lines[0].id, via); S.svc = {}; commit(); return r }
    const c = car(), names = lines.map(l => (l.q > 1 ? l.q + ' × ' : '') + l.name).join(', ');
    let paid = '';
    if (svcPayOnline() && payReal()) { const r = await checkout('onetime', lines[0].price, `${lines[0].name} · ${c.name}`, via, { service: lines[0].id }); paid = r.ref || 'paid' }
    const done = (id: string) => {
      // Kept on the account so the Washes tab can list it under Upcoming
      A().bookings.unshift({ id, carId: c.id, type: names, what: paid ? 'Paid · ₹' + sub : 'Pay on arrival · ₹' + sub, date: when ? when.date : iso(TODAY), slot: when ? when.slot : 'Instant · 15 min' });
      S.svc = {}; commit(); return { id, paid: !!paid };
    };
    if (!DB || !AUTH || !realAcct()) { await wait(800); return done('demo') }
    try {
      const ref = await DB.collection('ondemand').add({ service: names, service_id: lines.map(l => l.id).join('+'), services: lines.map(l => ({ id: l.id, variant: l.variant || null, q: l.q, price: l.price })),
        price: sub, paid: !!paid, pay_ref: paid, pay_on_arrival: !paid, car: c.name, reg: c.plate, area: c.area || A().area || '',
        phone: AUTH.phone(), customer_id: AUTH.phone(), status: when ? 'scheduled' : 'new', washer_id: '', created_at: nowIST(), date: when ? when.date : iso(TODAY), slot: when ? when.slot : '' });
      if (!when) fetch(N8N + '/wd-ondemand-dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc_id: ref.id, area: c.area || A().area || '' }) }).catch(() => {});
      return done(ref.id);
    } catch (e) { console.warn('booking', e); throw new Error(paid ? "We have your payment. We'll call you to send a washer." : 'Booking failed. Try again.') }
  },

  /* --- store --- */
  addToCart(id: string, q = 1) { if (!feature('store')) return; const u = unavailable(id); if (u) { toast(u); return } if (!PRODUCTS.some(x => x.id === id)) return; S.cart[id] = (S.cart[id] || 0) + q; commit(); haptic(); const p = PRODUCTS.find(x => x.id === id)!; toast(`${q > 1 ? q + ' × ' : ''}${pName(p)} added`) },
  setQty(id: string, delta: number) { S.cart[id] = Math.max(0, (S.cart[id] || 0) + delta); if (!S.cart[id]) delete S.cart[id]; commit() },

  /* --- profile --- */
  setDetail(k: 'parking' | 'window' | 'keys', v: string) { const c = car(); if (v.trim()) c[k] = v.trim(); commit(); toast(k === 'parking' ? 'Saved. ' + c.washer + ' has the new spot.' : 'Saved') },
  togglePref(k: 'photo' | 'pay' | 'drops') { A().prefs[k] = !A().prefs[k]; commit(); haptic() },
  setName(v: string) { if (v.trim()) { A().name = v.trim(); commit() } toast('Saved') },
  setTheme(t: ThemePick) { S.theme = t; commit(); toast(t === 'light' ? 'Day look' : t === 'dark' ? 'Night look' : 'Follows your phone') },
  cycleTheme() { act.setTheme(S.theme === 'light' ? 'dark' : S.theme === 'dark' ? 'system' : 'light') },
  async copy(txt: string, msg: string) { try { await Clipboard.setStringAsync(txt); toast(msg) } catch (e) { toast(txt) } },
  async copyRef() {
    const link = inviteLink(), text = `Washing Daddy pressure-washes my car every morning, no pocha. Join with my link and get ₹200 off your first month: ${link}`;
    try { await Share.share(Platform.OS === 'ios' ? { message: text } : { message: text, title: 'Washing Daddy invite' }); return } catch (e) {}
    return act.copy(text, 'Invite copied. Paste it on WhatsApp.');
  },
  whatsapp(text = '') { Linking.openURL(`https://wa.me/91${SUPPORT.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`).catch(() => toast(`WhatsApp us on ${showPhone(SUPPORT.whatsapp)}`)) },
  call(num = '') { const n = String(num).replace(/\D/g, '').slice(-10) || SUPPORT.phone; Linking.openURL(`tel:+91${n}`).catch(() => {}) },
  /** a custom button from the dashboard (ui_buttons): url / whatsapp / call / page / service / legal */
  runButton(b: UiButton) {
    if (b.paused) { toast('Not available right now'); return }
    const v = b.action.value;
    switch (b.action.type) {
      case 'url': if (/^https?:\/\//.test(v)) act.openUrl(v); return;
      case 'whatsapp': act.whatsapp(v); return;
      case 'call': act.call(v); return;
      case 'service': if (svcOf(v) || packInfo(v)) openPage({ k: 'svc', id: v }); else toast('Not available right now'); return;
      case 'legal': openPage({ k: 'legalDoc', id: v }); return;
      case 'page': openNamed(v); return;
    }
  },
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
      () => { d.status = 'washing'; d.started_at = full.started_at; d.photos = [] },
      ...full.tasks.map((t, i) => () => { d.tasks[i] = { ...d.tasks[i], done: true, done_at: t.done_at } }), () => { d.status = 'done'; d.finished_at = full.finished_at; d.photos = full.photos }];
    let i = 0;
    const tick = () => { steps[i](); SIM!.doc = { ...d }; emit(); if (ui.tab !== 'live' || i === 0) toast(chipText(c, d)); i++;
      if (i < steps.length) SIM!.t = setTimeout(tick, 1700);
      else { confetti(); toast(`Your ${c.name} is done`); setTimeout(() => { SIM = null; ui = { ...ui, sim: false }; emit() }, 2500) } };
    SIM.t = setTimeout(tick, 900);
  },
};

// a guest can browse and fill the cart; these need a real account, so they open sign-in instead
const GUEST_BLOCKED = ['addCar', 'carPhoto', 'pause', 'resume', 'note', 'removeNote', 'issue', 'closeReq', 'rate', 'payPlan', 'cancelAutopay', 'switchPlan', 'tip', 'checkoutCart', 'book',
  'cancelBooking', 'bookServices', 'togglePref', 'setName', 'deleteAccount', 'placeOrder', 'cancelJob', 'rescheduleJob', 'rateJob', 'saveAddress', 'deleteAddress',
  'saveProfile', 'topUp', 'claimGift', 'buyPass', 'shareReferral', 'findFriends', 'requestDeletion'] as const;
// booking or paying for a service needs a spot inside a service circle (assertServed). Wrapped before the guest check below,
// so a guest is sent to log in first and the area is checked after.
const SERVED_ONLY = ['placeOrder', 'book', 'bookServices', 'buyPass', 'payPlan', 'checkoutCart', 'switchPlan'] as const;
for (const k of SERVED_ONLY) {
  const f = (act as any)[k]; if (typeof f !== 'function') continue;
  (act as any)[k] = async function (this: any, ...args: any[]) { if (!isGuest()) assertServed(); return f.apply(this, args) };
}
for (const k of GUEST_BLOCKED) {
  const f = (act as any)[k]; if (typeof f !== 'function') continue;
  (act as any)[k] = function (this: any, ...args: any[]) {
    if (isGuest()) { act.askLogin(); return Promise.reject(Object.assign(new Error('Log in to continue'), { guest: true })) }
    return f.apply(this, args);
  };
}
/** a page or tab by name (custom buttons); names that a feature switch turned off do nothing */
export function openNamed(v: string) {
  const need: Record<string, keyof Features> = { refer: 'refer', pass: 'pass', money: 'wallet', refunds: 'wallet', coupons: 'coupons', store: 'store', plan: 'plans', schedule: 'scheduled' };
  if (need[v] && !feature(need[v])) { toast('Not available right now'); return }
  if (v === 'store' || v === 'plan') { go(v); return }
  const simple = ['refer', 'pass', 'money', 'coupons', 'bookings', 'help', 'about', 'legal', 'schedule', 'cart', 'refunds', 'profile'] as const;
  if ((simple as readonly string[]).includes(v)) openPage({ k: v } as NonNullable<Page>);
  else if (v === 'addresses') openPage({ k: 'addresses' });
}
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
