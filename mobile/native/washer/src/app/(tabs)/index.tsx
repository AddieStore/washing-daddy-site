// Round tab: today's round, the next car, the list, and the "No pocha" showcase. Port of renderRound / #s-round.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button, CallButton, CarArt, Card, Chip, DemoNote, Empty, Eyebrow, F, Icon, OnViolet, OnlineSwitch, Plate,
  Pressy, ProgressBar, SlideToConfirm, StatusPill, Tier, XChip, brand, useTheme,
} from '../../ui';
import {
  DAY, Route, S, W, act, carBy, isOnline, me, myPhoto, openReqs, planName, route, useStore, view,
} from '../../state/store';
import { STATUS, navOf, telOf } from '../../lib/data';
import { TASK, tasksFor } from '../../lib/schedule';
import { dayShort, hm12, hourIST, short12, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { TopBar, TopIconBtn } from '../../screens/TopBar';
import { openAddCar } from '../../screens/AddCar';
import { openHelpSheet } from '../../screens/sheets';

const VIOLET_INK = '#2A0478';
const WASHER_IMG = require('../../../assets/img/washer.webp');
const TRUST = require('../../../assets/img/trust.webp');
const POLAS = [
  { src: require('../../../assets/img/slide1.webp'), cap: 'Foam first', sub: 'Loosens the dust before anything touches the paint' },
  { src: require('../../../assets/img/slide2.webp'), cap: 'Right at your gate', sub: 'Washed where it sleeps' },
  { src: require('../../../assets/img/slide3.webp'), cap: 'Two on one Thar', sub: 'Big cars get both hands' },
  { src: require('../../../assets/img/slide4.webp'), cap: 'Even the i8', sub: 'Covered parking is no problem' },
  { src: require('../../../assets/img/slide5.webp'), cap: 'GH-9 every morning', sub: 'Our busiest round' },
  { src: require('../../../assets/img/slide6.webp'), cap: 'Wheels too', sub: 'Pressure inside the rims' },
];
const TICK = ['No more pocha', 'Sirf pressure wash', 'Car wash in 10 min', 'Paschim Vihar', 'Meera Bagh', 'Sundar Vihar'];
// trust.webp is 400 x 470 px; fixed here because Image.resolveAssetSource does not exist on web
const TRUST_RATIO = 400 / 470;

/* gold ticker band that scrolls */
function Ticker() {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const l = Animated.loop(Animated.timing(x, { toValue: -w / 2, duration: 28000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    l.start();
    return () => l.stop();
  }, [w, x]);
  const run = [...TICK, ...TICK];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.ticker}>
      <Animated.View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', alignSelf: 'flex-start', transform: [{ translateX: x }] }}>
        {run.map((tx, i) => (
          <Text key={i} numberOfLines={1} style={s.tickTxt}>{t(tx)}<Text style={{ color: brand.violet }}>{'   ★   '}</Text></Text>
        ))}
      </Animated.View>
    </View>
  );
}

function SecHead({ title, em, meta }: { title: string; em?: string; meta?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 28, lineHeight: 30, textTransform: 'uppercase', color: c.fg, flexShrink: 1 }}>
        {title}{em ? <Text style={{ color: c.em }}> {em}</Text> : null}
      </Text>
      {meta ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{meta}</Text> : null}
    </View>
  );
}

function Hero({ started }: { started: boolean }) {
  const w = me(), cn = Route.counts(), photo = myPhoto();
  const etas = Route.etaList(), rt = route();
  const first = W(rt[0]?.reg)?.eta || etas[0], last = W(rt[rt.length - 1]?.reg)?.eta || etas[etas.length - 1];
  const left = cn.total - cn.done - cn.skipped;
  const src = photo?.url ? { uri: photo.url } : w.img ? WASHER_IMG : null;
  const frac = cn.total ? (started ? (cn.done + cn.skipped) / cn.total : 0.04) : 0;
  const sub = !started ? t(`Pehli ${hm12(first)} · aakhri ~${hm12(last)}`)
    : left ? t(`${left} baaki · ${cn.skipped ? cn.skipped + ' skip · ' : ''}aakhri ~${hm12(last)}`)
    : t('Round poora! Shabash.');
  return (
    <OnViolet>
      <View style={s.hero}>
        <Text pointerEvents="none" numberOfLines={1} style={s.heroGhost}>PRESSURE WASH · NO POCHA</Text>
        <View pointerEvents="none" style={s.stripe} />
        {src
          ? <Image source={src} style={s.man} resizeMode="cover" accessibilityElementsHidden />
          : <View style={s.manIni}><Text style={{ fontFamily: F.hero, fontSize: 80, color: brand.gold }}>{(w.name[0] || '').toUpperCase()}</Text></View>}
        <View style={{ maxWidth: '62%' }}>
          <Chip>{dayShort(DAY, isHindi())} · {w.areas.split(' · ')[0]}</Chip>
          <Text style={s.count}>
            {started ? cn.done : cn.total}
            <Text style={s.countSmall}>{started ? `/${cn.total}` : ` ${t('gaadi')}`}</Text>
          </Text>
          <Text style={s.heroSub}>{sub}</Text>
          <ProgressBar fraction={frac} color="gold" height={12} style={{ marginTop: 18 }} />
        </View>
      </View>
    </OnViolet>
  );
}

