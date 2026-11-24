/* WD Operations: screens. Talks to window.OPS (core.js) only. Plain JS, no build step.
   Lists render into containers and only touch the DOM when their HTML changed, so scroll position, open sheets and
   typed text survive the 4 s demo ticks and live snapshots. */
(() => {
'use strict';
const DEMO = /[?&]demo=1/.test(location.search);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setHTML = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html } };
const R = (name, root = document) => $(`[data-r="${name}"]`, root);
const dig = p => String(p || '').replace(/\D/g, '').slice(-10);
const tel = p => dig(p) ? 'tel:+91' + dig(p) : '';
const wa = (p, text) => dig(p) ? 'https://wa.me/91' + dig(p) + (text ? '?text=' + encodeURIComponent(text) : '') : '';
const nice = p => OPS.nice(p);
const first = s => String(s || '').trim().split(/\s+/)[0] || '';
const ini = s => (String(s || '?').trim()[0] || '?').toUpperCase();
const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d };
const tryLS = (f, d) => { try { return f() } catch (e) { return d } };

/* ---------------- icons ---------------- */
const IC = {
  live: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  wash: '<path d="M3 17h18v-4l-2-5H5l-2 5zM3 13h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  map: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  vol: '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  drop: '<path d="M12 2.7s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
const ic = (n, s = 20, w = 2) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---------------- state + prefs ---------------- */
const UI = { sec: 'live', sheet: null, bk: { tab: 'instant', chip: 'open', q: '' }, mo: { chip: 'active' }, pay: { chip: 'paid' }, rd: { tab: 'board' }, map: null, sheetMap: null, etaEdited: false, seeded: false, seen: new Set() };
const pref = (k, d) => tryLS(() => { const v = localStorage.getItem('wdops_' + k); return v === null ? d : v === '1' }, d);
const setPref = (k, v) => tryLS(() => localStorage.setItem('wdops_' + k, v ? '1' : '0'));
UI.sound = pref('sound', true);

/* ---------------- formatting ---------------- */
const dayAdd = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) };
const dShort = d => { const x = new Date(d + 'T00:00:00Z'); return isNaN(x) ? '' : x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) };
const dMed = d => { const x = new Date(d + 'T00:00:00Z'); return isNaN(x) ? d : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) };
const dayLabel = d => { const t = OPS.today(); return d === t ? 'Today' : d === dayAdd(t, 1) ? 'Tomorrow' : d === dayAdd(t, -1) ? 'Yesterday' : dShort(d) };
const whenTs = ts => { if (!ts) return ''; const day = String(ts).slice(0, 10), t = OPS.fmtTime(ts); return day === OPS.today() || !day ? t : dShort(day) + ', ' + t };
const waitMin = j => Math.max(0, Math.round((Date.now() - OPS.ms(j.created)) / 60000));
const etaMinLeft = j => { const t = OPS.ms(j.eta); return isFinite(t) ? Math.round((t - Date.now()) / 60000) : NaN };
const etaText = j => { const m = etaMinLeft(j); return !isFinite(m) ? '' : m > 0 ? `ETA ${m} min` : 'Arriving now' };
const STAGE_CLS = { unassigned: 'red', assigned: 'blue', on_the_way: 'violet', washing: 'violet', done: 'green', cancelled: '' };
const stagePill = j => `<span class="pill ${STAGE_CLS[j.stage]}">${esc(j.stageLabel)}</span>`;
const payPill = j => j.stage === 'cancelled' ? '' : j.paid ? '<span class="pill green">Paid</span>' : '<span class="pill amber">Pay on arrival</span>';
const avatar = (photo, name, cls = '') => photo ? `<img class="avatar ${cls}" src="${esc(photo)}" alt="">` : `<span class="avatar ${cls}" aria-hidden="true">${esc(ini(name))}</span>`;
const empty = m => `<div class="empty">${esc(m)}</div>`;
const loading = () => !OPS.S.loaded.jobs;
const KIND_COL = { free: '#16a34a', job: '#5409DA', round: '#2563eb', offline: '#9ca3af', blocked: '#9ca3af', pending: '#9ca3af' };
const KIND_LBL = { free: 'Free', job: 'On a job', round: 'Monthly round', offline: 'Offline' };

/* ---------------- toasts, dialog ---------------- */
function toast(msg, o = {}) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast ' + (o.cls || '');
  el.innerHTML = `<span>${esc(msg)}</span>${o.act ? `<button type="button" data-act="${esc(o.act)}" data-id="${esc(o.id || '')}">${esc(o.label || 'Open')}</button>` : ''}<button class="tx" type="button" data-act="toastx" aria-label="Dismiss">${ic('x', 16)}</button>`;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), o.ms || (o.cls === 'err' ? 8000 : 5000));
}
async function run(p, ok) { try { const v = await p; if (ok) toast(typeof ok === 'function' ? ok(v) : ok); return true } catch (e) { console.warn(e); toast((e && e.message) || 'Something went wrong. Try again.', { cls: 'err' }); return false } }

let dlgCancel = null;
function ask({ title, body = '', fields = [], ok = 'OK', danger = false, cancel = 'Back' }) {
  return new Promise(res => {
    const d = $('#dlg'), prev = document.activeElement;
    d.innerHTML = `<form class="dlg-box" role="alertdialog" aria-modal="true" aria-labelledby="dT"><h3 id="dT">${esc(title)}</h3><div class="dlg-b">${body}</div>
      ${fields.map(f => `<label class="lbl" for="df_${f.id}">${esc(f.label)}</label><input class="field" id="df_${f.id}" name="${f.id}" type="${f.type || 'text'}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.type === 'number' ? 'inputmode="numeric"' : ''} value="${esc(f.value ?? '')}" placeholder="${esc(f.ph || '')}" ${f.required ? 'required' : ''}>`).join('')}
      <div class="err" id="dErr"></div><div class="dlg-a"><button type="button" class="btn ghost" id="dNo">${esc(cancel)}</button><button type="submit" class="btn ${danger ? 'danger' : 'go'}">${esc(ok)}</button></div></form>`;
    d.hidden = false;
    const done = v => { d.hidden = true; d.innerHTML = ''; dlgCancel = null; try { prev && prev.focus && prev.focus() } catch (e) {} res(v) };
    dlgCancel = () => done(null);
    $('#dNo').onclick = () => done(null);
    const form = d.firstElementChild;
    form.onsubmit = e => {
      e.preventDefault(); const out = {};
      for (const f of fields) { const v = form.elements[f.id].value.trim(); if (f.required && !v) { $('#dErr').textContent = f.label + ' is needed.'; form.elements[f.id].focus(); return } out[f.id] = v }
      done(out);
    };
    (form.querySelector('input') || $('#dNo')).focus();
  });
}

/* ---------------- maps (Leaflet, with a drawn fallback) ---------------- */
function markerInner(p) {
  const col = p.type === 'w' ? KIND_COL[p.kind] || '#9ca3af' : ({ late: '#dc2626', unassigned: '#dc2626', assigned: '#d97706', on_the_way: '#5409DA', washing: '#5409DA' })[p.kind] || '#d97706';
  const inner = p.type === 'w' && p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(p.type === 'w' ? ini(p.name) : (p.kind === 'late' || p.kind === 'unassigned' ? '!' : '•'));
  return { col, inner };
}
const markerHTML = p => { const { col, inner } = markerInner(p); return `<div class="mk ${p.type === 'w' ? 'w' : 'j'}${p.kind === 'late' ? ' pulse' : ''}" style="--mc:${col}"><div class="mk-c">${inner}</div><span class="mk-l">${esc(p.label)}</span></div>` };

function mkMap(el, onPick) {
  let lm = null, started = false;
  const api = { fit() {}, set() {}, destroy() { if (el._ro) el._ro.disconnect() } };
  if (window.L && L.map) {
    try {
      lm = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView([28.669, 77.096], 14);
      const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
      // CARTO tiles first; if they fail to load (blocked or down), switch once to the OpenStreetMap tile server
      const carto = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`, { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(lm);
      let fails = 0, loaded = 0, swapped = false;
      carto.on('tileload', () => { loaded++ });
      carto.on('tileerror', () => { if (swapped || loaded > 0 || ++fails < 3) return; swapped = true; lm.removeLayer(carto);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(lm) });
    } catch (e) { console.warn('leaflet', e); lm = null; el.innerHTML = ''; el.className = el.className.replace(/leaflet\S*/g, '') }
  }
  if (lm) {
    const mks = {}, lines = L.layerGroup().addTo(lm); let bounds = [];
    api.set = (pts, lns) => {
      const keep = new Set(pts.map(p => p.id));
      Object.keys(mks).forEach(id => { if (!keep.has(id)) { mks[id].mk.remove(); delete mks[id] } });
      pts.forEach(p => {
        const h = markerHTML(p), o = mks[p.id];
        if (!o) {
          const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ html: h, className: 'mkw', iconSize: [44, 44], iconAnchor: [22, 22] }), title: p.title, alt: p.title, keyboard: true }).addTo(lm);
          mk.on('click', () => onPick && onPick(mks[p.id].p)); mks[p.id] = { mk, h, p };
        } else {
          o.p = p; o.mk.setLatLng([p.lat, p.lng]);
          if (o.h !== h) { o.h = h; o.mk.setIcon(L.divIcon({ html: h, className: 'mkw', iconSize: [44, 44], iconAnchor: [22, 22] })) }
        }
      });
      lines.clearLayers();
      lns.forEach(l => L.polyline([[l.a.lat, l.a.lng], [l.b.lat, l.b.lng]], { color: '#5409DA', weight: 3, dashArray: '7 7' }).bindTooltip(l.label || '', { permanent: !!l.label, direction: 'center', className: 'ln-tip' }).addTo(lines));
      bounds = pts.map(p => [p.lat, p.lng]);
      if (!started && bounds.length) { started = true; api.fit() }
    };
    api.fit = () => { if (!bounds.length) return; if (bounds.length === 1) lm.setView(bounds[0], 16); else lm.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 }) };
    const inv = () => { try { lm.invalidateSize() } catch (e) {} }; setTimeout(inv, 60); setTimeout(inv, 400);
    api.destroy = () => { try { lm.remove() } catch (e) {} };
    return api;
  }
  // fallback: positions drawn on a light street-grid background
  let pts = [], lns = [];
  const draw = () => {
    const W = el.clientWidth || 600, H = el.clientHeight || 360, pad = 64;
    const all = pts.map(p => [p.lat, p.lng]); lns.forEach(l => all.push([l.a.lat, l.a.lng], [l.b.lat, l.b.lng]));
    if (!all.length) { setHTML(el, `<div class="mapnote" style="left:50%;top:50%;bottom:auto;transform:translate(-50%,-50%)">No locations yet</div>`); return }
    const la = all.map(a => a[0]), lo = all.map(a => a[1]); let minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
    const k = Math.cos(((minLa + maxLa) / 2) * Math.PI / 180);
    let dx = Math.max((maxLo - minLo) * k, .004), dy = Math.max(maxLa - minLa, .004);
    const s = Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy), cx = (minLo + maxLo) / 2, cy = (minLa + maxLa) / 2;
    const X = lng => W / 2 + (lng - cx) * k * s, Y = lat => H / 2 - (lat - cy) * s;
    let g = '';
    for (let x = 0; x < W; x += 24) g += `<path d="M${x} 0V${H}" stroke="var(--mapline)" stroke-width="1"/>`;
    for (let y = 0; y < H; y += 24) g += `<path d="M0 ${y}H${W}" stroke="var(--mapline)" stroke-width="1"/>`;
    for (let x = 0; x < W; x += 96) g += `<path d="M${x} 0V${H}" stroke="var(--mapline2)" stroke-width="2.5"/>`;
    for (let y = 0; y < H; y += 96) g += `<path d="M0 ${y}H${W}" stroke="var(--mapline2)" stroke-width="2.5"/>`;
    let svg = `<svg class="fb" viewBox="0 0 ${W} ${H}" role="img" aria-label="Positions of washers and jobs">${g}`;
    lns.forEach(l => { const x1 = X(l.a.lng), y1 = Y(l.a.lat), x2 = X(l.b.lng), y2 = Y(l.b.lat); svg += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#5409DA" stroke-width="3" stroke-dasharray="7 7" fill="none"/>${l.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="#5409DA" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(l.label)}</text>` : ''}` });
    pts.slice().sort((a, b) => (a.type === 'j' ? 0 : 1) - (b.type === 'j' ? 0 : 1)).forEach((p, i) => {
      const x = X(p.lng), y = Y(p.lat), { col } = markerInner(p), id = 'cp' + i;
      svg += `<g data-pid="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title)}" style="cursor:pointer">`;
      if (p.type === 'w') {
        svg += `<circle cx="${x}" cy="${y}" r="18" fill="#fff" stroke="${col}" stroke-width="3.5"/>`;
        svg += p.photo ? `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="15"/></clipPath><image href="${esc(p.photo)}" x="${x - 15}" y="${y - 15}" width="30" height="30" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>` : `<text x="${x}" y="${y + 5.5}" text-anchor="middle" font-size="16" font-weight="700" fill="${col}">${esc(ini(p.name))}</text>`;
      } else {
        svg += `<rect x="${x - 13}" y="${y - 13}" width="26" height="26" rx="7" fill="${col}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${p.kind === 'late' || p.kind === 'unassigned' ? '!' : '•'}</text>`;
      }
      svg += `<text x="${x}" y="${y + 34}" text-anchor="middle" font-size="11" font-weight="600" fill="#171717" stroke="#fff" stroke-width="3.5" paint-order="stroke">${esc(p.label)}</text></g>`;
    });
    setHTML(el, svg + `</svg><div class="mapnote">Street map unavailable, showing positions only</div>`);
  };
  api.set = (p, l) => { pts = p; lns = l; draw() };
  const pick = e => { const g = e.target.closest('[data-pid]'); if (g && onPick) onPick(pts.find(p => p.id === g.dataset.pid)) };
  el.addEventListener('click', pick);
  el.addEventListener('keydown', e => { if (e.key === 'Enter') pick(e) });
  if (window.ResizeObserver) { el._ro = new ResizeObserver(() => { el._h = null; draw() }); el._ro.observe(el) }
  return api;
}
function mapData(only) {
  const pts = [], lns = [];
  OPS.washers().filter(w => w.status === 'approved' && w.loc && (!only || w.phone === only)).forEach(w => pts.push({ id: 'w' + w.phone, type: 'w', phone: w.phone, lat: w.loc.lat, lng: w.loc.lng, kind: w.activity.kind, photo: w.photo, name: w.name, label: first(w.name), title: `${w.name}: ${w.activity.text}` }));
  OPS.jobs({ stage: 'open' }).filter(j => isFinite(j.lat) && isFinite(j.lng) && (!only || j.washerPhone === only)).forEach(j => {
    pts.push({ id: 'j' + j.id, type: 'j', jobId: j.id, lat: j.lat, lng: j.lng, kind: j.late ? 'late' : j.stage, label: j.car ? j.car.split(' · ')[0] : j.service, title: `${j.service}, ${j.address} (${j.stageLabel})` });
    if (j.stage === 'on_the_way') {
      const w = j.washerPhone && OPS.washer(j.washerPhone), a = j.washerLoc || (w && w.loc);
      if (a) lns.push({ a: { lat: a.lat, lng: a.lng }, b: { lat: j.lat, lng: j.lng }, label: etaText(j) });
    }
  });
  return { pts, lns };
}
function pickPoint(p) { if (!p) return; if (p.type === 'w') openWasher(p.phone); else openJob(p.jobId) }
const legend = `<div class="legend"><span><i style="background:#16a34a"></i>Free</span><span><i style="background:#5409DA"></i>On a job</span><span><i style="background:#2563eb"></i>Monthly round</span><span><i style="background:#9ca3af"></i>Offline</span><span><i class="sq" style="background:#dc2626"></i>Needs a washer</span><span><i class="sq" style="background:#d97706"></i>Assigned job</span><span><i class="sq" style="background:#5409DA"></i>Job in progress</span></div>`;
function updateMap(m, only) { if (m) { const d = mapData(only); m.set(d.pts, d.lns) } }

