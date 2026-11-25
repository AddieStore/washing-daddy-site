// Home hero art (no photos): our washer rides the WD scooter with the kit box and the WD flag, on a light street.
// Flat illustration, light background with dark accents. Layers scroll at different speeds (clouds, skyline, posts, road)
// so the rider feels like he is cruising; wheels spin, the flag waves, small puffs leave the exhaust.
// Reduced motion: one still frame.
import React, { useEffect } from 'react';
import { useActive } from './active';
import { View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, withSpring, useReducedMotion, cancelAnimation, Easing, SharedValue } from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Ellipse, G, Text as SText } from 'react-native-svg';

const VB_W = 360, VB_H = 232;
const V = '#5409DA', V2 = '#6E2CF0', V3 = '#8A55F5', VD = '#2A0A6B', DARK = '#221838', INK = '#120B22', SKIN = '#E7A57A', SAF = '#FFBA08';

/* a horizontally looping layer: draws `tile` twice and slides left by one tile forever */
function Loop({ k, tile, ms, top, h, children, rm, span }: { k: number; tile: number; ms: number; top: number; h: number; children: (x0: number) => React.ReactNode; rm: boolean; span: number }) {
  const x = useSharedValue(0), n = Math.ceil(span / (tile * k)) + 1;
  useEffect(() => { if (!rm) x.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false); return () => cancelAnimation(x) }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value * tile * k }] }));
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: top * k, width: tile * n * k, height: h * k }, st]}>
      <Svg width={tile * n * k} height={h * k} viewBox={`0 0 ${tile * n} ${h}`}>{Array.from({ length: n }, (_, i) => children(i * tile))}</Svg>
    </Reanimated.View>
  );
}

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <Path d={`M${x} ${y} h${44 * s} a${8 * s} ${8 * s} 0 0 0 -6 ${-13 * s} a${11 * s} ${11 * s} 0 0 0 -19 ${-5 * s} a${9 * s} ${9 * s} 0 0 0 -16 ${6 * s} a${7 * s} ${7 * s} 0 0 0 -3 ${12 * s} z`} fill="#fff" />
);
function Skyline({ x0 }: { x0: number }) {
  const b = [[0, 122, 34], [34, 96, 46], [80, 136, 26], [106, 112, 38], [150, 140, 24], [174, 88, 40], [214, 120, 30], [244, 104, 52], [296, 132, 28], [324, 92, 36]];
  return <G>{b.map(([x, y, w], i) => <G key={i}>
    <Rect x={x0 + x} y={y} width={w} height={200 - y} fill="#E4D9FF" />
    {i % 2 ? <Rect x={x0 + x + w / 2 - 4} y={y + 10} width={8} height={8} rx={1.5} fill="#F3EEFF" /> : null}
  </G>)}</G>;
}
// street furniture passing by: dark lamp posts and soft round trees
function Street({ x0 }: { x0: number }) {
  const lamp = (x: number) => <G key={'l' + x}>
    <Path d={`M${x0 + x} 198 L${x0 + x} 48 C${x0 + x} 38 ${x0 + x + 7} 34 ${x0 + x + 16} 34 L${x0 + x + 23} 34`} stroke="#3A3152" strokeWidth={3} fill="none" strokeLinecap="round" />
    <Rect x={x0 + x + 19} y={31} width={14} height={6.5} rx={3.2} fill="#3A3152" />
    <Ellipse cx={x0 + x + 26} cy={40} rx={6} ry={3} fill={SAF} opacity={0.9} />
    <Path d={`M${x0 + x + 20} 41 L${x0 + x + 12} 66 L${x0 + x + 40} 66 L${x0 + x + 32} 41Z`} fill={SAF} opacity={0.08} />
    <Rect x={x0 + x - 3} y={192} width={6} height={6} rx={1.5} fill="#3A3152" />
  </G>;
  // a leafy tree like the reference art: forked brown trunk, a canopy of overlapping leaf clusters in three greens
  // (dark underside, mid body, light sunlit top-left), scalloped edge
  const tree = (x: number, s: number) => {
    const X = x0 + x, cy = 196 - 62 * s, c = (dx: number, dy: number, r: number, f: string, k: string) => <Circle key={k} cx={X + dx * s} cy={cy + dy * s} r={r * s} fill={f} />;
    return <G key={'t' + x}>
      <Path d={`M${X - 4.5 * s} 198 L${X - 2.6 * s} 168 L${X + 2.6 * s} 168 L${X + 4.5 * s} 198Z`} fill="#8A5A3C" />
      <Path d={`M${X} 178 L${X - 14 * s} 158 M${X} 176 L${X + 15 * s} 154 M${X - 1} 186 L${X - 7 * s} 172`} stroke="#8A5A3C" strokeWidth={3.2 * s} strokeLinecap="round" fill="none" />
      <Path d={`M${X + 2.6 * s} 170 L${X + 4.4 * s} 198`} stroke="#6B4129" strokeWidth={1.6 * s} />
      {[c(-24, 12, 15, '#3F8F4C', 'a'), c(24, 14, 14, '#3F8F4C', 'b'), c(0, 20, 17, '#3A8546', 'c'), c(-34, 2, 10, '#3F8F4C', 'd'), c(34, 4, 10, '#3A8546', 'e')]}
      {[c(-18, 0, 20, '#5FB36B', 'f'), c(19, -2, 19, '#58AC64', 'g'), c(0, -12, 23, '#62B86D', 'h'), c(-30, -8, 11, '#5FB36B', 'i'), c(31, -9, 11, '#58AC64', 'j')]}
      {[c(-12, -16, 13, '#8BD36F', 'k'), c(7, -24, 11, '#96DA77', 'l'), c(-25, -4, 9, '#8BD36F', 'm'), c(14, -10, 8, '#7CC866', 'n'), c(-2, -30, 8, '#A3E083', 'o')]}
      {[[-16, -18], [4, -28], [-28, -6], [12, -12]].map(([dx, dy], i) => <Path key={'v' + i} d={`M${X + dx * s} ${cy + dy * s + 3 * s} q${3 * s} ${-5 * s} ${7 * s} ${-1 * s}`} stroke="#5FB36B" strokeWidth={1.2 * s} fill="none" strokeLinecap="round" opacity={0.7} />)}
    </G>;
  };
  return <G>{lamp(30)}{tree(105, 1.3)}{lamp(205)}{tree(290, 1.12)}{tree(375, 0.8)}</G>;
}
// the far side of the road: a grass verge with tufts, small flowers and bushes (the trees and lamps stand on it, see Street)
function Verge({ x0 }: { x0: number }) {
  const tufts = [8, 31, 52, 77, 101, 124, 139, 163, 190, 214, 236, 259, 281, 303, 326, 349, 371, 392];
  const flowers: [number, string][] = [[20, '#FF6FA3'], [64, '#FFBA08'], [112, '#FFFFFF'], [152, '#FF8A5B'], [205, '#FF6FA3'], [247, '#FFFFFF'], [290, '#FFBA08'], [334, '#FF8A5B'], [380, '#FF6FA3']];
  const bushes = [44, 130, 226, 312, 396];
  return <G>
    {/* a dark green hedge line behind everything, like the reference: rounded bumps of two greens */}
    {[[10, 17, 12], [40, 22, 15], [78, 18, 11], [116, 24, 14], [160, 16, 10], [196, 23, 14], [238, 18, 12], [276, 25, 15], [318, 17, 11], [352, 22, 13], [392, 16, 10]].map(([x, rx, ry]) => <Ellipse key={'h' + x} cx={x0 + x} cy={190} rx={rx} ry={ry} fill="#3F8147" />)}
    {[[26, 14, 8], [96, 15, 9], [178, 14, 8], [258, 16, 9], [336, 14, 8]].map(([x, rx, ry]) => <Ellipse key={'H' + x} cx={x0 + x} cy={190} rx={rx} ry={ry} fill="#4F9A58" />)}
    <Rect x={x0} y={189} width={400} height={10} fill="#86CC8F" />
    <Rect x={x0} y={189} width={400} height={2.2} fill="#A9DEB0" />
    {bushes.map(x => <G key={'b' + x}><Ellipse cx={x0 + x} cy={190} rx={10} ry={6.5} fill="#5FB36B" /><Ellipse cx={x0 + x + 3} cy={188} rx={6} ry={4} fill="#86CF92" /></G>)}
    {tufts.map(x => <Path key={'g' + x} d={`M${x0 + x} 190 q-1.6 -5.5 -4.4 -7 M${x0 + x} 190 q.2 -7 1 -8.6 M${x0 + x} 190 q2 -5.2 5 -6.4`} stroke="#4FA35D" strokeWidth={1.5} strokeLinecap="round" fill="none" />)}
    {flowers.map(([x, c]) => <G key={'f' + x}>
      <Path d={`M${x0 + x} 190 v-7`} stroke="#4FA35D" strokeWidth={1.2} strokeLinecap="round" />
      {[[-1.9, 0], [1.9, 0], [0, -1.9], [0, 1.9]].map(([dx, dy], i) => <Circle key={i} cx={x0 + x + dx} cy={182.4 + dy} r={1.7} fill={c} />)}
      <Circle cx={x0 + x} cy={182.4} r={1} fill="#FFD166" />
    </G>)}
  </G>;
}
function Road({ x0 }: { x0: number }) {
  return <G>{[0, 1, 2, 3, 4, 5].map(i => <Rect key={i} x={x0 + i * 70 + 12} y={213.5} width={34} height={4} rx={2} fill="#F4F1FA" />)}</G>;
}

