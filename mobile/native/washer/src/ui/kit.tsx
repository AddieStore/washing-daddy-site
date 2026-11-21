import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icons';
import { ui } from './bus';
import { usePressSpring } from './motion';
import { F, R, brand, cardBox, cardShadow, useTheme } from './theme';

type S<T> = StyleProp<T>;
const useNative = Platform.OS !== 'web';

/* ------------------------------------------------------------------ */
/* Pressy: pressable with spring scale                                 */
/* ------------------------------------------------------------------ */
export function Pressy({
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.96,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: S<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'switch' | 'radio' | 'link' | 'tab';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  hitSlop?: number;
}) {
  // Pronto press: spring to 0.96 and back with a small overshoot (no scale with reduced motion)
  const { scale: v, down, up } = usePressSpring(scaleTo);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={down}
      onPressOut={up}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
export type ButtonVariant = 'gold' | 'violet' | 'ink' | 'ghost' | 'mint' | 'sos';

export function Button({
  label,
  onPress,
  variant = 'gold',
  icon,
  iconRight,
  disabled,
  style,
  full = true,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  style?: S<ViewStyle>;
  /** stretch to the container width (default true) */
  full?: boolean;
}) {
  const { c, dark, onViolet } = useTheme();
  // Customer Cta: minHeight 56, radius 16, violet with a violet shadow; disabled = soft lilac, no shadow; secondary = white card, violet text.
  const v: Record<ButtonVariant, { bg: string; fg: string; shadow?: boolean; card?: boolean }> = {
    gold: { bg: c.primary, fg: '#fff', shadow: true },
    violet: { bg: c.primary, fg: '#fff', shadow: true },
    ink: { bg: dark ? c.tile2 : '#171717', fg: '#fff' },
    ghost: { bg: c.card, fg: dark ? '#CDB6FF' : '#5409DA', card: true },
    mint: { bg: brand.mint, fg: '#06281D' },
    sos: { bg: '#dc2626', fg: '#fff' },
  };
  if (onViolet) {   // on a violet block: white button with violet text; secondary = translucent white
    v.gold = v.violet = v.ink = { bg: '#FFFFFF', fg: '#5409DA' };
    v.ghost = { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' };
  }
  const t = v[variant];
  const bg = disabled ? (onViolet ? 'rgba(255,255,255,0.14)' : dark ? 'rgba(255,255,255,0.08)' : '#E6E0F5') : t.bg;
  const fg = disabled ? (onViolet ? 'rgba(255,255,255,0.5)' : dark ? 'rgba(255,255,255,0.4)' : '#6B6483') : t.fg;
  const sh = !disabled && !onViolet && c.shadow
    ? t.shadow ? ({ shadowColor: brand.violet, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 } as const)
      : t.card ? cardShadow(c) : null
    : null;
  return (
    <Pressy
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        b.btn,
        {
          backgroundColor: bg,
          minHeight: 56,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        sh,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[b.txt, { color: fg, fontSize: 16 }]} numberOfLines={2}>
        {label}
      </Text>
      {iconRight ? <Icon name={iconRight} size={18} color={fg} /> : null}
    </Pressy>
  );
}

const b = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 },
  txt: { fontFamily: F.semi, textAlign: 'center', flexShrink: 1 },
});

export function LinkButton({
  label,
  onPress,
  color,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  style?: S<ViewStyle>;
  textStyle?: S<TextStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} accessibilityRole="link" scaleTo={0.95} style={[{ minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 }, style]}>
      <Text style={[{ fontFamily: F.semi, fontSize: 14, color: color ?? c.primary }, textStyle]}>{label}</Text>
    </Pressy>
  );
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                         */
/* ------------------------------------------------------------------ */
export function Card({ children, style, onPress }: { children?: React.ReactNode; style?: S<ViewStyle>; onPress?: () => void }) {
  const { c } = useTheme();
  const st: S<ViewStyle> = [cardBox(c), cardShadow(c), style];
  if (onPress) return <Pressy onPress={onPress} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

export function Section({ title, meta, children, style }: { title?: string; meta?: string; children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ marginTop: 24 }, style]}>
      {title || meta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          {title ? <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 26, color: c.fg, flexShrink: 1 }}>{title}</Text> : <View />}
          {meta ? <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{meta}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Eyebrow({ children, style }: { children?: React.ReactNode; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.fg3 }, style]}>{children}</Text>;
}

