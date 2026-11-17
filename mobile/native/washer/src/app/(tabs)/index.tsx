// Round tab: today's round, the next car, the list, and the "No pocha" showcase. Port of renderRound / #s-round.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Footer, PullToRefresh, Button, CallButton, CarArt, DashCard, DemoNote, Empty, Eyebrow, F, Icon, Ring,
  Plate, Pressy, SectionTitle, SlideToConfirm, StatCard, StatusPill, Tier, VerifiedBadge, WeekStrip, XChip, brand, ui, useTheme,
  type WeekDay,
} from '../../ui';
import { R, cardBox, cardShadow } from '../../ui/theme';
import {
  DAY, Money, Route, S, W, act, isOnline, carBy, me, myPhoto, openReqs, planName, route, useStore, view,
} from '../../state/store';
import { STATUS, navOf, telOf } from '../../lib/data';
import { TASK, tasksFor } from '../../lib/schedule';
import { addDaysStr, dayShort, dObj, hm12, hourIST, rupee, short12, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { SyncChipLive } from '../../screens/TopBar';
import { openLocationSettings, useLocality } from '../../lib/geo';
import { FadeUp, TNUM, TimeChip, VioletBlock } from '../../screens/DayParts';
import { openAddCar } from '../../screens/AddCar';
import { openHelpSheet } from '../../screens/sheets';
import { CheckInCard } from '../../screens/RoundTimeline';
import { RewardsMini } from '../../screens/RewardsCards';
import { myTrust } from '../../screens/TrustData';
import { SLOTS, slotRange } from '../../lib/slots';
import { useDayMarks } from '../../lib/history';
import { dayStripDays } from '../../lib/strip';
import { CarPic } from '../../screens/CarPhoto';

const TRUST = require('../../../assets/img/trust.webp');
const POLAS = [
  { src: require('../../../assets/img/slide1.webp'), cap: 'Foam first', sub: 'Loosens the dust before anything touches the paint' },
  { src: require('../../../assets/img/slide2.webp'), cap: 'Right at your gate', sub: 'Washed where it sleeps' },
  { src: require('../../../assets/img/slide3.webp'), cap: 'Two on one Thar', sub: 'Big cars get both hands' },
  { src: require('../../../assets/img/slide4.webp'), cap: 'Even the i8', sub: 'Covered parking is no problem' },
  { src: require('../../../assets/img/slide5.webp'), cap: 'GH-9 every morning', sub: 'Our busiest round' },
  { src: require('../../../assets/img/slide6.webp'), cap: 'Wheels too', sub: 'Pressure inside the rims' },
];
// trust.webp is 400 x 470 px; fixed here because Image.resolveAssetSource does not exist on web
const TRUST_RATIO = 400 / 470;

/* ---------- violet header block: greeting + name + avatar, duty switch, place / sync chips (white on violet) ---------- */
const GLASS = 'rgba(255,255,255,0.16)';

function DutySwitch() {
  useStore();
  const on = isOnline();
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(a, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start() }, [on, a]);
  const label = t(on ? 'Duty ON' : 'Duty OFF');
  return (
    <Pressable
      onPress={() => { ui.haptic(10); act.toggleOnline(); }}
      accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: GLASS }}
    >
      <Animated.View style={{ width: 40, height: 22, borderRadius: 11, padding: 2, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.4)', brand.mint] }) }}>
        <Animated.View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }} />
      </Animated.View>
      <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 20, color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}

function PlaceChip() {
  const g = useLocality();
  if (g.status === 'error') return null;
  const chip = (txt: string, tint: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: GLASS, maxWidth: 220 }}>
      <Icon name="pin" size={13} color={tint} />
      <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: tint, flexShrink: 1 }}>{txt}</Text>
    </View>
  );
  if (g.status === 'denied') {
    return (
      <Pressy onPress={openLocationSettings} accessibilityLabel={t('Location chalu karo')} scaleTo={0.96} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        {chip(t('Location chalu karo'), '#FFD166')}
      </Pressy>
    );
  }
  const txt = g.text || (g.status === 'loading' || g.status === 'idle' ? t('Location…') : t('Location'));
  return <View accessibilityLabel={txt}>{chip(txt, '#fff')}</View>;
}

