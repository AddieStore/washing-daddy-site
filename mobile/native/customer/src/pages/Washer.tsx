// A washer's public profile: who is coming to your car. Reads washer_public/{id} (written by the ops dashboard).
import React, { useEffect, useState } from 'react';
import { View, Image, ScrollView, Linking } from 'react-native';
import { C } from '../theme';
import { Txt } from '../ui/kit';
import { Check, Phone, Star, Shield } from '../ui/icons';
import { loadWasher, toast, type WasherProfile } from '../state';
import { IMG } from '../img';
import { PageBar } from './Stub';
import { G, card, Tap, PAGE_BG } from './parts';
import { VettedSection } from '../ui/trust';

const CHECKS: { key: keyof WasherProfile['verified']; label: string }[] = [
  { key: 'id', label: 'Aadhaar verified' }, { key: 'police', label: 'Police verified' },
  { key: 'training', label: 'Trained by professionals' }, { key: 'assessment', label: 'Assessment certified' },
];

function monthsWith(since: string | null): string | null {
  if (!since) return null;
  const t = new Date(since); if (isNaN(+t)) return null;
  const m = Math.max(0, (new Date().getFullYear() - t.getFullYear()) * 12 + new Date().getMonth() - t.getMonth());
  return m >= 12 ? `${Math.floor(m / 12)} yr${m >= 24 ? 's' : ''}` : `${Math.max(1, m)} mo`;
}

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: last ? 0 : 1, borderColor: G.line }}>
      <Txt weight={600} size={20} color={G.ink}>{value}</Txt>
      <Txt size={12} color={G.mute} style={{ marginTop: 2, textAlign: 'center' }}>{label}</Txt>
    </View>
  );
}

export default function Washer({ id, name }: { id?: string; name?: string }) {
  const [w, setW] = useState<WasherProfile | null>(null), [done, setDone] = useState(false);
  useEffect(() => {
    let on = true;
    loadWasher(id || name || '', name ? { name } : undefined).then(r => { if (on) { setW(r); setDone(true) } });
    return () => { on = false };
  }, [id, name]);
  const nm = w ? w.name : name || 'Your washer', since = w ? monthsWith(w.since) : null;
  const call = () => { if (w && w.phone) Linking.openURL('tel:' + w.phone).catch(() => toast('Could not start the call')) };
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="Your washer" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}>
        <View style={card({ padding: 20, alignItems: 'center' })}>
          {w && w.photo ? <Image source={{ uri: w.photo }} resizeMode="cover" accessibilityLabel={`Photo of ${nm}`} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: G.raised }} />
            : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#F2ECFF', alignItems: 'center', justifyContent: 'center' }}><Txt weight={700} size={38} color={C.violet}>{nm.trim().charAt(0).toUpperCase() || 'W'}</Txt></View>}
          <Txt weight={600} size={22} style={{ marginTop: 12 }}>{nm}</Txt>
          {w && w.area ? <Txt size={13} color={G.mute} style={{ marginTop: 2 }}>{w.area}{w.languages.length ? ' · ' + w.languages.join(', ') : ''}</Txt> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#F2ECFF', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Shield size={14} color={C.violet} strokeWidth={1.8} />
            <Txt weight={500} size={13} color={C.violet}>Verified by Washing Daddy</Txt>
          </View>
        </View>

        {w ? (
          <View style={card({ flexDirection: 'row' })}>
            <Stat value={String(w.jobs)} label="Jobs done" />
            <Stat value={w.rating > 0 ? w.rating.toFixed(1) : 'New'} label={w.ratingCount > 0 ? `Rating · ${w.ratingCount}` : 'Rating'} last={!since} />
            {since ? <Stat value={since} label="With us" last /> : null}
          </View>
        ) : done ? null : <Txt size={13} color={G.mute} style={{ textAlign: 'center' }}>Loading…</Txt>}

        {w && w.phone ? (
          <Tap label={`Call ${nm}`} onPress={call} style={card({ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Phone size={18} color="#fff" strokeWidth={1.5} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={12} color={G.mute}>Your washer's number</Txt>
              <Txt weight={600} size={16} style={{ marginTop: 2 }}>{`+91 ${w.phone.slice(0, 5)} ${w.phone.slice(5)}`}</Txt>
            </View>
            <Txt weight={600} size={14} color={C.violet}>Call</Txt>
          </Tap>
        ) : null}

        {w ? (
          <View style={card({ padding: 16 })}>
            <Txt weight={600} size={16}>Checked before every job</Txt>
            {CHECKS.map(c => {
              const ok = w.verified[c.key];
              return (
                <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ok ? G.pos : G.raised, alignItems: 'center', justifyContent: 'center' }}>
                    {ok ? <Check size={14} color="#fff" strokeWidth={2.2} /> : null}
                  </View>
                  <Txt size={15} color={ok ? G.ink : G.mute} style={{ flex: 1 }}>{c.label}</Txt>
                  {ok ? null : <Txt size={12} color={G.mute}>In progress</Txt>}
                </View>
              );
            })}
          </View>
        ) : null}

        <VettedSection compact />
      </ScrollView>
    </View>
  );
}
