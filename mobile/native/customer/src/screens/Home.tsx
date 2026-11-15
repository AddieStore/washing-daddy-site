// Home tab (Pronto layout, Washing Daddy look): collapsing header over a violet hero with animated text, Instant / Schedule cards,
// offer packs carousel, referral banner, "All car wash services" 3-column grid, trust block, sticky mini-cart bar.
// Plan and Store are no longer tabs; two rows under the referral banner open them.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView, Text, RefreshControl, AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { C, SP, Theme, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Chev, User, Zap, Calendar, Wallet, Gift, Star, Plan as PlanIc, Store as StoreIc, Clock } from '../ui/icons';
import { IMG, RATIO } from '../img';
import { CAR_SERVICES, PACKS, TRUST, SHOW_RATINGS, REFERRAL, packInfo } from '../data/reference';
import { ampm } from '../data/dates';
import {
  useApp, A, car, doc, act, go, openPage, openSheet, toast, svcQty, svcLines, liveHead, activeStage, chipText,
  homeConfig, instantStatus, selectedAddress, addrName, wallet, activePass,
} from '../state';
import { Pressable3 as P3, FadeUp, AddButton, CartBar, Shimmer, useSkeleton, loaderPending } from '../ui/motion';
import { Skyline, Laurel } from '../ui/art2';
import { SheetTitle } from '../ui/hosts';
import { openAddressPicker } from '../sheets/address';
import { openPassPromo } from '../sheets/money';

// label -> accessibilityLabel, press scale 0.98
const Pressable3 = ({ label, ...p }: React.ComponentProps<typeof P3> & { label?: string }) => <P3 scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label} {...p} />;

/* ---------- local tokens ---------- */
const L = { bg: '#FFFFFF', ink: '#171717', sec: '#525252', mut: '#737373', line: 'rgba(23,23,23,0.08)', raised: '#F4F4F5', accent: '#5409DA', pos: '#16a34a', tint: 'rgba(84,9,218,0.08)' };
const SIDE = 16, GAP = 12;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const ND = Platform.OS !== 'web';
const TNUM = { fontVariant: ['tabular-nums' as const] };
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const shadow = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;
const HERO: Record<string, { bg: string; accent: string }> = {
  default: { bg: '#5409DA', accent: '#E3D3FF' },
  festive: { bg: '#4A07C2', accent: '#FFD166' },
  monsoon: { bg: '#3B1CA8', accent: '#9AD7FF' },
  winter: { bg: '#4B14B8', accent: '#D6E0FF' },
};

// kept across tab switches (Home is rebuilt when you come back from another tab) so the list opens where you left it
let homeY = 0, skeletonDone = false, promoShown = false;

/* ---------- small shared helpers ---------- */
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
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: EASE, useNativeDriver: ND }));
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
/** "◆ Title ◆" section title with the sub line under it (Pronto's Festive Packs heading) */
function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: SIDE }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: L.accent, fontSize: 10 }}>◆</Text>
        <Txt weight={500} size={18} color={L.ink} style={{ lineHeight: 24 }}>{title}</Txt>
        <Text style={{ color: L.accent, fontSize: 10 }}>◆</Text>
      </View>
      {sub ? <Txt size={13} color={L.mut} style={{ lineHeight: 18, marginTop: 2, textAlign: 'center' }}>{sub}</Txt> : null}
    </View>
  );
}

