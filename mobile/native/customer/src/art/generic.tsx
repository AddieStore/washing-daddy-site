// Generic service illustration for services the admin adds from the dashboard without a built-in drawing (catalog art.key
// missing or unknown). Drawn in the same style as artA/B/C: 100x100 viewBox, soft accent disc, ground shadow, the WD violet car,
// a gradient medallion with the service's icon in white, droplets and gold sparkles. Driven by art.icon + art.accent only,
// so a new service sits in the grid like the hand-drawn ones.
import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Path, Circle, Rect, Ellipse } from 'react-native-svg';

const VIOLET = '#5409DA', GOLD = '#FFBA08';
let seq = 0;

/** lighter / darker shade of a #hex colour (t > 0 lighter, t < 0 darker) */
function shade(hex: string, t: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return hex;
  const n = parseInt(m[1], 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.round(t > 0 ? c + (255 - c) * t : c * (1 + t)));
  return '#' + ch.map(c => c.toString(16).padStart(2, '0')).join('');
}
const okHex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

// icon glyphs on a 24 grid, white strokes on the medallion (same vocabulary as ui/icons)
const GLYPH: Record<string, string> = {
  drop: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  foam: 'M7 15a3 3 0 1 1 1-5.8A4 4 0 0 1 16 9a3 3 0 1 1 1 6z M8 19h8',
  spray: 'M8 9h7v11H8z M10 9V6h3v3 M13 6h3 M18 4l2-1 M18 7h3 M18 10l2 1',
  car: 'M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2h3v-2M17 16v2h3v-2',
  seat: 'M9 3h5a2 2 0 0 1 2 2l-1 9H9L8 5a2 2 0 0 1 1-2z M7 14h10l1 4H6z M9 18v3 M15 18v3',
  wheel: 'M12 3a9 9 0 1 0 0.01 0z M12 8a4 4 0 1 0 0.01 0z M12 3v5 M12 16v5 M3 12h5 M16 12h5',
  glass: 'M4 18l3-11h10l3 11z M8 10l-1 4 M12 9l-2 7',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z M19 3v3 M17.5 4.5h3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  leaf: 'M5 19C5 10 10 5 20 4c0 9-5 15-14 15z M5 19l8-8',
  engine: 'M5 9h4V7h6v2h3l2 3v5h-2v2H8l-3-3z M2 11v4 M11 7V5',
  vacuum: 'M6 4h5v9H6z M8.5 13v4a3 3 0 0 0 3 3H19 M17 20v-3h3',
  brush: 'M14 4l6 6-7 7-6-6z M7 11l-3 3c-1 1-1 3 0 4s3 1 4 0l3-3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  clock: 'M12 3a9 9 0 1 0 0.01 0z M12 7v5l3 2',
  gift: 'M3 9h18v4H3z M5 13v7h14v-7 M12 9v11 M12 9c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
};
export const GENERIC_ICONS = Object.keys(GLYPH);

/** side-on WD car (same drawing as the illustration set), local box 80 x 36 */
function Car({ id }: { id: string }) {
  return (
    <G>
      <Path d="M2 27 Q2 19 10 18 L21 17 Q27 6 38 5 L55 5 Q65 6 70 15 L74 18 Q79 20 79 27 L79 29 Q79 31 76 31 L5 31 Q2 31 2 29 Z" fill={`url(#${id}car)`} />
      <Path d="M25 16 Q30 9 38 8.5 L45 8.5 L45 16 Z M48 8.5 L55 8.5 Q61 9.5 65 16 L48 16 Z" fill={`url(#${id}gl)`} />
      <Path d="M27 15 Q31 10 36 9.6" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d="M8 19.5 Q22 17.5 40 17.5 Q60 17.5 72 19.5" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.4} />
      <Rect x={73} y={21} width={5} height={3.4} rx={1.7} fill={`url(#${id}gold)`} />
      <Rect x={2.5} y={21} width={3.4} height={3} rx={1.5} fill="#FF5C6C" />
      {[20, 60].map(cx => (
        <G key={cx}>
          <Circle cx={cx} cy={30} r={9} fill="#1E1B2E" opacity={0.9} />
          <Circle cx={cx} cy={30} r={7.4} fill="#2B2840" />
          <Circle cx={cx} cy={30} r={4.4} fill={`url(#${id}metal)`} />
          <Circle cx={cx} cy={30} r={1.7} fill={`url(#${id}gold)`} />
        </G>
      ))}
    </G>
  );
}
const spark = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
const Drop = ({ x, y, s = 1, c }: { x: number; y: number; s?: number; c: string }) => (
  <G><Path d={`M${x} ${y - 4 * s} Q${x + 3.4 * s} ${y + 0.5 * s} ${x} ${y + 3 * s} Q${x - 3.4 * s} ${y + 0.5 * s} ${x} ${y - 4 * s} Z`} fill={c} /><Circle cx={x - 0.9 * s} cy={y + 0.3 * s} r={0.8 * s} fill="#fff" opacity={0.8} /></G>
);

export function GenericArt({ size, icon, accent }: { size: number; icon?: string; accent?: string }) {
  const id = React.useMemo(() => 'gn' + (seq++).toString(36), []);
  const acc = okHex(accent) || VIOLET, hi = shade(acc, 0.45), lo = shade(acc, -0.25), glyph = GLYPH[icon || ''] || GLYPH.sparkle;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}car`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#8A4DFF" /><Stop offset="1" stopColor={VIOLET} /></LinearGradient>
        <LinearGradient id={`${id}gl`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#D9EEFF" /><Stop offset="1" stopColor="#7FB4F2" /></LinearGradient>
        <LinearGradient id={`${id}gold`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFD65C" /><Stop offset="1" stopColor={GOLD} /></LinearGradient>
        <LinearGradient id={`${id}metal`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#AEB0C2" /></LinearGradient>
        <RadialGradient id={`${id}med`} cx="0.35" cy="0.3" r="0.85"><Stop offset="0" stopColor={hi} /><Stop offset="1" stopColor={lo} /></RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={45} fill={acc} opacity={0.13} />
      <Ellipse cx={50} cy={89} rx={36} ry={5.5} fill="#1B1240" opacity={0.13} />
      <G transform="translate(10 52) scale(1)"><Car id={id} /></G>
      {/* medallion with the service icon, floating over the car */}
      <Ellipse cx={50} cy={50} rx={14} ry={2.6} fill="#1B1240" opacity={0.1} />
      <Circle cx={50} cy={29} r={19} fill={`url(#${id}med)`} />
      <Circle cx={50} cy={29} r={19} fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.55} />
      <Path d="M36 22 A16 16 0 0 1 47 12.6" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.55} />
      <G transform="translate(37.4 16.4) scale(1.05)">
        <Path d={glyph} stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
      <Drop x={80} y={44} s={1.1} c={hi} /><Drop x={20} y={40} s={0.9} c={acc} /><Drop x={86} y={60} s={0.8} c={acc} />
      <Path d={spark(82, 22, 5)} fill={GOLD} /><Path d={spark(16, 24, 3.4)} fill={GOLD} /><Path d={spark(70, 12, 2.4)} fill="#fff" />
    </Svg>
  );
}
