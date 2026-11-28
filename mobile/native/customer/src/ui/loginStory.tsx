/* Login story: four animated scenes (book, ride, wash, proof) that play while the customer types their number and code.
   One morning, start to finish: night turns to dawn, the booking is made, the WD Partner rides over, washes the car, shows the proof.
   Characters, car and city are drawn here in SVG; every loop runs on the UI thread and rests still with reduced motion. */
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SG, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SharedValue, Easing, FadeIn, FadeOut, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { C, SP } from '../theme';
import { Txt } from './kit';
import { RiderArt } from './heroRide';
import { CityScape, useNight } from './city';

const SAFF = '#FFBA08', DW = 360, DH = 230, GROUND = 200;
export const HOME_ROAD = 56;   // home hero: pavement 16 + black road 40
const SLIDES = [
  { t: 'Book in seconds', s: 'Pick a service and a time. Instant or monthly.' },
  { t: 'Washer leaves our hub', s: 'A verified WD Partner from your area is assigned.' },
  { t: 'Rides straight to you', s: 'Track them live, right to your parking spot.' },
  { t: 'Hand over the keys', s: 'Or leave the car unlocked. Your call.' },
  { t: 'Pressure wash. No pocha.', s: 'Water and power come with the washer.' },
  { t: 'Photo proof, every wash', s: 'See your car shine before you step out.' },
];
const TONES = [0, 0, 1, 2, 2, 3];

/* ------------------------------------------------------------------ motion helpers */
export function useLoop(ms: number, rest = 0.5, delay = 0) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? rest : 0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)) }, [rm]);
  return v;
}
export function usePulse(ms: number, delay = 0) {
  const rm = useReducedMotion(), v = useSharedValue(0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1, false)) }, [rm]);
  return v;
}
export function usePop(delay = 0, soft = false) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) v.value = withDelay(delay, soft ? withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }) : withSpring(1, { damping: 12, stiffness: 130 })) }, [rm]);
  return v;
}
export const abs = (x: number, y: number, extra?: object) => ({ position: 'absolute' as const, left: x, top: y, ...extra });

