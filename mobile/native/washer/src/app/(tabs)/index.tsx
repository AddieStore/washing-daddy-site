// Round tab: today's round, the next car, the list, and the "No pocha" showcase. Port of renderRound / #s-round.
import React, { useCallback, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, DotBg, DutyToggle, Footer, LocationChip, PullToRefresh, Button, CallButton, CarArt, DashCard, DemoNote, Empty, Eyebrow, F, HeroCard, Icon, ListCard, OnViolet,
  Plate, Pressy, SectionTitle, SlideToConfirm, StatCard, StatusPill, Tier, VerifiedBadge, WeekStrip, XChip, brand, useTheme,
  type WeekDay,
} from '../../ui';
import { R, cardBox, cardShadow } from '../../ui/theme';
import {
  DAY, Money, Route, S, W, act, carBy, me, myPhoto, openReqs, planName, route, useStore, view,
} from '../../state/store';
import { STATUS, navOf, telOf } from '../../lib/data';
import { TASK, tasksFor } from '../../lib/schedule';
import { addDaysStr, dayShort, dObj, hm12, hourIST, rupee, short12, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { SyncChipLive } from '../../screens/TopBar';
import { openAddCar } from '../../screens/AddCar';
import { openHelpSheet } from '../../screens/sheets';
import { CheckInCard } from '../../screens/RoundTimeline';
import { RewardsMini } from '../../screens/RewardsCards';
import { myTrust } from '../../screens/TrustData';
import { SLOTS, slotRange } from '../../lib/slots';
import { useDayMarks } from '../../lib/history';
import { dayStripDays } from '../../lib/strip';
import { CarPic } from '../../screens/CarPhoto';

const VIOLET_INK = '#2A0478';
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
    <HeroCard
      eyebrow={t('Aaj ka round')}
      title={title}
      subtitle={cn.total ? sub : undefined}
      ring={{ fraction: cn.total ? cn.done / cn.total : 0, value: cn.done, label: `/ ${cn.total}` }}
      onPress={() => router.push('/today')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 20, color: c.fg3 }} numberOfLines={1}>{dayShort(DAY, isHindi())} · {w.areas.split(' · ')[0]}</Text>
        <Icon name="arrow" size={13} color={c.fg3} />
      </View>
    </HeroCard>
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
        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <CarPic reg={car.reg} h={120} size={34}>
            <CarArt car={car} width={300} height={116} />
          </CarPic>
        </View>
        <Text style={{ fontFamily: F.hero, fontSize: 29, lineHeight: 40, color: c.fg }}>{car.model}</Text>
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

