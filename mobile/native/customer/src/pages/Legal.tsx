// Legal & Privacy list: every live legal page the admin publishes with showIn 'profile' (legal/*, data/config.ts),
// then Request account deletion. OWNER: PROFILE worker (live list: CORE).
import React from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Shield, Trash, Receipt, Info, Clock } from '../ui/icons';
import { Txt } from '../ui/kit';
import { openPage, useApp, legalPages } from '../state';
import { PageBar } from './Stub';
import { G, card } from './parts';
import { ListRow } from './Help';

const Clip = () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G.mute} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="4" width="14" height="17" rx="3" /><Path d="M9 3h6v3H9zM9 12h6M9 16h4" /></Svg>;
/** icon for a legal page (legal/{id}.icon) */
export function legalIcon(icon: string) {
  const p = { size: 18, color: G.mute, strokeWidth: 1.5 };
  return icon === 'receipt' ? <Receipt {...p} /> : icon === 'info' ? <Info {...p} /> : icon === 'clock' ? <Clock {...p} /> : icon === 'clip' ? <Clip /> : <Shield {...p} />;
}

export default function Legal() {
  useApp();
  const pages = legalPages('profile');
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title="Legal & Privacy" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={card({ overflow: 'hidden' })}>
          {pages.map(d => <ListRow key={d.id} icon={legalIcon(d.icon)} title={d.title} sub={d.draft ? 'Draft' : undefined} onPress={() => openPage({ k: 'legalDoc', id: d.id })} />)}
          <ListRow icon={<Trash size={18} color={G.neg} strokeWidth={1.5} />} title="Request account deletion" danger onPress={() => openPage({ k: 'deleteAccount' })} last />
        </View>
        {pages.length ? null : <Txt size={13} color={G.mute} style={{ marginTop: 12, textAlign: 'center' }}>Policies will appear here soon.</Txt>}
      </ScrollView>
    </View>
  );
}
