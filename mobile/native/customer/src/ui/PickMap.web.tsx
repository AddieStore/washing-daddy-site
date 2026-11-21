// Preview version of the address map: no map library, a drawn street grid you can drag. Same props as the Google map on phones.
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Rect, Path, Text, Ellipse } from 'react-native-svg';
import type { PickMapProps, PickMapRef } from './PickMap';

const KX = 0.016 / 360, KY = 0.039 / 1000;   // degrees per pixel (lng, lat)
const PX = 74, PY = 88;                      // city block pitch in px
const hash = (i: number, j: number) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 };

const MAJ_I = 5, MAJ_J = 4;                  // every 5th column / 4th row is a main road
const ROADS = ['Ring Road', 'Mall Road', 'Rohini Marg', 'Sector Link Rd', 'Station Rd', 'Park Avenue', 'Canal Road', 'MG Road'];
const AREAS = ['Sunder Park', 'Metro Stn', 'City Mall', 'Govt School', 'Sai Mandir', 'Civil Hospital', 'Community Hall', 'Petrol Pump'];
const RIVER_P = 1900;                        // river repeats every RIVER_P px of world y
const FONT = 'Poppins_400Regular, Poppins, sans-serif';
const LBL = '#9A9AA3', VIOLET = '#5409DA';
const M_LAT = 111320;                        // metres per degree of latitude
const mod = (n: number, m: number) => ((n % m) + m) % m;

function Streets({ lat, lng, w, h }: { lat: number; lng: number; w: number; h: number }) {
  const wx = lng / KX, wy = -lat / KY, ox = wx - w / 2, oy = wy - h / 2;
  const i0 = Math.floor(ox / PX) - 1, j0 = Math.floor(oy / PY) - 1, ni = Math.ceil(w / PX) + 3, nj = Math.ceil(h / PY) + 3;
  const blocks: React.ReactNode[] = [], labels: React.ReactNode[] = [];
  let minor = '', major = '';
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, r = hash(gi, gj), x = gi * PX - ox, y = gj * PY - oy;
    const mi = mod(gi, MAJ_I) === 0, mj = mod(gj, MAJ_J) === 0;
    if (i < ni - 1) { const seg = `M${x} ${y}H${x + PX}`; if (mj) major += seg; else minor += seg }
    if (j < nj - 1) { const seg = `M${x} ${y}V${y + PY}`; if (mi) major += seg; else minor += seg }
    if (mi || mj) continue;
    const park = r > 0.9;
    blocks.push(<Rect key={'k' + i + '_' + j} x={x + 6} y={y + 6} width={PX - 12} height={PY - 12} rx={park ? 8 : 3} fill={park ? '#E2EEE2' : '#E7E7EB'} />);
    if (!park) for (let k = 0; k < 4; k++) {
      const hh = hash(gi * 7 + k, gj * 3 + k * 5); if (hh < 0.12) continue;
      const cw = (PX - 16) / 2, ch = (PY - 16) / 2, bw = 12 + hh * (cw - 14), bh = 12 + hash(gj * 5 + k, gi) * (ch - 14);
      blocks.push(<Rect key={'b' + i + '_' + j + '_' + k} x={x + 8 + (k % 2) * cw + (cw - bw) * hh} y={y + 8 + (k >> 1) * ch + (ch - bh) * (1 - hh)} width={bw} height={bh} rx={2 + (k % 2)} fill="#DEDEE3" />);
    }
    if ((park && r > 0.94) || (!park && r < 0.07)) labels.push(<Text key={'a' + i + '_' + j} x={x + PX / 2} y={y + PY / 2 + 3} fontSize={9} fill={LBL} textAnchor="middle" fontFamily={FONT}>{AREAS[Math.floor(hash(gj, gi) * AREAS.length)]}</Text>);
  }
  /* river (wavy band), drawn in world space */
  const extras: React.ReactNode[] = [];
  const k0 = Math.floor((oy - 200) / RIVER_P), k1 = Math.floor((oy + h + 200) / RIVER_P);
  for (let k = k0; k <= k1; k++) {
    const cy = k * RIVER_P + 1050, pts: string[] = [];
    for (let sx = -40; sx <= w + 40; sx += 20) pts.push(`${sx},${cy - oy + 70 * Math.sin((sx + ox) / 260) + 30 * Math.sin((sx + ox) / 90)}`);
    extras.push(<Path key={'rv' + k} d={'M' + pts.join(' L')} stroke="#D9E7F2" strokeWidth={40} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
      <Text key={'rt' + k} x={w / 2} y={cy - oy + 70 * Math.sin((w / 2 + ox) / 260) + 30 * Math.sin((w / 2 + ox) / 90) + 3} fontSize={9} fill={LBL} textAnchor="middle" fontStyle="italic" fontFamily={FONT}>Western Yamuna Canal</Text>);
  }
  /* main-road names, once per ~3 major segments */
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, x = gi * PX - ox, y = gj * PY - oy;
    if (mod(gj, MAJ_J) === 0 && mod(gi, 3) === 1 && i < ni - 1) labels.push(<Text key={'mh' + gi + '_' + gj} x={x + PX / 2} y={y + 3} fontSize={9} fill={LBL} textAnchor="middle" fontFamily={FONT}>{ROADS[mod(gj / MAJ_J, ROADS.length)]}</Text>);
    if (mod(gi, MAJ_I) === 0 && mod(gj, 3) === 1 && j < nj - 1) labels.push(<Text key={'mv' + gi + '_' + gj} x={x} y={y + PY / 2} fontSize={9} fill={LBL} textAnchor="middle" fontFamily={FONT} transform={`rotate(-90 ${x} ${y + PY / 2}) translate(0 3)`}>{ROADS[mod(gi / MAJ_I + 3, ROADS.length)]}</Text>);
  }
  const EDGE = 'rgba(0,0,0,0.04)';
  return <Svg width={w} height={h}><Rect width={w} height={h} fill="#F1F1F3" />{blocks}{extras}
    <Path d={minor} stroke={EDGE} strokeWidth={5.5} fill="none" /><Path d={major} stroke={EDGE} strokeWidth={9.5} fill="none" />
    <Path d={minor} stroke="#FFFFFF" strokeWidth={4.5} fill="none" /><Path d={major} stroke="#FFFFFF" strokeWidth={8.5} fill="none" />{labels}</Svg>;
}

