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
import Svg, { Circle } from 'react-native-svg';
import { Icon, IconName } from './Icons';
import { ui } from './bus';
import { F, brand, cardShadow, useTheme } from './theme';

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
  scaleTo = 0.97,
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
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: useNative, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
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
  const { c } = useTheme();
  const v: Record<ButtonVariant, { bg: string; fg: string; shadow?: string; inset?: number; border?: boolean }> = {
    gold: { bg: brand.gold, fg: brand.ink, shadow: brand.gold, inset: 0.12 },
    violet: { bg: brand.violet, fg: brand.cream, shadow: brand.violet, inset: 0.18 },
    ink: { bg: brand.ink, fg: brand.cream },
    ghost: { bg: c.tile2, fg: c.fg, border: true },
    mint: { bg: brand.mint, fg: '#fff', shadow: brand.mint, inset: 0.14 },
    sos: { bg: brand.red, fg: '#fff' },
  };
  const t = v[variant];
  const ghost = variant === 'ghost';
  return (
    <Pressy
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        b.btn,
        {
          backgroundColor: t.bg,
          minHeight: ghost ? 56 : 64,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : 1,
          overflow: 'hidden',
        },
        t.border && { borderWidth: 1, borderColor: c.line },
        t.shadow && { shadowColor: t.shadow, shadowOpacity: 0.35, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
        style,
      ]}
    >
      {t.inset ? <View pointerEvents="none" style={[b.inset, { backgroundColor: `rgba(0,0,0,${t.inset})` }]} /> : null}
      {icon ? <Icon name={icon} size={24} color={t.fg} /> : null}
      <Text style={[b.txt, { color: t.fg, fontSize: ghost ? 16 : 18 }]} numberOfLines={2}>
        {label}
      </Text>
      {iconRight ? <Icon name={iconRight} size={24} color={t.fg} /> : null}
    </Pressy>
  );
}

const b = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22 },
  inset: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  txt: { fontFamily: F.black, textAlign: 'center', flexShrink: 1 },
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
      <Text style={[{ fontFamily: F.bold, fontSize: 15, color: color ?? c.fg2, textDecorationLine: 'underline' }, textStyle]}>{label}</Text>
    </Pressy>
  );
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                         */
/* ------------------------------------------------------------------ */
export function Card({ children, style, onPress }: { children?: React.ReactNode; style?: S<ViewStyle>; onPress?: () => void }) {
  const { c } = useTheme();
  const st: S<ViewStyle> = [{ borderRadius: 28, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }, cardShadow(c), style];
  if (onPress) return <Pressy onPress={onPress} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

export function Section({ title, meta, children, style }: { title?: string; meta?: string; children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ marginTop: 26 }, style]}>
      {title || meta ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          {title ? <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 20, color: c.fg, letterSpacing: -0.2, flexShrink: 1 }}>{title}</Text> : <View />}
          {meta ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{meta}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Eyebrow({ children, style }: { children?: React.ReactNode; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.black, fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase', color: c.fg3 }, style]}>{children}</Text>;
}

export function BigTitle({ children, em, size = 44, style }: { children?: React.ReactNode; em?: string; size?: number; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: F.shout, fontSize: size, lineHeight: size * 0.98, textTransform: 'uppercase', color: c.fg, marginTop: 4 }, style]}>
      {children}
      {em ? <Text style={{ color: c.em }}>{children ? ' ' : ''}{em}</Text> : null}
    </Text>
  );
}

export function Chip({ children, icon, style }: { children?: React.ReactNode; icon?: IconName; style?: S<ViewStyle> }) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 8, paddingLeft: 10, paddingRight: 12, borderRadius: 999, backgroundColor: 'rgba(18,7,36,0.55)', borderWidth: 1, borderColor: 'rgba(255,246,233,0.18)' },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={brand.cream} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: brand.cream }}>{children}</Text>
    </View>
  );
}

export type StatusKey = 'scheduled' | 'on_the_way' | 'arrived' | 'washing' | 'done' | 'skipped';

export function StatusPill({ status, label, style }: { status: StatusKey | string; label: string; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    scheduled: { bg: c.tile2, fg: c.fg2 },
    on_the_way: { bg: 'rgba(46,139,255,0.18)', fg: dark ? '#8fc0ff' : '#1f6fd6' },
    arrived: { bg: 'rgba(255,106,26,0.18)', fg: dark ? '#ffb38a' : '#c94d0c' },
    washing: { bg: brand.violet, fg: '#fff' },
    done: { bg: 'rgba(20,192,138,0.2)', fg: dark ? '#6ff0c4' : '#0b8a62' },
    skipped: { bg: 'rgba(232,56,79,0.15)', fg: dark ? '#ff8a9a' : brand.red },
  };
  const t = map[status] ?? map.scheduled;
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: t.bg }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 11.5, color: t.fg }}>{label}</Text>
    </View>
  );
}