/* ---------- header: address switcher, wallet, gift chip, avatar. Transparent over the hero, white once you scroll ---------- */
function HeaderContent({ dark }: { dark: boolean }) {
  const a = selectedAddress(), bal = (() => { try { return wallet().balance } catch (e) { return 0 } })();
  const fg = dark ? L.ink : '#fff', sub = dark ? L.mut : 'rgba(255,255,255,.78)', btnBg = dark ? L.raised : 'rgba(255,255,255,.16)';
  const btn = { width: 40, height: 40, borderRadius: 20, backgroundColor: btnBg, alignItems: 'center' as const, justifyContent: 'center' as const };
  const place = a ? (a.area || '').split(',')[0] || a.street : 'Add your parking address';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIDE, height: 56 }}>
      <Pressable style={{ flex: 1, minWidth: 0, paddingRight: 8 }} onPress={() => openAddressPicker()} accessibilityRole="button" accessibilityLabel="Change service location" hitSlop={6}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt weight={500} size={18} color={fg} numberOfLines={1} style={{ lineHeight: 24, flexShrink: 1 }}>{a ? addrName(a) : 'Select location'}</Txt>
          <View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={16} color={fg} strokeWidth={1.8} /></View>
        </View>
        <Txt size={12} color={sub} numberOfLines={1} style={{ lineHeight: 16 }}>{place}</Txt>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable3 label={`WD Money, balance ${inr(bal)}`} onPress={() => go('money')}><View style={btn}><Wallet size={18} color={fg} strokeWidth={1.5} /></View></Pressable3>
        <Pressable3 label={`Refer a friend and earn ${inr(homeConfig().referBanner)}`} onPress={() => openPage({ k: 'refer' })}>
          <View style={{ height: 40, borderRadius: 20, backgroundColor: dark ? L.tint : '#fff', paddingLeft: 6, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD166', alignItems: 'center', justifyContent: 'center' }}><Gift size={16} color="#5A3A00" strokeWidth={1.6} /></View>
            <Txt weight={500} size={13} color={L.accent} style={TNUM}>{inr(homeConfig().referBanner)}</Txt>
          </View>
        </Pressable3>
        <Pressable3 label="Your profile" onPress={() => openPage({ k: 'profile' })}><View style={btn}><User size={18} color={fg} strokeWidth={1.5} /></View></Pressable3>
      </View>
    </View>
  );
}
function Header({ y }: { y: Animated.Value }) {
  const ins = useInsets(), top = Math.max(ins.top, 24), [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const id = y.addListener(({ value }) => setScrolled(s => (s !== value > 70 ? value > 70 : s)));
    return () => y.removeListener(id);
  }, []);
  const bg = y.interpolate({ inputRange: [20, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const light = y.interpolate({ inputRange: [30, 90], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 30, paddingTop: top }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#fff', opacity: bg, borderBottomWidth: 1, borderBottomColor: L.line }} />
      <Animated.View pointerEvents={scrolled ? 'none' : 'auto'} style={{ opacity: light }}><HeaderContent dark={false} /></Animated.View>
      <Animated.View pointerEvents={scrolled ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, right: 0, top: top, opacity: bg }}><HeaderContent dark /></Animated.View>
    </View>
  );
}

/* ---------- hero: seasonal banner with animated headline (remote config) ---------- */
function HeroText({ title, sub, accent }: { title: string; sub: string; accent: string }) {
  const rm = useReduceMotion(), words = title.split(' ').filter(Boolean);
  const vals = useRef<Animated.Value[]>([]).current;
  while (vals.length < words.length) vals.push(new Animated.Value(rm ? 1 : 0));
  const subV = useRef(new Animated.Value(rm ? 1 : 0)).current, shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (rm) { vals.forEach(v => v.setValue(1)); subV.setValue(1); return; }
    const reveal = Animated.parallel([
      Animated.stagger(110, vals.slice(0, words.length).map(v => Animated.timing(v, { toValue: 1, duration: 520, easing: EASE, useNativeDriver: ND }))),
      Animated.timing(subV, { toValue: 1, duration: 520, delay: words.length * 110, easing: EASE, useNativeDriver: ND }),
    ]);
    const out = Animated.parallel([...vals.slice(0, words.length).map(v => Animated.timing(v, { toValue: 0, duration: 420, easing: EASE, useNativeDriver: ND })), Animated.timing(subV, { toValue: 0, duration: 420, easing: EASE, useNativeDriver: ND })]);
    const loop = Animated.loop(Animated.sequence([reveal, Animated.delay(5200), out, Animated.delay(250)]));
    loop.start();
    const sh = Animated.loop(Animated.sequence([Animated.timing(shine, { toValue: 1, duration: 1400, useNativeDriver: false }), Animated.timing(shine, { toValue: 0, duration: 1400, useNativeDriver: false })]));
    sh.start();
    return () => { loop.stop(); sh.stop() };
  }, [rm, title]);
  const last = words.length - 1;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {words.map((w, i) => (
          <Animated.Text key={i} style={{ fontFamily: 'Poppins_500Medium', fontSize: 30, lineHeight: 38, marginRight: 8, color: i === last ? accent : '#fff', opacity: vals[i], transform: [{ translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{w}</Animated.Text>
        ))}
      </View>
      <Animated.Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,.85)', marginTop: 8, opacity: subV, transform: [{ translateY: subV.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{sub}</Animated.Text>
    </View>
  );
}
function Hero({ W }: { W: number }) {
  const ins = useInsets(), cfg = homeConfig(), th = HERO[cfg.heroTheme] || HERO.default, top = Math.max(ins.top, 24) + 56;
  const dots = [[0.62, 40, 90, 0.10], [0.82, 130, 60, 0.12], [0.5, 190, 40, 0.08], [0.7, 215, 24, 0.12], [0.08, 215, 56, 0.07]];
  return (
    <View style={{ backgroundColor: th.bg, paddingTop: top + 4, paddingBottom: 76, paddingHorizontal: SIDE, overflow: 'hidden' }}>
      {dots.map(([x, yy, s, o], i) => <View key={i} style={{ position: 'absolute', left: (x as number) * W - (s as number) / 2, top: top + (yy as number) - 40, width: s as number, height: s as number, borderRadius: (s as number) / 2, backgroundColor: '#fff', opacity: o as number }} />)}
      <Image source={IMG['r3d-pack-exclusive']} resizeMode="contain" style={{ position: 'absolute', right: -6, bottom: 40, width: 150, height: 150, opacity: 0.98 }} />
      <View style={{ maxWidth: Math.min(W * 0.62, 280), minHeight: 112 }}>
        <HeroText title={cfg.heroTitle} sub={cfg.heroSub} accent={th.accent} />
      </View>
    </View>
  );
}

/* ---------- Instant / Schedule cards ---------- */
function Entry({ onInstant }: { onInstant: () => void }) {
  const st = instantStatus(), idle = !st.open;
  return (
    <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE, marginTop: -56 }}>
      <View style={{ flex: 1 }}>
        <Pressable3 label={'Get instant service. ' + st.label} onPress={() => { if (st.open) onInstant(); else toast(st.reason === 'busy' ? st.label : 'Instant service is closed. ' + st.label + ' or schedule for later') }}
          style={{ height: 112, borderRadius: 16, backgroundColor: idle ? '#FAFAFB' : '#fff', borderWidth: 1, borderColor: L.line, padding: 14, justifyContent: 'space-between', ...shadow }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: idle ? L.raised : L.tint, alignItems: 'center', justifyContent: 'center' }}><Zap size={20} color={idle ? '#A3A3A3' : L.accent} strokeWidth={1.6} /></View>
          <View>
            <Txt weight={500} size={15} color={idle ? L.mut : L.ink} style={{ lineHeight: 20 }}>Get Instant Service</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {st.open ? <Pulse color={L.pos} size={6} /> : null}
              <Txt size={12} color={st.open ? L.pos : L.mut} numberOfLines={idle && st.reason === 'busy' ? 2 : 1} style={{ lineHeight: 16, flexShrink: 1 }}>{st.label}</Txt>
            </View>
          </View>
        </Pressable3>
      </View>
      <View style={{ flex: 1 }}>
        <Pressable3 label="Schedule for later. Pick a slot" onPress={() => openPage({ k: 'schedule' })} style={{ height: 112, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, padding: 14, justifyContent: 'space-between', ...shadow }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: L.tint, alignItems: 'center', justifyContent: 'center' }}><Calendar size={20} color={L.accent} strokeWidth={1.6} /></View>
          <View>
            <Txt weight={500} size={15} color={L.ink} style={{ lineHeight: 20 }}>Schedule for Later</Txt>
            <View style={{ alignSelf: 'flex-start', marginTop: 2, backgroundColor: L.tint, borderRadius: 6, paddingHorizontal: 8, height: 20, justifyContent: 'center' }}><Txt weight={500} size={11} color={L.accent} style={{ lineHeight: 14 }}>Pick a slot</Txt></View>
          </View>
        </Pressable3>
      </View>
    </View>
  );
}

