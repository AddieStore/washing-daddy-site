// node test.mjs — the PIN login against a fake Google (token endpoint, Firestore REST, Identity Toolkit).
// The RSA key is generated fresh on every run and thrown away: no real key is ever used or needed.
import fs from 'node:fs'; import crypto from 'node:crypto'; import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const src = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8');
const m = new Function('crypto', src + '; return { pinPhone, pinOk, pinHash, pinVerify, pinLockedUntil, pinAfterFail, parseSa, oauthAssertion, customToken, fsFields, fsEncode, pinLogin, PIN_ITER, FCM_AUD };')(crypto);

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const SA = { type: 'service_account', project_id: 'wd-test-project', client_email: 'pin-login@wd-test-project.iam.gserviceaccount.com', private_key: PEM, private_key_id: 'test' };
const SA_RAW = JSON.stringify(SA);
const PROJ = SA.project_id;

const unb64url = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function verifyJwt(jwt) {
  const [h, p, s] = jwt.split('.');
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), publicKey, unb64url(s)), 'signature');
  return { header: JSON.parse(unb64url(h)), claims: JSON.parse(unb64url(p)) };
}

/* ---------- pure helpers ---------- */
assert.equal(m.pinPhone('9876504210'), '+919876504210');
for (const bad of ['', '987650421', '98765042100', '+919876504210', '1234567890', ' 98765 04210', null, undefined, {}, ['9876504210']])
  assert.equal(m.pinPhone(bad), null, String(bad));
for (const p of ['1234', '12345', '123456']) assert.ok(m.pinOk(p));
for (const p of ['123', '1234567', '12a4', 1234, '', null, ' 1234']) assert.ok(!m.pinOk(p), String(p));

const salt = crypto.randomBytes(16).toString('base64');
const h = m.pinHash('482913', salt);
assert.equal(h, crypto.pbkdf2Sync('482913', Buffer.from(salt, 'base64'), 150000, 32, 'sha256').toString('base64'));
assert.equal(Buffer.from(h, 'base64').length, 32);
// the admin page hashes in the browser with WebCrypto: same bytes
const wc = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(salt, 'base64'), iterations: 150000 },
  await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode('482913'), 'PBKDF2', false, ['deriveBits']), 256);
assert.equal(Buffer.from(wc).toString('base64'), h);
assert.ok(m.pinVerify('482913', { salt, hash: h }));
assert.ok(!m.pinVerify('482914', { salt, hash: h }));
assert.ok(!m.pinVerify('482913', { salt, hash: '' }));
assert.ok(!m.pinVerify('482913', { salt: '', hash: h }));
assert.ok(!m.pinVerify('482913', { salt, hash: h.slice(0, 20) }));
assert.ok(!m.pinVerify('482913', null));

const T0 = Date.parse('2026-11-13T05:00:00Z');
let r = { fails: 0 };
for (let i = 1; i <= 4; i++) { r = m.pinAfterFail(r, T0); assert.equal(r.fails, i); assert.equal(r.locked, false); assert.equal(r.locked_until, null) }
r = m.pinAfterFail(r, T0);
assert.equal(r.locked, true); assert.equal(r.fails, 0); assert.equal(Date.parse(r.locked_until), T0 + 15 * 60000);
assert.ok(m.pinLockedUntil(r, T0 + 14 * 60000));
assert.equal(m.pinLockedUntil(r, T0 + 15 * 60000), 0);
assert.equal(m.pinLockedUntil({ locked_until: null }, T0), 0);
assert.equal(m.pinLockedUntil({ locked_until: 'garbage' }, T0), 0);
assert.equal(m.pinAfterFail({ fails: 'x' }, T0).fails, 1);

assert.equal(m.parseSa('not json'), null);
assert.equal(m.parseSa(JSON.stringify({ ...SA, client_email: 'a@gmail.com' })), null);
assert.equal(m.parseSa(JSON.stringify({ ...SA, private_key: 'nope' })), null);
assert.equal(m.parseSa(SA_RAW).project_id, PROJ);
assert.equal(m.parseSa(Buffer.from(SA_RAW).toString('base64')).client_email, SA.client_email);   // base64 form
assert.equal(m.parseSa(Buffer.from('nope').toString('base64')), null);

