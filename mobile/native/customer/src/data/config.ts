/* LIVE APP CONFIG (admin dashboard -> Firestore -> this app, no app update). Contract:
   /mnt/project-files/dashboard-2026-11-16/CONFIG-CONTRACT.md. Collections: appcfg/customer, catalog/*, coupons/* (public),
   passes_cfg/*, legal/*, help/*, ui_buttons/*, slots_cfg/default.

   Where the values come from, per collection ("slice"):
   - live    a Firestore server snapshot (onSnapshot). Authoritative, also when it is EMPTY (empty state in the app).
   - cache   the last live snapshot, saved on the phone (AsyncStorage) and shown at the next start until live arrives.
   - builtin data/builtin.ts (today's content). Only in the web preview (no Firebase), or on a real build that has
             neither a cache nor an answer from Firestore after FALLBACK_MS (first launch offline). Coupons and
             custom buttons never fall back: a real build without them shows none.
   Switches and texts (appcfg) and the slot grid (slots_cfg) always start from built-in defaults and are overlaid.

   How the app reads it: apply() rewrites the reference tables in data/reference.ts IN PLACE (CAR_SERVICES, PACKS,
   PRODUCTS, PLANS, PASS_PLANS, COUPONS, FEES, ...), so every existing reader (bill, cart, pages) sees live values, and
   exposes the new things (feature switches, legal pages, help topics, custom buttons) through the getters below.
   state.ts starts it (startConfig) and re-renders on every change (onConfigChange). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Db, Unsub } from '../backend/types';
import * as R from './reference';
import { builtinDocs, BuiltinDocs } from './builtin';
import { setAreas } from './areas';

type Doc = Record<string, any>;
type Docs = Record<string, Doc>;
export type Slice = 'appcfg' | 'catalog' | 'coupons' | 'passes_cfg' | 'legal' | 'help' | 'ui_buttons' | 'slots_cfg';
const SLICES: Slice[] = ['appcfg', 'catalog', 'coupons', 'passes_cfg', 'legal', 'help', 'ui_buttons', 'slots_cfg'];
const DOC_SLICES: Partial<Record<Slice, string>> = { appcfg: 'customer', slots_cfg: 'default' };
const NO_FALLBACK: Slice[] = ['coupons', 'ui_buttons'];
type Src = 'pending' | 'builtin' | 'cache' | 'live';
const CACHE_KEY = 'wd-cfg-v1', FALLBACK_MS = 6000;

// pristine copy of today's content, taken before apply() ever touches the reference tables
const BUILTIN: BuiltinDocs = JSON.parse(JSON.stringify(builtinDocs()));
const SVC_IMG: Record<string, string> = Object.fromEntries(R.CAR_SERVICES.map(s => [s.id, s.img]));
const PACK_IMG: Record<string, string> = Object.fromEntries(R.PACKS.map(p => [p.id, p.img]));
const BUILTIN_PLANS: R.Plan[] = JSON.parse(JSON.stringify(R.PLANS));

let RAW: Partial<Record<Slice, Docs>> = {};
const SRC: Record<Slice, Src> = Object.fromEntries(SLICES.map(s => [s, 'pending'])) as Record<Slice, Src>;
const subs = new Set<() => void>();
export const onConfigChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } };
const notify = () => subs.forEach(f => { try { f() } catch (e) {} });

/* ---------------- normalised views ---------------- */
export type Features = { wallet: boolean; topup: boolean; giftcard: boolean; pass: boolean; coupons: boolean; refer: boolean; recurring: boolean; scheduled: boolean;
  reschedule: boolean; cancel: boolean; ratings: boolean; store: boolean; plans: boolean; instant: boolean };
