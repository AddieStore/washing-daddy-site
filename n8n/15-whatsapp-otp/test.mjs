// node test.mjs — the WhatsApp sign-in code against a fake Google (token endpoint, Firestore REST, Identity Toolkit) and a fake
// WhatsApp Cloud API. The RSA key is generated fresh on every run and thrown away: no real key is ever used or needed.
import fs from 'node:fs'; import crypto from 'node:crypto'; import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8');
const m = new Function('crypto', src + '; return { waPhone, waCodeOk, waNewCode, waHash, waSame, waSendGate, waMessage, waSendCode, waVerifyCode, waClientIp, waIpKey, waCountGate, FCM_AUD };')(crypto);

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = { type: 'service_account', project_id: 'wd-test-project', client_email: 'otp@wd-test-project.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const unb64url = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function verifyJwt(jwt) {
  const [h, p, s] = jwt.split('.');
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), publicKey, unb64url(s)), 'signature');
  return JSON.parse(unb64url(p));
}

/* ---------- pure helpers ---------- */
assert.equal(m.waPhone('9876504210'), '+919876504210');
for (const bad of ['', '5876504210', '98765042100', '+919876504210', null, {}]) assert.equal(m.waPhone(bad), null, String(bad));
assert.ok(m.waCodeOk('012345')); for (const bad of ['12345', '1234567', 'abcdef', 123456, null]) assert.ok(!m.waCodeOk(bad));
for (let i = 0; i < 200; i++) assert.match(m.waNewCode(), /^\d{6}$/);
const h1 = m.waHash('k', '+919876504210', '123456', 's');
assert.ok(m.waSame(h1, m.waHash('k', '+919876504210', '123456', 's')));
assert.ok(!m.waSame(h1, m.waHash('k', '+919876504210', '123457', 's')));
assert.ok(!m.waSame(h1, m.waHash('k', '+919876504211', '123456', 's')));
assert.ok(!m.waSame('', ''));
const T0 = Date.parse('2026-11-25T05:00:00Z');
assert.equal(m.waSendGate({}, T0).ok, true);
assert.equal(m.waSendGate({ last_sent: new Date(T0 - 10000).toISOString() }, T0).code, 'wait');
assert.equal(m.waSendGate({ last_sent: new Date(T0 - 10000).toISOString() }, T0).wait, 20);
assert.equal(m.waSendGate({ sends: 5, window_start: new Date(T0 - 60000).toISOString() }, T0).code, 'too_many');
assert.equal(m.waSendGate({ sends: 5, window_start: new Date(T0 - 3700000).toISOString() }, T0).sends, 1);   // new hour, new count
const msg = m.waMessage('+919876504210', '654321', 'wd_login', 'en');
assert.equal(msg.to, '919876504210'); assert.equal(msg.template.components[0].parameters[0].text, '654321'); assert.equal(msg.template.components[1].parameters[0].text, '654321');

/* ---------- fake world ---------- */
function world({ waFails = null, users = [] } = {}) {
  const docs = {}, sent = [], accounts = users.slice();
  let t = T0, codes = ['111111', '222222', '333333', '444444'], ver = 0;
  const base = 'https://firestore.googleapis.com/v1/projects/' + SA.project_id + '/databases/(default)/documents/';
  const enc = f => { const o = {}; for (const k of Object.keys(f)) { const v = f[k]; o[k] = v === null ? { nullValue: null } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) } } return o };
  const http = async ({ method, url, body }) => {
    if (url === 'https://oauth2.googleapis.com/token') return { status: 200, body: { access_token: 'AT' } };
    if (url.startsWith('https://graph.facebook.com/')) {
      const b = JSON.parse(body); b._url = url; sent.push(b);
      return waFails ? { status: 400, body: { error: { code: waFails } } } : { status: 200, body: { messages: [{ id: 'wamid.x' }] } };
    }
    if (url.startsWith(base)) {
      const [path, q] = url.slice(base.length).split('?'), key = decodeURIComponent(path);
      if (method === 'GET') return docs[key] ? { status: 200, body: { fields: enc(docs[key].f), updateTime: docs[key].u } } : { status: 404, body: null };
      if (method === 'PATCH') {
        const pre = new URLSearchParams(q).get('currentDocument.updateTime');
        if (pre && (!docs[key] || docs[key].u !== pre)) return { status: 400, body: { error: { status: 'FAILED_PRECONDITION' } } };
        const fields = JSON.parse(body).fields, f = { ...(docs[key] ? docs[key].f : {}) };
        for (const k of Object.keys(fields)) { const v = fields[k]; f[k] = 'nullValue' in v ? null : 'integerValue' in v ? Number(v.integerValue) : v.stringValue }
        docs[key] = { f, u: 'v' + (++ver) }; return { status: 200, body: {} };
      }
    }
    if (url.endsWith('/accounts:lookup')) { const p = JSON.parse(body).phoneNumber[0]; return { status: 200, body: { users: accounts.filter(u => u.phoneNumber === p) } } }
    if (url.endsWith('/accounts')) { const u = { localId: 'uid-' + accounts.length, phoneNumber: JSON.parse(body).phoneNumber }; accounts.push(u); return { status: 200, body: u } }
    return { status: 0, body: null };
  };
  const deps = { saRaw: JSON.stringify(SA), wa: { token: 'WT', phoneId: '1234', template: 'wd_login', lang: 'en' }, http,
    now: () => t, sleep: async () => {}, jitter: () => 0, newCode: () => codes.shift(), salt: () => crypto.randomBytes(16).toString('base64') };
  return { deps, docs, sent, accounts, tick: ms => { t += ms } };
}

