// Booking / cart helpers (W4): PopTile (selected tile pops), OfferStrip (pass offer above a sheet CTA), CartCoach (one-time coach mark),
// Policies (accordion), SavingsStrip (green "you are saving"). Soft-touch motion only; no payment logic.
import React, { useEffect, useState, type ReactNode } from 'react';
import { View, Pressable, Text, type StyleProp, type ViewStyle, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Reanimated, { type SharedValue, Easing, useAnimatedProps, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay, useReducedMotion } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../theme';
import { Txt } from './kit';
import { Chev, Check, Gift } from './icons';
import { SPRING, FadeUp } from './motion';
import { haptic, feature, passView, openPage, closeSheet } from '../state';
import { G, inr } from '../pages/parts';

/** selectable tile: spring press-in, and a small pop each time it becomes selected */
export function PopTile({ on, onPress, disabled, style, children, label, role = 'button' }: {
  on?: boolean; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode; label?: string; role?: 'button' | 'tab' | 'radio';
}) {
  const rm = useReducedMotion(), s = useSharedValue(1), first = React.useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (on && !rm) s.value = withSequence(withTiming(1.04, { duration: 110 }), withSpring(1, SPRING.pop));
  }, [on]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const f = StyleSheet.flatten(style) || {};
  const outer: ViewStyle = { width: f.width, flex: f.flex, flexGrow: f.flexGrow, alignSelf: f.alignSelf };
  const { width: _w, flex: _f, flexGrow: _g, alignSelf: _a, ...inner } = f as any; if (f.width) inner.width = '100%';
  return (
    <Pressable style={outer} disabled={disabled} accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ selected: !!on, disabled: !!disabled }}
      onPressIn={() => { if (!rm) s.value = withSpring(0.95, SPRING.press) }} onPressOut={() => { if (!on || rm) s.value = rm ? 1 : withSpring(1, SPRING.release) }}
      onPress={() => { haptic(); onPress?.() }}>
      <Reanimated.View style={[inner, st]}>{children}</Reanimated.View>
    </Pressable>
  );
}

