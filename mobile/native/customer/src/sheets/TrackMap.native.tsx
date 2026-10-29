// Live tracking map: MapLibre + OpenFreeMap (no key), tilted 3-D buildings tinted violet, gold home pin, WD scooter, dashed route.
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer, type CameraRef, type LngLat } from '@maplibre/maplibre-react-native';
import type { Track } from '../state';
import { Scooter, HomePin } from './Scooter';

const bearing = (a: LngLat, b: LngLat) => {
  const r = (x: number) => x * Math.PI / 180, dl = r(b[0] - a[0]);
  const y = Math.sin(dl) * Math.cos(r(b[1])), x = Math.cos(r(a[1])) * Math.sin(r(b[1])) - Math.sin(r(a[1])) * Math.cos(r(b[1])) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

export function TrackMap({ track }: { track: Track }) {
  const cam = useRef<CameraRef>(null), home = track.home as LngLat;
  const target: LngLat | null = track.lng && track.lat ? [track.lng, track.lat] : null;
  const [pos, setPos] = useState<LngLat | null>(target), from = useRef<LngLat | null>(null);
  // glide the scooter to each new fix over 900 ms
  useEffect(() => {
    if (!target) return;
    const a = from.current;
    if (!a) { from.current = target; setPos(target); return; }
    const t0 = Date.now(); let id: ReturnType<typeof setInterval>;
    id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 900), e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
      setPos([a[0] + (target[0] - a[0]) * e, a[1] + (target[1] - a[1]) * e]);
      if (k >= 1) { clearInterval(id); from.current = target; }
    }, 50);
    return () => { clearInterval(id); from.current = target; };
  }, [target?.[0], target?.[1]]);
  // camera follows the washer, looking toward home
  useEffect(() => {
    if (target) cam.current?.easeTo({ center: target, bearing: bearing(target, home) - 20, pitch: 58, zoom: 15.8, duration: 1100 });
  }, [target?.[0], target?.[1]]);
  const flip = !!target && bearing(target, home) > 180;
  const line: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pos ? [pos, home] : [] } };
  return (
    <View style={{ flex: 1, backgroundColor: '#150830' }}>
      <Map style={{ flex: 1 }} mapStyle="https://tiles.openfreemap.org/styles/liberty" logo={false} attributionPosition={{ bottom: 6, right: 6 }}>
        <Camera ref={cam} initialViewState={{ center: home, zoom: 15, pitch: 55, bearing: 30 }} />
        <Layer id="wd-buildings-3d" type="fill-extrusion" source="openmaptiles" source-layer="building" minzoom={14}
          style={{ fillExtrusionColor: ['interpolate', ['linear'], ['get', 'render_height'], 0, '#2d1260', 20, '#3e1a80', 50, '#5409DA', 100, '#7640ff'] as any,
            fillExtrusionHeight: ['get', 'render_height'] as any, fillExtrusionBase: ['get', 'render_min_height'] as any, fillExtrusionOpacity: 0.82 }} />
        <GeoJSONSource id="wd-route" data={line}>
          <Layer id="wd-route-line" type="line" style={{ lineColor: '#FFBA08', lineWidth: 3, lineDasharray: [2, 3], lineOpacity: 0.8, lineCap: 'round', lineJoin: 'round' }} />
        </GeoJSONSource>
        <Marker id="home" lngLat={home} anchor="bottom"><HomePin /></Marker>
        {pos ? <Marker id="washer" lngLat={pos} anchor="bottom"><Scooter flip={flip} /></Marker> : null}
      </Map>
    </View>
  );
}
