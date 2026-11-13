// The car screen: pushed from the round. Stage, stepper, requests, the one main action, tasks, photos, note, skip.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Linking, StyleSheet, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { DotBg, F, Footer, Icon, PullToRefresh, R, brand, cardBox, cardShadow, ui, useTheme } from '../ui';
import { DashCard, IconBubble } from '../ui/dash';
import { CarPic } from '../screens/CarPhoto';
import { Pressy, Button, CallButton, CarArt, DemoNote, Empty, Eyebrow, LinkButton, Plate, ProgressBar, SlideToConfirm, Stepper, Tier } from '../ui';
import type { StepItem } from '../ui';
import { Route, RT, W, act, photoSrc, carBy, ensureDay, openReqs, planName, route, skipAsk, S, useStore, DAY, view, MIN_PHOTOS, photoNeeds } from '../state/store';
import { STATUS, navOf, telOf } from '../lib/data';
import type { Photo } from '../lib/data';
import { SPOTS, isSundayIST } from '../lib/washGuide';
import { tasksFor, TASK } from '../lib/schedule';
import { t } from '../lib/i18n';
import { hm12, t12 } from '../lib/time';
import { takePhoto } from '../lib/photo';
import { WashGuide } from '../screens/WashGuide';
import { myPhotoSource, myTrust } from '../screens/TrustData';
import { VerifiedStrip } from '../ui/trust';
import { me } from '../state/store';
import { ScreenBar, ReqCard, Shot, TaskRow, WashTimer, InteriorButton, ExtrasRow, openNoteSheet, openPhotoSheet, openSkipSheet, openSuccessSheet, type ShotItem } from '../screens/JobParts';

const ORDER = ['scheduled', 'on_the_way', 'arrived', 'washing', 'done'];
const STEPS: [string, string, StepItem['icon'], string][] = [
  ['on_the_way', 'Nikla', 'walk', 'on_the_way_at'],
  ['arrived', 'Pahuncha', 'flag', 'arrived_at'],
  ['washing', 'Wash', 'drop', 'started_at'],
  ['done', 'Ho gaya', 'check', 'finished_at'],
];

/* ---------- the hero card ---------- */
function HChip({ icon, children }: { icon?: React.ComponentProps<typeof Icon>['name']; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.soft }}>
      {icon ? <Icon name={icon} size={14} color={c.heroInk} /> : null}
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12.5, color: c.heroInk }}>{children}</Text>
    </View>
  );
}

function SecHead({ title, meta }: { title: string; meta?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 24, marginBottom: 12 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 17, lineHeight: 24, color: c.fg }}>{title}</Text>
      {meta ? <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 20, color: c.fg3 }}>{meta}</Text> : null}
    </View>
  );
}

function Stage({ reg, st }: { reg: string; st: string }) {
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const c0 = carBy(reg)!, wd = W(reg);
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
  const carW = Math.min(width - 80, 360);
  const tel = telOf(c0.phone);
  const chipA = `${t(STATUS[st as keyof typeof STATUS])}${wd && st === 'scheduled' ? ' · ' + hm12(wd.eta) : ''}`;
  const idx = route().findIndex(x => x.reg === reg) + 1;
  const fmt = (h: string) => h.replace(/^0/, '');
  const slotTxt = wd && wd.slot_from && wd.slot_to ? `${t('Slot')} ${fmt(wd.slot_from)} – ${fmt(wd.slot_to)}` : null;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 4, borderRadius: R.card, backgroundColor: c.hero, borderWidth: 1, borderColor: c.line, padding: 16, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <HChip>{chipA}</HChip>
        <HChip>{`${idx} / ${route().length}`}</HChip>
      </View>
      <View style={{ marginTop: 14, marginBottom: 6 }}>
      <CarPic reg={reg} h={Math.round(carW * 0.42)} size={36} radius={16}>
      <View pointerEvents="none" style={{ alignItems: 'center' }}>
        <Animated.View style={{ transform: [
          { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-1.5, 1.5] }) },
        ] }}>
          <CarArt car={c0} width={carW} />
        </Animated.View>
      </View>
      </CarPic>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 29, lineHeight: 40, color: c.heroInk }}>{c0.model}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: c.fg3 }}>{c0.customer}</Text>
        </View>
        {washing && wd?.started_at ? <WashTimer startedAt={wd.started_at} interiorFrom={wd.interior_from} extraMinutes={wd.extra_minutes || 0} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Plate reg={c0.plate} />
        {slotTxt ? <HChip icon="flag">{slotTxt}</HChip> : null}
        <Tier label={planName(c0)} />
        {tel && c0.phone ? <CallButton phone={c0.phone} small label={t('Call')} /> : null}
      </View>
    </View>
  );
}