export function Plate({ reg, style }: { reg: string; style?: S<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: brand.ink }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 13, letterSpacing: 1, color: brand.ink }}>{reg}</Text>
    </View>
  );
}

export function Tier({ label, style }: { label: string; style?: S<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: brand.gold }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 12, color: brand.ink }}>{label}</Text>
    </View>
  );
}

export type XKind = 'foam' | 'interior' | 'tyre' | 'detailing';

export function XChip({ kind, label, small, style }: { kind?: XKind | string; label: string; small?: boolean; style?: S<ViewStyle> }) {
  const { c, dark } = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    foam: { bg: 'rgba(46,139,255,0.16)', fg: dark ? '#8fc0ff' : '#1f6fd6' },
    interior: { bg: 'rgba(255,106,26,0.16)', fg: dark ? '#ffb38a' : '#c94d0c' },
    tyre: { bg: 'rgba(20,192,138,0.16)', fg: dark ? '#6ff0c4' : '#0b8a62' },
    detailing: { bg: 'rgba(255,186,8,0.24)', fg: dark ? '#ffd45c' : '#8a6200' },
  };
  const t = (kind && map[kind]) || { bg: c.tile2, fg: c.fg };
  return (
    <View style={[{ alignSelf: 'flex-start', paddingVertical: small ? 2 : 4, paddingHorizontal: small ? 7 : 9, borderRadius: 999, backgroundColor: t.bg }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: small ? 11 : 12, color: t.fg }}>{label}</Text>
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
  /** top hairline (use on 2nd+ rows) */
  divider?: boolean;
  style?: S<ViewStyle>;
}) {
  const { c } = useTheme();
  const body = (
    <>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.tile2, alignItems: 'center', justifyContent: 'center' }}>
          {typeof icon === 'string' ? <Icon name={icon as IconName} size={20} color={iconColor ?? c.fg} /> : icon}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </>
  );
  const st: S<ViewStyle> = [
    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 66 },
    divider && { borderTopWidth: 1, borderTopColor: c.line },
    style,
  ];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={title} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}

export function Tile({ emoji, value, unit, label, style }: { emoji?: string; value: string | number; unit?: string; label?: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ borderRadius: 22, padding: 16, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }, cardShadow(c), style]}>
      {emoji ? <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</Text> : null}
      <Text style={{ fontFamily: F.shout, fontSize: 40, lineHeight: 46, color: c.fg }}>
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
  const col = state === 'live' ? brand.mint : state === 'wait' ? brand.orange : state === 'demo' ? brand.gold : c.fg3;
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
  const { c } = useTheme();
  return (
    <Pressy
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.94}
      accessibilityLabel={text}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingLeft: 12, paddingRight: 14, borderRadius: 999, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, alignSelf: 'flex-start' },
        cardShadow(c),
        style,
      ]}
    >
      <SyncDot state={state} />
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 13, color: c.fg }}>{text}</Text>
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
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3 }}>{subtitle}</Text> : null}
      </View>
      <Animated.View style={{ width: 52, height: 30, borderRadius: 99, padding: 3, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [c.fg3, brand.mint] }) }}>
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
            style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? brand.violet : c.tile2, transform: on ? [{ scale: 1.04 }] : undefined }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: on ? brand.cream : c.fg }}>{o.label}</Text>
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
  const { c } = useTheme();
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
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: on ? brand.violet : c.line, backgroundColor: on ? brand.violet : c.tile }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? '#fff' : c.fg }}>{opt.label}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

export function Field({ big = true, style, onFocus, onBlur, multiline, ...rest }: TextInputProps & { big?: boolean }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.fg3}
      multiline={multiline}
      {...rest}
      onFocus={(e) => { setFocus(true); onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); onBlur?.(e); }}
      style={[
        {
          width: '100%',
          borderRadius: 16,
          borderWidth: 2,
          borderColor: focus ? c.accent : c.line,
          backgroundColor: c.inputBg,
          color: c.fg,
          fontFamily: big && !multiline ? F.semi : F.body,
          fontSize: big && !multiline ? 17 : 16,
          paddingVertical: 14,
          paddingHorizontal: big && !multiline ? 16 : 14,
          minHeight: multiline ? 96 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
export function Empty({ title, text, style }: { title: string; text?: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ borderRadius: 28, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: c.dash }, style]}>
      <Text style={{ fontFamily: F.black, fontSize: 17, color: c.fg, marginBottom: 4, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ fontFamily: F.body, fontSize: 14.5, color: c.fg2, textAlign: 'center' }}>{text}</Text> : null}
    </View>
  );
}

