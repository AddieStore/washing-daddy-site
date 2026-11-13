// Builds 12-washer-pin-login.json from lib.js + logic.js. Run: node build.mjs
import fs from 'node:fs';
const lib = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const logic = fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8');

const loginCode = `// Washer PIN login. Needs n8n env NODE_FUNCTION_ALLOW_BUILTIN=crypto and FIREBASE_SA_JSON (the service account
// key, set on the server only). Never paste a key into this node, and never log the request: it carries a PIN.
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
const out = await pinLogin($input.first().json.body, {
  saRaw: $env.FIREBASE_SA_JSON, project: $env.FIREBASE_PROJECT_ID, deny: $env.PIN_DENY_PHONES,
  http, now: () => Date.now(), jitter: () => crypto.randomInt(0, 400),
  sleep: ms => new Promise(r => (typeof setTimeout === 'function' ? setTimeout(r, ms) : r())),
});
return [{ json: out }];`;

const nodes = [
  { parameters: { path: 'wd-washer-pin', httpMethod: 'POST', responseMode: 'responseNode', options: {} },
    id: 'pin-webhook', name: 'PIN login (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'wd-washer-pin' },
  { parameters: { jsCode: loginCode }, id: 'pin-check', name: 'PIN jaancho, token banao', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0] },
  { parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json.body) }}',
      options: { responseCode: '={{ $json.status }}', responseHeaders: { entries: [{ name: 'Cache-Control', value: 'no-store' }] } } },
    id: 'pin-reply', name: 'Jawab bhejo', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [480, 0] },
];
const c = b => ({ node: b, type: 'main', index: 0 });
const connections = {
  'PIN login (webhook)': { main: [[c('PIN jaancho, token banao')]] },
  'PIN jaancho, token banao': { main: [[c('Jawab bhejo')]] },
};
// The request body holds a PIN and the answer holds a sign-in token: keep no execution data at all.
const settings = { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveManualExecutions: false, saveExecutionProgress: false };
fs.writeFileSync(new URL('./12-washer-pin-login.json', import.meta.url),
  JSON.stringify({ name: '12 — Washer PIN login', nodes, connections, settings, pinData: {} }, null, 2) + '\n');
console.log('built');