function GlassBtn({ icon, label, onPress }: { icon: 'calendar' | 'bell'; label: string; onPress: () => void }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.92} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color="#fff" />
    </Pressy>
  );
}

function RoundHeader({ top, greeting, name, avatar, verified }: { top: number; greeting: string; name: string; avatar: string | null; verified: boolean }) {
  const initial = (name.trim()[0] || '?').toUpperCase();
  return (
    <VioletBlock style={{ paddingTop: top + 12, paddingBottom: 56, paddingHorizontal: 16 }}>
      <FadeUp index={0} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <DutySwitch />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <GlassBtn icon="calendar" label={t('Round badlo')} onPress={() => router.push('/round-setup')} />
          <GlassBtn icon="bell" label={t('Madad / SOS')} onPress={openHelpSheet} />
        </View>
      </FadeUp>
      <FadeUp index={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <Pressy onPress={() => router.push('/profile')} accessibilityLabel={name} scaleTo={0.94}>
          {avatar
            ? <Image source={{ uri: avatar }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            : <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 22, color: '#fff' }}>{initial}</Text>
            </View>}
        </Pressy>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.8)' }}>{greeting}</Text>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.black, fontSize: 22, lineHeight: 30, letterSpacing: -0.3, color: '#fff' }}>{name}</Text>
        </View>
      </FadeUp>
      <FadeUp index={2} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <PlaceChip />
        <SyncChipLive />
        <VerifiedBadge small verified={verified} label={t(verified ? 'WD Verified' : 'Verification baaki')} style={{ backgroundColor: '#fff', height: 32, alignItems: 'center', paddingVertical: 0, paddingLeft: 10, paddingRight: 12 }} />
      </FadeUp>
    </VioletBlock>
  );
}

function Hero({ started }: { started: boolean }) {
  const { c } = useTheme();
  const w = me(), cn = Route.counts();
  const etas = Route.etaList(), rt = route();
  const first = W(rt[0]?.reg)?.eta || etas[0], last = W(rt[rt.length - 1]?.reg)?.eta || etas[etas.length - 1];
  const left = cn.total - cn.done - cn.skipped;
  const sub = !started ? t(`Pehli ${hm12(first)} · aakhri ~${hm12(last)}`)
    : left ? t(`${left} baaki · ${cn.skipped ? cn.skipped + ' skip · ' : ''}aakhri ~${hm12(last)}`)
    : t('Round poora! Shabash.');
  const title = started ? (left ? `${left} ${t('gaadi')}` : t('Round poora! Shabash.')) : `${cn.total} ${t('gaadi')}`;
  return (
    <DashCard onPress={() => router.push('/today')} accessibilityLabel={title} style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{t('Aaj ka round')}</Text>
          <Text style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: c.fg, marginTop: 4, ...TNUM }}>{title}</Text>
          {cn.total ? <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 18, color: c.fg3, marginTop: 4 }}>{sub}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 20, color: c.primary, flexShrink: 1 }} numberOfLines={1}>{dayShort(DAY, isHindi())} · {w.areas.split(' · ')[0]}</Text>
            <Icon name="arrow" size={13} color={c.primary} />
          </View>
        </View>
        <Ring size={96} stroke={12} fraction={cn.total ? cn.done / cn.total : 0} value={cn.done} label={`/ ${cn.total}`} color={c.primary} track={c.soft} ink={c.fg} />
      </View>
    </DashCard>
  );
}

function Stats() {
  const cn = Route.counts();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <StatCard style={{ flex: 1 }} label={t('Gaadi ho gayi')} value={cn.done} unit={`/ ${cn.total}`} icon="check" tone={brand.mint} />
      <StatCard style={{ flex: 1 }} label={t('Aaj ki kamai')} value={rupee(Money.today())} icon="star" tone={brand.gold} />
    </View>
  );
}

function Week() {
  const marks = useDayMarks();
  const [sel, setSel] = useState(DAY);
  useFocusEffect(useCallback(() => { setSel(DAY) }, []));
  const pick = (k: string) => { setSel(k); router.push(k === DAY ? '/today' : { pathname: '/day', params: { date: k } }); };
  return <WeekStrip scroll days={dayStripDays(marks)} selected={sel} onSelect={pick} jumpLabel={t('Aaj')} />;
}