export type Sections = { hero: boolean; instantCards: boolean; packs: boolean; referBanner: boolean; services: boolean; trust: boolean; passPromo: boolean; more: boolean };
export type AppCfg = {
  maintenance: { on: boolean; message: string };
  instant: { on: boolean; openFrom: string; openTill: string; busy: boolean; busyMessage: string };
  sections: Sections; tabs: { washes: boolean; money: boolean; profile: boolean }; features: Features;
  home: { heroTitle: string; heroSub: string; heroTheme: string; referAmount: number; friendAmount: number; servicesTitle: string; servicesSub: string; packsTitle: string; packsSub: string; trustTitle: string; trustSub: string };
  support: { whatsapp: string; phone: string; email: string };
};
export type LegalPage = { id: string; title: string; body: string; version: string; updated: string; showIn: string[]; order: number; url: string; draft: boolean; icon: string };
export type HelpCfg = { id: string; title: string; sub: string; icon: string; order: number; faqs: [string, string][] };
export type UiButton = { id: string; placement: string; label: string; sub: string; icon: string; tint: string; style: 'card' | 'banner'; action: { type: string; value: string }; order: number; paused: boolean };

let APP: AppCfg;   // set below, once the helpers exist
let LEGAL: LegalPage[] = [];
let HELP: HelpCfg[] = [];
let BUTTONS: UiButton[] = [];

/* ---------------- helpers ---------------- */
const str = (v: any, d = '') => (v == null ? d : String(v));
const num = (v: any, d = 0) => (Number.isFinite(+v) && v !== '' && v !== null ? +v : d);
const bool = (v: any, d = true) => (typeof v === 'boolean' ? v : d);
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const strs = (v: any) => arr(v).map(x => str(x)).filter(Boolean);
const status = (v: any): R.LiveStatus => (v === 'paused' || v === 'hidden' ? v : 'live');
const hhmm = (v: any, d: string) => (/^\d{1,2}:\d{2}$/.test(str(v)) ? str(v).padStart(5, '0') : d);
/** a pair list stored as [{t,d}] / [{q,a}] / [{k,v}] (Firestore) or [[a,b]] (JSON) -> [a,b][] */
export function pairs(v: any): [string, string][] {
  return arr(v).map((x: any): [string, string] | null => {
    if (Array.isArray(x)) return [str(x[0]), str(x[1])];
    if (x && typeof x === 'object') { const k = Object.keys(x); const a = x.t ?? x.q ?? x.k ?? x.title ?? x[k[0]], b = x.d ?? x.a ?? x.v ?? x.desc ?? x[k[1]]; return [str(a), str(b)] }
    return null;
  }).filter((x): x is [string, string] => !!x && !!(x[0] || x[1]));
}
const byOrder = <T extends { order?: number; name?: string; title?: string }>(a: T, b: T) => (a.order ?? 999) - (b.order ?? 999) || str(a.name ?? a.title).localeCompare(str(b.name ?? b.title));
const fill = <T,>(target: T[], items: T[]) => { target.splice(0, target.length, ...items) };
const fillObj = (target: Record<string, any>, src: Record<string, any>) => { Object.keys(target).forEach(k => delete target[k]); Object.assign(target, src) };
/** Firestore Timestamp / millis / ISO / display string -> "16 Nov 2026" or the string itself */
function when(v: any): string {
  if (!v) return '';
  const d = typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate() : typeof v === 'object' && v.seconds ? new Date(v.seconds * 1000) : typeof v === 'number' ? new Date(v) : /^\d{4}-\d{2}-\d{2}/.test(str(v)) ? new Date(str(v)) : null;
  if (!d || isNaN(d.getTime())) return str(v);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
}

