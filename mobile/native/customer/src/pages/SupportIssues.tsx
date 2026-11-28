// Support issue list: pick a topic, then land in the chat. Opened from Help (no booking) or from a booking (bookingId + title).
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Txt } from '../ui/kit';
import { Chev } from '../ui/icons';
import { FadeUp } from '../ui/motion';
import { act, useApp, openPage, closePage, toast, SUPPORT_TOPICS } from '../state';
import { PageBar } from './Stub';
import { G, card, Tap } from './parts';

export default function SupportIssues({ bookingId, title }: { bookingId?: string; title?: string }) {
  useApp();
  const [busy, setBusy] = useState(false);
  const pick = async (topicId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await act.supportOpen(topicId, bookingId ? { id: bookingId, title: title || '' } : undefined);
      closePage();
      openPage({ k: 'supportChat', id });
    } catch (e: any) { toast(e?.message || 'Could not start the chat'); setBusy(false); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Txt weight={600} size={22} style={{ lineHeight: 28 }}>{bookingId ? 'Need help with this booking?' : 'How can we help?'}</Txt>
        {bookingId && title ? <Txt size={14} color={G.mute} style={{ marginTop: 4 }} numberOfLines={2}>{title}</Txt> : null}
        <Txt size={14} color={G.sub} style={{ marginTop: 8, marginBottom: 16 }}>Choose what went wrong and we will start a chat.</Txt>
        <View style={{ gap: 8 }}>
          {SUPPORT_TOPICS.map((t, i) => (
            <FadeUp key={t.id} index={i}>
              <Tap label={t.label} disabled={busy} scaleTo={0.99} onPress={() => pick(t.id)} style={card({ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
                <Txt weight={500} size={15} style={{ flex: 1 }}>{t.label}</Txt>
                <Chev size={18} color={G.mute} strokeWidth={1.5} />
              </Tap>
            </FadeUp>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
