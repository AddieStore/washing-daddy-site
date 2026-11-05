// Shared bits for the Service, Cart and Schedule pages (Pronto structure, Washing Daddy violet).
import React, { ReactNode, useEffect, useRef } from 'react';
import { View, Pressable, Image, Animated, Easing, Platform, Share, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Check, Plus, Share as ShareIc, Chev } from '../ui/icons';
import { src } from '../img';
import { svcLines, svcOf, openPage, haptic, confetti } from '../state';
import { PACKS } from '../data/reference';

export const G = { line: '#ECEAF2', sub: '#6B6580', tint: '#F1EBFF', tint2: '#F7F3FF', violet: C.violet };
export const card = (extra?: object): ViewStyle => ({ backgroundColor: '#fff', borderWidth: 1, borderColor: G.line, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1, ...extra });

/** photo of a service or pack id */
export function imgOf(id: string): string {
  const s = svcOf(id); if (s) return s.img;
  const p = PACKS.find(x => x.id === id); return p ? p.img : 'foam';
}
export function tintOf(id: string) { const s = svcOf(id); return s ? s.tint : '#F3ECFF' }

export function Photo({ id, style, radius = 12 }: { id: string; style?: StyleProp<ViewStyle>; radius?: number }) {
  return <View pointerEvents="none" style={[{ backgroundColor: tintOf(id), borderRadius: radius, overflow: 'hidden' }, style]}><Image source={src(imgOf(id)) as any} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></View>;
}

export function Circle({ children, onPress, style, label }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, style]}>{children}</Pressable>;
}
export const BackCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Back" onPress={onPress}><Back size={20} color={C.ink} /></Circle>;
export const ShareCircle = ({ onPress }: { onPress: () => void }) => <Circle label="Share" onPress={onPress}><ShareIc size={19} color={C.ink} /></Circle>;

export function Bolt({ size = 22 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M13.5 2L4.5 13.5h6L9.5 22l9-12h-6z" fill={C.gold} stroke="#E09B00" strokeWidth={1} strokeLinejoin="round" /></Svg>;
}

/** Pronto "+" square that becomes a "− n +" stepper */
export function AddBtn({ qty, onAdd, onSub, size = 'sm', unit }: { qty: number; onAdd: () => void; onSub: () => void; size?: 'sm' | 'lg'; unit?: string }) {
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.sequence([Animated.timing(sc, { toValue: 1.08, duration: 90, useNativeDriver: Platform.OS !== 'web' }), Animated.spring(sc, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' })]).start() }, [qty]);
  const lg = size === 'lg';
  if (!qty) return (
    <Pressable accessibilityLabel="Add" onPress={onAdd} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9CCF7', alignItems: 'center', justifyContent: 'center', shadowColor: C.violet, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <Plus size={18} color={C.violet} />
    </Pressable>
  );
  return (
    <Animated.View style={{ transform: [{ scale: sc }], alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: lg ? 40 : 34, minWidth: lg ? 96 : 84, borderRadius: 10, backgroundColor: G.tint, borderWidth: 1, borderColor: '#CDB9F7', justifyContent: 'space-between', paddingHorizontal: 6 }}>
        <Pressable onPress={onSub} hitSlop={8} style={{ width: 24, alignItems: 'center' }}><Txt weight={700} size={18} color={C.violet} style={{ lineHeight: 22 }}>{'−'}</Txt></Pressable>
        <Txt weight={600} size={lg ? 15 : 14} color={C.violet}>{qty}</Txt>
        <Pressable onPress={onAdd} hitSlop={8} style={{ width: 24, alignItems: 'center' }}><Txt weight={700} size={18} color={C.violet} style={{ lineHeight: 22 }}>+</Txt></Pressable>
      </View>
      {unit ? <Txt size={10} color={G.sub} style={{ marginTop: 2 }}>{unit}</Txt> : null}
    </Animated.View>
  );
}

export function PrimaryBtn({ label, onPress, disabled, busy, style, outline, small }: { small?: boolean; label: string; onPress?: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; outline?: boolean }) {
  const off = disabled || busy;
  return (
    <Pressable disabled={off} onPress={onPress} style={({ pressed }) => [{ height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: outline ? '#fff' : disabled ? '#DCD9E3' : C.violet, borderWidth: outline ? 1.5 : 0, borderColor: C.violet, opacity: pressed || busy ? 0.85 : 1 }, style]}>
      <Txt weight={600} size={small ? 14 : 15} numberOfLines={1} color={outline ? C.violet : disabled ? '#fff' : '#fff'}>{busy ? 'Please wait…' : label}</Txt>
    </Pressable>
  );
}

/** sticky "N services ⌃ · Go to cart" bar (own copy: shown on the service page, which has no tab bar) */
export function CartBar({ bottom }: { bottom?: number }) {
  const ins = useInsets(), { lines, count } = svcLines(), y = useRef(new Animated.Value(count ? 0 : 90)).current;
  useEffect(() => { Animated.timing(y, { toValue: count ? 0 : 90, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start() }, [count > 0]);
  const first = lines[0];
  return (
    <Animated.View pointerEvents={count ? 'auto' : 'none'} style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, bottom: bottom ?? 0, opacity: count ? 1 : 0, transform: [{ translateY: y }], backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingTop: 12, paddingBottom: (bottom ? 12 : Math.max(ins.bottom, 10) + 4), paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -3 } }}>
      <Pressable onPress={() => openPage({ k: 'cart' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {first ? <Photo id={first.id} radius={6} style={{ width: 24, height: 24 }} /> : null}
        <Txt weight={500} size={15}>{count} {count === 1 ? 'service' : 'services'}</Txt>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><Chev size={16} color={C.ink} /></View>
      </Pressable>
      <Pressable onPress={() => openPage({ k: 'cart' })} style={({ pressed }) => [{ height: 48, width: 160, borderRadius: 12, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.88 : 1 }]}>
        <Txt weight={600} size={15.5} color="#fff">Go to cart</Txt>
      </Pressable>
    </Animated.View>
  );
}

/** full-screen confirmation: spring tick, then onDone */
export function SuccessTick({ title, sub, onDone }: { title: string; sub?: string; onDone: () => void }) {
  const s = useRef(new Animated.Value(0)).current, o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const nd = Platform.OS !== 'web';
    Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: nd }).start();
    Animated.spring(s, { toValue: 1, friction: 5, tension: 80, useNativeDriver: nd }).start();
    haptic(); confetti();
    const t = setTimeout(onDone, 1900); return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 50, opacity: o, backgroundColor: C.violet2, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={{ transform: [{ scale: s }], width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={50} color={C.violet} />
      </Animated.View>
      <Txt weight={700} size={22} color="#fff" style={{ marginTop: 22, textAlign: 'center' }}>{title}</Txt>
      {sub ? <Txt size={14} color="rgba(255,255,255,.75)" style={{ marginTop: 6, textAlign: 'center' }}>{sub}</Txt> : null}
    </Animated.View>
  );
}
export { Share };
