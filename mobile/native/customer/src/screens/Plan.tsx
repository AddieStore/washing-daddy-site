// Plan tab, laid out like Pronto's Money tab: header, plan summary, plan chips + pay button, usage, pause, How it works, payments.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, Easing } from 'react-native';
import { C, SP } from '../theme';
import { Page, Topbar, Txt, CountUp, Ring, useTheme } from '../ui/kit';
import { Help } from '../ui/icons';
import { PLANS, sellablePlans } from '../data/reference';
import { PAUSE_MAX, canPause, pauseLeft } from '../data/model';
import { TODAY, fmt, iso, inr } from '../data/dates';
import { src, RATIO, ImgKey } from '../img';
import { A, car, carImg, daysLeft, planStatus, planOf, maskPlate, usage, act, toast, useApp, pendingRef } from '../state';
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

// plan summary: violet-tinted card with the plan, price, status and days left (Pronto's wallet balance block)
function Summary() {
  const c = car(), p = planOf(c), im = carImg(c), left = daysLeft(c), st = planStatus(c);
  const k = (im && im in RATIO ? RATIO[im as ImgKey] : 1.6);
  const kv = (l: string, v: React.ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <Txt size={13} color={GREY}>{l}</Txt>{typeof v === 'string' ? <Txt weight={700} size={13} color={C.ink}>{v}</Txt> : v}
    </View>
  );
  return (
    <View style={{ backgroundColor: TINT, borderRadius: 20, padding: SP.card, overflow: 'hidden' }}>
      <Txt weight={600} size={12.5} color={C.violet}>{(c.make ? c.make + ' ' : '') + c.name} · {maskPlate(c.plate)}</Txt>
      <Txt weight={700} size={26} color={C.ink} style={{ marginTop: 2 }}>{p.name}</Txt>
      <Txt weight={800} size={22} color={C.violet} style={{ marginTop: 2 }}>{inr(p.price)} <Txt size={13} weight={600} color={GREY}>/ month</Txt></Txt>
      {pendingRef() && !c.till ? <Txt weight={600} size={12} color={OK} style={{ marginTop: 4 }}>Invite code applied: ₹200 off</Txt> : null}
      {im ? <Image source={src(im)!} resizeMode="contain" style={{ alignSelf: 'flex-end', marginTop: SP.s, width: 190, height: 190 / k }} /> : null}
      <Pressable onPress={() => run(act.carPhoto)} hitSlop={8} style={{ minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Txt weight={700} size={14} color={C.violet} style={{ textDecorationLine: 'underline' }}>{im ? 'Change car photo' : 'Add a photo of your car'}</Txt>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.l, marginTop: SP.m, paddingTop: SP.l, borderTopWidth: 1, borderTopColor: 'rgba(84,9,218,.15)' }}>
        <Ring frac={left == null ? 0 : left / 30} size={92} color={C.violet} track="rgba(84,9,218,.15)">
          <View style={{ alignItems: 'center' }}>
            {left == null ? <Txt weight={800} size={26} color={C.ink}>–</Txt> : <CountUp to={left} dur={1200} weight={800} size={26} color={C.ink} />}
            <Txt weight={600} size={10} color={GREY}>{left == null ? 'not paid' : 'days left'}</Txt>
          </View>
        </Ring>
        <View style={{ flex: 1, gap: SP.m }}>
          {kv('Status', <View style={{ borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: st[1] }}><Txt weight={700} size={11.5} color={st[2]}>{st[0]}</Txt></View>)}
          {kv('Paid up till', c.till ? fmt(c.till, { day: 'numeric', month: 'short', year: 'numeric' }) : 'After first wash')}
          {kv('Washer', c.washer)}
        </View>
      </View>
    </View>
  );
}

