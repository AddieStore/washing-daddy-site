/* WD HQ: the depot (an isometric yard where every building is a place you can work) around the two panels that already exist:
   WD Control (../app/: prices, services, offers, switches, content, fees) and WD Operations (../ops/: live desk, bookings, washers, map).
   They are shown inside this page (?embed=1 hides their own header and bar); the section list on the left is the navigation. */
(() => {
  'use strict';
  const DEMO = /[?&]demo=1/.test(location.search);
  const $ = (s, r = document) => r.querySelector(s);
  const IC = {
    shop: 'M4 9l1.5-5h13L20 9M4 9v10h16V9M4 9h16M9 19v-5h6v5', tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01', toggle: 'M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7zM17 12h.01',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7', sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', live: 'M3 12h4l2-6 4 12 2-6h6',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M16 4.2a3.5 3.5 0 0 1 0 6.6',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4', wash: 'M5 17a2.5 2.5 0 1 0 0 .01M19 17a2.5 2.5 0 1 0 0 .01M7.5 17H15l2-7h3M10 10h4M13 10l-1-4h3', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
    pin: 'M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5', home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6'
  };
  const ico = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;
  const CTL = h => '../app/?embed=1' + (DEMO ? '&demo=1' : '') + '#' + h, OPS = h => '../ops/?embed=1' + (DEMO ? '&demo=1' : '') + '#' + h;
  /* tags: c = customer app, w = website, p = WD Partner (washer) app */
  const SECS = [
    { id: 'catalog', g: 'Prices and what customers get', t: 'Services & prices', s: 'Wash prices, plans, packs, store items. Pause or go live.', i: 'shop', src: CTL('catalog'), tags: 'cw', d: 'Change a price or what a service includes and it changes in the customer app and, for the monthly plans, on the website. Set any item to Live, Paused or Hidden.' },
    { id: 'offers', g: 'Prices and what customers get', t: 'Offers & WD Pass', s: 'Coupons, passes and discounts.', i: 'tag', src: CTL('offers'), tags: 'c', d: 'Create coupons and the WD Pass, and switch them on or off.' },
    { id: 'switch', g: 'Prices and what customers get', t: 'Live switches', s: 'What the app shows right now.', i: 'toggle', src: CTL('switch'), tags: 'c', d: 'Turn whole parts of the customer app on or off: instant washes, scheduled washes, tabs, banners.' },
    { id: 'content', g: 'Prices and what customers get', t: 'App content & pages', s: 'Texts, buttons, help and legal pages.', i: 'doc', src: CTL('content'), tags: 'c', d: 'Edit the headlines, buttons, help topics and legal pages the customers read.' },
    { id: 'settings', g: 'Prices and what customers get', t: 'Fees, slots & areas', s: 'Fees, slots, service areas, washer pay share.', i: 'sliders', src: CTL('settings'), tags: 'cp', d: 'Fees and GST, time slots, the circles that decide where you operate, support contacts, and the share of each wash the washer earns (shown in the WD Partner app).' },
    { id: 'live', g: 'Washers and operations', t: 'Live desk', s: 'Everything happening right now.', i: 'live', src: OPS('live'), tags: 'p', d: 'New bookings, who is on the way, unassigned jobs.' },
    { id: 'bookings', g: 'Washers and operations', t: 'Bookings', s: 'Every instant and scheduled booking.', i: 'list', src: OPS('bookings'), tags: 'c', d: 'Search, assign a washer, follow a booking to the end.' },
    { id: 'monthly', g: 'Washers and operations', t: 'Monthly customers', s: 'Plans, dues and renewals.', i: 'users', src: OPS('monthly'), tags: 'c', d: 'Who is on which plan, who owes, who is about to expire.' },
    { id: 'washers', g: 'Washers and operations', t: 'Washers', s: 'Approvals, PINs and profiles.', i: 'wash', src: OPS('washers'), tags: 'p', d: 'Approve or block a washer, set a PIN, edit the profile customers see.' },
    { id: 'map', g: 'Washers and operations', t: 'Washer map', s: 'Where every washer is, live.', i: 'map', src: OPS('map'), tags: 'p', d: 'Washers share their location from the WD Partner app. Here they are on the map, with the jobs around them.' },
    { id: 'rounds', g: 'Washers and operations', t: 'Rounds & attendance', s: 'Cars done, late, check-in selfies.', i: 'pin', src: OPS('rounds'), tags: 'p', d: 'Each washer\'s morning round, check-in photo and T-shirt check, skipped cars, earnings and feedback.' },
    { id: 'payments', g: 'Washers and operations', t: 'Payments & payouts', s: 'Money in, washers paid.', i: 'card', src: OPS('payments'), tags: 'c', d: 'Payments received, what is due, and mark washer payouts as paid.' },
  ];
  const BY = Object.fromEntries(SECS.map(s => [s.id, s]));
  const TAG = { c: ['Customer app', ''], w: ['Website', 'w'], p: ['WD Partner app', 'p'] };

  /* ---------- isometric drawing ---------- */
  let OFF = [0, 0];
  const S = 46, OX = 560, OY = 150, sc = x => Math.round(x * 10) / 10;
  const P0 = (x, y, z) => [(x - y) * S * 0.866, (x + y) * S * 0.5 - z * S * 0.62];
  const P = (x, y, z) => { const [a, b] = P0(x + OFF[0], y + OFF[1], z); return [OX + a, OY + b] };
  const at = (dx, dy, fn) => { OFF = [dx, dy]; try { return fn() } finally { OFF = [0, 0] } };
  const pts = (f, arr) => arr.map(([x, y, z]) => f(x, y, z).map(sc).join(',')).join(' ');
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('') };
  /** an iso box: top, front-left and front-right faces */
  function box(x, y, z, w, d, h, c, o = {}) {
    const f = o.f || P, top = o.top || shade(c, 1.05), L = o.left || shade(c, 0.9), R = o.right || shade(c, 0.78);
    return `<polygon points="${pts(f, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${L}"/>` +
      `<polygon points="${pts(f, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}" fill="${R}"/>` +
      `<polygon points="${pts(f, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${top}"/>`;
  }
  /** a flat rectangle on a face: plane 'L' (front-left, y = const) or 'R' (front-right, x = const) */
  function patch(plane, a, b, z0, z1, fill, at, f = P) {
    return plane === 'L' ? `<polygon points="${pts(f, [[a, at, z0], [b, at, z0], [b, at, z1], [a, at, z1]])}" fill="${fill}"/>` : `<polygon points="${pts(f, [[at, a, z0], [at, b, z0], [at, b, z1], [at, a, z1]])}" fill="${fill}"/>`;
  }
  const NEU = '#E9E7F0', BLUE = '#3E6FA8', ORG = '#E8873A', TEAL = '#3A8F8A', VIO = '#5409DA', DARK = '#2B2540';
  const container = (x, y, z, c, w = 1.5, d = 0.62, h = 0.5) => box(x, y, z, w, d, h, c) + patch('L', x + 0.1, x + w - 0.1, z + 0.12, z + h - 0.12, shade(c, 0.7), y + d) ;
  const truck = (f, c = '#fff') => box(0, 0, 0.12, 1.1, 0.5, 0.5, c, { f }) + box(1.1, 0.05, 0.12, 0.4, 0.4, 0.34, '#EDEDF3', { f }) + patch('L', 1.14, 1.46, 0.28, 0.4, '#8FB4DA', 0.45, f) +
    [[0.25, 0.5], [0.95, 0.5], [1.3, 0.45]].map(([a, b]) => { const [X, Y] = f(a, b, 0.1); return `<circle cx="${sc(X)}" cy="${sc(Y)}" r="3.4" fill="#1B1730"/>` }).join('');
  const scooter = f => { const w = (a, b) => { const [X, Y] = f(a, b, 0.08); return `<circle cx="${sc(X)}" cy="${sc(Y)}" r="3.2" fill="#1B1730"/>` };
    return box(0.05, 0, 0.14, 0.6, 0.26, 0.18, VIO, { f }) + box(0.62, 0.02, 0.14, 0.12, 0.22, 0.42, VIO, { f }) + box(-0.2, -0.02, 0.32, 0.34, 0.3, 0.3, '#7A3BF0', { f }) + w(0.1, 0.28) + w(0.65, 0.26) };
  const tree = (x, y, s = 1) => { const [X, Y] = P(x, y, 0); return `<rect x="${sc(X - 1.6 * s)}" y="${sc(Y - 16 * s)}" width="${3.2 * s}" height="${16 * s}" fill="#8A6B4E"/><ellipse cx="${sc(X)}" cy="${sc(Y - 24 * s)}" rx="${13 * s}" ry="${15 * s}" fill="#7DA85A"/><ellipse cx="${sc(X - 4 * s)}" cy="${sc(Y - 28 * s)}" rx="${7 * s}" ry="${8 * s}" fill="#9BC174"/>` };

  /* tag (the label above a building): icon dot, title, small line */
  function tagOf(id, x, y, z) {
    const sec = BY[id], [X, Y] = P(x, y, z), w = Math.max(132, 22 + sec.t.length * 7.4), h = 44;
    return `<g class="tag" transform="translate(${sc(X - w / 2)},${sc(Y - 62)})"><rect width="${w}" height="${h}" rx="15" fill="#fff" stroke="#E5E2EE" filter="url(#sh)"/>` +
      `<circle cx="22" cy="22" r="13" fill="${VIO}"/><g transform="translate(14,14)" stroke="#fff" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[sec.i]}" transform="scale(.667)"/></g>` +
      `<text x="43" y="19" font-size="12.5" font-weight="700" fill="#141414">${sec.t}</text><text x="43" y="33" font-size="10" fill="#7A7A80">${sec.s.length > 30 ? sec.s.slice(0, 29) + '…' : sec.s}</text></g>` +
      `<path d="M${sc(X)} ${sc(Y - 18)} v10" stroke="#C9C4DA" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  }
  const bld = (id, inner, lx, ly, lz) => `<g class="bld" data-go="${id}" tabindex="0" role="button" aria-label="${BY[id].t}"><g class="lift">${inner}</g>${tagOf(id, lx, ly, lz)}</g>`;

  function depot() {
    const rd = (x0, y0, x1, y1) => `<polygon points="${pts(P, [[x0, y0, 0.01], [x1, y0, 0.01], [x1, y1, 0.01], [x0, y1, 0.01]])}" fill="#fff"/>`;
    const roads = [rd(0, 3.6, 14, 4.2), rd(0, 8.0, 14, 8.6), rd(4.7, 0, 5.2, 12.4), rd(9.3, 0, 9.8, 12.4),
    ].join('');
    const plate = `<polygon points="${pts(P, [[-0.4, 12.8, -0.28], [14.4, 12.8, -0.28], [14.4, -0.4, -0.28], [14.4, -0.4, 0], [14.4, 12.8, 0], [-0.4, 12.8, 0]])}" fill="#D9D6E4"/>` +
      `<polygon points="${pts(P, [[-0.4, -0.4, 0], [14.4, -0.4, 0], [14.4, 12.8, 0], [-0.4, 12.8, 0]])}" fill="#ECEAF3"/>` +
      `<polygon points="${pts(P, [[-0.4, 12.8, -0.28], [-0.4, 12.8, 0], [14.4, 12.8, 0], [14.4, 12.8, -0.28]])}" fill="#CFCBDD"/>`;
    // vehicles on the roads (animateMotion: a path in screen units; shapes are drawn around the origin)
    const path = (a, b, c, d) => { const p1 = P(a, b, 0), p2 = P(c, d, 0); return `M${sc(p1[0])},${sc(p1[1])} L${sc(p2[0])},${sc(p2[1])}` };
    const mover = (shape, p, dur, begin = 0, rev = false) => `<g>${shape}<animateMotion dur="${dur}s" begin="-${begin}s" repeatCount="indefinite" path="${p}" keyPoints="${rev ? '1;0' : '0;1'}" keyTimes="0;1" calcMode="linear"/></g>`;
    const vehicles = mover(truck(P0), path(-0.3, 3.9, 14.3, 3.9), 24, 3) + mover(truck(P0, '#F4F2FA'), path(14.3, 8.3, -0.3, 8.3), 28, 9, false) +
      mover(scooter(P0), path(4.95, -0.2, 4.95, 12.6), 19, 2) + mover(scooter(P0), path(9.55, 12.6, 9.55, -0.2), 23, 7);
    const parts = [];
    // back row: services warehouse, offers containers, switch tower
    parts.push(at(0, 0, () => [0.6 + 0.6, bld('catalog', box(0.6, 0.5, 0, 3.8, 2.4, 1.5, NEU, { top: '#F4F6FB' }) + box(0.6, 0.5, 1.5, 3.8, 2.4, 0.12, BLUE, { top: '#8FA9CF', left: '#46689C', right: '#385885' }) +
      [0.9, 1.75, 2.6].map(a => patch('L', a, a + 0.62, 0, 0.8, '#3A3452', 2.9)).join('') + patch('L', 0.6, 4.4, 1.12, 1.5, VIO, 2.9) + container(0.9, 3.0, 0, ORG, 1.3) + container(2.4, 3.0, 0, BLUE, 1.3), 2.5, 1.7, 1.62)]));
    parts.push(at(0.3, 0, () => [5.5 + 0.5, bld('offers', container(5.5, 0.6, 0, BLUE) + container(5.5, 1.5, 0, ORG) + container(7.1, 0.6, 0, TEAL) + container(7.1, 1.5, 0, BLUE) + container(5.9, 1.0, 0.5, TEAL, 1.2) + container(7.3, 1.1, 0.5, ORG, 1.2), 6.9, 1.4, 1.2)]));
    parts.push(at(1.0, 0, () => [9.4 + 1.0, bld('switch', box(9.3, 0.7, 0, 1.7, 1.7, 0.45, NEU) + box(9.85, 1.25, 0.45, 0.6, 0.6, 2.4, '#D9D6E4') + box(9.55, 0.95, 2.85, 1.2, 1.2, 0.55, '#C9D8EA', { top: '#EAF3FB', left: '#8FB4DA', right: '#6F97C2' }) +
      `<circle cx="${sc(P(10.15, 1.55, 3.7)[0])}" cy="${sc(P(10.15, 1.55, 3.7)[1])}" r="4" fill="#E8384F"><animate attributeName="opacity" values="1;.25;1" dur="1.4s" repeatCount="indefinite"/></circle>`, 10.15, 1.55, 3.3)]));
    // middle row: bookings dock, live desk, payments
    parts.push(at(0, 0.7, () => [0.8 + 4.0, bld('bookings', box(0.7, 4.2, 0, 3.0, 1.6, 0.95, NEU, { top: '#F4F6FB' }) + box(0.7, 4.2, 0.95, 3.0, 1.6, 0.1, TEAL, { top: '#8FC3BF', left: '#2F7570', right: '#276560' }) + [1.0, 2.0].map(a => patch('L', a, a + 0.6, 0, 0.6, '#3A3452', 5.8)).join(''), 2.2, 5.0, 1.15)]));
    parts.push(at(0.3, 0.7, () => [5.3 + 4.0, bld('live', box(5.3, 4.1, 0, 3.0, 2.0, 1.2, NEU, { top: '#F4F6FB' }) + box(5.3, 4.1, 1.2, 3.0, 2.0, 0.1, BLUE, { top: '#8FA9CF', left: '#46689C', right: '#385885' }) + patch('L', 5.5, 8.1, 0.7, 1.0, VIO, 6.1) +
      box(5.4, 6.2, 0.02, 2.8, 0.34, 0.12, '#4A4560') + [0, 1, 2].map(i => `<rect width="9" height="7" rx="1.5" fill="#D9A877"><animateTransform attributeName="transform" type="translate" values="${sc(P(5.5, 6.35, 0.25)[0])} ${sc(P(5.5, 6.35, 0.25)[1])};${sc(P(8.0, 6.35, 0.25)[0])} ${sc(P(8.0, 6.35, 0.25)[1])}" dur="6s" begin="-${i * 2}s" repeatCount="indefinite"/></rect>`).join(''), 6.8, 5.1, 1.35)]));
    parts.push(at(0.8, 0.7, () => [9.4 + 4.0, bld('payments', box(9.4, 4.2, 0, 2.5, 1.8, 1.55, '#EFE9FB', { top: '#FAF7FF' }) + box(9.4, 4.2, 1.55, 2.5, 1.8, 0.12, VIO, { top: '#9B6BF0', left: '#4A0AC4', right: '#3A08A0' }) + [9.7, 10.3, 10.9, 11.4].map(a => patch('L', a, a + 0.2, 0.15, 1.35, '#fff', 6.0)).join(''), 10.6, 5.1, 1.7)]));
    // front row: content office, washers garage, rounds yard, settings gate
    parts.push(at(0, 2.1, () => [0.6 + 7.2, bld('content', box(0.6, 7.2, 0, 2.2, 1.6, 0.95, NEU, { top: '#F4F6FB' }) + box(0.6, 7.2, 0.95, 2.2, 1.6, 0.1, ORG, { top: '#F2B27E', left: '#C96F2B', right: '#A85B22' }) + patch('L', 0.9, 1.6, 0.2, 0.7, '#9CC3E6', 8.8) + patch('L', 1.8, 2.5, 0.2, 0.7, '#9CC3E6', 8.8), 1.6, 8.0, 1.1)]));
    parts.push(at(0.5, 2.1, () => [3.7 + 7.2, bld('washers', box(3.7, 7.1, 0, 3.4, 1.7, 0.95, NEU, { top: '#F4F6FB' }) + box(3.7, 7.1, 0.95, 3.4, 1.7, 0.1, VIO, { top: '#9B6BF0', left: '#4A0AC4', right: '#3A08A0' }) + [4.0, 4.9, 5.8].map(a => patch('L', a, a + 0.7, 0, 0.62, '#3A3452', 8.8)).join('') +
      [4.1, 5.0, 5.9].map(a => `<g transform="translate(${sc(P(a, 9.4, 0)[0])},${sc(P(a, 9.4, 0)[1])})">${scooter(P0)}</g>`).join(''), 5.3, 8.0, 1.15)]));
    parts.push(at(1.0, 2.1, () => [7.7 + 7.2, bld('rounds', box(7.6, 7.3, 0, 2.3, 1.9, 0.1, '#DFDCEA') + [[7.8, 7.5, BLUE], [8.5, 7.5, ORG], [9.2, 7.5, TEAL], [7.8, 8.4, TEAL], [8.5, 8.4, BLUE], [9.2, 8.4, ORG]].map(([a, b, c]) => box(a, b, 0.1, 0.55, 0.7, 0.05, c)).join('') +
      [[7.7, 7.2], [9.8, 7.2]].map(([a, b]) => box(a, b, 0.1, 0.06, 0.06, 0.9, DARK) + box(a + 0.06, b, 0.75, 0.4, 0.04, 0.22, ORG)).join(''), 8.7, 8.2, 1.2)]));
    parts.push(at(1.5, 2.1, () => [10.6 + 7.4, bld('settings', box(10.5, 7.3, 0, 1.5, 1.3, 0.85, NEU, { top: '#F4F6FB' }) + box(10.5, 7.3, 0.85, 1.5, 1.3, 0.1, DARK, { top: '#6A6485', left: '#3A3452', right: '#2B2540' }) + box(10.2, 8.7, 0.5, 2.0, 0.07, 0.07, '#E8384F') + patch('L', 10.7, 11.5, 0.2, 0.6, '#9CC3E6', 8.6), 11.2, 8.2, 1.0)]));
    parts.sort((a, b) => a[0] - b[0]);
    const trees = [[-0.1, 0.1], [14.1, 0.2], [-0.1, 6.0], [14.1, 6.4], [5.0, 12.5], [9.6, 12.5], [-0.1, 12.5], [14.1, 12.5], [2.6, 3.9], [12.2, 8.3]].map(([a, b]) => tree(a, b, 0.9)).join('');
    return `<svg viewBox="0 0 1180 800" role="img" aria-label="The Washing Daddy depot: tap a building"><defs><filter id="sh" x="-20%" y="-30%" width="140%" height="190%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#1A1033" flood-opacity=".14"/></filter></defs>` +
      plate + roads + `<g opacity=".95">${vehicles}</g>` + parts.map(p => p[1]).join('') + trees + `</svg>`;
  }

  /* ---------- shell ---------- */
  function buildRail() {
    let h = `<button class="ri home" data-go="" type="button"><span class="ico">${ico('home')}</span><span><b>Dashboard</b><small>Today's numbers and switches</small></span></button>`, g = '';
    SECS.forEach(s => { if (s.g !== g) { g = s.g; h += `<h4>${g}</h4>` } h += `<button class="ri" data-go="${s.id}" type="button"><span class="ico">${ico(s.i)}</span><span><b>${s.t}</b><small>${s.s}</small></span></button>` });
    $('#rail').innerHTML = h;
    $('#jump').innerHTML = `<option value="">Dashboard</option>` + SECS.map(s => `<option value="${s.id}">${s.t}</option>`).join('');
    $('#apps').innerHTML = [['Customer app', 'catalog', '#5409DA', 'C', 'Prices, services, offers, content'], ['Website', 'catalog', '#E8873A', 'W', 'Monthly plan prices and availability'], ['WD Partner app', 'settings', '#3A8F8A', 'P', 'Washer pay share, map, rounds']]
      .map(([n, go, c, l, d]) => `<button class="app" data-go="${go}" type="button"><span class="dot" style="background:${c}">${l}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('');
    $('#legend').innerHTML = `<span><i style="background:#5409DA"></i>Prices, content, switches</span><span><i style="background:#3E6FA8"></i>Offers and passes</span><span><i style="background:#3A8F8A"></i>Bookings and payments</span><span><i style="background:#E8873A"></i>Content and rounds</span>`;
    $('#scene').innerHTML = depot();
    $('#dDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (DEMO) $('#demoTag').hidden = false;
  }
  let cur = null, loadedApp = '', view = 'dash';
  try { view = localStorage.getItem('hq-view') === 'depot' ? 'depot' : 'dash' } catch (e) {}
  function show(id) {
    const sec = BY[id] || null; cur = sec ? sec.id : null;
    document.querySelectorAll('.ri').forEach(b => b.classList.toggle('on', b.dataset.go === (cur || '')));
    $('#jump').value = cur || '';
    $('#depot').hidden = !!sec || view !== 'depot'; $('#dash').hidden = !!sec || view !== 'dash'; $('#panel').hidden = !sec;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    $('#crumbs').innerHTML = sec ? `<span>HQ</span><span>/</span><b>${sec.t}</b>` : '';
    $('#stand').hidden = !sec; if (sec) $('#stand').href = sec.src.replace('embed=1&', '').replace('?embed=1', '');
    if (!sec) { document.title = 'WD HQ'; return }
    document.title = sec.t + ' · WD HQ';
    $('#pt').textContent = sec.t; $('#ps').textContent = sec.d;
    $('#ptags').innerHTML = sec.tags.split('').map(k => `<span class="tg ${TAG[k][1]}">${TAG[k][0]}</span>`).join('');
    const app = sec.src.split('#')[0], hash = sec.src.split('#')[1], fr = $('#frame');
    if (app === loadedApp && fr.contentWindow) { try { fr.contentWindow.location.hash = hash; return } catch (e) { /* fall through and reload */ } }
    loadedApp = app; $('#skel').style.opacity = 1; $('#skel').hidden = false; fr.src = sec.src;
  }
  $('#frame').addEventListener('load', () => { const s = $('#skel'); s.style.opacity = 0; setTimeout(() => { s.hidden = true }, 260) });
  const go = id => { history.replaceState(null, '', location.pathname + location.search + (id ? '#' + id : '')); show(id) };
  document.addEventListener('click', e => { const v = e.target.closest('[data-view]'); if (v) { view = v.dataset.view; try { localStorage.setItem('hq-view', view) } catch (x) {} return show(cur || '') } const t = e.target.closest('[data-go]'); if (t) go(t.dataset.go) });
  window.HQ = { go };
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.bld')) { e.preventDefault(); go(e.target.dataset.go) } });
  $('#home').addEventListener('click', () => go(''));
  $('#jump').addEventListener('change', e => go(e.target.value));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  buildRail(); show(location.hash.slice(1));
  if (window.HQDash) window.HQDash.boot();
})();
