// Plan tab: ticket, usage, all plans, pause, payments. Ported from renderPlan/animatePlan in the web app.
import React, { useEffect, useRef } from 'react';
import { View, Image, Pressable, ScrollView, Animated, Easing } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { C, InkContext } from '../theme';
import { Page, Topbar, IconBtn, Eyebrow, BigTitle, Em, Txt, Card, Rows, Row, Btn, Hard, Ring, CountUp, Gap, PAD, useTheme, useInk } from '../ui/kit';
import { Help, Card as CardIc } from '../ui/icons';
import { PLANS } from '../data/reference';
import { PAUSE_MAX, canPause, pauseLeft } from '../data/model';
import { TODAY, fmt, iso, inr } from '../data/dates';
import { src, RATIO, ImgKey } from '../img';
import { A, car, carImg, daysLeft, planStatus, planOf, maskPlate, usage, act, toast, useApp } from '../state';
import { sheets } from '../sheets';

const run = (f: () => Promise<unknown>) => f().catch((e: Error) => toast(e.message));
const COL = { violet: C.violet, orange: C.orange, sky: C.sky, gold: C.gold, mint: C.mint };

function Head({ title, right }: { title: string; right?: string }) {
  const T = useTheme(), ink = useInk();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <Txt font="shout" size={30} upper style={[{ flexShrink: 1 }, T.day && { textShadowColor: C.violetInk, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 }]}>{title}</Txt>
      {right ? <Txt size={13} color={ink.fg3}>{right}</Txt> : null}
    </View>
  );
}

function Bar({ frac, color }: { frac: number; color: string }) {
  const ink = useInk(), v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: Math.max(0, Math.min(1, frac)), duration: 1400, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [frac]);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: ink.tile2, marginTop: 10, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

