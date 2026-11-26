// Address sheets: 'Select service location' picker (Home header, cart) and the edit/delete menu of one address, plus the
// saved-address card and a small shimmer shared with the Addresses and map pages. OWNER: PROFILE worker (pronto-video-2026-11-15/CONTRACT.md).
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, Animated, Easing, Platform } from 'react-native';
import { Txt } from '../ui/kit';
import { Search, Plus, Locate, Pin, Close, More, Pen, Trash, Check } from '../ui/icons';
import { SheetTitle } from '../ui/hosts';
import { C } from '../theme';
import { openSheet, closeSheet, openPage, toast, act, useApp, addresses, selectedAddress, addrName, addrLine, addrDistance, haptic } from '../state';
import type { Address } from '../state';

const INK = '#171717', SUB = '#525252', MUTE = '#737373', LINE = 'rgba(23,23,23,0.08)', RAISED = '#F4F4F5', RED = '#dc2626', ND = Platform.OS !== 'web';
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** grey block that pulses while something loads */
export function Shimmer({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: object }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: ND }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: ND })])); l.start(); return () => l.stop() }, []);
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: '#E4E4E7', opacity: o }, style]} />;
}

export const matches = (a: Address, q: string) => { const s = q.trim().toLowerCase(); return !s || (addrName(a) + ' ' + addrLine(a)).toLowerCase().includes(s) };