function Wheel({ cx, cy, k, spin }: { cx: number; cy: number; k: number; spin: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const s = 52 * k;
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: (cx - 26) * k, top: (cy - 26) * k, width: s, height: s }, st]}>
      <Svg width={s} height={s} viewBox="0 0 52 52">
        <Circle cx={26} cy={26} r={25} fill="#1B1230" />
        <Circle cx={26} cy={26} r={21} fill="none" stroke="#2E2445" strokeWidth={1.5} />
        <Circle cx={26} cy={26} r={13} fill="#fff" />
        <Circle cx={26} cy={26} r={5} fill="#1B1230" />
        <Path d="M26 14 V19 M14 26 H19 M38 26 H33 M26 38 V33" stroke={V} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Reanimated.View>
  );
}

/* the flag: two wave shapes cross-fade so it ripples in the wind (it trails backwards, to the left) */
function Flag({ k, rm }: { k: number; rm: boolean }) {
  const f = useSharedValue(0);
  useEffect(() => { if (!rm) f.value = withRepeat(withTiming(1, { duration: 320, easing: Easing.inOut(Easing.sin) }), -1, true); return () => cancelAnimation(f) }, [rm]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - f.value })), b = useAnimatedStyle(() => ({ opacity: f.value }));
  const box = { position: 'absolute' as const, left: 10 * k, top: 2 * k, width: 58 * k, height: 44 * k };
  const shape = (d: string, hi: string, ty: number) => (
    <Svg width={58 * k} height={44 * k} viewBox="10 2 58 44">
      <Path d={d} fill={SAF} /><Path d={hi} fill="#FFD166" />
      <SText x={40} y={31 + ty} textAnchor="middle" fontFamily="Poppins_700Bold" fontWeight="700" fontSize={12.5} fill={VD}>WD</SText>
    </Svg>
  );
  return <>
    <Reanimated.View pointerEvents="none" style={[box, a]}>{shape('M65 8 C52 3 38 15 16 9 L21 25 L14 40 C36 45 50 33 65 38 Z', 'M65 8 C52 3 38 15 16 9 L18 17 C40 22 52 11 65 16 Z', 0)}</Reanimated.View>
    <Reanimated.View pointerEvents="none" style={[box, b]}>{shape('M65 8 C50 12 36 4 16 12 L20 27 L15 42 C34 36 50 44 65 38 Z', 'M65 8 C50 12 36 4 16 12 L18 19 C38 12 52 20 65 16 Z', 1)}</Reanimated.View>
  </>;
}