/* ---------------- job pieces ---------------- */
const contactBtns = (phone, text, label = '') => dig(phone) ? `<a class="btn sm soft" href="${tel(phone)}" aria-label="Call ${esc(label || nice(phone))}">${ic('phone', 16)}Call</a><a class="btn sm wa" href="${wa(phone, text)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(label || nice(phone))}">${ic('chat', 16)}WhatsApp</a>` : '';
function jobWhen(j) { return j.mode === 'scheduled' ? `${dayLabel(j.date)}${j.slot ? ', ' + j.slot : ''}` : `Instant, booked ${whenTs(j.created)}` }
function stageBtns(j) {
  const b = (st, label, cls = 'go') => `<button class="btn sm ${cls}" type="button" data-act="stage" data-id="${esc(j.id)}" data-st="${st}">${label}</button>`;
  if (j.stage === 'assigned') return b('on_the_way', 'Mark on the way');
  if (j.stage === 'on_the_way') return b('doing', 'Mark washing');
  if (j.stage === 'washing') return b('done', 'Mark done');
  return '';
}
function jobCard(j) {
  const prog = j.stage !== 'unassigned';
  const t = j.stage === 'unassigned' ? (j.mode === 'scheduled' ? dayLabel(j.date) + (j.slot ? ' ' + j.slot : '') : `${waitMin(j)} min ago`) : j.stage === 'on_the_way' ? etaText(j) : j.mode === 'scheduled' ? dayLabel(j.date) + (j.slot ? ' ' + j.slot : '') : OPS.ago(j.created);
  return `<div class="jc${j.late ? ' late' : ''}" role="button" tabindex="0" data-act="job" data-id="${esc(j.id)}" aria-label="Open booking: ${esc(j.service)}, ${esc(j.car)}">
    <div class="jc-top">${stagePill(j)}${j.late ? `<span class="pill solidred">${waitMin(j)} min waiting</span>` : ''}${j.mode === 'scheduled' ? '<span class="pill">Scheduled</span>' : ''}<span class="t">${esc(t)}</span></div>
    <h4>${esc(j.service)}</h4><div class="m">${esc(j.car)}${j.car && j.address ? ' · ' : ''}${esc(j.address)}</div>
    <div class="m2">${prog && j.washerName ? `<span>Washer: <b>${esc(j.washerName)}</b></span>` : ''}<span><b>${OPS.rs(j.amount)}</b></span>${payPill(j)}</div>
    <div class="btns">${j.stage === 'unassigned' ? `<button class="btn sm go" type="button" data-act="assign" data-id="${esc(j.id)}">Assign</button>` : stageBtns(j)}</div></div>`;
}
function jobRow(j) {
  const t = j.mode === 'scheduled' ? (j.slot || 'Any time') : whenTs(j.created);
  return `<div class="rowc" role="button" tabindex="0" data-act="job" data-id="${esc(j.id)}"><div class="gr"><div class="mini" style="margin:0 0 4px">${stagePill(j)}<span class="pill">${esc(t)}</span></div><b>${esc(j.service)}</b>
    <span class="s">${esc(j.car)}${j.address ? ' · ' + esc(j.raw.area || j.address) : ''}</span><span class="s">${j.washerName ? 'Washer: ' + esc(j.washerName) : 'No washer yet'}</span></div>
    <div class="r"><b>${OPS.rs(j.amount)}</b><div class="mini" style="justify-content:flex-end">${payPill(j)}</div></div></div>`;
}
function jobSummary(j) {
  const c = j.customer, nm = c.name || nice(c.phone) || 'Customer';
  const maps = isFinite(j.lat) ? `https://www.google.com/maps?q=${j.lat},${j.lng}` : '';
  return `<div class="card"><dl class="kv">
    <dt>Service</dt><dd>${esc(j.service)}${j.lines.length > 1 ? `<br><small>${j.lines.map(l => esc((l.q > 1 ? l.q + ' x ' : '') + (l.id || ''))).join(', ')}</small>` : ''}</dd>
    <dt>Car</dt><dd>${esc(j.car) || '-'}</dd><dt>Address</dt><dd>${esc(j.address) || '-'}</dd><dt>When</dt><dd>${esc(jobWhen(j))}</dd>
    <dt>Amount</dt><dd>${OPS.rs(j.amount)} ${payPill(j)}</dd><dt>Paid via</dt><dd>${esc(j.payVia)}</dd>
    <dt>Customer</dt><dd>${esc(nm)}${c.name ? `<br><small>${esc(nice(c.phone))}</small>` : ''}</dd>
    <dt>Start code</dt><dd>${j.code ? `<b style="font-size:18px;letter-spacing:.2em;font-variant-numeric:tabular-nums">${esc(j.code)}</b>${j.raw.start_code ? ' <span class="pill green">Used</span>' : ''}<br><small>The customer gives it to the washer at the car</small>` : '<small>Made when you assign a washer</small>'}</dd>
    ${j.washerName ? `<dt>Washer</dt><dd>${esc(j.washerName)}${j.eta && j.open ? ` <span class="pill violet">${esc(etaText(j) || 'ETA ' + OPS.fmtTime(j.eta))}</span>` : ''}</dd>` : ''}
    </dl><div class="btns">${contactBtns(c.phone, '', nm)}${maps ? `<a class="btn sm ghost" href="${maps}" target="_blank" rel="noopener">${ic('ext', 16)}Open in Google Maps</a>` : ''}</div></div>`;
}
function timeline(j) {
  const r = j.raw, steps = [['Booked', r.created_at], ['Assigned', r.assigned_at], ['On the way', r.on_the_way_at], ['Washing started', r.started_at], ['Finished', r.finished_at]];
  if (j.stage === 'cancelled') steps.push(['Cancelled' + (r.cancel_note ? ': ' + r.cancel_note : ''), r.cancelled_at, 1]);
  return `<ul class="tl">${steps.map(([l, t, bad]) => `<li class="${t ? (bad ? 'bad' : 'on') : ''}"><i></i>${esc(l)}<span>${t ? esc(whenTs(t)) : '-'}</span></li>`).join('')}</ul>`;
}

