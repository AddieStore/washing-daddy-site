// One day's washes (date from the route: /day?date=YYYY-MM-DD): the same date strip on top to hop to another day,
// then the totals, the cars washed (times, his earning, photos, rating) and the skipped ones. Read-only.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DotBg, DashCard, Footer, DemoNote, Empty, F, SectionTitle, WeekStrip, useTheme } from '../ui';
import { DAY, MODE, useStore } from '../state/store';
import { useDay, useDayMarks } from '../lib/history';
import { dayStripDays } from '../lib/strip';
import { dayLong, rupee } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { DayRowCard, DaySummary } from '../screens/DayParts';

export default function DayScreen() {
  useStore();
  const { c } = useTheme();
  const p = useLocalSearchParams<{ date?: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) && String(p.date) <= DAY ? String(p.date) : DAY;
  const { data, failed } = useDay(date);
  const marks = useDayMarks();
  const go = (k: string) => { if (k === DAY) router.replace('/today'); else router.setParams({ date: k }); };
  const done = data?.rows.filter((r) => r.status === 'done') || [], skipped = data?.rows.filter((r) => r.status === 'skipped') || [];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DotBg />
      <ScreenBar back title={t('Din ka hisaab')} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <WeekStrip scroll days={dayStripDays(marks)} selected={date} onSelect={go} jumpLabel={t('Aaj')} />
        <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 17, color: c.fg, marginTop: 16, marginBottom: 10 }}>{dayLong(date, isHindi())}</Text>
        {failed ? <Empty title={t('Din khul nahi paya. Internet dekho.')} /> : !data ? <Empty title={t('List aa rahi hai…')} /> : !data.rows.length ? <Empty title={t('Is din koi gaadi nahi')} /> : (
          <>
            <DaySummary d={data} earnLabel={t('Us din ki kamai')} />
            <SectionTitle title={t('Gaadi ho gayi')} action={`${done.length}`} style={{ marginTop: 20 }} />
            {done.length ? <View style={{ gap: 10 }}>{done.map((r) => <DayRowCard key={r.reg} r={r} />)}</View> : <DashCard style={{ padding: 14 }}><Text style={{ fontFamily: F.body, color: c.fg3 }}>–</Text></DashCard>}
            {skipped.length ? (
              <>
                <SectionTitle title={t('Skip')} action={`${skipped.length}`} style={{ marginTop: 20 }} />
                <View style={{ gap: 10 }}>{skipped.map((r) => <DayRowCard key={r.reg} r={r} />)}</View>
              </>
            ) : null}
            {data.extra ? <DemoNote>{t('Extra kaam')} {rupee(data.extra)}</DemoNote> : null}
            {MODE === 'demo' ? <DemoNote>{t('Yeh namune ka data hai (demo)')}</DemoNote> : null}
          </>
        )}
        <View style={{ marginHorizontal: -16, marginTop: 'auto' }}><Footer /></View>
      </ScrollView>
    </View>
  );
}
