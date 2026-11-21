// Motion kit (r5) on react-native-reanimated 4: UI-thread springs. Every piece checks reduced motion and jumps to its end state.
// Press: spring to .96 and back with a little overshoot. Entrances: 16px rise + fade on a spring, staggered 35ms (cap 12).
// Add to cart: the stepper springs open, a dot carrying the service art flies on an arc into the mini-cart, the bar bounces.
// Count-up for money figures; a gradient sweep for skeletons. Pulse / SuccessTick / LocationLoader stay on RN Animated (loops).
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Pressable, Platform, StyleSheet, ViewStyle, StyleProp, PressableProps, Dimensions } from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withSequence, withRepeat, cancelAnimation,
  useReducedMotion, Easing as REasing, interpolate, Extrapolation, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F } from '../theme';
import { haptic } from './hosts';
import { useApp, svcLines, openPage } from '../state';
import { useInsets } from './kit';
import { Photo, SvcArt } from '../pages/parts';

const ND = Platform.OS !== 'web';
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);      // RN Animated curve (loops, loader)
export const EASE_STD = EASE_OUT;
const A = Animated.Value;
export const R_EASE = REasing.bezier(0.22, 1, 0.36, 1);

/** spring presets (damping / stiffness / mass) */
export const SPRING = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },       // finger down
  release: { damping: 11, stiffness: 320, mass: 0.6 },     // finger up: small overshoot
  enter: { damping: 18, stiffness: 160, mass: 0.9 },       // list entrance
  pop: { damping: 9, stiffness: 300, mass: 0.6 },          // bounce (cart bar, count)
  page: { damping: 26, stiffness: 240, mass: 0.9, overshootClamping: true },
} as const;
export const useRM = () => useReducedMotion();
/** true while the first-run welcome primer covers the app; Home holds its promo popup until it is false */
export const primerGate = { on: false };

/* ---------- Pressable3: spring press scale on every tappable card, light haptic ---------- */
export function Pressable3({ children, style, onPress, scaleTo = 0.96, haptics = true, disabled, ...rest }:
  Omit<PressableProps, 'style' | 'children'> & { children?: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean }) {
  const rm = useReducedMotion(), s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable {...rest} disabled={disabled}
      onPressIn={e => { if (!rm) s.value = withSpring(scaleTo, SPRING.press); rest.onPressIn?.(e); }}
      onPressOut={e => { s.value = rm ? 1 : withSpring(1, SPRING.release); rest.onPressOut?.(e); }}
      onPress={e => { if (haptics) haptic(); onPress?.(e); }}>
      <Reanimated.View style={[style, st]}>{children}</Reanimated.View>
    </Pressable>
  );
}

/* ---------- FadeUp: spring rise + fade; callers stagger with `delay` (or use `index`) ---------- */
export function FadeUp({ delay = 0, index, children, style, distance = 16, duration = 320 }: { delay?: number; index?: number; children?: ReactNode; style?: StyleProp<ViewStyle>; distance?: number; duration?: number }) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? 1 : 0);
  const d = index != null ? Math.min(index, 12) * 35 : delay;
  useEffect(() => { if (rm) { v.value = 1; return } v.value = withDelay(d, withSpring(1, SPRING.enter)); }, []);
  const o = useSharedValue(rm ? 1 : 0);
  useEffect(() => { o.value = rm ? 1 : withDelay(d, withTiming(1, { duration, easing: R_EASE })); }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - v.value) * distance }, { scale: 0.97 + 0.03 * v.value }] }));
  return <Reanimated.View style={[style, st]}>{children}</Reanimated.View>;
}

