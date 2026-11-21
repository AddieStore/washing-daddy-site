// Home tab (Pronto layout, Washing Daddy look): collapsing header over a violet hero with animated text, Instant / Schedule cards,
// offer packs carousel, referral banner, "All car wash services" 3-column grid, trust block, sticky mini-cart bar.
// Plan and Store are no longer tabs; two rows under the referral banner open them.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView, Text, RefreshControl, AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { C, SP, Theme, useTheme } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Footer } from '../ui/Footer';
import { Chev, User, Zap, Calendar, Wallet, Gift, Star, Plan as PlanIc, Store as StoreIc, Clock, Phone, WhatsApp, Info, Shield, Car as CarIc, Pin, Help as HelpIc, Cart as CartIc, Bell, Heart } from '../ui/icons';
// icon names a custom button may use (CONFIG-CONTRACT.md, ui_buttons.icon)
export const BTN_ICON: Record<string, (p: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement> = {
  gift: Gift, star: Star, zap: Zap, phone: Phone, whatsapp: WhatsApp, info: Info, shield: Shield, car: CarIc, wallet: Wallet, calendar: Calendar, pin: Pin, help: HelpIc, clock: Clock, cart: CartIc, bell: Bell, heart: Heart,
};
import { IMG, RATIO } from '../img';
import { CAR_SERVICES, PACKS, TRUST, SHOW_RATINGS, REFERRAL, packInfo, fromPrice } from '../data/reference';
import { GenericArt } from '../art/generic';
import { ampm } from '../data/dates';
import {
  useApp, A, car, doc, act, go, openPage, openSheet, toast, svcQty, svcLines, liveHead, activeStage, chipText,
  homeConfig, instantStatus, selectedAddress, addrName, wallet, activePass, REAL,
  appCfg, feature, section, uiButtons, serviceCats, unavailable, configLoading, UiButton, isGuest } from '../state';
import { Pressable3 as P3, FadeUp, AddButton, CartBar, Shimmer, useSkeleton, loaderPending, primerGate, setOrigin, SPRING, TAB_BAR_H } from '../ui/motion';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, withSequence, useReducedMotion, Easing as REasing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { SvcArt, PausedVeil } from '../pages/parts';
import { artFor, ArtBoundary } from '../art';
import { onGridJump } from './TabBar';
import { Laurel } from '../ui/art2';
import { SheetTitle, closeSheet } from '../ui/hosts';
import { openAddressPicker } from '../sheets/address';
import { openPassPromo } from '../sheets/money';
import { MiniMap, EtaChip, OfferCarousel, Offer } from '../ui/home';
import { HeroRide } from '../ui/heroRide';

// label -> accessibilityLabel, press scale 0.98
const Pressable3 = ({ label, ...p }: React.ComponentProps<typeof P3> & { label?: string }) => <P3 scaleTo={0.96} accessibilityRole="button" accessibilityLabel={label} {...p} />;

/* ---------- local tokens ---------- */
const L = { bg: '#FFFFFF', ink: '#141414', sec: '#55555C', mut: '#7A7A80', line: 'rgba(23,23,23,0.08)', raised: '#F4F4F5', accent: '#5409DA', pos: '#16a34a', tint: 'rgba(84,9,218,0.08)' };
const SIDE = 16, GAP = 12;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const ND = Platform.OS !== 'web';
const TNUM = { fontVariant: ['tabular-nums' as const] };
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const shadow = { shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 } as const;
const HERO: Record<string, { bg: [string, string, string]; accent: string }> = {
  default: { bg: ['#6A1BF2', '#5409DA', '#3A06A0'], accent: '#E3D3FF' },
  festive: { bg: ['#5E12EA', '#4A07C2', '#2A0577'], accent: '#FFD166' },
  monsoon: { bg: ['#4B2BC4', '#3B1CA8', '#24106E'], accent: '#9AD7FF' },
  winter: { bg: ['#5A22CC', '#4B14B8', '#2C0A78'], accent: '#D6E0FF' },
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
        <Txt weight={700} size={center ? 24 : 20} color={col} style={{ textAlign: center ? 'center' : 'left', lineHeight: center ? 32 : 26 }}>
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
    <View style={{ paddingHorizontal: SIDE }}>
      <Txt weight={700} size={20} color={L.ink} style={{ lineHeight: 26 }}>{title}</Txt>
      {sub ? <Txt size={13} color={L.mut} style={{ lineHeight: 18, marginTop: 2 }}>{sub}</Txt> : null}
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
        {feature('wallet') ? <Pressable3 label={`WD Money, balance ${inr(bal)}`} onPress={() => go('money')}><View style={btn}><Wallet size={18} color={fg} strokeWidth={1.5} /></View></Pressable3> : null}
        {feature('refer') ? <Pressable3 label={`Refer a friend and earn ${inr(homeConfig().referBanner)}`} onPress={() => openPage({ k: 'refer' })}>
          <View style={{ height: 40, borderRadius: 20, backgroundColor: dark ? L.tint : '#fff', paddingLeft: 6, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD166', alignItems: 'center', justifyContent: 'center' }}><Gift size={16} color="#5A3A00" strokeWidth={1.6} /></View>
            <Txt weight={500} size={13} color={L.accent} style={TNUM}>{inr(homeConfig().referBanner)}</Txt>
          </View>
        </Pressable3> : null}
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
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#F6F2FF', opacity: bg, borderBottomWidth: 1, borderBottomColor: L.line }} />
      <Animated.View pointerEvents={scrolled ? 'none' : 'auto'} style={{ opacity: light }}><HeaderContent dark /></Animated.View>
      <Animated.View pointerEvents={scrolled ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, right: 0, top: top, opacity: bg }}><HeaderContent dark /></Animated.View>
    </View>
  );
}

/* ---------- hero: seasonal banner, word-by-word spring reveal (loops every ~6s), floating art, scalloped bottom edge ---------- */
function Word({ w, i, on, color }: { w: string; i: number; on: boolean; color: string }) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? 1 : 0);
  useEffect(() => { v.value = rm ? 1 : on ? withDelay(i * 90, withSpring(1, { damping: 14, stiffness: 140 })) : withDelay(i * 40, withTiming(0, { duration: 260 })) }, [on, rm]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ translateY: (1 - v.value) * 22 }, { rotate: `${(1 - v.value) * 4}deg` }] }));
  return <Reanimated.Text style={[{ fontFamily: 'Poppins_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.9, marginRight: 7, color }, st]}>{w}</Reanimated.Text>;
}
function HeroText({ title, sub, accent }: { title: string; sub: string; accent: string }) {
  const rm = useReducedMotion(), words = title.split(' ').filter(Boolean), [on, setOn] = useState(true);
  useEffect(() => {
    if (rm) return;
    let t: any; const cycle = (show: boolean) => { t = setTimeout(() => { setOn(show); cycle(!show) }, show ? 500 : 6200) };
    cycle(false); return () => clearTimeout(t);
  }, [rm, title]);
  const sv = useSharedValue(rm ? 1 : 0);
  useEffect(() => { sv.value = rm ? 1 : on ? withDelay(words.length * 90 + 120, withTiming(1, { duration: 420, easing: REasing.bezier(0.22, 1, 0.36, 1) })) : withTiming(0, { duration: 220 }) }, [on, rm]);
  const subSt = useAnimatedStyle(() => ({ opacity: sv.value, transform: [{ translateY: (1 - sv.value) * 8 }] }));
  const last = words.length - 1;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={title + '. ' + sub}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{words.map((w, i) => <Word key={i + w} w={w} i={i} on={on} color={i === last ? accent : L.ink} />)}</View>
      {sub ? <Reanimated.Text style={[{ fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 20, color: L.mut, marginTop: 4 }, subSt]}>{sub}</Reanimated.Text> : null}
    </View>
  );
}
function Float({ children, style }: { children: ReactNode; style?: any }) {
  const rm = useReducedMotion(), v = useSharedValue(0), e = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (rm) return; e.value = withDelay(250, withSpring(1, { damping: 12, stiffness: 90 })); v.value = withRepeat(withTiming(1, { duration: 2600, easing: REasing.inOut(REasing.sin) }), -1, true) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: e.value, transform: [{ translateY: -8 * v.value + (1 - e.value) * 40 }, { rotate: `${-2 + 4 * v.value}deg` }, { scale: 0.8 + 0.2 * e.value }] }));
  return <Reanimated.View pointerEvents="none" style={[style, st]}>{children}</Reanimated.View>;
}
function Scallop({ W, color = '#fff' }: { W: number; color?: string }) {
  const n = Math.round(W / 22), r = W / n / 2;
  let d = `M0 14 `; for (let i = 0; i < n; i++) d += `A${r} ${r * 0.62} 0 0 1 ${(i + 1) * 2 * r} 14 `; d += `L${W} 20 L0 20 Z`;
  return <Svg width={W} height={20} style={{ position: 'absolute', left: 0, bottom: -1 }}><Path d={d} fill={color} /></Svg>;
}
function Live() {
  const rm = useReducedMotion(), p = useSharedValue(0);
  useEffect(() => { if (!rm) p.value = withRepeat(withTiming(1, { duration: 1400, easing: REasing.out(REasing.quad) }), -1, false) }, [rm]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 1 + 1.6 * p.value }] }));
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingLeft: 10, paddingRight: 12, borderRadius: 15, backgroundColor: '#17112A', marginTop: 12 }}>
      <View style={{ width: 8, height: 8 }}>
        <Reanimated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }, ring]} />
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
      </View>
      <Txt weight={600} size={12} color="#fff" style={{ lineHeight: 16 }}>Washers riding near you</Txt>
    </View>
  );
}
function Hero({ W, y }: { W: number; y: Animated.Value }) {
  const ins = useInsets(), cfg = homeConfig(), on = section('hero'), st = Math.max(ins.top, 24), aw = Math.min(W, 520);
  return (
    <View style={{ backgroundColor: '#F3EDFF', overflow: 'hidden', paddingTop: st + 56 }}>
      {/* light lavender field; pulling down stretches it so no gap shows */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -400, bottom: 0, transform: [{ translateY: y.interpolate({ inputRange: [-400, 0, 400], outputRange: [-60, 0, 120], extrapolate: 'clamp' }) }] }}>
        <LinearGradient colors={['#EDE4FF', '#F4EEFF', L.bg]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      </Animated.View>
      {on ? <>
        <View style={{ paddingHorizontal: SIDE, paddingTop: 4 }}>
          <HeroText title={cfg.heroTitle} sub={cfg.heroSub} accent={L.accent} />
          <Live />
        </View>
        <View style={{ marginTop: 4, marginBottom: 34 }}><HeroRide width={aw} /></View>
        {/* the road and city melt into white, so there is no edge above "Book a wash" */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#FFFFFF', '#FFFFFF']} locations={[0, 0.5, 0.75, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 }} />
      </> : <View style={{ height: 24 }} />}
    </View>
  );
}

/* ---------- Instant / Schedule cards: overlap the hero, big glyph bottom-right (Pronto) ---------- */
function Glyph({ kind, idle }: { kind: 'zap' | 'cal' | 'plan'; idle?: boolean }) {
  const a = idle ? '#C9C9D1' : '#7C3AED', b = idle ? '#A3A3AD' : '#4C0BC4', id = 'g' + kind + (idle ? 'i' : '');
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Defs><SvgLG id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></SvgLG></Defs>
      <SvgCircle cx={30} cy={30} r={24} fill={idle ? '#F1F1F4' : '#EFE7FF'} />
      {kind === 'zap'
        ? <Path d="M31 9 L15 32 h12 l-3 16 l17-24 h-12 z" fill={`url(#${id})`} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
        : kind === 'plan'
        ? <><Path d="M14 18 a4 4 0 0 1 4-4 h22 a4 4 0 0 1 4 4 v24 a4 4 0 0 1-4 4 H18 a4 4 0 0 1-4-4z" fill={`url(#${id})`} /><Path d="M14 23 h30" stroke="#fff" strokeWidth={2} /><Path d="M21 11 v6 M37 11 v6" stroke={b} strokeWidth={3} strokeLinecap="round" />
          <Path d="M29 27 l2.2 4.6 l5 .7 l-3.6 3.5 l.9 5 l-4.5-2.4 l-4.5 2.4 l.9-5 l-3.6-3.5 l5-.7z" fill="#FFD166" /></>
        : <><Path d="M14 18 a4 4 0 0 1 4-4 h22 a4 4 0 0 1 4 4 v24 a4 4 0 0 1-4 4 H18 a4 4 0 0 1-4-4z" fill={`url(#${id})`} /><Path d="M14 23 h30" stroke="#fff" strokeWidth={2} /><Path d="M21 11 v6 M37 11 v6" stroke={b} strokeWidth={3} strokeLinecap="round" />
          <Path d="M22 34 l5 5 l9-10" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></>}
    </Svg>
  );
}
// one row of the "Instant service" chooser; rows fade and rise in one after the other
function ChooseRow({ i, icon, title, sub, tag, dim, onPress }: { i: number; icon: ReactNode; title: string; sub: string; tag?: string; dim?: boolean; onPress: () => void }) {
  return (
    <FadeUp index={i + 1} distance={14}>
      <Pressable3 label={title + '. ' + sub} onPress={onPress} style={{ minHeight: 72, borderRadius: 16, backgroundColor: dim ? '#F7F7F8' : '#fff', borderWidth: 1, borderColor: dim ? L.line : 'rgba(84,9,218,0.22)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: dim ? '#EDEDF0' : L.tint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt weight={600} size={15} color={dim ? L.mut : L.ink} style={{ lineHeight: 20 }}>{title}</Txt>
            {tag ? <View style={{ backgroundColor: L.accent, borderRadius: 6, paddingHorizontal: 6, height: 18, justifyContent: 'center' }}><Txt weight={600} size={10} color="#fff" style={{ lineHeight: 14 }}>{tag}</Txt></View> : null}
          </View>
          <Txt size={12} color={L.mut} style={{ lineHeight: 16, marginTop: 2 }}>{sub}</Txt>
        </View>
        <Chev size={18} color={L.mut} strokeWidth={1.5} />
      </Pressable3>
    </FadeUp>
  );
}
function InstantChooser({ onNow, canNow, canLater }: { onNow: () => void; canNow: boolean; canLater: boolean }) {
  const st = instantStatus(), open = st.open;
  const later = () => { closeSheet(); try { act.setCartMode('scheduled') } catch (e: any) { toast(e?.message || 'Scheduling is not available right now'); return } openPage({ k: 'schedule' }) };
  const now = () => {
    if (!open) { toast(st.reason === 'busy' ? st.label : 'Instant service is closed. ' + st.label + (canLater ? ' Schedule for later instead' : '')); return }
    closeSheet(); onNow();
  };
  return (
    <View>
      <SheetTitle>Instant service</SheetTitle>
      <View style={{ gap: 10, marginTop: 8, paddingBottom: 8 }}>
        {canNow ? <ChooseRow i={0} dim={!open} icon={<Zap size={22} color={open ? L.accent : L.mut} strokeWidth={1.6} />} title="Now" sub={st.label} onPress={now} /> : null}
        {canLater ? <ChooseRow i={1} tag={!open ? 'Suggested' : undefined} icon={<Calendar size={22} color={L.accent} strokeWidth={1.6} />} title="Schedule for later" sub="Pick a day and a time slot" onPress={later} /> : null}
      </View>
    </View>
  );
}
function Entry({ onInstant }: { onInstant: () => void }) {
  const st = instantStatus(), idle = !st.open, showI = feature('instant'), showS = feature('scheduled'), showP = feature('plans');
  if (!section('instantCards') || (!showI && !showS && !showP)) return <View style={{ height: 8 }} />;
  const { width: SW } = useWindowDimensions(), mw = SW >= 380 ? 66 : 48;
  const box = { height: 128, borderRadius: 18, backgroundColor: '#fff', padding: 14, overflow: 'hidden' as const, borderWidth: 1, borderColor: '#ECE8F5', ...shadow, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } };
  const openChooser = () => openSheet(<InstantChooser onNow={onInstant} canNow={showI} canLater={showS} />);
  const TitleRow = ({ t, dim }: { t: string; dim?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Txt weight={600} size={17} color={dim ? L.mut : L.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ lineHeight: 22, flexShrink: 1 }}>{t}</Txt>
      <Chev size={16} color={dim ? L.mut : L.ink} strokeWidth={2} />
    </View>
  );
  return (
    <View style={{ marginTop: -6 }}>
      <Title title="Book a wash" />
      <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE, marginTop: 12 }}>
        {showI || showS ? <FadeUp index={0} style={{ flex: 1 }}>
          <Pressable3 label={'Instant service. Choose now or schedule for later. ' + st.label} onPress={openChooser} style={box}>
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: mw, opacity: idle ? 0.5 : 1 }}><MiniMap w={mw} h={128} radius={0} /></View>
            <EtaChip label={st.label} open={st.open} />
            <View style={{ flex: 1 }} />
            <View style={{ marginRight: mw - 14 }}><TitleRow t="Instant" dim={idle && !showS} /></View>
            <Txt size={12} color={L.mut} numberOfLines={1} style={{ lineHeight: 16, marginTop: 2, marginRight: mw - 10 }}>{st.open ? 'Now or later' : st.label}</Txt>
          </Pressable3>
        </FadeUp> : null}
        {showP ? <FadeUp index={1} style={{ flex: 1 }}>
          <Pressable3 label={`Monthly plans. Daily wash from ${inr(fromPrice())} a month`} onPress={() => go('plan')} style={box}>
            <View style={{ position: 'absolute', right: 6, top: 6, transform: [{ scale: 0.8 }] }}><Glyph kind="plan" /></View>
            <View style={{ alignSelf: 'flex-start', height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#FFF4D6', justifyContent: 'center' }}><Txt weight={600} size={11} color="#8A5A00">Daily wash</Txt></View>
            <View style={{ flex: 1 }} />
            <TitleRow t="Monthly" />
            <Txt size={12} color={L.mut} numberOfLines={1} style={{ lineHeight: 16, marginTop: 2 }}>from <Txt weight={600} size={12} color={L.ink} style={TNUM}>{inr(fromPrice())}</Txt>/month</Txt>
          </Pressable3>
        </FadeUp> : null}
      </View>
    </View>
  );
}

