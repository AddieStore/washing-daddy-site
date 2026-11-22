// WD Pass detail: membership-card hero (shine + float), snap carousel of plans, visits strip, savings chip, how it works, benefits, FAQs, sticky buy bar. OWNER: MONEY worker.
import React, { useEffect, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Reanimated, { type SharedValue, useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, withRepeat, withSequence, withTiming, withDelay, withSpring, interpolate, Extrapolation, Easing, runOnJS, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGrad, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt, useInsets, H2, H3, Body, Caption, Label } from '../ui/kit';
import { Chev, Check, Zap, Clock, Shield, Wallet as WalletIc, Back, Star, Cart, Car } from '../ui/icons';
import { useApp, passView, passQuote, act, closePage, toast, confetti, haptic } from '../state';
import type { PassPlan } from '../state';
import { G, Tap, PrimaryBtn, TNUM, inr, card, PAGE_BG } from './parts';
import { openPassBreakup, Skel, useSkeleton, V, V_SOFT, rs } from '../sheets/money';
import { PageBar } from './Stub';
import { FadeUp, CountUp, Pressable3, SPRING } from '../ui/motion';

const SAFFRON = '#FFBA08', VDEEP = '#3A0599';
const ICONS = [WalletIc, Zap, Clock];
const RA = Reanimated.ScrollView;
const day = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };

/* ---------- the membership card ---------- */
function PassCard({ plan, w, left, total, till, float }: { plan: PassPlan; w: number; left?: number; total?: number; till?: string; float?: boolean }) {
  const rm = useReducedMotion(), h = Math.round(w * 0.62);
  const sweep = useSharedValue(-1), fl = useSharedValue(0);
  useEffect(() => {
    if (rm) return;
    sweep.value = withRepeat(withSequence(withDelay(1200, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })), withTiming(-1, { duration: 0 }), withDelay(1800, withTiming(-1, { duration: 1 }))), -1);
    if (float) fl.value = withRepeat(withSequence(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 2800, easing: Easing.inOut(Easing.sin) })), -1, true);
  }, [rm, float]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(sweep.value, [-1, 1], [-w * 0.5, w * 1.1]) }, { rotate: '18deg' }] }));
  const tilt = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { translateY: fl.value * -3 }, { rotateY: `${fl.value * 2.5}deg` }, { rotateX: `${fl.value * -1.2}deg` }] }));
  const shown = left ?? plan.visits, total_ = total ?? plan.visits;
  return (
    <Reanimated.View style={[{ width: w, height: h, borderRadius: 22, shadowColor: V, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 }, tilt]}>
      <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden' }}>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Defs>
            <SvgGrad id="pg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#7B3BFF" /><Stop offset="0.55" stopColor="#5409DA" /><Stop offset="1" stopColor={VDEEP} /></SvgGrad>
            <RadialGradient id="pr" cx="0.85" cy="0.1" r="0.7"><Stop offset="0" stopColor="#fff" stopOpacity="0.28" /><Stop offset="1" stopColor="#fff" stopOpacity="0" /></RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill="url(#pg)" /><Rect width={w} height={h} fill="url(#pr)" />
          {/* guilloche-style rings, like the security print on a card */}
          {[0, 1, 2, 3, 4].map(i => <Circle key={i} cx={w * 0.92} cy={h * 1.05} r={h * (0.28 + i * 0.13)} stroke="#fff" strokeOpacity={0.09 - i * 0.012} strokeWidth={1.2} fill="none" />)}
          <Path d={`M0 ${h * 0.72} Q ${w * 0.35} ${h * 0.55} ${w * 0.7} ${h * 0.8} T ${w} ${h * 0.7}`} stroke="#fff" strokeOpacity={0.08} strokeWidth={1.2} fill="none" />
          <Rect x={0} y={h - 4} width={w} height={4} fill={SAFFRON} opacity={0.95} />
        </Svg>
        <View style={{ flex: 1, padding: Math.round(w * 0.065), justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Txt weight={700} size={15} color="#fff" style={{ letterSpacing: 1.2 }}>WASHING DADDY</Txt>
              <Txt weight={500} size={11} color="rgba(255,255,255,0.7)" style={{ letterSpacing: 2.4, marginTop: 2 }}>WD PASS · {plan.title.toUpperCase()}</Txt>
            </View>
            <View style={{ width: 34, height: 26, borderRadius: 6, backgroundColor: SAFFRON, opacity: 0.95, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: 12, height: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 11, width: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, right: 11, width: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Txt weight={700} size={Math.round(w * 0.17)} color="#fff" style={[TNUM, { lineHeight: Math.round(w * 0.19) }]}>{shown}</Txt>
                <Txt weight={500} size={14} color="rgba(255,255,255,0.8)">{left != null ? `of ${total_} washes left` : 'washes'}</Txt>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt weight={500} size={10} color="rgba(255,255,255,0.65)" style={{ letterSpacing: 1.6 }}>{till ? 'VALID TILL' : 'VALID FOR'}</Txt>
              <Txt weight={600} size={14} color="#fff" style={TNUM}>{till ? day(till) : `${plan.days} days`}</Txt>
            </View>
          </View>
        </View>
        {/* shine sweep */}
        <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: -h * 0.3, bottom: -h * 0.3, width: w * 0.22 }, shine]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
}

/* ---------- carousel slot: centred card scales up, the rest dim ---------- */
function Slot({ i, x, step, children }: { i: number; x: SharedValue<number>; step: number; children: React.ReactNode }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.value - i * step) / step;
    return { transform: [{ scale: interpolate(d, [0, 1], [1, 0.9], Extrapolation.CLAMP) }], opacity: interpolate(d, [0, 1], [1, 0.5], Extrapolation.CLAMP) };
  });
  return <Reanimated.View style={st}>{children}</Reanimated.View>;
}