/* ---------- fly-to-cart: a dot with the service art arcs from the Add button into the mini-cart thumbnail ---------- */
type Fly = { key: number; id: string; x: number; y: number };
let flyers: Fly[] = [], flyKey = 0, cartTarget: { x: number; y: number } | null = null;
const flySubs = new Set<() => void>();
const flyEmit = () => flySubs.forEach(f => f());
/** start a flight from a window point (centre of the button that was pressed) */
export function flyToCart(id: string, x: number, y: number) {
  flyers = [...flyers, { key: ++flyKey, id, x, y }].slice(-4); flyEmit();
}
/** call with a view ref: measures it and launches the flight from its centre */
export function flyFrom(ref: React.RefObject<any>, id: string) {
  const n: any = ref.current; if (!n || !n.measureInWindow) return;
  try { n.measureInWindow((x: number, y: number, w: number, h: number) => { if (w || h) flyToCart(id, x + w / 2, y + h / 2) }) } catch (e) {}
}
function Flyer({ f, onDone }: { f: Fly; onDone: () => void }) {
  const p = useSharedValue(0), { width: W, height: H } = Dimensions.get('window');
  const to = cartTarget || { x: 12 + 8 + 22, y: H - 120 };
  useEffect(() => { p.value = withTiming(1, { duration: 560, easing: REasing.bezier(0.45, 0, 0.25, 1) }, fin => { if (fin) runOnJS(onDone)() }); }, []);
  const st = useAnimatedStyle(() => {
    const t = p.value, arc = -Math.min(140, Math.abs(f.y - to.y) * 0.35 + 60) * Math.sin(Math.PI * t);
    return {
      opacity: interpolate(t, [0, 0.08, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: f.x + (to.x - f.x) * t - 22 }, { translateY: f.y + (to.y - f.y) * t + arc - 22 },
        { scale: interpolate(t, [0, 0.2, 1], [0.6, 1.05, 0.55], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: C.violet, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      shadowColor: C.violet, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 12 }, st]}>
      <SvcArt id={f.id} size={34} />
    </Reanimated.View>
  );
}
/** mount once, above every page (Main) */
export function FlyHost() {
  const rm = useReducedMotion(), [, setN] = useState(0);
  useEffect(() => { const f = () => setN(n => n + 1); flySubs.add(f); return () => { flySubs.delete(f) } }, []);
  if (rm || !flyers.length) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>{flyers.map(f => <Flyer key={f.key} f={f} onDone={() => { flyers = flyers.filter(x => x.key !== f.key); flyEmit() }} />)}</View>;
}

/* ---------- AddButton: white "+" square (or "Add") that springs open into a "- n +" stepper; the count pops ---------- */
export function AddButton({ qty, onAdd, onSub, variant = 'plus', style, id, compact }: { qty: number; onAdd: () => void; onSub: () => void; variant?: 'plus' | 'add'; style?: StyleProp<ViewStyle>; id?: string; compact?: boolean }) {
  const rm = useReducedMotion(), open = qty > 0, H = compact ? 30 : 34, W0 = variant === 'add' ? 64 : H, W1 = compact ? 78 : 92;
  const w = useSharedValue(open ? 1 : 0), bump = useSharedValue(1), first = useRef(true), ref = useRef<any>(null);
  useEffect(() => { w.value = rm ? (open ? 1 : 0) : withSpring(open ? 1 : 0, { damping: 16, stiffness: 260, mass: 0.7 }); }, [open]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!rm) bump.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, SPRING.pop));
  }, [qty]);
  const box = useAnimatedStyle(() => ({ width: W0 + (W1 - W0) * w.value }));
  const fOut = useAnimatedStyle(() => ({ opacity: interpolate(w.value, [0, 0.45], [1, 0], Extrapolation.CLAMP) }));
  const fIn = useAnimatedStyle(() => ({ opacity: interpolate(w.value, [0.35, 1], [0, 1], Extrapolation.CLAMP) }));
  const num = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const add = () => { if (id) flyFrom(ref, id); onAdd(); };
  return (
    <View ref={ref} style={[{ width: W1, height: H, alignItems: 'flex-end' }, style]} pointerEvents="box-none">
      <Reanimated.View style={[{ height: H, borderRadius: compact ? 9 : 10, backgroundColor: '#fff', overflow: 'hidden',
        shadowColor: '#1A1033', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, box]}>
        <Reanimated.View style={[StyleSheet.absoluteFill, fOut]} pointerEvents={open ? 'none' : 'auto'}>
          <Pressable3 onPress={add} style={s.fill} accessibilityRole="button" accessibilityLabel="Add" scaleTo={0.88}>
            {variant === 'add' ? <Text style={s.add}>Add</Text> : <Text style={[s.plus, compact && { fontSize: 20, lineHeight: 24 }]}>+</Text>}
          </Pressable3>
        </Reanimated.View>
        <Reanimated.View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', backgroundColor: C.violet }, fIn]} pointerEvents={open ? 'auto' : 'none'}>
          <Pressable onPress={() => { haptic(); onSub(); }} hitSlop={6} style={[s.step, { height: H, width: compact ? 24 : 28 }]} accessibilityLabel="Remove one"><Text style={s.stepT}>−</Text></Pressable>
          <Reanimated.Text style={[s.num, num]}>{qty}</Reanimated.Text>
          <Pressable onPress={() => { haptic(); add(); }} hitSlop={6} style={[s.step, { height: H, width: compact ? 24 : 28 }]} accessibilityLabel="Add one more"><Text style={s.stepT}>+</Text></Pressable>
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}
const s = StyleSheet.create({
  fill: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  add: { fontFamily: F.b600, fontSize: 14, color: C.violet },
  plus: { fontFamily: F.b500, fontSize: 22, lineHeight: 26, color: C.violet },
  step: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontFamily: F.b600, fontSize: 17, lineHeight: 22, color: '#fff' },
  num: { flex: 1, textAlign: 'center', fontFamily: F.b600, fontSize: 14, color: '#fff', fontVariant: ['tabular-nums'] },
});

