// Pronto-style glossy 3D icons and line-art for the v2 screens (react-native-svg, no raster assets).
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Rect, Circle, Ellipse, G, Polygon } from 'react-native-svg';
import { useUid } from './icons';

const VIO = '#5409DA', GOLD = '#FFBA08';

// ---------------------------------------------------------------- Bolt3D
const BOLT = 'M38 4 L12 36 L27 36 L20 60 L50 24 L33 24 Z';
export function Bolt3D({ size = 56 }: { size?: number }) {
  const id = useUid();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={id + 'f'} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFF3A6" /><Stop offset="0.35" stopColor="#FFC928" /><Stop offset="0.75" stopColor="#FF9F0A" /><Stop offset="1" stopColor="#E87A00" />
        </LinearGradient>
        <LinearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8A52F5" /><Stop offset="1" stopColor="#2A0478" />
        </LinearGradient>
        <LinearGradient id={id + 'h'} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity="0.85" /><Stop offset="1" stopColor="#fff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="34" cy="61" rx="14" ry="2.6" fill="#24065F" opacity={0.16} />
      {/* extrusion */}
      <G transform="translate(3.2 3.6)"><Path d={BOLT} fill={`url(#${id}s)`} stroke="#2A0478" strokeWidth={2} strokeLinejoin="round" /></G>
      <G transform="translate(1.6 1.8)"><Path d={BOLT} fill="#4A12C4" stroke="#4A12C4" strokeWidth={2} strokeLinejoin="round" /></G>
      {/* face */}
      <Path d={BOLT} fill={`url(#${id}f)`} stroke="#FFD34D" strokeWidth={1.2} strokeLinejoin="round" />
      {/* bevel + gloss */}
      <Path d="M37 8 L17 34 L25 34 Z" fill={`url(#${id}h)`} opacity={0.75} />
      <Path d="M37.2 6.6 L14.6 36" stroke="#FFFBE0" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
      <Path d="M30 27 L47 26" stroke="#fff" strokeWidth={1} opacity={0.5} strokeLinecap="round" />
      <Path d="M22 56 L45 28" stroke="#C25E00" strokeWidth={1.2} opacity={0.35} strokeLinecap="round" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Calendar3D
export function Calendar3D({ size = 56 }: { size?: number }) {
  const id = useUid();
  const dots: [number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (!(r === 2 && c === 3)) dots.push([17 + c * 10.5, 31 + r * 9.5]);
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#B58CFF" /><Stop offset="0.5" stopColor="#7C3CF0" /><Stop offset="1" stopColor="#4A0DC4" /></LinearGradient>
        <LinearGradient id={id + 'p'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#EADFFF" /></LinearGradient>
        <LinearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFE27A" /><Stop offset="1" stopColor="#FFA800" /></LinearGradient>
        <LinearGradient id={id + 'r'} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#6A2BE8" /><Stop offset="0.5" stopColor="#B08CFF" /><Stop offset="1" stopColor="#5409DA" /></LinearGradient>
      </Defs>
      <Ellipse cx="32" cy="60.5" rx="21" ry="2.6" fill="#24065F" opacity={0.14} />
      {/* body */}
      <Rect x="6" y="12" width="52" height="47" rx="9" fill="#36098F" />
      <Rect x="6" y="10" width="52" height="46" rx="9" fill={`url(#${id}b)`} />
      <Path d="M8 22 Q8 11 18 11 H46 Q56 11 56 22 Z" fill="#fff" opacity={0.25} />
      {/* page */}
      <Rect x="9.5" y="22.5" width="45" height="30" rx="5.5" fill={`url(#${id}p)`} />
      <Path d="M9.5 24 H54.5" stroke="#C9B3F5" strokeWidth={1} />
      {dots.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.6} fill={i === 5 ? `url(#${id}g)` : '#7C3CF0'} />)}
      <Circle cx={17 + 3 * 10.5} cy={31 + 2 * 9.5} r={0} />
      {/* rings */}
      {[19, 45].map((x) => (
        <G key={x}>
          <Rect x={x - 3.2} y="3" width="6.4" height="15" rx="3.2" fill="#2A0A75" />
          <Rect x={x - 2.6} y="2.5" width="5.2" height="14" rx="2.6" fill={`url(#${id}r)`} />
          <Rect x={x - 1.2} y="4.5" width="1.6" height="7" rx="0.8" fill="#fff" opacity={0.6} />
        </G>
      ))}
      <Path d="M12 13 Q30 9 50 13" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.55} fill="none" />
    </Svg>
  );
}

