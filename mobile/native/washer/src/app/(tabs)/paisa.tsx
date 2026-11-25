// Paisa tab, reference look: month number + target progress, the week, then receipt-style groups (today, per car, extras) and the day's timeline.
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { F, HeaderBar, Icon, Lift, PCard, PageHeader, PTitle, PullToRefresh, StatTile, WeekBars, useTheme } from '../../ui';
import { router } from 'expo-router';
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
  const [showAll, setShowAll] = useState(false);
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
  // pace: what the month looks like at today's speed, and what each remaining day has to bring to reach the target
  const dayN = parseInt(DAY.slice(8, 10), 10) || 1, dim = new Date(parseInt(DAY.slice(0, 4), 10), parseInt(DAY.slice(5, 7), 10), 0).getDate();
  const daysLeft = Math.max(0, dim - dayN), togo = Math.max(0, target - month);
  const projected = dayN > 2 ? Math.round(month / dayN * dim) : 0;
  const perDay = daysLeft ? Math.ceil(togo / daysLeft) : togo;
  const weekCars = vals.reduce((a, b) => a + b, 0), bestIdx = vals.indexOf(Math.max(...vals));
  const monthWash = Money.monthWashes();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <PageHeader title={t('Hisaab')} sub={dayLong(DAY, hi)} bottomPad={74}>
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' }}>{t('Is mahine ab tak')}</Text>
            <CountUp to={Math.round(month)} fmt={rupee} style={{ fontFamily: F.displayBlack, fontSize: 48, lineHeight: 56, letterSpacing: -1.6, color: '#fff', marginTop: 0 }} />
            {target ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                <HeaderBar fraction={frac} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[TNUM, { fontFamily: F.semi, fontSize: 12.5, color: '#FFD166' }]}>{Math.round(frac * 100)}%</Text>
                  <Text style={[TNUM, { fontFamily: F.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }]}>{t('Poora mahina chale to')} {rupee(target)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </PageHeader>
        <Lift>
          <FadeUp index={0}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile icon="gift" tone="violet" value={rupee(Money.today())} label={t('Aaj')} />
              <StatTile icon="car" tone="blue" value={`${cn.done}/${cn.total}`} label={t('gaadi')} onPress={() => router.push('/today')} />
              <StatTile icon="star" tone="amber" value={ravg ? ravg.toFixed(1) : '–'} label={t('Rating')} />
            </View>
          </FadeUp>

          {target ? (
            <FadeUp index={1} style={{ marginTop: 12 }}>
              <PCard style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: togo ? 'rgba(84,9,218,0.08)' : 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={togo ? 'flag' : 'check'} size={22} color={togo ? c.primary : c.ok} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {togo ? (
                    <>
                      <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg }}>{t('Target ke liye')} {rupee(togo)} {t('baaki')}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey, marginTop: 1 }}>
                        {daysLeft ? `${daysLeft} ${t('din bache')} · ${t('roz ~')}${rupee(perDay)}` : t('Aaj aakhri din hai')}{projected ? ` · ${t('is raftaar se')} ~${rupee(projected)}` : ''}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg }}>{t('Mahine ka target poora')}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey, marginTop: 1 }}>{t('Ab jo bhi aayega woh extra hai.')}</Text>
                    </>
                  )}
                </View>
              </PCard>
            </FadeUp>
          ) : null}

          <FadeUp index={2} style={{ marginTop: 12 }}>
            <PCard style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey }}>{t('Monthly gaadi (subah)')}</Text>
                  <Text style={[TNUM, { fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5, color: c.fg }]}>{rupee(monthWash)}</Text>
                </View>
                <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: c.line, marginHorizontal: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey }}>{t('Extra kaam (dopahar)')}</Text>
                  <Text style={[TNUM, { fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5, color: c.fg }]}>{rupee(bonus)}</Text>
                </View>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.soft, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ flex: Math.max(0.0001, monthWash), backgroundColor: c.primary }} />
                <View style={{ flex: Math.max(0.0001, bonus), backgroundColor: '#FFBA08' }} />
              </View>
            </PCard>
          </FadeUp>

          <PTitle title={t('Is hafte')} note={MODE === 'demo' ? t('Demo data') : undefined} />
          <FadeUp index={3}>
            <PCard style={{ paddingVertical: 16, paddingHorizontal: 12 }}>
              <WeekBars data={days.map((d, i) => ({ label: d === DAY ? t('Aaj') : dayNarrow(d, hi), value: vals[i], today: d === DAY }))} />
              <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line }}>
                {[[String(weekCars), t('gaadi is hafte')], [(weekCars / 7).toFixed(1), t('roz ka average')], [vals[bestIdx] ? `${vals[bestIdx]}` : '–', t('sabse zyada')]].map(([v, l]) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[TNUM, { fontFamily: F.bold, fontSize: 18, color: c.fg }]}>{v}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: c.grey }}>{l}</Text>
                  </View>
                ))}
              </View>
            </PCard>
          </FadeUp>

          <PTitle title={t('Bonus')} />
          <FadeUp index={4}><RewardsCard /></FadeUp>

          <PTitle title={t('Monthly gaadi se kamai')} note={cars.length ? `${paid.length} ${t('gaadi')}` : undefined} />
          {cars.length ? (
            <PCard style={{ padding: 6 }}>
              {(showAll ? allPay : allPay.slice(0, 5)).map((car, i) => {
                const w = W(car.reg), dn = !!w && w.status === 'done';
                return (
                  <View key={car.reg} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: dn ? '#22C58B' : c.soft, alignItems: 'center', justifyContent: 'center' }}>
                      {dn ? <Icon name="check" size={15} color="#fff" /> : <Text style={[TNUM, { fontFamily: F.bold, fontSize: 11.5, color: c.grey }]}>{i + 1}</Text>}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14.5, color: c.fg }}>{car.model}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{car.pending ? t('Manager ki manzoori baaki') : `${rupee(Money.perDay(car))} ${t('roz')}`}{car.mine ? ` · ${t('meri sale')}` : ''}</Text>
                    </View>
                    <Text style={[TNUM, { fontFamily: F.bold, fontSize: 15, color: c.fg }]}>{car.pending ? '—' : rupee(Money.earns(car))}</Text>
                  </View>
                );
              })}
              {allPay.length > 5 ? (
                <Pressable onPress={() => setShowAll(v => !v)} accessibilityRole="button" style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: c.line }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: c.primary }}>{showAll ? t('Kam dikhao') : t(`Saari ${allPay.length} gaadi dekho`)}</Text>
                </Pressable>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>{t('Kul')}</Text>
                <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 20, color: c.fg }]}>{rupee(paidSum)}</Text>
              </View>
            </PCard>
          ) : <EmptyBlock icon="car" title={t('Koi gaadi nahi')} text={t('Round aayega to kamai yahan dikhegi.')} />}

          <PTitle title={t('Extra kaam se kamai')} note={exMonth.length ? t(`${exMonth.length} kaam is mahine`) : undefined} />
          {exMonth.length ? (
            <PCard style={{ padding: 6 }}>
              {exMonth.map((j, i) => (
                <View key={j.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,186,8,0.22)', alignItems: 'center', justifyContent: 'center' }}><Icon name="tabExtra" size={14} color="#C77700" /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14.5, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{j.car || j.reg || ''} · {(j.finished_at || j.date || '').slice(0, 10)}</Text>
                  </View>
                  <Text style={[TNUM, { fontFamily: F.bold, fontSize: 15, color: c.fg }]}>{rupee(Money.share(j.price))}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>{t('Kul')}</Text>
                <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 20, color: c.fg }]}>{rupee(extraSum)}</Text>
              </View>
            </PCard>
          ) : <EmptyBlock icon="plus" title={t('Abhi koi extra kaam nahi')} text={t('Dopahar mein jo extra kaam accept karoge woh yahan aayega.')} />}
        </Lift>
      </PullToRefresh>
    </View>
  );
}
