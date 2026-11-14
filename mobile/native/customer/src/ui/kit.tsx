// Design kit: the Pronto-style look (white page, soft tinted cards, hairline borders, violet accent) and a clean Night variant.
import React, { ReactNode, useContext, useEffect, useRef, useState, Children, Fragment } from 'react';
import {
  View, Text, TextProps, TextInput, TextInputProps, Pressable, ScrollView, ScrollViewProps, Animated, Easing, StyleProp, ViewStyle,
  TextStyle, AccessibilityInfo,
} from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { C, F, SP, R, HIT, SHADOW_SM, Ink, Theme, InkContext, creamInk, nightInk, useInk, useTheme } from '../theme';
import { Chev, ChevronDown, Arrow, Plus, Check, useUid } from './icons';

export { useInk, useTheme };
export const PAD = SP.page;
export const useInsets = () => useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
const edgeOf = (T: Theme) => (T.day ? C.hair : 'rgba(237,237,237,.08)');
const withFg = (T: Theme, fg: string): Ink => ({ ...T.card, fg, fg2: fg, fg3: fg });
type VS = StyleProp<ViewStyle>;

/* ---------- text ---------- */
const WF = { 400: F.body, 500: F.b500, 600: F.b600 } as const;
export type TxtProps = TextProps & { weight?: 400 | 500 | 600 | 700 | 800; font?: 'body' | 'shout' | 'hero'; size?: number; color?: string; upper?: boolean };
// font 'shout'/'hero' (old poster faces) render as Medium Poppins in sentence case. No 700/800 and no uppercase tracking anywhere:
// weights 700/800 resolve to 500 (600 for text under 17), `upper` is ignored, letter-spacing is 0, figures are tabular.
export function Txt({ style, weight = 400, font = 'body', size = 14, color, upper: _upper, ...p }: TxtProps) {
  const ink = useInk();
  const head = font !== 'body';
  const w = head ? 500 : weight >= 700 ? (size >= 17 ? 500 : 600) : weight;
  return <Text {...p} style={[{ fontFamily: WF[w as 400 | 500 | 600], fontSize: size, color: color ?? ink.fg, fontVariant: ['tabular-nums'] }, head && { lineHeight: Math.round(size * 1.22) }, style, { letterSpacing: 0, textTransform: 'none' }]} />;
}
const tShadow = (_T: Theme, _c: string, _d: number): TextStyle => ({});

/* ---------- hard shadow ---------- */
export function Hard({ children, dx = 6, dy = 6, color, radius = 24, style, reserve = true }: {
  children: ReactNode; dx?: number; dy?: number; color?: string | null; radius?: number; style?: VS; reserve?: boolean;
}) {
  const T = useTheme(), col = color === undefined ? T.shadow : color;
  return (
    <View style={[{ zIndex: 0 }, reserve && { marginRight: dx, marginBottom: dy }, style]}>
      {col ? <View pointerEvents="none" style={{ position: 'absolute', zIndex: -1, left: dx, top: dy, right: -dx, bottom: -dy, borderRadius: radius, backgroundColor: col }} /> : null}
      {children}
    </View>
  );
}

/* ---------- surfaces ---------- */
type SurfaceProps = { children?: ReactNode; style?: VS; inner?: VS; pad?: number; onPress?: () => void };
export function Card({ children, style, inner, pad = SP.card, onPress }: SurfaceProps) {
  const T = useTheme();
  const box: ViewStyle = { backgroundColor: T.cardBg, borderWidth: T.cardBorderW, borderColor: T.cardBorder, borderRadius: R.card, padding: pad, overflow: 'hidden' };
  return (
    <View style={style}>
      <InkContext.Provider value={T.card}>
        {onPress ? <Pressable onPress={onPress} style={[box, inner]}>{children}</Pressable> : <View style={[box, inner]}>{children}</View>}
      </InkContext.Provider>
    </View>
  );
}
export function Block({ children, style, inner, pad = SP.card, onPress }: SurfaceProps) {
  const T = useTheme();
  const box: ViewStyle = { backgroundColor: T.blockBg, borderWidth: 1, borderColor: T.blockBorder, borderRadius: R.card, padding: pad, overflow: 'hidden' };
  return (
    <View style={style}>
      <InkContext.Provider value={T.block}>
        {onPress ? <Pressable onPress={onPress} style={[box, inner]}>{children}</Pressable> : <View style={[box, inner]}>{children}</View>}
      </InkContext.Provider>
    </View>
  );
}

