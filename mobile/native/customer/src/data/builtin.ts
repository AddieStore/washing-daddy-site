// Today's built-in content in the LIVE CONFIG shape (/mnt/project-files/dashboard-2026-11-16/CONFIG-CONTRACT.md):
// the same documents the admin dashboard edits in Firestore. Used for two things only:
//   1. tools/seed-config.mjs writes these as the first Firestore docs, so the dashboard starts with today's content;
//   2. the app's offline fallback (first launch with no network and no cached config) and the web preview.
// Pure data: imports only the reference tables (no React Native), so the seed script can load it in Node.
import { CAR_SERVICES, PACKS, SERVICES, PACK_MRP, PRODUCTS, PLANS, HIDDEN_FROM_NEW, PASS_PLANS, COUPONS, FEES, SLOT_SURCHARGE,
  INSTANT_HOURS, DAY_PARTS, SLOT_STEP_MIN, SLOT_DAYS, SLOT_CUTOFF_MIN, REFERRAL, SUPPORT_PHONE, VARIANTS } from './reference';
import { LEGAL_DOCS, LEGAL_ORDER } from './legal';
import { HELP_TOPICS } from './help';

export type Docs = Record<string, any>;
export type BuiltinDocs = {
  appcfg: { customer: Docs }; catalog: Record<string, Docs>; coupons: Record<string, Docs>; passes_cfg: Record<string, Docs>;
  legal: Record<string, Docs>; help: Record<string, Docs>; ui_buttons: Record<string, Docs>; slots_cfg: { default: Docs };
};

// accent colour per built-in illustration (the disc colour each drawing uses); generic art uses the same palette
const ACCENT: Record<string, string> = {
  ext: '#2F8FF0', foam: '#8B5CF6', int: '#FFBA08', vac: '#2F8FF0', engine: '#5409DA', tyre: '#5409DA', glass: '#2F8FF0', dash: '#FF6A1A',
  seat: '#E8384F', odour: '#14C08A', ceramic: '#8B5CF6', under: '#2F8FF0', wax: '#FFBA08', headlight: '#2F8FF0', trim: '#5409DA',
  alloy: '#5409DA', roof: '#2F8FF0', tar: '#8B5CF6', rain: '#2F8FF0', leather: '#E8384F', liner: '#FFBA08', boot: '#2F8FF0', mats: '#2F8FF0',
  ac: '#14C08A', touch: '#FF6A1A', rust: '#5409DA', rubber: '#FF6A1A', battery: '#5409DA', polish: '#8B5CF6', teflon: '#8B5CF6',
};
const ICON: Record<string, string> = { Exterior: 'drop', Interior: 'seat', Care: 'sparkle' };
/** pair lists are stored as arrays of maps (Firestore has no nested arrays) */
const M = (l: [string, string][] | undefined, a: string, b: string) => (l || []).map(x => ({ [a]: x[0], [b]: x[1] }));
const mdOf = (sections: { h: string; p: string[] }[]) => sections.map(s => `## ${s.h}\n\n${s.p.join('\n\n')}`).join('\n\n');

