// node n8n/14-razorpay-autopay/test.mjs — offline tests for workflow 14 (Razorpay autopay for monthly plans).
// Real RSA keys (Firebase ID tokens, service account), real HMAC (checkout + webhook signatures), fake Google /
// Firestore (../13-pronto/tests/fakes.mjs) and a fake Razorpay below. The built JSON is run end to end too.
import fs from 'node:fs'; import crypto from 'node:crypto';
import { keys, idToken, makeWorld, PROJECT } from '../13-pronto/tests/fakes.mjs';
import { run } from '../13-pronto/tests/runner.mjs';

const src = fs.readFileSync(new URL('../13-pronto/lib.js', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('./sub.js', import.meta.url), 'utf8');
const L = new Function(src + '; return { handleSub, planFrom, advanceMonth, hmacHex };')();
const WF = JSON.parse(fs.readFileSync(new URL('./14-razorpay-autopay.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } };

const K = keys(), RK = 'rzp_test_secret_not_real', RHOOK = 'rzp_hook_secret_not_real', KEYID = 'rzp_test_KEYID';
const ENV = { FIREBASE_PROJECT_ID: PROJECT, RAZORPAY_KEY_ID: KEYID, RAZORPAY_KEY_SECRET: RK, RAZORPAY_WEBHOOK_SECRET: RHOOK, TELEGRAM_CHAT_ID: '1',
  FIREBASE_SA_KEY_B64: Buffer.from(JSON.stringify({ client_email: 'n8n@wd-test.iam.gserviceaccount.com', private_key: K.saPrivPem })).toString('base64') };
const ME = '+919876543210', OTHER = '+919811100000';
const tok = (phone = ME) => 'Bearer ' + idToken(K, { phone_number: phone, sub: 'uid-' + phone.slice(-4) });
const istDay = off => new Date(Date.now() + 5.5 * 3600e3 + off * 864e5).toISOString().slice(0, 10);
const TODAY = istDay(0);
const plusMonth = iso => L.advanceMonth(iso, '0000-00-00');

const seed = () => ({
  'appcfg/customer': { maintenance: { on: false }, features: { plans: true } },
  'catalog/std': { kind: 'plan', name: 'WD Standard', price: 1099, status: 'live' },
  'catalog/pro': { kind: 'plan', name: 'WD Pro', price: 1800, status: 'live' },
  'catalog/exc': { kind: 'plan', name: 'WD Exclusive', price: 2500, status: 'hidden' },
  ['customers/' + ME]: { phone: ME, name: 'Asha', status: 'active', cars: [{ id: 'c0', name: 'Creta', plate: 'DL3CXY9999', plan: 'std', till: istDay(10) }, { id: 'c1', name: 'City', plate: 'DL8CAB1234', plan: 'pro', till: istDay(-5) }] },
  ['customers/' + OTHER]: { phone: OTHER, name: 'Ravi', status: 'new', cars: [{ id: 'c0', name: 'Swift', plate: 'DL1AA0001', plan: 'std', till: null }] },
});
// a small Razorpay: plans, subscriptions, payments
function fakeRzp(W) {
  W.rzPlans = []; W.rzSubs = new Map(); W.rzPays = new Map(); W.rzCancels = []; let n = 0;
  W.route = async o => {
    if (!o.url.startsWith('https://api.razorpay.com/v1/')) return null;
    const res = (statusCode, body) => ({ statusCode, body, headers: {} });
    if (o.headers.Authorization !== 'Basic ' + Buffer.from(KEYID + ':' + RK).toString('base64')) return res(401, { error: { code: 'BAD_REQUEST_ERROR', description: 'auth' } });
    const p = o.url.slice('https://api.razorpay.com/v1'.length);
    if (o.method === 'POST' && p === '/plans') { const pl = Object.assign({ id: 'plan_Fk' + String(++n).padStart(8, '0') }, o.body); W.rzPlans.push(pl); return res(200, pl); }
    if (o.method === 'POST' && p === '/subscriptions') {
      if (!W.rzPlans.some(x => x.id === o.body.plan_id)) return res(400, { error: { description: 'no such plan' } });
      const s = Object.assign({ id: 'sub_Fk' + String(++n).padStart(8, '0'), status: 'created' }, o.body); W.rzSubs.set(s.id, s); return res(200, s);
    }
    let m = /^\/subscriptions\/([^/]+)$/.exec(p);
    if (o.method === 'GET' && m) { const s = W.rzSubs.get(m[1]); return s ? res(200, s) : res(400, { error: { description: 'no sub' } }); }
    m = /^\/subscriptions\/([^/]+)\/cancel$/.exec(p);
    if (o.method === 'POST' && m) { const s = W.rzSubs.get(m[1]); W.rzCancels.push({ id: m[1], body: o.body }); if (!o.body.cancel_at_cycle_end) s.status = 'cancelled'; return res(200, s); }
    m = /^\/payments\/([^/]+)$/.exec(p);
    if (o.method === 'GET' && m) { const x = W.rzPays.get(m[1]); return x ? res(200, x) : res(400, { error: { description: 'no payment' } }); }
    m = /^\/payments\/([^/]+)\/capture$/.exec(p);
    if (o.method === 'POST' && m) { const x = W.rzPays.get(m[1]); x.status = 'captured'; return res(200, x); }
    return res(400, { error: { description: 'fake razorpay: no route ' + p } });
  };
}
const world = (s = seed()) => { const W = makeWorld(K, s); fakeRzp(W); W.sd = {}; return W; };
const call = (W, name, body, opt = {}) => L.handleSub(name, { env: opt.env || ENV, http: W.http, sd: W.sd, crypto, now: opt.now || Date.now() },
  { headers: { authorization: opt.auth === undefined ? tok(opt.phone) : opt.auth }, body });
// the customer authorises the mandate in Razorpay Checkout: Razorpay charges the plan and hands back a signed result
const checkout = (W, subId, o = {}) => {
  const s = W.rzSubs.get(subId), plan = W.rzPlans.find(x => x.id === s.plan_id), id = 'pay_Fk' + Math.floor(Math.random() * 1e9);
  s.status = o.subStatus || 'active';
  W.rzPays.set(id, { id, amount: o.amount || plan.item.amount, currency: 'INR', status: o.status || 'captured', method: 'upi' });
  const sig = crypto.createHmac('sha256', o.key || RK).update((o.swap ? subId + '|' + id : id + '|' + subId)).digest('hex');
  return { subscriptionId: subId, razorpay_payment_id: id, razorpay_subscription_id: subId, razorpay_signature: sig };
};
const hookBody = (event, subId, pay) => JSON.stringify({ event, payload: { subscription: { entity: { id: subId, status: 'active' } }, ...(pay ? { payment: { entity: pay } } : {}) } });
const hook = (W, body, opt = {}) => L.handleSub('wd-sub-hook', { env: opt.env || ENV, http: W.http, sd: W.sd, crypto, now: Date.now() },
  { headers: { 'x-razorpay-signature': opt.sig || crypto.createHmac('sha256', opt.secret || RHOOK).update(body).digest('hex') }, rawBody: body });
const car0 = W => W.get('customers/' + ME).cars[0];

(async () => {
  // ================= pure: price lookup and dates =================
  {
    const p = L.planFrom('std', { kind: 'plan', price: 1099, name: 'WD Standard' }, 'std');
    check('price from the Firestore catalog doc (1099), in paise', p.ok && p.price === 1099 && p.paise === 109900, p);
    check('no catalog doc: the built-in list price (999)', L.planFrom('std', null, 'pro').paise === 99900);
    check('hidden plan: refused for a car on another plan, sold to a car already on it', !L.planFrom('exc', { kind: 'plan', price: 2500, status: 'hidden' }, 'std').ok && L.planFrom('exc', { kind: 'plan', price: 2500, status: 'hidden' }, 'exc').ok);
    check('legacy only for legacy cars', !L.planFrom('legacy', null, 'std').ok && L.planFrom('legacy', null, 'legacy').paise === 50000);
    check('unknown / prototype ids refused', ['', 'free', '__proto__', 'constructor', 'toString'].every(id => !L.planFrom(id, null, id).ok));
    check('zero, negative, fractional-paise and non-plan docs refused', !L.planFrom('std', { kind: 'plan', price: 0 }, 'std').ok && !L.planFrom('std', { kind: 'plan', price: -5 }, 'std').ok
      && !L.planFrom('std', { kind: 'plan', price: 99.999 }, 'std').ok && !L.planFrom('std', { kind: 'service', price: 999 }, 'std').ok);
    check('paid-up date: one month from the later of today and the current date', L.advanceMonth('2026-12-10', '2026-11-22') === '2027-01-10' && L.advanceMonth('2026-11-01', '2026-11-22') === '2026-12-22' && L.advanceMonth(null, '2026-11-22') === '2026-12-22');
    check('month end clamps (Jan 31 -> Feb 28)', L.advanceMonth('2027-01-31', '2026-11-22') === '2027-02-28');
    check('our HMAC = Node crypto', L.hmacHex({ crypto }, 'k', 'pay_1|sub_2') === crypto.createHmac('sha256', 'k').update('pay_1|sub_2').digest('hex'));
  }

  // ================= wd-sub-create =================
  const W = world();
  {
    const noTok = await call(W, 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } }, { auth: '' });
    check('no token: 401, nothing created at Razorpay', noTok.status === 401 && W.rzSubs.size === 0, noTok);
    const notMine = await call(W, 'wd-sub-create', { plan: 'std', car: { reg: 'DL1AA0001' } });
    check("someone else's car: refused", notMine.status === 400 && W.rzSubs.size === 0, notMine);
    const hid = await call(W, 'wd-sub-create', { plan: 'exc', car: { reg: 'DL3CXY9999' } });
    check('hidden plan for this car: refused', hid.status === 400 && /no longer available/.test(hid.body.message), hid);
    const r = await call(W, 'wd-sub-create', { plan: 'std', car: { reg: 'dl 3c xy 9999', name: 'Creta' }, amount: 1, price: 1 });
    const s = W.rzSubs.get(r.body.subscriptionId), pl = W.rzPlans[0];
    check('create: Razorpay plan monthly / interval 1 / amount = catalog price 109900 paise (the body amount is ignored)', r.status === 200 && pl && pl.period === 'monthly' && pl.interval === 1 && pl.item.amount === 109900 && pl.item.currency === 'INR', { r, pl });
    check('create: subscription total_count 120, customer_notify 1, notes phone/uid/car/plan', s && s.total_count === 120 && s.customer_notify === 1 && s.notes.phone === '9876543210' && s.notes.uid === 'uid-3210' && s.notes.reg === 'DL3CXY9999' && s.notes.plan === 'std' && s.notes.car === 'Creta', s);
    check('create: answers keyId + subscriptionId (never the secret)', r.body.keyId === KEYID && /^sub_/.test(r.body.subscriptionId) && r.body.amount === 109900 && !JSON.stringify(r.body).includes(RK), r.body);
    const doc = W.get('subscriptions/' + r.body.subscriptionId);
    check('our subscriptions doc is written before any payment', doc && doc.status === 'created' && doc.phone === ME && doc.paise === 109900 && doc.rzp_plan_id === pl.id, doc);
    check('Razorpay plan id cached in rzp_plans', W.get('rzp_plans/std_test').rzp_plan_id === pl.id && W.get('rzp_plans/std_test').amount === 109900);
    const again = await call(W, 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } });
    check('same tap again: the same subscription, no second one', again.body.subscriptionId === r.body.subscriptionId && W.rzSubs.size === 1, again.body);
    const other = await call(W, 'wd-sub-create', { plan: 'pro', car: { reg: 'DL8CAB1234' } });
    check('second car on another plan: its own subscription', other.status === 200 && other.body.subscriptionId !== r.body.subscriptionId && W.rzPlans.length === 2, other.body);
    W.subA = r.body.subscriptionId; W.subB = other.body.subscriptionId;
  }

  // ================= wd-sub-confirm: signature and price =================
  {
    const sub = W.subA, till0 = car0(W).till;
    const forged = await call(W, 'wd-sub-confirm', Object.assign(checkout(W, sub), { razorpay_signature: 'a'.repeat(64) }));
    check('forged signature: 400 + alert, nothing credited', forged.status === 400 && !!forged.alert && car0(W).till === till0, forged);
    const swapped = await call(W, 'wd-sub-confirm', checkout(W, sub, { swap: true }));
    check('signature over subscription|payment (wrong order): refused', swapped.status === 400 && car0(W).till === till0, swapped);
    const wrongKey = await call(W, 'wd-sub-confirm', checkout(W, sub, { key: 'other_secret' }));
    check('signature with another key: refused', wrongKey.status === 400);
    const thief = await call(W, 'wd-sub-confirm', checkout(W, sub), { phone: OTHER });
    check("someone else confirming my autopay: refused", thief.status === 400 && car0(W).till === till0, thief);
    const cheap = await call(W, 'wd-sub-confirm', checkout(W, sub, { amount: 100 }));
    check('payment for less than the plan: not credited (pending, the webhook decides)', cheap.status === 200 && cheap.body.paid === false && car0(W).till === till0, cheap);
    const ok = checkout(W, sub);
    const c = await call(W, 'wd-sub-confirm', ok);
    const want = plusMonth(till0);
    check('confirm: paid, plan extended one month from the paid-up date (no days lost)', c.status === 200 && c.body.paid === true && c.body.till === want && car0(W).till === want, { c, car: car0(W) });
    check('confirm: car shows autopay on, payment in the account history, subpayments doc', car0(W).autopay.status === 'active' && car0(W).autopay.sub === sub && W.get('customers/' + ME).autopay_payments[0].amt === 1099
      && W.get('customers/' + ME).autopay_payments[0].ref === ok.razorpay_payment_id && W.get('subpayments/' + ok.razorpay_payment_id).amount === 1099, W.get('customers/' + ME));
    check('confirm: Ravi gets a Telegram line', /Autopay started/.test(c.notify || ''), c.notify);
    const c2 = await call(W, 'wd-sub-confirm', ok);
    check('confirm twice: same answer, not extended twice', c2.body.paid === true && car0(W).till === want && W.get('subscriptions/' + sub).charges === 1, c2);
    // the webhook for the same first charge (idempotent by payment id)
    const p1 = W.rzPays.get(ok.razorpay_payment_id), b1 = hookBody('subscription.charged', sub, p1);
    const h1 = await hook(W, b1), h1b = await hook(W, b1);
    check('webhook for the payment confirm already credited: 200, nothing twice', h1.status === 200 && h1b.status === 200 && car0(W).till === want && W.get('subscriptions/' + sub).charges === 1 && !h1.notify, h1);
    const dupCreate = await call(W, 'wd-sub-create', { plan: 'pro', car: { reg: 'DL3CXY9999' } });
    check('autopay already on for this car: a second one is refused', dupCreate.status === 409 && W.rzSubs.size === 2, dupCreate);
  }

  // ================= wd-sub-hook =================
  {
    const sub = W.subA, before = car0(W).till;
    const pay2 = { id: 'pay_Renew000001', amount: 109900, currency: 'INR', status: 'captured', method: 'upi' }, b2 = hookBody('subscription.charged', sub, pay2);
    const bad = await hook(W, b2, { sig: 'b'.repeat(64) });
    check('webhook with a bad X-Razorpay-Signature: 401, nothing credited', bad.status === 401 && car0(W).till === before, bad);
    const noSecret = await hook(W, b2, { env: Object.assign({}, ENV, { RAZORPAY_WEBHOOK_SECRET: '' }) });
    check('RAZORPAY_WEBHOOK_SECRET missing: refused (401) and Ravi told', noSecret.status === 401 && /RAZORPAY_WEBHOOK_SECRET/.test(noSecret.alert || ''), noSecret);
    const tampered = await hook(W, b2.replace('109900', '209900'), { sig: crypto.createHmac('sha256', RHOOK).update(b2).digest('hex') });
    check('body changed after signing: 401', tampered.status === 401);
    const ren = await hook(W, b2);
    check('monthly charge: plan extended by another month', ren.status === 200 && car0(W).till === plusMonth(before) && W.get('subscriptions/' + sub).charges === 2 && /renewal/.test(ren.notify || ''), { ren, car: car0(W) });
    const ren2 = await hook(W, b2);
    check('same charge delivered again: idempotent by payment id', ren2.status === 200 && car0(W).till === plusMonth(before) && W.get('subscriptions/' + sub).charges === 2 && W.get('customers/' + ME).autopay_payments.length === 2, ren2);
    const short = await hook(W, hookBody('subscription.charged', sub, { id: 'pay_Short0000001', amount: 100, currency: 'INR', status: 'captured' }));
    check('charge for the wrong amount: not credited, Ravi alerted', short.status === 200 && /Not credited/.test(short.alert || '') && W.get('subscriptions/' + sub).charges === 2, short);
    const failed = { id: 'pay_Failed000001', amount: 109900, currency: 'INR', status: 'failed', subscription_id: sub };
    const f1 = await hook(W, JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: failed } } })), f2 = await hook(W, JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: failed } } }));
    check('payment.failed: marked past due once, plan not extended', f1.status === 200 && W.get('subscriptions/' + sub).past_due === true && car0(W).autopay.status === 'past_due' && /failed/.test(f1.alert || '') && f2.duplicate === undefined && !f2.alert && car0(W).till === plusMonth(before), { f1, f2 });
    const halt = await hook(W, hookBody('subscription.halted', sub));
    check('subscription.halted: halted on the doc and the car', halt.status === 200 && W.get('subscriptions/' + sub).status === 'halted' && car0(W).autopay.status === 'halted' && /HALTED/.test(halt.alert || ''), halt);
    const ren3 = await hook(W, hookBody('subscription.charged', sub, { id: 'pay_Renew000002', amount: 109900, currency: 'INR', status: 'captured' }));
    check('a later charge after a failure: active again, past due cleared', ren3.status === 200 && W.get('subscriptions/' + sub).status === 'active' && W.get('subscriptions/' + sub).past_due === false && car0(W).autopay.status === 'active');
    const unknown = await hook(W, hookBody('subscription.charged', 'sub_NotOurs0001', pay2));
    check('a subscription that is not ours: 200 ignored', unknown.status === 200 && unknown.body.ignored === 'not ours');
  }

  // ================= wd-sub-cancel =================
  {
    const sub = W.subA;
    const thief = await call(W, 'wd-sub-cancel', { subscriptionId: sub }, { phone: OTHER });
    check("someone else cancelling my autopay: refused", thief.status === 400 && W.rzCancels.length === 0, thief);
    const c = await call(W, 'wd-sub-cancel', { car: { reg: 'DL3CXY9999' } });
    check('cancel: Razorpay cancel at cycle end, plan runs till its paid-up date', c.status === 200 && c.body.status === 'cancelling' && W.rzCancels.length === 1 && W.rzCancels[0].body.cancel_at_cycle_end === 1 && c.body.till === W.get('subscriptions/' + sub).paid_to && car0(W).autopay.status === 'cancelling', { c, x: W.rzCancels });
    const c2 = await call(W, 'wd-sub-cancel', { subscriptionId: sub });
    check('cancel again: same answer, Razorpay not called twice', c2.status === 200 && c2.body.status === 'cancelling' && W.rzCancels.length === 1, c2);
    const hc = await hook(W, hookBody('subscription.cancelled', sub));
    check('subscription.cancelled webhook: cancelled', hc.status === 200 && W.get('subscriptions/' + sub).status === 'cancelled' && car0(W).autopay.status === 'cancelled');
    const neu = await call(W, 'wd-sub-create', { plan: 'pro', car: { reg: 'DL3CXY9999' } });
    check('after cancelling, a new autopay (another plan) can start', neu.status === 200 && neu.body.subscriptionId !== sub, neu);
    const cB = await call(W, 'wd-sub-cancel', { subscriptionId: W.subB });
    check('never-authorised subscription: cancelled right away', cB.status === 200 && cB.body.status === 'cancelled' && W.rzCancels[1].body.cancel_at_cycle_end === 0, cB);
    // price change in the dashboard: a new Razorpay plan, the cache follows
    const W2 = world(); W2.put('catalog/std', { kind: 'plan', name: 'WD Standard', price: 1099, status: 'live' });
    await call(W2, 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } });
    W2.put('catalog/std', { kind: 'plan', name: 'WD Standard', price: 1199, status: 'live' });
    await call(W2, 'wd-sub-cancel', { car: { reg: 'DL3CXY9999' } });
    const n2 = await call(W2, 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } });
    check('price changed: new Razorpay plan at 119900, cache updated', n2.status === 200 && W2.rzPlans.length === 2 && W2.rzPlans[1].item.amount === 119900 && W2.get('rzp_plans/std_test').amount === 119900, W2.rzPlans.map(p => p.item.amount));
    const W3 = world(); W3.docs.delete('catalog/std');
    const n3 = await call(W3, 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } });
    check('no catalog doc: built-in price 99900', n3.status === 200 && W3.rzPlans[0].item.amount === 99900);
    const noKeys = await call(world(), 'wd-sub-create', { plan: 'std', car: { reg: 'DL3CXY9999' } }, { env: Object.assign({}, ENV, { RAZORPAY_KEY_SECRET: '' }) });
    check('Razorpay keys missing: 503 + alert, never 404', noKeys.status === 503 && !!noKeys.alert, noKeys);
  }

  // ================= the built workflow JSON, end to end =================
  {
    const W4 = world(), sd = {};
    const log = await run(WF, 'Autopay shuru karo (webhook)', { json: { headers: { authorization: tok() }, body: { plan: 'std', car: { reg: 'DL3CXY9999' } } } }, { env: ENV, staticData: sd, http: W4.http });
    check('14-razorpay-autopay.json: wd-sub-create answers 200 through Webhook -> Code -> Respond', log.response && log.response.code === 200 && /^sub_/.test(log.response.body.subscriptionId), log.response);
    const sub = log.response.body.subscriptionId, ok = checkout(W4, sub);
    const lc = await run(WF, 'Autopay pakka karo (webhook)', { json: { headers: { authorization: tok() }, body: ok } }, { env: ENV, staticData: sd, http: W4.http });
    check('...wd-sub-confirm credits it and Ravi gets one Telegram line', lc.response.code === 200 && lc.response.body.paid === true && lc.telegram.length === 1, { r: lc.response, t: lc.telegram });
    const body = hookBody('subscription.charged', sub, { id: 'pay_Renew000009', amount: 109900, currency: 'INR', status: 'captured' });
    const lh = await run(WF, 'Autopay webhook (Razorpay) (webhook)', { json: { headers: { 'x-razorpay-signature': crypto.createHmac('sha256', RHOOK).update(body).digest('hex') }, body: JSON.parse(body) },
      binary: { data: { data: Buffer.from(body, 'utf8').toString('base64') } } }, { env: ENV, staticData: sd, http: W4.http });
    check('...wd-sub-hook reads the raw body and verifies the signature', lh.response.code === 200 && W4.get('subscriptions/' + sub).charges === 2, lh.response);
    const s = JSON.stringify(WF);
    check('no secrets in the workflow file', !/BEGIN (RSA )?PRIVATE KEY|rzp_test_secret|rzp_hook_secret|rzp_test_KEYID|ya29\./.test(s));
    const hooks = WF.nodes.filter(n => n.type.endsWith('webhook'));
    check('4 unique POST webhook paths, only wd-sub-hook takes the raw body', hooks.length === 4 && new Set(hooks.map(n => n.parameters.path)).size === 4 && hooks.every(n => n.parameters.httpMethod === 'POST')
      && hooks.filter(n => n.parameters.options.rawBody).map(n => n.parameters.path).join() === 'wd-sub-hook');
  }
  console.log(`# pass ${pass}  fail ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
