// Paisa tab: month total with target, the week, small tiles, what each car pays and the day's history.
import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DutyToggle, F, Footer, PullToRefresh, Ring, brand, useTheme } from '../../ui';
import { BarChart, Tile } from '../../ui';
import { DAY, Extra, Hist, MODE, Money, RT, Route, S, Sync, W, act, carBy, ensureDay, route, useStore } from '../../state/store';
import { addDaysStr, dayLong, dayNarrow, rupee, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import type { Car } from '../../lib/data';
import { LiveSyncChip } from '../../screens/JobParts';
import { CountUp, FadeUp, OnHeaderPill, PEmpty, PRow, PSection, RowsCard, TNUM, VHeader, WCard } from '../../screens/ProntoBits';
import { RewardsCard } from '../../screens/RewardsCards';

/** Right-hand amount column of a list row: big figure (own earning only) and a small grey line. */
function Amt({ main, sub, stars }: { main: string; sub?: string; stars?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
      <Text style={[TNUM, { fontFamily: F.bold, fontSize: 16, lineHeight: 22, color: c.fg }]}>{main}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 11, lineHeight: 16, color: c.fg3 }}>{sub}</Text> : null}
      {stars ? <Text style={{ fontSize: 12, color: brand.gold }}>{'★'.repeat(stars)}<Text style={{ color: c.line }}>{'★'.repeat(5 - stars)}</Text></Text> : null}
    </View>
  );
}

