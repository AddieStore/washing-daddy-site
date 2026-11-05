// Service detail page: render hero, options, frequently added, steps, included.
import React from 'react';
import { View, ScrollView, Pressable, Share } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Check, Close } from '../ui/icons';
import { useApp, act, svcQty, svcOf, closePage, openPage } from '../state';
import { CAR_SERVICES, PACKS, SERVICES, SHOW_RATINGS } from '../data/reference';
import { G, card, Photo, BackCircle, ShareCircle, AddBtn, CartBar, Price, Tap, TNUM } from './parts';

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
      <View style={{ width: 104, minHeight: 128, borderRadius: 14, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: '#fff', padding: 12, alignItems: 'center' }}>
        <Txt weight={500} size={17}>{label}</Txt>{sub ? <Txt size={12} color={G.mute}>{sub}</Txt> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, marginBottom: 12 }}>
          <Price v={price} size={13} />
          {mrp && mrp > price ? <Price v={mrp} size={12} weight={400} strike /> : null}
        </View>
        {isPack || !on ? (
          <Tap onPress={() => on ? act.subSvc(oid) : act.addSvc(oid)} style={{ height: 36, alignSelf: 'stretch', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? G.violet : G.raised }}>
            <Txt weight={500} size={14} color={on ? '#fff' : G.ink}>{on ? 'Added' : 'Add'}</Txt>
          </Tap>
        ) : <AddBtn qty={q} onAdd={() => act.addSvc(oid)} onSub={() => act.subSvc(oid)} />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 136 }}>
        <View style={{ height: 272 }}>
          <Photo id={sid} radius={0} pad={24} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackCircle onPress={closePage} /><ShareCircle onPress={share} />
          </View>
        </View>
        <View style={{ marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 24, paddingHorizontal: 16 }}>
          <Txt weight={500} size={24} style={{ lineHeight: 32 }}>{name}</Txt>
          {SHOW_RATINGS ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Txt weight={500} size={13} style={TNUM}>{rating.toFixed(1)}</Txt><Txt size={13} color={G.mute}>({count} ratings)</Txt>
          </View> : null}
          <Txt size={14} color={G.sub} style={{ marginTop: 8, lineHeight: 20 }}>{blurb}</Txt>

          <Txt size={13} color={G.mute} style={{ marginTop: 32 }}>{pack ? 'Select option' : 'Select service'}</Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {pack ? SERVICES.map(s => <Opt key={s.id} oid={s.id} label={s.name.replace('WD ', '').split(' ')[0]} sub={PACKS.find(p => p.id === s.id)!.mins + ' mins'} price={s.price} />)
            : <Opt oid={sid} label={svc!.mins + ' mins'} price={svc!.price} mrp={svc!.mrp} />}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <Txt weight={500} size={18} style={{ marginTop: 32 }}>Frequently added together</Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {together.map(s => (
            <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ width: 128 }}>
              <Photo id={s.id} radius={14} pad={8} style={{ width: 128, height: 112 }} />
              <View style={{ position: 'absolute', right: 8, top: 76 }}><AddBtn qty={svcQty(s.id)} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
              <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 24, lineHeight: 20 }}>{s.name}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}><Price v={s.price} size={14} /><Price v={s.mrp} size={12} weight={400} strike /></View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16 }}>
          <Txt weight={500} size={18} style={{ marginTop: 32 }}>How is the service done</Txt>
          <View style={{ marginTop: 16, gap: 16 }}>
            {steps.map(([t, s], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt weight={500} size={17} color={G.sub} style={TNUM}>{i + 1}</Txt>
                </View>
                <View style={{ flex: 1 }}><Txt weight={500} size={15}>{t}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 4, lineHeight: 20 }}>{s}</Txt></View>
              </View>
            ))}
          </View>

          <Txt weight={500} size={18} style={{ marginTop: 32 }}>Included in service</Txt>
          <View style={{ marginTop: 12 }}>
            {included.map(x => <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><Check size={18} color={G.pos} strokeWidth={1.5} /><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></View>)}
          </View>
          <Txt weight={500} size={18} style={{ marginTop: 32 }}>Not included</Txt>
          <View style={{ marginTop: 12 }}>
            {excluded.map(x => <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><Close size={18} color={G.mute} strokeWidth={1.5} /><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></View>)}
          </View>
          <View style={card({ marginTop: 32, padding: 16, backgroundColor: G.raised, borderWidth: 0, shadowOpacity: 0, elevation: 0 })}>
            <Txt weight={500} size={15}>Washer arrives in 45-60 min</Txt>
            <Txt size={13} color={G.sub} style={{ marginTop: 4 }}>Book now, or schedule for later from the cart</Txt>
          </View>
        </View>
      </ScrollView>
      <CartBar />
    </View>
  );
}