/** sticky offer strip above a sheet CTA: "WD Pass · 3 washes for ₹199 · View". Hidden when passes are off or already owned. */
export function OfferStrip({ style }: { style?: StyleProp<ViewStyle> }) {
  const pv = passView(), p = pv.plans[0];
  if (!feature('pass') || pv.active || !p) return null;
  return (
    <FadeUp delay={120} distance={10} style={style}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.visits} washes for ${inr(p.price)}. View`} onPress={() => { haptic(); closeSheet(); openPage({ k: 'pass', id: p.id }) }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(84,9,218,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(84,9,218,0.14)', paddingVertical: 10, paddingHorizontal: 12 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Gift size={16} color="#fff" strokeWidth={1.6} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={600} size={13} color={C.violet} numberOfLines={1}>{p.name} · {p.visits} washes for {inr(p.price)}</Txt>
          <Txt size={11} color={G.sub} numberOfLines={1}>Save {inr(Math.max(0, p.mrp - p.price))} on your next washes</Txt>
        </View>
        <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={12} color="#fff">View</Txt></View>
      </Pressable>
    </FadeUp>
  );
}

/** green "You are saving ₹X on this order" strip that slides in */
export function SavingsStrip({ amount, style }: { amount: number; style?: StyleProp<ViewStyle> }) {
  if (!(amount > 0)) return null;
  return (
    <FadeUp distance={8} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(22,163,74,0.10)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }, style]}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: G.pos, alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#fff" strokeWidth={2.4} /></View>
      <Txt weight={500} size={13} color="#15803D" style={{ flex: 1 }}>You are saving <Txt weight={700} size={13} color="#15803D">{inr(amount)}</Txt> on this order</Txt>
    </FadeUp>
  );
}

/** accordion rows (one open at a time) */
export function Policies({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(-1);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#1A1033', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
      {items.map(([t, d], i) => <PolicyRow key={t} t={t} d={d} first={!i} open={open === i} onPress={() => { haptic(); setOpen(open === i ? -1 : i) }} />)}
    </View>
  );
}
function PolicyRow({ t, d, first, open, onPress }: { t: string; d: string; first: boolean; open: boolean; onPress: () => void }) {
  const rm = useReducedMotion(), r = useSharedValue(0);
  useEffect(() => { r.value = rm ? (open ? 1 : 0) : withSpring(open ? 1 : 0, SPRING.press) }, [open]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: 90 - 180 * r.value + 'deg' }] }));
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: G.line }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt weight={500} size={14} style={{ flex: 1 }}>{t}</Txt>
        <Reanimated.View style={st}><Chev size={16} color={G.mute} strokeWidth={1.5} /></Reanimated.View>
      </Pressable>
      {open ? <FadeUp distance={4} duration={200}><Txt size={13} color={G.sub} style={{ paddingHorizontal: 16, paddingBottom: 14, lineHeight: 19 }}>{d}</Txt></FadeUp> : null}
    </View>
  );
}

/* ---------- one-time cart coach mark: deep dim, hand-drawn arrow, then title, body and button rise in 80 ms apart ---------- */
const COACH_KEY = 'wd-cart-coach-v1';   // AsyncStorage: UI flag only
const AP = Reanimated.createAnimatedComponent(Path);
function Stage({ i, v, children }: { i: number; v: SharedValue<number>; children: ReactNode }) {
  const st = useAnimatedStyle(() => { const t = Math.min(1, Math.max(0, v.value * 4 - i * 0.8 * 0.5)); return { opacity: t, transform: [{ translateY: (1 - t) * 12 }] } });
  return <Reanimated.View style={st}>{children}</Reanimated.View>;
}
export function CartCoach({ top }: { top: number }) {
  const rm = useReducedMotion(), [show, setShow] = useState(false), dimV = useSharedValue(0), v = useSharedValue(0), draw = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(COACH_KEY).then(x => { if (alive && !x) setShow(true) }).catch(() => {});
    return () => { alive = false };
  }, []);
  useEffect(() => {
    if (!show) return;
    if (rm) { dimV.value = 1; v.value = 1; draw.value = 1; return }
    dimV.value = withTiming(1, { duration: 250 });
    draw.value = withDelay(500, withTiming(1, { duration: 350 }));
    v.value = withDelay(650, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [show]);
  const dim = useAnimatedStyle(() => ({ opacity: dimV.value }));
  const ap = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.value) * 90 }));
  if (!show) return null;
  const close = () => { try { AsyncStorage.setItem(COACH_KEY, '1').catch(() => {}) } catch (e) {} dimV.value = rm ? 0 : withTiming(0, { duration: 180 }); setTimeout(() => setShow(false), rm ? 0 : 190) };
  return (
    <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(30,10,40,0.78)', zIndex: 50, paddingTop: top, paddingHorizontal: 32 }, dim]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" />
      <View pointerEvents="box-none" style={{ alignItems: 'flex-start' }}>
        <Svg width={70} height={64} viewBox="0 0 70 64" style={{ marginLeft: 28 }}>
          <AP d="M10 60 C 4 36, 20 14, 52 8 M52 8 L40 2 M52 8 L44 20" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="90" animatedProps={ap} />
        </Svg>
        <Stage i={0} v={v}><Txt weight={700} size={20} color="#fff" style={{ marginTop: 6 }}>Introducing your cart</Txt></Stage>
        <Stage i={1} v={v}><Txt size={14} color="rgba(255,255,255,0.85)" style={{ marginTop: 6, lineHeight: 20 }}>Review your services, switch between instant, scheduled and repeating, see your savings and pay, all in one place.</Txt></Stage>
        <Stage i={2} v={v}>
          <Pressable accessibilityRole="button" onPress={close} style={{ marginTop: 18, height: 44, paddingHorizontal: 28, borderRadius: 22, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={15} color="#fff">Got it</Txt></Pressable>
        </Stage>
      </View>
    </Reanimated.View>
  );
}

/** drop-in for Pressable on selectable tiles: reads accessibilityState.selected as "on" */
export function PopPress({ accessibilityRole, accessibilityState, accessibilityLabel, disabled, onPress, style, children }: {
  accessibilityRole?: 'button' | 'tab' | 'radio'; accessibilityState?: { selected?: boolean; disabled?: boolean }; accessibilityLabel?: string; disabled?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  return <PopTile on={accessibilityState?.selected} disabled={disabled} onPress={onPress} style={style} label={accessibilityLabel} role={accessibilityRole}>{children}</PopTile>;
}
