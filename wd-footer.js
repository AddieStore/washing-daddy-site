/* Washing Daddy shared page footer: a flat illustrated Delhi scene (drawn in code,
   no logo) with the legal line on top. Added once at the very bottom of every page
   by <script src="/wd-footer.js" defer></script>. */
(function () {
  if (window.__wdFooter || document.getElementById('wd-art-footer')) return;
  window.__wdFooter = 1;
  var css = '#wd-art-footer{position:relative;display:block;width:100%;height:clamp(230px,18.1vw,300px);overflow:hidden;background:#1fb5b0;color:#fff;font-family:"Hind","Segoe UI",system-ui,sans-serif;isolation:isolate}' +
    '#wd-art-footer svg{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '#wd-art-footer .wdf-txt{position:absolute;left:0;right:0;bottom:0;padding:34px 16px 14px;text-align:center;background:linear-gradient(to top,rgba(26,10,51,.88),rgba(26,10,51,.55) 60%,rgba(26,10,51,0));text-shadow:0 1px 3px rgba(0,0,0,.5)}' +
    '#wd-art-footer b{display:block;font-size:clamp(16px,2.4vw,22px);font-weight:800;letter-spacing:.02em}' +
    '#wd-art-footer span{display:block;margin-top:3px;font-size:clamp(12px,1.5vw,14px);opacity:.92}' +
    '#wd-art-footer a{color:#FFBA08;text-decoration:none}#wd-art-footer a:hover{text-decoration:underline}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function palm(x, h, s) {
    var t = 'M' + x + ' 260 Q' + (x + 8 * s) + ' ' + (260 - h / 2) + ' ' + (x + 4 * s) + ' ' + (260 - h);
    var tx = x + 4 * s, ty = 260 - h, o = '<path d="' + t + '" stroke="#2c5a46" stroke-width="' + (7 * Math.abs(s)) + '" fill="none" stroke-linecap="round"/>';
    [[-60, -10], [-45, -34], [-14, -44], [20, -40], [52, -26], [64, -4]].forEach(function (p) {
      o += '<path d="M' + tx + ' ' + ty + ' Q' + (tx + p[0] * .5 * Math.abs(s)) + ' ' + (ty + p[1] * 1.3) + ' ' + (tx + p[0] * Math.abs(s)) + ' ' + (ty + p[1] + 22) + ' Q' + (tx + p[0] * .5 * Math.abs(s)) + ' ' + (ty + p[1] + 4) + ' ' + tx + ' ' + ty + 'Z" fill="#1d7a4e"/>';
    });
    return o;
  }
  var svg = '<svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="wdfsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17a8b8"/><stop offset=".7" stop-color="#4fd1b5"/><stop offset="1" stop-color="#9ee3c4"/></linearGradient></defs>' +
    '<rect width="1440" height="260" fill="url(#wdfsky)"/>' +
    /* clouds */
    '<g fill="#fff3d6" opacity=".9"><ellipse cx="190" cy="48" rx="80" ry="16"/><ellipse cx="240" cy="38" rx="48" ry="16"/><ellipse cx="1060" cy="40" rx="95" ry="15"/><ellipse cx="1120" cy="30" rx="50" ry="15"/><ellipse cx="640" cy="28" rx="60" ry="10"/></g>' +
    /* birds */
    '<g fill="none" stroke="#0c5b6e" stroke-width="2" stroke-linecap="round"><path d="M520 60q6-8 12 0q6-8 12 0"/><path d="M570 38q5-6 10 0q5-6 10 0"/><path d="M900 66q6-8 12 0q6-8 12 0"/><path d="M1260 90q5-6 10 0q5-6 10 0"/></g>' +
    /* skyline */
    '<g fill="#1c7fa8" opacity=".75"><rect x="0" y="120" width="70" height="140"/><rect x="80" y="90" width="60" height="170"/><rect x="330" y="110" width="50" height="150"/><rect x="1000" y="100" width="70" height="160"/><rect x="1080" y="130" width="60" height="130"/><rect x="1300" y="95" width="70" height="165"/><rect x="1380" y="125" width="60" height="135"/></g>' +
    /* India-gate style monument */
    '<g><rect x="110" y="104" width="170" height="156" fill="#f0a21c"/><rect x="100" y="96" width="190" height="14" fill="#ffc83d"/><rect x="118" y="82" width="154" height="16" fill="#f7b52c"/>' +
    '<path d="M150 260V168a45 45 0 0 1 90 0V260Z" fill="#0f6f9a"/><path d="M168 260V172a27 27 0 0 1 54 0V260Z" fill="#17a8b8"/><rect x="110" y="104" width="22" height="156" fill="#d98a10" opacity=".55"/></g>' +
    /* domed tomb, pink sandstone */
    '<g><rect x="470" y="130" width="300" height="130" fill="#e8765a"/><rect x="470" y="124" width="300" height="9" fill="#f6b79b"/>' +
    '<path d="M560 130V86a60 52 0 0 1 120 0V130Z" fill="#f2f0e6"/><rect x="618" y="30" width="4" height="22" fill="#e8765a"/><circle cx="620" cy="30" r="5" fill="#f2f0e6"/>' +
    '<path d="M560 130V96a60 52 0 0 1 60-52V130Z" fill="#d9d5c4" opacity=".6"/>' +
    '<rect x="484" y="104" width="30" height="26" fill="#e8765a"/><path d="M484 104a15 15 0 0 1 30 0Z" fill="#f2f0e6"/><rect x="726" y="104" width="30" height="26" fill="#e8765a"/><path d="M726 104a15 15 0 0 1 30 0Z" fill="#f2f0e6"/>' +
    '<path d="M580 260V190a40 46 0 0 1 80 0V260Z" fill="#7c2d3a"/><path d="M598 260V196a22 28 0 0 1 44 0V260Z" fill="#1c6f9e"/>' +
    '<g fill="#7c2d3a"><rect x="500" y="160" width="14" height="28" rx="7"/><rect x="528" y="160" width="14" height="28" rx="7"/><rect x="698" y="160" width="14" height="28" rx="7"/><rect x="726" y="160" width="14" height="28" rx="7"/></g></g>' +
    /* metro viaduct */
    '<g><rect x="900" y="214" width="540" height="9" fill="#5b4d86"/><rect x="940" y="223" width="12" height="37" fill="#5b4d86"/><rect x="1180" y="223" width="12" height="37" fill="#5b4d86"/><rect x="1400" y="223" width="12" height="37" fill="#5b4d86"/>' +
    '<rect x="1000" y="190" width="150" height="24" rx="6" fill="#f4efe6"/><rect x="1006" y="196" width="138" height="8" fill="#17a8b8"/><rect x="1152" y="190" width="150" height="24" rx="6" fill="#f4efe6"/><rect x="1158" y="196" width="138" height="8" fill="#17a8b8"/></g>' +
    /* palms */
    palm(400, 150, 1) + palm(840, 170, -1) + palm(60, 90, 1) +
    /* ground and foliage */
    '<rect y="236" width="1440" height="24" fill="#2b1a5c"/><g fill="#2c8f4e"><ellipse cx="320" cy="244" rx="46" ry="26"/><ellipse cx="800" cy="246" rx="52" ry="26"/><ellipse cx="1100" cy="246" rx="40" ry="22"/><ellipse cx="20" cy="246" rx="40" ry="22"/></g><g fill="#1e6f3c"><ellipse cx="360" cy="250" rx="36" ry="20"/><ellipse cx="850" cy="252" rx="34" ry="18"/></g>' +
    /* small car being washed */
    '<g><ellipse cx="1180" cy="250" rx="110" ry="9" fill="#1a0a33" opacity=".35"/>' +
    '<path d="M1090 242v-22q0-8 8-10l26-6 24-22q5-5 12-5h52q8 0 13 5l22 22 24 5q8 2 8 10v23Z" fill="#5409DA"/>' +
    '<path d="M1154 196l16-15q3-3 7-3h44q4 0 7 3l16 15Z" fill="#cfe9f5"/><rect x="1196" y="180" width="3" height="16" fill="#5409DA"/>' +
    '<circle cx="1130" cy="244" r="15" fill="#1a0a33"/><circle cx="1130" cy="244" r="7" fill="#ccc"/><circle cx="1250" cy="244" r="15" fill="#1a0a33"/><circle cx="1250" cy="244" r="7" fill="#ccc"/>' +
    '<g fill="#fff" opacity=".95"><circle cx="1150" cy="212" r="9"/><circle cx="1166" cy="204" r="11"/><circle cx="1188" cy="210" r="8"/><circle cx="1214" cy="206" r="10"/><circle cx="1236" cy="214" r="8"/></g>' +
    '<g fill="#bfe8ff" opacity=".8"><circle cx="1168" cy="168" r="3"/><circle cx="1228" cy="164" r="3"/><circle cx="1206" cy="150" r="2.5"/></g>' +
    /* washer with sponge */
    '<g><circle cx="1070" cy="188" r="10" fill="#8d5b3a"/><path d="M1062 184q8-12 16 0Z" fill="#FFBA08"/><rect x="1060" y="198" width="20" height="30" rx="7" fill="#FFBA08"/><rect x="1062" y="228" width="7" height="18" fill="#2a2a55"/><rect x="1072" y="228" width="7" height="18" fill="#2a2a55"/><path d="M1078 204L1100 212" stroke="#8d5b3a" stroke-width="6" stroke-linecap="round"/><circle cx="1104" cy="214" r="7" fill="#fff"/></g></g>' +
    /* people looking up at the monument */
    '<g><g fill="#1a0a33"><circle cx="520" cy="214" r="9"/><circle cx="560" cy="216" r="9"/><circle cx="700" cy="214" r="9"/><circle cx="740" cy="216" r="9"/></g>' +
    '<rect x="511" y="224" width="18" height="30" rx="8" fill="#d6334a"/><rect x="551" y="226" width="18" height="28" rx="8" fill="#FFBA08"/><rect x="691" y="224" width="18" height="30" rx="8" fill="#3b82d6"/><rect x="731" y="226" width="18" height="28" rx="8" fill="#f2f0e6"/></g>' +
    '</svg>';

  var el = document.createElement('footer');
  el.id = 'wd-art-footer';
  el.innerHTML = svg + '<div class="wdf-txt"><b>Washing Daddy Private Limited</b><span>&copy; ' + new Date().getFullYear() + ' Washing Daddy Private Limited. All rights reserved. &middot; <a href="/privacy.html">Privacy</a></span></div>';
  document.body.appendChild(el);
})();
