// Washer PIN login: pure helpers. The workflow's Code node embeds this file (plus logic.js) after
// `const crypto = require('crypto')`, and test.mjs runs the same text against Node's crypto.
// Nothing here talks to the network and nothing here logs: a PIN, a hash or a key never leaves a function.

const PIN_ITER = 150000;        // PBKDF2-SHA256 iterations (the admin page uses the same number)
const PIN_KEYLEN = 32;          // bytes
const PIN_MAX_FAILS = 5;        // wrong PINs in a row before the lock
const PIN_LOCK_MS = 15 * 60 * 1000;
const FCM_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');
// Numbers that may never sign in with a PIN, whatever Firestore says: the admins (their phone number is what
// makes them admin in the rules, so a PIN for them would be a PIN for the whole database).
const PIN_DENY = ['+917701808924'];

// '9876504210' (exactly 10 digits, Indian mobile) -> '+919876504210', anything else -> null
function pinPhone(v) {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  return /^[6-9]\d{9}$/.test(s) ? '+91' + s : null;
}
const pinOk = v => typeof v === 'string' && /^\d{4,6}$/.test(v);

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// PBKDF2-SHA256(pin, salt) -> base64. salt is base64 (16 random bytes from the admin page).
function pinHash(pin, saltB64) {
  return crypto.pbkdf2Sync(Buffer.from(String(pin), 'utf8'), Buffer.from(String(saltB64), 'base64'), PIN_ITER, PIN_KEYLEN, 'sha256').toString('base64');
}

// Constant-time check. Always runs the full PBKDF2, even when the stored record is malformed.
function pinVerify(pin, rec) {
  const salt = rec && typeof rec.salt === 'string' ? rec.salt : '';
  const want = Buffer.from(rec && typeof rec.hash === 'string' ? rec.hash : '', 'base64');
  const got = Buffer.from(pinHash(pin, salt || 'AAAAAAAAAAAAAAAAAAAAAA=='), 'base64');
  const shapeOk = salt.length > 0 && want.length === PIN_KEYLEN;
  const cmp = shapeOk ? want : Buffer.alloc(PIN_KEYLEN);
  const same = crypto.timingSafeEqual(got, cmp);
  return shapeOk && same;
}

// Is this record locked at `now` (ms)? Returns the unlock time in ms, or 0.
function pinLockedUntil(rec, now) {
  const t = rec && rec.locked_until ? Date.parse(rec.locked_until) : NaN;
  return Number.isFinite(t) && t > now ? t : 0;
}

// Counters after a wrong PIN. The 5th wrong one in a row locks for 15 minutes and starts the count again.
function pinAfterFail(rec, now) {
  const before = rec && Number.isInteger(rec.fails) && rec.fails > 0 ? rec.fails : 0;
  const fails = before + 1;
  if (fails >= PIN_MAX_FAILS) return { fails: 0, locked_until: new Date(now + PIN_LOCK_MS).toISOString(), locked: true };
  return { fails, locked_until: null, locked: false };
}

/* ---------- service account + JWTs (RS256) ---------- */
// FIREBASE_SA_JSON may be the key JSON itself or the same JSON base64-encoded (one safe line for an env file).
function parseSa(raw) {
  let sa = raw;
  if (typeof raw === 'string') {
    let txt = raw.trim();
    if (txt && txt[0] !== '{') { try { txt = Buffer.from(txt, 'base64').toString('utf8') } catch (e) { return null } }
    try { sa = JSON.parse(txt) } catch (e) { return null }
  }
  if (!sa || typeof sa !== 'object') return null;
  if (typeof sa.client_email !== 'string' || !/@.+\.iam\.gserviceaccount\.com$/.test(sa.client_email)) return null;
  if (typeof sa.private_key !== 'string' || sa.private_key.indexOf('PRIVATE KEY') < 0) return null;
  if (typeof sa.project_id !== 'string' || !/^[a-z0-9-]{4,40}$/.test(sa.project_id)) return null;
  return { client_email: sa.client_email, private_key: sa.private_key, project_id: sa.project_id };
}

function signJwt(payload, pem) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const s = crypto.createSign('RSA-SHA256');
  s.update(head + '.' + body);
  return head + '.' + body + '.' + b64url(s.sign(pem));
}

// The grant Google's token endpoint swaps for an access token (1 hour).
function oauthAssertion(sa, nowMs) {
  const iat = Math.floor(nowMs / 1000);
  return signJwt({ iss: sa.client_email, sub: sa.client_email, scope: OAUTH_SCOPES, aud: OAUTH_URL, iat, exp: iat + 3600 }, sa.private_key);
}

// A Firebase custom token for `uid`: the app passes it to signInWithCustomToken. Valid for at most an hour.
function customToken(sa, uid, nowMs) {
  if (typeof uid !== 'string' || !uid || uid.length > 128) throw new Error('bad uid');
  const iat = Math.floor(nowMs / 1000);
  return signJwt({ iss: sa.client_email, sub: sa.client_email, aud: FCM_AUD, iat, exp: iat + 3600, uid }, sa.private_key);
}

/* ---------- Firestore REST values ---------- */
function fsValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  return undefined;     // maps/arrays are not needed here
}
function fsFields(doc) {
  const out = {}, f = doc && doc.fields && typeof doc.fields === 'object' ? doc.fields : {};
  for (const k of Object.keys(f)) out[k] = fsValue(f[k]);
  return out;
}
function fsEncode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === 'number') return { doubleValue: v };
  return { stringValue: String(v) };
}
