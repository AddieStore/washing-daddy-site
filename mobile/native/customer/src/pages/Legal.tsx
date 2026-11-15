// Legal & Privacy list: Terms of service, Privacy policy, Cancellation policy, Request account deletion. OWNER: PROFILE worker.
import React from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Shield, Trash, Receipt } from '../ui/icons';
import { openPage } from '../state';
import { LEGAL_DOCS, LEGAL_ORDER } from '../data/legal';
import { PageBar } from './Stub';
import { G, card } from './parts';
import { ListRow } from './Help';

const Clip = () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={G.mute} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="4" width="14" height="17" rx="3" /><Path d="M9 3h6v3H9zM9 12h6M9 16h4" /></Svg>;
const ICON = { terms: <Clip />, privacy: <Shield size={18} color={G.mute} strokeWidth={1.5} />, cancellation: <Receipt size={18} color={G.mute} strokeWidth={1.5} /> };

export default function Legal() {
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title="Legal & Privacy" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={card({ overflow: 'hidden' })}>
          {LEGAL_ORDER.map(k => <ListRow key={k} icon={ICON[k]} title={LEGAL_DOCS[k].title} onPress={() => openPage({ k: 'legalDoc', id: k })} />)}
          <ListRow icon={<Trash size={18} color={G.neg} strokeWidth={1.5} />} title="Request account deletion" danger onPress={() => openPage({ k: 'deleteAccount' })} last />
        </View>
      </ScrollView>
    </View>
  );
}
