// Today's round in detail: the totals, what he earned (his own share), first start / last finish, every car in slot order,
// and the map of the places he serves.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DotBg, DashCard, Footer, Empty, F, SectionTitle, useTheme } from '../ui';
import { DAY, act, useStore } from '../state/store';
import { todayData } from '../lib/history';
import { usePlaces, useMyPos } from '../lib/places';
import { dayLong } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { DayRowCard, DaySummary } from '../screens/DayParts';
import MapView from '../screens/MapView';
import { Button } from '../ui';

export default function TodayScreen() {
  useStore();
  const { c } = useTheme();
  const d = todayData();
  const places = usePlaces();
  const { pos, ask } = useMyPos();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DotBg />
      <ScreenBar back title={t('Aaj ka round')} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3, marginBottom: 10 }}>{dayLong(DAY, isHindi())}</Text>
        <DaySummary d={d} earnLabel={t('Aaj ki kamai')} />
        <SectionTitle title={t('Gaadiyon ki list')} action={`${d.rows.length}`} style={{ marginTop: 20 }} />
        {d.rows.length
          ? <View style={{ gap: 10 }}>{d.rows.map((r) => <DayRowCard key={r.reg} r={r} onPress={() => { act.setCurrent(r.reg); router.push('/job'); }} />)}</View>
          : <Empty title={t('Koi gaadi nahi')} text={t('Book mein aaj aapke naam koi active gaadi nahi hai.')} />}
        {places.length ? (
          <>
            <SectionTitle title={t('Jahan aap kaam karte ho')} style={{ marginTop: 20 }} />
            <MapView places={places} me={pos} height={360} />
            {!pos ? <Button variant="ghost" label={t('Meri location')} icon="pin" onPress={ask} style={{ marginTop: 10 }} /> : null}
            <DashCard style={{ marginTop: 10, padding: 14, gap: 6 }}>
              {places.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: c.fg }}>{p.label}</Text>
                  <Text style={{ fontFamily: F.black, fontSize: 14, color: c.primary }}>{p.cars.length} {t('gaadi')}</Text>
                </View>
              ))}
            </DashCard>
          </>
        ) : null}
        <View style={{ marginHorizontal: -16, marginTop: 'auto' }}><Footer /></View>
      </ScrollView>
    </View>
  );
}
