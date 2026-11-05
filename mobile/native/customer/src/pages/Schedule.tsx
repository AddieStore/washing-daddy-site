// Schedule for later (Pronto "Schedule for later"): date chips, info strip, duration card, Morning/Afternoon/Evening, slots, confirm.
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Back, Info, Sun, Moon } from '../ui/icons';
import { useApp, act, svcLines, closePage, go, toast } from '../state';
import { SLOTS } from '../data/reference';
import { TODAY, addDays, iso, istNow } from '../data/dates';
import { G, card, PrimaryBtn, SuccessTick } from './parts';

type Part = keyof typeof SLOTS;
const PARTS: Part[] = ['Morning', 'Afternoon', 'Evening'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourOf = (s: string) => { const m = /(\d+):\d+ (am|pm)/.exec(s)!; return (+m[1] % 12) + (m[2] === 'pm' ? 12 : 0) };

export default function Schedule() {
  useApp();
  const ins = useInsets(), { mins, sub, count } = svcLines();
  const days = useMemo(() => [...Array(7)].map((_, i) => { const d = addDays(TODAY, i); return { d, key: iso(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DOW[d.getDay()] } }), []);
  const [day, setDay] = useState(days[1].key), [slot, setSlot] = useState(''), [busy, setBusy] = useState(false), [ok, setOk] = useState(false);
  const isToday = day === days[0].key, nowH = istNow().getUTCHours() + istNow().getUTCMinutes() / 60;
  const avail = (p: Part) => SLOTS[p].filter(s => !isToday || hourOf(s) > nowH + 1);
  const [part, setPart] = useState<Part>('Morning');
  const cur = avail(part);
  const confirm = async () => {
    setBusy(true);
    try { await act.bookServices({ date: day, slot }); setOk(true) } catch (e: any) { toast(e?.message || 'Could not book. Try again.') }
    setBusy(false);
  };
  const dur = mins >= 60 ? `${+(mins / 60).toFixed(1)} hr` : `${mins} mins`;
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F6FC' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={closePage} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back size={22} color={C.ink} /></Pressable>
        <Txt weight={500} size={16}>Schedule for later</Txt>
      </View>
      <View style={{ backgroundColor: '#fff', paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 6 }}>
          {days.map(x => { const on = x.key === day; return (
            <Pressable key={x.key} onPress={() => { setDay(x.key); setSlot('') }} style={{ width: 82, height: 36, borderRadius: 8, borderWidth: on ? 1.5 : 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? G.tint : '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Txt weight={on ? 600 : 400} size={12.5} color={on ? C.violet : C.ink}>{x.label}</Txt>
            </Pressable>) })}
        </ScrollView>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: G.tint, borderRadius: 12, padding: 10, alignItems: 'center' }}>
          <Info size={20} color={C.violet} /><Txt size={12} style={{ flex: 1, lineHeight: 17 }}>Pick a day and time that suits you. Your washer comes to your parking spot.</Txt>
        </View>
        <View style={card({ marginTop: 14, padding: 16 })}>
          <Txt size={12} color={G.sub}>Service duration</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.violet, backgroundColor: G.tint, padding: 12, alignSelf: 'flex-start', paddingRight: 24 }}>
            <View><Txt weight={600} size={15} color={C.violet}>{dur}</Txt>
              <View style={{ flexDirection: 'row', gap: 6 }}><Txt weight={600} size={12}>₹{sub}</Txt><Txt size={11} color={G.sub}>{count} {count === 1 ? 'service' : 'services'}</Txt></View></View>
          </View>
          <Txt size={12} color={G.sub} style={{ marginTop: 18 }}>Service start time</Txt>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: G.line, padding: 3, marginTop: 10 }}>
            {PARTS.map(p => { const on = p === part, Ic = p === 'Evening' ? Moon : Sun; return (
              <Pressable key={p} onPress={() => { setPart(p); setSlot('') }} style={{ flex: 1, height: 34, borderRadius: 17, backgroundColor: on ? C.violet : 'transparent', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Ic size={15} color={on ? '#fff' : C.ink} /><Txt weight={on ? 600 : 400} size={12} color={on ? '#fff' : C.ink}>{p}</Txt>
              </Pressable>) })}
          </View>
          <View style={{ marginTop: 14, backgroundColor: '#F8F6FC', borderRadius: 12, borderWidth: 1, borderColor: G.line, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: G.line }}><Txt weight={500} size={12.5}>Standard slots</Txt></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10, backgroundColor: '#fff' }}>
              {cur.length ? cur.map(s => { const on = s === slot; return (
                <Pressable key={s} onPress={() => setSlot(s)} style={{ minWidth: 66, height: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: on ? 1.5 : 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? G.tint : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <Txt weight={on ? 600 : 400} size={12} color={on ? C.violet : C.ink}>{s}</Txt>
                </Pressable>) }) : <Txt size={13} color={G.sub}>No slots left for this time today. Try another time of day.</Txt>}
            </View>
          </View>
        </View>
        <Txt weight={600} size={10.5} color={G.sub} style={{ marginTop: 22, letterSpacing: 0.6 }}>NOTE</Txt>
        <Txt size={12} color="#3B2C55" style={{ marginTop: 2 }}>Washers arrive within 30 minutes of the selected slot.</Txt>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4 }}>
        <PrimaryBtn label="Confirm slot" disabled={!slot} busy={busy} onPress={confirm} />
      </View>
      {ok ? <SuccessTick title="Slot confirmed" sub={`${days.find(x => x.key === day)!.label} · ${slot}`} onDone={() => { closePage(); go('live') }} /> : null}
    </View>
  );
}
