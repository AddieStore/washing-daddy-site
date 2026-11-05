// Shared bits for the Service, Cart and Schedule pages. Quiet chrome: white surfaces, hairlines, one violet accent.
import React, { ReactNode, useEffect, useRef } from 'react';
import { View, Pressable, Image, Animated, Easing, Platform, Share, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Check, Plus, Share as ShareIc, Chev } from '../ui/icons';
import { src } from '../img';
import { svcLines, svcOf, openPage, haptic } from '../state';
import { PACKS } from '../data/reference';

const ND = Platform.OS !== 'web';
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const G = { line: 'rgba(23,23,23,0.08)', ink: '#171717', sub: '#525252', mute: '#737373', raised: '#F4F4F5', violet: C.violet, pos: '#16a34a', neg: '#dc2626' };
const SHADOW_S = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } };
const SHADOW_F = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } };
export const card = (extra?: object): ViewStyle => ({ backgroundColor: '#fff', borderWidth: 1, borderColor: G.line, borderRadius: 14, ...SHADOW_S, elevation: 1, ...extra });
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

/** Pressable with the one press feel: scale 0.98 over 120 ms */
export function Tap({ children, style, onPress, disabled, hitSlop, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; disabled?: boolean; hitSlop?: number; label?: string }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(s, { toValue: v, duration: 120, easing: EASE, useNativeDriver: ND }).start();
  const f = StyleSheet.flatten(style) || {}, outer: ViewStyle = { flex: f.flex, flexGrow: f.flexGrow, alignSelf: f.alignSelf, width: f.width };
  const { flex: _a, flexGrow: _b, flexShrink: _c, flexBasis: _d, width: _e, alignSelf: _f, ...inner } = f as any; if (f.width) inner.width = '100%';
  return (
    <Pressable style={outer} accessibilityLabel={label} disabled={disabled} hitSlop={hitSlop} onPress={onPress} onPressIn={() => to(0.98)} onPressOut={() => to(1)}>
      <Animated.View style={[inner, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** photo of a service or pack id */
export function imgOf(id: string): string {
  const s = svcOf(id); if (s) return s.img;
  const p = PACKS.find(x => x.id === id); return p ? p.img : 'foam';
}

export function Photo({ id, style, radius = 8, pad = 0 }: { id: string; style?: StyleProp<ViewStyle>; radius?: number; pad?: number }) {
  const im = String(imgOf(id)), r3d = im.startsWith('r3d');
  return <View pointerEvents="none" style={[{ backgroundColor: G.raised, borderRadius: radius, overflow: 'hidden', padding: pad }, style]}><Image source={src(im) as any} resizeMode={r3d ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} /></View>;
}

export function Circle({ children, onPress, style, label }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  return <Tap label={label} onPress={onPress} style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: G.line, alignItems: 'center', justifyContent: 'center', ...SHADOW_S }, style]}>{children}</Tap>;
}
export const BackCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Back" onPress={onPress}><Back size={18} color={G.ink} strokeWidth={1.5} /></Circle>;
export const ShareCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Share" onPress={onPress}><ShareIc size={18} color={G.ink} strokeWidth={1.5} /></Circle>;

/** "+" square that becomes a "− n +" stepper */
export function AddBtn({ qty, onAdd, onSub, size = 'sm', unit }: { qty: number; onAdd: () => void; onSub: () => void; size?: 'sm' | 'lg'; unit?: string }) {
  const lg = size === 'lg', h = lg ? 40 : 36;
  if (!qty) return (
    <Tap label="Add" onPress={onAdd} hitSlop={4} style={{ width: h, height: h, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: G.line, alignItems: 'center', justifyContent: 'center', ...SHADOW_S }}>
      <Plus size={18} color={G.violet} strokeWidth={1.5} />
    </Tap>
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: h, minWidth: lg ? 96 : 88, borderRadius: 10, backgroundColor: G.raised, justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Pressable accessibilityLabel="Remove one" onPress={onSub} hitSlop={8} style={{ width: 28, height: h, alignItems: 'center', justifyContent: 'center' }}><Txt size={18} color={G.violet} style={{ lineHeight: 22 }}>{'−'}</Txt></Pressable>
        <Txt weight={500} size={lg ? 15 : 14} style={TNUM}>{qty}</Txt>
        <Pressable accessibilityLabel="Add one" onPress={onAdd} hitSlop={8} style={{ width: 28, height: h, alignItems: 'center', justifyContent: 'center' }}><Txt size={18} color={G.violet} style={{ lineHeight: 22 }}>+</Txt></Pressable>
      </View>
      {unit ? <Txt size={12} color={G.mute} style={{ marginTop: 4 }}>{unit}</Txt> : null}
    </View>
  );
}

export function PrimaryBtn({ label, onPress, disabled, busy, style, outline, small }: { small?: boolean; label: string; onPress?: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; outline?: boolean }) {
  const off = disabled || busy, quiet = outline || disabled;
  return (
    <Tap disabled={off} onPress={onPress} style={[{ height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: quiet ? G.raised : G.violet, opacity: busy ? 0.7 : 1 }, style]}>
      <Txt weight={500} size={small ? 14 : 15} numberOfLines={1} color={disabled ? G.mute : outline ? G.ink : '#fff'}>{busy ? 'Please wait…' : label}</Txt>
    </Tap>
  );
}

/** sticky "N services · Go to cart" bar (shown on the service page, which has no tab bar) */
export function CartBar({ bottom }: { bottom?: number }) {
  const ins = useInsets(), { lines, count } = svcLines(), y = useRef(new Animated.Value(count ? 0 : 120)).current;
  useEffect(() => { Animated.timing(y, { toValue: count ? 0 : 120, duration: 300, easing: EASE, useNativeDriver: ND }).start() }, [count > 0]);
  const first = lines[0];
  return (
    <Animated.View pointerEvents={count ? 'auto' : 'none'} style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, bottom: bottom ?? 0, opacity: count ? 1 : 0, transform: [{ translateY: y }], backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingTop: 12, paddingBottom: (bottom ? 12 : Math.max(ins.bottom, 12) + 4), paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOW_F }}>
      <Pressable onPress={() => openPage({ k: 'cart' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minHeight: 48 }}>
        {first ? <Photo id={first.id} radius={8} style={{ width: 32, height: 32 }} /> : null}
        <Txt weight={500} size={15}>{count} {count === 1 ? 'service' : 'services'}</Txt>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><Chev size={18} color={G.mute} strokeWidth={1.5} /></View>
      </Pressable>
      <Tap onPress={() => openPage({ k: 'cart' })} style={{ height: 48, width: 160, borderRadius: 10, backgroundColor: G.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Txt weight={500} size={15} color="#fff">Go to cart</Txt>
      </Tap>
    </Animated.View>
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
