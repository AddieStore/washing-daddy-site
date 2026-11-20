/* WD Operations: data core (window.OPS).
 * Live Firestore listeners, derived views and every write the dashboard makes. The screens (ui.js) only call this.
 * Contract: /mnt/project-files/ops-dashboard-2026-11-20/CONTRACT.md. Rules: every write here is an admin write
 * (isAdmin() in firestore.rules); the owner check is the washers read at start, same as WD Control.
 *
 * OPS.S                 raw docs: jobs, washers (by +91 phone), photos (by +91 phone), locs (by round id), washes (today),
 *                       customers, payorders, plans; S.loaded[name] true after the first answer; S.online.
 * OPS.on(fn)            fn() after any change (batched). Returns an unsubscribe.
 * OPS.start()           live mode (after WDAuth sign-in). Rejects with {owner:false} when the number is not an owner.
 * OPS.demo()            sample data in memory, a booking arrives every ~40 s, washers move. Nothing is saved.
 * Views:  job(id), jobs({kind:'instant'|'scheduled'|'all', stage, q}), washer(phone), washers(), suggest(jobId),
 *         monthly(), dues(days), payments(), kpis(), byRound(roundId)
 * Writes (Promises): assign(jobId, phone, {etaMin}), unassign(jobId), stage(jobId, 'on_the_way'|'doing'|'done', {etaMin}),
 *         cancel(jobId, why), setEta(jobId, min), addWasher({name, phone, area, photo}), updateWasher(phone, {name, area}),
 *         setPhoto(phone, dataURL), setWasherStatus(phone, 'approved'|'blocked'), setRound(phone, roundId),
 *         customerStatus(phone, 'active'|'new')
 * Utils:  photoFromFile(file) -> data URL (<=100 KB JPEG), km(a,b), ago(iso), fmtTime(iso), rs(n), nice(phone), today()
 */
(() => {
'use strict';
const IST = 5.5 * 3600e3;
const pad = n => String(n).padStart(2, '0');
// '2026-11-20T14:05:09+05:30', the format the apps and n8n write
function isoIST(t = Date.now()) { const d = new Date(t + IST); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+05:30` }
const today = (t = Date.now()) => isoIST(t).slice(0, 10);
const addDays = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) };
const ms = s => { if (!s) return NaN; const x = String(s).replace(' ', 'T'); return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(x) ? x : (x.length <= 10 ? x + 'T00:00:00' : x) + '+05:30') };
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d };
const rs = n => '₹' + Math.round(num(n)).toLocaleString('en-IN');
const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
const plus91 = p => { const d = digits(p); return d.length === 10 ? '+91' + d : '' };
const nice = p => { const d = digits(p); return d ? '+91 ' + d.slice(0, 5) + ' ' + d.slice(5) : '' };
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
function km(a, b) {
  if (!a || !b || !isFinite(a.lat) || !isFinite(b.lat) || !isFinite(a.lng) || !isFinite(b.lng)) return NaN;
  const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// scooter in Delhi lanes: about 18 km/h on the road (x1.3 over the straight line), plus 3 min to park and unload
const travelMin = k => isFinite(k) ? Math.max(5, Math.round(k * 1.3 / 18 * 60 + 3)) : 15;
function ago(iso) {
  const t = ms(iso); if (!isFinite(t)) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
}
function fmtTime(iso) { const t = ms(iso); if (!isFinite(t)) return ''; const d = new Date(t + IST); let h = d.getUTCHours(); const m = pad(d.getUTCMinutes()), ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${m} ${ap}` }
const FRESH_MS = 3 * 60e3;

/* ---------------- state ---------------- */
const S = { jobs: {}, washers: {}, photos: {}, locs: {}, washes: {}, customers: {}, payorders: {}, plans: {}, loaded: {}, online: false, demo: false };
const subs = new Set(); let tick = null;
function emit() { if (tick) return; tick = setTimeout(() => { tick = null; subs.forEach(f => { try { f() } catch (e) { console.error(e) } }) }, 30) }
const on = f => { subs.add(f); return () => subs.delete(f) };
let db = null, unsubs = [];
const snapDocs = sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data() }); return o };

