// Dashboard-style building blocks for the 2026 redesign (see design/partner-redesign-spec.md).
// All presentational: data comes in through props, nothing here reads the store. Colours come from theme tokens
// (card, soft, primary, hero, heroTrack...), so every piece works in light and dark mode. Text is passed in already
// translated (call t() at the usage site). Preview of everything: the hidden /_kit route.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { Icon, IconName } from './Icons';
import { Pressy } from './kit';
import { useReducedMotion } from './Hosts';
import { F, brand, cardShadow, useTheme } from './theme';

type S<T> = StyleProp<T>;

/** 0 -> 1 once (and again when `key` changes); jumps straight to 1 with reduced motion. */
function useGrow(key: unknown, duration = 900, delay = 0) {
  const rm = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rm) { v.setValue(1); return; }
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [key, rm, v, duration, delay]);
  return v;
}

/** Plain white card (radius 24, soft shadow, no border). Pass onPress to make it tappable. */
export function DashCard({ children, style, onPress, accessibilityLabel }: {
  children?: React.ReactNode; style?: S<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const st: S<ViewStyle> = [{ borderRadius: 24, backgroundColor: c.card }, cardShadow(c), style];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={accessibilityLabel} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

/** Section heading, 17px semibold, with an optional small action text on the right. */
export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 }, style]}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 17, color: c.fg }}>{title}</Text>
      {action ? <Text onPress={onAction} style={{ fontFamily: F.semi, fontSize: 13, color: c.primary }}>{action}</Text> : null}
    </View>
  );
}

