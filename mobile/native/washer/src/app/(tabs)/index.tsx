// Round tab (v22 look): lavender hero band with the scooter art (progress = cars done / total), a white content sheet that overlaps it by 24px
// (duty + today's summary, next car, all cars, date strip, rewards, new customer), and the "Round shuru karo" slide as a fixed bar above the tab bar.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PullToRefresh, Button, CallButton, CarArt, Chip, F, Group, HeaderIconButton, Icon, Plate, Pressy, Row, SectionLabel, SlideToConfirm, ui, useTheme, WeekStrip,
} from '../../ui';
import { RoundHeroArt, DoneArt, EmptyArt } from '../../ui/art';
import { cardShadow } from '../../ui/theme';
import { DAY, Money, Route, S, W, act, carBy, isOnline, me, openReqs, planName, route, useStore, view } from '../../state/store';
import { STATUS, navOf, telOf } from '../../lib/data';
import { TASK, tasksFor } from '../../lib/schedule';
import { dayShort, hm12, hourIST, rupee, short12, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { SyncChipLive } from '../../screens/TopBar';
import { openLocationSettings, useLocality } from '../../lib/geo';
import { FadeUp, TNUM } from '../../screens/DayParts';
import { openAddCar } from '../../screens/AddCar';
import { openHelpSheet } from '../../screens/sheets';
import { CheckInCard } from '../../screens/RoundTimeline';
import { CheckOutCard } from '../../screens/CheckOutCard';
import { openRewards, useOutlook } from '../../screens/RewardsCards';
import { EARLY_DAYS } from '../../lib/rewards';
import { useDayMarks } from '../../lib/history';
import { dayStripDays } from '../../lib/strip';
import { CarPic } from '../../screens/CarPhoto';

const ART = 168;                  // the art sits at the bottom of the band, greeting + chips above it
const BAND = 230;                 // visible hero height under the status bar
const OVERLAP = 24;               // the white sheet covers the bottom of the band by this much
const SKY = '#E3D8FF';            // top colour of the art's sky (so the status-bar strip is seamless)
const WASH: Record<string, 'violet' | 'green' | 'grey' | 'amber'> = { scheduled: 'grey', on_the_way: 'violet', arrived: 'violet', washing: 'violet', done: 'green', skipped: 'amber' };

/* ---------- hero band ---------- */
function PlaceChip() {
  const g = useLocality();
  if (g.status === 'error') return null;
  const chip = (txt: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)', maxWidth: 150 }}>
      <Icon name="pin" size={13} color="#5409DA" />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: '#141414', flexShrink: 1 }}>{txt}</Text>
    </View>
  );
  if (g.status === 'denied') {
    return <Pressy onPress={openLocationSettings} accessibilityLabel={t('Location chalu karo')} scaleTo={0.96} hitSlop={8}>{chip(t('Location chalu karo'))}</Pressy>;
  }
  const txt = g.text || (g.status === 'loading' || g.status === 'idle' ? t('Location…') : t('Location'));
  return <View accessibilityLabel={txt}>{chip(txt)}</View>;
}

