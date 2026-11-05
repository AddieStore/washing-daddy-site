// Home tab: white page, header with the address, the home car's number plate, two quick tiles, Wash packs carousel,
// referral row, "All car wash services" 3-column grid, a short trust footer, and the floating washer mini card.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView, Text, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { C, SP, InkContext, Theme, creamInk, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Chev, User, Zap, Calendar, Wallet, Gift, Star } from '../ui/icons';
import { Plate } from '../ui/Plate';
import { IMG, RATIO } from '../img';
import { SERVICES, CAR_SERVICES, PACKS, TRUST, SHOW_RATINGS } from '../data/reference';
import { ampm } from '../data/dates';
import { useApp, A, car, doc, act, go, openPage, svcQty, svcLines, liveHead, activeStage, chipText } from '../state';
import { sheets } from '../sheets';
import { Pressable3 as P3, FadeUp, AddButton, CartBar } from '../ui/motion';
import { Skyline } from '../ui/art2';

// label -> accessibilityLabel, press scale 0.98
const Pressable3 = ({ label, ...p }: React.ComponentProps<typeof P3> & { label?: string }) => <P3 scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label} {...p} />;

/* ---------- local tokens ---------- */
const L = { bg: '#FFFFFF', ink: '#171717', sec: '#525252', mut: '#737373', line: 'rgba(23,23,23,0.08)', raised: '#F4F4F5', accent: '#5409DA', pos: '#16a34a' };
const SIDE = 16, GAP = 12;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const TNUM = { fontVariant: ['tabular-nums' as const] };
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;
const floating = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 } as const;

/* ---------- small shared helpers (Live and TabBar import these) ---------- */
export function useReduceMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then(v => { if (on) setRm(v) }).catch(() => {}); return () => { on = false } }, []);
  return rm;
}
export const tsh = (_T: Theme, _c: string, _d: number) => ({});
export const edgeOf = (T: Theme) => (T.day ? L.line : 'rgba(255,246,233,.22)');
// a dot with a ring that grows and fades; use only for a genuinely live status
export function Pulse({ color, size = 8, still }: { color: string; size?: number; still?: boolean }) {
  const rm = useReduceMotion(), v = useRef(new Animated.Value(0)).current, on = !rm && !still;
  useEffect(() => {
    if (!on) return;
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: EASE, useNativeDriver: true }));
    l.start(); return () => l.stop();
  }, [on]);
  return (
    <View style={{ width: size, height: size }}>
      {on ? <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }] }} /> : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
