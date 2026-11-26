// One day's washes (v22 look; date from the route: /day?date=YYYY-MM-DD): date strip, totals as ONE Group, cars washed and skipped as Groups of rows. Read-only.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DemoNote, F, Group, Row, SectionLabel, WeekStrip, useTheme } from '../ui';
import { DAY, MODE, useStore } from '../state/store';
import { useDay, useDayMarks } from '../lib/history';
import { dayStripDays } from '../lib/strip';
import { dayLong, rupee } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { DayCarGroup, DaySummary } from '../screens/DayParts';

export default function DayScreen() {
  useStore();
  const { c } = useTheme();
  const p = useLocalSearchParams<{ date?: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) && String(p.date) <= DAY ? String(p.date) : DAY;
  const { data, failed } = useDay(date);
  const marks = useDayMarks();
  const go = (k: string) => { if (k === DAY) router.replace('/today'); else router.setParams({ date: k }); };
  const done = data?.rows.filter((r) => r.status === 'done') || [], skipped = data?.rows.filter((r) => r.status === 'skipped') || [];
  const msg = failed ? t('Din khul nahi paya. Internet dekho.') : !data ? t('List aa rahi hai…') : !data.rows.length ? t('Is din koi gaadi nahi') : '';
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenBar back title={t('Din ka hisaab')} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Group style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <WeekStrip scroll days={dayStripDays(marks)} selected={date} onSelect={go} jumpLabel={t('Aaj')} />
        </Group>
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5, color: c.fg, marginTop: 24, marginBottom: 12, marginLeft: 4 }}>{dayLong(date, isHindi())}</Text>
        {msg || !data ? <Group><Row icon="car" label={msg} /></Group> : (
          <>
            <DaySummary d={data} earnLabel={t('Us din ki kamai')} />
            {done.length ? <><SectionLabel>{t('Gaadi ho gayi')} · {done.length}</SectionLabel><DayCarGroup rows={done} /></> : null}
            {skipped.length ? <><SectionLabel>{t('Skip')} · {skipped.length}</SectionLabel><DayCarGroup rows={skipped} /></> : null}
            {data.extra ? <DemoNote>{t('Extra kaam')} {rupee(data.extra)}</DemoNote> : null}
            {MODE === 'demo' ? <DemoNote>{t('Yeh namune ka data hai (demo)')}</DemoNote> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
