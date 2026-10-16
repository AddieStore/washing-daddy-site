/* Offline shell for Washing Daddy. Pages: network first, cache when there is no signal.
   Fonts: cached after first use. Firestore traffic is never touched (it keeps its own offline store). */
var CACHE='wd-customer-300a1668fd';
var SHELL=['./','index.html','wd-sync.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x.indexOf('wd-customer-')===0&&x!==CACHE}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(function(c){return c.match(r).then(function(hit){var net=fetch(r).then(function(res){c.put(r,res.clone());return res}).catch(function(){return hit});return hit||net})}));return}
  if(u.origin!==location.origin||u.pathname.indexOf('/customer/')!==0)return;
  e.respondWith(fetch(r).then(function(res){if(res&&res.status===200){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return res})
    .catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(hit){return hit||(r.mode==='navigate'?caches.match('index.html'):undefined)})}));
});