async function start() {
  stop(); S.demo = false;
  db = db || await window.claude.use('db');
  if (!db) throw Object.assign(new Error('nodb'), { nodb: true });
  try { await db.collection('washers').get() } catch (e) { throw Object.assign(new Error('owner'), { owner: false, cause: e }) }
  const err = name => e => { console.warn('ops', name, e); S.online = false; emit() };
  const live = (name, q, key = name) => unsubs.push(q.onSnapshot(sn => { S[key] = snapDocs(sn); S.loaded[key] = true; S.online = true; emit() }, err(name)));
  const since = isoIST(Date.now() - 45 * 864e5);   // bookings and payments of the last 45 days
  live('ondemand', db.collection('ondemand').where('created_at', '>=', since), 'jobs');
  live('washers', db.collection('washers'));
  live('washerphotos', db.collection('washerphotos'), 'photos');
  live('locations', db.collection('locations'), 'locs');
  live('customers', db.collection('customers'));
  live('payorders', db.collection('payorders').where('created_at', '>=', since), 'payorders');
  unsubs.push(db.collection('catalog').onSnapshot(sn => { const o = {}; sn.docs.forEach(d => { const v = d.data(); if (v && v.kind === 'plan') o[d.id] = v }); S.plans = o; S.loaded.plans = true; emit() }, err('catalog')));
  // the monthly round: today's wash docs; re-listen when the day turns
  let day = '';
  const watchDay = () => { const d = today(); if (d === day) return; day = d; if (washUnsub) washUnsub(); washUnsub = db.collection('washes').where('date', '==', d).onSnapshot(sn => { S.washes = snapDocs(sn); S.loaded.washes = true; emit() }, err('washes')) };
  let washUnsub = null; watchDay();
  const t = setInterval(() => { watchDay(); emit() }, 30e3);   // also re-draws "x min ago" and freshness
  unsubs.push(() => clearInterval(t), () => washUnsub && washUnsub());
  // a booking made before the 45-day window but still open (scheduled far ahead, or never finished) still shows
  unsubs.push(db.collection('ondemand').where('washer_id', '==', '').onSnapshot(sn => { sn.docs.forEach(d => { S.jobs[d.id] = d.data() }); emit() }, err('ondemand-open')));
}
function stop() { unsubs.forEach(u => { try { u() } catch (e) {} }); unsubs = [] }

