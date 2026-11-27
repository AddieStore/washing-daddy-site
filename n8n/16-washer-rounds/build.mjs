// Builds 16-washer-rounds.json: one signed-in POST webhook (wd-washer-rounds?washer=ID) that lists rounds or takes one; ops_* actions are owner-only. Run: node build.mjs
import fs from 'node:fs';
const lib = fs.readFileSync(new URL('./lib.js', import.meta.url), 'utf8');
const token = fs.readFileSync(new URL('./token.js', import.meta.url), 'utf8');
const code = `// Rounds. Needs n8n env NOTION_TOKEN (an integration with access to Monthly Customers) and NOTION_CARS_DB.
${lib}
const helpers = this.helpers;
const http = async o => {
  try {
    const r = await helpers.httpRequest({ method: o.method, url: o.url, headers: o.headers, body: o.body, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true, timeout: 15000 });
    return { status: Number(r && r.statusCode) || 0, body: r && r.body };
  } catch (e) { return { status: 0, body: null } }
};
const hook = $('Round maango (webhook)').first().json;
setWashers($env.WASHER_IDS);   // one washer list for workflows 9 and 16 (default chotte, shahrukh)
const washer = String((hook.query || {}).washer || '').toLowerCase();
try {
  const body = hook.body || {};
  if (/^ops_/.test(String(body.action || ''))) return [{ json: await handleOps({ body, http, token: $env.NOTION_TOKEN, dbId: $env.NOTION_CARS_DB || 'ca0440e9f6ab4e15bf35b9d720e2952b', admin: $('Token check').first().json.admin === true }) }];
  return [{ json: await handleRounds({ washer, body: hook.body || {}, http, token: $env.NOTION_TOKEN, dbId: $env.NOTION_CARS_DB || 'ca0440e9f6ab4e15bf35b9d720e2952b' }) }];
} catch (e) { return [{ json: { ok: false, error: 'rounds unavailable' } }]; }`;
const cors = [{ name: 'Access-Control-Allow-Origin', value: 'https://washingdaddy.com' }, { name: 'Cache-Control', value: 'no-store' }];
const wf = {
  name: '16 — Washer rounds (list and take a round)',
  nodes: [
    { parameters: { path: 'wd-washer-rounds', httpMethod: 'POST', options: {}, responseMode: 'responseNode' }, id: 'round-maango-webhook-', name: 'Round maango (webhook)', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'wd-washer-rounds' },
    { parameters: { mode: 'runOnceForAllItems', jsCode: token }, id: 'token-check', name: 'Token check', type: 'n8n-nodes-base.code', typeVersion: 2, position: [230, 0] },
    { parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ id: 'tok', operator: { type: 'boolean', operation: 'true', singleValue: true }, leftValue: '={{ $json.ok }}', rightValue: '' }] }, options: {} }, id: 'token-theek', name: 'Token theek?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [460, 0] },
    { parameters: { mode: 'runOnceForAllItems', jsCode: code }, id: 'rounds-code', name: 'Rounds', type: 'n8n-nodes-base.code', typeVersion: 2, position: [690, -100] },
    { parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify($json) }}', options: { responseHeaders: { entries: cors } } }, id: 'rounds-bhejo', name: 'Rounds bhejo', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [920, -100] },
    { parameters: { respondWith: 'json', responseBody: '={{ JSON.stringify({ ok: false, error: "unauthorized" }) }}', options: { responseCode: 401, responseHeaders: { entries: cors } } }, id: 'mana-401', name: 'Mana kar do (401)', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [690, 120] },
  ],
  connections: {
    'Round maango (webhook)': { main: [[{ node: 'Token check', type: 'main', index: 0 }]] },
    'Token check': { main: [[{ node: 'Token theek?', type: 'main', index: 0 }]] },
    'Token theek?': { main: [[{ node: 'Rounds', type: 'main', index: 0 }], [{ node: 'Mana kar do (401)', type: 'main', index: 0 }]] },
    Rounds: { main: [[{ node: 'Rounds bhejo', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
};
fs.writeFileSync(new URL('./16-washer-rounds.json', import.meta.url), JSON.stringify(wf, null, 2));
console.log('built 16-washer-rounds.json');
