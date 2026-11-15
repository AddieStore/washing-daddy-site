// Motion kit on RN Animated. One curve, bezier(0.22, 1, 0.36, 1): press scale .98 in 120ms, entrances 300ms fade + 8px rise (stagger 50ms),
// no springs, no overshoot, no loops except the live status Pulse.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Pressable, Platform, StyleSheet, ViewStyle, StyleProp, PressableProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F } from '../theme';
import { haptic } from './hosts';
import { useApp, svcLines, openPage } from '../state';
import { useInsets } from './kit';
import { Photo } from '../pages/parts';

const ND = Platform.OS !== 'web';
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);      // the one curve (entrances, sheets, presses)
export const EASE_STD = EASE_OUT;
const A = Animated.Value;

/* ---------- Pressable3: press = scale .98 over 120ms, light haptic ---------- */
export function Pressable3({ children, style, onPress, scaleTo = 0.98, haptics = true, disabled, ...rest }:
  Omit<PressableProps, 'style' | 'children'> & { children?: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean }) {
  const s = useRef(new A(1)).current;
  const to = (v: number, down: boolean) => Animated.timing(s, { toValue: v, duration: 120, easing: EASE_OUT, useNativeDriver: ND }).start();
  const opacity = s.interpolate({ inputRange: [scaleTo, 1], outputRange: [1, 1], extrapolate: 'clamp' });
  return (
    <Pressable {...rest} disabled={disabled} onPressIn={e => { to(scaleTo, true); rest.onPressIn?.(e); }} onPressOut={e => { to(1, false); rest.onPressOut?.(e); }}
      onPress={e => { if (haptics) haptic(); onPress?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: s }], opacity }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- FadeUp: translateY 8 -> 0 + opacity, 300ms, caller staggers with delay (50ms per item, max 6) ---------- */
export function FadeUp({ delay = 0, children, style, distance = 8, duration = 300 }: { delay?: number; children?: ReactNode; style?: StyleProp<ViewStyle>; distance?: number; duration?: number }) {
  const v = useRef(new A(0)).current;
  useEffect(() => { const a = Animated.timing(v, { toValue: 1, duration, delay, easing: EASE_OUT, useNativeDriver: ND }); a.start(); return () => a.stop(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}

/* ---------- AddButton: white square "+" / "Add" that swaps to a "- n +" stepper (no bounce) ---------- */
export function AddButton({ qty, onAdd, onSub, variant = 'plus', style }: { qty: number; onAdd: () => void; onSub: () => void; variant?: 'plus' | 'add'; style?: StyleProp<ViewStyle> }) {
  // Measured: Pronto swaps the white square for a wider white pill in <=2 frames, growing leftwards (right edge fixed).
  const open = qty > 0, H = 34, W0 = variant === 'add' ? 64 : 34, W1 = 92;
  const w = useRef(new A(open ? 1 : 0)).current, bump = useRef(new A(1)).current, first = useRef(true);
  useEffect(() => { Animated.timing(w, { toValue: open ? 1 : 0, duration: 110, easing: EASE_OUT, useNativeDriver: false }).start(); }, [open]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    bump.setValue(1);
  }, [qty]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: [W0, W1] });
  const fOut = w.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const fIn = w.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View style={[{ width: W1, height: H, alignItems: 'flex-end' }, style]} pointerEvents="box-none">
      <Animated.View style={{ width, height: H, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: C.hair, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fOut }]} pointerEvents={open ? 'none' : 'auto'}>
          <Pressable3 onPress={onAdd} style={s.fill} accessibilityRole="button" accessibilityLabel="Add">
            {variant === 'add' ? <Text style={s.add}>Add</Text> : <Text style={s.plus}>+</Text>}
          </Pressable3>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fIn, flexDirection: 'row', alignItems: 'center' }]} pointerEvents={open ? 'auto' : 'none'}>
          <Pressable onPress={() => { haptic(); onSub(); }} hitSlop={6} style={s.step} accessibilityLabel="Remove one"><Text style={s.stepT}>−</Text></Pressable>
          <Animated.Text style={[s.num, { transform: [{ scale: bump }] }]}>{qty}</Animated.Text>
          <Pressable onPress={() => { haptic(); onAdd(); }} hitSlop={6} style={s.step} accessibilityLabel="Add one more"><Text style={s.stepT}>+</Text></Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  add: { fontFamily: F.b500, fontSize: 14, color: C.violet },
  plus: { fontFamily: F.b500, fontSize: 22, lineHeight: 26, color: C.violet },
  step: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontFamily: F.b500, fontSize: 18, lineHeight: 22, color: C.violet },
  num: { flex: 1, textAlign: 'center', fontFamily: F.b500, fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
});

