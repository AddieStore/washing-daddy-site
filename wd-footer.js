/* Washing Daddy shared website footer (Pronto-style columns). Added at the very bottom of
   every page by <script src="/wd-footer.js" defer></script>. All facts here come from the
   site, /privacy.html and /terms.html: update them in this one file. */
(function () {
  if (window.__wdFooter || document.getElementById('wd-footer')) return;
  window.__wdFooter = 1;
  var css = '#wd-footer,#wd-footer *{box-sizing:border-box}' +
    '#wd-footer{background:#0d0a14;color:#d9d4e4;font-family:"Hind","Segoe UI",system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;border-top:4px solid #FFBA08;text-align:left}' +
    '#wd-footer a{color:#d9d4e4;text-decoration:none}#wd-footer a:hover{color:#FFBA08}' +
    '#wd-footer .wdf-w{max-width:1160px;margin:0 auto;padding:0 20px}' +
    '#wd-footer .wdf-top{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1.2fr;gap:30px;padding:46px 0 36px}' +
    '#wd-footer h4{margin:0 0 14px;font-size:13px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#fff}' +
    '#wd-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}' +
    '#wd-footer .wdf-brand b{display:block;font-size:26px;line-height:1.15;font-weight:800;color:#fff}#wd-footer .wdf-brand b em{font-style:normal;color:#FFBA08}' +
    '#wd-footer .wdf-brand p{margin:12px 0 4px;color:#a9a2bd}' +
    '#wd-footer .wdf-brand a.wdf-big{display:block;font-weight:700;font-size:17px;color:#FFBA08;margin:2px 0 10px;word-break:break-word}' +
    '#wd-footer .wdf-g li{font-size:14px;color:#a9a2bd}#wd-footer .wdf-g li b{color:#fff;font-weight:700}' +
    '#wd-footer .wdf-sec{border-top:1px solid rgba(255,255,255,.12);padding:30px 0}' +
    '#wd-footer .wdf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px 24px}' +
    '#wd-footer .wdf-grid a small{color:#8f87a6;margin-left:6px;font-size:13px}' +
    '#wd-footer .wdf-two{display:grid;grid-template-columns:2fr 1fr;gap:40px}' +
    '#wd-footer .wdf-base{border-top:1px solid rgba(255,255,255,.12);padding:22px 0 26px;font-size:13px;color:#a9a2bd;display:grid;gap:4px}' +
    '#wd-footer .wdf-base b{color:#fff}' +
    '@media(max-width:980px){#wd-footer .wdf-top{grid-template-columns:1fr 1fr 1fr}#wd-footer .wdf-brand{grid-column:1/-1}#wd-footer .wdf-two{grid-template-columns:1fr}}' +
    '@media(max-width:600px){#wd-footer .wdf-top{grid-template-columns:1fr 1fr}#wd-footer .wdf-grid{grid-template-columns:1fr 1fr}#wd-footer .wdf-g{grid-column:1/-1}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function L(href, text, extra) { return '<li><a href="' + href + '"' + (extra || '') + '>' + text + '</a></li>'; }
  var ext = ' target="_blank" rel="noopener"';
  var html =
    '<div class="wdf-w"><div class="wdf-top">' +
    '<div class="wdf-brand"><b>Washing <em>Daddy</em></b>' +
    '<p>Feel free to reach us at:</p><a class="wdf-big" href="mailto:Business@washingdaddy.com">Business@washingdaddy.com</a>' +
    '<p>Call or WhatsApp:</p><a class="wdf-big" href="tel:+917701808924">+91 77018 08924</a>' +
    '<p>Instagram:</p><a class="wdf-big" href="https://instagram.com/washingdaddy.co"' + ext + '>@washingdaddy.co</a></div>' +
    '<div><h4>Support</h4><ul>' + L('tel:+917701808924', 'Contact us') + L('https://wa.me/917701808924', 'WhatsApp us', ext) +
    L('/account/', 'My account') + L('/pay/', 'Pay online') + L('/get/', 'Get the apps') +
    L('/privacy.html#deletion-of-account-and-personal-data', 'Delete account') + '</ul></div>' +
    '<div><h4>Company</h4><ul>' + L('/', 'Home') + L('/#plans', 'Plans &amp; prices') + L('/#map', 'Areas we serve') +
    L('/#join', 'Become a washer partner') + L('/customer/', 'Customer app') + L('/washer/', 'Washer app (WD Partner)') + L('/admin/', 'Admin sign in') + '</ul></div>' +
    '<div><h4>Legal</h4><ul>' + L('/terms.html', 'Terms &amp; Conditions') + L('/privacy.html', 'Privacy Policy') +
    L('/cancellation.html', 'Cancellation &amp; Refund Policy') + '</ul></div>' +
    '<div class="wdf-g"><h4>Grievance Officers</h4><ul>' +
    '<li><b>Sourabh Rao</b><br><a href="tel:+919911720178">+91 99117 20178</a></li>' +
    '<li><b>Ravi Kumar</b><br><a href="tel:+917701808924">+91 77018 08924</a></li>' +
    '<li><a href="mailto:Business@washingdaddy.com">Business@washingdaddy.com</a></li></ul></div>' +
    '</div>' +
    '<div class="wdf-sec wdf-two"><div><h4>All services</h4><div class="wdf-grid">' +
    '<a href="/#plans">WD Wash<small>₹199</small></a><a href="/#plans">WD Deep Cleaning<small>₹800</small></a><a href="/#plans">WD Exclusive wash<small>₹2,100</small></a>' +
    '<a href="/#plans">WD Standard<small>₹999/mo</small></a><a href="/#plans">WD Pro<small>₹1,800/mo</small></a><a href="/#plans">WD Exclusive plan<small>₹2,500/mo</small></a>' +
    '<a href="/#plans">WD Reserve<small>₹5,555/mo</small></a></div></div>' +
    '<div><h4>Areas we serve</h4><ul>' + L('/#map', 'Paschim Vihar (GH-6, GH-9, GH-14)') + L('/#map', 'Meera Bagh') + L('/#map', 'Sundar Vihar') + '</ul></div></div>' +
    '<div class="wdf-base"><div><b>Washing Daddy Private Limited</b> &middot; CIN U45200DC2026PTC474412</div>' +
    '<div>Registered office: GH-6/274, Prachin Apartments, Paschim Vihar, New Delhi &ndash; 110087</div>' +
    '<div>&copy; ' + new Date().getFullYear() + ' Washing Daddy Private Limited. All rights reserved. &middot; <a href="https://washingdaddy.com">washingdaddy.com</a></div></div></div>';

  var el = document.createElement('footer');
  el.id = 'wd-footer';
  el.setAttribute('aria-label', 'Washing Daddy Private Limited');
  el.innerHTML = html;
  /* replace each page's own older footer so there is only one */
  Array.prototype.forEach.call(document.querySelectorAll('footer'), function (f) { f.style.display = 'none'; });
  document.body.appendChild(el);
})();
