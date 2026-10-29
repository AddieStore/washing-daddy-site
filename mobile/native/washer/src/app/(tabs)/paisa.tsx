// Paisa tab: today's money, what each car pays, the week, and the day's timeline.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { F, OnViolet, brand, cardShadow, useTheme } from '../../ui';
import { BigTitle, Card, Eyebrow, Empty, Ring, Section, Tile } from '../../ui';
import { DAY, Extra, Hist, MODE, Money, RT, Route, S, Sync, W, act, carBy, ensureDay, route, useStore } from '../../state/store';
import { addDaysStr, dayLong, dayNarrow, rupee, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import type { Car } from '../../lib/data';
import { ScreenBar } from '../../screens/JobParts';

function Bar({ frac, today, value, label, i }: { frac: number; today: boolean; value: number; label: string; i: number }) {
  const { c } = useTheme();
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(h, { toValue: frac, duration: 900, delay: i * 60, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [frac, i, h]);
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: F.black, fontSize: 12.5, color: c.fg, height: 18 }}>{value || ''}</Text>
      <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View style={{ width: '100%', maxWidth: 28, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: today ? brand.gold : brand.violet, height: h.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: today ? c.fg : c.fg3 }}>{label}</Text>
    </View>
  );
}

function PayRow({ car, divider }: { car: Car; divider: boolean }) {
  const { c } = useTheme();
  const w = W(car.reg), dn = !!w && w.status === 'done';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: divider ? 1 : 0, borderTopColor: c.line }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{car.model}</Text>
          {car.mine ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,186,8,0.24)' }}><Text style={{ fontFamily: F.black, fontSize: 11, color: c.em }}>{t('meri sale')}</Text></View> : null}
        </View>
        <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>
          {car.plate}{car.pending ? t(' · Ravi ki manzoori baaki') : typeof car.fee === 'number' && car.fee ? t(` · gaadi ${rupee(car.fee)}/mahina`) : t(' · fee book mein nahi hai')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg }}>{car.pending ? '—' : rupee(Money.earns(car))}</Text>
        <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.fg2 }}>{car.pending ? t('manzoori ke baad') : t(`${rupee(Money.perDay(car))} roz${dn ? ' · aaj mila' : ''}`)}</Text>
      </View>
    </View>
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
  const mins = done.map(w => w.minutes).filter((x): x is number => x != null);
  const avg = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0;
  const litres = done.reduce((a, w) => a + (w.water_litres || 0), 0);
  const photos = ws.reduce((a, w) => a + w.photos.length, 0);
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenBar title={t('Hisaab')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 6 }}>
          <Eyebrow>{dayLong(DAY, hi)}</Eyebrow>
          <BigTitle em={t('kamai.')}>{t('Aaj ki')}</BigTitle>
        </View>

        <OnViolet>
          <View style={{ marginTop: 18, borderRadius: 30, padding: 20, backgroundColor: brand.violet2, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' }}>
            <Ring fraction={cn.total ? cn.done / cn.total : 0} size={112}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: F.shout, fontSize: 38, lineHeight: 42, color: brand.cream }}>{cn.done}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: 'rgba(255,246,233,0.7)' }}>/{cn.total} {t('gaadi')}</Text>
              </View>
            </Ring>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: 'rgba(255,246,233,0.7)' }}>{cn.total && cn.done === cn.total ? t('Round poora') : t('Aaj ki kamai')}</Eyebrow>
              <Text style={{ fontFamily: F.black, fontSize: 28, lineHeight: 34, color: brand.cream, marginTop: 4 }}>{rupee(Money.today())}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: 'rgba(255,246,233,0.84)', marginTop: 4 }}>
                {t(`${cn.done} gaadi dhoyi`)}{exToday ? t(` · ${exToday} extra kaam`) : ''}{S.day?.startedAt ? t(` · shuru ${t12(S.day.startedAt)}`) : ''}
              </Text>
            </View>
          </View>
        </OnViolet>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
          <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="💰" value={rupee(Money.today())} label={t('Aaj')} />
          <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="📆" value={rupee(Money.month())} label={t('Is mahine ab tak')} />
          <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="🎯" value={rupee(Money.monthly())} unit={t('/mahina')} label={t('Poora mahina chale to')} />
          <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="✨" value={rupee(Money.monthExtra())} label={t('Extra kaam se')} />
        </View>

        <Section title={t('Gaadi se kamai')} meta={t(`${paid.length} gaadi · aadha aapka`)}>
          {cars.length ? (
            <Card style={{ borderRadius: 24, overflow: 'hidden' }}>
              {paid.concat(pend).map((car, i) => <PayRow key={car.reg} car={car} divider={i > 0} />)}
            </Card>
          ) : <Empty title={t('Koi gaadi nahi')} text={t('Round aayega to kamai yahan dikhegi.')} />}
        </Section>

        <Section title={t('Extra kaam se')} meta={exMonth.length ? t(`${exMonth.length} kaam is mahine`) : ''}>
          {exMonth.length ? (
            <Card style={{ borderRadius: 24, overflow: 'hidden' }}>
              {exMonth.map((j, i) => (
                <View key={j.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
                    <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{j.car || j.reg || ''} · {(j.finished_at || j.date || '').slice(0, 10)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg }}>{rupee(Money.share(j.price))}</Text>
                    <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.fg2 }}>{t('kaam')} {rupee(j.price)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          ) : <Empty title={t('Abhi koi extra kaam nahi')} text={t('Ravi jo extra kaam denge, uska aadha aapka.')} />}
        </Section>

        <Section title={t('Aaj ka kaam')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="⏱️" value={avg} unit={t('min')} label={t('Ek gaadi ka average')} />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="💧" value={litres} unit="L" label={t('Paani lagaya')} />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="📸" value={photos} label={t('Photo bheji')} />
            <Tile style={{ width: '47.5%', flexGrow: 1 }} emoji="⭐" value={ravg ? ravg.toFixed(1) : '–'} unit={rated.length ? `/5 · ${rated.length}` : ''} label={t('Customer rating')} />
          </View>
        </Section>

        <Section title={t('Is hafte')} meta={MODE === 'demo' ? t('Demo data') : t('Gaadi roz')}>
          <View style={[{ flexDirection: 'row', gap: 8, height: 160, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderRadius: 22, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }, cardShadow(c)]}>
            {days.map((d, i) => (
              <Bar key={d} i={i} value={vals[i]} frac={vals[i] / mx} today={d === DAY} label={d === DAY ? t('Aaj') : dayNarrow(d, hi)} />
            ))}
          </View>
        </Section>

        <Section title={t('Aaj ki timeline')}>
          {tl.length ? (
            <Card style={{ borderRadius: 22, overflow: 'hidden' }}>
              {tl.map((w, i) => {
                const car = carBy(w.reg), s = RT[w.reg] || 0;
                return (
                  <View key={w.reg} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                    <Text style={{ width: 62, fontFamily: F.black, fontSize: 15, color: c.fg }}>{w.status === 'done' ? t12(w.finished_at).replace(/ (AM|PM)/, '') : '—'}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>{car ? car.model : w.reg}</Text>
                      <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: c.fg3 }}>
                        {w.status === 'done' ? t(`${w.minutes} min · ${w.tasks.filter(x => x.done).length}/${w.tasks.length} kaam · ${w.photos.length} photo`) : t('Skip') + ' · ' + (w.skip_reason || '')}
                      </Text>
                    </View>
                    {s ? <Text style={{ fontSize: 14, color: brand.gold }}>{'★'.repeat(s)}<Text style={{ color: c.line }}>{'★'.repeat(5 - s)}</Text></Text> : null}
                  </View>
                );
              })}
            </Card>
          ) : <Empty title={t('Abhi kuch nahi')} text={t('Har khatam gaadi yahan time ke saath aayegi.')} />}
        </Section>
      </ScrollView>
    </View>
  );
}
