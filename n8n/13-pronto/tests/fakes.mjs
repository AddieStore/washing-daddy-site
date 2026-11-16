// Fake Google (securetoken certs, OAuth token), Firestore REST and Cashfree PG for the offline tests.
// One function `http(opts)` answers like n8n's this.helpers.httpRequest({ returnFullResponse, ignoreHttpStatusErrors }).
import crypto from 'node:crypto';

export const PROJECT = 'wd-test-project';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;

export function keys() {
  const fb = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    fbPriv: fb.privateKey, fbPubPem: fb.publicKey.export({ type: 'spki', format: 'pem' }),
    saPrivPem: sa.privateKey.export({ type: 'pkcs8', format: 'pem' }), saPub: sa.publicKey,
  };
}
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export function idToken(K, claims, opt = {}) {
  const now = Math.floor((opt.now || Date.now()) / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: opt.kid || 'k1', typ: 'JWT' }));
  const p = b64u(JSON.stringify(Object.assign({ aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, iat: now - 10, exp: now + 3000, auth_time: now - 10, sub: 'uid1' }, claims)));
  const s = b64u(crypto.createSign('RSA-SHA256').update(h + '.' + p).sign(opt.priv || K.fbPriv));
  return h + '.' + p + '.' + s;
}

// ---- Firestore values ----
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const f = {}; for (const k of Object.keys(v)) f[k] = enc(v[k]); return { mapValue: { fields: f } };
}
function dec(v) {
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; for (const k of Object.keys(v.mapValue.fields || {})) o[k] = dec(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
}

export function makeWorld(K, seed = {}) {
  const docs = new Map();   // 'coll/id' -> { data, updateTime }
  let tick = 1;
  const stamp = () => '2026-11-16T00:00:00.' + String(tick++).padStart(6, '0') + 'Z';
  const put = (path, data) => docs.set(path, { data: JSON.parse(JSON.stringify(data)), updateTime: stamp() });
  for (const [p, d] of Object.entries(seed)) put(p, d);
  const raw = (path, d) => ({ name: ROOT + '/' + path, fields: enc(d.data).mapValue.fields, updateTime: d.updateTime });
  const W = { docs, put, get: p => (docs.has(p) ? docs.get(p).data : undefined), calls: [], cfOrders: new Map(), cfRefunds: [], commits: 0,
    failNextCommit: 0, cfFail: false, refundFail: false, dispatches: [] };
  const res = (statusCode, body, headers = {}) => ({ statusCode, body, headers });

  W.http = async o => {
    const url = o.url, m = o.method;
    W.calls.push({ m, url });
    if (url.startsWith('https://www.googleapis.com/robot/')) return res(200, { k1: K.fbPubPem }, { 'cache-control': 'public, max-age=3600' });
    if (url === 'https://oauth2.googleapis.com/token') {
      const form = o.form || Object.fromEntries(new URLSearchParams(o.body));
      const [h, p, s] = String(form.assertion).split('.');
      const ok = crypto.createVerify('RSA-SHA256').update(h + '.' + p).verify(K.saPub, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      const c = JSON.parse(Buffer.from(p, 'base64').toString());
      if (!ok || c.scope !== 'https://www.googleapis.com/auth/datastore') return res(400, { error: 'invalid_grant' });
      return res(200, { access_token: 'ya29.fake', expires_in: 3599 });
    }
    if (url.startsWith('https://firestore.googleapis.com/v1/' + ROOT)) {
      if ((o.headers || {}).Authorization !== 'Bearer ya29.fake') return res(401, { error: { status: 'UNAUTHENTICATED' } });
      const rest = url.slice(('https://firestore.googleapis.com/v1/' + ROOT).length);
      if (m === 'GET') {
        const [pathPart] = rest.slice(1).split('?');
        const segs = pathPart.split('/').map(decodeURIComponent);
        if (segs.length === 2) { const d = docs.get(segs.join('/')); return d ? res(200, raw(segs.join('/'), d)) : res(404, { error: { code: 404, status: 'NOT_FOUND' } }); }
        const list = [...docs.entries()].filter(([p]) => p.startsWith(segs[0] + '/') && p.split('/').length === 2).map(([p, d]) => raw(p, d));
        return res(200, list.length ? { documents: list } : {});
      }
      if (rest === ':runQuery') {
        const q = o.body.structuredQuery, coll = q.from[0].collectionId, f = q.where.fieldFilter, want = dec(f.value);
        const out = [...docs.entries()].filter(([p, d]) => p.startsWith(coll + '/') && d.data[f.field.fieldPath] === want).slice(0, q.limit || 100).map(([p, d]) => ({ document: raw(p, d) }));
        return res(200, out.length ? out : [{ readTime: 'x' }]);
      }
      if (rest === ':commit') {
        W.commits++;
        if (W.failNextCommit > 0) { W.failNextCommit--; return res(400, { error: { status: 'FAILED_PRECONDITION' } }); }
        const writes = o.body.writes;
        for (const w of writes) {   // check every precondition first: all or nothing
          const path = w.update.name.slice(ROOT.length + 1), cur = docs.get(path), c = w.currentDocument || {};
          if (c.exists === false && cur) return res(409, { error: { status: 'ALREADY_EXISTS' } });
          if (c.exists === true && !cur) return res(404, { error: { status: 'NOT_FOUND' } });
          if (c.updateTime && (!cur || cur.updateTime !== c.updateTime)) return res(400, { error: { status: 'FAILED_PRECONDITION' } });
        }
        for (const w of writes) {
          const path = w.update.name.slice(ROOT.length + 1), data = dec({ mapValue: { fields: w.update.fields } });
          if (w.updateMask) { const cur = docs.get(path); const merged = Object.assign({}, cur ? cur.data : {}); for (const k of w.updateMask.fieldPaths) merged[k] = data[k]; put(path, merged); }
          else put(path, data);
        }
        return res(200, { writeResults: [] });
      }
    }
    if (url.startsWith('https://api.cashfree.com/pg/')) {
      if (!o.headers['x-client-id'] || !o.headers['x-client-secret'] || o.headers['x-api-version'] !== '2023-08-01') return res(401, { message: 'auth' });
      const path = url.slice('https://api.cashfree.com'.length);
      if (m === 'POST' && path === '/pg/orders') {
        if (W.cfFail) return res(500, { message: 'down' });
        const b = o.body;
        if (W.cfOrders.has(b.order_id)) return res(409, { message: 'order with same id already exists' });
        if (!(b.order_amount >= 1)) return res(400, { message: 'order_amount invalid' });
        const ord = Object.assign({}, b, { payment_session_id: 'session_' + b.order_id, order_status: 'ACTIVE' });
        W.cfOrders.set(b.order_id, ord); return res(200, ord);
      }
      let mm = /^\/pg\/orders\/([^/]+)$/.exec(path);
      if (m === 'GET' && mm) { const ord = W.cfOrders.get(mm[1]); return ord ? res(200, ord) : res(404, { message: 'order not found' }); }
      mm = /^\/pg\/orders\/([^/]+)\/refunds$/.exec(path);
      if (m === 'POST' && mm) {
        if (W.refundFail) return res(400, { message: 'refund not allowed' });
        if (W.cfRefunds.some(r => r.refund_id === o.body.refund_id)) return res(409, { message: 'refund_id already exists' });
        W.cfRefunds.push(Object.assign({ order_id: mm[1] }, o.body)); return res(200, { refund_status: 'PENDING' });
      }
    }
    if (url.endsWith('/webhook/wd-ondemand-dispatch')) { W.dispatches.push(o.body); return res(200, { ok: true }); }
    if (W.route) { const r = await W.route(o); if (r) return r; }
    return res(599, { message: 'fake: no route for ' + m + ' ' + url });
  };
  // Cashfree's PAYMENT_SUCCESS webhook, signed with the secret
  W.cfWebhook = (secret, orderId, amount, opt = {}) => {
    const ord = W.cfOrders.get(orderId) || {};
    const body = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {
      order: { order_id: orderId, order_amount: amount, order_currency: 'INR', order_tags: ord.order_tags || {}, order_note: ord.order_note },
      payment: { cf_payment_id: opt.payId || 'pay' + Math.floor(Math.random() * 1e9), payment_status: opt.status || 'SUCCESS', payment_amount: amount, payment_currency: 'INR', payment_group: 'upi' },
      customer_details: ord.customer_details || {} } });
    const ts = String(opt.ts || Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac('sha256', secret).update(ts + body).digest('base64');
    return { headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': opt.badSig ? (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1) : sig }, rawBody: body };
  };
  return W;
}
