// Home tab, rebuilt to the Pronto layout: dark photo hero with the Home/address header over it, two big tiles, scalloped edge,
// Wash Packs carousel, referral banner, "All car wash services" 3-column grid, trust footer, and the floating washer mini card.
// The header turns white and sticks once the hero has scrolled away.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView, Text, AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { C, SP, InkContext, Theme, creamInk, useTheme } from '../theme';
import { Txt, CountUp, useInsets } from '../ui/kit';
import { Chev, User, Clock, Star } from '../ui/icons';
import { IMG } from '../img';
import { SERVICES, CAR_SERVICES, PACKS, TRUST } from '../data/reference';
import { ampm } from '../data/dates';
import { useApp, A, car, doc, act, go, openPage, svcQty, svcLines, liveHead, activeStage, chipText } from '../state';
import { sheets } from '../sheets';
import { Pressable3 as P3, FadeUp, AddButton, CartBar } from '../ui/motion';
import { Bolt3D, Calendar3D, Laurel, Skyline, Scallop, WalletIcon3D, GiftIcon3D } from '../ui/art2';
import { RATIO } from '../img';

// label -> accessibilityLabel
const Pressable3 = ({ label, ...p }: React.ComponentProps<typeof P3> & { label?: string }) => <P3 accessibilityRole="button" accessibilityLabel={label} {...p} />;

/* ---------- Pronto light tokens (local) ---------- */
const L = { bg: '#FFFFFF', ink: C.ink, grey: '#6B6580', line: '#ECEAF2', tint: '#F1EBFF', violet: C.violet, deep: '#3A06A0', dark: '#24065F', gold: C.gold };
const SIDE = 12, GAP = 10;

/* ---------- small shared helpers (Live and TabBar import these) ---------- */
export function useReduceMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then(v => { if (on) setRm(v) }).catch(() => {}); return () => { on = false } }, []);
  return rm;
}
export const tsh = (_T: Theme, _c: string, _d: number) => ({});   // poster text shadows are gone in the Pronto look
export const edgeOf = (T: Theme) => (T.day ? L.line : 'rgba(255,246,233,.22)');
// a dot with a ring that grows and fades
export function Pulse({ color, size = 8, still }: { color: string; size?: number; still?: boolean }) {
  const rm = useReduceMotion(), v = useRef(new Animated.Value(0)).current, on = !rm && !still;
  useEffect(() => {
    if (!on) return;
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start(); return () => l.stop();
  }, [on]);
  return (
    <View style={{ width: size, height: size }}>
      {on ? <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }] }} /> : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