function PrimaryAction({ started }: { started: boolean }) {
  const [key, setKey] = useState(0);
  const total = route().length;
  if (!total) return <DemoNote>{view.bookState === 'loading' ? t('Aaj ki list aa rahi hai…') : t('Aaj aapke naam koi gaadi nahi hai. Ravi se baat karo.')}</DemoNote>;
  if (started) return null;
  return (
    <View>
      <SlideToConfirm gold label={t('Round shuru karo')} resetKey={key} onDone={() => { if (!act.startRound()) setKey((k) => k + 1); }} />
      <DemoNote>{t('Shuru karte hi har customer ko aapka naam aur time dikh jayega.')}</DemoNote>
    </View>
  );
}

function XChips({ reg, plan, small }: { reg: string; plan: string; small?: boolean }) {
  const ks = tasksFor(reg, plan, DAY).filter((k) => k !== 'pressure' && k !== 'dry');
  if (!ks.length) return null;
  return (
    <>
      {ks.map((k) => <XChip key={k} kind={k} small={small} label={t(TASK[k].hi)} />)}
    </>
  );
}

function NextUp({ started }: { started: boolean }) {
  const { c, dark } = useTheme();
  const cn = Route.counts();
  const nr = Route.liveReg() || Route.nextReg();
  if (started && nr) {
    const car = carBy(nr)!, wd = W(nr)!, q = openReqs(nr).length, nav = navOf(car), tel = telOf(car.phone);
    return (
      <View style={[s.next, { backgroundColor: c.tile, borderColor: dark ? brand.gold : brand.violet }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Eyebrow style={{ flexShrink: 1, color: c.em }}>{t(wd.status === 'scheduled' ? 'Agli gaadi' : 'Abhi chal raha')} · {hm12(wd.eta)}</Eyebrow>
          <StatusPill status={wd.status} label={t(STATUS[wd.status])} />
        </View>
        <View style={{ height: 120, alignItems: 'center', justifyContent: 'flex-end', marginTop: 6, marginBottom: 4 }}>
          <CarArt car={car} width={300} height={116} />
        </View>
        <Text style={{ fontFamily: F.hero, fontSize: 28, lineHeight: 32, color: c.fg }}>{car.model}</Text>
        <View style={s.wrap6}>
          <Plate reg={car.plate} />
          <Tier label={planName(car)} />
          <XChips reg={car.reg} plan={car.plan} />
        </View>
        <View style={s.where}>
          <View style={{ marginTop: 2 }}><Icon name="pin" size={18} color={brand.orange} /></View>
          <Text style={[s.whereTxt, { color: c.fg2 }]}>{car.house} · {car.spot}</Text>
        </View>
        {nav || tel ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 }}>
            {nav ? <Button variant="ghost" label={t('Raasta')} icon="pin" style={{ flex: 1 }} onPress={() => { void Linking.openURL(nav).catch(() => {}); }} /> : null}
            {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
          </View>
        ) : null}
        {q ? (
          <View style={s.where}>
            <View style={{ marginTop: 2 }}><Icon name="note" size={18} color={brand.orange} /></View>
            <Text style={[s.whereTxt, { color: brand.orange }]}>{t(`${q} customer request${q > 1 ? 's' : ''}`)}</Text>
          </View>
        ) : null}
        <Button variant="violet" label={t(wd.status === 'scheduled' ? 'Chalo' : 'Kholo')} iconRight="arrow" style={{ marginTop: 14 }}
          onPress={() => { act.setCurrent(nr); router.push('/job'); }} />
      </View>
    );
  }
  if (started) return <Empty title={t('Aaj ka round poora 🎉')} text={t(`${cn.done} gaadi chamka di. Hisaab tab mein poora din dekho.`)} />;
  return null;
}

