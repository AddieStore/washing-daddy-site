// Plan tab: header, plan summary, plan chips + pay button, usage, pause, how it works, payments.
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets, type } from '../ui/kit';
import { Footer } from '../ui/Footer';
import { Pressable3, FadeUp, TAB_BAR_H } from '../ui/motion';
import { Help, Pause, Check } from '../ui/icons';
import { PLANS } from '../data/reference';
import type { PlanId } from '../data/reference';
import { PlanPicker, PlanCta } from '../ui/plans/PlanPicker';
import { PAUSE_MAX, canPause, pauseLeft } from '../data/model';
import { TODAY, fmt, iso, inr } from '../data/dates';
import { A, car, planOf, usage, act, toast, useApp } from '../state';
import { sheets } from '../sheets';

const run = (f: () => Promise<unknown>) => f().catch((e: Error) => toast(e.message));
const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5';
const SH = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;
const TN = { fontVariant: ['tabular-nums'] } as const;
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[{ backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: LINE }, SH, style]}>{children}</View>;
const Ghost = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable3 onPress={onPress} style={{ marginTop: 12, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(23,23,23,0.16)', alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={INK}>{label}</Txt></Pressable3>
);

function Bar({ frac }: { frac: number }) {
  const f = Math.max(0, Math.min(1, frac));
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: C.canvas2, marginTop: 12, overflow: 'hidden' }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: C.violet, width: `${f * 100}%` }} />
    </View>
  );
}

// pick a plan (the sticky button is in Plan)
function ctaFor(sel: PlanId) {
  const c = car(), p = planOf(c), pl = PLANS.find(x => x.id === sel) || p, cur = pl.id === p.id, per = `${inr(pl.price)}/month`;
  const label = cur ? (c.till ? `Renew ${pl.name.replace('WD ', '')} · ${per}` : `Start tomorrow morning · ${per}`) : `${pl.price > p.price ? 'Upgrade to' : 'Switch to'} ${pl.name.replace('WD ', '')} · ${per}`;
  return { label, go: () => (cur ? sheets.payPlan() : sheets.switchPlan(pl.id)) };
}
export default function Plan() {
  const { tabNonce } = useApp(), ins = useInsets();
  const top = Math.max(ins.top, 24), sc = useRef<any>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const c = car(), u = usage(c), a = A(), [sel, setSel] = useState<PlanId>(planOf(c).id), cta = ctaFor(sel), tabH = TAB_BAR_H + Math.max(ins.bottom, 0) + 8;
  const isNew = c.status === 'new', pz = !!c.paused && c.paused.to >= iso(TODAY), cp = canPause(c);
  const pays = a.payments.slice().sort((x, y) => y.d.localeCompare(x.d));
  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <ScrollView ref={sc} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 0 }}>
        <View style={{ paddingTop: top, paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt {...type.h1} color={INK}>Monthly plans</Txt>
            <Pressable3 onPress={() => sheets.help()} accessibilityRole="button" accessibilityLabel="Plan questions" style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.white, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' }}><Help size={18} color={INK} strokeWidth={1.5} /></Pressable3>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          <FadeUp duration={300} distance={8}><PlanPicker sel={sel} setSel={setSel} curId={planOf(c).id} /></FadeUp>
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 32, gap: 12 }}>
          {c.status !== 'new' && (
            <FadeUp index={2} distance={8}><Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Txt weight={500} size={18} color={INK}>Used this month</Txt><Txt size={12} color={MUTED}>{u.range}</Txt></View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {u.cols.map(x => (
                  <View key={x.label} style={{ width: '47%', flexGrow: 1, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 12 }}>
                    <Txt size={13} color={SEC}>{x.label}</Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}><Txt weight={500} size={22} color={INK} style={TN}>{String(x.used)}</Txt><Txt size={13} color={MUTED} style={TN}>of {x.of}</Txt></View>
                    <Bar frac={x.of ? x.used / x.of : 0} />
                  </View>
                ))}
              </View>
            </Card></FadeUp>
          )}
          <FadeUp index={3} distance={8}><Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pause size={18} color={MUTED} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Txt weight={500} size={15} color={INK}>{pz ? `Paused ${fmt(c.paused!.from)} – ${fmt(c.paused!.to)}` : 'Going out of town?'}</Txt>
                <Txt size={13} color={SEC} style={{ marginTop: 4, lineHeight: 20 }}>
                  {pz ? 'Paused days are added to the end of your plan.' : cp ? `Pause up to ${PAUSE_MAX} days a month. ${pauseLeft(c, TODAY)} of ${PAUSE_MAX} left in ${fmt(TODAY, { month: 'long' })}.` : `Pausing comes with WD Pro and above: up to ${PAUSE_MAX} days a month.`}
                </Txt>
              </View>
            </View>
            {pz || cp ? <Ghost label={pz ? 'Resume washes now' : 'Choose dates'} onPress={() => (pz ? run(act.resume) : sheets.pause())} /> : null}
          </Card></FadeUp>
        </View>
        <Card style={{ marginHorizontal: 16, marginTop: 32, overflow: 'hidden' }}>
          <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Txt weight={500} size={18} color={INK}>Payments</Txt>{pays.length ? <Txt size={12} color={MUTED}>{pays.length + ' receipts'}</Txt> : null}</View>
          {pays.length ? pays.slice(0, 6).map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: LINE }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={14} color={INK}>{x.what}</Txt>
                <Txt size={12} color={MUTED} style={TN}>{`${fmt(x.d, { day: 'numeric', month: 'short', year: 'numeric' })} · ${x.via}${x.ref ? ' · ' + x.ref : ''}`}</Txt>
              </View>
              <Txt weight={500} size={14} color={INK} style={TN}>{inr(x.amt)}</Txt>
            </View>
          )) : <View style={{ padding: 16, paddingTop: 0 }}><Txt weight={500} size={14} color={INK}>No payments yet</Txt><Txt size={12} color={MUTED}>Your first receipt shows up here</Txt></View>}
        </Card>
        <Footer bg={C.page} extraBottom={110} />
      </ScrollView>
      <PlanCta label={cta.label} onPress={cta.go} bottom={tabH} />
    </View>
  );
}
