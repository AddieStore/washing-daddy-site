// Workflow 13 — Pronto money: bookings, coupons, WD Money (wallet), gift cards, WD Pass.
// One file of plain functions. build.mjs embeds it in every Code node of 13-pronto.json, and test.mjs runs
// the same functions against fake Firestore, Google and Cashfree servers. Contract:
// pronto-video-2026-11-15/BACKEND.md (endpoints) and dashboard-2026-11-16/CONFIG-CONTRACT.md (prices).
//
// The money rule: the phone only asks. Every amount is priced here from Firestore (catalog/{id},
// appcfg/customer fees, coupons/{CODE}, passes_cfg/{id}); the phone's shownTotal is only used to refuse when
// we would charge MORE than the app showed. The caller is the phone number inside a verified Firebase ID token,
// never a number from the body.
//
// ctx = { env, http, sd, crypto, now }   (built by the Code node, or by test.mjs)
//   http(o) -> { statusCode, body, headers }   o = { method, url, headers, body, form }
//   sd = workflow static data (rate limits, caches);  now = ms since epoch

/* ======================= small helpers ======================= */
const r2 = n => Math.round(Number(n) * 100) / 100;
const r9 = n => Math.max(9, Math.round(n / 10) * 10 - 1);       // same as the app: 149 * 1.2 = 178.8 -> 179
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
const IST_MS = 5.5 * 3600e3;
const istISO = ms => new Date(ms + IST_MS).toISOString();
const todayIST = ms => istISO(ms).slice(0, 10);
const nowIST = ms => istISO(ms).replace(/\.\d+Z$/, '+05:30');            // same text the app writes
const istMin = ms => { const d = new Date(ms + IST_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const t2m = t => { const m = /^(\d{2}):(\d{2})$/.exec(String(t)); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
const addDaysISO = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const fmtR = n => '₹' + (Number.isInteger(r2(n)) ? String(r2(n)) : r2(n).toFixed(2));
const NOTHING = ' Nothing was charged.';
const reply = (status, body, extra) => Object.assign({ status, body }, extra || {});
const fail = (status, message, extra) => reply(status, { ok: false, message }, extra);
// Never 404: the app reads a 404 as "this webhook is not live yet" and falls back.
const sha = (ctx, s) => ctx.crypto.createHash('sha256').update(String(s)).digest('hex');
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function b62(hex, n) { let x = BigInt('0x' + hex), s = ''; while (s.length < n) { s += B62[Number(x % 62n)]; x /= 62n; } return s; }
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (isObj(v)) return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

/* ======================= Firebase ID token ======================= */
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const b64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
// -> { ok: true, phone: '+91XXXXXXXXXX' } | { ok: false, why }
async function verifyIdToken(ctx, authz) {
  const PROJECT = String(ctx.env.FIREBASE_PROJECT_ID || '').trim();
  if (!PROJECT) return { ok: false, why: 'FIREBASE_PROJECT_ID not set', setup: true };
  const m = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(String(authz || '').trim());
  if (!m || m[1].length > 6000) return { ok: false, why: 'no bearer token' };
  const [h64, p64, s64] = m[1].split('.');
  let header, claims;
  try { header = JSON.parse(b64u(h64).toString('utf8')); claims = JSON.parse(b64u(p64).toString('utf8')); } catch (e) { return { ok: false, why: 'unreadable token' }; }
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false, why: 'bad header' };
  const sd = ctx.sd, nowMs = ctx.now;
  const fetchCerts = async () => {
    const r = await ctx.http({ method: 'GET', url: CERT_URL });
    if (r.statusCode !== 200 || !isObj(r.body) || !Object.keys(r.body).length) throw new Error('no certs');
    const mm = /max-age=(\d+)/.exec(String((r.headers || {})['cache-control'] || ''));
    const ttl = Math.min(Math.max(Number(mm && mm[1]) || 3600, 300), 86400) * 1000;
    sd.fbCerts = { certs: r.body, fetchedAt: nowMs, expiresAt: nowMs + ttl };
  };
  try {
    if (!(sd.fbCerts && sd.fbCerts.certs && sd.fbCerts.expiresAt > nowMs)) await fetchCerts();
    else if (!sd.fbCerts.certs[header.kid] && nowMs - sd.fbCerts.fetchedAt > 300000) await fetchCerts();
  } catch (e) { if (!(sd.fbCerts && sd.fbCerts.certs)) return { ok: false, why: 'certs unavailable' }; }
  const pem = sd.fbCerts && sd.fbCerts.certs && sd.fbCerts.certs[header.kid];
  if (!pem) return { ok: false, why: 'unknown kid' };
  let sigOk = false;
  try { sigOk = ctx.crypto.createVerify('RSA-SHA256').update(h64 + '.' + p64).verify(pem, b64u(s64)); } catch (e) { sigOk = false; }
  if (!sigOk) return { ok: false, why: 'bad signature' };
  const nowS = Math.floor(nowMs / 1000), SKEW = 300;
  if (claims.aud !== PROJECT) return { ok: false, why: 'wrong aud' };
  if (claims.iss !== 'https://securetoken.google.com/' + PROJECT) return { ok: false, why: 'wrong iss' };
  if (typeof claims.exp !== 'number' || claims.exp <= nowS) return { ok: false, why: 'expired' };
  if (typeof claims.iat !== 'number' || claims.iat > nowS + SKEW) return { ok: false, why: 'iat in future' };
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) return { ok: false, why: 'bad sub' };
  if (!/^\+91[6-9]\d{9}$/.test(String(claims.phone_number || ''))) return { ok: false, why: 'no Indian phone number in token' };
  return { ok: true, phone: claims.phone_number };
}

/* ======================= Google access token (service account) ======================= */
function saCreds(env) {
  if (env.FIREBASE_SA_KEY_B64) {
    try { const j = JSON.parse(Buffer.from(String(env.FIREBASE_SA_KEY_B64).trim(), 'base64').toString('utf8')); return { email: j.client_email, key: j.private_key }; }
    catch (e) { return null; }
  }
  if (env.FIREBASE_SA_EMAIL && env.FIREBASE_SA_KEY) return { email: String(env.FIREBASE_SA_EMAIL).trim(), key: String(env.FIREBASE_SA_KEY).replace(/\\n/g, '\n') };
  return null;
}
async function gToken(ctx) {
  const c = ctx.sd.gtok;
  if (c && c.token && c.exp > ctx.now + 60000) return c.token;
  const sa = saCreds(ctx.env);
  if (!sa || !sa.email || !sa.key) throw Object.assign(new Error('service account env not set'), { setup: true });
  const iat = Math.floor(ctx.now / 1000);
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: sa.email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 });
  const sig = ctx.crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.key).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await ctx.http({ method: 'POST', url: 'https://oauth2.googleapis.com/token', form: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig } });
  if (r.statusCode !== 200 || !r.body || !r.body.access_token) throw new Error('google token ' + r.statusCode);
  ctx.sd.gtok = { token: r.body.access_token, exp: ctx.now + (num(r.body.expires_in, 3600) * 1000) };
  return r.body.access_token;
}