/* ---------- offer packs ---------- */
function PackCard({ id }: { id: string }) {
  const p = packInfo(id), q = svcQty(id), ref = useRef<any>(null);
  if (!p) return null;
  const isNew = p.isNew, paused = unavailable(id);
  return (
    <View style={{ width: 168 }}>
      <Pressable3 label={p.name} onPress={() => setOrigin(id, ref, () => openPage({ k: 'svc', id }))}>
        <View ref={ref} style={{ width: 168, height: 128, borderRadius: 18, overflow: 'hidden', backgroundColor: '#F1EBFD', alignItems: 'center', justifyContent: 'center' }}>
          <SvcArt id={id} size={120} />
          {paused ? <PausedVeil note={paused} /> : null}
        </View>
        {p.tag ? <View style={{ position: 'absolute', left: 0, top: 10, backgroundColor: isNew ? '#E5484D' : L.accent, borderTopRightRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 8, height: 20, justifyContent: 'center' }}><Txt weight={600} size={10} color="#fff" style={{ lineHeight: 14, letterSpacing: 0.6 }}>{isNew ? 'NEW' : p.tag}</Txt></View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 24 }}>
          <Txt weight={700} size={16} color={L.ink} style={TNUM}>{inr(p.price)}</Txt>
          {p.mrp > p.price ? <Txt size={12} color={L.mut} style={{ textDecorationLine: 'line-through', ...TNUM }}>{inr(p.mrp)}</Txt> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><Clock size={12} color={L.mut} strokeWidth={1.5} /><Txt size={12} color={L.mut} style={{ lineHeight: 16 }}>{p.mins >= 60 ? (p.mins / 60) + (p.mins === 60 ? ' hour' : ' hours') : p.mins + ' mins'}</Txt></View>
        <Txt weight={500} size={14} color={paused ? L.mut : L.ink} numberOfLines={1} style={{ marginTop: 4, lineHeight: 20 }}>{p.name}</Txt>
      </Pressable3>
      {paused ? null : <View style={{ position: 'absolute', right: 8, top: 128 - 17 }}><AddButton variant="add" id={id} qty={q} onAdd={() => act.addSvc(id)} onSub={() => act.subSvc(id)} /></View>}
    </View>
  );
}
function Packs({ skel }: { skel: boolean }) {
  if (!section('packs') || (!skel && !PACKS.length)) return null;
  const h = appCfg().home;
  return (
    <View style={{ marginTop: 32 }}>
      <Title title={h.packsTitle} sub={h.packsSub} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP, paddingBottom: 8 }}>
        {skel ? (PACKS.length ? PACKS : [{ id: 'a' }, { id: 'b' }, { id: 'c' }]).map(p => <View key={p.id} style={{ width: 168 }}><Shimmer width={168} height={128} radius={18} /><Shimmer width={90} height={16} style={{ marginTop: 24 }} /><Shimmer width={120} height={14} style={{ marginTop: 8 }} /></View>)
          : PACKS.map((p, i) => <FadeUp key={p.id} index={i + 2}><PackCard id={p.id} /></FadeUp>)}
      </ScrollView>
    </View>
  );
}

