// "Parked somewhere new?" sheet. Opened by the park logic (notification tap, in-app card, preview button) through onShowPark.
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { SP } from '../theme';
import { Txt as KTxt, TxtProps, Field } from '../ui/kit';
import { P, PBtn, POutline, PChips } from '../ui/pr';
import { SpotMap } from '../ui/SpotMap';
import { openSheet, closeSheet, toast, A } from '../state';
import { onShowPark, addSpot, dismiss, makeUsual, carSetting, distText, spanText, dayText, spotDates, washDateFor, type Park, type SpotLength } from '../park';

const Txt = (p: TxtProps) => <KTxt {...p} color={p.color ?? P.ink} />;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LENS: { key: string; len: SpotLength }[] = [{ key: '1', len: 1 }, { key: '2', len: 2 }, { key: '3', len: 3 }, { key: '7', len: 7 }, { key: 'back', len: 'back' }];

export function ParkSpotSheet({ park: p }: { park: Park }) {
  const [key, setKey] = useState('1'), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const len = LENS.find(l => l.key === key)!.len, d = spotDates(p.at, len), first = washDateFor(p.at);
  let name = 'car'; try { name = A().cars.find(c => c.id === p.carId)?.name || 'car' } catch {}
  const home = carSetting(p.carId)?.home || null;
  const items = [
    { key: '1', label: `${cap(dayText(first))} only` }, { key: '2', label: '2 days' }, { key: '3', label: '3 days' }, { key: '7', label: 'A week' }, { key: 'back', label: "Until it's back" },
  ];
  const add = async () => {
    setBusy(true);
    try { await addSpot(p, len, note); closeSheet(); toast('Your washer will find it there.') }
    catch (e: any) { setBusy(false); toast(e?.message || "That didn't go through.") }
  };
  return (
    <View>
      <Txt weight={500} size={22} style={{ marginBottom: 4, lineHeight: 28 }}>Parked somewhere new?</Txt>
      <Txt size={14} color={P.grey} style={{ marginBottom: SP.l, lineHeight: 20 }}>{`Your ${name} is ${p.distM != null ? distText(p.distM) : 'away'} from its usual spot. Add this spot so your washer finds it.`}</Txt>
      <SpotMap lat={p.lat} lng={p.lng} home={home} />
      <Txt weight={500} size={13} color={P.muted} style={{ marginTop: SP.l }}>How long</Txt>
      <PChips items={items} value={key} onChange={setKey} />
      <Txt size={13} color={P.grey} style={{ marginTop: -SP.s, marginBottom: SP.l }}>{spanText(d.from, d.to, d.untilBack)}</Txt>
      <Field label="Help your washer find it" placeholder="Basement B2, pillar 14, near the lift" value={note} onChangeText={setNote} maxLength={300} multiline={false} />
      <PBtn label="Add this spot" busy={busy ? 'Adding…' : false} onPress={add} />
      <POutline label="Not now" style={{ marginTop: SP.m }} onPress={() => { dismiss(p); closeSheet() }} />
      <Pressable onPress={() => { makeUsual(p); closeSheet(); toast('Saved as your usual spot.') }} hitSlop={10} style={{ alignSelf: 'center', marginTop: SP.l, padding: 6 }}>
        <Txt weight={500} size={14} color={P.violet}>This is my usual spot now</Txt>
      </Pressable>
    </View>
  );
}

// the park logic asks for the sheet through this hook (keeps src/park free of UI imports)
onShowPark(p => openSheet(<ParkSpotSheet park={p} />));
