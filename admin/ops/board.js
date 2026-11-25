/* WD Operations: rounds data (window.OPSB). Reads the washer-produced docs of the v2 contract
 * (/mnt/project-files/washer-functional-2026-11-23/CONTRACT.md): washes, attendance, earnings, earnings_payouts, ratings, complaints.
 * The only write is markPaid -> earnings_payouts/{YYYY-MM}_{+91phone} = {total, paid_at, ref}.
 * OPSB.S raw docs; OPSB.setDay(day), setMonth('YYYY-MM'); OPSB.on(fn); views: abandoned(), conditionMix(), issueCounts(), delays(), damage(), board(), attendance(), skips(), interiors(), ledger(), feedback(). */
(() => {
'use strict';
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d };
const S = { washes: {}, att: {}, earn: {}, pay: {}, rat: {}, comp: {}, loaded: {} };
const B = { S, day: '', month: '' }; let db = null, unsubs = {}, subs = new Set(), tick = null;
const emit = () => { if (tick) return; tick = setTimeout(() => { tick = null; subs.forEach(f => { try { f() } catch (e) { console.error(e) } }) }, 30) };
B.on = f => { subs.add(f); return () => subs.delete(f) };
const docs = sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data() }); return o };
const listen = (key, q, slot) => { if (unsubs[key]) unsubs[key](); S.loaded[slot || key] = false; unsubs[key] = q.onSnapshot(sn => { S[slot || key] = docs(sn); S.loaded[slot || key] = true; emit() }, e => { console.warn('opsb', key, e); S.loaded[slot || key] = 'err'; emit() }) };
const add = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) };
B.add = add;

function watchWashes() {   // from the earlier of the picked day and 14 days back (carry-overs and skips look back)
  const from = [B.day, add(OPS.today(), -14)].sort()[0];
  listen('washes', db.collection('washes').where('date', '>=', from));
}
B.start = day => {
  db = OPS.db(); if (!db) return; B.stop();
  B.day = day || OPS.today(); B.month = B.day.slice(0, 7);
  watchWashes();
  listen('att', db.collection('attendance').where('date', '==', B.day));
  listen('earn', db.collection('earnings').where('date', '>=', B.month + '-01'));
  listen('pay', db.collection('earnings_payouts'));
  listen('rat', db.collection('ratings').where('date', '>=', add(OPS.today(), -45)));
  listen('comp', db.collection('complaints'));
};
B.stop = () => { Object.values(unsubs).forEach(u => { try { u() } catch (e) {} }); unsubs = {} };
B.setDay = day => { if (!db) { B.day = day; return emit() } B.day = day; watchWashes(); listen('att', db.collection('attendance').where('date', '==', day)); if (day.slice(0, 7) !== B.month) B.setMonth(day.slice(0, 7)); emit() };
B.setMonth = m => { B.month = m; if (db) listen('earn', db.collection('earnings').where('date', '>=', m + '-01')); emit() };

