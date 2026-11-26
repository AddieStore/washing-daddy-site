// F1: only a signed-in washer may read a round. The app sends  Authorization: Bearer <Firebase ID token>.
// We verify the RS256 signature against Google's published securetoken certificates, check the
// claims, and require the token's phone number to belong to the washer being asked for.
// Needs n8n env NODE_FUNCTION_ALLOW_BUILTIN=crypto (Code nodes must be allowed to require('crypto')),
// FIREBASE_PROJECT_ID, and optionally WASHER_PHONES (see README). Any failure answers 401.
const crypto = require('crypto');
const PROJECT = String($env.FIREBASE_PROJECT_ID || '').trim();
if (!PROJECT) throw new Error('FIREBASE_PROJECT_ID env var is not set');
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// phone (E.164) -> washer id: the same two washers as WASHERS / PHONE_TO_WASHER in the washer apps.
// Override with env WASHER_PHONES = {"+91XXXXXXXXXX":"chotte","+91YYYYYYYYYY":"shahrukh"}
let WASHER_BY_PHONE = { '+919000000001': 'chotte', '+919000000002': 'shahrukh' };
if ($env.WASHER_PHONES) {
  try { WASHER_BY_PHONE = JSON.parse($env.WASHER_PHONES) } catch (e) { throw new Error('WASHER_PHONES env var is not valid JSON') }
}

const deny = why => [{ json: { ok: false, status: 401, error: 'unauthorized', why } }];
const b64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const asked = String((($('Round maango (webhook)').first().json.query) || {}).washer || '').toLowerCase();
const authz = String((($('Round maango (webhook)').first().json.headers) || {}).authorization || '');
const m = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authz.trim());
if (!m) return deny('no bearer token');
if (m[1].length > 6000) return deny('token too long');
const [h64, p64, s64] = m[1].split('.');

let header, claims;
try { header = JSON.parse(b64u(h64).toString('utf8')); claims = JSON.parse(b64u(p64).toString('utf8')) }
catch (e) { return deny('unreadable token') }
if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') return deny('bad header');

// Google's signing certs, cached in workflow static data for max-age (default 1 h, at most 24 h).
// A kid we do not know triggers one refetch, at most every 5 minutes.
const sd = $getWorkflowStaticData('global');
const nowMs = Date.now();
async function fetchCerts() {
  const resp = await this.helpers.httpRequest({ method: 'GET', url: CERT_URL, json: true, returnFullResponse: true, timeout: 8000 });
  const certs = resp.body;
  if (!certs || typeof certs !== 'object' || !Object.keys(certs).length) throw new Error('no certs');
  const mm = /max-age=(\d+)/.exec(String((resp.headers || {})['cache-control'] || ''));
  const ttl = Math.min(Math.max(Number(mm && mm[1]) || 3600, 300), 86400) * 1000;
  sd.fbCerts = { certs, fetchedAt: nowMs, expiresAt: nowMs + ttl };
}
const cached = sd.fbCerts && sd.fbCerts.certs && sd.fbCerts.expiresAt > nowMs;
try {
  if (!cached) await fetchCerts.call(this);
  else if (!sd.fbCerts.certs[header.kid] && nowMs - sd.fbCerts.fetchedAt > 300000) await fetchCerts.call(this);
} catch (e) {
  if (!(sd.fbCerts && sd.fbCerts.certs)) return deny('certs unavailable');   // fail closed; stale certs are still fine
}
const pem = sd.fbCerts && sd.fbCerts.certs && sd.fbCerts.certs[header.kid];
if (!pem) return deny('unknown kid');

let sigOk = false;
try { sigOk = crypto.createVerify('RSA-SHA256').update(h64 + '.' + p64).verify(pem, b64u(s64)) } catch (e) { sigOk = false }
if (!sigOk) return deny('bad signature');

const nowS = Math.floor(nowMs / 1000), SKEW = 300;
if (claims.aud !== PROJECT) return deny('wrong aud');
if (claims.iss !== 'https://securetoken.google.com/' + PROJECT) return deny('wrong iss');
if (typeof claims.exp !== 'number' || claims.exp <= nowS) return deny('expired');
if (typeof claims.iat !== 'number' || claims.iat > nowS + SKEW) return deny('iat in future');
if (typeof claims.auth_time !== 'number' || claims.auth_time > nowS + SKEW) return deny('auth_time in future');
if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) return deny('bad sub');

const washer = Object.prototype.hasOwnProperty.call(WASHER_BY_PHONE, claims.phone_number) ? WASHER_BY_PHONE[claims.phone_number] : null;
if (!washer) return deny('phone is not a washer');
if (washer !== asked) return deny('token belongs to another washer');
return [{ json: { ok: true, washer } }];