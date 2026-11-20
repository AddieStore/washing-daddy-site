// WD Pass detail: hero, visits card, benefits, how it works, FAQs, trust footer, checkout bar (Total amount dropdown + Pay). OWNER: MONEY worker.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Chev, Check, Zap, Clock, Shield, Wallet as WalletIc, Back } from '../ui/icons';
import { useApp, passView, passQuote, act, closePage, toast, confetti, haptic, openPage } from '../state';
import { G, Tap, PrimaryBtn, TNUM, inr } from './parts';
import { openPassBreakup, Skel, useSkeleton, V, V_SOFT, V_LINE, rs } from '../sheets/money';
import { PageBar } from './Stub';

const ICONS = [WalletIc, Zap, Clock];
const day = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };

export default function Pass({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), load = useSkeleton(500);
  const q = passQuote(id), p = q.plan, { active } = passView();
  const [busy, setBusy] = useState(false), [faq, setFaq] = useState(-1), [done, setDone] = useState(false);
  // the admin sells no pass right now (passes_cfg empty, or features.pass off) and this account has none
  if ((!p.id || !passView().plans.length) && !active) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="WD Pass" />
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Txt weight={600} size={18} style={{ textAlign: 'center' }}>WD Pass is not on sale right now</Txt>
        <Txt size={14} color={G.sub} style={{ marginTop: 8, textAlign: 'center', lineHeight: 20 }}>Check back soon. You can still book any service from Home.</Txt>
      </View>
    </View>
  );
  const pay = async () => {
    setBusy(true);
    try { const r = await act.buyPass(p.id); if (!r.shown && !r.pending) { confetti(); setDone(true); toast(`${p.name} is active`) } } catch (e: any) { toast(e.message) }
    setBusy(false);
  };
  const Hero = (
    <View style={{ backgroundColor: V, height: 210, paddingTop: ins.top, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: -50, top: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ position: 'absolute', right: -40, bottom: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ flexDirection: 'row', marginBottom: -26, alignItems: 'flex-end' }}>
        <View style={{ width: 120, height: 130, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', padding: 14, transform: [{ rotate: '-8deg' }], marginRight: -14 }}>
          <Txt weight={600} size={30} color="#fff">{p.maxMins}</Txt><Txt weight={500} size={13} color="rgba(255,255,255,0.85)">MIN WASH</Txt>
        </View>
        <View style={{ width: 150, height: 150, borderRadius: 18, backgroundColor: '#fff', padding: 14, transform: [{ rotate: '5deg' }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
          <Txt weight={500} size={13} color={V}>Washing Daddy</Txt>
          <Txt weight={700} size={34} color={V} style={{ marginTop: 6, lineHeight: 38 }}>PASS</Txt>
          <Txt size={12} color={G.sub}>{p.title} Pass</Txt>
        </View>
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {load ? (
        <View><Skel h={210} r={0} /><View style={{ padding: 16, gap: 14, alignItems: 'center' }}><Skel w={120} h={14} /><Skel w={200} h={30} /><Skel h={64} r={14} style={{ alignSelf: 'stretch' }} /><Skel h={80} r={14} style={{ alignSelf: 'stretch' }} /><Skel h={80} r={14} style={{ alignSelf: 'stretch' }} /></View></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + ins.bottom }}>
          {Hero}
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 }}>
            <Txt weight={500} size={12} color={V} style={{ letterSpacing: 2 }}>WD PASS</Txt>
            <Txt weight={700} size={28} style={{ marginTop: 6, textAlign: 'center' }}>{p.title}</Txt>
            <View style={{ alignSelf: 'stretch', marginTop: 16, backgroundColor: V_SOFT, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Txt weight={600} size={16}>{p.visits} visits</Txt>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline', marginTop: 2 }}>
                <Txt weight={600} size={14} style={TNUM}>{inr(p.price)}</Txt><Txt size={12} color={G.mute} style={[TNUM, { textDecorationLine: 'line-through' }]}>{inr(p.mrp)}</Txt>
              </View>
              <Txt size={12} color={G.sub} style={{ marginTop: 4 }}>About {inr(q.perVisit)} a wash · valid {p.days} days</Txt>
            </View>
          </View>

          {active ? (
            <View style={{ margin: 16, marginBottom: 0, borderRadius: 14, borderWidth: 1, borderColor: V, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: V, alignItems: 'center', justifyContent: 'center' }}><Check size={20} color="#fff" strokeWidth={1.5} /></View>
              <View style={{ flex: 1 }}><Txt weight={500} size={15}>Your pass is active</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2 }}>{active.visitsLeft} of {active.visitsTotal} visits left · valid till {day(active.validTill)}</Txt></View>
            </View>
          ) : null}

          <Txt weight={500} size={12} color={V} style={{ textAlign: 'center', letterSpacing: 3, marginTop: 28, marginBottom: 12 }}>◆  BENEFITS  ◆</Txt>
          <View style={{ marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: G.line, paddingHorizontal: 14 }}>
            {p.benefits.map(([a, b], i) => { const I = ICONS[i % 3]; return (
              <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: i ? 1 : 0, borderTopColor: G.line, borderStyle: 'dashed' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><I size={22} color={V} strokeWidth={1.5} /></View>
                <View style={{ flex: 1 }}><Txt weight={500} size={15}>{a}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 18 }}>{b}</Txt></View>
              </View>
            ); })}
          </View>

          <Txt weight={500} size={18} style={{ marginHorizontal: 16, marginTop: 28, marginBottom: 12 }}>How the pass works</Txt>
          <View style={{ marginHorizontal: 16, gap: 14 }}>
            {['Buy the pass once and pay for 3 washes up front.', 'Book any covered service. Choose "Use pass" at checkout.', `Use all ${p.visits} visits within ${p.days} days of buying.`].map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Txt weight={600} size={13} color={V}>{i + 1}</Txt></View>
                <Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 20 }}>{t}</Txt>
              </View>
            ))}
          </View>

          <Txt weight={500} size={18} style={{ marginHorizontal: 16, marginTop: 28, marginBottom: 12 }}>Frequently asked questions</Txt>
          <View style={{ marginHorizontal: 16, gap: 8 }}>
            {p.faqs.map(([qq, a], i) => (
              <Pressable key={qq} onPress={() => { haptic(); setFaq(faq === i ? -1 : i) }} style={{ backgroundColor: '#F6F3FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt weight={500} size={14} style={{ flex: 1, lineHeight: 20 }}>{qq}</Txt>
                  <View style={{ transform: [{ rotate: faq === i ? '-90deg' : '90deg' }] }}><Chev size={16} color={G.mute} strokeWidth={1.5} /></View>
                </View>
                {faq === i ? <Txt size={14} color={G.sub} style={{ marginTop: 8, lineHeight: 20 }}>{a}</Txt> : null}
              </Pressable>
            ))}
          </View>

          <View style={{ margin: 16, marginTop: 28, backgroundColor: G.raised, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Shield size={28} color={V} strokeWidth={1.5} />
            <View style={{ flex: 1 }}><Txt weight={500} size={15}>Trusted, verified washers</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 18 }}>Background-checked washers, water-saving pressure wash, and support whenever you need it.</Txt></View>
          </View>
        </ScrollView>
      )}

      {/* back */}
      <View style={{ position: 'absolute', top: ins.top + 8, left: 12 }}><Tap label="Back" onPress={closePage} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Back size={18} color={G.ink} strokeWidth={1.5} /></Tap></View>

      {/* checkout bar */}
      {!load ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + ins.bottom, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable accessibilityLabel="Price breakup" onPress={() => openPassBreakup(p.id)} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Txt size={13} color={G.sub}>Total amount</Txt><View style={{ transform: [{ rotate: '90deg' }] }}><Chev size={14} color={G.sub} strokeWidth={1.5} /></View></View>
            <Txt weight={600} size={20} style={TNUM}>{rs(q.total)}</Txt>
          </Pressable>
          {active || done ? <PrimaryBtn label="Pass active" disabled style={{ width: 170 }} /> : <PrimaryBtn label={`Pay ${rs(q.total)}`} busy={busy} onPress={pay} style={{ width: 170 }} />}
        </View>
      ) : null}
    </View>
  );
}