/* ---------- CartBar: white mini-cart (art thumb, "N services ^", Go to cart). Springs up; bounces when something lands in it ---------- */
export function CartBar({ aboveTabs }: { aboveTabs?: boolean }) {
  useApp();
  const L = svcLines(), n = L.count, ins = useInsets(), rm = useReducedMotion();
  const [mounted, setMounted] = useState(n > 0);
  const v = useSharedValue(n > 0 ? 1 : 0), bounce = useSharedValue(1), thumb = useSharedValue(1), prevN = useRef(n), ref = useRef<any>(null);
  const last = useRef({ n, sub: L.sub, id: L.lines[0]?.id || '', name: L.lines[0]?.name || '' });
  if (n > 0) last.current = { n, sub: L.sub, id: L.lines[L.lines.length - 1]?.id || L.lines[0]?.id || '', name: L.lines[0]?.name || '' };
  useEffect(() => {
    if (n > 0) { setMounted(true); v.value = rm ? 1 : withSpring(1, { damping: 16, stiffness: 180 }); }
    else v.value = rm ? 0 : withTiming(0, { duration: 200, easing: R_EASE }, fin => { if (fin) runOnJS(setMounted)(false) });
    if (rm && n === 0) setMounted(false);
  }, [n > 0]);
  useEffect(() => {
    if (n > prevN.current && !rm) {
      bounce.value = withDelay(prevN.current === 0 ? 260 : 470, withSequence(withTiming(1.06, { duration: 110 }), withSpring(1, SPRING.pop)));
      thumb.value = withDelay(prevN.current === 0 ? 260 : 470, withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, SPRING.pop)));
    }
    prevN.current = n;
  }, [n]);
  const wrap = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 90 }, { scale: bounce.value }] }));
  const th = useAnimatedStyle(() => ({ transform: [{ scale: thumb.value }] }));
  if (!mounted) return null;
  const { n: cn, sub, id, name } = last.current;
  const bottom = aboveTabs ? TAB_BAR_H + Math.max(ins.bottom, 0) + 10 : Math.max(ins.bottom, 12);
  const measure = () => { const r: any = ref.current; try { r?.measureInWindow?.((x: number, y: number, w: number, h: number) => { if (w) cartTarget = { x: x + w / 2, y: y + h / 2 } }) } catch (e) {} };
  return (
    <Reanimated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 12, right: 12, bottom }, wrap]}>
      <Pressable3 onPress={() => openPage({ k: 'cart' })} style={cb.bar} haptics={false} accessibilityLabel={`${cn} ${cn === 1 ? 'service' : 'services'} in cart. Go to cart`}>
        <Reanimated.View ref={ref as any} onLayout={measure} style={[cb.thumb, th]}>{id ? <Photo id={id} radius={10} pad={2} style={{ width: 44, height: 44 }} /> : null}</Reanimated.View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={cb.l1}>{cn} {cn === 1 ? 'service' : 'services'}  <Text style={{ color: C.violet }}>{'⌃'}</Text></Text>
          <Text numberOfLines={1} style={cb.l2}>{cn === 1 ? name : '₹' + Number(sub).toLocaleString('en-IN')}</Text>
        </View>
        <View style={cb.cta}><Text style={cb.ctaT}>Go to cart</Text></View>
      </Pressable3>
    </Reanimated.View>
  );
}
/** bar height without inset (kept in sync with screens/TabBar) */
export const TAB_BAR_H = 64;
const cb = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 8, paddingLeft: 8,
    shadowColor: '#1A1033', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F0FA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  l1: { fontFamily: F.b600, fontSize: 14, color: C.ink },
  l2: { fontFamily: F.body, fontSize: 12, color: '#737373', fontVariant: ['tabular-nums'] },
  cta: { backgroundColor: C.violet, borderRadius: 12, paddingHorizontal: 18, height: 44, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.b600, fontSize: 14, color: '#fff' },
});