/* ======================= Firestore REST ======================= */
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (isObj(v)) return { mapValue: { fields: encFields(v) } };
  return { stringValue: String(v) };
}
function encFields(o) { const f = {}; for (const k of Object.keys(o)) if (o[k] !== undefined) f[k] = enc(o[k]); return f; }
function dec(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return String(v.stringValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue === true;
  if ('timestampValue' in v) return String(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return decFields((v.mapValue || {}).fields);
  if ('arrayValue' in v) return ((v.arrayValue || {}).values || []).map(dec);
  return undefined;
}
function decFields(f) { const o = {}; for (const k of Object.keys(f || {})) o[k] = dec(f[k]); return o; }
const docOf = raw => (raw && raw.name ? { id: raw.name.split('/').pop(), data: decFields(raw.fields), updateTime: raw.updateTime } : null);
const fsRoot = ctx => `projects/${String(ctx.env.FIREBASE_PROJECT_ID).trim()}/databases/(default)/documents`;
const fsUrl = (ctx, rest) => 'https://firestore.googleapis.com/v1/' + fsRoot(ctx) + rest;
async function fsCall(ctx, method, rest, body) {
  const tok = await gToken(ctx);
  const r = await ctx.http({ method, url: fsUrl(ctx, rest), headers: { Authorization: 'Bearer ' + tok }, body });
  return r;
}
const okId = id => /^[A-Za-z0-9_+.-]{1,120}$/.test(String(id || ''));
async function fsGet(ctx, coll, id) {
  if (!okId(id)) return null;
  const r = await fsCall(ctx, 'GET', '/' + coll + '/' + encodeURIComponent(id));
  if (r.statusCode === 404) return null;
  if (r.statusCode !== 200) throw new Error('firestore get ' + coll + ' ' + r.statusCode);
  return docOf(r.body);
}
async function fsList(ctx, coll) {
  const out = []; let tok = '';
  for (let i = 0; i < 5; i++) {
    const r = await fsCall(ctx, 'GET', '/' + coll + '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''));
    if (r.statusCode !== 200) throw new Error('firestore list ' + coll + ' ' + r.statusCode);
    (r.body.documents || []).forEach(d => out.push(docOf(d)));
    tok = r.body.nextPageToken; if (!tok) break;
  }
  return out;
}
async function fsWhere(ctx, coll, field, value, limit) {
  const r = await fsCall(ctx, 'POST', ':runQuery', { structuredQuery: { from: [{ collectionId: coll }],
    where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: enc(value) } }, limit: limit || 100 } });
  if (r.statusCode !== 200) throw new Error('firestore query ' + coll + ' ' + r.statusCode);
  return (Array.isArray(r.body) ? r.body : []).filter(x => x && x.document).map(x => docOf(x.document));
}
// One atomic commit. Every write carries a precondition, so a write based on a stale read fails as a whole.
const pre = doc => (doc ? { updateTime: doc.updateTime } : { exists: false });
const wSet = (ctx, coll, id, data, cur) => ({ update: { name: fsRoot(ctx) + '/' + coll + '/' + id, fields: encFields(data) }, currentDocument: cur });
const wPatch = (ctx, coll, id, data, cur) => ({ update: { name: fsRoot(ctx) + '/' + coll + '/' + id, fields: encFields(data) }, updateMask: { fieldPaths: Object.keys(data) }, currentDocument: cur });
async function fsCommit(ctx, writes) {
  const r = await fsCall(ctx, 'POST', ':commit', { writes });
  if (r.statusCode === 200) return { ok: true };
  const st = String((r.body && r.body.error && r.body.error.status) || '');
  if (r.statusCode === 409 || st === 'FAILED_PRECONDITION' || st === 'ABORTED' || st === 'ALREADY_EXISTS' || st === 'NOT_FOUND') return { ok: false, conflict: true };
  throw new Error('firestore commit ' + r.statusCode + ' ' + st);
}
// read-decide-commit, retried when someone else wrote in between
async function txn(ctx, fn, tries) {
  for (let i = 0; i < (tries || 4); i++) {
    const plan = await fn();
    if (!plan.writes || !plan.writes.length) return plan.result;
    const c = await fsCommit(ctx, plan.writes);
    if (c.ok) return plan.result;
  }
  throw new Error('busy: too many conflicting writes');
}

/* ======================= Cashfree ======================= */
const cfBase = env => (String(env.WD_CF_SANDBOX || '') === '1' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com');
async function cfCall(ctx, method, path, body) {
  const id = String(ctx.env.CASHFREE_APP_ID || '').trim(), sec = String(ctx.env.CASHFREE_SECRET || '').trim();
  if (!id || !sec) throw Object.assign(new Error('Cashfree env not set'), { setup: true });
  return ctx.http({ method, url: cfBase(ctx.env) + path, body,
    headers: { 'x-client-id': id, 'x-client-secret': sec, 'x-api-version': '2023-08-01', 'Content-Type': 'application/json' } });
}
// Creates (or, for a retry with the same order id, finds) the Cashfree order. -> { ok, sessionId } | { ok:false }
async function cfOrder(ctx, orderId, amount, phone, name, note, tags) {
  const p10 = phone.slice(-10);
  const body = { order_id: orderId, order_amount: r2(amount), order_currency: 'INR',
    customer_details: { customer_id: 'wd_' + p10, customer_phone: p10, customer_name: clean(name, 60) || 'Washing Daddy customer' },
    order_meta: { return_url: 'https://washingdaddy.com/pay/?order_id={order_id}' },
    order_expiry_time: istISO(ctx.now + 30 * 60e3).replace(/\.\d+Z$/, '+05:30'),
    order_note: clean(note, 200), order_tags: Object.assign({ expectedAmount: String(r2(amount)) }, tags) };
  let r = await cfCall(ctx, 'POST', '/pg/orders', body);
  if (r.statusCode === 409 || (r.statusCode === 400 && /already exists/i.test(JSON.stringify(r.body || '')))) r = await cfCall(ctx, 'GET', '/pg/orders/' + orderId);
  const b = r.body || {};
  if (r.statusCode >= 200 && r.statusCode < 300 && b.payment_session_id && r2(b.order_amount) === r2(amount)) return { ok: true, sessionId: b.payment_session_id };
  return { ok: false, why: 'cashfree ' + r.statusCode + ' ' + clean(b.message || b.code || '', 120) };
}
// Cashfree signs (timestamp + raw body) with the secret key: base64 HMAC-SHA256. Same check as workflow 8.
function verifyCfWebhook(ctx, raw, ts, sig) {
  const secret = String(ctx.env.CASHFREE_SECRET || '').trim();
  if (!secret) return { ok: false, why: 'CASHFREE_SECRET not set' };
  if (!raw || !ts || !sig) return { ok: false, why: 'missing signature' };
  const want = ctx.crypto.createHmac('sha256', secret).update(String(ts) + raw).digest('base64');
  const a = Buffer.from(want), b = Buffer.from(String(sig));
  if (a.length !== b.length || !ctx.crypto.timingSafeEqual(a, b)) return { ok: false, why: 'bad signature' };
  const tsMs = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(ctx.now - tsMs) > 300000) return { ok: false, why: 'too old' };
  return { ok: true };
}

/* ======================= Razorpay (first choice; Cashfree is the backup) ======================= */
// Keys are the env vars workflow 11 already uses: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test or live).
// RAZORPAY_WEBHOOK_SECRET is optional: with it, wd-rzp-hook fulfils orders whose app never came back.
const rzpKeys = env => { const id = String(env.RAZORPAY_KEY_ID || '').trim(), sec = String(env.RAZORPAY_KEY_SECRET || '').trim(); return id && sec ? { id, sec } : null; };
async function rzpCall(ctx, method, path, body) {
  const k = rzpKeys(ctx.env); if (!k) throw Object.assign(new Error('Razorpay env not set'), { setup: true });
  return ctx.http({ method, url: 'https://api.razorpay.com/v1' + path, body,
    headers: { Authorization: 'Basic ' + Buffer.from(k.id + ':' + k.sec).toString('base64'), 'Content-Type': 'application/json' } });
}
// -> { ok, rzpOrderId } | { ok:false, why }. receipt = our order id, so the dashboard and the webhook find it.
async function rzpOrder(ctx, orderId, amount, phone, note, tags) {
  const paise = Math.round(r2(amount) * 100);
  if (!(paise >= 100)) return { ok: false, why: 'under Rs 1' };
  const notes = Object.assign({ wd_order: orderId, note: clean(note, 200) }, tags);
  const r = await rzpCall(ctx, 'POST', '/orders', { amount: paise, currency: 'INR', receipt: orderId.slice(0, 40), notes, payment_capture: 1 });
  const b = r.body || {};
  if (r.statusCode >= 200 && r.statusCode < 300 && b.id && Number(b.amount) === paise && b.currency === 'INR') return { ok: true, rzpOrderId: b.id };
  return { ok: false, why: 'razorpay ' + r.statusCode + ' ' + clean((b.error && (b.error.description || b.error.code)) || '', 120) };
}
const hmacHex = (ctx, secret, msg) => ctx.crypto.createHmac('sha256', secret).update(String(msg)).digest('hex');
function sameHex(ctx, a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && ctx.crypto.timingSafeEqual(x, y); }
// What the app needs to open Razorpay Checkout for one of our orders.
const rzpOpen = (ctx, d, orderId) => ({ gateway: 'razorpay', razorpay: { keyId: rzpKeys(ctx.env).id, orderId: d.rzp_order_id, amount: Math.round(r2(d.amount) * 100), currency: 'INR',
  name: 'Washing Daddy', description: clean(d.note || '', 120), prefill: { contact: String(d.phone || '').slice(-10), name: clean(d.name || '', 60) } }, orderId });

/* ======================= live config (admin dashboard) ======================= */
const DEF_FEES = { convenience: 19, convenienceBelow: 299, gstPct: 5, visit: 0,
  slotSurcharge: { '08:00': 30, '08:30': 30, '09:00': 30, '09:30': 30, '13:00': 50, '13:30': 50, '17:30': 30, '18:00': 30, '18:30': 30 },
  surcharge: { morning: 0, afternoon: 0, evening: 0 } };
const DEF_WALLET = { min: 100, max: 10000, cap: 10000, cashbackPct: 5, cashDays: 365, promoDays: 15 };
const DEF_VARIANTS = { hatch: 1, sedan: 1.2, suv: 1.4 };
const DEF_PARTS = { morning: ['07:00', '11:30'], afternoon: ['12:00', '16:30'], evening: ['17:00', '20:00'] };
const DEF_RECUR = { weekly: 10, twice: 15, alt: 20 };
function cfgOf(appcfg, slotsCfg) {
  const a = appcfg || {}, f = isObj(a.fees) ? a.fees : {}, s = slotsCfg || {}, w = isObj(a.wallet) ? a.wallet : {};
  const parts = {};
  for (const k of Object.keys(DEF_PARTS)) {
    const v = isObj(s.parts) ? s.parts[k] : null;   // CORE: { from, till }; older drafts: [from, till]
    parts[k] = Array.isArray(v) && v.length === 2 ? [String(v[0]), String(v[1])] : isObj(v) && v.from && v.till ? [String(v.from), String(v.till)] : DEF_PARTS[k];
  }
  const feat = k => !(isObj(a.features) && a.features[k] === false);
  const inst = isObj(a.instant) ? a.instant : {};
  return {
    maintenance: !!(isObj(a.maintenance) && a.maintenance.on),
    feat,
    fees: { convenience: num(f.convenience, DEF_FEES.convenience), convenienceBelow: num(f.convenienceBelow, DEF_FEES.convenienceBelow),
      gstPct: num(f.gstPct, DEF_FEES.gstPct), visit: num(f.visit, DEF_FEES.visit),
      slotSurcharge: isObj(f.slotSurcharge) ? f.slotSurcharge : DEF_FEES.slotSurcharge,
      surcharge: Object.assign({}, DEF_FEES.surcharge, isObj(f.surcharge) ? f.surcharge : {}) },
    instant: { on: inst.on !== false && feat('instant'), busy: inst.busy === true, from: String(inst.openFrom || '06:00'), till: String(inst.openTill || '20:00'),
      busyMessage: clean(inst.busyMessage, 120) || 'All our washers are busy right now. Schedule it for later.' },
    wallet: { min: num(w.min, DEF_WALLET.min), max: num(w.max, DEF_WALLET.max), cap: num(w.cap, DEF_WALLET.cap), cashbackPct: num(w.cashbackPct, DEF_WALLET.cashbackPct),
      cashDays: num(w.cashDays, DEF_WALLET.cashDays), promoDays: num(w.promoDays, DEF_WALLET.promoDays) },
    slots: { days: num(s.days, 7), grid: num(s.grid, 30), parts, closed: Array.isArray(s.closedDates) ? s.closedDates.map(String) : [],
      cutoff: num(s.cutoffMins, 90), capacity: num(s.capacityPerSlot, 2) },
  };
}
const partOf = (cfg, slot) => { const m = t2m(slot); for (const k of Object.keys(cfg.slots.parts)) { const [a, b] = cfg.slots.parts[k]; if (m >= t2m(a) && m <= t2m(b)) return k; } return null; };
// -> '' when the slot can be booked, else the reason
function slotProblem(cfg, slotDoc, date, slot, nowMs) {
  const today = todayIST(nowMs);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(slot))) return 'Pick a time slot.';
  if (date < today || date > addDaysISO(today, cfg.slots.days - 1)) return 'Pick a day in the next ' + cfg.slots.days + ' days.';
  const part = partOf(cfg, slot);
  if (!part || (t2m(slot) - t2m(cfg.slots.parts[part][0])) % cfg.slots.grid !== 0) return 'Pick a time slot.';
  if (date === today && t2m(slot) < istMin(nowMs) + cfg.slots.cutoff) return 'That slot has passed. Pick another.';
  const s = slotDoc || {};
  if (cfg.slots.closed.includes(date) || s.closed === true) return 'We are closed that day. Pick another.';
  const booked = num(isObj(s.booked) ? s.booked[slot] : 0, 0);
  if ((Array.isArray(s.sold) && s.sold.includes(slot)) || booked >= cfg.slots.capacity) return 'That slot is fully booked. Pick another.';
  return '';
}
function surchargeFor(cfg, slotDoc, slot) {
  const live = slotDoc && isObj(slotDoc.surcharge) && slotDoc.surcharge[slot] != null ? num(slotDoc.surcharge[slot], 0) : num(cfg.fees.slotSurcharge[slot], 0);
  const part = partOf(cfg, slot);
  return live + (part ? num(cfg.fees.surcharge[part], 0) : 0);
}
function instantProblem(cfg, nowMs) {
  if (!cfg.instant.on) return 'Instant booking is off right now. Schedule it for later.';
  if (cfg.instant.busy) return cfg.instant.busyMessage;
  const m = istMin(nowMs);
  if (m < t2m(cfg.instant.from) || m >= t2m(cfg.instant.till)) return 'Instant booking opens at ' + cfg.instant.from + '. Schedule it for later.';
  return '';
}

