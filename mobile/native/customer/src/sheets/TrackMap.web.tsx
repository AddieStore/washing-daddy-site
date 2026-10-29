// Preview version of the tracking map: no map library, a stylised violet street map drawn with SVG.
import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { Track } from '../state';
import { Scooter, HomePin } from './Scooter';

const W = 360, H = 520, SPAN_LNG = 0.016, SPAN_LAT = 0.0185;   // the window shows about 1.1 x 1.4 km around home
const BLOCKS: [number, number, number, number][] = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) BLOCKS.push([10 + c * 72, 14 + r * 86, 56, 70]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function TrackMap({ track }: { track: Track }) {
  const [hx, hy] = [W / 2, H * 0.42];
  const px = (lng: number, lat: number) => [hx + clamp((lng - track.home[0]) / SPAN_LNG, -.48, .48) * W, hy - clamp((lat - track.home[1]) / SPAN_LAT, -.45, .55) * H];
  const s = track.lng && track.lat ? px(track.lng, track.lat) : null;
  return (
    <View style={{ flex: 1, backgroundColor: '#1d0b45', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Rect width={W} height={H} fill="#24065F" />
          {BLOCKS.map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} rx={6} fill={['#3e1a80', '#4a22a0', '#5409DA'][i % 3]} opacity={0.85} />)}
          <Line x1={0} y1={hy} x2={W} y2={hy} stroke="#FFF6E9" strokeOpacity={0.12} strokeWidth={3} />
          <Line x1={hx} y1={0} x2={hx} y2={H} stroke="#FFF6E9" strokeOpacity={0.12} strokeWidth={3} />
          {s ? <Path d={`M${s[0]} ${s[1]} L${hx} ${hy}`} stroke="#FFBA08" strokeWidth={3} strokeDasharray="7 9" strokeLinecap="round" opacity={0.85} /> : null}
        </Svg>
        <View style={{ position: 'absolute', left: hx - 22, top: hy - 52 }}><HomePin /></View>
        {s ? <View style={{ position: 'absolute', left: s[0] - 36, top: s[1] - 52 }}><Scooter flip={s[0] > hx} /></View> : null}
      </View>
    </View>
  );
}
