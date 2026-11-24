// "Where he works": the societies on his round on a real Google map, in the brand colours (lavender land, violet markers
// with a car-count badge, mint 'me' dot). The Maps JavaScript API runs in a WebView on the phone (key from extra.googleMapsKey,
// set from the GOOGLE_MAPS_API_KEY build secret) and in an iframe on web. Why not react-native-maps: a WebView is already
// in the app and adds no native dependency. If the key is missing, rejected, or the script does not arrive within 6 seconds,
// a drawn static map (same markers, from the same lat/lng) stays on screen. Under the map a button always opens Google Maps.
import React, { useMemo } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { useReducedMotion, useTheme } from '../ui';
import { t } from '../lib/i18n';
import type { LatLng, Place } from '../lib/places';

export const MAP_TIMEOUT_MS = 6000;
const KEY = String((Constants.expoConfig?.extra as { googleMapsKey?: string } | undefined)?.googleMapsKey || '').trim();

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:__LAND__;font-family:-apple-system,Roboto,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent}
#fb,#map{position:absolute;inset:0;width:100%;height:100%}
#map{opacity:0;transition:opacity .5s}
#map.on{opacity:1}
#card{position:absolute;left:10px;right:10px;bottom:10px;max-height:46%;overflow:auto;background:__CARD__;color:__INK__;border-radius:18px;padding:12px 14px;box-shadow:0 6px 24px rgba(17,17,20,.28);display:none;z-index:5}
#card h4{margin:0 28px 6px 0;font:700 14px/18px sans-serif}
#card .r{display:flex;justify-content:space-between;gap:10px;font:600 13px/24px sans-serif;border-top:1px solid __LINE__}
#card .r span:last-child{opacity:.7;text-align:right}
#x{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:15px;background:__LINE__;color:__INK__;font:700 16px/30px sans-serif;cursor:pointer}
#note{position:absolute;top:10px;left:10px;right:10px;z-index:4;display:none;background:__CARD__;color:__INK__;border-radius:12px;padding:6px 10px;font:600 12px/16px sans-serif;box-shadow:0 2px 10px rgba(17,17,20,.2)}
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
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function showCard(pl){document.getElementById('ch').textContent=pl.label;var l=document.getElementById('cl');l.innerHTML='';
 pl.cars.forEach(function(c){var r=document.createElement('div');r.className='r';var a=document.createElement('span');a.textContent=c.plate;var b=document.createElement('span');b.textContent=c.model;r.appendChild(a);r.appendChild(b);l.appendChild(r)});
 document.getElementById('card').style.display='block'}
