// Plan tab: one slim violet card with the current plan, days left, paid-up date and an autopay chip.
import React from 'react';
import { View } from 'react-native';
import { C } from '../../theme';
import { Txt, type } from '../kit';
import { fmt } from '../../data/dates';
import { car, daysLeft, planOf, autopayView } from '../../state';

const NUM = { fontVariant: ['tabular-nums'] } as const;
const W = 'rgba(255,255,255,';

export function PlanSummary() {
  const c = car(), p = planOf(c), left = daysLeft(c), ap = autopayView(c);
  const started = left != null && !!c.till;
  const apTxt = ap.on ? 'Autopay on' : ap.status === 'cancelling' ? 'Autopay stopping' : ap.status === 'halted' ? 'Autopay stopped' : 'Autopay off';
  const apDot = ap.on ? '#4ADE9F' : ap.status === 'halted' ? '#FF8A5C' : C.saffron;
  const soon = started && (left as number) <= 3;
  return (
    <View style={{ borderRadius: 20, backgroundColor: C.violet, paddingVertical: 16, paddingHorizontal: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt weight={500} size={11} color={W + '0.7)'} style={{ letterSpacing: 0.6 }}>CURRENT PLAN</Txt>
          <Txt {...type.h2} color={C.white} style={{ marginTop: 2 }} numberOfLines={1}>{p.name}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: soon || !started ? C.saffron : W + '0.16)' }}>
            <Txt weight={600} size={12} color={soon || !started ? '#1A0A33' : C.white} style={NUM}>{started ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Starts after first wash'}</Txt>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
        <Txt size={13} color={W + '0.85)'} numberOfLines={1} style={{ flexShrink: 1 }}>{started ? `Paid up till ${fmt(c.till!, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Pay after your first wash'}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, backgroundColor: W + '0.14)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: apDot }} />
          <Txt weight={500} size={11} color={C.white}>{apTxt}</Txt>
        </View>
      </View>
    </View>
  );
}