export function BigTitle({ children, em, size = 44, style }: { children?: React.ReactNode; em?: string; size?: number; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: F.black, fontSize: Math.min(size, 30), lineHeight: Math.min(size, 30) * 1.15, letterSpacing: -0.5, color: c.fg, marginTop: 4 }, style]}>
      {children}
      {em ? <Text style={{ color: c.em }}>{children ? ' ' : ''}{em}</Text> : null}
    </Text>
  );
}

export type ChipTone = 'violet' | 'green' | 'grey' | 'red' | 'dark';
/** Pronto Pill: full pill, 12 medium text on a quiet tint. */
export function Chip({ children, icon, tone = 'violet', style }: { children?: React.ReactNode; icon?: IconName; tone?: ChipTone; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const T: Record<ChipTone, [string, string]> = {
    violet: [dark ? 'rgba(139,92,246,0.22)' : 'rgba(84,9,218,0.08)', dark ? '#CDB6FF' : '#5409DA'],
    green: [dark ? 'rgba(92,230,181,0.14)' : '#F0FAF4', dark ? '#5CE6B5' : '#16a34a'],
    grey: [dark ? c.tile2 : '#ECECF0', c.fg2],
    red: [dark ? 'rgba(248,113,113,0.16)' : '#FEF2F2', dark ? '#FCA5A5' : '#dc2626'],
    dark: [c.primary, '#fff'],
  };
  const [bg, fg] = T[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 28, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: fg }}>{children}</Text>
    </View>
  );
}

export type StatusKey = 'scheduled' | 'on_the_way' | 'arrived' | 'washing' | 'done' | 'skipped';

export function StatusPill({ status, label, style }: { status: StatusKey | string; label: string; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const violet: [string, string] = [dark ? 'rgba(139,92,246,0.22)' : 'rgba(84,9,218,0.08)', dark ? '#CDB6FF' : '#5409DA'];
  const map: Record<string, [string, string]> = {
    scheduled: [dark ? c.tile2 : '#ECECF0', c.fg2],
    on_the_way: violet,
    arrived: violet,
    washing: violet,
    done: [dark ? 'rgba(92,230,181,0.14)' : '#F0FAF4', dark ? '#5CE6B5' : '#16a34a'],
    skipped: [dark ? 'rgba(255,186,8,0.16)' : '#FFF6DB', dark ? '#FFD566' : '#8A5B00'],
  };
  const [bg, fg] = map[status] ?? map.scheduled;
  return (
    <View style={[{ alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: fg }}>{label}</Text>
    </View>
  );
}

export function Plate({ reg, style }: { reg: string; style?: S<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#111114' }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 13, letterSpacing: 1, color: '#111114' }}>{reg}</Text>
    </View>
  );
}

export function Tier({ label, style }: { label: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: c.tile2 }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, color: c.fg2 }}>{label}</Text>
    </View>
  );
}

export type XKind = 'foam' | 'interior' | 'tyre' | 'detailing';

export function XChip({ kind, label, small, style }: { kind?: XKind | string; label: string; small?: boolean; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    foam: { bg: 'rgba(46,139,255,0.16)', fg: dark ? '#8fc0ff' : '#1f6fd6' },
    interior: { bg: c.soft, fg: c.softInk },
    tyre: { bg: 'rgba(20,192,138,0.16)', fg: dark ? '#6ff0c4' : '#0b8a62' },
    detailing: { bg: c.soft, fg: c.softInk },
  };
  const t = (kind && map[kind]) || { bg: c.tile2, fg: c.fg };
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: small ? 2 : 4, paddingHorizontal: small ? 8 : 10, borderRadius: 999, backgroundColor: t.bg }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: small ? 11 : 12, color: t.fg }}>{label}</Text>
    </View>
  );
}