/* ---------- count-up: animates from the last shown value to the new one (650ms ease-out); instant with reduced motion ---------- */
export function useCountUp(to: number, dur = 650, delay = 0) {
  const rm = useReducedMotion(), [v, setV] = useState(rm ? to : 0), from = useRef(rm ? to : 0);
  useEffect(() => {
    if (rm || !isFinite(to)) { setV(to); from.current = to; return; }
    let raf = 0, t0 = 0; const a = from.current, b = to;
    const step = (t: number) => { if (!t0) t0 = t + delay; const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3); setV(a + (b - a) * e); from.current = a + (b - a) * e; if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return v;
}
/** number or "₹1,234.50"-style string: the numeric part counts up, prefix/suffix stay */
export function CountUp({ to, style, duration = 650, delay = 0 }: { to: number | string; duration?: number; style?: StyleProp<any>; delay?: number }) {
  const str = String(to), m = str.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
  const num = m ? Number(m[2].replace(/,/g, '')) : typeof to === 'number' ? to : NaN, dec = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const v = useCountUp(isFinite(num) ? num : 0, duration, delay);
  if (!isFinite(num)) return <Text style={style}>{str}</Text>;
  const shown = dec ? v.toFixed(dec) : Math.round(v).toString();
  const grouped = m && m[2].includes(',') ? Number(shown).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : shown;
  return <Text style={style}>{(m ? m[1] : '') + grouped + (m ? m[3] : '')}</Text>;
}

/* ---------- Shimmer: grey block with a soft light band sweeping across (1.1s loop) ---------- */
export function Shimmer({ width, height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0), rm = useReducedMotion(), x = useSharedValue(0);
  useEffect(() => { if (!rm) x.value = withRepeat(withTiming(1, { duration: 1100, easing: REasing.inOut(REasing.quad) }), -1, false); return () => cancelAnimation(x) }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.8 + x.value * w * 1.8 }] }));
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#EEEDF2', overflow: 'hidden' }, style]}>
      {w && !rm ? <Reanimated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: w * 0.8 }, st]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </Reanimated.View> : null}
    </View>
  );
}
/** true for `ms` after mount: pages show skeletons for a beat while their data "loads" */
export function useSkeleton(ms = 380) {
  const [on, setOn] = useState(ms > 0);
  useEffect(() => { if (!ms) return; const t = setTimeout(() => setOn(false), ms); return () => clearTimeout(t) }, []);
  return on;
}

/* ---------- shared-element feel: the tapped card's art rect, read once by the page it opens ---------- */
let origin: { id: string; x: number; y: number; w: number; h: number; t: number } | null = null;
export function setOrigin(id: string, ref: React.RefObject<any>, then: () => void) {
  const n: any = ref.current;
  if (!n || !n.measureInWindow) { origin = null; then(); return; }
  let done = false; const go = () => { if (!done) { done = true; then() } };
  try { n.measureInWindow((x: number, y: number, w: number, h: number) => { origin = w ? { id, x, y, w, h, t: Date.now() } : null; go() }) } catch (e) { go() }
  setTimeout(go, 60);
}
/** the origin rect for `id` if it was set in the last second (consumed) */
export function takeOrigin(id: string) { const o = origin; origin = null; return o && o.id === id && Date.now() - o.t < 1000 ? o : null; }

/* ---------- useParallax: inert; API kept so callers still compile ---------- */
export function useParallax(_height = 330) {
  const y = useRef(new A(0)).current;
  return { scrollY: y, onScroll: undefined as any, scrollEventThrottle: 16, style: {} as any };
}

/* ---------- Pulse: live dot with an expanding ring, 1400ms loop ---------- */
export function Pulse({ size = 10, color = C.green, style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new A(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: ND })); a.start(); return () => a.stop(); }, []);
  return (
    <View style={[{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

/* ---------- SuccessTick: the circle draws, then the tick draws. No fill pop, overshoot or ring burst ---------- */
const AC = Animated.createAnimatedComponent(Circle), AP = Animated.createAnimatedComponent(Path);
export function SuccessTick({ size = 96, color = C.green, tickColor = color, onDone }: { size?: number; color?: string; tickColor?: string; onDone?: () => void }) {
  const draw = useRef(new A(0)).current, tick = useRef(new A(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: 300, easing: EASE_OUT, useNativeDriver: false }),
      Animated.timing(tick, { toValue: 1, duration: 220, easing: EASE_OUT, useNativeDriver: false }),
    ]).start(() => onDone?.());
  }, []);
  const r = size / 2 - 2, circ = 2 * Math.PI * r, tl = 40;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <AC cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
          strokeDasharray={`${circ}`} strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] }) as any} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
        <AP d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.44} ${size * 0.66} L ${size * 0.71} ${size * 0.37}`} fill="none" stroke={tickColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${tl * size / 96 * 2}`} strokeDashoffset={tick.interpolate({ inputRange: [0, 1], outputRange: [tl * size / 96 * 2, 0] }) as any} />
      </Svg>
    </View>
  );
}