/* ---------- offer carousel: countdown card + dots ---------- */
function Offers() {
  const offers: Offer[] = [];
  const first = PACKS[0];
  if (section('packs') && first) offers.push({ key: 'packs', tag: 'WASH PACKS', countdown: false, title: 'Wash packs at your parking spot', sub: `${first.name} from ${inr(first.price || 0)}`, cta: 'See packs', colors: ['#6A1BF2', '#3A06A0'], art: <SvcArt id={first.id} size={96} />, onPress: () => openPage({ k: 'svc', id: first.id }) });
  try { if (homeConfig().passPromo && !activePass()) offers.push({ key: 'pass', tag: 'WD PASS', title: 'Get more washes for less', sub: 'A pass of visits, valid for days, saves on every wash', cta: 'View pass', colors: ['#2A0577', '#5409DA'], onPress: () => openPassPromo() }) } catch (e) {}
  if (feature('plans')) offers.push({ key: 'plan', tag: 'MONTHLY', title: 'A clean car every morning', sub: `Daily wash from ${inr(fromPrice())}/month`, cta: 'See plans', colors: ['#4B2BC4', '#24106E'], art: <View style={{ transform: [{ scale: 1.4 }], marginRight: 14 }}><Glyph kind="plan" /></View>, onPress: () => go('plan') });
  return <OfferCarousel offers={offers} />;
}

