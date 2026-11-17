// Saved addresses page: search, current location, New address, saved list (Selected tag, distance, kebab). OWNER: PROFILE worker.
import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Txt } from '../ui/kit';
import { act, useApp, addresses, selectedAddress, closePage } from '../state';
import { PageBar } from './Stub';
import { G } from './parts';
import { AddrCard, SearchBox, QuickTiles, Shimmer, matches } from '../sheets/address';

export default function Addresses({ pick }: { pick?: boolean }) {
  useApp();
  const [q, setQ] = useState(''), [load, setLoad] = useState(true), list = addresses().filter(a => matches(a, q)), sel = selectedAddress();
  useEffect(() => { act.locate().catch(() => {}); const t = setTimeout(() => setLoad(false), 350); return () => clearTimeout(t) }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title={pick ? 'Select service location' : 'Saved addresses'} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SearchBox value={q} onChange={setQ} />
        <View style={{ marginTop: 16 }}><QuickTiles /></View>
        <Txt weight={500} size={12} color={G.mute} style={{ marginTop: 24, marginBottom: 8, letterSpacing: 0.6 }}>SAVED ADDRESSES</Txt>
        {load ? <View style={{ gap: 12 }}>{[0, 1].map(i => <View key={i} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: G.line }}><Shimmer w={48} h={48} r={10} /><View style={{ flex: 1, gap: 8 }}><Shimmer w={90} h={14} /><Shimmer h={12} /><Shimmer w="70%" h={12} /></View></View>)}</View> : (
          <View style={{ gap: 12 }}>
            {list.map(a => <AddrCard key={a.id} a={a} selected={sel?.id === a.id} onPress={pick ? () => { act.selectAddress(a.id); closePage() } : () => act.selectAddress(a.id)} />)}
            {!list.length ? <Txt size={14} color={G.sub} style={{ paddingVertical: 12 }}>{q ? 'No saved address matches. Add it as a new address.' : 'No saved addresses yet. Add where your car is parked.'}</Txt> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
