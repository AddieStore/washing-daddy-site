// Every payment order of this customer, any status, with the reference number and the payment id (copyable).
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Copy } from '../ui/icons';
import { useApp, orders, act, type OrderRow } from '../state';
import { inr } from '../data/dates';
import { PageBar } from './Stub';
import { G, card, Tap, TNUM, PAGE_BG } from './parts';

const LABEL: Record<OrderRow['status'], [string, string, string]> = {
  paid: ['Successful', G.pos, 'rgba(22,163,74,0.1)'], pending: ['Not completed', '#B45309', 'rgba(245,158,11,0.14)'],
  failed: ['Failed', '#B91C1C', 'rgba(220,38,38,0.1)'], cancelled: ['Cancelled', G.mute, G.raised], refunded: ['Refunded', '#5409DA', 'rgba(84,9,218,0.08)'],
};
const when = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) };
const Line = ({ k, v }: { k: string; v: string }) => !v ? null : (
  <Tap label={`Copy ${k}`} onPress={() => act.copy(v, 'Copied')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 28 }}>
    <Txt size={12} color={G.mute}>{k}</Txt>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}><Txt size={12} weight={500} color={G.sub} numberOfLines={1} style={{ flexShrink: 1 }}>{v}</Txt><Copy size={13} color={G.mute} strokeWidth={1.5} /></View>
  </Tap>
);

export default function Orders() {
  useApp();
  const ins = useInsets(), list = orders();
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="Transactions" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 40, gap: 12 }}>
        {list.length === 0 ? <Txt size={14} color={G.mute} style={{ paddingVertical: 32, textAlign: 'center' }}>No payments yet. Every payment, successful or not, will show here.</Txt> : null}
        {list.map(o => {
          const [lab, fg, bg] = LABEL[o.status];
          return (
            <View key={o.id} style={card({ padding: 16 })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt weight={500} size={15} style={{ flex: 1 }} numberOfLines={2}>{o.title}</Txt>
                <Txt weight={600} size={16} style={TNUM}>{inr(o.total)}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View style={{ backgroundColor: bg, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}><Txt weight={500} size={12} color={fg}>{lab}</Txt></View>
                <Txt size={12} color={G.mute}>{when(o.at)}</Txt>
              </View>
              {o.walletPart > 0 || o.toPay > 0 ? <Txt size={12} color={G.sub} style={{ marginTop: 8, ...TNUM }}>{[o.walletPart > 0 ? `WD Money ${inr(o.walletPart)}` : '', o.toPay > 0 ? `UPI / card ${inr(o.toPay)}` : ''].filter(Boolean).join('  •  ')}</Txt> : null}
              {o.status === 'failed' && o.why ? <Txt size={12} color={G.mute} style={{ marginTop: 4 }}>{o.why}</Txt> : null}
              <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: G.line, paddingTop: 6 }}>
                <Line k="Reference" v={o.id} />
                <Line k="Payment ID" v={o.payId} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