/* ---------- visits strip: one dot per wash, fills in one after another ---------- */
function Dot({ i, on, used }: { i: number; on: boolean; used: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = 0; s.value = withDelay(i * 90 + 150, withSpring(1, SPRING.pop)); }, [on, used]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  return (
    <Reanimated.View style={[{ flex: 1, minWidth: 0, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: used ? '#ECE6FA' : V, borderWidth: used ? 1 : 0, borderColor: 'rgba(84,9,218,0.15)' }, st]}>
      {used ? <Check size={16} color="#A99BD0" strokeWidth={2} /> : <Car size={20} color="#fff" strokeWidth={1.6} />}
    </Reanimated.View>
  );
}
function VisitsStrip({ total, left, days }: { total: number; left: number; days: number }) {
  const shown = Math.min(total, 10);
  return (
    <View style={[card({ borderRadius: 18 }), { padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <H3>{left === total ? `${total} washes included` : `${left} of ${total} washes left`}</H3>
        <Caption>valid {days} days</Caption>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {Array.from({ length: shown }, (_, i) => <Dot key={i} i={i} on used={i >= Math.round(left / total * shown)} />)}
      </View>
    </View>
  );
}

/* ---------- how it works: 3 steps joined by a line ---------- */
function Steps({ p }: { p: PassPlan }) {
  const steps: [React.ComponentType<any>, string, string][] = [
    [Cart, 'Buy once', `Pay for ${p.visits} washes up front`],
    [Check, 'Use pass', 'Pick "Use pass" at checkout'],
    [Clock, `${p.days} days`, `Use all ${p.visits} visits in time`],
  ];
  return (
    <View style={{ flexDirection: 'row' }}>
      {steps.map(([I, a, b], i) => (
        <FadeUp key={a} index={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 48 }}>
            {i > 0 ? <View style={{ position: 'absolute', left: 0, right: '50%', top: 23, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: 'rgba(84,9,218,0.3)', marginRight: 26 }} /> : null}
            {i < 2 ? <View style={{ position: 'absolute', right: 0, left: '50%', top: 23, borderTopWidth: 1.5, borderStyle: 'dashed', borderTopColor: 'rgba(84,9,218,0.3)', marginLeft: 26 }} /> : null}
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1.5, borderColor: V, alignItems: 'center', justifyContent: 'center' }}>
              <I size={20} color={V} strokeWidth={1.6} />
              <View style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: SAFFRON, alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={10} color="#1A1033">{i + 1}</Txt></View>
            </View>
          </View>
          <Txt weight={600} size={13} style={{ marginTop: 10 }}>{a}</Txt>
          <Caption style={{ textAlign: 'center', marginTop: 2, paddingHorizontal: 6 }}>{b}</Caption>
        </FadeUp>
      ))}
    </View>
  );
}