export function Rows({ children, style }: { children: ReactNode; style?: VS }) {
  const T = useTheme(), ink = T.card;
  const kids = Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      <InkContext.Provider value={T.card}>
        <View style={{ backgroundColor: T.day ? C.white : T.cardBg, borderWidth: 1, borderColor: T.cardBorder, borderRadius: R.card, overflow: 'hidden' }}>
          {kids.map((k, i) => <Fragment key={i}>{i > 0 && <View style={{ height: 1, backgroundColor: ink.line, marginLeft: SP.l }} />}{k}</Fragment>)}
        </View>
      </InkContext.Provider>
    </View>
  );
}
// icon + label + chevron list row (Pronto profile list). `tile` tints the icon square, `right` is text or a node.
export function Row({ icon, tile, title, sub, right, chev, onPress, style }: {
  icon?: ReactNode; tile?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; chev?: boolean; onPress?: () => void; style?: VS;
}) {
  const ink = useInk();
  const body = (pressed: boolean) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8, paddingHorizontal: SP.l, backgroundColor: pressed ? ink.tile2 : undefined }, style]}>
      {icon != null && <View style={{ width: 36, height: 36, borderRadius: R.inner, backgroundColor: tile ?? ink.tile2, alignItems: 'center', justifyContent: 'center' }}>{typeof icon === 'string' ? <Txt weight={500}>{icon}</Txt> : icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt weight={500} size={15} style={{ lineHeight: 20 }}>{title}</Txt> : title}
        {sub != null && (typeof sub === 'string' ? <Txt size={13} color={ink.fg3} style={{ lineHeight: 17, marginTop: 1 }}>{sub}</Txt> : sub)}
      </View>
      {right != null && (typeof right === 'string' ? <Txt weight={500} size={14}>{right}</Txt> : right)}
      {chev && <Chev size={18} color={ink.fg3} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{({ pressed }) => body(pressed)}</Pressable> : body(false);
}

/* ---------- buttons ---------- */
const BTN_H = 48;
export function Btn({ label, onPress, variant = 'gold', icon, busy, disabled, small, full = true, style }: {
  label: string; onPress?: () => void; variant?: 'gold' | 'violet' | 'ghost'; icon?: ReactNode; busy?: string | boolean; disabled?: boolean;
  small?: boolean; full?: boolean; style?: VS;
}) {
  const T = useTheme(), ink = useInk(), [dn, setDn] = useState(false);
  const off = !!busy || !!disabled, onDark = ink.fg === C.white;   // sitting on a violet block
  const bg = variant === 'ghost' ? (onDark ? 'rgba(255,255,255,.16)' : T.day ? C.tint : 'rgba(255,255,255,.1)') : onDark ? C.white : C.violet;
  const fg = variant === 'ghost' ? (onDark ? C.white : T.day ? C.ink : C.white) : onDark ? C.violet : C.white;
  return (
    <View style={[{ alignSelf: full ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        disabled={off} onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ transform: [{ scale: dn ? 0.98 : 1 }], backgroundColor: bg, borderRadius: R.ctl, minHeight: small ? 40 : BTN_H, paddingVertical: small ? 8 : 12, paddingHorizontal: small ? 16 : 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <InkContext.Provider value={withFg(T, fg)}>
          {icon}
          <Txt weight={500} size={small ? 14 : 15} color={fg}>{typeof busy === 'string' ? busy : label}</Txt>
        </InkContext.Provider>
      </Pressable>
    </View>
  );
}
// Pronto-style full-width violet button (grey when disabled) and its outlined sibling.
export function PrimaryButton({ label, onPress, icon, busy, disabled, small, full = true, style }: {
  label: string; onPress?: () => void; icon?: ReactNode; busy?: string | boolean; disabled?: boolean; small?: boolean; full?: boolean; style?: VS;
}) {
  const T = useTheme(), [dn, setDn] = useState(false), off = !!busy || !!disabled;
  const bg = disabled ? (T.day ? '#F4F4F5' : 'rgba(255,255,255,.12)') : C.violet, fg = disabled ? (T.day ? '#A3A3A3' : 'rgba(255,255,255,.4)') : C.white;
  return (
    <View style={[{ alignSelf: full ? 'stretch' : 'flex-start' }, style]}>
      <Pressable accessibilityRole="button" disabled={off} onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ transform: [{ scale: dn ? 0.98 : 1 }], backgroundColor: bg, borderRadius: R.ctl, minHeight: small ? 40 : BTN_H, paddingHorizontal: small ? 16 : 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <InkContext.Provider value={withFg(T, fg)}>
          {icon}
          <Txt weight={500} size={small ? 14 : 15} color={fg}>{typeof busy === 'string' ? busy : label}</Txt>
        </InkContext.Provider>
      </Pressable>
    </View>
  );
}
export function OutlineButton({ label, onPress, icon, disabled, small, full = true, color, style }: {
  label: string; onPress?: () => void; icon?: ReactNode; disabled?: boolean; small?: boolean; full?: boolean; color?: string; style?: VS;
}) {
  const T = useTheme(), col = color ?? (T.day ? C.ink : C.white), [dn, setDn] = useState(false);
  return (
    <View style={[{ alignSelf: full ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ transform: [{ scale: dn ? 0.98 : 1 }], backgroundColor: T.day ? C.white : 'transparent', borderRadius: R.ctl, borderWidth: 1, borderColor: color ?? (T.day ? C.hair : 'rgba(237,237,237,.16)'), minHeight: small ? 40 : BTN_H, paddingHorizontal: small ? 16 : 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <InkContext.Provider value={withFg(T, col)}>
          {icon}
          <Txt weight={500} size={small ? 14 : 15} color={col}>{label}</Txt>
        </InkContext.Provider>
      </Pressable>
    </View>
  );
}

// Small tag. tone: violet (default), green (paid/ok), grey, dark (white on violet), red. `gold` is kept as shorthand and now renders grey.
export type PillTone = 'violet' | 'gold' | 'green' | 'grey' | 'dark' | 'red';
const PILL: Record<PillTone, [string, string]> = {
  violet: [C.tint, C.violet], gold: [C.tint, '#525252'], green: ['#F0FAF4', '#16a34a'], grey: [C.tint, '#525252'], dark: [C.violet, C.white], red: ['#FEF2F2', '#dc2626'],
};
export function Pill({ label, children, gold, tone, icon, onPress, style }: { label?: string; children?: ReactNode; gold?: boolean; tone?: PillTone; icon?: ReactNode; onPress?: () => void; style?: VS }) {
  const T = useTheme();
  const [bg0, fg0] = PILL[tone ?? (gold ? 'gold' : 'violet')];
  const bg = T.day ? bg0 : tone === 'dark' ? bg0 : 'rgba(255,255,255,.1)', fg = T.day || tone === 'dark' ? fg0 : '#EDEDED';
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <Pressable disabled={!onPress} onPress={onPress} hitSlop={onPress ? 6 : undefined}
        style={{ minHeight: 28, backgroundColor: bg, borderRadius: R.chip, paddingVertical: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <InkContext.Provider value={withFg(T, fg)}>
          {icon}
          {label != null ? <Txt weight={500} size={12} color={fg}>{label}</Txt> : children}
        </InkContext.Provider>
      </Pressable>
    </View>
  );
}

// Small selectable chip (date / slot / amount chips). on = violet outline + tint.
export function Chip({ label, on, onPress, sub, icon, style }: { label: string; on?: boolean; onPress?: () => void; sub?: string; icon?: ReactNode; style?: VS }) {
  const T = useTheme();
  const bg = on ? (T.day ? C.white : 'rgba(166,123,255,.18)') : T.day ? C.white : 'rgba(255,255,255,.06)', bd = on ? C.violet : T.day ? C.hair : 'rgba(237,237,237,.16)', fg = on ? (T.day ? C.violet : '#CDB6FF') : T.card.fg;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={[{ minHeight: 40, minWidth: 64, paddingVertical: 8, paddingHorizontal: 16, borderRadius: R.chip, borderWidth: on ? 1.5 : 1, borderColor: bd, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, style]}>
      {icon}
      <View style={{ alignItems: 'center' }}>
        <Txt weight={500} size={14} color={fg}>{label}</Txt>
        {sub ? <Txt size={12} color={on ? fg : T.card.fg3}>{sub}</Txt> : null}
      </View>
    </Pressable>
  );
}

// Segmented control (Upcoming / Previous, Morning / Afternoon / Evening). Full-width grey track with a white or violet selected cell.
export function SegTabs({ items, value, onChange, style }: { items: Opt[]; value: string; onChange: (v: string) => void; style?: VS }) {
  const T = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: T.day ? C.tint : 'rgba(255,255,255,.08)', borderRadius: R.ctl, padding: 4, gap: 4 }, style]}>
      {items.map(kl).map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 40, borderRadius: R.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: on ? (T.day ? C.white : '#232325') : 'transparent', ...(on && T.day ? SHADOW_SM : {}) }}>
            <Txt weight={500} size={14} color={on ? T.card.fg : T.card.fg3}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// Round icon button (white, hairline border). `badge` shows a count, `dot` a red dot.
export function IconBtn({ children, onPress, dot, badge, label, style }: { children: ReactNode; onPress?: () => void; dot?: boolean; badge?: number | string; label?: string; style?: VS }) {
  const T = useTheme(), [dn, setDn] = useState(false);
  const bg = T.day ? C.white : 'rgba(255,255,255,.1)', fg = T.day ? '#525252' : '#EDEDED';
  return (
    <View style={style}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ width: HIT, height: HIT, borderRadius: R.ctl, backgroundColor: bg, borderWidth: 1, borderColor: T.day ? C.hair : 'rgba(237,237,237,.16)', alignItems: 'center', justifyContent: 'center', transform: [{ scale: dn ? 0.98 : 1 }] }}>
        <InkContext.Provider value={withFg(T, fg)}>{children}</InkContext.Provider>
        {dot ? <View style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 2, borderColor: bg }} /> : null}
        {badge != null && badge !== 0 ? (
          <View style={{ position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: C.violet, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={500} size={12} color={C.white}>{String(badge)}</Txt>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/* ---------- headings ---------- */
export const Em = ({ children }: { children: ReactNode }) => {
  const T = useTheme();
  return <Text style={{ color: T.day ? C.violet : '#A67BFF' }}>{children}</Text>;
};
export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const ink = useInk();
  return <Txt weight={500} size={12} color={color ?? ink.fg3} style={style}>{children}</Txt>;
}
export function SecHead({ title, gold, link, onLink, style }: { title: string; gold?: string; link?: string; onLink?: () => void; style?: VS }) {
  const ink = useInk();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: SP.m }, style]}>
      <Txt weight={500} size={18} style={{ flexShrink: 1, lineHeight: 24 }}>
        {title}{gold ? <Text>{title ? ' ' : ''}{gold}</Text> : null}
      </Txt>
      {link ? <Pressable onPress={onLink} hitSlop={14}><Txt weight={500} size={14} color={ink.fg2}>{link}</Txt></Pressable> : null}
    </View>
  );
}
export function BigTitle({ children, em, size = 24, style }: { children?: ReactNode; em?: string; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Txt weight={500} size={size} style={[{ lineHeight: Math.round(size * 1.25) }, style]}>
      {children}{em ? <Em>{children ? ' ' : ''}{em}</Em> : null}
    </Txt>
  );
}

/* ---------- choices ---------- */
type Opt = string | { key: string; label: string };
const kl = (o: Opt) => (typeof o === 'string' ? { key: o, label: o } : o);
function Choice({ items, value, onChange, multi, gap, grow, seg }: { items: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean; gap: number; grow?: boolean; seg?: boolean }) {
  const T = useTheme();
  const sel = (k: string) => (Array.isArray(value) ? value.includes(k) : value === k);
  const tap = (k: string) => onChange(multi ? (sel(k) ? (value as string[]).filter(x => x !== k) : [...(value as string[]), k]) : k);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginTop: SP.s, marginBottom: SP.l }}>
      {items.map(kl).map(o => {
        const on = sel(o.key), solid = seg && on;
        const bg = solid ? C.violet : on ? (T.day ? C.white : 'rgba(166,123,255,.18)') : T.day ? C.white : 'rgba(255,255,255,.06)';
        const bd = on ? C.violet : T.day ? C.hair : 'rgba(237,237,237,.16)';
        const fg = solid ? C.white : on ? (T.day ? C.violet : '#CDB6FF') : T.card.fg;
        return (
          <Pressable key={o.key} onPress={() => tap(o.key)} style={[{ backgroundColor: bg, borderColor: bd, borderWidth: on ? 1.5 : 1, borderRadius: R.chip, minHeight: 40, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16 }, grow && { flexGrow: 1, alignItems: 'center' }]}>
            <Txt weight={500} size={14} color={fg}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
export const Chips = (p: { items: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean }) => <Choice {...p} gap={8} />;
export const Seg = (p: { items: Opt[]; value: string; onChange: (v: string) => void }) => <Choice {...p} gap={8} grow seg />;

export function Opt({ on, onPress, title, text, price, style }: { on?: boolean; onPress?: () => void; title: string; text?: string; price?: string; style?: VS }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={[{ marginBottom: SP.m }, style]}>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: SP.l, borderRadius: R.card, borderWidth: on ? 1.5 : 1, borderColor: on ? C.violet : ink.line, backgroundColor: T.day ? C.white : ink.tile }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: on ? C.violet : ink.fg3, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={15}>{title}</Txt>
          {text ? <Txt size={12} color={ink.fg3}>{text}</Txt> : null}
        </View>
        {price ? <Txt weight={500} size={15}>{price}</Txt> : null}
      </Pressable>
    </View>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const ink = useInk(), x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: on ? 1 : 0, duration: 120, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start(); }, [on]);
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on, disabled }} disabled={disabled} hitSlop={8} onPress={() => onChange?.(!on)}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.violet : '#D4D4D8', opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={{ position: 'absolute', top: 3, left: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </Pressable>
  );
}

export function Field({ label, style, boxStyle, onFocus, onBlur, ...p }: TextInputProps & { label?: string; boxStyle?: VS }) {
  const T = useTheme(), ink = useInk(), [f, setF] = useState(false);
  return (
    <View style={[{ marginBottom: SP.l }, boxStyle]}>
      {label ? <Eyebrow style={{ marginBottom: SP.s }}>{label}</Eyebrow> : null}
      <TextInput placeholderTextColor={ink.fg3} {...p}
        onFocus={e => { setF(true); onFocus?.(e); }} onBlur={e => { setF(false); onBlur?.(e); }}
        style={[{ backgroundColor: T.day ? C.tint : 'rgba(255,255,255,.06)', borderWidth: f ? 1.5 : 1, borderColor: f ? C.violet : 'transparent', borderRadius: R.ctl, minHeight: 48, paddingVertical: 12, paddingHorizontal: SP.l, fontFamily: F.b500, fontSize: 15, color: ink.fg } as TextStyle, style]} />
    </View>
  );
}

// - 30 + stepper (Pronto "Review services"). Pass min/max; label sits between the buttons (e.g. "30" with unit "Minutes").
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label, unit, style }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; label?: string; unit?: string; style?: VS;
}) {
  const T = useTheme(), col = C.violet;
  const btn = (txt: string, dis: boolean, f: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={txt === '+' ? 'Increase' : 'Decrease'} disabled={dis} onPress={f} hitSlop={6} style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.35 : 1 }}>
      <Txt weight={500} size={20} color={col} style={{ lineHeight: 24 }}>{txt}</Txt>
    </Pressable>
  );
  return (
    <View style={[{ alignSelf: 'flex-start', alignItems: 'center' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.day ? C.hair : 'rgba(237,237,237,.16)', borderRadius: R.ctl, backgroundColor: T.day ? C.white : 'rgba(166,123,255,.14)', overflow: 'hidden' }}>
        {btn('−', value - step < min, () => onChange(Math.max(min, value - step)))}
        <Txt weight={500} size={15} color={T.card.fg} style={{ minWidth: 28, textAlign: 'center' }}>{label ?? String(value)}</Txt>
        {btn('+', value + step > max, () => onChange(Math.min(max, value + step)))}
      </View>
      {unit ? <Txt size={12} color={T.card.fg3} style={{ marginTop: 2 }}>{unit}</Txt> : null}
    </View>
  );
}