{ // OAuth grant
  const { header, claims } = verifyJwt(m.oauthAssertion(m.parseSa(SA_RAW), T0));
  assert.equal(header.alg, 'RS256');
  assert.equal(claims.iss, SA.client_email); assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
  assert.match(claims.scope, /auth\/datastore/); assert.match(claims.scope, /auth\/identitytoolkit/);
  assert.equal(claims.exp - claims.iat, 3600);
}
{ // custom token claims, exactly what Firebase expects
  const { header, claims } = verifyJwt(m.customToken(m.parseSa(SA_RAW), 'uid-abc', T0));
  assert.deepEqual(header, { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(Object.keys(claims).sort(), ['aud', 'exp', 'iat', 'iss', 'sub', 'uid']);
  assert.equal(claims.iss, SA.client_email); assert.equal(claims.sub, SA.client_email);
  assert.equal(claims.aud, 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit');
  assert.equal(claims.uid, 'uid-abc'); assert.equal(claims.iat, Math.floor(T0 / 1000)); assert.ok(claims.exp - claims.iat <= 3600);
  assert.throws(() => m.customToken(m.parseSa(SA_RAW), '', T0));
}
assert.deepEqual(m.fsFields({ fields: { a: { stringValue: 'x' }, b: { integerValue: '3' }, c: { booleanValue: true }, d: { nullValue: null } } }), { a: 'x', b: 3, c: true, d: null });

/* ---------- fake Google ---------- */
function fakeGoogle(opts = {}) {
  const docs = new Map();      // 'washerpins/+91..' -> { fields: plain, updateTime }
  const users = new Map();     // phone -> { localId, phoneNumber, disabled? }
  let clock = 0, uidN = 0, nextConflicts = opts.conflicts || 0;
  const log = [];
  const put = (path, fields) => docs.set(path, { fields: { ...fields }, updateTime: '2026-11-13T00:00:00.' + String(++clock).padStart(6, '0') + 'Z' });
  const enc = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, m.fsEncode(v)]));
  const base = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/`;
  const it = `https://identitytoolkit.googleapis.com/v1/projects/${PROJ}`;
  let token = null;
  async function http(o) {
    log.push(o.method + ' ' + o.url.split('?')[0]);
    if (opts.down) return { status: 0, body: null };
    if (o.url === 'https://oauth2.googleapis.com/token') {
      const p = new URLSearchParams(o.body);
      assert.equal(p.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      const { claims } = verifyJwt(p.get('assertion'));
      assert.equal(claims.iss, SA.client_email);
      token = 'ya29.fake-' + crypto.randomBytes(4).toString('hex');
      return { status: 200, body: { access_token: token, expires_in: 3599, token_type: 'Bearer' } };
    }
    if (!o.headers || o.headers.Authorization !== 'Bearer ' + token) return { status: 401, body: { error: { status: 'UNAUTHENTICATED' } } };
    if (o.url.startsWith(base)) {
      const [pathEnc, qs] = o.url.slice(base.length).split('?');
      const path = pathEnc.split('/').map(decodeURIComponent).join('/');
      const d = docs.get(path);
      if (o.method === 'GET') return d ? { status: 200, body: { name: path, fields: enc(d.fields), updateTime: d.updateTime } } : { status: 404, body: { error: { status: 'NOT_FOUND' } } };
      if (o.method === 'PATCH') {
        const q = new URLSearchParams(qs), mask = q.getAll('updateMask.fieldPaths'), pre = q.get('currentDocument.updateTime');
        assert.ok(mask.length, 'PATCH must carry an updateMask');
        if (nextConflicts > 0) { nextConflicts--; const cur = docs.get(path); put(path, cur.fields) }   // someone else wrote meanwhile
        const cur = docs.get(path);
        if (!cur || cur.updateTime !== pre) return { status: 400, body: { error: { status: 'FAILED_PRECONDITION' } } };
        const body = JSON.parse(o.body), next = { ...cur.fields };
        for (const k of mask) next[k] = m.fsFields({ fields: { [k]: body.fields[k] } })[k];
        assert.deepEqual(Object.keys(body.fields).sort(), mask.slice().sort());
        put(path, next);
        return { status: 200, body: {} };
      }
    }
    if (o.url === it + '/accounts:lookup') {
      const want = JSON.parse(o.body).phoneNumber;
      return { status: 200, body: want.some(p => users.has(p)) ? { users: want.filter(p => users.has(p)).map(p => users.get(p)) } : {} };
    }
    if (o.url === it + '/accounts') {
      const p = JSON.parse(o.body).phoneNumber;
      if (users.has(p)) return { status: 400, body: { error: { message: 'PHONE_NUMBER_EXISTS' } } };
      const u = { localId: 'new-uid-' + (++uidN), phoneNumber: p }; users.set(p, u);
      return { status: 200, body: { localId: u.localId } };
    }
    return { status: 404, body: null };
  }
  return { docs, users, put, http, log };
}
const P10 = '9811122233', P = '+91' + P10, PIN = '482913';
function setup(opts) {
  const g = fakeGoogle(opts);
  g.put('washers/' + P, { phone: P, name: 'Test Washer', status: 'approved', route_id: 'chotte' });
  g.put('washerpins/' + P, { salt, hash: h, active: true, fails: 0, locked_until: null, updated_at: '2026-11-13T10:00:00+05:30' });
  return g;
}
let now = T0, slept = 0;
const deps = (g, extra = {}) => ({ saRaw: SA_RAW, project: PROJ, http: g.http, now: () => now, sleep: async ms => { slept += ms }, jitter: () => 100, ...extra });
const login = (g, body, extra) => m.pinLogin(body, deps(g, extra));
const pinDoc = g => g.docs.get('washerpins/' + P).fields;

{ // happy path, existing phone-OTP user: same uid, no new account
  const g = setup(); g.users.set(P, { localId: 'otp-uid-1', phoneNumber: P });
  const res = await login(g, { phone: P10, pin: PIN });
  assert.equal(res.status, 200); assert.equal(res.body.ok, true);
  const { claims } = verifyJwt(res.body.token);
  assert.equal(claims.uid, 'otp-uid-1');
  assert.ok(!g.log.some(l => l.endsWith('/accounts')), 'must not create a second account');
  assert.deepEqual(Object.keys(res.body).sort(), ['ok', 'token']);
}
{ // happy path, number never signed in: an account with that phone number is made
  const g = setup();
  const res = await login(g, { phone: P10, pin: PIN });
  assert.equal(res.body.ok, true);
  assert.equal(verifyJwt(res.body.token).claims.uid, 'new-uid-1');
  assert.equal(g.users.get(P).phoneNumber, P);
  const again = await login(g, { phone: P10, pin: PIN });      // second login reuses it
  assert.equal(verifyJwt(again.body.token).claims.uid, 'new-uid-1');
}
{ // wrong PIN x5 -> locked 15 min, right PIN refused while locked, works after, counters reset
  const g = setup(); slept = 0;
  for (let i = 1; i <= 4; i++) {
    const res = await login(g, { phone: P10, pin: '000000' });
    assert.deepEqual(res.body, { ok: false, code: 'bad_pin' }); assert.equal(pinDoc(g).fails, i);
  }
  assert.ok(slept >= 4 * 400, 'failures are slowed down');
  const fifth = await login(g, { phone: P10, pin: '000000' });
  assert.deepEqual(fifth.body, { ok: false, code: 'locked' });
  assert.equal(Date.parse(pinDoc(g).locked_until), now + 15 * 60000);
  assert.deepEqual((await login(g, { phone: P10, pin: PIN })).body, { ok: false, code: 'locked' });
  now += 14 * 60000;
  assert.deepEqual((await login(g, { phone: P10, pin: PIN })).body, { ok: false, code: 'locked' });
  now += 61000;
  const ok = await login(g, { phone: P10, pin: PIN });
  assert.equal(ok.body.ok, true);
  assert.equal(pinDoc(g).fails, 0); assert.equal(pinDoc(g).locked_until, null);
  now = T0;
}
{ // a success resets an earlier count
  const g = setup();
  await login(g, { phone: P10, pin: '111111' }); await login(g, { phone: P10, pin: '222222' });
  assert.equal(pinDoc(g).fails, 2);
  assert.equal((await login(g, { phone: P10, pin: PIN })).body.ok, true);
  assert.equal(pinDoc(g).fails, 0);
}
{ // two attempts racing: the precondition makes the second recount from the fresh doc
  const g = setup({ conflicts: 1 });
  const res = await login(g, { phone: P10, pin: '000000' });
  assert.equal(res.body.code, 'bad_pin'); assert.equal(pinDoc(g).fails, 1);
  assert.equal(g.log.filter(l => l.startsWith('PATCH')).length, 2);
}
{ // the count cannot be written -> 'server', never 'bad_pin'
  const g = setup({ conflicts: 99 });
  assert.equal((await login(g, { phone: P10, pin: '000000' })).body.code, 'server');
}
{ // PIN not set / disabled / malformed doc
  const g = fakeGoogle(); g.put('washers/' + P, { status: 'approved' });
  assert.deepEqual((await login(g, { phone: P10, pin: PIN })).body, { ok: false, code: 'not_set' });
  g.put('washerpins/' + P, { salt, hash: h, active: false, fails: 0, locked_until: null });
  assert.equal((await login(g, { phone: P10, pin: PIN })).body.code, 'not_set');
  g.put('washerpins/' + P, { active: true });
  assert.equal((await login(g, { phone: P10, pin: PIN })).body.code, 'not_set');
}
{ // right PIN but not an approved washer (no doc, pending, blocked) -> not_washer, and no token, no account
  for (const w of [null, { status: 'pending' }, { status: 'blocked' }, { name: 'x' }]) {
    const g = setup();
    if (w) g.put('washers/' + P, w); else g.docs.delete('washers/' + P);
    const res = await login(g, { phone: P10, pin: PIN });
    assert.deepEqual(res.body, { ok: false, code: 'not_washer' });
    assert.ok(!g.log.some(l => l.includes('identitytoolkit')));
  }
  // wrong PIN for a non-washer says bad_pin (who is a washer is not given away without the PIN)
  const g = setup(); g.put('washers/' + P, { status: 'pending' });
  assert.equal((await login(g, { phone: P10, pin: '000000' })).body.code, 'bad_pin');
}
{ // disabled Firebase user
  const g = setup(); g.users.set(P, { localId: 'u1', phoneNumber: P, disabled: true });
  assert.equal((await login(g, { phone: P10, pin: PIN })).body.code, 'not_washer');
}
{ // the owner's number can never use a PIN, even with a doc and an approved washer record
  const g = fakeGoogle(); const O = '+917701808924';
  g.put('washers/' + O, { status: 'approved' }); g.put('washerpins/' + O, { salt, hash: h, active: true, fails: 0 });
  assert.equal((await login(g, { phone: '7701808924', pin: PIN })).body.code, 'not_washer');
  assert.equal(g.log.length, 0, 'not even a token is asked for');
  // and numbers from PIN_DENY_PHONES
  const g2 = setup();
  assert.equal((await login(g2, { phone: P10, pin: PIN }, { deny: ' +910000000000 , ' + P })).body.code, 'not_washer');
}
{ // bad input -> bad_pin, nothing touched
  const g = setup();
  for (const b of [null, {}, { phone: P10 }, { phone: P10, pin: '12' }, { phone: P10, pin: 482913 }, { phone: '+91' + P10, pin: PIN }, { phone: P10, pin: '1234567' }, 'x']) {
    assert.deepEqual((await login(g, b)).body, { ok: false, code: 'bad_pin' });
  }
  assert.equal(g.log.length, 0);
}
{ // setup problems and outages -> server (500), nothing more said
  const g = setup();
  for (const extra of [{ saRaw: '' }, { saRaw: '{"x":1}' }, { project: 'another-project' }]) {
    const res = await login(g, { phone: P10, pin: PIN }, extra);
    assert.equal(res.status, 500); assert.deepEqual(res.body, { ok: false, code: 'server' });
  }
  assert.deepEqual((await login(setup({ down: true }), { phone: P10, pin: PIN })).body, { ok: false, code: 'server' });
  assert.equal((await login(setup(), { phone: P10, pin: PIN }, { sleep: async () => { throw new Error('x') }, http: async () => { throw new Error('boom') } })).body.code, 'server');
}

/* ---------- the built workflow: run its Code node the way n8n would ---------- */
const wf = JSON.parse(fs.readFileSync(new URL('./12-washer-pin-login.json', import.meta.url), 'utf8'));
const code = wf.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
assert.ok(code.includes(fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8')), 'JSON is stale: run node build.mjs');
assert.equal(wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook').parameters.path, 'wd-washer-pin');
assert.equal(wf.settings.saveDataSuccessExecution, 'none'); assert.equal(wf.settings.saveDataErrorExecution, 'none');
assert.ok(!/BEGIN [A-Z ]*PRIVATE KEY-----\n/.test(JSON.stringify(wf)), 'no key in the workflow');
{
  const g = setup(); g.users.set(P, { localId: 'otp-uid-9', phoneNumber: P });
  const require = createRequire(import.meta.url);
  const helpers = { httpRequest: async o => { const r = await g.http(o); if (r.status === 0) throw new Error('down'); return { statusCode: r.status, body: JSON.stringify(r.body) } } };
  const run = new Function('require', '$input', '$env', 'return (async function () {' + code + '\n}).call(this)');
  const out = await run.call({ helpers }, require, { first: () => ({ json: { body: { phone: P10, pin: PIN } } }) }, { FIREBASE_SA_JSON: SA_RAW, FIREBASE_PROJECT_ID: PROJ });
  assert.equal(out[0].json.status, 200);
  assert.equal(verifyJwt(out[0].json.body.token).claims.uid, 'otp-uid-9');
  const b64 = await run.call({ helpers }, require, { first: () => ({ json: { body: { phone: P10, pin: PIN } } }) }, { FIREBASE_SA_JSON: Buffer.from(SA_RAW).toString('base64') });
  assert.equal(b64[0].json.body.ok, true);
  const bad = await run.call({ helpers }, require, { first: () => ({ json: { body: { phone: P10, pin: '999999' } } }) }, { FIREBASE_SA_JSON: SA_RAW });
  assert.deepEqual(bad[0].json.body, { ok: false, code: 'bad_pin' });
}
console.log('all passed');
