// Razorpay order pricing and signature checking. Pure functions: the workflow's Code nodes
// embed this file (plus lib.js) and call them, and test.mjs calls the same functions.

// What we are willing to charge, in rupees. The browser names an item; it never sets the
// amount. Keep these in step with WASHES in workflow 8 ("Daam tay karo") and the app.
const RZP_ITEMS = {
  wash: ['WD Wash', 199],
  deep: ['WD Deep Cleaning', 800],
  exclusive: ['WD Exclusive', 2100],
  test: ['Test payment', 1],
};
const RZP_MIN_PAISE = 100; // Razorpay refuses orders under ₹1

// body: what the browser POSTed. Returns either
//   { ok: true, order: { amount, currency, receipt, notes }, name }
//   { ok: false, status, message }
function rzpPriceOrder(body, now, rand) {
  const b = body && typeof body === 'object' ? body : {};
  const id = String(b.item || '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(RZP_ITEMS, id)) {
    return { ok: false, status: 400, message: 'Please pick what you want to pay for.' };
  }
  const [name, rupees] = RZP_ITEMS[id];
  const amount = Math.round(rupees * 100);
  if (!Number.isInteger(amount) || amount < RZP_MIN_PAISE) {
    return { ok: false, status: 400, message: 'Amount must be at least ₹1.' };
  }
  const phone = String(b.phone || '').replace(/\D/g, '').slice(-10);
  const who = String(b.name || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 60);
  const notes = { item: id };
  if (/^[6-9]\d{9}$/.test(phone)) notes.phone = phone;
  if (who) notes.name = who;
  // Receipt is ours, at most 40 characters, and unique enough to find in the dashboard.
  const receipt = ('wd_' + id + '_' + Number(now).toString(36) + '_' + String(rand).replace(/\W/g, '')).slice(0, 40);
  return { ok: true, order: { amount, currency: 'INR', receipt, notes }, name };
}

// After Razorpay answered POST /v1/orders. res is n8n's full response ({ statusCode, body }).
// Returns { status, body } for the respond node.
function rzpOrderReply(res, priced, keyId) {
  const code = Number(res && res.statusCode) || 0;
  let o = res && res.body;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = null; } }
  if (code === 401) {
    return { status: 401, body: { message: 'Payments are not set up correctly. Please try again later.' } };
  }
  if (code < 200 || code >= 300 || !o || !/^order_\w+$/.test(String(o.id || ''))) {
    return { status: 500, body: { message: 'Could not start the payment. Please try again.' } };
  }
  // Razorpay must have created exactly the order we priced.
  if (Number(o.amount) !== priced.order.amount || o.currency !== 'INR') {
    return { status: 500, body: { message: 'Could not start the payment. Please try again.' } };
  }
  return { status: 200, body: { order_id: o.id, amount: o.amount, currency: o.currency, key_id: keyId, name: priced.name } };
}

// The checkout's success handler sends these three. Razorpay's signature is
// HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) as lowercase hex.
function rzpVerify(body, secret) {
  if (!secret) return { status: 500, body: { ok: false, message: 'Payments are not set up yet.' } };
  const b = body && typeof body === 'object' ? body : {};
  const orderId = String(b.razorpay_order_id || '').trim();
  const paymentId = String(b.razorpay_payment_id || '').trim();
  const sig = String(b.razorpay_signature || '').trim().toLowerCase();
  if (!orderId || !paymentId || !sig) {
    return { status: 400, body: { ok: false, message: 'Missing payment details.' } };
  }
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId) || !/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) || !/^[0-9a-f]{64}$/.test(sig)) {
    return { status: 400, body: { ok: false, message: 'Payment could not be verified.' } };
  }
  const expected = hmacSha256Hex(secret, orderId + '|' + paymentId);
  if (!sameSecret(expected, sig)) {
    return { status: 400, body: { ok: false, message: 'Payment could not be verified.' } };
  }
  return { status: 200, body: { ok: true, order_id: orderId, payment_id: paymentId } };
}
