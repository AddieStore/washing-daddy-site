// Paisa tab, reference look: month number + target progress, the week, then receipt-style groups (today, per car, extras) and the day's timeline.
import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Chip, DutyToggle, F, Group, PullToRefresh, ProgressBar, Receipt, ReceiptRow, Row, ScreenTitle, SectionLabel, ui, useTheme } from '../../ui';
import { BarChart } from '../../ui';
import { DAY, Extra, Hist, MODE, Money, RT, Route, S, Sync, W, act, carBy, ensureDay, route, useStore } from '../../state/store';
import { addDaysStr, dayLong, dayNarrow, rupee, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { CountUp, FadeUp, TNUM } from '../../screens/ProntoBits';
import { EmptyBlock } from '../../screens/EmptyBlock';
import { RewardsCard } from '../../screens/RewardsCards';

export default function Paisa() {
  useStore();
  const { c } = useTheme();
  ensureDay();
  const hi = isHindi();
  const cars = route();
  const paid = cars.filter(x => !x.pending), pend = cars.filter(x => x.pending);
  const ws = cars.map(x => W(x.reg)).filter(Boolean) as NonNullable<ReturnType<typeof W>>[];
  const done = ws.filter(w => w.status === 'done');
  const cn = Route.counts();
  const rated = cars.map(x => RT[x.reg]).filter(Boolean);
  const ravg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const exToday = Extra.doneOn(DAY).length;
  const exMonth = Extra.doneIn(DAY.slice(0, 7));

  // week bars: today is live, the other days come from the db over what this phone remembers
  const [week, setWeek] = useState<Record<string, number>>({});
  const lastKey = useRef('');
  useFocusEffect(useCallback(() => {
    let live = true;
    Hist.fromToday();
    const key = DAY + '|' + cn.done;
    if (lastKey.current !== key) { lastKey.current = key; void Hist.load() }
    Sync.weekCounts().then(r => { if (live && r) setWeek(r) }).catch(() => {});
    act.noteHist(DAY, cn.done);
    return () => { live = false };
  }, [cn.done]));

  const days = [...Array(7)].map((_, i) => addDaysStr(DAY, i - 6));
  const merged = { ...(S.hist || {}), ...week };
  const vals = days.map(d => (d === DAY ? cn.done : merged[d] || 0));
  const mx = Math.max(1, ...vals, cars.length);

  const tl = ws.filter(w => w.status === 'done' || w.status === 'skipped').sort((a, b) => ((a.finished_at || a.updated_at) < (b.finished_at || b.updated_at) ? -1 : 1));

  const allPay = paid.concat(pend);
  const doneRows = tl;
  const month = Money.month(), target = Money.monthly();
  const hrs = done.reduce((a, w) => a + (w.minutes || 0), 0) / 60;
  const bonus = Money.monthExtra();
  const frac = target ? Math.max(0, Math.min(1, month / target)) : 0;
  const paidSum = paid.reduce((a, car) => a + Money.earns(car), 0);
  const extraSum = exMonth.reduce((a, j) => a + Money.share(j.price), 0);
  const shut = (m: string) => () => ui.toast(m);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <ScreenTitle title={t('Hisaab')} subtitle={dayLong(DAY, hi)} right={<DutyToggle />} />
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FadeUp index={0}>
            <Group>
              <View style={{ padding: 20 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: c.grey }}>{t('Is mahine ab tak')}</Text>
                <CountUp to={Math.round(month)} fmt={rupee} style={{ fontFamily: F.bold, fontSize: 40, lineHeight: 48, letterSpacing: -1.2, color: c.fg, marginTop: 2 }} />
                {target ? (
                  <View style={{ marginTop: 14, gap: 8 }}>
                    <ProgressBar fraction={frac} height={6} color={c.primary} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[TNUM, { fontFamily: F.medium, fontSize: 12.5, color: c.grey }]}>{Math.round(frac * 100)}%</Text>
                      <Text style={[TNUM, { fontFamily: F.medium, fontSize: 12.5, color: c.grey }]}>{t('Poora mahina chale to')} {rupee(target)}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Chip tone="grey">{t('Aaj')} {rupee(Money.today())}</Chip>
                <Chip tone="grey">{cn.done}/{cn.total} {t('gaadi')}</Chip>
                {exToday ? <Chip tone="grey">{t(`${exToday} extra kaam`)}</Chip> : null}
                {S.day?.startedAt ? <Chip tone="grey">{t(`shuru ${t12(S.day.startedAt)}`)}</Chip> : null}
              </View>
            </Group>
          </FadeUp>

          <SectionLabel>{t('Is hafte')}{MODE === 'demo' ? ` · ${t('Demo data')}` : ` · ${t('Gaadi roz')}`}</SectionLabel>
          <FadeUp index={1}>
            <Group>
              <View style={{ padding: 16 }}>
                <BarChart
                  height={110}
                  highlight={days.length - 1}
                  data={days.map((d, i) => ({ label: d === DAY ? t('Aaj') : dayNarrow(d, hi), value: vals[i], target: cars.length || undefined }))}
                />
              </View>
            </Group>
          </FadeUp>

          <SectionLabel>{t('Bonus')}</SectionLabel>
          <FadeUp index={2}><RewardsCard /></FadeUp>

          <SectionLabel>{t('Aaj ka hisaab')}</SectionLabel>
          <FadeUp index={3}>
            <Receipt>
              <ReceiptRow label={t('Gaadi')} value={`${cn.done}/${cn.total}`} />
              <ReceiptRow label={t('Customer rating')} value={ravg ? `${ravg.toFixed(1)} / 5` : '–'} hint onHint={shut(t('Jitni gaadi ki rating mili, unka average'))} />
              <ReceiptRow label={t('Ghante')} value={hrs ? `${hrs.toFixed(1)} h` : '–'} />
              <ReceiptRow label={t('Extra kaam se')} value={bonus ? rupee(bonus) : '–'} />
            </Receipt>
          </FadeUp>

          <SectionLabel>{t('Gaadi se kamai')}{cars.length ? ` · ${paid.length} ${t('gaadi')}` : ''}</SectionLabel>
          {cars.length ? (
            <Receipt>
              {allPay.map(car => {
                const w = W(car.reg), dn = !!w && w.status === 'done';
                return (
                  <ReceiptRow key={car.reg} label={car.model} hint
                    onHint={shut(`${car.plate}${car.pending ? ' · ' + t('Manager ki manzoori baaki') : ' · ' + rupee(Money.perDay(car)) + ' ' + t('roz') + (dn ? ' · ' + t('aaj mila') : '')}${car.mine ? ' · ' + t('meri sale') : ''}`)}
                    value={car.pending ? '—' : rupee(Money.earns(car))} />
                );
              })}
              <ReceiptRow label={t('Kul')} value={rupee(paidSum)} total />
            </Receipt>
          ) : <EmptyBlock icon="car" title={t('Koi gaadi nahi')} text={t('Round aayega to kamai yahan dikhegi.')} />}

          <SectionLabel>{t('Extra kaam se')}{exMonth.length ? ` · ${t(`${exMonth.length} kaam is mahine`)}` : ''}</SectionLabel>
          {exMonth.length ? (
            <Receipt>
              {exMonth.map(j => (
                <ReceiptRow key={j.id} label={j.service || t('Extra kaam')} hint
                  onHint={shut(`${j.car || j.reg || ''} · ${(j.finished_at || j.date || '').slice(0, 10)}`)} value={rupee(Money.share(j.price))} />
              ))}
              <ReceiptRow label={t('Kul')} value={rupee(extraSum)} total />
            </Receipt>
          ) : <EmptyBlock icon="plus" title={t('Abhi koi extra kaam nahi')} text={t('Manager jo extra kaam denge woh yahan aayega.')} />}

          <SectionLabel>{t('Aaj ki timeline')}</SectionLabel>
          {doneRows.length ? (
            <Group>
              {doneRows.map(w => {
                const car = carBy(w.reg), st = RT[w.reg] || 0, ok = w.status === 'done';
                return (
                  <Row
                    key={w.reg}
                    icon={ok ? 'check' : 'warn'}
                    label={car ? car.model : w.reg}
                    sub={ok ? t(`${w.minutes} min · ${w.tasks.filter(x => x.done).length}/${w.tasks.length} kaam · ${w.photos.length} photo`) : t('Skip') + ' · ' + (w.skip_reason || '')}
                    right={
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[TNUM, { fontFamily: F.semi, fontSize: 15, color: c.fg }]}>{ok ? t12(w.finished_at).replace(/ (AM|PM)/, '') : '—'}</Text>
                        {st ? <Text style={{ fontSize: 12, color: c.gold }}>{'★'.repeat(st)}<Text style={{ color: c.line }}>{'★'.repeat(5 - st)}</Text></Text> : null}
                      </View>
                    }
                  />
                );
              })}
            </Group>
          ) : <EmptyBlock art="history" icon="clock" title={t('Abhi kuch nahi')} text={t('Har khatam gaadi yahan time ke saath aayegi.')} />}
        </View>
      </PullToRefresh>
    </View>
  );
}
