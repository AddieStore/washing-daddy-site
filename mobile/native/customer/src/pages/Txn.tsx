// One wallet transaction in full: amount, status, when, ids (copyable), how it was paid, what it was for, bill breakdown, help.
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Copy, Chev, Help, Wallet as WalletIc, Receipt, Gift, Plus, Check, Clock } from '../ui/icons';
import { FadeUp } from '../ui/motion';
import { useApp, txnOf, act, openPage, jobWhen, jobTitle } from '../state';
import { WALLET } from '../data/reference';
import { inr } from '../data/dates';
import { PageBar } from './Stub';
import { G, card, Tap, PrimaryBtn, TNUM, PAGE_BG } from './parts';

const V = '#5409DA', V_SOFT = '#F1EAFF';
const KIND: Record<string, string> = { topup: 'Added to wallet', cashback: 'Cashback', gift: 'Gift card', referral: 'Referral reward', promo: 'Promotional credit', payment: 'Paid for booking', refund: 'Refund', expiry: 'Expired' };
const when = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) };

const Row = ({ k, v, copy, strong, tone }: { k: string; v: string; copy?: boolean; strong?: boolean; tone?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, minHeight: 32, paddingVertical: 4 }}>
    <Txt size={13} color={G.mute} style={{ width: 104 }}>{k}</Txt>
    <Pressable disabled={!copy} accessibilityLabel={copy ? `Copy ${k}` : undefined} onPress={() => act.copy(v, 'Copied')} style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
      <Txt weight={strong ? 600 : 500} size={strong ? 15 : 14} color={tone || G.ink} style={[TNUM, { textAlign: 'right', flexShrink: 1 }]}>{v}</Txt>
      {copy ? <Copy size={14} color={G.mute} strokeWidth={1.5} /> : null}
    </Pressable>
  </View>
);
const Bill = ({ k, v, tone, bold }: { k: string; v: string; tone?: string; bold?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
    <Txt size={bold ? 15 : 14} weight={bold ? 600 : 400} color={bold ? G.ink : G.sub}>{k}</Txt>
    <Txt size={bold ? 15 : 14} weight={bold ? 600 : 500} color={tone || G.ink} style={TNUM}>{v}</Txt>
  </View>
);

export default function Txn({ id }: { id: string }) {
  useApp();
  const ins = useInsets(), t = txnOf(id);
  if (!t) return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="Transaction" />
      <Txt size={14} color={G.sub} style={{ padding: 24, textAlign: 'center' }}>We could not find this transaction.</Txt>
    </View>
  );
  const { row: r, job: j, siblings } = t, credit = r.amt >= 0, sign = credit ? '+' : '−', amt = Math.abs(r.amt);
  const status = r.kind === 'expiry' ? 'Expired' : r.kind === 'refund' ? 'Refunded to WD Money' : credit ? 'Added' : 'Successful';
  const method = r.kind === 'topup' ? 'Razorpay (UPI / card)' : r.kind === 'payment' ? (j && j.pay === 'pass' ? 'WD Pass' : WALLET.name + (r.bucket === 'promo' ? ' · rewards' : ' · cash'))
    : r.kind === 'refund' ? WALLET.name : r.kind === 'expiry' ? '' : WALLET.name + ' · ' + (r.bucket === 'promo' ? 'rewards' : 'cash');
  const walletUsed = siblings.reduce((a, l) => a + Math.abs(l.amt), 0);
  const items = j ? j.lines.reduce((a, l) => a + l.price * l.q, 0) : 0, diff = j ? Math.round((j.total - items) * 100) / 100 : 0;
  const online = j && j.pay === 'paid' && /razorpay|cashfree|upi|card/i.test(j.payVia || '') ? Math.max(0, Math.round((j.total - (r.kind === 'payment' ? walletUsed : 0)) * 100) / 100) : 0;
  const tone = credit ? G.pos : G.ink;
  const Ic = r.kind === 'gift' ? Gift : r.kind === 'topup' ? Plus : r.kind === 'payment' ? Receipt : r.kind === 'expiry' ? Clock : WalletIc;
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="Transaction details" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: ins.bottom + 32 }}>
        <FadeUp index={0}>
          <View style={card({ padding: 20, alignItems: 'center' })}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Ic size={24} color={V} strokeWidth={1.5} /></View>
            <Txt weight={500} size={15} color={G.sub} style={{ marginTop: 12, textAlign: 'center' }}>{r.note || KIND[r.kind]}</Txt>
            <Txt weight={700} size={34} color={tone} style={[TNUM, { marginTop: 4 }]}>{sign}{inr(amt)}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: r.kind === 'expiry' ? G.raised : 'rgba(22,163,74,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              {r.kind !== 'expiry' ? <Check size={14} color={G.pos} strokeWidth={2} /> : null}
              <Txt weight={500} size={13} color={r.kind === 'expiry' ? G.mute : G.pos}>{status}</Txt>
            </View>
            <Txt size={13} color={G.mute} style={{ marginTop: 10 }}>{when(r.at)}</Txt>
          </View>
        </FadeUp>

        <FadeUp index={1}>
          <View style={card({ padding: 16 })}>
            <Txt weight={500} size={13} color={G.mute} style={{ marginBottom: 6 }}>DETAILS</Txt>
            <Row k="Type" v={KIND[r.kind] || 'Wallet'} />
            <Row k="Transaction ID" v={r.id} copy />
            {j && (j.orderId || j.id) ? <Row k={j.orderId ? 'Order ID' : 'Booking ID'} v={j.orderId || j.id} copy /> : null}
            {j && j.payRef ? <Row k="Payment ref" v={j.payRef} copy /> : null}
            {method ? <Row k="Paid with" v={method} /> : null}
            <Row k="Date and time" v={when(r.at)} />
            {r.expires && credit ? <Row k="Expires" v={when(r.expires).replace(/,.*$/, '').trim() || r.expires} /> : null}
          </View>
        </FadeUp>

        {j ? (
          <FadeUp index={2}>
            <View style={card({ padding: 16 })}>
              <Txt weight={500} size={13} color={G.mute} style={{ marginBottom: 8 }}>WHAT IT WAS FOR</Txt>
              <Txt weight={500} size={15}>{jobTitle(j)}</Txt>
              <Txt size={13} color={G.sub} style={{ marginTop: 2 }}>{jobWhen(j)}</Txt>
              <View style={{ marginTop: 10, gap: 2 }}>
                {j.lines.map(l => <Bill key={l.key} k={`${l.name}${l.q > 1 ? ` × ${l.q}` : ''}`} v={inr(l.price * l.q)} />)}
              </View>
              <View style={{ height: 1, backgroundColor: G.line, marginVertical: 8 }} />
              <Bill k="Item total" v={inr(items)} />
              {diff < 0 ? <Bill k="Discount" v={'−' + inr(-diff)} tone={G.pos} /> : null}
              {diff > 0 ? <Bill k="Convenience fee and GST" v={inr(diff)} /> : null}
              {j.coupon ? <Bill k={`Coupon ${j.coupon}`} v="Applied" tone={G.pos} /> : null}
              <Bill k="Total" v={inr(j.total)} bold />
              {walletUsed > 0 && r.kind === 'payment' ? <Bill k={`${WALLET.name} used`} v={'−' + inr(walletUsed)} tone={G.pos} /> : null}
              {online > 0 ? <Bill k="To pay online" v={inr(online)} bold /> : null}
              <PrimaryBtn outline label="Open booking" onPress={() => openPage({ k: 'booking', id: j.id })} style={{ marginTop: 12 }} />
            </View>
          </FadeUp>
        ) : null}

        <FadeUp index={3}>
          <Tap label="Need help?" onPress={() => openPage({ k: 'help' })} style={card({ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Help size={20} color={V} strokeWidth={1.5} /></View>
            <View style={{ flex: 1 }}><Txt weight={500} size={15}>Need help?</Txt><Txt size={13} color={G.mute} style={{ marginTop: 2 }}>Questions about this payment</Txt></View>
            <Chev size={18} color={G.mute} strokeWidth={1.5} />
          </Tap>
        </FadeUp>
      </ScrollView>
    </View>
  );
}
