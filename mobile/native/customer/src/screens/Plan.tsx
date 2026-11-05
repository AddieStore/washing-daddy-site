// Plan tab, laid out like Pronto's Money tab: header, plan summary, plan chips + pay button, usage, pause, How it works, payments.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing, ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SP } from '../theme';
import { Txt, CountUp, Ring, useTheme, useInsets } from '../ui/kit';
import { Pressable3 } from '../ui/motion';
import { Help } from '../ui/icons';
import { PLANS, sellablePlans } from '../data/reference';
import { PAUSE_MAX, canPause, pauseLeft } from '../data/model';
import { TODAY, fmt, iso, inr } from '../data/dates';
import { src, RATIO, ImgKey } from '../img';
import { A, car, carImg, daysLeft, planStatus, planOf, maskPlate, usage, act, toast, useApp, pendingRef, openPage } from '../state';
import { sheets } from '../sheets';

const run = (f: () => Promise<unknown>) => f().catch((e: Error) => toast(e.message));
const COL = { violet: C.violet, orange: C.orange, sky: C.sky, gold: C.gold, mint: C.mint };
const TINT = '#EFE8FD', TINT2 = '#F6F1FF', GREY = '#6B6580', HAIR = 'rgba(26,10,51,.09)', OK = '#0E9F6E', CARD = '#FAF8FF';

function Panel({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: HAIR, padding: SP.l }, style]}>{children}</View>;
}
function Head({ title, right }: { title: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: SP.m }}>
      <Txt weight={700} size={18} color={C.ink} style={{ flexShrink: 1 }}>{title}</Txt>
      {right ? <Txt size={13} color={GREY}>{right}</Txt> : null}
    </View>
  );
}
function Bar({ frac, color }: { frac: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: Math.max(0, Math.min(1, frac)), duration: 1400, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [frac]);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(26,10,51,.08)', marginTop: 10, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}
function BigBtn({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: ghost ? C.white : C.violet, borderWidth: ghost ? 1.5 : 0, borderColor: C.violet, opacity: pressed ? 0.85 : 1 })}>
      <Txt weight={700} size={16} color={ghost ? C.violet : C.white}>{label}</Txt>
    </Pressable>
  );
}


const LINE = '#ECEAF2', INK = '#1A0A33', PBG = '#F3EFFB';
const SH = { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[{ backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: LINE }, SH, style]}>{children}</View>;
const Info = () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6B6580" strokeWidth={2} strokeLinecap="round"><Circle cx={12} cy={12} r={9} /><Path d="M12 11v5M12 8h.01" /></Svg>;

