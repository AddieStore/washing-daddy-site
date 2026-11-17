// Local Pronto-style building blocks for Paisa / Extra / Profile / Rewards / Complaints and their sheets (style only).
// Copies of the customer app's patterns (Profile header, Money hero, ListRow, Empty, FadeUp, CountUp) on the washer's
// RN-only stack: Svg gradient instead of expo-linear-gradient, Animated instead of reanimated. Colours come from theme tokens.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, IconName, Pressy, brand, cardBox, cardShadow, useReducedMotion, useTheme } from '../ui';

const ND = Platform.OS !== 'web';
export const TNUM = { fontVariant: ['tabular-nums'] as const };
export const VIOLET_TINT = 'rgba(84,9,218,0.08)';

/* ---------- violet gradient header block (customer Profile / Money hero) ---------- */
export function VHeader({ children, pad = 56, style, top }: { children?: React.ReactNode; pad?: number; style?: StyleProp<ViewStyle>; top?: number }) {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 390, h: 220 });
  return (
    <View onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ overflow: 'hidden', backgroundColor: '#5409DA', paddingTop: top ?? insets.top + 16, paddingHorizontal: 16, paddingBottom: pad }, style]}>
      <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgGradient id="vh" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6A1BF2" /><Stop offset="0.5" stopColor="#5409DA" /><Stop offset="1" stopColor="#36058F" />
          </SvgGradient>
        </Defs>
        <Rect x={0} y={0} width={box.w} height={box.h} fill="url(#vh)" />
        <Circle cx={box.w - 10} cy={20} r={100} fill="#fff" fillOpacity={0.07} />
      </Svg>
      {children}
    </View>
  );
}

/** White pill that holds a control (the duty switch) so it reads on the violet header. */
export function OnHeaderPill({ children }: { children?: React.ReactNode }) {
  return <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 2 }}>{children}</View>;
}

/* ---------- motion ---------- */
/** Rises 16px with a fade; index staggers 35ms per item, capped at 12. */
export function FadeUp({ index = 0, children, style }: { index?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const rm = useReducedMotion();
  const v = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { v.setValue(1); return; }
    const a = Animated.timing(v, { toValue: 1, duration: 340, delay: Math.min(index, 12) * 35, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>;
}

/** A number that counts up to `to` (formatted by `fmt`), once and again when `to` changes. */
export function CountUp({ to, fmt, style, duration = 700 }: { to: number; fmt: (n: number) => string; style?: any; duration?: number }) {
  const rm = useReducedMotion();
  const [v, setV] = useState(rm ? to : 0);
  const from = useRef(rm ? to : 0);
  useEffect(() => {
    if (rm || !isFinite(to)) { setV(to); from.current = to; return; }
    let raf = 0, t0 = 0;
    const a = from.current;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / duration), e = 1 - Math.pow(1 - k, 3), x = a + (to - a) * e;
      setV(x); from.current = x;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, rm, duration]);
  return <Text style={[TNUM, style]} numberOfLines={1} adjustsFontSizeToFit>{fmt(Math.round(v))}</Text>;
}

/* ---------- cards ---------- */
/** White card, radius 16, no border (dark mode keeps a faint edge), spread shadow. onPress makes it a pressable (spring 0.96). */
export function WCard({ children, style, onPress, label, scaleTo = 0.97 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string; scaleTo?: number }) {
  const { c } = useTheme();
  const st: StyleProp<ViewStyle> = [cardBox(c), cardShadow(c), style];
  if (onPress) return <Pressy onPress={onPress} scaleTo={scaleTo} accessibilityLabel={label} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

/** Section heading, 18 / 600, optional grey note on the right. */
export function PSection({ title, note, style }: { title: string; note?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 24, marginBottom: 12 }, style]}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 24, color: c.fg, flexShrink: 1 }}>{title}</Text>
      {note ? <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3, flexShrink: 0 }} numberOfLines={1}>{note}</Text> : null}
    </View>
  );
}

/** 36px tile, radius 12, violet 8% tint, violet icon (or a tone). */
export function IconTile({ icon, tone, size = 36, children }: { icon?: IconName; tone?: string; size?: number; children?: React.ReactNode }) {
  const { c, dark } = useTheme();
  const col = tone ?? c.primary;
  const bg = tone ? tint(tone, dark ? 0.2 : 0.12) : dark ? 'rgba(122,66,240,0.2)' : VIOLET_TINT;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3 > 12 ? 12 : Math.round(size / 3), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.52)} color={col} /> : null)}
    </View>
  );
}

export function tint(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Customer ListRow: 56px+, icon left, 15/500 title, 13 sub, optional right content, chevron when pressable, hairline between rows. */
export function PRow({ icon, tile, tone, leading, title, sub, onPress, last, danger, right, chevron = true, children, label }: {
  icon?: IconName; tile?: boolean; tone?: string; leading?: React.ReactNode; title: string; sub?: string; onPress?: () => void; last?: boolean;
  danger?: boolean; right?: React.ReactNode; chevron?: boolean; children?: React.ReactNode; label?: string;
}) {
  const { c } = useTheme();
  const lead = leading ?? (icon ? (tile ? <IconTile icon={icon} tone={tone} /> : <View style={{ width: 24, alignItems: 'center' }}><Icon name={icon} size={18} color={danger ? brand.red : tone ?? c.fg3} /></View>) : null);
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label ?? (sub ? `${title}, ${sub}` : title)}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.tile2 : 'transparent' })}>
      <View style={{ minHeight: 56, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
          {lead}
          <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: danger ? brand.red : c.fg }}>{title}</Text>
            {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3, marginTop: 2 }}>{sub}</Text> : null}
          </View>
          {right}
          {onPress && chevron ? <Icon name="chevron" size={18} color={c.fg3} /> : null}
        </View>
        {children ? <View style={{ paddingBottom: 12 }}>{children}</View> : null}
      </View>
    </Pressable>
  );
}

/** Card holding PRows. */
export function RowsCard({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <WCard style={[{ paddingVertical: 0 }, style]}>{children}</WCard>;
}

/** Big violet-on-white metric tile for the 3-up row that overlaps the header. */
export function TileBox({ icon, label, value, onPress, tone }: { icon: IconName; label: string; value: string | number; onPress?: () => void; tone?: string }) {
  const { c } = useTheme();
  return (
    <WCard onPress={onPress} label={`${label} ${value}`} scaleTo={0.96} style={{ flex: 1, minWidth: 0, minHeight: 96, padding: 12, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <IconTile icon={icon} tone={tone} />
      </View>
      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: c.fg }]}>{value}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{label}</Text>
      </View>
    </WCard>
  );
}

/** Empty state: art circle, 600 title, sub. */
export function PEmpty({ title, text, icon = 'note' }: { title: string; text?: string; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <WCard style={{ paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={26} color={c.primary} />
        </View>
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg, marginTop: 16, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.fg3, marginTop: 4, textAlign: 'center' }}>{text}</Text> : null}
    </WCard>
  );
}

/** Small status chip (8 radius). */
export function Chip8({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color }}>{label}</Text>
    </View>
  );
}

/** Back + title bar on the violet header (full screens: Rewards, Complaints). Back target is passed in. */
export function VBack({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}>
      <Pressy onPress={onBack} hitSlop={8} scaleTo={0.9} accessibilityLabel={title} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" size={18} color="#fff" />
      </Pressy>
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 22, lineHeight: 28, color: '#fff' }}>{title}</Text>
      {right}
    </View>
  );
}

/** A thin line chevron-less hairline helper. */
export const Hair = () => {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
};

export { Path };