// section heading: bold title, optional grey sub line, something on the right
export function Head({ title, gold, sub, right, center, style }: { title: string; gold?: string; sub?: string; right?: ReactNode; center?: boolean; style?: any }) {
  const T = useTheme(), col = T.day ? L.ink : T.page.fg;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: center ? 'center' : 'space-between', gap: 12, marginBottom: SP.m }, style]}>
      <View style={{ flexShrink: 1 }}>
        <Txt weight={700} size={center ? 24 : 19} color={col} style={{ textAlign: center ? 'center' : 'left', lineHeight: 26 }}>
          {title}{gold ? <Text style={{ color: L.violet }}>{title ? ' ' : ''}{gold}</Text> : null}
        </Txt>
        {sub ? <Txt size={12.5} color={T.day ? L.grey : T.page.fg3} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
export function LinkTxt({ label, onPress }: { label: string; onPress: () => void }) {
  const T = useTheme();
  return <Pressable onPress={onPress} hitSlop={14}><Txt weight={600} size={13.5} color={T.day ? L.violet : T.page.accent}>{label}</Txt></Pressable>;
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;
const HERO_H = 360, TOP = 26;
const heroTop = (ins: { top: number }) => Math.max(ins.top, 24);

/* ---------- header (floats over the hero, turns white when stuck) ---------- */
function Header({ y, stuck }: { y: Animated.Value; stuck: boolean }) {
  const ins = useInsets(), c = car(), pt = heroTop(ins);
  const bg = y.interpolate({ inputRange: [HERO_H - 150, HERO_H - 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const ink = stuck ? L.ink : '#fff', sub = stuck ? L.grey : 'rgba(255,255,255,.9)';
  const circ = { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 20 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#fff', opacity: bg }, stuck ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 } : null]} />
      <View style={{ paddingTop: pt + 1, paddingBottom: 12, paddingHorizontal: SIDE, flexDirection: 'row', alignItems: 'flex-start' }}>
        <Pressable style={{ flex: 1, minWidth: 0, paddingRight: 10 }} onPress={() => sheets.editDetail('parking')} accessibilityLabel="Change where your car is parked">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt weight={700} size={19} color={ink} style={{ lineHeight: 28 }}>Home</Txt>
            <View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={14} color={ink} /></View>
          </View>
          <Txt weight={500} size={12} color={sub} numberOfLines={1} style={{ marginTop: 1 }}>{c.parking}</Txt>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 4 }}>
          <Pressable3 label="Monthly plans" onPress={() => go('plan')}><View style={[circ, { backgroundColor: '#EFE8FD' }]}><WalletIcon3D size={30} /></View></Pressable3>
          <Pressable3 label="Refer and earn 200 rupees" onPress={() => openPage({ k: 'refer' })}>
            <View style={[circ, { backgroundColor: '#FFF3CF' }]}><GiftIcon3D size={30} /></View>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: -9, alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 9, borderWidth: 1, borderColor: L.gold, paddingHorizontal: 5, height: 17, justifyContent: 'center' }}><Txt weight={700} size={10} color={L.ink} style={{ lineHeight: 14 }}>{'₹200'}</Txt></View>
            </View>
          </Pressable3>
          <Pressable3 label="Your profile" onPress={() => openPage({ k: 'profile' })}><View style={[circ, { backgroundColor: stuck ? '#EFEFF3' : '#fff' }]}><User size={20} color={L.ink} /></View></Pressable3>
        </View>
      </View>
    </View>
  );
}

/* ---------- hero: night foam photo, two tiles, scalloped edge ---------- */
function Tile({ title, pill, art, onPress, label }: { title: string; pill?: string; art: ReactNode; onPress: () => void; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Pressable3 label={label} onPress={onPress} style={{ height: 100, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,.7)', padding: 14, overflow: 'hidden', ...shadow }}>
        <Txt weight={500} size={15} color={L.ink} style={{ lineHeight: 20, width: 100 }}>{title}</Txt>
        {pill ? <View style={{ position: 'absolute', left: 14, bottom: 12, height: 26, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: L.violet, backgroundColor: L.tint, justifyContent: 'center' }}><Txt weight={500} size={12} color={L.violet}>{pill}</Txt></View> : null}
        <View style={{ position: 'absolute', right: 8, bottom: 8 }}>{art}</View>
      </Pressable3>
    </View>
  );
}
function Hero({ y }: { y: Animated.Value }) {
  const ty = y.interpolate({ inputRange: [-200, 0, HERO_H], outputRange: [-70, 0, HERO_H * 0.35], extrapolate: 'clamp' });
  const sc = y.interpolate({ inputRange: [-200, 0], outputRange: [1.45, 1], extrapolate: 'clamp' });
  return (
    <View style={{ height: HERO_H, backgroundColor: L.dark, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: HERO_H, transform: [{ translateY: ty }, { scale: sc }] }}>
        <Image source={IMG.foam} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
      <LinearGradient colors={['rgba(36,6,95,.88)', 'rgba(36,6,95,.2)', 'rgba(36,6,95,.3)', 'rgba(36,6,95,.85)']} locations={[0, 0.38, 0.62, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: 'absolute', left: SIDE + 4, right: SIDE + 4, top: 258, flexDirection: 'row', gap: 16 }}>
        <Tile label="Instant Wash" title={'Instant\nWash'} onPress={() => openPage({ k: 'svc', id: 'wash' })} art={<Bolt3D size={58} />} />
        <Tile label="Monthly Plans" title={'Monthly\nPlans'} pill="See plans" onPress={() => go('plan')} art={<Calendar3D size={50} />} />
      </View>
    </View>
  );
}

/* ---------- wash packs ---------- */
function PackCard({ p }: { p: (typeof PACKS)[number] }) {
  const s = SERVICES.find(x => x.id === p.id)!, q = svcQty(p.id);
  const tag = p.tag === 'NEW' ? '#E5322D' : L.violet;
  return (
    <View style={{ width: 139 }}>
      <Pressable3 label={s.name} onPress={() => openPage({ k: 'svc', id: p.id })}>
        <View style={{ width: 139, height: 104, borderRadius: 10, overflow: 'hidden', backgroundColor: L.tint }}>
          <Image source={(IMG as any)[p.img]} resizeMode={String(p.img).startsWith("r3d") ? "contain" : "cover"} style={{ width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', left: 0, top: 6, backgroundColor: tag, borderTopRightRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 7, height: 17, justifyContent: 'center' }}><Txt weight={700} size={10} color="#fff" style={{ lineHeight: 14 }}>{p.tag}</Txt></View>
        </View>
        <Txt weight={700} size={16} color={L.ink} style={{ marginTop: 12, lineHeight: 22 }}>{'₹' + s.price}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}><Clock size={12} color={L.grey} /><Txt size={12} color={L.grey}>{p.mins >= 60 ? (p.mins / 60) + (p.mins === 60 ? ' hour' : ' hours') : p.mins + ' mins'}</Txt></View>
        <Txt weight={500} size={13} color={L.ink} numberOfLines={1} style={{ marginTop: -1 }}>{s.name}</Txt>
      </Pressable3>
      <View style={{ position: 'absolute', right: -4, top: 77 }}><AddButton variant="add" qty={q} onAdd={() => act.addSvc(p.id)} onSub={() => act.subSvc(p.id)} /></View>
    </View>
  );
}
function Orn({ flip }: { flip?: boolean }) {
  return (
    <Svg width={26} height={12} viewBox="0 0 26 12" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M5 6l4-4 4 4-4 4z" fill="none" stroke={L.violet} strokeWidth={1.4} /><Path d="M14 6l4-4.5 4 4.5-4 4.5z" fill={L.gold} />
    </Svg>
  );
}
function Packs() {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Orn /><Txt weight={600} size={19} color={L.violet}>Wash Packs</Txt><Orn flip />
      </View>
      <Txt size={13} color={L.ink} style={{ textAlign: 'center', marginTop: -3 }}>Pick a combo, we come to your car</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 9 }} contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 30, gap: 20, paddingBottom: 6 }}>
        {PACKS.map((p, i) => <FadeUp key={p.id} delay={i * 70}><PackCard p={p} /></FadeUp>)}
      </ScrollView>
    </View>
  );
}