/* ------------------------------------------------------------------ background: sky, sun, city layers, ground */
function seeded(n: number) { let s = n * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } }
function Skyline({ W, h, color, seed, speed, windows }: { W: number; h: number; color: string; seed: number; speed: number; windows?: boolean }) {
  const p = useLoop(speed), st = useAnimatedStyle(() => ({ transform: [{ translateX: -p.value * W }] }));
  const parts = useMemo(() => {
    const r = seeded(seed), out: { x: number; w: number; h: number; win: number[] }[] = []; let x = 0;
    while (x < W - 20) { const w = 22 + Math.round(r() * 26), hh = h * (0.4 + r() * 0.6); out.push({ x, w, h: hh, win: Array.from({ length: 8 }, () => r()) }); x += w + 2 }
    const left = W - x; if (out.length) out[out.length - 1].w += left; return out;
  }, [W, h, seed]);
  const tile = (
    <Svg width={W} height={h}>
      {parts.map((b, i) => (
        <G key={i}>
          <Rect x={b.x} y={h - b.h} width={b.w} height={b.h} rx={3} fill={color} />
          {windows ? b.win.map((v, k) => v > 0.55 ? <Rect key={k} x={b.x + 5 + (k % 2) * 11} y={h - b.h + 8 + Math.floor(k / 2) * 12} width={5} height={6} rx={1.4} fill="#FFD470" opacity={0.75} /> : null) : null}
        </G>
      ))}
    </Svg>
  );
  return <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, width: W * 2, height: h, flexDirection: 'row' }, st]}>{tile}{tile}</Animated.View>;
}
function Star({ x, y, d }: { x: number; y: number; d: number }) {
  const p = usePulse(900 + d * 7, d * 11), st = useAnimatedStyle(() => ({ opacity: 0.25 + p.value * 0.75 }));
  return <Animated.View style={[abs(x, y, { width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff' }), st]} />;
}
/** the login page paints the story on a light lavender sky that melts into white; splash and primer keep the deep-violet one */
export const LightCtx = createContext(false);
// Home shows the story with no sky box and no clouds, so the lavender hero shows through
export const HomeCtx = createContext(false);
/** tone 0 = night, 1 = dawn, 2 = morning, 3 = bright day: the sun climbs and the sky warms as the story goes */
/** slow-moving landmarks of the city, drawn as soft silhouettes: India Gate, a mandir shikhara, a Mughal dome with minarets */
function Landmarks({ W, h, color, speed }: { W: number; h: number; color: string; speed: number }) {
  const p = useLoop(speed), st = useAnimatedStyle(() => ({ transform: [{ translateX: -p.value * W }] }));
  const x0 = W * 0.08, x1 = W * 0.42, x2 = W * 0.74;
  const tile = (
    <Svg width={W} height={h}>
      <G fill={color}>
        {/* India Gate: a tall block with the arch cut out, a cap and two small domes */}
        <Path d={`M${x0} ${h} V${h - 50} H${x0 + 6} V${h - 56} H${x0 + 46} V${h - 50} H${x0 + 52} V${h} H${x0 + 36} V${h - 22} a10 12 0 0 0 -20 0 V${h}Z`} />
        <Rect x={x0 + 10} y={h - 62} width={32} height={6} rx={1.5} /><Circle cx={x0 + 8} cy={h - 60} r={3} /><Circle cx={x0 + 44} cy={h - 60} r={3} />
        {/* mandir: stepped tower with a kalash on top */}
        <Path d={`M${x1} ${h} V${h - 18} H${x1 + 6} V${h - 30} H${x1 + 12} V${h - 44} H${x1 + 18} V${h - 58} H${x1 + 24} V${h - 70} L${x1 + 28} ${h - 76} L${x1 + 32} ${h - 70} V${h - 58} H${x1 + 38} V${h - 44} H${x1 + 44} V${h - 30} H${x1 + 50} V${h - 18} H${x1 + 56} V${h}Z`} />
        <Rect x={x1 + 27.4} y={h - 90} width={1.2} height={14} /><Circle cx={x1 + 28} cy={h - 90} r={2.2} />
        {/* Mughal dome with two minarets and a flag */}
        <Path d={`M${x2} ${h} V${h - 26} H${x2 + 64} V${h}Z`} /><Path d={`M${x2 + 12} ${h - 26} a20 24 0 0 1 40 0Z`} /><Rect x={x2 + 31.4} y={h - 58} width={1.2} height={10} /><Circle cx={x2 + 32} cy={h - 58} r={1.8} />
        <Rect x={x2 - 8} y={h - 52} width={6} height={52} rx={2} /><Circle cx={x2 - 5} cy={h - 54} r={4} /><Rect x={x2 + 66} y={h - 52} width={6} height={52} rx={2} /><Circle cx={x2 + 69} cy={h - 54} r={4} />
      </G>
    </Svg>
  );
  return <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, width: W * 2, height: h, flexDirection: 'row' }, st]}>{tile}{tile}</Animated.View>;
}
/** a toran of marigold-coloured pennants strung across the top, swaying a little */
function Toran({ W }: { W: number }) {
  const sway = usePulse(1600), st = useAnimatedStyle(() => ({ transform: [{ rotate: interpolate(sway.value, [0, 1], [-0.6, 0.6]) + 'deg' }] }));
  const n = Math.max(8, Math.round(W / 26)), cols = ['#FF9F1C', '#FFFFFF', '#2EC4B6', '#FF6FA3', '#FFBA08'];
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -6, top: 0, width: W + 12, height: 34, transformOrigin: '50% 0%' }, st]}>
      <Svg width={W + 12} height={34}>
        <Path d={`M0 4 Q${(W + 12) / 2} 20 ${W + 12} 4`} stroke="rgba(84,9,218,0.35)" strokeWidth={1.4} fill="none" />
        {Array.from({ length: n }, (_, i) => {
          const t = (i + 0.5) / n, x = t * (W + 12), y = 4 + 16 * (1 - Math.pow(2 * t - 1, 2)) * 0.5 * 2 / 2;
          return <G key={i}><Path d={`M${x - 7} ${y} L${x + 7} ${y} L${x} ${y + 17}Z`} fill={cols[i % cols.length]} stroke="rgba(84,9,218,0.18)" strokeWidth={0.6} /><Circle cx={x} cy={y + 5} r={1.4} fill="rgba(84,9,218,0.35)" /></G>;
        })}
      </Svg>
    </Animated.View>
  );
}
export function Backdrop({ W, H, tone, road }: { W: number; H: number; tone: number; road?: boolean }) {
  const light = useContext(LightCtx), home = useContext(HomeCtx), night = useNight() && home;
  const sky = light ? ['#FFFFFF', '#FFFFFF', '#FAF7FF'] : [['rgba(58,5,153,0)', '#4B12C9', '#6A2BF0'], ['rgba(84,9,218,0)', '#7A3AF2', '#FF9E7A'], ['rgba(110,40,235,0)', '#8E55F5', '#FFC08A'], ['rgba(130,70,245,0)', '#A97BFF', '#FFE2A8']][tone];
  const sunY = [H - 40, H - 70, H - 105, H - 140][tone], sunC = (light ? ['#FFE9A6', '#FFDF8A', '#FFD470', '#FFCB4A'] : ['#CDB8FF', '#FFC58A', '#FFD470', '#FFE49A'])[tone];
  const glow = usePulse(2400);
  const sunSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 + glow.value * 0.06 }], opacity: 0.55 + glow.value * 0.2 }));
  const roadX = useLoop(900), roadSt = useAnimatedStyle(() => ({ transform: [{ translateX: -roadX.value * 38 }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }}>
      {home ? null : <LinearGradient colors={sky as any} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
      {tone === 0 && !light ? Array.from({ length: 14 }, (_, i) => <Star key={i} x={(i * 53 + 17) % W} y={8 + ((i * 37) % 90)} d={i * 40} />) : null}
      {home ? null : <Animated.View style={[abs(W * (0.62 + tone * 0.04) - 70, sunY - 70, { width: 140, height: 140, borderRadius: 70, backgroundColor: sunC }), sunSt]} />}
      {home ? null : <View style={abs(W * (0.62 + tone * 0.04) - 38, sunY - 38, { width: 76, height: 76, borderRadius: 38, backgroundColor: sunC, opacity: 0.95 })} />}
      {home ? null : [0, 1, 2].map(i => <Cloud key={i} x={(i * 140 + 20 + tone * 30) % (W - 60)} y={14 + i * 22} w={64 + i * 18} d={i * 700} />)}
      {home ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: HOME_ROAD - 8, width: W, height: 185 }}><CityScape W={W} h={185} night={night} /></View> : null}
      {home ? null : <Skyline W={W} h={96} color={light ? 'rgba(84,9,218,0.06)' : 'rgba(255,255,255,0.10)'} seed={3 + tone} speed={42000} />}
      {light && !home ? <Landmarks W={W} h={100} color="rgba(84,9,218,0.09)" speed={60000} /> : null}
      {home ? null : <Skyline W={W} h={70} color={light ? 'rgba(84,9,218,0.14)' : 'rgba(46,10,120,0.55)'} seed={11 + tone} speed={home ? 9000 : 26000} windows={!light && tone < 2} />}
      {light && !home ? <Toran W={W} /> : null}
      {home ? (
        <View style={abs(0, H - HOME_ROAD, { width: W, height: HOME_ROAD })}>
          <View style={{ height: 16, backgroundColor: night ? '#2A3170' : '#DCD3F0', borderTopWidth: 2, borderTopColor: night ? '#4A53A0' : '#F4EFFF', borderBottomWidth: 3, borderBottomColor: night ? '#161B4A' : '#A99DD0' }} />
          <View style={{ flex: 1, backgroundColor: night ? '#0B0C18' : '#1F1C27' }} />
          <Animated.View style={[abs(0, 16 + 19, { flexDirection: 'row', width: W + 80 }), roadSt]}>
            {Array.from({ length: Math.ceil(W / 38) + 3 }, (_, i) => <View key={i} style={{ width: 24, height: 4, borderRadius: 2, marginRight: 16, backgroundColor: '#FFFFFF' }} />)}
          </Animated.View>
        </View>
      ) : null}
      {home ? null : <View style={abs(0, H - 36, { width: W, height: 36, backgroundColor: light ? 'transparent' : '#2A0F6B' })}>
        {light ? <LinearGradient colors={home ? ['#6B45D6', '#3F1FA0'] : ['#D9CBFA', '#F3ECFF']} style={StyleSheet.absoluteFill} /> : null}
        <View style={{ height: 3, backgroundColor: light ? (home ? '#CDBDF7' : 'rgba(255,255,255,0.7)') : 'rgba(255,255,255,0.28)' }} />
        {road || home ? <Animated.View style={[abs(0, 16, { flexDirection: 'row', width: W + 80 }), roadSt]}>
          {Array.from({ length: Math.ceil(W / 38) + 3 }, (_, i) => <View key={i} style={{ width: 22, height: 4, borderRadius: 2, marginRight: 16, backgroundColor: light ? '#fff' : 'rgba(255,255,255,0.6)' }} />)}
        </Animated.View> : null}
      </View>}
    </View>
  );
}
function Cloud({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  const light = useContext(LightCtx);
  const p = usePulse(3600, d), st = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 16 }] }));
  return <Animated.View style={[abs(x, y, { width: w, height: w * 0.3, borderRadius: w, backgroundColor: light ? 'rgba(84,9,218,0.06)' : 'rgba(255,255,255,0.16)' }), st]} />;
}