export function Row({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  divider,
  style,
}: {
  icon?: IconName | React.ReactNode;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  /** bottom hairline (use on all but the last row; put the rows in one white Card with overflow hidden) */
  divider?: boolean;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  // Customer ListRow: 56px, 18px grey line icon, 15px title, chevron on tappable rows, hairline between rows.
  const body = (
    <>
      {icon ? (
        <View style={{ width: 24, alignItems: 'center' }}>
          {typeof icon === 'string' ? <Icon name={icon as IconName} size={18} color={iconColor ?? c.fg3} /> : icon}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: c.fg }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron" size={18} color={c.fg3} /> : null}
    </>
  );
  const st: S<ViewStyle> = [
    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
    divider && { borderBottomWidth: 1, borderBottomColor: c.line },
    style,
  ];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={title} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}

export function LegacyTile({ emoji, value, unit, label, style }: { emoji?: string; value: string | number; unit?: string; label?: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[cardBox(c), cardShadow(c), { padding: 16 }, style]}>
      {emoji ? <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</Text> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 32, lineHeight: 40, color: c.fg }}>
        {value}
        {unit ? <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg3 }}> {unit}</Text> : null}
      </Text>
      {label ? <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: c.fg2, marginTop: 4 }}>{label}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */
export type SyncState = 'live' | 'wait' | 'demo' | 'connecting';

export function SyncDot({ state, size = 10 }: { state: SyncState; size?: number }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    if (state === 'live') {
      const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: useNative }));
      l.start();
      return () => l.stop();
    }
    if (state === 'wait' || state === 'connecting') {
      const l = Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: useNative }),
        Animated.timing(a, { toValue: 0, duration: 500, useNativeDriver: useNative }),
      ]));
      l.start();
      return () => l.stop();
    }
  }, [state, a]);
  const col = state === 'live' ? brand.mint : state === 'wait' ? brand.orange : state === 'demo' ? c.fg3 : c.fg3;
  return (
    <View style={{ width: size, height: size }}>
      {state === 'live' ? (
        <Animated.View
          style={{
            position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(20,192,138,0.6)',
            opacity: a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 0, 0] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.8, 2.8] }) }],
          }}
        />
      ) : null}
      <Animated.View
        style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: col,
          opacity: state === 'wait' || state === 'connecting' ? a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 1,
        }}
      />
    </View>
  );
}

export function SyncChip({ state, text, onPress, style }: { state: SyncState; text: string; onPress?: () => void; style?: S<ViewStyle> }) {
  const { c, onViolet } = useTheme();
  return (
    <Pressy
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.94}
      accessibilityLabel={text}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingLeft: 12, paddingRight: 14, borderRadius: 999, backgroundColor: onViolet ? 'rgba(255,255,255,0.18)' : c.card, borderWidth: c.shadow ? 0 : 1, borderColor: c.line, alignSelf: 'flex-start' },
        onViolet ? null : cardShadow(c),
        style,
      ]}
    >
      <SyncDot state={state} />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12.5, color: c.fg }}>{text}</Text>
    </Pressy>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */
export function OnlineSwitch({
  value,
  onChange,
  title,
  subtitle,
  style,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 24, bounciness: 10 }).start();
  }, [value, a]);
  return (
    <Pressable
      onPress={() => { ui.haptic(10); onChange(!value); }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }, style]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 15, color: c.fg }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{subtitle}</Text> : null}
      </View>
      <Animated.View style={{ width: 52, height: 30, borderRadius: 99, padding: 3, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['#D4D4D8', c.primary] }) }}>
        <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }} />
      </Animated.View>
    </Pressable>
  );
}

