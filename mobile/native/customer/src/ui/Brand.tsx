/* Brand shell shared by sign-in and the permission primer: a violet gradient top and a white sheet with rounded top corners.
   After login the app sits on the same violet-tinted canvas (C.canvas), so the hand-off is one colour family. */
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, SharedValue, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../theme';
import { FadeUp, useRM } from './motion';
import { src } from '../img';
import { useActive } from './active';

/** full-bleed violet gradient with two soft glows; put it first inside a flex:1 View */
export function BrandBg() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[C.brandTop, '#4608B8', C.brandDeep]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', right: -90, top: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ position: 'absolute', left: -70, top: 150, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,186,8,0.10)' }} />
    </View>
  );
}

/** white bottom sheet that rises into place once */
export function Sheet({ children, style, onLayout, delay = 140 }: { children: ReactNode; style?: StyleProp<ViewStyle>; onLayout?: (e: any) => void; delay?: number }) {
  return (
    <FadeUp distance={56} delay={delay} duration={380} style={[{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#1A0650', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 }, style]}>
      <View onLayout={onLayout} style={{ flexGrow: 1 }}>{children}</View>
    </FadeUp>
  );
}

const SLIDE_KEYS = ['slide0', 'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6'] as const;
const N = SLIDE_KEYS.length;

/** one card of the ring; all motion is derived from the shared `pos` on the UI thread */
function RingCard({ i, pos, cw, h, spacing, onPick }: { i: number; pos: SharedValue<number>; cw: number; h: number; spacing: number; onPick: (i: number) => void }) {
  const st = useAnimatedStyle(() => {
    // signed distance (in cards) from the front, wrapped to [-N/2, N/2]
    let d = (i - pos.value) % N;
    if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    const a = Math.abs(d), c = Math.min(a, 1);
    const sc = 1 - 0.25 * c - 0.06 * Math.min(Math.max(a - 1, 0), 1);
    const sign = d < 0 ? -1 : 1;
    // first step is wide, later steps tuck behind it
    const x = sign * spacing * (Math.min(a, 1) + 0.55 * Math.min(Math.max(a - 1, 0), 2));
    return {
      opacity: a >= 2.6 ? 0 : 1 - 0.55 * c - 0.3 * Math.min(Math.max(a - 1, 0), 1.6),
      zIndex: Math.round(100 - a * 10),
      transform: [{ perspective: 700 }, { translateX: x }, { scale: sc }, { rotateY: sign * Math.min(a, 1.2) * 32 + 'deg' }],
    };
  });
  // dim overlay grows with distance
  const dim = useAnimatedStyle(() => {
    let d = (i - pos.value) % N;
    if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    return { opacity: Math.min(Math.abs(d), 1) * 0.35 };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, width: cw, height: h }, st]}>
      <Pressable onPress={() => onPick(i)} accessibilityRole="image" accessibilityLabel={'Washer photo ' + (i + 1)} style={{ flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Image source={src(SLIDE_KEYS[i])!} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#1A0650' }, dim]} />
      </Pressable>
    </Animated.View>
  );
}

/** touch-scrollable 3D ring of the real washer photos: drag/fling to rotate (infinite, snaps to one centred photo),
    centre photo biggest, neighbours smaller/tilted/dimmed, tap a side photo to bring it front, gentle auto-rotate
    (off with reduced motion). Only horizontal drags are claimed, so page scroll and the keyboard are untouched. */
export function PhotoStrip({ width, h = 132, autoMs = 3000 }: { width: number; h?: number; autoMs?: number }) {
  const rm = useRM(), active = useActive();
  const cw = Math.round(h * 1.05), spacing = Math.min(cw * 0.78, (width - cw) / 2 - 6);
  const pos = useSharedValue(0);
  const last = useRef(0), start = useRef(0), dragging = useRef(false);
  const snapTo = (t: number, ms = 420) => { pos.value = withTiming(t, { duration: ms, easing: Easing.out(Easing.cubic) }); };
  const touch = () => { last.current = Date.now(); };
  const pick = (i: number) => {
    touch();
    let d = (i - pos.value) % N; if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
    if (Math.abs(d) > 0.01) snapTo(Math.round(pos.value + d));
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { touch(); dragging.current = true; cancelAnimation(pos); start.current = pos.value; },
    onPanResponderMove: (_, g) => { pos.value = start.current - g.dx / spacing; },
    onPanResponderRelease: (_, g) => { dragging.current = false; touch(); snapTo(Math.round(start.current - (g.dx + g.vx * 180) / spacing), 480); },
    onPanResponderTerminate: () => { dragging.current = false; touch(); snapTo(Math.round(pos.value)); },
  }), [spacing]);
  useEffect(() => {
    if (rm || !active) return;
    const t = setInterval(() => {
      if (dragging.current || Date.now() - last.current < 4500) return;
      snapTo(Math.round(pos.value) + 1, 700);
    }, autoMs);
    return () => clearInterval(t);
  }, [rm, autoMs, active]);
  return (
    <FadeUp delay={120} style={{ width, height: h + 8 }}>
      <View {...pan.panHandlers} onTouchStart={touch} style={{ width, height: h + 8, alignItems: 'center', paddingTop: 4 }}>
        <View style={{ width: cw, height: h }}>
          {SLIDE_KEYS.map((_, i) => <RingCard key={i} i={i} pos={pos} cw={cw} h={h} spacing={spacing} onPick={pick} />)}
        </View>
      </View>
    </FadeUp>
  );
}

export const BrandLogo = ({ w = 104 }: { w?: number }) => <Image source={src('logo')!} resizeMode="contain" accessibilityLabel="Washing Daddy" style={{ width: w, height: w * 157 / 260 }} />;