// plan chips + pay button (Pronto "Add money" amount chips): pick a plan, then pay or switch
function Choose() {
  const c = car(), p = planOf(c), plans = sellablePlans();
  const [sel, setSel] = useState(p.id);
  const pl = PLANS.find(x => x.id === sel) || p, cur = pl.id === p.id;
  const label = cur ? `${c.till ? 'Pay next month' : 'Pay first month'} · ${inr(pl.price)}` : `${pl.price > p.price ? 'Upgrade to' : 'Switch to'} ${pl.name}`;
  return (
    <View>
      <Head title="Choose your plan" right="Swipe to compare" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.s }}>
        {plans.map(x => {
          const on = x.id === sel;
          return (
            <Pressable key={x.id} onPress={() => setSel(x.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? TINT : C.white, borderWidth: 1.5, borderColor: on ? C.violet : HAIR }}>
              <Txt weight={700} size={15} color={on ? C.violet : C.ink}>{inr(x.price)}</Txt>
              <Txt weight={600} size={10.5} color={on ? C.violet : GREY}>{x.id === p.id ? `${x.name} · yours` : x.name}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Panel style={{ marginTop: SP.m, gap: SP.s }}>
        <Txt weight={700} size={15} color={C.ink}>{pl.name} <Txt size={13} color={GREY}>{`· ${inr(pl.price)} / month`}</Txt></Txt>
        {pl.rows.map(r => (
          <View key={r[0]} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: HAIR, paddingTop: SP.s }}>
            <Txt weight={600} size={13} color={GREY}>{r[0]}</Txt>
            {r[1] === '—' ? <Txt size={13} color={GREY}>–</Txt>
              : <View style={{ backgroundColor: TINT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}><Txt weight={700} size={12} color={C.violet}>{r[1]}</Txt></View>}
          </View>
        ))}
      </Panel>
      <View style={{ marginTop: SP.l }}>
        <BigBtn label={label} onPress={() => (cur ? sheets.payPlan() : sheets.switchPlan(pl.id))} />
      </View>
    </View>
  );
}

const HOW = [
  ['Pick a plan', 'Choose how many mornings a week your car gets a pressure wash.'],
  ['Pay once a month', 'UPI, card or netbanking through Cashfree. Receipts show up below.'],
  ['Your washer comes before 7:30 AM', 'Watch every step live on the Washes tab and get a photo when done.'],
  ['Going away? Pause', 'WD Pro and above can pause days; paused days are added to the end of your plan.'],
];

export default function Plan() {
  const { tabNonce } = useApp(), T = useTheme();
  const sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const c = car(), u = usage(c), a = A();
  const pz = !!c.paused && c.paused.to >= iso(TODAY), cp = canPause(c);
  const pays = a.payments.slice().sort((x, y) => y.d.localeCompare(x.d));
  return (
    <Page {...({ ref: sc } as any)} header={<Topbar left={<Txt weight={700} size={22} color={C.ink}>Plan</Txt>}
      right={<Pressable onPress={() => sheets.help()} accessibilityRole="button" accessibilityLabel="Plan questions" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' }}><Help size={20} color={C.violet} /></Pressable>} />}>
      <Txt weight={700} size={26} color={C.ink} style={{ lineHeight: 33 }}>Daily pressure wash. Zero pocha.</Txt>
      <View style={{ marginTop: SP.l }}><Summary /></View>
      <View style={{ marginTop: SP.section }}><Choose /></View>
      {c.status !== 'new' && (
        <View style={{ marginTop: SP.section }}>
          <Head title="Used this month" right={u.range} />
          {[u.cols.slice(0, 2), u.cols.slice(2)].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: SP.m, marginBottom: ri === 0 ? SP.m : 0 }}>
              {row.map(x => (
                <Panel key={x.label} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COL[x.color] }} />
                    <Txt weight={600} size={12} color={GREY}>{x.label}</Txt>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: SP.s }}>
                    <CountUp to={x.used} dur={1000} weight={800} size={28} color={C.ink} />
                    <Txt weight={600} size={13} color={GREY}>of {x.of}</Txt>
                  </View>
                  <Bar frac={x.of ? x.used / x.of : 0} color={COL[x.color]} />
                </Panel>
              ))}
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: SP.section }}>
        <Panel style={{ backgroundColor: TINT2 }}>
          <View style={{ flexDirection: 'row', gap: SP.m, alignItems: 'center' }}>
            <Txt size={26}>✈︎</Txt>
            <View style={{ flex: 1 }}>
              <Txt weight={700} color={C.ink}>{pz ? `Paused ${fmt(c.paused!.from)} – ${fmt(c.paused!.to)}` : 'Going out of town?'}</Txt>
              <Txt size={12.5} color={GREY}>
                {pz ? 'Paused days are added to the end of your plan.' : cp ? `Pause up to ${PAUSE_MAX} days a month, any days you like. ${pauseLeft(c, TODAY)} of ${PAUSE_MAX} left in ${fmt(TODAY, { month: 'long' })}.` : `Pausing comes with WD Pro and above: up to ${PAUSE_MAX} days a month.`}
              </Txt>
            </View>
          </View>
          {pz ? <View style={{ marginTop: SP.l }}><BigBtn ghost label="Resume washes now" onPress={() => run(act.resume)} /></View>
            : cp ? <View style={{ marginTop: SP.l }}><BigBtn ghost label="Choose dates" onPress={() => sheets.pause()} /></View> : null}
        </Panel>
      </View>
      <View style={{ marginTop: SP.section }}>
        <Head title="How it works" />
        <View style={{ gap: SP.m }}>
          {HOW.map(([t, s], i) => (
            <View key={t} style={{ flexDirection: 'row', gap: SP.m, alignItems: 'flex-start' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={13} color={C.violet}>{String(i + 1)}</Txt></View>
              <View style={{ flex: 1 }}>
                <Txt weight={600} size={14.5} color={C.ink}>{t}</Txt>
                <Txt size={12.5} color={GREY} style={{ marginTop: 1 }}>{s}</Txt>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ marginTop: SP.section }}>
        <Head title="Payments" right={pays.length ? pays.length + ' receipts' : undefined} />
        <Panel style={{ padding: 0 }}>
          {pays.length ? pays.slice(0, 6).map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: SP.l, borderTopWidth: i ? 1 : 0, borderTopColor: HAIR }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F6EE', alignItems: 'center', justifyContent: 'center' }}><Txt weight={800} color={OK}>₹</Txt></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={600} size={15} color={C.ink}>{x.what}</Txt>
                <Txt size={12.5} color={GREY}>{`${fmt(x.d, { day: 'numeric', month: 'short', year: 'numeric' })} · ${x.via}${x.ref ? ' · ' + x.ref : ''}`}</Txt>
              </View>
              <Txt weight={700} size={14} color={C.ink}>{inr(x.amt)}</Txt>
            </View>
          )) : <View style={{ padding: SP.l }}><Txt weight={600} size={15} color={C.ink}>No payments yet</Txt><Txt size={12.5} color={GREY}>Your first receipt shows up here.</Txt></View>}
        </Panel>
      </View>
    </Page>
  );
}