/* ---------- Splash + location loader (Pronto f_004/f_005): wordmark on violet, cross-fade to a pulsing pin "Fetching location..." ---------- */
let loaderShown = false;
/** when the location loader mounted (ms epoch, 0 = not yet); the welcome flow waits for it to fade before its own spinner screen */
export let loaderT0 = 0;
export const loaderPending = () => !loaderShown;
export function Splash({ children, still }: { children?: ReactNode; still?: boolean }) {
  const rm = useReducedMotion(), a = useSharedValue(rm || still ? 1 : 0), t = useSharedValue(rm || still ? 1 : 0);
  useEffect(() => { if (rm || still) return; a.value = withTiming(1, { duration: 520, easing: R_EASE }); t.value = withDelay(260, withTiming(1, { duration: 520, easing: R_EASE })); }, []);
  const w = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: 0.94 + 0.06 * a.value }] }));
  const g = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 6 }] }));
  return (
    <View style={{ flex: 1, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.Text style={[{ fontFamily: F.b600, fontSize: 34, letterSpacing: 0.4, color: '#fff' }, w]}>Washing Daddy</Reanimated.Text>
      <Reanimated.Text style={[{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 6 }, g]}>Car wash at your parking spot</Reanimated.Text>
      {children}
    </View>
  );
}
function PinSvg({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 32 40">
      <Path d="M16 1C8.8 1 3 6.6 3 13.6 3 23 16 39 16 39s13-16 13-25.4C29 6.6 23.2 1 16 1z" fill={C.violet} />
      <Circle cx={16} cy={14} r={5.5} fill="#fff" />
    </Svg>
  );
}
/** Full-screen overlay shown once per app start after sign-in; fades out by itself. Mount it last in the signed-in shell. */
export function LocationLoader({ place }: { place?: string }) {
  const [show, setShow] = useState(() => !loaderShown), [stage, setStage] = useState(0);
  const o = useRef(new A(1)).current, x = useRef(new A(0)).current, ring = useRef(new A(0)).current, wm = useRef(new A(1)).current;
  useEffect(() => {
    if (!show) return;
    loaderShown = true; loaderT0 = Date.now();
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: ND }));
    loop.start();
    const t1 = setTimeout(() => { setStage(1); Animated.timing(wm, { toValue: 0, duration: 350, easing: EASE_OUT, useNativeDriver: ND }).start(); Animated.timing(x, { toValue: 1, duration: 350, easing: EASE_OUT, useNativeDriver: ND }).start() }, 750);
    const t2 = setTimeout(() => setStage(2), 1900);
    const t3 = setTimeout(() => Animated.timing(o, { toValue: 0, duration: 320, easing: EASE_OUT, useNativeDriver: ND }).start(() => { loop.stop(); setShow(false) }), 2350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); loop.stop() };
  }, []);
  if (!show) return null;
  const rs = ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.6] }), ro = ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <Animated.View pointerEvents="auto" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 900, elevation: 900, opacity: o, backgroundColor: C.violet }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: x, backgroundColor: '#F4F2FA', alignItems: 'center', justifyContent: 'center' }]}>
        {/* faint street grid */}
        {[0.18, 0.36, 0.62, 0.8].map(p => <View key={'h' + p} style={{ position: 'absolute', left: 0, right: 0, top: `${p * 100}%`, height: 10, backgroundColor: '#fff' }} />)}
        {[0.12, 0.4, 0.58, 0.86].map(p => <View key={'v' + p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p * 100}%`, width: 10, backgroundColor: '#fff' }} />)}
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: C.violet, opacity: ro, transform: [{ scale: rs }] }} />
          <View style={{ marginTop: -14 }}><PinSvg /></View>
        </View>
        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: C.hair }}>
          <Text style={{ fontFamily: F.b500, fontSize: 14, color: C.ink }}>{stage < 2 ? 'Fetching location…' : place || 'Location found'}</Text>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: wm }]}><Splash /></Animated.View>
    </Animated.View>
  );
}