function PrimaryAction({ started }: { started: boolean }) {
  const [key, setKey] = useState(0);
  const total = route().length;
  if (!total) return <DemoNote>{view.bookState === 'loading' ? t('Aaj ki list aa rahi hai…') : t('Aaj aapke naam koi gaadi nahi hai. Manager se baat karo.')}</DemoNote>;
  if (started) return null;
  return (
    <DashCard style={{ padding: 16, gap: 4 }}>
      <SlideToConfirm gold label={t('Round shuru karo')} resetKey={key} onDone={() => { if (!act.startRound()) setKey((k) => k + 1); }} />
      <DemoNote>{t('Shuru karte hi har customer ko aapka naam aur time dikh jayega.')}</DemoNote>
    </DashCard>
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
  const { c } = useTheme();
  const cn = Route.counts();
  const nr = Route.liveReg() || Route.nextReg();
  if (started && nr) {
    const car = carBy(nr)!, wd = W(nr)!, q = openReqs(nr).length, nav = navOf(car), tel = telOf(car.phone);
    return (
      <DashCard style={s.next}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Eyebrow style={{ flexShrink: 1, color: c.fg3 }}>{t(wd.status === 'scheduled' ? 'Agli gaadi' : 'Abhi chal raha')} · {hm12(wd.eta)}</Eyebrow>
          <StatusPill status={wd.status} label={t(STATUS[wd.status])} />
        </View>
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <CarPic reg={car.reg} h={120} size={34}>
            <CarArt car={car} width={300} height={116} />
          </CarPic>
        </View>
        <Text style={{ fontFamily: F.black, fontSize: 22, lineHeight: 30, letterSpacing: -0.3, color: c.fg }}>{car.model}</Text>
        <View style={s.wrap6}>
          <Plate reg={car.plate} />
          <Tier label={planName(car)} />
          <XChips reg={car.reg} plan={car.plan} />
        </View>
        <View style={s.where}>
          <View style={{ marginTop: 2 }}><Icon name="pin" size={18} color={c.primary} /></View>
          <Text style={[s.whereTxt, { color: c.fg2 }]}>{car.house} · {car.spot}</Text>
        </View>
        {q ? (
          <View style={s.where}>
            <View style={{ marginTop: 2 }}><Icon name="note" size={18} color={c.primary} /></View>
            <Text style={[s.whereTxt, { color: c.primary }]}>{t(`${q} customer request${q > 1 ? 's' : ''}`)}</Text>
          </View>
        ) : null}
        {nav || tel ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
            {nav ? <Button variant="ghost" label={t('Raasta')} icon="pin" style={{ flex: 1 }} onPress={() => { void Linking.openURL(nav).catch(() => {}); }} /> : null}
            {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
          </View>
        ) : null}
        <Button variant="violet" label={t(wd.status === 'scheduled' ? 'Chalo' : 'Kholo')} iconRight="arrow" style={{ marginTop: 8 }}
          onPress={() => { act.setCurrent(nr); router.push('/job'); }} />
      </DashCard>
    );
  }
  if (started) return <Empty title={t('Aaj ka round poora 🎉')} text={t(`${cn.done} gaadi chamka di. Hisaab tab mein poora din dekho.`)} />;
  return null;
}

function SlotGroup({ title, regs, placed, index = 0 }: { title: string; regs: string[]; placed: boolean; index?: number }) {
  const { c } = useTheme();
  return (
    <FadeUp index={index} style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {placed ? <TimeChip text={title} /> : <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 24, color: c.fg }}>{title}</Text>}
        <View style={[s.cnt, { backgroundColor: regs.length ? c.soft : c.line }]}><Text style={[s.cntTxt, { color: c.fg2 }]}>{regs.length}</Text></View>
      </View>
      <View style={{ gap: 12 }}>{regs.map((r) => <SlotCar key={r} reg={r} />)}</View>
    </FadeUp>
  );
}