/* ======================= pricing (pure) ======================= */
// catalog: { id: doc data }. lines from the phone: [{ id, variant, q }]. -> { ok, lines, sub, mrp } | { ok:false, message }
function priceLines(catalog, raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 20) return { ok: false, message: 'Add a service first.' };
  const lines = []; let sub = 0, mrp = 0;
  for (const l of raw) {
    const id = String(l && l.id || ''), q = l && typeof l.q === 'number' ? l.q : NaN;
    const c = own(catalog, id) ? catalog[id] : null;
    if (!c || (c.kind !== 'service' && c.kind !== 'pack') || (c.status && c.status !== 'live')) return { ok: false, message: (c && c.name ? c.name : 'A service in your cart') + ' is not available right now. Remove it and try again.' };
    if (!Number.isInteger(q) || q < 1 || q > 10) return { ok: false, message: 'Check the quantities in your cart.' };
    const base = num(c.price, NaN), bmrp = num(c.mrp, base), mins = num(c.mins, 30);
    if (!(base > 0)) return { ok: false, message: c.name + ' has no price yet. Remove it and try again.' };
    let price = base, m = bmrp, mn = mins, variant = null;
    if (c.kind === 'service') {
      const vars = isObj(c.variants) && Object.keys(c.variants).length ? c.variants : DEF_VARIANTS;
      variant = String(l.variant || 'hatch');
      if (!own(vars, variant) || !(num(vars[variant], 0) > 0)) return { ok: false, message: 'Pick your car size for ' + c.name + '.' };
      const mul = num(vars[variant], 1);
      if (mul !== 1) { price = r9(base * mul); m = r9(bmrp * mul); mn = Math.round(mins * mul / 5) * 5; }
    }
    lines.push({ id, variant, q, price, mrp: m, mins: mn, name: clean(c.name || id, 60), kind: c.kind });
    sub += price * q; mrp += m * q;
  }
  return { ok: true, lines, sub: r2(sub), mrp: r2(mrp) };
}
// coupon doc (contract fields; the app's older names are accepted too)
function couponOff(c, code, base, mode, today, used, priorOrder) {
  if (!c) return { ok: false, why: "That code isn't valid." };
  const type = c.type || c.kind, value = num(c.value != null ? c.value : c.v, 0), maxOff = num(c.maxOff != null ? c.maxOff : c.max, Infinity);
  const till = String(c.validTill || c.till || ''), from = String(c.validFrom || '');
  if ((c.status || 'live') !== 'live') return { ok: false, why: "That code isn't valid." };
  if (from && today < from) return { ok: false, why: 'This coupon is not active yet.' };
  if (till && today > till) return { ok: false, why: 'This coupon has expired.' };
  if (Array.isArray(c.modes) && c.modes.length && !c.modes.includes(mode)) return { ok: false, why: 'Only for ' + c.modes.join(' or ') + ' bookings.' };
  const minOrder = num(c.minOrder, 0);
  if (base < minOrder) return { ok: false, why: 'Add ' + fmtR(minOrder - base) + ' more to use this coupon.' };
  if (used >= Math.max(1, num(c.perUser, 1))) return { ok: false, why: "You've already used this coupon." };
  if ((c.firstOrderOnly || c.firstOrder) && priorOrder) return { ok: false, why: 'Only for your first booking.' };
  if (!(value > 0) || (type !== 'flat' && type !== 'pct')) return { ok: false, why: "That code isn't valid." };
  const off = type === 'flat' ? Math.min(value, base) : Math.min(r2(base * value / 100), maxOff);
  return { ok: true, code, off: r2(Math.max(0, off)) };
}
// pass: { id, visits_left, ... } with cfg: passes_cfg doc. -> rupees one visit covers (one unit of the dearest covered line)
function passCover(lines, passCfg) {
  if (!passCfg) return 0;
  const covers = Array.isArray(passCfg.covers) ? passCfg.covers : [], maxMins = num(passCfg.maxMins, 999);
  const ok = lines.filter(l => covers.includes(l.id) && l.mins <= maxMins).sort((a, b) => b.price - a.price)[0];
  return ok ? ok.price : 0;
}
// The bill, the same way the app's bill() shows it. in = { mode, priced, recurOffPct, passCoverAmt, coupon (result), surcharge, fees, walletBal, useWallet }
function billOf(x) {
  const sub = x.priced.sub, recurOff = x.recurOffPct ? Math.round(sub * x.recurOffPct / 100) : 0;
  const pass = Math.min(x.passCoverAmt || 0, sub - recurOff), base = Math.max(0, sub - recurOff - pass);
  const couponAmt = x.coupon && x.coupon.ok ? Math.min(x.coupon.off, base) : 0;
  const after = Math.max(0, base - couponAmt);
  const convenience = sub < x.fees.convenienceBelow && !(pass && after === 0) ? x.fees.convenience : 0;
  const taxable = r2(after + (x.surcharge || 0) + convenience + (x.fees.visit || 0)), gst = r2(taxable * x.fees.gstPct / 100), total = r2(taxable + gst);
  let walletUse = x.useWallet ? r2(Math.min(Math.max(0, x.walletBal || 0), total)) : 0, toPay = r2(total - walletUse);
  // Cashfree cannot take under ₹1: take the paise from the wallet if it can, else charge ₹1
  if (toPay > 0 && toPay < 1) { if (x.useWallet && (x.walletBal || 0) - walletUse >= toPay) { walletUse = r2(walletUse + toPay); toPay = 0; } else toPay = 1; }
  const saved = r2(Math.max(0, x.priced.mrp - sub) + recurOff + pass + couponAmt);
  return { sub, recurOff, passCover: pass, base, couponOff: couponAmt, surcharge: x.surcharge || 0, convenience, visit: x.fees.visit || 0, taxable, gst, total, walletUse, toPay, saved };
}
// promo first (it expires sooner), then cash
function splitDebit(w, amt) { const promo = r2(Math.min(Math.max(0, num(w.promo, 0)), amt)), cash = r2(Math.min(Math.max(0, num(w.cash, 0)), amt - promo)); return { promo, cash, short: r2(amt - promo - cash) }; }
const balOf = w => r2(num(w && w.cash, 0) + num(w && w.promo, 0));

