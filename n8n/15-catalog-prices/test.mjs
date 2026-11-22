// node n8n/15-catalog-prices/test.mjs — offline tests: workflow 8 (n8n/2026-11-01/8-cashfree.json) prices plans and
// one-time washes from the Firestore catalog. Runs the workflow JSON end to end with the 2026-11-01 runner and its fake
// Notion/Cashfree, plus a fake Firestore documents:batchGet that answers the way n8n's HTTP node does with fullResponse.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { run } = require('../2026-11-01/tests/run-workflow.js');
const { row, makeWorld } = require('../2026-11-01/tests/fakes.js');

const WF = JSON.parse(fs.readFileSync(new URL('../2026-11-01/8-cashfree.json', import.meta.url), 'utf8'));
const ENV = { CASHFREE_SECRET: 'test-secret-not-real', TELEGRAM_CHAT_ID: '1' };
const OOD = 'That price is out of date. Reload the page and try again.';
let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) pass++; else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); } };

const ROOT = 'projects/gen-lang-client-0799769592/databases/(default)/documents';
const int = v => ({ integerValue: String(v) });
// fs: { mode: 'ok' | 'throw' | 'status', status, docs: { 'plan-pro': {price: int(1999)} | null (missing) }, body }
function world({ rows = [], fs: F = { mode: 'ok', docs: {} } } = {}) {
  const W = makeWorld({ rows });
  const notion = W.http;
  W.reads = [];
  W.http = async (method, url, body, node) => {
    if (url.includes('firestore.googleapis.com')) {
      W.reads.push({ method, url, body, node });
      if (F.mode === 'throw') throw new Error('getaddrinfo ENOTFOUND firestore.googleapis.com');
      if (F.mode === 'status') return { statusCode: F.status, body: F.body || { error: { code: F.status, status: 'UNAVAILABLE' } } };
      if (F.mode === 'body') return { statusCode: 200, body: F.body };
      return { statusCode: 200, body: body.documents.map(name => {
        const id = name.split('/').pop(), d = F.docs[id];
        return d ? { found: { name, fields: d, updateTime: '2026-11-22T00:00:00Z' }, readTime: 'x' } : { missing: name, readTime: 'x' };
      }) };
    }
    return notion(method, url, body, node);
  };
  return W;
}
const order = (W, body) => run(WF, 'Order maango (webhook)', { headers: {}, body }, { env: ENV, staticData: {}, http: W.http });
const plan = (planId, amount, o = {}) => Object.assign({ amount, name: 'New', phone: '9000011111', car: 'City', num: 'DL3CXY9999', kind: 'Monthly plan', label: 'WD Pro · City', planId, page: 'web' }, o);
const wash = (service, amount, o = {}) => Object.assign({ amount, name: 'New', phone: '9000011111', car: 'City', num: 'DL3CXY9999', kind: 'One-time wash', label: 'WD Wash · City', service, page: 'web' }, o);
const last = W => W.cfOrders[W.cfOrders.length - 1];
const ok = (log, W, amt) => log.response && log.response.code === 200 && !!log.response.body.paymentSessionId && last(W) && last(W).order_amount === amt;
const refused = (log, W, n0, msg) => log.response && log.response.code === 400 && W.cfOrders.length === n0 && (!msg || log.response.body.message === msg);

const LIVE = { 'plan-std': { price: int(1199) }, 'plan-pro': { price: int(1999) }, 'plan-exc': { price: int(2700) }, 'plan-res': { price: int(6000) },
  'pack-wash': { price: int(249) }, 'pack-deep': { price: int(900) }, 'pack-exclusive': { price: { doubleValue: 2300 } } };

