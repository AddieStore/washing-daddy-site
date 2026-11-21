// Preview version of the address map: no map library, a drawn street grid you can drag. Same props as the Google map on phones.
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Rect, Line, Path, Text } from 'react-native-svg';
import type { PickMapProps, PickMapRef } from './PickMap';

const KX = 0.016 / 360, KY = 0.039 / 1000;   // degrees per pixel (lng, lat)
const PX = 74, PY = 88;                      // city block pitch in px
const hash = (i: number, j: number) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 };

const MAJ_I = 5, MAJ_J = 4;                  // every 5th column / 4th row is a main road
const ROADS = ['Ring Road', 'Mall Road', 'Rohini Marg', 'Sector Link Rd', 'Station Rd', 'Park Avenue', 'Canal Road', 'MG Road'];
const AREAS = ['Sunder Park', 'Metro Stn', 'City Mall', 'Govt School', 'Sai Mandir', 'Civil Hospital', 'Community Hall', 'Petrol Pump'];
const RIVER_P = 1900;                        // river repeats every RIVER_P px of world y

function Streets({ lat, lng, w, h }: { lat: number; lng: number; w: number; h: number }) {
  const wx = lng / KX, wy = -lat / KY, ox = wx - w / 2, oy = wy - h / 2;
  const i0 = Math.floor(ox / PX) - 1, j0 = Math.floor(oy / PY) - 1, ni = Math.ceil(w / PX) + 3, nj = Math.ceil(h / PY) + 3;
  const blocks: React.ReactNode[] = [], minor: React.ReactNode[] = [], major: React.ReactNode[] = [], labels: React.ReactNode[] = [];
  const road = (key: string, x1: number, y1: number, x2: number, y2: number, big: boolean) => {
    const c = big ? '#E9C46A' : '#D8D3C8', f = big ? '#FFF1C2' : '#FFFFFF', wd = big ? 13 : 6;
    (big ? major : minor).push(<React.Fragment key={key}><Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={wd + 2.5} strokeLinecap="round" /><Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={f} strokeWidth={wd} strokeLinecap="round" /></React.Fragment>);
  };
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, r = hash(gi, gj), x = gi * PX - ox, y = gj * PY - oy;
    const mi = ((gi % MAJ_I) + MAJ_I) % MAJ_I === 0, mj = ((gj % MAJ_J) + MAJ_J) % MAJ_J === 0;
    if (i < ni - 1) road('h' + gi + '_' + gj, x, y, x + PX, y, mj);
    if (j < nj - 1) road('v' + gi + '_' + gj, x, y, x, y + PY, mi);
    if (mi || mj) continue;
    const park = r > 0.88, school = !park && r > 0.8;
    blocks.push(<Rect key={i + '_' + j} x={x + 5} y={y + 5} width={PX - 10} height={PY - 10} rx={park ? 10 : 3} fill={park ? '#CDE8C2' : school ? '#E8DDF4' : r > 0.5 ? '#E7E2D6' : '#EDE9DF'} />);
    if (!park) for (let k = 0; k < 3; k++) { const hh = hash(gi * 7 + k, gj * 3 + k); blocks.push(<Rect key={'b' + i + '_' + j + '_' + k} x={x + 10 + (k % 2) * 28} y={y + 10 + k * 22} width={20 + hh * 12} height={14 + hh * 6} rx={2} fill="#DCD6C8" opacity={0.7} />) }
    if (r > 0.88 || (r < 0.1 && r > 0.05)) labels.push(<Text key={'a' + i + '_' + j} x={x + PX / 2} y={y + PY / 2 + 3} fontSize={9} fill={park ? '#4C8A47' : '#7A7566'} textAnchor="middle" fontWeight="600" fontFamily="Poppins_500Medium, Poppins, sans-serif">{AREAS[Math.floor(hash(gj, gi) * AREAS.length)]}</Text>);
  }
  /* diagonal arterial + river (wavy band), drawn in world space */
  const extras: React.ReactNode[] = [];
  const k0 = Math.floor((oy - 200) / RIVER_P) - 0, k1 = Math.floor((oy + h + 200) / RIVER_P);
  for (let k = k0; k <= k1; k++) {
    const cy = k * RIVER_P + 1050, pts: string[] = [];
    for (let sx = -40; sx <= w + 40; sx += 20) pts.push(`${sx},${cy - oy + 70 * Math.sin((sx + ox) / 260) + 30 * Math.sin((sx + ox) / 90)}`);
    const d = 'M' + pts.join(' L');
    extras.push(<Path key={'rv' + k} d={d} stroke="#9CCBEF" strokeWidth={44} fill="none" strokeLinecap="round" strokeLinejoin="round" />, <Path key={'rw' + k} d={d} stroke="#B7DAF3" strokeWidth={30} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
      <Text key={'rt' + k} x={w / 2 - ((ox % 400) - 200) * 0} y={cy - oy + 70 * Math.sin((w / 2 + ox) / 260) + 30 * Math.sin((w / 2 + ox) / 90) + 3} fontSize={10} fill="#5B94BE" textAnchor="middle" fontWeight="600" fontFamily="Poppins_500Medium, Poppins, sans-serif" fontStyle="italic">Western Yamuna Canal</Text>);
  }
  /* main-road names, once per ~3 major segments */
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, x = gi * PX - ox, y = gj * PY - oy;
    if (((gj % MAJ_J) + MAJ_J) % MAJ_J === 0 && ((gi % 3) + 3) % 3 === 1 && i < ni - 1) labels.push(<Text key={'mh' + gi + '_' + gj} x={x + PX / 2} y={y + 3} fontSize={9} fill="#8A6D1E" textAnchor="middle" fontWeight="600" fontFamily="Poppins_500Medium, Poppins, sans-serif">{ROADS[(((gj / MAJ_J) % ROADS.length) + ROADS.length) % ROADS.length]}</Text>);
    if (((gi % MAJ_I) + MAJ_I) % MAJ_I === 0 && ((gj % 3) + 3) % 3 === 1 && j < nj - 1) labels.push(<Text key={'mv' + gi + '_' + gj} x={x} y={y + PY / 2} fontSize={9} fill="#8A6D1E" textAnchor="middle" fontWeight="600" fontFamily="Poppins_500Medium, Poppins, sans-serif" transform={`rotate(-90 ${x} ${y + PY / 2}) translate(0 3)`}>{ROADS[(((gi / MAJ_I) % ROADS.length) + ROADS.length + 3) % ROADS.length]}</Text>);
  }
  return <Svg width={w} height={h}><Rect width={w} height={h} fill="#F3F0E8" />{blocks}{extras}{minor}{major}{labels}</Svg>;
}

export function PickMap({ start, onMoveStart, onSettle, me, ref }: PickMapProps) {
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
      {me ? <View pointerEvents="none" style={{ position: 'absolute', left: size.w / 2 + (me.lng - c.lng) / KX - 20, top: size.h / 2 - (me.lat - c.lat) / KY - 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(66,133,244,0.18)' }} />
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#4285F4', borderWidth: 3, borderColor: '#fff' }} />
      </View> : null}
    </View>
  );
}
