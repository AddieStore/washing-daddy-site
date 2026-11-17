// Service illustrations C (CAR_SERVICES 21-30 + offer packs + WD Pass). Pure vector art, 100x100 viewBox, soft isometric "3D" look.
// Every piece sits on a pastel tile; faces are plain polygons, with rounded joins and gentle gradients / highlights.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Rect, Circle, Ellipse, G, Polygon, Polyline, Line, Text as SText } from 'react-native-svg';

const VIO = '#5409DA', GOLD = '#FFBA08', INK = '#1A0A33';
const S = 0.866;
type Pt = [number, number, number];
const P = (i: number, j: number, k = 0): [number, number] => [50 + (i - j) * S, 50 + (i + j) * 0.5 - k];
const pts = (a: [number, number][]) => a.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
const hx = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (c: string, t: string, k: number) => { const a = hx(c), b = hx(t); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const lite = (c: string, k = 0.28) => mix(c, '#ffffff', k), dark = (c: string, k = 0.2) => mix(c, '#000000', k);

/* ---------- iso primitives ---------- */
function Poly({ p, f, o = 1, sw = 1.5 }: { p: Pt[]; f: string; o?: number; sw?: number }) {
  return <Polygon points={pts(p.map(q => P(...q)))} fill={f} stroke={f.startsWith('url') ? 'none' : f} strokeWidth={sw} strokeLinejoin="round" opacity={o} />;
}
function Box({ i, j, k = 0, a, b, h, c, top, left, right, hi = true }: { i: number; j: number; k?: number; a: number; b: number; h: number; c?: string; top?: string; left?: string; right?: string; hi?: boolean }) {
  const t = top ?? lite(c!, 0.3), l = left ?? c!, r = right ?? dark(c!, 0.2);
  const I = i, J = j, K = k;
  return <G>
    <Poly f={r} p={[[I + a, J, K], [I + a, J + b, K], [I + a, J + b, K + h], [I + a, J, K + h]]} />
    <Poly f={l} p={[[I, J + b, K], [I + a, J + b, K], [I + a, J + b, K + h], [I, J + b, K + h]]} />
    <Poly f={t} p={[[I, J, K + h], [I + a, J, K + h], [I + a, J + b, K + h], [I, J + b, K + h]]} />
    {hi && <Polyline points={pts([P(I, J + b, K + h), P(I + a, J + b, K + h), P(I + a, J, K + h)])} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round" />}
  </G>;
}
const Top = ({ i, j, k = 0, children }: { i: number; j: number; k?: number; children: React.ReactNode }) => { const [x, y] = P(i, j, k); return <G transform={`matrix(${S} 0.5 ${-S} 0.5 ${x} ${y})`}>{children}</G>; };
const FaceL = ({ i, j, k = 0, children }: { i: number; j: number; k?: number; children: React.ReactNode }) => { const [x, y] = P(i, j, k); return <G transform={`matrix(${S} 0.5 0 -1 ${x} ${y})`}>{children}</G>; };
const FaceR = ({ i, j, k = 0, children }: { i: number; j: number; k?: number; children: React.ReactNode }) => { const [x, y] = P(i, j, k); return <G transform={`matrix(${-S} 0.5 0 -1 ${x} ${y})`}>{children}</G>; };
const Shadow = ({ i, j, a, b, o = 0.14 }: { i: number; j: number; a: number; b: number; o?: number }) => <Poly p={[[i, j, 0], [i + a, j, 0], [i + a, j + b, 0], [i, j + b, 0]]} f="#2a0a66" o={o} sw={3} />;
const Spark = ({ x, y, s = 4, c = '#fff', o = 1 }: { x: number; y: number; s?: number; c?: string; o?: number }) =>
  <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -1 Q.16 -.16 1 0 Q.16 .16 0 1 Q-.16 .16 -1 0 Q-.16 -.16 0 -1Z" fill={c} opacity={o} />;
const Bubble = ({ x, y, r, o = 1 }: { x: number; y: number; r: number; o?: number }) => <G opacity={o}>
  <Circle cx={x} cy={y} r={r} fill="#fff" stroke="#BFD9FF" strokeWidth={0.6} /><Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#EAF3FF" /></G>;
const Drop = ({ x, y, s = 1, c = '#4DA3FF' }: { x: number; y: number; s?: number; c?: string }) =>
  <G transform={`translate(${x} ${y}) scale(${s})`}><Path d="M0 -3.4 C2 -.6 2.6 .6 2.6 1.4 A2.6 2.6 0 0 1 -2.6 1.4 C-2.6 .6 -2 -.6 0 -3.4Z" fill={c} /><Circle cx={-0.9} cy={0.6} r={0.7} fill="#fff" opacity={0.8} /></G>;

/* a product bottle that stands on the tile at (i,j) */
function Bottle({ i, j, c = VIO, s = 1, cap = GOLD, spray = false }: { i: number; j: number; c?: string; s?: number; cap?: string; spray?: boolean }) {
  const [x, y] = P(i, j);
  return <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Ellipse cx={0} cy={0.5} rx={6.5} ry={2.6} fill="#2a0a66" opacity={0.16} />
    <Path d="M-4.6 -2 V-13 Q-4.6 -15 -2.8 -15.8 L-2.4 -17.5 H2.4 L2.8 -15.8 Q4.6 -15 4.6 -13 V-2 Q4.6 0.4 2.2 0.4 H-2.2 Q-4.6 0.4 -4.6 -2Z" fill={c} />
    <Path d="M-4.6 -2 V-13 Q-4.6 -15 -2.8 -15.8 L-2.4 -17.5 H-0.6 V0.4 H-2.2 Q-4.6 0.4 -4.6 -2Z" fill="#000" opacity={0.14} />
    <Rect x={-3} y={-22} width={6} height={5} rx={1.4} fill={cap} />
    {spray && <Path d="M-2.4 -22 H5.5 Q7 -22 7 -20.6 V-19 H3 V-17.5" fill={cap} />}
    <Rect x={-4.6} y={-12} width={9.2} height={7.6} rx={1.2} fill="#fff" />
    <Rect x={-4.6} y={-6} width={9.2} height={1.6} fill={GOLD} opacity={0.9} />
    <SText x={0} y={-7.2} fontSize={3.8} fontWeight="800" fill={VIO} textAnchor="middle">WD</SText>
    <Rect x={-3.5} y={-14.2} width={1.2} height={9} rx={0.6} fill="#fff" opacity={0.5} />
  </G>;
}
const Wheel = ({ u, v, r = 3.6 }: { u: number; v: number; r?: number }) => <G><Circle cx={u} cy={v} r={r} fill="#1d1630" /><Circle cx={u} cy={v} r={r * 0.55} fill="#B9B4C9" /><Circle cx={u} cy={v} r={r * 0.2} fill="#6c6682" /></G>;

/* a little iso car, length along i */
function Car({ i, j, c, roof, k = 0 }: { i: number; j: number; c: string; roof?: string; k?: number }) {
  const a = 32, b = 15;
  return <G>
    <Shadow i={i - 1} j={j - 1} a={a + 3} b={b + 3} o={0.16} />
    <Box i={i} j={j} k={k + 2} a={a} b={b} h={6.5} c={c} />
    <Box i={i + 8} j={j + 1} k={k + 8.5} a={16} b={b - 2} h={6} c={roof ?? c} top={roof ?? lite(c, 0.35)} />
    <FaceL i={i + 8} j={j + b - 1} k={k + 8.5}>
      <Rect x={1.4} y={1.2} width={5.6} height={3.6} rx={0.8} fill="#BFE0FF" /><Rect x={8.4} y={1.2} width={6} height={3.6} rx={0.8} fill="#BFE0FF" />
      <Path d="M2 1.2 L4.2 4.8 H5 L2.8 1.2Z" fill="#fff" opacity={0.7} />
    </FaceL>
    <FaceR i={i + 24} j={j + 1} k={k + 8.5}><Path d="M1 1 H12 L11 4.8 H2Z" fill="#9CCBFF" /></FaceR>
    <FaceL i={i} j={j + b} k={k + 2}><Rect x={1} y={3.4} width={30} height={0.9} fill="#fff" opacity={0.4} /></FaceL>
    <FaceL i={i} j={j + b} k={k}><Wheel u={7} v={3.4} /><Wheel u={25} v={3.4} /></FaceL>
    <FaceR i={i + a} j={j} k={k + 2}><Rect x={2} y={3} width={3.4} height={2} rx={1} fill="#FFE27A" /><Rect x={b - 5.4} y={3} width={3.4} height={2} rx={1} fill="#FFE27A" /></FaceR>
  </G>;
}

/* ---------- scene frame ---------- */
const useU = () => { const raw = (React as any).useId ? (React as any).useId() as string : String(Math.random()); return 'c' + raw.replace(/[^a-zA-Z0-9]/g, ''); };
function Float({ size, children }: { size: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }));
    l.start(); return () => l.stop();
  }, [v]);
  const ty = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -size * 0.018, 0] });
  return <Animated.View style={{ width: size, height: size, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}
function mk(accent: string, Scene: React.FC<{ u: string }>): React.FC<{ size: number }> {
  return ({ size }) => {
    const u = useU(), id = (n: string) => `url(#${u}${n})`;
    return <Float size={size}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${u}tile`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#EEE9F8" /></LinearGradient>
        </Defs>
        <Box i={0} j={0} a={42} b={42} h={3} top={id('tile')} left="#D9D1EA" right="#C6BCDD" hi={false} />
        <Top i={0} j={0}><Rect x={5} y={5} width={32} height={32} rx={7} fill={accent} opacity={0.17} /></Top>
        <Scene u={u} />
      </Svg>
    </Float>;
  };
}
const gr = (u: string, n: string, a: string, b: string, v = true) =>
  <LinearGradient id={`${u}${n}`} x1="0" y1="0" x2={v ? '0' : '1'} y2={v ? '1' : '0'}><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient>;
const sparkle = (x: number, y: number, s = 3.4) => <Spark x={x} y={y} s={s} c="#fff" />;
const Brush = ({ i, j, k = 0, a = 14 }: { i: number; j: number; k?: number; a?: number }) => <G>
  <Box i={i} j={j} k={k} a={a} b={6} h={2.2} c="#FFBA08" /><Box i={i - 1} j={j - 1} k={k + 2.2} a={a + 2} b={8} h={4} c={VIO} /></G>;

/* ---------- 21 liner: roof liner cleaning ---------- */
const Liner = mk('#F5A524', ({ u }) => <G>
  <Defs>{gr(u, 'cl', '#FFF4DC', '#EBD7AE')}{gr(u, 'gl', '#3A4B7A', '#1B2547')}</Defs>
  <Shadow i={7} j={7} a={30} b={28} o={0.2} />
  <Box i={5} j={5} k={9} a={32} b={30} h={3.4} top={`url(#${u}cl)`} left="#D9C196" right="#C4A877" />
  {/* sunroof glass, dome light, handle */}
  <Top i={5} j={5} k={12.4}>
    <Rect x={3} y={3} width={17} height={24} rx={3.5} fill="#1B2547" /><Rect x={4.2} y={4.2} width={14.6} height={21.6} rx={2.8} fill={`url(#${u}gl)`} />
    <Path d="M6 22 L14 6 H17 L9 22Z" fill="#fff" opacity={0.22} />
    <Rect x={23} y={4} width={7} height={5} rx={2} fill="#fff" stroke="#D9C196" strokeWidth={0.7} /><Rect x={24.4} y={5.2} width={4.2} height={2.6} rx={1.2} fill="#FFE27A" />
    <Rect x={23} y={19} width={7} height={3} rx={1.5} fill="#6b5a3c" />
    {/* stains on the dirty half */}
    <Ellipse cx={26} cy={14} rx={3.6} ry={2.6} fill="#A67B3D" opacity={0.55} /><Ellipse cx={8} cy={28.6} rx={4} ry={1.4} fill="#A67B3D" opacity={0.0} />
    <Ellipse cx={24} cy={25.2} rx={2.2} ry={1.6} fill="#A67B3D" opacity={0.5} />
    {/* clean swipe */}
    <Path d="M21.5 8 L21.5 28" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.0} />
  </Top>
  <Top i={5} j={5} k={12.4}><Rect x={21.6} y={1.2} width={9} height={11} rx={3} fill="#fff" opacity={0.55} /></Top>
  <Brush i={12} j={22} k={12.4} a={12} />
  <Bubble x={74} y={36} r={3} /><Bubble x={80} y={42} r={2} /><Bubble x={70} y={30} r={1.6} />
  {sparkle(30, 30, 3.6)}{sparkle(20, 38, 2.4)}{sparkle(77, 28, 2.6)}
  <Bottle i={36} j={36} c={'#F5A524'} s={0.85} />
</G>);

/* ---------- 22 boot: open boot with luggage ---------- */
const Boot = mk('#12B5A6', ({ u }) => <G>
  <Defs>{gr(u, 'bd', '#1D6F8F', '#0E8F84')}{gr(u, 'cv', '#22183F', '#3D2B6B')}{gr(u, 'lid', '#35E0CE', '#12B5A6')}{gr(u, 'sc', '#7C4DFF', '#5409DA')}{gr(u, 'bag', '#FFD45C', '#FFA808')}</Defs>
  <Ellipse cx={50} cy={86} rx={36} ry={6} fill="#2a0a66" opacity={0.15} />
  {/* open lid */}
  <Path d="M25 40 L30 11 Q31 8 34 8 H66 Q69 8 70 11 L75 40Z" fill={`url(#${u}lid)`} stroke="#12B5A6" strokeWidth={1.5} strokeLinejoin="round" />
  <Path d="M33 14 H67 L70.6 34 H29.4Z" fill="#9ADFF5" opacity={0.9} />
  <Path d="M36 16 L47 16 L40.6 32 H33Z" fill="#fff" opacity={0.45} />
  <Path d="M30 10 Q31 8 34 8 H50" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} fill="none" strokeLinecap="round" />
  <Line x1={22} y1={50} x2={26} y2={28} stroke="#C9C4D8" strokeWidth={2} strokeLinecap="round" /><Line x1={78} y1={50} x2={74} y2={28} stroke="#C9C4D8" strokeWidth={2} strokeLinecap="round" />
  {/* body */}
  <Path d="M14 46 Q14 40 20 40 H80 Q86 40 86 46 V74 Q86 80 80 80 H20 Q14 80 14 74Z" fill={`url(#${u}bd)`} />
  <Path d="M14 46 Q14 40 20 40 H50" stroke="#fff" strokeOpacity={0.5} strokeWidth={1} fill="none" strokeLinecap="round" />
  {/* cargo space */}
  <Path d="M22 43 H78 Q80 43 80 45 V70 H20 V45 Q20 43 22 43Z" fill={`url(#${u}cv)`} />
  <Path d="M20 62 H80 V70 H20Z" fill="#4C3A80" />
  <Path d="M20 62 L80 62" stroke="#fff" strokeOpacity={0.25} strokeWidth={0.8} />
  {/* luggage */}
  <Rect x={26} y={46} width={22} height={17} rx={3.5} fill={`url(#${u}sc)`} />
  <Rect x={34} y={43} width={6} height={4} rx={1.6} fill="none" stroke={GOLD} strokeWidth={1.5} />
  <Rect x={32} y={46} width={1.6} height={17} fill={GOLD} opacity={0.9} /><Rect x={40.4} y={46} width={1.6} height={17} fill={GOLD} opacity={0.9} />
  <Rect x={27.4} y={47} width={2.4} height={13} rx={1.2} fill="#fff" opacity={0.25} />
  <Rect x={50} y={52} width={24} height={11} rx={5} fill={`url(#${u}bag)`} />
  <Path d="M56 52 Q62 46 68 52" stroke="#C97C00" strokeWidth={1.6} fill="none" strokeLinecap="round" />
  <Rect x={52} y={53.2} width={20} height={1.6} rx={0.8} fill="#fff" opacity={0.55} />
  <Rect x={54} y={64} width={14} height={0} rx={0} />
  {/* tail lights, bumper, plate */}
  <Rect x={14} y={65} width={7} height={9} rx={2.6} fill="#FF4D5E" /><Rect x={79} y={65} width={7} height={9} rx={2.6} fill="#FF4D5E" />
  <Rect x={14.8} y={66} width={2} height={7} rx={1} fill="#fff" opacity={0.5} />
  <Path d="M16 76 H84 Q84 83 78 83 H22 Q16 83 16 76Z" fill="#E8E4F4" />
  <Rect x={41} y={72} width={18} height={6.5} rx={1.6} fill="#fff" stroke="#C9C4D8" strokeWidth={0.6} /><SText x={50} y={77.2} fontSize={4.6} fontWeight="800" fill={VIO} textAnchor="middle">WD</SText>
  {sparkle(86, 28, 3.6)}{sparkle(12, 24, 2.6)}{sparkle(90, 44, 2)}
</G>);

/* ---------- 23 mats: floor mat deep wash ---------- */
const Mats = mk('#2E8BFF', ({ u }) => <G>
  <Defs>{gr(u, 'm', '#4B4560', '#2A2540')}</Defs>
  <Shadow i={5} j={5} a={34} b={33} o={0.18} />
  <Box i={4} j={4} k={0} a={34} b={33} h={2.6} top={`url(#${u}m)`} left="#1F1B33" right="#15122A" hi={false} />
  <Top i={4} j={4} k={2.6}>
    <Rect x={2.2} y={2.2} width={29.6} height={28.6} rx={4} fill="none" stroke={VIO} strokeWidth={1.4} strokeDasharray="2.4 1.6" />
    {Array.from({ length: 9 }, (_, n) => <Line key={n} x1={6} y1={6 + n * 2.7} x2={28} y2={6 + n * 2.7} stroke="#fff" strokeOpacity={0.09} strokeWidth={0.9} />)}
    <Ellipse cx={11} cy={23} rx={5.4} ry={4.4} fill="#1F1B33" stroke={VIO} strokeWidth={0.9} />
    {/* washed half */}
    <Path d="M2 2 H16 L11 32 H2Z" fill="#fff" opacity={0.1} />
  </Top>
  {/* foam on the far half */}
  {[[62, 52, 5], [70, 50, 4.2], [67, 58, 5.2], [76, 56, 4.4], [60, 60, 3.6], [72, 63, 3.6], [65, 46, 3.4], [78, 62, 2.8], [57, 55, 2.4]].map((b, n) => <Bubble key={n} x={b[0]} y={b[1]} r={b[2]} />)}
  <Brush i={14} j={20} k={2.6} a={13} />
  <Drop x={24} y={46} s={1.2} /><Drop x={86} y={74} s={1.1} /><Drop x={18} y={56} s={0.9} />
  {sparkle(34, 58, 3.4)}{sparkle(44, 64, 2.4)}{sparkle(86, 40, 2.6)}
</G>);

/* ---------- 24 ac: vent sanitise ---------- */
const Ac = mk('#2EE6A6', ({ u }) => <G>
  <Defs>{gr(u, 'v', '#5A5670', '#2E2A44')}{gr(u, 'ring', '#FFD45C', '#E5A100')}{gr(u, 'air', '#BFFFEA', '#2EE6A6', false)}</Defs>
  <Shadow i={7} j={10} a={30} b={16} o={0.2} />
  <Box i={6} j={9} a={30} b={12} h={20} top="#6D6985" left={`url(#${u}v)`} right="#1F1C33" />
  <FaceL i={6} j={21} k={0}>
    <Rect x={2} y={3} width={26} height={14} rx={2.4} fill="#16132A" />
    {[0, 1, 2, 3, 4].map(n => <Rect key={n} x={3} y={4.4 + n * 2.6} width={24} height={1.6} rx={0.8} fill="#8F8AAD" />)}
    <Rect x={10} y={4} width={3} height={12} rx={1.4} fill="#FFD45C" opacity={0.0} />
    <Circle cx={15} cy={10} r={4} fill={`url(#${u}ring)`} /><Circle cx={15} cy={10} r={2} fill="#2E2A44" /><Circle cx={14.4} cy={9.4} r={0.7} fill="#fff" />
  </FaceL>
  {/* cool air */}
  {[0, 1, 2].map(n => <Path key={n} d={`M${22 - n * 2} ${70 + n * 6} q-8 3 -14 ${-1 + n * 2} t-12 ${4 + n}`} stroke={`url(#${u}air)`} strokeWidth={2.6 - n * 0.4} fill="none" strokeLinecap="round" opacity={0.9 - n * 0.15} />)}
  <G transform="translate(14 54)" stroke="#2EE6A6" strokeWidth={1.3} strokeLinecap="round"><Line x1={0} y1={-4} x2={0} y2={4} /><Line x1={-3.5} y1={-2} x2={3.5} y2={2} /><Line x1={-3.5} y1={2} x2={3.5} y2={-2} /></G>
  {/* sanitiser mist */}
  <Bottle i={36} j={8} c="#2EE6A6" s={0.95} cap={VIO} spray />
  {[[69, 36, 3], [63, 34, 2.4], [58, 37, 2], [66, 41, 1.6], [57, 31, 1.4]].map((m, n) => <Circle key={n} cx={m[0]} cy={m[1]} r={m[2]} fill="#fff" stroke="#9CF3D6" strokeWidth={0.7} opacity={0.95} />)}
  <Path d="M78 44 L70 40" stroke="#9CF3D6" strokeWidth={1} opacity={0} />
  {sparkle(50, 18, 3.4)}{sparkle(84, 30, 2.4)}{sparkle(30, 20, 2.2)}
  <G transform="translate(80 58)"><Path d="M0 -5 C6 -5 7 2 0 5 C-7 2 -6 -5 0 -5Z" fill="#2EE6A6" /><Path d="M0 -3 V3" stroke="#fff" strokeWidth={0.8} strokeLinecap="round" /></G>
</G>);

/* ---------- 25 touch: steering + touchpoints disinfect ---------- */
const Touch = mk('#FF6A1A', ({ u }) => <G>
  <Defs>{gr(u, 'sh', '#FF9A5C', '#FF6A1A')}{gr(u, 'hub', '#7C4DFF', '#5409DA')}</Defs>
  <Shadow i={6} j={20} a={26} b={8} o={0.16} />
  <FaceL i={6} j={28} k={5}>
    <Path d="M14 6 L16 -2 H30 L32 6Z" fill="#CFC9DE" opacity={0} />
    <Circle cx={15} cy={15} r={13.5} fill="none" stroke="#2E2A44" strokeWidth={5.2} />
    <Path d="M3 12 A13.5 13.5 0 0 1 12 2.2" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    <Path d="M2 15 H13 M17 15 H28 M15 17 V28" stroke="#3E3858" strokeWidth={3.4} strokeLinecap="round" />
    <Circle cx={15} cy={15} r={5.4} fill={`url(#${u}hub)`} /><Circle cx={15} cy={15} r={2.6} fill={GOLD} />
    <Circle cx={13.6} cy={13.6} r={0.9} fill="#fff" opacity={0.8} />
  </FaceL>
  <Box i={30} j={6} k={0} a={10} b={8} h={2} c="#CDBBFF" />
  <Bottle i={36} j={30} c="#FF6A1A" s={1} cap={VIO} spray />
  {/* mist */}
  {[[66, 28, 3.4], [60, 26, 2.6], [70, 22, 2.2], [56, 24, 1.8]].map((m, n) => <Circle key={n} cx={m[0]} cy={m[1]} r={m[2]} fill="#fff" stroke="#FFC7A3" strokeWidth={0.7} />)}
  {/* germs removed */}
  {[[16, 24], [30, 14]].map((g, n) => <G key={n} transform={`translate(${g[0]} ${g[1]})`} opacity={0.9}>
    <Circle r={3} fill="#7BD66B" />{[0, 60, 120, 180, 240, 300].map(a => <Line key={a} x1={0} y1={0} x2={4.6 * Math.cos(a * Math.PI / 180)} y2={4.6 * Math.sin(a * Math.PI / 180)} stroke="#7BD66B" strokeWidth={1.2} strokeLinecap="round" />)}
    <Circle r={6.4} fill="none" stroke="#FF4D5E" strokeWidth={1.2} /><Line x1={-4.5} y1={4.5} x2={4.5} y2={-4.5} stroke="#FF4D5E" strokeWidth={1.2} /></G>)}
  {/* shield */}
  <G transform="translate(80 30)"><Path d="M0 -10 L9 -7 V1 C9 6 4 9 0 11 C-4 9 -9 6 -9 1 V-7Z" fill={`url(#${u}sh)`} stroke="#fff" strokeWidth={1.2} strokeLinejoin="round" />
    <Path d="M-4 0 L-1 3.2 L4.4 -3.4" stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></G>
  {sparkle(22, 40, 2.6)}{sparkle(90, 50, 2.2)}
</G>);

/* ---------- 26 rust: anti-rust underbody coat ---------- */
const Rust = mk('#FF7A3D', ({ u }) => <G>
  <Defs>{gr(u, 'st', '#C9CCD8', '#8E93A8')}{gr(u, 'co', '#4E3BB8', '#1B1450', false)}{gr(u, 'gun', '#7C4DFF', '#5409DA')}</Defs>
  <Shadow i={5} j={5} a={34} b={32} o={0.18} />
  <Box i={4} j={4} a={34} b={32} h={3} top={`url(#${u}st)`} left="#6F738A" right="#575B70" hi />
  <Top i={4} j={4} k={3}>
    {/* coated side */}
    <Path d="M17 0 H34 V32 H11 Z" fill={`url(#${u}co)`} />
    <Path d="M20 2 L27 2 L21 30 L14 30Z" fill="#fff" opacity={0.2} />
    {/* rust */}
    <Path d="M0 0 H17 L11 32 H0Z" fill="#B65A2B" opacity={0.0} />
    <Path d="M2 3 Q8 0 12 5 Q16 9 10 12 Q4 14 2 9Z" fill="#C2561F" /><Path d="M3 18 Q9 15 13 20 Q15 26 8 28 Q2 28 3 18Z" fill="#D9742E" />
    <Circle cx={7} cy={8} r={1.6} fill="#8A3A12" /><Circle cx={8} cy={22} r={1.4} fill="#8A3A12" /><Circle cx={13} cy={14} r={1} fill="#E8903F" />
    {[[3, 3], [31, 3], [3, 29], [31, 29]].map((r, n) => <Circle key={n} cx={r[0]} cy={r[1]} r={1.1} fill="#EDEFF6" />)}
  </Top>
  {/* spray gun */}
  <Path d="M54 30 L66 24" stroke="#C7BEF0" strokeWidth={0.1} />
  <G transform="translate(66 22) rotate(-24)">
    <Rect x={0} y={-4} width={20} height={9} rx={4} fill={`url(#${u}gun)`} /><Rect x={-5} y={-2} width={6} height={5} rx={1.6} fill="#C9C4D8" />
    <Rect x={14} y={4} width={5} height={10} rx={2.4} fill={GOLD} /><Rect x={3} y={-6.2} width={9} height={3} rx={1.4} fill={GOLD} />
    <Rect x={2} y={-2.6} width={12} height={1.4} rx={0.7} fill="#fff" opacity={0.4} />
  </G>
  {[[56, 36, 3], [51, 34, 2.2], [48, 40, 2.6], [54, 41, 1.6], [45, 36, 1.4]].map((m, n) => <Circle key={n} cx={m[0]} cy={m[1]} r={m[2]} fill="#8F7BFF" opacity={0.7} />)}
  <G transform="translate(80 58)"><Path d="M0 -9 L8 -6 V1 C8 5 4 8 0 10 C-4 8 -8 5 -8 1 V-6Z" fill={GOLD} stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
    <Path d="M-3.6 0 L-1 2.8 L4 -3" stroke={VIO} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></G>
  {sparkle(66, 54, 3)}{sparkle(30, 30, 2.4)}
</G>);

/* ---------- 27 rubber: door rubber care ---------- */
const Rubber = mk('#FF5C8A', ({ u }) => <G>
  <Defs>{gr(u, 'door', '#7C4DFF', '#5409DA')}{gr(u, 'gl', '#CFE6FF', '#8DBBF5')}{gr(u, 'sp', '#FFE27A', '#FFBA08')}</Defs>
  <Shadow i={4} j={18} a={36} b={8} o={0.16} />
  <FaceL i={4} j={26} k={3}><G transform="translate(0 32) scale(1 -1)">
    <Rect x={0} y={0} width={36} height={32} rx={4.6} fill={`url(#${u}door)`} />
    <Path d="M2 1 H20 L12 31 H2Z" fill="#fff" opacity={0.1} />
    <Path d="M2.6 7 H33.4 V8.4 H2.6Z" fill="#fff" opacity={0.0} />
    {/* window + rubber seal */}
    <Path d="M5 16 V13 Q5 9 9 8 L12 3 Q13 2 15 2 H27 Q30 2 31 5 V16Z" fill="none" stroke="#17141F" strokeWidth={4.4} strokeLinejoin="round" />
    <Path d="M5 16 V13 Q5 9 9 8 L12 3 Q13 2 15 2 H27 Q30 2 31 5 V16Z" fill={`url(#${u}gl)`} opacity={0.0} />
    <Path d="M7.4 14.4 V13 Q7.4 10 10.4 9.4 L13.4 4.4 Q14 4 15 4 H27 Q28.6 4 28.8 5.4 V14.4Z" fill={`url(#${u}gl)`} />
    <Path d="M9 14 L16 4 H20 L13 14Z" fill="#fff" opacity={0.45} />
    <Path d="M3.6 16 V13 Q3.6 8 8.4 7 L11 2.6" stroke="#fff" strokeOpacity={0.6} strokeWidth={0.9} fill="none" strokeLinecap="round" />
    <Path d="M31 31 H33 Q36 31 36 28 V4 Q36 1 33 1 H31" stroke="#17141F" strokeWidth={3.2} fill="none" strokeLinejoin="round" strokeLinecap="round" /><Path d="M33.6 5 V26" stroke="#fff" strokeOpacity={0.45} strokeWidth={0.8} strokeLinecap="round" /><Rect x={24} y={20} width={6} height={2.4} rx={1.2} fill="#FFD45C" /><Rect x={4} y={22} width={14} height={1} fill="#fff" opacity={0.25} />
  </G></FaceL>
  {/* applicator sponge and bottle */}
  <Box i={14} j={32} k={0} a={10} b={7} h={4} c={'#FFBA08'} />
  <Box i={14} j={32} k={4} a={10} b={7} h={1.6} top="#fff" left="#F0E9FF" right="#DDD2F5" hi={false} />
  <Bottle i={34} j={34} c="#FF5C8A" s={0.9} />
  <Drop x={86} y={40} s={1.3} c="#FF5C8A" />
  {sparkle(78, 20, 3.6)}{sparkle(88, 56, 2.2)}{sparkle(24, 62, 2.4)}
</G>);

/* ---------- 28 battery: terminal clean ---------- */
const Battery = mk('#FFBA08', ({ u }) => <G>
  <Defs>{gr(u, 'b', '#4A4566', '#26223C')}{gr(u, 'bt', '#FFD45C', '#FFA808', false)}</Defs>
  <Shadow i={6} j={10} a={32} b={20} o={0.2} />
  <Box i={5} j={9} a={30} b={18} h={20} top="#5E5A7C" left={`url(#${u}b)`} right="#1B1830" />
  <Box i={5} j={9} k={17} a={30} b={18} h={3} top="#6C6890" left="#3A3556" right="#22203A" />
  <FaceL i={5} j={27} k={0}>
    <Rect x={2} y={6} width={26} height={9} rx={2} fill={`url(#${u}bt)`} />
    <Path d="M16.4 6.8 L11 11.4 H14.6 L13.4 14.6 L19 9.6 H15.4Z" fill="#26223C" />
    <Rect x={2} y={1.6} width={26} height={1} fill="#fff" opacity={0.2} />
  </FaceL>
  {/* terminals */}
  <Box i={9} j={13} k={20} a={5} b={5} h={3.4} c="#FF4D5E" />
  <Box i={22} j={13} k={20} a={5} b={5} h={3.4} c="#8F8AAD" />
  {/* corrosion crust */}
  <G>{[[0, 0, 4.4], [-3.2, 1.6, 2.6], [3, 2.4, 2.4], [1, -2.6, 2]].map((c, n) => { const [x, y] = P(24.5, 15.5, 23.4); return <Circle key={n} cx={x + c[0]} cy={y + c[1]} r={c[2]} fill={n % 2 ? '#B7E4D9' : '#E4FAF3'} />; })}</G>
  {/* wire brush */}
  <G transform="translate(66 38) rotate(-30)">
    <Rect x={0} y={-3} width={14} height={6} rx={3} fill={VIO} /><Rect x={-5} y={-2.4} width={6} height={4.8} rx={1.4} fill={GOLD} />
    {[-2, -1, 0, 1, 2].map(n => <Line key={n} x1={-5} y1={n * 0.9} x2={-8.6} y2={n * 1.2} stroke="#B9B4C9" strokeWidth={0.7} strokeLinecap="round" />)}
    <Rect x={2} y={-2} width={8} height={1} rx={0.5} fill="#fff" opacity={0.35} />
  </G>
  <Path d="M30 40 C20 52 30 60 40 58" stroke="#FF4D5E" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0} />
  <Path d="M38 8 L32 16 H37 L34 24 L43 13 H38Z" fill={GOLD} stroke="#fff" strokeWidth={0.9} strokeLinejoin="round" />
  {sparkle(62, 24, 3.2)}{sparkle(76, 14, 2.2)}{sparkle(18, 30, 2.4)}
  <Bottle i={34} j={4} c="#26223C" s={0.8} />
</G>);

