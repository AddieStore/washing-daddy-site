// Address picker map on phones: the real Google map. The centre pin is drawn by the page above this view; the map is dragged underneath it.
import React, { useImperativeHandle, useRef } from 'react';
import { View, Text } from 'react-native';
import type MapViewType from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { PickMapProps, PickMapRef } from './PickMap';

// Loaded defensively: if the native maps module is missing from a build, importing react-native-maps throws at
// start-up and would crash the whole app. Here it only costs the map (a note is shown instead).
let RNM: typeof import('react-native-maps') | null = null;
try { RNM = require('react-native-maps') } catch (e) { console.warn('react-native-maps failed to load', e) }

export function PickMap({ start, onMoveStart, onSettle, me, ref }: PickMapProps) {
  const map = useRef<MapViewType>(null), moving = useRef(false), skip = useRef(false);
  useImperativeHandle(ref, (): PickMapRef => ({
    flyTo: (p, zoomed) => { skip.current = false; map.current?.animateCamera({ center: { latitude: p.lat, longitude: p.lng }, ...(zoomed ? { zoom: 17 } : {}) }, 450) },
  }), []);
  const begin = () => { if (!moving.current) { moving.current = true; onMoveStart() } };
  const done = (r: Region) => { moving.current = false; onSettle({ lat: r.latitude, lng: r.longitude }) };
  if (!RNM) return <View style={{ flex: 1, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' }}><Text>Map could not load on this phone</Text></View>;
  const MapView = RNM.default, PROVIDER_GOOGLE = RNM.PROVIDER_GOOGLE;
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F5' }}>
      <MapView ref={map} style={{ flex: 1 }} provider={PROVIDER_GOOGLE}
        initialCamera={{ center: { latitude: start.lat, longitude: start.lng }, zoom: 17, heading: 0, pitch: 0 }}
        onRegionChange={(_, g) => { if (g?.isGesture) begin() }} onRegionChangeComplete={done}
        showsUserLocation={!!me} showsMyLocationButton={false} showsCompass={false} toolbarEnabled={false} showsBuildings={false} showsTraffic={false}
        rotateEnabled={false} pitchEnabled={false} moveOnMarkerPress={false} mapPadding={{ top: 0, left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}
