// Service icons for the Home grid: one consistent, quiet set instead of the cartoon scenes. 48 x 48 grid, 1.75 line in the brand
// violet, one soft lavender fill per icon for depth, rounded joins. Shared parts (car body, wheel, seat, droplet, sparkle) keep
// every icon in the same family. An id without an icon falls back to the old illustration (SvcArt).
import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

const V = '#5409DA', F = '#E9E1FF', W = 1.75;
const line = { stroke: V, strokeWidth: W, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
const soft = { fill: F };

/* ---------- shared parts ---------- */
// car in profile, wheels at (14,33) and (35,33)
const CarSide = ({ y = 0 }: { y?: number }) => (
  <G transform={`translate(0 ${y})`}>
    <Path d="M8.5 27.5 L12 22 L17.5 16.5 A4 4 0 0 1 20.3 15.3 H28.6 A4 4 0 0 1 31.4 16.5 L37 22 L41.5 23.3 A3 3 0 0 1 43.6 26.2 V29.5 A2 2 0 0 1 41.6 31.5 H6.4 A2 2 0 0 1 4.4 29.5 V29.2 A2.6 2.6 0 0 1 6 26.8 Z" {...soft} />
    <Path d="M10 33 H6.4 A2 2 0 0 1 4.4 31 V28.6 A3 3 0 0 1 6.4 25.8 L12 22 L17.5 16.5 A4 4 0 0 1 20.3 15.3 H28.6 A4 4 0 0 1 31.4 16.5 L37 22 L41.5 23.3 A3 3 0 0 1 43.6 26.2 V31 A2 2 0 0 1 41.6 33 H39 M18 33 H31" {...line} />
    <Path d="M13.5 22 H35.5 M24.5 16 V22" {...line} />
    <Circle cx={14} cy={33} r={4} {...line} fill="#fff" /><Circle cx={35} cy={33} r={4} {...line} fill="#fff" />
  </G>
);
const Drop = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <Path d={`M${x} ${y} c ${-2.2 * s} ${2.8 * s} ${-3.2 * s} ${4.4 * s} ${-3.2 * s} ${5.8 * s} a ${3.2 * s} ${3.2 * s} 0 0 0 ${6.4 * s} 0 c 0 ${-1.4 * s} ${-1 * s} ${-3 * s} ${-3.2 * s} ${-5.8 * s} z`} {...line} fill={F} />
);
const Spark = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <Path d={`M${x} ${y - 4 * s} q ${0.6 * s} ${3.4 * s} ${4 * s} ${4 * s} q ${-3.4 * s} ${0.6 * s} ${-4 * s} ${4 * s} q ${-0.6 * s} ${-3.4 * s} ${-4 * s} ${-4 * s} q ${3.4 * s} ${-0.6 * s} ${4 * s} ${-4 * s} z`} {...line} fill="#fff" />
);
const Wheel = ({ cx = 24, cy = 24, r = 14, spokes = 5 }: { cx?: number; cy?: number; r?: number; spokes?: number }) => (
  <G>
    <Circle cx={cx} cy={cy} r={r} {...line} fill={F} />
    <Circle cx={cx} cy={cy} r={r * 0.62} {...line} fill="#fff" />
    <Circle cx={cx} cy={cy} r={r * 0.16} {...line} />
    {Array.from({ length: spokes }, (_, i) => { const a = (i / spokes) * Math.PI * 2 - Math.PI / 2, r1 = r * 0.2, r2 = r * 0.58;
      return <Path key={i} d={`M${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1} L${cx + Math.cos(a) * r2} ${cy + Math.sin(a) * r2}`} {...line} /> })}
  </G>
);
// car seat in profile, facing left
const Seat = () => (
  <G>
    <Path d="M27 8.5 h5 a3 3 0 0 1 3 3.2 l-1.6 16 H25.6 l-1.4 -15.6 A3.2 3.2 0 0 1 27 8.5 z" {...soft} />
    <Path d="M27 8.5 h5 a3 3 0 0 1 3 3.2 l-1.6 16 M25.6 27.7 l-1.4 -15.6 A3.2 3.2 0 0 1 27 8.5" {...line} />
    <Path d="M12.5 28 H33 a3 3 0 0 1 3 3 v1.2 a2.8 2.8 0 0 1 -2.8 2.8 H14 a3 3 0 0 1 -3 -3 V29.5 A1.5 1.5 0 0 1 12.5 28 z" {...line} fill={F} />
    <Path d="M18 35 V40 M30 35 V40 M15 40 H33" {...line} />
  </G>
);

