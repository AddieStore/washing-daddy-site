// Shared bits for the Service, Cart and Schedule pages. Quiet chrome: white surfaces, hairlines, one violet accent.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Pressable, Image, Animated, Easing, Platform, Share, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, useReducedMotion } from 'react-native-reanimated';
import { artFor, ArtBoundary } from '../art';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Check, Plus, Share as ShareIc } from '../ui/icons';
import { src } from '../img';
import { svcOf, haptic } from '../state';
import { PACKS } from '../data/reference';

const ND = Platform.OS !== 'web';
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const G = { line: 'rgba(23,23,23,0.08)', ink: '#171717', sub: '#525252', mute: '#737373', raised: '#F4F4F5', violet: C.violet, pos: '#16a34a', neg: '#dc2626' };
const SHADOW_S = { shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } };
const SHADOW_F = { shadowColor: '#1A1033', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } };
/** r5 card: white, no hairline, radius 16, soft spread shadow (Pronto). Pass borderWidth to bring an outline back for selected states. */
export const card = (extra?: object): ViewStyle => ({ backgroundColor: '#fff', borderWidth: 0, borderColor: G.line, borderRadius: 16, shadowColor: '#1A1033', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3, ...extra });
/** soft grey page behind white cards (cart, schedule, bookings, money, profile) */
export const PAGE_BG = '#F5F5F8';
const SPR_IN = { damping: 18, stiffness: 420, mass: 0.6 }, SPR_OUT = { damping: 11, stiffness: 320, mass: 0.6 };
export const TNUM: TextStyle = { fontVariant: ['tabular-nums'] };

/** '₹1,800' with Indian digit grouping */
export function inr(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const g = s.length > 3 ? s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3) : s;
  return (n < 0 ? '−' : '') + '₹' + g;
}
export function Price({ v, size = 14, weight = 500, color, strike, style }: { v: number; size?: number; weight?: 400 | 500 | 600; color?: string; strike?: boolean; style?: StyleProp<TextStyle> }) {
  return <Txt weight={weight} size={size} color={color ?? (strike ? G.mute : G.ink)} style={[TNUM, strike ? { textDecorationLine: 'line-through' } : null, style]}>{inr(v)}</Txt>;
}

/** Pressable with the one press feel: spring to 0.96, back with a small overshoot (reduced motion: no scale) */
export function Tap({ children, style, onPress, disabled, hitSlop, label, scaleTo = 0.96 }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; disabled?: boolean; hitSlop?: number; label?: string; scaleTo?: number }) {
  const rm = useReducedMotion(), s = useSharedValue(1), st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const f = StyleSheet.flatten(style) || {}, outer: ViewStyle = { flex: f.flex, flexGrow: f.flexGrow, alignSelf: f.alignSelf, width: f.width };
  const { flex: _a, flexGrow: _b, flexShrink: _c, flexBasis: _d, width: _e, alignSelf: _f, ...inner } = f as any; if (f.width) inner.width = '100%';
  return (
    <Pressable style={outer} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} hitSlop={hitSlop} onPress={onPress}
      onPressIn={() => { if (!rm) s.value = withSpring(scaleTo, SPR_IN) }} onPressOut={() => { s.value = rm ? 1 : withSpring(1, SPR_OUT) }}>
      <Reanimated.View style={[inner, st]}>{children}</Reanimated.View>
    </Pressable>
  );
}

/** photo of a service or pack id */
export function imgOf(id: string): string {
  const s = svcOf(id); if (s) return s.img;
  const p = PACKS.find(x => x.id === id); return p ? p.img : 'foam';
}

/** Service art at a fixed size: the src/art illustration when one exists for the id, else the 3D render / photo. */
export function SvcArt({ id, size, cover }: { id: string; size: number; cover?: boolean }) {
  const im = String(imgOf(id)), r3d = im.startsWith('r3d'), Art = artFor(id);
  const fallback = <Image source={src(im) as any} resizeMode={r3d && !cover ? 'contain' : 'cover'} style={{ width: size, height: size }} />;
  if (!Art || size <= 0) return fallback;
  return <ArtBoundary fallback={fallback}><View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Art size={size} /></View></ArtBoundary>;
}
/** true when the id has a drawn illustration */
export const hasArt = (id: string) => !!artFor(id);