/** Round icon bubble used inside cards (icon on a soft tinted circle). */
export function IconBubble({ icon, size = 38, tint, bg, children }: { icon?: IconName; size?: number; tint?: string; bg?: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.soft, alignItems: 'center', justifyContent: 'center' }}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.52)} color={tint ?? c.softInk} /> : null)}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Ring                                                                */
/* ------------------------------------------------------------------ */
export type RingProps = {
  /** 0..1 progress (clamped). */
  fraction: number;
  size?: number;
  stroke?: number;
  /** Progress colour. Default brand gold. */
  color?: string;
  /** Track colour. Default the hero track. */
  track?: string;
  /** Big number in the middle (e.g. 6). */
  value?: string | number;
  /** Small caption under the number (e.g. "cars"). */
  label?: string;
  /** Replaces the value/label with your own centre content. */
  children?: React.ReactNode;
  /** Text colour of the centre. Default heroInk. */
  ink?: string;
  /** Fill of the inner disc. Default a translucent white (right for the gold hero card; pass 'transparent' on plain cards). */
  disc?: string;
  style?: S<ViewStyle>;
};
/** Progress ring with an inner lighter disc and a centre number + label. Animates in. */
export function Ring({ fraction, size = 92, stroke = 9, color, track, value, label, children, ink, disc, style }: RingProps) {
  const { c } = useTheme();
  const f = Math.max(0, Math.min(1, fraction || 0));
  const g = useGrow(f);
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = g.addListener(({ value: x }) => setV(x));
    return () => g.removeListener(id);
  }, [g]);
  const r = 44, C = 2 * Math.PI * r;
  const col = ink ?? c.heroInk;
  return (
    <View style={[{ width: size, height: size }, style]} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(f * 100) }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={r - stroke / 2 - 3} fill={disc ?? 'rgba(255,255,255,0.45)'} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={track ?? c.heroTrack} strokeWidth={stroke} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={color ?? brand.gold} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - f * v)} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children ?? (
          <>
            {value !== undefined ? <Text style={{ fontFamily: F.black, fontSize: size * 0.3, lineHeight: size * 0.34, color: col }}>{value}</Text> : null}
            {label ? <Text style={{ fontFamily: F.body, fontSize: Math.max(10, size * 0.115), color: col, opacity: 0.7 }}>{label}</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* HeroCard                                                            */
/* ------------------------------------------------------------------ */
export type HeroCardProps = {
  /** Small line with an icon above the title (e.g. "Aaj ka round"). */
  eyebrow?: string;
  eyebrowIcon?: IconName;
  /** Big title, up to two lines. */
  title: string;
  subtitle?: string;
  /** Ring shown on the right. Omit for a text-only hero. */
  ring?: RingProps;
  /** Anything extra under the text (chips, buttons). */
  children?: React.ReactNode;
  onPress?: () => void;
  style?: S<ViewStyle>;
};
/** Tinted (soft gold) hero card: eyebrow, title, subtitle on the left, a Ring on the right. */
export function HeroCard({ eyebrow, eyebrowIcon = 'flag', title, subtitle, ring, children, onPress, style }: HeroCardProps) {
  const { c } = useTheme();
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {heroEyebrow(eyebrow, eyebrowIcon, c.heroInk)}
          <Text style={{ fontFamily: F.black, fontSize: 24, lineHeight: 30, color: c.heroInk, marginTop: eyebrow ? 10 : 0 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 13.5, color: c.heroInk, opacity: 0.72, marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
        {ring ? <Ring size={96} {...ring} /> : null}
      </View>
      {children ? <View style={{ marginTop: 14 }}>{children}</View> : null}
    </>
  );
  const st: S<ViewStyle> = [{ borderRadius: 24, backgroundColor: c.hero, padding: 18 }, style];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={title} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}
function heroEyebrow(text: string | undefined, icon: IconName, ink: string) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={13} color={ink} />
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: ink, opacity: 0.8 }}>{text}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* StatCard                                                            */
/* ------------------------------------------------------------------ */
export type StatCardProps = {
  /** Top-left label (e.g. "Cars done"). */
  label: string;
  /** Big number, 28px extra bold. */
  value: string | number;
  /** Small grey unit next to the number ("cars", "₹"). */
  unit?: string;
  /** Icon in the bubble top right. */
  icon?: IconName;
  /** Bubble tint, default violet; pass brand.mint / brand.orange etc. */
  tone?: string;
  onPress?: () => void;
  style?: S<ViewStyle>;
};
/** White card: label + icon bubble on top, big number + small unit below. Put two side by side with flex: 1. */
export function StatCard({ label, value, unit, icon, tone, onPress, style }: StatCardProps) {
  const { c } = useTheme();
  const tint = tone ?? c.softInk;
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`} style={[{ padding: 16, minHeight: 104, justifyContent: 'space-between' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 19, color: c.fg, flex: 1 }}>{label}</Text>
        {icon ? <IconBubble icon={icon} tint={tint} bg={tone ? withAlpha(tone, 0.14) : undefined} /> : null}
      </View>
      <BigNumber value={value} unit={unit} />
    </DashCard>
  );
}

/** Big extra-bold number with a small grey unit. size defaults to 28. */
export function BigNumber({ value, unit, size = 28, style }: { value: string | number; unit?: string; size?: number; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text style={[{ fontFamily: F.black, fontSize: size, lineHeight: size * 1.2, color: c.fg }, style]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
      {unit ? <Text style={{ fontFamily: F.body, fontSize: Math.max(12, size * 0.5), color: c.fg3 }}> {unit}</Text> : null}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Tile                                                                */
/* ------------------------------------------------------------------ */
export type TileProps = {
  label: string;
  value: string | number;
  unit?: string;
  icon?: IconName;
  tone?: string;
  /** Optional mini chart under the label (see Sparkline). */
  spark?: number[];
  sparkKind?: SparklineProps['kind'];
  onPress?: () => void;
  style?: S<ViewStyle>;
};
/** Small metric card (radius 20): icon + label, optional sparkline, number + unit. Use two per row (width '48%'). */
export function Tile({ label, value, unit, icon, tone, spark, sparkKind = 'bars', onPress, style }: TileProps) {
  const { c } = useTheme();
  const tint = tone ?? c.softInk;
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`} style={[{ borderRadius: 20, padding: 14, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <IconBubble icon={icon} size={32} tint={tint} bg={tone ? withAlpha(tone, 0.14) : undefined} /> : null}
        <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2, flex: 1 }} numberOfLines={1}>{label}</Text>
      </View>
      {spark && spark.length > 1 ? <Sparkline data={spark} kind={sparkKind} color={tone ?? c.primary} height={30} /> : null}
      <BigNumber value={value} unit={unit} size={24} />
    </DashCard>
  );
}