/* ---------- offer packs ---------- */
function PackCard({ id }: { id: string }) {
  const p = packInfo(id)!, q = svcQty(id), isNew = p.isNew;
  return (
    <View style={{ width: 168 }}>
      <Pressable3 label={p.name} onPress={() => openPage({ k: 'svc', id })}>
        <View style={{ width: 168, height: 124, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3EEFD' }}>
          <Image source={(IMG as any)[p.img]} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ position: 'absolute', left: 0, top: 8, backgroundColor: isNew ? '#E5484D' : L.accent, borderTopRightRadius: 6, borderBottomRightRadius: 6, paddingHorizontal: 8, height: 20, justifyContent: 'center' }}><Txt weight={500} size={10} color="#fff" style={{ lineHeight: 14, letterSpacing: 0.6 }}>{isNew ? 'NEW' : p.tag}</Txt></View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 20 }}>
          <Txt weight={500} size={16} color={L.ink} style={TNUM}>{inr(p.price)}</Txt>
          {p.mrp > p.price ? <Txt size={12} color={L.mut} style={{ textDecorationLine: 'line-through', ...TNUM }}>{inr(p.mrp)}</Txt> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><Clock size={12} color={L.mut} strokeWidth={1.5} /><Txt size={12} color={L.mut} style={{ lineHeight: 16 }}>{p.mins >= 60 ? (p.mins / 60) + (p.mins === 60 ? ' hour' : ' hours') : p.mins + ' mins'}</Txt></View>
        <Txt weight={500} size={14} color={L.ink} numberOfLines={1} style={{ marginTop: 4, lineHeight: 20 }}>{p.name}</Txt>
      </Pressable3>
      <View style={{ position: 'absolute', right: 8, top: 124 - 17 }}><AddButton variant="add" qty={q} onAdd={() => act.addSvc(id)} onSub={() => act.subSvc(id)} /></View>
    </View>
  );
}
function Packs({ skel }: { skel: boolean }) {
  return (
    <View style={{ marginTop: 32 }}>
      <Title title="Wash packs" sub="Pressure wash, foam and more at your parking spot" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingBottom: 4 }}>
        {skel ? PACKS.map(p => <View key={p.id} style={{ width: 168 }}><Shimmer width={168} height={124} radius={14} /><Shimmer width={90} height={16} style={{ marginTop: 20 }} /><Shimmer width={120} height={14} style={{ marginTop: 8 }} /></View>)
          : PACKS.map((p, i) => <FadeUp key={p.id} delay={Math.min(i, 5) * 50} distance={8} duration={300}><PackCard id={p.id} /></FadeUp>)}
      </ScrollView>
    </View>
  );
}

