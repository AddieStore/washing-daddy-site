// Motion kit on RN Animated. One curve, bezier(0.22, 1, 0.36, 1): press scale .98 in 120ms, entrances 300ms fade + 8px rise (stagger 50ms),
// no springs, no overshoot, no loops except the live status Pulse.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Pressable, Platform, StyleSheet, ViewStyle, StyleProp, PressableProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F } from '../theme';
import { haptic } from './hosts';
import { useApp, svcLines, openPage } from '../state';
import { useInsets } from './kit';

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

/* ---------- CartBar: slides up 70px + fades 320ms when cart gains items, down on empty ---------- */
export function CartBar({ aboveTabs }: { aboveTabs?: boolean }) {
  useApp();
  const L = svcLines(), n = L.count, ins = useInsets();
  const [mounted, setMounted] = useState(n > 0);
  const v = useRef(new A(n > 0 ? 1 : 0)).current;
  const last = useRef({ n, sub: L.sub });
  if (n > 0) last.current = { n, sub: L.sub };
  useEffect(() => {
    if (n > 0) { setMounted(true); Animated.timing(v, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: ND }).start(); }
    else Animated.timing(v, { toValue: 0, duration: 220, easing: EASE_STD, useNativeDriver: ND }).start(({ finished }) => { if (finished) setMounted(false); });
  }, [n > 0]);
  const pop = useRef(new A(1)).current;
  if (!mounted) return null;
  const { n: cn, sub } = last.current;
  const bottom = aboveTabs ? 64 + ins.bottom + 8 : Math.max(ins.bottom, 12);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }}>
      <Pressable3 onPress={() => openPage({ k: 'cart' })} style={cb.bar} haptics={false}>
        <View style={{ flex: 1 }}>
          <Text style={cb.l1}>{cn} {cn === 1 ? 'service' : 'services'}</Text>
          <Animated.Text style={[cb.l2, { transform: [{ scale: pop }] }]}>₹{Number(sub).toLocaleString('en-IN')}</Animated.Text>
        </View>
        <View style={cb.cta}><Text style={cb.ctaT}>Go to cart</Text></View>
      </Pressable3>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.violet, borderRadius: 14, paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  l1: { fontFamily: F.b500, fontSize: 12, color: 'rgba(255,255,255,.85)' },
  l2: { fontFamily: F.b500, fontSize: 17, color: '#fff', alignSelf: 'flex-start', fontVariant: ['tabular-nums'] },
  cta: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.b500, fontSize: 14, color: C.violet },
});

/* ---------- CountUp: no count on load; shows the final figure (props kept so callers don't change) ---------- */
export function CountUp({ to, style }: { to: number | string; duration?: number; style?: StyleProp<any>; delay?: number }) {
  return <Text style={style}>{String(to)}</Text>;
}

/* ---------- Shimmer: static skeleton block (no sweep) ---------- */
export function Shimmer({ width, height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#F4F4F5' }, style]} />;
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