/* ---------- the icons ---------- */
const I: Record<string, () => React.ReactElement> = {
  ext: () => <G><CarSide y={6} /><Path d="M10 9 l3 5 M17 7 v6 M24 9 l-2 5" {...line} /><Drop x={31} y={6} s={0.8} /></G>,
  foam: () => <G><CarSide y={6} /><Circle cx={17} cy={16} r={3.6} {...line} fill="#fff" /><Circle cx={24.5} cy={13} r={4.6} {...line} fill="#fff" /><Circle cx={32} cy={16.5} r={3.2} {...line} fill="#fff" /><Circle cx={38} cy={12} r={1.8} {...line} /></G>,
  int: () => <G><Seat /><Spark x={13} y={13} s={1.1} /></G>,
  vac: () => <G><Path d="M8 38 h12 l2.5 -5 H10.5 z" {...line} fill={F} /><Path d="M16.5 33 C 17 22 22 14 31 12 M31 12 l4 -3 a2 2 0 0 1 2.8 0.4 l1.2 1.6 a2 2 0 0 1 -0.4 2.8 l-4 3 z" {...line} /><Path d="M11 41.5 h1.5 M15.5 41.5 h1.5 M20 41.5 h1.5" {...line} /></G>,
  engine: () => <G><Rect x={11} y={16} width={22} height={18} rx={3} {...line} fill={F} /><Path d="M16 16 v-4 h12 v4 M33 21 h4 v8 h-4 M11 22 H7 v7 h4 M16 23 h12 M16 28 h12" {...line} /><Spark x={40} y={11} s={0.9} /></G>,
  tyre: () => <G><Wheel cx={22} cy={25} r={15} spokes={6} /><Path d="M36 9 a10 10 0 0 1 4 5" {...line} /><Spark x={40} y={22} s={0.8} /></G>,
  glass: () => <G><Path d="M9 32 L13.5 14 A3 3 0 0 1 16.4 11.7 H31.6 A3 3 0 0 1 34.5 14 L39 32 Z" {...line} fill={F} /><Path d="M24 33 L16 19" {...line} /><Path d="M19 24 a10 10 0 0 1 10 -6" {...line} /><Path d="M7 37 H41" {...line} /></G>,
  dash: () => <G><Path d="M5 30 a19 19 0 0 1 38 0 v4 H5 z" {...line} fill={F} /><Circle cx={17} cy={27} r={5.5} {...line} fill="#fff" /><Path d="M17 27 l2.5 -2.5" {...line} /><Rect x={27} y={23} width={10} height={6} rx={1.5} {...line} fill="#fff" /><Spark x={38} y={11} s={0.9} /></G>,
  seat: () => <G><Seat /><Drop x={13} y={9} s={0.9} /><Drop x={17} y={17} s={0.6} /></G>,
  odour: () => <G><Path d="M9 18 c4 -3 8 3 12 0 s8 -3 12 0 M9 25 c4 -3 8 3 12 0 s8 -3 12 0 M9 32 c4 -3 8 3 12 0" {...line} /><Path d="M33 40 c0 -7 4 -11 10 -11 c0 7 -4 11 -10 11 z M33 40 l5 -6" {...line} fill={F} /></G>,
  ceramic: () => <G><Path d="M24 6 l13 5 v10 c0 9 -5.5 15 -13 19 c-7.5 -4 -13 -10 -13 -19 V11 z" {...line} fill={F} /><Path d="M18 23 l4 4 l8 -8" {...line} /><Spark x={40} y={34} s={0.9} /></G>,
  under: () => <G><CarSide y={-2} /><Path d="M12 37 l-2 5 M19 37 v5 M26 37 v5 M33 37 l2 5" {...line} /></G>,
  wax: () => <G><Circle cx={22} cy={27} r={12} {...line} fill={F} /><Circle cx={22} cy={27} r={5} {...line} fill="#fff" /><Path d="M22 15 v-6 h9" {...line} /><Path d="M36 22 a14 14 0 0 1 0 10 M40 19 a19 19 0 0 1 0 16" {...line} /></G>,
  headlight: () => <G><Path d="M8 15 h9 a9 9 0 0 1 0 18 H8 a3 3 0 0 1 -3 -3 V18 a3 3 0 0 1 3 -3 z" {...line} fill={F} /><Circle cx={16} cy={24} r={3.5} {...line} fill="#fff" /><Path d="M30 17 h12 M31 24 h12 M30 31 h12" {...line} /></G>,
  trim: () => <G><Path d="M5 22 h38 a2 2 0 0 1 2 2 v6 a4 4 0 0 1 -4 4 H7 a4 4 0 0 1 -4 -4 v-6 a2 2 0 0 1 2 -2 z" {...line} fill={F} /><Path d="M10 28 h6 M32 28 h6 M20 28 h8" {...line} /><Spark x={38} y={12} s={1} /><Spark x={12} y={13} s={0.6} /></G>,
  alloy: () => <G><Wheel cx={24} cy={24} r={16} spokes={5} /></G>,
  roof: () => <G><CarSide y={4} /><Path d="M19 12 h11" {...line} strokeWidth={3} stroke={F} /><Path d="M18.5 10 h12" {...line} /><Spark x={39} y={10} s={0.9} /></G>,
  tar: () => <G><Path d="M14 18 c3 -4 9 -4 11 0 c4 -1 7 3 5 6 c3 2 1 7 -3 6 c-2 4 -9 4 -11 0 c-4 1 -7 -4 -4 -6 c-2 -3 0 -7 2 -6 z" {...line} fill={F} /><Path d="M30 34 l10 -10 l3 3 l-10 10 z M30 34 l-2 6 l6 -2" {...line} /></G>,
  rain: () => <G><Path d="M9 34 L13.5 14 A3 3 0 0 1 16.4 11.7 H31.6 A3 3 0 0 1 34.5 14 L39 34 Z" {...line} fill={F} /><Circle cx={19} cy={20} r={1.8} {...line} fill="#fff" /><Circle cx={27} cy={18} r={1.3} {...line} fill="#fff" /><Circle cx={29} cy={26} r={2.2} {...line} fill="#fff" /><Circle cx={20} cy={28} r={1.4} {...line} fill="#fff" /><Path d="M39 8 v5 M36.5 10.5 h5" {...line} /></G>,
  leather: () => <G><Seat /><Path d="M27.5 12 l-0.2 2 M27.7 17 l-0.2 2 M27.9 22 l-0.2 2 M15 31.5 h2 M20 31.5 h2 M25 31.5 h2 M30 31.5 h2" {...line} strokeWidth={1.4} /></G>,
  liner: () => <G><Path d="M6 30 C 8 16 16 10 24 10 S 40 16 42 30" {...line} /><Path d="M10 30 C 12 20 18 15 24 15 S 36 20 38 30 Z" {...line} fill={F} /><Path d="M6 30 H42" {...line} /><Spark x={24} y={23} s={0.9} /></G>,
  boot: () => <G><Path d="M8 22 h32 a3 3 0 0 1 3 3 v9 a3 3 0 0 1 -3 3 H8 a3 3 0 0 1 -3 -3 v-9 a3 3 0 0 1 3 -3 z" {...line} fill={F} /><Path d="M10 22 L16 9 h16 l6 13" {...line} /><Path d="M19 30 h10" {...line} /><Rect x={14} y={26} width={8} height={6} rx={1} {...line} fill="#fff" /></G>,
  mats: () => <G><Path d="M12 8 h24 a3 3 0 0 1 3 3 v24 a5 5 0 0 1 -5 5 H14 a5 5 0 0 1 -5 -5 V11 a3 3 0 0 1 3 -3 z" {...line} fill={F} /><Path d="M15 14 h18 M15 19 h18 M15 24 h18 M15 29 h18" {...line} /><Drop x={40} y={30} s={0.75} /></G>,
  ac: () => <G><Rect x={7} y={10} width={26} height={18} rx={4} {...line} fill={F} /><Path d="M11 15 h18 M11 19 h18 M11 23 h18" {...line} /><Path d="M14 33 c2 2 2 5 0 7 M21 33 c2 2 2 5 0 7 M28 33 c2 2 2 5 0 7" {...line} /><Path d="M40 14 v8 M36 18 h8" {...line} /></G>,
  touch: () => <G><Circle cx={22} cy={25} r={14} {...line} fill={F} /><Circle cx={22} cy={25} r={4} {...line} fill="#fff" /><Path d="M8 25 h10 M26 25 h10 M22 29 v10" {...line} /><Circle cx={38} cy={11} r={6} {...line} fill="#fff" /><Path d="M38 8 v6 M35 11 h6" {...line} /></G>,
  rust: () => <G><Path d="M6 20 h36 v6 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 z" {...line} fill={F} /><Circle cx={13} cy={31} r={3.5} {...line} fill="#fff" /><Circle cx={35} cy={31} r={3.5} {...line} fill="#fff" /><Path d="M24 33 l7 3 v5 c0 2.5 -3 4.5 -7 6 c-4 -1.5 -7 -3.5 -7 -6 v-5 z" {...line} fill="#fff" /></G>,
  rubber: () => <G><Path d="M12 40 V16 a8 8 0 0 1 8 -8 h16 v32 z" {...line} fill={F} /><Path d="M16 36 V17 a5 5 0 0 1 5 -5 h11 v24 z" {...line} fill="#fff" /><Path d="M28 24 h3" {...line} /><Spark x={41} y={12} s={0.8} /></G>,
  battery: () => <G><Rect x={7} y={15} width={34} height={22} rx={3.5} {...line} fill={F} /><Path d="M13 15 v-4 h6 v4 M29 15 v-4 h6 v4 M13 26 h6 M16 23 v6 M29 26 h6" {...line} /></G>,
  polish: () => <G><Path d="M10 31 a14 6 0 0 0 28 0 v-3 a14 6 0 0 0 -28 0 z" {...line} fill={F} /><Path d="M24 22 v-8 M18 14 h12 M24 14 v-5" {...line} /><Path d="M6 40 c6 3 30 3 36 0" {...line} /><Spark x={40} y={14} s={0.8} /></G>,
  teflon: () => <G><CarSide y={8} /><Path d="M7 18 C 14 6 34 6 41 18" {...line} /><Path d="M11 13.5 C 17 7.5 31 7.5 37 13.5" {...line} strokeDasharray="2 3" /></G>,
};

export const hasServiceIcon = (id: string) => !!I[id];
/** the icon alone, drawn at `size` (it fills its box; the tile around it is the caller's) */
export function ServiceIcon({ id, size }: { id: string; size: number }) {
  const Icon = I[id]; if (!Icon) return null;
  return <Svg width={size} height={size} viewBox="0 0 48 48"><Icon /></Svg>;
}
