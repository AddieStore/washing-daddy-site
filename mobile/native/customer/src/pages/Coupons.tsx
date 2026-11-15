// Coupons: list with eligibility, apply / remove. OWNER: MONEY worker.
import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Chev } from '../ui/icons';
import { useApp, couponsView, act, closePage, toast, haptic } from '../state';
import { G, Tap, PrimaryBtn, TNUM } from './parts';
import { PageBar } from './Stub';
import { Skel, useSkeleton, V, V_SOFT, rs } from '../sheets/money';

const till = (s: string) => { const d = new Date(s); return isNaN(+d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };

export default function Coupons() {
  useApp();
  const ins = useInsets(), load = useSkeleton(350), list = couponsView();
  const [code, setCode] = useState(''), [busy, setBusy] = useState(''), [open, setOpen] = useState(''), [err, setErr] = useState('');
  const apply = async (c: string, back = true) => {
    setBusy(c); setErr('');
    try { await act.applyCoupon(c); if (back) closePage() } catch (e: any) { if (c === code) setErr(e.message); else toast(e.message) }
    setBusy('');
  };
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title="Coupons" />
      {load ? <View style={{ padding: 16, gap: 12 }}><Skel h={56} r={12} />{[0, 1, 2].map(i => <Skel key={i} h={110} r={16} />)}</View> : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: ins.bottom + 32 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={code} onChangeText={t => { setCode(t.toUpperCase().replace(/\s/g, '')); setErr('') }} placeholder="Enter coupon code" placeholderTextColor={G.mute} autoCapitalize="characters" autoCorrect={false}
              style={{ flex: 1, height: 52, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, fontSize: 15, color: G.ink, borderWidth: 1.5, borderColor: err ? C.red : G.line, outlineStyle: 'none', minWidth: 0 } as any} />
            <PrimaryBtn label="Apply" disabled={!code} busy={busy === code && !!code} onPress={() => apply(code)} style={{ height: 52, width: 92 }} />
          </View>
          {err ? <Txt size={13} color={C.red}>{err}</Txt> : null}
          <Txt weight={500} size={12} color={G.mute} style={{ letterSpacing: 1, marginTop: 4 }}>AVAILABLE COUPONS</Txt>
          {list.map(c => {
            const ok = c.check.ok, off = c.check.ok ? c.check.off : 0, isOpen = open === c.code;
            return (
              <View key={c.code} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: c.applied ? V : G.line, overflow: 'hidden', opacity: ok || c.applied ? 1 : 0.85 }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: 36, backgroundColor: ok || c.applied ? V : '#C9C9CF', alignItems: 'center', justifyContent: 'center' }}>
                    <Txt weight={600} size={12} color="#fff" style={{ transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center' }}>{c.kind === 'flat' ? `₹${c.v} OFF` : `${c.v}% OFF`}</Txt>
                  </View>
                  <View style={{ flex: 1, padding: 14 }}>
                    <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: V, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: V_SOFT }}><Txt weight={600} size={13} color={V} style={{ letterSpacing: 0.5 }}>{c.code}</Txt></View>
                    <Txt weight={500} size={15} style={{ marginTop: 8 }}>{c.title}</Txt>
                    <Txt size={13} color={G.sub} style={{ marginTop: 2 }}>{c.sub}</Txt>
                    {ok && off > 0 ? <Txt weight={500} size={13} color={G.pos} style={{ marginTop: 6 }}>You save {rs(off)} on this order</Txt> : !ok && !c.check.ok ? <Txt size={13} color={G.neg} style={{ marginTop: 6 }}>{c.check.why}</Txt> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <Pressable onPress={() => { haptic(); setOpen(isOpen ? '' : c.code) }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Txt size={13} color={G.mute}>Terms</Txt><View style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}><Chev size={14} color={G.mute} strokeWidth={1.5} /></View>
                      </Pressable>
                      {c.applied ? <Tap label="Remove coupon" onPress={() => { act.removeCoupon(); toast('Coupon removed') }} style={{ paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14}>Remove</Txt></Tap>
                        : <Tap label={`Apply ${c.code}`} disabled={!ok || !!busy} onPress={() => apply(c.code)} style={{ paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: ok ? V : G.raised, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={ok ? '#fff' : G.mute}>{busy === c.code ? '…' : 'Apply'}</Txt></Tap>}
                    </View>
                    {isOpen ? <View style={{ marginTop: 10, gap: 4 }}>{[...c.tnc, `Valid till ${till(c.till)}`].map((t, i) => <Txt key={i} size={12} color={G.sub} style={{ lineHeight: 17 }}>• {t}</Txt>)}</View> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
