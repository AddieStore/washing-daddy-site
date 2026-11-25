// Shared pieces for the partner-app character art: palette, motion hooks, the washer scooter rig, the standing washer.
// Flat vector, react-native-svg + RN Animated only. Every moving part is an Animated.View wrapping a small Svg layer.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SText } from 'react-native-svg';
import { useReducedMotion } from '../Hosts';

export const C = {
  V: '#5409DA', V2: '#6E2CF0', V3: '#8A55F5', VD: '#2A0A6B', DARK: '#221838', INK: '#120B22',
  SKIN: '#E7A57A', SKIN2: '#D68E63', SAF: '#FFBA08', SAF2: '#E09A00', SAF3: '#FFD166',
  SKY1: '#E9E0FF', SKY2: '#F6F2FF', BLD: '#E0D4FF', BLD2: '#D3C2FB', BLD3: '#EFE8FF',
  ROAD: '#E9E3F5', ROAD2: '#D9CFEC', LAMP: '#3A3152', PANT: '#2E2645', PANT2: '#3C3358', MINT: '#14C08A', PINK: '#FF6FA3',
} as const;
export const FONT = 'Poppins_700Bold';
export const ND = Platform.OS !== 'web';

/** 0..1 value that loops (or ping-pongs) forever; stands still when `rm` (reduced motion / paused). */
export function useLoop(ms: number, o: { rm?: boolean; delay?: number; reverse?: boolean; ease?: (t: number) => number } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  const { rm, delay = 0, reverse, ease } = o;
  useEffect(() => {
    if (rm) return;
    const easing = ease || (reverse ? Easing.inOut(Easing.sin) : Easing.linear);
    const t = (to: number) => Animated.timing(v, { toValue: to, duration: ms, easing, useNativeDriver: ND });
    const loop = Animated.loop(reverse ? Animated.sequence([t(1), t(0)]) : t(1));
    const a = delay ? Animated.sequence([Animated.delay(delay), loop]) : loop;
    a.start();
    return () => a.stop();
  }, [rm, ms, delay, reverse]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** fade-in + gentle upward drift, once */
export function useEnter(rm: boolean, ms = 700) {
  const v = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [rm]); // eslint-disable-line react-hooks/exhaustive-deps
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
}

/** reduced-motion hook that also honours a `still` prop */
export function useStill(still?: boolean) {
  const rm = useReducedMotion();
  return !!rm || !!still;
}

/** looping horizontal layer: draws `tile` (vb units) n times and slides left by one tile forever */
export function Loop({ k, tile, ms, top = 0, h, span, rm, children }: { k: number; tile: number; ms: number; top?: number; h: number; span: number; rm: boolean; children: (x0: number) => React.ReactNode }) {
  const v = useLoop(ms, { rm });
  const n = Math.ceil(span / (tile * k)) + 1;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: top * k, width: tile * n * k, height: h * k, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -tile * k] }) }] }}>
      <Svg width={tile * n * k} height={h * k} viewBox={`0 0 ${tile * n} ${h}`}>{Array.from({ length: n }, (_, i) => <G key={i}>{children(i * tile)}</G>)}</Svg>
    </Animated.View>
  );
}

/** a viewBox-sized svg layer placed at the box origin */
export function Layer({ w, h, k, children, style }: { w: number; h: number; k: number; children: React.ReactNode; style?: any }) {
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w * k, height: h * k }, style]}>
      <Svg width={w * k} height={h * k} viewBox={`0 0 ${w} ${h}`}>{children}</Svg>
    </Animated.View>
  );
}

export const Cloud = ({ x, y, s = 1, fill = '#fff', o = 1 }: { x: number; y: number; s?: number; fill?: string; o?: number }) => (
  <Path opacity={o} d={`M${x} ${y} h${44 * s} a${8 * s} ${8 * s} 0 0 0 -6 ${-13 * s} a${11 * s} ${11 * s} 0 0 0 -19 ${-5 * s} a${9 * s} ${9 * s} 0 0 0 -16 ${6 * s} a${7 * s} ${7 * s} 0 0 0 -3 ${12 * s} z`} fill={fill} />
);

