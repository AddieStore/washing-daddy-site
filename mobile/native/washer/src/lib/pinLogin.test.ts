import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPinToken, PIN_MSG, isPin, isPhone10 } from './pinLogin.ts';

const URL = 'https://n8n.example/webhook/wd-washer-pin';
const reply = (status: number, body: unknown) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const TOKEN = 'aaa.bbb.ccc';

test('sends phone and pin as JSON, returns the token', async () => {
  let seen: any = null;
  const r = await requestPinToken(URL, '9811122233', '482913', async (u, init) => { seen = { u, ...init }; return { ok: true, status: 200, json: async () => ({ ok: true, token: TOKEN }) } });
  assert.deepEqual(r, { ok: true, token: TOKEN });
  assert.equal(seen.u, URL); assert.equal(seen.method, 'POST');
  assert.deepEqual(JSON.parse(seen.body), { phone: '9811122233', pin: '482913' });
  assert.equal(seen.headers['Content-Type'], 'application/json');
});

test('server codes come through, anything else is server', async () => {
  for (const code of ['bad_pin', 'locked', 'not_set', 'not_washer', 'server'] as const)
    assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', reply(200, { ok: false, code })), { ok: false, code });
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', reply(500, { ok: false, code: 'server' })), { ok: false, code: 'server' });
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', reply(200, { ok: false, code: 'weird' })), { ok: false, code: 'server' });
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', reply(200, { ok: true, token: 'not-a-jwt' })), { ok: false, code: 'server' });
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', async () => ({ ok: false, status: 502, json: async () => { throw new Error('html') } })), { ok: false, code: 'server' });
});

test('no network is offline', async () => {
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', async () => { throw new TypeError('Network request failed') }), { ok: false, code: 'offline' });
  // timeout: the abort rejects the fetch
  const hang = (_u: string, init: any) => new Promise<any>((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  assert.deepEqual(await requestPinToken(URL, '9811122233', '1234', hang, 20), { ok: false, code: 'offline' });
});

test('bad input never leaves the phone', async () => {
  let called = false;
  const f = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) } };
  for (const [p, pin] of [['981112223', '1234'], ['1811122233', '1234'], ['9811122233', '123'], ['9811122233', '1234567'], ['9811122233', '12a4']])
    assert.deepEqual(await requestPinToken(URL, p, pin, f), { ok: false, code: 'bad_pin' });
  assert.equal(called, false);
  assert.ok(isPin('1234') && isPin('123456') && !isPin('12345678'));
  assert.ok(isPhone10('9000000001') && !isPhone10('0000000001'));
});

test('every code has wording', () => {
  for (const c of ['bad_pin', 'locked', 'not_set', 'not_washer', 'server', 'offline']) assert.ok((PIN_MSG as any)[c]);
  assert.match(PIN_MSG.not_set, /Manager se PIN lo/);
  assert.match(PIN_MSG.locked, /15 minute/);
});
