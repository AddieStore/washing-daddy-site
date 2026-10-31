// Design kit: the Day look (violet poster, cream cards, 3px ink borders, hard offset shadows) and its Night variant.
import React, { ReactNode, useContext, useEffect, useRef, useState, Children, Fragment } from 'react';
import {
  View, Text, TextProps, TextInput, TextInputProps, Pressable, ScrollView, ScrollViewProps, Animated, Easing, StyleProp, ViewStyle,
  TextStyle, AccessibilityInfo,
} from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { C, F, SP, R, HIT, Ink, Theme, InkContext, creamInk, nightInk, useInk, useTheme } from '../theme';
import { Chev, Arrow, useUid } from './icons';

export { useInk, useTheme };
export const PAD = SP.page;
export const useInsets = () => useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
const edgeOf = (T: Theme) => (T.day ? C.ink : 'rgba(255,246,233,.22)');
const withFg = (T: Theme, fg: string): Ink => ({ ...T.card, fg, fg2: fg, fg3: fg });
type VS = StyleProp<ViewStyle>;

/* ---------- text ---------- */
const WF = { 400: F.body, 500: F.b500, 600: F.b600, 700: F.b700, 800: F.b800 } as const;
export type TxtProps = TextProps & { weight?: 400 | 500 | 600 | 700 | 800; font?: 'body' | 'shout' | 'hero'; size?: number; color?: string; upper?: boolean };
export function Txt({ style, weight = 400, font = 'body', size = 14, color, upper, ...p }: TxtProps) {
  const ink = useInk();
  const ff = font === 'shout' ? F.shout : font === 'hero' ? F.hero : WF[weight];
  return <Text {...p} style={[{ fontFamily: ff, fontSize: size, color: color ?? ink.fg, textTransform: upper ? 'uppercase' : undefined }, font !== 'body' && { lineHeight: Math.round(size * 1.12) }, style]} />;
}
const tShadow = (T: Theme, c: string, d: number): TextStyle => (T.day ? { textShadowColor: c, textShadowOffset: { width: d, height: d }, textShadowRadius: 0 } : {});

/* ---------- hard shadow ---------- */
export function Hard({ children, dx = 6, dy = 6, color, radius = 24, style, reserve = true }: {
  children: ReactNode; dx?: number; dy?: number; color?: string | null; radius?: number; style?: VS; reserve?: boolean;
}) {
  const T = useTheme(), col = color === undefined ? T.shadow : color;
  return (
    <View style={[reserve && { marginRight: dx, marginBottom: dy }, style]}>
      {col ? <View pointerEvents="none" style={{ position: 'absolute', left: dx, top: dy, right: -dx, bottom: -dy, borderRadius: radius, backgroundColor: col }} /> : null}
      {children}
    </View>
  );
}

/* ---------- surfaces ---------- */
type SurfaceProps = { children?: ReactNode; style?: VS; inner?: VS; pad?: number; onPress?: () => void };
export function Card({ children, style, inner, pad = SP.card, onPress }: SurfaceProps) {
  const T = useTheme(), sh = T.shadow ? 6 : 0;
  const box: ViewStyle = { backgroundColor: T.cardBg, borderWidth: T.cardBorderW, borderColor: T.cardBorder, borderRadius: R.card, padding: pad, overflow: 'hidden' };
  return (
    <Hard dx={sh} dy={sh} radius={R.card} reserve={false} style={[{ marginBottom: sh }, style]}>
      <InkContext.Provider value={T.card}>
        {onPress ? <Pressable onPress={onPress} style={[box, inner]}>{children}</Pressable> : <View style={[box, inner]}>{children}</View>}
      </InkContext.Provider>
    </Hard>
  );
}
export function Block({ children, style, inner, pad = SP.card, onPress }: SurfaceProps) {
  const T = useTheme(), sh = T.shadow ? 6 : 0;
  const box: ViewStyle = { backgroundColor: T.blockBg, borderWidth: T.day ? 3 : 1, borderColor: T.blockBorder, borderRadius: R.card, padding: pad, overflow: 'hidden' };
  return (
    <Hard dx={sh} dy={sh} radius={R.card} reserve={false} style={[{ marginBottom: sh }, style]}>
      <InkContext.Provider value={T.block}>
        {onPress ? <Pressable onPress={onPress} style={[box, inner]}>{children}</Pressable> : <View style={[box, inner]}>{children}</View>}
      </InkContext.Provider>
    </Hard>
  );
}