export function Photo({ id, style, radius = 8, pad = 0 }: { id: string; style?: StyleProp<ViewStyle>; radius?: number; pad?: number }) {
  const f = StyleSheet.flatten(style) || {}, fixed = typeof f.width === 'number' && typeof f.height === 'number' ? Math.min(f.width as number, f.height as number) : 0;
  const [size, setSize] = useState(fixed);
  const Art = artFor(id);
  if (!Art) {
    const im = String(imgOf(id)), r3d = im.startsWith('r3d');
    return <View pointerEvents="none" style={[{ backgroundColor: G.raised, borderRadius: radius, overflow: 'hidden', padding: pad }, style]}><Image source={src(im) as any} resizeMode={r3d ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} /></View>;
  }
  return (
    <View pointerEvents="none" onLayout={fixed ? undefined : e => { const l = e.nativeEvent.layout; setSize(Math.min(l.width, l.height)) }}
      style={[{ backgroundColor: '#F3F0FA', borderRadius: radius, overflow: 'hidden', padding: pad, alignItems: 'center', justifyContent: 'center' }, style]}>
      {size ? <SvcArt id={id} size={Math.max(0, size - pad * 2)} /> : null}
    </View>
  );
}

export function Circle({ children, onPress, style, label }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  return <Tap label={label} onPress={onPress} scaleTo={0.88} style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1A1033', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, style]}>{children}</Tap>;
}
export const BackCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Back" onPress={onPress}><Back size={18} color={G.ink} strokeWidth={1.5} /></Circle>;
export const ShareCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Share" onPress={onPress}><ShareIc size={18} color={G.ink} strokeWidth={1.5} /></Circle>;

/** "+" square that becomes a "− n +" stepper */
export function AddBtn({ qty, onAdd, onSub, size = 'sm', unit }: { qty: number; onAdd: () => void; onSub: () => void; size?: 'sm' | 'lg'; unit?: string }) {
  const lg = size === 'lg', h = lg ? 40 : 36;
  if (!qty) return (
    <Tap label="Add" onPress={onAdd} hitSlop={4} scaleTo={0.88} style={{ width: h, height: h, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1A1033', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
      <Plus size={18} color={G.violet} strokeWidth={2} />
    </Tap>
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: h, minWidth: lg ? 96 : 88, borderRadius: 10, backgroundColor: G.violet, justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Pressable accessibilityLabel="Remove one" onPress={onSub} hitSlop={8} style={{ width: 28, height: h, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={18} color="#fff" style={{ lineHeight: 22 }}>{'−'}</Txt></Pressable>
        <Txt weight={600} size={lg ? 15 : 14} color="#fff" style={TNUM}>{qty}</Txt>
        <Pressable accessibilityLabel="Add one" onPress={onAdd} hitSlop={8} style={{ width: 28, height: h, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={18} color="#fff" style={{ lineHeight: 22 }}>+</Txt></Pressable>
      </View>
      {unit ? <Txt size={12} color={G.mute} style={{ marginTop: 4 }}>{unit}</Txt> : null}
    </View>
  );
}

export function PrimaryBtn({ label, onPress, disabled, busy, style, outline, small }: { small?: boolean; label: string; onPress?: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; outline?: boolean }) {
  const off = disabled || busy, quiet = outline || disabled;
  return (
    <Tap disabled={off} onPress={onPress} scaleTo={0.97} style={[{ height: small ? 44 : 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: quiet ? (outline ? '#fff' : '#ECEBF0') : G.violet, opacity: busy ? 0.7 : 1 },
      outline ? { borderWidth: 1, borderColor: 'rgba(23,23,23,0.12)' } : null, !quiet ? { shadowColor: G.violet, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 } : null, style]}>
      <Txt weight={600} size={small ? 14 : 16} numberOfLines={1} color={disabled ? '#9A9AA3' : outline ? G.ink : '#fff'}>{busy ? 'Please wait…' : label}</Txt>
    </Tap>
  );
}

/** full-screen confirmation: fade and rise, then onDone */
export function SuccessTick({ title, sub, onDone }: { title: string; sub?: string; onDone: () => void }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 300, easing: EASE, useNativeDriver: ND }).start();
    haptic();
    const t = setTimeout(onDone, 1900); return () => clearTimeout(t);
  }, []);
  const rise = o.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 50, opacity: o, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={{ transform: [{ translateY: rise }], alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: G.violet, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={32} color="#fff" strokeWidth={1.5} />
        </View>
        <Txt weight={500} size={22} style={{ marginTop: 24, textAlign: 'center' }}>{title}</Txt>
        {sub ? <Txt size={14} color={G.sub} style={{ marginTop: 8, textAlign: 'center', lineHeight: 20 }}>{sub}</Txt> : null}
      </Animated.View>
    </Animated.View>
  );
}
export { Share, SHADOW_F, SHADOW_S };
