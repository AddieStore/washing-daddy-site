// Help & support hub: My refunds, topics, Chat with us (WhatsApp). Also exports the shared list row and FAQ accordion. OWNER: PROFILE worker.
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Chev, Plus, WhatsApp } from '../ui/icons';
import { C } from '../theme';
import { act, useApp, openPage, refunds, toast, helpTopics, feature } from '../state';
import { Buttons } from '../screens/Home';
import { PageBar } from './Stub';
import { G, card, PrimaryBtn, Price, inr } from './parts';

/** white row with title, optional sub line and a chevron; press tints the row */
export function ListRow({ icon, title, sub, onPress, last, danger, right }: { icon?: React.ReactNode; title: string; sub?: string; onPress?: () => void; last?: boolean; danger?: boolean; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed ? G.raised : '#fff' })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, gap: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: G.line }}>
        {icon ? <View style={{ width: 24, alignItems: 'center' }}>{icon}</View> : null}
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
          <Txt weight={500} size={15} color={danger ? G.neg : G.ink}>{title}</Txt>
          {sub ? <Txt size={13} color={G.mute} style={{ marginTop: 2 }}>{sub}</Txt> : null}
        </View>
        {right}
        {onPress ? <Chev size={18} color={G.mute} strokeWidth={1.5} /> : null}
      </View>
    </Pressable>
  );
}

/** question rows that open to show the answer; one open at a time */
export function Accordion({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState(-1);
  return (
    <View style={{ gap: 8 }}>
      {items.map(([q, a], i) => { const on = open === i; return (
        <Pressable key={q} onPress={() => setOpen(on ? -1 : i)} accessibilityRole="button" accessibilityState={{ expanded: on }} style={({ pressed }) => [card({ borderRadius: 12, padding: 16, backgroundColor: pressed ? G.raised : '#fff' })]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt weight={500} size={14} style={{ flex: 1, lineHeight: 20 }}>{q}</Txt>
            <View style={{ transform: [{ rotate: on ? '45deg' : '0deg' }] }}><Plus size={18} color={G.ink} strokeWidth={1.5} /></View>
          </View>
          {on ? <Txt size={14} color={G.sub} style={{ marginTop: 10, lineHeight: 21 }}>{a}</Txt> : null}
        </Pressable>); })}
    </View>
  );
}

export default function Help() {
  useApp();
  const ins = useInsets(), rf = refunds(), topics = helpTopics(), money = feature('wallet');
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {money ? <>
        <Txt weight={500} size={17}>My refunds</Txt>
        {rf.length ? (
          <Pressable onPress={() => openPage({ k: 'refunds' })} style={({ pressed }) => [card({ marginTop: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? G.raised : '#fff' })]}>
            <View style={{ flex: 1 }}><Txt weight={500} size={15}>{rf.length} {rf.length === 1 ? 'refund' : 'refunds'}</Txt><Txt size={13} color={G.mute} style={{ marginTop: 2 }}>Latest: {inr(rf[0].amt)} · {rf[0].status}</Txt></View>
            <Chev size={18} color={G.mute} strokeWidth={1.5} />
          </Pressable>
        ) : <Txt size={14} color={G.sub} style={{ marginTop: 6 }}>You don't have any refunds</Txt>}
        {rf.length ? null : <Pressable onPress={() => openPage({ k: 'refunds' })} hitSlop={8} style={{ marginTop: 6 }}><Txt weight={500} size={14} color={C.violet}>View refunds</Txt></Pressable>}
        </> : null}
        <Buttons placement="help" side={0} top={money ? 24 : 0} />

        {topics.length ? <Txt weight={500} size={17} style={{ marginTop: 32, marginBottom: 12 }}>Browse all help topics</Txt> : null}
        <View style={{ gap: 8 }}>
          {topics.map(t => (
            <Pressable key={t.id} onPress={() => openPage({ k: 'helpTopic', id: t.id })} style={({ pressed }) => [card({ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? G.raised : '#fff', transform: [{ scale: pressed ? 0.99 : 1 }] })]}>
              <View style={{ flex: 1 }}><Txt weight={500} size={15}>{t.title}</Txt>{t.sub ? <Txt size={13} color={G.mute} style={{ marginTop: 2 }}>{t.sub}</Txt> : null}</View>
              <Chev size={18} color={G.mute} strokeWidth={1.5} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, borderTopWidth: 1, borderTopColor: G.line, backgroundColor: '#fff' }}>
        <Txt size={13} color={G.mute} style={{ marginBottom: 8 }}>Reach out to customer support</Txt>
        <PrimaryBtn label="Chat with us" onPress={() => act.whatsapp('Hi Washing Daddy, I need help.')} />
      </View>
    </View>
  );
}
