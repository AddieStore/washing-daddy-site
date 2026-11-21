/* Washing Daddy live control. Writes the Firestore docs in CONFIG-CONTRACT.md; the customer app listens (onSnapshot) and updates within seconds.
   Sign-in and Firestore come from ../wd-sync.js (same layer as /admin/): WDAuth = phone OTP, claude.use('db') = Firestore.
   ?demo=1 runs on in-memory sample data with no sign-in and no network. */
(() => {
'use strict';
const DEMO = /[?&]demo=1/.test(location.search);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d };
const rs = n => '₹' + Math.round(num(n)).toLocaleString('en-IN');
const nowISO = () => new Date().toISOString();
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
const r9 = n => Math.max(9, Math.round(n / 10) * 10 - 1);
const pget = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function pset(o, p, v) { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach((k, i) => { if (a[k] == null || typeof a[k] !== 'object') a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k] }); a[ks[ks.length - 1]] = v; return o }
function deepMerge(a, b) { if (b == null) return a; if (Array.isArray(b) || typeof b !== 'object') return b; const o = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) }; for (const k in b) o[k] = deepMerge(o[k], b[k]); return o }
const hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#5409DA';
function shade(c, f) { c = hex(c); const n = parseInt(c.slice(1), 16); const t = f < 0 ? 0 : 255, p = Math.abs(f); const r = Math.round((t - (n >> 16)) * p + (n >> 16)), g = Math.round((t - (n >> 8 & 255)) * p + (n >> 8 & 255)), b = Math.round((t - (n & 255)) * p + (n & 255)); return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1) }

/* ---------------- icons ---------------- */
const P = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  car: 'M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M3 16h18v3H3zM7 19v1.5M17 19v1.5M7.5 13h.01M16.5 13h.01',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  foam: 'M7 18a4 4 0 0 1-.5-7.9A5 5 0 0 1 16 8a4 4 0 0 1 1 7.9M8 21h.01M12 21h.01M16 21h.01',
  spray: 'M8 10h8v11H8zM10 10V6h5v4M15 7h3M19 4l1-1M19 8h2M19 5.5h.01',
  seat: 'M7 3h6a2 2 0 0 1 2 2l1 8H6zM6 13h12v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM9 18v3M15 18v3',
  wheel: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 3v6.5M12 14.5V21M3.5 8l6.3 3M14.2 13l6.3 3M3.5 16l6.3-3M14.2 11l6.3-3',
  glass: 'M4 18l2.5-9a2 2 0 0 1 1.9-1.5h7.2A2 2 0 0 1 17.5 9L20 18zM9 12h6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19l8-8',
  engine: 'M4 10h3V8h4V6h4v2h2l2 2v7H6l-2-2zM2 12v3M21 12h1',
  vacuum: 'M7 20a2 2 0 1 0 0-.01M5 17V5h4M9 5l8 12h4M17 17h4',
  brush: 'M18 3l3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-1 4-2 5c4 1 8 0 8-4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2 0-4-1-3.5-3S12 4 12 7zM12 7c2 0 4-1 3.5-3S12 4 12 7z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  whatsapp: 'M4 20l1.3-4.2A8 8 0 1 1 8.4 19zM9 9c0 3.5 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.7M12 16.8h.01',
  cart: 'M3 4h2.5l2 11h10l2-8H7M9 20h.01M17 20h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  plan: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14l2 2 4-4',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  tag: 'M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  toggle: 'M8 6h8a6 6 0 0 1 0 12H8A6 6 0 0 1 8 6zM8 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  percent: 'M19 5L5 19M7 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM17 15.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', check: 'M5 12.5l4.5 4.5L19 7', x: 'M6 6l12 12M18 6L6 18',
  chev: 'M9 6l6 6-6 6', chevd: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  eyeoff: 'M3 3l18 18M10.6 6.2A9 9 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3 3.5M6.5 7.5C4 9.2 3 12 3 12s4 6 9 6a8 8 0 0 0 3.3-.7M10 10a3 3 0 0 0 4 4',
  pause: 'M8 5v14M16 5v14',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  out: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  wrench: 'M14.5 6a4 4 0 0 0 4.5 5L10 20a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-1.5-2z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
};
const ic = (n, s = 20, sw = 1.8) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || P.sparkle}"/></svg>`;
const GENERIC_ICONS = ['drop', 'foam', 'spray', 'car', 'seat', 'wheel', 'glass', 'sparkle', 'shield', 'leaf', 'engine', 'vacuum', 'brush', 'star', 'clock', 'gift', 'bolt'];
const BTN_ICONS = ['gift', 'star', 'zap', 'phone', 'whatsapp', 'info', 'shield', 'car', 'wallet', 'calendar', 'pin', 'help', 'clock', 'cart', 'bell', 'heart'];
const HELP_ICONS = ['help', 'plan', 'card', 'star', 'shield', 'user', 'clock'];
const LEGAL_ICONS = ['shield', 'info', 'clock', 'receipt'];
const STORE_KEYS = ['perfume', 'cloth', 'bottle', 'spray', 'mount', 'inflator', 'cover', 'mats', 'cam', 'sparkle'];
const STORE_ICON = { perfume: 'drop', cloth: 'brush', bottle: 'drop', spray: 'spray', mount: 'car', inflator: 'wheel', cover: 'car', mats: 'seat', cam: 'star', sparkle: 'sparkle' };
const PAGE_ACTIONS = ['refer', 'pass', 'money', 'coupons', 'bookings', 'help', 'about', 'legal', 'schedule', 'cart', 'addresses', 'refunds', 'store', 'plan'];

/* ---------------- art ---------------- */
const ART = window.WD_ART || {};
const spark = (x, y, r, c, o = 1) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}" opacity="${o}"/>`;
function genericArt(a) {   // the template illustration for a service with no drawing: accent disc, ground shadow, glossy accent tile with a white glyph, sparkles
  const ac = hex(a && a.accent), id = 'g' + ac.slice(1), icon = (a && a.icon) || STORE_ICON[a && a.key] || 'sparkle';
  return `<svg viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(ac, .25)}"/><stop offset="1" stop-color="${shade(ac, -.18)}"/></linearGradient></defs>
  <circle cx="50" cy="50" r="45" fill="${ac}" opacity=".13"/><ellipse cx="50" cy="89" rx="36" ry="5.5" fill="#1B1240" opacity=".13"/>
  <rect x="24" y="26" width="52" height="52" rx="16" fill="url(#${id})"/><rect x="27" y="29" width="46" height="22" rx="12" fill="#fff" opacity=".16"/>
  <g transform="translate(34 36) scale(1.35)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${P[icon] || P.sparkle}"/></g>
  ${spark(82, 28, 5, '#FFBA08')}${spark(14, 60, 3.4, '#FFBA08')}${spark(66, 88, 3, '#fff')}</svg>`;
}
function artSVG(it) {
  const a = it.art || {};
  if (a.key && ART[a.key]) return ART[a.key];
  if (!a.key && it.photo) return `<img src="${esc(it.photo)}" alt="" style="width:100%;height:100%;object-fit:contain">`;
  return genericArt(a);
}
const wellBg = it => { const a = it.art || {}; return (a.key && ART[a.key]) || !a.tint ? '' : `background:${esc(a.tint)}` };

/* ---------------- state + data layer ---------------- */
const S = { cfg: null, cfgExists: false, catalog: {}, coupons: {}, passes_cfg: {}, legal: {}, help: {}, ui_buttons: {}, slots_cfg: {} };
const COLS = ['catalog', 'coupons', 'passes_cfg', 'legal', 'help', 'ui_buttons', 'slots_cfg'];
const loaded = {};
let db = null, unsubs = [], pending = 0, online = true;
const CFG_DEFAULT = () => clone((window.WD_SEED || {}).appcfg || {});
const cfgAll = () => deepMerge(CFG_DEFAULT(), S.cfg || {});
const G = p => pget(cfgAll(), p);

function setStatus(k, txt) {
  const el = $('#status'); if (!el) return;
  el.className = 'status ' + (k || ''); $('span', el).textContent = txt;
}
function status() {
  if (DEMO) return setStatus('demo', 'Demo');
  if (!online) return setStatus('off', 'Offline');
  if (pending > 0) return setStatus('saving', 'Saving…');
  setStatus('', 'Live');
}
let savedT;
function track(p) {
  pending++; status();
  return Promise.resolve(p).then(r => { pending--; if (pending <= 0 && online) { if (!DEMO) { setStatus('saved', 'Saved'); clearTimeout(savedT); savedT = setTimeout(status, 1800) } else status() } return r },
    e => { pending--; status(); console.warn(e); toast(/permission|not.?allowed|invalid_argument/i.test((e && (e.code || e.message)) || '') ? 'Not allowed for this number.' : "Didn't save. Check the internet and try again."); throw e });
}
const stamp = o => ({ ...o, updatedAt: nowISO() });
function expand(flat) { const o = {}; for (const k in flat) pset(o, k, flat[k]); return o }

const D = {
  async set(col, id, data) {
    data = stamp(data);
    if (DEMO) { S[col][id] = clone(data); return track(Promise.resolve()).then(() => rerender()) }
    return track(db.doc(col + '/' + id).set(data));
  },
  async del(col, id) {
    if (DEMO) { delete S[col][id]; return track(Promise.resolve()).then(() => rerender()) }
    return track(db.doc(col + '/' + id).delete());
  },
  async patch(col, id, flat) {   // dotted-path merge, e.g. {'features.wallet':false}
    flat = { ...flat, updatedAt: nowISO() };
    if (DEMO) { const cur = col === 'appcfg' ? (S.cfg = S.cfg || {}) : (S[col][id] = S[col][id] || {}); for (const k in flat) pset(cur, k, flat[k]); return track(Promise.resolve()) }
    const path = col + '/' + id;
    const exists = col === 'appcfg' ? S.cfgExists : !!(S[col] && S[col][id]);
    if (!exists) return track(db.doc(path).set(col === 'appcfg' ? deepMerge(CFG_DEFAULT(), expand(flat)) : expand(flat)));
    return track(db.doc(path).update(flat));
  },
};

function snapDocs(sn) { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data() }); return o }
async function startLive() {
  stopLive();
  db = db || await window.claude.use('db');
  if (!db) throw new Error('nodb');
  // The owner check: only approvers can read washers, so a non-admin number fails here, before any dashboard shows.
  await db.collection('washers').get();
  const err = e => { console.warn(e); online = false; status() };
  unsubs.push(db.doc('appcfg/customer').onSnapshot(s => {
    const ex = typeof s.exists === 'function' ? s.exists() : s.exists;
    S.cfgExists = !!ex; S.cfg = ex ? s.data() : null; loaded.cfg = true; online = true; status(); rerender();
  }, err));
  COLS.forEach(c => unsubs.push(db.collection(c).onSnapshot(sn => { S[c] = snapDocs(sn); loaded[c] = true; online = true; status(); rerender() }, err)));
}
function stopLive() { unsubs.forEach(u => { try { u() } catch (e) {} }); unsubs = [] }
function startDemo() {
  const sd = clone(window.WD_SEED);
  S.cfg = sd.appcfg; S.cfgExists = true;
  COLS.forEach(c => { S[c] = sd[c === 'ui_buttons' ? 'buttons' : c] || {} });
  // a couple of examples so every screen has something to look at
  S.catalog['hot-wax'] = { kind: 'service', name: 'Monsoon Anti-Rain Coat', short: 'Rain Coat', cat: 'Care', price: 349, mrp: 499, mins: 30, blurb: 'Water beads off the glass and paint for weeks.', steps: [{ t: 'Wash', d: 'Clean, dry paint first' }, { t: 'Coat', d: 'Hydrophobic layer on glass and body' }], included: ['Full body', 'All glass'], excluded: [], faqs: [], variants: { hatch: 1, sedan: 1.2, suv: 1.4 }, art: { icon: 'drop', tint: '#EAF3FF', accent: '#2F8FF0' }, badge: 'NEW', order: 900, status: 'live', pausedNote: '' };
  S.catalog.under.status = 'paused'; S.catalog.under.pausedNote = 'Not available right now. Back on Monday.';
  S.catalog.wax.status = 'hidden';
  S.ui_buttons.diwali = { placement: 'home_top', style: 'banner', label: 'Festival cleaning offer', sub: 'Deep clean at 15% off this week', icon: 'gift', tint: '#5409DA', action: { type: 'page', value: 'coupons' }, order: 1, status: 'live' };
  S.ui_buttons.chat = { placement: 'profile', style: 'card', label: 'Chat with Ravi', sub: 'Quick help on WhatsApp', icon: 'whatsapp', tint: '#16a34a', action: { type: 'whatsapp', value: 'Hi, I need help' }, order: 2, status: 'paused' };
  COLS.forEach(c => { loaded[c] = true }); loaded.cfg = true;
}

