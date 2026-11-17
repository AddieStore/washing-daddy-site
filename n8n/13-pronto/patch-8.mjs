// Adds the Pronto branch to workflow 8's Cashfree webhook (wd-pay-hook), in place, idempotently.
// Run: node n8n/13-pronto/patch-8.mjs [path to 8-cashfree.json]   (default: n8n/2026-11-01/8-cashfree.json)
//
// Cashfree has ONE webhook URL (wd-pay-hook). Orders made by workflow 13 carry order_tags.kind = booking |
// wallet_topup | pass. For those, after workflow 8 has checked the signature, amount and currency exactly as
// before, it forwards Cashfree's signed body UNCHANGED to workflow 13 (wd-pronto-paid), which checks the
// signature again and fulfils the order. Nothing else in workflow 8 changes: plans, bills, tips, store orders,
// one-time washes, upgrades and invites take the same path as before.
import fs from 'node:fs';
const file = process.argv[2] || new URL('../2026-11-01/8-cashfree.json', import.meta.url).pathname;
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
const byName = n => wf.nodes.find(x => x.name === n);
const MARK = '// [13-pronto] Pronto orders';

const verify = byName('Sach mein Cashfree hai?');
const anchor = '// Tips and extras (store orders, upgrades, one-time washes)';
let js = verify.parameters.jsCode;
if (!js.includes(MARK)) {
  if (!js.includes(anchor)) throw new Error('anchor not found in "Sach mein Cashfree hai?"');
  js = js.replace(anchor, `${MARK} (workflow 13: bookings, WD Money top-ups, WD Pass) never touch the Notion book.
// The signed body is forwarded unchanged to wd-pronto-paid, which checks the signature again and fulfils the order.
if (tags.kind === 'booking' || tags.kind === 'wallet_topup' || tags.kind === 'pass') {
  return [{ json: { ok: true, pronto: true, orderId: ord.order_id || '', raw,
    ts: String(h['x-webhook-timestamp'] || ''), sig: String(h['x-webhook-signature'] || '') } }];
}
${anchor}`);
  verify.parameters.jsCode = js;
}

// Store ids: the dashboard's catalog keys store items as 'store-<id>' (CORE seed). Accept both spellings.
const price = byName('Daam tay karo');
const storeOld = "const s = STORE[String(it && it.id)], q = Math.round(Number(it && it.q));";
if (price.parameters.jsCode.includes(storeOld)) {
  price.parameters.jsCode = price.parameters.jsCode.replace(storeOld,
    "const s = STORE[String(it && it.id).replace(/^store-/, '')], q = Math.round(Number(it && it.q));   // [13-pronto] catalog ids are 'store-<id>'");
}

const base = byName('Signature theek?');
const [x, y] = base.position || [0, 0];
if (!byName('Pronto order?')) {
  wf.nodes.push({ parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and',
      conditions: [{ id: 'pronto', operator: { type: 'boolean', operation: 'true', singleValue: true }, leftValue: '={{ $json.pronto === true }}', rightValue: '' }] }, options: {} },
    id: 'pronto-order-if', name: 'Pronto order?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [x + 110, y - 160] });
  wf.nodes.push({ parameters: { method: 'POST', url: '={{ ($env.WD_N8N_INTERNAL || "http://localhost:5678") + "/webhook/wd-pronto-paid" }}',
      sendHeaders: true, headerParameters: { parameters: [
        { name: 'x-webhook-timestamp', value: '={{ $json.ts }}' }, { name: 'x-webhook-signature', value: '={{ $json.sig }}' }] },
      sendBody: true, contentType: 'raw', rawContentType: 'application/json', body: '={{ $json.raw }}',
      options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 30000 } },
    id: 'pronto-forward', name: 'Pronto ko bhejo (workflow 13)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [x + 330, y - 220] });
  wf.nodes.push({ parameters: { respondWith: 'text', responseBody: '={{ $json.statusCode >= 200 && $json.statusCode < 300 ? "ok" : "retry" }}',
      options: { responseCode: '={{ $json.statusCode >= 200 && $json.statusCode < 300 ? 200 : 500 }}' } },
    id: 'pronto-respond', name: 'Pronto jawab', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, position: [x + 550, y - 220] });
  // Signature theek? (true) -> Pronto order? -> true: forward / false: the old path (Gaadi dhoondo)
  const sigTrue = wf.connections['Signature theek?'].main[0];
  wf.connections['Pronto order?'] = { main: [[{ node: 'Pronto ko bhejo (workflow 13)', type: 'main', index: 0 }], sigTrue.slice()] };
  wf.connections['Signature theek?'].main[0] = [{ node: 'Pronto order?', type: 'main', index: 0 }];
  wf.connections['Pronto ko bhejo (workflow 13)'] = { main: [[{ node: 'Pronto jawab', type: 'main', index: 0 }]] };
}
fs.writeFileSync(file, JSON.stringify(wf, null, 2) + '\n');
console.log('patched', file);