// ---------------------------------------------------------------- Laurel
function Branch({ id }: { id: string }) {
  // left branch, leaves along an arc; mirrored for the right one
  const leaves: [number, number, number, number][] = [
    [14, 8, -35, 1], [10, 16, -15, 1], [8, 25, 0, 1.05], [8, 34, 12, 1.05], [10, 43, 25, 1], [14, 51, 40, 0.95], [20, 58, 55, 0.85],
  ];
  return (
    <G>
      <Path d="M24 5 Q6 22 10 44 Q13 54 22 61" stroke="#C9C7D1" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r, s], i) => (
        <G key={i} transform={`translate(${x + 6} ${y}) rotate(${r}) scale(${s})`}>
          <Path d="M0 0 Q-11 -2 -12 -11 Q-1 -11 0 0z" fill={`url(#${id})`} />
        </G>
      ))}
      {leaves.slice(0, 6).map(([x, y, r, s], i) => (
        <G key={'b' + i} transform={`translate(${x + 12} ${y + 3}) rotate(${r + 60}) scale(${s * 0.75})`}>
          <Path d="M0 0 Q-11 -2 -12 -11 Q-1 -11 0 0z" fill={`url(#${id})`} />
        </G>
      ))}
    </G>
  );
}
export function Laurel({ flip, size = 48, color }: { flip?: boolean; size?: number; color?: string }) {
  const id = useUid();
  return (
    <Svg width={size * 0.62} height={size} viewBox="0 0 30 66" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={color ?? '#E6E4EB'} /><Stop offset="1" stopColor={color ?? '#C4C2CE'} /></LinearGradient>
      </Defs>
      <Branch id={id} />
    </Svg>
  );
}

// ---------------------------------------------------------------- Skyline
const S1 = '#DCDAE3', F1 = '#F4F3F7', F2 = '#ECEBF1';
function Tower({ x, y, w, h, cols = 3, rows = 8, roof }: { x: number; y: number; w: number; h: number; cols?: number; rows?: number; roof?: 'spire' | 'step' | 'flat' }) {
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < cols; i++) lines.push(<Path key={'v' + i} d={`M${x + (w * i) / cols} ${y + 3}V${y + h}`} stroke={S1} strokeWidth={1} />);
  for (let j = 1; j < rows; j++) lines.push(<Path key={'h' + j} d={`M${x} ${y + (h * j) / rows}H${x + w}`} stroke={S1} strokeWidth={0.8} opacity={0.7} />);
  return (
    <G>
      {roof === 'spire' && <Path d={`M${x + w / 2} ${y - 26}V${y}`} stroke={S1} strokeWidth={1.4} />}
      {roof === 'step' && <Rect x={x + w * 0.2} y={y - 10} width={w * 0.6} height={10} fill={F2} stroke={S1} strokeWidth={1} />}
      <Rect x={x} y={y} width={w} height={h} fill={F1} stroke={S1} strokeWidth={1.2} />
      <Rect x={x + w} y={y + 4} width={7} height={h - 4} fill={F2} stroke={S1} strokeWidth={1} />
      {lines}
    </G>
  );
}
export function Skyline({ width = 360, height = 220 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 220" preserveAspectRatio="xMidYMax slice">
      {/* far layer */}
      <G opacity={0.75}>
        <Tower x={66} y={118} w={28} h={102} cols={3} rows={9} />
        <Tower x={268} y={112} w={30} h={108} cols={3} rows={9} />
        <Tower x={140} y={150} w={24} h={70} cols={2} rows={6} />
        <Tower x={206} y={146} w={26} h={74} cols={2} rows={6} />
      </G>
      {/* India Gate, centre */}
      <G>
        <Rect x={146} y={104} width={68} height={116} fill={F1} stroke={S1} strokeWidth={1.2} />
        <Path d="M142 104H218V96H142Z" fill={F2} stroke={S1} strokeWidth={1.2} />
        <Path d="M154 96V90H206V96" fill={F1} stroke={S1} strokeWidth={1.2} />
        <Path d="M164 90V84H196V90" fill={F2} stroke={S1} strokeWidth={1.2} />
        <Path d="M164 220V150a16 16 0 0 1 32 0V220" fill="#fff" stroke={S1} strokeWidth={1.2} />
        <Path d="M170 220V152a10 10 0 0 1 20 0V220" fill="none" stroke={S1} strokeWidth={1} />
        {[0, 1, 2, 3].map((i) => <Path key={i} d={`M${152 + i * 2} ${112 + i * 4}H${208 - i * 2}`} stroke={S1} strokeWidth={0.8} />)}
      </G>
      {/* left blocks */}
      <Tower x={-6} y={96} w={46} h={124} cols={4} rows={11} roof="spire" />
      <Tower x={46} y={150} w={34} h={70} cols={3} rows={6} />
      <Tower x={-10} y={160} w={30} h={60} cols={3} rows={6} />
      {/* right blocks */}
      <Tower x={300} y={100} w={44} h={120} cols={4} rows={11} roof="step" />
      <Tower x={252} y={152} w={36} h={68} cols={3} rows={6} />
      <Tower x={332} y={150} w={34} h={70} cols={3} rows={6} />
    </Svg>
  );
}