/* ---------- 29 polish: machine paint polish ---------- */
const Polish = mk('#7C5CFF', ({ u }) => <G>
  <Defs>{gr(u, 'pn', '#7C4DFF', '#3B0AA0', false)}{gr(u, 'bd', '#8F6BFF', '#5409DA', false)}{gr(u, 'pad', '#FFFFFF', '#E7DFFA')}</Defs>
  <Shadow i={4} j={7} a={36} b={29} o={0.18} />
  <Box i={3} j={6} a={36} b={29} h={3.4} top={`url(#${u}pn)`} left="#2D0877" right="#220660" />
  <Top i={3} j={6} k={3.4}>
    <Path d="M0 0 H26 L16 29 H0Z" fill="#fff" opacity={0.18} />
    <Path d="M30 4 A8 8 0 1 1 30 4.1" fill="none" stroke="#000" strokeOpacity={0.0} />
    {[[6, 22, 9], [10, 8, 7], [24, 24, 8]].map((s, n) => <Path key={n} d={`M${s[0]} ${s[1]} a${s[2]} ${s[2] * 0.6} 0 1 1 ${s[2] * 1.4} ${s[2] * 0.2}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={0.6} fill="none" />)}
    {/* swirls in the unpolished area */}
    {[[24, 6], [28, 14], [20, 14]].map((s, n) => <Path key={n} d={`M${s[0] - 3} ${s[1]} q3 -4 6 0 q-3 3 -5 -1`} stroke="#000" strokeOpacity={0.35} strokeWidth={0.6} fill="none" />)}
    <Circle cx={22} cy={18} r={8.6} fill="#2D0877" opacity={0.5} />
    <Circle cx={21} cy={17} r={7.6} fill={`url(#${u}pad)`} /><Circle cx={21} cy={17} r={4.4} fill="#F4EEFF" stroke="#D2C5F3" strokeWidth={0.8} /><Circle cx={21} cy={17} r={1.4} fill={GOLD} />
  </Top>
  {/* polisher body */}
  <G transform={`translate(${P(24, 21, 3.4)[0]} ${P(24, 21, 3.4)[1]})`}>
    <Path d="M-8 -4 Q-8 -8 -4 -9 H4 Q8 -8 8 -4 V-1 Q0 3 -8 -1Z" fill="#E2E0EE" />
    <Path d="M-7 -12 H7 L6 -6 H-6Z" fill={`url(#${u}bd)`} />
    <Rect x={-6} y={-30} width={12} height={20} rx={5} fill={`url(#${u}bd)`} />
    <Rect x={-4.4} y={-28} width={2} height={15} rx={1} fill="#fff" opacity={0.35} />
    <Rect x={-6} y={-18} width={12} height={2.4} fill={GOLD} />
    <Path d="M-6 -27 H-12 Q-16 -27 -16 -23 V-19 Q-16 -15 -12 -15 H-6" stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.85} />
    <Rect x={-4} y={-34} width={8} height={5} rx={2.4} fill={INK} />
  </G>
  <Bottle i={34} j={4} c="#FFFFFF" s={0.8} cap={VIO} />
  {sparkle(30, 56, 3.8)}{sparkle(20, 66, 2.4)}{sparkle(82, 40, 3)}{sparkle(14, 44, 2)}
</G>);

/* ---------- 30 teflon: paint protection ---------- */
const Teflon = mk('#7C5CFF', ({ u }) => <G>
  <Defs>{gr(u, 'sh', '#C8B8FF', '#8F6BFF')}{gr(u, 'shg', '#FFD45C', '#FFA808')}</Defs>
  <Car i={4} j={20} c="#6C3BF0" roof="#5409DA" />
  {/* beading droplets on the hood and roof */}
  <G fill="#E7F0FF" stroke="#fff" strokeWidth={0.5}>{[[62, 62, 1.5], [67, 66, 1.1], [58, 66, 1.2], [70, 60, 1], [55, 61, 0.9]].map((d, n) => <Circle key={n} cx={d[0]} cy={d[1]} r={d[2]} />)}</G>
  {/* protective dome */}
  <G transform="translate(50 30)">
    <Path d="M0 -24 L22 -17 V-1 C22 12 11 20 0 25 C-11 20 -22 12 -22 -1 V-17Z" fill={`url(#${u}sh)`} opacity={0.35} stroke={`url(#${u}shg)`} strokeWidth={2.2} strokeLinejoin="round" />
    <Path d="M-14 -13 L-3 -17 L-14 8Z" fill="#fff" opacity={0.45} />
    <Path d="M0 -17 L15 -12 V-1 C15 8 8 13 0 17 C-8 13 -15 8 -15 -1 V-12Z" fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.9} />
    <Path d="M-6 -1 L-1.6 4 L7 -6.6" stroke={GOLD} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </G>
  <Drop x={84} y={54} s={1.3} c="#9CC8FF" /><Drop x={90} y={62} s={0.9} c="#9CC8FF" /><Drop x={14} y={50} s={1} c="#9CC8FF" />
  <Bottle i={2} j={30} c="#FFFFFF" s={0.85} cap={GOLD} />
  {sparkle(86, 18, 3.4)}{sparkle(14, 20, 2.8)}{sparkle(78, 80, 2.2)}
</G>);

/* ---------- packs + WD Pass ---------- */
const PackWash = mk('#2E8BFF', ({ u }) => <G>
  <Car i={6} j={18} c="#2E8BFF" roof="#1F6FD8" />
  {/* water jet from a spray gun */}
  <G transform="translate(16 36) rotate(-18)">
    <Rect x={0} y={-3} width={14} height={6} rx={3} fill={VIO} /><Rect x={10} y={2} width={4} height={8} rx={2} fill={GOLD} /><Rect x={-6} y={-1.6} width={7} height={3.2} rx={1.4} fill="#C9C4D8" />
  </G>
  <Path d="M16 30 Q24 25 34 38" stroke="#9CCBFF" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.9} />
  <Path d="M15 34 Q22 31 31 41" stroke="#CFE6FF" strokeWidth={1.4} fill="none" strokeLinecap="round" />
  <Bubble x={70} y={38} r={3.4} /><Bubble x={78} y={44} r={2.4} /><Bubble x={64} y={32} r={2} /><Bubble x={84} y={36} r={1.6} />
  <Drop x={20} y={46} s={1} /><Drop x={30} y={50} s={0.8} />
  {sparkle(54, 24, 3.2)}{sparkle(86, 62, 2.6)}
  <Bottle i={35} j={4} c="#2E8BFF" s={0.8} />
</G>);
const PackDeep = mk('#12B5A6', ({ u }) => <G>
  <Defs>{gr(u, 'vc', '#35E0CE', '#0E8F84')}</Defs>
  <Car i={8} j={22} c="#C9CEDA" roof="#B4BACB" />
  {/* foam cap on roof and hood */}
  {[[56, 38, 5], [64, 36, 4.4], [49, 41, 4], [60, 43, 4], [70, 41, 3.4], [53, 34, 3], [44, 45, 3], [74, 46, 3]].map((b, n) => <Bubble key={n} x={b[0]} y={b[1]} r={b[2]} />)}
  {/* vacuum canister */}
  <Ellipse cx={20} cy={24} rx={9} ry={3.4} fill="#2a0a66" opacity={0} />
  <G transform="translate(18 40)">
    <Ellipse cx={0} cy={4} rx={10} ry={3.4} fill="#2a0a66" opacity={0.16} />
    <Rect x={-9} y={-12} width={18} height={15} rx={6} fill={`url(#${u}vc)`} /><Rect x={-9} y={-14} width={18} height={4} rx={2} fill="#fff" opacity={0.35} />
    <Circle cx={-5} cy={4.4} r={2.2} fill={INK} /><Circle cx={5} cy={4.4} r={2.2} fill={INK} />
    <Circle cx={0} cy={-4} r={2.2} fill={GOLD} />
    <Path d="M9 -6 Q18 -6 18 4 Q18 12 28 12" stroke="#1D6F8F" strokeWidth={3} fill="none" strokeLinecap="round" />
  </G>
  <Drop x={84} y={62} s={1.1} /><Drop x={12} y={64} s={0.9} />
  {sparkle(80, 22, 3.4)}{sparkle(90, 40, 2.2)}{sparkle(26, 18, 2.4)}
  <Bottle i={36} j={4} c="#12B5A6" s={0.8} />
</G>);
const PackExclusive = mk('#FFBA08', ({ u }) => <G>
  <Defs>{gr(u, 'coin', '#FFE27A', '#E5A100')}</Defs>
  <Car i={10} j={18} c="#5409DA" roof="#3B0AA0" />
  {/* gold medal on a stand */}
  <G transform="translate(18 42)">
    <Rect x={-4} y={10} width={8} height={3} rx={1.4} fill={INK} /><Rect x={-1.2} y={4} width={2.4} height={7} fill="#6c6682" />
    <Circle r={10.5} fill={`url(#${u}coin)`} stroke="#fff" strokeWidth={0.9} /><Circle r={7.4} fill="none" stroke="#B87A00" strokeWidth={0.9} />
    <Path d="M0 -5 L1.5 -1.6 L5.2 -1.4 L2.4 1 L3.3 4.6 L0 2.6 L-3.3 4.6 L-2.4 1 L-5.2 -1.4 L-1.5 -1.6Z" fill={VIO} />
    <Path d="M-8 -6 A10 10 0 0 1 -2 -10" stroke="#fff" strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.8} />
  </G>
  {sparkle(50, 18, 5)}{sparkle(76, 12, 3.2)}{sparkle(90, 34, 3.6)}{sparkle(32, 12, 2.6)}{sparkle(84, 72, 2.4)}
  {[[62, 44], [68, 48], [57, 47]].map((b, n) => <Bubble key={n} x={b[0]} y={b[1]} r={2.4 - n * 0.4} />)}
  <Bottle i={36} j={4} c="#5409DA" s={0.8} />
</G>);
const Pass = mk('#5409DA', ({ u }) => <G>
  <Defs>{gr(u, 'card', '#7C4DFF', '#4A06C4', false)}{gr(u, 'gold', '#FFE27A', '#FFA808', false)}</Defs>
  <Shadow i={8} j={8} a={26} b={26} o={0.18} />
  <G transform="translate(50 42) rotate(-8)">
    <Rect x={-30} y={-19} width={60} height={38} rx={7} fill="#2D0877" transform="translate(1.6 3)" opacity={0.5} />
    <Rect x={-30} y={-19} width={60} height={38} rx={7} fill={`url(#${u}card)`} />
    <Path d="M-30 -12 Q-30 -19 -23 -19 H4 L-14 19 H-23 Q-30 19 -30 12Z" fill="#fff" opacity={0.1} />
    <Rect x={-30} y={-4} width={60} height={7} fill={`url(#${u}gold)`} />
    <Rect x={-30} y={-4} width={60} height={1.2} fill="#fff" opacity={0.6} />
    <SText x={-22} y={-8.2} fontSize={9} fontWeight="800" fill="#fff">WD PASS</SText>
    {[0, 1, 2].map(n => <G key={n}><Circle cx={-18 + n * 12} cy={12} r={4.2} fill={n < 2 ? GOLD : 'none'} stroke={GOLD} strokeWidth={1.2} />{n < 2 && <Path d={`M${-20 + n * 12} 12 l1.5 1.6 l3 -3.4`} stroke={VIO} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}</G>)}
    <Rect x={14} y={7} width={13} height={9} rx={2.4} fill="#fff" opacity={0.18} /><SText x={20.5} y={14} fontSize={6} fontWeight="800" fill="#fff" textAnchor="middle">3x</SText>
    <Path d="M-30 12 Q-30 19 -23 19" stroke="#fff" strokeOpacity={0.0} />
  </G>
  <Car i={14} j={26} c="#FFBA08" roof="#E5A100" k={0} />
  {sparkle(86, 22, 3.6)}{sparkle(12, 20, 2.6)}{sparkle(90, 50, 2.2)}
</G>);

export const ART: Record<string, React.FC<{ size: number }>> = {
  liner: Liner, boot: Boot, mats: Mats, ac: Ac, touch: Touch, rust: Rust, rubber: Rubber, battery: Battery, polish: Polish, teflon: Teflon,
  'pack-wash': PackWash, 'pack-deep': PackDeep, 'pack-exclusive': PackExclusive, pass: Pass, pass3: Pass,
};