function PayRow({ car, last }: { car: Car; last?: boolean }) {
  const { c } = useTheme();
  const w = W(car.reg), dn = !!w && w.status === 'done';
  const sub = car.plate + (car.pending ? t(' · Manager ki manzoori baaki') : '') + (car.mine ? ' · ' + t('meri sale') : '');
  return (
    <PRow
      tile
      icon="car"
      last={last}
      title={car.model}
      sub={sub}
      chevron={false}
      right={<Amt main={car.pending ? '—' : rupee(Money.earns(car))} sub={car.pending ? t('manzoori ke baad') : t(`${rupee(Money.perDay(car))} roz${dn ? ' · aaj mila' : ''}`)} />}
    />
  );
}

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

  const month = Money.month(), target = Money.monthly();
  const hrs = done.reduce((a, w) => a + (w.minutes || 0), 0) / 60;
  const sparkVals = vals.length > 1 && vals.some(v => v > 0) ? vals : undefined;
  const bonus = Money.monthExtra();

  const allPay = paid.concat(pend);
  const doneRows = tl;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <VHeader pad={72}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 22, lineHeight: 28, color: '#fff' }}>{t('Hisaab')}</Text>
            <LiveSyncChip />
          </View>
          <View style={{ marginTop: 8 }}><OnHeaderPill><DutyToggle /></OnHeaderPill></View>
          <FadeUp index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' }}>{dayLong(DAY, hi)}</Text>
              <CountUp to={Math.round(month)} fmt={rupee} style={{ fontFamily: F.black, fontSize: 38, lineHeight: 46, letterSpacing: -0.5, color: '#fff', marginTop: 4 }} />
              <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)' }}>
                {target ? `${t('Poora mahina chale to')} ${rupee(target)}` : t('Is mahine ab tak')}
              </Text>
              <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>
                {t('Aaj')} {rupee(Money.today())}{exToday ? t(` · ${exToday} extra kaam`) : ''}{S.day?.startedAt ? t(` · shuru ${t12(S.day.startedAt)}`) : ''}
              </Text>
            </View>
            <Ring size={84} stroke={9} fraction={target ? month / target : 0} value={cn.done} label={`/${cn.total} ${t('gaadi')}`} color="#FFD166" track="rgba(255,255,255,0.22)" ink="#fff" labelColor="rgba(255,255,255,0.75)" />
          </FadeUp>
        </VHeader>

        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          <FadeUp index={1}><RewardsCard /></FadeUp>

          <PSection title={t('Is hafte')} note={MODE === 'demo' ? t('Demo data') : t('Gaadi roz')} />
          <FadeUp index={2}>
            <WCard style={{ padding: 16 }}>
              <BarChart
                height={120}
                highlight={days.length - 1}
                data={days.map((d, i) => ({ label: d === DAY ? t('Aaj') : dayNarrow(d, hi), value: vals[i], target: cars.length || undefined }))}
              />
            </WCard>
          </FadeUp>

          <FadeUp index={3} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 12 }}>
            <Tile style={{ width: '48%' }} icon="car" label={t('Gaadi')} value={`${cn.done}/${cn.total}`} spark={sparkVals} />
            <Tile style={{ width: '48%' }} icon="star" tone={brand.gold} label={t('Customer rating')} value={ravg ? ravg.toFixed(1) : '–'} unit={rated.length ? `/5 · ${rated.length}` : undefined} />
            <Tile style={{ width: '48%' }} icon="clock" tone={brand.mint} label={t('Ghante')} value={hrs ? hrs.toFixed(1) : '–'} unit={hrs ? 'h' : undefined} />
            <Tile style={{ width: '48%' }} icon="plus" tone={brand.gold} label={t('Extra kaam se')} value={bonus ? rupee(bonus) : '–'} />
          </FadeUp>

          <PSection title={t('Gaadi se kamai')} note={`${paid.length} ${t('gaadi')}`} />
          {cars.length
            ? <RowsCard>{allPay.map((car, i) => <PayRow key={car.reg} car={car} last={i === allPay.length - 1} />)}</RowsCard>
            : <PEmpty icon="car" title={t('Koi gaadi nahi')} text={t('Round aayega to kamai yahan dikhegi.')} />}

          <PSection title={t('Extra kaam se')} note={exMonth.length ? t(`${exMonth.length} kaam is mahine`) : undefined} />
          {exMonth.length
            ? (
              <RowsCard>
                {exMonth.map((j, i) => (
                  <PRow
                    key={j.id}
                    tile
                    tone={brand.gold}
                    icon="plus"
                    last={i === exMonth.length - 1}
                    title={j.service || t('Extra kaam')}
                    sub={`${j.car || j.reg || ''} · ${(j.finished_at || j.date || '').slice(0, 10)}`}
                    chevron={false}
                    right={<Amt main={rupee(Money.share(j.price))} />}
                  />
                ))}
              </RowsCard>
            )
            : <PEmpty icon="plus" title={t('Abhi koi extra kaam nahi')} text={t('Manager jo extra kaam denge woh yahan aayega.')} />}

          <PSection title={t('Aaj ki timeline')} />
          {doneRows.length
            ? (
              <RowsCard>
                {doneRows.map((w, i) => {
                  const car = carBy(w.reg), s = RT[w.reg] || 0, ok = w.status === 'done';
                  return (
                    <PRow
                      key={w.reg}
                      tile
                      tone={ok ? c.ok : brand.orange}
                      icon={ok ? 'check' : 'warn'}
                      last={i === doneRows.length - 1}
                      title={car ? car.model : w.reg}
                      sub={ok ? t(`${w.minutes} min · ${w.tasks.filter(x => x.done).length}/${w.tasks.length} kaam · ${w.photos.length} photo`) : t('Skip') + ' · ' + (w.skip_reason || '')}
                      chevron={false}
                      right={<Amt main={ok ? t12(w.finished_at).replace(/ (AM|PM)/, '') : '—'} stars={s || undefined} />}
                    />
                  );
                })}
              </RowsCard>
            )
            : <PEmpty icon="clock" title={t('Abhi kuch nahi')} text={t('Har khatam gaadi yahan time ke saath aayegi.')} />}
        </View>
        <View style={{ marginTop: 'auto' }}><Footer bottomPad={120} /></View>
      </PullToRefresh>
    </View>
  );
}