/* ======================= request plumbing ======================= */
function rateLimit(ctx, key, max, windowMs) {
  const sd = ctx.sd; sd.rl = sd.rl || {};
  const now = ctx.now, list = (sd.rl[key] || []).filter(t => now - t < windowMs);
  if (Object.keys(sd.rl).length > 2000) sd.rl = {};
  if (list.length >= max) { sd.rl[key] = list; return false; }
  list.push(now); sd.rl[key] = list; return true;
}
// Phone -> caller, config, feature flags. -> { ok, phone, cfg } | { ok:false, res }
async function gate(ctx, req, feature) {
  const h = (req && req.headers) || {};
  const t = await verifyIdToken(ctx, h.authorization || h.Authorization);
  if (!t.ok) return { ok: false, res: t.setup ? fail(503, 'Payments are being set up. Try again later.' + NOTHING, { alert: 'Workflow 13: ' + t.why }) : fail(401, 'Sign in again to continue.' + NOTHING) };
  if (!rateLimit(ctx, t.phone, 20, 60000)) return { ok: false, res: fail(429, 'Too many tries. Wait a minute and try again.' + NOTHING) };
  const [appcfg, slotsCfg] = await Promise.all([fsGet(ctx, 'appcfg', 'customer'), fsGet(ctx, 'slots_cfg', 'default')]);
  const cfg = cfgOf(appcfg && appcfg.data, slotsCfg && slotsCfg.data);
  if (cfg.maintenance) return { ok: false, res: fail(503, 'We are doing some maintenance. Try again in a little while.' + NOTHING) };
  for (const f of [].concat(feature || [])) if (!cfg.feat(f)) return { ok: false, res: fail(403, 'This is switched off right now.' + NOTHING) };
  return { ok: true, phone: t.phone, cfg };
}
// Same request from the same phone within 2 minutes -> same order id (a retry never makes a second order)
// rzp / gateway only pick how to pay, so leave them out: switching to the Cashfree backup keeps the same order.
const orderIdFor = (ctx, prefix, phone, body) => { const b = Object.assign({}, isObj(body) ? body : {}); delete b.rzp; delete b.gateway;
  return prefix + b62(sha(ctx, phone + '|' + prefix + '|' + stable(b) + '|' + Math.floor(ctx.now / 120000)), 20); };
const bookingIdFor = (ctx, orderId) => b62(sha(ctx, 'booking|' + orderId), 20);   // 20 chars: workflow 10 expects a Firestore-style id
async function activePassOf(ctx, phone) {
  const today = todayIST(ctx.now);
  const ps = await fsWhere(ctx, 'passes', 'phone', phone, 50);
  return ps.find(p => p.data.status === 'active' && num(p.data.visits_left, 0) > 0 && String(p.data.valid_till || '') >= today) || null;
}
async function priorOrderOf(ctx, phone) {
  const js = await fsWhere(ctx, 'ondemand', 'customer_id', phone, 50);
  return js.some(j => j.data.status !== 'cancelled');
}
async function couponFor(ctx, phone, code, base, mode) {
  const c = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(c)) return { ok: false, why: "That code isn't valid." };
  const [doc, red, prior] = await Promise.all([fsGet(ctx, 'coupons', c), fsGet(ctx, 'couponredemptions', c + '_' + phone), priorOrderOf(ctx, phone)]);
  return couponOff(doc && doc.data, c, base, mode, todayIST(ctx.now), num(red && red.data.count, 0), prior);
}
async function catalogMap(ctx) { const m = {}; (await fsList(ctx, 'catalog')).forEach(d => { m[d.id] = d.data; }); return m; }

/* ======================= endpoints ======================= */
// Shared pricing for wd-booking-create and wd-coupon-validate.
async function quote(ctx, phone, cfg, b, withExtras) {
  const mode = String(b.mode || '');
  if (!['instant', 'scheduled', 'recurring'].includes(mode)) return { ok: false, res: fail(400, 'Pick instant or scheduled.' + NOTHING) };
  if (mode === 'recurring') return { ok: false, res: fail(400, 'Recurring bookings are coming soon. Book a scheduled wash for now.' + NOTHING) };
  const priced = priceLines(await catalogMap(ctx), b.lines);
  if (!priced.ok) return { ok: false, res: fail(400, priced.message + NOTHING) };
  let slotDoc = null, date = todayIST(ctx.now), slot = '', surcharge = 0;
  if (withExtras) {
    if (mode === 'instant') {
      const p = instantProblem(cfg, ctx.now); if (p) return { ok: false, res: fail(409, p + NOTHING) };
    } else {
      if (!cfg.feat('scheduled')) return { ok: false, res: fail(403, 'Scheduled booking is off right now.' + NOTHING) };
      const w = isObj(b.when) ? b.when : {}; date = String(w.date || ''); slot = String(w.slot || '');
      slotDoc = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await fsGet(ctx, 'slots', date) : null;
      const p = slotProblem(cfg, slotDoc && slotDoc.data, date, slot, ctx.now); if (p) return { ok: false, res: fail(409, p + NOTHING) };
      surcharge = surchargeFor(cfg, slotDoc && slotDoc.data, slot);
    }
  }
  let pass = null, passCfg = null;
  if (withExtras && b.usePass === true) {
    if (!cfg.feat('pass')) return { ok: false, res: fail(403, 'WD Pass is off right now.' + NOTHING) };
    pass = await activePassOf(ctx, phone);
    if (!pass) return { ok: false, res: fail(409, "You don't have an active WD Pass." + NOTHING) };
    const pc = await fsGet(ctx, 'passes_cfg', String(pass.data.plan || '')); passCfg = pc && pc.data;
  }
  const pcov = passCover(priced.lines, passCfg);
  if (pass && !pcov) return { ok: false, res: fail(409, 'Your WD Pass does not cover these services. Turn off the pass and try again.' + NOTHING) };
  const recurOffPct = 0;
  const base = Math.max(0, priced.sub - Math.min(pcov, priced.sub));
  let coupon = null;
  if (b.coupon) {
    if (!cfg.feat('coupons')) return { ok: false, res: fail(403, 'Coupons are off right now.' + NOTHING) };
    coupon = await couponFor(ctx, phone, b.coupon, base, mode);
    if (!coupon.ok) return { ok: false, res: fail(409, coupon.why + NOTHING), coupon };
  }
  let wallet = null;
  if (withExtras && b.useWallet === true) {
    if (!cfg.feat('wallet')) return { ok: false, res: fail(403, 'WD Money is off right now.' + NOTHING) };
    wallet = await fsGet(ctx, 'wallets', phone);
  }
  const bill = billOf({ mode, priced, recurOffPct, passCoverAmt: pcov, coupon, surcharge, fees: cfg.fees, walletBal: balOf(wallet && wallet.data), useWallet: b.useWallet === true });
  return { ok: true, mode, priced, bill, coupon, pass, date, slot };
}

async function couponValidate(ctx, req) {
  const g = await gate(ctx, req, 'coupons'); if (!g.ok) return g.res;
  const b = isObj(req.body) ? req.body : {};
  if (!rateLimit(ctx, 'coupon:' + g.phone, 10, 600000)) return fail(429, 'Too many tries. Wait a few minutes.');
  const q = await quote(ctx, g.phone, g.cfg, Object.assign({}, b, { coupon: b.code, mode: b.mode === 'recurring' ? 'scheduled' : b.mode }), false);
  if (!q.ok) return q.coupon ? reply(200, { ok: true, valid: false, off: 0, message: q.coupon.why }) : q.res;
  if (!q.coupon) return reply(200, { ok: true, valid: false, off: 0, message: 'Enter a coupon code.' });
  return reply(200, { ok: true, valid: true, off: q.coupon.off });
}

async function bookingCreate(ctx, req) {
  const g = await gate(ctx, req); if (!g.ok) return g.res;
  const phone = g.phone, b = isObj(req.body) ? req.body : {};
  const orderId = orderIdFor(ctx, 'WDB', phone, b), bookingId = bookingIdFor(ctx, orderId);
  const existing = await fsGet(ctx, 'payorders', orderId);
  if (existing) return resumeOrder(ctx, existing, phone);
  const addr = await fsGet(ctx, 'addresses', String(b.addressId || ''));
  if (!addr || addr.data.phone !== phone) return fail(400, 'Add the address where your car is parked.' + NOTHING);
  const q = await quote(ctx, phone, g.cfg, b, true); if (!q.ok) return q.res;
  const shown = num(b.shownTotal, NaN);
  if (Number.isFinite(shown) && q.bill.total > shown + 1) return fail(409, 'Prices changed: the total is now ' + fmtR(q.bill.total) + '. Go back to the cart to see it.' + NOTHING);
  const car = isObj(b.car) ? b.car : {};
  const po = { kind: 'booking', phone, status: 'created', created_at: nowIST(ctx.now), booking_id: bookingId, mode: q.mode, date: q.date, slot: q.slot,
    lines: q.priced.lines.map(l => ({ id: l.id, variant: l.variant, q: l.q, price: l.price, name: l.name, mins: l.mins })),
    amount: q.bill.toPay, total: q.bill.total, wallet_use: q.bill.walletUse, saved: q.bill.saved, gst: q.bill.gst, surcharge: q.bill.surcharge, convenience: q.bill.convenience,
    coupon: q.coupon && q.coupon.ok ? q.coupon.code : null, coupon_off: q.bill.couponOff, pass_id: q.pass ? q.pass.id : null, pass_cover: q.bill.passCover,
    address_id: addr.id, area: clean(addr.data.area, 160), flat: clean(addr.data.flat, 120), lat: num(addr.data.lat, null), lng: num(addr.data.lng, null),
    car_name: clean(car.name, 80), car_reg: clean(car.reg, 20).toUpperCase(), ref: /^WD\d{6}$/.test(String(b.ref || '')) ? b.ref : null, via: clean(b.via, 20) };
  return startOrder(ctx, orderId, po, String(b.name || ''), 'Booking: ' + po.lines.map(l => (l.q > 1 ? l.q + ' x ' : '') + l.name).join(', '));
}

