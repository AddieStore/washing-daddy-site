// Plans: one card per plan, stacked one under another, all in the same calm style. Tap a card to select it.
import React from 'react';
import { View } from 'react-native';
import { C } from '../../theme';
import { Txt } from '../kit';
import { Pressable3, FadeUp } from '../motion';
import { Check } from '../icons';
import { PLANS, sellablePlans } from '../../data/reference';
import type { Plan } from '../../data/reference';
import { PAUSE_MAX } from '../../data/model';
import { inr } from '../../data/dates';

const INK = '#171717', SEC = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', V = C.violet, TINT = '#F6F2FF';
const ORDER = ['std', 'pro', 'exc', 'res'];
const perDay = (p: Plan) => Math.round(p.price / 30);
const canPausePlan = (p: Plan) => p.id !== 'std' && p.id !== 'legacy';

// What the plan includes, straight from its rows, plus the perks every plan has
function lines(p: Plan): [string, string][] {
  const r = p.rows.filter(([, v]) => v && v !== '—');
  return [...r, ['Live photos', 'Every wash'], ...(canPausePlan(p) ? [['Pause days', `Up to ${PAUSE_MAX} a month`] as [string, string]] : [])];
}

function PlanCard({ p, on, cur, onPress }: { p: Plan; on: boolean; cur: boolean; onPress: () => void }) {
  return (
    <Pressable3 onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${p.name}, ${inr(p.price)} a month`} accessibilityState={{ selected: on }}>
      <View style={{ backgroundColor: C.white, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? V : LINE, padding: on ? 17 : 18, shadowColor: '#1A1033', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt weight={600} size={17} color={INK}>{p.name}</Txt>
            <Txt size={13} color={MUTED} style={{ marginTop: 2 }}>{cur ? 'Your current plan' : `About ₹${perDay(p)} a day`}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt weight={700} size={20} color={INK}>{inr(p.price)}</Txt>
            <Txt size={12} color={MUTED}>a month</Txt>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: LINE, marginVertical: 14 }} />
        <View style={{ gap: 10 }}>
          {lines(p).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,0.12)' }}>
                <Check size={12} color={C.green} strokeWidth={2.6} />
              </View>
              <Txt size={14} color={SEC} style={{ flex: 1 }}>{k}</Txt>
              <Txt weight={500} size={14} color={INK}>{v}</Txt>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 16, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: on ? V : TINT }}>
          {on ? <Check size={14} color={C.white} strokeWidth={2.4} /> : null}
          <Txt weight={600} size={14} color={on ? C.white : V}>{cur && on ? 'Your plan' : on ? 'Selected' : 'Choose ' + p.name.replace('WD ', '')}</Txt>
        </View>
      </View>
    </Pressable3>
  );
}

export function PlanPicker({ sel, setSel, curId, cta, onCta }: { sel: Plan['id']; setSel: (id: Plan['id']) => void; curId: string; cta: string; onCta: () => void; lead?: boolean }) {
  const sell = sellablePlans().map(p => p.id as string);
  const plans = ORDER.map(id => PLANS.find(p => p.id === id)).filter((p): p is Plan => !!p && (sell.includes(p.id) || p.id === 'std' || p.id === 'pro' || p.id === curId));
  return (
    <View>
      <View style={{ gap: 14 }}>
        {plans.map((p, i) => (
          <FadeUp key={p.id} delay={i * 70}>
            <PlanCard p={p} on={sel === p.id} cur={curId === p.id} onPress={() => setSel(p.id)} />
          </FadeUp>
        ))}
      </View>
      <Txt size={12} color={MUTED} style={{ marginTop: 12, textAlign: 'center', lineHeight: 17 }}>Billed monthly, per car. The daily price is the monthly fee over 30 days.</Txt>
      <Pressable3 onPress={onCta} accessibilityRole="button" style={{ marginTop: 18, minHeight: 52, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Txt weight={600} size={16} color={C.white}>{cta}</Txt>
      </Pressable3>
    </View>
  );
}