export function Rows({ children, style }: { children: ReactNode; style?: VS }) {
  const T = useTheme(), sh = T.shadow ? 6 : 0, ink = T.card;
  const kids = Children.toArray(children).filter(Boolean);
  return (
    <Hard dx={sh} dy={sh} radius={R.card} reserve={false} style={[{ marginBottom: sh }, style]}>
      <InkContext.Provider value={T.card}>
        <View style={{ backgroundColor: T.cardBg, borderWidth: T.cardBorderW, borderColor: T.cardBorder, borderRadius: R.card, overflow: 'hidden' }}>
          {kids.map((k, i) => <Fragment key={i}>{i > 0 && <View style={{ height: 1.5, backgroundColor: ink.line }} />}{k}</Fragment>)}
        </View>
      </InkContext.Provider>
    </Hard>
  );
}
export function Row({ icon, tile, title, sub, right, chev, onPress, style }: {
  icon?: ReactNode; tile?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; chev?: boolean; onPress?: () => void; style?: VS;
}) {
  const ink = useInk();
  const body = (pressed: boolean) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: SP.l, backgroundColor: pressed ? ink.tile2 : undefined }, style]}>
      {icon != null && <View style={{ width: 36, height: 36, borderRadius: R.inner, backgroundColor: tile ?? ink.tile2, alignItems: 'center', justifyContent: 'center' }}>{typeof icon === 'string' ? <Txt weight={800}>{icon}</Txt> : icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt weight={600} size={15} style={{ lineHeight: 20 }}>{title}</Txt> : title}
        {sub != null && (typeof sub === 'string' ? <Txt size={12.5} color={ink.fg3} style={{ lineHeight: 17, marginTop: 1 }}>{sub}</Txt> : sub)}
      </View>
      {right != null && (typeof right === 'string' ? <Txt weight={700} size={14}>{right}</Txt> : right)}
      {chev && <Chev size={16} color={ink.fg3} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{({ pressed }) => body(pressed)}</Pressable> : body(false);
}

/* ---------- buttons ---------- */
export function Btn({ label, onPress, variant = 'gold', icon, busy, disabled, small, full = true, style }: {
  label: string; onPress?: () => void; variant?: 'gold' | 'violet' | 'ghost'; icon?: ReactNode; busy?: string | boolean; disabled?: boolean;
  small?: boolean; full?: boolean; style?: VS;
}) {
  const T = useTheme(), [dn, setDn] = useState(false), edge = edgeOf(T), sh = T.shadow ? 4 : 0;
  const off = !!busy || !!disabled;
  const bg = variant === 'gold' ? C.gold : variant === 'violet' ? C.violet : T.day ? C.cream : 'rgba(255,255,255,.1)';
  const fg = variant === 'violet' ? C.cream : variant === 'gold' ? C.ink : T.day ? C.ink : C.cream;
  const t = dn ? 3 : 0;
  return (
    <Hard dx={sh} dy={sh} radius={999} color={sh ? edge : null} style={[{ alignSelf: full ? 'stretch' : 'flex-start', opacity: disabled ? 0.5 : 1 }, style]}>
      <Pressable
        disabled={off} onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ transform: [{ translateX: sh ? t : 0 }, { translateY: sh ? t : 0 }, { scale: !sh && dn ? 0.97 : 1 }], backgroundColor: bg, borderRadius: 999, borderWidth: T.day ? 3 : 1.5, borderColor: edge,
          minHeight: small ? HIT : 52, paddingVertical: small ? 8 : 12, paddingHorizontal: small ? 18 : 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <InkContext.Provider value={withFg(T, fg)}>
          {icon}
          <Txt weight={800} size={small ? 14 : 16} color={fg}>{typeof busy === 'string' ? busy : label}</Txt>
        </InkContext.Provider>
      </Pressable>
    </Hard>
  );
}

export function Pill({ label, children, gold, icon, onPress, style }: { label?: string; children?: ReactNode; gold?: boolean; icon?: ReactNode; onPress?: () => void; style?: VS }) {
  const T = useTheme(), edge = edgeOf(T), sh = T.shadow ? 3 : 0, [dn, setDn] = useState(false);
  const bg = gold ? C.gold : T.day ? C.cream : 'rgba(255,255,255,.1)', fg = gold ? C.ink : T.day ? C.ink : C.cream;
  return (
    <Hard dx={sh} dy={sh} radius={999} color={sh ? edge : null} style={[{ alignSelf: 'flex-start' }, style]}>
      <Pressable disabled={!onPress} onPress={onPress} hitSlop={onPress ? 6 : undefined} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ minHeight: 36, transform: [{ translateX: sh && dn ? 2 : 0 }, { translateY: sh && dn ? 2 : 0 }], backgroundColor: bg, borderRadius: 999, borderWidth: T.day ? 2.5 : 1, borderColor: edge, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <InkContext.Provider value={withFg(T, fg)}>
          {icon}
          {label != null ? <Txt weight={700} size={12.5} color={fg}>{label}</Txt> : children}
        </InkContext.Provider>
      </Pressable>
    </Hard>
  );
}

export function IconBtn({ children, onPress, dot, badge, label, style }: { children: ReactNode; onPress?: () => void; dot?: boolean; badge?: number | string; label?: string; style?: VS }) {
  const T = useTheme(), edge = edgeOf(T), sh = T.shadow ? 3 : 0, [dn, setDn] = useState(false);
  const bg = T.day ? C.cream : 'rgba(255,255,255,.1)', fg = T.day ? C.ink : C.cream;
  return (
    <Hard dx={sh} dy={sh} radius={HIT / 2} color={sh ? edge : null} style={style}>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} onPressIn={() => setDn(true)} onPressOut={() => setDn(false)}
        style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: bg, borderWidth: T.day ? 3 : 1, borderColor: edge, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: sh && dn ? 3 : 0 }, { translateY: sh && dn ? 3 : 0 }] }}>
        <InkContext.Provider value={withFg(T, fg)}>{children}</InkContext.Provider>
        {dot ? <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 2, borderColor: bg }} /> : null}
        {badge != null && badge !== 0 ? (
          <View style={{ position: 'absolute', top: -7, right: -7, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: C.orange, borderWidth: 2, borderColor: edge, alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={800} size={11} color={C.white}>{String(badge)}</Txt>
          </View>
        ) : null}
      </Pressable>
    </Hard>
  );
}

