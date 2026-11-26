/* Live plan prices on the website: reads the catalog that WD HQ edits (Firestore `catalog`, public read) and updates the plan cards
   on this page: the price, and paused / hidden plans. If the read fails for any reason the prices written in the HTML stay. */
(function () {
  var PROJECT = 'gen-lang-client-0799769592', KEY = 'AIzaSyAFNwmEFj4BywMcIsWndyZ2BoI_82-pSac';
  var val = function (f) { if (!f) return undefined; if ('stringValue' in f) return f.stringValue; if ('integerValue' in f) return Number(f.integerValue); if ('doubleValue' in f) return f.doubleValue; return undefined };
  var rs = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN') };
  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase() };
  fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/catalog?pageSize=300&key=' + KEY).then(function (r) { return r.ok ? r.json() : null }).then(function (j) {
    if (!j || !j.documents) return;
    var plans = {};
    j.documents.forEach(function (d) { var f = d.fields || {}; if (val(f.kind) === 'plan') plans[norm(val(f.name))] = { price: val(f.price), status: val(f.status) || 'live', name: val(f.name) } });
    document.querySelectorAll('.tile.plan').forEach(function (card) {
      var h = card.querySelector('h3'), p = h && plans[norm(h.textContent)]; if (!p) return;
      var pe = card.querySelector('.price'); if (pe && pe.firstChild && typeof p.price === 'number' && p.price >= 0) pe.firstChild.nodeValue = rs(p.price);
      if (p.status !== 'live') { card.style.opacity = '.55'; var b = card.querySelector('button[data-buy]'); if (b) { b.disabled = true; b.textContent = 'Coming back soon' } if (p.status === 'hidden') card.style.display = 'none' }
    });
    document.querySelectorAll('option').forEach(function (o) {
      var m = /^(WD [A-Za-z]+)\s+—\s+₹[\d,]+ a month$/.exec(o.textContent.trim()), p = m && plans[norm(m[1])];
      if (p && typeof p.price === 'number') { o.textContent = m[1] + ' — ' + rs(p.price) + ' a month'; if (p.status === 'hidden') o.remove() }
    });
  }).catch(function () {});
  /* On/off switches for parts of this page, set in WD HQ (appcfg/customer.features.web.*). Anything not set stays on. */
  var SECTIONS = { plans: '#plans', street: '#street', beforeAfter: '#before-after', map: '#map', join: '#join', enquire: '#enquire' };
  var fv = function (f) { if (!f) return undefined; if ('booleanValue' in f) return f.booleanValue; if ('mapValue' in f) { var o = {}, m = f.mapValue.fields || {}; for (var k in m) o[k] = fv(m[k]); return o } return val(f) };
  fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/appcfg/customer?key=' + KEY).then(function (r) { return r.ok ? r.json() : null }).then(function (d) {
    var web = d && d.fields && d.fields.features && fv(d.fields.features) && fv(d.fields.features).web; if (!web) return;
    Object.keys(SECTIONS).forEach(function (k) {
      if (web[k] !== false) return;
      document.querySelectorAll(SECTIONS[k]).forEach(function (el) { el.style.display = 'none' });
      document.querySelectorAll('a[href="' + SECTIONS[k] + '"]').forEach(function (a) { a.style.display = 'none' });
    });
    if (web.buyOnline === false) document.querySelectorAll('button[data-buy]').forEach(function (b) { b.disabled = true; b.textContent = 'Message us to join'; });
  }).catch(function () {});
})();