/* ---------------- views ---------------- */
const STAGE_LABEL = { unassigned: 'Unassigned', assigned: 'Assigned', on_the_way: 'On the way', washing: 'Washing', done: 'Done', cancelled: 'Cancelled' };
function stageOf(d) {
  const st = d.status || 'new';
  if (st === 'cancelled') return 'cancelled';
  if (st === 'done') return 'done';
  if (st === 'doing') return 'washing';
  if (st === 'on_the_way') return 'on_the_way';
  return d.washer_id ? 'assigned' : 'unassigned';   // new | scheduled | declined
}
const washerByRound = id => { if (!id) return null; for (const ph in S.washers) if (S.washers[ph].route_id === id) return ph; return null };
function customerName(phone) { const c = S.customers[phone]; if (c && c.name) return c.name; for (const id in S.payorders) { const p = S.payorders[id]; if (p.phone === phone && p.name) return p.name } return '' }
function jobView(id) {
  const d = S.jobs[id]; if (!d) return null;
  const mode = d.mode === 'scheduled' || d.slot ? 'scheduled' : 'instant';
  const stage = stageOf(d), wph = washerByRound(d.washer_id);
  const lines = Array.isArray(d.services) && d.services.length ? d.services : [{ id: d.service_id, q: 1 }];
  const at = mode === 'scheduled' && d.date ? ms(d.date + 'T' + (/^\d\d:\d\d/.test(d.slot || '') ? d.slot.slice(0, 5) : '09:00') + ':00') : ms(d.created_at);
  return {
    id, raw: d, mode, stage, stageLabel: STAGE_LABEL[stage], open: !['done', 'cancelled'].includes(stage),
    service: d.service || lines.map(l => l.id).join(', '), lines,
    customer: { phone: d.customer_id || d.phone || '', name: customerName(d.customer_id || d.phone) },
    car: [d.car, d.reg].filter(Boolean).join(' · '),
    address: [d.flat, d.area].filter(Boolean).join(', '), lat: num(d.lat, NaN), lng: num(d.lng, NaN),
    date: d.date || String(d.created_at || '').slice(0, 10), slot: d.slot || '', at,
    amount: num(d.total ?? d.price), paidOnline: num(d.price), paid: !!d.paid, payVia: d.pay_via || (d.pass_id ? 'WD Pass' : d.paid ? 'Paid' : 'Pay on arrival'),
    created: d.created_at || '', eta: d.eta || '', washerPhone: wph, washerId: d.washer_id || '',
    washerName: d.washer_name || (wph && S.washers[wph].name) || d.washer_id || '',
    washerLoc: isFinite(num(d.washer_lat, NaN)) ? { lat: num(d.washer_lat), lng: num(d.washer_lng), at: d.washer_loc_at } : null,
    late: stage === 'unassigned' && mode === 'instant' && Date.now() - ms(d.created_at) > 5 * 60e3,
  };
}
function jobs(f = {}) {
  let out = Object.keys(S.jobs).map(jobView).filter(Boolean);
  if (f.kind && f.kind !== 'all') out = out.filter(j => j.mode === f.kind);
  if (f.stage === 'open') out = out.filter(j => j.open); else if (f.stage) out = out.filter(j => j.stage === f.stage);
  if (f.washer) out = out.filter(j => j.washerPhone === f.washer);
  if (f.q) { const q = f.q.toLowerCase(); out = out.filter(j => [j.id, j.service, j.customer.name, j.customer.phone, j.car, j.address, j.washerName].join(' ').toLowerCase().includes(q)) }
  const rank = { unassigned: 0, assigned: 1, on_the_way: 2, washing: 3, done: 4, cancelled: 5 };
  return out.sort((a, b) => (f.sort === 'new' ? 0 : rank[a.stage] - rank[b.stage]) || (a.open ? a.at - b.at : b.at - a.at) || String(b.created).localeCompare(String(a.created)));
}
function washerView(phone) {
  const w = S.washers[phone]; if (!w) return null;
  const round = w.route_id || '';
  const l = S.locs[round];
  const loc = l && isFinite(num(l.lat, NaN)) ? { lat: num(l.lat), lng: num(l.lng), at: l.updated_at || '', accuracy: num(l.accuracy, 0), fresh: Date.now() - ms(l.updated_at) < FRESH_MS } : null;
  const mine = Object.keys(S.jobs).map(jobView).filter(j => j && j.washerId === round && round);
  const active = mine.filter(j => ['on_the_way', 'washing'].includes(j.stage)).sort((a, b) => a.at - b.at)[0] || null;
  const queued = mine.filter(j => j.stage === 'assigned').sort((a, b) => a.at - b.at);
  const ws = Object.values(S.washes).filter(x => x.washer_id === round && round);
  const roundNow = ws.find(x => ['on_the_way', 'arrived', 'washing'].includes(x.status));
  const doneToday = ws.filter(x => x.status === 'done').length + mine.filter(j => j.stage === 'done' && String(j.raw.finished_at || '').slice(0, 10) === today()).length;
  let activity;
  if (w.status === 'blocked') activity = { kind: 'blocked', text: 'Blocked' };
  else if (w.status !== 'approved') activity = { kind: 'pending', text: 'Waiting for approval' };
  else if (active) activity = { kind: 'job', text: (active.stage === 'washing' ? 'Washing ' : 'On the way to ') + (active.car || active.service), jobId: active.id };
  else if (roundNow) activity = { kind: 'round', text: ({ on_the_way: 'Monthly round, going to ', arrived: 'Monthly round, at ', washing: 'Monthly round, washing ' })[roundNow.status] + (roundNow.car_label || roundNow.reg) };
  else if (loc && loc.fresh) activity = { kind: 'free', text: queued.length ? `Free, ${queued.length} job${queued.length > 1 ? 's' : ''} queued` : 'Free' };
  else activity = { kind: 'offline', text: loc ? 'App closed, last seen ' + ago(loc.at) : 'App not opened yet' };
  return { phone, name: w.name || nice(phone), round, area: w.area || '', status: w.status || 'pending', photo: S.photos[phone] ? S.photos[phone].photo : '',
    loc, activity, active, queued, roundTotal: ws.length, roundDone: ws.filter(x => x.status === 'done').length, doneToday, raw: w };
}
const washers = () => Object.keys(S.washers).map(washerView).filter(Boolean).sort((a, b) => (a.status === 'approved' ? 0 : 1) - (b.status === 'approved' ? 0 : 1) || a.name.localeCompare(b.name));
function suggest(jobId) {
  const j = jobView(jobId); if (!j) return [];
  const here = isFinite(j.lat) ? { lat: j.lat, lng: j.lng } : null;
  const busy = { free: 0, job: 2, round: 2, offline: 3 };
  return washers().filter(w => w.status === 'approved' && w.round).map(w => {
    const k = here && w.loc ? km(here, w.loc) : NaN;
    return { ...w, km: k, etaMin: travelMin(k), score: (busy[w.activity.kind] ?? 4) * 100 + w.queued.length * 20 + (isFinite(k) ? Math.min(k, 50) : 30) };
  }).sort((a, b) => a.score - b.score);
}
// monthly customers: one row per customer with their cars, plan, paid-till and days left
function planOf(id) { const p = S.plans[id]; return p ? { name: p.name || id, price: num(p.price) } : { name: id || 'Plan', price: 0 } }
function monthly() {
  const t0 = ms(today());
  return Object.entries(S.customers).map(([phone, c]) => {
    const cars = (Array.isArray(c.cars) ? c.cars : []).map(x => {
      const left = x.till ? Math.round((ms(x.till) - t0) / 864e5) : null, p = planOf(x.plan);
      return { id: x.id, name: [x.make, x.name].filter(Boolean).join(' '), plate: x.plate || '', plan: x.plan || '', planName: p.name, price: num(x.fee, p.price), start: x.start || '', till: x.till || '', left, washer: x.washer || '', paused: x.paused || null };
    });
    const next = cars.filter(x => x.left != null).sort((a, b) => a.left - b.left)[0] || null;
    return { phone, name: c.name || nice(phone), area: c.area || '', status: c.status || 'new', cars, next, monthlyTotal: cars.reduce((a, x) => a + x.price, 0), requested: (c.requested_cars || []).length, created: c.created_at || c.since || '', raw: c };
  }).sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || ((a.next ? a.next.left : 999) - (b.next ? b.next.left : 999)) || a.name.localeCompare(b.name));
}
// upcoming payments: monthly cars whose paid-till ends within `days` (overdue first), plus scheduled bookings not paid yet
function dues(days = 10) {
  const out = [];
  monthly().filter(c => c.status === 'active').forEach(c => c.cars.forEach(x => { if (x.left != null && x.left <= days) out.push({ kind: 'monthly', phone: c.phone, name: c.name, what: `${x.planName} · ${x.name || x.plate}`, amount: x.price, due: x.till ? addDays(x.till, 1) : '', left: x.left, overdue: x.left < 0 }) }));
  jobs({ stage: 'open' }).filter(j => !j.paid && j.amount > 0).forEach(j => out.push({ kind: 'booking', phone: j.customer.phone, name: j.customer.name || nice(j.customer.phone), what: j.service, amount: j.amount, due: j.date, left: Math.round((ms(j.date) - ms(today())) / 864e5), overdue: false, jobId: j.id }));
  return out.sort((a, b) => a.left - b.left);
}
function payments() {
  return Object.entries(S.payorders).map(([id, p]) => ({ id, kind: p.kind || 'payment', phone: p.phone || '', name: p.name || customerName(p.phone), status: p.status || 'created',
    amount: num(p.paid_amount ?? p.amount), total: num(p.total ?? p.amount), gateway: p.paid_gateway || p.gateway || '', via: p.pay_via || '', at: p.paid_at || p.created_at || '', created: p.created_at || '', bookingId: p.booking_id || '',
    what: Array.isArray(p.lines) && p.lines.length ? p.lines.map(l => (l.q > 1 ? l.q + ' x ' : '') + (l.name || l.id)).join(', ') : ({ wallet_topup: 'WD Money top-up', pass: 'WD Pass', booking: 'Booking' })[p.kind] || p.kind || '' }))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function kpis() {
  const d = today(), all = jobs(), pays = payments().filter(p => p.status === 'paid');
  const sum = a => a.reduce((s, p) => s + p.amount, 0);
  const wk = addDays(d, -6);
  const ws = washers().filter(w => w.status === 'approved');
  return {
    unassigned: all.filter(j => j.stage === 'unassigned').length, late: all.filter(j => j.late).length,
    active: all.filter(j => ['assigned', 'on_the_way', 'washing'].includes(j.stage)).length,
    doneToday: all.filter(j => j.stage === 'done' && String(j.raw.finished_at || j.date).slice(0, 10) === d).length,
    bookingsToday: all.filter(j => String(j.created).slice(0, 10) === d).length,
    paidToday: sum(pays.filter(p => String(p.at).slice(0, 10) === d)), paidWeek: sum(pays.filter(p => String(p.at).slice(0, 10) >= wk)),
    monthlyActive: Object.values(S.customers).filter(c => c.status === 'active').length,
    duesSoon: dues(7).filter(x => x.kind === 'monthly').length, overdue: dues(7).filter(x => x.overdue).length,
    washersOnline: ws.filter(w => w.loc && w.loc.fresh).length, washers: ws.length,
    roundDone: Object.values(S.washes).filter(x => x.status === 'done').length, roundTotal: Object.keys(S.washes).length,
  };
}

/* ---------------- writes ---------------- */
async function write(path, patch, create) {
  patch = { ...patch, updated_at: isoIST() };
  if (S.demo) { const [col, id] = path.split('/'); const key = { ondemand: 'jobs', washerphotos: 'photos', locations: 'locs' }[col] || col; S[key][id] = create ? patch : { ...(S[key][id] || {}), ...patch }; emit(); return }
  const ref = db.doc(path);
  return create ? ref.set(patch) : ref.update(patch);
}
function need(id) { const j = jobView(id); if (!j) throw new Error('That booking is gone.'); return j }
async function assign(jobId, phone, o = {}) {
  const j = need(jobId), w = S.washers[phone];
  if (!w || w.status !== 'approved' || !w.route_id) throw new Error('That washer is not approved yet.');
  if (!j.open) throw new Error('This booking is already ' + j.stageLabel.toLowerCase() + '.');
  const v = washerView(phone), k = isFinite(j.lat) && v.loc ? km({ lat: j.lat, lng: j.lng }, v.loc) : NaN;
  const etaMin = num(o.etaMin, travelMin(k));
  const p = { washer_id: w.route_id, washer_name: w.name || '', washer_phone: phone, washer_photo: v.photo || '', assigned_at: isoIST(), assigned_by: 'admin',
    status: ['on_the_way', 'doing'].includes(j.raw.status) ? j.raw.status : 'new' };
  if (j.mode === 'instant') p.eta = isoIST(Date.now() + etaMin * 60e3);
  return write('ondemand/' + jobId, p);
}
async function unassign(jobId) {
  const j = need(jobId);
  return write('ondemand/' + jobId, { washer_id: '', washer_name: '', washer_phone: '', washer_photo: '', status: j.mode === 'scheduled' ? 'scheduled' : 'new', eta: '', unassigned_at: isoIST() });
}
async function stage(jobId, st, o = {}) {
  const j = need(jobId);
  if (!j.washerId) throw new Error('Assign a washer first.');
  const now = isoIST();
  if (st === 'on_the_way') return write('ondemand/' + jobId, { status: 'on_the_way', on_the_way_at: now, eta: isoIST(Date.now() + num(o.etaMin, 15) * 60e3) });
  if (st === 'doing') return write('ondemand/' + jobId, { status: 'doing', started_at: now });
  if (st === 'done') return write('ondemand/' + jobId, { status: 'done', finished_at: now });
  throw new Error('Unknown step');
}
// Cancelling here does not refund: the refund is made in the Razorpay (or Cashfree) dashboard. The screens say so.
async function cancel(jobId, why) { need(jobId); return write('ondemand/' + jobId, { status: 'cancelled', cancelled_at: isoIST(), cancelled_by: 'admin', cancel_note: String(why || '').slice(0, 200) }) }
async function setEta(jobId, min) { need(jobId); return write('ondemand/' + jobId, { eta: isoIST(Date.now() + Math.max(1, num(min, 15)) * 60e3) }) }
function freeRound(name) {
  const used = new Set(Object.values(S.washers).map(w => w.route_id).filter(Boolean));
  let base = slug(name) || 'washer'; if (base.length < 2) base += '-1';
  let id = base, n = 2; while (used.has(id)) id = base + '-' + n++;
  return id;
}
async function addWasher({ name, phone, area, photo }) {
  name = String(name || '').trim().slice(0, 60); const ph = plus91(phone);
  if (!name) throw new Error('Write the washer\'s name.');
  if (!/^\+91[6-9]\d{9}$/.test(ph)) throw new Error('Enter a 10-digit mobile number.');
  if (S.washers[ph]) throw new Error(`${nice(ph)} is already ${S.washers[ph].name || 'a washer'}.`);
  const now = isoIST(), round = freeRound(name);
  if (photo) await write('washerphotos/' + ph, { photo }, true);
  await write('washers/' + ph, { phone: ph, name, area: String(area || '').slice(0, 80), status: 'approved', route_id: round, created_at: now, decided_at: now, decided_by: S.demo ? 'demo' : (window.WDAuth && WDAuth.phone && WDAuth.phone()) || 'admin', added_via: 'ops', has_photo: !!photo }, true);
  return round;
}
async function updateWasher(phone, o) { const p = {}; if (o.name != null) p.name = String(o.name).trim().slice(0, 60); if (o.area != null) p.area = String(o.area).trim().slice(0, 80); return write('washers/' + phone, p) }
async function setPhoto(phone, dataURL) { await write('washerphotos/' + phone, { photo: dataURL }, true); return write('washers/' + phone, { has_photo: true }) }
async function setWasherStatus(phone, st) {
  const w = S.washers[phone]; if (!w) throw new Error('No such washer.');
  const p = { status: st }; if (st === 'approved' && !w.route_id) p.route_id = freeRound(w.name || phone);
  if (st === 'approved') p.decided_at = isoIST();
  return write('washers/' + phone, p);
}
async function setRound(phone, round) {
  round = slug(round); if (!round || round.length < 2) throw new Error('Round id: 2 or more letters.');
  const other = washerByRound(round); if (other && other !== phone) throw new Error(`${S.washers[other].name} is already on ${round}.`);
  return write('washers/' + phone, { route_id: round });
}
async function customerStatus(phone, st) { return write('customers/' + phone, { status: st === 'active' ? 'active' : 'new', ...(st === 'active' ? { activated_at: isoIST() } : {}) }) }

// a phone photo -> a square-ish JPEG under 100 KB (the customer app shows it at 48-96 px)
function photoFromFile(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height), c = document.createElement('canvas');
      let size = 360, q = .82, out = '';
      for (let i = 0; i < 8; i++) {
        c.width = c.height = size; const g = c.getContext('2d');
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2.6, side, side, 0, 0, size, size);
        out = c.toDataURL('image/jpeg', q); if (out.length <= 100000) break;
        q = Math.max(.5, q - .1); if (q === .5) size = Math.round(size * .8);
      }
      out.length <= 100000 ? res(out) : rej(new Error('That photo is too big. Try another.'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Couldn't read that photo.")) };
    img.src = url;
  });
}

