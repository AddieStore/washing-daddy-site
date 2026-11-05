// Home tab, Pronto layout: header (car + parking, offer chip, bell, avatar), referral banner, your car card, today's wash,
// "All car wash services" grid, proof, streak, week, washer, product rail, and the floating "washer assigned" mini card.
// All data comes from state.ts. Light surfaces are local so the screen does not depend on the page theme.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView, Text, AccessibilityInfo, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SP, HIT, InkContext, Theme, creamInk, useTheme } from '../theme';
import { Txt, Ring, CountUp, useInsets, PAD } from '../ui/kit';
import { Bell, Note, Heart, Camera, Plus, Check, User, Chev } from '../ui/icons';
import { Art } from '../ui/art';
import { Plate } from '../ui/Plate';
import { IMG, RATIO, src } from '../img';
import { PRODUCTS, SERVICES, fromPrice } from '../data/reference';
import { TODAY, fmt, ampm, addDays, parse, inr, iso } from '../data/dates';
import { isPaused, extras } from '../data/model';
import {
  useApp, S, A, car, doc, act, go, planOf, carImg, maskPlate, chipText, banners, todaySteps, calendar, greeting, homeRail, realAcct, pName, startTxt,
} from '../state';
import { sheets } from '../sheets';
import { CarStudio } from '../sheets/CarStudio';

/* ---------- Pronto light tokens (local) ---------- */
const L = {
  bg: '#FFFFFF', ink: C.ink, grey: '#6B6580', line: 'rgba(26,10,51,.09)', tint: '#F6F1FF', tint2: '#EFE8FD', violet: C.violet, deep: '#3A06A0', gold: C.gold, ok: '#0E9F6E',
};
const hair = { borderWidth: 1, borderColor: L.line } as const;

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
// pops in (scale from 0) after a delay
function Pop({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: any }) {
  const rm = useReduceMotion(), v = useRef(new Animated.Value(rm ? 1 : 0)).current;
  useEffect(() => { if (rm) { v.setValue(1); return } Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 140, useNativeDriver: true }).start() }, [rm]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/* ---------- local pieces (A's kit versions can replace these later) ---------- */
function Surf({ children, style, pad = 16, onPress }: { children?: ReactNode; style?: any; pad?: number; onPress?: () => void }) {
  const st = [{ backgroundColor: '#fff', borderRadius: 18, padding: pad, ...hair }, style];
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [...st, pressed && { opacity: 0.85 }]}>{children}</Pressable> : <View style={st}>{children}</View>;
}
function Chip({ label, icon, onPress, tone = 'tint' }: { label: string; icon?: ReactNode; onPress?: () => void; tone?: 'tint' | 'gold' }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tone === 'gold' ? '#FFF3CF' : L.tint2 }}>
      {icon}<Txt weight={600} size={13} color={tone === 'gold' ? '#7A5300' : L.violet}>{label}</Txt>
    </Pressable>
  );
}
const PlusBtn = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...hair }}>
    <Plus size={18} color={L.violet} strokeWidth={2.6} />
  </Pressable>
);
const Rate = ({ v = '4.9' }: { v?: string }) => (
  <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,.92)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
    <Text style={{ color: L.gold, fontSize: 10 }}>{'★'}</Text><Txt weight={600} size={10.5} color={L.ink}>{v}</Txt>
  </View>
);

