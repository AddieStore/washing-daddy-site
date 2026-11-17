// A small stand-in for n8n, enough to run workflow 13 and the patched workflow 8 offline: follows the JSON's
// connections, runs Code nodes (with this.helpers, require('crypto'), $env, static data), IF, HTTP Request
// (JSON or raw body), Telegram and Respond nodes. HTTP goes to fakes.mjs. It is not n8n.
import crypto from 'node:crypto';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function evalExpr(expr, ctx) { return new Function('$json', '$', '$env', `return (${expr});`)(ctx.$json, ctx.$, ctx.$env); }
function param(v, ctx) {
  if (typeof v !== 'string' || !v.startsWith('=')) return v;
  const s = v.slice(1), whole = /^\{\{([\s\S]*)\}\}$/.exec(s.trim());
  if (whole) return evalExpr(whole[1], ctx);
  return s.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => String(evalExpr(e, ctx)));
}

export async function run(workflow, startNode, input, { env = {}, staticData = {}, http }) {
  const byName = new Map(workflow.nodes.map(n => [n.name, n]));
  const outputs = new Map();
  const log = { order: [], telegram: [], response: null, http: [] };
  const $ = name => { if (!outputs.has(name)) throw new Error('Referenced node is unexecuted: ' + name); const it = outputs.get(name); return { first: () => it[0], all: () => it }; };
  async function exec(name, items) {
    const n = byName.get(name); if (!n) throw new Error('connection to missing node ' + name);
    log.order.push(name);
    const item = items[0] || { json: {} }, ctx = { $json: item.json, $, $env: env };
    let out;
    switch (n.type) {
      case 'n8n-nodes-base.webhook': out = [items]; break;
      case 'n8n-nodes-base.code': {
        const fn = new AsyncFunction('$', '$input', '$env', '$getWorkflowStaticData', 'require', n.parameters.jsCode);
        const self = { helpers: {
          httpRequest: async o => { const r = await http({ method: o.method, url: o.url, headers: o.headers || {}, body: o.body }); return { statusCode: r.statusCode, body: r.body, headers: r.headers || {} }; },
          getBinaryDataBuffer: async () => { if (!item.binary || !item.binary.data) throw new Error('no binary'); return Buffer.from(item.binary.data.data, 'base64'); },
        } };
        const req = m => { if (m === 'crypto') return crypto; throw new Error('require of ' + m + ' is not allowed'); };
        const res = await fn.call(self, $, { first: () => items[0], all: () => items }, env, () => staticData, req);
        out = [Array.isArray(res) ? res : []]; break;
      }
      case 'n8n-nodes-base.if': {
        const pass = n.parameters.conditions.conditions.every(c => { const v = param(c.leftValue, ctx); return c.operator.operation === 'true' ? v === true || v === 'true' : !(v === true || v === 'true'); });
        out = pass ? [items, []] : [[], items]; break;
      }
      case 'n8n-nodes-base.httpRequest': {
        const p = n.parameters, url = param(p.url, ctx), headers = {};
        for (const h of (p.headerParameters && p.headerParameters.parameters) || []) headers[h.name] = param(h.value, ctx);
        let body;
        if (p.sendBody && p.contentType === 'raw') { body = param(p.body, ctx); headers['content-type'] = p.rawContentType; }
        else if (p.sendBody) body = JSON.parse(param(p.jsonBody, ctx));
        log.http.push({ node: name, method: p.method || 'GET', url, headers, body });
        let json;
        try { const r = await http({ method: p.method || 'GET', url, headers, body }); json = p.options && p.options.response && p.options.response.response && p.options.response.response.fullResponse ? { statusCode: r.statusCode, body: r.body } : r.body; }
        catch (e) { if (!n.continueOnFail) throw e; json = { error: { message: e.message } }; }
        out = [[{ json }]]; break;
      }
      case 'n8n-nodes-base.telegram': { log.telegram.push({ node: name, text: param(n.parameters.text, ctx) }); out = [[{ json: { ok: true } }]]; break; }
      case 'n8n-nodes-base.respondToWebhook': {
        const p = n.parameters, code = p.options && p.options.responseCode !== undefined ? Number(param(p.options.responseCode, ctx)) : 200;
        let body = param(p.responseBody, ctx); if (p.respondWith === 'json') body = JSON.parse(body);
        if (!log.response) log.response = { code, body };
        out = [items]; break;
      }
      default: throw new Error('runner does not know node type ' + n.type);
    }
    outputs.set(name, out.find(o => o.length) || out[0]);
    const conns = (workflow.connections[name] || {}).main || [];
    for (let i = 0; i < conns.length; i++) { if (!out[i] || !out[i].length) continue; for (const c of conns[i] || []) await exec(c.node, out[i]); }
  }
  await exec(startNode, [input]);
  return log;
}