// header + balance card (Pronto's wallet balance block): current plan, days left, offer strip
function Balance() {
  const c = car(), p = planOf(c), left = daysLeft(c), st = planStatus(c), ref = pendingRef();
  return (
    <Card style={{ marginHorizontal: 16, overflow: 'hidden' }}>
      <View style={{ alignItems: 'center', paddingTop: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Txt weight={500} size={13.5} color={INK}>{`Current plan · ${p.name}`}</Txt><Info /></View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
          {left == null ? <Txt weight={700} size={44} color={C.violet}>{inr(p.price)}</Txt> : <CountUp to={left} dur={1200} weight={700} size={46} color={C.violet} />}
          <Txt weight={600} size={15} color={C.violet}>{left == null ? '/ month' : 'days left'}</Txt>
        </View>
        <Txt size={11} color="#6B6580" style={{ textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 16, paddingHorizontal: 14 }}>
          {left == null ? 'Your plan starts after the first wash. Pay once you have seen it.' : `Paid up till ${fmt(c.till!, { day: 'numeric', month: 'short', year: 'numeric' })}. Renew below to keep your mornings going.`}
        </Txt>
        <View style={{ position: 'absolute', right: 14, top: 14, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: st[1] }}><Txt weight={700} size={10.5} color={st[2]}>{st[0]}</Txt></View>
      </View>
      <Pressable3 onPress={() => openPage({ k: 'refer' })}>
        <LinearGradient colors={['#2A0A78', C.violet, '#3E7BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' }}>
            <Txt weight={800} size={8} color={C.white} style={{ letterSpacing: 0.4 }}>WD</Txt><Txt weight={800} size={9.5} color={C.gold}>OFFER</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight={700} size={16} color={C.white}>{ref ? 'Invite code applied!' : 'Refer a friend, get ₹200'}</Txt>
            <Txt weight={500} size={11} color="rgba(255,255,255,.9)">{ref ? '₹200 off your first month' : 'They get a wash, you get a credit'}</Txt>
          </View>
        </LinearGradient>
      </Pressable3>
    </Card>
  );
}

// plan chips + pay button (Pronto "Add money"): pick a plan, then pay or switch
function Choose() {
  const c = car(), p = planOf(c), plans = sellablePlans();
  const [sel, setSel] = useState(p.id);
  const pl = PLANS.find(x => x.id === sel) || p, cur = pl.id === p.id;
  const label = cur ? `${c.till ? 'Pay next month' : 'Pay first month'} · ${inr(pl.price)}` : `${pl.price > p.price ? 'Upgrade to' : 'Switch to'} ${pl.name}`;
  return (
    <Card style={{ marginHorizontal: 16, padding: 14 }}>
      <Txt weight={500} size={17} color={INK}>Choose your plan</Txt>
      <View style={{ marginTop: 12, borderWidth: 1, borderColor: LINE, borderRadius: 8, height: 82, justifyContent: 'center', paddingHorizontal: 14 }}>
        <Txt weight={600} size={28} color={INK}>{inr(pl.price)}<Txt weight={500} size={13} color="#6B6580">{' / month'}</Txt></Txt>
      </View>
      <Txt size={11.5} color={INK} style={{ marginTop: 8 }}>{`${pl.name}: ${pl.rows.filter(r => r[1] !== '—').slice(0, 2).map(r => r[1] + ' ' + r[0].toLowerCase()).join(', ')}`}</Txt>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {plans.map(x => {
          const on = x.id === sel;
          return (
            <View key={x.id} style={{ flex: 1 }}><Pressable3 onPress={() => setSel(x.id)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View style={{ height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#F1EBFF' : '#F7F6FA', borderWidth: on ? 2 : 1, borderColor: on ? C.violet : LINE }}>
                <Txt weight={600} size={14} color={INK}>{inr(x.price)}</Txt>
              </View>
              <View style={{ alignSelf: 'center', marginTop: -9, backgroundColor: x.id === p.id ? C.gold : '#3E5BFF', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Txt weight={600} size={9.5} color={x.id === p.id ? INK : C.white}>{x.id === p.id ? 'YOURS' : x.name.replace('WD ', '')}</Txt>
              </View>
            </Pressable3></View>
          );
        })}
      </View>
      <Pressable3 onPress={() => (cur ? sheets.payPlan() : sheets.switchPlan(pl.id))} accessibilityRole="button" style={{ marginTop: 18, height: 50, borderRadius: 8, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Txt weight={600} size={17} color={C.white}>{label}</Txt>
      </Pressable3>
    </Card>
  );
}

const HOW = [
  'Pick the plan that matches how many mornings a week your car should get a pressure wash.',
  'Pay once a month with UPI, card or netbanking. Receipts show up below.',
  'Your washer comes before 7:30 AM. Watch every step live on the Washes tab and get a photo when done.',
];
const USING = [
  'Paused days are added to the end of your plan. WD Pro and above can pause up to ' + PAUSE_MAX + ' days a month.',
  'Add-on washes like foam and interior are priced separately from the Home tab.',
  'Plan fees are not refundable once a month has started, in accordance with our terms.',
];
const BENEFITS = [['Daily wash', 'before 7:30 AM'], ['Live photos', 'on every wash'], ['Pause anytime', 'days get added']];
function Benefit({ i }: { i: number }) {
  const icons = [
    <Path key="a" d="M12 3v3M12 18v3M3 12h3M18 12h3" />,
    <><Path key="b" d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle key="c" cx={12} cy={13} r={3.4} /></>,
    <Path key="d" d="M9 6v12M15 6v12" />,
  ];
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5D9FF', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">{i === 0 ? <Path d="M13 2L5 14h6l-1 8 8-12h-6z" /> : icons[i]}</Svg>
      </View>
    </View>
  );
}
function Bullets({ title, items, dot }: { title: string; items: string[]; dot: 'round' | 'diamond' }) {
  return (
    <Card style={{ marginHorizontal: 16, padding: 14 }}>
      <Txt weight={500} size={17} color={INK}>{title}</Txt>
      <View style={{ marginTop: 12 }}>
        {items.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, paddingBottom: i < items.length - 1 ? 14 : 4 }}>
            <View style={{ width: 10, alignItems: 'center', paddingTop: 5 }}>
              <View style={dot === 'round' ? { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet } : { width: 7, height: 7, backgroundColor: C.violet, transform: [{ rotate: '45deg' }] }} />
              {dot === 'round' && i < items.length - 1 ? <View style={{ position: 'absolute', top: 15, bottom: -22, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: C.violet }} /> : null}
            </View>
            <Txt size={12} color={INK} style={{ flex: 1, lineHeight: 20 }}>{t}</Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function Plan() {
  const { tabNonce } = useApp(), ins = useInsets();
  const top = Math.max(ins.top, 24), sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const c = car(), u = usage(c), a = A();
  const pz = !!c.paused && c.paused.to >= iso(TODAY), cp = canPause(c);
  const pays = a.payments.slice().sort((x, y) => y.d.localeCompare(x.d));
  return (
    <View style={{ flex: 1, backgroundColor: PBG }}>
      <ScrollView ref={sc} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <LinearGradient colors={['#24065F', '#4207B5', C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: top + 200, paddingTop: top }}>
          <View style={{ position: 'absolute', left: -50, top: top + 10, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,.07)' }} />
          <View style={{ position: 'absolute', right: -40, top: top + 60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,186,8,.12)' }} />
          <View style={{ height: 52, paddingHorizontal: 16, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Pressable3 onPress={() => sheets.help()} accessibilityRole="button" accessibilityLabel="Plan questions" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={16} color={C.white}>?</Txt></Pressable3>
          </View>
          <View style={{ alignItems: 'center', marginTop: -6 }}>
            <Txt weight={600} size={22} color={C.white}>Washing Daddy</Txt>
            <Txt weight={800} size={38} color={C.white} style={{ letterSpacing: 0.5, marginTop: -4 }}>PLANS</Txt>
          </View>
        </LinearGradient>
        <View style={{ marginTop: -44 }}><Balance /></View>
        <View style={{ marginTop: 14 }}><Choose /></View>
        <Pressable3 onPress={() => openPage({ k: 'refer' })} style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1EBFF', alignItems: 'center', justifyContent: 'center' }}><Txt size={20}>🎁</Txt></View>
            <View style={{ flex: 1 }}><Txt weight={500} size={14} color={INK}>Refer and earn ₹200</Txt><Txt size={11.5} color="#8A849A">Share your code, both of you save</Txt></View>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#8A849A" strokeWidth={2} strokeLinecap="round"><Path d="M9 6l6 6-6 6" /></Svg>
          </Card>
        </Pressable3>
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 20, marginBottom: 6 }}>
          {BENEFITS.map(([t, s], i) => (
            <View key={t} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: LINE, paddingHorizontal: 4 }}>
              <Benefit i={i} /><Txt weight={500} size={11.5} color="#6B6580" style={{ marginTop: 8 }}>{t}</Txt><Txt size={10} color="#9B96A8">{s}</Txt>
            </View>
          ))}
        </View>
        {c.status !== 'new' && (
          <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Txt weight={500} size={17} color={INK}>Used this month</Txt><Txt size={11.5} color="#6B6580">{u.range}</Txt></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {u.cols.map(x => (
                <View key={x.label} style={{ width: '47.5%', flexGrow: 1, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COL[x.color] }} /><Txt weight={500} size={11.5} color={GREY}>{x.label}</Txt></View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 }}><CountUp to={x.used} dur={1000} weight={700} size={24} color={INK} /><Txt weight={500} size={12} color={GREY}>of {x.of}</Txt></View>
                  <Bar frac={x.of ? x.used / x.of : 0} color={COL[x.color]} />
                </View>
              ))}
            </View>
          </Card>
        )}
        <Card style={{ marginHorizontal: 16, marginTop: 14, padding: 14, backgroundColor: '#FBF9FF' }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Txt size={24}>✈︎</Txt>
            <View style={{ flex: 1 }}>
              <Txt weight={500} size={14} color={INK}>{pz ? `Paused ${fmt(c.paused!.from)} – ${fmt(c.paused!.to)}` : 'Going out of town?'}</Txt>
              <Txt size={11.5} color={GREY} style={{ marginTop: 2 }}>
                {pz ? 'Paused days are added to the end of your plan.' : cp ? `Pause up to ${PAUSE_MAX} days a month. ${pauseLeft(c, TODAY)} of ${PAUSE_MAX} left in ${fmt(TODAY, { month: 'long' })}.` : `Pausing comes with WD Pro and above: up to ${PAUSE_MAX} days a month.`}
              </Txt>
            </View>
          </View>
          {pz || cp ? <Pressable3 onPress={() => (pz ? run(act.resume) : sheets.pause())} style={{ marginTop: 12, height: 44, borderRadius: 8, borderWidth: 1, borderColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={14} color={C.violet}>{pz ? 'Resume washes now' : 'Choose dates'}</Txt></Pressable3> : null}
        </Card>
        <View style={{ marginTop: 14 }}><Bullets title="How it works" items={HOW} dot="round" /></View>
        <View style={{ marginTop: 14 }}><Bullets title="Using your plan" items={USING} dot="diamond" /></View>
        <Card style={{ marginHorizontal: 16, marginTop: 14, overflow: 'hidden' }}>
          <View style={{ padding: 14, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Txt weight={500} size={17} color={INK}>Payments</Txt>{pays.length ? <Txt size={11.5} color={GREY}>{pays.length + ' receipts'}</Txt> : null}</View>
          {pays.length ? pays.slice(0, 6).map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: LINE }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E3F6EE', alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} color={OK}>₹</Txt></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={13.5} color={INK}>{x.what}</Txt>
                <Txt size={11.5} color={GREY}>{`${fmt(x.d, { day: 'numeric', month: 'short', year: 'numeric' })} · ${x.via}${x.ref ? ' · ' + x.ref : ''}`}</Txt>
              </View>
              <Txt weight={600} size={13.5} color={INK}>{inr(x.amt)}</Txt>
            </View>
          )) : <View style={{ padding: 14, paddingTop: 2 }}><Txt weight={500} size={13.5} color={INK}>No payments yet</Txt><Txt size={11.5} color={GREY}>Your first receipt shows up here.</Txt></View>}
        </Card>
      </ScrollView>
    </View>
  );
}