/* ---------- progress ---------- */
const ACircle = Animated.createAnimatedComponent(Circle);
const CIRC = 2 * Math.PI * 44;
export function Ring({ frac, size = 110, color = C.violet, track, children, stroke = 9, style }: { frac: number; size?: number; color?: string; track?: string; children?: ReactNode; stroke?: number; style?: VS }) {
  const ink = useInk(), v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: Math.max(0, Math.min(1, frac)), duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start(); }, [frac]);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={44} fill="none" stroke={track ?? ink.line} strokeWidth={stroke} />
        <ACircle cx={50} cy={50} r={44} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] }) as any} />
      </Svg>
      {children}
    </View>
  );
}

// No count-up on load: the figure is just shown. (Signature kept so callers don't change.)
export function CountUp({ to, dur: _dur, format = n => String(Math.round(n)), ...p }: TxtProps & { to: number; dur?: number; format?: (n: number) => string }) {
  return <Txt {...p}>{format(to)}</Txt>;
}

/* ---------- small pieces ---------- */
export function Empty({ title, sub, style }: { title: string; sub?: string; style?: VS }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={[{ borderRadius: R.card, paddingVertical: 32, paddingHorizontal: SP.card, alignItems: 'center', borderWidth: 1, borderColor: ink.line, backgroundColor: T.day ? C.tint : 'transparent' }, style]}>
      <InkContext.Provider value={T.card}>
        <Txt weight={500} size={15} style={{ marginBottom: 4, textAlign: 'center' }}>{title}</Txt>
        {sub ? <Txt size={14} color={ink.fg2} style={{ textAlign: 'center' }}>{sub}</Txt> : null}
      </InkContext.Provider>
    </View>
  );
}

