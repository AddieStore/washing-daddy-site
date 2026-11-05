// Pronto-style motion kit. Everything uses RN Animated (native driver off-web) so it runs on web and native.
// Numbers are measured from the Pronto recording, see /tmp/claude-0/pronto-ref/ANIMATIONS.md.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Pressable, Platform, StyleSheet, ViewStyle, StyleProp, PressableProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F } from '../theme';
import { haptic } from './hosts';
import { useApp, svcLines, openPage } from '../state';
import { useInsets } from './kit';

const ND = Platform.OS !== 'web';
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);       // fast start, long settle (entrances, sheets)
export const EASE_STD = Easing.bezier(0.4, 0, 0.2, 1);        // standard in/out
const A = Animated.Value;

/* ---------- Pressable3: press = scale .97 + opacity .92, 90ms in / 160ms spring out, light haptic ---------- */
export function Pressable3({ children, style, onPress, scaleTo = 0.97, haptics = true, disabled, ...rest }:
  Omit<PressableProps, 'style' | 'children'> & { children?: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean }) {
  const s = useRef(new A(1)).current;
  const to = (v: number, down: boolean) => Animated.timing(s, { toValue: v, duration: down ? 90 : 180, easing: down ? EASE_STD : EASE_OUT, useNativeDriver: ND }).start();
  const opacity = s.interpolate({ inputRange: [scaleTo, 1], outputRange: [0.92, 1], extrapolate: 'clamp' });
  return (
    <Pressable {...rest} disabled={disabled} onPressIn={e => { to(scaleTo, true); rest.onPressIn?.(e); }} onPressOut={e => { to(1, false); rest.onPressOut?.(e); }}
      onPress={e => { if (haptics) haptic(); onPress?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: s }], opacity }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- FadeUp: translateY 12 -> 0 + opacity, 280ms ease-out, caller staggers with delay (~50ms per item) ---------- */
export function FadeUp({ delay = 0, children, style, distance = 12, duration = 280 }: { delay?: number; children?: ReactNode; style?: StyleProp<ViewStyle>; distance?: number; duration?: number }) {
  const v = useRef(new A(0)).current;
  useEffect(() => { const a = Animated.timing(v, { toValue: 1, duration, delay, easing: EASE_OUT, useNativeDriver: ND }); a.start(); return () => a.stop(); }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}

/* ---------- AddButton: white square "+" / "ADD" that morphs to "- n +" stepper ---------- */
export function AddButton({ qty, onAdd, onSub, variant = 'plus', style }: { qty: number; onAdd: () => void; onSub: () => void; variant?: 'plus' | 'add'; style?: StyleProp<ViewStyle> }) {
  // Measured: Pronto swaps the white square for a wider white pill in <=2 frames, growing leftwards (right edge fixed).
  const open = qty > 0, H = 34, W0 = variant === 'add' ? 64 : 34, W1 = 92;
  const w = useRef(new A(open ? 1 : 0)).current, bump = useRef(new A(1)).current, first = useRef(true);
  useEffect(() => { Animated.timing(w, { toValue: open ? 1 : 0, duration: 110, easing: EASE_OUT, useNativeDriver: false }).start(); }, [open]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    bump.setValue(0.7); Animated.spring(bump, { toValue: 1, damping: 9, stiffness: 320, mass: 0.6, useNativeDriver: ND }).start();
  }, [qty]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: [W0, W1] });
  const fOut = w.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const fIn = w.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View style={[{ width: W1, height: H, alignItems: 'flex-end' }, style]} pointerEvents="box-none">
      <Animated.View style={{ width, height: H, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3DCF5', overflow: 'hidden',
        shadowColor: '#2A0478', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fOut }]} pointerEvents={open ? 'none' : 'auto'}>
          <Pressable3 onPress={onAdd} style={s.fill} accessibilityRole="button" accessibilityLabel="Add">
            {variant === 'add' ? <Text style={s.add}>ADD</Text> : <Text style={s.plus}>+</Text>}
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
  add: { fontFamily: F.b700, fontSize: 13, color: C.violet, letterSpacing: 0.4 },
  plus: { fontFamily: F.b500, fontSize: 22, lineHeight: 26, color: C.violet },
  step: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontFamily: F.b600, fontSize: 18, lineHeight: 22, color: C.violet },
  num: { flex: 1, textAlign: 'center', fontFamily: F.b700, fontSize: 14, color: C.violet },
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
  useEffect(() => { pop.setValue(1.06); Animated.spring(pop, { toValue: 1, damping: 10, stiffness: 260, useNativeDriver: ND }).start(); }, [L.sub]);
  if (!mounted) return null;
  const { n: cn, sub } = last.current;
  const bottom = aboveTabs ? 64 + ins.bottom + 8 : Math.max(ins.bottom, 12);
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }}>
      <Pressable3 onPress={() => openPage({ k: 'cart' })} style={cb.bar} haptics={false}>
        <View style={{ flex: 1 }}>
          <Text style={cb.l1}>{cn} {cn === 1 ? 'service' : 'services'} ⌃</Text>
          <Animated.Text style={[cb.l2, { transform: [{ scale: pop }] }]}>₹{sub}</Animated.Text>
        </View>
        <View style={cb.cta}><Text style={cb.ctaT}>Go to cart</Text></View>
      </Pressable3>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.violet, borderRadius: 16, paddingVertical: 10, paddingLeft: 16, paddingRight: 10,
    shadowColor: '#24065F', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  l1: { fontFamily: F.b500, fontSize: 12, color: 'rgba(255,255,255,.85)' },
  l2: { fontFamily: F.b700, fontSize: 17, color: '#fff', alignSelf: 'flex-start' },
  cta: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 18, height: 42, alignItems: 'center', justifyContent: 'center' },
  ctaT: { fontFamily: F.b600, fontSize: 14, color: C.violet },
});

