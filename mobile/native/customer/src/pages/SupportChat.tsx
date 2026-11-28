// In-app support chat: bubbles, quick-reply buttons on the last bot message, input, and the closed state with rating.
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Copy } from '../ui/icons';
import { act, useApp, openPage, closePage, toast, supportChat, supportMsgs, SupMsg } from '../state';
import { PageBar } from './Stub';
import { G, Tap } from './parts';

/** "2026-11-28T12:45:00+05:30" -> "12:45 pm" (read straight off the IST string) */
function clock(at: string): string {
  const m = /T(\d\d):(\d\d)/.exec(at); if (!m) return '';
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'pm' : 'am'}`;
}

function Bubble({ m, agent }: { m: SupMsg; agent: string }) {
  const me = m.from === 'customer';
  return (
    <View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%', marginTop: 10 }}>
      {m.from === 'agent' ? <Txt weight={500} size={12} color={G.mute} style={{ marginBottom: 2, marginLeft: 4 }}>{agent || 'Washing Daddy'}</Txt> : null}
      <View style={{ backgroundColor: me ? C.violet : G.raised, borderRadius: 16, borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Txt size={15} color={me ? '#fff' : G.ink} style={{ lineHeight: 21 }}>{m.text}</Txt>
      </View>
      <Txt size={11} color={G.mute} style={{ marginTop: 3, alignSelf: me ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>{clock(m.at)}</Txt>
    </View>
  );
}

export default function SupportChat({ id }: { id: string }) {
  useApp();
  const ins = useInsets(), chat = supportChat(id), msgs = supportMsgs(id), ref = useRef<any>(null);
  const [text, setText] = useState(''), [sending, setSending] = useState(false);
  useEffect(() => act.supportWatch(id), [id]);
  const closed = chat?.status === 'closed', n = msgs.length;
  useEffect(() => { const t = setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 60); return () => clearTimeout(t); }, [n, closed]);

  const run = async (p: Promise<unknown>) => { try { await p; } catch (e: any) { toast(e?.message || 'That did not go through'); } };
  const send = async () => {
    const t = text.trim(); if (!t || sending) return;
    setText(''); setSending(true);
    await run(act.supportSend(id, t));
    setSending(false);
  };
  const again = async () => {
    try {
      const nid = await act.supportOpen(chat?.topic || 'other', chat?.bookingId ? { id: chat.bookingId, title: chat.bookingTitle } : undefined);
      closePage(); openPage({ k: 'supportChat', id: nid });
    } catch (e: any) { toast(e?.message || 'Could not start the chat'); }
  };

  const lastBot = (() => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].from !== 'customer') return msgs[i].id; return ''; })();
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Tap label="End chat" disabled={closed || !chat} onPress={() => run(act.supportEnd(id))} style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: G.line, justifyContent: 'center', marginRight: 8, opacity: closed || !chat ? 0.4 : 1 }}>
        <Txt weight={500} size={13}>End chat</Txt>
      </Tap>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Washing Daddy Support" right={header} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: G.line }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: closed ? G.mute : G.pos }} />
        <Txt size={13} color={G.sub}>{closed ? 'Closed' : 'Online'}</Txt>
        {chat?.ticket ? (
          <Tap label="Copy ticket number" onPress={() => act.copy(chat.ticket, 'Ticket number copied')} hitSlop={8} scaleTo={0.98} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={13} color={G.mute}>Ticket {chat.ticket}</Txt>
            <Copy size={14} color={G.mute} strokeWidth={1.5} />
          </Tap>
        ) : null}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}>
          {msgs.map(m => (
            <View key={m.id}>
              <Bubble m={m} agent={chat?.agent || ''} />
              {!closed && m.id === lastBot && m.buttons?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {m.buttons.map(b => (
                    <Tap key={b.id} label={b.label} onPress={() => run(act.supportPick(id, b.id))} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: C.violet, backgroundColor: '#fff' }}>
                      <Txt weight={500} size={14} color={C.violet}>{b.label}</Txt>
                    </Tap>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {closed ? (
            <View style={{ alignItems: 'center', marginTop: 24, gap: 12 }}>
              <Txt size={13} color={G.mute}>This conversation is marked as Closed</Txt>
              <Txt weight={500} size={15}>How was your conversation?</Txt>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['good', 'bad'] as const).map(r => {
                  const on = chat?.rating === r;
                  return (
                    <Tap key={r} label={r === 'good' ? 'Good' : 'Bad'} onPress={() => run(act.supportRate(id, r))} style={{ minWidth: 96, paddingVertical: 10, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? C.violet : '#fff' }}>
                      <Txt weight={500} size={14} color={on ? '#fff' : G.ink}>{r === 'good' ? 'Good' : 'Bad'}</Txt>
                    </Tap>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                <Txt size={14} color={G.sub}>Still have an issue? </Txt>
                <Tap label="Chat with us" onPress={again} hitSlop={8}><Txt weight={500} size={14} color={C.violet}>Chat with us</Txt></Tap>
              </View>
            </View>
          ) : null}
        </ScrollView>
        {closed ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingBottom: Math.max(ins.bottom, 12), borderTopWidth: 1, borderTopColor: G.line, backgroundColor: '#fff' }}>
            <TextInput value={text} onChangeText={setText} placeholder="Type your message" placeholderTextColor={G.mute} multiline maxLength={1000} style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, backgroundColor: G.raised, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: G.ink }} />
            <Tap label="Send" disabled={!text.trim() || sending} onPress={send} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.violet, justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
              <Txt weight={500} size={15} color="#fff">Send</Txt>
            </Tap>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