/* scooter + rider + kit box, drawn once (wheels and flag are separate layers so they can move) */
function Body() {
  return (
    <G>
      {/* flag pole, behind the box */}
      <Path d="M66 60 L66 5" stroke={DARK} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={66} cy={4} r={3.4} fill={SAF} />
      {/* kit box on the rear rack */}
      <G rotation={-4} origin="98, 88">
        <Rect x={56} y={52} width={86} height={68} rx={9} fill={V} />
        <Rect x={56} y={52} width={86} height={13} rx={6.5} fill={V2} />
        <Rect x={56} y={66} width={86} height={7} fill={VD} />
        <Circle cx={97} cy={96} r={16} fill="#fff" />
        <SText x={97} y={100.6} textAnchor="middle" fontFamily="Poppins_700Bold" fontWeight="700" fontSize={12.5} fill={V}>WD</SText>
        <Rect x={124} y={80} width={10} height={30} rx={5} fill={VD} opacity={0.55} />
        <Path d="M62 113 h74" stroke={VD} strokeWidth={2} opacity={0.35} strokeLinecap="round" />
      </G>
      {/* scooter shell: smooth curves with a shine, like the delivery-scooter reference, in WD violet */}
      <Path d="M82 152 C82 130 102 116 134 114 L192 114 C208 114 216 124 218 138 L216 152 Z" fill={V} />
      <Path d="M96 140 C100 128 116 120 138 119 L188 119" stroke={V3} strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.9} />
      <Path d="M92 150 C94 142 100 138 108 138" stroke={VD} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <Circle cx={92} cy={140} r={3.6} fill="#FF5A5A" /><Circle cx={92} cy={140} r={1.4} fill="#FFB3B3" />
      <Path d="M218 156 L300 156 L300 150 L220 150Z" fill={DARK} />
      <Path d="M224 150 C227 124 241 104 256 94 C263 89 271 93 271 100 L274 122 C275 136 284 145 298 151 L224 152Z" fill={V} />
      <Path d="M236 140 C240 122 250 108 260 100" stroke={V3} strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.9} />
      <Path d="M250 160 C258 142 290 142 300 160 L292 162 C284 152 266 152 258 162 Z" fill={V} /><Path d="M254 156 C262 148 284 148 292 156" stroke={V3} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />
      <Path d="M268 98 L272 172" stroke={DARK} strokeWidth={6} strokeLinecap="round" />
      <Ellipse cx={288} cy={118} rx={5} ry={8} fill="#E8E2F5" /><Ellipse cx={288} cy={118} rx={3.2} ry={6} fill={SAF} />
      <Path d="M268 96 L264 76" stroke={DARK} strokeWidth={4.6} strokeLinecap="round" /><Path d="M254 76 L274 72" stroke={DARK} strokeWidth={5} strokeLinecap="round" />
      <Path d="M268 74 L274 56" stroke={DARK} strokeWidth={2} strokeLinecap="round" /><Ellipse cx={276} cy={52} rx={4.4} ry={5.6} fill={DARK} /><Ellipse cx={276} cy={52} rx={2.2} ry={3} fill="#4A3F6B" />
      {/* foam bucket hooked on the rack */}
      <Path d="M62 118 C62 108 86 108 86 118" stroke={DARK} strokeWidth={2} fill="none" />
      <Path d="M58 124 L90 124 L86 150 C85.6 153 83.5 155 80.5 155 L67.5 155 C64.5 155 62.4 153 62 150 Z" fill={SAF} />
      <Path d="M58 124 L90 124 L89.3 129 L58.7 129 Z" fill="#E09A00" />
      <Path d="M66 136 L82 136" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Circle cx={63} cy={122} r={5} fill="#fff" /><Circle cx={71} cy={119} r={6.5} fill="#fff" /><Circle cx={80} cy={120} r={5.5} fill="#fff" /><Circle cx={87} cy={122} r={4} fill="#fff" />
      <Circle cx={75} cy={112} r={2.4} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} /><Circle cx={84} cy={108} r={1.6} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} />
      {/* seat */}
      <Path d="M128 114 C130 105 142 103 160 103 L198 105 C207 106 208 114 202 118 L132 119Z" fill={INK} />
      <Path d="M138 106 C150 104 170 104 190 106" stroke="#3A3152" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* legs: relaxed bent knee, grey trousers with a highlight, white sneaker on the floorboard */}
      <Path d="M150 100 C172 94 212 98 228 106 C238 111 238 122 231 127 L233 150 L216 150 L212 130 C194 128 168 126 150 120 Z" fill="#3B3858" />
      <Path d="M168 108 C188 106 212 108 226 114" stroke="#5A567A" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <Path d="M222 128 L224 146" stroke="#000" strokeOpacity={0.16} strokeWidth={2} strokeLinecap="round" />
      <Path d="M213 148 L238 148 C245 148 249 153 249 158 L213 158Z" fill="#fff" /><Path d="M213 154.6 L249 154.6 L249 159 L213 159Z" fill="#2B1B66" /><Path d="M228 150 L236 150 M227 153 L235 153" stroke="#C9C3D6" strokeWidth={1.1} strokeLinecap="round" />
      {/* rider: violet long-sleeve top with soft shading, leaning into the ride */}
      <Path d="M146 108 C140 84 150 60 170 51 C186 45 203 49 209 60 L216 73 C208 81 198 87 192 93 L194 108 Z" fill="#6E2CF0" />
      <Path d="M146 108 C141 88 147 68 156 58 L168 100 L160 108Z" fill="#5409DA" opacity={0.8} />
      <Path d="M172 50 C187 45 203 49 209 60 L215 71 C210 75 205 79 200 82 C198 69 189 55 172 50Z" fill="#8A55F5" opacity={0.9} />
      <Path d="M158 86 L190 80" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
      <Path d="M192 50 L202 62 L196 48" fill="#fff" opacity={0.0} /><Path d="M196 47 C200 44 208 46 211 51 L204 58 Z" fill="#EDE7FF" />
      {/* arm: long sleeve out to the grip, light cuff, hand around the bar */}
      <Path d="M198 60 L226 80 L248 76" stroke="#6E2CF0" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M226 80 L248 76" stroke="#8A55F5" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
      <Rect x={244} y={69.6} width={4.4} height={12.4} rx={2} fill="#EDE7FF" />
      <Circle cx={198} cy={60} r={7.4} fill="#6E2CF0" /><Circle cx={255} cy={75.4} r={5.8} fill={SKIN} /><Rect x={253} y={69.4} width={6} height={7.6} rx={3} fill={SKIN} />
      {/* head in profile, like the reference: neck, big rounded skull, forehead, nose, smile, cheek, eye; violet helmet with strap */}
      <Path d="M214 46 L217 60 L228 60 L226 46Z" fill="#D88F63" />
      <Path d="M224 20 C234 19 240 26 239 32 L243 37 C243.6 38.4 242.4 39.4 240.4 39.4 L239 40 C239.4 44 238 47 235 49 C231 52 224 50 221 45 L220 28Z" fill={SKIN} />
      <Circle cx={232} cy={40} r={3.4} fill="#FF7B7B" opacity={0.32} />
      <Path d="M229 25 Q233 22.6 237.6 24.4" stroke="#2A1B22" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Ellipse cx={233.4} cy={30.4} rx={1.9} ry={2.5} fill="#1A1033" /><Circle cx={234} cy={29.5} r={0.7} fill="#fff" />
      <Path d="M230.4 43.4 Q235 48 239.6 42.6" stroke="#8A2F3A" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Path d="M202 38 C200 12 216 6 230 12 C240 16 243 25 241 30 L238 23 C231 18 218 19 210 25 L208 42Z" fill={V} />
      <Path d="M205 24 C208 12 220 8 231 12" stroke="#8A55F5" strokeWidth={3.6} fill="none" strokeLinecap="round" />
      <Path d="M204 32 L211 32" stroke={SAF} strokeWidth={3} strokeLinecap="round" />
      <Path d="M212 24 C220 18 232 19 240 25 L240 29 C232 24 220 24 212 29Z" fill="rgba(255,255,255,0.4)" />
      <Path d="M212 40 L215 50 L224 52" stroke={VD} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

