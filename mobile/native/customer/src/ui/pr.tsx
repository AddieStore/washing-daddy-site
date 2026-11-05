// Pronto-style building blocks local to Store, Profile and the sheets (white page, tinted rounded cards, violet accents).
// Worker A's kit.tsx has the shared versions; these stay light-theme only so the three files do not depend on kit order.
import React, { ReactNode, Children, Fragment, useRef } from 'react';
import { View, Pressable, PressableProps, ScrollView, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { C, SP, InkContext, creamInk } from '../theme';
import { Txt, useInsets } from './kit';
import { Chev, Close } from './icons';

type VS = StyleProp<ViewStyle>;
export const P = {
  bg: '#FFFFFF', card: '#FFFFFF', raised: '#F4F4F5', tint: '#F4F4F5', tint2: '#F4F4F5', line: 'rgba(23,23,23,0.08)', ink: '#171717', grey: '#525252', muted: '#737373',
  violet: C.violet, deep: '#171717', gold: C.gold, ok: '#16a34a', red: '#dc2626',
};
export const NUM = { fontVariant: ['tabular-nums'] } as const;
// press feedback: scale 0.98 over 120ms on one curve
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const APressable = Animated.createAnimatedComponent(Pressable);
export function Tap({ children, style, onPress, disabled, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const k = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(k, { toValue: v, duration: 120, easing: EASE, useNativeDriver: true }).start();
  return (
    <APressable {...rest} disabled={disabled} onPress={onPress} onPressIn={() => to(0.98)} onPressOut={() => to(1)} style={[style as any, { transform: [{ scale: k }] }]}>
      {children}
    </APressable>
  );
}
export const Light = ({ children }: { children: ReactNode }) => <InkContext.Provider value={creamInk}>{children}</InkContext.Provider>;

export function PCard({ children, style, onPress, tint, pad = SP.l }: { children?: ReactNode; style?: VS; onPress?: () => void; tint?: boolean; pad?: number }) {
  const box: ViewStyle = { backgroundColor: tint ? P.raised : P.card, borderWidth: tint ? 0 : 1, borderColor: P.line, borderRadius: 14, padding: pad, overflow: 'hidden' };
  return onPress ? <Tap onPress={onPress} style={[box, style]}>{children}</Tap> : <View style={[box, style]}>{children}</View>;
}
export function PBtn({ label, onPress, busy, disabled, icon, style }: { label: string; onPress?: () => void; busy?: string | boolean; disabled?: boolean; icon?: ReactNode; style?: VS; tone?: 'violet' | 'gold' }) {
  const off = !!busy || !!disabled;
  return (
    <Tap disabled={off} onPress={onPress} style={[{ minHeight: 48, borderRadius: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: disabled ? '#E4E4E7' : P.violet, opacity: busy ? 0.8 : 1, alignSelf: 'stretch' }, style]}>
      {icon}<Txt weight={500} size={15} color={disabled ? P.muted : '#FFFFFF'}>{typeof busy === 'string' ? busy : label}</Txt>
    </Tap>
  );
}
export function POutline({ label, onPress, style, danger }: { label: string; onPress?: () => void; style?: VS; danger?: boolean }) {
  return (
    <Tap onPress={onPress} style={[{ minHeight: 48, borderRadius: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.line, backgroundColor: '#FFFFFF', alignSelf: 'stretch' }, style]}>
      <Txt weight={500} size={15} color={danger ? P.red : P.ink}>{label}</Txt>
    </Tap>
  );
}
export function PTag({ label, tone = 'grey', style }: { label: string; tone?: 'violet' | 'gold' | 'ok' | 'grey'; style?: VS }) {
  const fg = { violet: P.violet, gold: P.grey, ok: P.ok, grey: P.grey }[tone];
  return <View style={[{ alignSelf: 'flex-start', backgroundColor: P.raised, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }, style]}><Txt weight={500} size={12} color={fg}>{label}</Txt></View>;
}
export function PChip({ label, on, onPress, off, style, sub }: { label: string; on?: boolean; onPress?: () => void; off?: boolean; style?: VS; sub?: string }) {
  return (
    <Tap disabled={off} onPress={onPress} style={[{ minHeight: 40, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? P.violet : P.line, backgroundColor: '#FFFFFF', opacity: off ? 0.4 : 1 }, style]}>
      <Txt weight={on ? 600 : 400} size={14} color={on ? P.violet : P.ink}>{label}</Txt>
      {sub ? <Txt size={12} color={P.muted}>{sub}</Txt> : null}
    </Tap>
  );
}
type Opt = string | { key: string; label: string; sub?: string; off?: boolean };
const kl = (o: Opt) => (typeof o === 'string' ? { key: o, label: o, sub: undefined, off: false } : { off: false, sub: undefined, ...o });
/** wrapping chip group; scroll = single horizontal row */
export function PChips({ items, value, onChange, multi, scroll }: { items: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean; scroll?: boolean }) {
  const sel = (k: string) => (Array.isArray(value) ? value.includes(k) : value === k);
  const tap = (k: string) => onChange(multi ? (sel(k) ? (value as string[]).filter(x => x !== k) : [...(value as string[]), k]) : k);
  const kids = items.map(kl).map(o => <PChip key={o.key} label={o.label} sub={o.sub} off={o.off} on={sel(o.key)} onPress={() => tap(o.key)} />);
  return scroll
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: SP.s, marginBottom: SP.l }} contentContainerStyle={{ gap: SP.s, paddingRight: SP.s }}>{kids}</ScrollView>
    : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.s, marginTop: SP.s, marginBottom: SP.l }}>{kids}</View>;
}
/** segmented control: grey track, white selected segment with a hairline, accent text */
export function PSeg({ items, value, onChange, style }: { items: Opt[]; value: string; onChange: (v: string) => void; style?: VS }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: P.raised, borderRadius: 10, padding: 4, gap: 4, marginTop: SP.s, marginBottom: SP.l }, style]}>
      {items.map(kl).map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} disabled={o.off} onPress={() => onChange(o.key)} style={{ flexGrow: 1, minHeight: 40, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#FFFFFF' : 'transparent', borderWidth: on ? 1 : 0, borderColor: P.line, opacity: o.off ? 0.35 : 1 }}>
            <Txt weight={on ? 600 : 400} size={14} color={on ? P.violet : P.grey}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
/** stepper: bordered, - qty + */
export function PStepper({ q, onMinus, onPlus }: { q: number; onMinus: () => void; onPlus: () => void }) {
  const b = (l: string, f: () => void, a: string) => <Pressable accessibilityLabel={a} onPress={f} hitSlop={6} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Txt weight={400} size={20} color={P.ink}>{l}</Txt></Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.line }}>{b('−', onMinus, 'One fewer')}<Txt weight={500} size={15} color={P.ink} style={[{ minWidth: 24, textAlign: 'center' }, NUM]}>{q}</Txt>{b('+', onPlus, 'One more')}</View>;
}
export function PRows({ children, style }: { children: ReactNode; style?: VS }) {
  const kids = Children.toArray(children).filter(Boolean);
  return <View style={[{ backgroundColor: P.card, borderWidth: 1, borderColor: P.line, borderRadius: 14, overflow: 'hidden' }, style]}>{kids.map((k, i) => <Fragment key={i}>{i > 0 && <View style={{ height: 1, backgroundColor: P.line, marginLeft: SP.l }} />}{k}</Fragment>)}</View>;
}
export function PRow({ icon, tile, title, sub, right, chev, onPress, danger }: { icon?: ReactNode; tile?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; chev?: boolean; onPress?: () => void; danger?: boolean }) {
  const body = (pressed: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8, paddingHorizontal: SP.l, backgroundColor: pressed ? P.raised : undefined }}>
      {icon != null && <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>{typeof icon === 'string' ? <Txt weight={500} color={P.muted}>{icon}</Txt> : icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt weight={500} size={15} color={danger ? P.red : P.ink} style={{ lineHeight: 20 }}>{title}</Txt> : title}
        {sub != null && (typeof sub === 'string' ? <Txt size={13} color={P.muted} style={{ lineHeight: 18, marginTop: 2 }}>{sub}</Txt> : sub)}
      </View>
      {right != null && (typeof right === 'string' ? <Txt weight={500} size={14} style={NUM}>{right}</Txt> : right)}
      {chev && <Chev size={18} color={P.muted} strokeWidth={1.5} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{({ pressed }) => body(pressed)}</Pressable> : body(false);
}
export function PHead({ title, right, onRight, sub, style }: { title: string; right?: string; onRight?: () => void; sub?: string; style?: VS }) {
  return (
    <View style={[{ marginBottom: SP.m }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Txt weight={500} size={18} color={P.ink} style={{ flexShrink: 1 }}>{title}</Txt>
        {right ? <Pressable disabled={!onRight} onPress={onRight} hitSlop={10}><Txt weight={500} size={14} color={onRight ? P.violet : P.muted}>{right}</Txt></Pressable> : null}
      </View>
      {sub ? <Txt size={13} color={P.muted} style={{ marginTop: 4 }}>{sub}</Txt> : null}
    </View>
  );
}
export function PTop({ title, left, right, sub }: { title?: string; left?: ReactNode; right?: ReactNode; sub?: string }) {
  const ins = useInsets();
  return (
    <View style={{ backgroundColor: '#FFFFFF', paddingTop: ins.top + SP.s, paddingBottom: SP.m, paddingHorizontal: SP.page, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <Txt weight={500} size={24} color={P.ink}>{title}</Txt> : null}
        {sub ? <Txt size={13} color={P.muted} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
export function PIconBtn({ children, onPress, label, badge }: { children: ReactNode; onPress?: () => void; label?: string; badge?: number; tint?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.line }}>
      {children}
      {badge ? <View style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: P.violet, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={12} color="#FFFFFF" style={NUM}>{String(badge)}</Txt></View> : null}
    </Pressable>
  );
}
export { Close };