/* ---------------- sheets ---------------- */
const shHead = (title, extra = '') => `<div class="sh-h"><h2 id="shT">${title}</h2>${extra}<button class="x" type="button" data-act="close" aria-label="Close">${ic('x')}</button></div>`;
function openSheet(kind, id, html) {
  closeSheet(true);
  UI.sheet = { kind, id }; UI.opener = document.activeElement;
  const el = $('#sheet'); el.innerHTML = html; el.setAttribute('aria-labelledby', 'shT'); el.hidden = false; el.scrollTop = 0; $('#scrim').hidden = false; document.body.classList.add('noscroll');
  SH[kind].update(el);
  (el.querySelector('[data-focus]') || el.querySelector('.x')).focus();
}
function closeSheet(quiet) {
  if (UI.sheetMap) { UI.sheetMap.destroy(); UI.sheetMap = null }
  const had = UI.sheet; UI.sheet = null;
  $('#sheet').hidden = true; $('#sheet').innerHTML = ''; $('#scrim').hidden = true; document.body.classList.remove('noscroll');
  if (had && !quiet) { try { UI.opener && UI.opener.isConnected && UI.opener.focus() } catch (e) {} }
}
const gone = () => empty('This booking is gone.');

const SH = {
  wash: { update: washSheet },
  assign: {
    update(el) {
      const j = OPS.job(UI.sheet.id); if (!j) return setHTML(R('sum', el), gone());
      setHTML(R('sum', el), jobSummary(j));
      const list = OPS.suggest(j.id), eta = $('#aEta');
      if (eta && !UI.etaEdited && document.activeElement !== eta && list[0]) eta.value = list[0].etaMin;
      setHTML(R('rows', el), list.length ? list.map(w => `<button class="pick" type="button" data-act="pick" data-phone="${esc(w.phone)}" data-eta="${w.etaMin}" aria-label="Assign ${esc(w.name)}">
        ${avatar(w.photo, w.name)}<div class="gr"><b>${esc(w.name)}</b><span class="s">${esc(w.activity.text)}</span><span class="s">${w.queued.length ? w.queued.length + ' queued' : 'Nothing queued'}</span></div>
        <div class="r">${isFinite(w.km) ? `<b>${w.etaMin} min</b>${w.km.toFixed(1)} km` : `<b>~${w.etaMin} min</b>location unknown`}</div></button>`).join('') : empty('No approved washers with a round id yet. Add or approve a washer first.'));
    },
  },
  job: {
    update(el) {
      const j = OPS.job(UI.sheet.id); if (!j) return setHTML(R('sum', el), gone());
      setHTML(R('pill', el), stagePill(j));
      setHTML(R('sum', el), jobSummary(j));
      setHTML(R('tl', el), timeline(j));
      const B = (a, l, c = 'soft', st = '') => `<button class="btn sm ${c}" type="button" data-act="${a}" data-id="${esc(j.id)}" ${st ? `data-st="${st}"` : ''}>${l}</button>`;
      let b = '';
      if (j.stage === 'unassigned') b = B('assign', 'Assign a washer', 'go');
      if (j.stage === 'assigned') b = B('stage', 'Mark on the way', 'go', 'on_the_way') + B('reassign', 'Reassign') + B('unassign', 'Unassign', 'ghost');
      if (j.stage === 'on_the_way') b = B('stage', 'Mark washing', 'go', 'doing') + B('eta', 'Change ETA') + B('reassign', 'Reassign') + B('unassign', 'Unassign', 'ghost');
      if (j.stage === 'washing') b = B('stage', 'Mark done', 'go', 'done') + B('reassign', 'Reassign');
      if (j.open) b += B('cancel', 'Cancel booking', 'dsoft');
      setHTML(R('acts', el), b ? `<div class="btns">${b}</div>` : '');
    },
  },
  washer: {
    update(el) {
      const w = OPS.washer(UI.sheet.id); if (!w) return setHTML(R('head', el), empty('This washer is gone.'));
      setHTML(R('head', el), `<div class="card"><div class="wc-h">${avatar(w.photo, w.name, 'lg')}<div class="gr"><b>${esc(w.name)}</b><small>${esc(nice(w.phone))}${w.round ? ' · round ' + esc(w.round) : ''}</small><div class="mini">${statusPill(w)}<span class="pill ${w.loc && w.loc.fresh ? 'green' : ''}">${w.loc ? (w.loc.fresh ? 'Live now' : 'Seen ' + esc(OPS.ago(w.loc.at))) : 'No location yet'}</span></div></div></div>
        <div class="act" style="margin-top:12px;display:flex;gap:8px"><span class="dot ${w.activity.kind === 'free' || w.activity.kind === 'job' || w.activity.kind === 'round' ? 'live' : ''}" style="margin-top:6px"></span><span>${esc(w.activity.text)}</span></div>
        <div class="btns">${contactBtns(w.phone, '', w.name)}</div></div>`);
      const A = (a, l, c) => `<button class="btn sm ${c}" type="button" data-act="${a}" data-phone="${esc(w.phone)}">${l}</button>`;
      setHTML(R('wacts', el), `<div class="btns">${w.status !== 'approved' ? A('approve', 'Approve', 'go') : ''}${w.status !== 'blocked' ? A('block', 'Block', 'dsoft') : ''}</div>`);
      const mapEl = R('map', el);
      if (UI.sheetMap) updateMap(UI.sheetMap, w.phone);
      setHTML(R('maptxt', el), w.loc ? '' : empty('No location yet. It shows once the washer opens WD Partner.'));
      if (mapEl) mapEl.hidden = !w.loc;
      const today = OPS.today(), js = OPS.jobs({ washer: w.phone }).filter(j => j.open || String(j.raw.finished_at || j.date).slice(0, 10) === today);
      pubTotalsDraw();
      setHTML(R('jobs', el), js.length ? `<div class="cardlist">${js.map(jobRow).join('')}</div>` : empty('No jobs today.'));
    },
  },
  addw: { update() {} },
  monthly: {
    update(el) {
      const c = OPS.monthly().find(x => x.phone === UI.sheet.id); if (!c) return setHTML(R('sum', el), empty('This customer is gone.'));
      const due = c.next && c.next.left != null && c.next.left <= 7;
      const msg = x => `Namaste ${c.name}, your Washing Daddy plan for ${x.name || x.plate} ends on ${dMed(x.till)}. Renew here: https://washingdaddy.com/pay/`;
      setHTML(R('sum', el), `<div class="card"><dl class="kv"><dt>Status</dt><dd>${c.status === 'active' ? '<span class="pill green">Active</span>' : '<span class="pill amber">New sign-up</span>'}</dd><dt>Phone</dt><dd>${esc(nice(c.phone))}</dd><dt>Area</dt><dd>${esc(c.area) || '-'}</dd><dt>Monthly total</dt><dd>${OPS.rs(c.monthlyTotal)}</dd>${c.requested ? `<dt>Requested</dt><dd>${c.requested} car${c.requested > 1 ? 's' : ''} waiting to be added</dd>` : ''}</dl>
        <div class="btns">${dig(c.phone) ? `<a class="btn sm soft" href="${tel(c.phone)}">${ic('phone', 16)}Call</a><a class="btn sm wa" href="${wa(c.phone, due ? msg(c.next) : '')}" target="_blank" rel="noopener">${ic('chat', 16)}${due ? 'WhatsApp reminder' : 'WhatsApp'}</a>` : ''}
        <button class="btn sm ${c.status === 'active' ? 'dsoft' : 'go'}" type="button" data-act="custstatus" data-phone="${esc(c.phone)}" data-st="${c.status === 'active' ? 'new' : 'active'}">${c.status === 'active' ? 'Pause' : 'Activate'}</button></div></div>`);
      setHTML(R('cars', el), c.cars.length ? `<div class="cardlist">${c.cars.map(x => `<div class="card"><b>${esc(x.name || x.plate)}</b> ${x.left != null ? leftPill(x.left) : ''}<dl class="kv" style="margin-top:8px"><dt>Plate</dt><dd>${esc(x.plate) || '-'}</dd><dt>Plan</dt><dd>${esc(x.planName)} · ${OPS.rs(x.price)}/month</dd><dt>Start</dt><dd>${x.start ? esc(dMed(x.start)) : '-'}</dd><dt>Paid till</dt><dd>${x.till ? esc(dMed(x.till)) : '-'}</dd><dt>Washer</dt><dd>${esc(x.washer) || '-'}</dd></dl>
        ${x.left != null && x.left <= 7 && dig(c.phone) ? `<div class="btns"><a class="btn sm wa" href="${wa(c.phone, msg(x))}" target="_blank" rel="noopener">${ic('chat', 16)}WhatsApp reminder</a></div>` : ''}</div>`).join('')}</div>` : empty('No cars on this customer yet.'));
    },
  },
};
const statusPill = w => w.status === 'approved' ? '<span class="pill green">Approved</span>' : w.status === 'blocked' ? '<span class="pill red">Blocked</span>' : '<span class="pill amber">Pending approval</span>';
const leftPill = l => l < 0 ? `<span class="pill red">overdue ${-l} day${l === -1 ? '' : 's'}</span>` : l === 0 ? '<span class="pill amber">ends today</span>' : `<span class="pill ${l <= 7 ? 'amber' : 'green'}">${l} day${l === 1 ? '' : 's'} left</span>`;