function normAppcfg(raw: Doc): AppCfg {
  const B = BUILTIN.appcfg.customer, g = (o: any, k: string) => (o && typeof o === 'object' ? o[k] : undefined);
  const flags = <K extends string>(keys: K[], o: any, d: any): Record<K, boolean> => Object.fromEntries(keys.map(k => [k, bool(g(o, k), bool(g(d, k), true))])) as Record<K, boolean>;
  const inst = raw.instant || {}, home = raw.home || {}, sup = raw.support || {};
  const features = flags(['wallet', 'topup', 'giftcard', 'pass', 'coupons', 'refer', 'recurring', 'scheduled', 'reschedule', 'cancel', 'ratings', 'store', 'plans', 'instant'], raw.features, B.features);
  const instOn = bool(inst.on, true) && features.instant;
  const phone10 = (v: any, d: string) => { const s = str(v).replace(/\D/g, '').slice(-10); return s.length === 10 ? s : d };
  return {
    maintenance: { on: bool(g(raw.maintenance, 'on'), false), message: str(g(raw.maintenance, 'message'), B.maintenance.message) || B.maintenance.message },
    instant: { on: instOn, openFrom: hhmm(inst.openFrom, B.instant.openFrom), openTill: hhmm(inst.openTill, B.instant.openTill), busy: bool(inst.busy, false), busyMessage: str(inst.busyMessage) || B.instant.busyMessage },
    sections: flags(['hero', 'instantCards', 'packs', 'referBanner', 'services', 'trust', 'passPromo', 'more'], raw.sections, B.sections),
    tabs: flags(['washes', 'money', 'profile'], raw.tabs, B.tabs),
    features: { ...features, instant: instOn },
    home: {
      heroTitle: str(home.heroTitle) || B.home.heroTitle, heroSub: str(home.heroSub, B.home.heroSub), heroTheme: str(home.heroTheme) || B.home.heroTheme,
      referAmount: num(home.referAmount, B.home.referAmount), friendAmount: num(home.friendAmount, B.home.friendAmount),
      servicesTitle: str(home.servicesTitle) || B.home.servicesTitle, servicesSub: str(home.servicesSub, B.home.servicesSub),
      packsTitle: str(home.packsTitle) || B.home.packsTitle, packsSub: str(home.packsSub, B.home.packsSub),
      trustTitle: str(home.trustTitle) || B.home.trustTitle, trustSub: str(home.trustSub, B.home.trustSub),
    },
    support: { whatsapp: phone10(sup.whatsapp, B.support.whatsapp), phone: phone10(sup.phone, B.support.phone), email: str(sup.email) || B.support.email },
  };
}

APP = normAppcfg({});

/* ---------------- apply: raw docs -> reference tables + views ---------------- */
function slice(s: Slice): Docs {
  const r = RAW[s];
  if (r) return r;
  if (DOC_SLICES[s]) return (BUILTIN as any)[s];          // switches / slot grid: defaults until live
  if (SRC[s] === 'builtin') return (BUILTIN as any)[s];
  return {};                                              // pending, or real build with nothing: empty
}
const docOf = (s: Slice) => { const d = slice(s)[DOC_SLICES[s]!]; return d && typeof d === 'object' ? d : {} };
const list = (s: Slice) => Object.entries(slice(s)).map(([id, d]) => ({ id, ...(d || {}) } as Doc));

