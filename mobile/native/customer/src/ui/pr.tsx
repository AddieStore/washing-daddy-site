// Pronto-style building blocks local to Store, Profile and the sheets (white page, tinted rounded cards, violet accents).
// Worker A's kit.tsx has the shared versions; these stay light-theme only so the three files do not depend on kit order.
import React, { ReactNode, Children, Fragment } from 'react';
import { View, Pressable, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { C, SP, InkContext, creamInk } from '../theme';
import { Txt, useInsets } from './kit';
import { Chev, Close } from './icons';

type VS = StyleProp<ViewStyle>;
export const P = {
  bg: '#FFFFFF', card: '#F7F5FC', tint: '#EFE8FD', tint2: '#F6F1FF', line: '#E9E4F5', ink: C.ink, grey: '#6B6580', violet: C.violet, deep: '#3A06A0',
  gold: C.gold, ok: '#0E9F6E', red: '#E8384F',
};
export const Light = ({ children }: { children: ReactNode }) => <InkContext.Provider value={creamInk}>{children}</InkContext.Provider>;

export function PCard({ children, style, onPress, tint, pad = SP.l }: { children?: ReactNode; style?: VS; onPress?: () => void; tint?: boolean; pad?: number }) {
  const box: ViewStyle = { backgroundColor: tint ? P.tint2 : P.card, borderWidth: 1, borderColor: tint ? P.tint : P.line, borderRadius: 18, padding: pad, overflow: 'hidden' };
  return onPress ? <Pressable onPress={onPress} style={[box, style]}>{children}</Pressable> : <View style={[box, style]}>{children}</View>;
}
export function PBtn({ label, onPress, busy, disabled, icon, style, tone = 'violet' }: { label: string; onPress?: () => void; busy?: string | boolean; disabled?: boolean; icon?: ReactNode; style?: VS; tone?: 'violet' | 'gold' }) {
  const off = !!busy || !!disabled, gold = tone === 'gold';
  return (
    <Pressable disabled={off} onPress={onPress} style={({ pressed }) => [{ minHeight: 52, borderRadius: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: disabled ? '#D9D5E3' : gold ? C.gold : P.violet, opacity: pressed || busy ? 0.85 : 1, alignSelf: 'stretch' }, style]}>
      {icon}<Txt weight={700} size={15.5} color={disabled ? '#8C86A0' : gold ? C.ink : '#FFFFFF'}>{typeof busy === 'string' ? busy : label}</Txt>
    </Pressable>
  );
}
export function POutline({ label, onPress, style, danger }: { label: string; onPress?: () => void; style?: VS; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ minHeight: 52, borderRadius: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: danger ? '#F3B8C0' : P.line, backgroundColor: pressed ? P.card : '#FFFFFF', alignSelf: 'stretch' }, style]}>
      <Txt weight={700} size={15} color={danger ? P.red : P.violet}>{label}</Txt>
    </Pressable>
  );
}
export function PTag({ label, tone = 'violet', style }: { label: string; tone?: 'violet' | 'gold' | 'ok' | 'grey'; style?: VS }) {
  const m = { violet: [P.tint, P.violet], gold: ['#FFF3CC', '#8A5F00'], ok: ['#DDF5EA', P.ok], grey: [P.card, P.grey] }[tone];
  return <View style={[{ alignSelf: 'flex-start', backgroundColor: m[0], borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }, style]}><Txt weight={700} size={11.5} color={m[1]}>{label}</Txt></View>;
}
export function PChip({ label, on, onPress, off, style, sub }: { label: string; on?: boolean; onPress?: () => void; off?: boolean; style?: VS; sub?: string }) {
  return (
    <Pressable disabled={off} onPress={onPress} style={[{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? P.violet : P.line, backgroundColor: on ? P.tint : '#FFFFFF', opacity: off ? 0.4 : 1 }, style]}>
      <Txt weight={on ? 700 : 600} size={13.5} color={on ? P.violet : P.ink}>{label}</Txt>
      {sub ? <Txt size={11} color={P.grey}>{sub}</Txt> : null}
    </Pressable>
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
/** Pronto segmented control: grey track, white selected pill */
export function PSeg({ items, value, onChange, style }: { items: Opt[]; value: string; onChange: (v: string) => void; style?: VS }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: P.card, borderRadius: 14, padding: 4, gap: 4, marginTop: SP.s, marginBottom: SP.l, borderWidth: 1, borderColor: P.line }, style]}>
      {items.map(kl).map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} disabled={o.off} onPress={() => onChange(o.key)} style={{ flexGrow: 1, minHeight: 40, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.violet : 'transparent', opacity: o.off ? 0.35 : 1 }}>
            <Txt weight={600} size={13} color={on ? '#FFFFFF' : P.grey}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