/* ---------- headings ---------- */
export const Em = ({ children }: { children: ReactNode }) => {
  const T = useTheme();
  return <Text style={[{ color: C.gold }, tShadow(T, C.ink, 4)]}>{children}</Text>;
};
export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const ink = useInk();
  return <Txt weight={700} size={11} upper color={color ?? ink.accent} style={[{ letterSpacing: 1.5 }, style]}>{children}</Txt>;
}
export function SecHead({ title, gold, link, onLink, style }: { title: string; gold?: string; link?: string; onLink?: () => void; style?: VS }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: SP.l }, style]}>
      <Txt font="shout" size={30} upper style={[{ flexShrink: 1 }, tShadow(T, C.violetInk, 3)]}>
        {title}{gold ? <Text style={{ color: C.gold }}>{title ? ' ' : ''}{gold}</Text> : null}
      </Txt>
      {link ? <Pressable onPress={onLink} hitSlop={14}><Txt weight={700} size={13} color={T.day ? C.gold : ink.accent}>{link}</Txt></Pressable> : null}
    </View>
  );
}
export function BigTitle({ children, em, size = 50, style }: { children?: ReactNode; em?: string; size?: number; style?: StyleProp<TextStyle> }) {
  const T = useTheme();
  return (
    <Txt font="shout" size={size} upper style={[{ lineHeight: Math.round(size * 0.92) }, tShadow(T, C.violetInk, 4), style]}>
      {children}{em ? <Em>{children ? ' ' : ''}{em}</Em> : null}
    </Txt>
  );
}