function apply() {
  APP = normAppcfg(docOf('appcfg'));
  setAreas(docOf('appcfg').areas);   // service circles drawn in the dashboard (data/areas.ts)
  const raw = docOf('appcfg'), fees = raw.fees || {}, B = BUILTIN.appcfg.customer.fees;
  fillObj(R.FEES, { gstPct: num(fees.gstPct, B.gstPct), visitFee: num(fees.visit, B.visit), convenienceFee: num(fees.convenience, B.convenience), convenienceFreeAbove: num(fees.convenienceBelow, B.convenienceBelow), instantFee: 0 });
  const sur = fees.surcharge || {}, slotSur = fees.slotSurcharge && typeof fees.slotSurcharge === 'object' ? fees.slotSurcharge : B.slotSurcharge;
  fillObj(R.PART_SURCHARGE, { Morning: num(sur.morning, 0), Afternoon: num(sur.afternoon, 0), Evening: num(sur.evening, 0) });
  fillObj(R.SLOT_SURCHARGE, Object.fromEntries(Object.entries(slotSur).map(([k, v]) => [hhmm(k, k), num(v, 0)]).filter(([, v]) => v)));
  const rec = raw.recurring && typeof raw.recurring === 'object' ? raw.recurring : {};
  R.RECURRING.forEach(o => {
    const d = (rec as any)[o.id] || {}, B0 = R.RECURRING_BUILTIN.find(x => x.id === o.id)!;
    o.perMonth = Math.max(1, Math.round(num(d.visits, B0.perMonth))); o.off = Math.min(90, Math.max(0, num(d.off, B0.off)));
    o.sub = `${o.perMonth} visits a month`;
  });
  fillObj(R.INSTANT_HOURS, { open: APP.instant.openFrom, close: APP.instant.openTill });
  fillObj(R.SUPPORT, APP.support);
  R.REFERRAL.bannerAmt = APP.home.referAmount; R.REFERRAL.friendGets = APP.home.friendAmount;
  if (R.REFERRAL.tiers[0]) R.REFERRAL.tiers[0].amt = APP.home.referAmount;
  R.REFERRAL.steps[2] = `They get ₹${APP.home.friendAmount} and you get ₹${APP.home.referAmount} when they finish their first booking`;

  // slot grid
  const sc = docOf('slots_cfg'), SB = BUILTIN.slots_cfg.default, parts = sc.parts || SB.parts;
  const pr = (k: string, id: R.DayPart) => { const p = parts[k] || SB.parts[k]; const f = Array.isArray(p) ? p[0] : p && (p.from ?? p.start), t = Array.isArray(p) ? p[1] : p && (p.till ?? p.to ?? p.end); return { id, from: hhmm(f, SB.parts[k].from), to: hhmm(t, SB.parts[k].till) } };
  fill(R.DAY_PARTS, [pr('morning', 'Morning'), pr('afternoon', 'Afternoon'), pr('evening', 'Evening')]);
  fillObj(R.SLOT_CFG, { step: Math.max(10, num(sc.grid, SB.grid)), days: Math.min(30, Math.max(1, num(sc.days, SB.days))), cutoff: num(sc.cutoffMins, SB.cutoffMins), closed: strs(sc.closedDates) });

  // catalogue
  const cat = list('catalog').filter(d => status(d.status) !== 'hidden' || d.kind === 'plan').sort(byOrder);
  const art = (d: Doc): R.ArtSpec => ({ key: str(d.art && d.art.key) || undefined, icon: str(d.art && d.art.icon) || undefined, tint: str(d.art && d.art.tint) || undefined, accent: str(d.art && d.art.accent) || undefined });
  const variants = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k, x]) => ['hatch', 'sedan', 'suv'].includes(k) && num(x, 0) > 0).map(([k, x]) => [k, num(x, 1)])) : undefined);
  fill(R.CAR_SERVICES, cat.filter(d => (d.kind || 'service') === 'service').map((d): R.CarService => {
    const price = num(d.price, 0), a = art(d);
    return { id: d.id, name: str(d.name, d.id), short: str(d.short) || str(d.name, d.id), price, mrp: Math.max(price, num(d.mrp, price)), mins: num(d.mins, 30), rating: num(d.rating, 0), count: str(d.count),
      img: SVC_IMG[a.key || ''] || SVC_IMG[d.id] || 'r3d-ext', tint: a.tint || '#F3EEFD', cat: str(d.cat) || 'Care', blurb: str(d.blurb),
      steps: pairs(d.steps), included: strs(d.included), excluded: strs(d.excluded), status: status(d.status), pausedNote: str(d.pausedNote),
      art: a, photo: str(d.photo) || undefined, variants: variants(d.variants), faqs: pairs(d.faqs), badge: str(d.badge) || undefined };
  }));
  const packs = cat.filter(d => d.kind === 'pack');
  fill(R.PACKS, packs.map((d): R.PackDef => ({ id: d.id, tag: str(d.badge), img: PACK_IMG[d.id] || PACK_IMG[str(d.art && d.art.key).replace(/^pack-/, '')] || 'r3d-pack-wash', mins: num(d.mins, 30),
    sub: str(d.short) || str(d.blurb), name: str(d.name, d.id), price: num(d.price, 0), mrp: Math.max(num(d.price, 0), num(d.mrp, num(d.price, 0))), status: status(d.status), pausedNote: str(d.pausedNote),
    art: art(d), blurb: str(d.blurb), steps: pairs(d.steps), included: strs(d.included), excluded: strs(d.excluded), faqs: pairs(d.faqs) })));
  // packs n8n prices online (wash/deep/exclusive) keep their SERVICES row in step with the catalogue price
  R.SERVICES.forEach(s => { const p = R.PACKS.find(x => x.id === s.id); if (p && p.price != null) { s.price = p.price; s.name = p.name || s.name } });
  fill(R.PRODUCTS, cat.filter(d => d.kind === 'store').map((d): R.Product => {
    const a = art(d), c: [string, string] = [a.tint || '#5409DA', a.accent || '#FFBA08'], bg = arr(d.bg).length === 2 ? [str(d.bg[0]), str(d.bg[1])] as [string, string] : [c[0], c[1]] as [string, string];
    return { id: str(d.storeId) || d.id, name: str(d.name, d.id), cat: str(d.cat) || 'Care', price: num(d.price, 0), mrp: Math.max(num(d.price, 0), num(d.mrp, 0)), art: (a.key || 'sparkle') as any, c, bg,
      tag: str(d.badge) || undefined, wide: !!d.wide, fit: !!d.fit, desc: str(d.blurb), pts: strs(d.included), status: status(d.status), pausedNote: str(d.pausedNote) };
  }));
  fill(R.CATS, ['All', ...Array.from(new Set(R.PRODUCTS.map(p => p.cat)))]);
  // monthly plans: catalogue plan docs override the built-in plans by id; with none, the built-in plans stay (existing cars need them)
  // only Washing Daddy's own five plans: stray plan docs (old tests, unknown ids) never reach the app
  const OWN = BUILTIN_PLANS.map(p => p.id as string);
  const planDocs = cat.filter(d => d.kind === 'plan' && OWN.includes(d.id));
  if (planDocs.length) {
    const plans = BUILTIN_PLANS.map(p => ({ ...p })) as R.Plan[];
    planDocs.forEach(d => {
      const f = d.f && typeof d.f === 'object' ? { int: num(d.f.int, 0), tyre: num(d.f.tyre, 0), foam: num(d.f.foam, 0), det: num(d.f.det, 0), fm: num(d.f.fm, 0) } : undefined;
      const i = plans.findIndex(p => p.id === d.id), base = i >= 0 ? plans[i] : null;
      const p: R.Plan = { id: d.id, name: str(d.name) || (base ? base.name : d.id), price: num(d.price, base ? base.price : 0), old: !!d.old, status: status(d.status),
        f: f || (base ? base.f : { int: 1, tyre: 0, foam: 0, det: 0 }), rows: pairs(d.rows).length ? pairs(d.rows) : base ? base.rows : [] };
      if (i >= 0) plans[i] = p; else plans.push(p);
    });
    fill(R.PLANS, plans);
    fill(R.HIDDEN_FROM_NEW, plans.filter(p => p.status === 'hidden' || p.status === 'paused').map(p => p.id));
  } else { fill(R.PLANS, BUILTIN_PLANS.map(p => ({ ...p }))); fill(R.HIDDEN_FROM_NEW, BUILTIN.catalog ? Object.entries(BUILTIN.catalog).filter(([, d]) => d.kind === 'plan' && d.status === 'hidden').map(([id]) => id as R.PlanId) : []) }

  // WD Pass plans
  fill(R.PASS_PLANS, list('passes_cfg').filter(d => status(d.status) === 'live').sort(byOrder).map((d): R.PassPlan => ({
    id: d.id, name: str(d.name) || 'WD Pass', title: str(d.title) || str(d.name) || 'WD Pass', visits: Math.max(1, num(d.visits, 1)), price: num(d.price, 0), mrp: Math.max(num(d.price, 0), num(d.mrp, 0)),
    days: num(d.validDays ?? d.days, 30), covers: strs(d.covers), maxMins: num(d.maxMins, 999), benefits: pairs(d.benefits), faqs: pairs(d.faqs), status: 'live' })));

  // coupons (contract shape; the older app shape {code, kind, v, max, firstOrder, till, sub} is read too)
  fill(R.COUPONS, list('coupons').filter(d => status(d.status) === 'live' && d.public !== false).sort(byOrder).map((d): R.Coupon => {
    const kind = (d.type || d.kind) === 'pct' ? 'pct' : 'flat', modes = strs(d.modes).filter(m => ['instant', 'scheduled', 'recurring'].includes(m)) as R.CartMode[];
    const maxOff = d.maxOff ?? d.max;
    return { code: str(d.code || d.id).toUpperCase(), title: str(d.title) || str(d.id), sub: str(d.desc ?? d.sub), kind, v: num(d.value ?? d.v, 0), max: maxOff != null && maxOff !== '' ? num(maxOff, 0) : undefined,
      minOrder: num(d.minOrder, 0), modes: modes.length ? modes : undefined, firstOrder: !!(d.firstOrderOnly ?? d.firstOrder), till: str(d.validTill ?? d.till) || '2099-12-31', validFrom: str(d.validFrom) || undefined,
      tnc: strs(d.tnc), status: 'live' };
  }));

  // legal, help, custom buttons
  LEGAL = list('legal').filter(d => status(d.status) === 'live').sort(byOrder).map(d => ({ id: d.id, title: str(d.title, d.id), body: str(d.body), version: str(d.version), updated: when(d.updatedAt) || str(d.version),
    showIn: arr(d.showIn).length ? strs(d.showIn) : ['profile', 'signup', 'footer'], order: num(d.order, 999), url: str(d.url), draft: !!d.draft, icon: str(d.icon) || 'shield' }));
  HELP = list('help').filter(d => status(d.status) === 'live').sort(byOrder).map(d => ({ id: d.id, title: str(d.title, d.id), sub: str(d.sub), icon: str(d.icon) || 'help', order: num(d.order, 999), faqs: pairs(d.faqs) }));
  BUTTONS = list('ui_buttons').filter(d => status(d.status) !== 'hidden' && str(d.label)).sort(byOrder).map(d => ({ id: d.id, placement: str(d.placement) || 'home_mid', label: str(d.label), sub: str(d.sub), icon: str(d.icon) || 'star',
    tint: str(d.tint) || '#5409DA', style: d.style === 'banner' ? 'banner' : 'card', action: { type: str(d.action && d.action.type) || 'url', value: str(d.action && d.action.value) }, order: num(d.order, 999), paused: status(d.status) === 'paused' }));
  notify();
}

