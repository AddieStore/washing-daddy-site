// About us: what Washing Daddy is, how it works, FAQs, legal footer links. In-app, no WebView. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt } from '../ui/kit';
import { Chev } from '../ui/icons';
import { C } from '../theme';
import { act, openPage, useApp, legalPages, appCfg } from '../state';
import { ABOUT } from '../data/help';
import { PageBar } from './Stub';
import { G, card } from './parts';
import { Accordion, ListRow } from './Help';

export default function About() {
  useApp();
  const legal = legalPages('footer');
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="About us" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Txt weight={600} size={22} style={{ lineHeight: 28 }}>{ABOUT.title}</Txt>
        <Txt size={15} color={G.sub} style={{ marginTop: 8, lineHeight: 22 }}>{ABOUT.intro}</Txt>

        <Txt weight={500} size={17} style={{ marginTop: 32, marginBottom: 12 }}>How it works</Txt>
        <View style={{ gap: 12 }}>
          {ABOUT.how.map(([h, p], i) => (
            <View key={h} style={card({ padding: 16, flexDirection: 'row', gap: 16, alignItems: 'center' })}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={15} color="#fff">{i + 1}</Txt></View>
              <View style={{ flex: 1 }}><Txt weight={500} size={15}>{h}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2 }}>{p}</Txt></View>
            </View>
          ))}
        </View>

        <Txt weight={500} size={17} style={{ marginTop: 32, marginBottom: 12 }}>Questions</Txt>
        <Accordion items={ABOUT.faqs} />

        {legal.length ? <Txt weight={500} size={17} style={{ marginTop: 32, marginBottom: 12 }}>Legal</Txt> : null}
        {legal.length ? <View style={[card({ overflow: 'hidden' })]}>
          {legal.map((d, i) => <ListRow key={d.id} title={d.title} onPress={() => openPage({ k: 'legalDoc', id: d.id })} last={i === legal.length - 1} />)}
        </View> : null}
        <Pressable onPress={() => act.openUrl('https://washingdaddy.com/')} style={{ marginTop: 24, alignItems: 'center', padding: 8 }}><Txt weight={500} size={14} color={C.violet}>washingdaddy.com</Txt></Pressable>
        <Txt size={12} color={G.mute} style={{ textAlign: 'center', marginTop: 4 }}>{appCfg().support.email}</Txt>
      </ScrollView>
    </View>
  );
}