// Writes payorders/{id}; then either fulfils at once (nothing left to pay) or opens a Cashfree order.
async function startOrder(ctx, orderId, po, name, note) {
  let c = { ok: false };
  for (let i = 0; i < 3 && !c.ok; i++) {
    c = await fsCommit(ctx, [wSet(ctx, 'payorders', orderId, po, { exists: false })]);
    if (!c.ok && await fsGet(ctx, 'payorders', orderId)) break;   // a parallel retry made it first
  }
  if (!c.ok) { const again = await fsGet(ctx, 'payorders', orderId); return again ? resumeOrder(ctx, again, po.phone) : fail(409, 'Please try again.' + NOTHING); }
  if (!(po.amount > 0)) {
    const f = await fulfil(ctx, orderId, { amount: 0, ref: 'WALLET', via: po.wallet_use ? 'WD Money' : 'WD Pass' });
    return reply(200, Object.assign({ ok: true, paid: true, orderId }, po.booking_id ? { bookingId: po.booking_id } : {}), { notify: f.notify, alert: f.alert, dispatch: f.dispatch });
  }
  const tags = { kind: po.kind, phone: po.phone.slice(-10) };
  if (ctx.rzp && ctx.want !== 'cashfree' && rzpKeys(ctx.env)) {
    const rz = await rzpOrder(ctx, orderId, po.amount, po.phone, note, tags);
    if (rz.ok) {
      const d = Object.assign({}, po, { rzp_order_id: rz.rzpOrderId, note: clean(note, 120), name: clean(name, 60) });
      await fsCommit(ctx, [wPatch(ctx, 'payorders', orderId, { status: 'awaiting_payment', gateway: 'razorpay', rzp_order_id: rz.rzpOrderId, note: d.note, name: d.name }, { exists: true })]);
      return reply(200, Object.assign({ ok: true, paid: false }, rzpOpen(ctx, d, orderId), po.booking_id ? { bookingId: po.booking_id } : {}));
    }
    // Razorpay refused: fall through to Cashfree, and tell Ravi
    ctx.rzpAlert = 'Workflow 13: Razorpay order failed for ' + orderId + ' (' + rz.why + '), used Cashfree.';
  }
  const cf = await cfOrder(ctx, orderId, po.amount, po.phone, name, note, tags);
  if (!cf.ok) {
    await fsCommit(ctx, [wPatch(ctx, 'payorders', orderId, { status: 'failed', error: cf.why }, { exists: true })]).catch(() => {});
    return fail(502, "Couldn't start the payment. Try again." + NOTHING, { alert: 'Workflow 13: Cashfree order failed for ' + orderId + ': ' + cf.why });
  }
  await fsCommit(ctx, [wPatch(ctx, 'payorders', orderId, { status: 'awaiting_payment', session: cf.sessionId, gateway: 'cashfree' }, { exists: true })]);
  return reply(200, Object.assign({ ok: true, paid: false, gateway: 'cashfree', paymentSessionId: cf.sessionId, orderId }, po.booking_id ? { bookingId: po.booking_id } : {}), ctx.rzpAlert ? { alert: ctx.rzpAlert } : undefined);
}
// A retry of the same request: answer from the order we already have.
async function resumeOrder(ctx, doc, phone) {
  const d = doc.data;
  if (d.phone !== phone) return fail(409, 'Please try again.' + NOTHING);
  const extra = d.booking_id ? { bookingId: d.booking_id } : {};
  if (d.status === 'paid') return reply(200, Object.assign({ ok: true, paid: true, orderId: doc.id }, extra));
  if (d.status === 'awaiting_payment' && d.rzp_order_id && ctx.rzp && ctx.want !== 'cashfree' && rzpKeys(ctx.env)) return reply(200, Object.assign({ ok: true, paid: false }, rzpOpen(ctx, d, doc.id), extra));
  if (d.status === 'awaiting_payment' && d.session) return reply(200, Object.assign({ ok: true, paid: false, gateway: 'cashfree', paymentSessionId: d.session, orderId: doc.id }, extra));
  if (d.status === 'awaiting_payment' && d.rzp_order_id) {
    // the app could not open Razorpay (or is an older build): same order, Cashfree as the backup
    const cf = await cfOrder(ctx, doc.id, d.amount, d.phone, d.name || '', d.note || 'Washing Daddy', { kind: d.kind, phone: String(d.phone).slice(-10) });
    if (!cf.ok) return fail(502, "Couldn't start the payment. Try again." + NOTHING, { alert: 'Workflow 13: Cashfree backup failed for ' + doc.id + ': ' + cf.why });
    await fsCommit(ctx, [wPatch(ctx, 'payorders', doc.id, { session: cf.sessionId }, { exists: true })]);
    return reply(200, Object.assign({ ok: true, paid: false, gateway: 'cashfree', paymentSessionId: cf.sessionId, orderId: doc.id }, extra));
  }
  if (d.status === 'failed') return fail(409, "That didn't go through. Wait 2 minutes and try again." + NOTHING);
  return fail(409, 'Your last try is still going through. Wait a minute and check before trying again.' + NOTHING);
}

async function walletTopup(ctx, req) {
  const g = await gate(ctx, req, ['wallet', 'topup']); if (!g.ok) return g.res;
  const b = isObj(req.body) ? req.body : {}, amt = Number(b.amount), W = g.cfg.wallet;
  if (!Number.isInteger(amt) || amt < W.min || amt > W.max) return fail(400, 'Add between ' + fmtR(W.min) + ' and ' + fmtR(W.max) + '.' + NOTHING);
  const orderId = orderIdFor(ctx, 'WDW', g.phone, { amount: amt });
  const existing = await fsGet(ctx, 'payorders', orderId); if (existing) return resumeOrder(ctx, existing, g.phone);
  const w = await fsGet(ctx, 'wallets', g.phone);
  if (balOf(w && w.data) + amt > W.cap) return fail(400, 'Your ' + 'WD Money can hold up to ' + fmtR(W.cap) + '. Add ' + fmtR(Math.max(0, W.cap - balOf(w && w.data))) + ' or less.' + NOTHING);
  const cashback = r2(amt * W.cashbackPct / 100);
  const po = { kind: 'wallet_topup', phone: g.phone, status: 'created', created_at: nowIST(ctx.now), amount: amt, total: amt, wallet_use: 0, cashback, cash_days: W.cashDays, promo_days: W.promoDays };
  return startOrder(ctx, orderId, po, String(b.name || ''), 'WD Money top-up ' + fmtR(amt));
}

async function passBuy(ctx, req) {
  const g = await gate(ctx, req, 'pass'); if (!g.ok) return g.res;
  const b = isObj(req.body) ? req.body : {};
  const pc = await fsGet(ctx, 'passes_cfg', String(b.plan || ''));
  if (!pc || (pc.data.status || 'live') !== 'live' || !(num(pc.data.price, 0) > 0) || !(num(pc.data.visits, 0) > 0)) return fail(400, 'That pass is not on sale right now.' + NOTHING);
  const orderId = orderIdFor(ctx, 'WDP', g.phone, { plan: pc.id, useWallet: b.useWallet === true });
  const existing = await fsGet(ctx, 'payorders', orderId); if (existing) return resumeOrder(ctx, existing, g.phone);
  if (await activePassOf(ctx, g.phone)) return fail(409, 'You already have an active pass.' + NOTHING);
  const price = num(pc.data.price, 0), gst = r2(price * g.cfg.fees.gstPct / 100), total = r2(price + gst);
  let walletUse = 0;
  if (b.useWallet === true && g.cfg.feat('wallet')) { const w = await fsGet(ctx, 'wallets', g.phone); walletUse = r2(Math.min(balOf(w && w.data), total)); }
  let toPay = r2(total - walletUse); if (toPay > 0 && toPay < 1) toPay = 1;
  const po = { kind: 'pass', phone: g.phone, status: 'created', created_at: nowIST(ctx.now), plan: pc.id, plan_name: clean(pc.data.name || 'WD Pass', 60),
    visits: num(pc.data.visits, 0), valid_days: num(pc.data.validDays, 30), amount: toPay, total, gst, wallet_use: walletUse };
  return startOrder(ctx, orderId, po, String(b.name || ''), po.plan_name + ' (' + po.visits + ' visits)');
}

async function giftClaim(ctx, req) {
  const g = await gate(ctx, req, ['wallet', 'giftcard']); if (!g.ok) return g.res;
  const code = String((req.body || {}).code || '').toUpperCase().replace(/[\s-]/g, '');
  const k = 'gift:' + g.phone;
  const wrong = (ctx.sd.giftWrong = ctx.sd.giftWrong || {});
  const recent = (wrong[k] || []).filter(t => ctx.now - t < 3600e3);
  if (recent.length >= 5) return fail(429, 'Too many wrong codes. Try again in an hour.');
  const bad = msg => { recent.push(ctx.now); wrong[k] = recent; return fail(400, msg); };
  if (!/^[A-Z0-9]{8,16}$/.test(code)) return bad("That gift card isn't valid.");
  const W = g.cfg.wallet;
  return txn(ctx, async () => {
    const [gc, w] = await Promise.all([fsGet(ctx, 'giftcards', code), fsGet(ctx, 'wallets', g.phone)]);
    if (!gc) return { result: bad("That gift card isn't valid.") };
    const d = gc.data, amt = r2(num(d.amount, 0));
    if (d.used_by || d.status === 'used') return { result: d.used_by === g.phone ? fail(409, 'You already added this gift card.') : bad('This gift card was already used.') };
    if ((d.status || 'live') !== 'live' || !(amt > 0)) return { result: bad("That gift card isn't valid.") };
    if (d.valid_till && String(d.valid_till) < todayIST(ctx.now)) return { result: bad('This gift card has expired.') };
    if (balOf(w && w.data) + amt > W.cap) return { result: fail(400, 'Your WD Money is full. Use some of it first.') };
    const bucket = d.bucket === 'promo' ? 'promo' : 'cash', ww = Object.assign({ cash: 0, promo: 0 }, w ? w.data : {});
    ww[bucket] = r2(num(ww[bucket], 0) + amt);
    const at = nowIST(ctx.now), today = todayIST(ctx.now);
    return { writes: [
      wPatch(ctx, 'giftcards', code, { status: 'used', used_by: g.phone, used_at: at }, pre(gc)),
      wSet(ctx, 'wallets', g.phone, { phone: g.phone, cash: r2(num(ww.cash, 0)), promo: r2(num(ww.promo, 0)), updated_at: at }, pre(w)),
      wSet(ctx, 'walletledger', 'L' + b62(sha(ctx, 'gift|' + code), 18), { phone: g.phone, at, kind: 'gift', amt, note: 'Gift card ••' + code.slice(-4), bucket,
        expires: addDaysISO(today, bucket === 'promo' ? W.promoDays : W.cashDays), ref: 'gift:' + code }, { exists: false }),
    ], result: reply(200, { ok: true, amount: amt }, { notify: 'Gift card ' + code.slice(-4) + ' claimed: ' + fmtR(amt) + ' to ' + g.phone }) };
  });
}

