/* The city behind the Home hero is Ravi's reference artwork: a coloured day skyline (red and orange towers, a wooded mountain, trees)
   and a night skyline with every window lit. The day picture has its sky removed so the lavender hero shows through; both slide slowly
   sideways (each tile is mirrored so the loop has no seam), with birds by day and twinkling stars at night. */
import { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/** true from 6 pm to 6 am on the phone's clock; checked again every minute (a test can force it with globalThis.__WD_NIGHT) */
export function useNight(): boolean {
  const calc = () => { const f = (globalThis as any).__WD_NIGHT; if (typeof f === 'boolean') return f; const h = new Date().getHours(); return h >= 18 || h < 6 };
  const [n, setN] = useState(calc);
  useEffect(() => { const t = setInterval(() => setN(calc()), 60000); return () => clearInterval(t) }, []);
  return n;
}

function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }

const DAY = require('../../assets/img/city-day.webp'), NIGHT = require('../../assets/img/city-night.webp');
const DAY_AR = 736 / 753, NIGHT_AR = 735 / 669;

function Twinkle({ children, ms, delay }: { children: any; ms: number; delay: number }) {
  const rm = !!useReducedMotion(), v = useSharedValue(1);
  useEffect(() => { if (rm) return; v.value = withDelay(delay, withRepeat(withSequence(withTiming(0.12, { duration: ms * 0.5, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: ms * 0.5, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: ms * 0.6 })), -1, false)); return () => cancelAnimation(v) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, st]}>{children}</Animated.View>;
}

/** the picture, four tiles wide (normal, mirrored, normal, mirrored) sliding left by two tiles forever */
function CityPhoto({ W, h, night }: { W: number; h: number; night: boolean }) {
  const rm = !!useReducedMotion(), p = useSharedValue(0), tw = Math.round(h * (night ? NIGHT_AR : DAY_AR));
  useEffect(() => { if (rm) return; p.value = 0; p.value = withRepeat(withTiming(1, { duration: (tw * 2) / (night ? 5 : 6) * 1000, easing: Easing.linear }), -1, false); return () => cancelAnimation(p) }, [rm, tw, night]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -p.value * tw * 2 }] }));
  const tile = (k: number) => <Image key={k} source={night ? NIGHT : DAY} resizeMode="stretch" style={{ width: tw, height: h, transform: [{ scaleX: k % 2 ? -1 : 1 }] }} />;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row', width: tw * 6, height: h }, st]}>{[0, 1, 2, 3, 4, 5].map(tile)}</Animated.View>
    </View>
  );
}

function Birds({ W, h }: { W: number; h: number }) {
  const rm = !!useReducedMotion(), p = useSharedValue(0), f = useSharedValue(0);
  useEffect(() => { if (rm) return; p.value = withRepeat(withTiming(1, { duration: 36000, easing: Easing.linear }), -1, false); f.value = withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })), -1, false); return () => { cancelAnimation(p); cancelAnimation(f) } }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -40 + p.value * (W + 80) }, { translateY: Math.sin(p.value * 6.28) * 6 }] }));
  const wing = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.55 + f.value * 0.7 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: h * 0.05 }, st]}>
      {[[0, 0, 1], [16, 9, 0.8], [30, -4, 0.7]].map(([x, y, sc], i) => (
        <Animated.View key={i} style={[{ position: 'absolute', left: x, top: y }, wing]}><Svg width={14 * sc} height={7 * sc} viewBox="0 0 14 7"><Path d="M0 6 Q4 -1 7 4 Q10 -1 14 6" stroke="#3B2A5B" strokeWidth={1.4} fill="none" strokeLinecap="round" /></Svg></Animated.View>
      ))}
    </Animated.View>
  );
}

/** The whole skyline, filling `W x h` and standing on the bottom edge. */
export function CityScape({ W, h, night }: { W: number; h: number; night: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h }}>
      <CityPhoto W={W} h={h} night={night} />
      {night ? null : <Birds W={W} h={h} />}
    </View>
  );
}

/** twinkling stars + a glowing moon for the night sky (behind the picture's own sky) */
export function NightSky({ W, h }: { W: number; h: number }) {
  const stars = useMemo(() => { const r = rng(9); return Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * h * 0.6, s: 1 + r() * 1.6, big: r() < 0.14 })) }, [W, h]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: h }}>
      <Svg width={W} height={h}>
        <Defs><RadialGradient id="moonG" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor="#FFF3C4" stopOpacity={0.55} /><Stop offset="1" stopColor="#FFF3C4" stopOpacity={0} /></RadialGradient></Defs>
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.s * 0.6} fill="#FFFFFF" opacity={0.55} />)}
        <Circle cx={W * 0.84} cy={h * 0.4} r={46} fill="url(#moonG)" />
        <Circle cx={W * 0.84} cy={h * 0.4} r={15} fill="#FFF3C4" />
        <Circle cx={W * 0.84 - 4} cy={h * 0.4 + 3} r={2.6} fill="#E6D492" opacity={0.7} /><Circle cx={W * 0.84 + 3} cy={h * 0.4 - 4} r={1.8} fill="#E6D492" opacity={0.6} />
      </Svg>
      {stars.filter(s => s.big).map((s, i) => <Twinkle key={i} ms={1800 + i * 300} delay={i * 260}><Svg width={W} height={h}><Path d={`M${s.x} ${s.y - 4}L${s.x + 1} ${s.y - 1}L${s.x + 4} ${s.y}L${s.x + 1} ${s.y + 1}L${s.x} ${s.y + 4}L${s.x - 1} ${s.y + 1}L${s.x - 4} ${s.y}L${s.x - 1} ${s.y - 1}Z`} fill="#FFFFFF" /></Svg></Twinkle>)}
    </View>
  );
}