export function DemoNote({ children, style }: { children?: React.ReactNode; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 12 }, style]}>{children}</Text>;
}

export function CallButton({ phone, small, label, style }: { phone: string; small?: boolean; label?: string; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const call = useCallback(() => { void Linking.openURL('tel:' + String(phone).replace(/[^\d+]/g, '')).catch(() => {}); }, [phone]);
  return (
    <Pressy
      onPress={call}
      scaleTo={0.92}
      accessibilityLabel={label ?? 'Call'}
      style={[
        small
          ? { height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', gap: 8 }
          : { width: 52, height: 52, borderRadius: 26 },
        { alignItems: 'center', justifyContent: 'center', backgroundColor: brand.mint },
        cardShadow(c),
        style,
      ]}
    >
      <Icon name="phone" size={small ? 20 : 24} color="#fff" />
      {small ? <Text style={{ fontFamily: F.black, fontSize: 15, color: '#fff' }}>{label ?? 'Call'}</Text> : null}
    </Pressy>
  );
}

export function ProgressBar({ fraction, color, height = 12, style }: { fraction: number; color?: 'mint' | 'gold' | string; height?: number; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const f = Math.max(0, Math.min(1, fraction || 0));
  useEffect(() => {
    Animated.timing(a, { toValue: f, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [f, a]);
  const col = color === 'gold' ? brand.gold : !color || color === 'mint' ? brand.mint : color;
  const cap = color === 'gold' ? '#ffd45c' : '#5fe0b4';
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: c.line, overflow: 'hidden' }, style]}
    >
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), borderRadius: height / 2, backgroundColor: col, borderRightWidth: height * 0.5, borderRightColor: cap }} />
    </View>
  );
}

export function Ring({
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
        <Circle cx={50} cy={50} r={44} fill="none" stroke={color ?? brand.gold} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - v)} />
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
      <View pointerEvents="none" style={{ position: 'absolute', left: inset, right: inset, top: 17, height: 4, borderRadius: 2, backgroundColor: c.line }}>
        <Animated.View style={{ height: 4, borderRadius: 2, backgroundColor: dark ? brand.gold : brand.violet, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      {steps.map((s, i) => {
        const ok = s.state === 'ok';
        const now = s.state === 'now';
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${s.label}${s.time ? ' ' + s.time : ''}`}>
            <View
              style={{
                width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 3,
                backgroundColor: ok ? brand.mint : now ? brand.violet : c.bg,
                borderColor: ok ? brand.mint : now ? brand.violet : c.line,
                transform: now ? [{ scale: 1.12 }] : undefined,
                ...(now ? { shadowColor: brand.violet, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 } : null),
              }}
            >
              <Icon name={s.icon} size={18} color={ok || now ? '#fff' : c.fg3} />
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: ok || now ? c.fg : c.fg3, textAlign: 'center' }} numberOfLines={1}>{s.label}</Text>
            {s.time ? <Text style={{ fontFamily: F.semi, fontSize: 11, color: c.fg3, marginTop: -4 }}>{s.time}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Slide to confirm                                                    */
/* ------------------------------------------------------------------ */
const KNOB = 60;
const PAD = 6;
const H = 72;

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
  const { onViolet } = useTheme();
  const isGold = gold || onViolet;
  const bg = isGold ? brand.gold : brand.ink;
  const fg = isGold ? brand.ink : brand.cream;
  const knobBg = isGold ? brand.ink : brand.gold;
  const knobFg = isGold ? brand.gold : brand.ink;

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
          height: H, borderRadius: H / 2, backgroundColor: bg, overflow: 'hidden', opacity: disabled ? 0.5 : 1,
          shadowColor: isGold ? brand.gold : '#1A0A33', shadowOpacity: isGold ? 0.35 : 0.3, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width || '100%', borderRadius: H / 2, backgroundColor: 'rgba(255,255,255,0.14)', transform: [{ translateX: width ? fillX : -9999 }] }}
      />
      <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', paddingLeft: 56, paddingRight: 16, opacity: done ? 0 : txtOpacity }}>
        <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 18, color: fg }}>{label}</Text>
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{
          position: 'absolute', left: PAD, top: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: knobBg,
          alignItems: 'center', justifyContent: 'center', transform: [{ translateX: knobX }],
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any) : null),
        }}
      >
        <Icon name={done ? 'check' : 'arrow'} size={28} color={knobFg} />
      </Animated.View>
    </Pressable>
  );
}
