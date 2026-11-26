// Builds 15-whatsapp-otp.json from lib.js + logic.js. Run: node build.mjs
import fs from 'node:fs';
const lib = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const logic = fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8');

const code = fn => `// WhatsApp sign-in code. Needs n8n env NODE_FUNCTION_ALLOW_BUILTIN=crypto, FIREBASE_SA_JSON (the service account key,
// set on the server only) and WA_TOKEN / WA_PHONE_ID / WA_OTP_TEMPLATE. Never paste a key into this node, and never log
// the request or the answer: they carry a sign-in code or a sign-in token.
const crypto = require('crypto');
${lib}
${logic}
const helpers = this.helpers;
const http = async o => {
  try {
    const r = await helpers.httpRequest({ method: o.method, url: o.url, headers: o.headers, body: o.body,
      returnFullResponse: true, ignoreHttpStatusErrors: true, timeout: 10000 });
    let b = r && r.body;
    if (Buffer.isBuffer(b)) b = b.toString('utf8');
    if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = null } }
    return { status: Number(r && r.statusCode) || 0, body: b };
  } catch (e) { return { status: 0, body: null } }
};
const inp = $input.first().json;
const out = await ${fn}(inp.body, {
  saRaw: $env.FIREBASE_SA_JSON, project: $env.FIREBASE_PROJECT_ID, deny: $env.WA_OTP_DENY,
  wa: { token: $env.WA_TOKEN, phoneId: $env.WA_PHONE_ID, template: $env.WA_OTP_TEMPLATE, lang: $env.WA_OTP_LANG || 'en', version: $env.WA_GRAPH_VERSION },
  ip: waClientIp(inp.headers), ipMax: $env.WA_OTP_IP_MAX, allMax: $env.WA_OTP_HOURLY_MAX,
  http, now: () => Date.now(), jitter: () => crypto.randomInt(0, 400), newCode: waNewCode, salt: () => crypto.randomBytes(16).toString('base64'),
  sleep: ms => new Promise(r => (typeof setTimeout === 'function' ? setTimeout(r, ms) : r())),
});
return [{ json: out }];`;

const reply = (id, name, y) => ({ parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json.body) }}',
  options: { responseCode: '={{ $json.status }}', responseHeaders: { entries: [{ name: 'Cache-Control', value: 'no-store' }] } } },
  id, name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [480, y] });
const nodes = [
  { parameters: { path: 'wd-wa-otp-send', httpMethod: 'POST', responseMode: 'responseNode', options: {} },
    id: 'wa-send-hook', name: 'Send code (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'wd-wa-otp-send' },
  { parameters: { jsCode: code('waSendCode') }, id: 'wa-send', name: 'Code banao, WhatsApp bhejo', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0] },
  reply('wa-send-reply', 'Send ka jawab', 0),
  { parameters: { path: 'wd-wa-otp-verify', httpMethod: 'POST', responseMode: 'responseNode', options: {} },
    id: 'wa-verify-hook', name: 'Verify code (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 240], webhookId: 'wd-wa-otp-verify' },
  { parameters: { jsCode: code('waVerifyCode') }, id: 'wa-verify', name: 'Code jaancho, token banao', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 240] },
  reply('wa-verify-reply', 'Verify ka jawab', 240),
];
const c = b => ({ node: b, type: 'main', index: 0 });
const connections = {
  'Send code (webhook)': { main: [[c('Code banao, WhatsApp bhejo')]] },
  'Code banao, WhatsApp bhejo': { main: [[c('Send ka jawab')]] },
  'Verify code (webhook)': { main: [[c('Code jaancho, token banao')]] },
  'Code jaancho, token banao': { main: [[c('Verify ka jawab')]] },
};
// requests carry a sign-in code and answers a sign-in token: keep no execution data at all
const settings = { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveManualExecutions: false, saveExecutionProgress: false };
fs.writeFileSync(new URL('./15-whatsapp-otp.json', import.meta.url),
  JSON.stringify({ name: '15 — WhatsApp sign-in code', nodes, connections, settings, pinData: {} }, null, 2) + '\n');
console.log('built');
