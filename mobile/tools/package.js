// Builds the installable web apps from the two source pages.
// node package.js <customer.html> <washer.html> <assetsDir> <syncJs> <outDir>
// Output: <outDir>/customer/ and <outDir>/washer/, each a self-contained installable app folder
// (index.html, wd-sync.js, manifest.webmanifest, sw.js, icons, iOS splash screens),
// and <outDir>/admin/wd-sync.js for the approvals page, which shares the same Firebase layer.
// The source pages are not changed; re-run this whenever they change.
const fs = require('fs');
const path = require('path');
const [customerSrc, washerSrc, assetsDir, syncJs, outDir] = process.argv.slice(2);
const SPLASH = JSON.parse(fs.readFileSync(path.join(assetsDir, 'splash.json'), 'utf8'));
const crypto = require('crypto');

const APPS = {
  customer: {
    src: customerSrc, scope: '/customer/', name: 'Washing Daddy', short: 'Washing Daddy',
    desc: "Watch your car's wash live, with photos, your plan and your bill.",
    theme: '#FFF6E9', bg: '#FFF6E9', lang: 'en',
  },
  washer: {
    src: washerSrc, scope: '/washer/', name: 'WD Partner', short: 'WD Partner',
    desc: 'Aaj ka round, har car ke kaam aur photo proof.',
    theme: '#5409DA', bg: '#5409DA', lang: 'hi-Latn',
  },
};

const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d) } };

for (const [id, a] of Object.entries(APPS)) {
  const dir = path.join(outDir, id);
  fs.rmSync(dir, { recursive: true, force: true });
  copyDir(path.join(assetsDir, id, 'web'), dir);
  fs.copyFileSync(syncJs, path.join(dir, 'wd-sync.js'));

  let html = fs.readFileSync(a.src, 'utf8');
  const head = [
    `<link rel="manifest" href="manifest.webmanifest">`,
    `<link rel="icon" type="image/png" href="favicon.png">`,
    `<link rel="apple-touch-icon" href="apple-touch-icon.png">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
    `<meta name="apple-mobile-web-app-title" content="${a.short}">`,
    `<meta name="application-name" content="${a.short}">`,
    `<meta name="format-detection" content="telephone=no">`,
    ...SPLASH.map(([pw, ph, cw, ch, r]) =>
      `<link rel="apple-touch-startup-image" media="screen and (device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="splash/${pw}x${ph}.png">`),
    `<script src="wd-sync.js"></script>`,
    `<script>
/* Installed-app glue, added at packaging time. */
(function(){
  var inApk=/WashingDaddyApp/.test(navigator.userAgent);
  if('serviceWorker' in navigator&&!inApk&&(location.protocol==='https:'||location.hostname==='localhost'))addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
  if(window.WDNative){var m=function(){var t=document.getElementById('metaTheme')||document.querySelector('meta[name=theme-color]');if(t)try{WDNative.setBarColor(t.content)}catch(e){}};
    addEventListener('DOMContentLoaded',function(){m();var t=document.getElementById('metaTheme');if(t)new MutationObserver(m).observe(t,{attributes:true})})}
})();
</script>`,
  ].join('\n');

  // the customer page is a body fragment written for the artifact wrapper: give it a proper document head
  if (!/^\s*<!doctype/i.test(html)) {
    html = `<!doctype html>\n<html lang="${a.lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n` + html;
  }
  const t = html.indexOf('</title>');
  if (t < 0) throw new Error(id + ': no <title> to anchor the head tags');
  html = html.slice(0, t + 8) + '\n' + head + '\n' + html.slice(t + 8);
  // the staff link points at the washer app beside it in the artifact; here it lives at /washer/
  html = html.replace(/href="washer\/"/g, 'href="/washer/"');
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({
    id: a.scope, name: a.name, short_name: a.short, description: a.desc, lang: a.lang,
    start_url: a.scope, scope: a.scope, display: 'standalone', orientation: 'portrait',
    background_color: a.bg, theme_color: a.theme,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2));

  // cache version changes whenever any shipped file changes, so phones pick up new builds
  const h = crypto.createHash('sha1');
  for (const f of ['index.html', 'wd-sync.js']) h.update(fs.readFileSync(path.join(dir, f)));
  const ver = h.digest('hex').slice(0, 10);
  fs.writeFileSync(path.join(dir, 'sw.js'), `/* Offline shell for ${a.name}. Pages: network first, cache when there is no signal.
   Fonts: cached after first use. Firestore traffic is never touched (it keeps its own offline store). */
var CACHE='wd-${id}-${ver}';
var SHELL=['./','index.html','wd-sync.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x.indexOf('wd-${id}-')===0&&x!==CACHE}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(function(c){return c.match(r).then(function(hit){var net=fetch(r).then(function(res){c.put(r,res.clone());return res}).catch(function(){return hit});return hit||net})}));return}
  if(u.origin!==location.origin||u.pathname.indexOf('${a.scope}')!==0)return;
  e.respondWith(fetch(r).then(function(res){if(res&&res.status===200){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return res})
    .catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(hit){return hit||(r.mode==='navigate'?caches.match('index.html'):undefined)})}));
});
`);
  console.log(id, 'ok', ver);
}

// the approvals page (admin/index.html, edited in place) signs in and reads through the same layer
fs.mkdirSync(path.join(outDir, 'admin'), { recursive: true });
fs.copyFileSync(syncJs, path.join(outDir, 'admin', 'wd-sync.js'));
console.log('admin ok');