// ---------------------------------------------------------------- Scallop
// The wavy edge between a coloured hero and the white body: `color` is the hero colour above, white below.
export function Scallop({ color, dots, width = 360, height = 24, bg = '#FFFFFF' }: { color: string; dots?: string; width?: number | string; height?: number; bg?: string }) {
  const W = 360, n = 11, step = W / n, amp = 6, base = 12;
  let d = `M0 0 H${W} V${base}`;
  for (let i = n; i > 0; i--) { const x1 = i * step, x0 = (i - 1) * step; d += ` Q${x1 - step / 2} ${base + amp * 2} ${x0} ${base}`; }
  d += ' Z';
  const dotsEl: React.ReactNode[] = [];
  if (dots) for (let i = 0; i < n; i++) dotsEl.push(<Circle key={i} cx={i * step + step / 2} cy={base + amp + 3} r={1.8} fill={dots} />);
  return (
    <View style={{ width: width as any, height, backgroundColor: bg }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} 24`} preserveAspectRatio="none">
        <Path d={d} fill={color} />
        {dotsEl}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------- Wallet3D / Gift3D (46px header buttons)
export function WalletIcon3D({ size = 40 }: { size?: number }) {
  const id = useUid();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={id + 'w'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#C7A6FF" /><Stop offset="1" stopColor="#7A38F0" /></LinearGradient>
        <LinearGradient id={id + 'n'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFE98A" /><Stop offset="1" stopColor="#FFBA08" /></LinearGradient>
      </Defs>
      <G transform="rotate(-8 24 16)">
        <Rect x="10" y="9" width="28" height="18" rx="3" fill="#FFBA08" /><Rect x="10" y="9" width="28" height="18" rx="3" fill={`url(#${id}n)`} />
        <Circle cx="24" cy="18" r="5" fill="#fff" opacity={0.55} /><Circle cx="24" cy="18" r="3" fill="#E89A00" opacity={0.55} />
      </G>
      <G transform="rotate(5 24 16)">
        <Rect x="9" y="12" width="30" height="16" rx="3" fill="#FFD54A" /><Circle cx="24" cy="20" r="4.4" fill="#fff" opacity={0.6} />
      </G>
      <Rect x="5" y="20" width="38" height="22" rx="7" fill="#4A12C4" />
      <Rect x="5" y="19" width="38" height="22" rx="7" fill={`url(#${id}w)`} />
      <Path d="M8 25 Q10 20 16 20 H32" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.7} />
      <Rect x="29" y="26" width="15" height="9" rx="4.5" fill="#4A12C4" opacity={0.85} />
      <Rect x="29" y="25" width="15" height="9" rx="4.5" fill="#E9DDFF" /><Circle cx="34" cy="29.5" r="1.8" fill="#7A38F0" />
    </Svg>
  );
}
export function GiftIcon3D({ size = 40 }: { size?: number }) {
  const id = useUid();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={id + 'b'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#9D6CFF" /><Stop offset="1" stopColor="#5409DA" /></LinearGradient>
        <LinearGradient id={id + 'l'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#B58CFF" /><Stop offset="1" stopColor="#6A2BE8" /></LinearGradient>
        <LinearGradient id={id + 'r'} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFD34D" /><Stop offset="0.5" stopColor="#FFF0A8" /><Stop offset="1" stopColor="#FFB000" /></LinearGradient>
      </Defs>
      <Rect x="8" y="22" width="32" height="21" rx="3" fill={`url(#${id}b)`} />
      <Rect x="5" y="15" width="38" height="9" rx="3" fill={`url(#${id}l)`} />
      <Rect x="21" y="15" width="6" height="28" fill={`url(#${id}r)`} />
      <Path d="M8 17 H40" stroke="#fff" strokeWidth={1.4} opacity={0.55} strokeLinecap="round" />
      <Path d="M24 15 C18 14 12 12 14 7.5 C16 3.5 22 8 24 15z" fill="none" stroke="#FFC928" strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M24 15 C30 14 36 12 34 7.5 C32 3.5 26 8 24 15z" fill="none" stroke="#FFC928" strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x="21.6" y="12.6" width="4.8" height="4.4" rx="1.6" fill="#FFB000" />
    </Svg>
  );
}
