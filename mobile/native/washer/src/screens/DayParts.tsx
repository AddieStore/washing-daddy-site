// Pieces shared by the Today and Day screens (and the Round tab's FadeUp): staggered rise, summary Group, car rows as ONE Group.
// Presentational; data comes in as DayData.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, Text, View, ViewStyle } from 'react-native';
import { CarPic } from './CarPhoto';
import { carBy, spotFor } from '../state/store';
import { CarArt, Chip, F, Group, Icon, Plate, Pressy, Row, brand, useReducedMotion, useTheme } from '../ui';
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

const tm = (iso: string | null) => (iso ? t12(iso) : '');
const TONE: Record<string, 'violet' | 'green' | 'grey' | 'amber'> = { scheduled: 'grey', on_the_way: 'violet', arrived: 'violet', washing: 'violet', done: 'green', skipped: 'amber' };

/** The day's numbers as ONE Group: earning, cars, skipped, first start / last finish. */
export function DaySummary({ d, earnLabel }: { d: DayData; earnLabel: string }) {
  return (
    <FadeUp index={0}>
      <Group>
        <Row icon="gift" label={earnLabel} right={<Text style={{ fontFamily: F.bold, fontSize: 18, color: '#141414', ...TNUM }}>{rupee(d.earn)}</Text>} />
        <Row icon="car" label={t('Gaadi ho gayi')} value={`${d.done} / ${d.total}`} />
        {d.skipped ? <Row icon="warn" label={t('Skip')} value={`${d.skipped}`} /> : null}
        {d.left ? <Row icon="flag" label={t('Baaki')} value={`${d.left}`} /> : null}
        <Row icon="clock" label={t('Pehli shuruat')} value={d.first ? tm(d.first) : '–'} />
        <Row icon="clock" label={t('Aakhri khatam')} value={d.last ? tm(d.last) : '–'} />
      </Group>
    </FadeUp>
  );
}

/** Time chip (violet tint). */
export function TimeChip({ text }: { text: string }) {
  if (!text) return null;
  return <Chip tone="violet" icon="clock"><Text style={TNUM}>{text}</Text></Chip>;
}

/** One car row: plate, model, status chip, chevron when it opens the job. Second line: customer / slot / times, earning for done cars. */
export function DayCarRow({ r, onPress, spotDate }: { r: DayRow; onPress?: () => void; spotDate?: string }) {
  const { c } = useTheme();
  const slot = r.slot != null && SLOTS[r.slot] ? `${short12(hm12(SLOTS[r.slot].from))} – ${short12(hm12(SLOTS[r.slot].to))}` : '';
  const skip = r.status === 'skipped', car = carBy(r.reg);
  const times = skip ? (r.skipReason ? t(r.skipReason) : '') : [r.started ? `${tm(r.started)}${r.finished ? ' – ' + tm(r.finished) : ''}` : r.eta ? hm12(r.eta) : '', r.minutes ? `${r.minutes} min` : ''].filter(Boolean).join(' · ');
  const body = (
    <>
      <CarPic reg={r.reg} w={56} h={44} size={22} radius={10}>{car ? <CarArt car={car} width={56} height={24} /> : <Text style={{ fontSize: 20 }}>🚗</Text>}</CarPic>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Plate reg={r.plate} style={{ paddingVertical: 1, paddingHorizontal: 6 }} />
          {r.status === 'done' ? <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.ok, ...TNUM }}>{rupee(r.earn)}</Text> : null}
          {spotDate && spotFor(r.reg, spotDate) ? <Chip tone="amber" icon="pin">{t('Alag jagah')}</Chip> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 20, color: c.fg }}>{r.model}{r.customer ? <Text style={{ fontFamily: F.body, color: c.grey }}> · {r.customer}</Text> : null}</Text>
        {times || slot ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: skip ? brand.red : c.grey, ...TNUM }}>{times || slot}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Chip tone={TONE[r.status] || 'grey'}>{t(STATUS[r.status])}</Chip>
        {r.stars ? <Text accessibilityLabel={`${r.stars}/5`} style={{ fontFamily: F.black, fontSize: 12, letterSpacing: 1, color: brand.gold }}>{'★'.repeat(r.stars)}</Text> : r.photos ? <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey }}>{r.photos} {t('photo')}</Text> : null}
      </View>
      {onPress ? <Icon name="chevron" size={18} color={c.grey} /> : null}
    </>
  );
  const st = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 68, paddingHorizontal: 16, paddingVertical: 8, opacity: skip ? 0.85 : 1 };
  if (onPress) return <Pressy onPress={onPress} accessibilityLabel={`${r.plate} ${r.model}`} scaleTo={0.99} style={st}>{body}</Pressy>;
  return <View accessibilityLabel={`${r.plate} ${r.model}`} style={st}>{body}</View>;
}

/** The cars of a day as ONE Group of rows. */
export function DayCarGroup({ rows, onPress, spotDate }: { rows: DayRow[]; onPress?: (r: DayRow) => void; spotDate?: string }) {
  if (!rows.length) return null;
  return (
    <FadeUp index={2}>
      <Group>{rows.map((r) => <DayCarRow key={r.reg} r={r} spotDate={spotDate} onPress={onPress ? () => onPress(r) : undefined} />)}</Group>
    </FadeUp>
  );
}
