// Dashboard-style building blocks for the 2026 redesign (see design/partner-redesign-spec.md).
// All presentational: data comes in through props, nothing here reads the store. Colours come from theme tokens
// (card, soft, primary, hero, heroTrack...), so every piece works in light and dark mode. Text is passed in already
// translated (call t() at the usage site). Preview of everything: the hidden /_kit route.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import { Icon, IconName } from './Icons';
import { Pressy } from './kit';
import { useReducedMotion } from './Hosts';
import { F, OnViolet, R, brand, cardBox, cardShadow, useTheme } from './theme';

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

/** Pronto card: white, radius 16, no border, soft spread shadow (dark mode: faint edge). Pass onPress to make it tappable (press spring 0.96). */
export function DashCard({ children, style, onPress, accessibilityLabel }: {
  children?: React.ReactNode; style?: S<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const st: S<ViewStyle> = [cardBox(c), cardShadow(c), style];
  if (onPress) return <Pressy onPress={onPress} accessibilityLabel={accessibilityLabel} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

/** Section heading, 18px semibold, with an optional small note / link on the right. */
export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }, style]}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 26, color: c.fg }}>{title}</Text>
      {action ? <Text onPress={onAction} style={{ fontFamily: onAction ? F.semi : F.body, fontSize: 13, color: onAction ? c.primary : c.fg3 }}>{action}</Text> : null}
    </View>
  );
}

