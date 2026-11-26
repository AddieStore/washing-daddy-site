// WhatsApp sign-in code: pure helpers. The workflow's Code nodes embed this file (plus logic.js) after
// `const crypto = require('crypto')`, and test.mjs runs the same text against Node's crypto.
// Nothing here talks to the network and nothing here logs: a code, a hash or a key never leaves a function.
// The service-account / JWT / Firestore helpers are the same ones workflow 12 (washer PIN login) uses.

const FCM_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');
const WA_TTL_MS = 10 * 60 * 1000;       // a code works for 10 minutes
const WA_RESEND_MS = 30 * 1000;         // at most one code every 30 s per number
const WA_WINDOW_MS = 60 * 60 * 1000;    // and at most WA_MAX_SENDS codes per number per hour
const WA_MAX_SENDS = 5;
const WA_MAX_TRIES = 5;                 // wrong codes before that code is dead (ask for a new one)
// Spend caps across numbers (each WhatsApp code costs money and someone could cycle through numbers):
const WA_IP_MAX = 20;                   // codes per hour from one client IP (n8n env WA_OTP_IP_MAX overrides)
const WA_ALL_MAX = 300;                 // codes per hour in total (n8n env WA_OTP_HOURLY_MAX overrides); over it the app uses SMS
const WA_GRAPH_VERSION = 'v25.0';       // Meta Graph API version (n8n env WA_GRAPH_VERSION overrides)
// Numbers that never get a WhatsApp code: the admins (their number is admin in the Firestore rules). They sign in by SMS.
const WA_DENY = ['+917701808924'];

// '9876504210' (exactly 10 digits, Indian mobile) -> '+919876504210', anything else -> null
function waPhone(v) {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  return /^[6-9]\d{9}$/.test(s) ? '+91' + s : null;
}
const waCodeOk = v => typeof v === 'string' && /^\d{6}$/.test(v);
// six random digits, leading zeros kept
const waNewCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
// HMAC-SHA256(code) keyed with the service-account key and bound to the number and a per-code salt: the Firestore doc never holds the code
function waHash(key, phone, code, salt) {
  return crypto.createHmac('sha256', String(key)).update(phone + '|' + code + '|' + salt).digest('base64');
}
function waSame(a, b) {
  const x = Buffer.from(String(a || ''), 'base64'), y = Buffer.from(String(b || ''), 'base64');
  return x.length === 32 && y.length === 32 && crypto.timingSafeEqual(x, y);
}
// May this number get a code now? rec = the waotp doc (or {}). -> { ok, code?, wait?, sends, window_start }
function waSendGate(rec, now) {
  const last = Date.parse(rec && rec.last_sent || '');
  if (Number.isFinite(last) && now - last < WA_RESEND_MS) return { ok: false, code: 'wait', wait: Math.ceil((WA_RESEND_MS - (now - last)) / 1000) };
  const ws = Date.parse(rec && rec.window_start || '');
  const inWindow = Number.isFinite(ws) && now - ws < WA_WINDOW_MS;
  const sends = inWindow && Number.isInteger(rec.sends) ? rec.sends : 0;
  if (sends >= WA_MAX_SENDS) return { ok: false, code: 'too_many' };
  return { ok: true, sends: sends + 1, window_start: inWindow ? rec.window_start : new Date(now).toISOString() };
}
// A windowed hourly counter (the per-IP and the all-numbers docs). rec = the doc (or {}). -> { ok, sends, window_start }
function waCountGate(rec, now, max) {
  const ws = Date.parse(rec && rec.window_start || '');
  const inWindow = Number.isFinite(ws) && now - ws < WA_WINDOW_MS;
  const sends = inWindow && Number.isInteger(rec.sends) ? rec.sends : 0;
  if (sends >= max) return { ok: false, sends, window_start: rec.window_start };
  return { ok: true, sends: sends + 1, window_start: inWindow ? rec.window_start : new Date(now).toISOString() };
}
// The client IP as Caddy passes it on (first X-Forwarded-For entry, else X-Real-IP); '' when unknown.
function waClientIp(headers) {
  const h = headers && typeof headers === 'object' ? headers : {};
  const xff = String(h['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = xff || String(h['x-real-ip'] || '').trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : '';
}
// Firestore doc id for an IP's counter: keyed hash, so the IP itself is never stored
function waIpKey(key, ip) {
  return 'ip_' + b64url(crypto.createHmac('sha256', String(key)).update('ip|' + ip).digest()).slice(0, 32);
}
const waLimit = (v, dflt) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : dflt };
// The Cloud API body for an approved AUTHENTICATION template with a copy-code button (Meta's standard OTP template:
// the code goes in the body and again in the button).
function waMessage(phone, code, template, lang) {
  return {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.replace(/^\+/, ''), type: 'template',
    template: { name: template, language: { code: lang || 'en' }, components: [
      { type: 'body', parameters: [{ type: 'text', text: code }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
    ] },
  };
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
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
