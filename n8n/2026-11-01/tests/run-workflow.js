// A tiny stand-in for n8n, enough to run workflow 8 offline: it follows the JSON's connections and
// runs each node the way n8n would (Code nodes' jsCode, IF expressions, the HTTP nodes' url/body
// expressions, Telegram texts, Respond nodes). HTTP calls go to the fakes in fakes.js.
// It is not n8n: it runs one item per node, which is all this workflow ever has.
'use strict';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

class Unexecuted extends Error {}

function makeDollar(outputs) {
  return name => {
    if (!outputs.has(name)) throw new Unexecuted(`Referenced node is unexecuted: ${name}`);
    const items = outputs.get(name);
    return { first: () => items[0], all: () => items, last: () => items[items.length - 1] };
  };
}

function evalExpr(expr, ctx) {
  const f = new Function('$json', '$', '$env', `return (${expr});`);
  return f(ctx.$json, ctx.$, ctx.$env);
}

// n8n parameter value: "=..." is an expression template; "={{ x }}" alone returns x's value.
function param(v, ctx) {
  if (typeof v !== 'string' || !v.startsWith('=')) return v;
  const s = v.slice(1);
  const whole = /^\{\{([\s\S]*)\}\}$/.exec(s.trim());
  if (whole) return evalExpr(whole[1], ctx);
  return s.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => String(evalExpr(e, ctx)));
}

async function run(workflow, startNode, inputJson, { env = {}, staticData = {}, http, now } = {}) {
  const byName = new Map(workflow.nodes.map(n => [n.name, n]));
  const outputs = new Map();
  const log = { order: [], telegram: [], response: null, http: [] };
  const $ = makeDollar(outputs);

  async function exec(name, items) {
    const n = byName.get(name);
    if (!n) throw new Error('connection to missing node ' + name);
    log.order.push(name);
    const item = items[0] || { json: {} };
    const ctx = { $json: item.json, $, $env: env };
    let out; // array of arrays (one per output index)
    switch (n.type) {
      case 'n8n-nodes-base.webhook': out = [items]; break;
      case 'n8n-nodes-base.code': {
        const fn = new AsyncFunction('$', '$input', '$env', '$getWorkflowStaticData', n.parameters.jsCode);
        const $input = { first: () => items[0], all: () => items };
        const res = await fn($, $input, env, () => staticData);
        out = [Array.isArray(res) ? res : []];
        break;
      }
      case 'n8n-nodes-base.if': {
        const cs = n.parameters.conditions;
        const pass = cs.conditions.every(c => {
          const v = param(c.leftValue, ctx);
          return c.operator.operation === 'true' ? (v === true || v === 'true') : !(v === true || v === 'true');
        });
        out = pass ? [items, []] : [[], items];
        break;
      }
      case 'n8n-nodes-base.httpRequest': {
        const p = n.parameters;
        const url = param(p.url, ctx);
        const body = p.sendBody ? JSON.parse(param(p.jsonBody, ctx)) : undefined;
        log.http.push({ node: name, method: p.method || 'GET', url, body });
        let json;
        try { json = await http(p.method || 'GET', url, body, name); }
        catch (e) {
          if (!n.continueOnFail) throw e;
          json = { error: { message: e.message } };
        }
        out = [[{ json }]];
        break;
      }
      case 'n8n-nodes-base.telegram': {
        let text;
        try { text = param(n.parameters.text, ctx); }
        catch (e) { if (!n.continueOnFail) throw e; text = '[telegram expression failed: ' + e.message + ']'; }
        log.telegram.push({ node: name, text });
        out = [[{ json: { ok: true, result: { text } } }]];
        break;
      }
      case 'n8n-nodes-base.respondToWebhook': {
        const p = n.parameters;
        const code = p.options && p.options.responseCode !== undefined ? Number(param(p.options.responseCode, ctx)) : 200;
        let body = param(p.responseBody, ctx);
        if (p.respondWith === 'json') body = JSON.parse(body);
        if (!log.response) log.response = { code, body };
        out = [items];
        break;
      }
      default: throw new Error('runner does not know node type ' + n.type);
    }
    outputs.set(name, out.find(o => o.length) || out[0]);
    const conns = (workflow.connections[name] || {}).main || [];
    for (let i = 0; i < conns.length; i++) {
      if (!out[i] || !out[i].length) continue;
      for (const c of conns[i] || []) await exec(c.node, out[i]);
    }
  }

  const realNow = Date.now;
  if (now) Date.now = () => now;
  try { await exec(startNode, [{ json: inputJson }]); }
  finally { Date.now = realNow; }
  log.outputs = outputs;
  return log;
}

module.exports = { run, param, Unexecuted };
