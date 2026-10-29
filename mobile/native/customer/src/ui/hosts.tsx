// Toast, bottom sheet and confetti hosts plus haptic(). Mount <ToastHost/>, <SheetHost/>, <ConfettiHost/> once at the app root
// (last children of a flex:1 view); call toast(), openSheet(), confetti() from anywhere.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Pressable, ScrollView, KeyboardAvoidingView, BackHandler, PanResponder, StyleSheet, useWindowDimensions, Dimensions, AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, InkContext, useTheme } from '../theme';
import { Txt, Btn, useInsets } from './kit';
import { Check } from './icons';

const chan = <T,>() => { const s = new Set<(v: T) => void>(); return { on: (f: (v: T) => void) => { s.add(f); return () => { s.delete(f); }; }, emit: (v: T) => s.forEach(f => f(v)) }; };

export function haptic() { try { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {} }

/* ---------- toast ---------- */
const toasts = chan<string>();
export const toast = (msg: string) => toasts.emit(msg);
export function ToastHost() {
  const ins = useInsets(), [msg, setMsg] = useState<string | null>(null), y = useRef(new Animated.Value(-140)).current;
  useEffect(() => toasts.on(m => {
    setMsg(m); y.setValue(-140);
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(1920),
      Animated.timing(y, { toValue: -140, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setMsg(null); });
  }), []);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: ins.top + 10, left: 16, right: 16, alignItems: 'center', zIndex: 2000, elevation: 2000 }}>
      <Animated.View style={{ transform: [{ translateY: y }], backgroundColor: C.ink, borderRadius: 999, borderWidth: 2, borderColor: C.gold, paddingVertical: 12, paddingHorizontal: 20, maxWidth: 420 }}>
        <Txt weight={600} size={14} color={C.cream} style={{ textAlign: 'center' }}>{msg}</Txt>
      </Animated.View>
    </View>
  );
}

/* ---------- sheet ---------- */
type SheetOpts = { dismissable?: boolean; onClose?: () => void };
type Item = { node: ReactNode; opts: SheetOpts };
const sheetOpenCh = chan<Item>(), sheetCloseCh = chan<void>();
let isOpen = false;
export const openSheet = (node: ReactNode, opts: SheetOpts = {}) => { isOpen = true; sheetOpenCh.emit({ node, opts }); };
export const closeSheet = () => { isOpen = false; sheetCloseCh.emit(); };
export const sheetOpen = () => isOpen;

export function SheetHost() {
  const T = useTheme(), ins = useInsets(), [it, setIt] = useState<Item | null>(null), cur = useRef<Item | null>(null);
  const ty = useRef(new Animated.Value(1000)).current, sc = useRef(new Animated.Value(0)).current;
  cur.current = it;
  const out = useRef(() => {
    const o = cur.current?.opts; isOpen = false;
    Animated.parallel([
      Animated.timing(ty, { toValue: Dimensions.get('window').height, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sc, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) { setIt(null); o?.onClose?.(); } });
  }).current;
  const dismiss = () => { if (cur.current?.opts.dismissable !== false) out(); };
  useEffect(() => {
    const a = sheetOpenCh.on(n => {
      if (!cur.current) ty.setValue(Dimensions.get('window').height);
      setIt(n);
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    });
    return () => a();
  }, []);
  useEffect(() => sheetCloseCh.on(() => { if (cur.current) out(); }), []);
  useEffect(() => {
    if (!it) return;
    const s = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(); return true; });
    return () => s.remove();
  }, [!!it]);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
    onPanResponderRelease: (_, g) => { if (g.dy > 90 || g.vy > 0.9) dismiss(); else Animated.spring(ty, { toValue: 0, useNativeDriver: true }).start(); },
    onPanResponderTerminate: () => { Animated.spring(ty, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;
  if (!it) return null;
  const edge = T.day ? C.ink : 'rgba(255,246,233,.22)', bw = T.day ? 3 : 1;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,7,36,.6)', opacity: sc }]}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: ty }], maxHeight: '92%', backgroundColor: T.sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: bw, borderBottomWidth: 0, borderColor: edge, overflow: 'hidden' }}>
          <View {...pan.panHandlers} style={{ paddingTop: 10, paddingBottom: 12, alignItems: 'center' }}>
            <View style={{ width: 46, height: 5, borderRadius: 3, backgroundColor: T.card.fg3, opacity: 0.6 }} />
          </View>
          <InkContext.Provider value={T.card}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + ins.bottom }}>
              {it.node}
            </ScrollView>
          </InkContext.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
