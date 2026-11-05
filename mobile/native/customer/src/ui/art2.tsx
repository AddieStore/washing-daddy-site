// Neutral line-art helpers for the screens (react-native-svg). The old glossy 3D icons are now single line icons in muted text colour
// (names kept so imports still work); Skyline / Laurel / Scallop are flat greys.
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { Zap, Calendar, Wallet, Gift } from './icons';

const MUTED = '#737373';
const line = (Ic: typeof Zap) => ({ size = 24, color }: { size?: number; color?: string }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Ic size={Math.min(Math.max(size * 0.45, 18), 24)} color={color ?? MUTED} /></View>
);
export const Bolt3D = line(Zap);
export const Calendar3D = line(Calendar);
export const WalletIcon3D = line(Wallet);
export const GiftIcon3D = line(Gift);

// ---------------------------------------------------------------- Laurel
function Branch() {
  // left branch, leaves along an arc; mirrored for the right one
  const leaves: [number, number, number, number][] = [
    [14, 8, -35, 1], [10, 16, -15, 1], [8, 25, 0, 1.05], [8, 34, 12, 1.05], [10, 43, 25, 1], [14, 51, 40, 0.95], [20, 58, 55, 0.85],
  ];
  return (
    <G>
      <Path d="M24 5 Q6 22 10 44 Q13 54 22 61" stroke="#D4D4D8" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r, s], i) => (
        <G key={i} transform={`translate(${x + 6} ${y}) rotate(${r}) scale(${s})`}>
          <Path d="M0 0 Q-11 -2 -12 -11 Q-1 -11 0 0z" fill="#E4E4E7" />
        </G>
      ))}
      {leaves.slice(0, 6).map(([x, y, r, s], i) => (
        <G key={'b' + i} transform={`translate(${x + 12} ${y + 3}) rotate(${r + 60}) scale(${s * 0.75})`}>
          <Path d="M0 0 Q-11 -2 -12 -11 Q-1 -11 0 0z" fill="#E4E4E7" />
        </G>
      ))}
    </G>
  );
}
export function Laurel({ flip, size = 48, color }: { flip?: boolean; size?: number; color?: string }) {
  return (
    <Svg width={size * 0.62} height={size} viewBox="0 0 30 66" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Branch />
    </Svg>
  );
}

// ---------------------------------------------------------------- Skyline
const S1 = '#E4E4E7', F1 = '#F4F4F5', F2 = '#EDEDEF';
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
// A soft grey wavy edge above the white body (props kept for compatibility, always neutral).
export function Scallop({ color: _color, dots: _dots, width = 360, height = 24, bg = '#FFFFFF' }: { color: string; dots?: string; width?: number | string; height?: number; bg?: string }) {
  const W = 360, n = 11, step = W / n, amp = 6, base = 12;
  let d = `M0 0 H${W} V${base}`;
  for (let i = n; i > 0; i--) { const x1 = i * step, x0 = (i - 1) * step; d += ` Q${x1 - step / 2} ${base + amp * 2} ${x0} ${base}`; }
  d += ' Z';
  const dotsEl: React.ReactNode[] = [];
  if (false as boolean) for (let i = 0; i < n; i++) dotsEl.push(<Circle key={i} cx={i * step + step / 2} cy={base + amp + 3} r={1.8} fill="#E4E4E7" />);
  return (
    <View style={{ width: width as any, height, backgroundColor: bg }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} 24`} preserveAspectRatio="none">
        <Path d={d} fill="#F4F4F5" />
        {dotsEl}
      </Svg>
    </View>
  );
}

