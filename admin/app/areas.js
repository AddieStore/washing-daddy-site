/* Service areas editor (Settings -> Service areas). Circles on a map: drag the violet centre to move an area, set its radius with the
   slider, name it, add or remove areas, Save. Saved to appcfg/customer.areas = [{ id, name, lat, lng, r }] (r in metres).
   The customer app follows it live (data/areas.ts): areas show on the address map, outside them Home shows "We are currently not
   available in this area" with Notify me, and nothing can be booked or paid. Workflow 13 checks bookings against the same list.
   Uses the dashboard's helpers from app.js (window.WDCTL). Leaflet loads on first open. */
(function () {
  // the dashboard's helpers (app.js exposes them as window.WDCTL); looked up at call time, app.js loads after this file
  const W = () => window.WDCTL;
  const G = p => W().G(p), snack = (...a) => W().snack(...a), esc = s => W().esc(s), ic = (...a) => W().ic(...a);
  const openSheet = o => W().openSheet(o), closeSheet = () => W().closeSheet();
  const D = { patch: (...a) => W().D.patch(...a) };
  const DEFAULT = [{ id: 'paschim-vihar', name: 'Paschim Vihar', lat: 28.6692, lng: 77.1006, r: 1300 }];
  const VIOLET = '#5409DA';
  let map = null, layers = {}, list = [], sel = null, dirty = false;

  const loadLeaflet = () => window.L ? Promise.resolve() : new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  const clean = v => (Array.isArray(v) ? v : []).filter(a => a && isFinite(+a.lat) && isFinite(+a.lng) && +a.r >= 100)
    .map((a, i) => ({ id: String(a.id || 'area-' + i), name: String(a.name || 'Service area'), lat: +a.lat, lng: +a.lng, r: Math.round(+a.r), paused: a.paused === true }));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'area';
  const km = r => (r / 1000).toFixed(r < 10000 ? 1 : 0) + ' km';

  function draw() {
    Object.values(layers).forEach(l => { map.removeLayer(l.c); map.removeLayer(l.m) }); layers = {};
    list.forEach(a => {
      const on = a.id === sel, op = a.paused ? 0.35 : 1;
      const c = L.circle([a.lat, a.lng], { radius: a.r, color: VIOLET, weight: on ? 2.5 : 1.5, opacity: 0.8 * op, fillColor: VIOLET, fillOpacity: (on ? 0.12 : 0.06) * op, dashArray: a.paused ? '6 6' : null }).addTo(map);
      const m = L.marker([a.lat, a.lng], { draggable: true, title: a.name, icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<div style="width:22px;height:22px;border-radius:11px;background:${VIOLET};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:grab"></div>` }) }).addTo(map);
      m.on('drag', e => { const p = e.target.getLatLng(); c.setLatLng(p) });
      m.on('dragend', e => { const p = e.target.getLatLng(); a.lat = +p.lat.toFixed(6); a.lng = +p.lng.toFixed(6); dirty = true; sel = a.id; rows() });
      c.on('click', () => { sel = a.id; draw(); rows() }); m.on('click', () => { sel = a.id; draw(); rows() });
      layers[a.id] = { c, m };
    });
  }
  function rows() {
    const box = document.getElementById('arRows'); if (!box) return;
    box.innerHTML = list.length ? list.map(a => `<div class="card" data-ar="${esc(a.id)}" style="margin:0 0 10px;padding:12px;border:1.5px solid ${a.id === sel ? VIOLET : 'transparent'}">
      <div style="display:flex;gap:8px;align-items:center"><input class="field" data-arf="name" value="${esc(a.name)}" aria-label="Area name" style="flex:1">
        <button class="ibtn flat press" data-ara="go" title="Show on map" aria-label="Show on map">${ic('pin', 18)}</button>
        <button class="ibtn flat press" data-ara="del" title="Remove" aria-label="Remove area" style="color:var(--red)">${ic('trash', 18)}</button></div>
      <label class="lbl" style="margin-top:10px">Radius <small>${km(a.r)} around the centre</small></label>
      <input type="range" min="300" max="10000" step="100" value="${a.r}" data-arf="r" style="width:100%;accent-color:${VIOLET}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="hint" style="margin:0">${a.lat.toFixed(5)}, ${a.lng.toFixed(5)} · drag the dot to move</span>
        <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--ink2)"><input type="checkbox" data-arf="paused" ${a.paused ? 'checked' : ''}> Paused</label></div></div>`).join('')
      : `<p class="hint">No areas yet. The app then uses the built-in Paschim Vihar circle. Tap Add area.</p>`;
    const f = document.getElementById('arSave'); if (f) f.disabled = !dirty;
  }
  function fit() {
    const live = list.filter(a => !a.paused), use = live.length ? live : list; if (!use.length) return;
    let b = null; use.forEach(a => { const bb = L.circle([a.lat, a.lng], { radius: a.r }).addTo(map).getBounds(); b = b ? b.extend(bb) : bb });
    map.eachLayer(l => { if (l instanceof L.Circle && !Object.values(layers).some(x => x.c === l)) map.removeLayer(l) });
    if (b) map.fitBounds(b, { padding: [30, 30] });
  }
  async function search(q) {
    if (!q || q.trim().length < 2) return;
    try {
      const c = map.getCenter(), r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=1&lang=en&lat=${c.lat}&lon=${c.lng}`), j = await r.json();
      const f = j.features && j.features[0]; if (!f) { snack('Place not found'); return }
      map.setView([f.geometry.coordinates[1], f.geometry.coordinates[0]], 14);
    } catch (e) { snack('Search is not reachable right now') }
  }
  async function save() {
    const out = list.map(a => ({ id: a.id, name: a.name.trim() || 'Service area', lat: a.lat, lng: a.lng, r: a.r, ...(a.paused ? { paused: true } : {}) }));
    if (out.length && !out.some(a => !a.paused)) { if (!confirm('Every area is paused. The app will then fall back to the built-in Paschim Vihar circle. Save anyway?')) return }
    const btn = document.getElementById('arSave'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…' }
    try { await D.patch('appcfg', 'customer', { areas: out }); dirty = false; snack(W().DEMO ? 'Saved (demo: not sent to the app)' : 'Saved. The app uses the new areas now.'); closeSheet(); W().rerender(true) }
    catch (e) { snack('Could not save: ' + ((e && e.message) || e)); if (btn) { btn.disabled = false; btn.textContent = 'Save areas' } }
  }

  async function open() {
    list = clean(G('areas')); if (!list.length) list = clean(DEFAULT); sel = list[0] && list[0].id; dirty = false;
    openSheet({ title: 'Service areas', cls: 'wide', onClose: () => { if (map) { map.remove(); map = null } layers = {} },
      body: `<p class="hint" style="margin:0 0 10px">Customers inside a circle can book and pay. Outside, the app shows "We are currently not available in this area" with a Notify me button, and blocks every booking and payment.</p>
        <div style="display:flex;gap:8px;margin-bottom:10px"><input class="field" id="arQ" placeholder="Find a place: society, sector, area" style="flex:1"><button class="btn soft press" id="arFind">Find</button></div>
        <div id="arMap" style="height:min(52vh,460px);border-radius:16px;overflow:hidden;background:#eef"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><b style="font-size:14px">Areas</b>
          <button class="btn soft press" id="arAdd" style="min-height:38px">${ic('plus', 16, 2)} Add area here</button></div>
        <div id="arRows"></div>`,
      footer: `<button class="btn press" data-a="close" style="flex:1;background:var(--tint)">Cancel</button><button class="btn go press" id="arSave" style="flex:2" disabled>Save areas</button>` });
    try { await loadLeaflet() } catch (e) { document.getElementById('arMap').innerHTML = '<p class="hint" style="padding:16px">The map could not load. Check the internet and open this again.</p>'; return }
    map = L.map('arMap', { zoomControl: true, attributionControl: true }).setView([list[0] ? list[0].lat : 28.6692, list[0] ? list[0].lng : 77.1006], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    draw(); rows(); setTimeout(() => { map.invalidateSize(); fit() }, 350);
    const box = document.getElementById('arRows'), mark = () => { dirty = true; const f = document.getElementById('arSave'); if (f) f.disabled = false };
    box.addEventListener('input', e => {
      const card = e.target.closest('[data-ar]'); if (!card) return; const a = list.find(x => x.id === card.dataset.ar), f = e.target.dataset.arf; if (!a || !f) return;
      if (f === 'name') a.name = e.target.value.slice(0, 60);
      if (f === 'r') { a.r = +e.target.value; const l = layers[a.id]; if (l) l.c.setRadius(a.r); const lb = card.querySelector('.lbl small'); if (lb) lb.textContent = km(a.r) + ' around the centre' }
      mark();
    });
    box.addEventListener('change', e => { const card = e.target.closest('[data-ar]'); if (!card || e.target.dataset.arf !== 'paused') return; const a = list.find(x => x.id === card.dataset.ar); if (a) { a.paused = e.target.checked; mark(); draw() } });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-ara]'), card = e.target.closest('[data-ar]'); if (!card) return; const a = list.find(x => x.id === card.dataset.ar); if (!a) return;
      if (!b) { if (sel !== a.id) { sel = a.id; draw(); rows() } return }
      if (b.dataset.ara === 'go') { sel = a.id; draw(); rows(); map.fitBounds(layers[a.id].c.getBounds(), { padding: [30, 30] }) }
      if (b.dataset.ara === 'del') { if (!confirm(`Remove ${a.name}? Customers there will see "not available" after you save.`)) return; list = list.filter(x => x !== a); sel = list[0] && list[0].id; mark(); draw(); rows() }
    });
    document.getElementById('arAdd').onclick = () => {
      const c = map.getCenter(), name = 'New area', base = slug(name); let id = base, n = 2; while (list.some(a => a.id === id)) id = base + '-' + (n++);
      list.push({ id, name, lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), r: 1500, paused: false }); sel = id; mark(); draw(); rows();
      const inp = document.querySelector(`[data-ar="${id}"] [data-arf="name"]`); if (inp) { inp.focus(); inp.select() }
    };
    document.getElementById('arFind').onclick = () => search(document.getElementById('arQ').value);
    document.getElementById('arQ').onkeydown = e => { if (e.key === 'Enter') search(e.target.value) };
    document.getElementById('arSave').onclick = save;
  }
  // the Settings card (app.js puts it in screenSettings)
  function card() {
    const a = clean(G('areas')), live = a.filter(x => !x.paused), shown = a.length ? live : clean(DEFAULT);
    return `<div class="card flush rise"><div class="ch-title"><b>Service areas</b><small>${a.length ? live.length + ' live' : 'built-in'}</small></div>
      <button class="trow tap press hov" data-a="areas"><div class="ico">${ic('pin', 18)}</div><div class="t"><b>${shown.map(x => esc(x.name) + ' · ' + km(x.r)).join(', ') || 'No live area'}</b>
      <small>Draw where you wash. Outside these circles the app says "not available yet", offers Notify me, and blocks booking and payment.</small></div></button></div>`;
  }
  window.WDAreas = { open, card };
})();