/* ---- after the money is in: one atomic commit per order ---- */
// pay = { amount, ref, via }. Idempotent: a paid order is never fulfilled twice (payorder updateTime precondition).
async function fulfil(ctx, orderId, pay) {
  return txn(ctx, async () => {
    const po = await fsGet(ctx, 'payorders', orderId);
    if (!po) return { result: { ok: false, alert: 'Workflow 13: payment for unknown order ' + orderId } };
    const d = po.data, phone = d.phone, at = nowIST(ctx.now), today = todayIST(ctx.now);
    if (d.status === 'paid') return { result: { ok: true, duplicate: true } };
    const writes = [], alerts = [];
    const ledger = (kind, amt, note, bucket, expires, i) => writes.push(wSet(ctx, 'walletledger', 'L' + b62(sha(ctx, orderId + '|' + kind + '|' + bucket + '|' + (i || 0)), 18),
      { phone, at, kind, amt: r2(amt), note, bucket, expires: expires || null, order_id: orderId }, { exists: false }));
    let wallet = null, ww = null;
    const loadWallet = async () => { wallet = await fsGet(ctx, 'wallets', phone); ww = Object.assign({ cash: 0, promo: 0 }, wallet ? wallet.data : {}); };
    const debit = (amt, note) => {
      const s = splitDebit(ww, amt);
      if (s.promo) { ww.promo = r2(ww.promo - s.promo); ledger('payment', -s.promo, note, 'promo'); }
      if (s.cash) { ww.cash = r2(ww.cash - s.cash); ledger('payment', -s.cash, note, 'cash'); }
      if (s.short > 0) alerts.push('WD Money was ' + fmtR(s.short) + ' short for order ' + orderId + ' (' + phone + '). Collect it or let it go.');
      return s;
    };
    const saveWallet = () => writes.push(wSet(ctx, 'wallets', phone, { phone, cash: r2(ww.cash), promo: r2(ww.promo), updated_at: at }, pre(wallet)));
    let notify = '', dispatch = null, extraPo = {};
    if (d.kind === 'wallet_topup') {
      await loadWallet();
      ww.cash = r2(ww.cash + d.amount); ledger('topup', d.amount, 'Added to WD Money', 'cash', addDaysISO(today, num(d.cash_days, 365)));
      if (d.cashback > 0) { ww.promo = r2(ww.promo + d.cashback); ledger('cashback', d.cashback, 'Cashback on top-up', 'promo', addDaysISO(today, num(d.promo_days, 15))); }
      saveWallet();
      notify = 'WD Money top-up ' + fmtR(d.amount) + ' paid by ' + phone + ' (order ' + orderId + ')';
    } else if (d.kind === 'pass') {
      if (d.wallet_use > 0) { await loadWallet(); const s = debit(d.wallet_use, d.plan_name); extraPo.wallet_promo = s.promo; extraPo.wallet_cash = s.cash; saveWallet(); }
      writes.push(wSet(ctx, 'passes', 'P' + orderId, { phone, plan: d.plan, name: d.plan_name, visits_total: d.visits, visits_left: d.visits, bought_at: at,
        valid_till: addDaysISO(today, num(d.valid_days, 30)), status: 'active', order_id: orderId }, { exists: false }));
      notify = d.plan_name + ' bought by ' + phone + ': ' + fmtR(d.total) + ' (order ' + orderId + ')';
    } else if (d.kind === 'booking') {
      const names = d.lines.map(l => (l.q > 1 ? l.q + ' x ' : '') + l.name).join(', ');
      if (d.wallet_use > 0) { await loadWallet(); const s = debit(d.wallet_use, 'Booking · ' + names.slice(0, 60)); extraPo.wallet_promo = s.promo; extraPo.wallet_cash = s.cash; saveWallet(); }
      if (d.pass_id) {
        const p = await fsGet(ctx, 'passes', d.pass_id);
        if (p && num(p.data.visits_left, 0) > 0) { const left = num(p.data.visits_left, 0) - 1; writes.push(wPatch(ctx, 'passes', d.pass_id, { visits_left: left, status: left ? 'active' : 'used' }, pre(p))); }
        else alerts.push('WD Pass visit could not be taken for order ' + orderId + ' (' + phone + '): no visits left.');
      }
      if (d.coupon) {
        const rid = d.coupon + '_' + phone, red = await fsGet(ctx, 'couponredemptions', rid);
        writes.push(wSet(ctx, 'couponredemptions', rid, { code: d.coupon, phone, count: num(red && red.data.count, 0) + 1, last_order: orderId, at }, pre(red)));
      }
      if (d.mode === 'scheduled' && d.slot) {
        const [s, sc] = await Promise.all([fsGet(ctx, 'slots', d.date), fsGet(ctx, 'slots_cfg', 'default')]);
        const cap = cfgOf(null, sc && sc.data).slots.capacity, sd0 = s ? s.data : {};
        const booked = Object.assign({}, isObj(sd0.booked) ? sd0.booked : {}); booked[d.slot] = num(booked[d.slot], 0) + 1;
        const sold = Array.isArray(sd0.sold) ? sd0.sold.slice() : []; if (booked[d.slot] >= cap && !sold.includes(d.slot)) sold.push(d.slot);
        writes.push(s ? wPatch(ctx, 'slots', d.date, { booked, sold }, pre(s)) : wSet(ctx, 'slots', d.date, { booked, sold, closed: false }, { exists: false }));
      }
      const job = await fsGet(ctx, 'ondemand', d.booking_id);
      if (!job) {
        writes.push(wSet(ctx, 'ondemand', d.booking_id, { service: names.slice(0, 80), service_id: d.lines.map(l => l.id).join('+').slice(0, 80),
          services: d.lines.map(l => ({ id: l.id, variant: l.variant, q: l.q, price: l.price })),
          // price = what Cashfree took (workflow 10 checks the order for exactly this); total = the whole bill
          price: r2(pay.amount), total: d.total, saved: d.saved, paid: true, pay_ref: pay.amount > 0 ? orderId : '', pay_via: pay.amount > 0 ? (pay.gateway === 'razorpay' ? 'Razorpay' : 'Cashfree') : pay.via, gateway_ref: String(pay.ref || ''),
          payorder_id: orderId, mode: d.mode, date: d.date, slot: d.slot || '', address_id: d.address_id, area: d.area, flat: d.flat, lat: d.lat, lng: d.lng,
          car: d.car_name, reg: d.car_reg, phone, customer_id: phone, status: d.mode === 'instant' ? 'new' : 'scheduled', washer_id: '', created_at: at,
          coupon: d.coupon || null, pass_id: d.pass_id || null, wallet_use: d.wallet_use || 0 }, { exists: false }));
      }
      if (d.mode === 'instant' && pay.amount > 0 && pay.gateway !== 'razorpay') dispatch = d.booking_id;   // workflow 10 can verify only Cashfree-paid jobs; Razorpay ones reach washers through the normal job alert
      notify = 'New ' + d.mode + ' booking ' + d.booking_id + ' from ' + phone + ': ' + names + (d.slot ? ' on ' + d.date + ' ' + d.slot : '') +
        '. Total ' + fmtR(d.total) + (d.wallet_use ? ', WD Money ' + fmtR(d.wallet_use) : '') + (d.pass_id ? ', WD Pass' : '') + (pay.amount ? (pay.gateway === 'razorpay' ? ', Razorpay ' : ', Cashfree ') + fmtR(pay.amount) : '') + '. ' + (d.area || '');
    } else return { result: { ok: false, alert: 'Workflow 13: order ' + orderId + ' has unknown kind ' + d.kind } };
    writes.push(wPatch(ctx, 'payorders', orderId, Object.assign({ status: 'paid', paid_at: at, paid_amount: r2(pay.amount), cf_payment_id: pay.gateway === 'razorpay' ? '' : String(pay.ref || ''), rzp_payment_id: pay.gateway === 'razorpay' ? String(pay.ref || '') : '', pay_via: String(pay.via || ''), paid_gateway: pay.gateway || (pay.amount > 0 ? 'cashfree' : '') }, extraPo), pre(po)));
    return { writes, result: { ok: true, notify, alert: alerts.join('\n') || undefined, dispatch } };
  });
}

// Cashfree's signed webhook, forwarded unchanged by workflow 8 (wd-pay-hook) for kinds booking / wallet_topup / pass.
async function prontoPaid(ctx, req) {
  const h = req.headers || {};
  const raw = typeof req.rawBody === 'string' ? req.rawBody : '';
  const v = verifyCfWebhook(ctx, raw, h['x-webhook-timestamp'], h['x-webhook-signature']);
  if (!v.ok) return reply(401, { ok: false }, { alert: 'Workflow 13 refused a payment webhook: ' + v.why });
  let b; try { b = JSON.parse(raw); } catch (e) { return reply(400, { ok: false }); }
  const d = b.data || {}, pay = d.payment || {}, ord = d.order || {};
  if (String(pay.payment_status || '').toUpperCase() !== 'SUCCESS') return reply(200, { ok: true, ignored: 'not a success' });
  const orderId = String(ord.order_id || '');
  if (!/^WD[BWP][A-Za-z0-9]{20}$/.test(orderId)) return reply(200, { ok: true, ignored: 'not a Pronto order' });
  const po = await fsGet(ctx, 'payorders', orderId);
  if (!po) return reply(200, { ok: false }, { alert: 'Workflow 13: paid order ' + orderId + ' has no payorders doc. Check Cashfree and credit by hand.' });
  const paid = r2(num(pay.payment_amount, num(ord.order_amount, 0))), cur = String(pay.payment_currency || ord.order_currency || 'INR').toUpperCase();
  if (cur !== 'INR' || !(paid >= r2(po.data.amount))) {
    return reply(200, { ok: false }, { alert: 'Workflow 13: order ' + orderId + ' paid ' + paid + ' ' + cur + ' but needs ' + po.data.amount + ' INR. Not fulfilled; refund or fix by hand.' });
  }
  const f = await fulfil(ctx, orderId, { amount: paid, ref: pay.cf_payment_id || '', via: pay.payment_group || 'Cashfree' });
  return reply(200, { ok: true }, { notify: f.notify, alert: f.alert, dispatch: f.dispatch });
}

