// Rate a finished booking: stars, quick tags, note -> act.rateJob. OWNER: BOOKINGS worker.
import React from 'react';
import { View, Image, ScrollView } from 'react-native';
import { Txt } from '../ui/kit';
import { jobOf, jobTitle, jobWhen, closePage } from '../state';
import { PageBar } from './Stub';
import { G, card } from './parts';
import { RateForm, washerImg, washerSub } from '../sheets/bookings';

export default function Rate({ id }: { id: string }) {
  const j = jobOf(id);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title={j && j.stars ? 'Your rating' : 'Rate your wash'} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {j ? (
          <>
            <View style={card({ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
              <Image source={washerImg(j)} resizeMode="cover" style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: G.raised }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight={500} size={16} numberOfLines={1}>{j.washer ? j.washer.name : 'Your washer'}</Txt>
                {j.washer ? <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{washerSub(j)}</Txt> : null}
                <Txt size={13} color={G.sub} style={{ marginTop: 4 }} numberOfLines={1}>{`${jobTitle(j)} · ${jobWhen(j)}`}</Txt>
              </View>
            </View>
            <Txt weight={600} size={22} style={{ marginTop: 24, textAlign: 'center', lineHeight: 28 }}>How was your wash?</Txt>
            <Txt size={13} color={G.sub} style={{ marginTop: 4, textAlign: 'center' }}>Your washer sees this rating.</Txt>
            <View style={{ marginTop: 8 }}><RateForm id={id} big onDone={closePage} /></View>
          </>
        ) : <Txt size={14} color={G.sub}>Booking not found.</Txt>}
      </ScrollView>
    </View>
  );
}