/* ---------- referral banner + more rows ---------- */
function Refer() {
  const amt = homeConfig().referBanner;
  return (
    <View style={{ marginHorizontal: SIDE, marginTop: 32 }}>
      <Pressable3 label={`Refer a friend and earn ${amt} rupees`} onPress={() => openPage({ k: 'refer' })} style={{ minHeight: 84, borderRadius: 16, backgroundColor: L.accent, paddingLeft: 16, paddingRight: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -20, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.10)' }} />
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={16} color="#fff" style={{ lineHeight: 22 }}>Refer a friend and earn <Txt weight={500} size={16} color="#FFD166" style={TNUM}>{inr(amt)}</Txt></Txt>
          <Txt size={12} color="rgba(255,255,255,.82)" style={{ lineHeight: 16, marginTop: 2 }}>They get {inr(REFERRAL.friendGets)} on their first wash</Txt>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFD166', alignItems: 'center', justifyContent: 'center' }}><Gift size={22} color="#5A3A00" strokeWidth={1.6} /></View>
      </Pressable3>
      <Pressable onPress={() => openSheet(<><SheetTitle>Refer and earn: T&amp;C</SheetTitle><View style={{ gap: 12, marginTop: 8 }}>{REFERRAL.tnc.map((t, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}><Txt size={14} color={L.mut}>{i + 1}.</Txt><Txt size={14} color={L.sec} style={{ flex: 1, lineHeight: 20 }}>{t}</Txt></View>)}</View></>)} hitSlop={10} style={{ alignSelf: 'flex-end', marginTop: 8 }} accessibilityRole="button" accessibilityLabel="Referral terms and conditions">
        <Txt size={12} color={L.mut} style={{ textDecorationLine: 'underline' }}>T&amp;C apply</Txt>
      </Pressable>
    </View>
  );
}
function More() {
  const row = (icon: ReactNode, title: string, sub: string, onPress: () => void) => (
    <View style={{ flex: 1, minWidth: 0 }}><Pressable3 label={title} onPress={onPress} style={{ minHeight: 72, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: L.raised, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}><Txt weight={500} size={14} color={L.ink} numberOfLines={1} style={{ lineHeight: 20 }}>{title}</Txt><Txt size={12} color={L.mut} numberOfLines={1} style={{ lineHeight: 16 }}>{sub}</Txt></View>
    </Pressable3></View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE, marginTop: 12 }}>
      {row(<PlanIc size={18} color={L.sec} strokeWidth={1.5} />, 'Monthly plans', 'Daily wash', () => go('plan'))}
      {row(<StoreIc size={18} color={L.sec} strokeWidth={1.5} />, 'Car store', 'Care and gadgets', () => go('store'))}
    </View>
  );
}

