// My refunds: list of refunds with status. OWNER: MONEY worker.
import React, { useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Receipt } from '../ui/icons';
import { useApp, refunds, act, openPage } from '../state';
import { WALLET } from '../data/reference';
import { G, PrimaryBtn, Tap, TNUM } from './parts';
import { PageBar } from './Stub';
import { Skel, useSkeleton, Sec, V, V_SOFT, rs } from '../sheets/money';

const ST: Record<string, [string, string, string]> = {
  initiated: ['Initiated', '#B45309', '#FEF3C7'], processing: ['Processing', '#B45309', '#FEF3C7'],
  credited: ['Credited', '#15803d', '#DCFCE7'], failed: ['Failed', '#dc2626', '#FEE2E2'],
};
const day = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };

export default function Refunds() {
  useApp();
  const ins = useInsets(), load = useSkeleton(), [ref, setRef] = useState(false), list = refunds();
  return (
    <View style={{ flex: 1, backgroundColor: G.raised }}>
      <PageBar title="My refunds" />
      {load ? <View style={{ padding: 16, gap: 12 }}>{[0, 1, 2].map(i => <Skel key={i} h={96} r={16} />)}</View> : (
        <ScrollView refreshControl={<RefreshControl refreshing={ref} onRefresh={async () => { setRef(true); try { await act.refresh() } catch {} setRef(false) }} tintColor={V} colors={[V]} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: ins.bottom + 32, flexGrow: 1 }}>
          {list.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Receipt size={32} color={V} strokeWidth={1.5} /></View>
              <Txt weight={500} size={18} style={{ marginTop: 16 }}>You don't have any refunds</Txt>
              <Txt size={14} color={G.sub} style={{ marginTop: 6, textAlign: 'center', lineHeight: 20 }}>If a booking is cancelled, the refund shows up here.</Txt>
            </View>
          ) : list.map(r => {
            const s = ST[r.status] || ST.initiated;
            return (
              <Sec key={r.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Txt weight={500} size={15} numberOfLines={2}>{r.what || 'Refund'}</Txt>
                    <Txt size={12} color={G.mute} style={{ marginTop: 3 }}>{day(r.at)}</Txt>
                  </View>
                  <Txt weight={600} size={17} style={TNUM}>{rs(r.amt)}</Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <View style={{ backgroundColor: s[2], borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Txt weight={500} size={12} color={s[1]}>{s[0]}</Txt></View>
                  <Txt size={12} color={G.sub}>{r.to === 'wallet' ? `To ${WALLET.name}` : 'To original payment method'}{r.eta && r.status !== 'credited' ? ` · ${r.eta}` : ''}</Txt>
                </View>
                {r.bookingId ? <Tap label="View booking" onPress={() => openPage({ k: 'booking', id: r.bookingId! })} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: G.line }}><Txt weight={500} size={13} color={V}>View booking</Txt></Tap> : null}
              </Sec>
            );
          })}
          <Tap label="Chat with us" onPress={() => act.whatsapp('Hi, I need help with a refund.')} style={{ marginTop: 8, height: 48, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: G.line, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={V}>Need help with a refund? Chat with us</Txt></Tap>
        </ScrollView>
      )}
    </View>
  );
}