export const SheetTitle = ({ children }: { children: ReactNode }) => <Txt font="shout" size={34} upper style={{ marginBottom: 4 }}>{children}</Txt>;
export const SheetSub = ({ children }: { children: ReactNode }) => <Txt size={14} color={useTheme().card.fg2} style={{ marginBottom: 14 }}>{children}</Txt>;

export function Success({ title, sub }: { title: string; sub?: string }) {
  const s = useRef(new Animated.Value(0)).current, fg2 = useTheme().card.fg2;
  useEffect(() => { Animated.spring(s, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start(); confetti(); haptic(); }, []);
  return (
    <View style={{ alignItems: 'center', paddingTop: 6 }}>
      <Animated.View style={{ transform: [{ scale: s }], width: 84, height: 84, borderRadius: 42, backgroundColor: C.mint, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Check size={40} color={C.white} />
      </Animated.View>
      <Txt font="shout" size={34} upper style={{ textAlign: 'center' }}>{title}</Txt>
      {sub ? <Txt size={14} color={fg2} style={{ textAlign: 'center', maxWidth: 300, marginTop: 6, marginBottom: 18 }}>{sub}</Txt> : <View style={{ height: 18 }} />}
      <Btn label="Done" onPress={closeSheet} />
    </View>
  );
}

/* ---------- confetti ---------- */
const confs = chan<number>();
export const confetti = () => { AccessibilityInfo.isReduceMotionEnabled().then(rm => { if (!rm) confs.emit(Date.now()); }, () => confs.emit(Date.now())); };
const COLORS = ['#FFBA08', '#5409DA', '#FF6A1A', '#2E8BFF', '#2EE6A6', '#FFF6E9'];
type Bit = { x: number; w: number; h: number; color: string; delay: number; dur: number; rot: number; sway: number; round: boolean };
const mkBits = (): Bit[] => Array.from({ length: 80 }, () => ({
  x: Math.random(), w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, color: COLORS[Math.floor(Math.random() * COLORS.length)], delay: Math.random() * 700,
  dur: 1800 + Math.random() * 1500, rot: (Math.random() - 0.5) * 1440, sway: (Math.random() - 0.5) * 80, round: Math.random() < 0.25,
}));
function Piece({ b, W, H }: { b: Bit; W: number; H: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(t, { toValue: 1, duration: b.dur, delay: b.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: b.x * W, top: 0, width: b.w, height: b.h, borderRadius: b.round ? b.w / 2 : 1.5, backgroundColor: b.color,
      opacity: t.interpolate({ inputRange: [0, 0.01, 0.85, 1], outputRange: [0, 1, 1, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-30, H + 30] }) },
        { translateX: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, b.sway, 0, -b.sway, 0] }) },
        { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.rot}deg`] }) }] }} />
  );
}
export function ConfettiHost() {
  const { width: W, height: H } = useWindowDimensions(), [run, setRun] = useState<{ k: number; bits: Bit[] } | null>(null), tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => confs.on(k => { setRun({ k, bits: mkBits() }); clearTimeout(tm.current); tm.current = setTimeout(() => setRun(null), 3800); }), []);
  useEffect(() => () => clearTimeout(tm.current), []);
  if (!run) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 3000, elevation: 3000, overflow: 'hidden' }]}>{run.bits.map((b, i) => <Piece key={run.k + '_' + i} b={b} W={W} H={H} />)}</View>;
}
