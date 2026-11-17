// Preview version of the address map: no map library, a drawn street grid you can drag. Same props as the Google map on phones.
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { PickMapProps, PickMapRef } from './PickMap';

const KX = 0.016 / 360, KY = 0.039 / 1000;   // degrees per pixel (lng, lat)
const PX = 74, PY = 88;                      // city block pitch in px
const hash = (i: number, j: number) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 };

function Streets({ lat, lng, w, h }: { lat: number; lng: number; w: number; h: number }) {
  const wx = lng / KX, wy = -lat / KY, ox = wx - w / 2, oy = wy - h / 2;
  const i0 = Math.floor(ox / PX), j0 = Math.floor(oy / PY), ni = Math.ceil(w / PX) + 2, nj = Math.ceil(h / PY) + 2, out: React.ReactNode[] = [];
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, r = hash(gi, gj), x = gi * PX - ox, y = gj * PY - oy;
    if (gi % 5 === 0 || gj % 4 === 0) continue;
    const park = r > 0.86;
    out.push(<Rect key={i + '_' + j} x={x + 7} y={y + 7} width={PX - 14} height={PY - 14} rx={park ? 14 : 6} fill={park ? '#DCEBDD' : r > 0.5 ? '#E4E4E7' : '#D9D9DE'} />);
  }
  return <Svg width={w} height={h}><Rect width={w} height={h} fill="#F4F4F5" />{out}</Svg>;
}

export function PickMap({ start, onMoveStart, onSettle, ref }: PickMapProps) {
  const [c, setC] = useState(start), cRef = useRef(start), base = useRef(start), [size, setSize] = useState({ w: 360, h: 460 }), timer = useRef<any>(null);
  const settle = () => { clearTimeout(timer.current); timer.current = setTimeout(() => onSettle(cRef.current), 350) };
  useImperativeHandle(ref, (): PickMapRef => ({ flyTo: p => { onMoveStart(); cRef.current = p; setC(p); settle() } }), []);
  useEffect(() => { settle(); return () => clearTimeout(timer.current) }, []);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { base.current = cRef.current; clearTimeout(timer.current); onMoveStart() },
    onPanResponderMove: (_, g) => { const p = { lat: base.current.lat + g.dy * KY, lng: base.current.lng - g.dx * KX }; cRef.current = p; setC(p) },
    onPanResponderRelease: settle, onPanResponderTerminate: settle,
  })).current;
  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
      <Streets lat={c.lat} lng={c.lng} w={size.w} h={size.h} />
    </View>
  );
}