/* ---------------- getters for screens ---------------- */
export const appCfg = () => APP;
export const feature = (k: keyof Features) => APP.features[k];
export const section = (k: keyof Sections) => APP.sections[k];
export const tabOn = (k: 'washes' | 'money' | 'profile') => APP.tabs[k] && (k !== 'money' || APP.features.wallet);
export const legalPages = (where?: 'profile' | 'signup' | 'footer') => LEGAL.filter(p => !where || p.showIn.includes(where));
export const legalPage = (id: string) => LEGAL.find(p => p.id === id) || null;
export const helpTopics = () => HELP;
export const helpTopic = (id: string) => HELP.find(t => t.id === id) || null;
export const uiButtons = (placement: string) => BUTTONS.filter(b => b.placement === placement);
/** distinct service categories, in catalogue order (Home chips) */
export const serviceCats = () => Array.from(new Set(R.CAR_SERVICES.map(s => s.cat)));
/** paused services/packs/products: shown greyed with this note, cannot be added */
export function unavailable(id: string): string | null {
  const s = R.CAR_SERVICES.find(x => x.id === id) || R.PACKS.find(x => x.id === id) || R.PRODUCTS.find(x => x.id === id);
  if (!s) return null;
  return s.status === 'paused' ? (s.pausedNote || 'Not available right now') : null;
}
/** true while a real build waits for its first catalogue (no cache yet): screens show skeletons */
export const configLoading = () => SRC.catalog === 'pending';
export const configSource = () => ({ ...SRC });
/** markdown subset of legal bodies -> blocks: ## heading, paragraphs, - bullets */
export type MdBlock = { k: 'h' | 'p' | 'li'; t: string };
export function mdBlocks(md: string): MdBlock[] {
  const out: MdBlock[] = [];
  str(md).replace(/\r/g, '').split(/\n{2,}/).forEach(chunk => {
    let para: string[] = [];
    const flush = () => { if (para.length) out.push({ k: 'p', t: para.join(' ').replace(/\*\*(.*?)\*\*/g, '$1') }); para = [] };
    chunk.split('\n').forEach(line => {
      const l = line.trim(); if (!l) return;
      const h = /^#{1,4}\s+(.*)$/.exec(l), li = /^[-*•]\s+(.*)$/.exec(l);
      if (h) { flush(); out.push({ k: 'h', t: h[1] }) } else if (li) { flush(); out.push({ k: 'li', t: li[1] }) } else para.push(l);
    });
    flush();
  });
  return out;
}