export default function Pass({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), load = useSkeleton(500), { width: W } = useWindowDimensions();
  const pv = passView(), { active } = pv, plans = pv.plans;
  const [selId, setSel] = useState<string | undefined>(id);
  const q = passQuote(selId ?? id), p = q.plan;
  const [busy, setBusy] = useState(false), [faq, setFaq] = useState(-1), [done, setDone] = useState(false);
  const x = useSharedValue(0);
  const cardW = Math.min(W - 72, 340), gap = 14, step = cardW + gap, sidePad = (W - cardW) / 2;
  const pick = (i: number) => { const np = plans[Math.max(0, Math.min(plans.length - 1, i))]; if (np && np.id !== selId) { haptic(); setSel(np.id) } };
  const onScroll = useAnimatedScrollHandler({
    onScroll: e => { x.value = e.contentOffset.x },
    onMomentumEnd: e => { const i = Math.round(e.contentOffset.x / step); runOnJS(pick)(i) },
  });
  const idx = Math.max(0, plans.findIndex(pl => pl.id === p.id));
  useEffect(() => { x.value = idx * step }, []);
  // the admin sells no pass right now (passes_cfg empty, or features.pass off) and this account has none
  if ((!p.id || !plans.length) && !active) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="WD Pass" />
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Txt weight={600} size={18} style={{ textAlign: 'center' }}>WD Pass is not on sale right now</Txt>
        <Txt size={14} color={G.sub} style={{ marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Check back soon. You can still book any service from Home.</Txt>
      </View>
    </View>
  );
  const pay = async () => {
    setBusy(true);
    try { const r = await act.buyPass(p.id); if (!r.shown && !r.pending) { confetti(); setDone(true); toast(`${p.name} is active`) } } catch (e: any) { toast(e.message) }
    setBusy(false);
  };
  const owned = active ? plans.find(pl => pl.id === active.plan) || p : null;
  const shownPlan = owned || p, save = Math.max(0, shownPlan.mrp - shownPlan.price);
  const topH = ins.top + 64;

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      {load ? (
        <View><Skel h={topH + 200} r={0} /><View style={{ padding: 16, gap: 14, alignItems: 'center' }}><Skel h={64} r={14} style={{ alignSelf: 'stretch' }} /><Skel h={80} r={14} style={{ alignSelf: 'stretch' }} /><Skel h={80} r={14} style={{ alignSelf: 'stretch' }} /></View></View>
      ) : (
        <Reanimated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + ins.bottom }}>
          {/* violet stage the card sits on */}
          <View style={{ paddingTop: topH, paddingBottom: 30, backgroundColor: V, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}>
            <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={W} height={topH + 330}>
              <Defs><RadialGradient id="st" cx="0.5" cy="0.55" r="0.6"><Stop offset="0" stopColor="#9B6BFF" stopOpacity="0.55" /><Stop offset="1" stopColor="#5409DA" stopOpacity="0" /></RadialGradient></Defs>
              <Rect width={W} height={topH + 330} fill="url(#st)" />
            </Svg>
            <View style={{ position: 'absolute', top: ins.top + 20, left: 0, right: 0, alignItems: 'center' }}>
              <Txt weight={600} size={17} color="#fff">WD Pass</Txt>
            </View>
            {owned && active ? (
              <View style={{ alignItems: 'center' }}>
                <PassCard plan={owned} w={cardW} left={active.visitsLeft} total={active.visitsTotal} till={active.validTill} float />
              </View>
            ) : (
              <RA horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast" scrollEventThrottle={16} onScroll={onScroll}
                contentOffset={{ x: idx * step, y: 0 }} contentContainerStyle={{ paddingHorizontal: sidePad, paddingVertical: 14, gap }} scrollEnabled={plans.length > 1}>
                {plans.map((pl, i) => (
                  <Slot key={pl.id} i={i} x={x} step={step}>
                    <Pressable accessibilityLabel={`${pl.title}, ${pl.visits} washes`} onPress={() => pick(i)}><PassCard plan={pl} w={cardW} float={pl.id === p.id} /></Pressable>
                  </Slot>
                ))}
              </RA>
            )}
            {!owned && plans.length > 1 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                {plans.map(pl => <View key={pl.id} style={{ width: pl.id === p.id ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: pl.id === p.id ? SAFFRON : 'rgba(255,255,255,0.4)' }} />)}
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: -4 }}>
            {/* price + savings */}
            <FadeUp style={{ alignItems: 'center', marginTop: 20 }}>
              {owned && active ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F7EE', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Check size={14} color="#16a34a" strokeWidth={2.2} /><Txt weight={600} size={13} color="#15803d">Your pass is active</Txt>
                  </View>
                  <Body style={{ marginTop: 10, textAlign: 'center' }}>{active.visitsLeft} of {active.visitsTotal} visits left · valid till {day(active.validTill)}</Body>
                </>
              ) : (
                <>
                  <Txt weight={700} size={26} style={{ textAlign: 'center' }}>{p.title}</Txt>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline', marginTop: 4 }}>
                    <Txt weight={700} size={22} color={V} style={TNUM}>{inr(p.price)}</Txt>
                    <Txt size={14} color={G.mute} style={[TNUM, { textDecorationLine: 'line-through' }]}>{inr(p.mrp)}</Txt>
                  </View>
                  <Caption style={{ marginTop: 2 }}>{p.visits} visits · about {inr(q.perVisit)} a wash · valid {p.days} days</Caption>
                </>
              )}
              {save > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: '#FFF4D1', borderRadius: 999, paddingLeft: 10, paddingRight: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,186,8,0.55)' }}>
                  <Star size={14} color={SAFFRON} strokeWidth={1.5} />
                  <Txt weight={600} size={13} color="#5A3E00">You save </Txt>
                  <CountUp to={rs(save)} duration={900} delay={300} style={[TNUM, { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#5A3E00', marginLeft: -4 }]} />
                  <Txt weight={500} size={13} color="#5A3E00" style={{ marginLeft: -2 }}> vs single washes</Txt>
                </View>
              ) : null}
            </FadeUp>

            <View style={{ marginTop: 22 }}>
              <VisitsStrip key={shownPlan.id + (active ? 'a' : 'b')} total={active ? active.visitsTotal : shownPlan.visits} left={active ? active.visitsLeft : shownPlan.visits} days={shownPlan.days} />
            </View>

            <H2 style={{ marginTop: 30, marginBottom: 16 }}>How it works</H2>
            <Steps p={shownPlan} />

            <H2 style={{ marginTop: 30, marginBottom: 12 }}>What you get</H2>
            <View style={[card({ borderRadius: 18 }), { paddingHorizontal: 14 }]}>
              {shownPlan.benefits.map(([a, b], i) => { const I = ICONS[i % 3]; return (
                <FadeUp key={a} index={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: G.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><I size={20} color={V} strokeWidth={1.5} /></View>
                  <View style={{ flex: 1 }}><H3>{a}</H3><Caption style={{ marginTop: 2 }}>{b}</Caption></View>
                </FadeUp>
              ); })}
            </View>

            <H2 style={{ marginTop: 30, marginBottom: 12 }}>Frequently asked questions</H2>
            <View style={{ gap: 8 }}>
              {shownPlan.faqs.map(([qq, a], i) => (
                <Pressable3 key={qq} haptics={false} scaleTo={0.985} onPress={() => { haptic(); setFaq(faq === i ? -1 : i) }} style={[card({ borderRadius: 14 }), { paddingHorizontal: 14, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Label style={{ flex: 1, lineHeight: 20 }}>{qq}</Label>
                    <View style={{ transform: [{ rotate: faq === i ? '-90deg' : '90deg' }] }}><Chev size={16} color={G.mute} strokeWidth={1.5} /></View>
                  </View>
                  {faq === i ? <FadeUp distance={4} duration={200}><Body style={{ marginTop: 8 }}>{a}</Body></FadeUp> : null}
                </Pressable3>
              ))}
            </View>

            <View style={{ marginTop: 24, backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(84,9,218,0.1)' }}>
              <Shield size={28} color={V} strokeWidth={1.5} />
              <View style={{ flex: 1 }}><H3>Trusted, verified washers</H3><Caption style={{ marginTop: 2 }}>Background-checked washers, water-saving pressure wash, and support whenever you need it.</Caption></View>
            </View>
          </View>
        </Reanimated.ScrollView>
      )}

      {/* back */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 12 }}><Tap label="Back" onPress={closePage} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(84,9,218,0.92)', alignItems: 'center', justifyContent: 'center' }}><Back size={18} color="#fff" strokeWidth={1.8} /></Tap></View>

      {/* sticky buy bar */}
      {!load ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + ins.bottom, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#1A1033', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 }}>
          {active || done ? (
            <PrimaryBtn label="Pass active" disabled style={{ flex: 1 }} />
          ) : (
            <>
              <Pressable accessibilityLabel="Price breakup" onPress={() => openPassBreakup(p.id)} style={{ width: 108 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Caption>incl. GST</Caption><View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={13} color={G.sub} strokeWidth={1.5} /></View></View>
                <CountUp to={rs(q.total)} duration={500} style={[TNUM, { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: G.ink }]} />
              </Pressable>
              <PrimaryBtn label={`Buy pass · ${rs(q.total)}`} busy={busy} onPress={pay} style={{ flex: 1 }} />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