function SlotCar({ reg }: { reg: string }) {
  const { c, dark } = useTheme();
  const car = carBy(reg)!, wd = W(reg), st = wd ? wd.status : 'scheduled';
  const late = Route.isLate(reg), sl = Route.slotOf(reg);
  const eta = st === 'done' && wd?.finished_at ? short12(t12(wd.finished_at)) : Route.slotEta(reg) ? short12(hm12(Route.slotEta(reg))) : '';
  const q = openReqs(reg).length;
  return (
    <DashCard onPress={() => { act.setCurrent(reg); router.push('/job'); }} accessibilityLabel={`${car.plate} ${car.model}`}
      style={[s.stop, late && { backgroundColor: dark ? 'rgba(232,56,79,0.18)' : '#FFF1F2' }, { opacity: st === 'done' || st === 'skipped' ? 0.8 : 1 }]}>
      <CarPic reg={reg} w={64} h={44} size={24} radius={12}><CarArt car={car} width={64} height={27} /></CarPic>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Plate reg={car.plate} />
          {q ? <View style={[s.reqdot, { backgroundColor: dark ? 'rgba(255,106,26,0.28)' : '#FFEDD9' }]}><Text style={[s.reqTxt, { color: dark ? '#FFD2B3' : '#9A3F00' }]}>{q}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: c.fg }}>{car.model}</Text>
        <Text numberOfLines={1} style={{ fontFamily: late ? F.medium : F.body, fontSize: 12, lineHeight: 16, color: late ? (dark ? '#FF8A99' : '#C41F37') : c.fg3 }}>
          {late && sl != null ? t(`${short12(hm12(slotRange(sl).to))} tak due tha`) : `${car.house}`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        {eta ? <TimeChip text={eta} /> : null}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {late ? <View style={s.late}><Text style={s.lateTxt}>{t('Late')}</Text></View> : null}
          <StatusPill status={st} label={t(wd ? STATUS[wd.status] : 'Baaki')} />
        </View>
      </View>
    </DashCard>
  );
}

function RouteList() {
  const rt = route(), cn = Route.counts();
  const { c } = useTheme();
  const lay = Route.layout(), placed = rt.length - lay.pool.length;
  const setup = () => router.push('/round-setup');
  return (
    <View style={{ marginTop: 32 }}>
      <SectionTitle title={t('Aaj ka round')} style={{ marginTop: 0, marginBottom: 12 }} />
      {!cn.total
        ? (view.bookState === 'loading'
          ? <Empty title={t('List aa rahi hai…')} text={t('Book se aaj ka round padha ja raha hai.')} />
          : <Empty title={t('Koi gaadi nahi')} text={t('Book mein aaj aapke naam koi active gaadi nahi hai.')} />)
        : (
          <>
            <Pressy onPress={setup} accessibilityLabel={t('Round badlo')} style={[s.change, { backgroundColor: 'rgba(84,9,218,0.08)' }]}>
              <Icon name="redo" size={16} color={c.primary} />
              <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 20, color: c.primary }}>{t('Round badlo')}</Text>
            </Pressy>
            {!placed ? <Empty title={t('Profile mein jaakar round set karo')} text={t('Apna round set karo')} /> : null}
            {lay.slots.map((regs, i) => regs.length
              ? <SlotGroup key={i} index={i} placed title={`${short12(hm12(SLOTS[i].from))} – ${short12(hm12(SLOTS[i].to))}`} regs={regs} /> : null)}
            {placed && lay.pool.length ? <SlotGroup placed={false} title={t('Slot mein nahi')} regs={lay.pool} /> : null}
            {!placed ? <View style={{ gap: 12, marginTop: 12 }}>{lay.pool.map((r) => <SlotCar key={r} reg={r} />)}</View> : null}
          </>
        )}
      <Button variant="ghost" label={t('+ Nayi gaadi add karo')} onPress={openAddCar} style={{ marginTop: 16 }} />
      <DemoNote>{t('Naya customer mila? Gaadi yahan add karo, aaj se dhona shuru. Manager manzoori denge.')}</DemoNote>
    </View>
  );
}