/* ------------------------------------------------------------------ */
/* WeekStrip                                                           */
/* ------------------------------------------------------------------ */
export type WeekDay = {
  key: string;
  /** Short day name, already translated (e.g. t('Mon')). */
  label: string;
  /** Date number shown under it. */
  date: string | number;
  /** Small dot under the date (e.g. a round exists that day). */
  dot?: boolean;
};
export type WeekStripProps = {
  days: WeekDay[];
  /** key of the selected day (violet pill). */
  selected?: string;
  onSelect?: (key: string) => void;
  /** Heading on the left (e.g. "November 2026"). Omit to show only the days. */
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
  style?: S<ViewStyle>;
};
/** White card with an optional month title + arrows and 7 day columns; the selected one is a tall violet pill. */
export function WeekStrip({ days, selected, onSelect, title, onPrev, onNext, style }: WeekStripProps) {
  const { c } = useTheme();
  return (
    <DashCard style={[{ padding: 16 }, style]}>
      {title || onPrev || onNext ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 16, color: c.fg }}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {onPrev ? <PillButton icon="back" label="‹" size={30} onPress={onPrev} flat /> : null}
            {onNext ? <PillButton icon="arrow" label="›" size={30} onPress={onNext} flat /> : null}
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => {
          const on = d.key === selected;
          const dayStyle = { flex: 1, alignItems: 'center' as const, paddingVertical: 8, borderRadius: 22, backgroundColor: on ? c.primary : 'transparent', gap: 8 };
          const inner = (
            <>
              <Text style={{ fontFamily: F.body, fontSize: 11, color: on ? '#fff' : c.fg3 }} numberOfLines={1}>{d.label}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? '#fff' : c.fg }}>{d.date}</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: d.dot ? (on ? brand.gold : c.primary) : 'transparent' }} />
            </>
          );
          // no handler = a plain read-only day (not announced as a button)
          if (!onSelect) return <View key={d.key} accessible accessibilityLabel={`${d.label} ${d.date}`} style={dayStyle}>{inner}</View>;
          return (
            <Pressy key={d.key} onPress={() => onSelect(d.key)} scaleTo={0.94} accessibilityLabel={`${d.label} ${d.date}`}
              accessibilityRole="radio" accessibilityState={{ selected: on }} style={dayStyle}>
              {inner}
            </Pressy>
          );
        })}
      </View>
    </DashCard>
  );
}