function openAssign(id) {
  const j = OPS.job(id); UI.etaEdited = false;
  openSheet('assign', id, `${shHead('Assign a washer')}<div data-r="sum"></div>
    ${j && j.mode === 'instant' ? `<div class="sh-sec">Arrival time</div><div class="etaf"><input class="field" id="aEta" type="number" min="1" max="240" inputmode="numeric" aria-label="ETA in minutes"><span>minutes from now</span></div><div class="hint">Starts from the washer you pick. Change it to override.</div>` : ''}
    <div class="sh-sec">Pick a washer (closest and least busy first)</div><div data-r="rows"></div>`);
  const e = $('#aEta'); if (e) e.oninput = () => { UI.etaEdited = true };
}
const openJob = id => openSheet('job', id, `${shHead('Booking', '<span data-r="pill"></span>')}<div data-r="sum"></div><div data-r="acts"></div><div class="sh-sec">Progress</div><div class="card" data-r="tl"></div>`);
function openWasher(phone) {
  const w = OPS.washer(phone); if (!w) return;
  openSheet('washer', phone, `${shHead('Washer')}<div data-r="head"></div><div data-r="wacts"></div>
    <div class="sh-sec">Photo</div><label class="btn sm soft" style="cursor:pointer">Change photo<input class="vh" id="wPhoto" type="file" accept="image/*" capture="user"></label>
    <div class="sh-sec">Details</div><div class="card"><label class="lbl" for="wName" style="margin-top:0">Name</label><input class="field" id="wName" value="${esc(w.name)}" maxlength="60">
      <label class="lbl" for="wArea">Area</label><input class="field" id="wArea" value="${esc(w.area)}" maxlength="80"><div class="btns"><button class="btn sm go" type="button" data-act="savew" data-phone="${esc(phone)}">Save details</button></div>
      <label class="lbl" for="wRound">Round id</label><input class="field" id="wRound" value="${esc(w.round)}" maxlength="24" autocapitalize="none"><div class="hint">The id the washer's route and monthly round use. Lowercase letters, numbers and dashes.</div><div class="btns"><button class="btn sm go" type="button" data-act="saveround" data-phone="${esc(phone)}">Save round id</button></div></div>
    <div class="sh-sec">Public profile <small style="font-weight:400;color:var(--grey)">(what customers see in the app)</small></div>${pubForm(w)}
    <div class="sh-sec">Location</div><div data-r="maptxt"></div><div class="mapbox small" data-r="map"></div>
    <div class="sh-sec">Jobs today</div><div data-r="jobs"></div>`);
  UI.sheetMap = mkMap(R('map', $('#sheet')), pickPoint); SH.washer.update($('#sheet')); pubTotalsDraw();
  $('#wPhoto').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = await OPS.photoFromFile(f); await run(OPS.setPhoto(phone, d), 'Photo updated.') } catch (x) { toast(x.message, { cls: 'err' }) } e.target.value = '' };
}
/* public profile editor: static markup (typed text must survive the live re-draws); only the totals box is redrawn */
function pubForm(w) {
  const p = (OPS.S.pub || {})[w.round] || {}, v = p.verified || {};
  const F = (id, label, val, extra = '') => `<label class="lbl" for="${id}">${label}</label><input class="field" id="${id}" value="${esc(val)}" ${extra}>`;
  const T = (id, label) => `<label class="pchk"><input type="checkbox" id="${id}" ${v[{ pId: 'id', pPolice: 'police', pTraining: 'training', pAssessment: 'assessment' }[id]] ? 'checked' : ''}><span>${label}</span></label>`;
  if (!w.round) return `<div class="card">${empty('Give this washer a round id first. The public profile is saved under it.')}</div>`;
  return `<form class="card" id="pubForm" autocomplete="off" data-phone="${esc(w.phone)}">
    <div data-r="pubtot" class="pubtot"></div>
    ${F('pJobs', 'Jobs done so far, before the app', p.jobs_base ?? 0, 'type="number" min="0" step="1" inputmode="numeric"')}
    <div class="pgrid"><div>${F('pRate', 'Average rating so far (1.0 to 5.0)', p.rating_base ? Number(p.rating_base).toFixed(1) : '', 'type="number" min="1" max="5" step="0.1" inputmode="decimal" placeholder="4.8"')}</div>
    <div>${F('pRc', 'Based on how many ratings', p.rating_count_base ?? 0, 'type="number" min="0" step="1" inputmode="numeric"')}</div></div>
    <label class="lbl" for="pPhone">Washer's own phone number</label><div class="ph" style="margin:0"><span class="cc">+91</span><input class="field" id="pPhone" inputmode="numeric" maxlength="11" value="${esc(dig(p.phone))}" placeholder="98765 43210"></div>
    <div class="hint">Customers call this number. Not the owner's number.</div>
    ${F('pArea', 'Area', p.area ?? w.area, 'maxlength="80"')}
    <div class="pgrid"><div>${F('pSince', 'Since', p.since || '', 'type="date"')}</div><div>${F('pLang', 'Languages (comma list)', (p.languages || []).join(', '), 'placeholder="Hindi, English"')}</div></div>
    ${F('pPhoto', 'Photo link (optional)', p.photo && !String(p.photo).startsWith('data:') ? p.photo : '', 'type="url" placeholder="https://"')}
    <div class="lbl">Verified</div><div class="pchks">${T('pId', 'Aadhaar verified')}${T('pPolice', 'Police verified')}${T('pTraining', 'Trained by professionals')}${T('pAssessment', 'Assessment certified')}</div>
    <div class="err" id="pErr"></div>
    <div class="btns"><button class="btn sm go" type="submit" id="pGo">Save public profile</button><button class="btn sm soft" type="button" id="pRecount">Recount from app ratings</button></div>
    <div class="hint">Recount reads the ratings customers gave in the app and updates the app counters. Your numbers above are never changed by it.</div></form>`;
}
const pubDraft = () => { const f = $('#pubForm'); if (!f) return null; return { jobs_base: $('#pJobs').value, rating_base: $('#pRate').value, rating_count_base: $('#pRc').value, phone: $('#pPhone').value, area: $('#pArea').value, since: $('#pSince').value, languages: $('#pLang').value, photo: $('#pPhoto').value, verified: { id: $('#pId').checked, police: $('#pPolice').checked, training: $('#pTraining').checked, assessment: $('#pAssessment').checked } } };
function pubTotalsDraw() {
  const f = $('#pubForm'); if (!f) return;
  const w = OPS.washer(f.dataset.phone), p = (OPS.S.pub || {})[w && w.round] || {}, d = pubDraft();
  const t = OPS.pubTotals({ jobs_base: d.jobs_base, rating_base: d.rating_base, rating_count_base: d.rating_count_base, jobs_app: p.jobs_app, rating_sum_app: p.rating_sum_app, rating_count_app: p.rating_count_app });
  setHTML(R('pubtot', f), `<div class="pt"><b>${t.jobs}</b><span>jobs total</span></div><div class="pt"><b>${t.ratings ? t.rating.toFixed(1) + ' ★' : '-'}</b><span>rating from ${t.ratings} rating${t.ratings === 1 ? '' : 's'}</span></div>
    <div class="pn">Before the app: ${num(d.jobs_base)} jobs. In the app: ${num(p.jobs_app)} jobs done, ${num(p.rating_count_app)} rating${num(p.rating_count_app) === 1 ? '' : 's'}. Press Recount to refresh the app numbers.</div>`);
}
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#pubForm')) pubTotalsDraw() });
document.addEventListener('submit', async e => {
  if (e.target.id !== 'pubForm') return; e.preventDefault();
  const b = $('#pGo'); b.disabled = true; $('#pErr').textContent = '';
  try { await OPS.savePublic(e.target.dataset.phone, pubDraft()); toast('Public profile saved.') } catch (x) { $('#pErr').textContent = x.message || 'Could not save.' }
  b.disabled = false;
});
document.addEventListener('click', async e => {
  const b = e.target.closest('#pRecount'); if (!b) return;
  b.disabled = true; $('#pErr').textContent = '';
  try { const r = await OPS.recountApp($('#pubForm').dataset.phone); toast(`Counted ${r.jobs} job${r.jobs === 1 ? '' : 's'} and ${r.cnt} rating${r.cnt === 1 ? '' : 's'} from the app.`); pubTotalsDraw() } catch (x) { $('#pErr').textContent = x.message || 'Could not recount.' }
  b.disabled = false;
});
function openAddWasher() {
  openSheet('addw', '', `${shHead('Add a washer')}<form id="awForm" class="card" autocomplete="off"><label class="lbl" for="awName" style="margin-top:0">Name</label><input class="field" id="awName" maxlength="60" data-focus required>
    <label class="lbl" for="awPh">Mobile number</label><div class="ph" style="margin:0"><span class="cc">+91</span><input class="field" id="awPh" inputmode="numeric" maxlength="11" placeholder="98765 43210" required></div>
    <label class="lbl" for="awArea">Area</label><input class="field" id="awArea" maxlength="80" placeholder="e.g. GH-9 Paschim Vihar">
    <label class="lbl" for="awPhoto">Photo <small>(optional)</small></label><input class="field" id="awPhoto" type="file" accept="image/*" capture="user"><img class="pv" id="awPv" alt="Photo preview" hidden>
    <div class="err" id="awErr"></div><button class="btn go wide" type="submit" id="awGo">Add washer</button><div class="hint">They sign in on WD Partner with this mobile number.</div></form>`);
  let photo = '';
  $('#awPhoto').onchange = async e => { const f = e.target.files[0]; photo = ''; $('#awPv').hidden = true; if (!f) return; try { photo = await OPS.photoFromFile(f); $('#awPv').src = photo; $('#awPv').hidden = false } catch (x) { $('#awErr').textContent = x.message } };
  $('#awForm').onsubmit = async e => {
    e.preventDefault(); const b = $('#awGo'); b.disabled = true; $('#awErr').textContent = '';
    const name = $('#awName').value.trim(), phone = $('#awPh').value;
    try { await OPS.addWasher({ name, phone, area: $('#awArea').value, photo }); closeSheet(); toast(`${name} added. They sign in on WD Partner with ${nice(dig(phone))}.`, { ms: 9000 }) }
    catch (x) { $('#awErr').textContent = x.message || 'Could not add. Try again.'; b.disabled = false }
  };
}
const openMonthly = phone => openSheet('monthly', phone, `${shHead('Monthly customer')}<div class="note">Plans, cars and paid-till dates still come from the <a href="../">approvals page</a> and the Notion book.</div><div data-r="sum"></div><div class="sh-sec">Cars</div><div data-r="cars"></div>`);

/* ---------------- actions ---------------- */
async function doStage(id, st) {
  const j = OPS.job(id); if (!j) return;
  if (st === 'on_the_way') {
    const w = j.washerPhone && OPS.washer(j.washerPhone), k = w && w.loc && isFinite(j.lat) ? OPS.km({ lat: j.lat, lng: j.lng }, w.loc) : NaN;
    const v = await ask({ title: 'Mark on the way', body: `${esc(j.washerName)} is on the way to ${esc(j.address || j.service)}.`, fields: [{ id: 'm', label: 'Arrives in (minutes)', type: 'number', value: OPS.travelMin(k), min: 1, max: 240, required: true }], ok: 'Mark on the way' });
    if (!v) return; return run(OPS.stage(id, 'on_the_way', { etaMin: num(v.m, 15) }), 'Marked on the way.');
  }
  return run(OPS.stage(id, st), st === 'done' ? 'Marked done.' : 'Marked washing.');
}
async function doCancel(id) {
  const j = OPS.job(id); if (!j) return;
  const v = await ask({ title: 'Cancel this booking?', body: `${esc(j.service)}, ${esc(j.car)}.<div class="warn">This does not refund. Refund paid bookings from the Razorpay dashboard.</div>`, fields: [{ id: 'why', label: 'Reason', required: true, ph: 'e.g. customer asked to cancel' }], ok: 'Cancel booking', cancel: 'Keep booking', danger: true });
  if (v && await run(OPS.cancel(id, v.why), 'Booking cancelled.')) { if (UI.sheet && UI.sheet.kind === 'job') closeSheet() }
}
async function doEta(id) {
  const j = OPS.job(id), cur = j ? etaMinLeft(j) : NaN;
  const v = await ask({ title: 'Change ETA', fields: [{ id: 'm', label: 'Arrives in (minutes from now)', type: 'number', value: isFinite(cur) && cur > 0 ? cur : 10, min: 1, max: 240, required: true }], ok: 'Save ETA' });
  if (v) run(OPS.setEta(id, num(v.m, 10)), 'ETA updated.');
}
async function pickWasher(phone, etaFromRow) {
  const id = UI.sheet && UI.sheet.id, f = $('#aEta'), j = OPS.job(id);
  const etaMin = f && UI.etaEdited ? Math.max(1, num(f.value, etaFromRow)) : etaFromRow;
  const w = OPS.washer(phone);
  if (await run(OPS.assign(id, phone, { etaMin }), () => `Assigned to ${w ? w.name : 'washer'}${j && j.mode === 'instant' ? `, arriving in about ${etaMin} min` : ''}.`)) closeSheet();
}

