// Offline tests for the invite discount and Referral Credit in workflow 8 (n8n/2026-11-01/8-cashfree.json).
// Runs the workflow JSON itself through run-workflow.js against fake Notion and Cashfree.
// Usage: node n8n/2026-11-01/tests/invite.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const { run } = require('./run-workflow');
const { row, makeWorld, webhookFor, plain } = require('./fakes');

const WF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '8-cashfree.json'), 'utf8'));
const SECRET = 'test-secret-not-real';
const ENV = { CASHFREE_SECRET: SECRET, TELEGRAM_CHAT_ID: '1' };

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push('PASS  ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
  else { fail++; results.push('FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}

// ---------- helpers ----------
const REF_PHONE = '+91 98111 23456';          // referrer, code WD123456
const order = (world, body, sd = {}) => run(WF, 'Order maango (webhook)', { headers: {}, body }, { env: ENV, staticData: sd, http: world.http });
const hook = (world, wh, sd) => run(WF, 'Cashfree bola (webhook)', { headers: wh.headers, body: wh.body, rawBody: wh.rawBody }, { env: ENV, staticData: sd, http: world.http });
const planBody = (o = {}) => Object.assign({ amount: 1800, name: 'Friend', phone: '9000011111', car: 'City', num: 'DL3CXY9999', kind: 'plan', label: 'WD Pro · City', planId: 'pro', page: 'app' }, o);
const lastOrder = world => world.cfOrders[world.cfOrders.length - 1];
const credit = (world, r) => world.pages.get(r.id.replace(/-/g, '')).properties['Referral Credit'].number;
const text = (world, r, k) => plain(world.pages.get(r.id.replace(/-/g, '')).properties[k]);
const tg = log => log.telegram.map(t => t.text).join('\n----\n');
let payN = 1000;
const istDay = off => new Date(Date.now() + 5.5 * 3600e3 + off * 864e5).toISOString().slice(0, 10);
const TODAY = istDay(0), FUTURE = istDay(20), PAST = istDay(-1);
const nextPay = () => String(++payN);

(async () => {
  // ================= wd-pay-order =================
  {
    const referrer = row({ car: 'Creta', num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const world = makeWorld({ rows: [referrer] });
    const log = await order(world, planBody({ ref: 'WD123456' }));
    const o = lastOrder(world);
    check('valid ref, new car not on book: 200 off', log.response.code === 200 && log.response.body.discount === 200 && o.order_amount === 1600,
      JSON.stringify(log.response.body));
    check('valid ref: tags carry list price, invite and referrer page id (server record)',
      o.order_tags.fullAmount === '1800' && o.order_tags.expectedAmount === '1600' && o.order_tags.invite === 'WD123456:' + referrer.id + ':200' && o.order_tags.kind === 'plan',
      JSON.stringify(o.order_tags));
    check('valid ref: at most 10 Cashfree tags, every value a string', Object.keys(o.order_tags).length <= 10 && Object.values(o.order_tags).every(v => typeof v === 'string'));
    check('valid ref: response has no referrer details', !JSON.stringify(log.response.body).includes(referrer.id) && !JSON.stringify(log.response.body).includes('98111'));
    check('referrer lookup filter only carries digits', JSON.stringify(log.http.find(h => h.node === 'Referrer dhoondo').body) === JSON.stringify({ filter: { or: [{ property: 'Phone', phone_number: { contains: '3456' } }, { property: 'Phone', phone_number: { contains: '1111' } }] }, page_size: 100 }));

    const lower = await order(world, planBody({ ref: '  wd123456 ' }));
    check('lower case / spaces in code accepted', lower.response.body.discount === 200);
  }
  {
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const friendCar = row({ car: 'City', num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 999 });
    const world = makeWorld({ rows: [referrer, friendCar] });
    const log = await order(world, planBody({ ref: 'WD123456', amount: 999 }));
    const o = lastOrder(world);
    check('valid ref, friend already on the book (never paid): 200 off the fee', log.response.body.discount === 200 && o.order_amount === 799 && o.order_tags.kind === 'bill' && o.order_tags.pageId === friendCar.id,
      JSON.stringify(o.order_tags));
  }
  {
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const world = makeWorld({ rows: [referrer] });
    let log = await order(world, planBody({ ref: 'WD123456', phone: '9811123456' }));
    check('self ref: payer phone is the referrer phone -> no discount, full price', log.response.body.discount === 0 && lastOrder(world).order_amount === 1800 && !lastOrder(world).order_tags.invite);
    log = await order(world, planBody({ ref: 'WD123456', num: 'DL1CAA1111', phone: '9000011111' }));
    check('self ref: paying for the referrer\'s own car with another phone -> no discount', log.response.body.discount === 0);
    log = await order(world, planBody({ ref: 'WD123456', phone: '9700123456' }));
    check('self ref: payer phone ends in the code\'s 6 digits -> no discount', log.response.body.discount === 0);
  }
  {
    const second = row({ num: 'DL2CBB2222', phone: '+91 90000 22222', fee: 999 });
    const ownersOther = row({ num: 'DL2CBB3333', phone: REF_PHONE, fee: 999 });   // same owner phone as referrer
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE });
    const world = makeWorld({ rows: [second] });
    let log = await order(world, planBody({ ref: 'WD654321' }));
    check('unknown ref -> no discount, full price, order still made', log.response.code === 200 && log.response.body.discount === 0 && lastOrder(world).order_amount === 1800);
    const w2 = makeWorld({ rows: [referrer, ownersOther] });
    log = await order(w2, planBody({ ref: 'WD123456' }));
    check('ambiguous suffix (two rows end in 123456) -> no discount', log.response.body.discount === 0);
    const w3 = makeWorld({ rows: [row({ num: 'A1', phone: '+91 98111 23456' }), row({ num: 'B2', phone: '+91 97001 23456' })] });
    log = await order(w3, planBody({ ref: 'WD123456' }));
    check('ambiguous suffix (two different people) -> no discount', log.response.body.discount === 0);
    const w4 = makeWorld({ rows: [row({ num: 'A1', phone: '+91 98111 23456', columns: false })] });
    log = await order(w4, planBody({ ref: 'WD123456' }));
    check('columns not added in Notion yet -> no discount (never writes a missing column)', log.response.body.discount === 0);
  }
  {
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE });
    const paidCar = row({ num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800, lastIds: '55' });
    const datedCar = row({ num: 'DL3CXY8888', phone: '+91 90000 11112', fee: 1800, paidTo: '2026-10-30' });
    const invitedCar = row({ num: 'DL3CXY7777', phone: '+91 90000 11113', fee: 1800, referredBy: 'WD999999' });
    const oldCustomerOtherCar = row({ num: 'DL9ZZZ0001', phone: '+91 90000 11114', fee: 999, paidTo: '2026-12-01', lastIds: '77' });
    const world = makeWorld({ rows: [referrer, paidCar, datedCar, invitedCar, oldCustomerOtherCar] });
    let log = await order(world, planBody({ ref: 'WD123456' }));
    check('already-paid payer (Last Payment Id set) -> no discount', log.response.body.discount === 0 && lastOrder(world).order_amount === 1800);
    log = await order(world, planBody({ ref: 'WD123456', num: 'DL3CXY8888', phone: '9000011112' }));
    check('already-paid payer (Service Paid Up To set) -> no discount', log.response.body.discount === 0);
    log = await order(world, planBody({ ref: 'WD123456', num: 'DL3CXY7777', phone: '9000011113' }));
    check('payer already has Referred By -> no discount', log.response.body.discount === 0);
    log = await order(world, planBody({ ref: 'WD123456', num: 'NEW 1234', phone: '9000011114' }));
    check('existing paying customer adding a new car with own phone -> no discount', log.response.body.discount === 0);
    const otherPhonePaid = row({ num: 'DL4CQQ4444', phone: '+91 90000 22222', fee: 1800, lastIds: '66' });
    world.pages.set(otherPhonePaid.id.replace(/-/g, ''), otherPhonePaid);
    log = await order(world, planBody({ ref: 'WD123456', num: 'DL4CQQ4444', phone: '9000099999' }));
    check('paid car paid for from a different phone -> no discount (car row checked, not just the phone)', log.response.body.discount === 0);
  }
  {
    // Ravi fills Referred By by hand between the order and the payment: no reward on confirm
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const friend = row({ num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800 });
    const world = makeWorld({ rows: [referrer, friend] });
    await order(world, planBody({ ref: 'WD123456' }), {});
    friend.properties['Referred By'].rich_text = [{ plain_text: 'WD777777' }];
    const log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), {});
    check('payer got Referred By between order and payment -> booked, no reward, Referred By kept', log.response.code === 200 && !credit(world, referrer) && text(world, friend, 'Referred By') === 'WD777777' && /already referred by WD777777/.test(tg(log)), tg(log));
  }
  {
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE });
    const world = makeWorld({ rows: [referrer] });
    const bad = ['WD12345', 'WD1234567', 'XX123456', 'WD12345a', '', 'WD 123456'];
    let all0 = true, lookups = 0;
    for (const ref of bad) { const l = await order(world, planBody({ ref })); all0 = all0 && l.response.body.discount === 0; lookups += l.http.filter(h => h.node === 'Referrer dhoondo').length; }
    const obj = await order(world, planBody({ ref: { toString: () => 'WD123456' } }));
    check('malformed codes -> no discount and no Notion lookup', all0 && lookups === 0 && obj.response.body.discount === 0);
    const kinds = [{ kind: 'tip', amount: 100, label: 'Tip' }, { kind: 'order', items: [{ id: 'micro', q: 1 }], amount: 349 }, { kind: 'onetime', service: 'wash', amount: 199 }, { kind: 'Monthly bill', amount: 1800 }];
    let none = true;
    for (const k of kinds) { const l = await order(world, planBody(Object.assign({ ref: 'WD123456' }, k))); none = none && (l.response.body.discount || 0) === 0 && l.http.every(h => h.node !== 'Referrer dhoondo'); }
    check('ref on tip / store / one-time / bill -> ignored, no lookup', none);
    const tamper = await order(world, planBody({ ref: 'WD123456', amount: 1600 }));
    check('client sends the discounted amount itself -> refused (app must send list price)', tamper.response.code === 400 && world.cfOrders.every(o => o.order_amount !== 1600 || o.order_tags.invite));
    const extra = await order(world, planBody({ ref: 'WD123456', discount: 1700, creditUsed: 1700, inviteDiscount: 1700 }));
    check('client-sent discount fields are ignored', extra.response.body.discount === 200 && lastOrder(world).order_amount === 1600);
  }
  {
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE });
    const world = makeWorld({ rows: [referrer], failures: { 'query:Referrer dhoondo': { times: 1 } } });
    let log = await order(world, planBody({ ref: 'WD123456' }));
    check('Notion lookup fails -> no discount, payment still possible at full price', log.response.code === 200 && log.response.body.discount === 0 && lastOrder(world).order_amount === 1800);
    world.hasMore = true;
    log = await order(world, planBody({ ref: 'WD123456' }));
    check('lookup has more than 100 rows -> cannot prove "exactly one" -> no discount', log.response.body.discount === 0);
  }
  {
    // credit use and discount larger than amount
    const me = row({ num: 'DL1CAA1111', phone: REF_PHONE, fee: 999, paidTo: '2026-11-05', lastIds: '900', credit: 200 });
    const rich = row({ num: 'DL5CCC5555', phone: '+91 90000 55555', fee: 999, paidTo: '2026-11-05', lastIds: '901', credit: 2000 });
    const tiny = row({ num: 'DL6CDD6666', phone: '+91 90000 66666', fee: 150 });
    const both = row({ num: 'DL7CEE7777', phone: '+91 90000 77777', fee: 300, credit: 500 });
    const world = makeWorld({ rows: [me, rich, tiny, both, row({ num: 'R1', phone: '+91 95555 65432' })] });
    let log = await order(world, planBody({ num: 'DL1CAA1111', phone: '9811123456', amount: 999 }));
    let o = lastOrder(world);
    check('credit use: ₹200 credit off a ₹999 plan payment', log.response.body.discount === 200 && log.response.body.creditUsed === 200 && o.order_amount === 799 && o.order_tags.creditUsed === '200' && o.order_tags.fullAmount === '999', JSON.stringify(o.order_tags));
    log = await order(world, planBody({ num: 'DL1CAA1111', phone: '9811123456', kind: 'Monthly bill', amount: 999 }));
    check('credit also applies to a monthly bill', lastOrder(world).order_amount === 799);
    for (const k of [{ kind: 'tip', amount: 100 }, { kind: 'onetime', service: 'deep', amount: 800 }, { kind: 'order', items: [{ id: 'perfume', q: 1 }] }, { kind: 'upgrade', toPlan: 'res' }]) {
      await order(world, planBody(Object.assign({ num: 'DL1CAA1111', phone: '9811123456' }, k)));
    }
    const lastFour = world.cfOrders.slice(-4);
    check('credit never applies to tips, one-time washes, store orders, upgrades', lastFour.every(x => !x.order_tags.creditUsed),
      lastFour.map(x => x.order_tags.kind + ':' + x.order_amount).join(','));
    log = await order(world, planBody({ num: 'DL5CCC5555', phone: '9000055555', amount: 999 }));
    o = lastOrder(world);
    check('credit larger than amount: charge ₹1, use ₹998, keep the rest', o.order_amount === 1 && o.order_tags.creditUsed === '998' && log.response.body.discount === 998, JSON.stringify(o.order_tags));
    log = await order(world, planBody({ num: 'DL6CDD6666', phone: '9000066666', amount: 150, ref: 'WD565432' }));
    o = lastOrder(world);
    check('invite discount larger than amount (₹150 fee): ₹149 off, ₹1 charged', o.order_amount === 1 && /:149$/.test(o.order_tags.invite) && log.response.body.discount === 149, JSON.stringify(o.order_tags));
    log = await order(world, planBody({ num: 'DL7CEE7777', phone: '9000077777', amount: 300, ref: 'WD565432' }));
    o = lastOrder(world);
    check('invite + credit beyond amount: invite 200, credit 99, ₹1 charged', o.order_amount === 1 && /:200$/.test(o.order_tags.invite) && o.order_tags.creditUsed === '99', JSON.stringify(o.order_tags));
  }

  // ================= wd-pay-hook =================
  {
    // new friend, car not on the book: lead path
    const referrer = row({ car: 'Creta', num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const world = makeWorld({ rows: [referrer] });
    const sd = {};
    await order(world, planBody({ ref: 'WD123456' }), sd);
    const o = lastOrder(world), pid = nextPay();
    const wh = webhookFor(o, { paymentId: pid, secret: SECRET });
    let log = await hook(world, wh, sd);
    check('hook: friend not on book pays 1600 -> 200, lead made, referrer +200', log.response.code === 200 && world.leads.length === 1 && credit(world, referrer) === 200, tg(log));
    check('hook: Ravi told about the invite and to set Referred By', /Invite WD123456: friend got ₹200 off/.test(tg(log)) && /set its Referred By to WD123456/.test(tg(log)) && /added to Creta DL1CAA1111 \(now ₹200\)/.test(tg(log)), tg(log));
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('hook retry (same payment, re-signed later) -> 200, no double credit, no second lead', log.response.code === 200 && credit(world, referrer) === 200 && world.leads.length === 1);
    // two discounted orders for the same new car, both paid
    await order(world, planBody({ ref: 'WD123456' }), sd);
    log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), sd);
    check('second discounted payment for the same new car -> no second reward, Ravi alerted', credit(world, referrer) === 200 && /No reward for the referrer: this car or phone already earned/.test(tg(log)), tg(log));
  }
  {
    // friend on the book (never paid): Referred By written with the payment, referrer credited
    const referrer = row({ car: 'Creta', num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900', credit: 100 });
    const friend = row({ car: 'City', num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800, owes: 1800 });
    const world = makeWorld({ rows: [referrer, friend] });
    const sd = {};
    await order(world, planBody({ ref: 'WD123456' }), sd);
    const o = lastOrder(world), pid = nextPay();
    let log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    const fp = world.pages.get(friend.id.replace(/-/g, '')).properties;
    check('hook: friend on book -> Referred By, paid-up date, Last Payment Id in one update', text(world, friend, 'Referred By') === 'WD123456' && text(world, friend, 'Last Payment Id') === pid && !!fp['Service Paid Up To'].date
      && world.patches.filter(p => p.id === friend.id.replace(/-/g, '')).length === 1, JSON.stringify(world.patches.map(p => Object.keys(p.properties))));
    check('hook: Owes Now cleared by money + invite discount (1600 + 200)', fp['Owes Now'].number === 0, fp['Owes Now'].number);
    check('hook: referrer credit 100 -> 300', credit(world, referrer) === 300);
    check('hook: friend\'s credit column untouched (no credit used)', fp['Referral Credit'].number === null);
    // retry after static data is lost (re-import resets it): Notion Last Payment Id still guards
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), {});
    check('hook retry with empty static data -> duplicate via Last Payment Id, no double credit', log.response.code === 200 && credit(world, referrer) === 300 && !log.order.includes('Referrer padho'));
    // a second discounted order made before the first was paid, then paid
    const fakeSecond = JSON.parse(JSON.stringify(o)); fakeSecond.order_id = o.order_id + 'B';
    log = await hook(world, webhookFor(fakeSecond, { paymentId: nextPay(), secret: SECRET }), sd);
    check('second discounted order for the same friend -> date moves, no second reward, Ravi alerted',
      log.response.code === 200 && credit(world, referrer) === 300 && /already referred by WD123456|already earned/.test(tg(log)), tg(log));
  }
  {
    // Notion refuses the payer update -> 500 + alert, nothing credited; Cashfree retry then works once
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const friend = row({ num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800 });
    const world = makeWorld({ rows: [referrer, friend] });
    const sd = {};
    await order(world, planBody({ ref: 'WD123456' }), sd);
    const o = lastOrder(world), pid = nextPay();
    world.failures['patch:' + friend.id.replace(/-/g, '')] = { times: 1 };
    let log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('payer update refused -> 500, "credit this by hand", referrer NOT credited', log.response.code === 500 && /NOTION UPDATE FAILED - credit this by hand/.test(tg(log)) && /not applied yet either/.test(tg(log)) && !credit(world, referrer), tg(log));
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('Cashfree retry after the failure -> applied once', log.response.code === 200 && credit(world, referrer) === 200 && text(world, friend, 'Referred By') === 'WD123456');
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('third delivery -> duplicate, still 200 credit', credit(world, referrer) === 200);
  }
  {
    // Notion refuses the referrer credit -> loud alert, 200 (no retry), retry cannot double it
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900', credit: 0 });
    const friend = row({ num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800 });
    const world = makeWorld({ rows: [referrer, friend] });
    const sd = {};
    await order(world, planBody({ ref: 'WD123456' }), sd);
    const o = lastOrder(world), pid = nextPay();
    world.failures['patch:' + referrer.id.replace(/-/g, '')] = { times: 1 };
    let log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('referrer credit refused -> "INVITE CREDIT FAILED - credit this by hand", answers 200', log.response.code === 200 && /INVITE CREDIT FAILED - credit this by hand/.test(tg(log)) && /phone ends 123456/.test(tg(log)) && /Referrer NOT credited/.test(tg(log)) && credit(world, referrer) === 0, tg(log));
    check('the friend\'s own payment was still booked', text(world, friend, 'Referred By') === 'WD123456' && text(world, friend, 'Last Payment Id') === pid);
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('retry after a refused credit -> duplicate, no automatic second attempt', credit(world, referrer) === 0 && !log.order.includes('Referrer credit karo'));
    // referrer row gone / not readable
    const w2 = makeWorld({ rows: [referrer, friend] });
    friend.properties['Referred By'].rich_text = []; friend.properties['Last Payment Id'].rich_text = []; friend.properties['Service Paid Up To'].date = null;
    await order(w2, planBody({ ref: 'WD123456' }), {});
    w2.pages.delete(referrer.id.replace(/-/g, ''));
    log = await hook(w2, webhookFor(lastOrder(w2), { paymentId: nextPay(), secret: SECRET }), {});
    check('referrer row deleted before payment -> alert, no PATCH, 200', log.response.code === 200 && /INVITE CREDIT FAILED/.test(tg(log)) && /did not return the referrer row/.test(tg(log)) && !log.order.includes('Referrer credit karo'), tg(log));
  }
  {
    // credit use confirmed, and credit spent twice
    const me = row({ car: 'Creta', num: 'DL1CAA1111', phone: REF_PHONE, fee: 999, owes: 0, paidTo: '2026-11-05', lastIds: '900', credit: 200 });
    const world = makeWorld({ rows: [me] });
    const sd = {};
    await order(world, planBody({ num: 'DL1CAA1111', phone: '9811123456', amount: 999 }), sd);
    const o1 = lastOrder(world);
    await order(world, planBody({ num: 'DL1CAA1111', phone: '9811123456', amount: 999 }), sd);
    const o2 = lastOrder(world);
    let log = await hook(world, webhookFor(o1, { paymentId: nextPay(), secret: SECRET }), sd);
    check('credit use confirmed: 799 paid, credit 200 -> 0, Owes Now stays 0', log.response.code === 200 && credit(world, me) === 0 && world.pages.get(me.id.replace(/-/g, '')).properties['Owes Now'].number === 0 && /Used ₹200 Referral Credit \(left ₹0\)/.test(tg(log)), tg(log));
    log = await hook(world, webhookFor(o2, { paymentId: nextPay(), secret: SECRET }), sd);
    check('same credit spent on a 2nd order -> column stays 0, Ravi alerted', credit(world, me) === 0 && /credit was ₹200 short/.test(tg(log)), tg(log));
  }
  {
    // amount check: discount accounted for, no hole
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const world = makeWorld({ rows: [referrer] });
    const sd = {};
    await order(world, planBody({ ref: 'WD123456' }), sd);
    const o = lastOrder(world);
    let log = await hook(world, webhookFor(o, { paymentId: nextPay(), paid: 1599, secret: SECRET }), sd);
    check('paid 1599 on a 1600 discounted order -> underpaid 401', log.response.code === 401 && credit(world, referrer) === null);
    await order(world, planBody({}), sd);
    const plain1800 = lastOrder(world);
    log = await hook(world, webhookFor(plain1800, { paymentId: nextPay(), paid: 1600, secret: SECRET }), sd);
    check('no-ref order paid 1600 -> underpaid (no way to claim a discount after the fact)', log.response.code === 401);
    const forged = (t, why) => hook(world, webhookFor(o, { paymentId: nextPay(), secret: SECRET, tags: Object.assign({}, o.order_tags, t) }), sd).then(l => check('tags that do not add up are refused: ' + why, l.response.code === 401 && credit(world, referrer) === null, JSON.stringify(l.outputs.get('Sach mein Cashfree hai?')[0].json)));
    await forged({ invite: o.order_tags.invite.replace(/:200$/, ':500'), expectedAmount: '1300' }, 'invite over 200');
    await forged({ fullAmount: '1700' }, 'list price - discount != charged');
    await forged({ creditUsed: '50' }, 'credit on a car with no page id');
    await forged({ invite: 'WD123456:not-a-page:200' }, 'bad referrer id');
    await forged({ kind: 'tip' }, 'discount on a tip');
    await forged({ kind: 'extra' }, 'discount on an extra');
    await forged({ creditUsed: '-5' }, 'negative credit');
    // older order made before this release (no fullAmount tag): still works
    const w2 = makeWorld({ rows: [row({ num: 'DL1CAA1111', phone: REF_PHONE, fee: 999, paidTo: '2026-11-05', lastIds: '900' })] });
    const legacy = { order_id: 'WDOLD1', order_amount: 999, customer_details: { customer_id: 'wd_9811123456', customer_phone: '9811123456' }, order_tags: { months: '1', expectedAmount: '999', kind: 'bill', reg: 'DL1CAA1111', pageId: [...w2.pages.values()][0].id } };
    log = await hook(w2, webhookFor(legacy, { paymentId: nextPay(), secret: SECRET }), {});
    check('order made before this release (no fullAmount tag) still books', log.response.code === 200 && w2.patches.length === 1);
    // forged signature still refused
    const bad = webhookFor(o, { paymentId: nextPay(), secret: 'wrong' });
    log = await hook(world, bad, sd);
    check('wrong signature still refused', log.response.code === 401);
    // a tip still works and says nothing about invites
    await order(world, { kind: 'tip', amount: 50, phone: '9000011111', label: 'Tip', ref: 'WD123456' }, sd);
    log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), sd);
    check('tip still flows (Got ₹50: Tip), ref ignored', log.response.code === 200 && /^Got ₹50: Tip/.test(tg(log)) && !/Invite/.test(tg(log)), tg(log));
    // ordinary bill without invite or credit: message unchanged
    const w3 = makeWorld({ rows: [row({ car: 'Swift', num: 'DL8CAB1234', phone: '+91 90000 00001', fee: 1800, owes: 1800, paidTo: '2026-10-01', lastIds: 'P050' })] });
    await order(w3, planBody({ num: 'DL8CAB1234', phone: '9000000001', kind: 'bill' }), {});
    log = await hook(w3, webhookFor(lastOrder(w3), { paymentId: 'P100', secret: SECRET }), {});
    check('plain bill: message as before, Last Payment Id list kept', /^Paid ₹1800 — Swift DL8CAB1234\nCovered till .*\nStill owed: ₹0$/.test(tg(log)) && plain([...w3.pages.values()][0].properties['Last Payment Id']) === 'P050,P100', tg(log));
    check('plain bill: no invite columns written', Object.keys(w3.patches[0].properties).every(k => k !== 'Referred By' && k !== 'Referral Credit'));
  }
  {
    // payer row lacks the new columns but the order somehow had an invite (e.g. columns deleted after the order)
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const friend = row({ num: 'DL3CXY9999', phone: '+91 90000 11111', fee: 1800 });
    const world = makeWorld({ rows: [referrer, friend] });
    await order(world, planBody({ ref: 'WD123456' }), {});
    delete friend.properties['Referred By']; delete friend.properties['Referral Credit'];
    const log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), {});
    check('payer row lost its columns -> payment still booked, no reward, Ravi alerted', log.response.code === 200 && !!world.pages.get(friend.id.replace(/-/g, '')).properties['Service Paid Up To'].date && !credit(world, referrer) && /Referred By column is missing/.test(tg(log)), tg(log));
  }

  // ================= referrer must be paid up for this month (Ravi, 1 Nov) =================
  {
    const referrer = row({ car: 'Creta', num: 'DL1CAA1111', phone: REF_PHONE, paidTo: PAST, lastIds: '900', credit: 0 });
    const world = makeWorld({ rows: [referrer] });
    const sd = {};
    let log = await order(world, planBody({ ref: 'WD123456' }), sd);
    check('referrer not paid up: friend still gets ₹200 off at order time', log.response.body.discount === 200 && lastOrder(world).order_amount === 1600);
    const o = lastOrder(world), pid = nextPay();
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('referrer not paid up at payment: no credit, 200, no failure alert, no Notion write to referrer',
      log.response.code === 200 && credit(world, referrer) === 0 && !/INVITE CREDIT FAILED/.test(tg(log)) && !log.order.includes('Referrer credit karo'), tg(log));
    check('Ravi\'s message names the referrer and says credit by hand',
      /No ₹200 credit for the referrer Creta DL1CAA1111 \(code WD123456\): not paid up for this month \(paid to [0-9-]{10}\)\. Credit by hand/.test(tg(log)), tg(log));
    log = await hook(world, webhookFor(o, { paymentId: pid, secret: SECRET }), sd);
    check('retry of that payment -> duplicate, still no credit', credit(world, referrer) === 0 && !log.order.includes('Referrer padho'));
    // the referrer pays up later; a second order for the same friend car must not now earn it
    referrer.properties['Service Paid Up To'].date = { start: FUTURE };
    await order(world, planBody({ ref: 'WD123456' }), sd);
    log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), sd);
    check('same friend pays again after the referrer paid up -> still no credit (one decision per friend)', credit(world, referrer) === 0, tg(log));
  }
  {
    // paid up when the order was made, lapsed by payment time: evaluated at hook time
    const referrer = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: FUTURE, lastIds: '900' });
    const world = makeWorld({ rows: [referrer] });
    await order(world, planBody({ ref: 'WD123456' }), {});
    referrer.properties['Service Paid Up To'].date = { start: PAST };
    let log = await hook(world, webhookFor(lastOrder(world), { paymentId: nextPay(), secret: SECRET }), {});
    check('paid up at order, lapsed at payment -> no credit', !credit(world, referrer) && /not paid up/.test(tg(log)));
    // not paid at order, paid by payment time -> credited
    const r2 = row({ num: 'DL1CAA1111', phone: REF_PHONE, paidTo: null, lastIds: '' });
    const w2 = makeWorld({ rows: [r2] });
    await order(w2, planBody({ ref: 'WD123456' }), {});
    r2.properties['Service Paid Up To'].date = { start: TODAY };
    log = await hook(w2, webhookFor(lastOrder(w2), { paymentId: nextPay(), secret: SECRET }), {});
    check('paid up to exactly today (IST) at payment -> credited', credit(w2, r2) === 200, tg(log));
    // never paid at all (no date) -> no credit
    const r3 = row({ num: 'DL1CAA1111', phone: REF_PHONE });
    const w3 = makeWorld({ rows: [r3] });
    await order(w3, planBody({ ref: 'WD123456' }), {});
    log = await hook(w3, webhookFor(lastOrder(w3), { paymentId: nextPay(), secret: SECRET }), {});
    check('referrer never paid (no date) -> no credit, "paid to never"', !credit(w3, r3) && /paid to never/.test(tg(log)), tg(log));
  }

  // ================= wd-pay-lookup returns credit =================
  {
    const a = row({ num: 'DL1CAA1111', phone: REF_PHONE, fee: 999, paidTo: FUTURE, credit: 400 });
    const b = row({ num: 'DL2CBB2222', phone: '+91 90000 22222', fee: 999 });
    const c = row({ num: 'DL3CCC3333', phone: '+91 90000 33333', fee: 999, columns: false });
    const d = row({ num: 'DL4CDD4444', phone: '+91 90000 44444', fee: 999, credit: 12.7 });
    const world = makeWorld({ rows: [a, b, c, d] });
    const look = car => run(WF, 'Bill poochho (webhook)', { headers: {}, query: { car } }, { env: ENV, staticData: {}, http: world.http });
    let l = await look('DL 1C AA 1111');
    check('lookup returns credit 400', l.response.body.found === true && l.response.body.credit === 400, JSON.stringify(l.response.body));
    check('lookup still returns no plate, phone or page id', !/DL1CAA|98111|-/.test(JSON.stringify(l.response.body).replace(/"paidTo":"[0-9-]+"/, '')), JSON.stringify(l.response.body));
    l = await look('DL2CBB2222');
    check('lookup: empty credit -> 0', l.response.body.credit === 0);
    l = await look('DL3CCC3333');
    check('lookup: no Referral Credit column -> 0', l.response.body.found === true && l.response.body.credit === 0);
    l = await look('DL4CDD4444');
    check('lookup: credit is a whole number', l.response.body.credit === 12);
    l = await look('XX9999');
    check('lookup: unknown car -> found:false only', JSON.stringify(l.response.body) === '{"found":false}');
  }

  // ================= wiring =================
  {
    const names = new Set(WF.nodes.map(n => n.name));
    const ids = WF.nodes.map(n => n.id);
    let ok = ids.length === new Set(ids).size && names.size === WF.nodes.length;
    const into = {};
    for (const [from, c] of Object.entries(WF.connections)) {
      if (!names.has(from)) ok = false;
      (c.main || []).forEach((outs, i) => (outs || []).forEach(t => { if (!names.has(t.node)) ok = false; (into[t.node] = into[t.node] || []).push(from + '#' + i); }));
    }
    check('all connections reference existing nodes, ids and names unique', ok);
    check('Referrer dhoondo only runs from Ref hai? (true)', JSON.stringify(into['Referrer dhoondo']) === '["Ref hai?#0"]');
    check('referrer credit is written only after the payer update succeeded or the lead was logged',
      JSON.stringify(into['Invite credit chahiye?'].sort()) === JSON.stringify(['Anjaan gaadi: lead banao#0', 'Yaad rakho#0']) && JSON.stringify(into['Referrer credit karo']) === '["Credit likh sakte?#0"]');
    check('both credit failure branches lead to the hand-credit alert', JSON.stringify(into['Credit fail: Ravi ko batao'].sort()) === JSON.stringify(['Credit theek hua?#1', 'Paid up nahi?#1']));
    check('not-paid-up skip goes to Ravi\'s message, never to the credit write', JSON.stringify(into['Paid up nahi?']) === '["Credit likh sakte?#1"]' && (WF.connections['Paid up nahi?'].main[0] || []).map(t => t.node).join() === 'Sandesh banao');
    const raw = JSON.stringify(WF);
    check('no secret in the file', !/x-client-secret"\s*:\s*"[A-Za-z0-9]/.test(raw) && !raw.includes(SECRET));
    check('every Notion node uses the Notion account credential', WF.nodes.filter(n => /notion\.com/.test(String(n.parameters.url))).every(n => n.credentials && n.credentials.notionApi && n.credentials.notionApi.name === 'Notion account'));
  }

  console.log(results.join('\n'));
  console.log(`\n# pass ${pass}  fail ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(results.join('\n')); console.error(e); process.exit(2); });