/* ---------- referral banner + more rows ---------- */
function Refer() {
  const amt = homeConfig().referBanner;
  if (!section('referBanner') || !feature('refer')) return null;
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
    <View style={{ flex: 1, minWidth: 0 }}><Pressable3 label={title} onPress={onPress} style={{ minHeight: 72, borderRadius: 16, backgroundColor: '#fff', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: L.tint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}><Txt weight={600} size={13} color={L.ink} numberOfLines={1} style={{ lineHeight: 18 }}>{title}</Txt><Txt size={12} color={L.mut} numberOfLines={1} style={{ lineHeight: 16 }}>{sub}</Txt></View>
    </Pressable3></View>
  );
  const plans = feature('plans'), store = feature('store');
  if (!section('more') || (!plans && !store)) return null;
  return (
    <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: SIDE, marginTop: 12 }}>
      {plans ? row(<PlanIc size={17} color={L.accent} strokeWidth={1.6} />, 'Monthly plans', 'Daily wash', () => go('plan')) : null}
      {store ? row(<StoreIc size={17} color={L.accent} strokeWidth={1.6} />, 'Car store', 'Care, gadgets', () => go('store')) : null}
    </View>
  );
}

/* ---------- service grid: exactly three per row, equal gutters, centred; every tile the same height ---------- */
const NAME_H = 36, PRICE_H = 18;
export const tileH = (w: number) => w + 8 + NAME_H + 2 + PRICE_H;
function SvcTile({ s: sv, w }: { s: (typeof CAR_SERVICES)[number]; w: number }) {
  const q = svcQty(sv.id), ref = useRef<any>(null), paused = unavailable(sv.id);
  return (
    <View style={{ width: w, height: tileH(w) }}>
      <Pressable3 label={`${sv.name}, ${inr(sv.price)}`} onPress={() => setOrigin(sv.id, ref, () => openPage({ k: 'svc', id: sv.id }))}>
        <View ref={ref} style={{ width: w, height: w, borderRadius: 16, overflow: 'hidden', backgroundColor: sv.tint || L.raised, alignItems: 'center', justifyContent: 'center' }}>
          <SvcArt id={sv.id} size={Math.round(w * 0.9)} />
          {sv.badge && !paused ? <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: String(sv.badge).toUpperCase() === 'NEW' ? '#E5484D' : L.accent, borderRadius: 6, paddingHorizontal: 5, height: 16, justifyContent: 'center' }}><Txt weight={600} size={9} color="#fff" style={{ lineHeight: 12, letterSpacing: 0.5 }}>{String(sv.badge).toUpperCase()}</Txt></View> : null}
          {paused ? <PausedVeil note={paused} compact /> : null}
          {SHOW_RATINGS && !sv.badge ? (
            <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,.92)', borderRadius: 8, paddingHorizontal: 5, height: 18 }}>
              <Star size={10} color="#F5A524" strokeWidth={1.5} /><Txt size={10} color={L.sec} style={{ lineHeight: 14 }}>{sv.rating.toFixed(1)}</Txt>
            </View>
          ) : null}
        </View>
        <Txt weight={500} size={13} color={paused ? L.mut : L.ink} numberOfLines={2} style={{ lineHeight: 18, height: NAME_H, marginTop: 8 }}>{sv.short}</Txt>
        <Text numberOfLines={1} style={{ marginTop: 2, height: PRICE_H }}><Txt weight={700} size={13} color={L.ink} style={TNUM}>{inr(sv.price)}</Txt><Txt size={11} color={L.mut} style={{ textDecorationLine: 'line-through', ...TNUM }}>{' ' + inr(sv.mrp)}</Txt></Text>
      </Pressable3>
      {paused ? null : <View style={{ position: 'absolute', right: 6, top: w - 36 }}><AddButton compact id={sv.id} qty={q} onAdd={() => act.addSvc(sv.id)} onSub={() => act.subSvc(sv.id)} /></View>}
    </View>
  );
}
function Grid({ W, skel, onLayoutY }: { W: number; skel: boolean; onLayoutY: (y: number) => void }) {
  // (W - 2*pad - 2*gap) / 3, floored; the remainder goes to the side padding so the three columns stay centred with equal gutters
  const w = Math.floor((W - SIDE * 2 - GAP * 2) / 3), side = (W - w * 3 - GAP * 2) / 2, [pick, setCat] = useState('All');
  const CATS = ['All', ...serviceCats()], cat = CATS.includes(pick) ? pick : 'All', h = appCfg().home;
  const list = CAR_SERVICES.filter(s => cat === 'All' || s.cat === cat);
  if (!section('services')) return <View onLayout={e => onLayoutY(e.nativeEvent.layout.y)} />;
  const empty = !skel && !CAR_SERVICES.length;
  return (
    <View style={{ marginTop: 32 }} onLayout={e => onLayoutY(e.nativeEvent.layout.y)}>
      <View style={{ paddingHorizontal: SIDE }}><Head title={h.servicesTitle} sub={h.servicesSub} style={{ marginBottom: 0 }} /></View>
      {empty ? (
        <View style={{ marginHorizontal: SIDE, marginTop: 16, borderRadius: 18, backgroundColor: '#F7F4FE', padding: 20, alignItems: 'center' }}>
          <GenericArt size={120} icon="sparkle" accent="#8B5CF6" />
          <Txt weight={600} size={15} color={L.ink} style={{ marginTop: 8, textAlign: 'center' }}>Services are on their way</Txt>
          <Txt size={13} color={L.mut} style={{ marginTop: 4, textAlign: 'center', lineHeight: 18 }}>We are setting up the services for your area. Pull down to refresh, or chat with us to book.</Txt>
          <Pressable onPress={() => act.whatsapp('Hi Washing Daddy, I want to book a wash.')} hitSlop={8} style={{ marginTop: 10 }}><Txt weight={600} size={14} color={L.accent}>Chat with us</Txt></Pressable>
        </View>
      ) : null}
      {empty || CATS.length < 3 ? null : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: SIDE, gap: 8 }}>
        {CATS.map(c => { const on = c === cat; return (
          <Pressable3 key={c} label={c} haptics={false} onPress={() => setCat(c)} style={{ height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: on ? L.accent : '#fff', borderWidth: 1, borderColor: on ? L.accent : 'rgba(23,23,23,0.10)', justifyContent: 'center' }}>
            <Txt weight={on ? 600 : 500} size={13} color={on ? '#fff' : L.sec} style={{ lineHeight: 18 }}>{c}</Txt>
          </Pressable3>) })}
      </ScrollView>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: side, marginTop: 16, columnGap: GAP, rowGap: 20 }}>
        {skel ? ['a', 'b', 'c', 'd', 'e', 'f'].map(k => ({ id: k })).map(s => <View key={s.id} style={{ width: w, height: tileH(w) }}><Shimmer width={w} height={w} radius={16} /><Shimmer width={w - 20} height={12} style={{ marginTop: 10 }} /><Shimmer width={50} height={12} style={{ marginTop: 8 }} /></View>)
          : list.map((s, i) => <FadeUp key={cat + s.id} index={i}><SvcTile s={s} w={w} /></FadeUp>)}
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
  const stats = !!(TRUST.cars || TRUST.rating), h = appCfg().home;
  if (!section('trust')) return null;
  return (
    <View style={{ marginTop: 32, alignItems: 'center' }}>
      <Txt weight={700} size={20} color={L.ink} style={{ textAlign: 'center', lineHeight: 26, width: 280 }}>{h.trustTitle}</Txt>
      {stats ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, backgroundColor: '#fff', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 8, ...shadow }}>
          {TRUST.cars ? <Badge label={TRUST.carsLabel} value={String(TRUST.cars)} /> : null}
          {TRUST.rating ? <Badge label={TRUST.ratingLabel} value={String(TRUST.rating)} /> : null}
        </View>
      ) : (
        h.trustSub ? <Txt size={13} color={L.mut} style={{ marginTop: 8, textAlign: 'center', width: 260, lineHeight: 18 }}>{h.trustSub}</Txt> : null
      )}
    </View>
  );
}

