// Address picker map on phones: the real Google map (Maps JavaScript API) shown in a WebView.
// Why not react-native-maps: both releases of it crashed this app at launch on Ravi's phone (Expo 58 / RN 0.88),
// and a WebView is already part of the app. The centre pin is drawn by the page above this view; the map is dragged underneath it.
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { KEY } from '../geo';
import type { PickMapProps, PickMapRef } from './PickMap';

// Calm light-grey map (the brand pin and service zones are the only colour): white roads, muted parks and water, no shop/POI icons.
const STYLE = JSON.stringify([
  { elementType: 'geometry', stylers: [{ color: '#F1F1F3' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E8E96' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F7F8' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#A3A3AB' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E3EEE3' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#E9E9ED' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#DDDDE2' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E2E2E6' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#DADADF' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D9E7F2' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]);

const page = (lat: number, lng: number, key: string, areas: NonNullable<PickMapProps['areas']>) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#m{margin:0;height:100%;background:#F1F1F3;overflow:hidden}</style></head><body><div id="m"></div>
<script>
var map,dot,zones=[];
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
window.gm_authFailure=function(){post({t:'fail',why:'key'})};
window.initMap=function(){
  map=new google.maps.Map(document.getElementById('m'),{center:{lat:${lat},lng:${lng}},zoom:17,styles:${STYLE},backgroundColor:'#F1F1F3',disableDefaultUI:true,gestureHandling:'greedy',clickableIcons:false,keyboardShortcuts:false,rotateControl:false,tilt:0});
  map.addListener('dragstart',function(){post({t:'move'})});
  map.addListener('zoom_changed',function(){post({t:'move'})});
  map.addListener('idle',function(){var c=map.getCenter();post({t:'idle',lat:c.lat(),lng:c.lng()})});
  ${JSON.stringify(areas.map(a => ({ lat: a.lat, lng: a.lng, r: a.r })))}.forEach(function(a){zones.push(new google.maps.Circle({map:map,center:{lat:a.lat,lng:a.lng},radius:a.r,clickable:false,strokeColor:'#5409DA',strokeOpacity:0.45,strokeWeight:1.5,fillColor:'#5409DA',fillOpacity:0.035,zIndex:0}))});
  post({t:'ready'});
};
window.fly=function(la,ln,z){if(!map)return;var c=map.getCenter(),same=Math.abs(c.lat()-la)<0.00002&&Math.abs(c.lng()-ln)<0.00002&&(!z||map.getZoom()==17);if(same){post({t:'idle',lat:c.lat(),lng:c.lng()});return}post({t:'move'});map.panTo({lat:la,lng:ln});if(z)map.setZoom(17)};
window.showAreas=function(){if(!map||!zones.length)return;var b=new google.maps.LatLngBounds();zones.forEach(function(z){b.union(z.getBounds())});post({t:'move'});map.fitBounds(b,48)};
window.me=function(la,ln){if(!map)return;var p={lat:la,lng:ln};if(!dot){dot=new google.maps.Marker({position:p,map:map,clickable:false,zIndex:1,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#2F6BFF',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}})}else dot.setPosition(p)};
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initMap&loading=async" onerror="post({t:'fail',why:'net'})"></script>
</body></html>`;

export function PickMap({ start, onMoveStart, onSettle, me, areas, ref }: PickMapProps) {
  const web = useRef<React.ComponentRef<typeof WebView>>(null), ready = useRef(false), meRef = useRef(me);
  const [fail, setFail] = useState('');
  // the source object must keep the same identity: a new object on every render makes the WebView reload (the map then flickers in a loop)
  const source = useMemo(() => ({ html: page(start.lat, start.lng, KEY, areas || []), baseUrl: 'https://washingdaddy.com' }), []);
  const run = (js: string) => web.current?.injectJavaScript(js + ';true;');
  const showMe = () => { const m = meRef.current; if (ready.current && m) run(`me(${m.lat},${m.lng})`) };
  useImperativeHandle(ref, (): PickMapRef => ({ flyTo: (p, zoomed) => run(`fly(${p.lat},${p.lng},${zoomed ? 'true' : 'false'})`), showAreas: () => run('showAreas()') }), []);
  useEffect(() => { meRef.current = me; showMe() }, [me?.lat, me?.lng]);
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F5' }}>
      <WebView ref={web} style={{ flex: 1, backgroundColor: '#F4F4F5' }} source={source}
        androidLayerType="hardware" cacheEnabled originWhitelist={['*']} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} overScrollMode="never"
        scrollEnabled={false} bounces={false} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
        onMessage={e => {
          let m: any; try { m = JSON.parse(e.nativeEvent.data) } catch { return }
          if (m.t === 'ready') { ready.current = true; showMe() }
          else if (m.t === 'move') onMoveStart();
          else if (m.t === 'idle') onSettle({ lat: m.lat, lng: m.lng });
          else if (m.t === 'fail') setFail(m.why === 'key' ? 'The map key was not accepted.' : 'The map could not connect.');
        }}
        onError={() => setFail('The map could not connect.')} />
      {fail ? <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: 12, backgroundColor: '#fff', borderRadius: 10, padding: 10 }}><Text style={{ fontSize: 12, color: '#B42318' }}>{fail}</Text></View> : null}
    </View>
  );
}
