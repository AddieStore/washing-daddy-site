// Schedule for later (Pronto f_096..f_113): day chips, service duration packs, Morning / Afternoon / Evening, 30-minute slot grid with
// surcharge, sold-out sign, 30-minute arrival note, sticky "Add to cart". The picker itself lives in sheets/slot.tsx (shared with the cart sheet).
import React, { useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Info, Clock } from '../ui/icons';
import { useApp, act, svcLines, svcQty, closePage, openPage, toast, when, instantStatus, slotDays, whenText } from '../state';
import { PACKS, packInfo } from '../data/reference';
import { PageBar } from './Stub';
import { G, PrimaryBtn, Price, TNUM, SHADOW_F, PAGE_BG, inr } from './parts';
import { SlotPicker } from '../sheets/slot';

const dur = (m: number) => (m >= 60 ? `${+(m / 60).toFixed(1)} ${m === 60 ? 'hr' : 'hrs'}` : `${m} mins`);

export default function Schedule() {
  const ui = useApp();
  const ins = useInsets(), { width } = useWindowDimensions(), W = Math.min(width, 520), { lines, sub, mins, count } = svcLines(), st = instantStatus();
  const days = slotDays(), w0 = when(), first = days.find(d => !d.disabled && !d.soldOut) || days.find(d => !d.disabled) || days[0];
  const [v, setV] = useState<{ date: string; slot: string }>(w0 ? { date: w0.date, slot: w0.slot } : { date: first.date, slot: '' }), [busy, setBusy] = useState(false);
  const fromCart = ui.pages.length > 1 && ui.pages[ui.pages.length - 2]?.k === 'cart';
  const packIds = PACKS.map(p => p.id as string), others = lines.filter(l => !packIds.includes(l.id));
  const add = () => {
    setBusy(true);
    try {
      act.setWhen({ date: v.date, slot: v.slot });
      closePage(); if (!fromCart) openPage({ k: 'cart' });
      toast(whenText({ date: v.date, slot: v.slot }));
    } catch (e: any) { toast(e?.message || 'That slot is not available. Pick another') }
    setBusy(false);
  };
  const Tile = ({ on, title, price, mrp, onPress, label }: { on: boolean; title: string; price: number; mrp?: number; onPress?: () => void; label: string }) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} style={{ width: 112, borderRadius: 12, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.06)' : '#fff', padding: 12 }}>
      <Txt weight={500} size={15} color={on ? G.violet : G.ink} style={TNUM}>{title}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}><Price v={price} size={13} />{mrp && mrp > price ? <Price v={mrp} size={11} weight={400} strike /> : null}</View>
    </Pressable>
  );
  const durCard = (
    <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, paddingVertical: 12 }}>
      <Txt weight={500} size={13} color={G.mute} style={{ marginBottom: 10, marginHorizontal: 12 }}>Service duration</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {others.length ? <Tile on label="Your cart" title={dur(mins)} price={sub} onPress={() => openPage({ k: 'cart' })} /> : null}
        {PACKS.filter(pk => pk.status !== 'paused').map(pk => { const p = packInfo(pk.id)!, q = svcQty(pk.id); return <Tile key={pk.id} on={q > 0} label={p.name} title={dur(p.mins)} price={p.price} mrp={p.mrp} onPress={() => (q ? act.subSvc(pk.id) : act.addSvc(pk.id))} /> })}
      </ScrollView>
      {!count ? <Txt size={12} color={G.mute} style={{ marginHorizontal: 12, marginTop: 10 }}>Pick a wash pack, or add services from Home</Txt> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="Schedule for later" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}>
        {!st.open ? (
          <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', gap: 12, backgroundColor: '#EEF0F6', borderRadius: 12, padding: 12, alignItems: 'flex-start' }}>
            <View style={{ marginTop: 1 }}><Info size={18} color={G.mute} strokeWidth={1.5} /></View>
            <Txt size={13} color={G.sub} style={{ flex: 1, lineHeight: 18 }}>{st.reason === 'busy' ? 'All our washers are busy right now. Please schedule this booking for later.' : 'Instant service is closed right now. ' + st.label + '. Schedule this booking for later.'}</Txt>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: 16 }}>
          <SlotPicker value={v} onChange={setV} innerW={W - 32} chipsPad={0} between={durCard} />
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, ...SHADOW_F }}>
        {v.slot && count ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}><Clock size={14} color={G.violet} strokeWidth={1.5} /><Txt size={13} color={G.sub}>{whenText({ date: v.date, slot: v.slot })} · {inr(sub)}</Txt></View> : null}
        <PrimaryBtn label="Add to cart" disabled={!v.slot || !count} busy={busy} onPress={add} />
      </View>
    </View>
  );
}
