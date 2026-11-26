// Address picker map on iPhone: real Apple Maps (MapKit, through expo-maps). No key, no web view, native gestures, Apple's own
// street names and landmarks. The centre pin is drawn by the page above this view; the map is dragged underneath it, exactly like
// the Google / OpenFreeMap version (PickMap.native.tsx), which still runs on iOS 16 (expo-maps' Apple map needs iOS 17).
//
// expo-maps reports the camera only when a move ENDS (onCameraMove, also once on mount), so "the user started dragging" comes from
// the touch on the wrapper view, and a programmatic flyTo that lands exactly where the map already is settles by itself.
import React, { useImperativeHandle, useRef } from 'react';
import { Platform, View } from 'react-native';
import { AppleMaps } from 'expo-maps';
import { PickMap as WebPickMap } from './PickMap.native';
import { distance } from '../state';
import type { PickMapProps, PickMapRef } from './PickMap';

const ZOOM = 16.5;
const APPLE_OK = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 17;

function ApplePickMap({ start, onMoveStart, onSettle, areas, ref }: PickMapProps) {
  const map = useRef<AppleMaps.MapView>(null), last = useRef<{ lat: number; lng: number } | null>(null), fallback = useRef<any>(null);
  const settle = (p: { lat: number; lng: number }) => { clearTimeout(fallback.current); last.current = p; onSettle(p) };
  useImperativeHandle(ref, (): PickMapRef => ({
    flyTo(p, zoomed) {
      const here = last.current;
      if (here && distance(here.lat, here.lng, p.lat, p.lng) < 2 && !zoomed) { onSettle(here); return }
      onMoveStart();
      map.current?.setCameraPosition({ coordinates: { latitude: p.lat, longitude: p.lng }, ...(zoomed ? { zoom: ZOOM } : {}) });
      // Apple Maps sends no camera event when nothing actually moved: settle on the target after a moment
      clearTimeout(fallback.current); fallback.current = setTimeout(() => settle(p), 1400);
    },
    showAreas() {
      const zs = areas || []; if (!zs.length) return;
      const lat = zs.reduce((s, a) => s + a.lat, 0) / zs.length, lng = zs.reduce((s, a) => s + a.lng, 0) / zs.length;
      // farthest zone edge from the middle -> a zoom that shows all of it (one zoom step halves the visible distance)
      const reach = Math.max(...zs.map(a => distance(lat, lng, a.lat, a.lng) + a.r));
      const zoom = Math.max(9, Math.min(15, Math.log2(40075016 * Math.cos(lat * Math.PI / 180) / (reach * 2.6)) - 1));
      onMoveStart(); map.current?.setCameraPosition({ coordinates: { latitude: lat, longitude: lng }, zoom });
    },
  }), [areas]);
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F5' }} onTouchStart={() => onMoveStart()}>
      <AppleMaps.View
        ref={map}
        style={{ flex: 1 }}
        colorScheme={AppleMaps.MapColorScheme.LIGHT}
        cameraPosition={{ coordinates: { latitude: start.lat, longitude: start.lng }, zoom: ZOOM }}
        circles={(areas || []).map(a => ({ id: a.id, center: { latitude: a.lat, longitude: a.lng }, radius: a.r, color: 'rgba(84,9,218,0.06)', lineColor: 'rgba(84,9,218,0.55)', lineWidth: 1.5 }))}
        properties={{ isMyLocationEnabled: true, selectionEnabled: false, emphasis: 'MUTED' as any }}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
        onCameraMove={e => { const c = e.coordinates; if (c && c.latitude != null && c.longitude != null) settle({ lat: c.latitude, lng: c.longitude }) }}
      />
    </View>
  );
}

export function PickMap(p: PickMapProps) {
  return APPLE_OK ? <ApplePickMap {...p} /> : <WebPickMap {...p} />;
}
