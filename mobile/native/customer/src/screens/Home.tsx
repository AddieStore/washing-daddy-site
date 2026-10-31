// Home tab: ticker, topbar, hello, the car hero, quick actions, banners, today's ritual, proof, streak, week, washer,
// photo wall, closer and the product rail. All data comes from state.ts.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, PanResponder, ScrollView, Text, AccessibilityInfo, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Text as SText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, SP, R, HIT, InkContext, Theme, violetInk, useTheme } from '../theme';
import { Txt, Em, Card, Block, Hard, Btn, Pill, IconBtn, Page, Topbar, Ticker, Ring, CountUp, Empty, Eyebrow, PAD } from '../ui/kit';
import { Bell, Sun, Moon, Auto, Book, Pause, Note, Warn, Heart, Camera, Swipe, Plus, Check } from '../ui/icons';
import { GhostCar, useUid } from '../ui/icons';
import { Art } from '../ui/art';
import { IMG, RATIO, src } from '../img';
import { PRODUCTS, SLIDES } from '../data/reference';
import { TODAY, fmt, ampm, addDays, parse, inr } from '../data/dates';
import { isPaused } from '../data/model';
import {
  useApp, S, A, car, doc, act, go, planOf, carImg, maskPlate, chipText, banners, todaySteps, calendar, week, greeting, homeRail, realAcct, pName, startTxt,
} from '../state';
import { sheets } from '../sheets';

/* ---------- small shared helpers (Live and TabBar import these) ---------- */
export function useReduceMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then(v => { if (on) setRm(v) }).catch(() => {}); return () => { on = false } }, []);
  return rm;
}
export const tsh = (T: Theme, c: string, d: number) => (T.day ? { textShadowColor: c, textShadowOffset: { width: d, height: d }, textShadowRadius: 0 } : {});
export const edgeOf = (T: Theme) => (T.day ? C.ink : 'rgba(255,246,233,.22)');
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
// section heading with something on the right (SecHead only takes a link)
export function Head({ title, gold, right, center, style }: { title: string; gold?: string; right?: ReactNode; center?: boolean; style?: any }) {
  const T = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: center ? 'center' : 'space-between', gap: 12, marginBottom: SP.l }, style]}>
      <Txt font="shout" size={center ? 40 : 30} upper style={[{ flexShrink: 1, textAlign: center ? 'center' : 'left' }, tsh(T, C.violetInk, 3)]}>
        {title}{gold ? <Text style={{ color: C.gold }}>{title ? ' ' : ''}{gold}</Text> : null}
      </Txt>
      {right}
    </View>
  );
}
export function LinkTxt({ label, onPress }: { label: string; onPress: () => void }) {
  const T = useTheme();
  return <Pressable onPress={onPress} hitSlop={14}><Txt weight={700} size={14} color={T.day ? C.gold : T.page.accent}>{label}</Txt></Pressable>;
}
// pops in (scale from 0) after a delay
function Pop({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: any }) {
  const rm = useReduceMotion(), v = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => { if (rm) { v.setValue(1); return } Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 140, useNativeDriver: true }).start() }, [rm]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/* ---------- hero marquee: outline text sliding left ---------- */
const MARQ = 'NO POCHA ONLY PRESSURE WASH';
function Marquee() {
  const rm = useReduceMotion(), [w, setW] = useState(0), x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w || rm) return;
    x.setValue(0);
    const l = Animated.loop(Animated.timing(x, { toValue: -w, duration: 26000, easing: Easing.linear, useNativeDriver: true }));
    l.start(); return () => l.stop();
  }, [w, rm]);
  const one = (k: number) => (
    <Svg key={k} width={w} height={170}>
      <SText x={0} y={128} fontFamily={F.shout} fontSize={150} fill="none" stroke="rgba(255,246,233,.2)" strokeWidth={1.5}>{MARQ}</SText>
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 30, right: 0 }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: 5000, opacity: 0 }}>
        <View style={{ alignSelf: 'flex-start' }} onLayout={e => setW(Math.ceil(e.nativeEvent.layout.width))}>
          <Txt font="shout" size={150} numberOfLines={1} style={{ paddingRight: 40 }}>{MARQ}</Txt>
        </View>
      </View>
      {w ? <Animated.View style={{ flexDirection: 'row', width: w * 2, transform: [{ translateX: x }] }}>{one(0)}{one(1)}</Animated.View> : null}
    </View>
  );
}