export function builtinDocs(): BuiltinDocs {
  const variants = Object.fromEntries(VARIANTS.map(v => [v.id, v.mul]));
  const catalog: Record<string, Docs> = {};
  CAR_SERVICES.forEach((s, i) => {
    catalog[s.id] = { kind: 'service', name: s.name, short: s.short, cat: s.cat, price: s.price, mrp: s.mrp, mins: s.mins, blurb: s.blurb,
      steps: M(s.steps, 't', 'd'), included: s.included, excluded: s.excluded, faqs: [], variants,
      art: { key: s.id, icon: ICON[s.cat] || 'sparkle', tint: s.tint, accent: ACCENT[s.id] || '#5409DA' },
      badge: '', order: (i + 1) * 10, status: 'live', pausedNote: '', rating: s.rating, count: s.count };
  });
  PACKS.forEach((p, i) => {
    const s = SERVICES.find(x => x.id === p.id);
    catalog[p.id] = { kind: 'pack', name: s ? s.name : p.id, short: p.sub, cat: 'Packs', price: s ? s.price : 0, mrp: PACK_MRP[p.id] || (s ? s.price : 0), mins: p.mins,
      blurb: s ? s.d : p.sub, steps: [], included: [], excluded: [], faqs: [], art: { key: 'pack-' + p.id, icon: 'sparkle', tint: '#F1EBFD', accent: '#5409DA' },
      badge: p.tag, order: (i + 1) * 10, status: 'live', pausedNote: '' };
  });
  PRODUCTS.forEach((p, i) => {
    catalog['store-' + p.id] = { kind: 'store', name: p.name, short: p.name, cat: p.cat, price: p.price, mrp: p.mrp, mins: 0, blurb: p.desc, steps: [],
      included: p.pts, excluded: [], faqs: [], art: { key: p.art, icon: 'gift', tint: p.c[0], accent: p.c[1] }, bg: p.bg, fit: !!p.fit, wide: !!p.wide,
      badge: p.tag || '', order: (i + 1) * 10, status: 'live', pausedNote: '', storeId: p.id };
  });
  PLANS.forEach((p, i) => {
    catalog[p.id] = { kind: 'plan', name: p.name, short: p.name, cat: 'Plans', price: p.price, mrp: p.price, mins: 0, blurb: '', steps: [], included: [], excluded: [], faqs: [],
      art: { icon: 'car', tint: '#F1EBFD', accent: '#5409DA' }, badge: '', order: (i + 1) * 10, status: HIDDEN_FROM_NEW.includes(p.id) ? 'hidden' : 'live', pausedNote: '',
      f: p.f, rows: M(p.rows, 'k', 'v'), old: !!p.old };
  });
  const coupons: Record<string, Docs> = {};
  COUPONS.forEach((c, i) => {
    coupons[c.code] = { title: c.title, desc: c.sub, type: c.kind, value: c.v, maxOff: c.max ?? null, minOrder: c.minOrder, modes: c.modes || [],
      firstOrderOnly: !!c.firstOrder, perUser: 1, validFrom: '2026-11-01', validTill: c.till, status: 'live', public: true, tnc: c.tnc, order: (i + 1) * 10 };
  });
  const passes_cfg: Record<string, Docs> = {};
  PASS_PLANS.forEach((p, i) => {
    passes_cfg[p.id] = { name: p.name, title: p.title, visits: p.visits, price: p.price, mrp: p.mrp, validDays: p.days, covers: p.covers, maxMins: p.maxMins,
      benefits: M(p.benefits, 't', 'd'), faqs: M(p.faqs, 'q', 'a'), status: 'live', order: (i + 1) * 10 };
  });
  const legal: Record<string, Docs> = {};
  const LICON: Record<string, string> = { terms: 'receipt', privacy: 'shield', cancellation: 'clock' };
  LEGAL_ORDER.forEach((id, i) => {
    const d = LEGAL_DOCS[id];
    legal[id] = { title: d.title, body: mdOf(d.sections), version: d.updated, updatedAt: d.updated, showIn: ['profile', 'signup', 'footer'], status: 'live',
      order: (i + 1) * 10, url: d.url, draft: d.draft, icon: LICON[id] || 'shield' };
  });
  const HICON: Record<string, string> = { booking: 'plan', account: 'user', payments: 'card', quality: 'star', safety: 'shield' };
  const help: Record<string, Docs> = {};
  HELP_TOPICS.forEach((t, i) => { help[t.id] = { title: t.title, sub: t.sub, icon: HICON[t.id] || 'help', order: (i + 1) * 10, faqs: M(t.faqs, 'q', 'a'), status: 'live' } });
  const part = (id: string) => { const p = DAY_PARTS.find(x => x.id === id)!; return { from: p.from, till: p.to } };
  const customer: Docs = {
    maintenance: { on: false, message: 'We are doing some maintenance. Back shortly.' },
    instant: { on: true, openFrom: INSTANT_HOURS.open, openTill: INSTANT_HOURS.close, busy: false, busyMessage: 'All washers are busy. Schedule for later' },
    sections: { hero: true, instantCards: true, packs: true, referBanner: true, services: true, trust: true, passPromo: true, more: true },
    tabs: { washes: true, money: true, profile: true },
    features: { wallet: true, topup: true, giftcard: true, pass: true, coupons: true, refer: true, recurring: false, scheduled: true, reschedule: true, cancel: true,
      ratings: true, store: true, plans: true, instant: true },
    home: { heroTitle: 'Let your car shine brighter', heroSub: 'Pressure wash at your parking spot', heroTheme: 'festive', referAmount: REFERRAL.bannerAmt,
      friendAmount: REFERRAL.friendGets, servicesTitle: 'All car wash services', servicesSub: 'Schedule & book for later', packsTitle: 'Wash packs',
      packsSub: 'Pressure wash, foam and more at your parking spot', trustTitle: 'Your car is in professional hands',
      trustSub: 'Verified washers from your own society, with photo proof after every wash' },
    fees: { convenience: FEES.convenienceFee, convenienceBelow: FEES.convenienceFreeAbove, gstPct: FEES.gstPct, visit: FEES.visitFee,
      surcharge: { morning: 0, afternoon: 0, evening: 0 }, slotSurcharge: { ...SLOT_SURCHARGE } },
    support: { whatsapp: SUPPORT_PHONE, phone: SUPPORT_PHONE, email: 'hello@washingdaddy.com' },
  };
  return {
    appcfg: { customer }, catalog, coupons, passes_cfg, legal, help, ui_buttons: {},
    slots_cfg: { default: { days: SLOT_DAYS, grid: SLOT_STEP_MIN, cutoffMins: SLOT_CUTOFF_MIN, parts: { morning: part('Morning'), afternoon: part('Afternoon'), evening: part('Evening') }, capacityPerSlot: 2, closedDates: [] } },
  };
}
