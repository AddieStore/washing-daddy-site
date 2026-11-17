// Builds 11-razorpay.json from lib.js + logic.js. Run: node build.mjs
import fs from 'node:fs';
const lib = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const logic = fs.readFileSync(new URL('./logic.js', import.meta.url), 'utf8');

const orderCode = `// Razorpay keys come from n8n env vars (RAZORPAY_KEY_ID). Never paste a key into this node.
const KEY_ID = String($env.RAZORPAY_KEY_ID || '').trim();
${lib}
${logic}
if (!KEY_ID) return [{ json: { ok: false, status: 500, body: { message: 'Payments are not set up yet.' } } }];
const req = $input.first().json;
const p = rzpPriceOrder(req.body, Date.now(), Math.random().toString(36).slice(2, 8));
if (!p.ok) return [{ json: { ok: false, status: p.status, body: { message: p.message } } }];
return [{ json: { ok: true, order: p.order, name: p.name, keyId: KEY_ID } }];`;

const replyCode = `${lib}
${logic}
const priced = $('Razorpay daam tay karo').first().json;
const r = rzpOrderReply($input.first().json, { order: priced.order, name: priced.name }, priced.keyId);
return [{ json: r }];`;

const verifyCode = `// The secret is read from the n8n env var RAZORPAY_KEY_SECRET and never leaves this node.
const SECRET = String($env.RAZORPAY_KEY_SECRET || '').trim();
${lib}
${logic}
const r = rzpVerify($input.first().json.body, SECRET);
return [{ json: r }];`;

const respond = (name, id, pos) => ({
  parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json.body) }}',
    options: { responseCode: '={{ $json.status }}' } },
  id, name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: pos });

const nodes = [
  { parameters: { path: 'wd-rzp-order', httpMethod: 'POST', responseMode: 'responseNode', options: {} },
    id: 'rzp-order-webhook', name: 'Razorpay order maango (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'wd-rzp-order' },
  { parameters: { jsCode: orderCode }, id: 'rzp-price', name: 'Razorpay daam tay karo', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0] },
  { parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and',
      conditions: [{ id: 'ok', operator: { type: 'boolean', operation: 'true', singleValue: true }, leftValue: '={{ $json.ok }}', rightValue: '' }] }, options: {} },
    id: 'rzp-price-ok', name: 'Razorpay daam sahi hai?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [440, 0] },
  { parameters: { method: 'POST', url: 'https://api.razorpay.com/v1/orders', authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth',
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.order) }}',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } } } },
    id: 'rzp-create', name: 'Razorpay order banao', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [660, -60],
    credentials: { httpBasicAuth: { id: 'REPLACE_ME', name: 'Razorpay live' } } },
  { parameters: { jsCode: replyCode }, id: 'rzp-reply', name: 'Razorpay jawab banao', type: 'n8n-nodes-base.code', typeVersion: 2, position: [880, -60] },
  respond('Razorpay order bhejo', 'rzp-order-send', [1100, -60]),
  { parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json.body) }}', options: { responseCode: '={{ $json.status }}' } },
    id: 'rzp-order-no', name: 'Razorpay order mana', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [660, 100] },
  { parameters: { path: 'wd-rzp-verify', httpMethod: 'POST', responseMode: 'responseNode', options: {} },
    id: 'rzp-verify-webhook', name: 'Razorpay verify (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 300], webhookId: 'wd-rzp-verify' },
  { parameters: { jsCode: verifyCode }, id: 'rzp-verify', name: 'Razorpay signature jaanch', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 300] },
  respond('Razorpay verify jawab', 'rzp-verify-send', [440, 300]),
];
const c = (a, b, i = 0) => ({ node: b, type: 'main', index: i });
const connections = {
  'Razorpay order maango (webhook)': { main: [[c(0, 'Razorpay daam tay karo')]] },
  'Razorpay daam tay karo': { main: [[c(0, 'Razorpay daam sahi hai?')]] },
  'Razorpay daam sahi hai?': { main: [[c(0, 'Razorpay order banao')], [c(0, 'Razorpay order mana')]] },
  'Razorpay order banao': { main: [[c(0, 'Razorpay jawab banao')]] },
  'Razorpay jawab banao': { main: [[c(0, 'Razorpay order bhejo')]] },
  'Razorpay verify (webhook)': { main: [[c(0, 'Razorpay signature jaanch')]] },
  'Razorpay signature jaanch': { main: [[c(0, 'Razorpay verify jawab')]] },
};
fs.writeFileSync(new URL('./11-razorpay.json', import.meta.url), JSON.stringify({ name: '11 — Razorpay checkout', nodes, connections, settings: { executionOrder: 'v1' }, pinData: {} }, null, 2));
console.log('built');