/* ---------- referral banner ---------- */
function Refer() {
  return (
    <Pressable3 label="Refer a friend and earn 200 rupees" onPress={() => openPage({ k: 'refer' })} style={{ marginHorizontal: SIDE, marginTop: 16 }}>
      <LinearGradient colors={['#3A06A0', '#5409DA', '#7B3BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, height: 76, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
        <View style={{ width: 118, height: 76, overflow: 'hidden' }}><Image source={IMG.washer} resizeMode="contain" style={{ position: 'absolute', left: 6, bottom: -4, width: 100, height: 90 }} /></View>
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={17} color="#fff" style={{ lineHeight: 23 }}>Refer a friend</Txt>
          <Txt weight={500} size={17} color="#fff" style={{ lineHeight: 23 }}>and earn <Text style={{ fontFamily: 'Poppins_700Bold', color: L.gold, fontSize: 21 }}>{'₹200'}</Text></Txt>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><Chev size={14} color={L.deep} /></View>
        <Text style={{ position: 'absolute', right: 8, bottom: 4, fontSize: 7, color: 'rgba(255,255,255,.75)', fontFamily: 'Poppins_400Regular' }}>*T&C Apply</Text>
      </LinearGradient>
    </Pressable3>
  );
}

/* ---------- service grid ---------- */
function SvcTile({ s, w }: { s: (typeof CAR_SERVICES)[number]; w: number }) {
  const q = svcQty(s.id);
  return (
    <View style={{ width: w }}>
      <Pressable3 label={s.name} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ height: 178, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, overflow: 'hidden' }}>
        <View style={{ width: w - 2, height: w - 2, backgroundColor: s.tint }}>
          <Image source={(IMG as any)[s.img]} resizeMode={String(s.img).startsWith("r3d") ? "contain" : "cover"} style={{ width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,.92)', borderRadius: 9, paddingHorizontal: 6, height: 18 }}>
            <Star size={9} color={L.gold} /><Txt weight={500} size={10} color={L.grey} style={{ lineHeight: 14 }}>{s.rating.toFixed(1) + ' (' + s.count + ')'}</Txt>
          </View>
        </View>
        <View style={{ paddingHorizontal: 8, paddingTop: 7 }}>
          <Txt weight={500} size={12.5} color={L.ink} numberOfLines={2} style={{ lineHeight: 17 }}>{s.short}</Txt>
          <Text style={{ marginTop: 3 }}><Txt weight={600} size={13} color={L.ink}>{'₹' + s.price}</Txt><Txt size={10.5} color="#A29DB2" style={{ textDecorationLine: 'line-through' }}>{'  ₹' + s.mrp}</Txt></Text>
        </View>
      </Pressable3>
      <View style={{ position: 'absolute', right: 4, top: w - 36 }}><AddButton qty={q} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
    </View>
  );
}
function Grid({ W }: { W: number }) {
  const w = Math.floor((W - SIDE * 2 - GAP * 2) / 3);
  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ paddingHorizontal: SIDE }}>
        <Txt weight={600} size={18} color={L.ink} style={{ lineHeight: 26 }}>All car wash services</Txt>
        <Txt size={13} color={L.ink} style={{ marginTop: 0 }}>Book now or schedule for later</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIDE, marginTop: 16, columnGap: GAP, rowGap: 16 }}>
        {CAR_SERVICES.map(s => <SvcTile key={s.id} s={s} w={w} />)}
      </View>
    </View>
  );
}