/* ---------- header ---------- */
function Header({ stuck }: { stuck: boolean }) {
  const ins = useInsets(), c = car(), a = A();
  return (
    <View style={{ backgroundColor: '#fff', paddingTop: ins.top + SP.s, paddingBottom: SP.m, paddingHorizontal: PAD, borderBottomWidth: stuck ? 1 : 0, borderBottomColor: L.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => sheets.editDetail('parking')} accessibilityLabel="Change where your car is parked">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt weight={700} size={22} color={L.ink} style={{ lineHeight: 28 }}>Home</Txt>
            <View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={16} color={L.ink} /></View>
          </View>
          <Txt size={12} color={L.grey} numberOfLines={1}>{c.parking}</Txt>
        </Pressable>
        <Pressable accessibilityLabel="Invite a neighbour, 200 rupees off" onPress={() => { void act.copyRef() }} style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FFF3CF', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Heart size={15} color="#7A5300" strokeWidth={2.4} /><Txt weight={700} size={13} color="#7A5300">{'₹200'}</Txt>
        </Pressable>
        <Pressable accessibilityLabel="Updates" onPress={() => sheets.notifs()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: L.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={19} color={L.ink} />
          {a.prefs.photo ? <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: L.tint }} /> : null}
        </Pressable>
        <Pressable accessibilityLabel="Your profile" onPress={() => go('profile')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: L.ink, alignItems: 'center', justifyContent: 'center' }}>
          <User size={19} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* ---------- promo banner ---------- */
function Promo() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Refer a friend and earn 200 rupees" onPress={() => { void act.copyRef() }} style={{ marginHorizontal: PAD, marginTop: SP.s }}>
      <LinearGradient colors={['#3A06A0', '#5409DA', '#7B3BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, height: 84, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: 40, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.08)' }} />
        <View style={{ position: 'absolute', right: -20, bottom: -40, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,186,8,.18)' }} />
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={17} color="#fff" style={{ lineHeight: 22 }}>Refer a neighbour</Txt>
          <Txt weight={500} size={17} color="#fff" style={{ lineHeight: 22 }}>and get <Text style={{ fontFamily: 'Poppins_800ExtraBold', color: L.gold, fontSize: 21 }}>{'₹200'}</Text> off</Txt>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Chev size={15} color={L.deep} /></View>
      </LinearGradient>
    </Pressable>
  );
}

