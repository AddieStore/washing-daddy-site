// Bottom of every page: a full-width, flat, grainy Delhi skyline drawn in react-native-svg (India Gate style arch, a domed
// Mughal monument, a Qutub-style tower, palms, bushes, distant blue towers, a metro on pillars, birds, clouds and a small car
// being pressure-washed). The top fades into the page background (the `bg` prop); the company line sits on the dark road strip.
import React, { useId, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../theme';
import { TAB_BAR_H } from './motion';
import { Car, Person, Sparkle, WASHER } from './loginStory';

const W = 400;
const H = 226;
const GY = 150; // ground line (top of the pavement)
const K = 1.12; // landmark scale about the ground line
const ROAD = '#262A35';

// ---- palette (the illustration is identical in light and dark mode) ----
const P = {
  skyTop: '#2BB3A8', skyBot: '#8CDCCF',
  gold: '#EBB94A', goldDk: '#CE9630', goldLt: '#F6D77F', goldIn: '#B97F25',
  salmon: '#E98672', salmonDk: '#CC6A5A', salmonLt: '#F4A894', white: '#FBF6EA', whiteDk: '#E6DCC6',
  stone: '#D88752', stoneDk: '#B96A3E',
  blue1: '#3E7FB6', blue2: '#5A9AC9', blue3: '#7DB4D8',
  palm: '#1E6A47', palmLt: '#2E8A5A', trunk: '#7B5434',
  bush1: '#2A8A4D', bush2: '#1D6B3C', bush3: '#3AA45E',
};

/** Deterministic pseudo-random so the grain is stable between renders. */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const GRAIN = (() => {
  const r = rng(7);
  return Array.from({ length: 360 }, () => ({ x: r() * W, y: r() * H, r: 0.35 + r() * 0.7, light: r() > 0.5, o: 0.07 + r() * 0.09 }));
})();

const rad = (d: number) => (d * Math.PI) / 180;
const f = (n: number) => Math.round(n * 10) / 10;

/** One palm frond: a curved leaf from the crown, drooping at the tip. */
function frond(cx: number, cy: number, ang: number, len: number) {
  const a = rad(ang);
  const dx = Math.cos(a), dy = Math.sin(a);
  const ex = cx + dx * len, ey = cy + dy * len + len * 0.28;
  const mx = cx + dx * len * 0.5, my = cy + dy * len * 0.5 - len * 0.2;
  const nx = -dy * len * 0.13, ny = dx * len * 0.13;
  return `M${f(cx)} ${f(cy)} Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)} Q${f(mx - nx)} ${f(my - ny + 2)} ${f(cx)} ${f(cy)}Z`;
}

function Palm({ x, h, lean = 0, s = 1 }: { x: number; h: number; lean?: number; s?: number }) {
  const top = GY - h;
  const tx = x + lean;
  const angs = [-170, -140, -112, -80, -50, -20, 10, 160, 188, 35];
  return (
    <G>
      <Path d={`M${x - 2.2 * s} ${GY} Q${x + lean * 0.2} ${GY - h * 0.55} ${tx - 1} ${top} L${tx + 1.2} ${top} Q${x + lean * 0.4 + 2} ${GY - h * 0.55} ${x + 2.2 * s} ${GY}Z`} fill={P.trunk} />
      {[0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map((k, i) => (
        <Rect key={i} x={x + lean * k * k - 2 * s} y={GY - h * k} width={4 * s} height={0.9} fill="#5A3A20" opacity={0.5} />
      ))}
      {angs.map((a, i) => <Path key={i} d={frond(tx, top, a, (22 + (i % 3) * 3) * s)} fill={i % 2 ? P.palmLt : P.palm} />)}
      <Circle cx={tx} cy={top + 1.5} r={2.2 * s} fill="#5A3A20" />
    </G>
  );
}

function Bush({ x, r, c = P.bush2, hi = P.bush3 }: { x: number; r: number; c?: string; hi?: string }) {
  return (
    <G>
      <Circle cx={x} cy={GY - r * 0.55} r={r} fill={c} />
      <Circle cx={x - r * 0.75} cy={GY - r * 0.35} r={r * 0.7} fill={c} />
      <Circle cx={x + r * 0.8} cy={GY - r * 0.3} r={r * 0.65} fill={c} />
      <Circle cx={x - r * 0.25} cy={GY - r * 0.85} r={r * 0.45} fill={hi} opacity={0.7} />
    </G>
  );
}

function Cloud({ x, y, s = 1, o = 0.55 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <G opacity={o} fill="#FFFFFF">
      <Ellipse cx={x} cy={y} rx={22 * s} ry={5.5 * s} />
      <Ellipse cx={x - 8 * s} cy={y - 4 * s} rx={10 * s} ry={6 * s} />
      <Ellipse cx={x + 7 * s} cy={y - 5.5 * s} rx={12 * s} ry={7 * s} />
    </G>
  );
}

function Bird({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <Path d={`M${x} ${y} q${3 * s} ${-3.2 * s} ${6 * s} 0 q${3 * s} ${-3.2 * s} ${6 * s} 0`} fill="none" stroke="#1D5E66" strokeWidth={1.1} strokeLinecap="round" opacity={0.75} />;
}

/** Distant blue city towers with a few lit windows. */
function Skyline() {
  const rows: [number, number, number, string][] = [
    // x, width, height, colour
    [0, 26, 52, P.blue2], [22, 18, 70, P.blue1], [40, 22, 44, P.blue3], [96, 16, 60, P.blue2], [118, 20, 84, P.blue1],
    [138, 16, 50, P.blue3], [196, 14, 58, P.blue2], [250, 18, 74, P.blue1], [268, 22, 46, P.blue3], [292, 16, 64, P.blue2],
    [316, 20, 52, P.blue1], [340, 18, 80, P.blue2], [358, 24, 56, P.blue3], [380, 22, 70, P.blue1],
  ];
  return (
    <G>
      {rows.map(([x, w, h, c], i) => (
        <G key={i}>
          <Rect x={x} y={GY - h} width={w} height={h} fill={c} />
          {i % 4 === 1 ? <Rect x={x + w / 2 - 0.8} y={GY - h - 9} width={1.6} height={9} fill={c} /> : null}
          {Array.from({ length: Math.floor((h - 8) / 9) }).map((_, k) => (
            <Rect key={k} x={x + 3 + ((k + i) % 2) * (w / 2 - 1)} y={GY - h + 6 + k * 9} width={2.4} height={3} fill="#EAF6FB" opacity={(k + i) % 3 === 0 ? 0.55 : 0.18} />
          ))}
        </G>
      ))}
    </G>
  );
}

/** India-Gate-like memorial arch (our own proportions): stepped top, deep arch, cornice, plinth. */
function Gate({ x }: { x: number }) {
  const w = 62, h = 70, top = GY - h;
  return (
    <G>
      <Rect x={x - 6} y={GY - 5} width={w + 12} height={5} fill={P.goldDk} />
      <Rect x={x - 3} y={GY - 9} width={w + 6} height={4.5} fill={P.gold} />
      <Rect x={x} y={top} width={w} height={h - 9} fill={P.gold} />
      <Rect x={x + w * 0.72} y={top} width={w * 0.28} height={h - 9} fill={P.goldDk} opacity={0.55} />
      <Rect x={x - 2} y={top - 2} width={w + 4} height={4} fill={P.goldLt} />
      <Rect x={x + 4} y={top - 7} width={w - 8} height={5} fill={P.gold} />
      <Rect x={x + 10} y={top - 11} width={w - 20} height={4} fill={P.goldDk} />
      <Path d={`M${x + 19} ${top - 11} q12 -9 24 0Z`} fill={P.goldLt} />
      <Rect x={x + 6} y={top + 7} width={w - 12} height={2} fill={P.goldDk} opacity={0.7} />
      <Path d={`M${x + 16} ${GY - 9} V${top + 26} a15 15 0 0 1 30 0 V${GY - 9}Z`} fill={P.goldIn} />
      <Path d={`M${x + 20} ${GY - 9} V${top + 27} a11 11 0 0 1 22 0 V${GY - 9}Z`} fill="#8C5A1C" />
      <Path d={`M${x + 20} ${GY - 9} V${top + 27} a11 11 0 0 1 11 -11 V${GY - 9}Z`} fill="#A06A22" />
      {[0.1, 0.9].map((k, i) => <Rect key={i} x={x + w * k - 2.5} y={top + 14} width={5} height={14} rx={2} fill={P.goldDk} opacity={0.7} />)}
    </G>
  );
}

/** Qutub-style fluted tower: tapering stacked tiers, balconies, cupola. */
function Tower({ x }: { x: number }) {
  const tiers = [
    { y: GY, w: 17, h: 24 }, { y: GY - 24, w: 14.5, h: 22 }, { y: GY - 46, w: 12.2, h: 19 }, { y: GY - 65, w: 10, h: 15 }, { y: GY - 80, w: 8, h: 10 },
  ];
  return (
    <G>
      {tiers.map((t, i) => (
        <G key={i}>
          <Rect x={x - t.w / 2} y={t.y - t.h} width={t.w} height={t.h} fill={i % 2 ? P.stone : '#E0925F'} />
          <Rect x={x + t.w * 0.15} y={t.y - t.h} width={t.w * 0.35} height={t.h} fill={P.stoneDk} opacity={0.45} />
          {[-0.25, 0.1].map((k, j) => <Rect key={j} x={x + t.w * k - 0.4} y={t.y - t.h + 2} width={0.8} height={t.h - 3} fill={P.stoneDk} opacity={0.5} />)}
          <Rect x={x - t.w / 2 - 2} y={t.y - t.h - 1.6} width={t.w + 4} height={2.6} fill={P.stoneDk} />
        </G>
      ))}
      <Path d={`M${x - 3.6} ${GY - 91.6} a3.6 3.8 0 0 1 7.2 0Z`} fill={P.whiteDk} />
      <Rect x={x - 0.5} y={GY - 100} width={1} height={5} fill={P.stoneDk} />
    </G>
  );
}

/** Big salmon-pink domed monument with a white onion dome, chhatris and minarets. */
function Monument({ x }: { x: number }) {
  const w = 104, bx = x - w / 2, top = GY - 42;
  return (
    <G>
      {/* terrace */}
      <Rect x={bx - 10} y={GY - 6} width={w + 20} height={6} fill={P.salmonDk} />
      <Rect x={bx - 5} y={GY - 11} width={w + 10} height={5} fill={P.salmonLt} />
      {/* wings */}
      <Rect x={bx} y={top + 12} width={w} height={31} fill={P.salmon} />
      <Rect x={bx} y={top + 12} width={w} height={3} fill={P.salmonLt} />
      {[0, 1, 2, 3].map((i) => <Rect key={i} x={bx + 4 + i * 4} y={top + 17} width={2} height={20} fill={P.salmonDk} opacity={0.0} />)}
      {/* side arches */}
      {[bx + 8, bx + w - 26].map((ax, i) => (
        <G key={i}>
          <Path d={`M${ax} ${GY - 11} V${top + 28} a9 9 0 0 1 18 0 V${GY - 11}Z`} fill={P.salmonDk} />
          <Path d={`M${ax + 3} ${GY - 11} V${top + 29} a6 6 0 0 1 12 0 V${GY - 11}Z`} fill="#8E4A44" />
        </G>
      ))}
      {/* central iwan */}
      <Rect x={x - 19} y={top - 2} width={38} height={GY - 11 - top + 2} fill={P.salmonLt} />
      <Rect x={x + 6} y={top - 2} width={13} height={GY - 11 - top + 2} fill={P.salmon} opacity={0.55} />
      <Path d={`M${x - 11} ${GY - 11} V${top + 22} a11 11 0 0 1 22 0 V${GY - 11}Z`} fill={P.salmonDk} />
      <Path d={`M${x - 7.5} ${GY - 11} V${top + 23} a7.5 7.5 0 0 1 15 0 V${GY - 11}Z`} fill="#8E4A44" />
      <Rect x={x - 21} y={top - 5} width={42} height={4} fill={P.white} />
      {/* drum + dome */}
      <Rect x={x - 12} y={top - 14} width={24} height={10} fill={P.white} />
      <Rect x={x + 3} y={top - 14} width={9} height={10} fill={P.whiteDk} />
      <Path d={`M${x - 15} ${top - 14} C${x - 22} ${top - 30} ${x - 7} ${top - 40} ${x} ${top - 49} C${x + 7} ${top - 40} ${x + 22} ${top - 30} ${x + 15} ${top - 14}Z`} fill={P.white} />
      <Path d={`M${x + 1} ${top - 48} C${x + 7} ${top - 40} ${x + 22} ${top - 30} ${x + 15} ${top - 14} L${x + 2} ${top - 14}Z`} fill={P.whiteDk} opacity={0.8} />
      <Rect x={x - 0.6} y={top - 60} width={1.2} height={12} fill={P.gold} />
      <Circle cx={x} cy={top - 57} r={1.7} fill={P.gold} />
      {/* chhatris */}
      {[x - 28, x + 28].map((cx, i) => (
        <G key={i}>
          <Rect x={cx - 6} y={top - 4} width={12} height={4} fill={P.white} />
          <Rect x={cx - 5} y={top - 12} width={1.8} height={9} fill={P.salmonDk} />
          <Rect x={cx + 3.2} y={top - 12} width={1.8} height={9} fill={P.salmonDk} />
          <Path d={`M${cx - 6} ${top - 12} C${cx - 6} ${top - 21} ${cx + 6} ${top - 21} ${cx + 6} ${top - 12}Z`} fill={P.white} />
          <Rect x={cx - 0.4} y={top - 25} width={0.8} height={5} fill={P.gold} />
        </G>
      ))}
      {/* minarets */}
      {[bx - 8, bx + w + 8].map((mx, i) => (
        <G key={i}>
          <Rect x={mx - 4} y={top - 14} width={8} height={GY - top + 14 - 6} fill={P.salmon} />
          <Rect x={mx + 1} y={top - 14} width={3} height={GY - top + 14 - 6} fill={P.salmonDk} opacity={0.5} />
          <Rect x={mx - 5.5} y={top - 3} width={11} height={2.4} fill={P.white} />
          <Rect x={mx - 5.5} y={top + 14} width={11} height={2.4} fill={P.white} />
          <Path d={`M${mx - 4.6} ${top - 14} C${mx - 4.6} ${top - 23} ${mx + 4.6} ${top - 23} ${mx + 4.6} ${top - 14}Z`} fill={P.white} />
          <Rect x={mx - 0.4} y={top - 27} width={0.8} height={5} fill={P.gold} />
        </G>
      ))}
    </G>
  );
}

/** Elevated metro: pillars, deck, and a three-car train. */
function Metro({ x0 }: { x0: number }) {
  const deckY = 100;
  const pillars = [x0 + 14, x0 + 70, x0 + 126];
  return (
    <G>
      {pillars.map((px, i) => (
        <G key={i}>
          <Path d={`M${px - 3} ${GY} L${px - 2.2} ${deckY + 7} L${px + 2.2} ${deckY + 7} L${px + 3} ${GY}Z`} fill="#9AA6B8" />
          <Path d={`M${px + 0.6} ${GY} L${px + 0.8} ${deckY + 7} L${px + 2.2} ${deckY + 7} L${px + 3} ${GY}Z`} fill="#7D8A9E" />
          <Path d={`M${px - 9} ${deckY + 7} L${px + 9} ${deckY + 7} L${px + 4} ${deckY + 14} L${px - 4} ${deckY + 14}Z`} fill="#B0BAC9" />
        </G>
      ))}
      <Rect x={x0 - 4} y={deckY + 3} width={170} height={5} fill="#C4CCD8" />
      <Rect x={x0 - 4} y={deckY + 7} width={170} height={1.8} fill="#8995A8" />
      {[0, 1, 2].map((i) => {
        const cx = x0 + 2 + i * 50;
        return (
          <G key={i}>
            <Path d={`M${cx} ${deckY + 3} V${deckY - 14} a5 5 0 0 1 5 -5 H${cx + 42} a5 5 0 0 1 5 5 V${deckY + 3}Z`} fill="#F1F4F8" />
            <Rect x={cx} y={deckY - 4} width={47} height={3} fill="#C93B7E" />
            <Rect x={cx} y={deckY - 1} width={47} height={1.4} fill="#2F5FA8" />
            <Rect x={cx + 3} y={deckY - 15} width={41} height={7} rx={1.4} fill="#2A4F78" />
            {[0, 1, 2, 3, 4, 5].map((k) => <Rect key={k} x={cx + 5 + k * 6.6} y={deckY - 14} width={4.6} height={5} rx={0.8} fill="#9ED8EA" opacity={0.9} />)}
          </G>
        );
      })}
    </G>
  );
}

/** Small white hatchback, side view, with a pressure-washer spraying the roof/bonnet. */
/** The cleaner's kit: the violet WD box, a saffron bucket of foam and a brush, drawn in the same flat style as the home-screen story. */
function Kit({ w }: { w: number }) {
  const h = w * 0.86;
  return (
    <Svg width={w} height={h} viewBox="0 0 70 60">
      <Ellipse cx={34} cy={57} rx={32} ry={2.6} fill="#14161C" opacity={0.5} />
      {/* WD box */}
      <Rect x={4} y={22} width={30} height={32} rx={5} fill="#5409DA" />
      <Rect x={4} y={22} width={30} height={7} rx={3.5} fill="#6B2BF0" />
      <Circle cx={19} cy={40} r={8} fill="#FFFFFF" />
      <Path d="M13.5 36.5 L16 44 L19 38.5 L22 44 L24.5 36.5" stroke="#5409DA" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* bucket with foam */}
      <Path d="M40 36 H62 L60 54 Q60 56 58 56 H44 Q42 56 42 54Z" fill="#FFBA08" />
      <Path d="M40 36 H62 L61.6 40 H40.4Z" fill="#E9A400" />
      <Circle cx={45} cy={33} r={5} fill="#FFFFFF" /><Circle cx={52} cy={30} r={6.4} fill="#FFFFFF" /><Circle cx={58.5} cy={33.5} r={4.6} fill="#FFFFFF" />
      <Circle cx={50} cy={27} r={2.4} fill="#EDE5FF" opacity={0.9} /><Circle cx={56} cy={25.5} r={1.8} fill="#EDE5FF" opacity={0.9} />
      {/* brush leaning on the box */}
      <Path d="M30 24 L38 4" stroke="#7B5434" strokeWidth={2.4} strokeLinecap="round" />
      <Rect x={33} y={0.5} width={12} height={5.2} rx={2.2} fill="#2B1B66" transform="rotate(20 39 3)" />
    </Svg>
  );
}

/** The home-screen pair on the road: a clean car, our washer beside it giving a thumbs-up, and his kit. k = screen px per art unit. */
function ThumbsUp({ k, base }: { k: number; base: number }) {
  const carW = 136 * k, carH = carW * 90 / 220, perH = 112 * k, kitW = 50 * k;
  const bottom = base * k;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      <View style={{ position: 'absolute', left: 14 * k, top: bottom - carH + 2 * k }}><Car w={carW} shine /></View>
      <View style={{ position: 'absolute', left: 26 * k, top: bottom - carH - 8 * k, width: 0, height: 0 }}>
        <Sparkle x={0} y={0} s={13 * k} delay={0} />
      </View>
      <View style={{ position: 'absolute', left: 166 * k, top: bottom - perH + 4 * k }}><Person look={WASHER} pose="thumb" h={perH} delay={200} /></View>
      <View style={{ position: 'absolute', left: 244 * k, top: bottom - kitW * 0.86 + 1 * k }}><Kit w={kitW} /></View>
      <View style={{ position: 'absolute', left: 118 * k, top: bottom - carH - 14 * k }}><Sparkle x={0} y={0} s={11 * k} delay={500} /></View>
    </View>
  );
}

/** `bg`: the page background the top of the art fades into. `bleed`: the page's horizontal padding to cancel so the art is full width.
 *  `tabs`: leave room for the floating tab bar underneath (tab screens). */
export function Footer({ bg = '#FFFFFF', bleed = 0, tabs = true, extraBottom = 0 }: { bg?: string; bleed?: number; tabs?: boolean; extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const [kw, setKw] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const spacer = (tabs ? TAB_BAR_H + Math.max(insets.bottom, 0) : 0) + extraBottom;
  return (
    <View style={{ marginTop: 24, marginHorizontal: -bleed, backgroundColor: bg }}>
      <View style={{ width: '100%', backgroundColor: ROAD }}>
      <View onLayout={e => setKw(e.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: W / H }} accessibilityRole="text">
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
            <Defs>
              <LinearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={P.skyTop} /><Stop offset="1" stopColor={P.skyBot} />
              </LinearGradient>
              <LinearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bg} stopOpacity={1} /><Stop offset="0.55" stopColor={bg} stopOpacity={0.55} /><Stop offset="1" stopColor={bg} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={`haze${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFF3C4" stopOpacity={0} /><Stop offset="1" stopColor="#FFF3C4" stopOpacity={0.35} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={W} height={GY} fill={`url(#sky${id})`} />
            <Rect x={0} y={GY - 70} width={W} height={70} fill={`url(#haze${id})`} />
            <Circle cx={318} cy={44} r={15} fill="#FFF3C4" opacity={0.22} />
            <Circle cx={318} cy={44} r={9} fill="#FFF6D2" opacity={0.4} />
            <Cloud x={70} y={46} s={1.1} /><Cloud x={205} y={30} s={0.8} o={0.45} /><Cloud x={360} y={70} s={1} o={0.5} /><Cloud x={140} y={78} s={0.7} o={0.4} />
            <Bird x={96} y={34} /><Bird x={110} y={28} s={0.8} /><Bird x={248} y={52} s={0.9} /><Bird x={262} y={46} s={0.7} /><Bird x={30} y={64} s={0.8} />
            <G transform={`translate(${130 * (1 - K)} ${GY * (1 - K)}) scale(${K})`}>
            <Skyline />
            <Metro x0={236} />
            <Tower x={118} />
            <Gate x={26} />
            <Palm x={100} h={78} lean={-4} s={0.9} />
            <Monument x={196} />
            <Palm x={282} h={74} lean={-5} s={0.9} />
            <Palm x={372} h={88} lean={-7} />
            <Bush x={6} r={9} /><Bush x={86} r={8} c={P.bush1} /><Bush x={150} r={7} c={P.bush1} /><Bush x={238} r={8} /><Bush x={300} r={7} c={P.bush1} /><Bush x={342} r={9} /><Bush x={398} r={7} c={P.bush1} />
            </G>
            {/* pavement + road */}
            <Rect x={0} y={GY} width={W} height={5} fill="#C9B48E" />
            <Rect x={0} y={GY + 5} width={W} height={2} fill="#8F7E5E" />
            <Rect x={0} y={GY + 7} width={W} height={H - GY - 7} fill={ROAD} />
            <Rect x={0} y={GY + 7} width={W} height={2} fill="#3A3F4D" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <Rect key={i} x={20 + i * 60} y={GY + 12} width={26} height={1.6} rx={0.8} fill="#E7E1CF" opacity={0.28} />)}
            {/* grain */}
            <G>
              {GRAIN.map((g, i) => <Circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.light ? '#FFFFFF' : '#10202A'} opacity={g.o} />)}
            </G>
            {/* fade into the page */}
            <Rect x={0} y={0} width={W} height={92} fill={`url(#fade${id})`} />
          </Svg>
        </View>
        {kw > 0 ? <ThumbsUp k={kw / W} base={GY + 20} /> : null}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 9, paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: F.b700, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.2, textAlign: 'center' }}>Washing Daddy Private Limited</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: '#C9CEDA', marginTop: 1, textAlign: 'center' }}>© 2026 All rights reserved · Made in India</Text>
        </View>
      </View>
      </View>
      {spacer > 0 ? <View style={{ height: spacer, backgroundColor: bg }} /> : null}
    </View>
  );
}