function Ticket() {
  const T = useTheme(), c = car(), p = planOf(c), im = carImg(c), left = daysLeft(c), st = planStatus(c);
  const carW = Math.round((Math.min(useWindowDimensions().width, 440) - 36) * .6);
  const k = (im && im in RATIO ? RATIO[im as ImgKey] : 1.6);
  const kv = (l: string, v: React.ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Txt size={13} color={T.card.fg2}>{l}</Txt>{typeof v === 'string' ? <Txt weight={700} size={13}>{v}</Txt> : v}
    </View>
  );
  return (
    <Hard radius={24}>
      <InkContext.Provider value={T.card}>
        <View style={{ backgroundColor: T.cardBg, borderWidth: T.cardBorderW, borderColor: T.cardBorder, borderRadius: 24, overflow: 'hidden' }}>
          <InkContext.Provider value={T.block}>
            <View style={{ backgroundColor: T.day ? C.violetDeep : C.violet2, padding: 22, paddingBottom: 18, borderBottomWidth: T.day ? 3 : 0, borderBottomColor: C.ink, overflow: 'hidden' }}>
              <Eyebrow color={C.gold}>{(c.make ? c.make + ' ' : '') + c.name} · {maskPlate(c.plate)}</Eyebrow>
              <Txt font="shout" size={40} upper style={{ marginTop: 4 }}>{p.name}</Txt>
              <Txt font="shout" size={22} style={{ marginTop: 6, letterSpacing: 0.4 }}>{inr(p.price)} / month</Txt>
              {im ? <Image source={src(im)!} resizeMode="contain" style={{ position: 'absolute', right: -30, bottom: -14, width: carW, height: carW / k }} /> : null}
              <Pressable onPress={() => run(act.carPhoto)} hitSlop={8} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Txt weight={700} size={14} style={{ textDecorationLine: 'underline' }}>{im ? 'Change car photo' : 'Add a photo of your car'}</Txt>
              </Pressable>
            </View>
          </InkContext.Provider>
          <View style={{ height: 26, justifyContent: 'center', marginHorizontal: 18 }}>
            <View style={{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(26,10,51,.2)' }} />
            {[-31, null].map((l, i) => <View key={i} style={{ position: 'absolute', top: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: T.bg, borderWidth: T.day ? 3 : 1, borderColor: T.cardBorder, ...(l === null ? { right: -31 } : { left: l }) }} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 22, paddingBottom: 18 }}>
            <Ring frac={left == null ? 0 : left / 30} size={100} color={C.violet} track="rgba(26,10,51,.1)">
              <View style={{ alignItems: 'center' }}>
                {left == null ? <Txt font="shout" size={30}>–</Txt> : <CountUp to={left} dur={1200} font="shout" size={30} />}
                <Txt weight={600} size={9} upper color={T.card.fg2} style={{ letterSpacing: 1 }}>{left == null ? 'not paid' : 'days left'}</Txt>
              </View>
            </Ring>
            <View style={{ flex: 1, gap: 8 }}>
              {kv('Status', <View style={{ borderRadius: 7, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: st[1] }}><Txt weight={800} size={11} upper color={st[2]} style={{ letterSpacing: 0.7 }}>{st[0]}</Txt></View>)}
              {kv('Paid up till', c.till ? fmt(c.till, { day: 'numeric', month: 'short', year: 'numeric' }) : 'After first wash')}
              {kv('Washer', c.washer)}
            </View>
          </View>
          <View style={{ paddingHorizontal: 22, paddingBottom: 22 }}>
            <Btn variant="violet" label={c.till ? 'Pay next month' : 'Pay first month'} icon={<CardIc size={18} color={C.cream} />} onPress={() => sheets.payPlan()} />
          </View>
        </View>
      </InkContext.Provider>
    </Hard>
  );
}
function PlanCard({ id }: { id: string }) {
  const T = useTheme(), c = car(), p = planOf(c), pl = PLANS.find(x => x.id === id)!, cur = id === p.id, res = id === 'res' && !cur, dark = cur || res;
  const bg = cur ? C.violet : res ? '#2a1200' : T.day ? C.white : 'rgba(255,255,255,.06)', ink = dark ? T.block : T.card;
  return (
    <View style={{ width: 250, marginRight: 14, marginBottom: 6 }}>
      <InkContext.Provider value={ink}>
        <View style={{ flex: 1, backgroundColor: bg, borderRadius: 32, padding: 22, gap: 12, overflow: 'hidden', borderWidth: res ? 1.5 : T.day ? 0 : 1, borderColor: res ? 'rgba(255,186,8,.5)' : T.cardBorder }}>
          {cur ? <View style={{ position: 'absolute', top: 16, right: 16, backgroundColor: C.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 }}><Txt font="shout" size={14} color={C.cream} upper style={{ letterSpacing: 0.8 }}>Your plan</Txt></View> : null}
          <Txt font="shout" size={26} upper style={{ letterSpacing: 0.5, marginTop: cur ? 18 : 0 }}>{pl.name}</Txt>
          <Txt font="hero" size={36} color={dark ? C.gold : C.violet}>{inr(pl.price)} <Txt size={12} weight={600} color={ink.fg3} style={{ fontFamily: undefined }}>/ month</Txt></Txt>
          <View style={{ gap: 7 }}>
            {pl.rows.map(r => (
              <View key={r[0]} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 2, borderStyle: 'dashed', borderColor: dark ? 'rgba(255,246,233,.3)' : 'rgba(26,10,51,.25)', paddingTop: 8 }}>
                <Txt weight={600} size={13} color={ink.fg2}>{r[0]}</Txt>
                {r[1] === '—' ? <Txt size={13} color={ink.fg3} style={{ paddingRight: 8 }}>–</Txt>
                  : <View style={{ backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}><Txt weight={800} size={12} color={C.ink}>{r[1]}</Txt></View>}
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          {cur ? <Btn label={c.till ? 'Pay next month' : 'Pay first month'} onPress={() => sheets.payPlan()} />
            : <Btn variant="ghost" label={`${pl.price > p.price ? 'Upgrade to' : 'Switch to'} ${pl.name}`} onPress={() => sheets.switchPlan(pl.id)} />}
        </View>
      </InkContext.Provider>
    </View>
  );
}

export default function Plan() {
  const { tabNonce } = useApp(), T = useTheme(), ink = useInk();
  const sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const c = car(), p = planOf(c), u = usage(c), a = A();
  const pz = !!c.paused && c.paused.to >= iso(TODAY), cp = canPause(c);
  const pays = a.payments.slice().sort((x, y) => y.d.localeCompare(x.d));
  const band = T.day ? { backgroundColor: C.cream, borderTopWidth: 12, borderBottomWidth: 12, borderColor: C.gold } : null;
  const bandInk = T.day ? T.card : ink;
  return (
    <Page {...({ ref: sc } as any)} header={<Topbar right={<IconBtn label="Plan questions" onPress={() => sheets.help()}><Help size={22} /></IconBtn>} />}>
      <Eyebrow>Your plan</Eyebrow>
      <BigTitle><>Daily <Em>pressure</Em> wash. Zero pocha.</></BigTitle>
      <Gap h={22} />
      <Ticket />
      {c.status !== 'new' && (
        <View style={{ marginTop: 24 }}>
          <Head title="Used this month" right={u.range} />
          {[u.cols.slice(0, 2), u.cols.slice(2)].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map(x => (
                <Card key={x.label} pad={14} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COL[x.color] }} />
                    <Txt weight={600} size={12} color={T.card.fg2}>{x.label}</Txt>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 8 }}>
                    <CountUp to={x.used} dur={1000} font="shout" size={32} />
                    <Txt weight={600} size={13} color={T.card.fg3}>of {x.of}</Txt>
                  </View>
                  <Bar frac={x.of ? x.used / x.of : 0} color={COL[x.color]} />
                </Card>
              ))}
            </View>
          ))}
        </View>
      )}
      <View style={[{ marginTop: 24, marginHorizontal: -PAD, paddingTop: 30, paddingBottom: 18 }, band]}>
        <InkContext.Provider value={bandInk}>
          <View style={{ paddingHorizontal: PAD, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <Txt font="shout" size={T.day ? 40 : 30} upper>All plans</Txt>
            <Txt size={13} color={bandInk.fg3}>Swipe to compare</Txt>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 12 }}>
            {PLANS.filter(pl => !pl.old || pl.id === p.id).map(pl => <PlanCard key={pl.id} id={pl.id} />)}
          </ScrollView>
        </InkContext.Provider>
      </View>
      <View style={{ marginTop: 24 }}>
        <Card pad={18}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Txt size={26}>✈︎</Txt>
            <View style={{ flex: 1 }}>
              <Txt weight={700}>{pz ? `Paused ${fmt(c.paused!.from)} – ${fmt(c.paused!.to)}` : 'Going out of town?'}</Txt>
              <Txt size={12.5} color={T.card.fg2}>
                {pz ? 'Paused days are added to the end of your plan.' : cp ? `Pause up to ${PAUSE_MAX} days a month, any days you like. ${pauseLeft(c, TODAY)} of ${PAUSE_MAX} left in ${fmt(TODAY, { month: 'long' })}.` : `Pausing comes with WD Pro and above: up to ${PAUSE_MAX} days a month.`}
              </Txt>
            </View>
          </View>
          {pz ? <Btn variant="ghost" label="Resume washes now" style={{ marginTop: 12 }} onPress={() => run(act.resume)} />
            : cp ? <Btn variant="ghost" label="Choose dates" style={{ marginTop: 12 }} onPress={() => sheets.pause()} /> : null}
        </Card>
      </View>
      <View style={{ marginTop: 24 }}>
        <Head title="Payments" right={pays.length ? pays.length + ' receipts' : undefined} />
        <Rows>
          {pays.length ? pays.slice(0, 6).map((x, i) => (
            <Row key={i} icon={<Txt weight={800} color={T.card.ok}>₹</Txt>} tile="rgba(20,192,138,.15)" title={x.what}
              sub={`${fmt(x.d, { day: 'numeric', month: 'short', year: 'numeric' })} · ${x.via}${x.ref ? ' · ' + x.ref : ''}`} right={inr(x.amt)} />
          )) : <Row title="No payments yet" sub="Your first receipt shows up here." />}
        </Rows>
      </View>
    </Page>
  );
}
