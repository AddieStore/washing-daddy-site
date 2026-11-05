// Schedule for later: date chips, info strip, duration, Morning/Afternoon/Evening, slots, confirm.
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Back, Info, Sun, Moon } from '../ui/icons';
import { useApp, act, svcLines, closePage, go, toast } from '../state';
import { SLOTS } from '../data/reference';
import { TODAY, addDays, iso, istNow } from '../data/dates';
import { G, card, PrimaryBtn, SuccessTick, Tap, Price, TNUM, SHADOW_F } from './parts';

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
  const chip = (on: boolean, extra: object) => ({ borderRadius: 8, borderWidth: on ? 1.5 : 0, borderColor: G.violet, backgroundColor: on ? '#fff' : G.raised, alignItems: 'center' as const, justifyContent: 'center' as const, ...extra });
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityLabel="Back" onPress={closePage} hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Back size={18} color={G.ink} strokeWidth={1.5} /></Pressable>
        <Txt weight={500} size={17}>Schedule for later</Txt>
      </View>
      <View style={{ backgroundColor: '#fff', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: G.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
          {days.map(x => { const on = x.key === day; return (
            <Tap key={x.key} onPress={() => { setDay(x.key); setSlot('') }} style={chip(on, { width: 80, height: 40 })}>
              <Txt weight={on ? 500 : 400} size={13} color={on ? G.violet : G.ink}>{x.label}</Txt>
            </Tap>) })}
        </ScrollView>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 136 }}>
        <View style={{ flexDirection: 'row', gap: 12, backgroundColor: G.raised, borderRadius: 14, padding: 16, alignItems: 'flex-start' }}>
          <View style={{ marginTop: 1 }}><Info size={18} color={G.mute} strokeWidth={1.5} /></View><Txt size={13} color={G.sub} style={{ flex: 1, lineHeight: 20 }}>Pick a day and time that suits you. Your washer comes to your parking spot</Txt>
        </View>
        <View style={card({ marginTop: 12, padding: 16 })}>
          <Txt size={13} color={G.mute}>Service duration</Txt>
          <View style={{ marginTop: 12, borderRadius: 10, borderWidth: 1.5, borderColor: G.violet, backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start', minWidth: 120 }}>
            <Txt weight={500} size={15} style={TNUM}>{dur}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}><Price v={sub} size={13} /><Txt size={12} color={G.mute}>{count} {count === 1 ? 'service' : 'services'}</Txt></View>
          </View>
          <Txt size={13} color={G.mute} style={{ marginTop: 24 }}>Service start time</Txt>
          <View style={{ flexDirection: 'row', backgroundColor: G.raised, borderRadius: 10, padding: 4, marginTop: 12 }}>
            {PARTS.map(p => { const on = p === part, Ic = p === 'Evening' ? Moon : Sun; return (
              <Tap key={p} onPress={() => { setPart(p); setSlot('') }} style={{ flex: 1, height: 40, borderRadius: 8, backgroundColor: on ? G.violet : 'transparent', flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                <Ic size={18} color={on ? '#fff' : G.mute} strokeWidth={1.5} /><Txt weight={on ? 500 : 400} size={13} color={on ? '#fff' : G.ink}>{p}</Txt>
              </Tap>) })}
          </View>
          <Txt size={13} color={G.mute} style={{ marginTop: 24 }}>Standard slots</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {cur.length ? cur.map(s => { const on = s === slot; return (
              <Tap key={s} onPress={() => setSlot(s)} style={chip(on, { minWidth: 72, height: 40, paddingHorizontal: 12 })}>
                <Txt weight={on ? 500 : 400} size={13} color={on ? G.violet : G.ink} style={TNUM}>{s}</Txt>
              </Tap>) }) : <Txt size={14} color={G.sub}>No slots left for this time today. Try another time of day</Txt>}
          </View>
        </View>
        <Txt size={13} color={G.mute} style={{ marginTop: 16 }}>Washers arrive within 30 minutes of the selected slot</Txt>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, ...SHADOW_F }}>
        <PrimaryBtn label="Confirm slot" disabled={!slot} busy={busy} onPress={confirm} />
      </View>
      {ok ? <SuccessTick title="Slot confirmed" sub={`${days.find(x => x.key === day)!.label} · ${slot}`} onDone={() => { closePage(); go('live') }} /> : null}
    </View>
  );
}