/* ---------- floating "washer assigned" mini card (only when the cart is empty) ---------- */
function Assigned() {
  if (isGuest()) return null;
  let c: any, d: any, a: any, live = false, h: any;
  try { c = car(); d = doc(c); a = A(); live = !!activeStage(d); h = liveHead(c) } catch (e) { return null }
  const up = a.bookings.filter((b: any) => b.carId === c.id).slice(-1)[0], fin = d.status === 'done';
  // a real account only shows a washer that a real wash record or booking names (no sample washer before the first wash)
  const planned = !live && !up && d.status !== 'skipped' && (!REAL || !!d.remote);
  if (REAL && !d.remote && !up) return null;
  if (!live && !up && !planned) return null;
  const w = h.washer;
  const title = live || fin ? (fin ? `${w} washed your ${c.name}` : h.big) : up ? `${w} is assigned to your booking` : `${w} is assigned to your wash`;
  const subTxt = live ? chipText(c, d) : fin ? h.big + ' · WD Wash' : up ? `${up.slot} · ${up.type}` : d.notStarted ? h.big : `Today, ${ampm(d.eta) || '6:30 am'} · WD Wash`;
  return (
    <FadeUp index={2} style={{ marginHorizontal: SIDE, marginTop: 16 }}><Pressable3 label={title} onPress={() => go('live')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 12, borderRadius: 18, backgroundColor: '#fff', ...shadow }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F2ECFF', alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={18} color={L.accent}>{(w || 'W').trim().charAt(0).toUpperCase()}</Txt></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={14} color={L.ink} numberOfLines={1} style={{ lineHeight: 20 }}>{title}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {live ? <Pulse color={L.pos} size={8} /> : null}
          <Txt size={13} color={L.sec} numberOfLines={1} style={{ flex: 1, lineHeight: 18 }}>{subTxt}</Txt>
        </View>
      </View>
      <Chev size={18} color={L.mut} strokeWidth={1.5} />
    </Pressable3></FadeUp>
  );
}

