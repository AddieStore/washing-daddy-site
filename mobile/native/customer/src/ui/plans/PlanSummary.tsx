// Plan tab header card: current plan on a violet gradient, days-left ring, paid-up date and autopay chip,
// with the refer row tucked under it in white.
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { C } from '../../theme';
import { Txt, Ring, type } from '../kit';
import { Pressable3 } from '../motion';
import { Gift, Chev, Shield } from '../icons';
import { fmt, inr } from '../../data/dates';
import { car, daysLeft, planStatus, planOf, pendingRef, openPage, feature, autopayView } from '../../state';

const NUM = { fontVariant: ['tabular-nums'] } as const;
const W = 'rgba(255,255,255,';

function Chip({ label, dot, bg, fg }: { label: string; dot?: string; bg: string; fg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: bg }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} /> : null}
      <Txt weight={500} size={12} color={fg}>{label}</Txt>
    </View>
  );
}

export function PlanSummary() {
  const c = car(), p = planOf(c), left = daysLeft(c), st = planStatus(c), ref = pendingRef(), ap = autopayView(c);
  const started = left != null && !!c.till;
  const apTxt = ap.on ? 'Autopay on' : ap.status === 'cancelling' ? 'Autopay stopping' : ap.status === 'halted' ? 'Autopay stopped' : 'Autopay off';
  const apDot = ap.on ? '#4ADE9F' : ap.status === 'halted' ? '#FF8A5C' : C.saffron;
  const soon = (left ?? 99) <= 3;
  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: C.white, shadowColor: '#1A1033', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
      <View style={{ backgroundColor: C.violet, padding: 18, overflow: 'hidden' }}>
        <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="ps" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#6B22EE" /><Stop offset="1" stopColor="#3A0599" /></LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#ps)" />
        </Svg>
        <Svg width={180} height={180} viewBox="0 0 100 100" style={{ position: 'absolute', right: -60, top: -70 }}>
          <Circle cx={50} cy={50} r={46} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={8} />
          <Circle cx={50} cy={50} r={28} fill="none" stroke="#fff" strokeOpacity={0.06} strokeWidth={6} />
        </Svg>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Txt weight={500} size={12} color={W + '0.72)'} style={{ letterSpacing: 0.4 }}>CURRENT PLAN</Txt>
            <Txt {...type.h1} color={C.white} style={{ marginTop: 2 }}>{p.name}</Txt>
          </View>
          <Chip label={st[0]} bg={soon || !started ? C.saffron : W + '0.16)'} fg={soon || !started ? '#1A0A33' : C.white} dot={soon || !started ? undefined : '#4ADE9F'} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 }}>
          {started ? (
            <Ring frac={(left as number) / 30} size={84} stroke={9} color={C.saffron} track={W + '0.2)'}>
              <Txt weight={700} size={24} color={C.white} style={NUM}>{String(left)}</Txt>
              <Txt size={11} color={W + '0.75)'} style={{ marginTop: -2 }}>{left === 1 ? 'day left' : 'days left'}</Txt>
            </Ring>
          ) : (
            <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 9, borderColor: W + '0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Txt weight={700} size={15} color={C.white} style={NUM}>{inr(p.price)}</Txt>
              <Txt size={11} color={W + '0.75)'} style={{ marginTop: -1 }}>a month</Txt>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={12} color={W + '0.72)'}>{started ? 'Paid up till' : 'Plan starts'}</Txt>
            <Txt weight={600} size={17} color={C.white} style={{ marginTop: 1 }}>{started ? fmt(c.till!, { day: 'numeric', month: 'short', year: 'numeric' }) : 'After first wash'}</Txt>
            <View style={{ flexDirection: 'row', marginTop: 10 }}><Chip label={apTxt} bg={W + '0.16)'} fg={C.white} dot={apDot} /></View>
          </View>
        </View>
        <Txt size={13} color={W + '0.85)'} style={{ marginTop: 16, lineHeight: 19 }}>
          {started ? (soon ? 'Renew below to keep your mornings going.' : ap.label || 'Renew below any time to keep your mornings going.') : 'Pay once you have seen your first wash.'}
        </Txt>
      </View>
      {feature('refer') ? (
        <Pressable3 onPress={() => openPage({ k: 'refer' })} scaleTo={0.99} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center' }}><Gift size={18} color={C.violet} strokeWidth={1.6} /></View>
          <View style={{ flex: 1 }}>
            <Txt weight={500} size={14} color={C.ink}>{ref ? 'Invite code applied' : 'Refer a friend, get ₹200'}</Txt>
            <Txt size={12} color={C.grey}>{ref ? 'Applied when you pay for your first wash' : 'They get a wash, you get a credit'}</Txt>
          </View>
          <Chev size={18} color={C.grey} strokeWidth={1.5} />
        </Pressable3>
      ) : null}
    </View>
  );
}
