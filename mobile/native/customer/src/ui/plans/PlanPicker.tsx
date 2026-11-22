// Plans: one card per plan, stacked one under another, all in the same calm style. Tap a card to select it.
// The sticky "Start" button lives in PlanCta, which the screen places above the tab bar.
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
const canPausePlan = (p: Plan) => p.id !== 'std' && p.id !== 'legacy';
const NUM = { fontVariant: ['tabular-nums'] } as const;

// '2× / week' -> 'twice a week', 'Daily' -> 'every day', '1× / month' -> 'once a month'
const NTH: Record<string, string> = { '1': 'once', '2': 'twice' };
function freq(v: string): string {
  const m = v.match(/^(\d+)\s*×\s*\/\s*(week|month)$/i);
  if (m) return `${NTH[m[1]] || m[1] + ' times'} a ${m[2].toLowerCase()}`;
  if (/^daily$/i.test(v)) return 'every day';
  return v.charAt(0).toLowerCase() + v.slice(1);
}
const row = (p: Plan, k: string) => (p.rows.find(r => r[0] === k) || ['', ''])[1];

// One plain line under the plan name, built from the plan's own rows
export function benefit(p: Plan): string {
  const foam = row(p, 'Foam wash'), int = row(p, 'Interior');
  if (p.f.foam >= 7 && p.f.int >= 7) return 'Daily wash, interior and foam, every morning';
  if (p.f.foam >= 4) return `Daily morning wash, foam ${freq(foam)}`;
  if (p.f.foam >= 2) return `Daily morning wash, foam ${freq(foam)}`;
  return int && int !== '—' ? 'Daily morning wash at your parking spot' : 'Daily morning wash';
}

// What is included, straight from the plan rows, plus the perks every plan has and the pause rule
export function features(p: Plan): { t: string; on: boolean }[] {
  const out = p.rows.filter(([, v]) => v && v !== '—').map(([k, v]) => {
    if (k === 'Pressure wash') return { t: 'Pressure wash every morning', on: true };
    if (k === 'Car perfume') return { t: `Car perfume, free (${v.replace(/^Free,?\s*/i, '')})`, on: true };
    if (k === 'On-demand wash') return { t: `On-demand wash, ${v.replace(/^(\d+) a month$/, '$1 a month')}`, on: true };
    return { t: `${k}, ${freq(v)}`, on: true };
  });
  out.push({ t: 'Photo of every wash', on: true });
  out.push(canPausePlan(p) ? { t: `Pause up to ${PAUSE_MAX} days a month`, on: true } : { t: 'Pausing starts from WD Pro', on: false });
  return out;
}

function PlanCard({ p, on, cur, onPress }: { p: Plan; on: boolean; cur: boolean; onPress: () => void }) {
  return (
    <Pressable3 onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${p.name}, ${inr(p.price)} per month`} accessibilityState={{ selected: on }}>
      <View style={{ backgroundColor: on ? TINT : C.white, borderRadius: 16, borderWidth: 2, borderColor: on ? V : LINE, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? V : 'rgba(23,23,23,0.24)', backgroundColor: on ? V : C.white, alignItems: 'center', justifyContent: 'center' }}>
            {on ? <Check size={13} color={C.white} strokeWidth={3} /> : null}
          </View>
          <Txt weight={600} size={18} color={INK} style={{ flex: 1 }}>{p.name}</Txt>
          {cur ? <Txt weight={500} size={12} color={V}>Current plan</Txt> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
          <Txt weight={700} size={28} color={INK} style={NUM}>{inr(p.price)}</Txt>
          <Txt size={14} color={MUTED}>per month</Txt>
        </View>
        <Txt size={14} color={SEC} style={{ marginTop: 4, lineHeight: 21 }}>{benefit(p)}</Txt>
        <View style={{ height: 1, backgroundColor: on ? 'rgba(84,9,218,0.14)' : LINE, marginVertical: 16 }} />
        <View style={{ gap: 12 }}>
          {features(p).map(f => (
            <View key={f.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: f.on ? 'rgba(84,9,218,0.10)' : 'rgba(23,23,23,0.06)' }}>
                {f.on ? <Check size={12} color={V} strokeWidth={2.8} /> : <View style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: MUTED }} />}
              </View>
              <Txt size={14} color={f.on ? INK : MUTED} style={{ flex: 1, lineHeight: 20 }}>{f.t}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Pressable3>
  );
}

export function PlanPicker({ sel, setSel, curId }: { sel: Plan['id']; setSel: (id: Plan['id']) => void; curId: string; cta?: string; onCta?: () => void; lead?: boolean }) {
  const sell = sellablePlans().map(p => p.id as string);
  const plans = ORDER.map(id => PLANS.find(p => p.id === id)).filter((p): p is Plan => !!p && (sell.includes(p.id) || p.id === curId));
  return (
    <View style={{ gap: 14 }}>
      {plans.map((p, i) => (
        <FadeUp key={p.id} delay={i * 70}>
          <PlanCard p={p} on={sel === p.id} cur={curId === p.id} onPress={() => setSel(p.id)} />
        </FadeUp>
      ))}
    </View>
  );
}

// Sticky bottom bar: the selected plan and price on the button, one calm reassurance line under it
export function PlanCta({ label, onPress, bottom }: { label: string; onPress: () => void; bottom: number }) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom }}>
      <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: LINE, shadowColor: '#1A1033', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <Pressable3 onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 52, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Txt weight={600} size={16} color={C.white} style={NUM}>{label}</Txt>
        </Pressable3>
        <Txt size={12} color={MUTED} style={{ marginTop: 8, textAlign: 'center', lineHeight: 17 }}>Billed monthly by autopay. Cancel any time.</Txt>
      </View>
    </View>
  );
}