export type Option<T extends string | number = string> = { value: T; label: string };

export function Segmented<T extends string | number = string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[{ flexDirection: 'row', gap: 6 }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressy
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: R.button, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : c.card, ...(on ? null : cardShadow(c)) }}
          >
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? '#fff' : c.fg }}>{o.label}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

export function ChipPicker<T extends string | number = string>({
  options,
  value,
  onChange,
  style,
}: {
  options: (Option<T> | T)[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  style?: S<ViewStyle>;
}) {
  const { c, dark } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }, style]}>
      {options.map((o) => {
        const opt: Option<T> = typeof o === 'object' ? o : { value: o, label: String(o) };
        const on = opt.value === value;
        return (
          <Pressy
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={opt.label}
            style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: on ? c.primary : 'transparent', backgroundColor: on ? (dark ? 'rgba(122,66,240,0.22)' : 'rgba(84,9,218,0.08)') : c.card, ...(on ? null : cardShadow(c)), alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: on ? c.primary : c.fg }}>{opt.label}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

/** Customer Field: optional label ON TOP of the box (12.5/500 muted), typed text inside the box below it. Canvas fill, white + 1.5 violet border on focus. */
export function Field({ big = true, style, onFocus, onBlur, multiline, label, boxStyle, ...rest }: TextInputProps & { big?: boolean; label?: string; boxStyle?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const [focus, setFocus] = useState(false);
  const input = (
    <TextInput
      placeholderTextColor={c.fg3}
      multiline={multiline}
      {...rest}
      onFocus={(e) => { setFocus(true); onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); onBlur?.(e); }}
      style={[
        {
          width: '100%',
          borderRadius: R.input,
          borderWidth: 1.5,
          borderColor: focus ? c.accent : 'transparent',
          backgroundColor: focus ? (dark ? c.card : '#FFFFFF') : c.inputBg,
          color: c.fg,
          fontFamily: F.medium,
          fontSize: big && !multiline ? 16 : 15,
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: multiline ? 96 : 52,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
        style,
      ]}
    />
  );
  if (!label) return input;
  return (
    <View style={boxStyle}>
      <Text style={{ fontFamily: F.medium, fontSize: 12.5, lineHeight: 18, color: c.fg3, marginBottom: 6 }}>{label}</Text>
      {input}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
export function Empty({ title, text, style, icon, action }: { title: string; text?: string; style?: S<ViewStyle>; icon?: IconName; action?: React.ReactNode }) {
  const { c } = useTheme();
  // Customer Empty: art circle, 600 title, grey sub, optional CTA.
  return (
    <View style={[cardBox(c), cardShadow(c), { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' }, style]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon name={icon ?? 'drop'} size={30} color={c.primary} />
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 24, color: c.fg, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg3, textAlign: 'center', marginTop: 4 }}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function DemoNote({ children, style }: { children?: React.ReactNode; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12, color: c.fg3, textAlign: 'center', marginTop: 10 }, style]}>{children}</Text>;
}

/** Small round phone button (icon only; `label` is the accessibility label). `iconOnly` is the default look; `small` kept for old call sites. */
export function CallButton({ phone, small, label, style }: { phone: string; small?: boolean; iconOnly?: boolean; label?: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const call = useCallback(() => { void Linking.openURL('tel:' + String(phone).replace(/[^\d+]/g, '')).catch(() => {}); }, [phone]);
  return (
    <Pressy
      onPress={call}
      scaleTo={0.92}
      accessibilityLabel={label ?? 'Call'}
      style={[
        { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(84,9,218,0.08)' },
        style,
      ]}
    >
      <Icon name="phone" size={17} color={c.primary} />
    </Pressy>
  );
}

export function ProgressBar({ fraction, color, height = 8, style }: { fraction: number; color?: 'mint' | 'gold' | string; height?: number; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const f = Math.max(0, Math.min(1, fraction || 0));
  useEffect(() => {
    Animated.timing(a, { toValue: f, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [f, a]);
  const col = color === 'gold' ? c.primary : !color || color === 'mint' ? brand.mint : color;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: c.soft, overflow: 'hidden' }, style]}
    >
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), borderRadius: height / 2, backgroundColor: col }} />
    </View>
  );
}

export function LegacyRing({
  fraction,
  size = 120,
  color,
  stroke = 9,
  children,
  style,
}: {
  fraction: number;
  size?: number;
  color?: string;
  stroke?: number;
  children?: React.ReactNode;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const [v, setV] = useState(0);
  const f = Math.max(0, Math.min(1, fraction || 0));
  useEffect(() => {
    const id = a.addListener(({ value }) => setV(value));
    return () => a.removeListener(id);
  }, [a]);
  useEffect(() => {
    Animated.timing(a, { toValue: f, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [f, a]);
  const C = 276.46;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={44} fill="none" stroke={c.line} strokeWidth={stroke} />
        <Circle cx={50} cy={50} r={44} fill="none" stroke={color ?? brand.violet} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - v)} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */
export type StepState = 'ok' | 'now' | 'none';
export type StepItem = { icon: IconName; label: string; time?: string; state: StepState };

export function Stepper({ steps, style }: { steps: StepItem[]; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const n = steps.length || 1;
  let last = -1;
  steps.forEach((s, i) => { if (s.state !== 'none') last = i; });
  const target = n > 1 ? Math.max(0, last) / (n - 1) : 0;
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target, a]);
  const inset = `${50 / n}%` as const;
  return (
    <View style={[{ flexDirection: 'row', marginTop: 18, marginHorizontal: 4 }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: inset, right: inset, top: 15, height: 4, borderRadius: 2, backgroundColor: c.line }}>
        <Animated.View style={{ height: 4, borderRadius: 2, backgroundColor: c.primary, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      {steps.map((s, i) => {
        const ok = s.state === 'ok';
        const now = s.state === 'now';
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${s.label}${s.time ? ' ' + s.time : ''}`}>
            <View
              style={{
                width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3,
                backgroundColor: ok ? '#16a34a' : now ? c.primary : c.card,
                borderColor: ok ? '#16a34a' : now ? c.primary : c.line,
                transform: now ? [{ scale: 1.12 }] : undefined,
              }}
            >
              <Icon name={s.icon} size={16} color={ok || now ? '#fff' : c.fg3} />
            </View>
            <Text style={{ fontFamily: now ? F.bold : F.semi, fontSize: 12, color: ok || now ? c.fg : c.fg3, textAlign: 'center' }} numberOfLines={1}>{s.label}</Text>
            {s.time ? <Text style={{ fontFamily: F.body, fontSize: 10, color: c.fg3, marginTop: -4 }}>{s.time}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Slide to confirm                                                    */
/* ------------------------------------------------------------------ */
const KNOB = 44;
const PAD = 6;
const H = 56;

export function SlideToConfirm({
  label,
  gold,
  onDone,
  disabled,
  resetKey,
  style,
}: {
  label: string;
  gold?: boolean;
  onDone: () => void;
  disabled?: boolean;
  /** change this value to re-arm the slider after completion */
  resetKey?: string | number;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const isGold = !!gold;   // 'gold' = the primary (violet) slider; otherwise a neutral dark one
  const bg = isGold ? c.primary : brand.ink;
  const fg = '#fff';
  const knobBg = '#fff';
  const knobFg = isGold ? c.primary : brand.ink;

  const [width, setWidth] = useState(0);
  const [done, setDone] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const nudge = useRef(new Animated.Value(0)).current;
  const widthRef = useRef(0);
  const doneRef = useRef(false);
  const dragging = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const disabledRef = useRef(!!disabled);
  disabledRef.current = !!disabled;
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled?.().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', setScreenReader);
    return () => sub?.remove?.();
  }, []);

  const travel = Math.max(0, width - KNOB - PAD * 2);

  const complete = useCallback(() => {
    if (doneRef.current || disabledRef.current) return;
    doneRef.current = true;
    setDone(true);
    nudge.stopAnimation();
    nudge.setValue(0);
    Animated.spring(x, { toValue: widthRef.current - KNOB - PAD * 2, useNativeDriver: useNative, speed: 20, bounciness: 6 }).start();
    ui.haptic([20, 40, 20]);
    onDoneRef.current();
  }, [x, nudge]);

  useEffect(() => {
    doneRef.current = false;
    setDone(false);
    x.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // idle nudge
  useEffect(() => {
    if (done || disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(nudge, { toValue: 14, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }),
        Animated.timing(nudge, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [done, disabled, nudge]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !doneRef.current && !disabledRef.current,
        onMoveShouldSetPanResponder: () => !doneRef.current && !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          nudge.stopAnimation();
          nudge.setValue(0);
          x.stopAnimation();
        },
        onPanResponderMove: (_e, g) => {
          const t = widthRef.current - KNOB - PAD * 2;
          x.setValue(Math.max(0, Math.min(t, g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          dragging.current = false;
          const t = widthRef.current - KNOB - PAD * 2;
          if (t > 0 && g.dx >= t * 0.85) complete();
          else Animated.spring(x, { toValue: 0, useNativeDriver: useNative, speed: 14, bounciness: 12 }).start();
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          Animated.spring(x, { toValue: 0, useNativeDriver: useNative }).start();
        },
      }),
    [x, nudge, complete],
  );

  const knobX = Animated.add(x, nudge);
  const fillX = Animated.add(x, new Animated.Value(KNOB + PAD * 2 - (width || 0)));
  const txtOpacity = travel > 0 ? x.interpolate({ inputRange: [0, travel * 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) : 1;

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onAccessibilityTap={complete}
      onPress={screenReader ? complete : undefined}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; setWidth(e.nativeEvent.layout.width); }}
      style={[
        {
          height: H, borderRadius: R.button, backgroundColor: bg, overflow: 'hidden', opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width || '100%', borderRadius: R.button, backgroundColor: 'rgba(255,255,255,0.14)', transform: [{ translateX: width ? fillX : -9999 }] }}
      />
      <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', paddingLeft: 44, paddingRight: 16, opacity: done ? 0 : txtOpacity }}>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 15, color: fg }}>{label}</Text>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{
          position: 'absolute', left: PAD, top: PAD, width: KNOB, height: KNOB, borderRadius: R.button - 2, backgroundColor: knobBg,
          alignItems: 'center', justifyContent: 'center', transform: [{ translateX: knobX }],
          ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any) : null),
        }}
      >
        <Icon name={done ? 'check' : 'arrow'} size={22} color={knobFg} />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Customer-style building blocks (2026-11 redesign)                   */
/* ------------------------------------------------------------------ */
/** Customer Auth Cta: full-width violet button (minHeight 56, radius 16, violet shadow). Disabled = soft lilac. `busy` (string) replaces the label and blocks taps. */
export function Cta({ label, onPress, disabled, busy, style }: { label: string; onPress?: () => void; disabled?: boolean; busy?: string | boolean; style?: S<ViewStyle> }) {
  const { c, dark, onViolet } = useTheme();
  const off = !!disabled || !!busy;
  const bg = disabled ? (onViolet ? 'rgba(255,255,255,0.14)' : dark ? 'rgba(255,255,255,0.08)' : '#E6E0F5') : onViolet ? '#FFFFFF' : c.primary;
  const fg = disabled ? (onViolet ? 'rgba(255,255,255,0.5)' : dark ? 'rgba(255,255,255,0.4)' : '#6B6483') : onViolet ? '#5409DA' : '#fff';
  const txt = typeof busy === 'string' ? busy : label;
  return (
    <Pressy
      onPress={onPress}
      disabled={off}
      accessibilityLabel={label}
      style={[
        { minHeight: 56, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', paddingHorizontal: 16, opacity: busy ? 0.85 : 1 },
        !disabled && !onViolet && c.shadow ? { shadowColor: brand.violet, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : null,
        style,
      ]}
    >
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, color: fg }}>{txt}</Text>
    </Pressy>
  );
}

export const VIOLET_GRAD = ['#6A1BF2', '#5409DA', '#36058F'] as const;
/**
 * Customer violet hero block: diagonal gradient #6A1BF2 > #5409DA > #36058F, a faint white circle top-right, children on top.
 * `top` handles the status-bar inset (default safe-area top + 8; pass a number to override, 0 for none).
 * `pad` = bottom padding (use 56 and a -40 marginTop on the next card to overlap). `rounded` rounds the bottom corners (24).
 */
export function VioletHero({ children, pad = 56, top, rounded, style }: { children?: React.ReactNode; pad?: number; top?: number; rounded?: boolean; style?: S<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 390, h: 220 });
  const id = 'vhero' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ overflow: 'hidden', backgroundColor: '#5409DA', paddingTop: top ?? insets.top + 8, paddingHorizontal: 16, paddingBottom: pad }, rounded ? { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 } : null, style]}
    >
      <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={VIOLET_GRAD[0]} />
            <Stop offset="0.5" stopColor={VIOLET_GRAD[1]} />
            <Stop offset="1" stopColor={VIOLET_GRAD[2]} />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={box.w} height={box.h} fill={`url(#${id})`} />
        <Circle cx={box.w - 50} cy={70} r={100} fill="#fff" fillOpacity={0.07} />
      </Svg>
      {children}
    </View>
  );
}

/** 36-48 square tile, radius 12, violet 8% fill, violet icon (or any `tone` colour, or custom children). */
export function IconTile({ icon, tone, size = 36, children, style }: { icon?: IconName; tone?: string; size?: number; children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const col = tone ?? c.primary;
  let bg = dark ? 'rgba(122,66,240,0.2)' : 'rgba(84,9,218,0.08)';
  const m = tone ? /^#([0-9a-f]{6})$/i.exec(tone) : null;
  if (m) { const n = parseInt(m[1], 16); bg = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${dark ? 0.2 : 0.12})`; }
  return (
    <View style={[{ width: size, height: size, borderRadius: size >= 44 ? 16 : 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.52)} color={col} /> : null)}
    </View>
  );
}

/**
 * Customer ListRow: 56px+, icon (grey line icon, or a violet IconTile with `tile`), 15/500 title, 13 sub, optional `right`,
 * chevron when pressable. Hairline under the row only when `divider` (or `last={false}`); ListGroup (ui/dash) already draws hairlines between its children.
 */
export function ListRow({ icon, tile, tone, title, sub, right, onPress, last, divider, danger, chevron = true, label, style }: {
  icon?: IconName; tile?: boolean; tone?: string; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void;
  last?: boolean; divider?: boolean; danger?: boolean; chevron?: boolean; label?: string; style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const lead = icon ? (tile ? <IconTile icon={icon} tone={tone} /> : <View style={{ width: 24, alignItems: 'center' }}><Icon name={icon} size={18} color={danger ? brand.red : tone ?? c.fg3} /></View>) : null;
  const body = (
    <>
      {lead}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: danger ? brand.red : c.fg }}>{title}</Text>
        {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
      {onPress && chevron ? <Icon name="chevron" size={18} color={c.fg3} /> : null}
    </>
  );
  const st: S<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56, borderBottomWidth: divider || last === false ? 1 : 0, borderBottomColor: c.line }, style];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={label ?? title} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}

/** Alias names. */
export const PrimaryButton = Cta;
