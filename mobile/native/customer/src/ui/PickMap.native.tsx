// Address picker map on phones: the real Google map (Maps JavaScript API) shown in a WebView.
// Why not react-native-maps: both releases of it crashed this app at launch on Ravi's phone (Expo 58 / RN 0.88),
// and a WebView is already part of the app. The centre pin is drawn by the page above this view; the map is dragged underneath it.
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { KEY } from '../geo';
import type { PickMapProps, PickMapRef } from './PickMap';

const page = (lat: number, lng: number, key: string) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#m{margin:0;height:100%;background:#F4F4F5;overflow:hidden}</style></head><body><div id="m"></div>
<script>
var map,dot;
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
window.gm_authFailure=function(){post({t:'fail',why:'key'})};
window.initMap=function(){
  map=new google.maps.Map(document.getElementById('m'),{center:{lat:${lat},lng:${lng}},zoom:17,disableDefaultUI:true,gestureHandling:'greedy',clickableIcons:false,keyboardShortcuts:false,rotateControl:false,tilt:0});
  map.addListener('dragstart',function(){post({t:'move'})});
  map.addListener('zoom_changed',function(){post({t:'move'})});
  map.addListener('idle',function(){var c=map.getCenter();post({t:'idle',lat:c.lat(),lng:c.lng()})});
  post({t:'ready'});
};
window.fly=function(la,ln,z){if(!map)return;var c=map.getCenter(),same=Math.abs(c.lat()-la)<0.00002&&Math.abs(c.lng()-ln)<0.00002&&(!z||map.getZoom()==17);if(same){post({t:'idle',lat:c.lat(),lng:c.lng()});return}post({t:'move'});map.panTo({lat:la,lng:ln});if(z)map.setZoom(17)};
window.me=function(la,ln){if(!map)return;var p={lat:la,lng:ln};if(!dot){dot=new google.maps.Marker({position:p,map:map,clickable:false,zIndex:1,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#2F6BFF',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}})}else dot.setPosition(p)};
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initMap&loading=async" onerror="post({t:'fail',why:'net'})"></script>
</body></html>`;

export function PickMap({ start, onMoveStart, onSettle, me, ref }: PickMapProps) {
  const web = useRef<React.ComponentRef<typeof WebView>>(null), ready = useRef(false), meRef = useRef(me);
  const [fail, setFail] = useState('');
  // the source object must keep the same identity: a new object on every render makes the WebView reload (the map then flickers in a loop)
  const source = useMemo(() => ({ html: page(start.lat, start.lng, KEY), baseUrl: 'https://washingdaddy.com' }), []);
  const run = (js: string) => web.current?.injectJavaScript(js + ';true;');
  const showMe = () => { const m = meRef.current; if (ready.current && m) run(`me(${m.lat},${m.lng})`) };
  useImperativeHandle(ref, (): PickMapRef => ({ flyTo: (p, zoomed) => run(`fly(${p.lat},${p.lng},${zoomed ? 'true' : 'false'})`) }), []);
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
