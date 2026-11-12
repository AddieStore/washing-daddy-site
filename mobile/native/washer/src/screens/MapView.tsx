// "Where he works": a 3D map of the societies on his round, in the brand colours. MapLibre GL JS (pinned from a CDN)
// with free OpenFreeMap vector tiles (no key anywhere), restyled at runtime: lavender land, violet water tint, white
// roads with violet casing, mint parks, extruded violet buildings. It runs in a WebView on the phone and in an
// iframe on web. If the script or the tiles do not arrive within 6 seconds, a drawn static map (same markers, built from
// the same lat/lng) stays on screen instead, so the screen never looks broken.
import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useReducedMotion, useTheme } from '../ui';
import { t } from '../lib/i18n';
import type { LatLng, Place } from '../lib/places';

export const MAPLIBRE_VERSION = '4.7.1';
export const MAP_TIMEOUT_MS = 6000;
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@__VER__/dist/maplibre-gl.css">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:__LAND__;font-family:-apple-system,Roboto,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent}
#fb,#map{position:absolute;inset:0;width:100%;height:100%}
#map{opacity:0;transition:opacity .5s}
#map.on{opacity:1}
.mk{position:relative;width:38px;height:38px;border-radius:50%;background:#5409DA;border:3px solid #fff;box-shadow:0 3px 10px rgba(17,17,20,.45);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.mk svg{width:16px;height:16px}
.bd{position:absolute;top:-9px;right:-9px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:10px;background:#fff;color:#5409DA;border:2px solid #5409DA;font:800 11px/16px sans-serif;text-align:center}
.me{width:20px;height:20px;border-radius:50%;background:#14C08A;border:3px solid #fff;box-shadow:0 0 0 0 rgba(20,192,138,.55);animation:pl 2s infinite}
.noanim .me{animation:none}
@keyframes pl{70%{box-shadow:0 0 0 14px rgba(20,192,138,0)}100%{box-shadow:0 0 0 0 rgba(20,192,138,0)}}
#card{position:absolute;left:10px;right:10px;bottom:10px;max-height:46%;overflow:auto;background:__CARD__;color:__INK__;border-radius:18px;padding:12px 14px;box-shadow:0 6px 24px rgba(17,17,20,.28);display:none;z-index:5}
#card h4{margin:0 28px 6px 0;font:700 14px/18px sans-serif}
#card .r{display:flex;justify-content:space-between;gap:10px;font:600 13px/24px sans-serif;border-top:1px solid __LINE__}
#card .r span:last-child{opacity:.7;text-align:right}
#x{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:15px;background:__LINE__;color:__INK__;font:700 16px/30px sans-serif;cursor:pointer}
#note{position:absolute;top:10px;left:10px;right:10px;z-index:4;display:none;background:__CARD__;color:__INK__;border-radius:12px;padding:6px 10px;font:600 12px/16px sans-serif;box-shadow:0 2px 10px rgba(17,17,20,.2)}
.maplibregl-ctrl-attrib{font-size:10px}
</style></head><body>
<svg id="fb" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"></svg>
<div id="map"></div>
<div id="note"></div>
<div id="card"><button id="x" aria-label="close">&times;</button><h4 id="ch"></h4><div id="cl"></div></div>
<script>
var CFG=__CFG__;
var D=CFG.dark,P=D?{land:'#17171A',land2:'#1E1E22',water:'#1F2A3A',park:'#12362F',road:'#33333A',casing:'#52525B',minor:'#26262B',label:'#D4D4D8',b0:'#8A55F5',b1:'#6E33F0',b2:'#4C1DB8'}
 :{land:'#F1F1F3',land2:'#E9E9EC',water:'#CFDCEB',park:'#D3F1E3',road:'#FFFFFF',casing:'#C4C4CC',minor:'#F7F7F8',label:'#3F3F46',b0:'#6A2BE6',b1:'#5409DA',b2:'#3D07A8'};
var NS='http://www.w3.org/2000/svg',map=null,ready=false,failed=false,pts=CFG.places.slice();
if(CFG.reduce)document.body.className='noanim';
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function showCard(pl){document.getElementById('ch').textContent=pl.label;var l=document.getElementById('cl');l.innerHTML='';
 pl.cars.forEach(function(c){var r=document.createElement('div');r.className='r';var a=document.createElement('span');a.textContent=c.plate;var b=document.createElement('span');b.textContent=c.model;r.appendChild(a);r.appendChild(b);l.appendChild(r)});
 document.getElementById('card').style.display='block';paused=true}
document.getElementById('x').onclick=function(){document.getElementById('card').style.display='none';resume(1500)};
/* ---- static fallback, drawn from the same lat/lng ---- */
function drawFallback(){
 var s=document.getElementById('fb'),W=360,H=300;s.setAttribute('viewBox','0 0 '+W+' '+H);s.innerHTML='';
 el('rect',{width:W,height:H,fill:P.land},s);
 var q=pts.concat(CFG.me?[CFG.me]:[]);var la=q.map(function(p){return p.lat}),ln=q.map(function(p){return p.lng});
 var a0=Math.min.apply(0,la),a1=Math.max.apply(0,la),o0=Math.min.apply(0,ln),o1=Math.max.apply(0,ln);
 var dx=Math.max(o1-o0,.004),dy=Math.max(a1-a0,.003),sc=Math.min((W-120)/dx,(H-110)/dy);
 var cx=(o0+o1)/2,cy=(a0+a1)/2;
 function X(g){return W/2+(g-cx)*sc}function Y(g){return H/2-(g-cy)*sc}
 el('path',{d:'M-10 40 C80 70 140 10 230 50 S340 40 380 70 L380 -10 L-10 -10Z',fill:P.water},s);
 el('rect',{x:215,y:200,width:120,height:70,rx:30,fill:P.park},s);el('rect',{x:20,y:215,width:80,height:55,rx:26,fill:P.park},s);
 var g=el('g',{transform:'rotate(-14 180 150)'},s);
 for(var i=-2;i<9;i++){for(var j=-2;j<8;j++){var x=i*52+8,y=j*46+6;if((i*7+j*3)%5!==0)el('rect',{x:x,y:y,width:38,height:32,rx:5,fill:D?'#26262B':'#E4E4E8',stroke:P.casing,'stroke-opacity':.35,'stroke-width':1},g)}}
 for(var i2=-2;i2<9;i2++)el('line',{x1:i2*52+2,y1:-90,x2:i2*52+2,y2:420,stroke:P.road,'stroke-width':6},g);
 for(var j2=-2;j2<8;j2++)el('line',{x1:-120,y1:j2*46,x2:520,y2:j2*46,stroke:P.road,'stroke-width':6},g);
 pts.forEach(function(p){var m=el('g',{transform:'translate('+X(p.lng)+' '+Y(p.lat)+')',style:'cursor:pointer'},s);
  el('circle',{r:17,fill:'#5409DA',stroke:'#fff','stroke-width':3},m);
  var tx=el('text',{y:5,'text-anchor':'middle',fill:'#fff','font-size':14,'font-weight':800,'font-family':'sans-serif'},m);tx.textContent=p.cars.length;
  var lb=el('text',{y:34,'text-anchor':'middle',fill:P.label,'font-size':10.5,'font-weight':700,'font-family':'sans-serif',stroke:P.land,'stroke-width':3,'paint-order':'stroke'},m);lb.textContent=p.label.length>22?p.label.slice(0,21)+'…':p.label;
  m.addEventListener('click',function(){showCard(p)})});
 if(CFG.me){var m2=el('g',{transform:'translate('+X(CFG.me.lng)+' '+Y(CFG.me.lat)+')'},s);el('circle',{r:9,fill:'#14C08A',stroke:'#fff','stroke-width':3},m2)}
}
drawFallback();
function note(msg){var n=document.getElementById('note');n.textContent=msg;n.style.display='block'}
function fail(){if(ready||failed)return;failed=true;try{if(map)map.remove()}catch(e){}document.getElementById('map').style.display='none';note(CFG.tr.offline)}
setTimeout(fail,__MS__);
/* ---- 3D map ---- */
var paused=false,rt=null,last=0;
function resume(ms){clearTimeout(rt);rt=setTimeout(function(){paused=false},ms)}
function spin(ts){if(ready&&!paused&&!CFG.reduce&&ts-last>33){if(last)map.setBearing(map.getBearing()+(ts-last)*.002);last=ts}else if(!last||paused)last=ts;requestAnimationFrame(spin)}
function sp(id,k,v){try{map.setPaintProperty(id,k,v)}catch(e){}}
function restyle(){
 var st=map.getStyle(),bsrc=null,firstSym=null;
 st.layers.forEach(function(l){
  var id=l.id,sl=l['source-layer']||'',ty=l.type;
  try{
   if(sl==='building'&&l.source)bsrc=l.source;
   if(ty==='symbol'&&!firstSym)firstSym=id;
   if(ty==='background')sp(id,'background-color',P.land);
   else if(ty==='fill'){
    if(sl==='water')sp(id,'fill-color',P.water);
    else if(sl==='building')map.setLayoutProperty(id,'visibility','none');
    else if(sl==='park'||/park|grass|wood|forest|garden|pitch|golf|cemetery/.test(id)){sp(id,'fill-color',P.park);sp(id,'fill-opacity',1)}
    else if(sl==='transportation')sp(id,'fill-color',P.road);
    else{sp(id,'fill-color',P.land2)}
   }else if(ty==='line'){
    if(sl==='waterway')sp(id,'line-color',P.water);
    else if(sl==='transportation'){sp(id,'line-color',/casing/.test(id)?P.casing:/rail|ferry|path|track|pedestrian|steps/.test(id)?P.minor:P.road);sp(id,'line-opacity',1)}
    else if(sl==='boundary')sp(id,'line-color',P.casing);
   }else if(ty==='symbol'){
    if(/^poi|housenumber|^airport|aerodrome/.test(id))map.setLayoutProperty(id,'visibility','none');
    else{sp(id,'text-color',P.label);sp(id,'text-halo-color',P.land);sp(id,'icon-opacity',0)}
   }else if(ty==='fill-extrusion')map.setLayoutProperty(id,'visibility','none');
  }catch(e){}
 });
 var h=['coalesce',['get','render_height'],8];
 try{map.addLayer({id:'wd-3d',type:'fill-extrusion',source:bsrc||'openmaptiles','source-layer':'building',minzoom:13,
  paint:{'fill-extrusion-color':['interpolate',['linear'],h,0,P.b0,25,P.b1,90,P.b2],'fill-extrusion-height':h,
  'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.85,'fill-extrusion-vertical-gradient':true}},firstSym||undefined)}catch(e){}
 try{map.setLight({anchor:'viewport',color:'#ffffff',intensity:.4,position:[1.2,200,45]})}catch(e){}
}
function mark(){
 pts.forEach(function(p){var e=document.createElement('div');e.className='mk';e.setAttribute('role','button');e.setAttribute('aria-label',p.label);
  e.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.4" fill="#fff"/></svg>';
  var b=document.createElement('div');b.className='bd';b.textContent=p.cars.length;e.appendChild(b);
  e.addEventListener('click',function(ev){ev.stopPropagation();showCard(p)});
  new maplibregl.Marker({element:e}).setLngLat([p.lng,p.lat]).addTo(map)});
 if(CFG.me){var m=document.createElement('div');m.className='me';m.title=CFG.tr.you;new maplibregl.Marker({element:m}).setLngLat([CFG.me.lng,CFG.me.lat]).addTo(map)}
}
function start(){
 if(!window.maplibregl)return fail();
 var q=pts.concat(CFG.me?[CFG.me]:[]);if(!q.length)return fail();
 try{
  map=new maplibregl.Map({container:'map',style:CFG.style,center:[q[0].lng,q[0].lat],zoom:14.5,pitch:60,bearing:-18,maxPitch:75,fadeDuration:0,attributionControl:false});
 }catch(e){return fail()}
 map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
 var styled=false;
 map.on('error',function(e){if(!styled&&!ready)fail()});
 map.on('style.load',function(){restyle();styled=true});
 map.on('load',function(){
  if(failed)return;ready=true;document.getElementById('map').className='on';mark();
  document.getElementById('fb').style.display='none';
  try{
   if(q.length>1){var b=new maplibregl.LngLatBounds();q.forEach(function(p){b.extend([p.lng,p.lat])});map.fitBounds(b,{padding:{top:70,bottom:80,left:50,right:50},maxZoom:15.6,pitch:60,bearing:-18,duration:0})}
   else map.jumpTo({center:[q[0].lng,q[0].lat],zoom:15.4,pitch:60,bearing:-18});
  }catch(e){}
  requestAnimationFrame(spin);
 });
 ['mousedown','touchstart','wheel'].forEach(function(ev){document.getElementById('map').addEventListener(ev,function(){paused=true},{passive:true})});
 ['mouseup','touchend','touchcancel'].forEach(function(ev){document.getElementById('map').addEventListener(ev,function(){resume(5000)},{passive:true})});
}
var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/maplibre-gl@__VER__/dist/maplibre-gl.js';sc.onload=start;sc.onerror=fail;document.head.appendChild(sc);
</script></body></html>`;

export type MapProps = { places: Place[]; me?: LatLng | null; height?: number };

export function mapHtml(places: Place[], me: LatLng | null | undefined, dark: boolean, reduce: boolean, opts?: { style?: string; ms?: number; lib?: string }) {
  const cfg = {
    places: places.map((p) => ({ id: p.id, label: p.label, lat: p.lat, lng: p.lng, cars: p.cars })),
    me: me || null, dark, reduce, style: opts?.style || STYLE_URL,
    tr: { offline: t('Map nahi khula. Simple naksha dikha rahe hain'), you: t('Meri location') },
  };
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const c = dark ? { land: '#17171A', card: '#1E1E22', ink: '#F4F4F5', line: 'rgba(255,255,255,.14)' } : { land: '#F1F1F3', card: '#FFFFFF', ink: '#111114', line: 'rgba(17,17,20,.12)' };
  let html = PAGE.replace(/__VER__/g, opts?.lib || MAPLIBRE_VERSION).replace('__MS__', String(opts?.ms ?? MAP_TIMEOUT_MS))
    .replace(/__LAND__/g, c.land).replace(/__CARD__/g, c.card).replace(/__INK__/g, c.ink).replace(/__LINE__/g, c.line);
  html = html.replace('__CFG__', () => json);
  return html;
}

export default function MapView({ places, me, height = 340 }: MapProps) {
  const { dark } = useTheme();
  const reduce = useReducedMotion();
  const html = useMemo(() => mapHtml(places, me, dark, reduce), [places, me, dark, reduce]);
  const box = { height, borderRadius: 24, overflow: 'hidden' as const, backgroundColor: dark ? '#17171A' : '#F1F1F3' };
  const label = t('Jahan aap kaam karte ho');
  if (Platform.OS === 'web') {
    return (
      <View style={box} accessibilityLabel={label}>
        {React.createElement('iframe', { title: label, srcDoc: html, sandbox: 'allow-scripts', style: { border: 0, width: '100%', height: '100%', display: 'block' } })}
      </View>
    );
  }
  return (
    <View style={box} accessibilityLabel={label}>
      <WebView
        originWhitelist={['*']} source={{ html, baseUrl: 'https://washingdaddy.com/' }} javaScriptEnabled domStorageEnabled
        scrollEnabled={false} nestedScrollEnabled bounces={false} overScrollMode="never" setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
