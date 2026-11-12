// Paisa tab: month total with target, the week, small tiles, what each car pays and the day's history.
import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DutyToggle, F, Footer, PullToRefresh, brand, useTheme } from '../../ui';
import { BarChart, BigNumber, DashCard, Empty, HeroCard, ListCard, SectionTitle, Tile } from '../../ui';
import { DAY, Extra, Hist, MODE, Money, RT, Route, S, Sync, W, act, carBy, ensureDay, route, useStore } from '../../state/store';
import { addDaysStr, dayLong, dayNarrow, rupee, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import type { Car } from '../../lib/data';
import { ScreenBar } from '../../screens/JobParts';
import { RewardsCard } from '../../screens/RewardsCards';

function PayRow({ car }: { car: Car }) {
  const { c } = useTheme();
  const w = W(car.reg), dn = !!w && w.status === 'done';
  const sub = car.plate + (car.pending ? t(' · Manager ki manzoori baaki') : '');
  return (
    <ListCard
      style={{ marginBottom: 12 }}
      title={car.model}
      detail={sub}
      icon="car"
      iconTone={c.primary}
      chips={car.mine ? [{ label: t('meri sale'), tone: undefined as any }] : undefined}
      right={(
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 17, color: c.fg }}>{car.pending ? '—' : rupee(Money.earns(car))}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 11, color: c.fg3 }}>{car.pending ? t('manzoori ke baad') : t(`${rupee(Money.perDay(car))} roz${dn ? ' · aaj mila' : ''}`)}</Text>
        </View>
      )}
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenBar title={t('Hisaab')} />
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 8 }}><DutyToggle /></View>
        <HeroCard
          style={{ marginTop: 6 }}
          eyebrow={dayLong(DAY, hi)}
          eyebrowIcon="tabPaisa"
          title={rupee(month)}
          subtitle={target ? `${t('Poora mahina chale to')} ${rupee(target)}` : t('Is mahine ab tak')}
          ring={{ fraction: target ? month / target : 0, value: cn.done, label: `/${cn.total} ${t('gaadi')}` }}
        >
          <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 18, color: c.fg3 }}>
            {t('Aaj')} {rupee(Money.today())}{exToday ? t(` · ${exToday} extra kaam`) : ''}{S.day?.startedAt ? t(` · shuru ${t12(S.day.startedAt)}`) : ''}
          </Text>
        </HeroCard>

        <View style={{ marginTop: 16 }}><RewardsCard /></View>

        <SectionTitle title={t('Is hafte')} action={MODE === 'demo' ? t('Demo data') : t('Gaadi roz')} style={{ marginTop: 20 }} />
        <DashCard style={{ padding: 15 }}>
          <BarChart
            height={120}
            highlight={days.length - 1}
            data={days.map((d, i) => ({ label: d === DAY ? t('Aaj') : dayNarrow(d, hi), value: vals[i], target: cars.length || undefined }))}
          />
        </DashCard>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 16 }}>
          <Tile style={{ width: '48%' }} icon="car" label={t('Gaadi')} value={`${cn.done}/${cn.total}`} spark={sparkVals} />
          <Tile style={{ width: '48%' }} icon="star" tone={brand.gold} label={t('Customer rating')} value={ravg ? ravg.toFixed(1) : '–'} unit={rated.length ? `/5 · ${rated.length}` : undefined} />
          <Tile style={{ width: '48%' }} icon="clock" tone={brand.mint} label={t('Ghante')} value={hrs ? hrs.toFixed(1) : '–'} unit={hrs ? 'h' : undefined} />
          <Tile style={{ width: '48%' }} icon="plus" tone={brand.gold} label={t('Extra kaam se')} value={bonus ? rupee(bonus) : '–'} />
        </View>

        <SectionTitle title={t('Gaadi se kamai')} action={`${paid.length} ${t('gaadi')}`} style={{ marginTop: 20 }} />
        {cars.length
          ? paid.concat(pend).map(car => <PayRow key={car.reg} car={car} />)
          : <Empty title={t('Koi gaadi nahi')} text={t('Round aayega to kamai yahan dikhegi.')} />}

        <SectionTitle title={t('Extra kaam se')} action={exMonth.length ? t(`${exMonth.length} kaam is mahine`) : undefined} style={{ marginTop: 12 }} />
        {exMonth.length
          ? exMonth.map(j => (
            <ListCard
              key={j.id}
              style={{ marginBottom: 12 }}
              title={j.service || t('Extra kaam')}
              detail={`${j.car || j.reg || ''} · ${(j.finished_at || j.date || '').slice(0, 10)}`}
              icon="plus"
              iconTone={brand.gold}
              right={(
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 17, color: c.fg }}>{rupee(Money.share(j.price))}</Text>
                </View>
              )}
            />
          ))
          : <Empty title={t('Abhi koi extra kaam nahi')} text={t('Manager jo extra kaam denge woh yahan aayega.')} />}

        <SectionTitle title={t('Aaj ki timeline')} style={{ marginTop: 12 }} />
        {tl.length
          ? tl.map(w => {
            const car = carBy(w.reg), s = RT[w.reg] || 0, ok = w.status === 'done';
            return (
              <ListCard
                key={w.reg}
                style={{ marginBottom: 12 }}
                title={car ? car.model : w.reg}
                detail={ok ? t(`${w.minutes} min · ${w.tasks.filter(x => x.done).length}/${w.tasks.length} kaam · ${w.photos.length} photo`) : t('Skip') + ' · ' + (w.skip_reason || '')}
                icon={ok ? 'check' : 'warn'}
                iconTone={ok ? brand.mint : undefined}
                right={(
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 17, color: c.fg }}>{ok ? t12(w.finished_at).replace(/ (AM|PM)/, '') : '—'}</Text>
                    {s ? <Text style={{ fontSize: 12, color: brand.gold }}>{'★'.repeat(s)}<Text style={{ color: c.line }}>{'★'.repeat(5 - s)}</Text></Text> : null}
                  </View>
                )}
              />
            );
          })
          : <Empty title={t('Abhi kuch nahi')} text={t('Har khatam gaadi yahan time ke saath aayegi.')} />}
        <View style={{ marginHorizontal: -16, marginTop: 'auto' }}><Footer bottomPad={120} /></View>
      </PullToRefresh>
    </View>
  );
}
