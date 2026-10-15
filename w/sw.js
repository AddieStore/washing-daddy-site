/* Washer app offline cache.
   HTML hamesha pehle network se — taaki update turant mile.
   Signal na ho to cache se. Icons cache se, woh badalte nahi. */
/* round.json hata diya gaya — customer data ab sirf n8n se aata hai,
   aur woh cache nahi hota. Cache ka naam badla hai taaki purani
   round.json har phone se khud hat jaaye. */
var CACHE = "wd-duty-v2";
var SHELL = ["/w/", "/w/index.html",
             "/w/icons/icon-192.png", "/w/icons/icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(SHELL).catch(function(){});
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;                 // POST kabhi cache mat karo
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;       // n8n ke calls seedhe jaayein

  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.status === 200){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        return hit || caches.match("/w/index.html");
      });
    })
  );
});