/* little exhaust puffs that drift back and fade */
function Puff({ k, i, rm }: { k: number; i: number; rm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => { if (!rm) p.value = withDelay(i * 420, withRepeat(withTiming(1, { duration: 1260, easing: Easing.out(Easing.quad) }), -1, false)); return () => cancelAnimation(p) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: p.value < 0.1 ? p.value * 6 : 0.6 * (1 - p.value), transform: [{ translateX: -46 * k * p.value }, { translateY: -6 * k * p.value }, { scale: 0.5 + p.value }] }));
  const s = 12 * k;
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 74 * k, top: 160 * k, width: s, height: s, borderRadius: s / 2, backgroundColor: '#D9CEF0' }, st]} />;
}
/* speed streaks behind the kit box */
function Streak({ k, y, w, d, rm }: { k: number; y: number; w: number; d: number; rm: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => { if (!rm) p.value = withDelay(d, withRepeat(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }), -1, false)); return () => cancelAnimation(p) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: Math.sin(p.value * Math.PI) * 0.9, transform: [{ translateX: -30 * k * p.value }] }));
  return <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: (54 - w) * k, top: y * k, width: w * k, height: 3 * k, borderRadius: 2, backgroundColor: '#C9B8F5' }, st]} />;
}

export const HeroRide = React.memo(function HeroRide({ width }: { width: number }) {
  const active = useActive(), rm = !!useReducedMotion() || !active, k = (width / VB_W) * 0.5, H = VB_H * k, RW = VB_W * k, ox = width / 2 - 158 * k;   // rider at half size, centred, always fully on screen
  const spin = useSharedValue(0), bob = useSharedValue(0), lean = useSharedValue(0), enter = useSharedValue(rm ? 1 : 0);
  useEffect(() => {
    if (rm) return;
    if (enter.value < 1) enter.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    spin.value = withRepeat(withTiming(1, { duration: 520, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withSequence(withTiming(1, { duration: 200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 200, easing: Easing.inOut(Easing.sin) })), -1, false);
    lean.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { cancelAnimation(spin); cancelAnimation(bob); cancelAnimation(lean) };
  }, [rm]);
  const ride = useAnimatedStyle(() => ({ opacity: enter.value, transform: [
    { translateX: (1 - enter.value) * -40 + (lean.value * 2 - 1) * 14 * k },
  ] }));
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -1.6 * k * bob.value }, { rotate: `${-0.6 * lean.value}deg` }] }));
  return (
    <View pointerEvents="none" style={{ width, height: H, overflow: 'hidden' }} accessible accessibilityLabel="A Washing Daddy washer riding to your car with the wash kit">
      <Loop k={k} tile={360} ms={48000} top={0} h={80} rm={rm} span={width}>{x0 => <G key={x0}><Cloud x={x0 + 40} y={40} /><Cloud x={x0 + 230} y={22} s={0.8} /><Cloud x={x0 + 300} y={64} s={0.6} /></G>}</Loop>
      <Loop k={k} tile={360} ms={22000} top={0} h={200} rm={rm} span={width}>{x0 => <Skyline key={x0} x0={x0} />}</Loop>
      {/* road */}
      <Svg width={width} height={H} viewBox={`0 0 ${width / k} ${VB_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={0} y={198} width={width / k} height={34} fill="#1B1626" />
        <Rect x={0} y={198} width={width / k} height={2.5} fill="#3B3450" />
        <Rect x={0} y={229.5} width={width / k} height={2.5} fill="#2A2339" />
      </Svg>
      <Loop k={k} tile={400} ms={2100} top={0} h={200} rm={rm} span={width}>{x0 => <Verge key={x0} x0={x0} />}</Loop>
      <Loop k={k} tile={400} ms={2100} top={0} h={200} rm={rm} span={width}>{x0 => <Street key={x0} x0={x0} />}</Loop>
      <Loop k={k} tile={420} ms={2200} top={0} h={VB_H} rm={rm} span={width}>{x0 => <Road key={x0} x0={x0} />}</Loop>
      {/* rider group */}
      <Reanimated.View style={[{ position: 'absolute', left: ox, top: 0, width: RW, height: H }, ride]}>
        <Svg width={RW} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
          <Ellipse cx={190} cy={203} rx={100} ry={5} fill="rgba(0,0,0,0.38)" />
        </Svg>
        <Streak k={k} y={70} w={28} d={0} rm={rm} />
        <Streak k={k} y={88} w={18} d={300} rm={rm} />
        <Streak k={k} y={104} w={24} d={600} rm={rm} />
        {[0, 1, 2].map(i => <Puff key={i} k={k} i={i} rm={rm} />)}
        <Wheel cx={118} cy={176} k={k} spin={spin} />
        <Wheel cx={270} cy={176} k={k} spin={spin} />
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: RW, height: H }, body]}>
          <Svg width={RW} height={H} viewBox={`0 0 ${VB_W} ${VB_H}`}><Body /></Svg>
          <Flag k={k} rm={rm} />
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
});

/* The same washer character on his own (no street), for the live tracking screens and map marker.
   `w` is the drawn width; height is w * 204 / 290. Pass a 0..1 looping `spin` to turn the wheels. */
export function RiderArt({ w, spin }: { w: number; spin?: SharedValue<number> }) {
  const rm = !!useReducedMotion(), k = w / 290, s0 = useSharedValue(0);
  return (
    <View pointerEvents="none" style={{ width: w, height: 204 * k }}>
      <View style={{ position: 'absolute', left: -10 * k, top: 0, width: VB_W * k, height: VB_H * k }}>
        <Wheel cx={118} cy={176} k={k} spin={spin || s0} />
        <Wheel cx={270} cy={176} k={k} spin={spin || s0} />
        <Svg width={VB_W * k} height={VB_H * k} viewBox={`0 0 ${VB_W} ${VB_H}`}><Body /></Svg>
        <Flag k={k} rm={rm || w < 120} />
      </View>
    </View>
  );
}

/** soft clouds drifting across the whole upper hero (behind the headline), in rows at different speeds */
export function SkyClouds({ width, height }: { width: number; height: number }) {
  const rm = !!useReducedMotion() || !useActive(), k = Math.min(1.45, width / 360);
  const rows: { top: number; ms: number; op: number; items: [number, number][] }[] = [
    { top: 4, ms: 95000, op: 0.9, items: [[20, 1.5], [200, 1.9]] },
    { top: 72, ms: 70000, op: 0.7, items: [[120, 1.7], [300, 1.3]] },
    { top: 142, ms: 120000, op: 0.8, items: [[0, 1.3], [210, 2.0]] },
    { top: 214, ms: 84000, op: 0.65, items: [[90, 1.6], [270, 1.4]] },
  ];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={i} style={{ opacity: r.op }}>
          <Loop k={k} tile={360} ms={r.ms} top={r.top} h={70} rm={rm} span={width}>{x0 => <G key={x0}>{r.items.map(([x, sc], j) => <Cloud key={j} x={x0 + x} y={52} s={sc} />)}</G>}</Loop>
        </View>
      ))}
    </View>
  );
}
