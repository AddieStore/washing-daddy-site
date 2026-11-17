// node n8n/13-pronto/test.mjs — offline tests for workflow 13 and the Pronto branch of workflow 8.
// Real RSA keys (Firebase ID tokens, service-account JWT), real HMAC (Cashfree webhook), fake servers (tests/fakes.mjs).
import fs from 'node:fs'; import crypto from 'node:crypto';
import { keys, idToken, makeWorld, PROJECT } from './tests/fakes.mjs';
import { run } from './tests/runner.mjs';

const src = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const L = new Function(src + '; return { handle, billOf, priceLines, couponOff, cfgOf, slotProblem, surchargeFor, splitDebit, r9 };')();
const WF13 = JSON.parse(fs.readFileSync(new URL('./13-pronto.json', import.meta.url), 'utf8'));
const WF8 = JSON.parse(fs.readFileSync(new URL('../2026-11-01/8-cashfree.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } };

const K = keys();
const SECRET = 'cf_test_secret_not_real';
const ENV = { FIREBASE_PROJECT_ID: PROJECT, CASHFREE_APP_ID: 'TEST_APP_ID', CASHFREE_SECRET: SECRET,
  FIREBASE_SA_KEY_B64: Buffer.from(JSON.stringify({ client_email: 'n8n@wd-test.iam.gserviceaccount.com', private_key: K.saPrivPem })).toString('base64'), TELEGRAM_CHAT_ID: '1' };
const ME = '+919876543210', OTHER = '+919811100000';
const tok = (phone = ME, o = {}) => 'Bearer ' + idToken(K, { phone_number: phone, ...(o.claims || {}) }, o);
const istDay = off => new Date(Date.now() + 5.5 * 3600e3 + off * 864e5).toISOString().slice(0, 10);
const TOMORROW = istDay(1);

const seed = () => ({
  'catalog/ext': { kind: 'service', name: 'Exterior Pressure Wash', price: 149, mrp: 249, mins: 25, status: 'live', variants: { hatch: 1, sedan: 1.2, suv: 1.4 } },
  'catalog/foam': { kind: 'service', name: 'Foam Wash', price: 249, mrp: 399, mins: 35, status: 'live' },
  'catalog/seat': { kind: 'service', name: 'Seat Shampoo', price: 699, mrp: 999, mins: 60, status: 'live', variants: { hatch: 1, suv: 1.4 } },
  'catalog/wax': { kind: 'service', name: 'Hand Wax Polish', price: 599, mrp: 899, mins: 45, status: 'paused' },
  'catalog/wash': { kind: 'pack', name: 'WD Wash', price: 199, mrp: 349, mins: 30, status: 'live' },
  'catalog/perfume': { kind: 'store', name: 'Car Perfume', price: 499, status: 'live' },
  'appcfg/customer': { maintenance: { on: false }, instant: { on: true, openFrom: '00:00', openTill: '23:59' }, features: { recurring: true },
    fees: { convenience: 19, convenienceBelow: 299, gstPct: 5, slotSurcharge: { '09:00': 30 }, surcharge: { morning: 0 } } },
  'slots_cfg/default': { days: 7, grid: 30, capacityPerSlot: 1, parts: { morning: { from: '07:00', till: '11:30' }, afternoon: { from: '12:00', till: '16:30' }, evening: { from: '17:00', till: '20:00' } } },
  'coupons/FIRSTWASH': { type: 'flat', value: 100, minOrder: 299, firstOrderOnly: true, perUser: 1, validTill: '2099-12-31', status: 'live', public: true },
  'coupons/SHINE20': { type: 'pct', value: 20, maxOff: 150, minOrder: 499, validTill: '2099-12-31', status: 'live' },
  'coupons/OLD': { type: 'flat', value: 50, minOrder: 0, validTill: '2020-01-01', status: 'live' },
  'passes_cfg/pass3': { name: 'WD Pass', visits: 3, price: 349, mrp: 447, validDays: 30, covers: ['ext', 'foam', 'wash'], maxMins: 35, status: 'live' },
  'addresses/a1': { phone: ME, label: 'Home', flat: 'B-12', area: 'GH-9 Paschim Vihar', lat: 28.668, lng: 77.0989 },
  'addresses/a2': { phone: OTHER, label: 'Home', flat: 'C-1', area: 'Meera Bagh', lat: 28.672, lng: 77.1065 },
  'giftcards/WDGIFT1234': { amount: 500, status: 'live', bucket: 'cash' },
});
const call = (W, name, body, opt = {}) => L.handle(name, { env: opt.env || ENV, http: W.http, sd: opt.sd || W.sd || (W.sd = {}), crypto, now: opt.now || Date.now() },
  { headers: { authorization: opt.auth === undefined ? tok(opt.phone) : opt.auth }, body });
const paid = (W, orderId, amount, opt = {}) => { const wh = W.cfWebhook(SECRET, orderId, amount, opt); return L.handle('wd-pronto-paid', { env: ENV, http: W.http, sd: W.sd || (W.sd = {}), crypto, now: Date.now() }, { headers: wh.headers, rawBody: wh.rawBody }); };
const cart = (o = {}) => Object.assign({ mode: 'instant', lines: [{ id: 'ext', variant: 'hatch', q: 1 }], when: null, recur: null, coupon: null, useWallet: false, usePass: false, addressId: 'a1', car: { name: 'Creta', reg: 'DL3CXY9999' }, ref: null, via: 'UPI' }, o);
const all = [];   // every app-facing reply, to check none is a 404
const rec = r => { all.push(r); return r; };

// ================= pure pricing =================
{
  const cat = Object.fromEntries(Object.entries(seed()).filter(([k]) => k.startsWith('catalog/')).map(([k, v]) => [k.slice(8), v]));
  const p = L.priceLines(cat, [{ id: 'ext', variant: 'sedan', q: 2 }, { id: 'ext', variant: 'suv', q: 1 }, { id: 'wash', variant: 'suv', q: 1 }]);
  check('variant prices match the app (r9): sedan 179, suv 209; packs ignore the size', p.ok && p.lines[0].price === 179 && p.lines[1].price === 209 && p.lines[2].price === 199 && p.sub === 179 * 2 + 209 + 199, p);
  check('mins scale with size like the app', p.lines[0].mins === 30 && p.lines[1].mins === 35, p.lines);
  check('paused service refused', !L.priceLines(cat, [{ id: 'wax', q: 1 }]).ok);
  check('store item is not bookable', !L.priceLines(cat, [{ id: 'perfume', q: 1 }]).ok);
  check('unknown id / __proto__ / constructor refused', ['nope', '__proto__', 'constructor', 'toString'].every(id => !L.priceLines(cat, [{ id, q: 1 }]).ok));
  check('size the service does not offer refused', !L.priceLines(cat, [{ id: 'seat', variant: 'sedan', q: 1 }]).ok);
  check('bad quantities refused', [0, 11, 1.5, -1, '2'].every(q => !L.priceLines(cat, [{ id: 'ext', q }]).ok));
  check('empty / huge carts refused', !L.priceLines(cat, []).ok && !L.priceLines(cat, Array(21).fill({ id: 'ext', q: 1 })).ok && !L.priceLines(cat, null).ok);
  const cfg = L.cfgOf(seed()['appcfg/customer'], seed()['slots_cfg/default']);
  const b = L.billOf({ priced: L.priceLines(cat, [{ id: 'ext', q: 1 }]), fees: cfg.fees });
  check('bill = app bill(): 149 + 19 convenience + 5% GST = 176.40', b.total === 176.4 && b.convenience === 19 && b.gst === 8.4, b);
  const b2 = L.billOf({ priced: L.priceLines(cat, [{ id: 'ext', q: 1 }]), fees: cfg.fees, passCoverAmt: 149 });
  check('pass covering everything: no convenience fee, total 0', b2.total === 0 && b2.convenience === 0, b2);
  const b3 = L.billOf({ priced: L.priceLines(cat, [{ id: 'seat', q: 1 }]), fees: cfg.fees, useWallet: true, walletBal: 733.5 });
  check('wallet leaves 45 paise to pay: Cashfree minimum ₹1 is charged instead', b3.toPay === 1 && b3.walletUse === 733.5, b3);
  check('wallet split: promo first then cash', JSON.stringify(L.splitDebit({ promo: 30, cash: 100 }, 50)) === JSON.stringify({ promo: 30, cash: 20, short: 0 }));
  check('slot parts read as {from, till} (CORE shape) and [from, till]', cfg.slots.parts.morning[0] === '07:00' && L.cfgOf({}, { parts: { morning: ['08:00', '10:00'] } }).slots.parts.morning[0] === '08:00');
  check('surcharge: fees.slotSurcharge + per-part flat + slots/{date} override', L.surchargeFor(cfg, null, '09:00') === 30 && L.surchargeFor(L.cfgOf({ fees: { surcharge: { morning: 10 }, slotSurcharge: {} } }, {}), null, '09:00') === 10 && L.surchargeFor(cfg, { surcharge: { '09:00': 70 } }, '09:00') === 70);
  check('slot checks: off-grid, closed, sold, full, too far', L.slotProblem(cfg, null, TOMORROW, '09:15', Date.now()) && L.slotProblem(cfg, { closed: true }, TOMORROW, '09:00', Date.now())
    && L.slotProblem(cfg, { sold: ['09:00'] }, TOMORROW, '09:00', Date.now()) && L.slotProblem(cfg, { booked: { '09:00': 1 } }, TOMORROW, '09:00', Date.now())
    && L.slotProblem(cfg, null, istDay(9), '09:00', Date.now()) && !L.slotProblem(cfg, null, TOMORROW, '09:00', Date.now()));
  check('coupon: expired, min order, mode, per-user, first order', !L.couponOff(seed()['coupons/OLD'], 'OLD', 500, 'instant', istDay(0), 0, false).ok
    && !L.couponOff(seed()['coupons/SHINE20'], 'SHINE20', 300, 'instant', istDay(0), 0, false).ok
    && L.couponOff(seed()['coupons/SHINE20'], 'SHINE20', 1000, 'instant', istDay(0), 0, false).off === 150
    && !L.couponOff(seed()['coupons/FIRSTWASH'], 'FIRSTWASH', 400, 'instant', istDay(0), 1, false).ok
    && !L.couponOff(seed()['coupons/FIRSTWASH'], 'FIRSTWASH', 400, 'instant', istDay(0), 0, true).ok
    && !L.couponOff({ type: 'flat', value: 30, modes: ['scheduled'], status: 'live' }, 'X', 400, 'instant', istDay(0), 0, false).ok);
}

(async () => {
  // ================= token =================
  {
    const W = makeWorld(K, seed());
    const r1 = rec(await call(W, 'wd-booking-create', cart(), { auth: '' }));
    const r2 = rec(await call(W, 'wd-booking-create', cart(), { auth: 'Bearer ' + idToken(K, { phone_number: ME, aud: 'other-project' }) }));
    const r3 = rec(await call(W, 'wd-booking-create', cart(), { auth: 'Bearer ' + idToken(K, { phone_number: ME, exp: Math.floor(Date.now() / 1000) - 5 }) }));
    const r4 = rec(await call(W, 'wd-booking-create', cart(), { auth: 'Bearer ' + idToken(K, { phone_number: ME }, { priv: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey }) }));
    const r5 = rec(await call(W, 'wd-booking-create', cart(), { auth: 'Bearer ' + idToken(K, { phone_number: ME }, { kid: 'nope' }) }));
    const r6 = rec(await call(W, 'wd-booking-create', cart(), { auth: 'Bearer ' + idToken(K, {}) }));
    check('no token / wrong aud / expired / forged / unknown kid / no phone: all 401, nothing created', [r1, r2, r3, r4, r5, r6].every(r => r.status === 401) && W.cfOrders.size === 0 && ![...W.docs.keys()].some(k => k.startsWith('payorders/')), [r1, r2, r3, r4, r5, r6].map(r => r.status));
    check('401 message is ready for a toast and says nothing was charged', /Nothing was charged/.test(r1.body.message));
    const r7 = rec(await call(W, 'wd-booking-create', cart(), { env: Object.assign({}, ENV, { FIREBASE_PROJECT_ID: '' }) }));
    check('missing FIREBASE_PROJECT_ID: 503 + alert, never 404', r7.status === 503 && !!r7.alert, r7);
    const r8 = rec(await call(W, 'wd-booking-create', cart(), { env: Object.assign({}, ENV, { FIREBASE_SA_KEY_B64: '' }) }));
    check('missing service account: 503 + alert', r8.status === 503 && /Workflow 13/.test(r8.alert), r8);
  }

  // ================= booking create -> Cashfree -> webhook =================
  {
    const W = makeWorld(K, seed());
    const r = rec(await call(W, 'wd-booking-create', cart({ shownTotal: 176.4 })));
    const o = [...W.cfOrders.values()][0];
    check('instant booking: Cashfree session for the server total 176.40', r.status === 200 && r.body.paymentSessionId && o && o.order_amount === 176.4 && r.body.paid === false && r.body.bookingId && r.body.bookingId.length === 20, r);
    check('Cashfree order: tags kind booking + expectedAmount (workflow 8 accepts it), phone from the TOKEN', o.order_tags.kind === 'booking' && o.order_tags.expectedAmount === '176.4' && o.customer_details.customer_phone === '9876543210', o);
    const po = W.get('payorders/' + r.body.orderId);
    check('payorders doc written: created -> awaiting_payment, lines priced', po && po.status === 'awaiting_payment' && po.amount === 176.4 && po.lines[0].price === 149 && po.phone === ME, po);
    check('no booking doc before payment', !W.get('ondemand/' + r.body.bookingId));
    const again = rec(await call(W, 'wd-booking-create', cart({ shownTotal: 176.4 })));
    check('retry of the same request: same order and session, no second Cashfree order', again.body.orderId === r.body.orderId && again.body.paymentSessionId === r.body.paymentSessionId && W.cfOrders.size === 1, again);
    const cheap = rec(await call(W, 'wd-booking-create', cart({ lines: [{ id: 'ext', variant: 'suv', q: 1 }], shownTotal: 150 })));
    check('phone showed less than the server price: 409, nothing charged', cheap.status === 409 && /now ₹/.test(cheap.body.message) && W.cfOrders.size === 1, cheap);
    const bad = await paid(W, r.body.orderId, 176.4, { badSig: true });
    check('webhook with a bad signature: 401, nothing fulfilled', bad.status === 401 && !W.get('ondemand/' + r.body.bookingId));
    const old = await paid(W, r.body.orderId, 176.4, { ts: Math.floor(Date.now() / 1000) - 900 });
    check('webhook older than 5 minutes: 401', old.status === 401);
    const under = await paid(W, r.body.orderId, 100);
    check('underpaid: not fulfilled, Ravi alerted, 200 (no retry storm)', under.status === 200 && /needs 176.4/.test(under.alert) && !W.get('ondemand/' + r.body.bookingId), under);
    const ok = await paid(W, r.body.orderId, 176.4, { payId: 'P1' });
    const job = W.get('ondemand/' + r.body.bookingId);
    check('paid: ondemand doc with price = Cashfree amount, pay_ref = order (workflow 10 can verify it)', ok.status === 200 && job && job.paid === true && job.price === 176.4 && job.pay_ref === r.body.orderId && job.status === 'new' && job.customer_id === ME && job.washer_id === '', job);
    check('paid: services, address and car on the doc; dispatch asked for; Ravi told', job.services[0].id === 'ext' && job.area === 'GH-9 Paschim Vihar' && job.reg === 'DL3CXY9999' && ok.dispatch === r.body.bookingId && /New instant booking/.test(ok.notify), ok);
    check('payorder marked paid with Cashfree payment id', W.get('payorders/' + r.body.orderId).status === 'paid' && W.get('payorders/' + r.body.orderId).cf_payment_id === 'P1');
    const n = W.commits; const dup = await paid(W, r.body.orderId, 176.4, { payId: 'P1' });
    check('duplicate webhook: 200, nothing written again', dup.status === 200 && W.commits === n && !dup.dispatch, { n, c: W.commits });
    const after = rec(await call(W, 'wd-booking-create', cart({ shownTotal: 176.4 })));
    check('same request after payment (inside 2 min): answers paid, no new order', after.body.paid === true && W.cfOrders.size === 1, after.body);
    const notOurs = await L.handle('wd-pronto-paid', { env: ENV, http: W.http, sd: {}, crypto, now: Date.now() }, (() => { const wh = W.cfWebhook(SECRET, 'WD123ABC', 999); return { headers: wh.headers, rawBody: wh.rawBody }; })());
    check('a workflow-8 order id is ignored by 13 (200)', notOurs.status === 200 && notOurs.body.ignored);
    const other = rec(await call(W, 'wd-booking-create', cart({ addressId: 'a2' })));
    check("someone else's address: 400", other.status === 400, other);
  }

  // ================= wallet pays it all; conflicts retried =================
  {
    const W = makeWorld(K, Object.assign(seed(), { ['wallets/' + ME]: { phone: ME, cash: 300, promo: 50 } }));
    W.failNextCommit = 0;
    const r = rec(await call(W, 'wd-booking-create', cart({ useWallet: true })));
    const w = W.get('wallets/' + ME);
    check('wallet covers 176.40: paid at once, no Cashfree, promo spent first', r.status === 200 && r.body.paid === true && !r.body.paymentSessionId && W.cfOrders.size === 0 && w.promo === 0 && w.cash === 173.6, { r, w });
    const ledger = [...W.docs.entries()].filter(([k]) => k.startsWith('walletledger/')).map(([, d]) => d.data);
    check('ledger rows for both buckets', ledger.length === 2 && ledger.some(l => l.bucket === 'promo' && l.amt === -50) && ledger.some(l => l.bucket === 'cash' && l.amt === -126.4), ledger);
    const job = W.get('ondemand/' + r.body.bookingId);
    check('wallet-only booking: paid, pay_via WD Money, no dispatch (workflow 10 can only verify Cashfree)', job && job.paid && job.pay_via === 'WD Money' && job.pay_ref === '' && job.price === 0);
    W.failNextCommit = 1;
    const r2 = rec(await call(W, 'wd-booking-create', cart({ useWallet: true, lines: [{ id: 'foam', q: 1 }] })));
    check('a conflicting write is retried and succeeds', r2.status === 200 && (r2.body.paid === true || !!r2.body.paymentSessionId), r2);
    const part = rec(await call(W, 'wd-booking-create', cart({ useWallet: true, lines: [{ id: 'seat', variant: 'suv', q: 1 }] })));
    const po = W.get('payorders/' + part.body.orderId), wBefore = W.get('wallets/' + ME);
    check('wallet part + Cashfree rest: wallet NOT debited until the payment lands', part.body.paymentSessionId && po.wallet_use === r2pre(wBefore) && wBefore.cash === W.get('wallets/' + ME).cash, { po, wBefore });
    await paid(W, part.body.orderId, po.amount);
    check('after payment the wallet part is debited', balance(W.get('wallets/' + ME)) === 0, W.get('wallets/' + ME));
    function r2pre(x) { return Math.round((x.cash + x.promo) * 100) / 100; }
    function balance(x) { return Math.round((x.cash + x.promo) * 100) / 100; }
  }

  // ================= scheduled, coupon, surcharge, slot capacity =================
  {
    const W = makeWorld(K, seed());
    const body = cart({ mode: 'scheduled', when: { date: TOMORROW, slot: '09:00' }, lines: [{ id: 'seat', q: 1 }], coupon: 'FIRSTWASH' });
    const r = rec(await call(W, 'wd-booking-create', body));
    const po = W.get('payorders/' + r.body.orderId);
    // 699 - 100 coupon + 30 peak = 629, +5% = 660.45
    check('scheduled + FIRSTWASH + peak slot: 660.45', r.status === 200 && po.total === 660.45 && po.coupon === 'FIRSTWASH' && po.surcharge === 30, po);
    await paid(W, r.body.orderId, 660.45);
    check('paid: slot booked and sold out (capacity 1), coupon redeemed once', W.get('slots/' + TOMORROW).booked['09:00'] === 1 && W.get('slots/' + TOMORROW).sold.includes('09:00') && W.get('couponredemptions/FIRSTWASH_' + ME).count === 1);
    check('scheduled booking doc: status scheduled, slot set', W.get('ondemand/' + r.body.bookingId).status === 'scheduled' && W.get('ondemand/' + r.body.bookingId).slot === '09:00');
    const full = rec(await call(W, 'wd-booking-create', cart({ mode: 'scheduled', when: { date: TOMORROW, slot: '09:00' }, lines: [{ id: 'foam', q: 1 }] })));
    check('full slot refused', full.status === 409 && /fully booked/.test(full.body.message), full);
    const reuse = rec(await call(W, 'wd-booking-create', cart({ mode: 'scheduled', when: { date: TOMORROW, slot: '10:00' }, lines: [{ id: 'seat', q: 1 }], coupon: 'FIRSTWASH' })));
    check('FIRSTWASH again: refused (used / not first order)', reuse.status === 409 && /already used|first booking/.test(reuse.body.message), reuse);
    const cv = rec(await call(W, 'wd-coupon-validate', { code: 'SHINE20', mode: 'instant', lines: [{ id: 'seat', variant: 'suv', q: 1 }] }));
    check('wd-coupon-validate: SHINE20 on 979 -> 150 off', cv.status === 200 && cv.body.valid === true && cv.body.off === 150, cv);
    const cv2 = rec(await call(W, 'wd-coupon-validate', { code: 'SHINE20', mode: 'instant', lines: [{ id: 'ext', q: 1 }] }));
    check('wd-coupon-validate: under min order -> valid:false with the reason', cv2.status === 200 && cv2.body.valid === false && /more to use/.test(cv2.body.message), cv2);
    const cv3 = rec(await call(W, 'wd-coupon-validate', { code: 'NOPE99', mode: 'instant', lines: [{ id: 'ext', q: 1 }] }));
    check('wd-coupon-validate: unknown code -> valid:false', cv3.body.valid === false);
    const rec1 = rec(await call(W, 'wd-booking-create', cart({ mode: 'recurring', recur: { freq: 'weekly', days: [1], slot: '09:00', start: TOMORROW } })));
    check('recurring: refused clearly, nothing charged', rec1.status === 400 && /coming soon/.test(rec1.body.message) && /Nothing was charged/.test(rec1.body.message));
    // reschedule 09:00 -> 10:00: peak charge 30 (+GST) comes back to the wallet
    const mv = rec(await call(W, 'wd-booking-reschedule', { bookingId: r.body.bookingId, date: TOMORROW, slot: '10:00' }));
    check('reschedule off-peak: 31.50 credited to WD Money, slots moved', mv.status === 200 && mv.body.credited === 31.5 && W.get('wallets/' + ME).cash === 31.5 && W.get('slots/' + TOMORROW).booked['09:00'] === 0 && W.get('slots/' + TOMORROW).booked['10:00'] === 1 && !W.get('slots/' + TOMORROW).sold.includes('09:00'), { mv, s: W.get('slots/' + TOMORROW) });
    const mvBack = rec(await call(W, 'wd-booking-reschedule', { bookingId: r.body.bookingId, date: TOMORROW, slot: '09:00' }));
    check('reschedule back to peak: 31.50 taken from WD Money', mvBack.status === 200 && mvBack.body.charged === 31.5 && W.get('wallets/' + ME).cash === 0, mvBack);
    W.put('slots/' + TOMORROW, Object.assign(W.get('slots/' + TOMORROW), { booked: { '09:00': 0, '10:00': 0 }, sold: [] }));
    const mv3 = await call(W, 'wd-booking-reschedule', { bookingId: r.body.bookingId, date: TOMORROW, slot: '10:00' });
    check('moving back to an earlier slot again works (fresh ledger id per move)', mv3.status === 200, mv3);
    W.put('wallets/' + ME, { phone: ME, cash: 10, promo: 0 });
    const mvPeak = rec(await call(W, 'wd-booking-reschedule', { bookingId: r.body.bookingId, date: TOMORROW, slot: '09:00' }));
    check('reschedule to peak with too little WD Money: refused, booking stays', mvPeak.status === 409 && /costs ₹31.50 more/.test(mvPeak.body.message) && W.get('ondemand/' + r.body.bookingId).slot === '10:00', mvPeak);
    const notMine = rec(await call(W, 'wd-booking-reschedule', { bookingId: r.body.bookingId, date: TOMORROW, slot: '11:00' }, { phone: OTHER }));
    check("someone else's booking cannot be moved", notMine.status === 400, notMine);
    // cancel: Cashfree refund of what Cashfree took
    const cx = rec(await call(W, 'wd-booking-cancel', { bookingId: r.body.bookingId }));
    check('cancel: Cashfree refund for the gateway amount, booking cancelled, refund doc', cx.status === 200 && W.cfRefunds.length === 1 && W.cfRefunds[0].refund_amount === 660.45 && W.get('ondemand/' + r.body.bookingId).status === 'cancelled' && cx.body.refund.to === 'source', { cx, rf: W.cfRefunds });
    check('cancel frees the slot', Object.values(W.get('slots/' + TOMORROW).booked).every(v => v === 0), W.get('slots/' + TOMORROW));
    const cx2 = rec(await call(W, 'wd-booking-cancel', { bookingId: r.body.bookingId }));
    check('cancel twice: 409, no second refund', cx2.status === 409 && W.cfRefunds.length === 1);
  }

  // ================= cancel rules =================
  {
    const W = makeWorld(K, Object.assign(seed(), { ['wallets/' + ME]: { phone: ME, cash: 50, promo: 0 } }));
    const r = rec(await call(W, 'wd-booking-create', cart({ useWallet: true })));
    await paid(W, r.body.orderId, W.get('payorders/' + r.body.orderId).amount);
    W.refundFail = true;
    const f = rec(await call(W, 'wd-booking-cancel', { bookingId: r.body.bookingId }));
    check('Cashfree refuses the refund: 502, booking still on, Ravi alerted', f.status === 502 && W.get('ondemand/' + r.body.bookingId).status === 'new' && !!f.alert, f);
    W.refundFail = false;
    const ok = rec(await call(W, 'wd-booking-cancel', { bookingId: r.body.bookingId }));
    check('cancel: wallet part back to WD Money and gateway part refunded', ok.status === 200 && W.get('wallets/' + ME).cash === 50 && W.cfRefunds[0].refund_amount === 126.4 && ok.body.refund.amt === 176.4, { ok, w: W.get('wallets/' + ME), rf: W.cfRefunds });
    const r2 = rec(await call(W, 'wd-booking-create', cart({ lines: [{ id: 'foam', q: 1 }] })));
    await paid(W, r2.body.orderId, W.get('payorders/' + r2.body.orderId).amount);
    W.put('ondemand/' + r2.body.bookingId, Object.assign(W.get('ondemand/' + r2.body.bookingId), { washer_id: 'chotte' }));
    const blocked = rec(await call(W, 'wd-booking-cancel', { bookingId: r2.body.bookingId }));
    check('instant job with a washer assigned: cannot cancel in the app', blocked.status === 409, blocked);
    const theirs = rec(await call(W, 'wd-booking-cancel', { bookingId: r2.body.bookingId }, { phone: OTHER }));
    check("someone else's booking: 400 (not 404)", theirs.status === 400);
    W.put('ondemand/LEGACYDOC00000000001', { service: 'WD Wash', service_id: 'wash', price: 199, paid: true, pay_ref: 'WDOLD1', customer_id: ME, phone: ME, status: 'new', washer_id: '' });
    const legacy = rec(await call(W, 'wd-booking-cancel', { bookingId: 'LEGACYDOC00000000001' }));
    check('old-path paid booking: cancelled, Ravi told to refund by hand', legacy.status === 200 && /by hand/.test(legacy.alert), legacy);
  }

  // ================= pass =================
  {
    const W = makeWorld(K, seed());
    const r = rec(await call(W, 'wd-pass-buy', { plan: 'pass3', via: 'UPI', useWallet: false }));
    check('pass: 349 + 5% = 366.45 on Cashfree', r.status === 200 && W.cfOrders.get(r.body.orderId).order_amount === 366.45 && W.cfOrders.get(r.body.orderId).order_tags.kind === 'pass', r);
    await paid(W, r.body.orderId, 366.45);
    const p = W.get('passes/P' + r.body.orderId);
    check('paid: passes doc active with 3 visits for 30 days', p && p.status === 'active' && p.visits_left === 3 && p.valid_till === istDay(30) && p.phone === ME, p);
    const again = rec(await call(W, 'wd-pass-buy', { plan: 'pass3', via: 'UPI', useWallet: true }));
    check('second pass while one is active: 409', again.status === 409, again);
    const use = rec(await call(W, 'wd-booking-create', cart({ usePass: true })));
    check('booking an exterior wash on the pass: free, paid at once, a visit used', use.body.paid === true && W.get('passes/P' + r.body.orderId).visits_left === 2 && W.cfOrders.size === 1, use);
    const notCovered = rec(await call(W, 'wd-booking-create', cart({ usePass: true, lines: [{ id: 'seat', q: 1 }] })));
    check('pass on a service it does not cover: refused', notCovered.status === 409, notCovered);
    const cx = rec(await call(W, 'wd-booking-cancel', { bookingId: use.body.bookingId }));
    check('cancelling a pass booking returns the visit', cx.status === 200 && W.get('passes/P' + r.body.orderId).visits_left === 3);
    const nope = rec(await call(W, 'wd-pass-buy', { plan: 'gold' }));
    check('unknown pass plan: 400', nope.status === 400);
  }

  // ================= wallet top-up and gift cards =================
  {
    const W = makeWorld(K, seed());
    const r = rec(await call(W, 'wd-wallet-topup', { amount: 500, via: 'UPI' }));
    check('top-up 500: Cashfree order for 500, kind wallet_topup', r.status === 200 && W.cfOrders.get(r.body.orderId).order_amount === 500 && W.cfOrders.get(r.body.orderId).order_tags.kind === 'wallet_topup', r);
    await paid(W, r.body.orderId, 500);
    const w = W.get('wallets/' + ME);
    check('paid: 500 cash + 25 promo cashback, two ledger rows with expiry', w.cash === 500 && w.promo === 25 && [...W.docs.keys()].filter(k => k.startsWith('walletledger/')).length === 2, w);
    check('top-up limits: 50, 10001, 99.5 refused; cap 10000 enforced', (await Promise.all([50, 10001, 99.5].map(a => call(W, 'wd-wallet-topup', { amount: a })))).every(x => rec(x).status === 400)
      && rec(await call(W, 'wd-wallet-topup', { amount: 9600 })).status === 400);
    const g = rec(await call(W, 'wd-gift-claim', { code: 'wdgift-1234' }));
    check('gift card: 500 added, card marked used by me', g.status === 200 && g.body.amount === 500 && W.get('wallets/' + ME).cash === 1000 && W.get('giftcards/WDGIFT1234').used_by === ME, g);
    const g2 = rec(await call(W, 'wd-gift-claim', { code: 'WDGIFT1234' }));
    const g3 = rec(await call(W, 'wd-gift-claim', { code: 'WDGIFT1234' }, { phone: OTHER }));
    check('gift card twice: 409 for me, refused for someone else', g2.status === 409 && g3.status === 400 && W.get('wallets/' + OTHER) === undefined);
    for (let i = 0; i < 5; i++) await call(W, 'wd-gift-claim', { code: 'WRONG00' + i + 'X' }, { phone: '+919000000001' });
    const g4 = rec(await call(W, 'wd-gift-claim', { code: 'WDGIFT9999' }, { phone: '+919000000001' }));
    check('5 wrong gift codes in an hour: 429', g4.status === 429, g4);
  }

  // ================= switches =================
  {
    const s = seed(); s['appcfg/customer'] = Object.assign({}, s['appcfg/customer'], { features: { topup: false }, instant: { on: true, busy: true, busyMessage: 'Busy!' } });
    const W = makeWorld(K, s);
    check('features.topup off: 403', rec(await call(W, 'wd-wallet-topup', { amount: 500 })).status === 403);
    const b = rec(await call(W, 'wd-booking-create', cart()));
    check('instant.busy: refused with the admin message', b.status === 409 && /Busy!/.test(b.body.message), b);
    s['appcfg/customer'] = { maintenance: { on: true } };
    const W2 = makeWorld(K, s);
    check('maintenance on: 503', rec(await call(W2, 'wd-pass-buy', { plan: 'pass3' })).status === 503);
    const W3 = makeWorld(K, seed()); W3.cfFail = true;
    const down = rec(await call(W3, 'wd-wallet-topup', { amount: 500 }));
    check('Cashfree down: 502 + alert, payorder marked failed', down.status === 502 && !!down.alert && [...W3.docs.entries()].some(([k, d]) => k.startsWith('payorders/') && d.data.status === 'failed'), down);
  }
  check('no app-facing reply is ever a 404 (the app would read it as "not live yet")', all.every(r => r.status !== 404), all.filter(r => r.status === 404));
  check('every error reply has ok:false and a message', all.filter(r => r.status >= 400).every(r => r.body.ok === false && typeof r.body.message === 'string' && r.body.message.length > 5));

  // ================= the built workflow JSON, end to end =================
  {
    const W = makeWorld(K, seed()); const sd13 = {}, sd8 = {};
    W.route = async o => {
      if (o.url === 'http://localhost:5678/webhook/wd-pronto-paid') {
        const headers = Object.fromEntries(Object.entries(o.headers).map(([k, v]) => [k.toLowerCase(), v]));
        const log = await run(WF13, 'Paisa aaya (from workflow 8) (webhook)', { json: { headers, body: JSON.parse(o.body) }, binary: { data: { data: Buffer.from(o.body, 'utf8').toString('base64') } } }, { env: ENV, staticData: sd13, http: W.http });
        W.lastPronto = log; return { statusCode: log.response.code, body: log.response.body };
      }
    };
    const log = await run(WF13, 'Booking banao (webhook)', { json: { headers: { authorization: tok() }, body: cart() } }, { env: ENV, staticData: sd13, http: W.http });
    check('13-pronto.json: wd-booking-create answers 200 with a session through Webhook -> Code -> Respond', log.response && log.response.code === 200 && log.response.body.paymentSessionId, log.response);
    const oid = log.response.body.orderId, wh = W.cfWebhook(SECRET, oid, 176.4);
    const log8 = await run(WF8, 'Cashfree bola (webhook)', { json: { headers: wh.headers, body: JSON.parse(wh.rawBody) }, binary: { data: { data: Buffer.from(wh.rawBody).toString('base64') } } }, { env: ENV, staticData: sd8, http: W.http });
    check('workflow 8 (patched): a Pronto payment is forwarded to 13 and Cashfree gets 200', log8.response && log8.response.code === 200 && log8.order.includes('Pronto ko bhejo (workflow 13)') && !log8.order.includes('Gaadi dhoondo'), { r: log8.response, order: log8.order });
    check('...and 13 fulfilled it: booking doc, Telegram line, workflow 10 called for the instant job', W.get('ondemand/' + log.response.body.bookingId) && W.lastPronto.telegram.length === 1 && W.dispatches.length === 1 && W.dispatches[0].doc_id === log.response.body.bookingId, { tg: W.lastPronto.telegram, d: W.dispatches });
    const bad = W.cfWebhook(SECRET, oid, 176.4, { badSig: true });
    const log8b = await run(WF8, 'Cashfree bola (webhook)', { json: { headers: bad.headers, body: JSON.parse(bad.rawBody) }, binary: { data: { data: Buffer.from(bad.rawBody).toString('base64') } } }, { env: ENV, staticData: sd8, http: W.http });
    check('workflow 8 still refuses a bad signature before anything is forwarded', log8b.response.code === 401 && !log8b.order.includes('Pronto ko bhejo (workflow 13)'), { r: log8b.response, o: log8b.order });
    // a tip still takes the old path
    W.cfOrders.set('WDTIP1', { order_id: 'WDTIP1', order_tags: { kind: 'tip', expectedAmount: '50', months: '0' }, order_note: 'Tip' });
    const tw = W.cfWebhook(SECRET, 'WDTIP1', 50);
    const log8t = await run(WF8, 'Cashfree bola (webhook)', { json: { headers: tw.headers, body: JSON.parse(tw.rawBody) }, binary: { data: { data: Buffer.from(tw.rawBody).toString('base64') } } }, { env: ENV, staticData: sd8, http: W.http }).catch(e => ({ err: e.message, order: [] }));
    check('workflow 8: a tip does NOT take the Pronto branch', !log8t.order.includes('Pronto ko bhejo (workflow 13)') && log8t.order.includes('Pronto order?'), log8t.order);
    const s13 = JSON.stringify(WF13) + JSON.stringify(WF8);
    check('no secrets in either workflow file', !/BEGIN (RSA )?PRIVATE KEY|cf_test_secret|TEST_APP_ID|ya29\./.test(s13));
    check('every 13 webhook path is unique and POST', new Set(WF13.nodes.filter(n => n.type.endsWith('webhook')).map(n => n.parameters.path)).size === 8 && WF13.nodes.filter(n => n.type.endsWith('webhook')).every(n => n.parameters.httpMethod === 'POST'));
  }
  console.log(`# pass ${pass}  fail ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