const TONES = { ok: ['#F0FAF4', '#16a34a'], warn: [C.tint, '#525252'], bad: ['#FEF2F2', '#dc2626'], info: [C.tint, C.violet], mute: [null, null] } as const;
export function StatusPill({ label, tone = 'ok', style }: { label: string; tone?: keyof typeof TONES; style?: VS }) {
  const ink = useInk(), [bg, fg] = TONES[tone];
  return (
    <View style={[{ alignSelf: 'flex-start', borderRadius: R.chip, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: bg ?? ink.tile2 }, style]}>
      <Txt weight={500} size={12} color={fg ?? ink.fg2}>{label}</Txt>
    </View>
  );
}

export function Confirm({ from, to, fromLabel = 'From', toLabel = 'To', style }: { from: string; to: string; fromLabel?: string; toLabel?: string; style?: VS }) {
  const T = useTheme(), ink = useInk();
  const cell = (l: string, v: string) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt weight={500} size={12} color={ink.fg3}>{l}</Txt>
      <Txt weight={500} size={17} style={{ textAlign: 'center' }}>{v}</Txt>
    </View>
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.l, borderRadius: R.card, backgroundColor: T.day ? C.tint : ink.tile2, marginVertical: SP.l }, style]}>
      {cell(fromLabel, from)}<Arrow size={18} color={ink.fg3} />{cell(toLabel, to)}
    </View>
  );
}