/* ---------- your car ---------- */
function CarCard({ W }: { W: number }) {
  const [studio, setStudio] = useState(false);
  const c = car(), d = doc(c), p = planOf(c), a = A(), carSrc = carImg(c), key = !c.photo && c.img ? c.img : null;
  const multi = a.cars.length > 1, live = d.status === 'done' || d.status === 'washing', iw = Math.min(W * 0.46, 190);
  return (
    <View style={{ marginHorizontal: PAD, marginTop: SP.l }}>
      <View style={{ backgroundColor: L.tint, borderRadius: 20, padding: SP.l, ...hair, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
            <Pulse color={live ? '#2EE6A6' : L.gold} still={!live} />
            <Txt weight={600} size={12} color={L.ink} style={{ flexShrink: 1 }} numberOfLines={2}>{chipText(c, d)}</Txt>
          </View>
          <View style={{ flex: 1 }} />
          {multi ? (
            <Pressable accessibilityLabel="Switch car" onPress={() => act.switchCar(1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#fff' }}>
              {a.cars.map((_, i) => <View key={i} style={{ height: 6, width: i === S.carIdx ? 16 : 6, borderRadius: 3, backgroundColor: i === S.carIdx ? L.violet : 'rgba(26,10,51,.2)' }} />)}
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SP.m, gap: SP.m }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt weight={700} size={22} color={L.ink} style={{ lineHeight: 28 }} numberOfLines={2}>{c.name}</Txt>
            <View style={{ marginTop: 8 }}><Plate reg={maskPlate(c.plate)} width={132} /></View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <View style={{ backgroundColor: L.violet, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}><Txt weight={600} size={12} color="#fff">{p.name}</Txt></View>
            </View>
          </View>
          <View style={{ width: iw, alignItems: 'center' }}>
            {carSrc ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Open Car Studio for your ${c.make} ${c.name}`} onPress={() => setStudio(true)}>
                <Image source={src(carSrc)!} resizeMode="contain" style={key ? { width: iw, height: iw / RATIO[key] } : { width: iw, height: iw * 0.62 }} />
              </Pressable>
            ) : (
              <Pressable onPress={() => { void act.carPhoto() }} style={{ width: iw, height: iw * 0.62, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(84,9,218,.4)', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Camera size={22} color={L.violet} /><Txt weight={600} size={11.5} color={L.violet} style={{ textAlign: 'center' }}>Add your car's photo</Txt>
              </Pressable>
            )}
            {carSrc ? <Pressable accessibilityLabel="Change your car's photo" hitSlop={8} onPress={() => { void act.carPhoto() }} style={{ position: 'absolute', right: -4, top: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Camera size={16} color={L.ink} /></Pressable> : null}
          </View>
        </View>
      </View>
      {studio ? <CarStudio car={c} onClose={() => setStudio(false)} /> : null}
    </View>
  );
}

/* ---------- status banners ---------- */
function Banners() {
  const list = banners();
  if (!list.length) return null;
  return (
    <View style={{ gap: SP.s, marginTop: SP.l }}>
      {list.map((b, i) => (
        <Surf key={i} pad={SP.m} style={{ backgroundColor: L.tint }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Txt size={16}>{b.icon}</Txt></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={600} size={13.5} color={L.ink}>{b.title}</Txt>
              <Txt size={12} color={L.grey} numberOfLines={2}>{b.sub}</Txt>
            </View>
            <Pressable onPress={() => b.act()} style={{ backgroundColor: L.violet, borderRadius: 12, minHeight: 36, justifyContent: 'center', paddingHorizontal: 14 }}>
              <Txt weight={600} size={12.5} color="#fff">{b.btn}</Txt>
            </Pressable>
          </View>
        </Surf>
      ))}
    </View>
  );
}

/* ---------- today's wash ---------- */
const Tick = ({ done, i }: { done: boolean; i: number }) => {
  const box = { width: 26, height: 26, borderRadius: 13, alignItems: 'center' as const, justifyContent: 'center' as const };
  return done
    ? <Pop delay={i * 160 + 200}><View style={[box, { backgroundColor: L.ok }]}><Check size={14} color="#fff" /></View></Pop>
    : <View style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(26,10,51,.3)' }]} />;
};
function Ritual() {
  const c = car(), d = doc(c);
  const Title = ({ children }: { children: string }) => <Txt weight={700} size={18} color={L.ink} style={{ marginTop: 2, lineHeight: 24 }}>{children}</Txt>;
  const Sub = ({ children }: { children: string }) => <Txt size={13} color={L.grey} style={{ marginTop: 2 }}>{children}</Txt>;
  const Eb = ({ children }: { children: string }) => <Txt weight={600} size={11.5} color={L.violet}>{children}</Txt>;
  const label = (big: ReactNode, small: string) => <View style={{ alignItems: 'center' }}>{big}<Txt size={9.5} color={L.grey} style={{ marginTop: 1 }}>{small}</Txt></View>;
  const steps = (st: [string, string, string, string | null | undefined][]) => (
    <View style={{ marginTop: 14, paddingTop: 6, borderTopWidth: 1, borderTopColor: L.line }}>
      {st.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <Tick done={s[2] === 'done'} i={i} />
          <View style={{ flex: 1 }}><Txt weight={600} size={14} color={L.ink}>{s[0]}</Txt><Txt size={12} color={L.grey}>{s[1]}</Txt></View>
          {s[2] === 'done' && s[3] ? <Txt weight={600} size={12} color={L.grey}>{ampm(s[3]).replace(' AM', '')}</Txt> : null}
        </View>
      ))}
    </View>
  );
  let body: ReactNode;
  if (c.status === 'new') {
    body = <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring frac={0.05} size={80} color={L.violet} track={L.tint2}>{label(<Txt weight={700} size={22} color={L.ink}>1</Txt>, 'day to go')}</Ring>
        <View style={{ flex: 1 }}><Eb>Tomorrow</Eb><Title>First wash, 6–7:30 AM</Title><Sub>{`${c.washer} will call before he comes and take your car's first photo.`}</Sub></View>
      </View>
      {steps([['Find your car', c.parking, 'later', null], ['Pressure wash and hand dry', 'About 12 minutes', 'later', null], ['Photo on WhatsApp', "So you know it's done", 'later', null]])}
    </>;
  } else if (isPaused(c, TODAY)) {
    body = <><Eb>Today</Eb><Title>Paused. Enjoy the trip.</Title><Sub>{`Washes start again on ${fmt(addDays(parse(c.paused!.to), 1), { weekday: 'long', day: 'numeric', month: 'short' })}.`}</Sub></>;
  } else if (d.notStarted) {
    body = <><Eb>Today's wash</Eb><Title>{startTxt(c)}</Title><Sub>{`${c.washer} washes your car here. Each step ticks off as it happens.`}</Sub></>;
  } else {
    const st = todaySteps(c), done = st.filter(s => s[2] === 'done').length, frac = done / st.length, w = d.washer?.name || c.washer;
    const head = d.status === 'done' ? ['Done before your chai.', `${w} finished at ${ampm(d.finished_at)} in ${d.minutes} minutes.`]
      : d.status === 'washing' ? ['Washing right now.', `${w} started at ${ampm(d.started_at)}. Watch it live.`]
      : d.status === 'skipped' ? ['No wash today.', d.skip_reason || ''] : [chipText(c, d) + '.', 'Each step ticks off here as it happens.'];
    body = <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring frac={frac} size={80} color={L.violet} track={L.tint2}>{label(<CountUp to={Math.round(frac * 100)} dur={1400} format={n => Math.round(n) + '%'} weight={700} size={20} color={L.ink} />, 'of today')}</Ring>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eb>{`Today's wash · ${fmt(TODAY, { weekday: 'short', day: 'numeric', month: 'short' })}`}</Eb>
          <Title>{head[0]}</Title><Sub>{head[1]}</Sub>
        </View>
      </View>
      {steps(st)}
      {d.status !== 'done' ? (
        <Pressable onPress={() => go('live')} style={{ marginTop: 8, minHeight: 48, borderRadius: 14, backgroundColor: L.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={15} color="#fff">Watch live</Txt></Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: L.line }}>
          <Txt weight={600} size={13} color={L.ink}>{c.rating ? 'Thanks for rating' : "How was today's wash?"}</Txt>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} hitSlop={4} onPress={() => act.rate(n)}>
                <Txt size={24} color={n <= c.rating ? L.gold : 'rgba(26,10,51,.15)'} style={{ lineHeight: 28 }}>{'★'}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </>;
  }
  return <Surf pad={18} style={{ marginTop: SP.l }}>{body}</Surf>;
}

/* ---------- services grid ---------- */
type Tile = { key: string; name: string; art: string; c: [string, string]; price?: number; mrp?: number; free?: string; rating?: string; go: () => void };
const MRP: Record<string, number> = { wash: 249, deep: 999, exclusive: 2600 };
const ARTK: Record<string, string> = { wash: 'sparkle', deep: 'spray', exclusive: 'bottle' };
function tiles(): Tile[] {
  const svc: Tile[] = SERVICES.map(s => ({ key: s.id, name: s.name, art: ARTK[s.id] || 'sparkle', c: ['#8B5CF6', C.violet] as [string, string], price: s.price, mrp: MRP[s.id], rating: '4.9', go: () => sheets.book() }));
  return svc.concat([
    { key: 'pause', name: 'Pause washes', art: 'cover', c: ['#2E8BFF', '#5409DA'], free: 'Included', go: () => sheets.pause() },
    { key: 'note', name: 'Note for washer', art: 'cloth', c: ['#FF9A4D', '#FF6A1A'], free: 'Included', go: () => sheets.note() },
    { key: 'issue', name: 'Missed a spot', art: 'cam', c: ['#FF7A8C', '#E8384F'], free: 'Free re-wash', go: () => sheets.issue() },
  ]);
}
function Services({ W }: { W: number }) {
  const gap = 10, tw = Math.floor((W - PAD * 2 - gap * 2) / 3);
  return (
    <View style={{ marginTop: SP.section, paddingHorizontal: PAD }}>
      <Head title="All car wash services" sub="Book now or schedule for later" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {tiles().map(t => (
          <Pressable key={t.key} onPress={t.go} style={({ pressed }) => ({ width: tw, opacity: pressed ? 0.85 : 1 })}>
            <View style={{ width: tw, height: tw, borderRadius: 16, backgroundColor: L.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Art kind={t.art} c={t.c} size={Math.round(tw * 0.68)} />
              {t.rating ? <Rate v={t.rating} /> : null}
              <View style={{ position: 'absolute', right: 6, bottom: 6 }}><PlusBtn label={`Open ${t.name}`} onPress={t.go} /></View>
            </View>
            <Txt weight={600} size={13} color={L.ink} style={{ marginTop: 8, lineHeight: 17, minHeight: 34 }} numberOfLines={2}>{t.name}</Txt>
            {t.price != null
              ? <Text style={{ marginTop: 2 }}><Txt weight={700} size={13.5} color={L.ink}>{inr(t.price)}</Txt>{t.mrp ? <Txt size={11} color="rgba(26,10,51,.4)" style={{ textDecorationLine: 'line-through' }}>{' ' + inr(t.mrp)}</Txt> : null}</Text>
              : <Txt weight={600} size={12} color={L.violet} style={{ marginTop: 2 }}>{t.free}</Txt>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ---------- proof of shine ---------- */
function Proof() {
  const c = car(), d = doc(c), real = realAcct();
  const ap = d.photos.find(p => p.kind === 'after');
  let img: any = null, cover = false;
  if (real) { if (ap) img = typeof ap.src === 'string' ? src(ap.src) : ap.src }
  else if (c.status !== 'new' && c.img) { cover = c.img === 'scorpio'; img = cover ? IMG.proof : IMG[c.img] }
  if (!img) return (
    <View style={{ marginTop: SP.section }}>
      <Head title="Proof of shine" />
      <Surf pad={20} style={{ alignItems: 'center', backgroundColor: L.tint }}>
        <Txt weight={600} size={15} color={L.ink} style={{ textAlign: 'center' }}>Every morning, a photo</Txt>
        <Txt size={13} color={L.grey} style={{ textAlign: 'center', marginTop: 3 }}>{real ? `${c.washer} sends a photo of your car the moment it's done.` : `${c.washer} sends a photo of your car the moment it's done. The first one lands tomorrow.`}</Txt>
      </Surf>
    </View>
  );
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="Proof of shine" right={!real ? <LinkTxt label="Before / after" onPress={() => sheets.proof()} /> : undefined} />
      <Pressable accessibilityLabel="Open this morning's photo" onPress={() => sheets.proof()} style={{ aspectRatio: 4 / 3, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' }}>
        {!cover ? <LinearGradient colors={[C.violet, C.violetNight]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        <Image source={img} resizeMode={cover ? 'cover' : 'contain'} style={[StyleSheet.absoluteFill, !cover && { margin: 20 }]} />
        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,.94)', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Txt weight={600} size={11.5} color={L.violet}>No pocha · Pressure wash</Txt>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: 'rgba(10,3,24,.7)' }}>
          <Txt weight={600} size={14.5} color="#fff">{`Photo by ${c.washer} · ${ampm(d.finished_at)}`}</Txt>
          <Txt size={12} color="rgba(255,255,255,.8)">{c.parking}</Txt>
        </View>
      </Pressable>
    </View>
  );
}

/* ---------- streak + calendar ---------- */
function Streak() {
  const c = car(), cal = calendar(c);
  const legend = (bg: string | undefined, label: string, dashed?: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: bg, borderWidth: dashed ? 1 : 0, borderStyle: 'dashed', borderColor: 'rgba(26,10,51,.3)' }} />
      <Txt size={11} color={L.grey}>{label}</Txt>
    </View>
  );
  return (
    <Surf pad={18} style={{ marginTop: SP.section }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt weight={600} size={11.5} color={L.violet}>{cal.month}</Txt>
          <Txt weight={700} size={16} color={L.ink} style={{ marginTop: 2 }}>Mornings in a row</Txt>
          <Txt size={12} color={L.grey}>Pauses don't break your streak. Tap any day.</Txt>
        </View>
        <CountUp to={c.streak} dur={1200} weight={700} size={40} color={L.violet} style={{ lineHeight: 46 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -3 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <View key={'h' + i} style={{ width: '14.2857%', paddingHorizontal: 3, paddingBottom: 6, alignItems: 'center' }}><Txt weight={600} size={10} color={L.grey}>{l}</Txt></View>)}
        {cal.cells.map((x, i) => {
          if (!x) return <View key={i} style={{ width: '14.2857%' }} />;
          const bg = x.washed ? (x.extra ? L.gold : L.violet) : x.paused ? 'transparent' : L.tint, fg = x.washed ? (x.extra ? L.ink : '#fff') : L.grey;
          const cell = (
            <View style={{ aspectRatio: 1, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: x.paused && !x.washed ? 1 : 0, borderStyle: 'dashed', borderColor: 'rgba(26,10,51,.3)' }}>
              <Txt weight={600} size={11} color={fg}>{String(x.d)}</Txt>
              {x.today ? <View pointerEvents="none" style={{ position: 'absolute', left: -2, top: -2, right: -2, bottom: -2, borderRadius: 12, borderWidth: 2, borderColor: L.deep }} /> : null}
            </View>
          );
          const lbl = fmt(x.date, { day: 'numeric', month: 'long' }) + (x.washed ? ', washed' : x.paused ? ', paused' : x.today ? ', today' : '');
          return (
            <View key={i} style={{ width: '14.2857%', padding: 3 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={lbl} hitSlop={3} onPress={() => sheets.day(x.date)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] })}>{cell}</Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>{legend(L.violet, 'Washed')}{legend(L.gold, 'Washed + extra')}{legend(undefined, 'Paused', true)}</View>
    </Surf>
  );
}

/* ---------- this week ---------- */
const KCOL: Record<string, string> = { foam: C.sky, int: C.orange, det: C.gold, tyre: C.mint };
const WK_W = 60, WK_GAP = 8, WK_BACK = 7, WK_FWD = 7;   // tile width, gap, days shown before / after today
function weekStrip() {
  const c = car();
  return Array.from({ length: WK_BACK + 1 + WK_FWD }, (_, i) => {
    const dt = addDays(TODAY, i - WK_BACK), p = isPaused(c, dt);
    return { date: iso(dt), label: fmt(dt, { weekday: 'short' }).slice(0, 2), d: dt.getDate(), today: i === WK_BACK, paused: p, dots: p ? [] : extras(c, dt) };
  });
}
function Week() {
  const wk = weekStrip(), sv = useRef<any>(null);
  const dot = (col: string, l: string) => <Text><Text style={{ color: col }}>{'● '}</Text>{l}{'  '}</Text>;
  useEffect(() => { const t = setTimeout(() => sv.current?.scrollTo({ x: (WK_BACK - 2) * (WK_W + WK_GAP), animated: false }), 0); return () => clearTimeout(t) }, []);
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="This week" right={<Txt size={11} color={L.grey} style={{ flexShrink: 1, textAlign: 'right' }}>{dot(C.sky, 'Foam')}{dot(C.orange, 'Interior')}{dot(C.mint, 'Tyre')}{dot(C.gold, 'Detail')}</Txt>} />
      <ScrollView ref={sv} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={WK_W + WK_GAP} snapToAlignment="start"
        style={{ marginHorizontal: -PAD }} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 6, paddingRight: PAD + 3, gap: WK_GAP }}>
        {wk.map(w => (
          <Pressable key={w.date} accessibilityRole="button" accessibilityLabel={fmt(w.date, { weekday: 'long', day: 'numeric', month: 'long' }) + (w.today ? ', today' : w.paused ? ', paused' : '')}
            onPress={() => sheets.day(w.date)} style={({ pressed }) => ({ width: WK_W, minHeight: HIT, opacity: pressed ? 0.75 : w.paused ? 0.5 : 1 })}>
            <View style={{ borderRadius: 16, paddingVertical: 10, alignItems: 'center', gap: 4, backgroundColor: w.today ? L.violet : '#fff', ...(w.today ? {} : hair) }}>
              <Txt weight={600} size={10} color={w.today ? 'rgba(255,255,255,.75)' : L.grey}>{w.label}</Txt>
              <Txt weight={700} size={16} color={w.today ? '#fff' : L.ink}>{String(w.d)}</Txt>
              <View style={{ flexDirection: 'row', gap: 3, height: 6 }}>{w.dots.map((k, j) => <View key={j} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: KCOL[k] }} />)}</View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/* ---------- your washer ---------- */
function Washer() {
  const c = car();
  return (
    <View style={{ marginTop: SP.section }}>
      <Head title="Your washer" />
      <Surf pad={14}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: L.tint2 }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 78, height: 79, marginLeft: -7 }} /></View>
          <View style={{ flex: 1 }}>
            <Txt weight={700} size={17} color={L.ink}>{c.washer}</Txt>
            <Txt size={12} color={L.grey}>{c.status === 'new' ? '★ 4.9 · Starts with your car tomorrow' : `★ 4.9 · Has washed your ${c.name} ${c.washes} times`}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Chip tone="gold" label="Tip" icon={<Heart size={14} color="#7A5300" strokeWidth={2.4} />} onPress={() => sheets.tip()} />
          <Chip label="Leave a note" icon={<Note size={14} color={L.violet} strokeWidth={2.2} />} onPress={() => sheets.note()} />
        </View>
      </Surf>
    </View>
  );
}

/* ---------- product rail ---------- */
function ProductCard({ p }: { p: (typeof PRODUCTS)[number] }) {
  const c = car();
  return (
    <Pressable onPress={() => sheets.product(p.id)} style={{ width: 140 }}>
      <View style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: L.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {p.tag ? <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: L.violet, borderRadius: 7, paddingVertical: 2, paddingHorizontal: 7, zIndex: 1 }}><Txt weight={700} size={10} color="#fff">{p.tag}</Txt></View> : null}
        <Art kind={p.art} c={p.c} size={96} />
        <View style={{ position: 'absolute', right: 6, bottom: 6 }}><PlusBtn label={`Add ${p.name} to cart`} onPress={() => act.addToCart(p.id)} /></View>
      </View>
      <Txt weight={600} size={13} color={L.ink} style={{ marginTop: 8, lineHeight: 17, minHeight: 34 }} numberOfLines={2}>{pName(p)}</Txt>
      {p.fit ? <Txt weight={600} size={10.5} color={L.ok}>{`● Fits your ${c.name}`}</Txt> : null}
      <Text style={{ marginTop: 2 }}><Txt weight={700} size={13.5} color={L.ink}>{inr(p.price)}</Txt><Txt size={11} color="rgba(26,10,51,.4)" style={{ textDecorationLine: 'line-through' }}>{' ' + inr(p.mrp)}</Txt></Text>
    </Pressable>
  );
}
function Rail() {
  return (
    <View style={{ marginTop: SP.section }}>
      <View style={{ paddingHorizontal: PAD }}><Head title="Picked for your car" right={<LinkTxt label="Open store" onPress={() => go('store')} />} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 12, gap: 12, alignItems: 'flex-start' }}>
        {homeRail().map(p => <ProductCard key={p.id} p={p} />)}
      </ScrollView>
    </View>
  );
}

/* ---------- floating "washer assigned" mini card ---------- */
function Assigned() {
  const ins = useInsets(), c = car(), d = doc(c), w = d.washer?.name || c.washer;
  const when = c.status === 'new' ? 'Tomorrow, 6 am' : isPaused(c, TODAY) ? 'Paused today' : d.status === 'done' ? 'Done today' : d.status === 'washing' ? 'Washing now' : 'Today morning';
  return (
    <Pressable onPress={() => go('live')} accessibilityRole="button" accessibilityLabel={`${w} is assigned to your wash. Open washes`}
      style={{ position: 'absolute', left: PAD - 6, right: PAD - 6, bottom: 78 + Math.max(ins.bottom, 4), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: '#fff', ...hair, shadowColor: '#1A0A33', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: L.tint2 }}><Image source={IMG.washer} resizeMode="cover" style={{ width: 54, height: 55, marginLeft: -5 }} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={14} color={L.ink} numberOfLines={1}>{`${w} is assigned to your wash`}</Txt>
        <Txt size={12} color={L.grey} numberOfLines={1}>{`${when} · ${chipText(c, d)}`}</Txt>
      </View>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: L.tint2, alignItems: 'center', justifyContent: 'center' }}><Chev size={14} color={L.ink} /></View>
    </Pressable>
  );
}

/* ---------- the screen ---------- */
export default function Home() {
  const ui = useApp(), { width } = useWindowDimensions(), W = Math.min(width, 520);
  const ref = useRef<any>(null), [stuck, setStuck] = useState(false), name = A().name.split(' ')[0], hi = greeting();
  useEffect(() => { if (ui.tabNonce) ref.current?.scrollTo({ y: 0, animated: true }) }, [ui.tabNonce]);
  return (
    <InkContext.Provider value={creamInk}>
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <Header stuck={stuck} />
        <ScrollView ref={ref} showsVerticalScrollIndicator={false} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: 170 }}
          onScroll={e => { const s = e.nativeEvent.contentOffset.y > 8; if (s !== stuck) setStuck(s) }}>
          <Promo />
          <View style={{ paddingHorizontal: PAD, paddingTop: SP.l }}>
            <Txt size={13.5} color={L.grey}>{hi}</Txt>
            <Txt weight={700} size={24} color={L.ink} style={{ lineHeight: 30 }}>{name}, <Text style={{ color: L.violet }}>no more pocha!</Text></Txt>
          </View>
          <CarCard W={W} />
          <View style={{ paddingHorizontal: PAD }}>
            <Banners />
            <Ritual />
          </View>
          <Services W={W} />
          <View style={{ paddingHorizontal: PAD }}>
            <Proof />
            <Streak />
            <Week />
            <Washer />
          </View>
          <Rail />
        </ScrollView>
        <Assigned />
      </View>
    </InkContext.Provider>
  );
}