function Showcase() {
  const tr = TRUST_RATIO;
  const { c } = useTheme();
  const [tw, setTw] = useState(0);   // the card's inner width: RN-web ignores aspectRatio on an Image, so the height is set by hand
  return (
    <View style={[s.workWrap, { backgroundColor: c.card }, cardShadow(c)]}>
      <View style={s.work}>
        <Text accessibilityRole="header" style={[s.workH, { color: c.fg }]}>{t('No pocha.')}<Text style={{ color: c.primary }}> {t('Sirf pressure wash.')}</Text></Text>
        <Text style={[s.workSub, { color: c.fg2 }]}>{t('Foam pehle, phir pressure rinse, phir saaf kapde se sukhao. Gaadi apni jagah se nahi hilti.')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32, gap: 22 }}>
          {POLAS.map((p, i) => (
            <View key={i} style={[s.pola, { transform: [{ rotate: i % 2 ? '1.6deg' : '-2deg' }] }]}>
              <Image source={p.src} style={s.polaImg} resizeMode="cover" accessibilityLabel={p.cap} />
              <View style={s.polaTxt}>
                <Text style={s.polaCap}>{t(p.cap)}</Text>
                <Text style={s.polaSub}>{t(p.sub)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 16 }}>
          <View style={s.trust}>
            <View style={{ width: '100%', height: tw ? tw / tr : undefined, aspectRatio: tw ? undefined : tr }} onLayout={(e) => setTw(e.nativeEvent.layout.width)}>
              {tw ? <Image source={TRUST} style={{ width: tw, height: tw / tr }} resizeMode="stretch" accessibilityLabel="Don't trust the guy with pocha on your car!" /> : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function RoundScreen() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const w = me(), started = !!S.day?.started;
  const h = hourIST();
  const hi = t(h < 12 ? 'Subah bakhair' : h < 17 ? 'Namaste' : 'Shaam ho gayi');
  const photo = myPhoto();
  const trust = myTrust();
  const avatar = photo?.url || null;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <RoundHeader top={insets.top} greeting={hi} name={w.name.split(' ')[0]} avatar={avatar} verified={trust.verified} />
        <View style={[s.pad, { marginTop: -36 }]}>
          <FadeUp index={3}><Hero started={started} /></FadeUp>
          <FadeUp index={4} style={{ marginTop: 12 }}><Stats /></FadeUp>
          <FadeUp index={5} style={{ marginTop: 12 }}><Week /></FadeUp>
          <FadeUp index={6} style={{ marginTop: 12 }}><RewardsMini /></FadeUp>
          {S.day?.checkin_at || !started ? <FadeUp index={7} style={{ marginTop: 12 }}><CheckInCard /></FadeUp> : null}
          <FadeUp index={8} style={{ marginTop: 12 }}><PrimaryAction started={started} /></FadeUp>
          <FadeUp index={9} style={{ marginTop: 16 }}><NextUp started={started} /></FadeUp>
          <RouteList />
        </View>
        <Showcase />
        <Footer bottomPad={128} />
      </PullToRefresh>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  next: { padding: 16, overflow: 'hidden' },
  wrap6: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  where: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  whereTxt: { flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
  cnt: { minWidth: 22, height: 20, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cntTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  late: { height: 20, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 999, backgroundColor: brand.red },
  lateTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: '#fff' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 80 },
  reqdot: { minWidth: 20, height: 20, paddingHorizontal: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reqTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  workWrap: { marginTop: 32, marginHorizontal: 16, borderRadius: R.card, overflow: 'hidden' },
  work: { paddingTop: 30, paddingBottom: 36 },
  workH: { fontFamily: F.black, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, textAlign: 'center', paddingHorizontal: 16 },
  workSub: { fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: 'center', alignSelf: 'center', maxWidth: 300, marginTop: 8 },
  pola: { width: 200, backgroundColor: '#fff', padding: 8, paddingBottom: 16, borderRadius: 16, shadowColor: '#111114', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  polaImg: { width: 174, height: 218, borderRadius: 6, backgroundColor: '#ECECEF' },
  polaTxt: { paddingTop: 12, paddingHorizontal: 2, minHeight: 78 },
  polaCap: { fontFamily: F.bold, fontSize: 16, lineHeight: 22, color: brand.ink },
  polaSub: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: '#52525B', marginTop: 4 },
  trust: { alignSelf: 'center', width: '100%', maxWidth: 560, marginTop: 32, borderRadius: R.card, overflow: 'hidden', backgroundColor: '#5309DE' },
});
