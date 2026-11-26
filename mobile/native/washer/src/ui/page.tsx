// Page chrome shared by the four tab screens (Round, Extra, Money, Profile) so they read as the customer app's pages:
// violet gradient header with a Bricolage title, cards that float over its bottom edge, soft 20px cards, tinted icon tiles.
import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icons';
import { Pressy } from './kit';
import { VioletHeader } from './dash';
import { cardLift } from './lang';
import { F, useTheme } from './theme';
import { DutyToggle } from './TopBar';

export const LIFT = 40;   // how far the first card sits over the header's bottom edge

/** Header block: big title (+ small line under it), the Duty switch on the right, anything else (figure, progress) as children. */
export function PageHeader({ title, sub, right, children, bottomPad = 64, duty = true }: {
  title: string; sub?: string; right?: React.ReactNode; children?: React.ReactNode; bottomPad?: number; duty?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <VioletHeader safeTop={insets.top} bottomPad={bottomPad}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: '#fff' }}>{title}</Text>
          {sub ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', marginTop: 1 }}>{sub}</Text> : null}
        </View>
        {right}
        {duty ? <DutyToggle /> : null}
      </View>
      {children}
    </VioletHeader>
  );
}

/** Content that starts over the header: negative top margin, 16 side padding. */
export function Lift({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingHorizontal: 16, marginTop: -LIFT }, style]}>{children}</View>;
}

/** Soft white card, 20px radius, the customer's violet-tinted lift. */
export function PCard({ children, style, onPress, label }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const { c } = useTheme();
  const st: StyleProp<ViewStyle> = [{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.shadow ? 'rgba(23,23,23,0.06)' : c.line }, cardLift(c), style];
  if (onPress) return <Pressy onPress={onPress} scaleTo={0.97} accessibilityLabel={label} style={st}>{children}</Pressy>;
  return <View style={st}>{children}</View>;
}

/** One stat tile: tinted icon top-left, figure, caption. Put 2 or 3 in a row (flex 1 each). */
export function StatTile({ icon, value, label, tone, onPress }: { icon: IconName; value: string; label: string; tone?: 'violet' | 'green' | 'amber' | 'blue'; onPress?: () => void }) {
  const { c } = useTheme();
  const col = tone === 'green' ? '#16a34a' : tone === 'amber' ? '#C77700' : tone === 'blue' ? '#2E8BFF' : c.primary;
  const bg = tone === 'green' ? 'rgba(22,163,74,0.10)' : tone === 'amber' ? 'rgba(255,186,8,0.18)' : tone === 'blue' ? 'rgba(46,139,255,0.10)' : 'rgba(84,9,218,0.08)';
  return (
    <PCard onPress={onPress} label={`${label} ${value}`} style={{ flex: 1, padding: 12, minHeight: 104, justifyContent: 'space-between', borderRadius: 20 }}>
      <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={col} />
      </View>
      <View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: c.fg, fontVariant: ['tabular-nums'] }}>{value}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.grey }}>{label}</Text>
      </View>
    </PCard>
  );
}

/** Plain bold section title with a quiet note on the right, spaced the way the customer pages do it. */
export function PTitle({ title, note, style }: { title: string; note?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28, marginBottom: 10, marginHorizontal: 2 }, style]}>
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.3, color: c.fg }}>{title}</Text>
      {note ? <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12.5, color: c.grey, flexShrink: 1, marginLeft: 12 }}>{note}</Text> : null}
    </View>
  );
}

/** Thin progress bar for use on the violet header: white fill on a translucent track. */
export function HeaderBar({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(f > 0 ? 3 : 0, f * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: '#FFD166' }} />
    </View>
  );
}

/** Seven columns spread over the full card width: figure on top, rounded bar, weekday under it. Today is solid violet. */
export function WeekBars({ data, height = 128 }: { data: { label: string; value: number; today?: boolean }[]; height?: number }) {
  const { c } = useTheme();
  const mx = Math.max(1, ...data.map(d => d.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 44 }}>
      {data.map((d, i) => {
        const h = d.value ? Math.max(14, Math.round((d.value / mx) * height)) : 6;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: d.today ? F.bold : F.semi, fontSize: 13, color: d.value ? (d.today ? c.primary : c.fg) : c.grey, marginBottom: 6, fontVariant: ['tabular-nums'] }}>{d.value || '–'}</Text>
            <View style={{ width: '62%', maxWidth: 34, height: h, borderRadius: 12, backgroundColor: d.today ? c.primary : d.value ? 'rgba(84,9,218,0.16)' : c.soft }} />
            <Text style={{ fontFamily: d.today ? F.bold : F.medium, fontSize: 12, color: d.today ? c.primary : c.grey, marginTop: 8 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