/** Icon tile: 36px, radius 12, violet 8% tint with a violet icon (pass `bg`/`tint` for another tone, or a solid `bg`). */
export function IconBubble({ icon, size = 36, tint, bg, children }: { icon?: IconName; size?: number; tint?: string; bg?: string; children?: React.ReactNode }) {
  const { c, dark, onViolet } = useTheme();
  const fill = bg ?? (onViolet ? 'rgba(255,255,255,0.15)' : dark ? 'rgba(139,92,246,0.2)' : 'rgba(84,9,218,0.08)');
  return (
    <View style={{ width: size, height: size, borderRadius: size <= 40 ? 12 : Math.round(size / 3), backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.52)} color={tint ?? (onViolet ? '#fff' : c.primary)} /> : null)}
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
  /** Progress colour. Default violet (gold-white on the hero card). */
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
  /** Colour of the small caption. Default the muted ink. */
  labelColor?: string;
  /** Fill of the inner disc. Default a translucent white (right for the gold hero card; pass 'transparent' on plain cards). */
  disc?: string;
  style?: S<ViewStyle>;
};
/** Progress ring with an inner lighter disc and a centre number + label. Animates in. */
export function Ring({ fraction, size = 86, stroke = 11.5, color, track, value, label, children, ink, labelColor, disc, style }: RingProps) {
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
        <Circle cx={50} cy={50} r={r - stroke / 2 - 3} fill={disc ?? 'transparent'} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={track ?? c.heroTrack} strokeWidth={stroke} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={color ?? c.primary} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - f * v)} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {children ?? (
          <>
            {value !== undefined ? <Text style={{ fontFamily: F.black, fontSize: size * 0.34, lineHeight: size * 0.4, color: col, fontVariant: ['tabular-nums'] }}>{value}</Text> : null}
            {label ? <Text style={{ fontFamily: F.body, fontSize: Math.max(10, size * 0.116), color: labelColor ?? c.fg3 }}>{label}</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Violet blocks: gradient + faint circle                              */
/* ------------------------------------------------------------------ */
const GRAD_LIGHT = ['#6A1BF2', '#5409DA', '#36058F'] as const;
const GRAD_DARK = ['#4A12B8', '#3A06A0', '#24065F'] as const;

/** Absolute-fill violet gradient (top-left to bottom-right) with a faint white circle top right. Put it first inside an overflow-hidden View. */
export function VioletBg({ circle = true }: { circle?: boolean }) {
  const { dark } = useTheme();
  const id = 'vg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = dark ? GRAD_DARK : GRAD_LIGHT;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={g[0]} />
            <Stop offset="0.5" stopColor={g[1]} />
            <Stop offset="1" stopColor={g[2]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {circle ? <View style={{ position: 'absolute', right: -50, top: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* VioletHeader                                                        */
/* ------------------------------------------------------------------ */
export type VioletHeaderProps = {
  /** Screen title in the top row (18 semibold white). */
  title?: string;
  /** Round back button before the title. */
  onBack?: () => void;
  backLabel?: string;
  /** Node on the right of the title row (icon buttons...). */
  right?: React.ReactNode;
  /** Person block under the title row: round avatar (photo or initial) + name + sub line. */
  name?: string;
  sub?: string;
  /** Extra node under the name/sub (an "Edit profile" link in gold, a duty switch...). */
  subNode?: React.ReactNode;
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  /** Top safe-area inset (pass insets.top). */
  safeTop?: number;
  /** Bottom padding; default 56 so following content can overlap with marginTop -36. */
  bottomPad?: number;
  children?: React.ReactNode;
  style?: S<ViewStyle>;
};
/**
 * The customer Profile header: violet gradient block, faint circle top right, white text. Everything inside reads as "on violet"
 * (white ink tokens, white-15% icon buttons, white buttons). The next block should use marginTop: -36 to overlap its bottom edge.
 */
export function VioletHeader({ title, onBack, backLabel = 'Back', right, name, sub, subNode, avatarUri, onAvatarPress, safeTop = 0, bottomPad = 56, children, style }: VioletHeaderProps) {
  const initial = ((name ?? '').trim()[0] || '?').toUpperCase();
  return (
    <View style={[{ paddingTop: safeTop + 8, paddingHorizontal: 16, paddingBottom: bottomPad, overflow: 'hidden' }, style]}>
      <VioletBg />
      <OnViolet>
        {title || onBack || right ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            {onBack ? <PillButton icon="back" label={backLabel} onPress={onBack} size={36} /> : null}
            {title ? <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.semi, fontSize: 18, lineHeight: 26, color: '#fff' }}>{title}</Text> : <View style={{ flex: 1 }} />}
            {right}
          </View>
        ) : null}
        {name ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: title || onBack || right ? 12 : 8 }}>
            <Pressy onPress={onAvatarPress} disabled={!onAvatarPress} accessibilityLabel={name} scaleTo={0.94}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EDE6FF', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }} />
                : (
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EDE6FF', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 26, color: '#5409DA' }}>{initial}</Text>
                  </View>
                )}
            </Pressy>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 30, color: '#fff' }}>{name}</Text>
              {sub ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)' }}>{sub}</Text> : null}
              {subNode}
            </View>
          </View>
        ) : null}
        {children}
      </OnViolet>
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
  /** Anything extra under the text (chips, buttons). Drawn "on violet": white ink, white Buttons. */
  children?: React.ReactNode;
  onPress?: () => void;
  style?: S<ViewStyle>;
};
/** Hero card: violet gradient block (radius 20) with a faint circle, white text, optional Ring (gold arc) on the right. */
export function HeroCard({ eyebrow, eyebrowIcon = 'flag', title, subtitle, ring, children, onPress, style }: HeroCardProps) {
  const { c } = useTheme();
  const body = (
    <>
      <VioletBg />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {heroEyebrow(eyebrow, eyebrowIcon, 'rgba(255,255,255,0.8)')}
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: '#fff', marginTop: eyebrow ? 4 : 0 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
        {ring ? <Ring size={86} color="#FFD166" track={c.heroTrack} ink="#fff" labelColor="rgba(255,255,255,0.8)" {...ring} /> : null}
      </View>
      {children ? <OnViolet><View style={{ marginTop: 12 }}>{children}</View></OnViolet> : null}
    </>
  );
  const st: S<ViewStyle> = [{ borderRadius: 20, padding: 20, overflow: 'hidden', backgroundColor: c.hero }, style];
  if (onPress) return <Pressy onPress={onPress} accessibilityLabel={title} style={st}>{body}</Pressy>;
  return <View style={st}>{body}</View>;
}
function heroEyebrow(text: string | undefined, icon: IconName, ink: string) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon && icon !== 'flag' ? <Icon name={icon} size={14} color={ink} /> : null}
      <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: ink }}>{text}</Text>
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
  const { c, dark } = useTheme();
  const tint = toneInk(tone, dark, c.softInk);
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`} style={[{ padding: 16, gap: 12, justifyContent: 'space-between' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 20, color: c.fg3, flex: 1, paddingTop: 8 }}>{label}</Text>
        {icon ? <IconBubble icon={icon} tint={tone ? tint : undefined} bg={tone ? withAlpha(tone, 0.1) : undefined} /> : null}
      </View>
      <BigNumber value={value} unit={unit} size={30} />
    </DashCard>
  );
}

/** Big bold number with a small grey unit. size defaults to 28. */
export function BigNumber({ value, unit, size = 28, style }: { value: string | number; unit?: string; size?: number; style?: S<TextStyle> }) {
  const { c } = useTheme();
  return (
    <Text style={[{ fontFamily: F.bold, fontSize: size, lineHeight: size * 1.2, color: c.fg, fontVariant: ['tabular-nums'] }, style]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
      {unit ? <Text style={{ fontFamily: F.medium, fontSize: Math.min(14, Math.max(11, size * 0.4)), color: c.fg3 }}> {unit}</Text> : null}
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
  /** Vertical layout for 3-up rows: icon bubble on top, number, then the label. */
  compact?: boolean;
  onPress?: () => void;
  style?: S<ViewStyle>;
};
/** Metric card: label on the left, icon bubble on the right, number + unit (and optional sparkline) below. Two per row (width '48%'). */
export function Tile({ label, value, unit, icon, tone, spark, sparkKind = 'line', compact, onPress, style }: TileProps) {
  const { c, dark } = useTheme();
  const tint = toneInk(tone, dark, c.primary);
  if (compact) {
    return (
      <DashCard onPress={onPress} accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`} style={[{ padding: 12, gap: 8 }, style]}>
        {icon ? <IconBubble icon={icon} size={36} tint={tone ? tint : undefined} bg={tone ? withAlpha(tone, 0.1) : undefined} /> : null}
        <View style={{ minWidth: 0 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: c.fg, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <Text style={{ fontFamily: F.body, fontSize: 11, color: c.fg3 }}> {unit}</Text> : null}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 11, lineHeight: 16, color: c.fg3 }} numberOfLines={2}>{label}</Text>
        </View>
      </DashCard>
    );
  }
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${label} ${value}${unit ? ' ' + unit : ''}`} style={[{ padding: 16, gap: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 20, color: c.fg3, flex: 1 }} numberOfLines={2}>{label}</Text>
        {icon ? <IconBubble icon={icon} size={36} tint={tone ? tint : undefined} bg={tone ? withAlpha(tone, 0.1) : undefined} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <BigNumber value={value} unit={unit} size={26} style={{ flexShrink: 1 }} />
        {spark && spark.length > 1 ? <Sparkline data={spark} kind={sparkKind} color={c.primary} width={64} height={28} /> : null}
      </View>
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
  /** Greyed out and not selectable (a day that has not come yet). */
  disabled?: boolean;
  /** Month + year this day belongs to ("November 2026"); the title follows the middle day while scrolling. */
  month?: string;
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
  /** Horizontally scrollable, 7 days visible, snapping; starts at the right end (the newest days). */
  scroll?: boolean;
  /** Small pill on the right of the title while the selected day is out of view (e.g. "Today"). */
  jumpLabel?: string;
  style?: S<ViewStyle>;
};
/** White card with an optional month title + arrows and day columns; the selected one is a tall violet pill. */
export function WeekStrip({ days, selected, onSelect, title, onPrev, onNext, scroll, jumpLabel, style }: WeekStripProps) {
  const { c } = useTheme();
  const rm = useReducedMotion();
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [w, setW] = useState(0);
  const [mid, setMid] = useState(days.length - 1);
  const [off, setOff] = useState(0);
  const cell = w ? w / 7 : 0;
  const dayView = (d: WeekDay, itemW?: number) => {
    const on = d.key === selected;
    const dayStyle = { width: itemW, flex: itemW ? undefined : 1, alignItems: 'center' as const, paddingTop: 8, paddingBottom: 10, borderRadius: 999, backgroundColor: on ? c.primary : 'transparent', gap: 2, opacity: d.disabled ? 0.38 : 1 };
    const inner = (
      <>
        <Text style={{ fontFamily: F.medium, fontSize: 11, lineHeight: 17, color: on ? '#fff' : c.fg, opacity: on ? 0.85 : 0.6 }} numberOfLines={1}>{d.label}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 24, color: on ? '#fff' : c.fg, fontVariant: ['tabular-nums'] }}>{d.date}</Text>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: d.dot ? (on ? '#FFFFFF' : c.primary) : 'transparent' }} />
      </>
    );
    // no handler = a plain read-only day (not announced as a button)
    if (!onSelect || d.disabled) return <View key={d.key} accessible accessibilityLabel={`${d.label} ${d.date}`} accessibilityState={{ disabled: !!d.disabled }} style={dayStyle}>{inner}</View>;
    return (
      <Pressy key={d.key} onPress={() => onSelect(d.key)} scaleTo={0.94} accessibilityLabel={`${d.label} ${d.date}`}
        accessibilityRole="radio" accessibilityState={{ selected: on }} style={dayStyle}>
        {inner}
      </Pressy>
    );
  };
  const selIdx = days.findIndex((d) => d.key === selected);
  const first = cell ? Math.round(off / cell) : 0;
  const away = scroll && cell && selIdx >= 0 && (selIdx < first || selIdx > first + 6);
  const head = scroll ? (days[Math.min(days.length - 1, Math.max(0, mid))]?.month || title) : title;
  // start at the newest days (contentOffset is not honoured on web, so scroll once the width is known)
  useEffect(() => {
    if (!scroll || !cell) return;
    const x = Math.max(0, selIdx >= 0 && selIdx < days.length - 7 ? Math.min(days.length - 7, selIdx - 3) : days.length - 7) * cell;
    const id = setTimeout(() => ref.current?.scrollTo({ x, animated: false }), 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroll, cell, days.length]);
  const toSel = () => {
    if (!cell || selIdx < 0) return;
    const x = Math.max(0, Math.min(days.length - 7, selIdx - 4)) * cell;
    ref.current?.scrollTo({ x, animated: !rm });
  };
  return (
    <DashCard style={[{ padding: 8 }, style]}>
      {head || onPrev || onNext ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, paddingTop: 5, paddingBottom: 6, minHeight: 28 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{head}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {away && jumpLabel ? (
              <Pressy onPress={toSel} accessibilityLabel={jumpLabel} style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(84,9,218,0.08)' }}>
                <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.primary }}>{jumpLabel}</Text>
              </Pressy>
            ) : null}
            {onPrev ? <PillButton icon="back" label="‹" size={28} onPress={onPrev} flat /> : null}
            {onNext ? <PillButton icon="arrow" label="›" size={28} onPress={onNext} flat /> : null}
          </View>
        </View>
      ) : null}
      {scroll ? (
        <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
          {w ? (
            <ScrollView
              ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cell} decelerationRate="fast" scrollEventThrottle={16}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const m = Math.round(x / cell) + 3;
                setMid((p) => (p === m ? p : m));
                const f = Math.round(x / cell);
                setOff((p) => (Math.round(p / cell) === f ? p : x));
              }}
              style={{ ...({ scrollSnapType: 'x mandatory' } as object) }}
              contentContainerStyle={{ width: cell * days.length }}
              accessibilityRole="radiogroup"
            >
              {days.map((d) => <View key={d.key} style={{ width: cell, ...({ scrollSnapAlign: 'start' } as object) }}>{dayView(d, cell)}</View>)}
            </ScrollView>
          ) : <View style={{ height: 68 }} />}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{days.map((d) => dayView(d))}</View>
      )}
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
  /** Lane height. Default 120. */
  height?: number;
  /** Scale maximum; default the biggest of value/target. */
  max?: number;
  onSelect?: (index: number) => void;
  style?: S<ViewStyle>;
};
/** Lane chart: each day is a muted rounded lane filled from the bottom (share of target), today solid violet, % on top, day below. */
export function BarChart({ data, highlight, height = 120, max, onSelect, style }: BarChartProps) {
  const { c } = useTheme();
  const top = max ?? Math.max(1, ...data.map((d) => Math.max(d.value, d.target ?? 0)));
  const g = useGrow(data.map((d) => d.value).join(','), 800, 100);
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {data.map((d, i) => {
        const on = i === highlight;
        const f = Math.max(0, Math.min(1, d.target ? d.value / d.target : d.value / top));
        const label = d.top ?? (d.target ? `${Math.round(f * 100)}%` : String(d.value));
        return (
          <Pressy key={i} onPress={onSelect ? () => onSelect(i) : undefined} disabled={!onSelect} accessibilityLabel={`${d.label} ${label}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 10.5, lineHeight: 16, color: on ? c.primary : c.fg3 }}>{label}</Text>
            <View style={{ height, width: '100%', borderRadius: 8, backgroundColor: c.soft, overflow: 'hidden', justifyContent: 'flex-end' }}>
              <Animated.View style={{ width: '100%', borderRadius: 8, backgroundColor: on ? c.primary : withAlpha(c.primary, 0.14), height: g.interpolate({ inputRange: [0, 1], outputRange: [6, Math.max(6, f * height)] }) }} />
            </View>
            <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 10.5, lineHeight: 16, color: on ? c.primary : c.fg3 }} numberOfLines={1}>{d.label}</Text>
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
              <Path d={smooth(pts)} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
  /** No card surface: a bare row to put inside a ListGroup. */
  plain?: boolean;
};
/** Row card: title + detail on the left, chips / thumbnails and a round "+" or chevron button on the right. */
export function ListCard({ title, detail, icon, iconTone, leading, chips, right, action = 'none', onPress, onAction, style, children, plain }: ListCardProps) {
  const { c, dark } = useTheme();
  const hasAction = action !== 'none';
  const plainChevron = action === 'chevron' && !onAction;   // the whole row is the target: just draw the chevron (customer ListRow)
  const inner = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {leading ?? (icon ? <IconBubble icon={icon} tint={iconTone ? toneInk(iconTone, dark, c.primary) : undefined} bg={iconTone ? withAlpha(iconTone, 0.1) : undefined} /> : null)}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: c.fg }} numberOfLines={1}>{title}</Text>
          {detail ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3 }} numberOfLines={2}>{detail}</Text> : null}
        </View>
        {chips?.length ? (
          <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
            {chips.map((ch, i) => (
              <View key={i} style={{ minHeight: 24, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8, backgroundColor: ch.tone ? withAlpha(ch.tone, 0.12) : c.tile2 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: ch.tone ? toneInk(ch.tone, dark, c.fg2) : c.fg2, fontVariant: ['tabular-nums'] }}>{ch.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {right}
        {plainChevron ? <Icon name="chevron" size={18} color={c.fg3} /> : hasAction ? (
          <PillButton
            icon={action === 'plus' ? 'plus' : action === 'check' ? 'check' : action === 'chevron' ? 'chevron' : 'arrow'}
            label={title}
            size={32}
            flat
            onPress={onAction ?? onPress}
          />
        ) : null}
      </View>
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </>
  );
  const pad: ViewStyle = { paddingVertical: 12, paddingHorizontal: 16, minHeight: 64, justifyContent: 'center' };
  // plain = a bare row (no card): put several in a <ListGroup> for the customer "one white card, hairlines between rows" look.
  if (plain) {
    if (onPress) return <Pressy onPress={onPress} scaleTo={0.985} accessibilityLabel={detail ? `${title}, ${detail}` : title} style={[pad, style]}>{inner}</Pressy>;
    return <View style={[pad, style]}>{inner}</View>;
  }
  return (
    <DashCard onPress={onPress} accessibilityLabel={detail ? `${title}, ${detail}` : title} style={[pad, style]}>
      {inner}
    </DashCard>
  );
}

/** One white card holding several rows (ListCard plain / Row) with a hairline between them. */
export function ListGroup({ children, style }: { children?: React.ReactNode; style?: S<ViewStyle> }) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <DashCard style={[{ overflow: 'hidden' }, style]}>
      {items.map((ch, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line, marginLeft: 16 }} /> : null}
          {ch}
        </React.Fragment>
      ))}
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
  /** Diameter, default 36. */
  size?: number;
  /** 'white' card-coloured (default), 'violet' filled, 'gold' filled (same as violet now). */
  tone?: 'white' | 'violet' | 'gold';
  /** Count bubble in the corner. */
  badge?: number;
  /** No shadow, violet 8% tint fill (used inside cards). */
  flat?: boolean;
  /** Round white-15% button with a white icon, for use on a violet block (automatic inside VioletHeader / OnViolet). */
  onViolet?: boolean;
  /** Custom glyph instead of an Icon. */
  children?: React.ReactNode;
  style?: S<ViewStyle>;
};
/** Square icon button (radius 12) with a 44px touch area. On violet it turns into a round white-15% button. */
export function PillButton({ icon, label, onPress, size = 36, tone = 'white', badge, flat, onViolet, children, style }: PillButtonProps) {
  const { c, dark, onViolet: ctxViolet } = useTheme();
  const ov = onViolet ?? ctxViolet;
  const filled = tone === 'violet' || tone === 'gold';
  const tint = dark ? 'rgba(139,92,246,0.2)' : 'rgba(84,9,218,0.08)';
  const bg = ov && !filled ? 'rgba(255,255,255,0.15)' : flat ? tint : filled ? c.primary : c.card;
  const fg = ov && !filled ? '#fff' : flat ? c.primary : filled ? '#fff' : c.fg;
  const radius = ov && !filled ? size / 2 : 12;
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.92} hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, (!ov && !flat && !filled) ? [cardShadow(c), c.shadow ? null : { borderWidth: 1, borderColor: c.line }] : null, style]}>
      {children ?? (icon ? <Icon name={icon} size={Math.round(size * 0.5)} color={fg} /> : null)}
      {badge && badge > 0 ? (
        <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: ov ? '#FFBA08' : c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 10, color: ov ? '#24065F' : '#fff' }}>{badge}</Text>
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
  /** Node drawn above the avatar row, first thing on screen (the Duty switch). */
  top?: React.ReactNode;
  /** Node drawn under the name (the place chip). */
  sub?: React.ReactNode;
  /** Adds the top safe-area inset itself. Default true. */
  safeTop?: number;
  /** Draw for a violet block (white text, white-15% round buttons). Automatic inside VioletHeader / OnViolet. */
  onViolet?: boolean;
  style?: S<ViewStyle>;
};
/** Header for every tab: avatar + greeting + name on the left, up to two round buttons on the right.
 *  `onViolet` (or being inside VioletHeader / OnViolet) draws it for the violet block: no background, white text, white-15% round buttons. */
