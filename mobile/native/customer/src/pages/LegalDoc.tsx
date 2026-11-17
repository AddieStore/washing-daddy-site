// One legal page from the live config (legal/{id}: title, markdown body, version): native back bar, numbered clauses,
// readable text, no WebView. A page the admin hid or deleted shows a short note. OWNER: PROFILE worker (live: CORE).
import React from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { openSheet, SheetTitle } from '../ui/hosts';
import { Txt, useInsets } from '../ui/kit';
import { C } from '../theme';
import { act, useApp, legalPage, mdBlocks, appCfg } from '../state';
import { PageBar } from './Stub';
import { G, TNUM } from './parts';

export default function LegalDoc({ id }: { id: string }) {
  useApp();
  const d = legalPage(id), ins = useInsets(), email = appCfg().support.email;
  if (!d) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Legal" />
      <Txt size={14} color={G.sub} style={{ padding: 16 }}>This page is not available right now.</Txt>
    </View>
  );
  // ## headings become numbered clauses; paragraphs and bullets under them are numbered n.1, n.2, ...
  let n = 0, j = 0;
  const blocks = mdBlocks(d.body);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title={d.title} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(ins.bottom, 16) + 24 }}>
        <Txt weight={500} size={24} style={{ lineHeight: 32 }}>{d.title}</Txt>
        {d.updated ? <Txt size={13} color={G.mute} style={{ marginTop: 4 }}>Last updated {d.updated}{d.draft ? ' · Draft' : ''}</Txt> : null}
        {blocks.map((b, i) => {
          if (b.k === 'h') {
            n++; j = 0; const m = /^(\d+)\.\s*(.*)$/.exec(b.t);
            return <Txt key={i} weight={500} size={17} style={{ lineHeight: 24, marginTop: 28 }}>{m ? m[1] : n}. {m ? m[2] : b.t}</Txt>;
          }
          j++;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Txt size={14} color={G.mute} style={[TNUM, { width: 32, lineHeight: 22 }]}>{n ? `${n}.${j}` : b.k === 'li' ? '•' : ''}</Txt>
              <Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 22 }} selectable>{b.t}</Txt>
            </View>
          );
        })}
        <View style={{ marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: G.line }}>
          <Txt size={13} color={G.mute}>Questions about this page? Write to {email}.</Txt>
          {d.url ? <Pressable onPress={() => act.openUrl(d.url)} hitSlop={8} style={{ marginTop: 8 }}><Txt weight={500} size={13} color={C.violet}>Read on washingdaddy.com</Txt></Pressable> : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** the same page in a bottom sheet, for the sign-up screen (no page stack before sign-in) */
export function LegalSheetBody({ id }: { id: string }) {
  const d = legalPage(id), { height } = useWindowDimensions();
  if (!d) return <Txt size={14} color={G.sub}>This page is not available right now.</Txt>;
  return (
    <View>
      <SheetTitle>{d.title}</SheetTitle>
      {d.updated ? <Txt size={12} color={G.mute}>Last updated {d.updated}</Txt> : null}
      <ScrollView style={{ maxHeight: height * 0.6, marginTop: 12 }}>
        {mdBlocks(d.body).map((b, i) => <Txt key={i} weight={b.k === 'h' ? 500 : 400} size={b.k === 'h' ? 15 : 13} color={b.k === 'h' ? G.ink : G.sub} style={{ marginTop: b.k === 'h' ? 14 : 6, lineHeight: b.k === 'h' ? 22 : 19 }}>{b.k === 'li' ? '• ' + b.t : b.t}</Txt>)}
      </ScrollView>
    </View>
  );
}
export const openLegalSheet = (id: string) => openSheet(<LegalSheetBody id={id} />);
