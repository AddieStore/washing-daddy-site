// Refer and earn page (pushed): code card, reward tiers, how it works, sticky share bar.
import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Copy } from '../ui/icons';
import { refCode, inviteLink, act, closePage } from '../state';

const INK = '#171717', GREY = '#525252', MUTED = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5';
const NUM = { fontVariant: ['tabular-nums'] } as const;
const TIERS = [['Champ', '₹100', '1 to 5 completed'], ['Star', '₹150', '6 to 9 completed'], ['Legend', '₹200', '10 or more completed']] as const;
const STEPS = ['Share the link with your friend', 'Your friend downloads the app with your link', 'They get ₹200 and you get ₹200 when they pay for their first month'];

function Tier({ n, amt, who }: { n: string; amt: string; who: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 12, minHeight: 96 }}>
      <Txt weight={500} size={13} color={MUTED}>{n}</Txt>
      <Txt weight={500} size={18} color={INK} style={[{ marginTop: 4 }, NUM]}>{amt}</Txt>
      <Txt size={12} color={MUTED} style={{ marginTop: 4, lineHeight: 16 }}>{who}</Txt>
    </View>
  );
}

export default function Refer() {
  const ins = useInsets(), code = refCode();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, height: ins.top + 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={12}><Back size={24} color={INK} strokeWidth={1.5} /></Pressable>
        <Txt weight={500} size={18} color={INK}>Refer and earn</Txt>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 160 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: LINE, padding: 16, alignItems: 'center' }}>
          <Txt size={14} color={GREY}>Refer a friend to Washing Daddy</Txt>
          <Txt weight={500} size={28} color={C.violet} style={[{ lineHeight: 36, marginTop: 4 }, NUM]}>Get ₹200</Txt>
          <Txt size={14} color={GREY} style={{ textAlign: 'center', lineHeight: 20, marginTop: 4 }}>Your friend gets ₹200 off their first month</Txt>
          {code ? (
            <Pressable onPress={() => act.copy(code, 'Code copied')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: RAISED, borderRadius: 10, paddingHorizontal: 16, height: 48, marginTop: 16, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <Txt weight={500} size={15} color={INK} style={NUM}>{code}</Txt><Copy size={18} color={MUTED} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ marginTop: 32 }}>
          <Txt weight={500} size={17} color={INK}>Referral rewards</Txt>
          <Txt size={14} color={GREY} style={{ marginTop: 4, lineHeight: 20 }}>Complete more bookings to unlock higher rewards</Txt>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>{TIERS.map(t => <Tier key={t[0]} n={t[0]} amt={t[1]} who={t[2]} />)}</View>
        </View>

        <View style={{ marginTop: 32 }}>
          <Txt weight={500} size={17} color={INK}>How it works</Txt>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginTop: i ? 0 : 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: RAISED, alignItems: 'center', justifyContent: 'center' }}><Txt size={13} color={GREY} style={NUM}>{i + 1}</Txt></View>
              <Txt size={14} color={GREY} style={{ flex: 1, lineHeight: 20, paddingVertical: 8 }}>{s}</Txt>
            </View>
          ))}
        </View>
        <Txt size={12} color={MUTED} style={{ textAlign: 'center', marginTop: 24 }}>Read our terms to know more</Txt>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: LINE, paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 12, gap: 4 }}>
        <Pressable onPress={() => act.copyRef()} style={({ pressed }) => ({ height: 48, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Txt weight={500} size={15} color="#fff">Share invite link</Txt>
        </Pressable>
        <Pressable onPress={() => act.copy(inviteLink(), 'Invite link copied')} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Txt weight={500} size={15} color={C.violet}>Find friends to refer</Txt>
        </Pressable>
      </View>
    </View>
  );
}
