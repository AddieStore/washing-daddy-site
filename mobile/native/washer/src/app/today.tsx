// Today's round in detail (v22 look): totals as ONE Group, every car in slot order as ONE Group of rows, and the places he serves.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, F, Group, Row, SectionLabel, useTheme } from '../ui';
import { DAY, act, useStore } from '../state/store';
import { todayData } from '../lib/history';
import { usePlaces, useMyPos } from '../lib/places';
import { dayLong } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { DayCarGroup, DaySummary, FadeUp } from '../screens/DayParts';
import MapView from '../screens/MapView';

export default function TodayScreen() {
  useStore();
  const { c } = useTheme();
  const d = todayData();
  const places = usePlaces();
  const { pos, ask } = useMyPos();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenBar back title={t('Aaj ka round')} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: c.fg, marginBottom: 12, marginLeft: 4 }}>{dayLong(DAY, isHindi())}</Text>
        <DaySummary d={d} earnLabel={t('Aaj ki kamai')} />
        <SectionLabel>{t('Gaadiyon ki list')} · {d.rows.length}</SectionLabel>
        {d.rows.length
          ? <DayCarGroup rows={d.rows} spotDate={DAY} onPress={(r) => { act.setCurrent(r.reg); router.push('/job'); }} />
          : <Group><Row icon="car" label={t('Koi gaadi nahi')} sub={t('Book mein aaj aapke naam koi active gaadi nahi hai.')} /></Group>}
        {places.length ? (
          <>
            <SectionLabel>{t('Jahan aap kaam karte ho')}</SectionLabel>
            <FadeUp index={4}><MapView places={places} me={pos} height={320} /></FadeUp>
            {!pos ? <Button variant="ghost" label={t('Meri location')} icon="pin" onPress={ask} style={{ marginTop: 12 }} /> : null}
            <Group style={{ marginTop: 12 }}>
              {places.map((p) => <Row key={p.id} icon="pin" label={p.label} right={<Chip tone="violet">{p.cars.length} {t('gaadi')}</Chip>} />)}
            </Group>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
