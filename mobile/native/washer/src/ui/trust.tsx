// Trust building blocks: a "WD Verified" badge, chips that are earned or still pending, and the strip the customer sees.
// Presentational only: whether something is earned is decided by the caller from real records (lib/trust.ts).
// Text comes in already translated. Green (c.ok) means "checked"; pending is quiet grey. Violet stays an accent.
import React from 'react';
import { Image, ImageSourcePropType, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icons';
import { DashCard } from './dash';
import { F, useTheme } from './theme';

function alpha(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Shield pill. verified: green with a check shield; otherwise a quiet grey "pending" pill. */
export function VerifiedBadge({ label, verified = true, small, style }: { label: string; verified?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const tint = verified ? c.ok : c.fg3;
  return (
    <View
      accessible accessibilityLabel={label}
      style={[{
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 99,
        paddingVertical: small ? 4 : 6, paddingLeft: small ? 7 : 9, paddingRight: small ? 9 : 12,
        backgroundColor: verified ? alpha(c.ok, 0.14) : c.soft,
      }, style]}
    >
      <Icon name="shield" size={small ? 14 : 17} color={tint} />
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: small ? 11.5 : 13, color: verified ? c.ok : c.softInk, flexShrink: 1 }}>{label}</Text>
    </View>
  );
}

/** One check: earned = green with a tick, pending = dashed outline and grey. */
export function TrustChip({ icon, label, earned, pendingLabel }: { icon: IconName; label: string; earned: boolean; pendingLabel?: string }) {
  const { c } = useTheme();
  const tint = earned ? c.ok : c.fg3;
  return (
    <View
      accessible accessibilityLabel={earned ? label : `${label}, ${pendingLabel ?? ''}`}
      style={[{
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99,
      }, earned ? { backgroundColor: alpha(c.ok, 0.13) } : { borderWidth: 1, borderStyle: 'dashed', borderColor: c.dash }]}
    >
      <Icon name={earned ? 'check' : icon} size={earned ? 13 : 15} color={tint} />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12.5, color: earned ? c.ok : c.fg3, flexShrink: 1 }}>
        {label}{!earned && pendingLabel ? ` · ${pendingLabel}` : ''}
      </Text>
    </View>
  );
}

export type TrustItem = { key: string; icon: IconName; label: string; earned: boolean };
/** Wrapping row of TrustChips. */
export function TrustRow({ items, pendingLabel, style }: { items: TrustItem[]; pendingLabel?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {items.map(i => <TrustChip key={i.key} icon={i.icon} label={i.label} earned={i.earned} pendingLabel={pendingLabel} />)}
    </View>
  );
}

/** Round photo with the first letter as fallback. */
export function Avatar({ name, source, size = 48 }: { name: string; source?: ImageSourcePropType | null; size?: number }) {
  const { c } = useTheme();
  return source
    ? <Image source={source} accessibilityLabel={name} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.soft }} />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.black, fontSize: size * 0.42, color: '#fff' }}>{name.slice(0, 1)}</Text>
      </View>
    );
}

/** What the customer sees about who is coming: photo, name, badge, rating and cars washed. */
export function VerifiedStrip({ title, name, source, verified, badge, rating, ratingLabel, cars, carsLabel, style }: {
  title: string; name: string; source?: ImageSourcePropType | null; verified: boolean; badge: string;
  rating?: string | number; ratingLabel?: string; cars?: string; carsLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <DashCard style={[{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View>
        <Avatar name={name} source={source} size={52} />
        {verified ? (
          <View style={{ position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={18} color={c.ok} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 17, lineHeight: 22, color: c.fg }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
          <VerifiedBadge small label={badge} verified={verified} />
          {rating !== undefined && String(rating) !== '–' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessible accessibilityLabel={`${ratingLabel ?? ''} ${rating}`}>
              <Icon name="star" size={12} color="#FFBA08" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: c.fg2 }}>{rating}</Text>
            </View>
          ) : null}
          {cars ? <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.fg2 }}>{cars} {carsLabel}</Text> : null}
        </View>
      </View>
    </DashCard>
  );
}