function ProgressChip({ done, total }: { done: number; total: number }) {
  return (
    <View accessibilityLabel={`${done} / ${total}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#5409DA' }}>
      <Icon name="check" size={13} color="#fff" />
      <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: '#fff', ...TNUM }}>{done}/{total} {t('Gaadi')}</Text>
    </View>
  );
}

function HeroBand({ top, width, greeting, name }: { top: number; width: number; greeting: string; name: string }) {
  useStore();
  const { c, dark } = useTheme();
  const cn = Route.counts(), started = !!S.day?.started;
  const finished = started && cn.total > 0 && cn.done + cn.skipped >= cn.total;
  const progress = cn.total ? (cn.done + cn.skipped) / cn.total : 0;
  return (
    <View style={{ backgroundColor: dark ? '#1E1633' : SKY }}>
      <View style={{ height: top }} />
      <View style={{ height: BAND }}>
        <View style={{ position: 'absolute', left: 0, bottom: 0 }}><RoundHeroArt width={width} height={ART} progress={progress} done={finished} /></View>
        <View style={{ position: 'absolute', left: 16, right: 16, top: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.6, color: dark ? '#F4F4F5' : '#141414' }}>{greeting}, {name}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <HeaderIconButton icon="calendar" label={t('Round badlo')} onPress={() => router.push('/round-setup')} />
              <HeaderIconButton icon="bell" label={t('Madad / SOS')} onPress={openHelpSheet} />
              <HeaderIconButton icon="plus" label={t('Nayi gaadi add karo')} onPress={openAddCar} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <PlaceChip />
            {cn.total ? <ProgressChip done={cn.done} total={cn.total} /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------- duty switch (a switch inside a row) ---------- */
function DutySwitch() {
  const { c } = useTheme();
  const on = isOnline();
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(a, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start() }, [on, a]);
  return (
    <Pressable onPress={() => { ui.haptic(10); act.toggleOnline(); }} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={t(on ? 'Duty ON' : 'Duty OFF')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [c.line, c.primary] }) }}>
        <Animated.View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }} />
      </Animated.View>
    </Pressable>
  );
}

/* ---------- today summary: ONE group ---------- */
function Summary({ started }: { started: boolean }) {
  useStore();
  const { c } = useTheme();
  const on = isOnline();
  const cn = Route.counts();
  const etas = Route.etaList(), rt = route();
  const first = W(rt[0]?.reg)?.eta || etas[0], last = W(rt[rt.length - 1]?.reg)?.eta || etas[etas.length - 1];
  const left = cn.total - cn.done - cn.skipped;
  const cars = !cn.total ? '0' : started ? `${cn.done}/${cn.total}${left ? '' : ' ✓'}` : `${cn.total}`;
  return (
    <>
      <SectionLabel style={{ marginTop: 0 }}>{t('Aaj ka round')} · {dayShort(DAY, isHindi())}</SectionLabel>
      <Group>
        <Row icon="sun" label={t(on ? 'Duty ON' : 'Duty OFF')} sub={t(on ? 'Customers ko dikh rahe ho' : 'Abhi duty band hai')} right={<DutySwitch />} />
        <Row icon="car" label={t('Gaadi')} value={cars} onPress={() => router.push('/today')} />
        <Row icon="gift" label={t('Aaj ki kamai')} value={rupee(Money.today())} onPress={() => router.push('/paisa' as any)} />
        {cn.total ? <Row icon="clock" label={t(started ? 'Pehli shuruat' : 'Pehli gaadi')} value={first ? short12(hm12(first)) : '–'} /> : null}
        {cn.total ? <Row icon="flag" label={t('Aakhri khatam')} value={last ? `~${short12(hm12(last))}` : '–'} /> : null}
      </Group>
    </>
  );
}

/* ---------- next car: highlighted card with an ETA chip ---------- */
function XChips({ reg, plan }: { reg: string; plan: string }) {
  const ks = tasksFor(reg, plan, DAY).filter((k) => k !== 'pressure' && k !== 'dry');
  if (!ks.length) return null;
  return <>{ks.map((k) => <Chip key={k} tone="blue">{t(TASK[k].hi)}</Chip>)}</>;
}

function NextCar({ started }: { started: boolean }) {
  const { c, dark } = useTheme();
  const rt = route();
  const nr = started ? (Route.liveReg() || Route.nextReg()) : rt[0]?.reg;
  if (!nr) return null;
  const car = carBy(nr), wd = W(nr);
  if (!car) return null;
  const q = openReqs(nr).length, nav = navOf(car), tel = telOf(car.phone);
  const e0 = wd?.eta || Route.etaList()[Math.max(0, rt.findIndex((x) => x.reg === nr))];
  const eta = e0 ? short12(hm12(e0)) : '';
  const label = !started ? t('Pehli gaadi') : t(wd?.status === 'scheduled' ? 'Agli gaadi' : 'Abhi chal raha');
  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ borderRadius: 16, padding: 14, backgroundColor: dark ? 'rgba(139,92,246,0.14)' : '#F3EEFF', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: dark ? 'rgba(139,92,246,0.3)' : '#E3D8FF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 18, color: c.primary }}>{label}</Text>
          {eta ? <Chip tone="dark" icon="clock">{eta}</Chip> : null}
        </View>
        <Pressy onPress={() => { act.setCurrent(nr); router.push('/job'); }} accessibilityLabel={`${car.plate} ${car.model}`} scaleTo={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <CarPic reg={nr} w={84} h={60} size={26} radius={14}><CarArt car={car} width={84} height={36} /></CarPic>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: c.fg }}>{car.model}</Text>
            <Plate reg={car.plate} />
            <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey }}>{car.house} · {car.spot}</Text>
          </View>
          <Icon name="chevron" size={18} color={c.grey} />
        </Pressy>
        {started || q ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <Chip tone="grey">{planName(car)}</Chip>
            <XChips reg={nr} plan={car.plan} />
            {q ? <Chip tone="amber" icon="note">{t(`${q} customer request${q > 1 ? 's' : ''}`)}</Chip> : null}
          </View>
        ) : null}
        {started && (nav || tel) ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }}>
            {nav ? <Button variant="ghost" label={t('Raasta')} icon="pin" style={{ flex: 1 }} onPress={() => { void Linking.openURL(nav).catch(() => {}); }} /> : null}
            {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
          </View>
        ) : null}
        {started ? <Button variant="violet" label={t(wd?.status === 'scheduled' ? 'Chalo' : 'Kholo')} iconRight="arrow" style={{ marginTop: 10 }} onPress={() => { act.setCurrent(nr); router.push('/job'); }} /> : null}
      </View>
    </View>
  );
}

/* ---------- state cards: all done / no cars ---------- */
function DoneCard({ width, done }: { width: number; done: number }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 24, alignItems: 'center', borderRadius: 16, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, paddingTop: 16, paddingBottom: 20, paddingHorizontal: 16 }}>
      <DoneArt width={Math.min(width - 64, 300)} />
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.fg, marginTop: 8 }}>{t('Aaj ka round poora')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, textAlign: 'center', marginTop: 2 }}>{t(`${done} gaadi chamka di. Hisaab Paisa tab mein dekho.`)}</Text>
    </View>
  );
}

function NoCars({ width }: { width: number }) {
  const { c } = useTheme();
  const loading = view.bookState === 'loading';
  return (
    <View style={{ marginTop: 24, alignItems: 'center', borderRadius: 16, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, paddingTop: 16, paddingBottom: 20, paddingHorizontal: 16 }}>
      <EmptyArt kind="jobs" width={Math.min(width - 64, 300)} />
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.fg, marginTop: 8 }}>{loading ? t('List aa rahi hai…') : t('Koi gaadi nahi')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, textAlign: 'center', marginTop: 2 }}>{loading ? t('Book se aaj ka round padha ja raha hai.') : t('Aaj aapke naam koi gaadi nahi hai. Manager se baat karo.')}</Text>
    </View>
  );
}

/* ---------- all cars: ONE group of rows ---------- */
function AllCars() {
  useStore();
  const { c } = useTheme();
  const lay = Route.layout();
  const regs = [...lay.slots.flat(), ...lay.pool];
  const cn = Route.counts();
  if (!regs.length) return null;
  return (
    <>
      <SectionLabel>{t('Saari gaadiyan')} · {cn.total}</SectionLabel>
      <Group>
        {regs.map((reg) => {
          const car = carBy(reg);
          if (!car) return null;
          const wd = W(reg), st = wd ? wd.status : 'scheduled';
          const late = Route.isLate(reg);
          const q = openReqs(reg).length;
          const eta = st === 'done' && wd?.finished_at ? short12(t12(wd.finished_at)) : Route.slotEta(reg) ? short12(hm12(Route.slotEta(reg) as string)) : (wd?.eta || Route.etaList()[route().findIndex((x) => x.reg === reg)]) ? short12(hm12((wd?.eta || Route.etaList()[route().findIndex((x) => x.reg === reg)]) as string)) : '';
          return (
            <Pressy key={reg} onPress={() => { act.setCurrent(reg); router.push('/job'); }} accessibilityLabel={`${car.plate} ${car.model}`} scaleTo={0.99}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, opacity: st === 'done' || st === 'skipped' ? 0.72 : 1 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Plate reg={car.plate} style={{ paddingVertical: 1, paddingHorizontal: 6 }} />
                  {q ? <Chip tone="amber" style={{ minHeight: 20, paddingVertical: 0, paddingHorizontal: 7 }}>{q}</Chip> : null}
                </View>
                <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: c.fg }}>{car.model}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: late ? '#dc2626' : c.grey, ...TNUM }}>{eta ? `${eta} · ` : ''}{car.house}</Text>
              </View>
              {late ? <Chip tone="red" style={{ alignSelf: 'center' }}>{t('Late')}</Chip> : null}
              <Chip tone={WASH[st] || 'grey'} style={{ alignSelf: 'center' }}>{t(wd ? STATUS[wd.status] : 'Baaki')}</Chip>
              <Icon name="chevron" size={18} color={c.grey} />
            </Pressy>
          );
        })}
        <Row icon="redo" label={t('Round badlo')} onPress={() => router.push('/round-setup')} />
      </Group>
    </>
  );
}

/* ---------- date strip + rewards + new customer ---------- */
function Week() {
  const marks = useDayMarks();
  const [sel, setSel] = useState(DAY);
  useFocusEffect(useCallback(() => { setSel(DAY) }, []));
  const pick = (k: string) => { setSel(k); router.push(k === DAY ? '/today' : { pathname: '/day', params: { date: k } }); };
  return (
    <>
      <SectionLabel>{t('Pichhle din')}</SectionLabel>
      <Group style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
        <WeekStrip scroll days={dayStripDays(marks)} selected={sel} onSelect={pick} jumpLabel={t('Aaj')} />
      </Group>
    </>
  );
}

function RewardsRow() {
  const o = useOutlook(), m = o.r.month, cl = o.r.clean;
  return (
    <>
      <SectionLabel>{t('Bonus')}</SectionLabel>
      <Group>
        <Row icon="gift" label={t('Bonus')} onPress={openRewards}
          sub={`${t('Early bird')} ${o.streak}/${EARLY_DAYS} · ${t('Poora mahina')} ${m.came}/${m.total} · ${t('No complaint')} ${cl.known ? (cl.eligible ? '✓' : cl.complaints) : '–'}`} />
      </Group>
    </>
  );
}

/* ---------- screen ---------- */
export default function RoundScreen() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: ww } = useWindowDimensions();
  const w = me(), started = !!S.day?.started;
  const h = hourIST();
  const hi = t(h < 12 ? 'Subah bakhair' : h < 17 ? 'Namaste' : 'Shaam ho gayi');
  const cn = Route.counts();
  const finished = started && cn.total > 0 && cn.done + cn.skipped >= cn.total;
  const [slideKey, setSlideKey] = useState(0);
  const showSlide = !started && cn.total > 0;
  const width = Math.min(ww, 440);
  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: showSlide ? 200 : 120, backgroundColor: c.card }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <HeroBand top={insets.top} width={width} greeting={hi} name={w.name.split(' ')[0]} />
        <View style={{ marginTop: -OVERLAP, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.card, paddingHorizontal: 16, paddingTop: 20, flexGrow: 1 }}>
          {!started ? <FadeUp index={0} style={{ marginBottom: 16 }}><CheckInCard /></FadeUp> : null}
          <FadeUp index={1}><Summary started={started} /></FadeUp>
          {!cn.total ? <FadeUp index={2}><NoCars width={width} /></FadeUp> : null}
          {finished ? <FadeUp index={2}><DoneCard width={width} done={cn.done} /></FadeUp> : cn.total ? <FadeUp index={2}><NextCar started={started} /></FadeUp> : null}
          {started ? <FadeUp index={3} style={{ marginTop: 16 }}><CheckOutCard /></FadeUp> : null}
          <FadeUp index={4}><AllCars /></FadeUp>
          <FadeUp index={5}><Week /></FadeUp>
          <FadeUp index={6}><RewardsRow /></FadeUp>
          <FadeUp index={7}>
            <SectionLabel>{t('Naya customer')}</SectionLabel>
            <Group><Row icon="plus" label={t('Nayi gaadi add karo')} sub={t('Naya customer mila? Manager manzoori denge.')} onPress={openAddCar} /></Group>
          </FadeUp>
        </View>
      </PullToRefresh>
      {showSlide ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 92, paddingHorizontal: 16 }}>
          <View style={[{ backgroundColor: c.card, borderRadius: 20, padding: 10, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line }, cardShadow(c)]}>
            <SlideToConfirm label={t('Round shuru karo')} resetKey={slideKey} onDone={() => { if (!act.startRound()) setSlideKey((k) => k + 1); }} />
            <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, textAlign: 'center', marginTop: 6 }}>{t('Shuru karte hi har customer ko aapka naam aur time dikh jayega.')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
