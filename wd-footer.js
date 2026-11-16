/* Washing Daddy shared page footer. Illustration background, company name, trust chips,
   contact buttons and the legal line. Added at the very bottom of every website page by
   <script src="/wd-footer.js" defer></script>. */
(function () {
  if (window.__wdFooter || document.getElementById('wd-art-footer')) return;
  window.__wdFooter = 1;
  var css = '#wd-art-footer,#wd-art-footer *{color:#fff;box-sizing:border-box}#wd-art-footer h2,#wd-art-footer p,#wd-art-footer ul{margin-left:0;margin-right:0;padding-top:0;padding-bottom:0;font-family:inherit}#wd-art-footer{position:relative;display:block;width:100%;color:#fff;font-family:"Hind","Segoe UI",system-ui,sans-serif;isolation:isolate;overflow:hidden;background:#2A0478 url(/img/footer-delhi.jpg) center 35%/cover no-repeat}' +
    '#wd-art-footer:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(42,4,120,.55) 0%,rgba(26,10,51,.78) 55%,rgba(26,10,51,.94) 100%)}' +
    '#wd-art-footer .wdf-in{max-width:1100px;margin:0 auto;padding:44px 20px 0;text-align:center}' +
    '#wd-art-footer .wdf-live{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);font-size:13px;font-weight:700;letter-spacing:.04em;backdrop-filter:blur(4px)}' +
    '#wd-art-footer .wdf-dot{width:9px;height:9px;border-radius:50%;background:#35e07a;box-shadow:0 0 0 0 rgba(53,224,122,.7);animation:wdfp 1.8s infinite}' +
    '@keyframes wdfp{70%{box-shadow:0 0 0 9px rgba(53,224,122,0)}100%{box-shadow:0 0 0 0 rgba(53,224,122,0)}}' +
    '#wd-art-footer h2{margin:16px 0 4px!important;font-size:clamp(26px,5vw,46px);line-height:1.1;font-weight:800;letter-spacing:.01em;text-shadow:0 2px 10px rgba(0,0,0,.45)}' +
    '#wd-art-footer h2 em{font-style:normal;color:#FFBA08!important}' +
    '#wd-art-footer .wdf-sub{margin:0;font-size:clamp(14px,2vw,17px);opacity:.92}' +
    '#wd-art-footer .wdf-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:22px 0 4px;padding:0;list-style:none}' +
    '#wd-art-footer .wdf-chips li{display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);font-size:14px;font-weight:600;backdrop-filter:blur(4px)}' +
    '#wd-art-footer .wdf-chips svg{width:18px;height:18px;flex:none;fill:none;stroke:#FFBA08;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '#wd-art-footer .wdf-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:18px 0 0}' +
    '#wd-art-footer .wdf-btns a{padding:11px 20px;border-radius:999px;background:#FFBA08;color:#1A0A33!important;font-weight:800;font-size:14.5px;text-decoration:none}' +
    '#wd-art-footer .wdf-btns a.alt{background:transparent;color:#fff!important;border:1.5px solid rgba(255,255,255,.7)}' +
    '#wd-art-footer .wdf-btns a:hover{filter:brightness(1.08)}' +
    '#wd-art-footer .wdf-legal{margin-top:30px;padding:16px 16px 18px;border-top:1px solid rgba(255,255,255,.2);font-size:13px;line-height:1.6;background:rgba(10,4,24,.55)}#wd-art-footer .wdf-wrap{margin:0 -20px}' +
    '#wd-art-footer .wdf-legal b{font-size:14.5px}' +
    '#wd-art-footer .wdf-legal a{color:#FFBA08!important;text-decoration:none;white-space:nowrap}#wd-art-footer .wdf-legal a:hover{text-decoration:underline}' +
    '#wd-art-footer .wdf-wrap{margin:0 -20px}' +
    '@media (prefers-reduced-motion:reduce){#wd-art-footer .wdf-dot{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function ic(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  var el = document.createElement('footer');
  el.id = 'wd-art-footer';
  el.setAttribute('aria-label', 'Washing Daddy Private Limited');
  el.innerHTML = '<div class="wdf-in">' +
    '<div class="wdf-live"><i class="wdf-dot"></i><span>Live in New Delhi <span id="wdf-clock"></span></span></div>' +
    '<h2>Washing Daddy <em>Private Limited</em></h2>' +
    '<p class="wdf-sub">Doorstep car wash, every day, by trained washers.</p>' +
    '<ul class="wdf-chips">' +
    '<li>' + ic('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>') + 'Registered company</li>' +
    '<li>' + ic('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>') + 'Secure online payments</li>' +
    '<li>' + ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') + 'Fixed-time visits</li>' +
    '<li>' + ic('<path d="M5 13a7 7 0 0114 0v4a2 2 0 01-2 2h-1v-6h3M5 13v4a2 2 0 002 2h1v-6H5"/>') + 'Real people on call</li>' +
    '</ul>' +
    '<div class="wdf-btns"><a href="tel:+917701808924">Call 77018 08924</a><a class="alt" href="https://wa.me/917701808924" target="_blank" rel="noopener">WhatsApp</a><a class="alt" href="https://instagram.com/washingdaddy.co" target="_blank" rel="noopener">Instagram</a></div>' +
    '<div class="wdf-wrap"><div class="wdf-legal"><b>Washing Daddy Private Limited</b>, New Delhi<br>&copy; ' + new Date().getFullYear() + ' Washing Daddy Private Limited. All rights reserved. &middot; <a href="https://washingdaddy.com">washingdaddy.com</a> &middot; <a href="/privacy.html">Privacy policy</a></div></div>' +
    '</div>';
  document.body.appendChild(el);
  function tick() {
    var c = document.getElementById('wdf-clock'); if (!c) return;
    try { c.textContent = '· ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }); } catch (e) {}
  }
  tick(); setInterval(tick, 30000);
})();
