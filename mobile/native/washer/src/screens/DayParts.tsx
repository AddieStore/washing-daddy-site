// Pieces shared by the Today and Day screens: the summary tiles and one car row. Presentational; data comes in as DayData.
import React from 'react';
import { Text, View } from 'react-native';
import { DashCard, F, Icon, Plate, StatCard, StatusPill, brand, useTheme } from '../ui';
import { STATUS } from '../lib/data';
import { SLOTS } from '../lib/slots';
import { hm12, rupee, short12, t12 } from '../lib/time';
import { t } from '../lib/i18n';
import type { DayData, DayRow } from '../lib/history';

const tm = (iso: string | null) => (iso ? t12(iso) : '');

export function DaySummary({ d, earnLabel }: { d: DayData; earnLabel: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard style={{ flex: 1 }} label={t('Gaadi ho gayi')} value={d.done} unit={`/ ${d.total}`} icon="check" tone={brand.mint} />
        <StatCard style={{ flex: 1 }} label={earnLabel} value={rupee(d.earn)} icon="star" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard style={{ flex: 1, minHeight: 88 }} label={t('Skip')} value={d.skipped} icon="warn" tone={brand.red} />
        <StatCard style={{ flex: 1, minHeight: 88 }} label={t('Baaki')} value={d.left} icon="flag" />
      </View>
      <DashCard style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
        {[[t('Pehli shuruat'), d.first], [t('Aakhri khatam'), d.last]].map(([k, v], i) => (
          <View key={i} style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3 }}>{k}</Text>
            <Text style={{ fontFamily: F.black, fontSize: 22, lineHeight: 28, color: c.fg }}>{v ? tm(v as string) : '–'}</Text>
          </View>
        ))}
      </DashCard>
    </View>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: F.body, fontSize: 11, color: c.fg3 }}>{k}</Text>
      <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg }}>{v || '–'}</Text>
    </View>
  );
}

export function DayRowCard({ r, onPress }: { r: DayRow; onPress?: () => void }) {
  const { c } = useTheme();
  const slot = r.slot != null && SLOTS[r.slot] ? `${short12(hm12(SLOTS[r.slot].from))} – ${short12(hm12(SLOTS[r.slot].to))}` : '';
  const skip = r.status === 'skipped';
  return (
    <DashCard onPress={onPress} accessibilityLabel={`${r.plate} ${r.model}`} style={{ padding: 14, gap: 10, opacity: skip ? 0.85 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Plate reg={r.plate} />
        <StatusPill status={r.status} label={t(STATUS[r.status])} />
      </View>
      <View>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, color: c.fg }}>{r.model}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3 }}>
          {[r.customer, slot].filter(Boolean).join(' · ')}
        </Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
          {r.status === 'done' ? <Text style={{ fontFamily: F.black, fontSize: 15, color: c.ok }}>{rupee(r.earn)}</Text> : null}
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
