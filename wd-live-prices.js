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
})();
