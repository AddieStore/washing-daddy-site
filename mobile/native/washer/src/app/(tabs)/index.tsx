// Round tab (v22 look): lavender hero band with the scooter art (progress = cars done / total), a white content sheet that overlaps it by 24px
// (duty + today's summary, next car, all cars, date strip, rewards, new customer), and the "Round shuru karo" slide as a fixed bar above the tab bar.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PullToRefresh, Button, CallButton, CarArt, Chip, F, Group, HeaderIconButton, Icon, PCard, Plate, Pressy, PTitle, Row, SectionLabel, SlideToConfirm, StatTile, ui, useTheme, WeekStrip,
} from '../../ui';
import { LoginStoryArt, DoneArt, EmptyArt } from '../../ui/art';
import { useStill } from '../../ui/art/kit';
import { cardShadow } from '../../ui/theme';
import { DAY, Extra, Money, Rounds, wFeature, Route, S, W, act, carBy, isOnline, me, openReqs, planName, route, useStore, view } from '../../state/store';
import { STATUS, navOf, telOf } from '../../lib/data';
import { TASK, tasksFor } from '../../lib/schedule';
import { dayShort, hm12, hourIST, rupee, short12, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { DutyToggle } from '../../ui/TopBar';
import { openLocationSettings, useLocality } from '../../lib/geo';
import { FadeUp, TNUM } from '../../screens/DayParts';
import { openAddCar } from '../../screens/AddCar';
import { openHelpSheet } from '../../screens/sheets';
import { CheckInCard } from '../../screens/RoundTimeline';
import { CheckOutCard } from '../../screens/CheckOutCard';
import { DayCard } from '../../screens/DayCards';
import { openRewards, useOutlook } from '../../screens/RewardsCards';
import { EARLY_DAYS } from '../../lib/rewards';
import { useDayMarks } from '../../lib/history';
import { dayStripDays } from '../../lib/strip';
import { CarPic } from '../../screens/CarPhoto';
import { NowCard, RouteList, RouteTrack, openRoundSheet } from '../../screens/RouteFlow';

const ART = 168;                  // the art sits at the bottom of the band, greeting + chips above it
const BAND = 230;                 // visible hero height under the status bar
const OVERLAP = 24;               // the white sheet covers the bottom of the band by this much
const SKY = '#E3D8FF';            // top colour of the art's sky (so the status-bar strip is seamless)
const HOME_SCENES = [1, 2, 0];     // Home order: wash, proof, then ride (login keeps 0, 1, 2)
const SCENE_MS = 4500;
const WASH: Record<string, 'violet' | 'green' | 'grey' | 'amber'> = { scheduled: 'grey', on_the_way: 'violet', arrived: 'violet', washing: 'violet', done: 'green', skipped: 'amber' };

/* ---------- hero band ---------- */
function PlaceChip() {
  useStore();
  const r = Rounds.mine();
  return (
    <Pressy onPress={wFeature('round_picker') ? openRoundSheet : undefined} accessibilityLabel={`${t('Round badlo')}: ${r.name}`} scaleTo={0.97} hitSlop={8}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0, height: 30, paddingLeft: 10, paddingRight: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)', maxWidth: 200 }}>
        <Icon name="pin" size={13} color="#5409DA" />
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: '#141414', flexShrink: 1 }}>{r.areas.split(' · ')[0]}{r.areas.includes(' · ') ? ' +' : ''}</Text>
        {wFeature('round_picker') ? <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chevron" size={13} color="#5409DA" /></View> : null}
      </View>
    </Pressy>
  );
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
  const rm = useStill();
  const [si, setSi] = useState(0);
  useEffect(() => {
    if (rm) return;
    const id = setInterval(() => setSi((n) => (n + 1) % HOME_SCENES.length), SCENE_MS);
    return () => clearInterval(id);
  }, [rm]);
  return (
    <View style={{ backgroundColor: c.card }}>
     <View style={{ backgroundColor: dark ? '#1E1633' : SKY }}>
      <View style={{ height: top }} />
      <View style={{ height: BAND }}>
        <View style={{ position: 'absolute', left: 0, bottom: 0 }}><LoginStoryArt width={width} height={ART} scene={HOME_SCENES[rm ? 0 : si]} dark={dark} still={rm} /></View>
        <View style={{ position: 'absolute', left: 16, right: 16, top: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View accessibilityRole="header" style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 14, lineHeight: 18, color: dark ? '#C9BFE6' : '#5B4B8A' }}>{greeting}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 30, lineHeight: 36, letterSpacing: -1, color: dark ? '#F4F4F5' : '#141414' }}>{name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <DutyToggle />
              {wFeature('help_sos') ? <HeaderIconButton icon="bell" label={t('Madad / SOS')} onPress={openHelpSheet} /> : null}
              {wFeature('add_car') ? <HeaderIconButton icon="plus" label={t('Nayi gaadi add karo')} onPress={openAddCar} /> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <PlaceChip />
            {cn.total ? <ProgressChip done={cn.done} total={cn.total} /> : null}
          </View>
        </View>
      </View>
     </View>
      {/* just below the (solid black) road the lavender of the hero fades to plain white: no black here, no line */}
      <LinearGradient pointerEvents="none" colors={dark ? ['#1E1633', 'rgba(28,28,31,1)'] : [SKY, '#EEE7FF', '#F8F5FF', '#FFFFFF']}
        locations={dark ? [0, 1] : [0, 0.4, 0.75, 1]} style={{ height: 72 }} />
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

/* ---------- state cards: all done / no cars ---------- */
function DoneCard({ width, done }: { width: number; done: number }) {
  const { c } = useTheme();
  useStore();
  const nExtra = Extra.shown().length;
  return (
    <View style={{ marginTop: 24, alignItems: 'center', borderRadius: 16, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, paddingTop: 16, paddingBottom: 20, paddingHorizontal: 16 }}>
      <DoneArt width={Math.min(width - 64, 300)} />
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.fg, marginTop: 8 }}>{t('Aaj ka round poora')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, textAlign: 'center', marginTop: 2 }}>{t(`${done} gaadi chamka di. Monthly kaam poora.`)}</Text>
      <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: c.line, marginVertical: 16 }} />
      <Pressy onPress={() => router.push('/extra' as any)} accessibilityLabel={t('Extra kaam')} scaleTo={0.98}
        style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,186,8,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="tabExtra" size={20} color="#C77700" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: c.fg }}>{t('Ab extra kaam')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.grey }}>{nExtra ? t(`${nExtra} kaam aapke liye`) : t('Naye kaam aate hi yahan dikhenge')}</Text>
        </View>
        {nExtra ? <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{nExtra}</Text></View> : null}
        <Icon name="chevron" size={18} color={c.grey} />
      </Pressy>
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
  useEffect(() => { void Rounds.load() }, []);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: ww } = useWindowDimensions();
  const w = me(), started = !!S.day?.started;
  const h = hourIST();
  const hi = t(h < 12 ? 'Subah bakhair' : h < 17 ? 'Namaste' : 'Shaam ho gayi');
  const cn = Route.counts();
  const finished = started && cn.total > 0 && cn.done + cn.skipped >= cn.total;
  const [slideKey, setSlideKey] = useState(0);
  const showSlide = false;   // the goal card (DayCard) carries the start slide now
  const nowReg = Route.liveReg() || Route.nextReg();
  const width = Math.min(ww, 440);
  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: showSlide ? 200 : 120, backgroundColor: c.card }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <HeroBand top={insets.top} width={width} greeting={hi} name={w.name.split(' ')[0]} />
        <View style={{ backgroundColor: c.card, paddingHorizontal: 16, marginTop: 0, paddingTop: 4, flexGrow: 1, gap: 16 }}>
          {!started ? <FadeUp index={0}><CheckInCard /></FadeUp> : null}
          {cn.total ? <FadeUp index={0}><DayCard /></FadeUp> : null}
          {!cn.total ? <FadeUp index={1}><NoCars width={width} /></FadeUp> : null}
          {started && nowReg && !finished ? <FadeUp key={nowReg} index={1}><NowCard reg={nowReg} /></FadeUp> : null}
          {finished ? <FadeUp index={1}><DoneCard width={width} done={cn.done} /></FadeUp> : null}
          {started ? <FadeUp index={2}><CheckOutCard /></FadeUp> : null}
          {cn.total ? <FadeUp index={3}><RouteTrack /></FadeUp> : null}
          {cn.total ? <FadeUp index={4}><RouteList nowReg={started && !finished ? nowReg : null} /></FadeUp> : null}
          {wFeature('rewards') ? <FadeUp index={5}><RewardsRow /></FadeUp> : null}
          {wFeature('add_car') ? <FadeUp index={6}><Group><Row icon="plus" label={t('Nayi gaadi add karo')} sub={t('Naya customer mila? Manager manzoori denge.')} onPress={openAddCar} /></Group></FadeUp> : null}
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
