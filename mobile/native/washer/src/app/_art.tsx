// Dev-only preview of the character art (ui/art). Hidden route /_art, not linked from the UI. ?still=1 freezes the loops.
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { DoneArt, EmptyArt, RoundHeroArt, WorkingArt } from '../ui/art';

const lbl = { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#5409DA', marginTop: 18, marginBottom: 6, marginLeft: 16 } as const;
const Btn = ({ t, on, onPress }: { t: string; on?: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: on ? '#5409DA' : '#EDE6FF' }}>
    <Text style={{ color: on ? '#fff' : '#5409DA', fontSize: 12 }}>{t}</Text>
  </Pressable>
);

export default function ArtDemo() {
  const { width: ww } = useWindowDimensions();
  const w = Math.min(ww, 480);
  const [p, setP] = useState(0.35), [done, setDone] = useState(false);
  const still = Platform.OS === 'web' && typeof location !== 'undefined' && /still=1/.test(location.search);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F2FF' }} contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}>
      <View style={{ width: w }}>
        <Text style={lbl}>RoundHeroArt (220px band)</Text>
        <RoundHeroArt width={w} progress={p} done={done} still={still} />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(v => <Btn key={v} t={`${v * 100}%`} on={!done && p === v} onPress={() => { setDone(false); setP(v); }} />)}
          <Btn t="done" on={done} onPress={() => setDone(true)} />
        </View>
        <Text style={lbl}>WorkingArt</Text>
        <WorkingArt width={w} still={still} />
        <Text style={lbl}>EmptyArt kind=&quot;jobs&quot;</Text>
        <View style={{ alignItems: 'center' }}><EmptyArt kind="jobs" width={Math.min(w - 40, 300)} still={still} /></View>
        <Text style={lbl}>EmptyArt kind=&quot;history&quot;</Text>
        <View style={{ alignItems: 'center' }}><EmptyArt kind="history" width={Math.min(w - 40, 300)} still={still} /></View>
        <Text style={lbl}>DoneArt</Text>
        <View style={{ alignItems: 'center' }}><DoneArt width={Math.min(w - 20, 320)} still={still} /></View>
      </View>
    </ScrollView>
  );
}