// The app finished Razorpay Checkout. It sends the three values Razorpay handed it; we check the signature with our
// secret, confirm the payment with Razorpay itself (captured, our amount), and fulfil the order. Never trusts the phone.
async function rzpConfirm(ctx, req) {
  const h = (req && req.headers) || {};
  const t = await verifyIdToken(ctx, h.authorization || h.Authorization);
  if (!t.ok) return t.setup ? fail(503, 'Payments are being set up. Try again later.', { alert: 'Workflow 13: ' + t.why }) : fail(401, 'Sign in again to continue.');
  if (!rateLimit(ctx, 'rzp|' + t.phone, 20, 60000)) return fail(429, 'Too many tries. Wait a minute and try again.');
  const b = isObj(req.body) ? req.body : {}, orderId = String(b.orderId || ''), ro = String(b.razorpay_order_id || ''), rp = String(b.razorpay_payment_id || ''), sig = String(b.razorpay_signature || '');
  if (!/^WD[BWP][A-Za-z0-9]{20}$/.test(orderId) || !/^order_[A-Za-z0-9]{6,40}$/.test(ro) || !/^pay_[A-Za-z0-9]{6,40}$/.test(rp) || !/^[a-f0-9]{64}$/.test(sig)) return fail(400, "We couldn't read that payment. If money was taken it will show up in a few minutes.");
  const k = rzpKeys(ctx.env); if (!k) return fail(503, 'Payments are being set up. Try again later.', { alert: 'Workflow 13: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set' });
  const po = await fsGet(ctx, 'payorders', orderId);
  if (!po || po.data.phone !== t.phone) return fail(400, 'We could not find that payment.');
  const extra = po.data.booking_id ? { bookingId: po.data.booking_id } : {};
  if (po.data.status === 'paid') return reply(200, Object.assign({ ok: true, paid: true, orderId }, extra));
  if (po.data.rzp_order_id !== ro) return fail(400, 'That payment belongs to another order.', { alert: 'Workflow 13: Razorpay order mismatch on ' + orderId + ' (' + t.phone + ')' });
  if (!sameHex(ctx, hmacHex(ctx, k.sec, ro + '|' + rp), sig)) return fail(400, "We couldn't confirm that payment.", { alert: 'Workflow 13: bad Razorpay signature on ' + orderId + ' (' + t.phone + ')' });
  // ask Razorpay what really happened (amount and status), and capture if the account does not auto-capture
  let r = await rzpCall(ctx, 'GET', '/payments/' + rp), pay = r.body || {};
  const want = Math.round(r2(po.data.amount) * 100);
  if (r.statusCode !== 200 || pay.order_id !== ro || Number(pay.amount) !== want || pay.currency !== 'INR') {
    return fail(502, "We couldn't confirm that payment yet. If money was taken it will show up in a few minutes.", { alert: 'Workflow 13: Razorpay payment ' + rp + ' for ' + orderId + ' does not match (' + r.statusCode + ', ' + pay.amount + ' ' + pay.currency + ')' });
  }
  if (pay.status === 'authorized') {
    r = await rzpCall(ctx, 'POST', '/payments/' + rp + '/capture', { amount: want, currency: 'INR' }); pay = r.body || {};
  }
  if (pay.status !== 'captured') return reply(200, Object.assign({ ok: true, paid: false, pending: true, orderId }, extra));
  const f = await fulfil(ctx, orderId, { amount: r2(want / 100), ref: rp, via: 'Razorpay' + (pay.method ? ' · ' + String(pay.method).toUpperCase() : ''), gateway: 'razorpay' });
  return reply(200, Object.assign({ ok: true, paid: true, orderId, ref: rp }, extra), { notify: f.notify, alert: f.alert, dispatch: f.dispatch });
}
// Razorpay's signed webhook (event order.paid), for when the app closed before it could confirm. Needs
// RAZORPAY_WEBHOOK_SECRET (the secret typed when adding the webhook in the Razorpay dashboard).
async function rzpHook(ctx, req) {
  const secret = String(ctx.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const raw = typeof req.rawBody === 'string' ? req.rawBody : '', sig = String(((req.headers || {})['x-razorpay-signature']) || '');
  if (!secret || !raw || !/^[a-f0-9]{64}$/.test(sig) || !sameHex(ctx, hmacHex(ctx, secret, raw), sig)) return reply(401, { ok: false }, { alert: secret ? 'Workflow 13 refused a Razorpay webhook: bad signature' : undefined });
  let b; try { b = JSON.parse(raw); } catch (e) { return reply(400, { ok: false }); }
  if (b.event !== 'order.paid') return reply(200, { ok: true, ignored: b.event });
  const o = (b.payload && b.payload.order && b.payload.order.entity) || {}, p = (b.payload && b.payload.payment && b.payload.payment.entity) || {};
  const orderId = String(o.receipt || '');
  if (!/^WD[BWP][A-Za-z0-9]{20}$/.test(orderId)) return reply(200, { ok: true, ignored: 'not a Pronto order' });
  const po = await fsGet(ctx, 'payorders', orderId);
  if (!po) return reply(200, { ok: false }, { alert: 'Workflow 13: Razorpay paid order ' + orderId + ' has no payorders doc. Check Razorpay and credit by hand.' });
  const want = Math.round(r2(po.data.amount) * 100);
  if (po.data.rzp_order_id !== o.id || Number(o.amount_paid) < want || o.currency !== 'INR') return reply(200, { ok: false }, { alert: 'Workflow 13: Razorpay order ' + orderId + ' paid ' + o.amount_paid + ' ' + o.currency + ' but needs ' + want + ' paise. Not fulfilled.' });
  const f = await fulfil(ctx, orderId, { amount: r2(want / 100), ref: String(p.id || ''), via: 'Razorpay' + (p.method ? ' · ' + String(p.method).toUpperCase() : ''), gateway: 'razorpay' });
  return reply(200, { ok: true }, { notify: f.notify, alert: f.alert, dispatch: f.dispatch });
}

/* ---- cancel and reschedule ---- */
const CANCELLABLE = ['new', 'scheduled', 'declined'];
async function bookingCancel(ctx, req) {
  const g = await gate(ctx, req, 'cancel'); if (!g.ok) return g.res;
  const id = String((req.body || {}).bookingId || '');
  const job0 = await fsGet(ctx, 'ondemand', id);
  if (!job0 || job0.data.customer_id !== g.phone) return fail(400, 'We could not find that booking.');
  const j = job0.data;
  if (!CANCELLABLE.includes(j.status)) return fail(409, j.status === 'cancelled' ? 'This booking is already cancelled.' : 'Your washer is already on the way, so this booking cannot be cancelled now. Call us on 77018 08924.');
  // policy: free until a washer is assigned, or for a scheduled slot until 2 hours before it
  if (j.washer_id) {
    const start = j.slot ? Date.parse(j.date + 'T' + j.slot + ':00+05:30') : NaN;
    if (!Number.isFinite(start) || start - ctx.now < 2 * 3600e3) return fail(409, 'A washer is already assigned, so this booking cannot be cancelled in the app. Call us on 77018 08924.');
  }
  const po = j.payorder_id ? await fsGet(ctx, 'payorders', j.payorder_id) : null;
  const gateway = po && po.data.status === 'paid' ? r2(num(po.data.paid_amount, 0)) : 0;
  let cfRefundId = '';
  if (gateway > 0) {
    cfRefundId = 'RF' + id.slice(0, 20);
    const viaRzp = po.data.paid_gateway === 'razorpay' && po.data.rzp_payment_id;
    const r = viaRzp
      ? await rzpCall(ctx, 'POST', '/payments/' + po.data.rzp_payment_id + '/refund', { amount: Math.round(gateway * 100), receipt: cfRefundId, notes: { reason: 'Booking cancelled', booking: id } })
      : await cfCall(ctx, 'POST', '/pg/orders/' + po.id + '/refunds', { refund_amount: gateway, refund_id: cfRefundId, refund_note: 'Booking cancelled' });
    const ok = (r.statusCode >= 200 && r.statusCode < 300) || /already exists|duplicate|fully refunded/i.test(JSON.stringify(r.body || ''));
    if (!ok) return fail(502, "Couldn't start your refund, so the booking is still on. Try again or call us on 77018 08924.", { alert: 'Workflow 13: ' + (viaRzp ? 'Razorpay' : 'Cashfree') + ' refund failed for ' + po.id + ': ' + r.statusCode + ' ' + clean(JSON.stringify(r.body || ''), 160) });
  }
  const legacyPaid = !po && j.paid === true;
  return txn(ctx, async () => {
    const job = await fsGet(ctx, 'ondemand', id);
    if (!job || !CANCELLABLE.includes(job.data.status)) return { result: fail(409, 'This booking cannot be cancelled now.') };
    const at = nowIST(ctx.now), today = todayIST(ctx.now), writes = [];
    writes.push(wPatch(ctx, 'ondemand', id, { status: 'cancelled', cancelled_at: at, refunded: !!(po && po.data.status === 'paid') }, pre(job)));
    let walletBack = 0;
    if (po && po.data.status === 'paid' && num(po.data.wallet_use, 0) > 0) {
      const w = await fsGet(ctx, 'wallets', g.phone), ww = Object.assign({ cash: 0, promo: 0 }, w ? w.data : {});
      const promo = r2(num(po.data.wallet_promo, 0)), cash = r2(num(po.data.wallet_use, 0) - promo);
      ww.promo = r2(num(ww.promo, 0) + promo); ww.cash = r2(num(ww.cash, 0) + cash); walletBack = r2(promo + cash);
      writes.push(wSet(ctx, 'wallets', g.phone, { phone: g.phone, cash: ww.cash, promo: ww.promo, updated_at: at }, pre(w)));
      if (promo) writes.push(wSet(ctx, 'walletledger', 'L' + b62(sha(ctx, id + '|refund|promo'), 18), { phone: g.phone, at, kind: 'refund', amt: promo, note: 'Refund · cancelled booking', bucket: 'promo', expires: addDaysISO(today, 15), booking_id: id }, { exists: false }));
      if (cash) writes.push(wSet(ctx, 'walletledger', 'L' + b62(sha(ctx, id + '|refund|cash'), 18), { phone: g.phone, at, kind: 'refund', amt: cash, note: 'Refund · cancelled booking', bucket: 'cash', expires: addDaysISO(today, 365), booking_id: id }, { exists: false }));
      writes.push(wSet(ctx, 'refunds', 'RW' + id.slice(0, 20), { phone: g.phone, at, amt: walletBack, status: 'credited', to: 'wallet', what: String(job.data.service || 'Booking') + ' · cancelled', booking_id: id }, { exists: false }));
    }
    if (gateway > 0) writes.push(wSet(ctx, 'refunds', cfRefundId, { phone: g.phone, at, amt: gateway, status: 'initiated', to: 'source', what: String(job.data.service || 'Booking') + ' · cancelled', booking_id: id, eta: '5-7 working days', cf_refund_id: cfRefundId }, { exists: false }));
    if (po && po.data.status === 'paid' && po.data.pass_id) {
      const p = await fsGet(ctx, 'passes', po.data.pass_id);
      if (p) writes.push(wPatch(ctx, 'passes', po.data.pass_id, { visits_left: num(p.data.visits_left, 0) + 1, status: 'active' }, pre(p)));
    }
    if (job.data.mode === 'scheduled' && job.data.slot && job.data.payorder_id) {
      const s = await fsGet(ctx, 'slots', job.data.date);
      if (s && isObj(s.data.booked) && num(s.data.booked[job.data.slot], 0) > 0) {
        const booked = Object.assign({}, s.data.booked); booked[job.data.slot] = num(booked[job.data.slot], 0) - 1;
        const sold = (Array.isArray(s.data.sold) ? s.data.sold : []).filter(x => x !== job.data.slot);
        writes.push(wPatch(ctx, 'slots', job.data.date, { booked, sold }, pre(s)));
      }
    }
    const amt = r2(gateway + walletBack);
    return { writes, result: reply(200, { ok: true, refund: { amt, to: gateway > 0 ? 'source' : 'wallet' } },
      { notify: 'Booking ' + id + ' cancelled by ' + g.phone + (amt ? ': refund ' + fmtR(amt) : ''), alert: legacyPaid ? 'Booking ' + id + ' (' + g.phone + ') was paid through the old app path and is now cancelled: refund ' + fmtR(num(job.data.price, 0)) + ' by hand (Cashfree order ' + (job.data.pay_ref || '?') + ').' : undefined }) };
  });
}

async function bookingReschedule(ctx, req) {
  const g = await gate(ctx, req, 'reschedule'); if (!g.ok) return g.res;
  const b = req.body || {}, id = String(b.bookingId || ''), date = String(b.date || ''), slot = String(b.slot || '');
  return txn(ctx, async () => {
    const job = await fsGet(ctx, 'ondemand', id);
    if (!job || job.data.customer_id !== g.phone) return { result: fail(400, 'We could not find that booking.') };
    const j = job.data;
    if (!CANCELLABLE.includes(j.status)) return { result: fail(409, 'Your washer is already on the way, so this booking cannot be moved now.') };
    if (j.date === date && j.slot === slot) return { result: reply(200, { ok: true }) };
    const s = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await fsGet(ctx, 'slots', date) : null;
    const p = slotProblem(g.cfg, s && s.data, date, slot, ctx.now); if (p) return { result: fail(409, p) };
    const at = nowIST(ctx.now), today = todayIST(ctx.now), writes = [];
    const po = j.payorder_id ? await fsGet(ctx, 'payorders', j.payorder_id) : null;
    let diff = 0, w = null, ww = null;
    if (po) {
      const oldS = j.slot ? num(po.data.surcharge, 0) : 0, newS = surchargeFor(g.cfg, s && s.data, slot);
      diff = r2((newS - oldS) * (1 + g.cfg.fees.gstPct / 100));
      if (diff) {
        w = await fsGet(ctx, 'wallets', g.phone); ww = Object.assign({ cash: 0, promo: 0 }, w ? w.data : {});
        if (diff > 0) {
          if (balOf(ww) < diff) return { result: fail(409, 'This slot costs ' + fmtR(diff) + ' more. Add money to WD Money or pick another slot.') };
          const sp = splitDebit(ww, diff); ww.promo = r2(ww.promo - sp.promo); ww.cash = r2(ww.cash - sp.cash);
        } else ww.cash = r2(num(ww.cash, 0) - diff);
        writes.push(wSet(ctx, 'wallets', g.phone, { phone: g.phone, cash: r2(ww.cash), promo: r2(ww.promo), updated_at: at }, pre(w)));
        writes.push(wSet(ctx, 'walletledger', 'L' + b62(sha(ctx, id + '|move|' + date + slot + '|' + job.updateTime), 18), { phone: g.phone, at, kind: diff > 0 ? 'payment' : 'refund', amt: -diff,
          note: diff > 0 ? 'Peak slot charge (rescheduled)' : 'Slot charge back (rescheduled)', bucket: 'cash', expires: diff < 0 ? addDaysISO(today, 365) : null, booking_id: id }, { exists: false }));
        writes.push(wPatch(ctx, 'payorders', po.id, { surcharge: newS, total: r2(num(po.data.total, 0) + diff) }, pre(po)));
      }
    }
    const cap = g.cfg.slots.capacity;
    const bump = (doc, d, t, by) => { const sd0 = doc ? doc.data : {}, booked = Object.assign({}, isObj(sd0.booked) ? sd0.booked : {}); booked[t] = Math.max(0, num(booked[t], 0) + by);
      let sold = (Array.isArray(sd0.sold) ? sd0.sold : []).filter(x => x !== t); if (booked[t] >= cap) sold = sold.concat([t]);
      writes.push(doc ? wPatch(ctx, 'slots', d, { booked, sold }, pre(doc)) : wSet(ctx, 'slots', d, { booked, sold, closed: false }, { exists: false })); };
    if (j.payorder_id && j.mode === 'scheduled' && j.slot && j.date !== date) { const old = await fsGet(ctx, 'slots', j.date); if (old) bump(old, j.date, j.slot, -1); bump(s, date, slot, 1); }
    else if (j.payorder_id && j.mode === 'scheduled' && j.slot) { const sd0 = s ? s.data : {}; const booked = Object.assign({}, isObj(sd0.booked) ? sd0.booked : {}); booked[j.slot] = Math.max(0, num(booked[j.slot], 0) - 1); booked[slot] = num(booked[slot], 0) + 1;
      let sold = (Array.isArray(sd0.sold) ? sd0.sold : []).filter(x => x !== j.slot && x !== slot); if (booked[slot] >= cap) sold.push(slot);
      writes.push(s ? wPatch(ctx, 'slots', date, { booked, sold }, pre(s)) : wSet(ctx, 'slots', date, { booked, sold, closed: false }, { exists: false })); }
    else bump(s, date, slot, 1);
    writes.push(wPatch(ctx, 'ondemand', id, { date, slot, mode: 'scheduled', status: 'scheduled', washer_id: '', rescheduled_at: at }, pre(job)));
    return { writes, result: reply(200, { ok: true, charged: diff > 0 ? diff : 0, credited: diff < 0 ? -diff : 0 }, { notify: 'Booking ' + id + ' moved to ' + date + ' ' + slot + ' by ' + g.phone }) };
  });
}

const HANDLERS = { 'wd-booking-create': bookingCreate, 'wd-booking-cancel': bookingCancel, 'wd-booking-reschedule': bookingReschedule,
  'wd-coupon-validate': couponValidate, 'wd-wallet-topup': walletTopup, 'wd-gift-claim': giftClaim, 'wd-pass-buy': passBuy, 'wd-pronto-paid': prontoPaid,
  'wd-rzp-confirm': rzpConfirm, 'wd-rzp-hook': rzpHook };
// Never throws: any crash becomes a 500 the app can show, and an alert for Ravi.
async function handle(name, ctx, req) {
  // body.rzp: this app build can open Razorpay Checkout (older builds only know Cashfree). body.gateway 'cashfree': use the backup.
  const b0 = (req && isObj(req.body)) ? req.body : {};
  ctx.rzp = b0.rzp === true; ctx.want = b0.gateway === 'cashfree' ? 'cashfree' : '';
  try { return await HANDLERS[name](ctx, req || {}); }
  catch (e) {
    const setup = !!(e && e.setup);
    return fail(setup ? 503 : 500, (setup ? 'Payments are being set up. Try again later.' : "Something went wrong on our side. Try again in a minute.") + (name === 'wd-pronto-paid' || name === 'wd-rzp-hook' || name === 'wd-rzp-confirm' ? '' : NOTHING),
      { alert: 'Workflow 13 ' + name + ' failed: ' + clean(e && e.message || e, 200) });
  }
}
