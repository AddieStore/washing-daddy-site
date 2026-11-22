// Workflow 14 — Razorpay autopay for the monthly plans (Razorpay Subscriptions).
// build.mjs puts n8n/13-pronto/lib.js (ID token check, Firestore REST, rzpCall, hmacHex, sameHex, txn, rateLimit, gate)
// in front of this file in every Code node, so the money rules are the same as workflow 13:
//   - the caller is the phone number inside a verified Firebase ID token, never a number from the body;
//   - the price is the plan's price in Firestore (catalog/{planId}, kind 'plan', as the admin dashboard writes it), with
//     the app's built-in list price only when the dashboard has no doc for that plan. The phone never sends an amount;
//   - nothing is credited until Razorpay's signature checks out AND Razorpay itself says the payment is captured for
//     exactly the plan amount; each payment id is credited once (subscriptions/{id}.paid_ids + subpayments/{payId}).
// Firestore: rzp_plans/{planId}_{test|live} (Razorpay plan id cache), subscriptions/{sub_id} (server only),
// subpayments/{pay_id} (one per charge), customers/{phone}.cars[i].{till, plan, autopay} and .autopay_payments (the app
// reads these from the account doc it already watches).

/* ======================= plans and dates ======================= */
const PLAN_DEFAULTS = { legacy: 500, std: 999, pro: 1800, exc: 2500, res: 5555 };   // = mobile/native/customer/src/data/reference.ts PLANS
const PLAN_NAMES = { legacy: 'Legacy', std: 'WD Standard', pro: 'WD Pro', exc: 'WD Exclusive', res: 'WD Reserve' };
const SUB_TOTAL_COUNT = 120;   // 10 years of monthly charges; the customer cancels any time
const SUB_RE = /^sub_[A-Za-z0-9]{6,40}$/, PAY_RE = /^pay_[A-Za-z0-9]{6,40}$/;
const regKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isoDay = v => { const s = String((v && v.start) || v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };
// Same rule as workflow 8 (advancePaidUpTo): one month from the later of today and the current paid-up date, so a
// customer who pays early or late never loses days already paid for. Jan 31 + 1 month = Feb 28.
function advanceMonth(paidTo, today) {
  const cur = isoDay(paidTo), from = cur && cur > today ? cur : today, d = new Date(from + 'T00:00:00Z'), day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1); if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
// -> { ok, id, name, price, paise } | { ok:false, why }. carPlan: the plan the car is on now (a hidden plan is only
// sold to a car already on it, like the app's HIDDEN_FROM_NEW).
function planFrom(planId, doc, carPlan) {
  if (!own(PLAN_DEFAULTS, planId)) return { ok: false, why: 'Pick a plan.' };
  const d = doc || null;
  if (d && d.kind && d.kind !== 'plan') return { ok: false, why: 'That plan is not on sale right now.' };
  const st = d ? String(d.status || 'live') : 'live', hidden = st === 'hidden' || st === 'paused' || planId === 'legacy' || (d && d.old === true);
  if (hidden && carPlan !== planId) return { ok: false, why: 'That plan is no longer available. Pick another plan.' };
  const price = d && d.price != null ? num(d.price, NaN) : PLAN_DEFAULTS[planId];
  if (!(price >= 1) || Math.round(price * 100) !== price * 100) return { ok: false, why: 'That plan has no price yet. Try again later.' };
  return { ok: true, id: planId, name: clean(d && d.name, 60) || PLAN_NAMES[planId], price: r2(price), paise: Math.round(price * 100) };
}
async function planPrice(ctx, planId, carPlan) {
  if (!own(PLAN_DEFAULTS, planId)) return { ok: false, why: 'Pick a plan.' };
  const doc = await fsGet(ctx, 'catalog', planId);
  return planFrom(planId, doc && doc.data, carPlan);
}
// Razorpay plan for this price, cached in rzp_plans/{planId}_{test|live}. A new price makes a new Razorpay plan
// (Razorpay plans cannot change amount); old subscriptions keep the price they were sold at.
async function rzpPlanFor(ctx, plan) {
  const mode = /^rzp_live_/.test(rzpKeys(ctx.env).id) ? 'live' : 'test', docId = plan.id + '_' + mode;
  const c = await fsGet(ctx, 'rzp_plans', docId);
  if (c && Number(c.data.amount) === plan.paise && /^plan_[A-Za-z0-9]{6,40}$/.test(String(c.data.rzp_plan_id || ''))) return { ok: true, id: c.data.rzp_plan_id, cached: true };
  const r = await rzpCall(ctx, 'POST', '/plans', { period: 'monthly', interval: 1,
    item: { name: 'Washing Daddy ' + plan.name, amount: plan.paise, currency: 'INR', description: plan.name + ' monthly plan' }, notes: { wd_plan: plan.id } });
  const b = r.body || {};
  if (!(r.statusCode >= 200 && r.statusCode < 300 && /^plan_/.test(String(b.id || '')) && b.item && Number(b.item.amount) === plan.paise)) {
    return { ok: false, why: 'razorpay plan ' + r.statusCode + ' ' + clean((b.error && (b.error.description || b.error.code)) || '', 120) };
  }
  // a lost race only means two Razorpay plans for the same price: either id works
  await fsCommit(ctx, [wSet(ctx, 'rzp_plans', docId, { plan: plan.id, amount: plan.paise, rzp_plan_id: b.id, mode, period: 'monthly', interval: 1, created_at: nowIST(ctx.now) }, c ? pre(c) : { exists: false })]).catch(() => null);
  return { ok: true, id: b.id };
}
async function carOf(ctx, phone, reg) {
  const cu = await fsGet(ctx, 'customers', phone);
  if (!cu) return null;
  const cars = Array.isArray(cu.data.cars) ? cu.data.cars : [], k = regKey(reg);
  const i = k ? cars.findIndex(c => c && regKey(c.plate || c.reg) === k) : -1;
  return { cu, cars, i, car: i >= 0 ? cars[i] : null };
}
const LIVE = ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelling'];   // statuses we keep watching
const ON = ['authenticated', 'active', 'pending'];                                          // autopay is on: no second one

/* ======================= wd-sub-create ======================= */
// body { plan: 'std'|'pro'|..., car: { reg, name } } -> { ok, keyId, subscriptionId, amount (paise), plan, planName, name, description, prefill }
async function subCreate(ctx, req) {
  const g = await gate(ctx, req, 'plans'); if (!g.ok) return g.res;
  const k = rzpKeys(ctx.env); if (!k) return fail(503, 'Payments are being set up. Try again later.' + NOTHING, { alert: 'Workflow 14: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set' });
  const phone = g.phone, b = isObj(req.body) ? req.body : {}, car = isObj(b.car) ? b.car : {}, reg = regKey(car.reg);
  if (reg.length < 4) return fail(400, 'Add your car number first.' + NOTHING);
  const found = await carOf(ctx, phone, reg);
  if (!found) return fail(400, 'Finish signing up first.' + NOTHING);
  if (!found.car) return fail(400, "We couldn't find that car on your account. Call us on 77018 08924." + NOTHING);
  const plan = await planPrice(ctx, String(b.plan || ''), String(found.car.plan || ''));
  if (!plan.ok) return fail(400, plan.why + NOTHING);
  const mine = (await fsWhere(ctx, 'subscriptions', 'phone', phone, 100)).filter(s => regKey(s.data.reg) === reg);
  const on = mine.find(s => ON.includes(s.data.status));
  if (on) return fail(409, 'Autopay is already on for this car (' + (on.data.plan_name || on.data.plan) + '). To change plan, cancel autopay in Profile first.' + NOTHING);
  const open = (s) => ({ ok: true, keyId: k.id, subscriptionId: s.id, amount: num(s.data.paise, plan.paise), plan: s.data.plan, planName: s.data.plan_name, recurring: true,
    name: 'Washing Daddy', description: (s.data.plan_name || plan.name) + ' · autopay every month', prefill: { contact: phone.slice(-10) } });
  // the same tap again within 30 minutes reuses the subscription the customer has not authorised yet
  const reuse = mine.find(s => s.data.status === 'created' && s.data.plan === plan.id && num(s.data.paise, 0) === plan.paise && ctx.now - num(s.data.created_ms, 0) < 30 * 60e3);
  if (reuse) return reply(200, open(reuse));
  const rp = await rzpPlanFor(ctx, plan);
  if (!rp.ok) return fail(502, "Couldn't start autopay. Try again." + NOTHING, { alert: 'Workflow 14: ' + rp.why });
  const notes = { phone: phone.slice(-10), uid: clean(g.uid || '', 64), car: clean(found.car.name || car.name, 40), reg, plan: plan.id, wd: 'autopay' };
  const r = await rzpCall(ctx, 'POST', '/subscriptions', { plan_id: rp.id, total_count: SUB_TOTAL_COUNT, quantity: 1, customer_notify: 1, notes });
  const s = r.body || {};
  if (!(r.statusCode >= 200 && r.statusCode < 300 && SUB_RE.test(String(s.id || '')) && s.plan_id === rp.id)) {
    return fail(502, "Couldn't start autopay. Try again." + NOTHING, { alert: 'Workflow 14: Razorpay subscription failed for ' + phone + ': ' + r.statusCode + ' ' + clean((s.error && (s.error.description || s.error.code)) || '', 120) });
  }
  // our record is written before the customer can pay anything (checkout opens only after this answer)
  const doc = { phone, uid: notes.uid, reg, car_name: notes.car, plan: plan.id, plan_name: plan.name, amount: plan.price, paise: plan.paise, rzp_plan_id: rp.id,
    status: 'created', created_at: nowIST(ctx.now), created_ms: ctx.now, paid_ids: [], failed_ids: [], charges: 0, paid_to: null, past_due: false };
  const c = await fsCommit(ctx, [wSet(ctx, 'subscriptions', s.id, doc, { exists: false })]);
  if (!c.ok) return fail(409, 'Please try again.' + NOTHING);
  return reply(200, open({ id: s.id, data: doc }));
}

/* ======================= crediting a charge (confirm and webhook) ======================= */
// p = Razorpay payment { id, amount (paise), currency, status, method }. Idempotent by payment id.
async function chargeSub(ctx, subId, p, source) {
  return txn(ctx, async () => {
    const sd = await fsGet(ctx, 'subscriptions', subId);
    if (!sd) return { result: { ok: false, alert: 'Workflow 14: charge ' + p.id + ' for unknown subscription ' + subId + '. Check Razorpay.' } };
    const d = sd.data, ids = Array.isArray(d.paid_ids) ? d.paid_ids : [];
    if (ids.includes(p.id)) return { result: { ok: true, duplicate: true, till: d.paid_to || null } };
    if (Number(p.amount) !== num(d.paise, -1) || String(p.currency || '') !== 'INR') return { result: { ok: false, alert: 'Workflow 14: autopay payment ' + p.id + ' on ' + subId + ' is ' + p.amount + ' ' + p.currency + ', plan is ' + d.paise + ' paise. Not credited.' } };
    const cu = await fsGet(ctx, 'customers', d.phone), at = nowIST(ctx.now), today = todayIST(ctx.now), writes = [];
    let till = null, alert;
    const cars = cu && Array.isArray(cu.data.cars) ? cu.data.cars.map(c => Object.assign({}, c)) : [], i = cars.findIndex(c => regKey(c.plate || c.reg) === regKey(d.reg));
    if (i >= 0) {
      const c = cars[i];
      till = advanceMonth(c.till, today);
      c.till = till; c.plan = d.plan;
      c.autopay = { sub: subId, status: 'active', plan: d.plan, amount: d.amount, since: (isObj(c.autopay) && c.autopay.sub === subId && c.autopay.since) || today, last_paid: today };
      const hist = [{ at, amt: d.amount, what: d.plan_name + ' · ' + (d.car_name || d.reg) + ' (autopay)', ref: p.id, sub: subId, reg: d.reg }]
        .concat(Array.isArray(cu.data.autopay_payments) ? cu.data.autopay_payments : []).slice(0, 36);
      writes.push(wPatch(ctx, 'customers', d.phone, { cars, autopay_payments: hist, updated_at: at }, pre(cu)));
    } else alert = 'Workflow 14: autopay ' + fmtR(d.amount) + ' paid by ' + d.phone + ' for car ' + d.reg + ', but that car is not on customers/' + d.phone + '. Add it by hand.';
    writes.push(wPatch(ctx, 'subscriptions', subId, { status: d.status === 'cancelling' ? 'cancelling' : 'active', paid_ids: [p.id].concat(ids).slice(0, 60), charges: num(d.charges, 0) + 1,
      last_paid_at: at, last_payment: p.id, paid_to: till || d.paid_to || null, past_due: false }, pre(sd)));
    writes.push(wSet(ctx, 'subpayments', p.id, { phone: d.phone, sub: subId, plan: d.plan, reg: d.reg, amount: d.amount, at, method: clean(p.method, 20), till, source }, { exists: false }));
    const notify = 'Autopay ' + (num(d.charges, 0) ? 'renewal' : 'started') + ': ' + fmtR(d.amount) + ' ' + d.plan_name + ' for ' + (d.car_name || '') + ' ' + d.reg + ' (' + d.phone + ')' +
      (till ? ', covered till ' + till : '') + '. Payment ' + p.id + '. Move Service Paid Up To in Notion to ' + (till || 'one month on') + '.';
    return { writes, result: { ok: true, till, notify, alert } };
  });
}
// status changes from the webhook / cancel: the subscription doc and the car's autopay badge, in one commit
async function setSubStatus(ctx, subId, patch, carStatus) {
  return txn(ctx, async () => {
    const sd = await fsGet(ctx, 'subscriptions', subId); if (!sd) return { result: { ok: false } };
    const d = sd.data, writes = [wPatch(ctx, 'subscriptions', subId, Object.assign({ updated_at: nowIST(ctx.now) }, patch), pre(sd))];
    const cu = await fsGet(ctx, 'customers', d.phone);
    const cars = cu && Array.isArray(cu.data.cars) ? cu.data.cars.map(c => Object.assign({}, c)) : [], i = cars.findIndex(c => regKey(c.plate || c.reg) === regKey(d.reg));
    // only the car's current autopay (an older cancelled one must not overwrite a newer one)
    if (i >= 0 && (!isObj(cars[i].autopay) || cars[i].autopay.sub === subId) && carStatus) {
      cars[i].autopay = Object.assign({ sub: subId, plan: d.plan, amount: d.amount }, isObj(cars[i].autopay) ? cars[i].autopay : {}, { status: carStatus });
      writes.push(wPatch(ctx, 'customers', d.phone, { cars, updated_at: nowIST(ctx.now) }, pre(cu)));
    }
    return { writes, result: { ok: true, sub: d } };
  });
}

/* ======================= wd-sub-confirm ======================= */
// body { subscriptionId, razorpay_payment_id, razorpay_subscription_id, razorpay_signature } (what Razorpay Checkout returns)
// -> { ok, paid, pending?, till, subscriptionId, status }
async function subConfirm(ctx, req) {
  const h = (req && req.headers) || {};
  const t = await verifyIdToken(ctx, h.authorization || h.Authorization);
  if (!t.ok) return t.setup ? fail(503, 'Payments are being set up. Try again later.', { alert: 'Workflow 14: ' + t.why }) : fail(401, 'Sign in again to continue.');
  if (!rateLimit(ctx, 'sub|' + t.phone, 20, 60000)) return fail(429, 'Too many tries. Wait a minute and try again.');
  const b = isObj(req.body) ? req.body : {}, sid = String(b.razorpay_subscription_id || ''), pid = String(b.razorpay_payment_id || ''), sig = String(b.razorpay_signature || '');
  if (!SUB_RE.test(sid) || String(b.subscriptionId || sid) !== sid || !PAY_RE.test(pid) || !/^[a-f0-9]{64}$/.test(sig)) return fail(400, "We couldn't read that payment. If money was taken it will show up in a few minutes.");
  const k = rzpKeys(ctx.env); if (!k) return fail(503, 'Payments are being set up. Try again later.', { alert: 'Workflow 14: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set' });
  const sd = await fsGet(ctx, 'subscriptions', sid);
  if (!sd || sd.data.phone !== t.phone) return fail(400, 'We could not find that autopay.');
  // Razorpay signs payment_id|subscription_id with the key secret for subscription checkout
  if (!sameHex(ctx, hmacHex(ctx, k.sec, pid + '|' + sid), sig)) return fail(400, "We couldn't confirm that payment.", { alert: 'Workflow 14: bad Razorpay signature on ' + sid + ' (' + t.phone + ')' });
  if ((sd.data.paid_ids || []).includes(pid)) return reply(200, { ok: true, paid: true, till: sd.data.paid_to || null, subscriptionId: sid, status: sd.data.status });
  const rs = await rzpCall(ctx, 'GET', '/subscriptions/' + sid), se = rs.body || {};
  if (rs.statusCode !== 200 || se.id !== sid || se.plan_id !== sd.data.rzp_plan_id) return fail(502, "We couldn't confirm autopay yet. If money was taken it will show up in a few minutes.", { alert: 'Workflow 14: subscription ' + sid + ' lookup ' + rs.statusCode + ' / plan ' + se.plan_id });
  if (!['authenticated', 'active'].includes(String(se.status))) return reply(200, { ok: true, paid: false, pending: true, subscriptionId: sid, status: String(se.status || '') });
  let rp = await rzpCall(ctx, 'GET', '/payments/' + pid), p = rp.body || {};
  if (rp.statusCode !== 200 || p.id !== pid || p.currency !== 'INR') return fail(502, "We couldn't confirm that payment yet. If money was taken it will show up in a few minutes.", { alert: 'Workflow 14: payment ' + pid + ' lookup ' + rp.statusCode });
  if (Number(p.amount) !== num(sd.data.paise, -1)) {
    // e.g. a card mandate's small authorisation: the plan charge comes by the webhook (subscription.charged)
    return reply(200, { ok: true, paid: false, pending: true, subscriptionId: sid, status: String(se.status) });
  }
  if (p.status === 'authorized') { rp = await rzpCall(ctx, 'POST', '/payments/' + pid + '/capture', { amount: Number(p.amount), currency: 'INR' }); p = rp.body || p; }
  if (p.status !== 'captured') return reply(200, { ok: true, paid: false, pending: true, subscriptionId: sid, status: String(se.status) });
  const f = await chargeSub(ctx, sid, p, 'confirm');
  if (!f.ok) return fail(502, "We couldn't confirm that payment yet. If money was taken it will show up in a few minutes.", { alert: f.alert });
  return reply(200, { ok: true, paid: true, till: f.till, subscriptionId: sid, status: 'active' }, { notify: f.duplicate ? undefined : f.notify, alert: f.alert });
}

/* ======================= wd-sub-hook (Razorpay webhook) ======================= */
// Events: subscription.charged (extend the plan), subscription.pending / payment.failed (past due),
// subscription.halted (retries exhausted), subscription.cancelled / subscription.completed. Signed with
// RAZORPAY_WEBHOOK_SECRET over the raw body (X-Razorpay-Signature, hex HMAC-SHA256).
function alertOnce(ctx, key, text) { const sd = ctx.sd; sd.al = sd.al || {}; if (ctx.now - num(sd.al[key], 0) < 600000) return undefined; sd.al[key] = ctx.now; return text; }
async function subHook(ctx, req) {
  const secret = String(ctx.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const raw = typeof req.rawBody === 'string' ? req.rawBody : '', hh = req.headers || {}, sig = String(hh['x-razorpay-signature'] || hh['X-Razorpay-Signature'] || '');
  if (!secret) return reply(401, { ok: false }, { alert: alertOnce(ctx, 'nosecret', 'Workflow 14: RAZORPAY_WEBHOOK_SECRET is not set, so autopay webhooks are refused.') });
  if (!raw || !/^[a-f0-9]{64}$/.test(sig) || !sameHex(ctx, hmacHex(ctx, secret, raw), sig)) return reply(401, { ok: false }, { alert: alertOnce(ctx, 'badsig', 'Workflow 14 refused a Razorpay webhook: bad signature') });
  let b; try { b = JSON.parse(raw); } catch (e) { return reply(400, { ok: false }); }
  const ev = String(b.event || ''), pl = isObj(b.payload) ? b.payload : {};
  const se = (pl.subscription && pl.subscription.entity) || {}, p = (pl.payment && pl.payment.entity) || {};
  const sid = String(se.id || p.subscription_id || (isObj(p.notes) && p.notes.subscription_id) || '');
  if (!SUB_RE.test(sid)) return reply(200, { ok: true, ignored: 'no subscription' });
  const sd = await fsGet(ctx, 'subscriptions', sid);
  if (!sd) return reply(200, { ok: true, ignored: 'not ours' });
  const d = sd.data;
  if (ev === 'subscription.charged') {
    if (!PAY_RE.test(String(p.id || '')) || p.status !== 'captured') return reply(200, { ok: true, ignored: 'not captured' });
    const f = await chargeSub(ctx, sid, p, 'webhook');
    if (!f.ok) return reply(200, { ok: false }, { alert: f.alert });   // 200: a retry would not change the amount
    return reply(200, { ok: true }, { notify: f.duplicate ? undefined : f.notify, alert: f.alert });
  }
  if (ev === 'payment.failed' || ev === 'subscription.pending') {
    const fid = String(p.id || ''), seen = Array.isArray(d.failed_ids) ? d.failed_ids : [];
    if (fid && seen.includes(fid)) return reply(200, { ok: true, duplicate: true });
    const charged = num(d.charges, 0) > 0;
    await setSubStatus(ctx, sid, Object.assign({ last_failed_at: nowIST(ctx.now) }, fid ? { failed_ids: [fid].concat(seen).slice(0, 60) } : {},
      charged ? { past_due: true, status: ev === 'subscription.pending' ? 'pending' : d.status } : {}), charged ? 'past_due' : null);
    return reply(200, { ok: true }, charged ? { alert: 'Autopay payment failed for ' + d.phone + ' ' + (d.car_name || '') + ' ' + d.reg + ' (' + d.plan_name + ' ' + fmtR(d.amount) + '). Razorpay will retry; plan paid till ' + (d.paid_to || '?') + '.' } : undefined);
  }
  if (ev === 'subscription.halted') {
    await setSubStatus(ctx, sid, { status: 'halted', past_due: true, halted_at: nowIST(ctx.now) }, 'halted');
    return reply(200, { ok: true }, { alert: 'Autopay HALTED for ' + d.phone + ' ' + (d.car_name || '') + ' ' + d.reg + ': Razorpay gave up retrying. Plan not extended (paid till ' + (d.paid_to || '?') + '). Call the customer.' });
  }
  if (ev === 'subscription.cancelled' || ev === 'subscription.completed') {
    if (d.status === 'cancelled' || d.status === 'completed') return reply(200, { ok: true, duplicate: true });
    const st = ev === 'subscription.completed' ? 'completed' : 'cancelled';
    await setSubStatus(ctx, sid, { status: st, ended_at: nowIST(ctx.now) }, st);
    return reply(200, { ok: true }, { notify: 'Autopay ' + st + ' for ' + d.phone + ' ' + (d.car_name || '') + ' ' + d.reg + ' (' + d.plan_name + '). Paid till ' + (d.paid_to || '?') + '.' });
  }
  if (ev === 'subscription.activated' || ev === 'subscription.authenticated') {
    if (d.status === 'created') await setSubStatus(ctx, sid, { status: 'authenticated' }, null);
    return reply(200, { ok: true });
  }
  return reply(200, { ok: true, ignored: ev });
}

/* ======================= wd-sub-cancel ======================= */
// body { subscriptionId } or { car: { reg } } -> { ok, status: 'cancelling' | 'cancelled', till }
// Cancels at the end of the paid month: no more charges, the plan runs till its paid-up date.
async function subCancel(ctx, req) {
  const h = (req && req.headers) || {};
  const t = await verifyIdToken(ctx, h.authorization || h.Authorization);
  if (!t.ok) return t.setup ? fail(503, 'Try again later.', { alert: 'Workflow 14: ' + t.why }) : fail(401, 'Sign in again to continue.');
  if (!rateLimit(ctx, 'sub|' + t.phone, 20, 60000)) return fail(429, 'Too many tries. Wait a minute and try again.');
  if (!rzpKeys(ctx.env)) return fail(503, 'Try again later.', { alert: 'Workflow 14: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set' });
  const b = isObj(req.body) ? req.body : {}, want = String(b.subscriptionId || ''), reg = regKey(isObj(b.car) ? b.car.reg : '');
  let s = null;
  if (SUB_RE.test(want)) { s = await fsGet(ctx, 'subscriptions', want); if (s && s.data.phone !== t.phone) s = null; }
  else if (reg) s = (await fsWhere(ctx, 'subscriptions', 'phone', t.phone, 100)).filter(x => regKey(x.data.reg) === reg && LIVE.includes(x.data.status)).sort((a, c) => num(c.data.created_ms, 0) - num(a.data.created_ms, 0))[0] || null;
  if (!s) return fail(400, 'We could not find autopay for this car.');
  const d = s.data;
  if (['cancelled', 'completed', 'cancelling'].includes(d.status)) return reply(200, { ok: true, status: d.status === 'cancelling' ? 'cancelling' : 'cancelled', till: d.paid_to || null });
  const atEnd = d.status !== 'created';   // never authorised: cancel it now (nothing was ever charged)
  const r = await rzpCall(ctx, 'POST', '/subscriptions/' + s.id + '/cancel', { cancel_at_cycle_end: atEnd ? 1 : 0 });
  const gone = /cancelled|completed|expired/i.test(JSON.stringify(r.body || ''));
  if (!(r.statusCode >= 200 && r.statusCode < 300) && !gone) return fail(502, "Couldn't cancel autopay right now. Try again or call us on 77018 08924.", { alert: 'Workflow 14: cancel ' + s.id + ' failed ' + r.statusCode + ' ' + clean(JSON.stringify(r.body || ''), 160) });
  const st = atEnd && !(r.body && r.body.status === 'cancelled') ? 'cancelling' : 'cancelled';
  await setSubStatus(ctx, s.id, { status: st, cancel_asked_at: nowIST(ctx.now) }, st);
  return reply(200, { ok: true, status: st, till: d.paid_to || null }, { notify: 'Autopay ' + (st === 'cancelling' ? 'will stop at the end of the month' : 'cancelled') + ' for ' + t.phone + ' ' + (d.car_name || '') + ' ' + d.reg + ' (' + d.plan_name + '). Paid till ' + (d.paid_to || '?') + '.' });
}

const SUB_HANDLERS = { 'wd-sub-create': subCreate, 'wd-sub-confirm': subConfirm, 'wd-sub-hook': subHook, 'wd-sub-cancel': subCancel };
// Never throws: any crash becomes an answer the app can show, and an alert for Ravi.
async function handleSub(name, ctx, req) {
  try { return await SUB_HANDLERS[name](ctx, req || {}); }
  catch (e) {
    const setup = !!(e && e.setup), quiet = name === 'wd-sub-hook';
    return fail(setup ? 503 : 500, (setup ? 'Payments are being set up. Try again later.' : "Something went wrong on our side. Try again in a minute.") + (quiet || name === 'wd-sub-confirm' ? '' : NOTHING),
      { alert: 'Workflow 14 ' + name + ' failed: ' + clean(e && e.message || e, 200) });
  }
}
