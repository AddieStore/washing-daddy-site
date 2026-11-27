// Home cards for Parking alerts: the spot the washer is using now, and a park the customer has not answered yet.
import React from 'react';
import { View, Pressable } from 'react-native';
import { Txt as KTxt, TxtProps } from './kit';
import { P, PBtn, POutline } from './pr';
import { Pin } from './icons';
import { useApp, car, isGuest, openSheet, closeSheet, toast } from '../state';
import { useParkView, spotFor, pendingPark, show, endSpot, distText, carSetting, type Park } from '../park';

const Txt = (p: TxtProps) => <KTxt {...p} color={p.color ?? P.ink} />;
const box = { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.line } as const;

function ConfirmBack({ name }: { name: string }) {
  const [busy, setBusy] = React.useState(false);
  const go = async () => { setBusy(true); try { await endSpot(car()); closeSheet(); toast('Your washer will use the usual spot.') } catch (e: any) { setBusy(false); toast(e?.message || "That didn't go through.") } };
  return (
    <View>
      <Txt weight={500} size={22} style={{ marginBottom: 4, lineHeight: 28 }}>Back at the usual spot?</Txt>
      <Txt size={14} color={P.grey} style={{ marginBottom: 16, lineHeight: 20 }}>{`Your washer will go back to where ${name} is usually parked.`}</Txt>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <POutline label="Cancel" onPress={closeSheet} style={{ flex: 1 }} />
        <PBtn label="Yes, it's back" busy={busy ? 'Saving…' : false} onPress={go} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export function ParkCard() {
  useApp(); useParkView();
  if (isGuest()) return null;
  let c: ReturnType<typeof car>; try { c = car() } catch { return null }
  if (!c) return null;
  const spot = spotFor(c), pend = pendingPark();
  if (spot) {
    const change = () => {
      const s = carSetting(c.id);
      const p: Park = { id: 'spot' + spot.ids[0], carId: c.id, reg: s?.reg || c.plate, lat: spot.lat, lng: spot.lng, acc: 0, at: Date.now(), away: true, distM: spot.distM };
      show(p);
    };
    return (
      <View style={box}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pin size={18} color={P.violet} strokeWidth={1.5} />
          <Txt weight={500} size={15}>Parked somewhere new</Txt>
        </View>
        <Txt size={14} color={P.grey} style={{ marginTop: 6, lineHeight: 20 }}>{spot.label}</Txt>
        {spot.note ? <Txt size={14} style={{ marginTop: 4, lineHeight: 20 }}>{spot.note}</Txt> : null}
        {spot.distM != null ? <Txt size={13} color={P.muted} style={{ marginTop: 4 }}>{distText(spot.distM)} from the usual spot</Txt> : null}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <POutline label="Change" onPress={change} style={{ flex: 0.75, minHeight: 44, paddingHorizontal: 12 }} />
          <PBtn label="Back at usual spot" onPress={() => openSheet(<ConfirmBack name={c.name} />)} style={{ flex: 1.4, minHeight: 44, paddingHorizontal: 12 }} />
        </View>
      </View>
    );
  }
  if (pend) {
    return (
      <Pressable accessibilityRole="button" onPress={() => show(pend)} style={[box, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Pin size={20} color={P.violet} strokeWidth={1.5} />
        <View style={{ flex: 1 }}>
          <Txt weight={500} size={15}>Parked somewhere new?</Txt>
          <Txt size={13} color={P.grey} style={{ marginTop: 2 }}>Add the spot for your washer</Txt>
        </View>
        <Txt weight={500} size={14} color={P.violet}>Add</Txt>
      </Pressable>
    );
  }
  return null;
}