/** Delhi skyline tile (420 wide, ground at y=198): towers plus a dome, a Qutub-style minar and an India Gate arch */
export function Skyline({ x0, bg = C.BLD3 }: { x0: number; bg?: string }) {
  const b: number[][] = [[0, 130, 30], [30, 108, 34], [64, 140, 22], [118, 120, 30], [148, 150, 20], [236, 112, 34], [270, 138, 26], [330, 100, 38], [368, 128, 28], [396, 112, 24]];
  return (
    <G>
      {b.map(([x, y, w], i) => <G key={i}>
        <Rect x={x0 + x} y={y} width={w} height={200 - y} fill={C.BLD} />
        {i % 2 ? <Rect x={x0 + x + w / 2 - 4} y={y + 10} width={8} height={8} rx={1.5} fill={bg} /> : null}
      </G>)}
      {/* dome tomb */}
      <Rect x={x0 + 88} y={150} width={30} height={50} fill={C.BLD2} />
      <Path d={`M${x0 + 90} 150 C${x0 + 90} 124 ${x0 + 116} 124 ${x0 + 116} 150 Z`} fill={C.BLD2} />
      <Rect x={x0 + 102} y={116} width={2} height={10} fill={C.BLD2} />
      <Path d={`M${x0 + 96} 190 v-14 a7 7 0 0 1 14 0 v14 z`} fill={bg} />
      {/* India Gate */}
      <Rect x={x0 + 170} y={128} width={52} height={72} fill={C.BLD2} />
      <Rect x={x0 + 166} y={124} width={60} height={8} fill={C.BLD2} />
      <Path d={`M${x0 + 185} 200 v-34 a11 11 0 0 1 22 0 v34 z`} fill={bg} />
      <Rect x={x0 + 172} y={136} width={48} height={3} fill={bg} opacity={0.8} />
      {/* minar */}
      <Path d={`M${x0 + 302} 200 L${x0 + 306} 62 L${x0 + 318} 62 L${x0 + 322} 200 Z`} fill={C.BLD2} />
      {[88, 112, 138, 166].map(y => <Rect key={y} x={x0 + 302 + (y - 62) * 0.03} y={y} width={20 - (y - 62) * 0.06} height={2.4} fill={bg} opacity={0.9} />)}
      <Rect x={x0 + 304} y={52} width={16} height={10} rx={3} fill={C.BLD2} />
      <Rect x={x0 + 311} y={42} width={2} height={10} fill={C.BLD2} />
    </G>
  );
}

/** street furniture: dark lamp posts with saffron glow and soft round trees (tile 400) */
export function Street({ x0 }: { x0: number }) {
  const lamp = (x: number) => <G key={'l' + x}>
    <Path d={`M${x0 + x} 198 L${x0 + x} 104 C${x0 + x} 96 ${x0 + x + 6} 92 ${x0 + x + 14} 92 L${x0 + x + 20} 92`} stroke={C.LAMP} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <Rect x={x0 + x + 16} y={89} width={12} height={6} rx={3} fill={C.LAMP} />
    <Ellipse cx={x0 + x + 22} cy={97} rx={5} ry={2.5} fill={C.SAF} />
    <Path d={`M${x0 + x + 14} 98 L${x0 + x + 30} 98 L${x0 + x + 38} 140 L${x0 + x + 6} 140 Z`} fill={C.SAF} opacity={0.07} />
    <Rect x={x0 + x - 3} y={192} width={6} height={6} rx={1.5} fill={C.LAMP} />
  </G>;
  const tree = (x: number, r: number) => <G key={'t' + x}>
    <Rect x={x0 + x - 2} y={176} width={4} height={22} rx={2} fill={C.LAMP} />
    <Circle cx={x0 + x} cy={170 - r} r={r} fill="#D8C8FF" />
    <Circle cx={x0 + x - r * 0.35} cy={170 - r * 1.2} r={r * 0.55} fill="#E4D8FF" />
  </G>;
  return <G>{lamp(60)}{tree(150, 18)}{tree(178, 12)}{lamp(260)}{tree(340, 16)}</G>;
}
export function RoadDashes({ x0 }: { x0: number }) {
  return <G>{[0, 1, 2, 3, 4, 5].map(i => <Rect key={i} x={x0 + i * 70 + 12} y={214} width={34} height={3.5} rx={1.75} fill="#fff" />)}</G>;
}

/* ---------- scooter rig (viewBox 360 x 232, wheels sit on y=202) ---------- */
export const RIG_W = 360, RIG_H = 232;