type Area = { id: string; name: string; lat: number; lng: number; r: number };
function Zones({ areas, lat, lng, w, h }: { areas: Area[]; lat: number; lng: number; w: number; h: number }) {
  const mx = M_LAT * Math.cos(lat * Math.PI / 180);
  const out: React.ReactNode[] = [];
  for (const a of areas) {
    const cx = w / 2 + (a.lng - lng) / KX, cy = h / 2 - (a.lat - lat) / KY, rx = a.r / mx / KX, ry = a.r / M_LAT / KY;
    if (cx + rx < 0 || cx - rx > w || cy + ry < 0 || cy - ry > h) continue;
    const txt = 'We wash here \u00B7 ' + a.name, tw = txt.length * 5.6 + 18, ty = cy - ry;
    out.push(<React.Fragment key={a.id}>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(84,9,218,0.035)" stroke="rgba(84,9,218,0.45)" strokeWidth={1.5} strokeDasharray="6 5" />
      <Rect x={cx - tw / 2} y={ty - 10} width={tw} height={20} rx={10} fill="#FFFFFF" />
      <Text x={cx} y={ty + 3.5} fontSize={10} fill={VIOLET} textAnchor="middle" fontFamily={FONT}>{txt}</Text>
    </React.Fragment>);
  }
  return <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">{out}</Svg>;
}

export function PickMap({ start, onMoveStart, onSettle, me, areas, ref }: PickMapProps) {
  const areasRef = useRef(areas); areasRef.current = areas;
  const [c, setC] = useState(start), cRef = useRef(start), base = useRef(start), [size, setSize] = useState({ w: 360, h: 460 }), timer = useRef<any>(null);
  const settle = () => { clearTimeout(timer.current); timer.current = setTimeout(() => onSettle(cRef.current), 350) };
  useImperativeHandle(ref, (): PickMapRef => ({
    flyTo: p => { onMoveStart(); cRef.current = p; setC(p); settle() },
    // the stand-in cannot zoom: bring the first zone into view with its top edge and label just under the search bar
    showAreas: () => { const a = areasRef.current?.[0]; if (!a) return; onMoveStart(); const p = { lat: a.lat + 120 * KY, lng: a.lng }; cRef.current = p; setC(p); settle() },
  }), []);
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
      {areas && areas.length ? <Zones areas={areas} lat={c.lat} lng={c.lng} w={size.w} h={size.h} /> : null}
      {me ? <View pointerEvents="none" style={{ position: 'absolute', left: size.w / 2 + (me.lng - c.lng) / KX - 20, top: size.h / 2 - (me.lat - c.lat) / KY - 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(66,133,244,0.18)' }} />
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#4285F4', borderWidth: 3, borderColor: '#fff' }} />
      </View> : null}
    </View>
  );
}