/* ------------------------------------------------------------------ the car */
const FOAM: [number, number, number][] = [[0.36, 0.1, 17], [0.48, 0.02, 21], [0.6, 0.06, 18], [0.7, 0.2, 14], [0.2, 0.42, 16], [0.84, 0.46, 14], [0.5, 0.36, 22], [0.34, 0.56, 15], [0.66, 0.52, 17], [0.12, 0.5, 11]];
export function Car({ w, foam, shine, body = '#FFFFFF' }: { w: number; foam?: boolean; shine?: boolean; body?: string }) {
  const h = w * 90 / 220;
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 220 90">
        <Defs><SG id="cb" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={body} /><Stop offset="1" stopColor={shine ? '#E4D9FF' : '#C9BAF5'} /></SG></Defs>
        <Ellipse cx={112} cy={86} rx={104} ry={5} fill="#000" opacity={0.18} />
        <Path d="M6 62 Q6 48 22 45 L56 42 Q70 14 100 12 L142 12 Q170 14 182 42 L204 46 Q216 49 216 62 L216 68 Q216 72 212 72 L10 72 Q6 72 6 68Z" fill="url(#cb)" />
        <Path d="M70 40 Q78 23 102 21 L124 21 L124 40Z" fill="#5B3FC4" opacity={0.9} /><Path d="M130 21 L144 21 Q162 24 172 40 L130 40Z" fill="#5B3FC4" opacity={0.9} />
        <Path d="M127 22 L127 64" stroke="#B7A6EB" strokeWidth={2} /><Rect x={134} y={46} width={14} height={3.4} rx={1.7} fill="#9C88DB" />
        <Rect x={204} y={50} width={11} height={7} rx={3} fill={SAFF} /><Rect x={6} y={52} width={7} height={6} rx={2.5} fill="#FF5A5F" />
        {shine ? <Path d="M84 26 L96 26 L82 40 L72 40Z" fill="#fff" opacity={0.55} /> : null}
        {[58, 166].map(cx => <G key={cx}><Circle cx={cx} cy={72} r={17} fill="#1A1033" /><Circle cx={cx} cy={72} r={9} fill="#CFC3F0" /><Circle cx={cx} cy={72} r={3.5} fill="#7B64C9" /></G>)}
      </Svg>
      {foam ? FOAM.map(([fx, fy, r], i) => <Blob key={i} x={fx * w - r / 2} y={fy * h * 0.9} r={r} d={500 + i * 280} />) : null}
    </View>
  );
}
function Blob({ x, y, r, d }: { x: number; y: number; r: number; d: number }) {
  const p = usePop(d), st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: p.value }] }));
  return <Animated.View style={[abs(x, y, { width: r, height: r, borderRadius: r / 2, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E9E1FF' }), st]} />;
}

/* ------------------------------------------------------------------ characters */
type Pose = 'gun' | 'wave' | 'phone' | 'thumb' | 'give';
type PersonLook = { shirt: string; pants: string; skin: string; hair?: string; cap?: boolean; badge?: boolean };
export const WASHER: PersonLook = { shirt: '#5409DA', pants: '#2B1B66', skin: '#E7A57A', cap: true, badge: true };
export const CUSTOMER: PersonLook = { shirt: '#FF7A6B', pants: '#2F3A66', skin: '#B9784A', hair: '#1A1033' };
const ARM: Record<Pose, { box: [number, number]; pivot: [number, number]; at: [number, number] }> = {
  gun: { box: [86, 60], pivot: [8, 8], at: [66, 52] }, wave: { box: [50, 90], pivot: [8, 80], at: [66, -18] },
  phone: { box: [60, 60], pivot: [8, 8], at: [66, 52] }, give: { box: [60, 60], pivot: [8, 8], at: [66, 52] }, thumb: { box: [50, 60], pivot: [8, 8], at: [66, 52] },
};
/* Flat, rounded characters in the style of the delivery illustrations we use elsewhere: a big friendly head with an open smile and
   blushed cheeks, soft shoulders, a polo with a collar, sleeves that turn into skin at the forearm, trousers with a fold,
   sneakers. The right arm is its own layer so it can wave, hold the spray gun, show the phone or hand over the keys. */
const shade = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, f = (v: number) => Math.round(v * (1 - a)); return `rgb(${f(r)},${f(g)},${f(b)})`; };
function Hand({ x, y, r = 5.4, skin, fingers }: { x: number; y: number; r?: number; skin: string; fingers?: boolean }) {
  return <G>
    <Circle cx={x} cy={y} r={r} fill={skin} />
    {fingers ? [[-5.5, -5.5], [-1.8, -8], [2.2, -8], [6, -5.2]].map(([dx, dy], i) => <Circle key={i} cx={x + dx} cy={y + dy} r={2.4} fill={skin} />) : null}
  </G>;
}
export function Person({ look, pose, h = 160, delay = 0 }: { look: PersonLook; pose: Pose; h?: number; delay?: number }) {
  const k = h / 160, sway = usePulse(1100, delay), swing = usePulse(pose === 'wave' ? 380 : 700, delay);
  const a = ARM[pose], deg = pose === 'wave' ? [-14, 14] : pose === 'gun' ? [-6, 6] : [-3, 3];
  const bodySt = useAnimatedStyle(() => ({ transform: [{ translateY: sway.value * -2 }, { scale: k }] }));   // the animated transform replaces the static one, so the size scale lives here
  const armSt = useAnimatedStyle(() => ({ transform: [{ rotate: interpolate(swing.value, [0, 1], deg) + 'deg' }] }));
  const sleeve = look.shirt, skin = look.skin, dark = shade(sleeve, 0.14), skinD = shade(skin, 0.1), hair = look.hair || '#1A1033';
  return (
    <View style={{ width: 100 * k, height: h }}>
      <Animated.View style={[{ width: 100, height: 160, transform: [{ scale: k }], transformOrigin: '0px 0px' }, bodySt]}>
        <Svg width={100} height={160} viewBox="0 0 100 160" style={abs(0, 0)}>
          <Ellipse cx={50} cy={157} rx={30} ry={3.6} fill="#000" opacity={0.16} />
          {/* legs with a fold, then sneakers */}
          <Path d="M36 104 H49 V148 H37.5 Z" fill={look.pants} /><Path d="M51 104 H64 V148 H52.5 Z" fill={look.pants} />
          <Path d="M43 112 Q45 128 42.6 146" stroke="#000" strokeOpacity={0.14} strokeWidth={1.6} fill="none" strokeLinecap="round" /><Path d="M57.6 112 Q59 128 57.6 146" stroke="#000" strokeOpacity={0.14} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Path d="M34 148 H50 Q54 148 54 152 V155 Q54 157 52 157 H36 Q33 157 33 154 Z" fill="#F4F1FA" /><Path d="M33.4 153.4 H54 V156 Q54 157 52 157 H36 Q33.4 157 33.4 154.4Z" fill="#2B1B66" opacity={0.85} />
          <Path d="M50 148 H66 Q70 148 70 152 V155 Q70 157 68 157 H52 Q49 157 49 154 Z" fill="#F4F1FA" /><Path d="M49.4 153.4 H70 V156 Q70 157 68 157 H52 Q49.4 157 49.4 154.4Z" fill="#2B1B66" opacity={0.85} />
          {/* torso: soft shoulders, a darker side, polo collar and placket */}
          <Path d="M30 70 Q30 54 45 54 L55 54 Q70 54 70 70 L69 108 Q69 111 66 111 L34 111 Q31 111 31 108 Z" fill={sleeve} />
          <Path d="M58 56 Q70 56 70 70 L69 108 Q69 111 66 111 L60 111 Q64 84 58 56Z" fill={dark} opacity={0.55} />
          <Path d="M43 53.5 L50 63 L57 53.5 Q50 57 43 53.5Z" fill="#fff" opacity={0.92} /><Path d="M50 62 V78" stroke="#000" strokeOpacity={0.18} strokeWidth={1.4} strokeLinecap="round" />
          {look.badge ? <Path d="M56.5 70 h7 v6 q0 3 -3.5 4.4 q-3.5 -1.4 -3.5 -4.4z" fill="#fff" opacity={0.95} /> : null}
          <Rect x={30.5} y={104} width={39} height={7} rx={3} fill="#17112A" opacity={0.9} /><Rect x={46.5} y={104.6} width={7} height={5.8} rx={1.6} fill={SAFF} />
          {/* left arm hangs: sleeve to the elbow, then skin, hand */}
          <Path d="M34 62 Q24 66 23 80" stroke={sleeve} strokeWidth={11.5} strokeLinecap="round" fill="none" /><Path d="M23 79 Q22 90 24.5 98" stroke={skin} strokeWidth={8} strokeLinecap="round" fill="none" />
          <Circle cx={34} cy={62} r={7} fill={sleeve} /><Circle cx={65.5} cy={62} r={7} fill={sleeve} /><Hand x={25} y={101} r={5} skin={skin} />
          {/* head: neck, ears, face, cheeks, brows, eyes, nose, open smile */}
          <Rect x={44.5} y={44} width={11} height={13} rx={4.5} fill={skinD} />
          <Circle cx={34.6} cy={33} r={3.4} fill={skin} /><Circle cx={65.4} cy={33} r={3.4} fill={skin} />
          <Ellipse cx={50} cy={31} rx={15.6} ry={17.4} fill={skin} />
          <Circle cx={40.8} cy={37.4} r={3.2} fill="#FF7B7B" opacity={0.3} /><Circle cx={59.4} cy={37.4} r={3.2} fill="#FF7B7B" opacity={0.3} />
          <Path d="M40.6 27.6 Q44 25.2 47.4 27" stroke={hair} strokeWidth={1.7} fill="none" strokeLinecap="round" /><Path d="M52.6 27 Q56 25.2 59.4 27.6" stroke={hair} strokeWidth={1.7} fill="none" strokeLinecap="round" />
          <Ellipse cx={44} cy={31.8} rx={1.8} ry={2.3} fill="#1A1033" /><Ellipse cx={56} cy={31.8} rx={1.8} ry={2.3} fill="#1A1033" /><Circle cx={44.6} cy={31} r={0.6} fill="#fff" /><Circle cx={56.6} cy={31} r={0.6} fill="#fff" />
          <Path d="M50.6 33.4 Q52.4 36.6 50 37.4" stroke={skinD} strokeWidth={1.3} fill="none" strokeLinecap="round" />
          <Path d="M43.6 39.6 Q50 48 56.4 39.6 Q50 41.6 43.6 39.6Z" fill="#8A2F3A" /><Path d="M45.2 40.2 Q50 42.4 54.8 40.2 L54 42 Q50 43.6 46 42Z" fill="#fff" />
          {look.cap ? <>
            <Path d="M33 29 Q33 12 50 12 Q67 12 67 29 Q58 22.5 50 22.5 Q42 22.5 33 29Z" fill={SAFF} />
            <Path d="M33.4 28.6 Q42 22.8 50 22.8 Q58 22.8 66.6 28.6 Q58 25.6 50 25.6 Q42 25.6 33.4 28.6Z" fill="#E5A400" />
            <Path d="M55 22 Q70 18 78 24 Q72 28 58 26.5Z" fill="#E5A400" /><Circle cx={50} cy={16.5} r={2.4} fill="#5409DA" />
            <Path d="M34.6 29 Q33.6 36 35 38" stroke={hair} strokeWidth={3} strokeLinecap="round" fill="none" /><Path d="M65.4 29 Q66.4 36 65 38" stroke={hair} strokeWidth={3} strokeLinecap="round" fill="none" />
          </> : <>
            <Circle cx={38.5} cy={20} r={8.4} fill={hair} /><Circle cx={47} cy={14.6} r={9.6} fill={hair} /><Circle cx={57} cy={15.4} r={9.6} fill={hair} /><Circle cx={64.4} cy={22.6} r={7.6} fill={hair} /><Circle cx={35} cy={28} r={5.6} fill={hair} />
            <Path d="M36 28 Q38 20 48 21.6 Q56 23.4 64.6 28 Q60 19.4 50 19 Q40 19 36 28Z" fill={hair} /><Circle cx={43} cy={18.6} r={2.6} fill="#fff" opacity={0.08} />
          </>}
        </Svg>
        <Animated.View style={[abs(57 - (a.pivot[0] - 8), 52 - (a.pivot[1] - 8), { width: a.box[0], height: a.box[1], transformOrigin: `${a.pivot[0]}px ${a.pivot[1]}px` }), armSt]}>
          <Svg width={a.box[0]} height={a.box[1]} viewBox={`0 0 ${a.box[0]} ${a.box[1]}`}>
            {pose === 'gun' ? <><Path d="M8 8 L26 22" stroke={sleeve} strokeWidth={11.5} strokeLinecap="round" /><Path d="M26 22 L39 30" stroke={skin} strokeWidth={8} strokeLinecap="round" /><Rect x={34} y={20} width={24} height={13} rx={4.5} fill="#3B3560" /><Rect x={56} y={24} width={22} height={5} rx={2.5} fill={SAFF} /><Rect x={40} y={31} width={7} height={14} rx={3} fill="#2B2552" /><Hand x={41} y={32} r={5.2} skin={skin} /></> : null}
            {pose === 'wave' ? <><Path d="M8 80 L21 48" stroke={sleeve} strokeWidth={11.5} strokeLinecap="round" /><Path d="M21 48 L27 30" stroke={skin} strokeWidth={8} strokeLinecap="round" /><Hand x={28} y={24} r={6.4} skin={skin} fingers /></> : null}
            {pose === 'phone' ? <><Path d="M8 8 L25 28" stroke={sleeve} strokeWidth={11} strokeLinecap="round" /><Path d="M25 28 L30 16" stroke={skin} strokeWidth={7.6} strokeLinecap="round" /><Rect x={26} y={-2} width={16} height={26} rx={4} fill="#17112A" /><Rect x={28} y={1} width={12} height={20} rx={2.5} fill="#8E6BFF" /><Hand x={31} y={14} r={5} skin={skin} /></> : null}
            {pose === 'give' ? <><Path d="M8 8 L27 21" stroke={sleeve} strokeWidth={11.5} strokeLinecap="round" /><Path d="M27 21 L40 29" stroke={skin} strokeWidth={8} strokeLinecap="round" /><Hand x={42} y={30} r={5.6} skin={skin} /></> : null}
            {pose === 'thumb' ? <><Path d="M8 8 L25 27" stroke={sleeve} strokeWidth={11.5} strokeLinecap="round" /><Path d="M25 27 L29 31" stroke={skin} strokeWidth={8} strokeLinecap="round" /><Rect x={26} y={14} width={6.4} height={14} rx={3.2} fill={skin} /><Hand x={30} y={32} r={6.4} skin={skin} /></> : null}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ small parts */
function Card({ x, y, delay, children, w = 168 }: { x: number; y: number; delay: number; children: ReactNode; w?: number }) {
  const p = usePop(delay), bob = usePulse(1300, delay), st = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.6), transform: [{ translateY: (1 - p.value) * 22 + bob.value * -3 }] }));
  return <Animated.View style={[abs(x, y, { width: w, borderRadius: 16, backgroundColor: '#fff', padding: 10, shadowColor: '#1A0A4D', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }), st]}>{children}</Animated.View>;
}
const Tick = ({ s = 18 }: { s?: number }) => <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}><Svg width={s * 0.62} height={s * 0.62} viewBox="0 0 14 14"><Path d="M2.5 7.5 L5.5 10.5 L11.5 4" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
export function Pin({ size = 34 }: { size?: number }) {
  return <Svg width={size} height={size * 1.25} viewBox="0 0 32 40"><Path d="M16 38 C16 38 4 24 4 15 A12 12 0 0 1 28 15 C28 24 16 38 16 38Z" fill={SAFF} /><Circle cx={16} cy={15} r={5} fill="#3A0599" /></Svg>;
}
export function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  const light = useContext(LightCtx);
  const p = usePulse(650, delay), st = useAnimatedStyle(() => ({ opacity: 0.2 + p.value * 0.8, transform: [{ scale: 0.4 + p.value * 0.8 }, { rotate: p.value * 45 + 'deg' }] }));
  return <Animated.View style={[abs(x, y, { width: s, height: s }), st]}><Svg width={s} height={s} viewBox="0 0 20 20"><Path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6Z" fill={light ? SAFF : '#fff'} /></Svg></Animated.View>;
}
export function Drop({ x, y, dx, dy, ms, delay, r = 4 }: { x: number; y: number; dx: number; dy: number; ms: number; delay: number; r?: number }) {
  const p = useLoop(ms, 0.5, delay), st = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.12, 0.85, 1], [0, 1, 1, 0]), transform: [{ translateX: p.value * dx }, { translateY: p.value * dy + p.value * p.value * 10 }] }));
  return <Animated.View style={[abs(x, y, { width: r * 2, height: r * 1.4, borderRadius: r, backgroundColor: '#BFE6FF' }), st]} />;
}
function Stage({ W, H, children }: { W: number; H: number; children: ReactNode }) {
  const home = useContext(HomeCtx);
  const s = W >= DW ? 1 : W / DW;   // 1:1 whenever the phone is wide enough: scaling the cards makes their text soft
  // Home draws the whole scene as the hero background, so the ground line sits on the road at the bottom and nothing is cropped
  const top = home ? H - HOME_ROAD - GROUND + 30 : (H - DH) / 2;
  return <View style={{ position: 'absolute', left: (W - DW) / 2, top, width: DW, height: DH, transform: [{ scale: s }], transformOrigin: home ? '50% 87%' : undefined }}>{children}</View>;
}