// section heading: title, optional muted sub line, something on the right
export function Head({ title, gold, sub, right, center, style }: { title: string; gold?: string; sub?: string; right?: ReactNode; center?: boolean; style?: any }) {
  const T = useTheme(), col = T.day ? L.ink : T.page.fg;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: center ? 'center' : 'space-between', gap: 12, marginBottom: SP.m }, style]}>
      <View style={{ flexShrink: 1 }}>
        <Txt weight={500} size={center ? 24 : 18} color={col} style={{ textAlign: center ? 'center' : 'left', lineHeight: center ? 32 : 24 }}>
          {title}{gold ? <Text style={{ color: L.accent }}>{title ? ' ' : ''}{gold}</Text> : null}
        </Txt>
        {sub ? <Txt size={13} color={T.day ? L.sec : T.page.fg3} style={{ marginTop: 4, lineHeight: 20 }}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
export function LinkTxt({ label, onPress }: { label: string; onPress: () => void }) {
  const T = useTheme();
  return <Pressable onPress={onPress} hitSlop={14}><Txt weight={500} size={14} color={T.day ? L.accent : T.page.accent}>{label}</Txt></Pressable>;
}

/* ---------- header: address on the left, three line icons on the right ---------- */
function Header({ y }: { y: Animated.Value }) {
  const ins = useInsets(), c = car();
  const line = y.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp' });
  const btn = { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <View style={{ backgroundColor: L.bg, zIndex: 20 }}>
      <View style={{ paddingTop: Math.max(ins.top, 24) + 8, paddingBottom: 8, paddingHorizontal: SIDE, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable style={{ flex: 1, minWidth: 0, paddingRight: 12 }} onPress={() => sheets.editDetail('parking')} accessibilityLabel="Change where your car is parked">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt weight={500} size={18} color={L.ink} style={{ lineHeight: 24 }}>Home</Txt>
            <View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={18} color={L.mut} strokeWidth={1.5} /></View>
          </View>
          <Txt size={12} color={L.mut} numberOfLines={1} style={{ lineHeight: 16 }}>{c.parking}</Txt>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Pressable3 label="Monthly plans" onPress={() => go('plan')}><View style={btn}><Wallet size={18} color={L.sec} strokeWidth={1.5} /></View></Pressable3>
          <Pressable3 label="Refer and earn 200 rupees" onPress={() => openPage({ k: 'refer' })}><View style={btn}><Gift size={18} color={L.sec} strokeWidth={1.5} /></View></Pressable3>
          <Pressable3 label="Your profile" onPress={() => openPage({ k: 'profile' })}><View style={btn}><User size={18} color={L.sec} strokeWidth={1.5} /></View></Pressable3>
        </View>
      </View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: L.line, opacity: line }} />
    </View>
  );
}

/* ---------- top: the home car's plate and two quick tiles ---------- */
function Tile({ title, sub, icon, onPress, label }: { title: string; sub: string; icon: ReactNode; onPress: () => void; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Pressable3 label={label} onPress={onPress} style={{ height: 96, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, padding: 16, justifyContent: 'space-between', ...shadow }}>
        {icon}
        <View>
          <Txt weight={500} size={15} color={L.ink} style={{ lineHeight: 20 }}>{title}</Txt>
          <Txt size={12} color={L.mut} style={{ lineHeight: 16 }}>{sub}</Txt>
        </View>
      </Pressable3>
    </View>
  );
}
function Top() {
  const c = car();
  return (
    <View style={{ paddingHorizontal: SIDE, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Plate reg={c.plate} width={104} />
        <Txt size={14} color={L.sec} numberOfLines={1} style={{ flex: 1, lineHeight: 20 }}>{c.name}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        <Tile label="Instant wash" title="Instant wash" sub="Book now" icon={<Zap size={18} color={L.mut} strokeWidth={1.5} />} onPress={() => openPage({ k: 'svc', id: 'wash' })} />
        <Tile label="Monthly plans" title="Monthly plans" sub="See plans" icon={<Calendar size={18} color={L.mut} strokeWidth={1.5} />} onPress={() => go('plan')} />
      </View>
    </View>
  );
}

/* ---------- wash packs ---------- */
function PackCard({ p }: { p: (typeof PACKS)[number] }) {
  const s = SERVICES.find(x => x.id === p.id)!, q = svcQty(p.id);
  return (
    <View style={{ width: 140 }}>
      <Pressable3 label={s.name} onPress={() => openPage({ k: 'svc', id: p.id })}>
        <View style={{ width: 140, height: 104, borderRadius: 14, overflow: 'hidden', backgroundColor: L.raised }}>
          <Image source={(IMG as any)[p.img]} resizeMode={String(p.img).startsWith('r3d') ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} />
        </View>
        <Txt weight={500} size={15} color={L.ink} numberOfLines={1} style={{ marginTop: 8, lineHeight: 20 }}>{s.name}</Txt>
        <Text style={{ lineHeight: 20 }}>
          <Txt weight={500} size={14} color={L.ink} style={TNUM}>{inr(s.price)}</Txt>
          <Txt size={12} color={L.mut}>{'  ·  ' + (p.mins >= 60 ? (p.mins / 60) + (p.mins === 60 ? ' hour' : ' hours') : p.mins + ' mins')}</Txt>
        </Text>
      </Pressable3>
      <View style={{ position: 'absolute', right: 4, top: 66 }}><AddButton variant="add" qty={q} onAdd={() => act.addSvc(p.id)} onSub={() => act.subSvc(p.id)} /></View>
    </View>
  );
}
function Packs() {
  return (
    <View style={{ marginTop: 32 }}>
      <View style={{ paddingHorizontal: SIDE }}><Head title="Wash packs" sub="We come to your car" style={{ marginBottom: 0 }} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}>
        {PACKS.map((p, i) => <FadeUp key={p.id} delay={Math.min(i, 5) * 50} distance={8} duration={300}><PackCard p={p} /></FadeUp>)}
      </ScrollView>
    </View>
  );
}

/* ---------- referral row ---------- */
function Refer() {
  return (
    <Pressable3 label="Refer a friend and earn 200 rupees" onPress={() => openPage({ k: 'refer' })} style={{ marginHorizontal: SIDE, marginTop: 32, minHeight: 64, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}>
      <Gift size={18} color={L.mut} strokeWidth={1.5} />
      <Txt size={15} color={L.ink} style={{ flex: 1, lineHeight: 20 }}>Refer a friend, earn <Txt weight={500} size={15} color={L.accent} style={TNUM}>{'₹200'}</Txt></Txt>
      <Chev size={18} color={L.mut} strokeWidth={1.5} />
    </Pressable3>
  );
}

/* ---------- service grid ---------- */
function SvcTile({ s, w }: { s: (typeof CAR_SERVICES)[number]; w: number }) {
  const q = svcQty(s.id), iw = w - 2 - 16;
  return (
    <View style={{ width: w }}>
      <Pressable3 label={s.name} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ height: 176, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, padding: 8, overflow: 'hidden' }}>
        <View style={{ width: iw, height: iw, borderRadius: 6, overflow: 'hidden', backgroundColor: L.raised }}>
          <Image source={(IMG as any)[s.img]} resizeMode={String(s.img).startsWith('r3d') ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} />
          {SHOW_RATINGS ? (
            <View style={{ position: 'absolute', top: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 4, height: 20 }}>
              <Star size={12} color={L.mut} strokeWidth={1.5} /><Txt size={12} color={L.sec} style={{ lineHeight: 16 }}>{s.rating.toFixed(1) + ' (' + s.count + ')'}</Txt>
            </View>
          ) : null}
        </View>
        <Txt size={13} color={L.ink} numberOfLines={2} style={{ lineHeight: 18, height: 36, marginTop: 8 }}>{s.short}</Txt>
        <Text style={{ marginTop: 4 }}><Txt weight={500} size={13} color={L.ink} style={TNUM}>{inr(s.price)}</Txt><Txt size={12} color={L.mut} style={{ textDecorationLine: 'line-through', ...TNUM }}>{'  ' + inr(s.mrp)}</Txt></Text>
      </Pressable3>
      <View style={{ position: 'absolute', right: 12, top: 8 + iw - 34 - 4 }}><AddButton qty={q} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
    </View>
  );
}
function Grid({ W }: { W: number }) {
  const w = Math.floor((W - SIDE * 2 - GAP * 2) / 3);
  return (
    <View style={{ marginTop: 32 }}>
      <View style={{ paddingHorizontal: SIDE }}><Head title="All car wash services" sub="Book now or schedule for later" style={{ marginBottom: 0 }} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIDE, marginTop: 16, columnGap: GAP, rowGap: GAP }}>
        {CAR_SERVICES.map(s => <SvcTile key={s.id} s={s} w={w} />)}
      </View>
    </View>
  );
}