function SlotGroup({ title, regs, placed }: { title: string; regs: string[]; placed: boolean }) {
  const { dark } = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <SectionTitle title={title} style={{ marginTop: 0, marginBottom: 0 }} />
        <View style={[s.cnt, { backgroundColor: regs.length ? (dark ? 'rgba(196,176,255,0.2)' : '#F7D5FF') : (dark ? '#2E2E33' : '#E2E2E2') }]}><Text style={[s.cntTxt, { color: regs.length ? (dark ? '#E9D9FF' : '#5C0E6C') : (dark ? '#E4E4E7' : '#1B1B1B') }]}>{regs.length}</Text></View>
      </View>
      <View style={{ gap: 8 }}>{regs.map((r) => <SlotCar key={r} reg={r} />)}</View>
    </View>
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
      style={[s.stop, late && { backgroundColor: dark ? 'rgba(232,56,79,0.18)' : '#FFC4BE', borderColor: c.fg }, { opacity: st === 'done' || st === 'skipped' ? 0.8 : 1 }]}>
      <CarPic reg={reg} w={64} h={44} size={24} radius={10}><CarArt car={car} width={64} height={27} /></CarPic>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: c.fg, flexShrink: 1 }}>{car.model}</Text>
          {q ? <View style={[s.reqdot, { backgroundColor: dark ? 'rgba(255,106,26,0.28)' : '#FFC7A1' }]}><Text style={[s.reqTxt, { color: dark ? '#FFD2B3' : '#622700' }]}>{q}</Text></View> : null}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: late ? F.medium : F.body, fontSize: 12, lineHeight: 20, color: late ? (dark ? '#FF8A99' : '#C41F37') : c.fg3 }}>
          {late && sl != null ? t(`${short12(hm12(slotRange(sl).to))} tak due tha`) : `${car.house} · ${car.plate}`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {eta ? <Text style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 24, color: c.fg }}>{eta}</Text> : null}
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
    <View style={{ marginTop: 20 }}>
      <SectionTitle title={t('Aaj ka round')} />
      {!cn.total
        ? (view.bookState === 'loading'
          ? <Empty title={t('List aa rahi hai…')} text={t('Book se aaj ka round padha ja raha hai.')} />
          : <Empty title={t('Koi gaadi nahi')} text={t('Book mein aaj aapke naam koi active gaadi nahi hai.')} />)
        : (
          <>
            <Pressy onPress={setup} accessibilityLabel={t('Round badlo')} style={[s.change, { backgroundColor: c.soft }]}>
              <Icon name="redo" size={16} color={c.softInk} />
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.softInk }}>{t('Round badlo')}</Text>
            </Pressy>
            {!placed ? <Empty title={t('Profile mein jaakar round set karo')} text={t('Apna round set karo')} /> : null}
            {lay.slots.map((regs, i) => regs.length
              ? <SlotGroup key={i} placed title={`${short12(hm12(SLOTS[i].from))} – ${short12(hm12(SLOTS[i].to))}`} regs={regs} /> : null)}
            {placed && lay.pool.length ? <SlotGroup placed={false} title={t('Slot mein nahi')} regs={lay.pool} /> : null}
            {!placed ? <View style={{ gap: 10, marginTop: 12 }}>{lay.pool.map((r) => <SlotCar key={r} reg={r} />)}</View> : null}
          </>
        )}
      <Button variant="ghost" label={t('+ Nayi gaadi add karo')} onPress={openAddCar} style={{ marginTop: 14 }} />
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
      <DotBg />
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppHeader
          top={<DutyToggle />}
          sub={<LocationChip />}
          safeTop={insets.top}
          greeting={hi}
          name={w.name.split(' ')[0]}
          avatarUri={avatar}
          onAvatarPress={() => router.push('/profile')}
          actions={[
            { icon: 'calendar', label: t('Round badlo'), onPress: () => router.push('/round-setup') },
            { icon: 'bell', label: t('Madad / SOS'), onPress: openHelpSheet },
          ]}
        />
        <View style={s.pad}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <VerifiedBadge small verified={trust.verified} label={t(trust.verified ? 'WD Verified' : 'Verification baaki')} style={{ flexShrink: 1 }} />
            <SyncChipLive />
          </View>
          <Hero started={started} />
          <View style={{ marginTop: 12 }}><Stats /></View>
          <View style={{ marginTop: 12 }}><Week /></View>
          <View style={{ marginTop: 12 }}><RewardsMini /></View>
          {S.day?.checkin_at || !started ? <View style={{ marginTop: 12 }}><CheckInCard /></View> : null}
          <View style={{ marginTop: 12 }}><PrimaryAction started={started} /></View>
          <View style={{ marginTop: 16 }}><NextUp started={started} /></View>
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
  wrap6: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  where: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  whereTxt: { flex: 1, fontFamily: F.semi, fontSize: 14 },
  cnt: { minWidth: 22, height: 20, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cntTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  late: { height: 20, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 999, backgroundColor: brand.red },
  lateTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: '#fff' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginBottom: 10 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 8, paddingRight: 12, minHeight: 72 },
  reqdot: { minWidth: 20, height: 20, paddingHorizontal: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reqTxt: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  workWrap: { marginTop: 30, marginHorizontal: 16, borderRadius: R.card, borderWidth: 1, borderColor: 'rgba(17,17,20,0.094)', overflow: 'hidden' },
  work: { paddingTop: 30, paddingBottom: 36 },
  workH: { fontFamily: F.shout, fontSize: 40, lineHeight: 40, textTransform: 'uppercase', textAlign: 'center', paddingHorizontal: 16 },
  workSub: { fontFamily: F.body, fontSize: 15, textAlign: 'center', alignSelf: 'center', maxWidth: 300, marginTop: 10 },
  pola: { width: 200, backgroundColor: '#fff', padding: 10, paddingBottom: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(17,17,20,0.10)', shadowColor: '#111114', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  polaImg: { width: 174, height: 218, borderRadius: 6, backgroundColor: '#ECECEF' },
  polaTxt: { paddingTop: 12, paddingHorizontal: 2, minHeight: 78 },
  polaCap: { fontFamily: F.shout, fontSize: 18, lineHeight: 19, textTransform: 'uppercase', color: brand.ink },
  polaSub: { fontFamily: F.semi, fontSize: 12, color: '#52525B', marginTop: 3 },
  trust: { alignSelf: 'center', width: '100%', maxWidth: 560, marginTop: 30, borderWidth: 1, borderColor: 'rgba(17,17,20,0.094)', borderRadius: R.card, overflow: 'hidden', backgroundColor: '#5309DE' },
});