document.addEventListener('click', async e => {
  if (e.target.closest('a[href]')) return;
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id, ph = t.dataset.phone;
  switch (a) {
    case 'sec': return goto(t.dataset.s);
    case 'job': return openJob(id);
    case 'assign': return openAssign(id);
    case 'reassign': return openAssign(id);
    case 'washer': return openWasher(ph);
    case 'monthly': return openMonthly(ph);
    case 'rday': return OPSB.setDay(OPSB.add(OPSB.day, num(t.dataset.d)));
    case 'rtab': UI.rd.tab = t.dataset.v; return SECS.rounds.update();
    case 'wash': return openSheet('wash', id, `${shHead('Wash')}<div data-r="sum"></div>`);
    case 'zoom': { const d = $('#dlg'), prev = document.activeElement; d.innerHTML = `<div class="dlg-box" style="max-width:640px;padding:8px"><img src="${esc(t.dataset.src)}" alt="Photo" style="width:100%;border-radius:12px"><div class="dlg-a"><button type="button" class="btn ghost" id="dNo">Close</button></div></div>`; d.hidden = false; dlgCancel = () => { d.hidden = true; d.innerHTML = ''; dlgCancel = null; try { prev && prev.focus() } catch (x) {} }; $('#dNo').onclick = dlgCancel; return }
    case 'markpaid': { const w = OPS.S.washers[ph]; const v = await ask({ title: 'Mark ' + (w ? w.name : ph) + ' paid', body: `${esc(OPSB.month)} earnings: ${OPS.rs(num(t.dataset.total))}`, fields: [{ id: 'ref', label: 'Payment reference (UPI id or note)', ph: 'optional' }], ok: 'Mark paid' }); return v && run(OPSB.markPaid(ph, num(t.dataset.total), v.ref), 'Marked paid.') }
    case 'close': return closeSheet();
    case 'toastx': return t.parentElement.remove();
    case 'stage': return doStage(id, t.dataset.st);
    case 'unassign': if (await run(OPS.unassign(id), 'Washer removed from this booking.')) return; return;
    case 'eta': return doEta(id);
    case 'cancel': return doCancel(id);
    case 'pick': return pickWasher(ph, num(t.dataset.eta, 15));
    case 'addwasher': return openAddWasher();
    case 'approve': return run(OPS.setWasherStatus(ph, 'approved'), 'Washer approved.');
    case 'block': { const w = OPS.washer(ph); const v = await ask({ title: 'Block ' + (w ? w.name : 'washer') + '?', body: 'They will not get new jobs or be able to use WD Partner.', ok: 'Block', danger: true }); return v && run(OPS.setWasherStatus(ph, 'blocked'), 'Washer blocked.') }
    case 'savew': return run(OPS.updateWasher(ph, { name: $('#wName').value, area: $('#wArea').value }), 'Details saved.');
    case 'saveround': return run(OPS.setRound(ph, $('#wRound').value), 'Round id saved.');
    case 'custstatus': return run(OPS.customerStatus(ph, t.dataset.st), t.dataset.st === 'active' ? 'Customer activated.' : 'Customer paused.');
    case 'fit': return UI.map && UI.map.fit();
    case 'tab': UI.bk.tab = t.dataset.v; return SECS.bookings.update();
    case 'chip': { const g = t.dataset.g; UI[g].chip = t.dataset.v; return SECS[t.dataset.s].update() }
    case 'sound': UI.sound = !UI.sound; setPref('sound', UI.sound); if (UI.sound) chime(); return head();
    case 'notif': if (window.Notification && Notification.permission === 'default') { try { await Notification.requestPermission() } catch (x) {} } return head();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#dlg').hidden) dlgCancel && dlgCancel(); else if (UI.sheet) closeSheet(); return }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click() }
});
$('#scrim').addEventListener('click', () => { if ($('#dlg').hidden) closeSheet() });
document.addEventListener('change', e => { if (e.target.id === 'rMonth' && e.target.value) OPSB.setMonth(e.target.value) });
document.addEventListener('input', e => {
  if (e.target.id === 'bkQ') { UI.bk.q = e.target.value; SECS.bookings.update() }
});

/* ---------------- new booking alert ---------------- */
let actx = null;
function chime() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    [[880, 0], [1175, .16], [1480, .32]].forEach(([f, t]) => { const o = actx.createOscillator(), g = actx.createGain(), s = actx.currentTime + t; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.25, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + .3); o.connect(g).connect(actx.destination); o.start(s); o.stop(s + .32) });
  } catch (e) {}
}
document.addEventListener('pointerdown', () => { try { if (UI.sound && !actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume() } } catch (e) {} }, { once: true });
function watchNew() {
  if (!OPS.S.loaded.jobs) return;
  const un = OPS.jobs({ stage: 'unassigned' }), fresh = un.filter(j => !UI.seen.has(j.id));
  un.forEach(j => UI.seen.add(j.id));
  if (!UI.seeded) { UI.seeded = true; return }
  fresh.filter(j => OPS.S.demo || Date.now() - OPS.ms(j.created) < 20 * 60e3).forEach(j => {
    const area = j.raw.area || j.address;
    toast(`New booking: ${j.service}, ${area}`, { cls: 'new', act: 'assign', id: j.id, label: 'Assign', ms: 15000 });
    if (UI.sound) chime();
    try { if (window.Notification && Notification.permission === 'granted') new Notification('New booking', { body: `${j.service}, ${area}`, tag: 'wd-' + j.id }) } catch (e) {}
  });
}

