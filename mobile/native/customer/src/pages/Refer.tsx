// Refer and earn: reward card with code, tiers, how it works, T&C, sticky share bar. OWNER: MONEY worker.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Copy, Gift, Chev } from '../ui/icons';
import { useApp, referralView, act, toast } from '../state';
import { REFERRAL } from '../data/reference';
import { G, Tap, PrimaryBtn, TNUM } from './parts';
import { PageBar } from './Stub';
import { Skel, useSkeleton, Sec, V, V_SOFT, V_LINE, rs } from '../sheets/money';

export default function Refer() {
  useApp();
  const ins = useInsets(), load = useSkeleton(400), v = referralView();
  const [tnc, setTnc] = useState(false), [busy, setBusy] = useState(false);
  const run = (f: () => Promise<void>) => async () => { setBusy(true); try { await f() } catch (e: any) { toast(e.message) } setBusy(false) };
  const reach = v.tier.id;
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <PageBar title="Refer & earn" />
      {load ? <View style={{ padding: 16, gap: 12 }}><Skel h={250} r={20} /><Skel h={130} r={16} /><Skel h={180} r={16} /></View> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 150 + ins.bottom }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: G.line, padding: 20, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Gift size={28} color={V} strokeWidth={1.5} /></View>
            <Txt size={14} color={G.sub} style={{ marginTop: 12 }}>Refer a friend to Washing Daddy</Txt>
            <Txt weight={700} size={40} color={V} style={{ marginTop: 2 }}>Get ₹{v.tier.amt}</Txt>
            <Txt size={14} color={G.sub} style={{ textAlign: 'center', lineHeight: 20, marginTop: 4 }}>Your friend gets flat ₹{v.friendGets} off on their first booking.</Txt>
            {v.code ? (
              <Pressable accessibilityLabel="Copy referral code" onPress={() => act.copy(v.code, 'Code copied')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: V, backgroundColor: V_SOFT, borderRadius: 12, paddingHorizontal: 18, height: 50, marginTop: 18, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <Txt weight={600} size={18} color={V} style={[TNUM, { letterSpacing: 2 }]}>{v.code}</Txt><Copy size={18} color={V} strokeWidth={1.5} />
              </Pressable>
            ) : <Txt size={13} color={G.mute} style={{ marginTop: 16 }}>Your code appears once you sign in.</Txt>}
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, borderTopWidth: 1, borderTopColor: G.line, paddingTop: 14 }}>
              {[['Friends joined', String(v.completed)], ['Earned', rs(v.earned)], ['Pending', rs(v.ledger.filter(r => r.status === 'pending').reduce((a, r) => a + r.amt, 0))]].map(([a, b], i) => (
                <View key={a} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: G.line }}><Txt weight={600} size={17} style={TNUM}>{b}</Txt><Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{a}</Txt></View>
              ))}
            </View>
          </View>

          <View>
            <Txt weight={500} size={12} color={G.mute} style={{ letterSpacing: 1.5 }}>REFERRAL REWARDS</Txt>
            <Txt size={14} color={G.sub} style={{ marginTop: 4, marginBottom: 12 }}>{v.next ? `Complete ${v.toNext + 1} more ${v.toNext ? 'referrals' : 'referral'} to unlock ₹${v.next.amt} per referral.` : 'You are at the top tier. Every referral earns the most.'}</Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {v.tiers.map(t => {
                const on = t.id === reach;
                return (
                  <View key={t.id} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? V : G.line, overflow: 'hidden' }}>
                    <View style={{ backgroundColor: on ? V : V_SOFT, paddingVertical: 6, alignItems: 'center' }}><Txt weight={600} size={12} color={on ? '#fff' : V} style={{ letterSpacing: 1 }}>{t.name.toUpperCase()}</Txt></View>
                    <View style={{ padding: 12, alignItems: 'center' }}>
                      <Txt weight={700} size={22} style={TNUM}>₹{t.amt}</Txt>
                      <Txt weight={500} size={10} color={G.mute} style={{ marginTop: 2 }}>PER REFERRAL</Txt>
                      <Txt size={12} color={G.sub} style={{ marginTop: 8, textAlign: 'center' }}>{t.to === Infinity ? `${t.from}+ bookings` : `${t.from} - ${t.to} bookings`}</Txt>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <Sec>
            <Txt weight={500} size={17} style={{ marginBottom: 14 }}>How it works</Txt>
            {REFERRAL.steps.map((t, i, a) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={13} color={V}>{i + 1}</Txt></View>
                  {i < a.length - 1 ? <View style={{ flex: 1, borderLeftWidth: 1.5, borderLeftColor: V_LINE, borderStyle: 'dashed', marginVertical: 2 }} /> : null}
                </View>
                <Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 20, paddingTop: 4, paddingBottom: i < a.length - 1 ? 16 : 0 }}>{t}</Txt>
              </View>
            ))}
            <Pressable onPress={() => setTnc(!tnc)} style={{ marginTop: 14 }}><Txt weight={500} size={13} color={V} style={{ textDecorationLine: 'underline' }}>Read our T&Cs to know more.</Txt></Pressable>
            {tnc ? <View style={{ marginTop: 10, gap: 6 }}>{REFERRAL.tnc.map((t, i) => <Txt key={i} size={12} color={G.sub} style={{ lineHeight: 17 }}>• {t}</Txt>)}</View> : null}
          </Sec>

          {v.ledger.length ? (
            <Sec>
              <Txt weight={500} size={17}>Your referrals</Txt>
              {v.ledger.map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: G.line, marginTop: i ? 0 : 6 }}>
                  <View><Txt weight={500} size={14}>{r.friend}</Txt><Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{r.status === 'credited' ? 'Credited to WD Money' : 'Waiting for their first booking'}</Txt></View>
                  <Txt weight={500} size={14} color={r.status === 'credited' ? G.pos : G.mute} style={TNUM}>{rs(r.amt)}</Txt>
                </View>
              ))}
            </Sec>
          ) : null}
        </ScrollView>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 + ins.bottom }}>
        <PrimaryBtn label="Share invite link" busy={busy} onPress={run(() => act.shareReferral())} />
        <Tap label="Find friends to refer" onPress={run(() => act.findFriends())} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={15} color={V}>Find friends to refer</Txt></Tap>
      </View>
    </View>
  );
}
