// Plans hero: Standard and Pro side by side, a Standard vs Pro compare table, and smaller premium rows.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withDelay, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../../theme';
import { Txt } from '../kit';
import { Pressable3, useCountUp } from '../motion';
import { Check, Chev, Camera, Pause, Clock, Drop, Sunrise } from '../icons';
import { PLANS, sellablePlans } from '../../data/reference';
import type { Plan } from '../../data/reference';
import { PAUSE_MAX } from '../../data/model';
import { inr } from '../../data/dates';

const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', V = C.violet, SAFFRON = '#FFBA08', TINT = '#F6F2FF';
const PERK = 'before 7:30 AM';
const std = () => PLANS.find(p => p.id === 'std')!, pro = () => PLANS.find(p => p.id === 'pro')!;
const perDay = (p: Plan) => Math.round(p.price / 30);
const row = (p: Plan, k: string) => (p.rows.find(r => r[0] === k) || ['', '—'])[1];
const has = (p: Plan, k: string) => row(p, k) !== '—';
const canPausePlan = (p: Plan) => p.id !== 'std' && p.id !== 'legacy';

// [headline, label] checklist lines for one plan, built from PLANS rows
function items(p: Plan): { on: boolean; big: string; small: string; Ic: React.ComponentType<any> }[] {
  const pz = canPausePlan(p);
  return [
    { on: true, big: row(p, 'Pressure wash'), small: 'Pressure wash', Ic: Drop },
    { on: true, big: row(p, 'Interior'), small: 'Interior clean', Ic: Check },
    { on: has(p, 'Foam wash'), big: row(p, 'Foam wash'), small: 'Foam wash', Ic: Check },
    { on: has(p, 'Tyre & trim'), big: row(p, 'Tyre & trim'), small: 'Tyre & trim', Ic: Check },
    { on: has(p, 'Detailing'), big: has(p, 'Detailing') ? row(p, 'Detailing') : 'Not included', small: 'Detailing', Ic: Check },
    { on: true, big: 'Every wash', small: 'Live photos', Ic: Camera },
    { on: pz, big: pz ? `Up to ${PAUSE_MAX} days a month` : 'Not included', small: 'Pause days', Ic: Pause },
    { on: true, big: PERK, small: 'Morning wash', Ic: Clock },
  ];
}

function Sweep({ w }: { w: number }) {
  const rm = useReducedMotion(), x = useSharedValue(-80);
  useEffect(() => {
    if (rm) return;
    x.value = withRepeat(withSequence(withDelay(1800, withTiming(w + 80, { duration: 1100, easing: Easing.inOut(Easing.quad) })), withTiming(-80, { duration: 0 })), -1);
  }, [w, rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '18deg' }] }));
  if (rm) return null;
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: -40, bottom: -40, width: 56 }, st]}>
      <LinearGradient colors={['rgba(255,186,8,0)', 'rgba(255,186,8,0.30)', 'rgba(255,186,8,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Reanimated.View>
  );
}

function Tick({ to, size, color, weight = 600, suffix }: { to: number; size: number; color: string; weight?: 500 | 600 | 700; suffix?: string }) {
  const v = useCountUp(to, 700);
  return <Txt weight={weight} size={size} color={color}>{inr(Math.round(v)) + (suffix || '')}</Txt>;
}

