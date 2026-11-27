// Read-only picture of where a car is parked: a calm street-style tile with a pin (and a small dot for the usual spot).
// It is a drawing, not a live map, so it works in the preview and never asks for map keys. Coordinates are printed under it.
import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Circle, Path } from 'react-native-svg';
import { Txt } from './kit';
import { P } from './pr';

const W = 320, SPAN = 0.006;   // the tile shows about 600 m across
const BLOCKS: [number, number, number, number][] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) BLOCKS.push([8 + c * 78, 8 + r * 56, 64, 44]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function SpotMap({ lat, lng, home, h = 140, caption = true }: { lat: number; lng: number; home?: { lat: number; lng: number } | null; h?: number; caption?: boolean }) {
  const cx = W / 2, cy = h / 2;
  const hx = home ? clamp(cx + ((home.lng - lng) / SPAN) * W, 14, W - 14) : null, hy = home ? clamp(cy - ((home.lat - lat) / SPAN) * W, 14, h - 14) : null;
  return (
    <View>
      <View style={{ height: h, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: P.line, backgroundColor: '#F4F4F5' }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="xMidYMid slice">
          <Rect width={W} height={h} fill="#F4F4F5" />
          {BLOCKS.map(([x, y, w, hh], i) => y + hh < h + 40 ? <Rect key={i} x={x} y={y} width={w} height={hh} rx={5} fill={i % 3 === 1 ? '#D4D4D8' : '#E4E4E7'} /> : null)}
          <Line x1={0} y1={cy} x2={W} y2={cy} stroke="#FFFFFF" strokeWidth={4} />
          <Line x1={cx} y1={0} x2={cx} y2={h} stroke="#FFFFFF" strokeWidth={4} />
          {hx != null && hy != null ? <Circle cx={hx} cy={hy} r={6} fill="#FFFFFF" stroke="#737373" strokeWidth={2} /> : null}
          <Path d={`M${cx} ${cy + 2} c-9 -9 -13 -15 -13 -21 a13 13 0 1 1 26 0 c0 6 -4 12 -13 21z`} fill="#5409DA" stroke="#FFFFFF" strokeWidth={2} />
          <Circle cx={cx} cy={cy - 19} r={4.5} fill="#FFFFFF" />
        </Svg>
      </View>
      {caption ? <Txt size={12} color={P.muted} style={{ marginTop: 6 }}>{lat.toFixed(5)}, {lng.toFixed(5)}{home ? '  ·  grey dot is the usual spot' : ''}</Txt> : null}
    </View>
  );
}