function Stop({ reg, i }: { reg: string; i: number }) {
  const { c } = useTheme();
  const car = carBy(reg)!, wd = W(reg), st = wd ? wd.status : 'scheduled';
  const live = ['on_the_way', 'arrived', 'washing'].includes(st), q = openReqs(reg).length;
  const etas = Route.etaList();
  const eta = st === 'done' && wd?.finished_at ? short12(t12(wd.finished_at)) : short12(hm12(wd ? wd.eta : etas[i]));
  const sq = st === 'done' ? brand.mint : st === 'skipped' ? c.fg3 : live ? brand.violet : c.tile2;
  return (
    <Pressy onPress={() => { act.setCurrent(reg); router.push('/job'); }} scaleTo={0.97} accessibilityLabel={car.model}
      style={[s.stop, { backgroundColor: c.tile, borderColor: c.line, opacity: st === 'done' || st === 'skipped' ? 0.78 : 1 }]}>
      <View style={[s.sq, { backgroundColor: sq }]}>
        <Text style={{ fontFamily: F.black, fontSize: 14, color: st === 'done' || live ? '#fff' : st === 'skipped' ? c.bg : c.fg }}>{st === 'done' ? '✓' : st === 'skipped' ? '–' : i + 1}</Text>
      </View>
      <View style={{ width: 76, height: 48, alignItems: 'center', justifyContent: 'center' }}><CarArt car={car} width={76} height={48} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 16, color: c.fg, flexShrink: 1 }}>{car.model}</Text>
          {q ? <View style={s.reqdot}><Text style={s.reqTxt}>{q}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3 }}>{car.house} · {car.plate}</Text>
        <View style={[s.wrap6, { marginTop: 4, gap: 4 }]}><XChips reg={car.reg} plan={car.plan} small /></View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg }}>{eta}</Text>
        <StatusPill status={st} label={t(wd ? STATUS[wd.status] : 'Baaki')} />
      </View>
    </Pressy>
  );
}

function RouteList() {
  const rt = route(), cn = Route.counts(), w = me();
  return (
    <View style={{ marginTop: 26 }}>
      <SecHead title={t('Aaj ka round')} meta={cn.total ? `${cn.total} ${t('gaadi')} · ${w.areas.split(' · ')[0]}` : undefined} />
      <View style={{ gap: 10 }}>
        {!cn.total
          ? (view.bookState === 'loading'
            ? <Empty title={t('List aa rahi hai…')} text={t('Book se aaj ka round padha ja raha hai.')} />
            : <Empty title={t('Koi gaadi nahi')} text={t('Book mein aaj aapke naam koi active gaadi nahi hai.')} />)
          : rt.map((car, i) => <Stop key={car.reg} reg={car.reg} i={i} />)}
      </View>
      <Button variant="ghost" label={t('+ Nayi gaadi add karo')} onPress={openAddCar} style={{ marginTop: 12 }} />
      <DemoNote>{t('Naya customer mila? Gaadi yahan add karo, aaj se dhona shuru. Ravi manzoori denge.')}</DemoNote>
    </View>
  );
}