/* ------------------------------------------------------------------ */
/* BarChart                                                            */
/* ------------------------------------------------------------------ */
export type BarDatum = {
  /** Axis label, already translated (e.g. t('Mon')). */
  label: string;
  /** Bar height value. */
  value: number;
  /** Faded hatched "target" bar behind it. Also the divisor for the % label. */
  target?: number;
  /** Text above the bar. Default: percent of target when a target exists, else the value. */
  top?: string;
};
export type BarChartProps = {
  data: BarDatum[];
  /** Index of the violet bar; others are light violet. */
  highlight?: number;
  /** Chart area height (bars only). Default 190. */
  height?: number;
  /** Scale maximum; default the biggest of value/target. */
  max?: number;
  onSelect?: (index: number) => void;
  style?: S<ViewStyle>;
};
/** 7 (or any number of) paired bars: hatched target behind, solid value in front, label above, day name below. */
export function BarChart({ data, highlight, height = 190, max, onSelect, style }: BarChartProps) {
  const { c } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = max ?? Math.max(1, ...data.map((d) => Math.max(d.value, d.target ?? 0)));
  const g = useGrow(data.map((d) => d.value).join(','), 800, 100);
  const BW = 14;
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }, style]}>
      {data.map((d, i) => {
        const on = i === highlight;
        const vh = Math.max(d.value > 0 ? 6 : 2, (d.value / top) * height);
        const th = d.target ? Math.max(6, (d.target / top) * height) : 0;
        const label = d.top ?? (d.target ? `${Math.round((d.value / d.target) * 100)}%` : String(d.value));
        return (
          <Pressy key={i} onPress={onSelect ? () => onSelect(i) : undefined} disabled={!onSelect} scaleTo={0.96} accessibilityLabel={`${d.label} ${label}`} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: height + 22, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Animated.Text style={{ fontFamily: on ? F.bold : F.body, fontSize: 11.5, color: on ? c.fg : c.fg3, marginBottom: 4, opacity: g }}>{label}</Animated.Text>
              <View style={{ height: Math.max(vh, th), width: BW * 2 - 4, flexDirection: 'row', alignItems: 'flex-end' }}>
                {th ? (
                  <Svg width={BW} height={th} style={{ zIndex: 0 }}>
                    <Defs>
                      <Pattern id={`${id}h`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <Line x1={0} y1={0} x2={0} y2={5} stroke={c.soft} strokeWidth={2.2} />
                      </Pattern>
                    </Defs>
                    <Rect x={0} y={0} width={BW} height={th} rx={7} fill={`url(#${id}h)`} />
                  </Svg>
                ) : <View style={{ width: BW }} />}
                <Animated.View style={{ width: BW, marginLeft: -4, height: g.interpolate({ inputRange: [0, 1], outputRange: [2, vh] }), borderRadius: 7, backgroundColor: on ? c.primary : c.soft, zIndex: 1 }} />
              </View>
            </View>
            <Text style={{ fontFamily: on ? F.semi : F.body, fontSize: 12, color: on ? c.fg : c.fg3, marginTop: 8 }} numberOfLines={1}>{d.label}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */
export type SparklineProps = {
  data: number[];
  /** 'line' = smooth line with soft fill, 'bars' = thin rounded bars. */
  kind?: 'line' | 'bars';
  /** Width; default fills the parent. */
  width?: number;
  height?: number;
  color?: string;
  style?: S<ViewStyle>;
};
/** Tiny chart without axes. Fills the parent's width unless `width` is given. */
export function Sparkline({ data, kind = 'line', width, height = 36, color, style }: SparklineProps) {
  const { c } = useTheme();
  const [w, setW] = useState(width ?? 0);
  const col = color ?? c.primary;
  const W = width ?? w;
  const lo = Math.min(...data), hi = Math.max(...data);
  const span = hi - lo || 1;
  const pts = useMemo(() => data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, height - 3 - ((v - lo) / span) * (height - 6)] as const), [data, W, height, lo, span]);
  return (
    <View style={[{ height, width: width ?? '100%' }, style]} onLayout={width ? undefined : (e) => setW(e.nativeEvent.layout.width)}>
      {W > 0 ? (
        <Svg width={W} height={height}>
          {kind === 'bars'
            ? data.map((v, i) => {
                const bw = Math.max(2, Math.min(5, (W / data.length) * 0.45));
                const bh = Math.max(3, ((v - Math.min(0, lo)) / (hi - Math.min(0, lo) || 1)) * height);
                const x = (i + 0.5) * (W / data.length) - bw / 2;
                return <Rect key={i} x={x} y={height - bh} width={bw} height={bh} rx={bw / 2} fill={col} />;
              })
            : (
              <>
                <Path d={`${smooth(pts)} L ${W} ${height} L 0 ${height} Z`} fill={col} opacity={0.12} />
                <Path d={smooth(pts)} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
        </Svg>
      ) : null}
    </View>
  );
}
function smooth(p: readonly (readonly [number, number])[]): string {
  if (!p.length) return '';
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length; i++) {
    const mx = (p[i - 1][0] + p[i][0]) / 2;
    d += ` C ${mx} ${p[i - 1][1]} ${mx} ${p[i][1]} ${p[i][0]} ${p[i][1]}`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* ListCard                                                            */
/* ------------------------------------------------------------------ */
export type ListChip = { label: string; tone?: string };
export type ListCardProps = {
  title: string;
  /** Small grey line under the title. */
  detail?: string;
  /** Left icon bubble. */
  icon?: IconName;
  iconTone?: string;
  /** Anything custom on the left instead of the icon (a plate, a number). */
  leading?: React.ReactNode;
  /** Tiny pills on the right, before the round button. */
  chips?: ListChip[];
  /** Custom content on the right (thumbnails, price). */
  right?: React.ReactNode;
  /** Round button at the far right. Default 'none'. */
  action?: 'plus' | 'chevron' | 'check' | 'none';
  /** Tap on the whole card. */
  onPress?: () => void;
  /** Tap on the round button only (falls back to onPress). */
  onAction?: () => void;
  style?: S<ViewStyle>;
  children?: React.ReactNode;
};
/** Row card: title + detail on the left, chips / thumbnails and a round "+" or chevron button on the right. */
export function ListCard({ title, detail, icon, iconTone, leading, chips, right, action = 'none', onPress, onAction, style, children }: ListCardProps) {
  const { c } = useTheme();
  const hasAction = action !== 'none';
  return (
    <DashCard onPress={onPress} accessibilityLabel={detail ? `${title}, ${detail}` : title} style={[{ padding: 14 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {leading ?? (icon ? <IconBubble icon={icon} size={42} tint={iconTone} bg={iconTone ? withAlpha(iconTone, 0.14) : undefined} /> : null)}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 15.5, color: c.fg }} numberOfLines={1}>{title}</Text>
          {detail ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 2 }} numberOfLines={2}>{detail}</Text> : null}
        </View>
        {chips?.length ? (
          <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
            {chips.map((ch, i) => (
              <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: ch.tone ? withAlpha(ch.tone, 0.15) : c.soft }}>
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: ch.tone ?? c.softInk }}>{ch.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {right}
        {hasAction ? (
          <PillButton
            icon={action === 'plus' ? 'plus' : action === 'check' ? 'check' : 'arrow'}
            label={title}
            size={34}
            flat
            onPress={onAction ?? onPress}
          />
        ) : null}
      </View>
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </DashCard>
  );
}

/* ------------------------------------------------------------------ */
/* PillButton                                                          */
/* ------------------------------------------------------------------ */
export type PillButtonProps = {
  icon?: IconName;
  /** Accessibility label (required: the button has no text). */
  label: string;
  onPress?: () => void;
  /** Diameter, default 44. */
  size?: number;
  /** 'white' card-coloured (default), 'violet' filled, 'gold' filled. */
  tone?: 'white' | 'violet' | 'gold';
  /** Count bubble in the corner. */
  badge?: number;
  /** No shadow, light-violet fill (used inside cards). */
  flat?: boolean;
  /** Custom glyph instead of an Icon. */
  children?: React.ReactNode;
  style?: S<ViewStyle>;
};
/** Fully round icon button, 44px by default. */
export function PillButton({ icon, label, onPress, size = 44, tone = 'white', badge, flat, children, style }: PillButtonProps) {
  const { c } = useTheme();
  const bg = flat ? c.soft : tone === 'violet' ? c.primary : tone === 'gold' ? brand.gold : c.card;
  const fg = flat ? c.softInk : tone === 'violet' ? '#fff' : tone === 'gold' ? brand.ink : c.fg;
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.92} hitSlop={size < 44 ? (44 - size) / 2 : 0} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, flat ? null : cardShadow(c), style]}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.46)} color={fg} /> : null)}
      {badge && badge > 0 ? (
        <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.black, fontSize: 10.5, color: '#fff' }}>{badge}</Text>
        </View>
      ) : null}
    </Pressy>
  );
}