/* ------------------------------------------------------------------ the four scenes */
function SceneBook({ W, H }: { W: number; H: number }) {
  const rider = usePop(1700, true), bob = usePulse(420), ripple = useLoop(1500, 0.5, 700), spin = useLoop(500);
  const rSt = useAnimatedStyle(() => ({ opacity: rider.value, transform: [{ translateX: (1 - rider.value) * 150 }, { translateY: bob.value * -2 }] }));
  const rip = useAnimatedStyle(() => ({ opacity: interpolate(ripple.value, [0, 0.2, 1], [0, 0.7, 0]), transform: [{ scale: 0.5 + ripple.value * 1.8 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={0} />
      <Stage W={W} H={H}>
        <View style={abs(0, GROUND - 160 + 6)}><Person look={CUSTOMER} pose="phone" h={158} /></View>
        <Animated.View style={[abs(40, 86, { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(84,9,218,0.22)' }), rip]} />
        <Card x={96} y={18} delay={900} w={176}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Tick /><View><Txt weight={600} size={12} color="#1A1033" style={{ lineHeight: 15 }}>Wash booked</Txt><Txt size={10} color="#6B6483" style={{ lineHeight: 13 }}>Instant · Pressure wash</Txt></View></View>
        </Card>
        <Card x={150} y={72} delay={1500} w={170}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: SAFF }} /><Txt weight={600} size={11} color="#1A1033" numberOfLines={1} style={{ lineHeight: 14 }}>Washer on the way</Txt></View>
        </Card>
        <Animated.View style={[abs(190, GROUND - 100), rSt]}><RiderArt w={130} spin={spin} /></Animated.View>
      </Stage>
    </View>
  );
}
function SceneRide({ W, H }: { W: number; H: number }) {
  const bob = usePulse(380), spin = useLoop(450), enter = usePop(100, true), ring = useLoop(1500), dash = useLoop(1400);
  const rSt = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateX: (1 - enter.value) * -120 }, { translateY: bob.value * -3 }] }));
  const rg = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 0.5 + ring.value * 1.5 }] }));
  const ds = useAnimatedStyle(() => ({ transform: [{ translateX: -dash.value * 24 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={1} road />
      <Stage W={W} H={H}>
        <View style={abs(262, GROUND - 70)}><Animated.View style={[abs(-10, 40, { width: 40, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,186,8,0.5)' }), rg]} /><Pin size={38} /></View>
        <View style={abs(214, GROUND - 98, { width: 90, height: 22, overflow: 'hidden' })}><Animated.View style={[{ flexDirection: 'row', width: 200 }, ds]}>{Array.from({ length: 9 }, (_, i) => <View key={i} style={{ width: 12, height: 3, borderRadius: 2, marginRight: 12, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.75)' }} />)}</Animated.View></View>
        <Card x={196} y={22} delay={900} w={150}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Blink /><Txt weight={600} size={12} color="#1A1033" numberOfLines={1} style={{ lineHeight: 15 }}>Arriving in 8 min</Txt></View></Card>
        <Animated.View style={[abs(34, GROUND - 120), rSt]}><RiderArt w={180} spin={spin} /></Animated.View>
      </Stage>
    </View>
  );
}
function Blink() { const p = usePulse(600), st = useAnimatedStyle(() => ({ opacity: 0.4 + p.value * 0.6, transform: [{ scale: 0.85 + p.value * 0.3 }] })); return <Animated.View style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#22C55E' }, st]} />; }

function Hub({ open }: { open: SharedValue<number> }) {
  const door = useAnimatedStyle(() => ({ transform: [{ translateY: -open.value * 52 }] })), lamp = usePulse(1000);
  const ls = useAnimatedStyle(() => ({ opacity: 0.5 + lamp.value * 0.5 }));
  return (
    <View style={abs(6, GROUND - 124, { width: 150, height: 124 })}>
      <Svg width={150} height={124} viewBox="0 0 150 124"><Rect x={0} y={20} width={150} height={104} rx={6} fill="#3C1AA8" /><Rect x={0} y={14} width={150} height={12} rx={5} fill="#2A0F6B" /><Rect x={14} y={0} width={122} height={26} rx={7} fill={SAFF} />
        <Rect x={24} y={46} width={102} height={78} rx={4} fill="#FFE9A8" /><Circle cx={12} cy={40} r={3} fill="#FFD470" /></Svg>
      <Txt weight={800} size={15} color="#2A0F6B" style={abs(0, 3, { width: 150, textAlign: 'center', lineHeight: 20 })}>WD HUB</Txt>
      <View style={abs(24, 46, { width: 102, height: 78, overflow: 'hidden', borderRadius: 4 })}>
        <View style={abs(14, 46)}><Svg width={80} height={30} viewBox="0 0 80 30"><Rect x={4} y={10} width={70} height={14} rx={7} fill="#5409DA" /><Circle cx={14} cy={24} r={6} fill="#17112A" /><Circle cx={62} cy={24} r={6} fill="#17112A" /></Svg></View>
        <Animated.View style={[abs(0, 0, { width: 102, height: 78, backgroundColor: '#8F7BD6' }), door]}>{[0, 1, 2, 3, 4, 5].map(i => <View key={i} style={abs(0, 12 + i * 13, { width: 102, height: 2, backgroundColor: '#6E58BD' })} />)}</Animated.View>
      </View>
      <Animated.View style={[abs(120, 28, { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }), ls]} />
    </View>
  );
}
function SceneHub({ W, H }: { W: number; H: number }) {
  const open = useSharedValue(0), x = useSharedValue(0), rm = useReducedMotion(), bob = usePulse(400), spin = useLoop(450);
  useEffect(() => { if (rm) { open.value = 1; x.value = 1; return } open.value = withDelay(500, withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) })); x.value = withDelay(1500, withTiming(1, { duration: 2400, easing: Easing.in(Easing.quad) })) }, []);
  const rSt = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, 0.08, 1], [0, 1, 1]), transform: [{ translateX: x.value * 230 }, { translateY: bob.value * -2 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={0} road />
      <Stage W={W} H={H}>
        <Hub open={open} />
        <Card x={190} y={22} delay={1200} w={160}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Tick s={16} /><Txt weight={600} size={12} color="#1A1033" numberOfLines={1} style={{ lineHeight: 15 }}>Washer assigned</Txt></View></Card>
        <Animated.View style={[abs(34, GROUND - 78), rSt]}><RiderArt w={120} spin={spin} /></Animated.View>
      </Stage>
    </View>
  );
}
function SceneKeys({ W, H }: { W: number; H: number }) {
  const arrive = usePop(100, true), key = useLoop(2000, 0.5, 900), bob = usePulse(420);
  const rSt = useAnimatedStyle(() => ({ opacity: arrive.value, transform: [{ translateX: (1 - arrive.value) * 120 }] }));
  const kSt = useAnimatedStyle(() => ({ opacity: interpolate(key.value, [0, 0.1, 0.85, 1], [0, 1, 1, 0]), transform: [{ translateX: interpolate(key.value, [0, 0.5, 1], [0, 44, 88]) }, { translateY: interpolate(key.value, [0, 0.5, 1], [0, -16, 2]) }, { rotate: key.value * 360 + 'deg' }] }));
  const sc = usePop(600), scSt = useAnimatedStyle(() => ({ opacity: sc.value, transform: [{ scale: 0.8 + sc.value * 0.2 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={2} />
      <Stage W={W} H={H}>
        <Animated.View style={[abs(250, GROUND - 82, { width: 100 }), rSt]}><Svg width={80} height={26} viewBox="0 0 80 26" style={abs(10, 66)}><Ellipse cx={40} cy={13} rx={36} ry={5} fill="#000" opacity={0.15} /></Svg><RiderArt w={96} /></Animated.View>
        <View style={abs(30, GROUND - 156)}><Person look={CUSTOMER} pose="give" h={160} /></View>
        <View style={abs(122, GROUND - 156)}><Person look={WASHER} pose="wave" h={160} delay={300} /></View>
        <Animated.View style={[abs(100, GROUND - 120), kSt]}><Svg width={22} height={14} viewBox="0 0 22 14"><Circle cx={5} cy={7} r={4.4} fill="none" stroke={SAFF} strokeWidth={2.6} /><Path d="M9 7 H20 M16 7 V11 M19 7 V10" stroke={SAFF} strokeWidth={2.4} strokeLinecap="round" /></Svg></Animated.View>
        <Animated.View style={[abs(104, 26, { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }), scSt]}><Tick s={16} /><Txt weight={600} size={12} color="#1A1033" style={{ lineHeight: 15 }}>Keys handed over</Txt></Animated.View>
      </Stage>
    </View>
  );
}
function SceneWash({ W, H }: { W: number; H: number }) {
  const car = usePop(100, true), shake = usePulse(140);
  const cSt = useAnimatedStyle(() => ({ opacity: car.value, transform: [{ translateX: (1 - car.value) * 60 }, { translateY: shake.value * -1 }] }));
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={2} />
      <Stage W={W} H={H}>
        <Animated.View style={[abs(130, GROUND - 96), cSt]}><Car w={220} foam /></Animated.View>
        <View style={abs(14, GROUND - 156)}><Person look={WASHER} pose="gun" h={160} /></View>
        {[0, 1, 2, 3, 4, 5].map(i => <Drop key={i} x={150} y={GROUND - 88 + (i % 3) * 2} dx={44 + (i % 3) * 8} dy={-6 + (i % 3) * 12} ms={560} delay={i * 90} r={3.2} />)}
        {[0, 1, 2, 3].map(i => <Drop key={'m' + i} x={168 + i * 14} y={GROUND - 100} dx={10} dy={-22 - i * 4} ms={1100} delay={i * 260} r={2.6} />)}
        <Svg width={DW} height={DH} style={abs(0, 0)} pointerEvents="none"><Path d="M114 172 C114 156 124 150 116 134" stroke="#2B2552" strokeWidth={4.4} fill="none" strokeLinecap="round" /><Path d="M114 172 C114 156 124 150 116 134" stroke="#6D6A93" strokeWidth={1.2} fill="none" strokeLinecap="round" /></Svg>
        <View style={abs(92, GROUND - 32)}><Svg width={44} height={34} viewBox="0 0 44 34"><Path d="M15 9 V5 Q15 2.5 17.5 2.5 H26.5 Q29 2.5 29 5 V9" stroke="#2B2552" strokeWidth={2.6} fill="none" strokeLinecap="round" /><Rect x={2} y={8} width={40} height={25} rx={5.5} fill="#5409DA" /><Rect x={2} y={8} width={40} height={6} rx={3} fill="#7A3CF0" opacity={0.7} /><Rect x={6} y={30} width={5} height={3.4} rx={1.4} fill="#2B2552" /><Rect x={33} y={30} width={5} height={3.4} rx={1.4} fill="#2B2552" /><Circle cx={22} cy={21.5} r={8} fill={SAFF} /><SvgText x={22} y={24.6} fontSize={8.4} fontWeight="800" fill="#1A1033" textAnchor="middle">WD</SvgText></Svg></View>
        <Sparkle x={296} y={50} s={16} delay={400} /><Sparkle x={322} y={96} s={11} delay={900} />
      </Stage>
    </View>
  );
}
function SceneProof({ W, H }: { W: number; H: number }) {
  const home = useContext(HomeCtx), car = usePop(100, true), stars = [usePop(1300), usePop(1450), usePop(1600), usePop(1750), usePop(1900)];
  const cSt = useAnimatedStyle(() => ({ opacity: car.value, transform: [{ translateY: (1 - car.value) * 16 }] }));
  const s0 = useAnimatedStyle(() => ({ opacity: stars[0].value, transform: [{ scale: 0.3 + stars[0].value * 0.7 }] })), s1 = useAnimatedStyle(() => ({ opacity: stars[1].value, transform: [{ scale: 0.3 + stars[1].value * 0.7 }] })),
    s2 = useAnimatedStyle(() => ({ opacity: stars[2].value, transform: [{ scale: 0.3 + stars[2].value * 0.7 }] })), s3 = useAnimatedStyle(() => ({ opacity: stars[3].value, transform: [{ scale: 0.3 + stars[3].value * 0.7 }] })),
    s4 = useAnimatedStyle(() => ({ opacity: stars[4].value, transform: [{ scale: 0.3 + stars[4].value * 0.7 }] }));
  const sts = [s0, s1, s2, s3, s4];
  return (
    <View style={{ width: W, height: H }}>
      <Backdrop W={W} H={H} tone={3} />
      <Stage W={W} H={H}>
        <Animated.View style={[abs(14, GROUND - 96), cSt]}><Car w={220} shine /></Animated.View>
        <Sparkle x={52} y={GROUND - 112} s={18} delay={0} /><Sparkle x={140} y={GROUND - 124} s={24} delay={320} /><Sparkle x={216} y={GROUND - 74} s={14} delay={640} />
        <View style={abs(246, GROUND - 156)}><Person look={WASHER} pose="thumb" h={160} delay={200} /></View>
        <Card x={home ? 100 : 12} y={home ? 48 : 8} delay={800} w={home ? 160 : 176}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: home ? 8 : 10 }}>
            <View style={{ width: home ? 38 : 52, height: home ? 32 : 40, borderRadius: 9, backgroundColor: '#EDE5FF', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 }}><Car w={home ? 34 : 44} shine /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Tick s={14} /><Txt weight={600} size={11} color="#1A1033" numberOfLines={1} style={{ lineHeight: 14 }}>Wash done</Txt></View>
              <View style={{ flexDirection: 'row', gap: 2, marginTop: 5 }}>
                {sts.map((st, i) => <Animated.View key={i} style={st}><Svg width={13} height={13} viewBox="0 0 20 20"><Path d="M10 1 L12.6 7 L19 7.6 L14.2 11.9 L15.6 18.3 L10 15 L4.4 18.3 L5.8 11.9 L1 7.6 L7.4 7Z" fill={SAFF} /></Svg></Animated.View>)}
              </View>
            </View>
          </View>
        </Card>
      </Stage>
    </View>
  );
}

/* ------------------------------------------------------------------ the story */
const SCENES = [SceneBook, SceneHub, SceneRide, SceneKeys, SceneWash, SceneProof];
/* Home plays only the wash and proof scenes */
export const HOME_ORDER = [4, 5];
/** One pager dot: the active one springs open into a saffron pill and fills left to right as the scene plays. */
function PagerDot({ active, ms }: { active: boolean; ms: number }) {
  const rm = !!useReducedMotion(), w = useSharedValue(active ? 26 : 7), f = useSharedValue(0);
  useEffect(() => {
    w.value = rm ? (active ? 26 : 7) : withSpring(active ? 26 : 7, { damping: 11, stiffness: 150 });
    f.value = 0;
    if (active) f.value = rm ? 1 : withTiming(1, { duration: ms, easing: Easing.linear });
  }, [active, rm, ms]);
  const box = useAnimatedStyle(() => ({ width: w.value }));
  const fill = useAnimatedStyle(() => ({ width: `${f.value * 100}%` as any }));
  return (
    <Animated.View style={[{ height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: active ? 'rgba(255,186,8,0.30)' : 'rgba(255,186,8,0.38)' }, box]}>
      <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: '#FFBA08' }, fill]} />
    </Animated.View>
  );
}
export function LoginStory({ W, H = 220, ms = 4600, order, home }: { W: number; H?: number; ms?: number; order?: number[]; home?: boolean }) {
  const ord = order && order.length ? order : SLIDES.map((_, k) => k), N = ord.length;
  const [pos, setI] = useState(0), rm = useReducedMotion();
  useEffect(() => { if (rm) return; const t = setInterval(() => setI(n => (n + 1) % N), ms); return () => clearInterval(t) }, [rm, ms, N]);
  const i = ord[pos % N], Scene = SCENES[i];
  // light lavender sky -> the caption block fades to pure white, which is the colour of the login sheet below
  return (
    <LightCtx.Provider value><HomeCtx.Provider value={!!home}>
      <View style={{ width: W }}>
        <View style={{ width: W, height: H, overflow: 'hidden' }}>
          <Animated.View key={pos} entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={abs(0, 0)}><Scene W={W} H={H} /></Animated.View>
          
        </View>
        <LinearGradient colors={home ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'] : ['#FFFFFF', '#FFFFFF']} style={{ paddingHorizontal: home ? 20 : SP.l + 4, paddingTop: home ? 30 : SP.m, minHeight: home ? 112 : 104, height: home ? 112 : undefined }}>
          <Animated.View key={'t' + pos} entering={FadeIn.duration(420).delay(140)} exiting={FadeOut.duration(200)}>
            <Txt weight={700} size={home ? 21 : 26} color="#1A1033" numberOfLines={home ? 1 : undefined} adjustsFontSizeToFit={!!home} style={{ lineHeight: home ? 27 : 33 }}>{SLIDES[i].t}</Txt>
            <Txt size={home ? 13 : 14} color="#5B5275" numberOfLines={home ? 1 : undefined} style={{ lineHeight: home ? 18 : 20, marginTop: home ? 2 : 4 }}>{SLIDES[i].s}</Txt>
          </Animated.View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: home ? 8 : 12, paddingBottom: home ? 6 : 14 }}>
            {ord.map((_, k) => <PagerDot key={k} active={k === pos % N} ms={ms} />)}
          </View>
        </LinearGradient>
      </View>
    </HomeCtx.Provider></LightCtx.Provider>
  );
}