/* ---------- views ---------- */
const washerOf = round => { const ph = OPS.byRound(round); return { phone: ph || '', name: (ph && OPS.S.washers[ph] && OPS.S.washers[ph].name) || round || 'Unknown' } };
const nameOf = ph => (OPS.S.washers[ph] && OPS.S.washers[ph].name) || ph;
const isLate = w => !!w.overdue_at && w.status !== 'done' && w.status !== 'skipped';
const dayWashes = day => Object.entries(S.washes).filter(([, w]) => w && w.date === day).map(([id, w]) => ({ id, ...w }));
const ORDER = ['scheduled', 'on_the_way', 'arrived', 'washing', 'done', 'skipped'];
B.ORDER = ORDER; B.isLate = isLate;
B.board = () => {
  const by = {};
  dayWashes(B.day).forEach(w => {
    const k = w.washer_id || '?'; const g = by[k] = by[k] || { round: k, ...washerOf(k), counts: {}, late: 0, total: 0, cars: [] };
    const st = ORDER.includes(w.status) ? w.status : 'scheduled'; g.counts[st] = (g.counts[st] || 0) + 1; g.total++; if (isLate(w)) g.late++; g.cars.push(w);
  });
  Object.values(by).forEach(g => g.cars.sort((a, b) => num(a.seq, 99) - num(b.seq, 99)));
  return Object.values(by).sort((a, b) => b.late - a.late || a.name.localeCompare(b.name));
};
B.attendance = () => {
  const rows = Object.entries(S.att).map(([id, a]) => ({ id, ...a, name: a.name || nameOf(a.phone) }));
  const seen = new Set(rows.map(r => r.phone));
  // washers who have a round today but no attendance doc: absent so far
  const absent = B.day > OPS.today() ? [] : B.board().filter(g => g.phone && !seen.has(g.phone)).map(g => ({ phone: g.phone, name: g.name }));
  return { rows: rows.sort((a, b) => String(a.check_in_at || '').localeCompare(String(b.check_in_at || ''))), absent };
};
B.skips = () => dayWashes(B.day).filter(w => w.status === 'skipped').map(w => ({ ...w, washer: washerOf(w.washer_id).name }));
B.interiors = () => {   // Sunday interiors not done yet: carried to another day, or a carried doc still open
  const out = [];
  Object.entries(S.washes).forEach(([id, w]) => {
    if (!w) return;
    if (w.interior_carried_to) { const c = S.washes[w.interior_carried_to + '_' + w.reg]; out.push({ id, reg: w.reg, car: w.car_label, from: w.date, to: w.interior_carried_to, washer: washerOf(w.washer_id).name, done: !!(c && (c.tasks || []).some(t => t && t.key === 'interior' && t.done)) || !!(c && c.status === 'done' && !(c.tasks || []).length) }) }
    else if (w.carried_task === 'interior') { const d = (w.tasks || []).find(t => t && t.key === 'interior'); if (!out.some(o => o.to === w.date && o.reg === w.reg)) out.push({ id, reg: w.reg, car: w.car_label, from: w.carried_from, to: w.date, washer: washerOf(w.washer_id).name, done: !!(d && d.done) }) }
  });
  return out.sort((a, b) => Number(a.done) - Number(b.done) || String(b.to).localeCompare(String(a.to)));
};
/* manager data (contract 2026-11-24): everything below reads the washes already loaded for the picked day */
B.ISSUES = { no_water: 'No water', no_parking: 'Parking problem', key_problem: 'Key / gate problem', car_locked: 'Car locked', customer_rude: 'Customer behaviour', rain: 'Rain', supplies_low: 'Supplies low', car_damage: 'Mark already on car' };
B.COND = { light: 'Light', normal: 'Normal', heavy: 'Heavy' };
const carOf = w => ({ id: w.id, car: w.car_label || w.reg, reg: w.reg, washer: washerOf(w.washer_id).name });
B.abandoned = () => dayWashes(B.day).filter(w => w.abandoned).map(w => ({ ...carOf(w), reason: w.abandoned.reason || '', minutes: num(w.abandoned.minutes), tasks: Array.isArray(w.abandoned.tasks_done) ? w.abandoned.tasks_done : [], note: w.abandoned.note || '' }));
B.conditionMix = () => {
  const m = {}; dayWashes(B.day).forEach(w => { if (!B.COND[w.condition]) return; const g = m[w.washer_id] = m[w.washer_id] || { washer: washerOf(w.washer_id).name, light: 0, normal: 0, heavy: 0, total: 0 }; g[w.condition]++; g.total++ });
  return Object.values(m).sort((a, b) => b.heavy - a.heavy || a.washer.localeCompare(b.washer));
};
B.issueCounts = () => {
  const m = {}; dayWashes(B.day).forEach(w => (Array.isArray(w.issues) ? w.issues : []).forEach(k => { (m[k] = m[k] || { key: k, label: B.ISSUES[k] || k, cars: [] }).cars.push(carOf(w)) }));
  return Object.values(m).sort((a, b) => b.cars.length - a.cars.length);
};
B.delays = () => dayWashes(B.day).filter(w => w.delay_reason).map(w => ({ ...carOf(w), reason: w.delay_reason }));
B.damage = () => dayWashes(B.day).filter(w => w.damage_note).map(w => ({ ...carOf(w), note: w.damage_note, photos: B.photos(w).filter(p => p.kind === 'issue') }));
B.photos = w => (Array.isArray(w.photos) ? w.photos : []).filter(p => p && (p.url || p.asset_id)).map(p => ({ ...p, src: p.url || ('/_blob/' + p.asset_id) }));
B.ledger = () => {
  const m = {};
  Object.values(S.earn).forEach(e => {
    if (!e || !e.phone || String(e.date).slice(0, 7) !== B.month) return;
    const r = m[e.phone] = m[e.phone] || { phone: e.phone, name: nameOf(e.phone), days: 0, washes: 0, extras: 0, bonus: 0, total: 0 };
    r.days++; r.washes += (e.washes || []).reduce((s, x) => s + num(x.amount), 0); r.extras += (e.extras || []).reduce((s, x) => s + num(x.amount), 0);
    r.bonus += (e.bonus || []).reduce((s, x) => s + num(x.amount), 0); r.total += num(e.total, 0);
  });
  return Object.values(m).map(r => ({ ...r, payout: S.pay[B.month + '_' + r.phone] || null })).sort((a, b) => b.total - a.total);
};
B.markPaid = async (phone, total, ref) => {
  if (!db) throw new Error('Not connected.');
  const ph = '+91' + String(phone).replace(/\D/g, '').slice(-10);
  return db.doc('earnings_payouts/' + B.month + '_' + ph).set({ total: Math.round(total), paid_at: OPS.isoIST(), ref: String(ref || '').slice(0, 80) });
};
B.feedback = () => {
  const who = {}; Object.entries(S.washes).forEach(([id, w]) => { if (w && w.washer_id) who[id] = w.washer_id });
  const low = Object.entries(S.rat).filter(([, r]) => r && num(r.stars) > 0 && num(r.stars) <= 2).map(([id, r]) => ({ kind: 'rating', id, at: r.at || r.date, stars: r.stars, tag: r.tag || '', reg: r.reg, date: r.date, washer: who[id] ? washerOf(who[id]).name : '' }));
  const cmp = Object.entries(S.comp).filter(([, c]) => c && ['open', 'seen'].includes(c.status || 'open')).map(([id, c]) => ({ kind: 'complaint', id, at: c.created_at || c.at || '', text: c.text || c.message || c.note || '', type: c.kind || '', reg: c.reg, date: c.date, status: c.status || 'open', washer: c.washer_id ? washerOf(c.washer_id).name : '' }));
  return [...low, ...cmp].sort((a, b) => String(b.at).localeCompare(String(a.at)));
};
window.OPSB = B;
})();
