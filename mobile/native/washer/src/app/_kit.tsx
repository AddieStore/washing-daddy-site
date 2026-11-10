// Dev-only preview of the dashboard components (ui/dash.tsx) with sample data. Hidden route /_kit, not linked from the UI.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, BarChart, HeroCard, ListCard, PillButton, Sparkline, StatCard, Tile, WeekStrip, SectionTitle, Ring, brand, F, useTheme } from '../ui';
import { t } from '../lib/i18n';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BARS = [[44, 100], [34, 100], [110, 100], [47, 100], [32, 100], [79, 100], [24, 100]];

export default function Kit() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState('d3');
  const [hl, setHl] = useState(2);
  const week = DAYS.map((d, i) => ({ key: `d${i}`, label: t(d), date: 9 + i, dot: i % 3 === 0 }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
        <AppHeader
          safeTop={insets.top}
          greeting={t('Subah bakhair')}
          name="Chotte"
          actions={[{ icon: 'help', label: t('Madad / SOS') }, { icon: 'plus', label: t('Nayi gaadi add karo'), badge: 3 }]}
        />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <HeroCard eyebrow={t('Aaj ka round')} title={t('Hafte ka progress')} subtitle="6 / 8" ring={{ fraction: 0.75, value: 6, label: t('Gaadiyan') }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard style={{ flex: 1 }} label={t('Gaadi ho gayi')} icon="check" tone={brand.mint} value={6} unit={t('Gaadiyan')} />
            <StatCard style={{ flex: 1 }} label={t('Aaj ki kamaai')} icon="star" tone={brand.orange} value="₹480" />
          </View>
          <WeekStrip title="November 2026" days={week} selected={day} onSelect={setDay} onPrev={() => {}} onNext={() => {}} />
          <SectionTitle title={t('Is hafte')} action={t('Paisa')} />
          <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 16 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 15, color: c.fg }}>{t('Aaj ki kamaai')}</Text>
            <Text style={{ fontFamily: F.black, fontSize: 40, color: c.fg, marginBottom: 14 }}>₹1250</Text>
            <BarChart data={BARS.map(([v, tg], i) => ({ label: t(DAYS[i]), value: v, target: tg }))} highlight={hl} onSelect={setHl} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile style={{ width: '47.5%', flexGrow: 1 }} label={t('Gaadiyan')} icon="walk" tone={brand.mint} value="2.0" unit={t('Ghante')} spark={[3, 5, 2, 6, 4, 7, 5, 6, 3, 8, 4, 5]} sparkKind="bars" />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} label={t('Customer rating')} icon="star" tone={brand.red} value="4.8" unit="/5" spark={[4.2, 4.5, 4.4, 4.9, 4.7, 4.8]} sparkKind="line" />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} label={t('Bonus')} icon="plus" value="₹200" />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} label={t('Ghante')} icon="flag" tone={brand.sky} value="6" unit={t('Ghante')} />
          </View>
          <ListCard title="MH 12 AB 1234" detail="Swift · Koregaon Park" icon="drop" chips={[{ label: '7:30' }, { label: '₹400', tone: brand.mint }]} action="plus" />
          <ListCard title="MH 14 XY 9087" detail="Creta · Baner" icon="pin" action="chevron" onPress={() => {}} />
          <Sparkline data={[3, 5, 4, 8, 6, 9, 7]} height={44} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <PillButton icon="plus" label={t('Nayi gaadi add karo')} />
            <PillButton icon="plus" label={t('Nayi gaadi add karo')} tone="violet" />
            <PillButton icon="check" label={t('Gaadi ho gayi')} tone="gold" />
            <PillButton icon="back" label={t('Round')} flat />
            <Ring fraction={0.4} size={64} stroke={10} color={brand.violet} track="rgba(84,9,218,0.15)" ink={c.fg} value="40%" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
