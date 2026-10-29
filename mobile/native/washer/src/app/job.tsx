// The car screen: pushed from the round. Stage, stepper, requests, the one main action, tasks, photos, note, skip.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { F, Icon, OnViolet, brand, ui, useTheme } from '../ui';
import { Button, CallButton, CarArt, Card, Chip, DemoNote, Empty, Eyebrow, LinkButton, Plate, ProgressBar, Section, SlideToConfirm, Stepper, Tier } from '../ui';
import type { StepItem } from '../ui';
import { Route, RT, W, act, carBy, ensureDay, openReqs, planName, route, skipAsk, S, useStore, DAY, view } from '../state/store';
import { STATUS, navOf, telOf } from '../lib/data';
import type { Photo } from '../lib/data';
import { tasksFor, TASK } from '../lib/schedule';
import { t } from '../lib/i18n';
import { hm12, t12 } from '../lib/time';
import { takePhoto } from '../lib/photo';
import { ScreenBar, ReqCard, Shot, TaskRow, WashTimer, openNoteSheet, openPhotoSheet, openSkipSheet, openSuccessSheet, type ShotItem } from '../screens/JobParts';

const ORDER = ['scheduled', 'on_the_way', 'arrived', 'washing', 'done'];
const STEPS: [string, string, StepItem['icon'], string][] = [
  ['on_the_way', 'Nikla', 'walk', 'on_the_way_at'],
  ['arrived', 'Pahuncha', 'flag', 'arrived_at'],
  ['washing', 'Wash', 'drop', 'started_at'],
  ['done', 'Ho gaya', 'check', 'finished_at'],
];

/* ---------- the violet stage ---------- */
function Marquee({ text }: { text: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const a = Animated.loop(Animated.timing(x, { toValue: -w, duration: Math.max(8000, w * 28), easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [w, x]);
  const seg = `${text} · `;
  const st = { fontFamily: F.shout, fontSize: 110, lineHeight: 120, color: brand.cream, textTransform: 'uppercase' as const };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 70, left: 0, right: 0, height: 130, overflow: 'hidden', opacity: 0.09 }}>
      <Animated.View style={{ flexDirection: 'row', width: 4000, transform: [{ translateX: x }] }}>
        <Text numberOfLines={1} onLayout={e => setW(Math.round(e.nativeEvent.layout.width))} style={[st, { flexShrink: 0 }]}>{seg}</Text>
        <Text numberOfLines={1} style={st}>{seg}</Text>
        <Text numberOfLines={1} style={st}>{seg}</Text>
      </Animated.View>
    </View>
  );
}

function Stage({ reg, st }: { reg: string; st: string }) {
  const { width } = useWindowDimensions();
  const c = carBy(reg)!, wd = W(reg);
  const enter = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const washing = st === 'washing';
  useEffect(() => {
    enter.setValue(1);
    Animated.spring(enter, { toValue: 0, useNativeDriver: true, speed: 9, bounciness: 7 }).start();
  }, [reg, enter]);
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [bob]);
  useEffect(() => {
    if (!washing) { shake.setValue(0); return }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [washing, shake]);
  const carW = Math.min(width - 56, 400);
  const tel = telOf(c.phone);
  const chipA = `${t(STATUS[st as keyof typeof STATUS])}${wd && st === 'scheduled' ? ' · ' + hm12(wd.eta) : ''}`;
  const idx = route().findIndex(x => x.reg === reg) + 1;
  return (
    <OnViolet>
      <View style={{ marginHorizontal: 10, marginTop: 4, height: 380, borderRadius: 34, backgroundColor: brand.violet, overflow: 'hidden', shadowColor: brand.violet, shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 20 }, elevation: 8 }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: -60, right: -60, top: -140, height: 340, borderRadius: 400, backgroundColor: '#7a2cff', opacity: 0.55 }} />
        <Marquee text={c.model} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 118, height: 6, backgroundColor: brand.gold, opacity: 0.9 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: '10%', right: '10%', bottom: 108, height: 40, borderRadius: 40, backgroundColor: 'rgba(18,7,36,0.5)' }} />
        <View style={{ position: 'absolute', top: 14, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 3 }}>
          <Chip>{chipA}</Chip>
          <Chip>{`${idx} / ${route().length}`}</Chip>
        </View>
        {washing && wd?.started_at ? <WashTimer startedAt={wd.started_at} /> : null}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 128, alignItems: 'center' }}>
          <Animated.View style={{ transform: [
            { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }) },
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
            { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-1.5, 1.5] }) },
          ] }}>
            <CarArt car={c} width={carW} />
          </Animated.View>
        </View>
        <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16, zIndex: 3 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.hero, fontSize: 34, lineHeight: 40, color: brand.cream }}>{c.model}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <Plate reg={c.plate} />
            <Tier label={planName(c)} />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: 'rgba(255,246,233,0.84)' }}>{c.customer}</Text>
            {tel && c.phone ? <CallButton phone={c.phone} small label={t('Call')} /> : null}
          </View>
        </View>
      </View>
    </OnViolet>
  );
}