/* ---------------- start: cache, live subscriptions, fallback ---------------- */
let started = false, unsubs: Unsub[] = [], couponUnsub: Unsub | null = null, fallbackT: any = null;
async function saveCache() { try { const live: Partial<Record<Slice, Docs>> = {}; SLICES.forEach(s => { if (SRC[s] === 'live' && RAW[s]) live[s] = RAW[s] }); await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(live)) } catch (e) {} }
let saveT: any = null;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveCache, 400) };
const clean = (d: any) => JSON.parse(JSON.stringify(d, (_k, v) => (v && typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().toISOString() : v)));

/** one snapshot of a collection (or the one doc of a doc slice). fromCache + empty never replaces anything. */
function onData(s: Slice, docs: Docs, fromCache: boolean) {
  const empty = !Object.keys(docs).length;
  if (fromCache && empty) return;
  if (fromCache && SRC[s] === 'live') return;
  RAW[s] = clean(docs); SRC[s] = fromCache ? 'cache' : 'live';
  if (!fromCache) saveSoon();
  apply();
}

/**
 * real = a Firebase build (db given): cache first, then live; builtin only after FALLBACK_MS with nothing.
 * db null = the web preview: built-in content for everything (demo).
 */
export async function startConfig(db: Db | null) {
  if (started) return; started = true;
  if (!db) { SLICES.forEach(s => { SRC[s] = 'builtin' }); apply(); return }
  try {
    const c = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || 'null');
    if (c && typeof c === 'object') SLICES.forEach(s => { if (c[s] && typeof c[s] === 'object') { RAW[s] = c[s]; SRC[s] = 'cache' } });
  } catch (e) {}
  apply();
  SLICES.forEach(s => {
    if (s === 'coupons') return;   // signed-in only: subscribeCoupons()
    const id = DOC_SLICES[s];
    if (id) unsubs.push(db.doc(s + '/' + id).onSnapshot(g => onData(s, g.exists ? { [id]: g.data() } : {}, !!g.fromCache), e => console.warn('cfg ' + s, e)));
    else unsubs.push(db.collection(s).onSnapshot((ds, meta) => onData(s, Object.fromEntries(ds.map(d => [d.id, d.data()])), !!(meta && meta.fromCache)), e => console.warn('cfg ' + s, e)));
  });
  fallbackT = setTimeout(() => {
    let changed = false;
    SLICES.forEach(s => { if (SRC[s] === 'pending' && !NO_FALLBACK.includes(s) && !DOC_SLICES[s]) { SRC[s] = 'builtin'; changed = true } });
    if (changed) apply();
  }, FALLBACK_MS);
}
/** public coupons need a signed-in user (rules): started by state.ts after sign-in, stopped on sign-out */
export function subscribeCoupons(db: Db | null) {
  if (couponUnsub) { try { couponUnsub() } catch (e) {} couponUnsub = null }
  if (!db) return;
  couponUnsub = db.collection('coupons').where('public', '==', true).onSnapshot((ds, meta) => {
    const fromCache = !!(meta && meta.fromCache), docs = Object.fromEntries(ds.map(d => [d.id, d.data()]));
    if (fromCache && !Object.keys(docs).length) return;
    RAW.coupons = clean(docs); SRC.coupons = fromCache ? 'cache' : 'live'; if (!fromCache) saveSoon(); apply();
  }, e => console.warn('cfg coupons', e));
}
export function stopConfig() { unsubs.forEach(u => { try { u() } catch (e) {} }); unsubs = []; clearTimeout(fallbackT); started = false }
/** test hook (web preview ?cfgdemo=1): overlay docs on the built-in content, as if the dashboard had written them */
export function overlayForPreview(over: Partial<Record<Slice, Docs>>) {
  SLICES.forEach(s => { if (over[s]) { RAW[s] = { ...(RAW[s] || (BUILTIN as any)[s]), ...over[s] }; SRC[s] = 'live' } });
  apply();
}