/* ---------- trust footer ---------- */
function Stat({ label, value, sub, go: on }: { label: string; value: number; sub: string; go: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Laurel size={52} />
      <View style={{ alignItems: 'center', minWidth: 78, marginHorizontal: -4 }}>
        <Txt size={12} color={L.grey} style={{ lineHeight: 16 }}>{label}</Txt>
        {on ? <CountUp to={value} weight={700} size={24} color="#1E2A47" style={{ lineHeight: 32 }} format={n => value < 10 ? n.toFixed(1) : Math.round(n).toLocaleString('en-IN') + '+'} /> : <Txt weight={700} size={24} color="#1E2A47" style={{ lineHeight: 32 }}>{value < 10 ? '0.0' : '0'}</Txt>}
        <Txt size={12} color={L.grey} style={{ lineHeight: 16 }}>{sub}</Txt>
      </View>
      <Laurel flip size={52} />
    </View>
  );
}
function Trust({ W, seen }: { W: number; seen: boolean }) {
  const sw = Math.min(W, 520), cw = Math.min(250, W * 0.7);
  return (
    <View style={{ marginTop: 52 }}>
      <Scallop color="#F6F5F9" height={24} />
      <View style={{ backgroundColor: '#fff', marginTop: -1, paddingTop: 22, alignItems: 'center' }}>
        <Txt weight={600} size={18} color={L.ink} style={{ textAlign: 'center', lineHeight: 25, width: 250 }}>Relax, your car is in professional hands</Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 22 }}>
          <Stat label="Trusted by" value={25000} sub={TRUST.carsLabel} go={seen} />
          <Stat label="Rated" value={4.8} sub={TRUST.ratingLabel} go={seen} />
        </View>
        <View style={{ width: sw, height: 300, marginTop: 14, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Skyline width={sw} height={240} /></View>
          <Image source={IMG.washerCut} resizeMode="contain" style={{ width: cw, height: cw / RATIO.washerCut }} />
        </View>
      </View>
    </View>
  );
}

/* ---------- floating "washer assigned" mini card ---------- */
function Assigned({ bottom }: { bottom: number }) {
  const c = car(), d = doc(c), a = A(), live = !!activeStage(d), h = liveHead(c);
  const up = a.bookings.filter(b => b.carId === c.id).slice(-1)[0], planned = !live && !up && d.status !== 'skipped', fin = d.status === 'done';
  if (!live && !up && !planned) return null;
  const w = h.washer;
  const title = live || fin ? (fin ? `${w} washed your ${c.name}` : h.big) : up ? `${w} is assigned to your booking` : `${w} is assigned to your wash`;
  const subTxt = live ? chipText(c, d) : fin ? h.big + ' · WD Wash' : up ? `${up.slot} · ${up.type}` : d.notStarted ? h.big : `Today, ${ampm(d.eta) || '6:30 am'} · WD Wash`;
  return (
    <Pressable3 label={title} onPress={() => go('live')} style={{ position: 'absolute', left: SIDE, right: SIDE, bottom, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, ...shadow }}>
      <View style={{ width: 42, height: 44, borderRadius: 7, overflow: 'hidden', backgroundColor: L.tint }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 52, height: 53, marginLeft: -5, marginTop: 1 }} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={14.5} color={L.ink} numberOfLines={1}>{title}</Txt>
        <Txt size={12.5} color={L.grey} numberOfLines={1}>{subTxt}</Txt>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: L.line, alignItems: 'center', justifyContent: 'center' }}><Chev size={12} color={L.ink} /></View>
    </Pressable3>
  );
}

/* ---------- the screen ---------- */
export default function Home() {
  const ui = useApp(), { width } = useWindowDimensions(), W = Math.min(width, 520), ins = useInsets();
  const ref = useRef<any>(null), y = useRef(new Animated.Value(0)).current, [stuck, setStuck] = useState(false), [seen, setSeen] = useState(false), trustY = useRef(99999);
  const [vh, setVh] = useState(772), cart = svcLines().count > 0;
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: false,
    listener: (e: any) => { const s = e.nativeEvent.contentOffset.y; const st = s > HERO_H - 120; setStuck(p => (p === st ? p : st)); if (s + vh > trustY.current + 120) setSeen(true) },
  });
  const barB = 59 + Math.max(ins.bottom, 0);
  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: L.bg }} onLayout={e => setVh(e.nativeEvent.layout.height)}>
        <Animated.ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ paddingBottom: barB + 96 }}>
          <Hero y={y} />
          <Scallop color={L.dark} dots={L.gold} height={24} />
          <Packs />
          <Refer />
          <Grid W={W} />
          <View onLayout={e => { trustY.current = e.nativeEvent.layout.y }}><Trust W={W} seen={seen} /></View>
        </Animated.ScrollView>
        <Header y={y} stuck={stuck} />
        {cart ? <CartBar aboveTabs /> : <Assigned bottom={barB + 10} />}
      </View>
    </InkContext.Provider>
  );
}