document.getElementById('x').onclick=function(){document.getElementById('card').style.display='none'};
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
function fail(){if(ready||failed)return;failed=true;document.getElementById('map').style.display='none';note(CFG.tr.offline)}
setTimeout(fail,__MS__);
/* ---- Google map ---- */
var GS=D?[{elementType:'geometry',stylers:[{color:'#17171A'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#A1A1AA'}]},{elementType:'labels.text.stroke',stylers:[{color:'#17171A'},{weight:3}]},{featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'poi.park',stylers:[{visibility:'on'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#12362F'}]},{featureType:'poi.park',elementType:'labels',stylers:[{visibility:'off'}]},{featureType:'road',elementType:'geometry.fill',stylers:[{color:'#33333A'}]},{featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#52525B'}]},{featureType:'transit',stylers:[{visibility:'off'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#1F2A3A'}]}]
 :[{elementType:'geometry',stylers:[{color:'#F1F1F3'}]},{elementType:'labels.icon',stylers:[{visibility:'off'}]},{elementType:'labels.text.fill',stylers:[{color:'#3F3F46'}]},{elementType:'labels.text.stroke',stylers:[{color:'#F7F7F8'},{weight:3}]},{featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'poi.park',stylers:[{visibility:'on'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{color:'#D3F1E3'}]},{featureType:'poi.park',elementType:'labels',stylers:[{visibility:'off'}]},{featureType:'landscape.man_made',elementType:'geometry.fill',stylers:[{color:'#E4DBFA'}]},{featureType:'road',elementType:'geometry.fill',stylers:[{color:'#FFFFFF'}]},{featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#C9B6F5'}]},{featureType:'transit',stylers:[{visibility:'off'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#CFDCEB'}]}];
function pin(n){var svg='<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="24" cy="26" r="18" fill="#5409DA" stroke="#fff" stroke-width="3"/><path d="M24 36s7-6 7-11.5a7 7 0 0 0-14 0C17 30 24 36 24 36z" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="24" cy="24.5" r="2.4" fill="#fff"/><circle cx="39" cy="11" r="10" fill="#fff" stroke="#5409DA" stroke-width="2.5"/><text x="39" y="15.2" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="800" fill="#5409DA">'+n+'</text></svg>';return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg)}
function initMap(){
 if(failed)return;
 var q=pts.concat(CFG.me?[CFG.me]:[]);if(!q.length||!window.google||!google.maps)return fail();
 try{
  map=new google.maps.Map(document.getElementById('map'),{center:{lat:q[0].lat,lng:q[0].lng},zoom:15,styles:GS,backgroundColor:P.land,disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy',clickableIcons:false,keyboardShortcuts:false,rotateControl:false,tilt:0});
  pts.forEach(function(p){var m=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map:map,title:p.label,icon:{url:pin(p.cars.length),scaledSize:new google.maps.Size(50,50),anchor:new google.maps.Point(24,26)}});m.addListener('click',function(){showCard(p)})});
  if(CFG.me)new google.maps.Marker({position:{lat:CFG.me.lat,lng:CFG.me.lng},map:map,title:CFG.tr.you,clickable:false,zIndex:1,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#14C08A',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
  if(q.length>1){var b=new google.maps.LatLngBounds();q.forEach(function(p){b.extend({lat:p.lat,lng:p.lng})});map.fitBounds(b,{top:60,bottom:60,left:40,right:40});google.maps.event.addListenerOnce(map,'idle',function(){if(map.getZoom()>16)map.setZoom(16)})}
  map.addListener('click',function(){document.getElementById('card').style.display='none'});
  google.maps.event.addListenerOnce(map,'tilesloaded',function(){if(failed)return;ready=true;document.getElementById('map').className='on';document.getElementById('fb').style.display='none'});
 }catch(e){fail()}
}
window.initMap=initMap;
window.gm_authFailure=function(){ready=false;fail()};
if(!CFG.key)fail();
else{var sc=document.createElement('script');sc.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(CFG.key)+'&callback=initMap&loading=async';sc.async=true;sc.onerror=fail;document.head.appendChild(sc)}
</script></body></html>`;

export type MapProps = { places: Place[]; me?: LatLng | null; height?: number };

export function mapHtml(places: Place[], me: LatLng | null | undefined, dark: boolean, reduce: boolean, opts?: { key?: string; ms?: number }) {
  const cfg = {
    places: places.map((p) => ({ id: p.id, label: p.label, lat: p.lat, lng: p.lng, cars: p.cars })),
    me: me || null, dark, reduce, key: opts?.key ?? KEY,
    tr: { offline: t('Map nahi khula. Simple naksha dikha rahe hain'), you: t('Meri location') },
  };
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const c = dark ? { land: '#17171A', card: '#1E1E22', ink: '#F4F4F5', line: 'rgba(255,255,255,.14)' } : { land: '#F1F1F3', card: '#FFFFFF', ink: '#111114', line: 'rgba(17,17,20,.12)' };
  let html = PAGE.replace('__MS__', String(opts?.ms ?? MAP_TIMEOUT_MS))
    .replace(/__LAND__/g, c.land).replace(/__CARD__/g, c.card).replace(/__INK__/g, c.ink).replace(/__LINE__/g, c.line);
  html = html.replace('__CFG__', () => json);
  return html;
}

export default function MapView({ places, me, height = 340 }: MapProps) {
  const { dark } = useTheme();
  const reduce = useReducedMotion();
  // memoised on values, not object identity: a new html/source object on every render makes the WebView reload in a loop
  const sig = JSON.stringify([places, me?.lat, me?.lng, dark, reduce]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapHtml(places, me, dark, reduce), [sig]);
  const source = useMemo(() => ({ html, baseUrl: 'https://washingdaddy.com/' }), [html]);
  const first = places[0] || null;
  const open = () => {
    const q = first ? `${first.lat},${first.lng}` : me ? `${me.lat},${me.lng}` : '';
    if (!q) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    if (Platform.OS === 'web') (globalThis as { open?: (u: string, t: string) => void }).open?.(url, '_blank');
    else Linking.openURL(url).catch(() => {});
  };
  const box = { height, borderRadius: 16, overflow: 'hidden' as const, backgroundColor: dark ? '#17171A' : '#F1F1F3' };
  const label = t('Jahan aap kaam karte ho');
  const btn = (
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={t('Google Maps mein kholo')}
      style={{ marginTop: 10, minHeight: 48, borderRadius: 14, borderWidth: 2, borderColor: '#5409DA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
      <Text style={{ color: dark ? '#C9B6F5' : '#5409DA', fontSize: 15, fontWeight: '700' }}>{t('Google Maps mein kholo')}</Text>
    </Pressable>
  );
  if (Platform.OS === 'web') {
    return (
      <View>
        <View style={box} accessibilityLabel={label}>
          {React.createElement('iframe', { title: label, srcDoc: html, sandbox: 'allow-scripts', style: { border: 0, width: '100%', height: '100%', display: 'block' } })}
        </View>
        {btn}
      </View>
    );
  }
  return (
    <View>
    <View style={box} accessibilityLabel={label}>
      <WebView
        originWhitelist={['*']} source={source} javaScriptEnabled domStorageEnabled
        scrollEnabled={false} nestedScrollEnabled bounces={false} overScrollMode="never" setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
    {btn}
    </View>
  );
}