/* ---------- trust footer (figures stay hidden until TRUST has real values) ---------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 96 }}>
      <Txt weight={500} size={28} color={L.ink} style={{ lineHeight: 36, ...TNUM }}>{value}</Txt>
      <Txt size={12} color={L.mut} style={{ lineHeight: 16 }}>{label}</Txt>
    </View>
  );
}
function Trust({ W }: { W: number }) {
  const sw = Math.min(W, 520), cw = Math.min(250, W * 0.7), stats = !!(TRUST.cars || TRUST.rating);
  return (
    <View style={{ marginTop: 32, alignItems: 'center' }}>
      <Txt weight={500} size={18} color={L.ink} style={{ textAlign: 'center', lineHeight: 24, width: 250 }}>Your car is in professional hands</Txt>
      {stats ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 24 }}>
          {TRUST.cars ? <Stat label={TRUST.carsLabel} value={String(TRUST.cars)} /> : null}
          {TRUST.rating ? <Stat label={TRUST.ratingLabel} value={String(TRUST.rating)} /> : null}
        </View>
      ) : null}
      <View style={{ width: sw, height: 300, marginTop: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Skyline width={sw} height={240} /></View>
        <Image source={IMG.washerCut} resizeMode="contain" style={{ width: cw, height: cw / RATIO.washerCut }} />
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
    <Pressable3 label={title} onPress={() => go('live')} style={{ position: 'absolute', left: SIDE, right: SIDE, bottom, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, ...floating }}>
      <View style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', backgroundColor: L.raised }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 52, height: 53, marginLeft: -4 }} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={500} size={14} color={L.ink} numberOfLines={1} style={{ lineHeight: 20 }}>{title}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {live ? <Pulse color={L.pos} size={8} /> : null}
          <Txt size={13} color={L.sec} numberOfLines={1} style={{ flex: 1, lineHeight: 18 }}>{subTxt}</Txt>
        </View>
      </View>
      <Chev size={18} color={L.mut} strokeWidth={1.5} />
    </Pressable3>
  );
}

/* ---------- the screen ---------- */
export default function Home() {
  const ui = useApp(), { width } = useWindowDimensions(), W = Math.min(width, 520), ins = useInsets();
  const ref = useRef<any>(null), y = useRef(new Animated.Value(0)).current, cart = svcLines().count > 0;
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: false });
  const barB = 59 + Math.max(ins.bottom, 0);
  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <Header y={y} />
        <Animated.ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ paddingBottom: barB + 96 }}>
          <Top />
          <Packs />
          <Refer />
          <Grid W={W} />
          <Trust W={W} />
        </Animated.ScrollView>
        {cart ? <CartBar aboveTabs /> : <Assigned bottom={barB + 12} />}
      </View>
    </InkContext.Provider>
  );
}