/* ---------------- demo ---------------- */
// Paschim Vihar / Meera Bagh, West Delhi
const C0 = { lat: 28.6692, lng: 77.0962 };
const at = (dLat, dLng) => ({ lat: +(C0.lat + dLat).toFixed(5), lng: +(C0.lng + dLng).toFixed(5) });
function avatar(letter, bg) { return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bg}"/><circle cx="48" cy="38" r="17" fill="#fff" opacity=".92"/><path d="M18 86c4-18 16-26 30-26s26 8 30 26" fill="#fff" opacity=".92"/><text x="48" y="44" font-family="Poppins,Arial" font-size="18" font-weight="700" text-anchor="middle" fill="${bg}">${letter}</text></svg>`) }
let demoT = [];
function demo() {
  stop(); demoT.forEach(clearInterval); demoT = []; S.demo = true; S.online = true;
  const d = today(), now = Date.now(), T = m => isoIST(now - m * 60e3);
  S.washers = {
    '+919000000001': { phone: '+919000000001', name: 'Chotte', area: 'GH-9 · GH-6 Paschim Vihar', status: 'approved', route_id: 'chotte', created_at: '2024-06-01', has_photo: true },
    '+919000000002': { phone: '+919000000002', name: 'Shahrukh', area: 'GH-14 · Meera Bagh', status: 'approved', route_id: 'shahrukh', created_at: '2025-02-10', has_photo: true },
    '+919000000003': { phone: '+919000000003', name: 'Aman', area: 'Sundar Vihar', status: 'approved', route_id: 'aman', created_at: '2026-11-02', has_photo: false },
    '+919000000004': { phone: '+919000000004', name: 'Raju', area: 'Paschim Puri', status: 'pending', created_at: T(300) },
  };
  S.photos = { '+919000000001': { photo: avatar('C', '#5409DA') }, '+919000000002': { photo: avatar('S', '#0E9F6E') } };
  S.locs = {
    chotte: { ...at(.004, -.006), accuracy: 12, washer_id: 'chotte', updated_at: T(.5) },
    shahrukh: { ...at(-.007, .011), accuracy: 9, washer_id: 'shahrukh', updated_at: T(1) },
    aman: { ...at(.012, .004), accuracy: 30, washer_id: 'aman', updated_at: T(48) },
  };
  const J = (id, o) => { S.jobs[id] = { service: 'Foam wash', services: [{ id: 'wash', variant: 'sedan', q: 1, price: 399 }], price: 399, total: 399, paid: true, pay_via: 'Razorpay', mode: 'instant', date: d, slot: '', status: 'new', washer_id: '', created_at: T(3), ...o } };
  S.jobs = {};
  J('B7Q2K1', { service: 'Foam wash + Interior vacuum', total: 648, price: 648, car: 'Hyundai Creta', reg: 'DL 8C AF 4471', phone: '+919811001122', customer_id: '+919811001122', flat: 'B-204', area: 'GH-9 Paschim Vihar', ...at(.003, -.004), created_at: T(2) });
  J('B7Q2J9', { service: 'Interior deep clean', total: 799, price: 799, car: 'Maruti Baleno', reg: 'DL 4C NB 0912', phone: '+919811009090', customer_id: '+919811009090', flat: 'C-11', area: 'Meera Bagh', ...at(-.006, .009), status: 'on_the_way', washer_id: 'shahrukh', washer_name: 'Shahrukh', washer_phone: '+919000000002', assigned_at: T(14), on_the_way_at: T(9), eta: isoIST(now + 6 * 60e3), created_at: T(18), washer_lat: at(-.0065, .0102).lat, washer_lng: at(-.0065, .0102).lng, washer_loc_at: T(.4) });
  J('B7Q2H4', { service: 'Pressure wash', total: 499, price: 499, car: 'Kia Sonet', reg: 'DL 3C CK 7781', phone: '+919811007777', customer_id: '+919811007777', flat: 'A-3', area: 'GH-6 Paschim Vihar', ...at(.005, -.007), status: 'doing', washer_id: 'chotte', washer_name: 'Chotte', washer_phone: '+919000000001', assigned_at: T(52), on_the_way_at: T(45), started_at: T(22), created_at: T(55) });
  J('B7Q2F0', { service: 'Foam wash', total: 399, price: 399, car: 'Honda City', reg: 'DL 9C AB 1203', phone: '+919811004455', customer_id: '+919811004455', area: 'Sundar Vihar', flat: '42', ...at(.011, .003), status: 'done', washer_id: 'chotte', washer_name: 'Chotte', started_at: T(150), finished_at: T(118), created_at: T(170) });
  J('B7Q2S1', { mode: 'scheduled', date: addDays(d, 1), slot: '07:00', service: 'Exterior wash + Tyre shine', total: 449, price: 449, car: 'Toyota Innova', reg: 'DL 2C AQ 5521', phone: '+919811003344', customer_id: '+919811003344', flat: 'D-7', area: 'GH-14 Paschim Vihar', ...at(-.002, .006), status: 'scheduled', created_at: T(240) });
  J('B7Q2S2', { mode: 'scheduled', date: addDays(d, 1), slot: '09:30', service: 'Deep clean', total: 1299, price: 0, paid: false, pay_via: 'Pay on arrival', car: 'Mahindra XUV700', reg: 'DL 1C ZZ 9090', phone: '+919811006677', customer_id: '+919811006677', flat: '19', area: 'Paschim Puri', ...at(.008, -.012), status: 'scheduled', washer_id: 'chotte', washer_name: 'Chotte', created_at: T(600) });
  J('B7Q2S3', { mode: 'scheduled', date: addDays(d, 2), slot: '08:00', service: 'Foam wash', total: 399, price: 399, car: 'Hyundai i20', reg: 'DL 5C KK 3030', phone: '+919811002211', customer_id: '+919811002211', flat: 'E-9', area: 'Meera Bagh', ...at(-.008, .013), status: 'scheduled', created_at: T(90) });
  J('B7Q2C9', { service: 'Foam wash', total: 399, car: 'Swift', reg: 'DL 7C XY 1111', phone: '+919811008800', customer_id: '+919811008800', area: 'GH-9 Paschim Vihar', status: 'cancelled', cancelled_at: T(300), created_at: T(320) });
  const till = n => addDays(d, n);
  S.customers = {
    '+919811440001': { name: 'Mr. Arora', area: 'GH-9 Paschim Vihar', status: 'active', cars: [{ id: 'c0', make: 'Mahindra', name: 'Scorpio N', plate: 'DL 4C AB 2731', plan: 'pro', start: till(-27), till: till(3), washer: 'Chotte' }], created_at: '2026-08-02' },
    '+919811440002': { name: 'Neha Kapoor', area: 'GH-6 Paschim Vihar', status: 'active', cars: [{ id: 'c0', make: 'Honda', name: 'Civic', plate: 'DL 3C BK 0419', plan: 'std', start: till(-32), till: till(-2), washer: 'Chotte' }, { id: 'c1', make: 'Kia', name: 'Seltos', plate: 'DL 3C BK 7711', plan: 'std', start: till(-10), till: till(20), washer: 'Chotte' }], created_at: '2026-07-11' },
    '+919811440003': { name: 'Gupta ji', area: 'Meera Bagh', status: 'active', cars: [{ id: 'c0', make: 'Maruti', name: 'Ertiga', plate: 'DL 8C MM 4040', plan: 'basic', start: till(-24), till: till(6), washer: 'Shahrukh' }], created_at: '2026-09-20' },
    '+919811440004': { name: 'Sandeep', area: 'GH-14 Paschim Vihar', status: 'active', cars: [{ id: 'c0', make: 'Tata', name: 'Nexon', plate: 'DL 9C NX 1414', plan: 'pro', start: till(-5), till: till(25), washer: 'Shahrukh' }], created_at: '2026-10-15' },
    '+919811440005': { name: 'Priya M.', area: 'Sundar Vihar', status: 'new', cars: [{ id: 'c0', make: 'Hyundai', name: 'Venue', plate: 'DL 6C VV 2626', plan: 'std', start: till(1), till: till(30) }], created_at: T(200) },
  };
  S.plans = { basic: { kind: 'plan', name: 'Basic', price: 599 }, std: { kind: 'plan', name: 'Standard', price: 899 }, pro: { kind: 'plan', name: 'Pro', price: 1299 } };
  S.washes = {
    [d + '_DL4CAB2731']: { washer_id: 'chotte', reg: 'DL4CAB2731', car_label: 'Scorpio N', status: 'done', date: d },
    [d + '_DL3CBK0419']: { washer_id: 'chotte', reg: 'DL3CBK0419', car_label: 'Civic', status: 'done', date: d },
    [d + '_DL3CBK7711']: { washer_id: 'chotte', reg: 'DL3CBK7711', car_label: 'Seltos', status: 'scheduled', date: d },
    [d + '_DL8CMM4040']: { washer_id: 'shahrukh', reg: 'DL8CMM4040', car_label: 'Ertiga', status: 'done', date: d },
    [d + '_DL9CNX1414']: { washer_id: 'shahrukh', reg: 'DL9CNX1414', car_label: 'Nexon', status: 'skipped', date: d },
  };
  S.payorders = {};
  Object.entries(S.jobs).forEach(([id, j]) => { if (j.paid && j.price > 0) S.payorders['WDB' + id] = { kind: 'booking', phone: j.customer_id, status: j.status === 'cancelled' ? 'refunded' : 'paid', amount: j.price, paid_amount: j.price, total: j.total, created_at: j.created_at, paid_at: j.created_at, booking_id: id, gateway: 'razorpay', paid_gateway: 'razorpay', pay_via: 'UPI', lines: [{ name: j.service, q: 1 }] } });
  S.payorders.WDW1 = { kind: 'wallet_topup', phone: '+919811440002', name: 'Neha Kapoor', status: 'paid', amount: 500, paid_amount: 500, created_at: T(400), paid_at: T(399), gateway: 'razorpay', paid_gateway: 'razorpay', pay_via: 'UPI' };
  S.payorders.WDP1 = { kind: 'pass', phone: '+919811440004', name: 'Sandeep', status: 'paid', amount: 1499, paid_amount: 1499, created_at: T(1500), paid_at: T(1499), gateway: 'cashfree', paid_gateway: 'cashfree', pay_via: 'Card' };
  S.payorders.WDB9 = { kind: 'booking', phone: '+919811005500', status: 'failed', amount: 399, created_at: T(35), gateway: 'razorpay', lines: [{ name: 'Foam wash', q: 1 }] };
  ['jobs', 'washers', 'photos', 'locs', 'customers', 'payorders', 'plans', 'washes'].forEach(k => { S.loaded[k] = true });
  emit();
  // the washers move; the one on the way closes in on his customer
  demoT.push(setInterval(() => {
    const n = isoIST();
    Object.entries(S.locs).forEach(([id, l]) => { if (id === 'aman') return; l.lat = +(l.lat + (Math.random() - .5) * .0006).toFixed(5); l.lng = +(l.lng + (Math.random() - .5) * .0006).toFixed(5); l.updated_at = n });
    Object.values(S.jobs).forEach(j => { if (j.status === 'on_the_way' && isFinite(j.washer_lat) && isFinite(j.lat)) { j.washer_lat = +(j.washer_lat + (j.lat - j.washer_lat) * .12).toFixed(5); j.washer_lng = +(j.washer_lng + (j.lng - j.washer_lng) * .12).toFixed(5); j.washer_loc_at = n; const w = S.locs[j.washer_id]; if (w) { w.lat = j.washer_lat; w.lng = j.washer_lng } } });
    emit();
  }, 4000));
  // a new booking now and then, so the "new job" alert can be seen
  const NEW = [['Foam wash', 'Maruti Dzire', 'DL 2C DZ 1188', 'GH-6 Paschim Vihar', at(.006, -.002)], ['Interior vacuum', 'Tata Punch', 'DL 1C PN 7272', 'Meera Bagh', at(-.004, .007)], ['Pressure wash', 'Hyundai Verna', 'DL 4C VR 6464', 'Sundar Vihar', at(.01, .006)]];
  let k = 0;
  demoT.push(setInterval(() => { if (k >= NEW.length) return; const [svc, car, reg, area, p] = NEW[k++]; const id = 'B7Q3' + k + 'X'; J(id, { service: svc, car, reg, area, flat: 'H-' + (10 + k), ...p, phone: '+91981100' + (4000 + k), customer_id: '+91981100' + (4000 + k), created_at: isoIST() }); S.payorders['WDB' + id] = { kind: 'booking', phone: '+91981100' + (4000 + k), status: 'paid', amount: 399, paid_amount: 399, total: 399, created_at: isoIST(), paid_at: isoIST(), booking_id: id, gateway: 'razorpay', paid_gateway: 'razorpay', pay_via: 'UPI', lines: [{ name: svc, q: 1 }] }; emit() }, 40000));
}

window.OPS = { S, on, start, stop, demo, job: jobView, jobs, washer: washerView, washers, suggest, monthly, dues, payments, kpis, byRound: washerByRound,
  assign, unassign, stage, cancel, setEta, addWasher, updateWasher, setPhoto, setWasherStatus, setRound, customerStatus,
  photoFromFile, km, ago, fmtTime, rs, nice, today, isoIST, ms, travelMin, STAGE_LABEL, FRESH_MS };
})();