/* ---------------- ui helpers ---------------- */
let toastT;
function snack(msg, undo) {
  const el = $('#snack'); el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-a="undo">Undo</button>' : ''}`;
  el._undo = undo || null; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), undo ? 9000 : 2600);
}
const toast = m => snack(m);
function confirmDlg({ title, msg, ok = 'Delete', danger = true }) {
  return new Promise(res => {
    const d = $('#dlg'), sc = $('#scrim'); sc.hidden = false; d.hidden = false;
    d.innerHTML = `<h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="acts"><button class="btn ghost press" data-r="0">Cancel</button><button class="btn ${danger ? 'danger' : 'go'} press" data-r="1">${esc(ok)}</button></div>`;
    requestAnimationFrame(() => { sc.classList.add('on'); d.classList.add('on'); sc.style.zIndex = 79 });
    const done = v => { d.classList.remove('on'); if (!SH) sc.classList.remove('on'); sc.style.zIndex = ''; setTimeout(() => { d.hidden = true; if (!SH) sc.hidden = true }, 250); d.onclick = null; res(v) };
    d.onclick = e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1') };
  });
}
let SH = null;
function openSheet({ title, body, footer, cls = '', split = false, onClose }) {
  const sh = $('#sheet'), sc = $('#scrim'); SH = { onClose };
  sh.className = 'sheet ' + cls; sh.hidden = false; sc.hidden = false; sc.style.zIndex = '';
  sh.innerHTML = `<div class="grab"></div><div class="sh-h"><h3>${esc(title)}</h3><button class="ibtn flat press" data-a="close" aria-label="Close">${ic('x', 18)}</button></div><div class="sh-b ${split ? 'split' : ''}" id="shb">${body}</div>${footer ? `<div class="sh-f">${footer}</div>` : ''}`;
  requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('on'); sc.classList.add('on') }));
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  const sh = $('#sheet'), sc = $('#scrim'); if (!SH) return; const cb = SH.onClose; SH = null; E = null;
  sh.classList.remove('on'); sc.classList.remove('on'); document.body.style.overflow = '';
  setTimeout(() => { if (!SH) { sh.hidden = true; sc.hidden = true; sh.innerHTML = '' } }, 320); cb && cb();
}
const switchHTML = (on, attrs = '', sm = '') => `<button class="sw ${sm} ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" ${attrs}></button>`;
const sortBy = o => Object.entries(o || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => (num(a.order, 999) - num(b.order, 999)) || String(a.name || a.title || a.label || a.id).localeCompare(String(b.name || b.title || b.label || b.id)));
const statusPill = s => `<span class="pill ${s === 'paused' ? 'paused' : s === 'hidden' ? 'hidden' : 'live'}">${s === 'paused' ? 'Paused' : s === 'hidden' ? 'Hidden' : 'Live'}</span>`;
const statusSel = (s, attrs) => `<select class="sel" style="min-height:38px;padding:6px 30px 6px 12px;width:auto;font-weight:600" ${attrs} aria-label="Status"><option value="live" ${s === 'live' || !s ? 'selected' : ''}>Live</option><option value="paused" ${s === 'paused' ? 'selected' : ''}>Paused</option><option value="hidden" ${s === 'hidden' ? 'selected' : ''}>Hidden</option></select>`;
const emptyHTML = (icon, t, p, btn) => `<div class="empty"><div class="cir">${ic(icon, 32)}</div><b>${esc(t)}</b><p>${esc(p)}</p>${btn || ''}</div>`;
const skeleton = () => `<div class="tiles">${Array.from({ length: 9 }, () => '<div><div class="sk" style="aspect-ratio:1;border-radius:16px"></div><div class="sk" style="height:14px;margin-top:10px;width:80%"></div><div class="sk" style="height:12px;margin-top:6px;width:50%"></div></div>').join('')}</div>`;

/* ---------------- the app's service card ---------------- */
function tileHTML(it, o = {}) {
  const st = it.status || 'live', paused = st === 'paused', hidden = st === 'hidden';
  const pr = it.price != null ? rs(it.price) : '';
  const mrp = it.mrp && it.mrp > it.price ? rs(it.mrp) : '';
  const tag = it.badge ? `<span class="badge-tag ${/new/i.test(it.badge) ? 'new' : ''}">${esc(it.badge)}</span>` : '';
  if (it.kind === 'pack') {
    return `<div class="packc ${paused ? 'paused' : ''} ${hidden ? 'hidden' : ''}" ${hidden ? 'style="opacity:.45"' : ''}><div class="well" style="${wellBg(it)}">${tag}${artSVG(it)}${paused ? '' : '<span class="add">Add</span>'}</div>
      <div class="p">${pr}${mrp ? `<s>${mrp}</s>` : ''}</div><div class="m">${ic('clock', 13)} ${it.mins ? (it.mins >= 60 ? (it.mins / 60) + ' hour' : it.mins + ' mins') : ''}</div><div class="nm">${esc(it.name || 'Name')}</div>${paused ? `<div class="note">${esc(it.pausedNote || 'Not available right now')}</div>` : ''}</div>`;
  }
  return `<div class="tile ${paused ? 'paused' : ''} ${hidden ? 'hidden' : ''}">
    <div class="well" style="${wellBg(it)}">${o.status && st !== 'live' ? `<span class="st">${statusPill(st)}</span>` : ''}<div class="art">${artSVG(it)}</div>${paused ? '' : `<span class="plus">${ic('plus', 18, 2)}</span>`}</div>
    <div class="nm">${esc(it.short || it.name || 'Service name')}</div><div class="pr"><span>${pr}</span>${mrp ? `<s>${mrp}</s>` : ''}</div>
    ${paused ? `<div class="note">${esc(it.pausedNote || 'Not available right now')}</div>` : ''}</div>`;
}

/* ---------------- navigation ---------------- */
const TABS = [
  { id: 'catalog', name: 'Services', icon: 'car', sub: 'Prices, packs, plans and store' },
  { id: 'offers', name: 'Offers', icon: 'percent', sub: 'Coupons and WD Pass' },
  { id: 'switch', name: 'Switches', icon: 'toggle', sub: 'What the app shows right now' },
  { id: 'content', name: 'Content', icon: 'doc', sub: 'Texts, pages, buttons and help' },
  { id: 'settings', name: 'Settings', icon: 'sliders', sub: 'Fees, slots and contacts' },
];
let tab = (location.hash || '#catalog').slice(1).split('/')[0];
if (!TABS.find(t => t.id === tab)) tab = 'catalog';
const UI = { kind: 'service', view: 'grid', ctab: 'home', offer: 'coupons' };
try { Object.assign(UI, JSON.parse(localStorage.getItem('wd-ctl-ui') || '{}')) } catch (e) {}
const saveUI = () => { try { localStorage.setItem('wd-ctl-ui', JSON.stringify(UI)) } catch (e) {} };
const hashParts = (location.hash || '').slice(1).split('/'); if (hashParts[1]) { if (tab === 'catalog') UI.kind = hashParts[1]; if (tab === 'content') UI.ctab = hashParts[1]; if (tab === 'offers') UI.offer = hashParts[1] }
if (tab === 'catalog' && hashParts[2]) UI.view = hashParts[2];

function buildBar() {
  $('#bar').innerHTML = `<div class="bar-brand"><div class="logo">${ic('droplet' in P ? 'drop' : 'sparkle', 20, 2)}</div>Washing Daddy</div>` + TABS.map(t => `<button class="press ${t.id === tab ? 'on' : ''}" data-a="tab" data-id="${t.id}" aria-label="${t.name}">${ic(t.icon, 24)}<span class="bl">${t.name}</span></button>`).join('');
  $('#hLogo').innerHTML = ic('drop', 22, 2);
}
function setTab(id) { tab = id; history.replaceState(null, '', '#' + id); buildBar(); rerender(true); window.scrollTo({ top: 0 }) }

let dirty = false;
function rerender(force) {
  const ae = document.activeElement;
  if (!force && ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && $('#main').contains(ae)) { dirty = true; return }
  dirty = false;
  const t = TABS.find(x => x.id === tab);
  $('#hTitle').textContent = t.name; $('#hSub').textContent = t.sub;
  const ready = loaded.cfg && COLS.every(c => loaded[c]);
  $('#main').innerHTML = ready ? SCREENS[tab]() : skeleton();
  $$('#main .rise').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
}
document.addEventListener('focusout', () => setTimeout(() => { if (dirty && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) rerender() }, 60));

/* ---------------- screens ---------------- */
const KINDS = [['service', 'Services'], ['pack', 'Packs'], ['plan', 'Plans'], ['store', 'Store']];
const KIND_LABEL = { service: 'service', pack: 'pack', plan: 'monthly plan', store: 'store item' };
const catalogList = k => sortBy(S.catalog).filter(x => (x.kind || 'service') === k);