function Showcase() {
  const tr = TRUST_RATIO;
  return (
    <OnViolet>
      <View style={s.work}>
        <Text accessibilityRole="header" style={s.workH}>{t('No pocha.')}<Text style={{ color: brand.gold }}> {t('Sirf pressure wash.')}</Text></Text>
        <Text style={s.workSub}>{t('Foam pehle, phir pressure rinse, phir saaf kapde se sukhao. Gaadi apni jagah se nahi hilti.')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14, gap: 16 }}>
          {POLAS.map((p, i) => (
            <View key={i} style={[s.pola, { transform: [{ rotate: i % 2 ? '1.6deg' : '-2deg' }] }]}>
              <Image source={p.src} style={s.polaImg} resizeMode="cover" accessibilityLabel={p.cap} />
              <View style={{ paddingHorizontal: 3, paddingTop: 8, paddingBottom: 10 }}>
                <Text style={s.polaCap}>{t(p.cap)}</Text>
                <Text style={s.polaSub}>{t(p.sub)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[s.trust, { aspectRatio: tr }]}>
          <Image source={TRUST} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Don't trust the guy with pocha on your car!" />
        </View>
      </View>
    </OnViolet>
  );
}

export default function RoundScreen() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const w = me(), started = !!S.day?.started, on = isOnline();
  const h = hourIST();
  const hi = t(h < 12 ? 'Subah bakhair' : h < 17 ? 'Namaste' : 'Shaam ho gayi');
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 128 + insets.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.violetTop}>
          <TopBar
            border={false}
            top={<Ticker />}
            left="logo"
            right={<>
              <TopIconBtn icon="help" label={t('Madad / SOS')} onPress={openHelpSheet} />
              <TopIconBtn icon="plus" label={t('Nayi gaadi add karo')} onPress={openAddCar} />
            </>}
          />
          <Text accessibilityRole="header" style={s.hello}>
            <Text style={s.helloSmall}>{hi}{'\n'}</Text>
            {w.name.split(' ')[0]}, <Text style={s.helloEm}>{t('aaj ka round!')}</Text>
          </Text>
          <Hero started={started} />
        </View>
        <View style={s.pad}>
          <Card style={{ marginTop: 16 }}>
            <OnlineSwitch value={on} onChange={() => act.toggleOnline()}
              title={t(on ? 'Aap online ho' : 'Aap offline ho')}
              subtitle={t(on ? 'Naye extra kaam aapko dikhenge' : 'Naye extra kaam nahi aayenge. Round chalta rahega')} />
          </Card>
          <View style={{ marginTop: 12 }}><PrimaryAction started={started} /></View>
          <View style={{ marginTop: 26 }}><NextUp started={started} /></View>
          <RouteList />
        </View>
        <Showcase />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  violetTop: { backgroundColor: brand.violet, borderBottomWidth: 4, borderBottomColor: brand.gold, paddingBottom: 26 },
  ticker: { backgroundColor: brand.gold, borderBottomWidth: 3, borderBottomColor: brand.ink, overflow: 'hidden' },
  tickTxt: { fontFamily: F.shout, fontSize: 15, letterSpacing: 0.9, textTransform: 'uppercase', color: brand.ink, paddingVertical: 7 },
  pad: { paddingHorizontal: 16 },
  hello: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 18, fontFamily: F.shout, fontSize: 54, lineHeight: 50, textTransform: 'uppercase', color: brand.cream },
  helloSmall: { fontFamily: F.black, fontSize: 17, lineHeight: 24, textTransform: 'none', color: brand.cream },
  helloEm: { color: brand.gold, textShadowColor: brand.ink, textShadowOffset: { width: 5, height: 5 }, textShadowRadius: 0 },
  hero: {
    marginHorizontal: 16, borderRadius: 28, borderWidth: 4, borderColor: brand.gold, backgroundColor: brand.violet2, overflow: 'hidden',
    paddingTop: 20, paddingHorizontal: 18, paddingBottom: 18, minHeight: 250,
    shadowColor: VIOLET_INK, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 },
  },
  heroGhost: { position: 'absolute', top: 18, left: 0, fontFamily: F.shout, fontSize: 120, lineHeight: 130, color: 'rgba(255,246,233,0.07)', width: 2000 },
  stripe: { position: 'absolute', left: -30, right: -30, bottom: 46, height: 14, backgroundColor: brand.gold, opacity: 0.95, transform: [{ rotate: '-3deg' }] },
  man: { position: 'absolute', right: -6, bottom: 0, width: 168, height: 200 },
  manIni: { position: 'absolute', right: 6, bottom: 20, width: 150, height: 170, borderRadius: 85, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  count: { fontFamily: F.shout, fontSize: 84, lineHeight: 84, textTransform: 'uppercase', color: brand.cream, marginTop: 6, textShadowColor: brand.ink, textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 },
  countSmall: { fontSize: 34, color: brand.gold },
  heroSub: { fontFamily: F.semi, fontSize: 14, color: 'rgba(255,246,233,0.84)', marginTop: 8 },
  next: { borderRadius: 24, borderWidth: 2, padding: 16, overflow: 'hidden' },
  wrap6: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  where: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  whereTxt: { flex: 1, fontFamily: F.semi, fontSize: 14 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 10, paddingRight: 12, borderRadius: 22, borderWidth: 1, minHeight: 84 },
  sq: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reqdot: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' },
  reqTxt: { fontFamily: F.black, fontSize: 11.5, color: '#fff' },
  work: { marginTop: 34, paddingTop: 34, paddingBottom: 40, backgroundColor: brand.violet, borderTopWidth: 4, borderTopColor: brand.gold },
  workH: { fontFamily: F.shout, fontSize: 40, lineHeight: 40, textTransform: 'uppercase', textAlign: 'center', color: brand.cream, paddingHorizontal: 16 },
  workSub: { fontFamily: F.body, fontSize: 15, color: brand.cream, opacity: 0.92, textAlign: 'center', alignSelf: 'center', maxWidth: 300, marginTop: 10 },
  pola: { width: 190, backgroundColor: brand.cream, paddingTop: 8, paddingHorizontal: 8, borderRadius: 16, borderWidth: 3, borderColor: brand.ink, shadowColor: VIOLET_INK, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 } },
  polaImg: { width: '100%', aspectRatio: 4 / 5, borderRadius: 9 },
  polaCap: { fontFamily: F.shout, fontSize: 18, lineHeight: 19, textTransform: 'uppercase', color: brand.ink },
  polaSub: { fontFamily: F.semi, fontSize: 12, color: '#3B2C55', marginTop: 3 },
  trust: { marginHorizontal: 16, marginTop: 30, borderWidth: 4, borderColor: brand.gold, borderRadius: 28, overflow: 'hidden', backgroundColor: '#5309DE', shadowColor: VIOLET_INK, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 } },
});
