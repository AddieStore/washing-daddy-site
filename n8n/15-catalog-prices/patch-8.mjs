// Workflow 8 (wd-pay-order) prices monthly plans and one-time washes from the Firestore `catalog`
// collection, the same docs WD Operations > Prices edits and washingdaddy.com shows. In place, idempotent.
// Run: node n8n/15-catalog-prices/patch-8.mjs [path to 8-cashfree.json]   (default: n8n/2026-11-01/8-cashfree.json)
//
// - New HTTP node "Catalog ke daam" just before "Daam tay karo": one POST documents:batchGet for the 7 docs,
//   no credential (catalog is publicly readable; the URL carries the website's public web API key).
//   It never stops the workflow (neverError + continueOnFail, 5 s timeout).
// - "Daam tay karo" overwrites the hardcoded PRODUCTS / WASHES prices with the catalog price only when the
//   doc was found and its price is a whole number of rupees from 1 to 50000. Anything else: the hardcoded
//   price stays (fallback). The browser's amount is still only compared, never charged.
// - One-time washes now also refuse ("That price is out of date...") when the browser sent an amount that
//   is not the server price. An order with no amount (older app builds) is priced as before.
// Bills (Monthly Fee from Notion), the legacy plan, tips, store, invites and the Pronto branch are untouched.
import fs from 'node:fs';
const file = process.argv[2] || new URL('../2026-11-01/8-cashfree.json', import.meta.url).pathname;
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
const byName = n => wf.nodes.find(x => x.name === n);
const MARK = '// [15-catalog-prices]';
const NODE = 'Catalog ke daam', PRICE = 'Daam tay karo';

export const PROJECT = 'gen-lang-client-0799769592';
export const WEB_KEY = 'AIzaSyAFNwmEFj4BywMcIsWndyZ2BoI_82-pSac';   // public web config, same as index.html
export const DOCS = ['plan-std', 'plan-pro', 'plan-exc', 'plan-res', 'pack-wash', 'pack-deep', 'pack-exclusive'];
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;

// ---- 1. the read ----
const price = byName(PRICE);
if (!price) throw new Error('node "' + PRICE + '" not found');
if (!byName(NODE)) {
  const [x, y] = price.position || [550, 260];
  wf.nodes.push({
    parameters: {
      method: 'POST',
      url: `https://firestore.googleapis.com/v1/${ROOT}:batchGet?key=${WEB_KEY}`,
      sendBody: true, specifyBody: 'json',
      jsonBody: JSON.stringify({ documents: DOCS.map(d => ROOT + '/catalog/' + d), mask: { fieldPaths: ['price'] } }),
      options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 5000 },
    },
    id: 'catalog-ke-daam', name: NODE, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [x, y - 140], continueOnFail: true, onError: 'continueRegularOutput',
  });
  // everything that fed "Daam tay karo" now feeds the read, and the read feeds "Daam tay karo"
  for (const [from, c] of Object.entries(wf.connections)) for (const outs of c.main || []) for (const t of outs || []) if (t.node === PRICE) t.node = NODE;
  wf.connections[NODE] = { main: [[{ node: PRICE, type: 'main', index: 0 }]] };
}

// ---- 2. the pricing ----
let js = price.parameters.jsCode;
const anchor = 'const PLAN_PRICE = id =>';
const washOld = `  if (!w) return refuse("We couldn't work out which wash you picked.");
  return extra(w[1], 'One-time: ' + w[0]);`;
if (!js.includes(MARK)) {
  if (!js.includes(anchor) || !js.includes(washOld)) throw new Error('anchors not found in "' + PRICE + '"');
  js = js.replace(anchor, `${MARK} Live prices from Firestore catalog/{doc}.price (node "${NODE}"), edited in
// WD Operations > Prices. Only a found doc with a whole-rupee price from 1 to 50000 replaces the price above;
// a failed read, a missing doc or any other value keeps the hardcoded price. Never 0, never the browser's amount.
const CATALOG_DOC = { std: 'plan-std', pro: 'plan-pro', exc: 'plan-exc', res: 'plan-res',
  wash: 'pack-wash', deep: 'pack-deep', exclusive: 'pack-exclusive', interior: 'pack-wash', combo: 'pack-wash', detailing: 'pack-deep' };
const LIVE = (() => {
  const out = {};
  let r; try { r = $('${NODE}').first().json; } catch (e) { return out; }
  let list = r && Number(r.statusCode) === 200 ? r.body : null;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { list = null; } }
  if (!Array.isArray(list)) return out;
  for (const it of list) {
    const d = it && it.found;
    if (!d || typeof d.name !== 'string' || !d.fields || !d.fields.price) continue;
    const id = d.name.split('/').pop(), f = d.fields.price;
    if (!d.name.endsWith('/documents/catalog/' + id)) continue;
    const v = typeof f.integerValue === 'string' || typeof f.integerValue === 'number' ? Number(f.integerValue)
      : typeof f.doubleValue === 'number' ? f.doubleValue : NaN;
    if (Number.isInteger(v) && v >= 1 && v <= 50000) out[id] = v;
  }
  return out;
})();
for (const p of PRODUCTS) { const v = LIVE[CATALOG_DOC[p.id]]; if (v) p.price = v; }
for (const k of Object.keys(WASHES)) { const v = LIVE[CATALOG_DOC[k]]; if (v) WASHES[k][1] = v; }
${anchor}`);
  js = js.replace(washOld, `  if (!w) return refuse("We couldn't work out which wash you picked.");
  ${MARK} the page showed a price: it must be the one we charge
  if (body.amount !== undefined && body.amount !== null && body.amount !== '' && Math.round(Number(body.amount)) !== w[1])
    return refuse('That price is out of date. Reload the page and try again.');
  return extra(w[1], 'One-time: ' + w[0]);`);
  price.parameters.jsCode = js;
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2) + '\n');
console.log('patched', file);