function screenCatalog() {
  const k = UI.kind, items = catalogList(k), all = sortBy(S.catalog);
  const chips = KINDS.map(([id, n]) => `<button class="chip press ${id === k ? 'on' : ''}" data-a="kind" data-id="${id}">${n} <span class="n">${catalogList(id).length}</span></button>`).join('');
  let body;
  if (!all.length) body = emptyHTML('car', 'Nothing in the catalog yet', 'Import the services, packs, plans and store items the app ships with, then change anything you like.', '<button class="btn go press" data-a="import">Import app defaults</button>');
  else if (!items.length) body = emptyHTML('sparkle', 'No ' + KIND_LABEL[k] + 's yet', 'Add the first one and it shows up in the app straight away.', `<button class="btn go press" data-a="new" data-kind="${k}">${ic('plus', 18, 2)} Add ${KIND_LABEL[k]}</button>`);
  else if (UI.view === 'grid' && k !== 'plan') {
    const add = `<button class="${k === 'pack' ? 'packc' : 'tile'} add press rise" data-a="new" data-kind="${k}"><div class="well" style="${k === 'pack' ? 'aspect-ratio:1.18;' : ''}">${ic('plus', 30, 2)}<b>Add ${KIND_LABEL[k]}</b></div></button>`;
    body = `<div class="${k === 'pack' ? 'tiles packs' : 'tiles'}" ${k === 'pack' ? 'style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))"' : ''}>${items.map((it, i) => `<button class="${k === 'pack' ? '' : 'tile'} press rise" style="display:block;text-align:left" data-a="edit" data-id="${esc(it.id)}">${tileHTML(it, { status: true })}</button>`).join('')}${add}</div>
      <p class="hint" style="margin-top:18px">This is how the cards look in the app. Tap one to edit. Use the list view to change prices fast or reorder.</p>`;
  } else body = `<div class="card flush"><div class="items">${items.map((it, i) => `<div class="item rise ${it.status || 'live'}">
      <button class="thumb press" data-a="edit" data-id="${esc(it.id)}" style="${wellBg(it)}" aria-label="Edit">${artSVG(it)}</button>
      <button class="body" data-a="edit" data-id="${esc(it.id)}"><b>${esc(it.name)}</b><small>${esc(it.cat || '')}${it.mins ? ' · ' + it.mins + ' min' : ''}${it.badge ? ' · ' + esc(it.badge) : ''}</small></button>
      <div class="acts"><div class="pinp"><div class="money"><span>₹</span><input class="field" inputmode="numeric" value="${esc(it.price)}" ${(it.kind || 'service') !== 'service' ? 'readonly title="Price is set in the payment server for now; changing it here would charge a different amount" style="opacity:.6"' : ''} data-ch="cprice" data-id="${esc(it.id)}" aria-label="Price"></div></div>
      ${statusSel(it.status, `data-ch="cstatus" data-id="${esc(it.id)}"`)}
      <button class="ibtn flat sm press" data-a="mv" data-id="${esc(it.id)}" data-d="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Move up">${ic('up', 16)}</button>
      <button class="ibtn flat sm press" data-a="mv" data-id="${esc(it.id)}" data-d="1" ${i === items.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Move down">${ic('down', 16)}</button></div></div>`).join('')}</div></div>
      <div style="margin-top:14px"><button class="btn soft press" data-a="new" data-kind="${k}">${ic('plus', 18, 2)} Add ${KIND_LABEL[k]}</button></div>`;
  return `<div class="page-h"><div class="chips" style="flex:1">${chips}</div>${k !== 'plan' ? `<div class="seg" style="width:96px;flex:none"><button class="${UI.view === 'grid' ? 'on' : ''}" data-a="view" data-id="grid" aria-label="Grid">${ic('grid', 16)}</button><button class="${UI.view === 'list' ? 'on' : ''}" data-a="view" data-id="list" aria-label="List">${ic('list', 16)}</button></div>` : ''}</div>${body}`;
}

const MODES = ['instant', 'scheduled', 'recurring'];
function screenOffers() {
  const seg = `<div class="seg" style="margin-bottom:14px;max-width:420px"><button class="${UI.offer === 'coupons' ? 'on' : ''}" data-a="offer" data-id="coupons">Coupons</button><button class="${UI.offer === 'passes' ? 'on' : ''}" data-a="offer" data-id="passes">WD Pass plans</button></div>`;
  if (UI.offer === 'passes') {
    const l = sortBy(S.passes_cfg);
    return seg + (l.length ? `<div class="cols c2">${l.map(p => `<div class="rise"><button class="press" data-a="pedit" data-id="${esc(p.id)}" style="display:block;width:100%;text-align:left">${passHTML(p)}</button>
      <div class="trow" style="padding:8px 4px"><span class="mini" style="flex:1">${p.visits} visits · ${p.validDays} days · ${(p.covers || []).length} services</span>${statusSel(p.status, `data-ch="pstatus" data-id="${esc(p.id)}"`)}</div></div>`).join('')}</div>` : emptyHTML('gift', 'No pass plans', 'A WD Pass sells prepaid visits at a discount.', '')) +
      `<div style="margin-top:14px"><button class="btn soft press" data-a="pnew">${ic('plus', 18, 2)} Add pass plan</button></div>`;
  }
  const l = sortBy(S.coupons);
  return seg + (l.length ? `<div class="card flush"><div class="items">${l.map(c => `<div class="coupon rise ${c.status === 'paused' ? 'paused' : ''}"><button class="code press" data-a="cedit" data-id="${esc(c.id)}">${esc(c.id)}</button>
      <button class="body" style="flex:1;min-width:0;text-align:left" data-a="cedit" data-id="${esc(c.id)}"><b style="display:block;font-weight:600">${esc(c.title)}</b><small style="color:var(--grey);display:block">${couponSummary(c)}</small></button>
      ${statusSel(c.status, `data-ch="cpstatus" data-id="${esc(c.id)}"`)}</div>`).join('<div style="border-top:1px solid var(--hair)"></div>')}</div></div>` : emptyHTML('percent', 'No coupons yet', 'Create a code and customers can apply it at checkout.', '')) +
    `<div style="margin-top:14px"><button class="btn soft press" data-a="cnew">${ic('plus', 18, 2)} Add coupon</button></div>`;
}
const couponSummary = c => `${c.type === 'pct' ? c.value + '% off' + (c.maxOff ? ' up to ' + rs(c.maxOff) : '') : rs(c.value) + ' off'} · min ${rs(c.minOrder)}${c.firstOrderOnly ? ' · first order' : ''}${(c.modes || []).length ? ' · ' + c.modes.join(', ') : ''}${c.validTill ? ' · till ' + c.validTill : ''}`;
function passHTML(p) {
  return `<div class="passc ${p.status === 'paused' ? 'paused' : ''}"><div class="tags"><span class="tg">${p.maxMins && p.maxMins < 999 ? p.maxMins + ' MIN WASH' : 'ANY WASH'}</span><span class="tg w">WD PASS</span></div>
  <h4>${num(p.visits)} washes for ${rs(p.price)}</h4><p>${p.mrp > p.price ? `<s>${rs(p.mrp)}</s> ` : ''}${num(p.validDays)} days validity</p></div>`;
}

const FEATURES = [
  ['wallet', 'wallet', 'WD Money wallet', 'Balance, wallet payments and the wallet icon on Home'], ['topup', 'plus', 'Add money (top-up)', 'The Add money button and top-up bonus chips'],
  ['giftcard', 'gift', 'Gift cards', 'Buy and redeem gift cards'], ['pass', 'tag', 'WD Pass', 'Prepaid visit passes and the pass promo'],
  ['coupons', 'percent', 'Coupons', 'Apply a code at checkout'], ['refer', 'heart', 'Refer a friend', 'Referral banner, page and rewards'],
  ['recurring', 'clock', 'Recurring washes', 'The Recurring option in the cart'], ['scheduled', 'calendar', 'Scheduled washes', 'Pick a day and time'],
  ['reschedule', 'undo', 'Reschedule', 'Customers moving a booking'], ['cancel', 'x', 'Cancel booking', 'Customers cancelling a booking'],
  ['ratings', 'star', 'Ratings', 'Ratings on cards and rating after a wash'], ['store', 'bag', 'Car store', 'The Store tab and its entry on Home'],
  ['plans', 'plan', 'Monthly plans', 'Daily wash plans and sign-up'],
];
const SECTIONS = [['hero', 'Hero banner', 'The big violet header on Home'], ['instantCards', 'Instant and Schedule cards', 'The two entry cards'], ['packs', 'Wash packs', 'The packs carousel'], ['referBanner', 'Refer banner', 'Refer a friend strip'], ['services', 'All services grid', 'The a la carte grid'], ['trust', 'Trust footer', 'Your car is in professional hands'], ['passPromo', 'WD Pass promo', 'The pass sheet on Home'], ['more', 'Plans and Store row', 'Monthly plans / Car store shortcuts']];
const TABS_CFG = [['washes', 'Washes tab', 'Bookings and wash history'], ['money', 'Money tab', 'Also needs the wallet switch'], ['profile', 'Profile tab', 'Account, addresses, help']];
const trow = (cfg, icon, t, d) => `<div class="trow"><div class="ico">${ic(icon, 18)}</div><div class="t"><b>${esc(t)}</b><small>${esc(d)}</small></div>${switchHTML(G(cfg) !== false, `data-a="tog" data-cfg="${cfg}"`, 'sm')}</div>`;

function screenSwitch() {
  const m = G('maintenance') || {}, ins = G('instant') || {};
  return `<div class="col rise">
  <div class="maint ${m.on ? 'on' : ''}"><div class="top"><div class="logo" style="background:rgba(255,255,255,.18)">${ic('wrench', 22)}</div><div style="flex:1"><b>${m.on ? 'Maintenance is ON' : 'Maintenance mode'}</b><small>${m.on ? 'Customers see the notice instead of the app' : 'Shows a full-screen notice and closes the app for customers'}</small></div>${switchHTML(m.on, 'data-a="maint"')}</div>
  <input class="field" data-cfg="maintenance.message" data-t="text" value="${esc(m.message)}" placeholder="Message customers will see"></div></div>
  <div class="cols c2" style="margin-top:12px">
  <div class="col">
   <div class="card rise"><div class="ch-title" style="padding:0 0 8px"><b>Instant washes</b>${switchHTML(ins.on !== false, 'data-a="tog" data-cfg="instant.on"')}</div>
    <div class="row2"><div><label class="lbl" style="margin-top:4px">Opens</label><input type="time" class="field" data-cfg="instant.openFrom" data-t="text" value="${esc(ins.openFrom || '06:00')}"></div><div><label class="lbl" style="margin-top:4px">Closes</label><input type="time" class="field" data-cfg="instant.openTill" data-t="text" value="${esc(ins.openTill || '20:00')}"></div></div>
    <div class="trow" style="padding:14px 0 4px"><div class="t"><b>We are busy right now</b><small>Shows the message below and blocks instant booking, schedule still works</small></div>${switchHTML(!!ins.busy, 'data-a="tog" data-cfg="instant.busy" data-def="0"', 'sm')}</div>
    <label class="lbl">Busy message</label><textarea class="ta" style="min-height:70px" data-cfg="instant.busyMessage" data-t="text">${esc(ins.busyMessage || '')}</textarea></div>
   <div class="card flush rise"><div class="ch-title"><b>App tabs</b></div>${TABS_CFG.map(([k, t, d]) => trow('tabs.' + k, k === 'washes' ? 'car' : k === 'money' ? 'wallet' : 'user', t, d)).join('')}</div>
   <div class="card flush rise"><div class="ch-title"><b>Home sections</b></div>${SECTIONS.map(([k, t, d]) => trow('sections.' + k, 'grid', t, d)).join('')}</div>
  </div>
  <div class="card flush rise"><div class="ch-title"><b>Features</b><small>Off hides every way in</small></div>${FEATURES.map(([k, i, t, d]) => trow('features.' + k, i, t, d)).join('')}</div></div>`;
}

function fld(label, cfg, o = {}) {
  const v = G(cfg), t = o.t || 'text', inner = `<input class="field" ${o.type ? `type="${o.type}"` : ''} ${t === 'num' ? 'inputmode="decimal"' : ''} data-cfg="${cfg}" data-t="${t}" value="${esc(v ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}>`;
  return `<div><label class="lbl" ${o.first ? 'style="margin-top:4px"' : ''}>${esc(label)}${o.small ? ` <small>${esc(o.small)}</small>` : ''}</label>${o.money ? `<div class="money"><span>₹</span>${inner}</div>` : o.unit ? `<div class="unit">${inner}<span>${o.unit}</span></div>` : inner}</div>`;
}
const CONTENT_TABS = [['home', 'Home texts'], ['buttons', 'Buttons'], ['legal', 'Pages'], ['help', 'Help']];
function screenContent() {
  const seg = `<div class="chips" style="margin-bottom:14px">${CONTENT_TABS.map(([id, n]) => `<button class="chip press ${UI.ctab === id ? 'on' : ''}" data-a="ctab" data-id="${id}">${n}</button>`).join('')}</div>`;
  if (UI.ctab === 'buttons') {
    const l = sortBy(S.ui_buttons), PL = { home_top: 'Home, under the entry cards', home_mid: 'Home, under the packs', home_bottom: 'Home, above the trust block', profile: 'Profile', help: 'Help' };
    return seg + (l.length ? Object.keys(PL).map(pl => { const g = l.filter(b => b.placement === pl); return g.length ? `<div class="sec"><h3>${PL[pl]}</h3></div><div class="cols c2">${g.map(b => `<div class="rise"><button class="press" style="display:block;width:100%;text-align:left" data-a="bedit" data-id="${esc(b.id)}">${btnHTML(b)}</button><div class="trow" style="padding:6px 2px"><span class="mini" style="flex:1">${esc(actionText(b.action))}</span>${statusSel(b.status, `data-ch="bstatus" data-id="${esc(b.id)}"`)}</div></div>`).join('')}</div>` : '' }).join('') : emptyHTML('bell', 'No custom buttons', 'Add a banner or button to Home, Profile or Help. It appears in the app within seconds.', '')) +
      `<div style="margin-top:16px"><button class="btn soft press" data-a="bnew">${ic('plus', 18, 2)} Add button or banner</button></div>`;
  }
  if (UI.ctab === 'legal') {
    const l = sortBy(S.legal);
    return seg + (l.length ? `<div class="card flush"><div class="items">${l.map(d => `<div class="item rise ${d.status === 'hidden' ? 'hidden' : ''}"><div class="thumb" style="width:44px;height:44px;border-radius:12px;background:var(--violet-t2);color:var(--violet)">${ic(d.icon || 'doc', 20)}</div>
      <button class="body" data-a="ledit" data-id="${esc(d.id)}"><b>${esc(d.title)}</b><small>/${esc(d.id)} · v${d.version || 1} · ${(d.showIn || []).join(', ') || 'not listed'}${d.draft ? ' · draft' : ''}</small></button>
      <div class="acts">${statusSel(d.status, `data-ch="lstatus" data-id="${esc(d.id)}"`)}</div></div>`).join('')}</div></div>` : emptyHTML('doc', 'No pages yet', 'Terms, privacy, cancellation or any page of your own. Import the defaults from Settings to start from the app\'s texts.', '')) +
      `<div style="margin-top:14px"><button class="btn soft press" data-a="lnew">${ic('plus', 18, 2)} Add page</button></div>`;
  }
  if (UI.ctab === 'help') {
    const l = sortBy(S.help);
    return seg + (l.length ? `<div class="card flush"><div class="items">${l.map(d => `<div class="item rise ${d.status === 'hidden' ? 'hidden' : ''}"><div class="thumb" style="width:44px;height:44px;border-radius:12px;background:var(--violet-t2);color:var(--violet)">${ic(d.icon || 'help', 20)}</div>
      <button class="body" data-a="hedit" data-id="${esc(d.id)}"><b>${esc(d.title)}</b><small>${(d.faqs || []).length} questions${d.sub ? ' · ' + esc(d.sub) : ''}</small></button>
      <div class="acts">${statusSel(d.status, `data-ch="hstatus" data-id="${esc(d.id)}"`)}</div></div>`).join('')}</div></div>` : emptyHTML('help', 'No help topics', 'Add a topic with its questions and answers.', '')) +
      `<div style="margin-top:14px"><button class="btn soft press" data-a="hnew">${ic('plus', 18, 2)} Add help topic</button></div>`;
  }
  const hero = `<div style="background:linear-gradient(135deg,#6b22ee,#3A06A0);border-radius:var(--r-card);padding:20px 16px;color:#fff;position:relative;overflow:hidden"><div style="font-size:26px;font-weight:800;line-height:1.15;letter-spacing:-.5px">${esc(G('home.heroTitle') || '')}</div><div style="opacity:.9;margin-top:8px;font-size:13px">${esc(G('home.heroSub') || '')}</div><div style="margin-top:14px;display:inline-block;background:rgba(255,255,255,.2);border-radius:999px;padding:4px 12px;font-size:11px;font-weight:600">Theme: ${esc(G('home.heroTheme') || 'festive')}</div></div>
   <div style="background:linear-gradient(135deg,#5409DA,#3A06A0);border-radius:var(--r-card);padding:14px 16px;color:#fff;margin-top:10px;display:flex;align-items:center;gap:10px"><div style="flex:1"><div style="font-weight:600">Refer a friend and earn <span style="color:var(--gold)">${rs(G('home.referAmount'))}</span></div><div style="opacity:.8;font-size:12px">They get ${rs(G('home.friendAmount'))} on their first wash</div></div><div style="width:40px;height:40px;border-radius:50%;background:var(--gold);color:#5409DA;display:grid;place-items:center">${ic('gift', 20)}</div></div>`;
  return seg + `<div class="cols c2"><div class="col"><div class="card rise"><div class="ch-title" style="padding:0"><b>Hero</b></div>
    ${fld('Headline', 'home.heroTitle', { first: 1 })}${fld('Sub line', 'home.heroSub')}
    <label class="lbl">Hero theme</label><select class="sel" data-cfg="home.heroTheme" data-t="text">${['default', 'festive', 'monsoon', 'winter'].map(x => `<option ${G('home.heroTheme') === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <div class="row2">${fld('You earn (refer)', 'home.referAmount', { t: 'num', money: 1 })}${fld('Friend gets', 'home.friendAmount', { t: 'num', money: 1 })}</div></div>
    <div class="card rise"><div class="ch-title" style="padding:0"><b>Section titles</b></div>${fld('Packs title', 'home.packsTitle', { first: 1 })}${fld('Packs sub line', 'home.packsSub')}${fld('Services title', 'home.servicesTitle')}${fld('Services sub line', 'home.servicesSub')}${fld('Trust title', 'home.trustTitle')}${fld('Trust sub line', 'home.trustSub')}</div></div>
    <div class="stage rise" style="position:sticky;top:90px"><div class="cap"><i></i>Preview</div>${hero}</div></div>`;
}
const actionText = a => a ? ({ url: 'Opens link ', whatsapp: 'WhatsApp ', call: 'Calls ', page: 'Opens page ', service: 'Opens service ', legal: 'Opens legal page ' }[a.type] || '') + (a.value || '') : '';
function btnHTML(b) {
  const tint = hex(b.tint), banner = b.style === 'banner', paused = b.status === 'paused', hid = b.status === 'hidden';
  if (banner) return `<div class="bn ${paused ? 'paused' : ''}" style="background:${tint};color:#fff;box-shadow:none;${hid ? 'opacity:.4' : ''}"><div class="ico" style="background:rgba(255,255,255,.2)">${ic(b.icon, 22)}</div><div style="flex:1;min-width:0"><b>${esc(b.label || 'Label')}</b><small style="color:rgba(255,255,255,.85)">${esc(b.sub || '')}</small></div><span class="go" style="color:#fff">${ic('chev', 18)}</span></div>`;
  return `<div class="bn ${paused ? 'paused' : ''}" style="${hid ? 'opacity:.4' : ''}"><div class="ico" style="background:${tint}22;color:${tint}">${ic(b.icon, 22)}</div><div style="flex:1;min-width:0"><b>${esc(b.label || 'Label')}</b><small>${esc(b.sub || '')}</small></div><span class="go">${ic('chev', 18)}</span></div>`;
}

function screenSettings() {
  const sl = G('fees.slotSurcharge') || {}, sc = S.slots_cfg.default || {}, parts = sc.parts || (window.WD_SEED.slots_cfg || {}).parts || {};
  const sd = window.WD_SEED.slots_cfg;
  const sv = (k, d) => sc[k] ?? sd[k] ?? d;
  const slotRows = Object.entries(sl).sort(([a], [b]) => a.localeCompare(b));
  const partRow = (k, n) => { const v = parts[k] || sd.parts[k], fr = Array.isArray(v) ? v[0] : v.from, tl = Array.isArray(v) ? v[1] : v.till; return `<div class="row3" style="grid-template-columns:90px 1fr 1fr;align-items:center;margin-top:8px"><b style="font-weight:500">${n}</b><input type="time" class="field" data-sl="parts.${k}.from" value="${esc(fr)}"><input type="time" class="field" data-sl="parts.${k}.till" value="${esc(tl)}"></div>` };
  const slF = (label, key, d, unit) => `<div><label class="lbl" style="margin-top:4px">${label}</label><div class="unit"><input class="field" inputmode="numeric" data-sl="${key}" data-t="num" value="${esc(sv(key, d))}">${unit ? `<span>${unit}</span>` : ''}</div></div>`;
  return `<div class="cols c2"><div class="col">
  <div class="card rise"><div class="ch-title" style="padding:0"><b>Fees</b><small>Shown in the app, n8n re-prices on the server</small></div>
    <div class="row2">${fld('Convenience fee', 'fees.convenience', { t: 'num', money: 1, first: 1 })}${fld('Free above', 'fees.convenienceBelow', { t: 'num', money: 1, first: 1, small: 'order total' })}</div>
    <div class="row2">${fld('GST', 'fees.gstPct', { t: 'num', unit: '%' })}${fld('Visit fee', 'fees.visit', { t: 'num', money: 1 })}</div>
    <label class="lbl">Extra on every slot of the day <small>flat ₹ added to all slots in that part</small></label>
    <div class="row3"><div class="money"><span>₹</span><input class="field" inputmode="numeric" data-cfg="fees.surcharge.morning" data-t="num" value="${esc(G('fees.surcharge.morning'))}" aria-label="Morning"></div><div class="money"><span>₹</span><input class="field" inputmode="numeric" data-cfg="fees.surcharge.afternoon" data-t="num" value="${esc(G('fees.surcharge.afternoon'))}" aria-label="Afternoon"></div><div class="money"><span>₹</span><input class="field" inputmode="numeric" data-cfg="fees.surcharge.evening" data-t="num" value="${esc(G('fees.surcharge.evening'))}" aria-label="Evening"></div></div>
    <div class="row3" style="margin-top:4px"><span class="mini">Morning</span><span class="mini">Afternoon</span><span class="mini">Evening</span></div></div>
  <div class="card rise"><div class="ch-title" style="padding:0"><b>Recurring plans</b><small>Visits a month and discount for each repeat option</small></div>
    ${[['weekly', 'Once a week'], ['twice', 'Twice a week'], ['alt', 'Alternate days']].map(([k, n]) => `<div class="row2" style="align-items:end"><div>${fld(n + ' · visits a month', 'recurring.' + k + '.visits', { t: 'num', first: 1 })}</div><div>${fld('Discount', 'recurring.' + k + '.off', { t: 'num', unit: '%', first: 1 })}</div></div>`).join('')}
    <p class="hint" style="margin:6px 0 0">Monthly estimate = (price after discount + fees + GST) × visits. Needs the Recurring switch on.</p></div>
  <div class="card rise"><div class="ch-title" style="padding:0"><b>Peak slot charges</b><small>${slotRows.length} slots</small></div>
    <p class="hint" style="margin:4px 0 8px">The "+₹30" chip on a specific time. Pick a time and a charge.</p>
    ${slotRows.map(([t, v]) => `<div class="lrow" style="align-items:center"><div class="f" style="flex-direction:row;gap:8px"><input type="time" class="field" value="${esc(t)}" data-ch="sltime" data-old="${esc(t)}"><div class="money" style="width:130px"><span>₹</span><input class="field" inputmode="numeric" value="${esc(v)}" data-ch="slval" data-old="${esc(t)}"></div></div><button class="ibtn flat sm press" data-a="sldel" data-t="${esc(t)}" aria-label="Remove">${ic('x', 16)}</button></div>`).join('')}
    <button class="addrow press" data-a="sladd">${ic('plus', 18, 2)} Add peak slot</button></div></div>
  <div class="col">
  <div class="card rise"><div class="ch-title" style="padding:0"><b>Slots</b></div>
    <div class="row3">${slF('Days ahead', 'days', 7)}${slF('Step', 'grid', 30, 'min')}${slF('Cut-off', 'cutoffMins', 90, 'min')}</div>
    <div style="margin-top:14px"><b style="font-size:12px;font-weight:600;color:var(--ink2)">Day parts</b>${partRow('morning', 'Morning')}${partRow('afternoon', 'Afternoon')}${partRow('evening', 'Evening')}</div>
    <div class="row2" style="margin-top:4px">${slF('Washers per slot', 'capacityPerSlot', 3)}</div>
    <label class="lbl">Closed dates <small>no bookings that day</small></label><div class="chips wrap">${(sc.closedDates || []).map(d => `<span class="chip">${esc(d)} <button data-a="cdel" data-d="${esc(d)}" aria-label="Remove" style="margin-left:2px;display:grid">${ic('x', 14)}</button></span>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:8px"><input type="date" class="field" id="newClosed"><button class="btn soft press" data-a="cadd">Add</button></div></div>
  <div class="card rise"><div class="ch-title" style="padding:0"><b>Support contacts</b></div>${fld('WhatsApp number', 'support.whatsapp', { first: 1, ph: '10 digits' })}${fld('Phone number', 'support.phone', { ph: '10 digits' })}${fld('Email', 'support.email')}</div>
  <div class="card flush rise"><div class="ch-title"><b>Tools</b></div>
    <button class="trow tap press hov" data-a="import"><div class="ico">${ic('download', 18)}</div><div class="t"><b>Import app defaults</b><small>Adds the app's built-in services, coupons, pages and settings that are missing. Never overwrites.</small></div></button>
    <button class="trow tap press hov" data-a="export"><div class="ico">${ic('upload', 18)}</div><div class="t"><b>Download a backup</b><small>Everything in one JSON file</small></div></button>
    ${DEMO ? '' : `<a class="trow tap press hov" href="../" style="text-decoration:none;color:inherit"><div class="ico">${ic('user', 18)}</div><div class="t"><b>Approvals</b><small>Washers, customers, new cars</small></div></a><a class="trow tap press hov" href="../work.html" style="text-decoration:none;color:inherit"><div class="ico">${ic('calendar', 18)}</div><div class="t"><b>Daily work</b><small>Today's washes</small></div></a>
    <button class="trow tap press hov" data-a="signout"><div class="ico" style="background:var(--red-t);color:var(--red)">${ic('out', 18)}</div><div class="t"><b>Sign out</b><small>${esc(who())}</small></div></button>`}</div></div></div>`;
}
const SCREENS = { catalog: screenCatalog, offers: screenOffers, switch: screenSwitch, content: screenContent, settings: screenSettings };
const who = () => { try { return window.WDAuth && WDAuth.phone() || '' } catch (e) { return '' } };

/* ---------------- editors ---------------- */
let E = null;   // the doc being edited in the open sheet: { col, id, isNew, d, kind }
const setE = (path, v) => pset(E.d, path, v);
const PAIR = { steps: ['t', 'd'], faqs: ['q', 'a'], benefits: ['t', 'd'], rows: ['k', 'v'] };
const lst = (path, ph1, ph2) => {
  const a = pget(E.d, path) || [], two = ph2 !== undefined, [k1, k2] = PAIR[path] || ['t', 'd'];
  return a.map((r, i) => `<div class="lrow"><div class="f">${two ? `<input class="field" data-e="${path}.${i}.${k1}" value="${esc(r[k1])}" placeholder="${esc(ph1)}"><input class="field" data-e="${path}.${i}.${k2}" value="${esc(r[k2])}" placeholder="${esc(ph2)}">` : `<input class="field" data-e="${path}.${i}" value="${esc(r)}" placeholder="${esc(ph1)}">`}</div>
    <div style="display:flex;gap:4px"><button class="ibtn flat sm press" data-a="lmv" data-p="${path}" data-i="${i}" data-d="-1" aria-label="Up">${ic('up', 14)}</button><button class="ibtn flat sm press" data-a="lrm" data-p="${path}" data-i="${i}" aria-label="Remove">${ic('x', 14)}</button></div></div>`).join('') +
    `<button class="addrow press" data-a="ladd" data-p="${path}" data-two="${two ? 1 : 0}">${ic('plus', 18, 2)} Add</button>`;
};
// pair lists are stored as arrays of maps (Firestore has no nested arrays); old [[a,b]] data is converted when a doc is opened
function normPairs(d) { for (const p in PAIR) if (Array.isArray(d[p])) d[p] = d[p].map(r => Array.isArray(r) ? { [PAIR[p][0]]: r[0], [PAIR[p][1]]: r[1] } : r) }
const listBox = (path, a, b) => `<div id="L-${path.replace(/\./g, '_')}">${lst(path, a, b)}</div>`;
const listRefresh = path => { const el = $('#L-' + path.replace(/\./g, '_')); if (el) { const t = E._ph[path]; el.innerHTML = lst(path, t[0], t[1]) } };
const inp = (label, path, o = {}) => { const v = pget(E.d, path); const f = `<input class="field" ${o.type ? `type="${o.type}"` : ''} ${o.num ? 'inputmode="decimal"' : ''} data-e="${path}" data-t="${o.num ? 'num' : 'text'}" ${o.ro ? 'readonly aria-readonly="true" style="opacity:.6"' : ''} value="${esc(v ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.list ? `list="${o.list}"` : ''}>`; return `<div><label class="lbl">${esc(label)}${o.small ? ` <small>${esc(o.small)}</small>` : ''}</label>${o.money ? `<div class="money"><span>₹</span>${f}</div>` : o.unit ? `<div class="unit">${f}<span>${o.unit}</span></div>` : f}</div>` };
const segE = (path, opts, cur) => `<div class="seg">${opts.map(([v, n, c]) => `<button class="${cur === v ? 'on ' + (c || '') : ''}" data-a="eseg" data-p="${path}" data-v="${v}">${n}</button>`).join('')}</div>`;
const statusSeg = cur => segE('status', [['live', 'Live', 'g'], ['paused', 'Paused', 'a'], ['hidden', 'Hidden', 'r']], cur || 'live');

function uniqId(col, base) { base = slug(base) || 'item'; let id = base, n = 2; while (S[col][id]) id = base + '-' + (n++); return id }

function sheetShell(title, forms, previewHTML, opts = {}) {
  const footer = `${E.isNew ? '' : `<button class="btn danger fix press" data-a="edelete" aria-label="Delete">${ic('trash', 18)}</button>`}<button class="btn go press" data-a="esave">${E.isNew ? 'Add' : 'Save'}</button>`;
  openSheet({ title, split: !!previewHTML, body: `${previewHTML ? `<div class="stage" id="stg"><div class="cap"><i></i>Live preview</div><div id="stgIn"></div></div>` : ''}<div class="forms">${forms}</div>`, footer, cls: opts.narrow ? 'narrow' : '' });
  if (previewHTML) updatePreview();
}
function updatePreview() { const el = $('#stgIn'); if (!el || !E) return; el.innerHTML = E.preview(E.d) }

/* catalog */
function artPicker() {
  const a = E.d.art || {}, k = E.d.kind, keys = k === 'store' ? STORE_KEYS : Object.keys(ART).filter(x => k === 'pack' ? true : !/^pack-|^pass/.test(x));
  const sw = ['#5409DA', '#2F8FF0', '#16a34a', '#FF7A45', '#e5484d', '#FFBA08', '#ec4899', '#171717'];
  return `<div class="fgrp"><h4>${ic('sparkle', 16)} Picture on the card</h4>
   <label class="lbl">Built-in illustration <small>${k === 'store' ? 'the store card kinds' : 'the same drawings the app has'}</small></label>
   <div class="arts" id="artGrid"><button data-a="artkey" data-k="" class="${!a.key ? 'on' : ''}" title="Generic">${genericArt({ ...a, key: '' })}<em>generic</em></button>${keys.map(x => `<button data-a="artkey" data-k="${x}" class="${a.key === x ? 'on' : ''}" title="${x}">${ART[x] || genericArt({ accent: a.accent, key: x })}<em>${x}</em></button>`).join('')}</div>
   <div id="genBox" style="${a.key && k !== 'store' ? 'display:none' : ''}"><label class="lbl">Icon <small>for the generic picture</small></label>
   <div class="icons">${GENERIC_ICONS.map(n => `<button data-a="articon" data-n="${n}" class="${a.icon === n ? 'on' : ''}" aria-label="${n}">${ic(n, 20)}</button>`).join('')}</div></div>
   <div class="colors" style="margin-top:12px"><label>Card colour <input type="color" data-e="art.tint" data-t="text" value="${hex(a.tint || '#F3F0FA')}"></label><label>Accent <input type="color" data-e="art.accent" data-t="text" value="${hex(a.accent)}"></label></div>
   <div class="swatches">${sw.map(c => `<button style="background:${c}" data-a="accent" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
   <label class="lbl">Photo link <small>optional, used only when no illustration is picked</small></label><input class="field" data-e="photo" data-t="text" value="${esc(E.d.photo || '')}" placeholder="https://"></div>`;
}
function openCatalog(id, kind) {
  const isNew = !id, base = isNew ? { kind, name: '', short: '', cat: kind === 'service' ? 'Exterior' : kind === 'pack' ? 'Packs' : kind === 'plan' ? 'Monthly plans' : 'Care', price: 0, mrp: 0, mins: kind === 'service' ? 20 : 0, blurb: '', steps: [], included: [], excluded: [], faqs: [], variants: kind === 'service' ? { hatch: 1, sedan: 1.2, suv: 1.4 } : {}, art: kind === 'plan' ? { icon: 'clock', tint: '#F3F0FA', accent: '#5409DA' } : kind === 'store' ? { key: 'sparkle', tint: '#F3F0FA', accent: '#5409DA' } : { icon: 'sparkle', tint: '#F4F4F5', accent: '#5409DA' }, badge: '', order: (catalogList(kind).slice(-1)[0]?.order ?? 0) + 10, status: 'live', pausedNote: '' } : clone(S.catalog[id]);
  const d = base; normPairs(d); d.kind = d.kind || 'service'; d.art = d.art || {}; d.variants = d.variants || {};
  E = { col: 'catalog', id, isNew, d, preview: it => `<div class="frame ${it.kind === 'pack' ? 'pack' : ''}">${tileHTML(it)}</div>`, _ph: { steps: ['Step title', 'What happens'], included: ['What is included'], excluded: ['What is not included'], faqs: ['Question', 'Answer'], rows: ['Label', 'Value'] } };
  const k = d.kind, cats = [...new Set(Object.values(S.catalog).map(x => x.cat).filter(Boolean))];
  const lockP = k !== 'service';
  const price = `<div class="fgrp"><h4>${ic('tag', 16)} Price</h4><div class="row3">${inp('Price', 'price', { num: 1, money: 1, ro: lockP })}${inp('Old price (MRP)', 'mrp', { num: 1, money: 1, ro: lockP })}${k === 'plan' || k === 'store' ? inp('Order', 'order', { num: 1 }) : inp('Minutes', 'mins', { num: 1, unit: 'min' })}</div>
    ${lockP ? `<p class="hint">Price is set in the payment server for now; changing it here would charge a different amount.</p>` : ''}
    ${k === 'service' ? `<label class="lbl">Car sizes <small>price = base × multiplier</small></label>${[['hatch', 'Hatchback'], ['sedan', 'Sedan'], ['suv', 'SUV']].map(([v, n]) => `<div class="trow" style="padding:6px 0;min-height:0"><div class="t"><b style="font-weight:500">${n}</b><small id="vp-${v}"></small></div><div class="unit" style="width:90px"><input class="field" style="min-height:38px" inputmode="decimal" data-e="variants.${v}" data-t="vnum" value="${esc(d.variants[v] ?? '')}" ${d.variants[v] == null ? 'disabled' : ''}><span>×</span></div>${switchHTML(d.variants[v] != null, `data-a="vtog" data-v="${v}"`, 'sm')}</div>`).join('')}` : ''}</div>`;
  const forms = `<div class="fgrp"><h4>${ic('pencil', 16)} Basics</h4>
    <div class="row2"><div><label class="lbl">Type</label><select class="sel" data-e="kind" data-t="kind">${KINDS.map(([v, n]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${n.replace(/s$/, '')}</option>`).join('')}</select></div>${inp('Category', 'cat', { list: 'catlist', ph: 'e.g. Exterior' })}</div><datalist id="catlist">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    ${inp('Name', 'name', { ph: 'Full name' })}${k === 'service' ? inp('Short name on the card', 'short', { ph: 'Shorter name, 2 lines max' }) : k === 'pack' ? inp('One-line sub', 'short', { ph: 'Pressure wash + tyre polish + interior' }) : ''}
    <label class="lbl">Badge</label><div class="seg">${[['', 'None'], ['NEW', 'NEW'], ['POPULAR', 'POPULAR'], ['BEST', 'BEST']].map(([v, n]) => `<button class="${(d.badge || '') === v ? 'on' : ''}" data-a="eseg" data-p="badge" data-v="${v}">${n}</button>`).join('')}</div>
    <label class="lbl">Short description</label><textarea class="ta" style="min-height:70px" data-e="blurb" data-t="text" placeholder="One or two lines">${esc(d.blurb)}</textarea></div>
    ${price}
    <div class="fgrp"><h4>${ic('eye', 16)} Availability</h4><label class="lbl">Status</label>${statusSeg(d.status)}<div id="noteBox" style="${d.status === 'paused' ? '' : 'display:none'}"><label class="lbl">Note shown on the greyed card</label><input class="field" data-e="pausedNote" data-t="text" value="${esc(d.pausedNote || '')}" placeholder="Not available right now"></div>
    <p class="hint">Live: bookable. Paused: shown greyed with the note, cannot be added. Hidden: not shown at all.</p>${k === 'service' || k === 'pack' ? '' : inp('Order', 'order', { num: 1 })}</div>
    ${artPicker()}
    ${k === 'plan' ? `<div class="fgrp"><h4>${ic('plan', 16)} Plan details</h4><label class="lbl">Visits per week <small>detailing is per month</small></label><div class="row3" style="grid-template-columns:repeat(5,1fr)">${[['int', 'Interior'], ['tyre', 'Tyre'], ['foam', 'Foam'], ['fm', 'Foam /mo'], ['det', 'Detail']].map(([x, n]) => `<div><input class="field" inputmode="numeric" data-e="f.${x}" data-t="num" value="${esc(d.f?.[x] ?? 0)}"><span class="mini">${n}</span></div>`).join('')}</div><label class="lbl">Rows on the plan card</label>${listBox('rows', 'Label', 'Value')}</div>` : ''}
    <div class="fgrp"><h4>${ic('list', 16)} ${k === 'store' ? 'Bullet points' : 'What is included'}</h4>${listBox('included', 'e.g. Body and roof')}</div>
    ${k === 'service' || k === 'pack' ? `<div class="fgrp"><h4>${ic('x', 16)} What is not included</h4>${listBox('excluded', 'e.g. Engine bay')}</div>` : ''}
    ${k === 'service' ? `<div class="fgrp"><h4>${ic('check', 16)} How it works</h4>${listBox('steps', 'Step title', 'What happens')}</div>` : ''}
    ${k === 'service' || k === 'pack' ? `<div class="fgrp"><h4>${ic('help', 16)} Questions on this service</h4><p class="hint" style="margin-top:6px">Empty uses the app's general questions.</p>${listBox('faqs', 'Question', 'Answer')}</div>` : ''}
    ${k === 'store' ? `<div class="fgrp"><div class="trow" style="padding:10px 0 0"><div class="t"><b>Made to fit the customer's car</b><small>Shows "for your car" on the card</small></div>${switchHTML(!!d.fit, 'data-a="fit"', 'sm')}</div></div>` : ''}`;
  sheetShell(isNew ? 'Add ' + KIND_LABEL[kind] : 'Edit ' + (d.kind === 'plan' ? 'plan' : d.kind), forms, true);
  updateVariantHints();
}
function updateVariantHints() { if (!E || E.d.kind !== 'service') return; ['hatch', 'sedan', 'suv'].forEach(v => { const el = $('#vp-' + v); const m = E.d.variants[v]; if (el) el.textContent = m == null ? 'Not offered' : rs(m === 1 ? E.d.price : r9(num(E.d.price) * m)) }) }

/* coupons */
function couponPreview(c) { return `<div class="coupon" style="padding:0"><span class="code">${esc(c.code || 'CODE')}</span><div style="flex:1;min-width:0"><b style="display:block;font-weight:600">${esc(c.title || 'Title')}</b><small style="color:var(--grey);display:block">${esc(c.desc || '')}</small></div></div><div class="mini" style="margin-top:10px">${esc(couponSummary(c))}</div>` }
function openCoupon(id) {
  const isNew = !id, d = isNew ? { code: '', title: '', desc: '', type: 'flat', value: 50, maxOff: 0, minOrder: 199, modes: [], firstOrderOnly: false, perUser: 1, validFrom: new Date().toISOString().slice(0, 10), validTill: '', status: 'live', public: true, tnc: [], order: 99 } : { code: id, ...clone(S.coupons[id]) };
  E = { col: 'coupons', id, isNew, d, preview: couponPreview, _ph: { tnc: ['Condition shown under the coupon'] } };
  const forms = `<div class="fgrp"><h4>${ic('percent', 16)} Coupon</h4>${isNew ? inp('Code', 'code', { ph: 'SHINE20' }) : ''}${inp('Title', 'title', { ph: '₹100 off your first booking' })}${inp('Sub line', 'desc', { ph: 'On orders above ₹299' })}
    <label class="lbl">Discount</label>${segE('type', [['flat', '₹ off'], ['pct', '% off']], d.type)}
    <div class="row3" style="margin-top:10px">${inp('Value', 'value', { num: 1, small: '₹ or %' })}${inp('Max off', 'maxOff', { num: 1, money: 1, small: '0 = none' })}${inp('Min order', 'minOrder', { num: 1, money: 1 })}</div></div>
    <div class="fgrp"><h4>${ic('car', 16)} Where it works</h4><label class="lbl">Booking types <small>none selected = all</small></label><div class="chips wrap">${MODES.map(m => `<button class="chip press ${(d.modes || []).includes(m) ? 'on' : ''}" data-a="emode" data-v="${m}">${m}</button>`).join('')}</div>
    <div class="trow" style="padding:12px 0 0"><div class="t"><b>First order only</b></div>${switchHTML(d.firstOrderOnly, 'data-a="etog" data-p="firstOrderOnly"', 'sm')}</div>
    <div class="trow" style="padding:6px 0 0"><div class="t"><b>Show in the coupon list</b><small>Off = a private code customers must type</small></div>${switchHTML(d.public !== false, 'data-a="etog" data-p="public"', 'sm')}</div>
    <div class="row3" style="margin-top:6px">${inp('Uses per customer', 'perUser', { num: 1 })}${inp('Valid from', 'validFrom', { type: 'date' })}${inp('Valid till', 'validTill', { type: 'date' })}</div></div>
    <div class="fgrp"><h4>${ic('doc', 16)} Conditions</h4>${listBox('tnc', 'Condition shown under the coupon')}</div>
    <div class="fgrp"><h4>${ic('eye', 16)} Status</h4><div style="margin-top:10px">${segE('status', [['live', 'Live', 'g'], ['paused', 'Paused', 'a']], d.status)}</div></div>`;
  sheetShell(isNew ? 'Add coupon' : 'Edit coupon', forms, true);
}

/* pass */
function openPass(id) {
  const isNew = !id, d = isNew ? { name: 'WD Pass', title: 'Exterior Wash', visits: 3, price: 349, mrp: 447, validDays: 30, maxMins: 35, covers: [], benefits: [], faqs: [], status: 'live', order: 1 } : clone(S.passes_cfg[id]); normPairs(d);
  E = { col: 'passes_cfg', id, isNew, d, preview: p => `<div class="frame pack" style="max-width:300px">${passHTML(p)}</div>`, _ph: { benefits: ['Benefit', 'Detail'], faqs: ['Question', 'Answer'] } };
  const svc = sortBy(S.catalog).filter(x => x.kind === 'service' || x.kind === 'pack' || !x.kind);
  const forms = `<div class="fgrp"><h4>${ic('tag', 16)} Pass</h4>${inp('Name', 'name')}${inp('Card heading', 'title', { ph: 'Exterior Wash' })}<div class="row3" style="margin-top:4px">${inp('Visits', 'visits', { num: 1 })}${inp('Price', 'price', { num: 1, money: 1 })}${inp('Old price', 'mrp', { num: 1, money: 1 })}</div>
    <div class="row2">${inp('Valid for', 'validDays', { num: 1, unit: 'days' })}${inp('Longest service', 'maxMins', { num: 1, unit: 'min', small: '999 = any' })}</div></div>
    <div class="fgrp"><h4>${ic('car', 16)} Services a visit covers</h4><div class="chips wrap" style="margin-top:10px">${svc.map(s => `<button class="chip press ${(d.covers || []).includes(s.id) ? 'on' : ''}" data-a="ecover" data-v="${esc(s.id)}">${esc(s.short || s.name)}</button>`).join('') || '<span class="mini">Add services first.</span>'}</div></div>
    <div class="fgrp"><h4>${ic('star', 16)} Benefits</h4>${listBox('benefits', 'Benefit', 'Detail')}</div><div class="fgrp"><h4>${ic('help', 16)} Questions</h4>${listBox('faqs', 'Question', 'Answer')}</div>
    <div class="fgrp"><h4>${ic('eye', 16)} Status</h4><div style="margin-top:10px">${segE('status', [['live', 'Live', 'g'], ['paused', 'Paused', 'a'], ['hidden', 'Hidden', 'r']], d.status)}</div></div>`;
  sheetShell(isNew ? 'Add pass plan' : 'Edit pass plan', forms, true);
}

/* buttons */
function openButton(id) {
  const isNew = !id, d = isNew ? { placement: 'home_top', style: 'card', label: '', sub: '', icon: 'gift', tint: '#5409DA', action: { type: 'page', value: 'refer' }, order: 99, status: 'live' } : clone(S.ui_buttons[id]);
  d.action = d.action || { type: 'url', value: '' };
  E = { col: 'ui_buttons', id, isNew, d, preview: b => `<div style="max-width:340px;margin:0 auto">${btnHTML(b)}</div>`, _ph: {} };
  const forms = `<div class="fgrp"><h4>${ic('bell', 16)} Button or banner</h4>
    <label class="lbl">Where it shows</label><select class="sel" data-e="placement" data-t="text">${[['home_top', 'Home, under Instant / Schedule cards'], ['home_mid', 'Home, under the packs'], ['home_bottom', 'Home, above the trust block'], ['profile', 'Profile, own card above the list'], ['help', 'Help, above the topics']].map(([v, n]) => `<option value="${v}" ${d.placement === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label class="lbl">Style</label>${segE('style', [['card', 'Card'], ['banner', 'Banner']], d.style || 'card')}${inp('Label', 'label', { ph: 'Refer and earn' })}${inp('Sub line', 'sub', { ph: 'Optional' })}
    <label class="lbl">Icon</label><div class="icons">${BTN_ICONS.map(n => `<button data-a="eicon" data-n="${n}" class="${d.icon === n ? 'on' : ''}" aria-label="${n}">${ic(n, 20)}</button>`).join('')}</div>
    <div class="colors" style="margin-top:12px"><label>Colour <input type="color" data-e="tint" data-t="text" value="${hex(d.tint)}"></label></div></div>
    <div class="fgrp"><h4>${ic('link', 16)} What it does</h4><label class="lbl">Action</label><select class="sel" data-e="action.type" data-t="atype">${[['url', 'Open a link'], ['whatsapp', 'Open WhatsApp'], ['call', 'Call'], ['page', 'Open an app page'], ['service', 'Open a service'], ['legal', 'Open a legal page']].map(([v, n]) => `<option value="${v}" ${d.action.type === v ? 'selected' : ''}>${n}</option>`).join('')}</select><div id="aval">${actionValue(d.action)}</div>
    <div class="row2">${inp('Order', 'order', { num: 1 })}<div><label class="lbl">Status</label><select class="sel" data-e="status" data-t="text"><option value="live" ${d.status === 'live' ? 'selected' : ''}>Live</option><option value="paused" ${d.status === 'paused' ? 'selected' : ''}>Paused</option><option value="hidden" ${d.status === 'hidden' ? 'selected' : ''}>Hidden</option></select></div></div></div>`;
  sheetShell(isNew ? 'Add button or banner' : 'Edit button', forms, true);
}
function actionValue(a) {
  const t = a.type, v = a.value || '', f = (ph, lab) => `<label class="lbl">${lab}</label><input class="field" data-e="action.value" data-t="text" value="${esc(v)}" placeholder="${esc(ph)}">`;
  if (t === 'url') return f('https://', 'Link (https)'); if (t === 'whatsapp') return f('Hi, I need help', 'Pre-filled message'); if (t === 'call') return f('blank = support number', 'Number');
  const opts = t === 'page' ? PAGE_ACTIONS.map(x => [x, x]) : t === 'service' ? sortBy(S.catalog).filter(x => x.kind === 'service' || !x.kind).map(x => [x.id, x.name]) : sortBy(S.legal).map(x => [x.id, x.title]);
  return `<label class="lbl">${t === 'page' ? 'App page' : t === 'service' ? 'Service' : 'Legal page'}</label><select class="sel" data-e="action.value" data-t="text">${opts.map(([x, n]) => `<option value="${esc(x)}" ${v === x ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
}

/* legal pages */
function mdHTML(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n'); let o = '', ul = false, p = [];
  const fl = () => { if (p.length) { o += `<p>${esc(p.join(' '))}</p>`; p = [] } }, cl = () => { if (ul) { o += '</ul>'; ul = false } };
  for (const l of lines) {
    let m;
    if ((m = l.match(/^#{1,3}\s+(.*)/))) { fl(); cl(); o += `<h2>${esc(m[1])}</h2>` }
    else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { fl(); if (!ul) { o += '<ul>'; ul = true } o += `<li>${esc(m[1])}</li>` }
    else if (!l.trim()) { fl(); cl() } else { cl(); p.push(l.trim()) }
  }
  fl(); cl(); return o;
}
function openLegal(id) {
  const isNew = !id, d = isNew ? { title: '', body: '## Heading\n\nWrite the first paragraph here.\n\n- A bullet point', version: 1, showIn: ['profile'], status: 'live', order: 99, draft: false, icon: 'info', url: '' } : clone(S.legal[id]);
  E = { col: 'legal', id, isNew, d, _ph: {}, md: true };
  const forms = `<div class="fgrp"><h4>${ic('doc', 16)} Page</h4>${inp('Title', 'title', { ph: 'Refund policy' })}${isNew ? inp('Page id', 'id', { ph: 'refund', small: 'letters only, used in links' }) : ''}
    <label class="lbl">Where it is listed</label><div class="chips wrap">${[['profile', 'Profile > Legal'], ['signup', 'Sign-up screen'], ['footer', 'About footer']].map(([v, n]) => `<button class="chip press ${(d.showIn || []).includes(v) ? 'on' : ''}" data-a="eshow" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="row2"><div><label class="lbl">Icon</label><select class="sel" data-e="icon" data-t="text">${LEGAL_ICONS.map(x => `<option ${d.icon === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>${inp('Order', 'order', { num: 1 })}</div>
    <div class="trow" style="padding:12px 0 0"><div class="t"><b>Show a "Draft" chip</b><small>For pages not yet reviewed</small></div>${switchHTML(d.draft, 'data-a="etog" data-p="draft"', 'sm')}</div>
    <label class="lbl">Status</label>${segE('status', [['live', 'Live', 'g'], ['hidden', 'Hidden', 'r']], d.status)}${inp('Web copy link', 'url', { ph: 'https://washingdaddy.com/terms.html', small: 'optional' })}</div>
    <div class="fgrp"><h4>${ic('pencil', 16)} Text <small class="mini" style="font-weight:400">version ${num(d.version, 1)}, goes up by 1 when you save</small></h4>
    <div class="seg mdtabs" style="margin:12px 0 8px"><button class="on" data-a="mdtab" data-v="w">Write</button><button data-a="mdtab" data-v="p">Preview</button></div>
    <div class="mdwrap two" id="mdwrap"><div id="mdW"><div class="tool"><button data-a="mdins" data-v="## " title="Heading">H</button><button data-a="mdins" data-v="- " title="Bullet">• List</button><button data-a="mdins" data-v="\n\n" title="New paragraph">¶</button></div><textarea class="ta code" id="mdTa" data-e="body" data-t="text">${esc(d.body)}</textarea><p class="hint">The app shows: <code>## Heading</code>, paragraphs separated by a blank line, and <code>- </code> bullets.</p></div>
    <div class="mdprev" id="mdP"><div class="ttl" id="mdT">${esc(d.title)}</div><div class="md" id="mdB">${mdHTML(d.body)}</div></div></div></div>`;
  E.preview = null;
  sheetShell(isNew ? 'Add page' : 'Edit page', forms, false);
  const sh = $('#sheet'); sh.classList.remove('narrow'); mdLayout();
}
function mdLayout() { const w = $('#mdwrap'); if (!w) return; const two = window.innerWidth >= 960; w.classList.toggle('two', two); $('.mdtabs').style.display = two ? 'none' : ''; $('#mdW').hidden = false; $('#mdP').hidden = !two }

/* help */
function openHelp(id) {
  const isNew = !id, d = isNew ? { title: '', sub: '', icon: 'help', order: 99, faqs: [], status: 'live' } : clone(S.help[id]); normPairs(d);
  E = { col: 'help', id, isNew, d, _ph: { faqs: ['Question', 'Answer'] } };
  const forms = `<div class="fgrp"><h4>${ic('help', 16)} Topic</h4>${inp('Title', 'title', { ph: 'Payments' })}${isNew ? inp('Topic id', 'id', { ph: 'payments', small: 'letters only' }) : ''}${inp('Sub line', 'sub', { ph: 'Billing, refunds and transactions' })}
    <label class="lbl">Icon</label><div class="icons">${HELP_ICONS.map(n => `<button data-a="eicon" data-n="${n}" class="${d.icon === n ? 'on' : ''}" aria-label="${n}">${ic(n, 20)}</button>`).join('')}</div><div class="row2">${inp('Order', 'order', { num: 1 })}<div><label class="lbl">Status</label><select class="sel" data-e="status" data-t="text"><option value="live" ${d.status !== 'hidden' ? 'selected' : ''}>Live</option><option value="hidden" ${d.status === 'hidden' ? 'selected' : ''}>Hidden</option></select></div></div></div>
    <div class="fgrp"><h4>${ic('list', 16)} Questions and answers</h4>${listBox('faqs', 'Question', 'Answer')}</div>`;
  sheetShell(isNew ? 'Add help topic' : 'Edit help topic', forms, false, { narrow: true });
}

/* save / delete */
async function saveE() {
  if (!E) return; const { col, d } = E; let id = E.id;
  const need = (c, m) => { if (c) { toast(m); throw 0 } };
  try {
    if (col === 'catalog') { need(!String(d.name).trim(), 'Give it a name.'); need(num(d.price) <= 0 && d.kind !== 'plan', 'Set a price.'); d.price = num(d.price); d.mrp = num(d.mrp); d.mins = num(d.mins); d.order = num(d.order, 999); if (d.art && !d.art.key) delete d.art.key; if (!d.photo) delete d.photo; if (d.status !== 'paused') d.pausedNote = d.pausedNote || ''; if (!E.isNew || true) { if (d.kind === 'service' && !d.short) d.short = d.name } if (E.isNew) id = uniqId('catalog', (d.kind === 'service' ? '' : d.kind + '-') + d.name) }
    if (col === 'coupons') { need(E.isNew && !/^[A-Za-z0-9_-]{3,20}$/.test(d.code || ''), 'Code: 3 to 20 letters or numbers.'); need(!d.title, 'Add a title.'); d.value = num(d.value); d.maxOff = num(d.maxOff); d.minOrder = num(d.minOrder); d.perUser = num(d.perUser, 1); if (E.isNew) { id = d.code.toUpperCase(); need(S.coupons[id], 'That code already exists.') } delete d.code }
    if (col === 'passes_cfg') { need(!d.name, 'Give it a name.'); ['visits', 'price', 'mrp', 'validDays', 'maxMins'].forEach(k => d[k] = num(d[k])); if (E.isNew) id = uniqId('passes_cfg', d.name + '-' + d.visits) }
    if (col === 'ui_buttons') { need(!d.label, 'Add a label.'); d.order = num(d.order, 99); if (E.isNew) id = uniqId('ui_buttons', d.label) }
    if (col === 'legal') { need(!d.title, 'Add a title.'); if (E.isNew) { id = slug(d.id || d.title); need(!id || S.legal[id], 'That page id is taken.'); delete d.id } else d.version = num(d.version, 1) + 1; d.order = num(d.order, 99) }
    if (col === 'help') { need(!d.title, 'Add a title.'); if (E.isNew) { id = slug(d.id || d.title); need(!id || S.help[id], 'That topic id is taken.'); delete d.id } d.order = num(d.order, 99) }
  } catch (e) { if (e === 0) return; throw e }
  closeSheet();
  try { await D.set(col, id, d); snack('Saved. Live in the app.') } catch (e) {}
}
async function deleteDoc(col, id, label) {
  if (!await confirmDlg({ title: 'Delete ' + label + '?', msg: 'It disappears from the app straight away. You can undo for a few seconds.' })) return;
  const prev = clone(S[col][id]); closeSheet();
  try { await D.del(col, id) } catch (e) { return }
  snack('Deleted ' + label, () => D.set(col, id, prev).then(() => snack('Restored')));
}

/* ---------------- events ---------------- */
const debounces = {};
function deb(key, fn, ms = 550) { clearTimeout(debounces[key]); debounces[key] = setTimeout(fn, ms); status(); if (!DEMO) setStatus('saving', 'Saving…') }
const castVal = (el, v) => el.dataset.t === 'num' ? (v === '' ? 0 : num(v)) : v;
async function move(id, dir) {
  const k = S.catalog[id].kind || 'service', l = catalogList(k), i = l.findIndex(x => x.id === id), j = i + dir; if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  await Promise.all(l.map((x, n) => num(x.order, 999) !== (n + 1) * 10 ? D.patch('catalog', x.id, { order: (n + 1) * 10 }) : null)).catch(() => {});
  if (DEMO) rerender(true);
}
async function importDefaults() {
  if (!await confirmDlg({ title: 'Import app defaults?', msg: 'Adds the services, packs, plans, store items, coupons, pages, help and settings the app ships with. Anything you already have is kept as it is.', ok: 'Import', danger: false })) return;
  const sd = window.WD_SEED; let n = 0; const jobs = [];
  const map = { catalog: 'catalog', coupons: 'coupons', passes_cfg: 'passes_cfg', legal: 'legal', help: 'help', ui_buttons: 'buttons' };
  for (const c in map) for (const id in (sd[map[c]] || {})) if (!S[c][id]) { jobs.push(D.set(c, id, sd[map[c]][id])); n++ }
  if (!S.slots_cfg.default) { jobs.push(D.set('slots_cfg', 'default', sd.slots_cfg)); n++ }
  if (!S.cfgExists) { jobs.push(D.set('appcfg', 'customer', sd.appcfg)); n++ }
  try { await Promise.all(jobs); snack(n ? `Imported ${n} items.` : 'Everything is already there.') } catch (e) {}
}
function exportJSON() {
  const out = { exportedAt: nowISO(), appcfg: S.cfg, catalog: S.catalog, coupons: S.coupons, passes_cfg: S.passes_cfg, legal: S.legal, help: S.help, ui_buttons: S.ui_buttons, slots_cfg: S.slots_cfg };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = 'wd-config-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
}
const slPatch = async (fn) => { const cur = clone(G('fees.slotSurcharge') || {}); fn(cur); await D.patch('appcfg', 'customer', { 'fees.slotSurcharge': cur }).catch(() => {}); rerender(true) };
const slotsPatch = (flat) => D.patch('slots_cfg', 'default', flat);

document.addEventListener('click', async e => {
  const a = e.target.closest('[data-a]'); if (!a) return; const ds = a.dataset, A = ds.a;
  if (A === 'tab') return setTab(ds.id);
  if (A === 'close') return closeSheet();
  if (A === 'undo') { const f = $('#snack')._undo; $('#snack').classList.remove('on'); f && f(); return }
  if (A === 'kind') { UI.kind = ds.id; saveUI(); return rerender(true) }
  if (A === 'view') { UI.view = ds.id; saveUI(); return rerender(true) }
  if (A === 'ctab') { UI.ctab = ds.id; saveUI(); return rerender(true) }
  if (A === 'offer') { UI.offer = ds.id; saveUI(); return rerender(true) }
  if (A === 'edit') return openCatalog(ds.id);
  if (A === 'new') return openCatalog(null, ds.kind);
  if (A === 'cedit') return openCoupon(ds.id); if (A === 'cnew') return openCoupon();
  if (A === 'pedit') return openPass(ds.id); if (A === 'pnew') return openPass();
  if (A === 'bedit') return openButton(ds.id); if (A === 'bnew') return openButton();
  if (A === 'ledit') return openLegal(ds.id); if (A === 'lnew') return openLegal();
  if (A === 'hedit') return openHelp(ds.id); if (A === 'hnew') return openHelp();
  if (A === 'mv') return move(ds.id, +ds.d);
  if (A === 'import') return importDefaults();
  if (A === 'export') return exportJSON();
  if (A === 'signout') { stopLive(); await window.WDAuth.signOut(); return showGate() }
  if (A === 'tog') { const p = ds.cfg, cur = G(p) !== false && !(ds.def === '0' && !G(p)); const v = ds.def === '0' ? !G(p) : !cur; a.classList.toggle('on', v); a.setAttribute('aria-checked', v); return D.patch('appcfg', 'customer', { [p]: v }).catch(() => rerender(true)) }
  if (A === 'maint') {
    const on = !(G('maintenance') || {}).on;
    if (on && !await confirmDlg({ title: 'Turn maintenance ON?', msg: 'Every customer sees a full-screen notice and cannot use the app until you turn it off.', ok: 'Turn on', danger: true })) return;
    return D.patch('appcfg', 'customer', { 'maintenance.on': on }).then(() => { snack(on ? 'Maintenance is ON' : 'App is open again'); rerender(true) }).catch(() => {});
  }
  if (A === 'sladd') return slPatch(c => { let t = '12:00'; while (c[t] != null) t = String(+t.slice(0, 2) + 1).padStart(2, '0') + ':00'; c[t] = 30 });
  if (A === 'sldel') return slPatch(c => { delete c[ds.t] });
  if (A === 'cadd') { const v = $('#newClosed').value; if (!v) return; const l = [...new Set([...(S.slots_cfg.default?.closedDates || []), v])].sort(); await slotsPatch({ closedDates: l }).catch(() => {}); return rerender(true) }
  if (A === 'cdel') { const l = (S.slots_cfg.default?.closedDates || []).filter(x => x !== ds.d); await slotsPatch({ closedDates: l }).catch(() => {}); return rerender(true) }
  /* editor actions */
  if (!E) return;
  if (A === 'esave') return saveE();
  if (A === 'edelete') return deleteDoc(E.col, E.id, E.d.name || E.d.title || E.d.label || E.id);
  if (A === 'eseg') { setE(ds.p, ds.v); $$('[data-a="eseg"][data-p="' + ds.p + '"]').forEach(b => { b.className = b.dataset.v === ds.v ? 'on ' + ({ live: 'g', paused: 'a', hidden: 'r' }[ds.v] || '') : '' }); if (ds.p === 'status' && E.col === 'catalog') $('#noteBox').style.display = ds.v === 'paused' ? '' : 'none'; return updatePreview() }
  if (A === 'etog') { E.d[ds.p] = !E.d[ds.p]; a.classList.toggle('on', !!E.d[ds.p]); return updatePreview() }
  if (A === 'fit') { E.d.fit = !E.d.fit; a.classList.toggle('on', E.d.fit); return }
  if (A === 'vtog') { const v = ds.v; if (E.d.variants[v] != null) delete E.d.variants[v]; else E.d.variants[v] = { hatch: 1, sedan: 1.2, suv: 1.4 }[v]; a.classList.toggle('on', E.d.variants[v] != null); const inpEl = $(`[data-e="variants.${v}"]`); inpEl.disabled = E.d.variants[v] == null; inpEl.value = E.d.variants[v] ?? ''; return updateVariantHints() }
  if (A === 'emode') { const m = E.d.modes = E.d.modes || [], i = m.indexOf(ds.v); i < 0 ? m.push(ds.v) : m.splice(i, 1); a.classList.toggle('on', i < 0); return updatePreview() }
  if (A === 'eshow') { const m = E.d.showIn = E.d.showIn || [], i = m.indexOf(ds.v); i < 0 ? m.push(ds.v) : m.splice(i, 1); return a.classList.toggle('on', i < 0) }
  if (A === 'ecover') { const m = E.d.covers = E.d.covers || [], i = m.indexOf(ds.v); i < 0 ? m.push(ds.v) : m.splice(i, 1); return a.classList.toggle('on', i < 0) }
  if (A === 'ladd') { const arr = pget(E.d, ds.p) || []; arr.push(ds.two === '1' ? { [PAIR[ds.p][0]]: '', [PAIR[ds.p][1]]: '' } : ''); setE(ds.p, arr); listRefresh(ds.p); const ins = $$('#L-' + ds.p.replace(/\./g, '_') + ' .field'); ins[ins.length - (ds.two === '1' ? 2 : 1)]?.focus(); return }
  if (A === 'lrm') { pget(E.d, ds.p).splice(+ds.i, 1); listRefresh(ds.p); return updatePreview() }
  if (A === 'lmv') { const arr = pget(E.d, ds.p), i = +ds.i, j = i + (+ds.d); if (j >= 0) { [arr[i], arr[j]] = [arr[j], arr[i]]; listRefresh(ds.p) } return }
  if (A === 'artkey') { E.d.art = E.d.art || {}; if (ds.k) E.d.art.key = ds.k; else delete E.d.art.key; $$('#artGrid button').forEach(b => b.classList.toggle('on', b.dataset.k === ds.k)); $('#genBox').style.display = ds.k && E.d.kind !== 'store' ? 'none' : ''; return updatePreview() }
  if (A === 'articon') { E.d.art = E.d.art || {}; E.d.art.icon = ds.n; $$('.icons button').forEach(b => b.classList.toggle('on', b.dataset.n === ds.n)); if (E.d.art.key && E.d.kind !== 'store') delete E.d.art.key; $$('#artGrid button').forEach(b => b.classList.toggle('on', !b.dataset.k)); return updatePreview() }
  if (A === 'eicon') { E.d.icon = ds.n; $$('.icons button').forEach(b => b.classList.toggle('on', b.dataset.n === ds.n)); return updatePreview() }
  if (A === 'accent') { E.d.art = E.d.art || {}; E.d.art.accent = ds.c; $('[data-e="art.accent"]').value = ds.c; $$('#artGrid button').forEach(b => { if (!ART[b.dataset.k]) b.innerHTML = (b.dataset.k ? genericArt({ accent: ds.c, key: b.dataset.k }) : genericArt({ ...E.d.art, key: '' })) + `<em>${b.dataset.k || 'generic'}</em>` }); return updatePreview() }
  if (A === 'mdtab') { $$('.mdtabs button').forEach(b => b.classList.toggle('on', b.dataset.v === ds.v)); $('#mdW').hidden = ds.v === 'p'; $('#mdP').hidden = ds.v === 'w'; return }
  if (A === 'mdins') { const t = $('#mdTa'), s = t.selectionStart, v = ds.v.replace(/\\n/g, '\n'); const at = t.value.lastIndexOf('\n', s - 1) + 1; if (ds.v === '\n\n') t.setRangeText('\n\n', s, t.selectionEnd, 'end'); else t.setRangeText(v, at, at, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); t.focus(); return }
});

function applyE(el) {
  const p = el.dataset.e; let v = el.value;
  if (el.dataset.t === 'num') v = v === '' ? '' : num(v); if (el.dataset.t === 'vnum') v = v === '' ? null : num(v, 1);
  if (p === 'id') { E.d.id = v; return }
  if (p === 'code') v = String(v).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (el.dataset.t === 'kind') { E.d.kind = v; return openCatalogSwitchKind() }
  if (el.dataset.t === 'atype') { E.d.action = { type: v, value: '' }; $('#aval').innerHTML = actionValue(E.d.action); const f = $('#aval [data-e]'); if (f && f.tagName === 'SELECT') { E.d.action.value = f.value } return updatePreview() }
  setE(p, v);
  if (E.md) { $('#mdB').innerHTML = mdHTML(E.d.body); $('#mdT').textContent = E.d.title || '' }
  if (p === 'price' || p === 'variants') updateVariantHints();
  updatePreview();
}
function openCatalogSwitchKind() { const d = E.d, id = E.id, isNew = E.isNew; const keep = d; const k = d.kind; closeSheetNow(); E = null; openCatalogFrom(keep, id, isNew, k) }
function closeSheetNow() { SH = null; $('#sheet').classList.remove('on') }
function openCatalogFrom(d, id, isNew, k) {
  // re-open the same draft under a different type (fields shown depend on type)
  if (k === 'service' && !Object.keys(d.variants || {}).length) d.variants = { hatch: 1, sedan: 1.2, suv: 1.4 }; const store = S.catalog; const tmp = '__draft__'; store[tmp] = d; openCatalog(tmp); E.id = id; E.isNew = isNew; delete store[tmp];
  const foot = $('.sh-f'); if (foot && isNew) { const del = $('[data-a="edelete"]'); del && del.remove() }
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.e && E) return applyE(el);
  if (el.dataset.cfg && !el.dataset.a) { const p = el.dataset.cfg, v = castVal(el, el.value); return deb('cfg:' + p, () => D.patch('appcfg', 'customer', { [p]: v }).catch(() => {})) }
  if (el.dataset.sl) { const k = el.dataset.sl, v = castVal(el, el.value); return deb('sl:' + k, () => slotsPatch({ [k]: v }).catch(() => {})) }
});
document.addEventListener('change', async e => {
  const el = e.target, ch = el.dataset.ch;
  if (el.dataset.e && E && el.tagName === 'SELECT') return applyE(el);
  if (!ch) return;
  const id = el.dataset.id, run = (col, patch) => D.patch(col, id, patch).catch(() => rerender(true));
  if (ch === 'cprice') return run('catalog', { price: num(el.value) });
  if (ch === 'cstatus') return run('catalog', { status: el.value, ...(el.value === 'paused' && !S.catalog[id].pausedNote ? { pausedNote: 'Not available right now' } : {}) });
  if (ch === 'cpstatus') return run('coupons', { status: el.value === 'hidden' ? 'paused' : el.value });
  if (ch === 'pstatus') return run('passes_cfg', { status: el.value });
  if (ch === 'bstatus') return run('ui_buttons', { status: el.value });
  if (ch === 'lstatus') return run('legal', { status: el.value === 'paused' ? 'hidden' : el.value });
  if (ch === 'hstatus') return run('help', { status: el.value === 'paused' ? 'hidden' : el.value });
  if (ch === 'sltime' || ch === 'slval') {
    const row = el.closest('.lrow'), t = $('[data-ch="sltime"]', row).value, v = num($('[data-ch="slval"]', row).value), old = el.dataset.old;
    if (!t) return; return slPatch(c => { delete c[old]; c[t] = v });
  }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#dlg').hidden && $('#dlg').classList.contains('on')) $('#dlg [data-r="0"]')?.click(); else closeSheet() } });
$('#scrim').addEventListener('click', () => { if (!$('#dlg').hidden && $('#dlg').classList.contains('on')) return; closeSheet() });
window.addEventListener('resize', mdLayout);
window.addEventListener('online', () => { online = true; status() }); window.addEventListener('offline', () => { online = false; status() });

/* ---------------- sign in ---------------- */
const nice = p => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d ? '+91 ' + d.slice(0, 5) + ' ' + d.slice(5) : '' };
function showGate(msg) {
  $('#app').hidden = true; $('#gate').hidden = false; stopLive();
  $('#gateBox').innerHTML = `<div class="gate-logo">${ic('drop', 26, 2)}</div><h1>WD Control</h1><p>Owner sign-in. We will text a 6-digit code.</p>
   <div class="ph"><span class="cc">+91</span><input class="field" id="gPh" inputmode="numeric" autocomplete="tel-national" maxlength="11" placeholder="98765 43210" aria-label="Mobile number"></div><div class="err" id="gErr">${esc(msg || '')}</div><button class="btn go wide press" id="gGo">Send code</button>`;
  const ph = $('#gPh'); ph.onkeydown = e => { if (e.key === 'Enter') $('#gGo').click() };
  $('#gGo').onclick = async () => {
    const d = ph.value.replace(/\D/g, '').slice(-10); if (!/^[6-9]\d{9}$/.test(d)) { $('#gErr').textContent = 'Enter a 10-digit mobile number.'; return }
    const b = $('#gGo'); b.disabled = true; b.textContent = 'Sending…';
    try { await WDAuth.send(d); gateCode(d) } catch (e) { console.warn(e); b.disabled = false; b.textContent = 'Send code'; $('#gErr').textContent = (e && e.en) || "Couldn't send the code. Try again." }
  };
}
function gateCode(d) {
  $('#gateBox').innerHTML = `<div class="gate-logo">${ic('lock', 24, 2)}</div><h1>Enter code</h1><p>Sent to ${nice(d)}. <button class="linkbtn" id="gBack">Change</button></p>
   <input class="field" id="gOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" style="text-align:center;letter-spacing:.4em;font-size:20px;font-weight:600" aria-label="6-digit code"><div class="err" id="gErr"></div><button class="btn go wide press" id="gOk">Sign in</button>`;
  const o = $('#gOtp'); o.focus(); o.oninput = () => { o.value = o.value.replace(/\D/g, '').slice(0, 6); if (o.value.length === 6) $('#gOk').click() };
  $('#gBack').onclick = () => showGate();
  $('#gOk').onclick = async () => { const b = $('#gOk'); if (b.disabled) return; b.disabled = true; b.textContent = 'Checking…'; try { await WDAuth.confirm(o.value); signedIn(WDAuth.user()) } catch (e) { b.disabled = false; b.textContent = 'Sign in'; $('#gErr').textContent = (e && e.en) || "That code didn't work."; o.value = ''; o.focus() } };
}
async function signedIn(u) {
  if (!u) return showGate();
  try { await startLive() } catch (e) { console.warn(e); stopLive(); try { WDAuth.signOut() } catch (x) {} return showGate(e && e.message === 'nodb' ? "Couldn't connect. Check the internet." : (e && (e.code === 'invalid_argument' || /permission/i.test(e.code || e.message)) ? `${nice(u.phoneNumber)} is not an owner number.` : "Couldn't load. Check the internet and sign in again.")) }
  $('#who').textContent = nice(u.phoneNumber); $('#gate').hidden = true; $('#app').hidden = false; status(); rerender(true);
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s) }) }

/* ---------------- boot ---------------- */
async function boot() {
  buildBar();
  if (DEMO) { startDemo(); $('#demoBar').hidden = false; $('#app').hidden = false; status(); rerender(true); return }
  try { await loadScript('../wd-sync.js') } catch (e) { return showGate("Couldn't load. Check the internet.") }
  $('#app').hidden = true; $('#main').innerHTML = skeleton();
  WDAuth.ready().then(signedIn);
}
window.WDCTL = { S, G, tileHTML, openCatalog, openCoupon, openPass, openButton, openLegal, openHelp, setTab, UI, rerender };
boot();
})();