export function AppHeader({ name, greeting, avatarUri, onAvatarPress, actions, top, sub, safeTop = 0, onViolet, style }: AppHeaderProps) {
  const { c, onViolet: ctx } = useTheme();
  const ov = onViolet ?? ctx;
  const initial = (name.trim()[0] || '?').toUpperCase();
  const ring = ov ? { borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' } : null;
  const av = avatarUri
    ? <Image source={{ uri: avatarUri }} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE6FF' }, ring]} />
    : (
      <View style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: ov ? '#EDE6FF' : 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }, ring]}>
        <Text style={{ fontFamily: F.bold, fontSize: 20, color: '#5409DA' }}>{initial}</Text>
      </View>
    );
  const body = (
    <View style={[{ paddingHorizontal: ov ? 0 : 16, paddingTop: safeTop + (ov ? 0 : 16), paddingBottom: ov ? 0 : 12 }, style]}>
      {top ? <View style={{ marginBottom: 8 }}>{top}</View> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressy onPress={onAvatarPress} disabled={!onAvatarPress} accessibilityLabel={name} scaleTo={0.94}>{av}</Pressy>
        <View style={{ flex: 1, minWidth: 0 }}>
          {greeting ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 20, color: ov ? 'rgba(255,255,255,0.82)' : c.fg3 }} numberOfLines={1}>{greeting}</Text> : null}
          <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 28, color: ov ? '#fff' : c.fg }} numberOfLines={1}>{name}</Text>
          {sub ? <View style={{ marginTop: 2 }}>{sub}</View> : null}
        </View>
        {(actions ?? []).slice(0, 2).map((a, i) => <PillButton key={i} icon={a.icon} label={a.label} onPress={a.onPress} badge={a.badge} onViolet={ov} size={ov ? 40 : 36} />)}
      </View>
    </View>
  );
  return ov && !ctx ? <OnViolet>{body}</OnViolet> : body;
}

/** Icon colour for a tinted bubble (Astryx text-success / text-warning / accent); unknown tones pass through. */
function toneInk(tone: string | undefined, dark: boolean, fallback: string): string {
  if (!tone) return fallback;
  if (tone === brand.mint) return dark ? '#5CE6B5' : '#0B7A57';
  if (tone === brand.gold) return dark ? '#FFD566' : '#8A5B00';
  if (tone === brand.red) return dark ? '#FF8A99' : '#C41F37';
  return tone;
}

/** '#RRGGBB' + alpha -> rgba(). Other colour formats come back unchanged. */
function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