// Static line of short facts (no marquee, no star separators).
export function Ticker({ items }: { items: string[]; speed?: number }) {
  return (
    <View style={{ minHeight: 32, backgroundColor: C.tint, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: PAD }}>
      <Txt size={12} color="#525252" numberOfLines={1}>{items.join('  ·  ')}</Txt>
    </View>
  );
}

/* ---------- Pronto pieces ---------- */
// Page header: bold title (with optional chevron-down), address / sub line under it, round icon buttons on the right.
export function Header({ title, sub, onTitle, left, right, style }: { title: ReactNode; sub?: ReactNode; onTitle?: () => void; left?: ReactNode; right?: ReactNode; style?: VS }) {
  const ink = useInk(), ins = useInsets();
  const t = typeof title === 'string' ? <Txt weight={500} size={22} numberOfLines={1} style={{ lineHeight: 28 }}>{title}</Txt> : title;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: ins.top + SP.m, paddingBottom: SP.m, paddingHorizontal: PAD }, style]}>
      {left}
      <Pressable disabled={!onTitle} onPress={onTitle} style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ flexShrink: 1 }}>{t}</View>
          {onTitle ? <ChevronDown size={18} color={ink.fg3} /> : null}
        </View>
        {sub != null ? (typeof sub === 'string' ? <Txt size={13} color={ink.fg3} numberOfLines={1} style={{ marginTop: 2 }}>{sub}</Txt> : sub) : null}
      </Pressable>
      {right != null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

export function Stat({ value, label, icon, style }: { value: ReactNode; label: string; icon?: ReactNode; style?: VS }) {
  const ink = useInk();
  return (
    <View style={[{ flex: 1, alignItems: 'center', gap: 2 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        {typeof value === 'string' ? <Txt weight={500} size={24} style={{ lineHeight: 32 }}>{value}</Txt> : value}
      </View>
      <Txt size={12} color={ink.fg3} style={{ textAlign: 'center' }}>{label}</Txt>
    </View>
  );
}

// Wide banner. violet = the single solid accent banner (no shapes or gradients); tint / gold = quiet raised panel with a hairline.
export function Banner({ title, sub, cta, onPress, art, variant = 'violet', style }: {
  title: string; sub?: string; cta?: string; onPress?: () => void; art?: ReactNode; variant?: 'violet' | 'tint' | 'gold'; style?: VS;
}) {
  const T = useTheme(), solid = variant === 'violet';
  const bg = solid ? C.violet : T.day ? C.tint : 'rgba(255,255,255,.06)';
  const fg = solid ? C.white : T.card.fg, fg2 = solid ? 'rgba(255,255,255,.85)' : T.card.fg2;
  const ctaBg = solid ? C.white : C.violet, ctaFg = solid ? C.violet : C.white;
  return (
    <View style={style}>
      <Pressable disabled={!onPress} onPress={onPress} style={{ backgroundColor: bg, borderRadius: R.card, padding: SP.l, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt weight={500} size={17} color={fg} style={{ lineHeight: 24 }}>{title}</Txt>
          {sub ? <Txt size={13} color={fg2} style={{ lineHeight: 18 }}>{sub}</Txt> : null}
          {cta ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: ctaBg, borderRadius: R.ctl, paddingVertical: 8, paddingHorizontal: 16 }}>
              <Txt weight={500} size={14} color={ctaFg}>{cta}</Txt>
            </View>
          ) : null}
        </View>
        {art}
      </Pressable>
    </View>
  );
}

// Grid tile for services: a #F4F4F5 well holding the render (`art`), a small white "+" button bottom-right, then name and price (old price struck through).
// `tint` and `badge` are accepted for compatibility but ignored (no per-service pastels, no NEW/POPULAR tags). Ratings only render when the caller passes them.
export function ServiceTile({ name, price, oldPrice, rating, ratingCount, art, onPress, onAdd, width, style }: {
  name: string; price?: string; oldPrice?: string; rating?: string; ratingCount?: string; art?: ReactNode; onPress?: () => void; onAdd?: () => void;
  width?: number | string; badge?: string; tint?: string; style?: VS;
}) {
  const T = useTheme(), ink = useInk();
  return (
    <Pressable accessibilityRole="button" onPress={onPress ?? onAdd} style={[{ width: width ?? '31%', flexGrow: width ? 0 : 1 }, style]}>
      <View style={{ aspectRatio: 1, borderRadius: R.card, backgroundColor: T.day ? C.tint : 'rgba(255,255,255,.07)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {art}
        {rating ? (
          <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: C.white, borderRadius: R.chip, paddingVertical: 2, paddingHorizontal: 6 }}>
            <Txt weight={500} size={12} color="#525252" style={{ lineHeight: 16 }}>{rating}{ratingCount ? ` (${ratingCount})` : ''}</Txt>
          </View>
        ) : null}
        {onAdd ? (
          <Pressable accessibilityLabel={'Add ' + name} onPress={onAdd} hitSlop={6} style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: R.chip, backgroundColor: C.white, borderWidth: 1, borderColor: C.hair, alignItems: 'center', justifyContent: 'center', ...SHADOW_SM }}>
            <Plus size={18} color={C.violet} />
          </Pressable>
        ) : null}
      </View>
      <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 8, lineHeight: 18 }}>{name}</Txt>
      {price ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
          <Txt weight={500} size={13}>{price}</Txt>
          {oldPrice ? <Txt size={12} color={ink.fg3} style={{ textDecorationLine: 'line-through' }}>{oldPrice}</Txt> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// Result header (booking completed / washer assigned): a white surface with a quiet tick, title and sub line, then the content below.
// Name kept for compatibility; it is no longer dark. title/sub render at the top; `left`/`right` sit on the top row (back button, help).
export function DarkHeader({ title, sub, tick = true, left, right, art, children, footer, bottom = 40, style }: {
  title: string; sub?: string; tick?: boolean; left?: ReactNode; right?: ReactNode; art?: ReactNode; children?: ReactNode; footer?: ReactNode; bottom?: number; style?: VS;
}) {
  const T = useTheme(), ins = useInsets();
  return (
    <InkContext.Provider value={T.card}>
      <View style={[{ flex: 1, backgroundColor: T.day ? C.white : T.bg }, style]}>
        <View style={{ paddingTop: ins.top + SP.s, paddingHorizontal: PAD, paddingBottom: SP.l, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', minHeight: 44 }}>
            <View style={{ minWidth: 44 }}>{left}</View><View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
          </View>
          {art ?? (tick ? (
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: T.day ? '#F0FAF4' : 'rgba(76,195,138,.16)', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
              <Check size={24} color={T.card.ok} strokeWidth={1.5} />
            </View>
          ) : null)}
          <Txt weight={500} size={22} style={{ marginTop: 12, textAlign: 'center' }}>{title}</Txt>
          {sub ? <Txt size={14} color={T.card.fg3} style={{ marginTop: 4, textAlign: 'center', maxWidth: 320 }}>{sub}</Txt> : null}
        </View>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: PAD, paddingBottom: bottom }}>{children}</ScrollView>
          {footer}
        </View>
      </View>
    </InkContext.Provider>
  );
}

/* ---------- page and top bar ---------- */
export function Dots({ size = 18, r = 1.3, color }: { size?: number; r?: number; color: string }) {
  const id = useUid();
  if (color === 'transparent') return null;
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      <Defs><Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse"><Circle cx={size / 2} cy={size / 2} r={r} fill={color} /></Pattern></Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
export const Gap = ({ h = 16 }: { h?: number }) => <View style={{ height: h }} />;

export function Page({ children, header, footer, scroll = true, pad = PAD, bottom = 120, top = SP.l, style, contentStyle, ...sp }: ScrollViewProps & {
  children?: ReactNode; header?: ReactNode; footer?: ReactNode; scroll?: boolean; pad?: number; bottom?: number; top?: number; style?: VS; contentStyle?: VS;
}) {
  const T = useTheme();
  return (
    <InkContext.Provider value={T.page}>
      <View style={[{ flex: 1, backgroundColor: T.bg }, style]}>
        <Dots color={T.dots} />
        {header}
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...sp} style={{ flex: 1 }}
            contentContainerStyle={[{ paddingHorizontal: pad, paddingTop: top, paddingBottom: bottom }, contentStyle]}>
            {children}
          </ScrollView>
        ) : <View style={[{ flex: 1, paddingHorizontal: pad, paddingTop: top }, contentStyle]}>{children}</View>}
        {footer}
      </View>
    </InkContext.Provider>
  );
}

export function Topbar({ left, title, right, style }: { left?: ReactNode; title?: ReactNode; right?: ReactNode; style?: VS }) {
  const T = useTheme(), ins = useInsets();
  return (
    <InkContext.Provider value={T.page}>
      <View style={[{ backgroundColor: T.barBg, borderBottomWidth: 1, borderBottomColor: T.page.line, paddingTop: ins.top + SP.s, paddingBottom: SP.s, paddingHorizontal: PAD }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>{left}</View>
          {typeof title === 'string' ? <Txt weight={500} size={18}>{title}</Txt> : title}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: HIT, flex: 1, justifyContent: 'flex-end' }}>{right}</View>
        </View>
      </View>
    </InkContext.Provider>
  );
}
