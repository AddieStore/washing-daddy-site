// Pieces shared by the Round, Today and Day screens: the Pronto look (violet gradient block, staggered rise, summary cards, booking-style car rows).
// Presentational; data comes in as DayData.
import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { CarPic } from './CarPhoto';
import { carBy } from '../state/store';
import { CarArt, DashCard, F, Icon, Plate, StatusPill, brand, useReducedMotion, useTheme } from '../ui';
import { STATUS } from '../lib/data';
import { SLOTS } from '../lib/slots';
import { hm12, rupee, short12, t12 } from '../lib/time';
import { t } from '../lib/i18n';
import type { DayData, DayRow } from '../lib/history';

const ND = Platform.OS !== 'web';
export const TNUM = { fontVariant: ['tabular-nums' as const] };

/** Pronto entrance: rises 16px with a fade, 35ms stagger per `index` (capped at 12). Stands still with reduced motion. */
export function FadeUp({ index = 0, children, style }: { index?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const rm = useReducedMotion();
  const a = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => {
    if (rm) { a.setValue(1); return }
    const anim = Animated.timing(a, { toValue: 1, duration: 360, delay: Math.min(index, 12) * 35, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>;
}

/** Violet gradient (#6A1BF2 -> #5409DA -> #36058F, top-left to bottom-right) filling its parent. */
export function VioletFill() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6A1BF2" /><Stop offset="0.5" stopColor="#5409DA" /><Stop offset="1" stopColor="#36058F" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Violet block with a faint white circle top right; children sit on top. Cards below overlap it with marginTop -36. */
export function VioletBlock({ children, style, radius = 0 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[{ overflow: 'hidden', borderBottomLeftRadius: radius, borderBottomRightRadius: radius }, style]}>
      <VioletFill />
      <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -48, width: 176, height: 176, borderRadius: 88, backgroundColor: '#fff', opacity: 0.08 }} />
      {children}
    </View>
  );
}

const tm = (iso: string | null) => (iso ? t12(iso) : '');

function MiniStat({ label, value, unit, icon, tone }: { label: string; value: string | number; unit?: string; icon: 'check' | 'warn' | 'flag'; tone: string }) {
  const { c } = useTheme();
  return (
    <DashCard style={{ flex: 1, padding: 12, gap: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(84,9,218,0.08)' }}>
        <Icon name={icon} size={16} color={tone} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: c.fg, ...TNUM }}>
        {value}{unit ? <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.fg3 }}> {unit}</Text> : null}
      </Text>
      <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{label}</Text>
    </DashCard>
  );
}

export function DaySummary({ d, earnLabel }: { d: DayData; earnLabel: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <FadeUp index={0}>
        <View style={{ borderRadius: 16, overflow: 'hidden', padding: 20, shadowColor: '#1A1033', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
          <VioletFill />
          <View pointerEvents="none" style={{ position: 'absolute', right: -32, top: -40, width: 136, height: 136, borderRadius: 68, backgroundColor: '#fff', opacity: 0.08 }} />
          <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.78)' }}>{earnLabel}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: '#fff', marginTop: 4, ...TNUM }}>{rupee(d.earn)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <Icon name="check" size={13} color="#fff" />
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: '#fff', ...TNUM }}>{d.done} / {d.total}</Text>
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{t('Gaadi ho gayi')}</Text>
          </View>
        </View>
      </FadeUp>
      <FadeUp index={1} style={{ flexDirection: 'row', gap: 12 }}>
        <MiniStat label={t('Gaadi ho gayi')} value={d.done} unit={`/ ${d.total}`} icon="check" tone={c.ok} />
        <MiniStat label={t('Skip')} value={d.skipped} icon="warn" tone={brand.red} />
        <MiniStat label={t('Baaki')} value={d.left} icon="flag" tone={c.primary} />
      </FadeUp>
      <FadeUp index={2}>
        <DashCard style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
          {[[t('Pehli shuruat'), d.first], [t('Aakhri khatam'), d.last]].map(([k, v], i) => (
            <View key={i} style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{k}</Text>
              <Text style={{ fontFamily: F.black, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: c.fg, ...TNUM }}>{v ? tm(v as string) : '–'}</Text>
            </View>
          ))}
        </DashCard>
      </FadeUp>
    </View>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: F.body, fontSize: 11, lineHeight: 16, color: c.fg3 }}>{k}</Text>
      <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 20, color: c.fg, ...TNUM }}>{v || '–'}</Text>
    </View>
  );
}

/** Time chip (violet tint, radius 8), as on the customer's booking cards. */
export function TimeChip({ text }: { text: string }) {
  const { c } = useTheme();
  if (!text) return null;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(84,9,218,0.08)' }}>
      <Icon name="clock" size={12} color={c.primary} />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12, color: c.primary, ...TNUM }}>{text}</Text>
    </View>
  );
}

export function DayRowCard({ r, onPress }: { r: DayRow; onPress?: () => void }) {
  const { c } = useTheme();
  const slot = r.slot != null && SLOTS[r.slot] ? `${short12(hm12(SLOTS[r.slot].from))} – ${short12(hm12(SLOTS[r.slot].to))}` : '';
  const skip = r.status === 'skipped', car = carBy(r.reg);
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${r.plate} ${r.model}`} style={{ padding: 16, gap: 12, opacity: skip ? 0.85 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Plate reg={r.plate} />
        <StatusPill status={r.status} label={t(STATUS[r.status])} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CarPic reg={r.reg} w={64} h={44} size={24} radius={12}>{car ? <CarArt car={car} width={64} height={27} /> : <Text style={{ fontSize: 22 }}>🚗</Text>}</CarPic>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 24, color: c.fg }}>{r.model}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{r.customer || ''}</Text>
        </View>
        {slot ? <TimeChip text={slot} /> : null}
      </View>
      {skip ? (
        r.skipReason ? <Text style={{ fontFamily: F.semi, fontSize: 13, color: brand.red }}>{t(r.skipReason)}</Text> : null
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Meta k={t('Tay samay')} v={r.eta ? hm12(r.eta) : ''} />
          <Meta k={t('Shuru')} v={tm(r.started)} />
          <Meta k={t('Khatam')} v={tm(r.finished)} />
          <Meta k={t('Time')} v={r.minutes ? `${r.minutes} min` : ''} />
        </View>
      )}
      {r.status === 'done' || r.photos || r.stars ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          {r.status === 'done' ? <Text style={{ fontFamily: F.black, fontSize: 16, color: c.ok, ...TNUM }}>{rupee(r.earn)}</Text> : null}
          {r.photos ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="cam" size={15} color={c.fg3} />
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg2 }}>{r.photos}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {r.stars ? <Text accessibilityLabel={`${r.stars}/5`} style={{ fontFamily: F.black, fontSize: 14, letterSpacing: 1, color: brand.gold }}>{'★'.repeat(r.stars)}<Text style={{ color: c.line }}>{'★'.repeat(5 - r.stars)}</Text></Text> : null}
        </View>
      ) : null}
    </DashCard>
  );
}
