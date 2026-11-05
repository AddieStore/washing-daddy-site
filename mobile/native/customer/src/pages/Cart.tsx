// Review your booking (Pronto "Review Services" + cart): arrival banner, lines with steppers, add-ons, bill, two CTAs.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back } from '../ui/icons';
import { useApp, act, svcLines, svcQty, svcPayOnline, openPage, closePage, go, toast } from '../state';
import { CAR_SERVICES } from '../data/reference';
import { G, card, Photo, AddBtn, PrimaryBtn, Bolt, SuccessTick } from './parts';

export default function Cart() {
  useApp();
  const ins = useInsets(), { lines, sub, mrp, saved, mins, count } = svcLines(), [busy, setBusy] = useState(false), [ok, setOk] = useState<null | { paid: boolean }>(null);
  const together = CAR_SERVICES.filter(s => !svcQty(s.id)).slice(0, 6);
  const book = async () => {
    setBusy(true);
    try { const r = await act.bookServices(null); setOk({ paid: r.paid }) } catch (e: any) { toast(e?.message || 'Could not book. Try again.') }
    setBusy(false);
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F6FC' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, paddingBottom: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: G.line }}>
        <Pressable onPress={closePage} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back size={22} color={C.ink} /></Pressable>
        <Txt weight={600} size={16}>Review your booking</Txt>
      </View>
      {!count && !ok ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Txt weight={600} size={17}>Your cart is empty</Txt>
          <Txt size={13} color={G.sub} style={{ marginTop: 4, marginBottom: 18, textAlign: 'center' }}>Add a service to book a wash for your car.</Txt>
          <PrimaryBtn label="Browse services" onPress={closePage} style={{ width: 200 }} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 150 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: G.tint, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E6DAFB' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Bolt size={22} /></View>
              <View style={{ flex: 1 }}><Txt weight={600} size={14}>Washer arrives in 45-60 min</Txt><Txt size={12} color={G.sub}>Or schedule for later below</Txt></View>
            </View>

            <View style={card({ marginTop: 14, padding: 16 })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Txt size={12} color={G.sub}>Car wash in</Txt><Txt weight={700} size={17}>{mins} mins</Txt></View>
                <Txt size={12} color={G.sub}>{count} {count === 1 ? 'service' : 'services'}</Txt>
              </View>
              <View style={{ marginTop: 14, gap: 16 }}>
                {lines.map(l => (
                  <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Photo id={l.id} radius={10} style={{ width: 52, height: 52 }} />
                    <View style={{ flex: 1 }}>
                      <Txt weight={500} size={14} numberOfLines={2} style={{ lineHeight: 18 }}>{l.name}</Txt>
                      <Txt size={11.5} color={G.sub}>{l.mins} mins</Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                      {l.mrp > l.price ? <Txt size={11} color={G.sub} style={{ textDecorationLine: 'line-through' }}>₹{l.mrp * l.q}</Txt> : null}
                      <Txt weight={600} size={14}>₹{l.total}</Txt>
                    </View>
                    <AddBtn size="lg" qty={l.q} onAdd={() => act.addSvc(l.id)} onSub={() => act.subSvc(l.id)} />
                  </View>
                ))}
              </View>
            </View>

            {together.length ? (
              <>
                <Txt weight={600} size={16} style={{ marginTop: 22 }}>Frequently added together</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
                  {together.map(s => (
                    <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={card({ width: 118, padding: 8 })}>
                      <Photo id={s.id} radius={10} style={{ width: '100%', height: 80 }} />
                      <View style={{ position: 'absolute', right: 12, top: 56 }}><AddBtn qty={0} onAdd={() => act.addSvc(s.id)} onSub={() => {}} /></View>
                      <Txt weight={500} size={12} numberOfLines={2} style={{ marginTop: 18, lineHeight: 16 }}>{s.short}</Txt>
                      <View style={{ flexDirection: 'row', gap: 5 }}><Txt weight={600} size={12.5}>₹{s.price}</Txt><Txt size={10.5} color={G.sub} style={{ textDecorationLine: 'line-through', marginTop: 2 }}>₹{s.mrp}</Txt></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={card({ marginTop: 22, padding: 16 })}>
              <Txt weight={600} size={15}>Bill summary</Txt>
              <View style={{ marginTop: 12, gap: 9 }}>
                <Row l="Item total" r={<View style={{ flexDirection: 'row', gap: 6 }}>{saved ? <Txt size={13} color={G.sub} style={{ textDecorationLine: 'line-through' }}>₹{mrp}</Txt> : null}<Txt size={13}>₹{sub}</Txt></View>} />
                {saved ? <Row l="You save" r={<Txt weight={600} size={13} color={C.green}>- ₹{saved}</Txt>} lc={C.green} /> : null}
                <Row l="Visit charge" r={<Txt weight={500} size={13} color={C.green}>Free</Txt>} />
              </View>
              <View style={{ height: 1, backgroundColor: G.line, marginVertical: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt weight={700} size={15}>To pay</Txt><Txt weight={700} size={15}>₹{sub}</Txt></View>
            </View>
            {!svcPayOnline() ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12, backgroundColor: '#FFF7E0', borderRadius: 12, padding: 12 }}>
                <Txt size={15}>💵</Txt><Txt size={12.5} color="#6B4E00" style={{ flex: 1 }}>Pay on arrival. Pay your washer by UPI or cash once the wash is done.</Txt>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, flexDirection: 'row', gap: 10 }}>
            <PrimaryBtn outline small label="Schedule for later" onPress={() => openPage({ k: 'schedule' })} style={{ flex: 1 }} />
            <PrimaryBtn label={`Book now · ₹${sub}`} onPress={book} busy={busy} small style={{ flex: 1 }} />
          </View>
        </>
      )}
      {ok ? <SuccessTick title="Booking confirmed" sub={ok.paid ? 'Payment received. Your washer is on the way.' : 'Your washer is on the way. Pay on arrival.'} onDone={() => { closePage(); go('live') }} /> : null}
    </View>
  );
}
const Row = ({ l, r, lc }: { l: string; r: React.ReactNode; lc?: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt size={13} color={lc ?? '#3B2C55'}>{l}</Txt>{r}</View>;