/** one saved address: distance pill, label + Selected tag, line, kebab menu */
export function AddrCard({ a, selected, onPress, menu = true }: { a: Address; selected: boolean; onPress?: () => void; menu?: boolean }) {
  const d = addrDistance(a), s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(s, { toValue: v, duration: 120, easing: EASE, useNativeDriver: ND }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.98)} onPressOut={() => to(1)} accessibilityLabel={`${addrName(a)} address`}>
      <Animated.View style={{ transform: [{ scale: s }], flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: selected ? C.violet : LINE, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
        <View style={{ width: 48, alignItems: 'center', paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: selected ? C.violet : LINE, backgroundColor: selected ? 'rgba(84,9,218,0.06)' : '#fff' }}>
          <Pin size={18} color={selected ? C.violet : MUTE} strokeWidth={1.5} />
          {d ? <Txt size={11} color={selected ? C.violet : MUTE} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{d}</Txt> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt weight={500} size={15} color={INK} numberOfLines={1} style={{ flexShrink: 1 }}>{addrName(a)}</Txt>
            {selected ? <View style={{ backgroundColor: 'rgba(84,9,218,0.08)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Txt weight={500} size={10} color={C.violet} style={{ letterSpacing: 0.5 }}>SELECTED</Txt></View> : null}
          </View>
          <Txt size={13} color={SUB} numberOfLines={2} style={{ marginTop: 2, lineHeight: 18 }}>{addrLine(a)}</Txt>
        </View>
        {menu ? <Pressable accessibilityLabel="Address options" hitSlop={8} onPress={() => openAddressMenu(a.id)} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}><More size={18} color={MUTE} strokeWidth={1.5} /></Pressable> : null}
      </Animated.View>
    </Pressable>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search for your location or apartment' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [f, setF] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 12, paddingHorizontal: 12, backgroundColor: RAISED, borderWidth: f ? 1.5 : 1, borderColor: f ? C.violet : 'transparent' }}>
      <Search size={18} color={C.violet} strokeWidth={1.5} />
      <TextInput value={value} onChangeText={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} placeholder={placeholder} placeholderTextColor={MUTE} style={[{ flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, color: INK, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]} />
      {value ? <Pressable accessibilityLabel="Clear" hitSlop={8} onPress={() => onChange('')}><Close size={16} color={MUTE} strokeWidth={1.5} /></Pressable> : null}
    </View>
  );
}

/** the two tiles under the search: Current location, New address */
export function QuickTiles({ onAfter }: { onAfter?: () => void }) {
  const [busy, setBusy] = useState(false);
  const cur = async () => {
    if (busy) return; setBusy(true);
    try { await act.locate({ prompt: true }); onAfter?.(); openPage({ k: 'addressMap' }); } catch (e: any) { toast(e.message || 'Could not find your location.') } finally { setBusy(false) }
  };
  const tile = (label: string, icon: React.ReactNode, f: () => void, loading?: boolean) => (
    <Pressable key={label} onPress={f} style={({ pressed }) => ({ flex: 1, height: 88, padding: 12, justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: pressed ? RAISED : '#fff', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {loading ? <Shimmer w={24} h={24} r={12} /> : icon}
      <Txt weight={500} size={14} color={INK}>{loading ? 'Finding you…' : label}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {tile('Current location', <Locate size={24} color={C.violet} strokeWidth={1.5} />, cur, busy)}
      {tile('New address', <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Plus size={14} color="#fff" strokeWidth={2} /></View>, () => { onAfter?.(); openPage({ k: 'addressMap' }) })}
    </View>
  );
}

function Picker() {
  useApp();
  const [q, setQ] = useState(''), list = addresses().filter(a => matches(a, q)), sel = selectedAddress();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><SheetTitle>Select service location</SheetTitle></View>
        <Pressable accessibilityLabel="Close" hitSlop={10} onPress={closeSheet} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -8 }}><Close size={20} color={INK} strokeWidth={1.5} /></Pressable>
      </View>
      <View style={{ marginTop: 8 }}><SearchBox value={q} onChange={setQ} /></View>
      <View style={{ marginTop: 16 }}><QuickTiles onAfter={closeSheet} /></View>
      <Txt weight={500} size={12} color={MUTE} style={{ marginTop: 24, marginBottom: 8, letterSpacing: 0.6 }}>SAVED ADDRESSES</Txt>
      <View style={{ gap: 12 }}>
        {list.map(a => <AddrCard key={a.id} a={a} selected={sel?.id === a.id} onPress={() => { act.selectAddress(a.id); closeSheet() }} />)}
        {!list.length ? <Txt size={14} color={SUB} style={{ paddingVertical: 12 }}>{q ? 'No saved address matches. Add it as a new address.' : 'No saved addresses yet. Add where your car is parked.'}</Txt> : null}
      </View>
    </View>
  );
}

/** 'Select service location': search, use current location, New address, saved list with Selected tag + distance. Tap -> act.selectAddress(id). */
export function openAddressPicker() { openSheet(<Picker />) }

function Menu({ id }: { id: string }) {
  const [ask, setAsk] = useState(false), [busy, setBusy] = useState(false);
  const item = (icon: React.ReactNode, label: string, f: () => void, color = INK) => (
    <Pressable onPress={f} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56, paddingHorizontal: 4, backgroundColor: pressed ? RAISED : '#fff' })}>
      {icon}<Txt size={15} color={color}>{label}</Txt>
    </Pressable>
  );
  const del = async () => { setBusy(true); try { await act.deleteAddress(id); closeSheet() } catch (e: any) { toast(e.message); setBusy(false) } };
  if (ask) return (
    <View>
      <SheetTitle>Delete this address?</SheetTitle>
      <Txt size={14} color={SUB} style={{ marginBottom: 20, lineHeight: 20 }}>It will be removed from your saved addresses. Bookings already made keep their address.</Txt>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={() => setAsk(false)} style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: RAISED, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={15}>Keep it</Txt></Pressable>
        <Pressable disabled={busy} onPress={del} style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}><Txt weight={500} size={15} color="#fff">{busy ? 'Deleting…' : 'Delete'}</Txt></Pressable>
      </View>
    </View>
  );
  return (
    <View>
      <SheetTitle>Address</SheetTitle>
      {item(<Check size={20} color={MUTE} strokeWidth={1.5} />, 'Use this address', () => { act.selectAddress(id); haptic(); closeSheet() })}
      {item(<Pen size={20} color={MUTE} strokeWidth={1.5} />, 'Edit details', () => { closeSheet(); openPage({ k: 'addressForm', id }) })}
      {item(<Pin size={20} color={MUTE} strokeWidth={1.5} />, 'Move the map pin', () => { closeSheet(); openPage({ k: 'addressMap', id }) })}
      {item(<Trash size={20} color={RED} strokeWidth={1.5} />, 'Delete', () => setAsk(true), RED)}
    </View>
  );
}

/** kebab menu on one saved address: Edit -> openPage({ k: 'addressForm', id }), Delete -> act.deleteAddress(id). */
export function openAddressMenu(id: string) { openSheet(<Menu id={id} />) }
