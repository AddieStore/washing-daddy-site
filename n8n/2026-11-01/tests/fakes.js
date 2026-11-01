// Fake Notion (Monthly Customers) and fake Cashfree for the offline tests.
// Pages use the shapes Notion's API returns (rich_text arrays, {start} dates, phone_number strings).
'use strict';
const crypto = require('crypto');

const MONTHLY = 'ca0440e9f6ab4e15bf35b9d720e2952b';
let seq = 0;
const newId = () => crypto.randomBytes(16).toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
const rt = s => (s ? [{ type: 'text', plain_text: s, text: { content: s } }] : []);

// A Monthly Customers row. columns:false leaves out Referred By / Referral Credit (Ravi has not added them).
function row({ car = 'Swift', num, phone = null, fee = 1800, owes = 0, paidTo = null, lastIds = '', referredBy = '', credit = null, columns = true }) {
  const properties = {
    'Car': { type: 'title', title: rt(car) },
    'Car Number': { type: 'rich_text', rich_text: rt(num) },
    'Phone': { type: 'phone_number', phone_number: phone },
    'Monthly Fee': { type: 'number', number: fee },
    'Owes Now': { type: 'number', number: owes },
    'Service Paid Up To': { type: 'date', date: paidTo ? { start: paidTo, end: null } : null },
    'Next Payment Due': { type: 'date', date: null },
    'Last Payment': { type: 'date', date: null },
    'Account Status': { type: 'select', select: null },
    'Action': { type: 'select', select: null },
    'Last Payment Id': { type: 'rich_text', rich_text: rt(lastIds) },
  };
  if (columns) {
    properties['Referred By'] = { type: 'rich_text', rich_text: rt(referredBy) };
    properties['Referral Credit'] = { type: 'number', number: credit };
  }
  return { object: 'page', id: newId(), archived: false, in_trash: false, properties };
}

const plain = p => (p.rich_text || p.title || []).map(t => t.plain_text).join('');

function matches(page, f) {
  if (!f) return true;
  if (f.or) return f.or.some(x => matches(page, x));
  if (f.and) return f.and.every(x => matches(page, x));
  const p = page.properties[f.property];
  if (!p) return false;
  if (f.rich_text) return plain(p).includes(f.rich_text.contains);
  if (f.phone_number) return String(p.phone_number || '').includes(f.phone_number.contains);
  throw new Error('fake Notion: unsupported filter ' + JSON.stringify(f));
}

function makeWorld({ rows = [], failures = {} } = {}) {
  const pages = new Map(rows.map(r => [r.id.replace(/-/g, ''), r]));
  const world = { pages, leads: [], cfOrders: [], patches: [], failures, hasMore: false };
  const err = (status, code, message) => ({ object: 'error', status, code, message });
  const fail = key => { const f = world.failures[key]; if (f && f.times > 0) { f.times--; return f.reply || err(502, 'service_unavailable', 'Notion is down'); } return null; };

  world.http = async (method, url, body, node) => {
    let m;
    if ((m = /^https:\/\/api\.notion\.com\/v1\/databases\/([0-9a-f]+)\/query$/.exec(url)) && method === 'POST') {
      const f = fail('query:' + node); if (f) return f;
      if (m[1] !== MONTHLY) return err(404, 'object_not_found', 'no db');
      const results = [...pages.values()].filter(p => matches(p, body.filter)).slice(0, body.page_size || 100);
      return { object: 'list', results: JSON.parse(JSON.stringify(results)), has_more: world.hasMore, next_cursor: null };
    }
    if ((m = /^https:\/\/api\.notion\.com\/v1\/pages\/([0-9a-fA-F-]+)$/.exec(url))) {
      const id = m[1].replace(/-/g, '').toLowerCase();
      const page = pages.get(id);
      if (method === 'GET') {
        const f = fail('get:' + id); if (f) return f;
        return page ? JSON.parse(JSON.stringify(page)) : err(404, 'object_not_found', 'Could not find page');
      }
      if (method === 'PATCH') {
        const f = fail('patch:' + id) || fail('patch:any:' + node); if (f) return f;
        if (!page) return err(404, 'object_not_found', 'Could not find page');
        for (const k of Object.keys(body.properties)) {
          if (!page.properties[k]) return err(400, 'validation_error', k + ' is not a property that exists.');
        }
        for (const [k, v] of Object.entries(body.properties)) {
          const p = page.properties[k];
          if ('rich_text' in v) p.rich_text = rt(v.rich_text.map(t => t.text.content).join(''));
          else if ('number' in v) p.number = v.number;
          else if ('date' in v) p.date = v.date;
          else if ('select' in v) p.select = v.select;
        }
        world.patches.push({ id, node, properties: body.properties });
        return JSON.parse(JSON.stringify(page));
      }
    }
    if (url === 'https://api.notion.com/v1/pages' && method === 'POST') {
      world.leads.push(body);
      return { object: 'page', id: newId() };
    }
    if (/\/pg\/orders$/.test(url) && method === 'POST') {
      world.cfOrders.push(body);
      return { cf_order_id: String(++seq), order_id: body.order_id, payment_session_id: 'session_' + body.order_id, order_status: 'ACTIVE' };
    }
    throw new Error('fake: unexpected ' + method + ' ' + url);
  };
  return world;
}

// A PAYMENT_SUCCESS webhook for one of our orders, signed the way Cashfree signs it.
function webhookFor(order, { paymentId, paid = order.order_amount, secret, status = 'SUCCESS', tags = order.order_tags, ts = Date.now() }) {
  const payload = {
    type: status === 'SUCCESS' ? 'PAYMENT_SUCCESS_WEBHOOK' : 'PAYMENT_FAILED_WEBHOOK',
    event_time: new Date(ts).toISOString(),
    data: {
      order: { order_id: order.order_id, order_amount: order.order_amount, order_currency: 'INR', order_tags: tags },
      payment: { cf_payment_id: paymentId, payment_status: status, payment_amount: paid, payment_currency: 'INR', payment_group: 'upi' },
      customer_details: { customer_id: order.customer_details.customer_id, customer_phone: order.customer_details.customer_phone },
    },
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(String(ts) + raw).digest('base64');
  return { headers: { 'x-webhook-timestamp': String(ts), 'x-webhook-signature': sig, 'content-type': 'application/json' }, body: payload, rawBody: raw };
}

module.exports = { row, makeWorld, webhookFor, plain };