function PlanCard({ p, on, cur, badge, hot, onPress }: { p: Plan; on: boolean; cur: boolean; badge: string; hot?: boolean; onPress: () => void }) {
  const [w, setW] = useState(160);
  return (
    <View style={{ flex: 1 }}>
      <Pressable3 onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${p.name}, ${inr(p.price)} a month`} accessibilityState={{ selected: on }} style={{ flex: 1 }}>
        <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flex: 1, backgroundColor: C.white, borderRadius: 18, borderWidth: 2, borderColor: on ? V : LINE, overflow: 'hidden', shadowColor: '#1A1033', shadowOpacity: on ? 0.16 : 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: on ? 4 : 2 }}>
          <View style={{ height: 36, backgroundColor: hot ? SAFFRON : TINT, paddingLeft: 10, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt weight={600} size={11} color={hot ? INK : V} numberOfLines={1} style={{ flexShrink: 1 }}>{badge.toUpperCase()}</Txt>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? V : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: hot ? 'rgba(23,23,23,0.35)' : 'rgba(84,9,218,0.3)' }}>
              {on ? <Check size={14} color={C.white} strokeWidth={2.4} /> : null}
            </View>
          </View>
          <View style={{ padding: 12 }}>
            <Txt weight={600} size={15} color={INK}>{p.name}</Txt>
            <View style={{ marginTop: 6 }}><Tick to={p.price} size={26} color={V} weight={700} /></View>
            <Txt size={12} color={MUTED}>a month</Txt>
            <View style={{ alignSelf: 'flex-start', marginTop: 8, borderRadius: 8, backgroundColor: TINT, paddingVertical: 3, paddingHorizontal: 8 }}>
              <Txt weight={600} size={12} color={V}>{'₹' + perDay(p) + '/day'}</Txt>
            </View>
            <View style={{ height: 1, backgroundColor: LINE, marginVertical: 12 }} />
            <View style={{ gap: 10 }}>
              {items(p).map(it => (
                <View key={it.small} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: it.on ? 'rgba(22,163,74,0.12)' : RAISED }}>
                    {it.on ? <Check size={12} color={C.green} strokeWidth={2.6} /> : <View style={{ width: 6, height: 1.5, backgroundColor: '#A3A3A3' }} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt weight={it.on ? 600 : 400} size={13} color={it.on ? INK : MUTED} style={{ lineHeight: 17 }}>{it.big}</Txt>
                    <Txt size={11} color={MUTED} style={{ lineHeight: 15 }}>{it.small}</Txt>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 14, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? V : TINT }}>
              <Txt weight={600} size={13} color={on ? C.white : V}>{cur ? 'Your plan' : on ? 'Selected' : 'Select'}</Txt>
            </View>
          </View>
          {hot ? <Sweep w={w} /> : null}
        </View>
      </Pressable3>
    </View>
  );
}
const RAISED = '#F4F4F5';

// Standard vs Pro table. A tick means included; text shows how often.
function Compare({ sel }: { sel: string }) {
  const s = std(), r = pro();
  const lines: [string, string, string][] = [
    ['Pressure wash', row(s, 'Pressure wash'), row(r, 'Pressure wash')],
    ['Interior', row(s, 'Interior'), row(r, 'Interior')],
    ['Foam wash', row(s, 'Foam wash'), row(r, 'Foam wash')],
    ['Tyre & trim', row(s, 'Tyre & trim'), row(r, 'Tyre & trim')],
    ['Detailing', row(s, 'Detailing'), row(r, 'Detailing')],
    ['Live photos', 'yes', 'yes'],
    ['Pause days', '—', `${PAUSE_MAX} a month`],
    ['Morning wash', PERK, PERK],
  ];
  const cell = (v: string, hi: boolean, last: boolean) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 4, backgroundColor: hi ? 'rgba(84,9,218,0.06)' : 'transparent', borderTopWidth: 0 }}>
      {v === 'yes' ? <Check size={16} color={C.green} strokeWidth={2.6} /> : v === '—' ? <Txt size={13} color="#A3A3A3">—</Txt> : <Txt weight={500} size={12} color={INK} style={{ textAlign: 'center' }}>{v}</Txt>}
    </View>
  );
  return (
    <View style={{ backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: LINE, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1.05 }} />
        {[s, r].map(p => (
          <View key={p.id} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: p.id === 'pro' ? SAFFRON : TINT, borderBottomWidth: sel === p.id ? 3 : 0, borderBottomColor: V }}>
            <Txt weight={700} size={13} color={p.id === 'pro' ? INK : V}>{p.name.replace('WD ', '')}</Txt>
            <Txt size={11} color={p.id === 'pro' ? INK : SEC}>{inr(p.price)}</Txt>
          </View>
        ))}
      </View>
      {lines.map((l, i) => (
        <View key={l[0]} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: LINE }}>
          <View style={{ flex: 1.05, justifyContent: 'center', paddingLeft: 12, paddingRight: 4 }}><Txt size={13} color={SEC}>{l[0]}</Txt></View>
          {cell(l[1], sel === 'std', i === lines.length - 1)}
          {cell(l[2], sel === 'pro', i === lines.length - 1)}
        </View>
      ))}
    </View>
  );
}

function Premium({ plans, sel, cur, onPick }: { plans: Plan[]; sel: string; cur: string; onPick: (id: Plan['id']) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {plans.map(p => {
        const on = sel === p.id;
        return (
          <Pressable3 key={p.id} onPress={() => onPick(p.id)} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: C.white, borderWidth: 2, borderColor: on ? V : LINE }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? V : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: 'rgba(84,9,218,0.3)' }}>{on ? <Check size={14} color={C.white} strokeWidth={2.4} /> : null}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={600} size={14} color={INK}>{p.name + (cur === p.id ? ' · your plan' : '')}</Txt>
                <Txt size={12} color={MUTED} style={{ lineHeight: 16 }}>{`Interior ${row(p, 'Interior')} · Foam ${row(p, 'Foam wash')} · Detailing ${row(p, 'Detailing')}`}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}><Txt weight={700} size={15} color={V}>{inr(p.price)}</Txt><Txt size={11} color={MUTED}>a month</Txt></View>
            </View>
          </Pressable3>
        );
      })}
    </View>
  );
}

export function PlanPicker({ sel, setSel, curId, cta, onCta, lead }: { sel: Plan['id']; setSel: (id: Plan['id']) => void; curId: string; cta: string; onCta: () => void; lead?: boolean }) {
  const prem = sellablePlans().filter(p => p.id !== 'std' && p.id !== 'pro');
  const s = std(), r = pro();
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
        <PlanCard p={s} on={sel === 'std'} cur={curId === 'std'} badge="Most popular" onPress={() => setSel('std')} />
        <PlanCard p={r} on={sel === 'pro'} cur={curId === 'pro'} badge="Best value" hot onPress={() => setSel('pro')} />
      </View>
      <Txt size={12} color={MUTED} style={{ marginTop: 10, textAlign: 'center' }}>{`Per-day price is the monthly fee over 30 days. Pausing is a Pro perk: up to ${PAUSE_MAX} days a month.`}</Txt>
      <Txt weight={600} size={18} color={INK} style={{ marginTop: 28 }}>Compare Standard and Pro</Txt>
      <View style={{ marginTop: 12 }}><Compare sel={sel} /></View>
      <Txt weight={600} size={18} color={INK} style={{ marginTop: 28 }}>Premium plans</Txt>
      <Txt size={13} color={SEC} style={{ marginTop: 4, marginBottom: 12 }}>More interior, foam and detailing, with a free car perfume.</Txt>
      <Premium plans={prem} sel={sel} cur={curId} onPick={setSel} />
      <Pressable3 onPress={onCta} accessibilityRole="button" style={{ marginTop: 20, minHeight: 52, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowColor: V, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
        <Txt weight={600} size={16} color={C.white}>{cta}</Txt>
      </Pressable3>
    </View>
  );
}