/* ---------- the car hero ---------- */
function Hero({ W }: { W: number }) {
  const T = useTheme(), ui = useApp(), rm = useReduceMotion(), id = useUid();
  const c = car(), d = doc(c), p = planOf(c), a = A(), carSrc = carImg(c), key = !c.photo && c.img ? c.img : null;
  const innerW = W - PAD * 2 - (T.day ? 24 : 0), carW = Math.min(innerW * 1.04, 460);
  const x = useRef(new Animated.Value(W * 1.1)).current, bob = useRef(new Animated.Value(0)).current, dir = useRef(1), busy = useRef(false);
  // drive in on mount and whenever the car changes
  useEffect(() => {
    busy.current = false;
    if (rm) { x.setValue(0); return }
    x.setValue(dir.current > 0 ? innerW * 1.1 : -innerW * 1.1);
    Animated.timing(x, { toValue: 0, duration: dir.current > 0 ? 1250 : 1000, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [ui.carNonce, rm]);
  useEffect(() => {
    if (rm) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -5, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [rm]);
  const sw = (dr: number) => {
    if (A().cars.length < 2 || busy.current) return;
    busy.current = true; dir.current = dr;
    if (rm) { act.switchCar(dr); return }
    Animated.timing(x, { toValue: -dr * innerW * 1.2, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => act.switchCar(dr));
  };
  const swRef = useRef(sw); swRef.current = sw;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 50) swRef.current(g.dx < 0 ? 1 : -1) },
  })).current;
  const multi = a.cars.length > 1, live = d.status === 'done' || d.status === 'washing';
  const glass = { backgroundColor: 'rgba(18,7,36,.45)', borderWidth: 1, borderColor: 'rgba(255,246,233,.16)' } as const;
  return (
    <Hard dx={8} dy={8} radius={28} color={T.shadow} reserve={false} style={{ marginHorizontal: PAD, marginBottom: 8 }}>
      <View {...pan.panHandlers} style={{ height: 400, borderRadius: 28, borderWidth: T.day ? 12 : 0, borderColor: C.gold, overflow: 'hidden', backgroundColor: C.violet }}>
        <InkContext.Provider value={violetInk}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs><RadialGradient id={id} cx="50%" cy="0%" rx="120%" ry="80%"><Stop offset="0" stopColor="#7a2cff" /><Stop offset="0.4" stopColor={C.violet} /><Stop offset="1" stopColor={C.violet2} /></RadialGradient></Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
          </Svg>
          <Marquee />
          <View pointerEvents="none" style={{ position: 'absolute', left: '-10%', right: '-10%', bottom: 86, height: 16, backgroundColor: C.gold, opacity: 0.95, transform: [{ rotate: '-3deg' }] }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: '10%', right: '10%', bottom: 80, height: 46, borderRadius: 999, backgroundColor: 'rgba(18,7,36,.3)' }} />
          <View pointerEvents="box-none" style={{ position: 'absolute', left: (innerW - carW) / 2, width: carW, bottom: 96 }}>
            <Animated.View pointerEvents="box-none" style={{ width: carW, transform: [{ translateX: x }] }}>
              <Animated.View pointerEvents="box-none" style={{ transform: [{ translateY: bob }] }}>
                {carSrc ? (
                  <Image source={src(carSrc)!} accessibilityLabel={`${c.make} ${c.name}`} resizeMode="contain" style={key ? { width: carW, height: carW / RATIO[key] } : { width: carW, height: 230 }} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <GhostCar width={carW} color="rgba(255,246,233,.55)" />
                    <Pressable onPress={() => { void act.carPhoto() }} style={{ position: 'absolute', top: -70, alignItems: 'center', gap: 4, maxWidth: '90%' }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}><Camera size={24} color={C.ink} /></View>
                      <Txt weight={700} size={15} color={C.cream}>Add your car's photo</Txt>
                      <Txt weight={500} size={12} color="rgba(255,246,233,.75)" style={{ textAlign: 'center' }}>Pick one from your gallery. We cut out the background.</Txt>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </View>
          <View style={{ position: 'absolute', top: SP.m, left: SP.m, right: SP.m, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <View style={[glass, { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 10, paddingRight: 12, borderRadius: 999 }]}>
              <Pulse color={live ? '#2EE6A6' : C.gold} still={!live} />
              <Txt weight={600} size={12.5} color={C.cream} style={{ flexShrink: 1, lineHeight: 17 }}>{chipText(c, d)}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {carSrc ? <Pressable accessibilityLabel="Change your car's photo" onPress={() => { void act.carPhoto() }} style={[glass, { width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center' }]}><Camera size={19} color={C.cream} /></Pressable> : null}
              {multi ? (
                <Pressable accessibilityLabel="Switch car" onPress={() => sw(1)} style={[glass, { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: HIT, paddingHorizontal: 14, borderRadius: 999 }]}>
                  {a.cars.map((_, i) => <View key={i} style={{ height: 6, width: i === S.carIdx ? 18 : 6, borderRadius: 3, backgroundColor: i === S.carIdx ? C.gold : 'rgba(255,246,233,.45)' }} />)}
                </Pressable>
              ) : null}
            </View>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: SP.card, right: SP.card, bottom: SP.card, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexShrink: 1 }}>
              <Txt font="hero" size={34} color={C.cream} style={{ textShadowColor: C.ink, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 }}>{c.name}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 }}><Txt weight={700} size={12} color={C.ink} style={{ letterSpacing: 1 }}>{maskPlate(c.plate)}</Txt></View>
                <View style={{ backgroundColor: C.gold, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}><Txt weight={700} size={12} color={C.ink}>{p.name}</Txt></View>
              </View>
            </View>
            {multi ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Swipe size={16} color="rgba(255,246,233,.7)" /><Txt size={11} color="rgba(255,246,233,.7)">Swipe car</Txt></View> : null}
          </View>
        </InkContext.Provider>
      </View>
    </Hard>
  );
}

/* ---------- quick actions ---------- */
function Quick() {
  const T = useTheme();
  const items: [ReactNode, string, () => void][] = [
    [<Book size={24} color={C.gold} />, 'Book a wash', () => sheets.book()],
    [<Pause size={24} color={C.sky} />, 'Pause washes', () => sheets.pause()],
    [<Note size={24} color={C.orange} />, 'Note for washer', () => sheets.note()],
    [<Warn size={24} color={C.red} />, 'Missed a spot', () => sheets.issue()],
  ];
  return (
    <View style={{ flexDirection: 'row', gap: SP.s, marginTop: SP.xl }}>
      {items.map(([ic, label, fn]) => (
        <Pressable key={label} onPress={fn} style={{ flex: 1, alignItems: 'center', gap: SP.s, minHeight: HIT }}>
          {({ pressed }) => (
            <>
              <Hard dx={3} dy={3} radius={30} color={T.day ? C.ink : null} style={{ transform: [{ translateX: pressed ? 3 : 0 }, { translateY: pressed ? 3 : 0 }] }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: T.day ? C.cream : 'rgba(255,255,255,.1)', borderWidth: T.day ? 3 : 1, borderColor: edgeOf(T), alignItems: 'center', justifyContent: 'center' }}>{ic}</View>
              </Hard>
              <Txt weight={T.day ? 700 : 600} size={12} color={T.day ? C.cream : T.page.fg2} style={{ textAlign: 'center', lineHeight: 16 }}>{label}</Txt>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- banners ---------- */
function Banners() {
  const T = useTheme(), list = banners();
  if (!list.length) return null;
  return (
    <View style={{ gap: SP.m, marginTop: SP.xl }}>
      {list.map((b, i) => (
        <Card key={i} pad={SP.m} style={{ marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: b.tint, alignItems: 'center', justifyContent: 'center' }}><Txt size={16}>{b.icon}</Txt></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={700} size={13.5}>{b.title}</Txt>
              <Txt size={12} color={T.card.fg3} numberOfLines={2}>{b.sub}</Txt>
            </View>
            <Pressable onPress={() => b.act()} style={{ backgroundColor: T.card.tile2, borderRadius: R.inner, minHeight: HIT, justifyContent: 'center', paddingHorizontal: 14 }}>
              <Txt weight={700} size={12} color={T.card.accent}>{b.btn}</Txt>
            </Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

/* ---------- today's wash ritual ---------- */
const Tick = ({ done, i, T }: { done: boolean; i: number; T: Theme }) => {
  const box = { width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
  return done
    ? <Pop delay={i * 160 + 200}><View style={[box, { backgroundColor: '#2EE6A6' }]}><Check size={14} color={C.ink} /></View></Pop>
    : <View style={[box, { borderWidth: 2, borderStyle: 'dashed', borderColor: T.block.fg3 }]} />;
};
function Ritual() {
  const T = useTheme(), ink = T.block, c = car(), d = doc(c);
  const Title = ({ children }: { children: string }) => <Txt weight={700} size={20} style={{ marginTop: 4 }}>{children}</Txt>;
  const Sub = ({ children }: { children: string }) => <Txt size={13} color={ink.fg2} style={{ marginTop: 2 }}>{children}</Txt>;
  const label = (big: ReactNode, small: string) => <View style={{ alignItems: 'center' }}>{big}<Txt size={9.5} upper color={ink.fg3} style={{ letterSpacing: 1, marginTop: 3 }}>{small}</Txt></View>;
  const steps = (st: [string, string, string, string | null | undefined][]) => (
    <View style={{ marginTop: 16 }}>
      {st.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <Tick done={s[2] === 'done'} i={i} T={T} />
          <View style={{ flex: 1 }}><Txt weight={600} size={14}>{s[0]}</Txt><Txt size={12} color={ink.fg3}>{s[1]}</Txt></View>
          {s[2] === 'done' && s[3] ? <Txt weight={600} size={12} color={ink.fg2}>{ampm(s[3]).replace(' AM', '')}</Txt> : null}
        </View>
      ))}
    </View>
  );
  let body: ReactNode;
  if (c.status === 'new') {
    body = <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring frac={0.05} size={86} color={C.gold}>{label(<Txt font="shout" size={26}>1</Txt>, 'day to go')}</Ring>
        <View style={{ flex: 1 }}><Eyebrow>Tomorrow</Eyebrow><Title>First wash, 6–7:30 AM</Title><Sub>{`${c.washer} will call before he comes and take your car's first photo.`}</Sub></View>
      </View>
      {steps([['Find your car', c.parking, 'later', null], ['Pressure wash and hand dry', 'About 12 minutes', 'later', null], ['Photo on WhatsApp', "So you know it's done", 'later', null]])}
    </>;
  } else if (isPaused(c, TODAY)) {
    body = <><Eyebrow>Today</Eyebrow><Title>Paused. Enjoy the trip.</Title><Sub>{`Washes start again on ${fmt(addDays(parse(c.paused!.to), 1), { weekday: 'long', day: 'numeric', month: 'short' })}.`}</Sub></>;
  } else if (d.notStarted) {
    body = <><Eyebrow>Today's wash</Eyebrow><Title>{startTxt(c)}</Title><Sub>{`${c.washer} washes your car here. Each step ticks off as it happens.`}</Sub></>;
  } else {
    const st = todaySteps(c), done = st.filter(s => s[2] === 'done').length, frac = done / st.length, w = d.washer?.name || c.washer;
    const head = d.status === 'done' ? ['Done before your chai.', `${w} finished at ${ampm(d.finished_at)} in ${d.minutes} minutes.`]
      : d.status === 'washing' ? ['Washing right now.', `${w} started at ${ampm(d.started_at)}. Watch it live.`]
      : d.status === 'skipped' ? ['No wash today.', d.skip_reason || ''] : [chipText(c, d) + '.', 'Each step ticks off here as it happens.'];
    body = <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring frac={frac} size={86} color={C.gold}>{label(<CountUp to={Math.round(frac * 100)} dur={1400} format={n => Math.round(n) + '%'} font="shout" size={26} />, 'of today')}</Ring>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{`Today's wash · ${fmt(TODAY, { weekday: 'short', day: 'numeric', month: 'short' })}`}</Eyebrow>
          <Title>{head[0]}</Title><Sub>{head[1]}</Sub>
        </View>
      </View>
      {steps(st)}
      {d.status !== 'done' ? <Btn label="Watch live" onPress={() => go('live')} style={{ marginTop: 12 }} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: ink.line }}>
          <Txt weight={600} size={13}>{c.rating ? 'Thanks for rating' : "How was today's wash?"}</Txt>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} hitSlop={4} onPress={() => act.rate(n)}>
                <Txt size={24} color={n <= c.rating ? C.gold : 'rgba(255,246,233,.3)'} style={{ lineHeight: 28 }}>{'★'}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </>;
  }
  return <Block pad={20} style={{ marginTop: SP.section }}>{body}</Block>;
}

/* ---------- proof of shine ---------- */
function Proof() {
  const T = useTheme(), c = car(), d = doc(c), real = realAcct();
  const ap = d.photos.find(p => p.kind === 'after');
  const none = <><Head title="Proof of shine" /><Empty title="Every morning, a photo" sub={real ? `${c.washer} sends a photo of your car the moment it's done.` : `${c.washer} sends a photo of your car the moment it's done. The first one lands tomorrow.`} /></>;
  let img: any = null, cover = false;
  if (real) { if (ap) img = typeof ap.src === 'string' ? src(ap.src) : ap.src }
  else if (c.status !== 'new' && c.img) { cover = c.img === 'scorpio'; img = cover ? IMG.proof : IMG[c.img] }
  if (!img) return <View style={{ marginTop: SP.section }}>{none}</View>;
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="Proof of shine" right={!real ? <LinkTxt label="Before / after" onPress={() => sheets.proof()} /> : undefined} />
      <Hard dx={10} dy={10} radius={22} color={T.day ? C.ink : null} style={{ transform: [{ rotate: '-1.5deg' }] }}>
        <Pressable accessibilityLabel="Open this morning's photo" onPress={() => sheets.proof()} style={{ aspectRatio: 4 / 3, borderRadius: 22, borderWidth: T.day ? 10 : 0, borderColor: C.cream, overflow: 'hidden', backgroundColor: '#000' }}>
          {!cover ? <LinearGradient colors={[C.violet, C.violetNight]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
          <Image source={img} resizeMode={cover ? 'cover' : 'contain'} style={[StyleSheet.absoluteFill, !cover && { margin: 20 }]} />
          <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: C.gold, borderRadius: 8, borderWidth: T.day ? 3 : 0, borderColor: C.ink, paddingVertical: 6, paddingHorizontal: 12, transform: [{ rotate: '-4deg' }] }}>
            <Txt font="shout" size={15} upper color={C.ink} style={{ letterSpacing: 0.9 }}>No pocha · Pressure wash</Txt>
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30, paddingBottom: 14, paddingHorizontal: 18, backgroundColor: 'rgba(10,3,24,.78)' }}>
            <Txt weight={700} size={15} color={C.cream}>{`Photo by ${c.washer} · ${ampm(d.finished_at)}`}</Txt>
            <Txt size={12} color="rgba(255,246,233,.8)">{c.parking}</Txt>
          </View>
        </Pressable>
      </Hard>
    </View>
  );
}

/* ---------- streak + calendar ---------- */
function Streak() {
  const T = useTheme(), ink = T.card, c = car(), cal = calendar(c);
  const legend = (bg: string | undefined, label: string, dashed?: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: bg, borderWidth: dashed ? 1 : 0, borderStyle: 'dashed', borderColor: ink.dash }} />
      <Txt size={11} color={ink.fg3}>{label}</Txt>
    </View>
  );
  return (
    <Card pad={18} style={{ marginTop: SP.section }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{cal.month}</Eyebrow>
          <Txt weight={700} size={15} style={{ marginTop: 4 }}>Mornings in a row</Txt>
          <Txt size={12} color={ink.fg3}>Pauses don't break your streak. Tap a day.</Txt>
        </View>
        <CountUp to={c.streak} dur={1200} font="shout" size={54} color={ink.accent} style={{ lineHeight: 50 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -3 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <View key={'h' + i} style={{ width: '14.2857%', paddingHorizontal: 3, paddingBottom: 6, alignItems: 'center' }}><Txt weight={600} size={10} color={ink.fg3}>{l}</Txt></View>)}
        {cal.cells.map((x, i) => {
          if (!x) return <View key={i} style={{ width: '14.2857%' }} />;
          const bg = x.washed ? (x.extra ? C.gold : C.violet) : x.paused ? 'transparent' : ink.tile2, fg = x.washed ? (x.extra ? C.ink : C.cream) : ink.fg3;
          const cell = (
            <View style={{ aspectRatio: 1, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: x.paused && !x.washed ? 1 : 0, borderStyle: 'dashed', borderColor: ink.dash }}>
              <Txt weight={600} size={11} color={fg}>{String(x.d)}</Txt>
              {x.today ? <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: -2, right: -2, bottom: -2, borderRadius: 11, borderWidth: 2, borderColor: C.orange }} /> : null}
            </View>
          );
          return <View key={i} style={{ width: '14.2857%', padding: 3 }}>{x.washed ? <Pressable accessibilityLabel={fmt(x.date, { day: 'numeric', month: 'long' })} onPress={() => sheets.day(x.date)}>{cell}</Pressable> : cell}</View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>{legend(C.violet, 'Washed')}{legend(C.gold, 'Washed + extra')}{legend(undefined, 'Paused', true)}</View>
    </Card>
  );
}

/* ---------- this week ---------- */
const KCOL: Record<string, string> = { foam: C.sky, int: C.orange, det: C.gold, tyre: C.mint };
function Week() {
  const T = useTheme(), wk = week();
  const dot = (col: string, l: string) => <Text><Text style={{ color: col }}>{'● '}</Text>{l}{'  '}</Text>;
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="This week" right={<Txt size={11} color={T.page.fg3} style={{ flexShrink: 1, textAlign: 'right' }}>{dot(C.sky, 'Foam')}{dot(C.orange, 'Interior')}{dot(C.mint, 'Tyre')}{dot(C.gold, 'Detail')}</Txt>} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {wk.map((w, i) => {
          const fg = w.today ? T.todayFg : T.card.fg, mute = w.today ? T.todayFg : T.card.fg3;
          return (
            <Hard key={i} dx={3} dy={3} radius={16} reserve={false} color={T.day ? (w.today ? C.ink : C.violetInk) : null} style={{ flex: 1, opacity: w.paused ? 0.45 : 1 }}>
              <View style={{ borderRadius: 16, paddingVertical: 10, alignItems: 'center', gap: 4, backgroundColor: w.today ? T.todayBg : T.cardBg, borderWidth: T.day ? 2.5 : 1, borderColor: w.today && !T.day ? 'transparent' : T.cardBorder }}>
                <Txt weight={600} size={10} upper color={mute} style={w.today ? { opacity: 0.65 } : undefined}>{w.label}</Txt>
                <Txt weight={700} size={16} color={fg}>{String(w.d)}</Txt>
                <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>{w.dots.map((k, j) => <View key={j} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: KCOL[k] }} />)}</View>
              </View>
            </Hard>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- your washer ---------- */
function Washer() {
  const c = car(), T = useTheme(), ink = T.block;
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="Your washer" />
      <Block pad={0} inner={{ flexDirection: 'row', alignItems: 'flex-end', gap: SP.l, paddingRight: SP.card }}>
        <View style={{ width: 96, height: 120, overflow: 'hidden' }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 118, height: 120, marginLeft: -11 }} /></View>
        <View style={{ flex: 1, paddingVertical: SP.card }}>
          <Txt weight={700} size={18}>{c.washer}</Txt>
          <Txt size={12} color={ink.fg2}>{c.status === 'new' ? '★ 4.9 · Starts with your car tomorrow' : `★ 4.9 · Has washed your ${c.name} ${c.washes} times`}</Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Pill gold label="Tip" icon={<Heart size={14} strokeWidth={2.4} />} onPress={() => sheets.tip()} style={{ marginRight: 3, marginBottom: 3 }} />
            <Pill label="Leave a note" icon={<Note size={14} strokeWidth={2.2} />} onPress={() => sheets.note()} style={{ marginRight: 3, marginBottom: 3 }} />
          </View>
        </View>
      </Block>
    </View>
  );
}

/* ---------- photo wall ---------- */
function Wall({ W }: { W: number }) {
  const T = useTheme(), pw = (W - PAD * 2 - 14) / 2;
  return (
    <View style={{ marginTop: 34, paddingTop: 34, paddingBottom: 10, borderTopWidth: 12, borderTopColor: C.gold, backgroundColor: C.violet }}>
      <View style={{ paddingHorizontal: PAD }}><Head center title="No pocha." gold="Only pressure wash." /></View>
      <Txt weight={500} size={15} color={C.cream} style={{ textAlign: 'center', alignSelf: 'center', maxWidth: 270, opacity: 0.92, marginTop: -4 }}>Real mornings from our rounds in Paschim Vihar. Foam first, then pressure rinse, then a clean cloth to dry.</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 14, paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 10 }}>
        {SLIDES.slice(0, 6).map((s, i) => (
          <View key={i} style={{ width: pw, transform: [{ rotate: i % 2 ? '1.6deg' : '-2deg' }] }}>
            <Hard dx={6} dy={6} radius={16} color={C.violetInk}>
              <View style={{ backgroundColor: C.cream, padding: 8, paddingBottom: 0, borderRadius: 16, borderWidth: 3, borderColor: C.ink }}>
                <Image source={IMG[s.img]} resizeMode="cover" style={{ width: pw - 28, height: (pw - 28) / 0.8, borderRadius: 9 }} />
                <View style={{ paddingTop: 8, paddingHorizontal: 3, paddingBottom: 10 }}>
                  <Txt font="shout" size={18} upper color={C.ink} style={{ letterSpacing: 0.4, lineHeight: 19 }}>{s.t}</Txt>
                  <Txt weight={600} size={12} color="#3B2C55" style={{ marginTop: 3 }}>{s.s}</Txt>
                </View>
              </View>
            </Hard>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- closer ---------- */
// RN has one text shadow, so the layered shadow is stacked copies of the text
function Layered({ size, children }: { size: number; children: (col?: string) => ReactNode }) {
  const lay: [string, number][] = [[C.violetInk, 12], [C.sky, 8], [C.orange, 4]];
  const st = { textAlign: 'center' as const, lineHeight: Math.round(size * 0.95) };
  return (
    <View>
      {lay.map(([col, o]) => <View key={o} pointerEvents="none" style={{ position: 'absolute', left: o, top: o, right: -o }}><Txt font="shout" size={size} upper color={col} style={st}>{children(col)}</Txt></View>)}
      <Txt font="shout" size={size} upper color={C.cream} style={st}>{children()}</Txt>
    </View>
  );
}
function Notch({ left }: { left: boolean }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: '50%', marginTop: -13, width: 14, height: 26, overflow: 'hidden' }, left ? { left: -3 } : { right: -3 }]}>
      <View style={{ position: 'absolute', top: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: C.violet, borderWidth: 3, borderColor: C.ink, ...(left ? { left: -12 } : { right: -12 }) }} />
    </View>
  );
}
function Closer() {
  return (
    <View style={{ marginTop: 34, paddingTop: 40, paddingBottom: 12, paddingHorizontal: PAD, borderTopWidth: 12, borderTopColor: C.gold, alignItems: 'center' }}>
      <View style={{ transform: [{ rotate: '-3deg' }], alignSelf: 'stretch' }}>
        <Layered size={50}>{col => <>{'Still using pocha?\n'}<Text style={{ color: col ?? C.gold }}>Switch today.</Text></>}</Layered>
      </View>
      <Hard dx={8} dy={8} radius={22} color={C.violetInk} style={{ width: '100%', maxWidth: 300, marginTop: 38, marginBottom: 30, transform: [{ rotate: '3deg' }] }}>
        <View style={{ backgroundColor: C.gold, borderWidth: 3, borderColor: C.ink, borderRadius: 22, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 18 }}>
          <Notch left /><Notch left={false} />
          <Txt font="shout" size={17} upper color={C.violet} style={{ letterSpacing: 1 }}>Monthly plans from</Txt>
          <Txt font="shout" size={64} color={C.ink} style={{ lineHeight: 64, marginTop: 2 }}>{'₹999'}<Txt weight={800} size={17} color={C.ink}>/month</Txt></Txt>
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 3, borderStyle: 'dashed', borderTopColor: C.ink, gap: 6 }}>
            {['Pressure wash every day', 'Same washer every morning', 'Car never leaves its spot'].map(t => (
              <View key={t} style={{ flexDirection: 'row' }}><Txt weight={700} size={14.5} color={C.violet} style={{ marginRight: 8 }}>{'✔'}</Txt><Txt weight={700} size={14.5} color={C.ink} style={{ flex: 1 }}>{t}</Txt></View>
            ))}
          </View>
        </View>
      </Hard>
      <Btn label="Invite a neighbour · ₹200 off" full={false} style={{ alignSelf: 'center' }} onPress={() => { void act.copyRef() }} />
    </View>
  );
}

/* ---------- product rail ---------- */
function ProductCard({ p }: { p: (typeof PRODUCTS)[number] }) {
  const T = useTheme(), ink = T.card, c = car();
  return (
    <Card pad={10} style={{ width: 158 }} inner={{ borderRadius: 22 }} onPress={() => sheets.product(p.id)}>
      <View style={{ aspectRatio: 1, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={p.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {p.tag ? <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: C.ink, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 7, zIndex: 1 }}><Txt weight={800} size={10} upper color={C.gold} style={{ letterSpacing: 0.6 }}>{p.tag}</Txt></View> : null}
        <View style={{ zIndex: 1 }}><Art kind={p.art} c={p.c} size={100} /></View>
      </View>
      <Txt weight={600} size={13} style={{ marginTop: 10, lineHeight: 16, minHeight: 32 }} numberOfLines={2}>{pName(p)}</Txt>
      {p.fit ? <Txt weight={700} size={10.5} color={ink.ok} style={{ marginTop: 4 }}>{`● Fits your ${c.name}`}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 6 }}>
        <Text style={{ flexShrink: 1 }}><Txt weight={800} size={15}>{inr(p.price)}</Txt><Txt weight={500} size={11} color={ink.fg3} style={{ textDecorationLine: 'line-through' }}>{' ' + inr(p.mrp)}</Txt></Text>
        <Pressable accessibilityLabel={`Add ${p.name} to cart`} onPress={() => act.addToCart(p.id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.violet, borderWidth: T.day ? 2.5 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} color={C.cream} />
        </Pressable>
      </View>
    </Card>
  );
}
function Rail() {
  return (
    <View style={{ marginTop: SP.section }}>
      <View style={{ paddingHorizontal: PAD }}><Head title="Picked for your car" right={<LinkTxt label="Open store" onPress={() => go('store')} />} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 4, paddingBottom: 12, gap: 12, alignItems: 'flex-start' }}>
        {homeRail().map(p => <ProductCard key={p.id} p={p} />)}
      </ScrollView>
    </View>
  );
}

/* ---------- the screen ---------- */
const TICK = ['No more pocha', 'Only pressure wash', 'Monthly from ₹999', 'Car wash in 10 min', 'Paschim Vihar', 'Meera Bagh', 'Sundar Vihar'];
export default function Home() {
  const ui = useApp(), T = useTheme(), { width } = useWindowDimensions(), W = Math.min(width, 520);
  const ref = useRef<any>(null), [stuck, setStuck] = useState(false), name = A().name.split(' ')[0], hi = greeting();
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  const themeIco = S.theme === 'light' ? <Sun size={20} /> : S.theme === 'dark' ? <Moon size={20} /> : <Auto size={20} />;
  return (
    <Page {...({ ref } as any)} pad={0} top={0} bottom={120} stickyHeaderIndices={[1]} scrollEventThrottle={32}
      onScroll={(e: any) => { const s = e.nativeEvent.contentOffset.y > 40; if (s !== stuck) setStuck(s) }}>
      <Ticker items={TICK} />
      <Topbar
        left={<Image source={IMG.logo} resizeMode="contain" accessibilityLabel="Washing Daddy" style={{ width: 118, height: 118 * 157 / 260, transform: [{ rotate: '-4deg' }] }} />}
        title={stuck ? 'Home' : undefined}
        right={<>
          <IconBtn label="Switch day or night look" onPress={act.cycleTheme}>{themeIco}</IconBtn>
          <IconBtn label="Updates" dot={A().prefs.photo} onPress={() => sheets.notifs()}><Bell size={20} /></IconBtn>
        </>} />
      <View style={{ paddingTop: SP.xl, paddingBottom: SP.l + SP.s, paddingHorizontal: PAD }}>
        <Txt weight={600} size={20} color={T.page.fg} style={{ marginBottom: SP.hair }}>{hi}</Txt>
        <Txt font="shout" size={54} upper color={C.cream} style={[{ lineHeight: 50 }, tsh(T, C.violetInk, 4)]}>{name}, <Em>no more pocha!</Em></Txt>
      </View>
      <Hero W={W} />
      <View style={{ paddingHorizontal: PAD, paddingBottom: SP.s }}>
        <Quick />
        <Banners />
        <Ritual />
        <Proof />
        <Streak />
        <Week />
        <Washer />
      </View>
      {T.day ? <Wall W={W} /> : null}
      {T.day ? <Closer /> : null}
      <Rail />
    </Page>
  );
}
