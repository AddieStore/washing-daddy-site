// One help topic: FAQ accordions and a "Can't find your answer?" card that opens WhatsApp. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt } from '../ui/kit';
import { Arrow, Help as HelpIc } from '../ui/icons';
import { C } from '../theme';
import { act } from '../state';
import { HELP_TOPICS } from '../data/help';
import type { HelpTopic as HT } from '../data/help';
import { PageBar } from './Stub';
import { G } from './parts';
import { Accordion } from './Help';
type HelpTopicId = HT['id'];

export default function HelpTopic({ id }: { id: HelpTopicId }) {
  const t = HELP_TOPICS.find(x => x.id === id) || HELP_TOPICS[0];
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title={t.title} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Txt weight={500} size={20} style={{ marginBottom: 16 }}>Help related to {t.title.toLowerCase()}</Txt>
        <Accordion items={t.faqs} />
        <Pressable onPress={() => act.whatsapp(`Hi Washing Daddy, I need help with ${t.title.toLowerCase()}.`)} style={({ pressed }) => ({ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(84,9,218,0.2)', backgroundColor: pressed ? 'rgba(84,9,218,0.1)' : 'rgba(84,9,218,0.05)' })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><HelpIc size={20} color={C.violet} strokeWidth={1.5} /></View>
          <View style={{ flex: 1 }}><Txt weight={500} size={15}>Can't find your answer?</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2 }}>Our support team is here to help</Txt></View>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Arrow size={16} color="#fff" strokeWidth={1.5} /></View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