/* ------------------------------------------------------------------ */
/* AppHeader                                                           */
/* ------------------------------------------------------------------ */
export type HeaderAction = { icon: IconName; label: string; onPress?: () => void; badge?: number };
export type AppHeaderProps = {
  /** Person's name, bold. */
  name: string;
  /** Small grey line above it (e.g. t('Namaste')). */
  greeting?: string;
  /** Photo; without it a violet circle with the initial is drawn. */
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  /** Up to two round buttons on the right. */
  actions?: HeaderAction[];
  /** Adds the top safe-area inset itself. Default true. */
  safeTop?: number;
  style?: S<ViewStyle>;
};
/** Header for every tab: round avatar + greeting + name on the left, two 44px white round buttons on the right. */
export function AppHeader({ name, greeting, avatarUri, onAvatarPress, actions, safeTop = 0, style }: AppHeaderProps) {
  const { c } = useTheme();
  const initial = (name.trim()[0] || '?').toUpperCase();
  const av = avatarUri
    ? <Image source={{ uri: avatarUri }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.soft }} />
    : (
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.black, fontSize: 20, color: brand.gold }}>{initial}</Text>
      </View>
    );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: safeTop + 12, paddingBottom: 12 }, style]}>
      <Pressy onPress={onAvatarPress} disabled={!onAvatarPress} accessibilityLabel={name} scaleTo={0.94}>{av}</Pressy>
      <View style={{ flex: 1, minWidth: 0 }}>
        {greeting ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3 }} numberOfLines={1}>{greeting}</Text> : null}
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17, color: c.fg }} numberOfLines={1}>{name}</Text>
      </View>
      {(actions ?? []).slice(0, 2).map((a, i) => <PillButton key={i} icon={a.icon} label={a.label} onPress={a.onPress} badge={a.badge} />)}
    </View>
  );
}

/** '#RRGGBB' + alpha -> rgba(). Other colour formats come back unchanged. */
function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