// ---- catalog price used ----
{
  const W = world({ fs: { mode: 'ok', docs: LIVE } });
  let log = await order(W, plan('pro', 1999));
  check('plan: catalog price charged (pro 1999)', ok(log, W, 1999) && last(W).order_tags.kind === 'plan' && last(W).order_tags.fullAmount === '1999', log.response);
  check('one Firestore read, batchGet of the 7 docs, no Authorization, public key in URL', W.reads.length === 1 && W.reads[0].method === 'POST'
    && W.reads[0].url === `https://firestore.googleapis.com/v1/${ROOT}:batchGet?key=AIzaSyAFNwmEFj4BywMcIsWndyZ2BoI_82-pSac`
    && JSON.stringify(W.reads[0].body.documents) === JSON.stringify(['plan-std', 'plan-pro', 'plan-exc', 'plan-res', 'pack-wash', 'pack-deep', 'pack-exclusive'].map(d => ROOT + '/catalog/' + d)), W.reads[0]);
  for (const [id, amt] of [['std', 1199], ['exc', 2700], ['res', 6000]]) { log = await order(W, plan(id, amt)); check('plan ' + id + ' at catalog ' + amt, ok(log, W, amt), log.response); }
  log = await order(W, plan(undefined, 1999, { label: 'WD Pro · City' }));
  check('plan found by label (no planId) also uses catalog', ok(log, W, 1999), log.response);
  for (const [id, amt] of [['wash', 249], ['deep', 900], ['exclusive', 2300], ['interior', 249], ['detailing', 900]]) {
    log = await order(W, wash(id, amt)); check('one-time ' + id + ' at catalog ' + amt, ok(log, W, amt) && last(W).order_tags.kind === 'extra', log.response);
  }
  log = await order(W, wash('wash', undefined));
  check('one-time without an amount (older app) is priced from the catalog', ok(log, W, 249), log.response);
  log = await order(W, { amount: 0, kind: 'upgrade', toPlan: 'res', fromPlan: 'pro', till: new Date(Date.now() + 5.5 * 3600e3 + 15 * 864e5).toISOString().slice(0, 10), phone: '9000011111', num: 'DL3CXY9999' });
  check('upgrade uses catalog plan prices ((6000-1999) x 15/30 = 2001)', ok(log, W, Math.round((6000 - 1999) * 15 / 30)), log.response);
}
// ---- changed price accepted, old price rejected ----
{
  const W = world({ fs: { mode: 'ok', docs: LIVE } });
  let n0 = W.cfOrders.length, log = await order(W, plan('pro', 1800));
  check('plan: old price 1800 refused, nothing opened at Cashfree', refused(log, W, n0, OOD), log.response);
  n0 = W.cfOrders.length; log = await order(W, plan('pro', 1));
  check('plan: browser amount 1 refused (never charged)', refused(log, W, n0, OOD), log.response);
  n0 = W.cfOrders.length; log = await order(W, wash('wash', 199));
  check('one-time: old price 199 refused', refused(log, W, n0, OOD), log.response);
  n0 = W.cfOrders.length; log = await order(W, wash('deep', 'abc'));
  check('one-time: junk amount refused', refused(log, W, n0, OOD), log.response);
}
// ---- fallback when Firestore fails ----
for (const F of [{ mode: 'throw' }, { mode: 'status', status: 503 }, { mode: 'status', status: 403, body: { error: { status: 'PERMISSION_DENIED' } } }, { mode: 'body', body: '<html>proxy</html>' }, { mode: 'body', body: { error: 'x' } }]) {
  const W = world({ fs: F }), tag = F.mode + (F.status || '');
  let log = await order(W, plan('pro', 1800));
  check(`Firestore ${tag}: hardcoded pro 1800 charged`, ok(log, W, 1800), log.response);
  let n0 = W.cfOrders.length; log = await order(W, plan('pro', 1999));
  check(`Firestore ${tag}: new price 1999 refused (fallback is the old table)`, refused(log, W, n0, OOD), log.response);
  log = await order(W, wash('exclusive', 2100));
  check(`Firestore ${tag}: one-time exclusive 2100 from WASHES`, ok(log, W, 2100), log.response);
}
// ---- garbage prices ignored (per doc), valid ones still used ----
{
  const docs = { 'plan-std': { price: int(0) }, 'plan-pro': { price: { stringValue: '1999' } }, 'plan-exc': { price: int(99999) }, 'plan-res': { price: { doubleValue: 5999.5 } },
    'pack-wash': { price: int(-5) }, 'pack-deep': { name: { stringValue: 'no price' } }, 'pack-exclusive': null };
  const W = world({ fs: { mode: 'ok', docs } });
  for (const [id, amt] of [['std', 999], ['pro', 1800], ['exc', 2500], ['res', 5555]]) { const log = await order(W, plan(id, amt)); check('garbage plan-' + id + ' ignored: ' + amt, ok(log, W, amt), log.response); }
  for (const [id, amt] of [['wash', 199], ['deep', 800], ['exclusive', 2100]]) { const log = await order(W, wash(id, amt)); check('garbage/missing pack-' + id + ' ignored: ' + amt, ok(log, W, amt), log.response); }
  const n0 = W.cfOrders.length, log = await order(W, plan('std', 0));
  check('price 0 in catalog never makes a 0 order', refused(log, W, n0), log.response);
  const W2 = world({ fs: { mode: 'ok', docs: { 'plan-pro': { price: int(1999) }, 'plan-std': { price: int(0) } } } });
  const a = await order(W2, plan('pro', 1999)), b = await order(W2, plan('std', 999));
  check('mixed: valid doc used, invalid doc falls back', a.response.body.amount === 1999 && W2.cfOrders[0].order_amount === 1999 && ok(b, W2, 999), [a.response, b.response]);
  const W3 = world({ fs: { mode: 'body', body: [{ found: { name: ROOT + '/catalog/x/sub/plan-pro', fields: { price: int(1) } } }, null, 'x', { found: null }] } });
  const c = await order(W3, plan('pro', 1800));
  check('odd batchGet rows do not crash and do not change prices', ok(c, W3, 1800), c.response);
}
// ---- untouched: bills, car-on-book plan, legacy, tips, store ----
{
  const car = row({ car: 'City', num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 999, owes: 0, paidTo: '2026-11-01', lastIds: '1' });
  const W = world({ rows: [car], fs: { mode: 'ok', docs: LIVE } });
  let log = await order(W, { amount: 999, kind: 'Monthly bill', phone: '9000011111', num: 'DL3CXY9999', label: 'Monthly bill' });
  check('bill: Monthly Fee from Notion (999), catalog plan-std 1199 ignored', ok(log, W, 999) && last(W).order_tags.kind === 'bill', log.response);
  log = await order(W, plan('std', 999));
  check('car on the book paying a plan: still its Monthly Fee', ok(log, W, 999) && last(W).order_tags.kind === 'bill', log.response);
  const W2 = world({ fs: { mode: 'ok', docs: LIVE } });
  log = await order(W2, plan('legacy', 500, { label: 'Legacy' }));
  check('legacy plan still 500', ok(log, W2, 500), log.response);
  log = await order(W2, { amount: 50, kind: 'tip', phone: '9000011111', label: 'Tip' });
  check('tip unchanged', ok(log, W2, 50) && last(W2).order_tags.kind === 'tip', log.response);
  log = await order(W2, { kind: 'order', items: [{ id: 'store-perfume', q: 2 }], phone: '9000011111', num: 'DL3CXY9999' });
  check('store order unchanged (2 x 499)', ok(log, W2, 998), log.response);
}
check('no service-account or Cashfree secret in workflow 8', !/BEGIN (RSA )?PRIVATE KEY|test-secret-not-real/.test(JSON.stringify(WF)));
console.log(`# pass ${pass}  fail ${fail}`);
process.exit(fail ? 1 : 0);
