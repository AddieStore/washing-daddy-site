/* WD HQ dashboard: the numbers and the switches you need every day, on one screen. Reads the same live data as the operations desk
   (OPS / OPSB from ../ops/) and writes the same documents the control panel writes (catalog/{id}: price and status). */
(() => {
  'use strict';
  const DEMO = /[?&]demo=1/.test(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const rs = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const go = id => window.HQ && window.HQ.go(id);
  let ready = false, catalog = {}, unsubCat = null, tipEl = null;

  /* ---------- small helpers ---------- */
  const day = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) };
  const dShort = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
  const delta = (cur, prev) => { if (!prev) return cur ? { t: 'new', up: true } : { t: '0%', up: true }; const p = Math.round((cur - prev) / prev * 100); return { t: (p >= 0 ? '+' : '') + p + '%', up: p >= 0 } };
  const chip = d => `<span class="dl ${d.up ? 'up' : 'dn'}">${d.t}</span>`;
  const jobsAll = () => { try { return OPS.jobs({ kind: 'all' }) } catch (e) { return [] } };
  const paid = () => { try { return OPS.payments().filter(p => p.status === 'paid') } catch (e) { return [] } };

  function numbers() {
    const t = OPS.today(), k = OPS.kpis(), J = jobsAll(), P = paid();
    const sumFrom = (a, b) => P.filter(p => { const d = String(p.at).slice(0, 10); return d >= a && d <= b }).reduce((s, p) => s + p.amount, 0);
    const wk = sumFrom(day(t, -6), t), wk0 = sumFrom(day(t, -13), day(t, -7));
    const created = d => J.filter(j => String(j.created).slice(0, 10) === d).length;
    const days = [...Array(7)].map((_, i) => day(t, i - 6));
    const bars = days.map(d => ({ d, made: created(d), done: J.filter(j => j.stage === 'done' && String(j.raw.finished_at || j.date).slice(0, 10) === d).length }));
    const ws = OPS.washers().filter(w => w.status === 'approved');
    const washes = Object.values(OPS.S.washes || {});
    const cnt = s => washes.filter(w => w.status === s).length;
    return { t, k, wk, wk0, today: created(t), yday: created(day(t, -1)), bars, ws, online: ws.filter(w => w.loc && w.loc.fresh).length,
      ring: { done: cnt('done'), working: cnt('washing') + cnt('arrived') + cnt('on_the_way'), wait: cnt('scheduled'), skipped: cnt('skipped'), total: washes.length } };
  }

  /* ---------- charts ---------- */
  function rings(r) {
    const total = Math.max(1, r.total), R = [74, 58, 42, 26], vals = [r.done, r.working, r.wait, r.skipped], col = ['#5409DA', '#3E6FA8', '#C9C4DA', '#E8384F'];
    const arc = (rad, f, c) => { const L = 2 * Math.PI * rad; return `<circle cx="90" cy="90" r="${rad}" fill="none" stroke="#EEECF4" stroke-width="12"/><circle cx="90" cy="90" r="${rad}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${Math.max(0.001, L * f * 0.75)} ${L}" transform="rotate(135 90 90)"/>` };
    return `<svg viewBox="0 0 180 180" class="ringsvg" role="img" aria-label="Cars today: ${r.done} done of ${r.total}">${R.map((rad, i) => arc(rad, Math.min(1, vals[i] / total), col[i])).join('')}</svg>`;
  }
  function bars(b) {
    const mx = Math.max(4, ...b.map(x => Math.max(x.made, x.done))), W = 420, H = 190, bw = 16, gap = (W - 40) / b.length, y = v => H - 28 - (v / mx) * (H - 52);
    const ticks = [0, 0.5, 1].map(f => Math.round(mx * f));
    return `<svg viewBox="0 0 ${W} ${H}" class="barsvg">${ticks.map(v => `<g><line x1="30" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#F0EEF6"/><text x="0" y="${y(v) + 4}" font-size="10" fill="#9A98A8">${v}</text></g>`).join('')}` +
      b.map((x, i) => { const cx = 40 + i * gap + gap / 2; return `<g class="bar" data-i="${i}"><rect x="${cx - bw - 2}" y="${y(x.made)}" width="${bw}" height="${H - 28 - y(x.made)}" rx="7" fill="#D9D6E4"/><rect x="${cx + 2}" y="${y(x.done)}" width="${bw}" height="${H - 28 - y(x.done)}" rx="7" fill="#5409DA"/><rect x="${cx - gap / 2}" y="0" width="${gap}" height="${H}" fill="transparent"/><text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7A7A80">${dShort(x.d)}</text></g>` }).join('') + `</svg>`;
  }
  function bubbles(list) {
    if (!list.length) return `<div class="empty">No customers with an area yet.</div>`;
    const top = list.slice(0, 5), mx = top[0][1], pos = [[0.62, 0.46], [0.27, 0.62], [0.4, 0.2], [0.82, 0.8], [0.14, 0.24]], cols = ['#5409DA', '#7D4DF0', '#9B7DF5', '#B8A3F8', '#CFC2FA'];
    return `<div class="bub">${top.map(([n, c], i) => { const r = 24 + 30 * Math.sqrt(c / mx); return `<div class="b" title="${esc(n)}: ${c}" style="left:${pos[i][0] * 100}%;top:${pos[i][1] * 100}%;width:${r * 2}px;height:${r * 2}px;margin:${-r}px 0 0 ${-r}px;background:${cols[i]}"><b>${c}</b></div>` }).join('')}</div>`;
  }
  function areas() {
    const m = {};
    try { OPS.monthly().forEach(c => { const a = (c.area || '').split(',')[0].trim() || 'Other'; m[a] = (m[a] || 0) + 1 }) } catch (e) {}
    jobsAll().forEach(j => { const a = (j.raw.area || '').split(',')[0].trim(); if (a) m[a] = (m[a] || 0) + 1 });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  /* ---------- the page ---------- */
  function attention(n) {
    const rows = [];
    const un = jobsAll().filter(j => j.stage === 'unassigned');
    un.slice(0, 3).forEach(j => rows.push(['bookings', 'bad', `${j.service || 'Booking'} needs a washer`, `${j.customer.name || ''} · ${OPS.ago(j.created)}`]));
    const od = (() => { try { return OPS.dues(7).filter(x => x.overdue) } catch (e) { return [] } })();
    if (od.length) rows.push(['monthly', 'bad', `${od.length} monthly payment${od.length > 1 ? 's' : ''} overdue`, od.slice(0, 2).map(x => x.name).join(', ')]);
    const off = n.ws.filter(w => !(w.loc && w.loc.fresh));
    if (off.length) rows.push(['map', 'warn', `${off.length} washer${off.length > 1 ? 's are' : ' is'} not sharing location`, off.slice(0, 3).map(w => w.name).join(', ')]);
    try { const a = OPSB.attendance(); if (a.absent && a.absent.length) rows.push(['rounds', 'warn', `${a.absent.length} washer${a.absent.length > 1 ? 's' : ''} not checked in`, a.absent.slice(0, 3).map(x => x.name).join(', ')]) } catch (e) {}
    if (!rows.length) return `<div class="empty ok">Nothing needs you right now.</div>`;
    return rows.map(r => `<button class="att ${r[1]}" data-go="${r[0]}" type="button"><i></i><span><b>${esc(r[2])}</b><small>${esc(r[3])}</small></span><em>›</em></button>`).join('');
  }
  function washers(n) {
    return n.ws.slice(0, 6).map(w => { const live = w.loc && w.loc.fresh; return `<button class="wr" data-go="map" type="button"><span class="av">${esc((w.name || '?')[0])}<i class="${live ? 'on' : ''}"></i></span><span><b>${esc(w.name)}</b><small>${esc(w.activity && w.activity.text || (live ? 'Online' : 'Not sharing location'))}</small></span><em>${live ? 'Live' : 'Off'}</em></button>` }).join('') || `<div class="empty">No approved washers yet.</div>`;
  }
  function board() {
    const items = Object.entries(catalog).map(([id, v]) => ({ id, ...v })).filter(x => (x.kind || 'service') === 'service').sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8);
    if (!items.length) return `<div class="empty">The catalog is empty. Open Services &amp; prices and import the app defaults.</div>`;
    return items.map(x => `<div class="sv ${x.status || 'live'}"><span class="nm"><b>${esc(x.name)}</b><small>${esc(x.cat || '')}</small></span>
      <span class="pr"><em>₹</em><input inputmode="numeric" value="${esc(x.price)}" data-price="${esc(x.id)}" aria-label="Price of ${esc(x.name)}"></span>
      <select data-status="${esc(x.id)}" aria-label="Status of ${esc(x.name)}"><option value="live"${(x.status || 'live') === 'live' ? ' selected' : ''}>Live</option><option value="paused"${x.status === 'paused' ? ' selected' : ''}>Paused</option><option value="hidden"${x.status === 'hidden' ? ' selected' : ''}>Hidden</option></select></div>`).join('');
  }
  function render() {
    const root = $('#dashBody'); if (!root || !ready) return;
    let n; try { n = numbers() } catch (e) { console.warn(e); return }
    const k = n.k, dw = delta(n.wk, n.wk0), db = delta(n.today, n.yday), ring = n.ring, ar = areas(), tot = ar.reduce((s, x) => s + x[1], 0);
    const kpi = (cls, ic, label, val, sub, ch, to) => `<button class="kpi ${cls}" data-go="${to}" type="button"><span class="ki">${ic}</span>${ch || ''}<small>${label}</small><b>${val}</b><span class="ks">${sub}</span></button>`;
    root.innerHTML = `
    <div class="g">
      <div class="g-k">
        ${kpi('hi', '₹', 'Paid this week', rs(n.wk), 'vs last week', chip(dw), 'payments')}
        ${kpi('', '≡', 'Bookings today', k.bookingsToday, 'vs yesterday', chip(db), 'bookings')}
        ${kpi('', '●', 'Washers sharing location', `${n.online}<i> / ${n.ws.length}</i>`, n.ws.length - n.online ? `${n.ws.length - n.online} not sharing` : 'all live', n.online === n.ws.length ? '<span class="dl up">all on</span>' : '<span class="dl dn">check</span>', 'map')}
        ${kpi('', '☆', 'Monthly customers', k.monthlyActive, k.overdue ? `${k.overdue} overdue` : `${k.duesSoon} renewals soon`, k.overdue ? '<span class="dl dn">overdue</span>' : '', 'monthly')}
      </div>
      <section class="pn rings"><div class="ph"><div><h3>Today's round</h3><p>Cars across all washers</p></div><button class="lnk" data-go="rounds" type="button">Open</button></div>
        <div class="rw">${rings(ring)}<div class="rc"><b>${ring.done}</b><small>of ${ring.total} done</small></div></div>
        <ul class="lg"><li><i style="background:#5409DA"></i>Done<b>${ring.done}</b></li><li><i style="background:#3E6FA8"></i>On the way / washing<b>${ring.working}</b></li><li><i style="background:#C9C4DA"></i>Waiting<b>${ring.wait}</b></li><li><i style="background:#E8384F"></i>Skipped<b>${ring.skipped}</b></li></ul></section>
      <section class="pn bars"><div class="ph"><div><h3>Bookings this week</h3><p>Made each day, and washes finished</p></div><div class="key"><span><i style="background:#D9D6E4"></i>Made</span><span><i style="background:#5409DA"></i>Finished</span></div></div>
        <div class="bw" id="barBox">${bars(n.bars)}<div class="tip" id="tip" hidden></div></div></section>
      <section class="pn need"><div class="ph"><div><h3>Needs you</h3><p>Tap to jump to it</p></div></div>${attention(n)}</section>
      <section class="pn grow"><div class="ph"><div><h3>Where customers are</h3><p>Monthly customers and bookings by area</p></div></div>
        ${bubbles(ar)}<ul class="ar">${ar.slice(0, 4).map(([a, c]) => `<li><span>${esc(a)}</span><em>${c}</em><s><u style="width:${Math.round(c / Math.max(1, ar[0][1]) * 100)}%"></u></s></li>`).join('')}</ul><p class="mut">${tot} in total. Service areas are set in Fees, slots &amp; areas.</p></section>
      <section class="pn sw"><div class="ph"><div><h3>Prices and switches</h3><p>Change a price or pause a service. It updates the apps and the website.</p></div><button class="lnk" data-go="catalog" type="button">All services</button></div><div class="svs" id="svs">${board()}</div></section>
      <section class="pn wsh"><div class="ph"><div><h3>Washers now</h3><p>Live from their phones</p></div><button class="lnk" data-go="map" type="button">Open map</button></div>${washers(n)}</section>
    </div>`;
  }

  /* tooltip over the bars (like the reference) */
  document.addEventListener('mousemove', e => {
    const g = e.target.closest && e.target.closest('.bar'), tip = $('#tip'); if (!tip) return;
    if (!g) { tip.hidden = true; return }
    const n = numbersCache; if (!n) return; const b = n.bars[+g.dataset.i], box = $('#barBox').getBoundingClientRect();
    tip.innerHTML = `<b>${dShort(b.d)} ${b.d.slice(8)}</b><span><i style="background:#D9D6E4"></i>${b.made} made</span><span><i style="background:#8F6BFF"></i>${b.done} finished</span>`;
    tip.hidden = false; tip.style.left = Math.min(box.width - 150, Math.max(0, e.clientX - box.left + 12)) + 'px'; tip.style.top = Math.max(0, e.clientY - box.top - 70) + 'px';
  });
  let numbersCache = null;
  const _render = render; render = function () { try { numbersCache = numbers() } catch (e) { numbersCache = null } _render() };

  /* editing prices and status writes the catalog document, the same one the control panel edits */
  async function save(id, patch) {
    if (DEMO || !OPS.db) { catalog[id] = { ...catalog[id], ...patch }; return render() }
    try { await OPS.db().doc('catalog/' + id).update({ ...patch, updated_at: new Date().toISOString() }); toast('Saved') } catch (e) { console.warn(e); toast("Couldn't save. Are you signed in as an owner?") }
  }
  document.addEventListener('change', e => {
    const p = e.target.closest && e.target.closest('[data-price]'), s = e.target.closest && e.target.closest('[data-status]');
    if (p) { const v = Math.max(0, Math.round(Number(p.value))); if (isFinite(v)) save(p.dataset.price, { price: v }) }
    if (s) save(s.dataset.status, { status: s.value });
  });
  function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) } t.textContent = m; t.className = 'show'; clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = '' }, 2200) }
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('#dash [data-go]'); if (t) go(t.dataset.go) });

  /* ---------- data + sign-in ---------- */
  function start() {
    ready = true; OPS.on(render); try { DEMO ? OPSB.demo() : OPSB.start(); OPSB.on(render) } catch (e) {}
    if (DEMO) { catalog = JSON.parse(JSON.stringify((window.WD_SEED && window.WD_SEED.catalog) || {})) } else {
      try { unsubCat && unsubCat(); unsubCat = OPS.db().collection('catalog').onSnapshot(sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data() }); catalog = o; render() }, e => console.warn('catalog', e)) } catch (e) { console.warn(e) }
    }
    $('#gateD').hidden = true; render(); if (window.HQFuncs) HQFuncs.start();
  }
  function gate(msg) {
    $('#dashBody').innerHTML = ''; const g = $('#gateD'); g.hidden = false;
    g.innerHTML = `<div class="gb"><h3>Owner sign-in</h3><p>${esc(msg || 'Sign in once to see today\'s numbers. We text a 6-digit code.')}</p><div class="phn"><span>+91</span><input id="gPh" inputmode="numeric" maxlength="11" placeholder="98765 43210" aria-label="Mobile number"></div><div class="er" id="gErr"></div><button class="pb" id="gGo" type="button">Send code</button></div>`;
    $('#gGo').onclick = async () => { const d = $('#gPh').value.replace(/\D/g, '').slice(-10); if (!/^[6-9]\d{9}$/.test(d)) { $('#gErr').textContent = 'Enter a 10-digit mobile number.'; return } $('#gGo').disabled = true; try { await WDAuth.send(d); code(d) } catch (e) { $('#gGo').disabled = false; $('#gErr').textContent = (e && e.en) || "Couldn't send the code." } };
  }
  function code(d) {
    $('#gateD').innerHTML = `<div class="gb"><h3>Enter the code</h3><p>Sent to +91 ${d}.</p><input class="otp" id="gOtp" inputmode="numeric" maxlength="6" placeholder="------" aria-label="6-digit code"><div class="er" id="gErr"></div><button class="pb" id="gOk" type="button">Sign in</button></div>`;
    const o = $('#gOtp'); o.focus(); o.oninput = () => { o.value = o.value.replace(/\D/g, '').slice(0, 6); if (o.value.length === 6) $('#gOk').click() };
    $('#gOk').onclick = async () => { try { await WDAuth.confirm(o.value); signed(WDAuth.user()) } catch (e) { $('#gErr').textContent = (e && e.en) || "That code didn't work."; o.value = '' } };
  }
  async function signed(u) {
    if (!u) return gate();
    try { await OPS.start() } catch (e) { try { WDAuth.signOut() } catch (x) {} return gate(e && e.owner === false ? 'That number is not an owner number.' : "Couldn't load. Check the internet.") }
    start();
  }
  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s) }) }
  async function boot() {
    if (DEMO) { try { await load('../app/seed.js') } catch (e) {} OPS.demo(); return start() }
    try { await load('../wd-sync.js') } catch (e) { return gate("Couldn't load. Check the internet.") }
    WDAuth.ready().then(signed);
  }
  window.HQDash = { boot, render };
})();