function Wheel({ cx, cy, k, spin }: { cx: number; cy: number; k: number; spin: Animated.Value }) {
  const s = 52 * k;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: (cx - 26) * k, top: (cy - 26) * k, width: s, height: s, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={s} height={s} viewBox="0 0 52 52">
        <Circle cx={26} cy={26} r={25} fill="#1B1230" />
        <Circle cx={26} cy={26} r={21} fill="none" stroke="#2E2445" strokeWidth={1.5} />
        <Circle cx={26} cy={26} r={13} fill="#fff" />
        <Circle cx={26} cy={26} r={5} fill="#1B1230" />
        <Path d="M26 14 V19 M14 26 H19 M38 26 H33 M26 38 V33" stroke={C.V} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** the WD flag; two wave shapes cross-fade so it ripples (trails to the left). `ms` is the ripple period */
function Flag({ k, rm, ms = 320 }: { k: number; rm: boolean; ms?: number }) {
  const f = useLoop(ms, { rm, reverse: true });
  const shape = (d: string, hi: string, ty: number) => (
    <Svg width={58 * k} height={44 * k} viewBox="10 2 58 44">
      <Path d={d} fill={C.SAF} /><Path d={hi} fill={C.SAF3} />
      <SText x={40} y={31 + ty} textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize={12.5} fill={C.VD}>WD</SText>
    </Svg>
  );
  const box = { position: 'absolute' as const, left: 10 * k, top: 2 * k, width: 58 * k, height: 44 * k };
  return <>
    <Animated.View pointerEvents="none" style={[box, { opacity: f.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>{shape('M65 8 C52 3 38 15 16 9 L21 25 L14 40 C36 45 50 33 65 38 Z', 'M65 8 C52 3 38 15 16 9 L18 17 C40 22 52 11 65 16 Z', 0)}</Animated.View>
    <Animated.View pointerEvents="none" style={[box, { opacity: f }]}>{shape('M65 8 C50 12 36 4 16 12 L20 27 L15 42 C34 36 50 44 65 38 Z', 'M65 8 C50 12 36 4 16 12 L18 19 C38 12 52 20 65 16 Z', 1)}</Animated.View>
  </>;
}

function ScooterBody() {
  const { V, V2, V3, VD, DARK, INK, SAF } = C;
  return (
    <G>
      <Path d="M66 60 L66 5" stroke={DARK} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={66} cy={4} r={3.4} fill={SAF} />
      <G rotation={-4} origin="98, 88">
        <Rect x={56} y={52} width={86} height={68} rx={9} fill={V} />
        <Rect x={56} y={52} width={86} height={13} rx={6.5} fill={V2} />
        <Rect x={56} y={66} width={86} height={7} fill={VD} />
        <Circle cx={97} cy={96} r={16} fill="#fff" />
        <SText x={97} y={100.6} textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize={12.5} fill={V}>WD</SText>
        <Rect x={124} y={80} width={10} height={30} rx={5} fill={VD} opacity={0.55} />
        <Path d="M62 113 h74" stroke={VD} strokeWidth={2} opacity={0.35} strokeLinecap="round" />
      </G>
      <Path d="M80 166 C80 140 100 124 132 122 L196 122 C210 122 218 132 218 146 L220 158 L244 160 L240 170 L150 172 C148 158 136 150 120 150 C104 150 92 158 90 172 L80 172 Z" fill={DARK} />
      <Path d="M104 132 C112 127 124 126 136 126 L190 126 C200 126 206 132 206 142 L118 150 C108 150 100 142 104 132Z" fill={V} />
      <Path d="M112 134 L196 132" stroke={V3} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={84} cy={150} r={3.5} fill="#FF5A5A" />
      {/* foam bucket */}
      <Path d="M62 118 C62 108 86 108 86 118" stroke={DARK} strokeWidth={2} fill="none" />
      <Path d="M58 124 L90 124 L86 150 C85.6 153 83.5 155 80.5 155 L67.5 155 C64.5 155 62.4 153 62 150 Z" fill={SAF} />
      <Path d="M58 124 L90 124 L89.3 129 L58.7 129 Z" fill={C.SAF2} />
      <Path d="M66 136 L82 136" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Circle cx={63} cy={122} r={5} fill="#fff" /><Circle cx={71} cy={119} r={6.5} fill="#fff" /><Circle cx={80} cy={120} r={5.5} fill="#fff" /><Circle cx={87} cy={122} r={4} fill="#fff" />
      <Circle cx={75} cy={112} r={2.4} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} /><Circle cx={84} cy={108} r={1.6} fill="#fff" stroke="#D8C8FF" strokeWidth={0.8} />
      {/* seat */}
      <Path d="M126 118 C128 110 140 108 158 108 L198 110 C206 111 207 119 201 123 L130 124 Z" fill={INK} />
      {/* front end */}
      <Path d="M266 98 L270 176" stroke={DARK} strokeWidth={7} strokeLinecap="round" />
      <Path d="M238 170 L252 108 C254 100 262 95 268 98 L274 102 L262 150 L274 170 Z" fill={DARK} />
      <Path d="M248 108 C262 102 276 106 282 116 L292 148 C282 148 270 154 262 166 L250 168 Z" fill={V} />
      <Path d="M254 114 C264 110 273 113 279 121" stroke={V3} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M246 160 C254 146 286 146 296 162 L288 164 C278 154 260 154 254 164 Z" fill={V} />
      <Ellipse cx={289} cy={126} rx={4} ry={6.5} fill={SAF} />
      <Path d="M266 98 L262 76" stroke={DARK} strokeWidth={5} strokeLinecap="round" />
      <Path d="M252 76 L272 72" stroke={DARK} strokeWidth={5} strokeLinecap="round" />
      <Path d="M266 74 L272 58" stroke={DARK} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={274} cy={54} rx={4} ry={5} fill={DARK} />
    </G>
  );
}

/** rider without his riding arm: legs, jacket, collar, helmet, face */
function RiderBody({ happy }: { happy?: boolean }) {
  const { V, V2, V3, VD, DARK, SAF, SKIN } = C;
  return (
    <G>
      <Path d="M150 98 C172 94 214 98 230 106 C238 111 238 122 231 126 L234 156 L218 156 L214 130 C196 128 168 126 150 120 Z" fill={C.PANT} />
      <Path d="M170 112 C190 112 210 114 224 118" stroke="#40375C" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M214 153 L238 153 C244 153 248 157 248 162 L214 162 Z" fill="#fff" />
      <Rect x={214} y={160} width={34} height={3} fill="#C9C3D6" />
      <Path d="M146 106 C142 84 150 60 168 50 C182 42 198 44 206 54 L216 70 C208 78 198 84 190 90 L192 106 Z" fill={V2} />
      <Path d="M168 50 C182 42 198 44 206 54 L216 70 C210 76 204 80 198 84 C196 70 188 56 168 50Z" fill="#8048F3" />
      <Path d="M148 96 C146 84 148 72 154 62 L160 100 Z" fill={V} opacity={0.6} />
      <Path d="M150 80 L190 74" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M156 66 L170 58 M159 71 L173 63" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
      <Path d="M196 46 C200 40 210 38 214 44 L208 52 Z" fill="#fff" />
      <Circle cx={212} cy={26} r={20} fill={V} />
      <Path d="M196 20 C200 8 214 4 226 10" stroke={V3} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Path d="M194 30 L208 30" stroke={SAF} strokeWidth={3} strokeLinecap="round" />
      <Path d="M220 20 C230 20 236 26 236 34 C236 42 230 46 222 45 Z" fill={SKIN} />
      <Path d="M228 28 L231 28" stroke={DARK} strokeWidth={2} strokeLinecap="round" />
      <Path d={happy ? 'M225 38 C227 43 232 43 234 38 Z' : 'M226 38 C228 40 231 40 233 38'} stroke="#9A4F2E" strokeWidth={1.5} fill={happy ? '#9A4F2E' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M214 16 C226 14 238 20 240 30 L240 34" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M216 18 C226 17 236 22 238 30 L226 30 C224 24 220 20 216 18Z" fill="rgba(255,255,255,0.35)" />
      <Path d="M214 44 C218 46 224 46 230 44" stroke={VD} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

export type RigMode = 'ride' | 'wave' | 'park' | 'sleep';
/**
 * The washer on his scooter. ride: wheels spin, flag ripples, hand on the bar. wave: parked, flag flying, free hand waving.
 * park: parked, no motion. sleep: no rider, his helmet on the seat.
 */
export function ScooterRig({ k, mode, rm }: { k: number; mode: RigMode; rm: boolean }) {
  const riding = mode === 'ride' && !rm;
  const spin = useLoop(520, { rm: !riding });
  const bob = useLoop(200, { rm: !riding, reverse: true });
  const wave = useLoop(380, { rm: mode !== 'wave' || rm, reverse: true });
  const { V, V2, SKIN } = C;
  const bodyStyle = { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -1.6 * k] }) }] };
  return (
    <View pointerEvents="none" style={{ width: RIG_W * k, height: RIG_H * k }}>
      <Wheel cx={118} cy={176} k={k} spin={spin} />
      <Wheel cx={270} cy={176} k={k} spin={spin} />
      <Layer w={RIG_W} h={RIG_H} k={k} style={bodyStyle}>
        <ScooterBody />
        {mode === 'sleep' ? <G>
          <Circle cx={166} cy={96} r={16} fill={V} />
          <Path d="M153 90 C157 80 170 78 178 84" stroke={C.V3} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M172 96 C180 96 184 100 184 106 L170 108 Z" fill="#fff" opacity={0.9} />
          <Path d="M152 98 L164 98" stroke={C.SAF} strokeWidth={3} strokeLinecap="round" />
        </G> : <RiderBody happy={mode === 'wave'} />}
        {mode === 'ride' ? <G>
          <Path d="M196 58 L224 82 L250 76" stroke={V} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M240 78 L246 77" stroke="#fff" strokeWidth={12} />
          <Circle cx={254} cy={75} r={5.5} fill={SKIN} />
        </G> : null}
        {mode === 'park' ? <G>
          <Path d="M196 58 L224 82 L250 76" stroke={V} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={254} cy={75} r={5.5} fill={SKIN} />
        </G> : null}
        {mode === 'wave' ? <Path d="M196 58 L236 66" stroke={V2} strokeWidth={12} fill="none" strokeLinecap="round" /> : null}
      </Layer>
      {mode === 'wave' ? (
        <Layer w={RIG_W} h={RIG_H} k={k} style={{ transformOrigin: `${236 * k}px ${66 * k}px`, transform: [{ rotate: wave.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '18deg'] }) }] }}>
          <Path d="M236 66 L258 36" stroke={V2} strokeWidth={12} fill="none" strokeLinecap="round" />
          <Path d="M251 44 L259 46" stroke="#fff" strokeWidth={12} />
          <Circle cx={262} cy={28} r={6.5} fill={SKIN} />
          <Path d="M258 24 L256 17 M263 22 L263 14 M268 24 L270 17" stroke={SKIN} strokeWidth={3} strokeLinecap="round" />
        </Layer>
      ) : null}
      <Animated.View pointerEvents="none" style={[bodyStyle, { position: 'absolute', left: 0, top: 0, width: RIG_W * k, height: RIG_H * k }]}>
        <Flag k={k} rm={rm || mode === 'park' || mode === 'sleep'} ms={mode === 'wave' ? 150 : 320} />
      </Animated.View>
    </View>
  );
}