/* ---------------- rounds (washer-produced data: washes, attendance, earnings, ratings) ---------------- */
const WSTATUS = { scheduled: 'Waiting', on_the_way: 'On the way', arrived: 'Arrived', washing: 'Washing', done: 'Done', skipped: 'Skipped' };
const WCLS = { scheduled: '', on_the_way: 'blue', arrived: 'blue', washing: 'violet', done: 'green', skipped: 'amber' };
const SPOTS = { driver_mat: 'Driver mat', passenger_mat: 'Passenger mat', back_seat: 'Back seat', boot: 'Boot', dashboard: 'Dashboard' };
const safeSrc = u => /^(https:\/\/|\/_blob\/|data:image\/(jpeg|webp|png);base64,)/.test(String(u || '')) ? u : '';
const lbl = s => (s || '').replace(/_/g, ' ');
const rsl = loaded => loaded === 'err' ? empty('Could not load. The rules for this collection may not be published yet.') : loaded ? '' : empty('Loading…');
function boardView() {
  const g = OPSB.board(), st = OPSB.S.loaded.washes; if (!g.length) return rsl(st) || empty('No washes on ' + dShort(OPSB.day) + '. The washer app makes them when the round starts.');
  return `<div class="grid2 g3">${g.map(x => `<div class="wc"><div class="wc-h"><div class="gr"><b>${esc(x.name)}</b><small>Round ${esc(x.round)} · ${x.total} cars</small></div>${x.late ? `<span class="pill red">${x.late} late</span>` : ''}</div>
    <div class="mini" style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${OPSB.ORDER.filter(k => x.counts[k]).map(k => `<span class="pill ${WCLS[k]}">${WSTATUS[k]} ${x.counts[k]}</span>`).join('')}</div>
    ${x.cars.map(w => `<button type="button" class="rowc" data-act="wash" data-id="${esc(w.id)}" style="margin-top:6px;${OPSB.isLate(w) ? 'box-shadow:inset 4px 0 0 var(--red),var(--sh-card)' : ''}"><div class="gr"><b>${esc(w.car_label || w.reg)}</b><span class="s">${esc(w.reg || '')}${w.sunday ? ' · Sunday' : ''}${w.carried_task ? ' · carried interior' : ''}${w.skip_reason ? ' · ' + esc(w.skip_reason) : ''}</span></div>${OPSB.isLate(w) ? '<span class="pill red">Late</span>' : ''}<span class="pill ${WCLS[w.status] || ''}">${WSTATUS[w.status] || esc(w.status || 'Waiting')}</span></button>`).join('')}</div>`).join('')}</div>`;
}
function attView() {
  const a = OPSB.attendance(), L = OPSB.S.loaded.att; if (!a.rows.length && !a.absent.length) return rsl(L) || empty('No check-ins on ' + dShort(OPSB.day) + '.');
  return `<div class="cardlist">${a.rows.map(r => `<div class="rowc plain"><div class="gr"><b>${esc(r.name)}</b><span class="s">In ${esc(OPS.fmtTime(r.check_in_at) || '-')} · out ${esc(OPS.fmtTime(r.check_out_at) || 'still working')} · ${num(r.hours).toFixed(1)} h</span><span class="s">${num(r.cars_done)} done · ${num(r.cars_skipped)} skipped${r.last_seen_at ? ' · seen ' + esc(OPS.ago(r.last_seen_at)) : ''}</span></div>${safeSrc(r.check_in_photo) ? `<img class="avatar" src="${esc(r.check_in_photo)}" alt="Check-in selfie" data-act="zoom" data-src="${esc(r.check_in_photo)}">` : ''}</div>`).join('')}
    ${a.absent.map(r => `<div class="rowc plain"><div class="gr"><b>${esc(r.name)}</b><span class="s">Has a round but no check-in</span></div><span class="pill red">Absent</span></div>`).join('')}</div>`;
}
function skipView() {
  const k = OPSB.skips(); if (!k.length) return rsl(OPSB.S.loaded.washes) || empty('No skipped cars on ' + dShort(OPSB.day) + '.');
  return `<div class="cardlist">${k.map(w => `<button type="button" class="rowc" data-act="wash" data-id="${esc(w.id)}"><div class="gr"><b>${esc(w.car_label || w.reg)} <small>${esc(w.reg || '')}</small></b><span class="s">${esc(w.washer)}</span><span class="s">${w.skip_reason ? esc(w.skip_reason) : '<b style="color:var(--red)">No reason given</b>'}</span></div><span class="pill amber">Skipped</span></button>`).join('')}</div>`;
}
function intView() {
  const l = OPSB.interiors(); if (!l.length) return rsl(OPSB.S.loaded.washes) || empty('No Sunday interiors carried over in the last 14 days.');
  return `<div class="cardlist">${l.map(x => `<div class="rowc plain"><div class="gr"><b>${esc(x.car || x.reg)} <small>${esc(x.reg || '')}</small></b><span class="s">${esc(x.washer)} · Sunday ${esc(dShort(x.from || ''))} to ${esc(dShort(x.to))}</span></div><span class="pill ${x.done ? 'green' : 'amber'}">${x.done ? 'Done' : 'Pending'}</span></div>`).join('')}</div>`;
}
function earnView() {
  const l = OPSB.ledger(), tot = l.reduce((s, r) => s + r.total, 0), due = l.filter(r => !r.payout).reduce((s, r) => s + r.total, 0);
  const mo = `<div class="page-h" style="margin-top:0"><h3 style="margin:0">Month</h3><input class="field" type="month" id="rMonth" value="${esc(OPSB.month)}" style="width:auto;min-height:40px"></div>`;
  if (!l.length) return mo + (rsl(OPSB.S.loaded.earn) || empty('No earnings for ' + OPSB.month + ' yet.'));
  return `${mo}<div class="kpis"><div class="kpi"><b>${OPS.rs(tot)}</b><span>Earned</span></div><div class="kpi ${due ? 'red' : ''}"><b>${OPS.rs(due)}</b><span>Still to pay</span></div></div>
   <div class="cardlist">${l.map(r => `<div class="rowc plain"><div class="gr"><b>${esc(r.name)}</b><span class="s">${r.days} days · washes ${OPS.rs(r.washes)} · extras ${OPS.rs(r.extras)} · bonus ${OPS.rs(r.bonus)}</span><span class="s"><b>${OPS.rs(r.total)}</b>${r.payout ? ` · paid ${esc(dShort(String(r.payout.paid_at || '').slice(0, 10)))}${r.payout.ref ? ' · ' + esc(r.payout.ref) : ''}${num(r.payout.total) !== Math.round(r.total) ? ' (paid ' + OPS.rs(r.payout.total) + ')' : ''}` : ''}</span></div>${r.payout ? '<span class="pill green">Paid</span>' : `<button type="button" class="btn sm go" data-act="markpaid" data-phone="${esc(r.phone)}" data-total="${Math.round(r.total)}">Mark paid</button>`}</div>`).join('')}</div>`;
}
function fbView() {
  const l = OPSB.feedback(); if (!l.length) return rsl(OPSB.S.loaded.rat) || empty('No low ratings or open complaints.');
  return `<div class="cardlist">${l.map(x => `<div class="rowc plain"><div class="gr"><b>${x.kind === 'rating' ? '&#9733;'.repeat(num(x.stars)) + ' rating' : 'Complaint' + (x.type ? ': ' + esc(x.type) : '')}</b><span class="s">${esc(x.reg || '')}${x.date ? ' · ' + esc(dShort(x.date)) : ''}${x.washer ? ' · ' + esc(x.washer) : ''}${x.tag ? ' · ' + esc(x.tag) : ''}</span>${x.text ? `<span class="s">${esc(x.text)}</span>` : ''}</div><span class="pill ${x.kind === 'rating' ? 'amber' : 'red'}">${x.kind === 'rating' ? 'Low' : esc(x.status)}</span></div>`).join('')}</div>`;
}
function mgrView() {
  const L = OPSB.S.loaded.washes; if (!L) return rsl(L);
  const ab = OPSB.abandoned(), cm = OPSB.conditionMix(), ic = OPSB.issueCounts(), dl = OPSB.delays(), dm = OPSB.damage(), none = t => `<div class="mini" style="color:var(--grey)">${t}</div>`;
  const carBtn = x => `<button type="button" class="rowc" data-act="wash" data-id="${esc(x.id)}"><div class="gr"><b>${esc(x.car)} <small>${esc(x.reg || '')}</small></b><span class="s">${esc(x.washer)}</span>`;
  return `<div class="sec"><h3>Abandoned jobs</h3></div>` + (ab.length ? `<div class="cardlist">${ab.map(x => carBtn(x) + `<span class="s">${esc(x.reason || 'No reason')} · ${x.minutes} min spent</span><span class="s">Done: ${x.tasks.length ? esc(x.tasks.map(lbl).join(', ')) : 'nothing'}${x.note ? ' · ' + esc(x.note) : ''}</span></div><span class="pill red">Stopped</span></button>`).join('')}</div>` : none('No abandoned jobs on ' + dShort(OPSB.day) + '.'))
  + `<div class="sec"><h3>Car condition per washer</h3></div>` + (cm.length ? `<div class="cardlist">${cm.map(x => `<div class="rowc plain"><div class="gr"><b>${esc(x.washer)}</b><span class="s">${x.total} cars</span></div><span class="pill">Light ${x.light}</span><span class="pill blue">Normal ${x.normal}</span><span class="pill ${x.heavy ? 'amber' : ''}">Heavy ${x.heavy}</span></div>`).join('')}</div>` : none('No condition recorded yet.'))
  + `<div class="sec"><h3>Issues by type</h3></div>` + (ic.length ? `<div class="cardlist">${ic.map(x => `<div class="rowc plain"><div class="gr"><b>${esc(x.label)}</b><span class="s">${x.cars.map(c => esc(c.car + ' (' + c.reg + ')')).join(', ')}</span></div><span class="pill amber">${x.cars.length}</span></div>`).join('')}</div>` : none('No issues reported.'))
  + `<div class="sec"><h3>Delay reasons</h3></div>` + (dl.length ? `<div class="cardlist">${dl.map(x => `<div class="rowc plain"><div class="gr"><b>${esc(x.car)} <small>${esc(x.reg || '')}</small></b><span class="s">${esc(x.washer)}</span><span class="s">${esc(x.reason)}</span></div></div>`).join('')}</div>` : none('No delay reasons.'))
  + `<div class="sec"><h3>Damage notes</h3></div>` + (dm.length ? `<div class="cardlist">${dm.map(x => `<div class="rowc plain" style="align-items:flex-start"><div class="gr"><b>${esc(x.car)} <small>${esc(x.reg || '')}</small></b><span class="s">${esc(x.washer)}</span><span class="s">${esc(x.note)}</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${x.photos.filter(p => safeSrc(p.src)).map(p => `<img src="${esc(p.src)}" alt="Issue photo" data-act="zoom" data-src="${esc(p.src)}" loading="lazy" style="width:72px;height:72px;object-fit:cover;border-radius:10px;cursor:pointer">`).join('')}</div></div></div>`).join('')}</div>` : none('No damage notes.'));
}
const ROUNDS = { mgr: mgrView, board: boardView, att: attView, skips: skipView, int: intView, earn: earnView, fb: fbView };
function washSheet(el) {
  const w = OPSB.S.washes[UI.sheet.id]; if (!w) return setHTML(R('sum', el), empty('This wash is gone.'));
  const ph = OPSB.photos(w).filter(p => safeSrc(p.src)), grp = (title, list) => list.length ? `<div class="sh-sec">${title}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${list.map(p => `<figure style="margin:0;width:104px"><img src="${esc(p.src)}" alt="${esc(title)}" data-act="zoom" data-src="${esc(p.src)}" loading="lazy" style="width:104px;height:104px;object-fit:cover;border-radius:12px;cursor:pointer"><figcaption style="font-size:11px;color:var(--grey)">${p.spot ? esc(SPOTS[p.spot] || lbl(p.spot)) + ' · ' : ''}${esc(OPS.fmtTime(p.at))}${p.pending_upload ? ' · uploading' : ''}</figcaption></figure>`).join('')}</div>` : '';
  const t = (k, l) => w[k] ? `<dt>${l}</dt><dd>${esc(OPS.fmtTime(w[k]))}</dd>` : '';
  setHTML(R('sum', el), `<div class="card"><b>${esc(w.car_label || w.reg)}</b> <small>${esc(w.reg || '')}</small> <span class="pill ${WCLS[w.status] || ''}">${WSTATUS[w.status] || esc(w.status || '')}</span>${OPSB.isLate(w) ? ' <span class="pill red">Late</span>' : ''}
    <dl class="kv">${t('on_the_way_at', 'On the way')}${t('arrived_at', 'Arrived')}${t('started_at', 'Started')}${t('finished_at', 'Finished')}${w.skip_reason ? `<dt>Skipped because</dt><dd>${esc(w.skip_reason)}</dd>` : ''}${w.washer_note ? `<dt>Washer note</dt><dd>${esc(w.washer_note)}</dd>` : ''}${w.interior_carried_to ? `<dt>Interior</dt><dd>Carried to ${esc(dShort(w.interior_carried_to))}</dd>` : ''}${w.carried_from ? `<dt>Carried from</dt><dd>Sunday ${esc(dShort(w.carried_from))}</dd>` : ''}</dl></div>`
    + (ph.length ? grp('Before', ph.filter(p => p.kind === 'before')) + grp('After', ph.filter(p => p.kind === 'after')) + grp('Inside (Sunday spots)', ph.filter(p => p.kind === 'inside')) + grp('Issue', ph.filter(p => p.kind === 'issue')) : empty('No photos on this wash.')));
}

