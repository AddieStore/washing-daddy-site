// Add / edit address details: flat, street, map location, save-as chips, receiver (myself / someone else). OWNER: PROFILE worker.
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Pin, Home, Phone, User } from '../ui/icons';
import { C } from '../theme';
import { act, useApp, addressOf, profile, closePage, openPage, toast, fmtPhone } from '../state';
import type { AddressLabel } from '../state';
import { PageBar } from './Stub';
import { G, PrimaryBtn } from './parts';
import { FloatField } from './ProfileEdit';
import { mapFlow } from './AddressMap';

export default function AddressForm({ id, lat, lng, area }: { id?: string; lat?: number; lng?: number; area?: string }) {
  useApp();
  const ins = useInsets(), ex = id ? addressOf(id) : null, me = profile(), viaMap = useRef(mapFlow.viaMap).current;
  const [pos, setPos] = useState({ lat: lat ?? ex?.lat ?? NaN, lng: lng ?? ex?.lng ?? NaN, area: area ?? ex?.area ?? '' });
  const [flat, setFlat] = useState(ex?.flat || ''), [street, setStreet] = useState(ex?.street || ''), [label, setLabel] = useState<AddressLabel>(ex?.label || 'Home'), [other, setOther] = useState(ex?.other || '');
  const [self, setSelf] = useState(ex ? ex.receiver.self : true), [rn, setRn] = useState(ex && !ex.receiver.self ? ex.receiver.name : ''), [rp, setRp] = useState(ex && !ex.receiver.self ? ex.receiver.phone : ''), [busy, setBusy] = useState(false);
  React.useEffect(() => { mapFlow.viaMap = false }, []);
  const labels: AddressLabel[] = ['Home', 'Work', ...(ex?.label === 'Parents' ? ['Parents' as const] : []), 'Other'];
  const change = () => { mapFlow.seed = Number.isFinite(pos.lat) ? { lat: pos.lat, lng: pos.lng } : null; mapFlow.onPick = (a, b, ar) => { setPos({ lat: a, lng: b, area: ar }); mapFlow.seed = null }; openPage({ k: 'addressMap', id }) };
  const save = async () => {
    setBusy(true);
    try {
      await act.saveAddress({ id, label, other: label === 'Other' ? other : undefined, flat, street, area: pos.area, lat: pos.lat, lng: pos.lng, receiver: self ? { self: true } : { self: false, name: rn, phone: rp } });
      closePage(); if (viaMap) closePage();
    } catch (e: any) { toast(e.message); setBusy(false) }
  };
  const Chip = ({ l }: { l: AddressLabel }) => { const on = label === l, I = l === 'Home' ? Home : l === 'Other' ? Pin : User; return (
    <Pressable onPress={() => setLabel(l)} style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.06)' : '#fff', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <I size={16} color={on ? C.violet : G.mute} strokeWidth={1.5} /><Txt weight={on ? 500 : 400} size={14} color={on ? C.violet : G.ink}>{l}</Txt>
    </Pressable>) };
  const seg = (on: boolean, text: string, f: () => void) => <Pressable onPress={f} style={{ flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.violet : 'transparent' }}><Txt weight={500} size={14} color={on ? '#fff' : G.sub}>{text}</Txt></Pressable>;
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title={ex ? 'Edit address' : 'Add address details'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, padding: 16 }}>
            <FloatField label="Flat, floor and building*" value={flat} onChange={setFlat} maxLength={120} />
            <Txt size={12} color={G.mute} style={{ marginTop: -10, marginBottom: 16 }}>Example: B-204, 2nd floor, Sunder Enclave</Txt>
            <FloatField label="Street or landmark (recommended)" value={street} onChange={setStreet} maxLength={120} />
            <Txt size={12} color={G.mute} style={{ marginBottom: 6 }}>Map location</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, backgroundColor: G.raised }}>
              <Txt size={13} color={G.ink} numberOfLines={3} style={{ flex: 1, lineHeight: 18 }}>{pos.area || (Number.isFinite(pos.lat) ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : 'Not set yet')}</Txt>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Pin size={18} color={C.violet} strokeWidth={1.5} /></View>
            </View>
            <Pressable onPress={change} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 12 }}><Txt weight={500} size={14} color={C.violet}>Change location</Txt></Pressable>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, padding: 16, marginTop: 12 }}>
            <Txt weight={500} size={14} style={{ marginBottom: 12 }}>Save address as</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{labels.map(l => <Chip key={l} l={l} />)}</View>
            {label === 'Other' ? <View style={{ marginTop: 16 }}><FloatField label="Name this address*" value={other} onChange={setOther} maxLength={30} /></View> : null}
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: G.line, padding: 16, marginTop: 12 }}>
            <Txt weight={500} size={14}>Receiver details</Txt>
            <Txt size={12} color={G.mute} style={{ marginTop: 2, marginBottom: 12 }}>Our washer will reach out to the receiver on this number.</Txt>
            <View style={{ flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: G.raised, marginBottom: 16 }}>{seg(self, 'For myself', () => setSelf(true))}{seg(!self, 'For someone else', () => setSelf(false))}</View>
            {self ? <>
              <FloatField label="Receiver's phone number" value={fmtPhone(me.phone)} prefix="+91" readOnly />
              <FloatField label="Receiver's name" value={me.first + (me.last ? ' ' + me.last : '')} readOnly />
            </> : <>
              <FloatField label="Receiver's phone number*" value={rp} onChange={v => setRp(v.replace(/\D/g, '').slice(0, 10))} prefix="+91" keyboardType="phone-pad" maxLength={10}
                right={<Pressable accessibilityLabel="Pick from contacts" hitSlop={8} onPress={() => toast('Contacts picker arrives in the next app update. Type the number for now.')} style={{ marginLeft: 8 }}><Phone size={20} color={G.mute} strokeWidth={1.5} /></Pressable>} />
              <FloatField label="Receiver's name*" value={rn} onChange={setRn} maxLength={60} autoCapitalize="words" />
            </>}
          </View>
        </ScrollView>
        <View style={{ padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line }}>
          <PrimaryBtn label="Save address" onPress={save} busy={busy} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