/* ---------- service grid ---------- */
const CATS = ['All', 'Exterior', 'Interior', 'Care'] as const;
function SvcTile({ s, w }: { s: (typeof CAR_SERVICES)[number]; w: number }) {
  const q = svcQty(s.id), iw = w - 2 - 16, off = s.mrp > s.price ? Math.round((1 - s.price / s.mrp) * 100) : 0;
  return (
    <View style={{ width: w }}>
      <Pressable3 label={s.name} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ minHeight: 188, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, padding: 8, overflow: 'hidden' }}>
        <View style={{ width: iw, height: iw, borderRadius: 8, overflow: 'hidden', backgroundColor: s.tint || L.raised }}>
          <Image source={(IMG as any)[s.img]} resizeMode={String(s.img).startsWith('r3d') ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} />
          {SHOW_RATINGS ? (
            <View style={{ position: 'absolute', top: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 4, height: 20 }}>
              <Star size={12} color={L.mut} strokeWidth={1.5} /><Txt size={12} color={L.sec} style={{ lineHeight: 16 }}>{s.rating.toFixed(1) + ' (' + s.count + ')'}</Txt>
            </View>
          ) : off ? <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: L.accent, borderBottomRightRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Txt weight={500} size={10} color="#fff" style={{ lineHeight: 14 }}>{off}% OFF</Txt></View> : null}
        </View>
        <Txt size={13} color={L.ink} numberOfLines={2} style={{ lineHeight: 18, height: 36, marginTop: 8 }}>{s.short}</Txt>
        <Text style={{ marginTop: 2 }}><Txt weight={500} size={13} color={L.ink} style={TNUM}>{inr(s.price)}</Txt><Txt size={12} color={L.mut} style={{ textDecorationLine: 'line-through', ...TNUM }}>{'  ' + inr(s.mrp)}</Txt></Text>
        <Txt size={11} color={L.mut} style={{ lineHeight: 15 }}>{s.mins} mins</Txt>
      </Pressable3>
      <View style={{ position: 'absolute', right: 12, top: 8 + iw - 30 }}><AddButton qty={q} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
    </View>
  );
}
function Grid({ W, skel, onLayoutY }: { W: number; skel: boolean; onLayoutY: (y: number) => void }) {
  const w = Math.floor((W - SIDE * 2 - GAP * 2) / 3), [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const list = CAR_SERVICES.filter(s => cat === 'All' || s.cat === cat);
  return (
    <View style={{ marginTop: 32 }} onLayout={e => onLayoutY(e.nativeEvent.layout.y)}>
      <View style={{ paddingHorizontal: SIDE }}><Head title="All car wash services" sub="Schedule & book for later" style={{ marginBottom: 0 }} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: SIDE, gap: 8 }}>
        {CATS.map(c => { const on = c === cat; return (
          <Pressable3 key={c} label={c} haptics={false} onPress={() => setCat(c)} style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: on ? L.accent : L.raised, justifyContent: 'center' }}>
            <Txt weight={on ? 500 : 400} size={13} color={on ? '#fff' : L.sec} style={{ lineHeight: 18 }}>{c}</Txt>
          </Pressable3>) })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIDE, marginTop: 16, columnGap: GAP, rowGap: GAP }}>
        {skel ? CAR_SERVICES.slice(0, 6).map(s => <View key={s.id} style={{ width: w }}><Shimmer width={w} height={w} radius={12} /><Shimmer width={w - 20} height={12} style={{ marginTop: 10 }} /><Shimmer width={50} height={12} style={{ marginTop: 8 }} /></View>)
          : list.map(s => <SvcTile key={s.id} s={s} w={w} />)}
      </View>
    </View>
  );
}

