// Placeholder body for a page a screen worker has not built yet (CORE-owned). Back bar + title, so every route opens.
import React, { ReactNode } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Back } from '../ui/icons';
import { closePage } from '../state';
import { G } from './parts';

/** Native back bar used by pushed pages: back arrow + title (+ optional right slot). */
export function PageBar({ title, right, onBack = closePage }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const ins = useInsets();
  return (
    <View style={{ backgroundColor: '#fff', paddingTop: ins.top + 8, paddingBottom: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: G.line }}>
      <Pressable accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Back size={18} color={G.ink} strokeWidth={1.5} /></Pressable>
      <Txt weight={500} size={17} style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

export default function Stub({ title, note, back = true }: { title: string; note?: string; back?: boolean }) {
  const ins = useInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {back ? <PageBar title={title} /> : <View style={{ paddingTop: ins.top + 16, paddingHorizontal: 16 }}><Txt weight={500} size={20}>{title}</Txt></View>}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Txt size={14} color={G.sub}>{note || 'This page is being built.'}</Txt>
      </ScrollView>
    </View>
  );
}