/* ---------- send + verify, the happy path ---------- */
{
  const w = world({ users: [{ localId: 'old-uid', phoneNumber: '+919876504210' }] });
  let r = await m.waSendCode({ phone: '9876504210' }, w.deps);
  assert.deepEqual(r, { status: 200, body: { ok: true } });
  assert.equal(w.sent.length, 1); assert.equal(w.sent[0].template.components[0].parameters[0].text, '111111');
  assert.ok(!JSON.stringify(w.docs).includes('111111'), 'the code itself is never stored');
  r = await m.waVerifyCode({ phone: '9876504210', code: '111111' }, w.deps);
  assert.equal(r.body.ok, true);
  const claims = verifyJwt(r.body.token);
  assert.equal(claims.uid, 'old-uid', 'same uid as the SMS sign-in'); assert.equal(claims.aud, m.FCM_AUD);
  // one use only
  r = await m.waVerifyCode({ phone: '9876504210', code: '111111' }, w.deps);
  assert.equal(r.body.code, 'expired');
}
/* ---------- a new number gets a Firebase user with that phone number ---------- */
{
  const w = world();
  await m.waSendCode({ phone: '9123456789' }, w.deps);
  const r = await m.waVerifyCode({ phone: '9123456789', code: '111111' }, w.deps);
  assert.equal(r.body.ok, true); assert.equal(w.accounts[0].phoneNumber, '+919123456789');
}
/* ---------- wrong codes, expiry, resend wait, hourly cap ---------- */
{
  const w = world();
  await m.waSendCode({ phone: '9876504210' }, w.deps);
  for (let i = 1; i <= 4; i++) assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '999999' }, w.deps)).body.code, 'wrong_code');
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '999999' }, w.deps)).body.code, 'too_many');
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '111111' }, w.deps)).body.code, 'too_many', 'dead after 5 wrong tries');
  const r = await m.waSendCode({ phone: '9876504210' }, w.deps);
  assert.equal(r.body.code, 'wait'); assert.ok(r.body.wait > 0 && r.body.wait <= 30);
  w.tick(31000);
  assert.equal((await m.waSendCode({ phone: '9876504210' }, w.deps)).body.ok, true);
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '222222' }, w.deps)).body.ok, true, 'a new code works again');
}
{
  const w = world();
  await m.waSendCode({ phone: '9876504210' }, w.deps);
  w.tick(11 * 60000);
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '111111' }, w.deps)).body.code, 'expired');
}
{
  const w = world();
  for (let i = 0; i < 4; i++) { w.tick(31000); assert.equal((await m.waSendCode({ phone: '9876504210' }, w.deps)).body.ok, true) }
  w.deps.newCode = () => '555555';
  w.tick(31000); assert.equal((await m.waSendCode({ phone: '9876504210' }, w.deps)).body.ok, true);
  w.tick(31000); assert.equal((await m.waSendCode({ phone: '9876504210' }, w.deps)).body.code, 'too_many');
}
/* ---------- refusals ---------- */
{
  const w = world();
  assert.equal((await m.waSendCode({ phone: '7701808924' }, w.deps)).body.code, 'use_sms', 'admin numbers sign in by SMS');
  assert.equal((await m.waSendCode({ phone: '12345' }, w.deps)).body.code, 'bad_number');
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '12' }, w.deps)).body.code, 'bad_code');
  assert.equal(w.sent.length, 0);
  const n = world({ waFails: 131026 });
  assert.equal((await m.waSendCode({ phone: '9876504210' }, n.deps)).body.code, 'not_on_whatsapp');
  const s = world({ waFails: 100 });
  const r = await m.waSendCode({ phone: '9876504210' }, s.deps);
  assert.equal(r.status, 500); assert.equal(r.body.code, 'server');
  const k = world(); k.deps.saRaw = 'nope';
  assert.equal((await m.waSendCode({ phone: '9876504210' }, k.deps)).body.code, 'server');
  const nw = world(); nw.deps.wa = {};
  assert.equal((await m.waSendCode({ phone: '9876504210' }, nw.deps)).body.code, 'server');
}
/* ---------- spend caps: per client IP and all numbers together ---------- */
assert.equal(m.waClientIp({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }), '203.0.113.9');
assert.equal(m.waClientIp({ 'x-real-ip': '2001:db8::1' }), '2001:db8::1');
assert.equal(m.waClientIp({ 'x-forwarded-for': 'evil/../x' }), '');
assert.equal(m.waClientIp(null), '');
assert.match(m.waIpKey('k', '203.0.113.9'), /^ip_[A-Za-z0-9_-]{32}$/);
assert.notEqual(m.waIpKey('k', '203.0.113.9'), m.waIpKey('k', '203.0.113.10'));
assert.equal(m.waCountGate({ sends: 3, window_start: new Date(T0 - 1000).toISOString() }, T0, 3).ok, false);
assert.equal(m.waCountGate({ sends: 3, window_start: new Date(T0 - 3700000).toISOString() }, T0, 3).sends, 1);
{
  const w = world(); w.deps.ip = '203.0.113.9'; w.deps.ipMax = '3'; w.deps.newCode = () => '123123';
  const nums = ['9000000011', '9000000012', '9000000013', '9000000014'];
  for (let i = 0; i < 3; i++) assert.equal((await m.waSendCode({ phone: nums[i] }, w.deps)).body.ok, true, 'ip send ' + i);
  assert.equal((await m.waSendCode({ phone: nums[3] }, w.deps)).body.code, 'busy', '4th number from the same IP in the hour: SMS instead');
  assert.equal(w.sent.length, 3);
  assert.ok(!Object.keys(w.docs).some(k => k.includes('203.0.113.9')), 'the IP itself is never stored');
  w.deps.ip = '198.51.100.7';
  assert.equal((await m.waSendCode({ phone: nums[3] }, w.deps)).body.ok, true, 'another IP still works');
  w.deps.ip = '203.0.113.9'; w.tick(61 * 60000);
  assert.equal((await m.waSendCode({ phone: '9000000015' }, w.deps)).body.ok, true, 'next hour the IP may send again');
  // a refused number (wait) does not use up the IP's budget
  w.deps.ip = '192.0.2.1'; w.deps.ipMax = '2';
  assert.equal((await m.waSendCode({ phone: '9000000016' }, w.deps)).body.ok, true);
  for (let i = 0; i < 5; i++) assert.equal((await m.waSendCode({ phone: '9000000016' }, w.deps)).body.code, 'wait');
  assert.equal((await m.waSendCode({ phone: '9000000017' }, w.deps)).body.ok, true);
}
{
  const w = world(); w.deps.allMax = 2; w.deps.newCode = () => '321321';
  assert.equal((await m.waSendCode({ phone: '9000000021' }, w.deps)).body.ok, true);
  assert.equal((await m.waSendCode({ phone: '9000000022' }, w.deps)).body.ok, true);
  const r = await m.waSendCode({ phone: '9000000023' }, w.deps);
  assert.equal(r.status, 200); assert.equal(r.body.code, 'busy', 'over the hourly total the app falls back to SMS');
  assert.equal(w.sent.length, 2);
}
/* ---------- Graph API version ---------- */
{
  const w = world();
  await m.waSendCode({ phone: '9876504210' }, w.deps);
  assert.match(w.sent[0]._url, /^https:\/\/graph\.facebook\.com\/v\d+\.0\/1234\/messages$/);
  const v = world(); v.deps.wa.version = 'v25.0';
  await m.waSendCode({ phone: '9876504210' }, v.deps);
  assert.ok(v.sent[0]._url.startsWith('https://graph.facebook.com/v25.0/'));
  const x = world(); x.deps.wa.version = '../evil';
  await m.waSendCode({ phone: '9876504210' }, x.deps);
  assert.ok(!x.sent[0]._url.includes('evil'));
}
/* ---------- a number put on the deny list while its code is pending ---------- */
{
  const w = world();
  await m.waSendCode({ phone: '9876504210' }, w.deps);
  w.deps.deny = '+919876504210';
  assert.equal((await m.waVerifyCode({ phone: '9876504210', code: '111111' }, w.deps)).body.code, 'expired');
}
console.log('all WhatsApp OTP tests passed');
