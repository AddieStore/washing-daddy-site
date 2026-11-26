// node n8n/13-pronto/test.mjs — offline tests for workflow 13 and the Pronto branch of workflow 8.
// Real RSA keys (Firebase ID tokens, service-account JWT), real HMAC (Cashfree webhook), fake servers (tests/fakes.mjs).
import fs from 'node:fs'; import crypto from 'node:crypto';
import { keys, idToken, makeWorld, PROJECT } from './tests/fakes.mjs';
import { run } from './tests/runner.mjs';

const src = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const L = new Function(src + '; return { handle, billOf, recurBillOf, recurDates, priceLines, couponOff, cfgOf, slotProblem, surchargeFor, splitDebit, r9 };')();
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

  // ================= service areas + waitlist =================
  {
    const sd = seed();
    sd['addresses/far'] = { phone: ME, label: 'Office', flat: '4th floor', area: 'Cyber City, Gurugram', lat: 28.4950, lng: 77.0895 };
    sd['addresses/nopin'] = { phone: ME, label: 'Other', flat: 'B-12', area: 'Paschim Vihar' };
    const W = makeWorld(K, sd);
    const far = rec(await call(W, 'wd-booking-create', cart({ addressId: 'far' })));
    check('address outside every service circle: 409, not available, nothing charged, no order', far.status === 409 && /not available at this address/.test(far.body.message) && /Nothing was charged/.test(far.body.message) && W.cfOrders.size === 0, far);
    const nopin = rec(await call(W, 'wd-booking-create', cart({ addressId: 'nopin' })));
    check('address without map coordinates is refused too', nopin.status === 409 && W.cfOrders.size === 0, nopin);
    const near = rec(await call(W, 'wd-booking-create', cart()));
    check('address inside the built-in Paschim Vihar circle still books', near.status === 200 && near.body.ok !== false, near);
    // the dashboard draws Gurugram and drops Paschim Vihar
    const sd2 = seed(); sd2['addresses/far'] = sd['addresses/far'];
    sd2['appcfg/customer'] = Object.assign({}, sd2['appcfg/customer'], { areas: [{ id: 'ggn', name: 'Cyber City', lat: 28.4950, lng: 77.0890, r: 2000 }, { id: 'junk', lat: 99, lng: 0, r: 5 }] });
    const W2 = makeWorld(K, sd2);
    const ggn = rec(await call(W2, 'wd-booking-create', cart({ addressId: 'far' })));
    const pv = rec(await call(W2, 'wd-booking-create', cart({ addressId: 'a1', lines: [{ id: 'foam', q: 1 }] })));
    check('dashboard circles replace the built-in one (junk entries ignored)', ggn.status === 200 && pv.status === 409, [ggn.status, pv.status]);
    // Notify me
    const w0 = rec(await call(W, 'wd-waitlist', { lat: 28.4950, lng: 77.0895, area: 'Cyber City', name: 'Asha' }, { auth: '' }));
    check('waitlist needs a signed-in customer', w0.status === 401, w0);
    const w1 = rec(await call(W, 'wd-waitlist', { lat: 28.4950, lng: 77.0895, area: 'Cyber City', name: 'Asha' }));
    const doc = (W.docs.get('waitlist/' + ME) || {}).data;
    check('waitlist: saved under the verified number with the spot, Ravi told once', w1.status === 200 && w1.body.ok === true && doc && doc.phone === ME && doc.area === 'Cyber City' && doc.asks === 1 && doc.inside === false && doc.status === 'waiting' && /Notify me/.test(w1.notify || ''), { w1, doc });
    const w2 = rec(await call(W, 'wd-waitlist', { lat: 28.4960, lng: 77.0900, area: 'Cyber City', phone: OTHER }));
    const doc2 = (W.docs.get('waitlist/' + ME) || {}).data;
    check('asking again moves the spot and counts it; a phone in the body is ignored; no second Telegram line', w2.status === 200 && doc2.asks === 2 && doc2.lat === 28.4960 && doc2.name === 'Asha' && !W.docs.get('waitlist/' + OTHER) && !w2.notify, doc2);
    check('waitlist answers how many are waiting nearby, and a peek writes nothing', w1.body.near === 1 && w1.body.goal === 25, w1.body);
    const pk = rec(await call(W, 'wd-waitlist', { lat: 28.4955, lng: 77.0898, peek: true }));
    check('peek: counts neighbours within 1.5 km without saving', pk.status === 200 && pk.body.near === 1 && pk.body.goal === 25 && !pk.notify, pk.body);
    const w3 = rec(await call(W, 'wd-waitlist', { lat: 0, lng: 0 }));
    check('waitlist: a spot outside India is refused', w3.status === 400, w3);
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
  // ================= recurring: the first month is paid up front =================
  {
    const s0 = seed(); s0['coupons/REC50'] = { type: 'flat', value: 50, minOrder: 0, modes: ['recurring'], perUser: 1, validTill: '2099-12-31', status: 'live' };
    const W = makeWorld(K, s0);
    const dow = new Date(TOMORROW + 'T00:00:00Z').getUTCDay(), plus = n => new Date(Date.parse(TOMORROW + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    const R = (o = {}) => cart(Object.assign({ mode: 'recurring', recur: { freq: 'weekly', days: [dow], slot: '10:00', start: TOMORROW } }, o));
    // 149 - 10% (15) = 134 + 19 convenience = 153 + 5% GST = 160.65 a visit; 4 visits = 642.60
    const pv = rec(await call(W, 'wd-booking-create', R({ shownTotal: 160.65 })));
    check('recurring: app showing only one visit (160.65) is refused, the month is 642.60, nothing charged', pv.status === 409 && /642\.6/.test(pv.body.message) && W.cfOrders.size === 0, pv);
    const r = rec(await call(W, 'wd-booking-create', R({ shownTotal: 642.6 })));
    const po = W.get('payorders/' + r.body.orderId), o = W.cfOrders.get(r.body.orderId);
    check('recurring: one order for the first month 642.60 (4 visits x 160.65)', r.status === 200 && o && o.order_amount === 642.6 && po.amount === 642.6 && po.total === 642.6 && po.per_visit === 160.65 && po.visits === 4, { r: r.body, po });
    check('recurring: visit dates are the picked weekday, weekly from the start day', JSON.stringify(po.dates) === JSON.stringify([TOMORROW, plus(7), plus(14), plus(21)]), po.dates);
    check('recurring: nothing booked before payment', !W.get('ondemand/' + r.body.bookingId));
    const ok = await paid(W, r.body.orderId, 642.6, { payId: 'PR1' });
    const jobs = [...W.docs.entries()].filter(([k, d]) => k.startsWith('ondemand/') && d.data.payorder_id === r.body.orderId).map(([, d]) => d.data).sort((a, b) => a.visit_no - b.visit_no);
    check('recurring paid: 4 scheduled visits, first one is the bookingId the app waits for', ok.status === 200 && jobs.length === 4 && W.get('ondemand/' + r.body.bookingId).visit_no === 1 && jobs.every(j => j.status === 'scheduled' && j.paid && j.slot === '10:00' && j.recur === 'weekly' && j.series_id === r.body.bookingId), jobs.map(j => [j.date, j.visit_no]));
    check('recurring paid: the visit shares add up to exactly what was paid', Math.round(jobs.reduce((a, j) => a + j.share_gateway, 0) * 100) === 64260 && jobs.every(j => j.order_paid === 642.6), jobs.map(j => j.share_gateway));
    check('recurring paid: each visit takes its slot (tomorrow 10:00 is now sold out)', W.get('slots/' + TOMORROW).booked['10:00'] === 1 && W.get('slots/' + plus(21)).booked['10:00'] === 1);
    check('recurring: Ravi told about the series', /recurring booking/.test(ok.notify || ''), ok.notify);
    const dup = await paid(W, r.body.orderId, 642.6, { payId: 'PR1' });
    check('recurring: duplicate webhook books nothing twice', dup.status === 200 && [...W.docs.keys()].filter(k => k.startsWith('ondemand/')).length === 4);
    const second = jobs[1], secondId = [...W.docs.entries()].find(([k, d]) => k.startsWith('ondemand/') && d.data.payorder_id === r.body.orderId && d.data.visit_no === 2)[0].slice('ondemand/'.length);
    const c1 = rec(await call(W, 'wd-booking-cancel', { bookingId: secondId }));
    check('cancel one visit: refunds only that visit (160.65), not the month', c1.status === 200 && W.cfRefunds.length === 1 && W.cfRefunds[0].refund_amount === 160.65 && c1.body.refund.amt === 160.65, { c1, rf: W.cfRefunds });
    const c2 = rec(await call(W, 'wd-booking-cancel', { bookingId: secondId }));
    check('the same visit cannot be refunded twice', c2.status === 409 && W.cfRefunds.length === 1, c2);
    check('the other visits stay booked', W.get('ondemand/' + r.body.bookingId).status === 'scheduled' && second.date === plus(7));
    // coupon once (first visit only), WD Money first
    const W2 = makeWorld(K, Object.assign(s0, { ['wallets/' + ME]: { phone: ME, cash: 100, promo: 0 } }));
    const cv = rec(await call(W2, 'wd-coupon-validate', { code: 'REC50', mode: 'recurring', recur: { freq: 'weekly' }, lines: [{ id: 'ext', variant: 'hatch', q: 1 }] }));
    check('coupon validate in recurring mode: REC50 50 off', cv.status === 200 && cv.body.valid === true && cv.body.off === 50, cv);
    // first visit 134 - 50 = 84 + 19 = 103 + GST 5.15 = 108.15; month = 3 x 160.65 + 108.15 = 590.10; minus 100 WD Money = 490.10
    const r2 = rec(await call(W2, 'wd-booking-create', R({ coupon: 'REC50', useWallet: true, shownTotal: 590.1 })));
    const po2 = W2.get('payorders/' + r2.body.orderId);
    check('recurring + coupon (once) + WD Money: total 590.10, wallet 100, card 490.10', r2.status === 200 && po2.total === 590.1 && po2.wallet_use === 100 && po2.amount === 490.1 && po2.first_visit === 108.15 && W2.cfOrders.get(r2.body.orderId).order_amount === 490.1, po2);
    await paid(W2, r2.body.orderId, 490.1);
    const js2 = [...W2.docs.entries()].filter(([k, d]) => k.startsWith('ondemand/') && d.data.payorder_id === r2.body.orderId).map(([, d]) => d.data);
    check('recurring + wallet: 100 taken from WD Money once, coupon redeemed once, wallet shares add up', W2.get('wallets/' + ME).cash === 0 && W2.get('couponredemptions/REC50_' + ME).count === 1 && Math.round(js2.reduce((a, j) => a + j.share_wallet_cash, 0) * 100) === 10000, js2.map(j => j.share_wallet_cash));
    const bad = rec(await call(W2, 'wd-booking-create', R({ recur: { freq: 'twice', days: [1], slot: '10:00', start: TOMORROW } })));
    check('twice a week with one day picked: 400, nothing charged', bad.status === 400 && /two days/.test(bad.body.message), bad);
    const alt = rec(await call(makeWorld(K, seed()), 'wd-booking-create', R({ recur: { freq: 'alt', days: [0, 1, 2, 3, 4, 5, 6], slot: '10:00', start: TOMORROW } })));
    check('alternate days: 15 visits every other day', alt.status === 200 && alt.body.paymentSessionId, alt);
    const s3 = seed(); s3['appcfg/customer'] = Object.assign({}, s3['appcfg/customer'], { features: { recurring: false }, recurring: { weekly: { visits: 5, off: 0 } } });
    const offR = rec(await call(makeWorld(K, s3), 'wd-booking-create', R()));
    check('recurring switched off in the dashboard: 403', offR.status === 403, offR);
    const s4 = seed(); s4['appcfg/customer'] = Object.assign({}, s4['appcfg/customer'], { recurring: { weekly: { visits: 5, off: 0 } } });
    const W4 = makeWorld(K, s4), r4 = rec(await call(W4, 'wd-booking-create', R()));
    // 149 + 19 = 168 + 8.40 = 176.40 a visit, 5 visits = 882
    check('dashboard visits/off override (5 visits, 0% off): 882.00', r4.status === 200 && W4.get('payorders/' + r4.body.orderId).amount === 882, W4.get('payorders/' + r4.body.orderId));
  }
  // ================= Razorpay first, Cashfree backup =================
  {
    const RK = 'rzp_test_secret_not_real', RHOOK = 'rzp_hook_secret_not_real';
    const RENV = Object.assign({}, ENV, { RAZORPAY_KEY_ID: 'rzp_test_KEYID', RAZORPAY_KEY_SECRET: RK, RAZORPAY_WEBHOOK_SECRET: RHOOK });
    const fakeRzp = W => {
      W.rzOrders = new Map(); W.rzPays = new Map(); W.rzRefunds = []; W.rzFail = false; let n = 0;
      W.route = async o => {
        if (!o.url.startsWith('https://api.razorpay.com/v1/')) return null;
        const res = (statusCode, body) => ({ statusCode, body, headers: {} });
        if (o.headers.Authorization !== 'Basic ' + Buffer.from('rzp_test_KEYID:' + RK).toString('base64')) return res(401, { error: { code: 'BAD_REQUEST_ERROR', description: 'auth' } });
        const p = o.url.slice('https://api.razorpay.com/v1'.length);
        if (o.method === 'POST' && p === '/orders') {
          if (W.rzFail) return res(500, { error: { description: 'down' } });
          const ord = Object.assign({ id: 'order_Rz' + String(++n).padStart(8, '0'), status: 'created', amount_paid: 0 }, o.body); W.rzOrders.set(ord.id, ord); return res(200, ord);
        }
        let m = /^\/payments\/([^/]+)$/.exec(p);
        if (o.method === 'GET' && m) { const x = W.rzPays.get(m[1]); return x ? res(200, x) : res(400, { error: { description: 'no payment' } }); }
        m = /^\/payments\/([^/]+)\/capture$/.exec(p);
        if (o.method === 'POST' && m) { const x = W.rzPays.get(m[1]); x.status = 'captured'; return res(200, x); }
        m = /^\/payments\/([^/]+)\/refund$/.exec(p);
        if (o.method === 'POST' && m) { W.rzRefunds.push(Object.assign({ payment_id: m[1] }, o.body)); return res(200, { id: 'rfnd_1', status: 'processed' }); }
        return res(400, { error: { description: 'fake razorpay: no route ' + p } });
      };
    };
    // what Razorpay Checkout hands the app after a payment
    const payRz = (W, rzOrderId, o = {}) => {
      const ord = W.rzOrders.get(rzOrderId), id = 'pay_Rz' + Math.floor(Math.random() * 1e9);
      W.rzPays.set(id, { id, order_id: rzOrderId, amount: o.amount || ord.amount, currency: 'INR', status: o.status || 'captured', method: 'upi' });
      return { razorpay_order_id: rzOrderId, razorpay_payment_id: id, razorpay_signature: crypto.createHmac('sha256', o.key || RK).update(rzOrderId + '|' + id).digest('hex') };
    };
    const rc = (W, body, opt = {}) => call(W, 'wd-rzp-confirm', body, Object.assign({ env: RENV }, opt));

    const W = makeWorld(K, seed()); fakeRzp(W);
    const r = rec(await call(W, 'wd-booking-create', Object.assign(cart(), { rzp: true }), { env: RENV }));
    const ro = r.body.razorpay || {};
    check('rzp:true -> Razorpay order for 17640 paise, receipt = our order, key id only (never the secret)', r.status === 200 && r.body.gateway === 'razorpay' && ro.amount === 17640 && ro.keyId === 'rzp_test_KEYID'
      && W.rzOrders.get(ro.orderId).receipt === r.body.orderId && W.cfOrders.size === 0 && !JSON.stringify(r.body).includes(RK), r);
    check('payorder remembers the Razorpay order', W.get('payorders/' + r.body.orderId).rzp_order_id === ro.orderId && W.get('payorders/' + r.body.orderId).gateway === 'razorpay');
    const again = rec(await call(W, 'wd-booking-create', Object.assign(cart(), { rzp: true }), { env: RENV }));
    check('same request again: same Razorpay order, no second one', again.body.razorpay && again.body.razorpay.orderId === ro.orderId && W.rzOrders.size === 1, again);
    const old = rec(await call(W, 'wd-booking-create', cart(), { env: RENV }));
    check('older app (no rzp flag) on the same request: switched to a Cashfree session', old.status === 200 && !!old.body.paymentSessionId && old.body.orderId === r.body.orderId, old);
    const okP = payRz(W, ro.orderId);
    const forged = rec(await rc(W, Object.assign({ orderId: r.body.orderId }, okP, { razorpay_signature: 'a'.repeat(64) })));
    check('forged signature: 400 + alert, nothing fulfilled', forged.status === 400 && !!forged.alert && !W.get('ondemand/' + r.body.bookingId), forged);
    const thief = rec(await rc(W, Object.assign({ orderId: r.body.orderId }, okP), { phone: OTHER }));
    check('someone else confirming my order: refused', thief.status === 400 && !W.get('ondemand/' + r.body.bookingId), thief);
    const conf = rec(await rc(W, Object.assign({ orderId: r.body.orderId }, okP)));
    const job = W.get('ondemand/' + r.body.bookingId);
    check('confirm: paid, booking doc via Razorpay with the payment id', conf.status === 200 && conf.body.paid === true && conf.body.bookingId === r.body.bookingId && job && job.paid && job.pay_via === 'Razorpay' && job.gateway_ref === okP.razorpay_payment_id && job.price === 176.4, { conf, job });
    check('payorder paid via razorpay', W.get('payorders/' + r.body.orderId).paid_gateway === 'razorpay' && W.get('payorders/' + r.body.orderId).rzp_payment_id === okP.razorpay_payment_id);
    const conf2 = rec(await rc(W, Object.assign({ orderId: r.body.orderId }, okP)));
    check('confirm twice: still paid, nothing written again', conf2.body.paid === true && !conf2.notify);
    const hookBody = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: ro.orderId, receipt: r.body.orderId, amount_paid: 17640, currency: 'INR' } }, payment: { entity: { id: okP.razorpay_payment_id, method: 'upi' } } } });
    const hook = h => L.handle('wd-rzp-hook', { env: RENV, http: W.http, sd: W.sd, crypto, now: Date.now() }, { headers: { 'x-razorpay-signature': h }, rawBody: hookBody });
    const hk = await hook(crypto.createHmac('sha256', RHOOK).update(hookBody).digest('hex'));
    check('webhook after the app confirmed: 200, no double booking', hk.status === 200 && !hk.notify, hk);
    const hkBad = await hook(crypto.createHmac('sha256', 'wrong').update(hookBody).digest('hex'));
    check('webhook with a bad signature: 401', hkBad.status === 401);
    const cx = rec(await call(W, 'wd-booking-cancel', { bookingId: r.body.bookingId }, { env: RENV }));
    check('cancel a Razorpay booking: Razorpay refund for 17640 paise, not Cashfree', cx.status === 200 && W.rzRefunds.length === 1 && W.rzRefunds[0].amount === 17640 && W.rzRefunds[0].payment_id === okP.razorpay_payment_id && W.cfRefunds.length === 0, { cx, rz: W.rzRefunds });

    // app closed before confirming: the webhook fulfils it
    const Wh = makeWorld(K, seed()); fakeRzp(Wh);
    const p2 = rec(await call(Wh, 'wd-pass-buy', { plan: 'pass3', rzp: true }, { env: RENV }));
    const rp2 = payRz(Wh, p2.body.razorpay.orderId);
    const body2 = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: p2.body.razorpay.orderId, receipt: p2.body.orderId, amount_paid: p2.body.razorpay.amount, currency: 'INR' } }, payment: { entity: { id: rp2.razorpay_payment_id, method: 'card' } } } });
    const hk2 = await L.handle('wd-rzp-hook', { env: RENV, http: Wh.http, sd: Wh.sd, crypto, now: Date.now() }, { headers: { 'x-razorpay-signature': crypto.createHmac('sha256', RHOOK).update(body2).digest('hex') }, rawBody: body2 });
    check('webhook alone (app closed): pass activated', hk2.status === 200 && Wh.get('passes/P' + p2.body.orderId) && Wh.get('passes/P' + p2.body.orderId).status === 'active', hk2);
    const late = rec(await rc(Wh, Object.assign({ orderId: p2.body.orderId }, rp2)));
    check('app confirms after the webhook: answers paid', late.status === 200 && late.body.paid === true, late);

    // underpaid / authorised-only / Razorpay down / backup asked for
    const Wu = makeWorld(K, seed()); fakeRzp(Wu);
    const t3 = rec(await call(Wu, 'wd-wallet-topup', { amount: 500, rzp: true }, { env: RENV }));
    const under = rec(await rc(Wu, Object.assign({ orderId: t3.body.orderId }, payRz(Wu, t3.body.razorpay.orderId, { amount: 100 }))));
    check('payment for less than the order: 502 + alert, no money added', under.status === 502 && !!under.alert && !Wu.get('wallets/' + ME), under);
    const auth = rec(await rc(Wu, Object.assign({ orderId: t3.body.orderId }, payRz(Wu, t3.body.razorpay.orderId, { status: 'authorized' }))));
    check('authorised-only payment is captured then fulfilled', auth.body.paid === true && Wu.get('wallets/' + ME).cash === 500, auth);
    const Wd = makeWorld(K, seed()); fakeRzp(Wd); Wd.rzFail = true;
    const dn = rec(await call(Wd, 'wd-booking-create', Object.assign(cart(), { rzp: true }), { env: RENV }));
    check('Razorpay down: Cashfree session instead + alert', dn.status === 200 && dn.body.gateway === 'cashfree' && !!dn.body.paymentSessionId && /Razorpay order failed/.test(dn.alert || ''), dn);
    const Wb = makeWorld(K, seed()); fakeRzp(Wb);
    const b1 = rec(await call(Wb, 'wd-booking-create', Object.assign(cart(), { rzp: true }), { env: RENV }));
    const b2 = rec(await call(Wb, 'wd-booking-create', Object.assign(cart(), { rzp: true, gateway: 'cashfree' }), { env: RENV }));
    check('backup asked for on the same order: Cashfree session for the same order id', b2.status === 200 && b2.body.gateway === 'cashfree' && b2.body.orderId === b1.body.orderId && !!b2.body.paymentSessionId, b2);
    const Wn = makeWorld(K, seed());
    const nokeys = rec(await call(Wn, 'wd-booking-create', Object.assign(cart(), { rzp: true })));
    check('no Razorpay keys on the server: Cashfree as before', nokeys.status === 200 && nokeys.body.gateway === 'cashfree' && !!nokeys.body.paymentSessionId, nokeys);
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
    check('no secrets in either workflow file', !/BEGIN (RSA )?PRIVATE KEY|cf_test_secret|rzp_test_secret|rzp_hook_secret|TEST_APP_ID|ya29\./.test(s13));
    check('every 13 webhook path is unique and POST', new Set(WF13.nodes.filter(n => n.type.endsWith('webhook')).map(n => n.parameters.path)).size === 11 && WF13.nodes.filter(n => n.type.endsWith('webhook')).every(n => n.parameters.httpMethod === 'POST'));
  }
  console.log(`# pass ${pass}  fail ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