/* ---------------- sections ---------------- */
const SECS = {
  live: {
    title: 'Live',
    build: () => `<div class="kpis" data-r="kpis"></div><div class="live-grid">
      <section aria-label="Needs a washer"><div class="sec"><h3>Needs a washer</h3><span class="count" data-r="nc">0</span></div><div class="cardlist" data-r="needs"></div></section>
      <section aria-label="In progress"><div class="sec"><h3>In progress</h3><span class="count" data-r="pc">0</span></div><div class="cardlist" data-r="prog"></div></section>
      <section class="live-map" aria-label="Live map"><div class="sec"><h3>Live map</h3><button class="btn sm ghost" type="button" data-act="fit">Fit all</button></div><div class="mapbox" data-r="map"></div>${legend}</section></div>`,
    init(m) { UI.map = mkMap(R('map', m), pickPoint) },
    update(m = $('#main')) {
      const k = OPS.kpis(), K = (v, l, c = '') => `<div class="kpi ${c}"><b>${v}</b><span>${l}</span></div>`;
      setHTML(R('kpis', m), K(k.unassigned, 'Unassigned', k.unassigned ? 'red' : '') + K(k.active, 'Active jobs') + K(k.doneToday, 'Done today') + K(OPS.rs(k.paidToday), 'Paid today') + K(`${k.washersOnline}/${k.washers}`, 'Washers online') + K(`${k.roundDone}/${k.roundTotal}`, 'Monthly round done'));
      const un = OPS.jobs({ stage: 'unassigned' }).sort((a, b) => (b.late - a.late) || a.at - b.at);
      const pr = OPS.jobs({ stage: 'open' }).filter(j => j.stage !== 'unassigned');
      setHTML(R('nc', m), String(un.length)); R('nc', m).classList.toggle('red', un.some(j => j.late));
      setHTML(R('pc', m), String(pr.length));
      setHTML(R('needs', m), un.length ? un.map(jobCard).join('') : empty(loading() ? 'Loading…' : 'All bookings have a washer.'));
      setHTML(R('prog', m), pr.length ? pr.map(jobCard).join('') : empty(loading() ? 'Loading…' : 'Nothing in progress right now.'));
      updateMap(UI.map);
    },
  },
  bookings: {
    title: 'Bookings',
    build: () => `<div class="page-h"><h2>Bookings</h2></div><div class="seg" role="tablist" data-r="tabs"></div><div class="chips" data-r="chips"></div>
      <input class="field search" id="bkQ" type="search" placeholder="Search name, phone, car, area, washer" aria-label="Search bookings" value="${esc(UI.bk.q)}"><div data-r="list"></div>`,
    update(m = $('#main')) {
      const B = UI.bk, kind = B.tab, all = OPS.jobs({ kind });
      const cnt = { open: all.filter(j => j.open).length, done: all.filter(j => j.stage === 'done').length, cancelled: all.filter(j => j.stage === 'cancelled').length, all: all.length };
      setHTML(R('tabs', m), [['instant', 'One-time (instant)'], ['scheduled', 'Scheduled']].map(([v, l]) => `<button type="button" role="tab" aria-selected="${B.tab === v}" class="${B.tab === v ? 'on' : ''}" data-act="tab" data-v="${v}">${l}</button>`).join(''));
      setHTML(R('chips', m), [['open', 'Open'], ['done', 'Done'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([v, l]) => `<button type="button" class="chip ${B.chip === v ? 'on' : ''}" aria-pressed="${B.chip === v}" data-act="chip" data-g="bk" data-s="bookings" data-v="${v}">${l} <small>${cnt[v]}</small></button>`).join(''));
      const list = OPS.jobs({ kind, stage: B.chip === 'open' ? 'open' : B.chip === 'all' ? '' : B.chip, q: B.q.trim() });
      let h = '';
      if (!list.length) h = empty(loading() ? 'Loading…' : B.q ? 'No bookings match that search.' : 'No ' + (B.chip === 'all' ? '' : B.chip + ' ') + (kind === 'instant' ? 'one-time' : 'scheduled') + ' bookings.');
      else if (kind === 'scheduled') {
        const by = {}; list.forEach(j => (by[j.date] = by[j.date] || []).push(j));
        const days = Object.keys(by).sort(), asc = B.chip === 'open'; if (!asc) days.reverse();
        h = days.map(d => `<div class="group-h">${esc(dayLabel(d))}<span class="count">${by[d].length}</span></div><div class="cardlist">${by[d].sort((a, b) => String(a.slot).localeCompare(String(b.slot))).map(jobRow).join('')}</div>`).join('');
      } else h = `<div class="cardlist">${list.map(jobRow).join('')}</div>`;
      setHTML(R('list', m), h);
    },
  },
  monthly: {
    title: 'Monthly',
    build: () => `<div class="page-h"><h2>Monthly customers</h2></div><div class="note">Plans, cars and paid-till dates still come from the <a href="../">approvals page</a> and the Notion book.</div><div class="chips" data-r="chips"></div><div class="grid2 g3" data-r="list"></div>`,
    update(m = $('#main')) {
      const all = OPS.monthly(), f = {
        active: c => c.status === 'active', new: c => c.status === 'new',
        due: c => c.status === 'active' && c.next && c.next.left >= 0 && c.next.left <= 7, over: c => c.status === 'active' && c.next && c.next.left < 0,
      };
      const chips = [['active', 'Active'], ['new', 'New sign-ups'], ['due', 'Due soon'], ['over', 'Overdue']];
      setHTML(R('chips', m), chips.map(([v, l]) => `<button type="button" class="chip ${UI.mo.chip === v ? 'on' : ''}" aria-pressed="${UI.mo.chip === v}" data-act="chip" data-g="mo" data-s="monthly" data-v="${v}">${l} <small>${all.filter(f[v]).length}</small></button>`).join(''));
      const list = all.filter(f[UI.mo.chip]);
      setHTML(R('list', m), list.length ? list.map(c => {
        const plans = [...new Set(c.cars.map(x => x.planName))].join(', ');
        return `<div class="wc" role="button" tabindex="0" data-act="monthly" data-phone="${esc(c.phone)}"><div class="wc-h">${avatar('', c.name)}<div class="gr"><b>${esc(c.name)}</b><small>${esc(c.area) || esc(nice(c.phone))}</small></div>${c.next && c.next.left != null ? leftPill(c.next.left) : ''}</div>
          <div class="m2" style="display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:var(--ink2)"><span><b>${c.cars.length}</b> car${c.cars.length === 1 ? '' : 's'}</span><span>${esc(plans) || 'No plan yet'}</span><span><b>${OPS.rs(c.monthlyTotal)}</b>/month</span></div>
          <div class="m2" style="display:flex;gap:6px 14px;flex-wrap:wrap;margin-top:4px;font-size:12.5px;color:var(--grey)"><span>${c.next && c.next.till ? 'Paid till ' + esc(dMed(c.next.till)) : 'Not started'}</span>${c.next && c.next.washer ? `<span>Washer: ${esc(c.next.washer)}</span>` : ''}</div></div>`;
      }).join('') : empty(OPS.S.loaded.customers ? 'No customers in this list.' : 'Loading…'));
    },
  },
  payments: {
    title: 'Payments',
    build: () => `<div class="page-h"><h2>Payments</h2></div><div class="sec"><h3>Upcoming</h3><span class="sub">next 14 days</span></div><div class="cardlist" data-r="dues"></div>
      <div class="sec" style="margin-top:28px"><h3>Recent</h3></div><div class="kpis" style="grid-template-columns:repeat(2,1fr)" data-r="tot"></div><div class="chips" data-r="chips"></div><div class="cardlist" data-r="recent"></div>`,
    update(m = $('#main')) {
      const dues = OPS.dues(14);
      setHTML(R('dues', m), dues.length ? dues.map(d => {
        const text = d.kind === 'monthly' ? `Namaste ${d.name}, your Washing Daddy plan (${d.what}) ${d.overdue ? 'ended' : 'ends'} soon. Renew here: https://washingdaddy.com/pay/` : `Namaste ${d.name}, your Washing Daddy booking for ${d.what} on ${dMed(d.due)} is awaiting payment of ${OPS.rs(d.amount)}. Pay here: https://washingdaddy.com/pay/`;
        const whenTxt = d.kind === 'monthly' ? (d.overdue ? `Overdue ${-d.left} day${d.left === -1 ? '' : 's'}` : d.left <= 0 ? 'Due today' : `Due ${dayLabel(d.due)}`) : `For ${dayLabel(d.due)}`;
        return `<div class="rowc ${d.jobId ? '' : 'plain'}" ${d.jobId ? `role="button" tabindex="0" data-act="job" data-id="${esc(d.jobId)}"` : ''} style="${d.overdue ? 'box-shadow:inset 4px 0 0 var(--red),var(--sh-card)' : ''}">
          <span class="avatar sm" style="background:${d.kind === 'monthly' ? 'var(--violet)' : '#0e7490'}" title="${d.kind === 'monthly' ? 'Monthly plan' : 'Booking'}">${ic(d.kind === 'monthly' ? 'users' : 'wash', 18)}</span>
          <div class="gr"><b>${esc(d.name)}</b><span class="s">${esc(d.what)}</span><div class="mini"><span class="pill ${d.overdue ? 'red' : d.left <= 3 ? 'amber' : 'blue'}">${esc(whenTxt)}</span><span class="pill">${d.kind === 'monthly' ? 'Monthly plan' : 'Booking'}</span></div></div>
          <div class="r"><b>${OPS.rs(d.amount)}</b>${dig(d.phone) ? `<div><a class="btn sm wa" style="margin-top:6px" href="${wa(d.phone, text)}" target="_blank" rel="noopener" aria-label="WhatsApp reminder to ${esc(d.name)}">${ic('chat', 16)}Remind</a></div>` : ''}</div></div>`;
      }).join('') : empty(OPS.S.loaded.customers ? 'Nothing due in the next 14 days.' : 'Loading…'));
      const k = OPS.kpis(); setHTML(R('tot', m), `<div class="kpi"><b>${OPS.rs(k.paidToday)}</b><span>Paid today</span></div><div class="kpi"><b>${OPS.rs(k.paidWeek)}</b><span>Paid, last 7 days</span></div>`);
      const all = OPS.payments(), P = UI.pay, f = { paid: p => p.status === 'paid', other: p => p.status !== 'paid', all: () => true };
      setHTML(R('chips', m), [['paid', 'Paid'], ['other', 'Failed or pending'], ['all', 'All']].map(([v, l]) => `<button type="button" class="chip ${P.chip === v ? 'on' : ''}" aria-pressed="${P.chip === v}" data-act="chip" data-g="pay" data-s="payments" data-v="${v}">${l} <small>${all.filter(f[v]).length}</small></button>`).join(''));
      const list = all.filter(f[P.chip]).slice(0, 80);
      setHTML(R('recent', m), list.length ? list.map(p => {
        const link = p.bookingId && OPS.S.jobs[p.bookingId], cls = p.status === 'paid' ? 'green' : /fail|declin/.test(p.status) ? 'red' : /refund/.test(p.status) ? 'blue' : 'amber';
        return `<div class="rowc ${link ? '' : 'plain'}" ${link ? `role="button" tabindex="0" data-act="job" data-id="${esc(p.bookingId)}"` : ''}><div class="gr"><b>${esc(p.what)}</b><span class="s">${esc(p.name || nice(p.phone) || 'Unknown')}${p.name && p.phone ? ' · ' + esc(nice(p.phone)) : ''}</span>
          <div class="mini">${p.gateway ? `<span class="pill ${p.gateway === 'cashfree' ? 'amber' : 'blue'}">${p.gateway === 'cashfree' ? 'Cashfree' : p.gateway === 'razorpay' ? 'Razorpay' : esc(p.gateway)}</span>` : ''}<span class="pill ${cls}">${esc(p.status)}</span><span class="s">${esc(whenTs(p.at))}</span></div></div><div class="r"><b>${OPS.rs(p.amount)}</b></div></div>`;
      }).join('') : empty(OPS.S.loaded.payorders ? 'No payments in this list.' : 'Loading…'));
    },
  },
  washers: {
    title: 'Washers',
    build: () => `<div class="page-h"><h2>Washers</h2><button class="btn go" type="button" data-act="addwasher">${ic('plus', 18)}Add washer</button></div><div class="grid2 g3" data-r="list"></div>`,
    update(m = $('#main')) {
      const ws = OPS.washers();
      setHTML(R('list', m), ws.length ? ws.map(w => {
        const live = w.loc && w.loc.fresh, aj = w.active;
        return `<div class="wc" role="button" tabindex="0" data-act="washer" data-phone="${esc(w.phone)}" aria-label="Open washer ${esc(w.name)}"><div class="wc-h">${avatar(w.photo, w.name)}<div class="gr"><b>${esc(w.name)}</b><small>${w.round ? 'Round ' + esc(w.round) : 'No round id'}${w.area ? ' · ' + esc(w.area) : ''}</small></div>${statusPill(w)}</div>
          <div class="act"><span class="dot ${live ? 'live' : ''}" title="${live ? 'Live location' : 'Not live'}"></span><span>${esc(w.activity.text)}${w.loc ? `<br><small style="color:var(--grey)">Last seen ${esc(OPS.ago(w.loc.at))}</small>` : ''}</span></div>
          <div class="nums"><span><b>${w.doneToday}</b> done today</span><span><b>${w.queued.length}</b> queued</span>${aj ? `<button type="button" class="linkb" data-act="job" data-id="${esc(aj.id)}">Current job: ${esc(aj.car || aj.service)}</button>` : ''}</div>
          ${w.status === 'pending' ? `<div class="btns"><button class="btn sm go" type="button" data-act="approve" data-phone="${esc(w.phone)}">Approve</button></div>` : ''}</div>`;
      }).join('') : empty(OPS.S.loaded.washers ? 'No washers yet. Add the first one.' : 'Loading…'));
    },
  },
  rounds: {
    title: 'Rounds',
    build: () => `<div class="page-h"><h2>Rounds</h2><div class="btns" style="margin:0"><button class="btn sm ghost" type="button" data-act="rday" data-d="-1" aria-label="Previous day">&lsaquo;</button><input class="field" type="date" id="rDay" style="width:auto;min-height:40px" aria-label="Day"><button class="btn sm ghost" type="button" data-act="rday" data-d="1" aria-label="Next day">&rsaquo;</button></div></div>
      <div class="seg" role="tablist" data-r="rtabs"></div><div data-r="rbody"></div>`,
    init() { const d = $('#rDay'); d.value = OPSB.day; d.onchange = () => d.value && OPSB.setDay(d.value) },
    update(m = $('#main')) {
      const T = [['board', 'Board'], ['mgr', 'Issues'], ['att', 'Attendance'], ['skips', 'Skips'], ['int', 'Interiors'], ['earn', 'Earnings'], ['fb', 'Low ratings']];
      setHTML(R('rtabs', m), T.map(([v, l]) => `<button type="button" role="tab" aria-selected="${UI.rd.tab === v}" class="${UI.rd.tab === v ? 'on' : ''}" data-act="rtab" data-v="${v}">${l}</button>`).join(''));
      const d = $('#rDay', m); if (d && document.activeElement !== d && d.value !== OPSB.day) d.value = OPSB.day;
      setHTML(R('rbody', m), ROUNDS[UI.rd.tab]());
    },
  },
  map: {
    title: 'Map',
    build: () => `<div class="page-h"><h2>Map</h2><button class="btn sm ghost" type="button" data-act="fit">Fit all</button></div><div class="map-wrap"><div><div class="mapbox tall" data-r="map"></div>${legend}</div><div class="map-side"><div class="sec"><h3>Washers</h3></div><div class="cardlist" data-r="ws"></div><div class="sec"><h3>Open jobs</h3></div><div class="cardlist" data-r="js"></div></div></div>`,
    init(m) { UI.map = mkMap(R('map', m), pickPoint) },
    update(m = $('#main')) {
      setHTML(R('ws', m), OPS.washers().filter(w => w.status === 'approved').map(w => `<button class="rowc" type="button" data-act="washer" data-phone="${esc(w.phone)}">${avatar(w.photo, w.name, 'sm')}<div class="gr"><b>${esc(w.name)}</b><span class="s">${esc(w.activity.text)}</span></div><span class="dot ${w.loc && w.loc.fresh ? 'live' : ''}" style="background:${w.loc ? KIND_COL[w.activity.kind] : '#9ca3af'}"></span></button>`).join('') || empty('No approved washers yet.'));
      const js = OPS.jobs({ stage: 'open' });
      setHTML(R('js', m), js.length ? js.map(j => `<button class="rowc" type="button" data-act="job" data-id="${esc(j.id)}"><div class="gr"><b>${esc(j.service)}</b><span class="s">${esc(j.address || j.car)}</span></div>${stagePill(j)}</button>`).join('') : empty('No open jobs.'));
      updateMap(UI.map);
    },
  },
};
const NAV = [['live', 'Live', 'live'], ['bookings', 'Bookings', 'list'], ['monthly', 'Monthly', 'users'], ['payments', 'Payments', 'card'], ['washers', 'Washers', 'wash'], ['rounds', 'Rounds', 'list'], ['map', 'Map', 'map']];

function goto(sec, noHash) {
  if (!SECS[sec]) sec = 'live';
  if (UI.map) { UI.map.destroy(); UI.map = null }
  closeSheet(true); UI.sec = sec;
  const m = $('#main'); m.innerHTML = SECS[sec].build(); m._h = null; Object.assign(m, { _h: null });
  if (SECS[sec].init) SECS[sec].init(m);
  SECS[sec].update(m);
  window.scrollTo(0, 0); if (!noHash) tryLS(() => history.replaceState(null, '', location.search + '#' + sec));
  nav();
}
function nav() {
  const un = OPS.S.loaded.jobs ? OPS.kpis().unassigned : 0;
  setHTML($('#bar'), `<div class="bar-brand"><div class="logo">${ic('drop', 20)}</div>WD Operations</div>` + NAV.map(([id, l, i]) => `<button type="button" class="${UI.sec === id ? 'on' : ''}" data-act="sec" data-s="${id}" ${UI.sec === id ? 'aria-current="page"' : ''} aria-label="${l}${id === 'live' && un ? ', ' + un + ' unassigned' : ''}">${ic(i, 22)}<span>${l}</span>${id === 'live' && un ? `<span class="nb">${un}</span>` : ''}</button>`).join(''));
}
function head() {
  const st = $('#status'), off = !DEMO && !OPS.S.online;
  st.className = 'status ' + (DEMO ? 'demo' : off ? 'off' : ''); $('span', st).textContent = DEMO ? 'Demo' : off ? 'Offline' : 'Live';
  setHTML($('#bSound'), `${ic(UI.sound ? 'vol' : 'mute', 16)}${UI.sound ? 'Sound on' : 'Sound off'}`);
  $('#bSound').setAttribute('aria-pressed', String(UI.sound)); $('#bSound').dataset.act = 'sound';
  const np = window.Notification ? Notification.permission : 'unsupported', nb = $('#bNotif');
  const L = (l, sm) => `<span class="lg">${l}</span><span class="sm">${sm}</span>`;
  setHTML(nb, `${ic('bell', 16)}${np === 'granted' ? L('Notifications on', 'Alerts on') : np === 'denied' ? L('Notifications blocked', 'Alerts blocked') : np === 'unsupported' ? L('No notifications', 'No alerts') : L('Enable notifications', 'Notify')}`);
  nb.dataset.act = 'notif'; nb.disabled = np !== 'default';
}
function render() {
  try { head() } catch (e) { console.error(e) }
  try { watchNew() } catch (e) { console.error(e) }
  try { nav() } catch (e) { console.error(e) }
  try { SECS[UI.sec].update() } catch (e) { console.error(e) }
  try { if (UI.sheet && SH[UI.sheet.kind]) SH[UI.sheet.kind].update($('#sheet')) } catch (e) { console.error(e) }
}

/* ---------------- sign in ---------------- */
function showGate(msg) {
  $('#app').hidden = true; $('#gate').hidden = false;
  $('#gateBox').innerHTML = `<div class="gate-logo">${ic('drop', 26)}</div><h1>WD Operations</h1><p>Owner sign-in. We will text a 6-digit code.</p>
   <div class="ph"><span class="cc">+91</span><input class="field" id="gPh" inputmode="numeric" autocomplete="tel-national" maxlength="11" placeholder="98765 43210" aria-label="Mobile number"></div><div class="err" id="gErr" role="alert">${esc(msg || '')}</div><button class="btn go wide" id="gGo">Send code</button>`;
  const ph = $('#gPh'); ph.onkeydown = e => { if (e.key === 'Enter') $('#gGo').click() };
  $('#gGo').onclick = async () => {
    const d = ph.value.replace(/\D/g, '').slice(-10); if (!/^[6-9]\d{9}$/.test(d)) { $('#gErr').textContent = 'Enter a 10-digit mobile number.'; return }
    const b = $('#gGo'); b.disabled = true; b.textContent = 'Sending…';
    try { await WDAuth.send(d); gateCode(d) } catch (e) { console.warn(e); b.disabled = false; b.textContent = 'Send code'; $('#gErr').textContent = (e && e.en) || "Couldn't send the code. Try again." }
  };
}
function gateCode(d) {
  $('#gateBox').innerHTML = `<div class="gate-logo">${ic('lock', 24)}</div><h1>Enter code</h1><p>Sent to ${esc(nice(d))}. <button class="linkbtn" id="gBack">Change</button></p>
   <input class="field" id="gOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" style="text-align:center;letter-spacing:.4em;font-size:20px;font-weight:600" aria-label="6-digit code"><div class="err" id="gErr" role="alert"></div><button class="btn go wide" id="gOk">Sign in</button>`;
  const o = $('#gOtp'); o.focus(); o.oninput = () => { o.value = o.value.replace(/\D/g, '').slice(0, 6); if (o.value.length === 6) $('#gOk').click() };
  $('#gBack').onclick = () => showGate();
  $('#gOk').onclick = async () => { const b = $('#gOk'); if (b.disabled) return; b.disabled = true; b.textContent = 'Checking…'; try { await WDAuth.confirm(o.value); signedIn(WDAuth.user()) } catch (e) { b.disabled = false; b.textContent = 'Sign in'; $('#gErr').textContent = (e && e.en) || "That code didn't work."; o.value = ''; o.focus() } };
}
let started = false;
async function signedIn(u) {
  if (!u) return showGate();
  try { await OPS.start() } catch (e) {
    console.warn(e); try { OPS.stop && OPS.stop() } catch (x) {} try { WDAuth.signOut() } catch (x) {}
    return showGate(e && e.owner === false ? `${nice(u.phoneNumber || (WDAuth.phone && WDAuth.phone()))} is not an owner number.` : e && e.nodb ? "Couldn't connect. Check the internet." : "Couldn't load. Check the internet and sign in again.");
  }
  try { OPSB.start(); OPSB.on(() => { if (UI.sec === 'rounds') SECS.rounds.update(); if (UI.sheet && UI.sheet.kind === 'wash') SH.wash.update($('#sheet')) }) } catch (e) { console.warn(e) }
  $('#who').textContent = nice(u.phoneNumber); $('#gate').hidden = true; show();
}
function show() {
  $('#app').hidden = false; $('#demoBar').hidden = !DEMO;
  if (!started) { started = true; OPS.on(render); }
  const h = location.hash.slice(1); goto(SECS[h] ? h : 'live', true); render();
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s) }) }
async function boot() {
  $('#hLogo').innerHTML = ic('drop', 22);
  if (DEMO) $('#bBack').href = '../app/?demo=1';
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (SECS[h] && h !== UI.sec && !$('#app').hidden) goto(h, true) });
  if (DEMO) { OPS.demo(); return show() }
  try { await loadScript('../wd-sync.js') } catch (e) { return showGate("Couldn't load. Check the internet.") }
  WDAuth.ready().then(signedIn);
}
boot();
})();