/* ---------- choices ---------- */
const chipBox = (T: Theme, on: boolean, onBg: string, onFg: string) => ({
  bg: on ? onBg : T.day ? C.white : 'rgba(255,255,255,.06)', fg: on ? onFg : T.day ? C.ink : C.cream, bd: edgeOf(T), bw: T.day ? 2.5 : 1.5,
});
type Opt = string | { key: string; label: string };
const kl = (o: Opt) => (typeof o === 'string' ? { key: o, label: o } : o);
function Choice({ items, value, onChange, multi, onBg, onFg, gap, r, grow }: { items: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean; onBg: string; onFg: string; gap: number; r: number; grow?: boolean }) {
  const T = useTheme();
  const sel = (k: string) => (Array.isArray(value) ? value.includes(k) : value === k);
  const tap = (k: string) => onChange(multi ? (sel(k) ? (value as string[]).filter(x => x !== k) : [...(value as string[]), k]) : k);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginTop: SP.s, marginBottom: SP.l }}>
      {items.map(kl).map(o => {
        const on = sel(o.key), s = chipBox(T, on, onBg, onFg);
        return (
          <Pressable key={o.key} onPress={() => tap(o.key)} style={[{ backgroundColor: s.bg, borderColor: s.bd, borderWidth: s.bw, borderRadius: r, minHeight: HIT, justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 16 }, grow && { flexGrow: 1, alignItems: 'center' }]}>
            <Txt weight={600} size={13} color={s.fg}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
export const Chips = (p: { items: Opt[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean }) => <Choice {...p} onBg={C.gold} onFg={C.ink} gap={8} r={R.ctl} />;
export const Seg = (p: { items: Opt[]; value: string; onChange: (v: string) => void }) => <Choice {...p} onBg={C.violet} onFg={C.cream} gap={8} r={R.ctl} grow />;

export function Opt({ on, onPress, title, text, price, style }: { on?: boolean; onPress?: () => void; title: string; text?: string; price?: string; style?: VS }) {
  const T = useTheme(), ink = useInk(), edge = edgeOf(T), sh = T.shadow && on ? 4 : 0;
  return (
    <Hard dx={4} dy={4} color={sh ? edge : null} radius={R.card} reserve={false} style={[{ marginBottom: SP.m }, style]}>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, padding: SP.l, borderRadius: R.card, borderWidth: T.day ? 2.5 : 1.5, borderColor: on && !T.day ? C.gold : edge, backgroundColor: on ? (T.day ? C.cream : ink.tile2) : ink.tile }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.violet : ink.fg3, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Txt weight={700} size={15}>{title}</Txt>
          {text ? <Txt size={12} color={ink.fg3}>{text}</Txt> : null}
        </View>
        {price ? <Txt weight={800} size={15}>{price}</Txt> : null}
      </Pressable>
    </Hard>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const ink = useInk(), T = useTheme(), x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.spring(x, { toValue: on ? 1 : 0, useNativeDriver: true, friction: 6, tension: 160 }).start(); }, [on]);
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on, disabled }} disabled={disabled} hitSlop={8} onPress={() => onChange?.(!on)}
      style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? C.mint : ink.tile2, borderWidth: T.day ? 2 : 1, borderColor: on ? C.mint : T.day ? C.ink : ink.line, opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={{ position: 'absolute', top: 1, left: 1, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </Pressable>
  );
}

export function Field({ label, style, boxStyle, onFocus, onBlur, ...p }: TextInputProps & { label?: string; boxStyle?: VS }) {
  const T = useTheme(), ink = useInk(), [f, setF] = useState(false), edge = edgeOf(T);
  return (
    <View style={[{ marginBottom: SP.l }, boxStyle]}>
      {label ? <Eyebrow style={{ marginBottom: SP.s }}>{label}</Eyebrow> : null}
      <Hard dx={4} dy={4} radius={R.ctl} reserve={false} color={f && T.shadow ? edge : null}>
        <TextInput placeholderTextColor={ink.fg3} {...p}
          onFocus={e => { setF(true); onFocus?.(e); }} onBlur={e => { setF(false); onBlur?.(e); }}
          style={[{ backgroundColor: T.day ? C.cream : 'rgba(255,255,255,.06)', borderWidth: T.day ? 2.5 : 1.5, borderColor: f && !T.day ? C.gold : edge, borderRadius: R.ctl, minHeight: 52, paddingVertical: 12, paddingHorizontal: SP.l, fontFamily: F.b500, fontSize: 16, color: ink.fg } as TextStyle, style]} />
      </Hard>
    </View>
  );
}

/* ---------- progress ---------- */
const ACircle = Animated.createAnimatedComponent(Circle);
const CIRC = 2 * Math.PI * 44;
export function Ring({ frac, size = 110, color = C.gold, track, children, stroke = 9, style }: { frac: number; size?: number; color?: string; track?: string; children?: ReactNode; stroke?: number; style?: VS }) {
  const ink = useInk(), v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: Math.max(0, Math.min(1, frac)), duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [frac]);
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

export function CountUp({ to, dur = 900, format = n => String(Math.round(n)), ...p }: TxtProps & { to: number; dur?: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const a = new Animated.Value(0), id = a.addListener(({ value }) => setV(value));
    Animated.timing(a, { toValue: to, duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setV(to));
    return () => { a.removeListener(id); a.stopAnimation(); };
  }, [to, dur]);
  return <Txt {...p}>{format(v)}</Txt>;
}

/* ---------- small pieces ---------- */
export function Empty({ title, sub, style }: { title: string; sub?: string; style?: VS }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={[{ borderRadius: R.card, paddingVertical: 28, paddingHorizontal: SP.card, alignItems: 'center', borderWidth: T.day ? 3 : 1.5, borderStyle: 'dashed', borderColor: T.day ? C.ink : ink.dash, backgroundColor: T.day ? C.cream : 'transparent' }, style]}>
      <InkContext.Provider value={T.card}>
        <Txt weight={700} size={15} style={{ marginBottom: 4, textAlign: 'center' }}>{title}</Txt>
        {sub ? <Txt size={13.5} color={ink.fg2} style={{ textAlign: 'center' }}>{sub}</Txt> : null}
      </InkContext.Provider>
    </View>
  );
}

const TONES = { ok: [C.mint, C.ink], warn: [C.gold, C.ink], bad: [C.red, C.white], info: [C.sky, C.white], mute: [null, null] } as const;
export function StatusPill({ label, tone = 'ok', style }: { label: string; tone?: keyof typeof TONES; style?: VS }) {
  const ink = useInk(), [bg, fg] = TONES[tone];
  return (
    <View style={[{ alignSelf: 'flex-start', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: bg ?? ink.tile2 }, style]}>
      <Txt weight={800} size={11} upper color={fg ?? ink.fg2} style={{ letterSpacing: 0.7 }}>{label}</Txt>
    </View>
  );
}

export function Confirm({ from, to, fromLabel = 'From', toLabel = 'To', style }: { from: string; to: string; fromLabel?: string; toLabel?: string; style?: VS }) {
  const T = useTheme(), ink = useInk();
  const cell = (l: string, v: string) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt weight={600} size={11} upper color={ink.fg3} style={{ letterSpacing: 0.9 }}>{l}</Txt>
      <Txt weight={700} size={17} style={{ textAlign: 'center' }}>{v}</Txt>
    </View>
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SP.l, borderRadius: R.card, backgroundColor: ink.tile2, borderWidth: T.day ? 2.5 : 1, borderColor: T.day ? C.ink : ink.line, marginVertical: SP.l }, style]}>
      {cell(fromLabel, from)}<Arrow size={20} color={ink.accent} />{cell(toLabel, to)}
    </View>
  );
}

