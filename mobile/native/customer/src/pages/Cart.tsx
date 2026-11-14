// Review your booking: arrival note, lines with steppers, add-ons, bill, two CTAs.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Back, Clock, Info } from '../ui/icons';
import { Plate } from '../ui/Plate';
import { useApp, act, svcLines, svcQty, svcPayOnline, openPage, closePage, go, toast, car } from '../state';
import { CAR_SERVICES } from '../data/reference';
import { G, card, Photo, AddBtn, PrimaryBtn, SuccessTick, Price, TNUM, SHADOW_F, inr } from './parts';

export default function Cart() {
  useApp();
  const ins = useInsets(), { lines, sub, mrp, saved, mins, count } = svcLines(), [busy, setBusy] = useState(false), [ok, setOk] = useState<null | { paid: boolean }>(null);
  const together = CAR_SERVICES.filter(s => !svcQty(s.id)).slice(0, 6);
  let c: any = null; try { c = car() } catch (e) {}
  const book = async () => {
    setBusy(true);
    try { const r = await act.bookServices(null); setOk({ paid: r.paid }) } catch (e: any) { toast(e?.message || 'Could not book. Try again.') }
    setBusy(false);
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, paddingBottom: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: G.line }}>
        <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Back size={18} color={G.ink} strokeWidth={1.5} /></Pressable>
        <Txt weight={500} size={17}>Review your booking</Txt>
      </View>
      {!count && !ok ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Txt weight={500} size={17}>Your cart is empty</Txt>
          <Txt size={14} color={G.sub} style={{ marginTop: 4, marginBottom: 24, textAlign: 'center' }}>Add a service to book a wash for your car</Txt>
          <PrimaryBtn label="Browse services" onPress={closePage} style={{ width: 200 }} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 152 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: G.raised, borderRadius: 14, padding: 16 }}>
              <Clock size={18} color={G.mute} strokeWidth={1.5} />
              <View style={{ flex: 1 }}><Txt weight={500} size={14}>Washer arrives in 45-60 min</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2 }}>Or schedule for later below</Txt></View>
            </View>

            <View style={card({ marginTop: 12, padding: 16 })}>
              {c?.plate ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: G.line }}>
                  <View style={{ flex: 1 }}><Txt size={12} color={G.mute}>For your</Txt><Txt weight={500} size={14} numberOfLines={1}>{c.name}</Txt></View>
                  <Plate reg={c.plate} width={104} />
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}><Txt size={13} color={G.sub}>Car wash in</Txt><Txt weight={500} size={17} style={TNUM}>{mins} mins</Txt></View>
                <Txt size={13} color={G.mute}>{count} {count === 1 ? 'service' : 'services'}</Txt>
              </View>
              <View style={{ marginTop: 16, gap: 16 }}>
                {lines.map(l => (
                  <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Photo id={l.id} radius={8} pad={4} style={{ width: 56, height: 56 }} />
                    <View style={{ flex: 1 }}>
                      <Txt weight={500} size={14} numberOfLines={2} style={{ lineHeight: 20 }}>{l.name}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                        <Price v={l.total} size={14} />
                        {l.mrp > l.price ? <Price v={l.mrp * l.q} size={12} weight={400} strike /> : null}
                      </View>
                      <Txt size={12} color={G.mute}>{l.mins} mins</Txt>
                    </View>
                    <AddBtn size="lg" qty={l.q} onAdd={() => act.addSvc(l.id)} onSub={() => act.subSvc(l.id)} />
                  </View>
                ))}
              </View>
            </View>

            {together.length ? (
              <>
                <Txt weight={500} size={17} style={{ marginTop: 32 }}>Frequently added together</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
                  {together.map(s => (
                    <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={card({ width: 128, padding: 8 })}>
                      <Photo id={s.id} radius={6} pad={4} style={{ width: '100%', height: 80 }} />
                      <View style={{ position: 'absolute', right: 12, top: 52 }}><AddBtn qty={0} onAdd={() => act.addSvc(s.id)} onSub={() => {}} /></View>
                      <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 24, lineHeight: 20 }}>{s.short}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}><Price v={s.price} size={13} /><Price v={s.mrp} size={12} weight={400} strike /></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={card({ marginTop: 32, padding: 16 })}>
              <Txt weight={500} size={17}>Bill summary</Txt>
              <View style={{ marginTop: 16, gap: 12 }}>
                <Row l="Item total" r={<View style={{ flexDirection: 'row', gap: 8 }}>{saved ? <Price v={mrp} size={14} weight={400} strike /> : null}<Price v={sub} size={14} weight={400} /></View>} />
                {saved ? <Row l="You save" lc={G.pos} r={<Price v={-saved} size={14} color={G.pos} />} /> : null}
                <Row l="Visit charge" r={<Txt size={14} color={G.pos}>Free</Txt>} />
              </View>
              <View style={{ height: 1, backgroundColor: G.line, marginVertical: 16 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Txt weight={500} size={17}>To pay</Txt><Price v={sub} size={17} /></View>
            </View>
            {!svcPayOnline() ? (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 12, backgroundColor: G.raised, borderRadius: 14, padding: 16 }}>
                <View style={{ marginTop: 2 }}><Info size={18} color={G.mute} strokeWidth={1.5} /></View>
                <View style={{ flex: 1 }}><Txt weight={500} size={14}>Pay on arrival</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 20 }}>Pay your washer by UPI or cash once the wash is done</Txt></View>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, flexDirection: 'row', gap: 12, ...SHADOW_F }}>
            <PrimaryBtn outline small label="Schedule for later" onPress={() => openPage({ k: 'schedule' })} style={{ flex: 1 }} />
            <PrimaryBtn label={`Book now · ${inr(sub)}`} onPress={book} busy={busy} small style={{ flex: 1 }} />
          </View>
        </>
      )}
      {ok ? <SuccessTick title="Booking confirmed" sub={ok.paid ? 'Payment received. Your washer is on the way' : 'Your washer is on the way. Pay on arrival'} onDone={() => { closePage(); go('live') }} /> : null}
    </View>
  );
}
const Row = ({ l, r, lc }: { l: string; r: React.ReactNode; lc?: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt size={14} color={lc ?? G.sub}>{l}</Txt>{r}</View>;