/* ---------- standing washer (viewBox 170 x 200, feet on y=190) ---------- */
export const ST_W = 170, ST_H = 200;
export type StandPose = 'lance' | 'thumb' | 'stand';

function Head({ happy = true }: { happy?: boolean }) {
  return (
    <G>
      <Rect x={55} y={52} width={10} height={12} fill={C.SKIN2} />
      <Circle cx={60} cy={40} r={16} fill={C.SKIN} />
      <Circle cx={47.5} cy={42} r={3.2} fill={C.SKIN2} />
      <Path d="M43.5 38 C43 24 52 19 61 20 C72 21 77 29 77 38 Z" fill={C.V} />
      <Path d="M44 36.5 H77" stroke={C.SAF} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M70 33 L90 35.5 C90 40 86 41 79 40 Z" fill={C.VD} />
      <Path d="M52 24 C56 21 62 20 66 21" stroke={C.V3} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Circle cx={69} cy={43} r={1.9} fill={C.DARK} />
      <Path d="M74 44 L77 47 L73.5 48" stroke={C.SKIN2} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={happy ? 'M65 50 C68 54 74 54 76 49' : 'M66 51 C69 52 72 52 74 50'} stroke="#9A4F2E" strokeWidth={1.7} fill="none" strokeLinecap="round" />
    </G>
  );
}
function Torso() {
  return (
    <G>
      <Path d="M39 76 C39 66 48 60 60 60 C72 60 82 66 82 76 L85 126 L35 126 Z" fill={C.V2} />
      <Path d="M60 60 C72 60 82 66 82 76 L85 126 L66 126 C70 100 68 78 60 60Z" fill="#8048F3" opacity={0.75} />
      <Rect x={36.5} y={101} width={47.5} height={4.4} fill="#fff" opacity={0.92} />
      <Path d="M44 70 L54 66 M44 76 L54 72" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      <Rect x={35} y={122} width={50} height={7} rx={2} fill={C.DARK} />
      <Rect x={56} y={122} width={9} height={7} rx={1.5} fill={C.SAF} />
    </G>
  );
}
function Legs({ gap = 0 }: { gap?: number }) {
  return (
    <G>
      <Path d={`M49 124 L${46 - gap} 184`} stroke={C.PANT2} strokeWidth={16} strokeLinecap="round" />
      <Path d={`M71 124 L${74 + gap} 184`} stroke={C.PANT} strokeWidth={16} strokeLinecap="round" />
      <Path d={`M${36 - gap} 183 h22 a4 4 0 0 1 4 4 v3 h-26 z`} fill="#fff" />
      <Path d={`M${64 + gap} 183 h24 a5 5 0 0 1 5 5 v2 h-29 z`} fill="#fff" />
      <Rect x={36 - gap} y={188.4} width={26} height={2.4} fill="#C9C3D6" />
      <Rect x={64 + gap} y={188.4} width={29} height={2.4} fill="#C9C3D6" />
    </G>
  );
}
const SHOULDER = { x: 74, y: 72 };