export function Ticker({ items, speed = 45 }: { items: string[]; speed?: number }) {
  const [w, setW] = useState(0), x = useRef(new Animated.Value(0)).current;
  let list = items; while (list.length && list.length < 8) list = list.concat(items);
  useEffect(() => {
    if (!w) return;
    let off = false, loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(rm => {
      if (rm || off) return;
      x.setValue(0);
      loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: (w / speed) * 1000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => { off = true; loop?.stop(); };
  }, [w, speed]);
  const run = (k: number) => (
    <View key={k} onLayout={k === 0 ? e => setW(e.nativeEvent.layout.width) : undefined} style={{ flexDirection: 'row', flexShrink: 0 }}>
      {list.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
          <Txt font="shout" size={15} upper color={C.ink} style={{ letterSpacing: 0.9 }}>{s}</Txt>
          <Txt size={13} color={C.violet} style={{ marginHorizontal: 18 }}>{'★'}</Txt>
        </View>
      ))}
    </View>
  );
  return (
    <View style={{ height: 36, backgroundColor: C.gold, borderBottomWidth: 3, borderBottomColor: C.ink, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', left: 0, width: 8000, flexDirection: 'row', transform: [{ translateX: x }] }}>{[0, 1, 2].map(run)}</Animated.View>
    </View>
  );
}

/* ---------- page and top bar ---------- */
export function Dots({ size = 18, r = 1.3, color }: { size?: number; r?: number; color: string }) {
  const id = useUid();
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
      <View style={[{ backgroundColor: T.barBg, borderBottomWidth: T.day ? 12 : 1, borderBottomColor: T.day ? C.gold : T.page.line, paddingTop: ins.top + SP.s, paddingBottom: SP.m, paddingHorizontal: PAD, overflow: 'hidden' }, style]}>
        {T.day && <Dots size={14} r={1.4} color="rgba(255,246,233,.13)" />}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>{left}</View>
          {typeof title === 'string' ? <Txt font="shout" size={20} upper style={{ letterSpacing: 0.8 }}>{title}</Txt> : title}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: HIT, flex: 1, justifyContent: 'flex-end' }}>{right}</View>
        </View>
      </View>
    </InkContext.Provider>
  );
}