/* ---------- the screen ---------- */
export default function JobScreen() {
  useStore();
  const { c: th } = useTheme();
  const router = useRouter();
  ensureDay();
  const reg = act.currentReg();
  const car = reg ? carBy(reg) : undefined;
  const wd = reg ? W(reg) : null;
  const st = wd ? wd.status : 'scheduled';
  const unseen = reg ? openReqs(reg).filter(q => q.status === 'open').length : 0;
  const lastReg = useRef<string | null>(null);
  const [rearm, setRearm] = useState(0);

  // keep S.current in step with what is shown
  useEffect(() => { if (reg && S.current !== reg) act.setCurrent(reg) }, [reg]);
  // opening a car with an open request counts as "seen"
  useFocusEffect(useCallback(() => { if (reg && unseen) act.markSeen(reg) }, [reg, unseen]));
  useEffect(() => { lastReg.current = reg || null }, [reg]);

  const goPaisa = () => router.navigate('/paisa' as any);
  const goRound = () => { if (router.canGoBack()) router.back(); else router.navigate('/') };

  if (!reg || !car) {
    return (
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <ScreenBar title={t('Abhi')} back />
        <View style={{ padding: 16 }}>
          {S.day?.started
            ? <Empty title={t('Koi gaadi baaki nahi')} text={t('Aaj ka round poora. Shabash!')} />
            : <>
                <Empty title={t('Pehle round shuru karo')} text={t('Round tab pe slide karo, phir pehli gaadi yahan khulegi.')} />
                <View style={{ height: 14 }} />
                <Button variant="gold" label={t('Round pe chalo')} onPress={goRound} />
              </>}
        </View>
      </View>
    );
  }

  const tasks = wd ? wd.tasks : tasksFor(reg, car.plan, DAY).map(k => ({ key: k, done: false, done_at: null as string | null }));
  const can = !!wd && wd.status === 'washing';
  const tdone = tasks.filter(x => x.done).length;
  const idx = ORDER.indexOf(st);
  const steps: StepItem[] = STEPS.map(([k, l, ic, field], i) => {
    const si = i + 1;
    const state = st === 'skipped' ? 'none' : (idx > si || st === 'done') ? 'ok' : idx === si ? 'now' : 'none';
    const at = wd ? (wd as any)[field] as string | null : null;
    return { icon: ic, label: t(l), time: at ? t12(at).replace(/ (AM|PM)/, '') : undefined, state } as StepItem;
  });
  const reqs = openReqs(reg).filter(q => q.kind !== 'skip_tomorrow');
  const sk = skipAsk(reg);
  const pend = view.pendingPhotos[reg] || [];
  const photosOf = (kind: 'after' | 'issue'): ShotItem[] =>
    ((wd ? wd.photos : []) as ShotItem[]).filter(p => p.kind === kind).concat(pend.filter(p => p.kind === kind).map(p => ({ kind: p.kind, at: '', display: p.display, pending: true } as ShotItem)));
  const hasAfter = !!wd && wd.photos.some(p => p.kind === 'after');

  const shoot = async (kind: Photo['kind']) => {
    if (!W(reg)) { ui.toast(t('Pehle round shuru karo')); return }
    ui.flash();
    try {
      const r = await takePhoto();
      if (!r) return;
      act.photoPending(reg, kind, r.preview);
      try { act.addPhoto(reg, kind, r.url) } finally { act.photoPending(reg, kind, null) }
    } catch (e: any) { ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo')) }
  };
  const viewShot = (kind: 'after' | 'issue') => {
    const w = W(reg); if (!w) return;
    openPhotoSheet(reg, kind, w.photos.filter(p => p.kind === kind), !['done', 'skipped'].includes(w.status), () => { void shoot(kind) });
  };
  const finish = () => {
    if (act.finish(reg)) {
      const nx = Route.nextReg();
      const n = nx ? carBy(nx) : null;
      openSuccessSheet(car.customer, nx && n ? { reg: nx, model: n.model } : null, goPaisa);
    }
  };
  const nav = navOf(car);
  const nxReg = Route.nextReg();
  const nxCar = nxReg ? carBy(nxReg) : null;

  const main = () => {
    if (!wd) {
      return (
        <View>
          <Empty title={t('Round abhi shuru nahi hua')} text={t('Slide karte hi saare customers ko time chala jayega.')} />
          <View style={{ marginTop: 12 }}>
            <SlideToConfirm gold label={t('Round shuru karo')} resetKey={'sr' + rearm} onDone={() => { if (!act.startRound()) setRearm(n => n + 1) }} />
          </View>
        </View>
      );
    }
    if (['scheduled', 'on_the_way', 'arrived'].includes(st)) {
      return (
        <View>
          {sk ? (
            <View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, backgroundColor: 'rgba(232,56,79,0.1)', borderWidth: 1.5, borderColor: 'rgba(232,56,79,0.35)', marginBottom: 12 }}>
                <Icon name="pause" size={22} color={brand.red} />
                <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 14, color: th.fg }}>
                  <Text style={{ fontFamily: F.black, color: brand.red }}>{t('Customer ne aaj mana kiya hai.')}</Text> {sk.text || t('Kal wash mat karna.')}
                </Text>
              </View>
              <Button variant="ink" label={t('Skip karo · customer ne mana kiya')} onPress={() => act.skip(reg, 'Customer ne mana kiya')} style={{ marginBottom: 10 }} />
            </View>
          ) : null}
          <SlideToConfirm label={t('Wash shuru karo')} resetKey={reg + st} onDone={() => act.startWash(reg)} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <Icon name="pin" size={18} color={th.fg2} />
            <Text style={{ flexShrink: 1, fontFamily: F.semi, fontSize: 14, color: th.fg2 }}>{car.house}{car.spot ? ' · ' + car.spot : ''}{car.keys ? ' · ' + car.keys : ''}</Text>
          </View>
          {nav ? <View style={{ marginTop: 10 }}><Button variant="ghost" icon="pin" label={t('Raasta')} onPress={() => { void Linking.openURL(nav).catch(() => {}) }} /></View> : null}
          <DemoNote>{t(`Pehla kadam. Slide karte hi timer chalega aur ${car.customer} ko "Wash chal raha" dikhega`)}</DemoNote>
        </View>
      );
    }
    if (st === 'washing') {
      return hasAfter ? (
        <View>
          <Button variant="mint" icon="check" label={t('Wash khatam karo')} onPress={finish} />
          <DemoNote>{t('Aakhri kadam. Customer ko photo ke saath chala jayega')}</DemoNote>
        </View>
      ) : (
        <View>
          <Button variant="violet" icon="cam" label={t('Gaadi ki photo lo')} onPress={() => { void shoot('after') }} />
          <DemoNote>{t('Doosra kadam. Photo ke bina wash band nahi hogi')}</DemoNote>
          <View style={{ marginTop: 10, opacity: 0.55 }}><Button variant="ghost" icon="check" label={t('Wash khatam karo')} onPress={() => act.needPhoto()} /></View>
        </View>
      );
    }
    if (st === 'done') {
      const stars = RT[reg] || 0;
      const stat = (v: string, l: string) => (
        <View key={l}><Text style={{ fontFamily: F.black, fontSize: 18, color: '#fff' }}>{v}</Text><Text style={{ fontFamily: F.semi, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{l}</Text></View>
      );
      return (
        <View>
          <View style={{ borderRadius: 28, padding: 20, backgroundColor: '#0f9f72', overflow: 'hidden' }}>
            <Text style={{ fontFamily: F.black, fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>{t('Customer ko bhej diya')}</Text>
            <Text style={{ fontFamily: F.shout, fontSize: 46, lineHeight: 48, textTransform: 'uppercase', color: '#fff', marginTop: 2 }}>{t('Chamak gayi!')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 14 }}>
              {stat(t12(wd.finished_at), t('Khatam'))}
              {stat(`${wd.minutes ?? '–'} min`, t('Time'))}
              {stat(`${wd.water_litres ?? '–'} L`, t('Paani'))}
              {stars ? stat('★'.repeat(stars), t('Rating')) : null}
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            {nxReg && nxCar
              ? <Button variant="gold" iconRight="arrow" label={t(`Agli gaadi: ${nxCar.model}`)} onPress={() => act.setCurrent(nxReg)} />
              : <Button variant="gold" iconRight="arrow" label={t('Aaj ka hisaab dekho')} onPress={goPaisa} />}
          </View>
        </View>
      );
    }
    // skipped
    return (
      <View>
        <View style={{ borderRadius: 28, padding: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: th.dash, backgroundColor: th.tile }}>
          <Eyebrow>{t('Skip kiya')}</Eyebrow>
          <Text style={{ fontFamily: F.black, fontSize: 20, color: th.fg }}>{wd.skip_reason || t('Skip')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: th.fg3, marginTop: 4 }}>{t('Customer ko wajah dikh rahi hai.')}</Text>
          <View style={{ marginTop: 12 }}><Button variant="ghost" icon="redo" label={t('Galti se hua? Wapas kholo')} onPress={() => act.unskip(reg)} /></View>
        </View>
        {nxReg && nxCar ? <View style={{ marginTop: 14 }}><Button variant="gold" iconRight="arrow" label={t(`Agli gaadi: ${nxCar.model}`)} onPress={() => act.setCurrent(nxReg)} /></View> : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <ScreenBar title={`${car.model} · ${car.house}`} back />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Stage reg={reg} st={st} />
        <View style={{ paddingHorizontal: 16 }}>
          <Stepper steps={steps} />

          {reqs.length ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              {reqs.map(q => <ReqCard key={q.id} q={q} customer={car.customer} />)}
            </View>
          ) : null}

          <View style={{ marginTop: 18 }}>{main()}</View>

          <Section title={t('Aaj ke kaam')} meta={`${tdone}/${tasks.length}${can ? '' : t(' · wash shuru hone pe tick karo')}`}>
            <ProgressBar fraction={tasks.length ? tdone / tasks.length : 0} style={{ marginBottom: 12 }} />
            <View style={{ gap: 10 }}>
              {tasks.map(tk => (
                <TaskRow key={tk.key} k={tk.key} done={tk.done} doneAt={tk.done_at} can={can} onPress={() => act.task(reg, tk.key)} />
              ))}
            </View>
          </Section>

          <Section title={t('Photo')} meta={t('Ek photo zaroori hai')}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['after', 'issue'] as const).map(k => (
                <Shot key={k} kind={k} list={photosOf(k)} enabled={!!wd} onTake={() => { void shoot(k) }} onView={() => viewShot(k)} />
              ))}
              <View style={{ flex: 1 }} />
            </View>
          </Section>

          {wd ? (
            <Section>
              <Card onPress={() => openNoteSheet(reg, car.customer, wd.washer_note)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, minHeight: 64, borderRadius: 20 }}>
                <Icon name="note" size={24} color={th.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.black, fontSize: 16, color: th.fg }}>{wd.washer_note ? t('Customer ke liye note') : t('Customer ko kuch batana hai?')}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 14, color: th.fg2 }}>{wd.washer_note ? wd.washer_note : t('Scratch, tyre, kuch bhi. Unke app mein dikhega.')}</Text>
                </View>
              </Card>
            </Section>
          ) : null}

          {wd && !['done', 'skipped'].includes(st)
            ? <View style={{ alignItems: 'center', marginTop: 14 }}><LinkButton label={t('Gaadi nahi dho paye? Skip karo')} onPress={() => openSkipSheet(reg, car.customer)} /></View>
            : null}
        </View>
      </ScrollView>
    </View>
  );
}