/** The standing washer. lance: pressure-lance arm sways (point it at a car). thumb: raised fist with thumb up. stand: arms relaxed. */
export function Washer({ k, pose, rm }: { k: number; pose: StandPose; rm: boolean }) {
  const sway = useLoop(pose === 'lance' ? 900 : 700, { rm: rm || pose === 'stand', reverse: true });
  const breathe = useLoop(1800, { rm, reverse: true });
  const armStyle = {
    transformOrigin: `${SHOULDER.x * k}px ${SHOULDER.y * k}px`,
    transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: pose === 'lance' ? ['-3deg', '4deg'] : ['-5deg', '5deg'] }) }],
  };
  return (
    <View pointerEvents="none" style={{ width: ST_W * k, height: ST_H * k }}>
      <Layer w={ST_W} h={ST_H} k={k}>
        <Ellipse cx={62} cy={192} rx={44} ry={5} fill="rgba(30,15,70,0.10)" />
        <Legs gap={pose === 'lance' ? 3 : 0} />
      </Layer>
      <Layer w={ST_W} h={ST_H} k={k} style={{ transform: [{ translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -1.2 * k] }) }] }}>
        <Torso />
        <Head happy={pose !== 'stand'} />
        {/* far arm */}
        {pose === 'thumb'
          ? <G><Path d="M46 72 L32 94 L45 112" stroke={C.V} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" /><Circle cx={47} cy={114} r={5} fill={C.SKIN} /></G>
          : <G><Path d="M46 72 L40 100" stroke={C.V} strokeWidth={11} strokeLinecap="round" /><Circle cx={40} cy={104} r={5} fill={C.SKIN} /></G>}
        {pose === 'stand' ? <G><Path d="M74 72 L80 100" stroke={C.V2} strokeWidth={11} strokeLinecap="round" /><Circle cx={80.5} cy={104} r={5} fill={C.SKIN} /></G> : null}
      </Layer>
      {pose === 'lance' ? (
        <Layer w={ST_W} h={ST_H} k={k} style={armStyle}>
          <Path d="M74 72 L92 88 L110 84" stroke={C.V2} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M106 86 L152 72" stroke={C.LAMP} strokeWidth={4.4} strokeLinecap="round" />
          <Path d="M130 79 L140 76" stroke={C.SAF} strokeWidth={6} strokeLinecap="round" />
          <Path d="M150 72 L158 69" stroke={C.SAF} strokeWidth={5.5} strokeLinecap="round" />
          <Circle cx={110} cy={85} r={5.5} fill={C.SKIN} />
          <Path d="M96 90 C86 118 40 104 14 150" stroke={C.DARK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Layer>
      ) : null}
      {pose === 'thumb' ? (
        <Layer w={ST_W} h={ST_H} k={k} style={armStyle}>
          <Path d="M74 72 L96 90 L100 66" stroke={C.V2} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M96 52 L96 62" stroke={C.SKIN} strokeWidth={6.5} strokeLinecap="round" />
          <Rect x={91} y={58} width={17} height={14} rx={6} fill={C.SKIN} />
          <Path d="M93 66 H106 M93 70 H106" stroke={C.SKIN2} strokeWidth={1.2} opacity={0.7} />
        </Layer>
      ) : null}
    </View>
  );
}