/* ---------- who the customer sees ---------- */
function PartnerStrip() {
  const w = me(), tr = myTrust();
  return (
    <VerifiedStrip
      style={{ marginHorizontal: 16, marginTop: 12 }}
      title={t(tr.verified ? 'Verified WD partner' : 'WD partner')}
      name={w.name}
      source={myPhotoSource()}
      verified={tr.verified}
      badge={t(tr.verified ? 'WD Verified' : 'Verification baaki')}
      rating={w.rating}
      ratingLabel={t('Rating')}
      cars={(w.lifetime + Route.counts().done).toLocaleString('en-IN')}
      carsLabel={t('gaadi dhoyi')}
    />
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
  const [spotPend, setSpotPend] = useState<Record<string, string>>({});

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
      <DotBg />
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
        <View style={{ flex: 1 }} />
        <Footer />
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
    ((wd ? wd.photos : []) as ShotItem[]).filter(p => p.kind === kind && !p.spot).concat(pend.filter(p => p.kind === kind).map(p => ({ kind: p.kind, at: '', display: p.display, pending: true } as ShotItem)));
  const need = wd ? photoNeeds(wd) : null;
  const afterN = need ? need.car : 0;
  const photosOk = !!need && need.ok;
  const late = !!wd && Route.isLate(reg);
  const sunday = !!wd && isSundayIST(wd.started_at) && (st === 'washing' || st === 'done');

  const shoot = async (kind: Photo['kind'], spot?: string) => {
    if (!W(reg)) { ui.toast(t('Pehle round shuru karo')); return }
    ui.flash();
    try {
      const r = await takePhoto();
      if (!r) return;
      if (spot) setSpotPend(m => ({ ...m, [spot]: r.preview }));
      else act.photoPending(reg, kind, r.preview);
      try { act.addPhoto(reg, kind, r.url, spot) } finally {
        if (spot) setSpotPend(m => { const n = { ...m }; delete n[spot]; return n });
        else act.photoPending(reg, kind, null);
      }
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
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: R.card, backgroundColor: 'rgba(232,56,79,0.1)', marginBottom: 12 }}>
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
    // washing: the finish button sits below the tasks and photos (see finishBlock)
    if (st === 'washing') return null;
    if (st === 'done') {
      const stars = RT[reg] || 0;
      const stat = (v: string, l: string) => (
        <View key={l}><Text style={{ fontFamily: F.black, fontSize: 18, color: '#fff' }}>{v}</Text><Text style={{ fontFamily: F.semi, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{l}</Text></View>
      );
      return (
        <View>
          <View style={{ borderRadius: R.card, padding: 20, backgroundColor: '#0f9f72', overflow: 'hidden' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>{t('Customer ko bhej diya')}</Text>
            <Text style={{ fontFamily: F.black, fontSize: 32, lineHeight: 38, color: '#fff', marginTop: 2 }}>{t('Chamak gayi!')}</Text>
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
        <View style={{ ...cardBox(th), padding: 16, ...cardShadow(th) }}>
          <Eyebrow>{t('Skip kiya')}</Eyebrow>
          <Text style={{ fontFamily: F.bold, fontSize: 20, color: th.fg }}>{wd.skip_reason || t('Skip')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: th.fg3, marginTop: 4 }}>{t('Customer ko wajah dikh rahi hai.')}</Text>
          <View style={{ marginTop: 12 }}><Button variant="ghost" icon="redo" label={t('Galti se hua? Wapas kholo')} onPress={() => act.unskip(reg)} /></View>
        </View>
        {nxReg && nxCar ? <View style={{ marginTop: 14 }}><Button variant="gold" iconRight="arrow" label={t(`Agli gaadi: ${nxCar.model}`)} onPress={() => act.setCurrent(nxReg)} /></View> : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <DotBg />
      <ScreenBar title={`${car.model} · ${car.house}`} back />
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <Stage reg={reg} st={st} />
        <PartnerStrip />
        <View style={{ paddingHorizontal: 16 }}>
          <DashCard style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 6 }}><Stepper steps={steps} /></DashCard>

          {reqs.length ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              {reqs.map(q => <ReqCard key={q.id} q={q} customer={car.customer} />)}
            </View>
          ) : null}

          {late ? (
            <View accessibilityRole="alert" style={{ marginTop: 18, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: R.card, backgroundColor: 'rgba(232,56,79,0.12)' }}>
              <IconBubble icon="warn" size={40} tint={brand.red} bg="rgba(232,56,79,0.16)" />
              <Text style={{ flex: 1, fontFamily: F.black, fontSize: 15, color: brand.red }}>{t('Late · slot khatam ho gaya')}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 18 }}>{main()}</View>

          {wd && st === 'done' && wd.addons && wd.addons.length ? <ExtrasRow addons={wd.addons} /> : null}

          <SecHead title={t('Aaj ke kaam')} meta={`${tdone}/${tasks.length}${can ? '' : t(' · wash shuru hone pe tick karo')}`} />
          <ProgressBar fraction={tasks.length ? tdone / tasks.length : 0} style={{ marginBottom: 12 }} />
          <View style={{ gap: 12 }}>
            {tasks.map(tk => (
              <TaskRow key={tk.key} k={tk.key} done={tk.done} doneAt={tk.done_at} can={can} onPress={() => act.task(reg, tk.key)} />
            ))}
          </View>

          {st === 'washing' && wd?.started_at ? <WashGuide startedAt={wd.started_at} interiorFrom={wd.interior_from} onTakePhoto={() => { void shoot('after') }} /> : null}

          {st === 'washing' && wd?.started_at && !isSundayIST(wd.started_at)
            ? (wd.interior ? <ExtrasRow addons={wd.addons || []} compact /> : <InteriorButton reg={reg} />)
            : null}

          <SecHead title={t('Photo')} meta={t(`Gaadi ki kam se kam ${MIN_PHOTOS} photo zaroori`)} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['after', 'issue'] as const).map(k => (
              <Shot key={k} kind={k} list={photosOf(k)} enabled={!!wd} onTake={() => { void shoot(k) }} onView={() => viewShot(k)} />
            ))}
          </View>

          {sunday && wd ? (
            <>
              <SecHead title={t('Andar ki photo')} meta={`${SPOTS.filter(sp => wd.photos.some(p => p.spot === sp.key)).length}/${SPOTS.length}`} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                {SPOTS.map(sp => {
                  const got = wd.photos.filter(p => p.spot === sp.key).slice(-1)[0];
                  const pendSrc = spotPend[sp.key];
                  const src = pendSrc || (got ? photoSrc(got) : undefined);
                  return (
                    <View key={sp.key} style={{ width: '48.5%' }}>
                      <Pressy onPress={pendSrc || st !== 'washing' ? undefined : () => { void shoot('after', sp.key) }} accessibilityLabel={t(sp.label)} scaleTo={0.94}
                        style={{ width: '100%', aspectRatio: 1, borderRadius: R.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4,
                          ...(src ? { backgroundColor: th.tile2 } : { backgroundColor: th.soft }) }}>
                        {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Icon name="cam" size={30} color={th.softInk} />}
                        {pendSrc ? (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,20,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
                            <ActivityIndicator color="#fff" size="large" />
                          </View>
                        ) : null}
                        {got && !pendSrc ? (
                          <View style={{ position: 'absolute', right: 8, top: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: brand.mint, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="check" size={16} color="#fff" />
                          </View>
                        ) : null}
                        {src ? (
                          <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row' }}>
                            <View style={{ flexShrink: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                              <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 10.5, letterSpacing: 0.8, color: '#fff', textTransform: 'uppercase' }}>{t(sp.label)}</Text>
                            </View>
                          </View>
                        ) : <Text numberOfLines={2} style={{ fontFamily: F.black, fontSize: 13, color: th.softInk, textAlign: 'center', paddingHorizontal: 6 }}>{t(sp.label)}</Text>}
                      </Pressy>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {wd && st === 'washing' ? (
            <View style={{ marginTop: 18 }}>
              {photosOk
                ? <Button variant="mint" icon="check" label={t('Wash khatam karo')} onPress={finish} />
                : <View style={{ opacity: 0.55 }}><Button variant="ghost" icon="check" label={t('Wash khatam karo')} onPress={() => act.needPhoto(reg)} /></View>}
              <DemoNote>{photosOk ? t('Aakhri kadam. Customer ko photo ke saath chala jayega') : need && need.sunday
                ? t(`Gaadi ki ${Math.max(0, MIN_PHOTOS - afterN)} photo aur andar ki ${need.missing.length} photo baaki hain, phir wash band hogi`)
                : t(`Gaadi ki ${MIN_PHOTOS} photo lo (${Math.min(afterN, MIN_PHOTOS)}/${MIN_PHOTOS}), phir wash band hogi`)}</DemoNote>
            </View>
          ) : null}

          {wd ? (
            <View style={{ marginTop: 22 }}>
              <DashCard onPress={() => openNoteSheet(reg, car.customer, wd.washer_note)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 11, minHeight: 64 }}>
                <IconBubble icon="note" size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 15, color: th.fg }}>{wd.washer_note ? t('Customer ke liye note') : t('Customer ko kuch batana hai?')}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12.5, color: th.fg3 }}>{wd.washer_note ? wd.washer_note : t('Scratch, tyre, kuch bhi. Unke app mein dikhega.')}</Text>
                </View>
              </DashCard>
            </View>
          ) : null}

          {wd && !['done', 'skipped'].includes(st)
            ? <View style={{ alignItems: 'center', marginTop: 14 }}><LinkButton label={t('Gaadi nahi dho paye? Skip karo')} onPress={() => openSkipSheet(reg, car.customer)} /></View>
            : null}
        </View>
        <Footer />
      </PullToRefresh>
    </View>
  );
}