/* ---------- CartBar: white mini-cart bar (thumbnail, "N services ^", Go to cart); slides up 70px + fades 320ms ---------- */
export function CartBar({ aboveTabs }: { aboveTabs?: boolean }) {
  useApp();
  const L = svcLines(), n = L.count, ins = useInsets();
  const [mounted, setMounted] = useState(n > 0);
  const v = useRef(new A(n > 0 ? 1 : 0)).current;
  const last = useRef({ n, sub: L.sub, id: L.lines[0]?.id || '', name: L.lines[0]?.name || '' });
  if (n > 0) last.current = { n, sub: L.sub, id: L.lines[0]?.id || '', name: L.lines[0]?.name || '' };
  useEffect(() => {
    if (n > 0) { setMounted(true); Animated.timing(v, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: ND }).start(); }
    else Animated.timing(v, { toValue: 0, duration: 220, easing: EASE_STD, useNativeDriver: ND }).start(({ finished }) => { if (finished) setMounted(false); });
  }, [n > 0]);
  if (!mounted) return null;
  const { n: cn, sub, id, name } = last.current;
  const bottom = aboveTabs ? 56 + Math.max(ins.bottom, 0) + 8 : Math.max(ins.bottom, 12);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }}>
      <Pressable3 onPress={() => openPage({ k: 'cart' })} style={cb.bar} haptics={false} accessibilityLabel={`${cn} ${cn === 1 ? 'service' : 'services'} in cart. Go to cart`}>
        <View style={cb.thumb}>{id ? <Photo id={id} radius={8} pad={2} style={{ width: 40, height: 40 }} /> : null}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={cb.l1}>{cn} {cn === 1 ? 'service' : 'services'}  <Text style={{ color: C.violet }}>{'\u2303'}</Text></Text>
          <Text numberOfLines={1} style={cb.l2}>{cn === 1 ? name : '₹' + Number(sub).toLocaleString('en-IN')}</Text>
        </View>
        <View style={cb.cta}><Text style={cb.ctaT}>Go to cart</Text></View>
      </Pressable3>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 8, paddingLeft: 10, borderWidth: 1, borderColor: C.hair,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  l1: { fontFamily: F.b500, fontSize: 14, color: C.ink },
  l2: { fontFamily: F.body, fontSize: 12, color: '#737373', fontVariant: ['tabular-nums'] },
  cta: { backgroundColor: C.violet, borderRadius: 10, paddingHorizontal: 18, height: 44, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.b500, fontSize: 14, color: '#fff' },
});

/* ---------- CountUp: no count on load; shows the final figure (props kept so callers don't change) ---------- */
export function CountUp({ to, style }: { to: number | string; duration?: number; style?: StyleProp<any>; delay?: number }) {
  return <Text style={style}>{String(to)}</Text>;
}

/* ---------- Shimmer: grey skeleton block with a soft light band sweeping across (1.2s loop) ---------- */
const sweep = new A(0);
let sweepOn = false;
function startSweep() { if (sweepOn) return; sweepOn = true; Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false })).start(); }
export function Shimmer({ width, height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  useEffect(() => { startSweep() }, []);
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#F1F1F3', overflow: 'hidden' }, style]}>
      {w ? <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: w * 0.7, alignItems: 'center', transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.7, w] }) }] }}>
        {[0.22, 0.4, 0.55].map((o, i) => <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, width: `${100 - i * 30}%`, backgroundColor: `rgba(255,255,255,${o * 0.5})` }} />)}
      </Animated.View> : null}
    </View>
  );
}
/** true for `ms` after mount: pages show skeletons for a beat while their data "loads" */
export function useSkeleton(ms = 380) {
  const [on, setOn] = useState(ms > 0);
  useEffect(() => { if (!ms) return; const t = setTimeout(() => setOn(false), ms); return () => clearTimeout(t) }, []);
  return on;
}

/* ---------- useParallax: inert (no hero parallax / overscroll zoom); API kept so callers still compile ---------- */
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
export const loaderPending = () => !loaderShown;
export function Splash({ children }: { children?: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.b500, fontSize: 34, letterSpacing: 0.5, color: '#fff' }}>Washing Daddy</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 6 }}>Car wash at your parking spot</Text>
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
    loaderShown = true;
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