/* ---------- trust block (figures stay hidden until TRUST has real values) ---------- */
function Badge({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Laurel size={44} />
      <View style={{ alignItems: 'center', minWidth: 76 }}>
        <Txt weight={500} size={22} color={L.ink} style={{ lineHeight: 28, ...TNUM }}>{value}</Txt>
        <Txt size={11} color={L.mut} style={{ lineHeight: 14, textAlign: 'center' }}>{label}</Txt>
      </View>
      <Laurel size={44} flip />
    </View>
  );
}
function Trust({ W }: { W: number }) {
  const sw = Math.min(W, 520), cw = Math.min(250, W * 0.7), stats = !!(TRUST.cars || TRUST.rating);
  return (
    <View style={{ marginTop: 32, alignItems: 'center' }}>
      <Txt weight={500} size={20} color={L.ink} style={{ textAlign: 'center', lineHeight: 28, width: 260 }}>Your car is in professional hands</Txt>
      {stats ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {TRUST.cars ? <Badge label={TRUST.carsLabel} value={String(TRUST.cars)} /> : null}
          {TRUST.rating ? <Badge label={TRUST.ratingLabel} value={String(TRUST.rating)} /> : null}
        </View>
      ) : (
        <Txt size={13} color={L.mut} style={{ marginTop: 8, textAlign: 'center', width: 260, lineHeight: 18 }}>Verified washers from your own society, with photo proof after every wash</Txt>
      )}
      <View style={{ width: sw, height: 300, marginTop: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Skyline width={sw} height={240} /></View>
        <Image source={IMG.washerCut} resizeMode="contain" style={{ width: cw, height: cw / RATIO.washerCut }} />
      </View>
    </View>
  );
}

/* ---------- floating "washer assigned" mini card (only when the cart is empty) ---------- */
function Assigned({ bottom }: { bottom: number }) {
  let c: any, d: any, a: any, live = false, h: any;
  try { c = car(); d = doc(c); a = A(); live = !!activeStage(d); h = liveHead(c) } catch (e) { return null }
  const up = a.bookings.filter((b: any) => b.carId === c.id).slice(-1)[0], planned = !live && !up && d.status !== 'skipped', fin = d.status === 'done';
  if (!live && !up && !planned) return null;
  const w = h.washer;
  const title = live || fin ? (fin ? `${w} washed your ${c.name}` : h.big) : up ? `${w} is assigned to your booking` : `${w} is assigned to your wash`;
  const subTxt = live ? chipText(c, d) : fin ? h.big + ' · WD Wash' : up ? `${up.slot} · ${up.type}` : d.notStarted ? h.big : `Today, ${ampm(d.eta) || '6:30 am'} · WD Wash`;
  return (
    <Pressable3 label={title} onPress={() => go('live')} style={{ position: 'absolute', left: 12, right: 12, bottom, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: L.line, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
      <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: L.raised }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 52, height: 53, marginLeft: -4 }} /></View>
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
  const ref = useRef<any>(null), y = useRef(new Animated.Value(homeY)).current, gridY = useRef(0), cart = svcLines().count > 0;
  const [refreshing, setRefreshing] = useState(false), skel = useSkeleton(skeletonDone ? 0 : 450);
  useEffect(() => { skeletonDone = true }, []);
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  useEffect(() => { if (homeY > 0) { const t = setTimeout(() => ref.current?.scrollTo({ y: homeY, animated: false }), 0); return () => clearTimeout(t) } }, []);
  // WD Pass launch popup, once per app start, after the location loader has gone
  useEffect(() => {
    if (promoShown) return; promoShown = true;
    let on = true; const t = setTimeout(() => { try { if (on && homeConfig().passPromo && !activePass()) openPassPromo() } catch (e) {} }, loaderPending() ? 3400 : 1200);
    return () => { on = false; clearTimeout(t) };
  }, []);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: false, listener: (e: any) => { homeY = e.nativeEvent.contentOffset.y } });
  const barB = 56 + Math.max(ins.bottom, 0);
  const refresh = async () => { setRefreshing(true); try { await act.refresh() } catch (e: any) { toast(e?.message || 'Could not refresh') } setRefreshing(false) };
  return (
    <View style={{ flex: 1, backgroundColor: L.bg }}>
      <Animated.ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} bounces
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={'#fff'} colors={[L.accent]} progressViewOffset={Math.max(ins.top, 24) + 56} />}
        contentContainerStyle={{ paddingBottom: barB + 112 }}>
        <Hero W={W} />
        <Entry onInstant={() => { try { act.setCartMode('instant') } catch (e) {} ref.current?.scrollTo({ y: Math.max(0, gridY.current - 90), animated: true }) }} />
        <Packs skel={skel} />
        <Refer />
        <More />
        <Grid W={W} skel={skel} onLayoutY={v => { gridY.current = v }} />
        <Trust W={W} />
      </Animated.ScrollView>
      <Header y={y} />
      {cart ? <CartBar aboveTabs /> : <Assigned bottom={barB + 12} />}
    </View>
  );
}