/* ---------- custom buttons and banners from the dashboard (ui_buttons) ---------- */
export function Buttons({ placement, side = SIDE, top = 16 }: { placement: string; side?: number; top?: number }) {
  const list = uiButtons(placement);
  if (!list.length) return null;
  return <View style={{ marginHorizontal: side, marginTop: top, gap: 12 }}>{list.map(b => <CustomButton key={b.id} b={b} />)}</View>;
}
function CustomButton({ b }: { b: UiButton }) {
  const Ic = BTN_ICON[b.icon] || Star, dim = b.paused;
  if (b.style === 'banner') return (
    <Pressable3 label={b.label} onPress={() => act.runButton(b)} style={{ minHeight: 76, borderRadius: 16, backgroundColor: dim ? '#C9C9D1' : b.tint, paddingLeft: 16, paddingRight: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -20, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.10)' }} />
      <View style={{ flex: 1 }}>
        <Txt weight={600} size={16} color="#fff" style={{ lineHeight: 22 }}>{b.label}</Txt>
        {b.sub || dim ? <Txt size={12} color="rgba(255,255,255,.85)" style={{ lineHeight: 16, marginTop: 2 }}>{dim ? 'Not available right now' : b.sub}</Txt> : null}
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dim ? '#E4E4E9' : '#FFD166', alignItems: 'center', justifyContent: 'center' }}><Ic size={22} color={dim ? '#737373' : '#5A3A00'} strokeWidth={1.6} /></View>
    </Pressable3>
  );
  return (
    <Pressable3 label={b.label} onPress={() => act.runButton(b)} style={{ minHeight: 64, borderRadius: 16, backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dim ? '#F0F0F3' : (/^#[0-9a-f]{6}$/i.test(b.tint) ? b.tint + '1F' : L.tint), alignItems: 'center', justifyContent: 'center' }}><Ic size={20} color={dim ? '#9A9AA3' : (/^#[0-9a-f]{6}$/i.test(b.tint) ? b.tint : L.accent)} strokeWidth={1.6} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={14} color={dim ? L.mut : L.ink} numberOfLines={1} style={{ lineHeight: 20 }}>{b.label}</Txt>
        {b.sub || dim ? <Txt size={12} color={L.mut} numberOfLines={2} style={{ lineHeight: 16 }}>{dim ? 'Not available right now' : b.sub}</Txt> : null}
      </View>
      <Chev size={18} color={L.mut} strokeWidth={1.5} />
    </Pressable3>
  );
}

/* ---------- the screen ---------- */
export default function Home() {
  const ui = useApp(), { width } = useWindowDimensions(), W = Math.min(width, 520), ins = useInsets();
  const ref = useRef<any>(null), y = useRef(new Animated.Value(homeY)).current, gridY = useRef(0), cart = svcLines().count > 0;
  const [refreshing, setRefreshing] = useState(false), skel0 = useSkeleton(skeletonDone ? 0 : 450), skel = skel0 || configLoading();
  useEffect(() => { skeletonDone = true }, []);
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  useEffect(() => { if (homeY > 0) { const t = setTimeout(() => ref.current?.scrollTo({ y: homeY, animated: false }), 0); return () => clearTimeout(t) } }, []);
  // WD Pass launch popup, once per app start, after the location loader has gone
  useEffect(() => {
    if (promoShown) return; promoShown = true;
    let on = true, t: any; const fire = () => { if (!on) return; if (primerGate.on) { t = setTimeout(fire, 1000); return } try { if (homeConfig().passPromo && !activePass()) openPassPromo() } catch (e) {} };
    t = setTimeout(fire, loaderPending() ? 3400 : 1200);   // held while the welcome primer is open, then 1s after it closes
    return () => { on = false; clearTimeout(t) };
  }, []);
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: false, listener: (e: any) => { homeY = e.nativeEvent.contentOffset.y } });
  const barB = TAB_BAR_H + Math.max(ins.bottom, 0);
  useEffect(() => { onGridJump(() => ref.current?.scrollTo({ y: Math.max(0, gridY.current - 90), animated: true })); return () => onGridJump(null) }, []);
  const refresh = async () => { setRefreshing(true); try { await act.refresh() } catch (e: any) { toast(e?.message || 'Could not refresh') } setRefreshing(false) };
  return (
    <View style={{ flex: 1, backgroundColor: L.bg, alignItems: 'center' }}>
      <Animated.ScrollView style={{ width: '100%', maxWidth: 520 }} ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} bounces
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={L.accent} colors={[L.accent]} progressViewOffset={Math.max(ins.top, 24) + 56} />}
        contentContainerStyle={{ paddingBottom: cart ? 64 : 0 }}>
        <Hero W={W} y={y} />
        <Entry onInstant={() => { try { act.setCartMode('instant') } catch (e) {} ref.current?.scrollTo({ y: Math.max(0, gridY.current - 90), animated: true }) }} />
        <Assigned />
        <Buttons placement="home_top" />
        <Packs skel={skel} />
        <Offers />
        <Buttons placement="home_mid" />
        <Refer />
        <More />
        <Grid W={W} skel={skel} onLayoutY={v => { gridY.current = v }} />
        <Buttons placement="home_bottom" />
        <Trust W={W} />
        <Footer bg={L.bg} />
      </Animated.ScrollView>
      <Header y={y} />
      {cart ? <CartBar aboveTabs /> : null}
    </View>
  );
}
