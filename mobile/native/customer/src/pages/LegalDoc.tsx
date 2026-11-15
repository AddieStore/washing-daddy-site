// One legal document from LEGAL_DOCS: native back bar, numbered clauses, readable text, no WebView. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { C } from '../theme';
import { act } from '../state';
import { LEGAL_DOCS } from '../data/legal';
import type { LegalId } from '../data/legal';
import { PageBar } from './Stub';
import { G, TNUM } from './parts';

export default function LegalDoc({ id }: { id: LegalId }) {
  const d = LEGAL_DOCS[id], ins = useInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title={d.title} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(ins.bottom, 16) + 24 }}>
        <Txt weight={500} size={24} style={{ lineHeight: 32 }}>{d.title}</Txt>
        <Txt size={13} color={G.mute} style={{ marginTop: 4 }}>Last updated {d.updated}</Txt>
        {d.sections.map((s, i) => {
          const m = /^(\d+)\.\s*(.*)$/.exec(s.h), n = m ? m[1] : String(i + 1), h = m ? m[2] : s.h;
          return (
            <View key={s.h} style={{ marginTop: 28 }}>
              <Txt weight={500} size={17} style={{ lineHeight: 24 }}>{n}. {h}</Txt>
              {s.p.map((t, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Txt size={14} color={G.mute} style={[TNUM, { width: 32, lineHeight: 22 }]}>{n}.{j + 1}</Txt>
                  <Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 22 }} selectable>{t}</Txt>
                </View>
              ))}
            </View>
          );
        })}
        <View style={{ marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: G.line }}>
          <Txt size={13} color={G.mute}>Questions about this page? Write to hello@washingdaddy.com.</Txt>
          <Pressable onPress={() => act.openUrl(d.url)} hitSlop={8} style={{ marginTop: 8 }}><Txt weight={500} size={13} color={C.violet}>Read on washingdaddy.com</Txt></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