/* ---------- CountUp: eased 0 -> n over 1200ms (ease-out cubic), keeps prefix/suffix/commas of a string like "25,000+" ---------- */
export function CountUp({ to, duration = 1200, style, delay = 0 }: { to: number | string; duration?: number; style?: StyleProp<any>; delay?: number }) {
  const str = String(to), m = str.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
  const pre = m ? m[1] : '', numStr = m ? m[2] : '', suf = m ? m[3] : str;
  const target = m ? parseFloat(numStr.replace(/,/g, '')) : 0, dec = (numStr.split('.')[1] || '').length, comma = numStr.includes(',');
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!m) return;
    const t0 = Date.now() + delay; let raf: any;
    const tick = () => { const p = Math.min(1, Math.max(0, (Date.now() - t0) / duration)); setVal(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [str]);
  if (!m) return <Text style={style}>{str}</Text>;
  const txt = comma ? val.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : val.toFixed(dec);
  return <Text style={style}>{pre}{txt}{suf}</Text>;
}

/* ---------- Shimmer: skeleton block, light band sweeping left->right every 1300ms ---------- */
export function Shimmer({ width, height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new A(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => { const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: ND })); a.start(); return () => a.stop(); }, []);
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={[{ width: width as any, height, borderRadius: radius, backgroundColor: '#EEEAF6', overflow: 'hidden' }, style]}>
      {w > 0 && <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: w * 0.6, backgroundColor: 'rgba(255,255,255,.65)', opacity: 0.9,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w] }) }, { skewX: '-15deg' }] }} />}
    </View>
  );
}

/* ---------- useParallax: scrollY -> hero image transform. Pull-down scales up from the top, scroll-up drifts at 0.4x ---------- */
export function useParallax(height = 330) {
  const y = useRef(new A(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: ND });
  const style = {
    transform: [
      { translateY: y.interpolate({ inputRange: [-height, 0, height], outputRange: [-height / 2, 0, height * 0.4], extrapolate: 'clamp' }) },
      { scale: y.interpolate({ inputRange: [-height, 0], outputRange: [2, 1], extrapolate: 'clamp' }) },
    ],
  };
  return { scrollY: y, onScroll, scrollEventThrottle: 16, style };
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

/* ---------- SuccessTick: circle draws (500ms), fills, tick pops with overshoot, ring burst ---------- */
const AC = Animated.createAnimatedComponent(Circle), AP = Animated.createAnimatedComponent(Path);
export function SuccessTick({ size = 96, color = C.green, tickColor = '#fff', onDone }: { size?: number; color?: string; tickColor?: string; onDone?: () => void }) {
  const draw = useRef(new A(0)).current, fill = useRef(new A(0)).current, tick = useRef(new A(0)).current, pop = useRef(new A(0.6)).current, burst = useRef(new A(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: 500, easing: EASE_STD, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(fill, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.timing(tick, { toValue: 1, duration: 280, easing: EASE_OUT, useNativeDriver: false }),
        Animated.spring(pop, { toValue: 1, damping: 7, stiffness: 240, mass: 0.7, useNativeDriver: false }),
        Animated.timing(burst, { toValue: 1, duration: 600, easing: EASE_OUT, useNativeDriver: false }),
      ]),
    ]).start(() => onDone?.());
  }, []);
  const r = size / 2 - 3, circ = 2 * Math.PI * r, tl = 40;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 2, borderColor: color,
        opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }} />
      <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0.6, 1], outputRange: [0.92, 1] }) }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <AC cx={size / 2} cy={size / 2} r={r} fill={color} fillOpacity={fill as any} stroke={color} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${circ}`} strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] }) as any} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
          <AP d={`M ${size * 0.3} ${size * 0.52} L ${size * 0.44} ${size * 0.66} L ${size * 0.71} ${size * 0.37}`} fill="none" stroke={tickColor} strokeWidth={size * 0.075} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={`${tl * size / 96 * 2}`} strokeDashoffset={tick.interpolate({ inputRange: [0, 1], outputRange: [tl * size / 96 * 2, 0] }) as any} />
        </Svg>
      </Animated.View>
    </View>
  );
}