/** Pronto stepper: pill with - qty + */
export function PStepper({ q, onMinus, onPlus }: { q: number; onMinus: () => void; onPlus: () => void }) {
  const b = (l: string, f: () => void, a: string) => <Pressable accessibilityLabel={a} onPress={f} hitSlop={6} style={{ width: 38, height: 40, alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={20} color={P.violet}>{l}</Txt></Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: P.tint, borderWidth: 1, borderColor: '#DCCEFA' }}>{b('−', onMinus, 'One fewer')}<Txt weight={700} size={15} color={P.violet} style={{ minWidth: 22, textAlign: 'center' }}>{q}</Txt>{b('+', onPlus, 'One more')}</View>;
}
export function PRows({ children, style }: { children: ReactNode; style?: VS }) {
  const kids = Children.toArray(children).filter(Boolean);
  return <View style={[{ backgroundColor: P.card, borderWidth: 1, borderColor: P.line, borderRadius: 18, overflow: 'hidden' }, style]}>{kids.map((k, i) => <Fragment key={i}>{i > 0 && <View style={{ height: 1, backgroundColor: P.line, marginLeft: SP.l }} />}{k}</Fragment>)}</View>;
}
export function PRow({ icon, tile, title, sub, right, chev, onPress, danger }: { icon?: ReactNode; tile?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; chev?: boolean; onPress?: () => void; danger?: boolean }) {
  const body = (pressed: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: SP.l, backgroundColor: pressed ? '#EFEBF8' : undefined }}>
      {icon != null && <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tile ?? P.tint, alignItems: 'center', justifyContent: 'center' }}>{typeof icon === 'string' ? <Txt weight={800} color={P.violet}>{icon}</Txt> : icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt weight={600} size={15} color={danger ? P.red : P.ink} style={{ lineHeight: 20 }}>{title}</Txt> : title}
        {sub != null && (typeof sub === 'string' ? <Txt size={12.5} color={P.grey} style={{ lineHeight: 17, marginTop: 1 }}>{sub}</Txt> : sub)}
      </View>
      {right != null && (typeof right === 'string' ? <Txt weight={700} size={14}>{right}</Txt> : right)}
      {chev && <Chev size={16} color={P.grey} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{({ pressed }) => body(pressed)}</Pressable> : body(false);
}
export function PHead({ title, right, onRight, sub, style }: { title: string; right?: string; onRight?: () => void; sub?: string; style?: VS }) {
  return (
    <View style={[{ marginBottom: SP.m }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Txt weight={700} size={20} color={P.ink} style={{ flexShrink: 1, letterSpacing: -0.3 }}>{title}</Txt>
        {right ? <Pressable disabled={!onRight} onPress={onRight} hitSlop={10}><Txt weight={600} size={13} color={onRight ? P.violet : P.grey}>{right}</Txt></Pressable> : null}
      </View>
      {sub ? <Txt size={13} color={P.grey} style={{ marginTop: 2 }}>{sub}</Txt> : null}
    </View>
  );
}
export function PTop({ title, left, right, sub }: { title?: string; left?: ReactNode; right?: ReactNode; sub?: string }) {
  const ins = useInsets();
  return (
    <View style={{ backgroundColor: '#FFFFFF', paddingTop: ins.top + SP.s, paddingBottom: SP.m, paddingHorizontal: SP.page, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <Txt weight={700} size={24} color={P.ink} style={{ letterSpacing: -0.5 }}>{title}</Txt> : null}
        {sub ? <Txt size={12.5} color={P.grey} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
export function PIconBtn({ children, onPress, label, badge, tint }: { children: ReactNode; onPress?: () => void; label?: string; badge?: number; tint?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tint ? P.tint : '#FFFFFF', borderWidth: 1, borderColor: P.line }}>
      {children}
      {badge ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: P.violet, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Txt weight={800} size={11} color="#FFFFFF">{String(badge)}</Txt></View> : null}
    </Pressable>
  );
}
export { Close };
