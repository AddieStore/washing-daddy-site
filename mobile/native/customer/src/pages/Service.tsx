// Service detail page (Pronto "Bathroom Cleaning / Hourly Service"): photo hero, white sheet, options, frequently added, steps, included.
import React from 'react';
import { View, ScrollView, Pressable, Share } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Star } from '../ui/icons';
import { useApp, act, svcQty, svcOf, closePage, openPage } from '../state';
import { CAR_SERVICES, PACKS, SERVICES } from '../data/reference';
import { G, card, Photo, BackCircle, ShareCircle, AddBtn, CartBar } from './parts';

const Stars = ({ r }: { r: number }) => <View style={{ flexDirection: 'row', gap: 1 }}>{[0, 1, 2, 3, 4].map(i => <Star key={i} size={13} color={i < Math.round(r) ? C.gold : '#E4E0EE'} />)}</View>;

export default function Service({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), sid = id || 'ext', svc = svcOf(sid), pack = PACKS.find(p => p.id === sid), psv = SERVICES.find(s => s.id === sid);
  const name = svc ? svc.name : psv ? psv.name : 'Wash';
  const rating = svc ? svc.rating : 4.9, count = svc ? svc.count : '24k';
  const blurb = svc ? svc.blurb : psv?.d || '';
  const steps: [string, string][] = svc ? svc.steps : (psv?.d || '').split(', ').map(x => [x.charAt(0).toUpperCase() + x.slice(1), 'Done by your washer at your parking']);
  const included = svc ? svc.included : (psv?.d || '').split(', ').map(x => x.charAt(0).toUpperCase() + x.slice(1));
  const excluded = svc ? svc.excluded : sid === 'exclusive' ? ['Paint correction'] : ['Engine bay', 'Ceramic coating'];
  const share = () => { Share.share({ message: `${name} at your car park from Washing Daddy. https://washingdaddy.com/` }).catch(() => {}) };
  const together = CAR_SERVICES.filter(s => s.id !== sid).slice(0, 6);

  const Opt = ({ oid, label, price, mrp, sub }: { oid: string; label: string; price: number; mrp?: number; sub?: string }) => {
    const q = svcQty(oid), on = q > 0, isPack = !svcOf(oid);
    return (
      <View style={{ width: 104, minHeight: 124, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? C.violet : '#F1EEF7', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', ...(on ? { shadowColor: C.violet, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } } : {}) }}>
        <Txt weight={500} size={16.5}>{label}</Txt>{sub ? <Txt size={11} color={G.sub}>{sub}</Txt> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3, marginBottom: 10 }}>
          <Txt weight={600} size={12.5}>₹{price}</Txt>
          {mrp && mrp > price ? <Txt size={11} color={G.sub} style={{ textDecorationLine: 'line-through' }}>₹{mrp}</Txt> : null}
        </View>
        {isPack || !on ? (
          <Pressable onPress={() => on ? act.subSvc(oid) : act.addSvc(oid)} style={{ height: 34, alignSelf: 'stretch', borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.violet : G.tint2, borderWidth: 1, borderColor: on ? C.violet : '#D9CCF7' }}>
            <Txt weight={600} size={13.5} color={on ? '#fff' : C.violet}>{on ? 'Added' : 'Add'}</Txt>
          </Pressable>
        ) : <AddBtn qty={q} onAdd={() => act.addSvc(oid)} onSub={() => act.subSvc(oid)} />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={{ height: 270 + ins.top * 0 }}>
          <Photo id={sid} radius={0} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(36,6,95,.14)' }} />
          <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackCircle onPress={closePage} /><ShareCircle onPress={share} />
          </View>
          {pack ? <View style={{ position: 'absolute', left: 16, bottom: 36, backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 }}><Txt weight={700} size={11} color={C.ink}>{pack.tag}</Txt></View> : null}
        </View>
        <View style={{ marginTop: -22, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 22, paddingHorizontal: 16 }}>
          <Txt weight={700} size={20}>{name}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Stars r={rating} /><Txt weight={500} size={12.5}>{rating.toFixed(1)}</Txt><Txt size={12.5} color={G.sub}>({count} ratings)</Txt>
          </View>
          <Txt size={13} color={G.sub} style={{ marginTop: 8, lineHeight: 19 }}>{blurb}</Txt>

          <Txt size={13} color={G.sub} style={{ marginTop: 22 }}>{pack ? 'Select option' : 'Select service'}</Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10 }}>
          {pack ? SERVICES.map(s => <Opt key={s.id} oid={s.id} label={s.name.replace('WD ', '').split(' ')[0]} sub={PACKS.find(p => p.id === s.id)!.mins + ' mins'} price={s.price} />)
            : <Opt oid={sid} label={svc!.mins + ' mins'} price={svc!.price} mrp={svc!.mrp} />}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <Txt weight={600} size={18} style={{ marginTop: 26 }}>Frequently added together</Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          {together.map(s => (
            <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ width: 130 }}>
              <Photo id={s.id} radius={12} style={{ width: 130, height: 110 }} />
              <View style={{ position: 'absolute', right: 6, top: 76 }}><AddBtn qty={svcQty(s.id)} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
              <Txt weight={500} size={12.5} numberOfLines={2} style={{ marginTop: 22, lineHeight: 17 }}>{s.name}</Txt>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}><Txt weight={600} size={13}>₹{s.price}</Txt><Txt size={11} color={G.sub} style={{ textDecorationLine: 'line-through', marginTop: 2 }}>₹{s.mrp}</Txt></View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <Txt weight={600} size={18} style={{ marginTop: 28 }}>How is the service done?</Txt>
          <View style={{ marginTop: 12, gap: 14 }}>
            {steps.map(([t, s], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: G.tint2, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt weight={700} size={22} color={C.violet}>{i + 1}</Txt>
                </View>
                <View style={{ flex: 1 }}><Txt weight={500} size={14.5}>{t}</Txt><Txt size={12.5} color={G.sub} style={{ marginTop: 2 }}>{s}</Txt></View>
              </View>
            ))}
          </View>

          <Txt weight={600} size={18} style={{ marginTop: 30 }}>Included in service</Txt>
          <View style={{ marginTop: 10, gap: 10 }}>
            {included.map(x => <View key={x} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Txt weight={700} size={13} color={C.green}>✓</Txt><Txt size={13.5} color="#3B2C55">{x}</Txt></View>)}
          </View>
          <Txt weight={600} size={18} style={{ marginTop: 26 }}>Not included</Txt>
          <View style={{ marginTop: 10, gap: 10 }}>
            {excluded.map(x => <View key={x} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Txt weight={700} size={13} color={C.red}>✕</Txt><Txt size={13.5} color="#3B2C55">{x}</Txt></View>)}
          </View>
          <View style={card({ marginTop: 26, padding: 14, backgroundColor: G.tint2, borderColor: '#E6DAFB' })}>
            <Txt weight={600} size={13.5}>Washer arrives in 45-60 min</Txt>
            <Txt size={12} color={G.sub} style={{ marginTop: 3 }}>Book now, or schedule for later from the cart.</Txt>
          </View>
        </View>
      </ScrollView>
      <CartBar />
    </View>
  );
}
