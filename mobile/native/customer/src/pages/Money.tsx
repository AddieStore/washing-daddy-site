// Wallet: balance, top-up chips with cashback, gift card, rules, transactions, refunds link. Also the 'money' tab (tab=true: no back bar). OWNER: MONEY worker.
import React, { useState } from 'react';
import { View, ScrollView, TextInput, RefreshControl } from 'react-native';
import { C } from '../theme';
import { Txt, useInsets } from '../ui/kit';
import { Info, Gift, Chev, Zap, Check, Wallet as WalletIc, Receipt } from '../ui/icons';
import { useApp, wallet, act, topUpBonus, topUpCheck, openPage, toast, confetti } from '../state';
import { WALLET } from '../data/reference';
import { G, Tap, PrimaryBtn, TNUM } from './parts';
import { PageBar } from './Stub';
import { TAB_H } from '../screens/TabBar';
import { openGiftCard, openWalletInfo, Skel, useSkeleton, Sec, Bullets, V, V_SOFT, V_LINE, rs } from '../sheets/money';

const KIND: Record<string, string> = { topup: 'Added to wallet', cashback: 'Cashback', gift: 'Gift card', referral: 'Referral reward', promo: 'Promotional credit', payment: 'Paid for booking', refund: 'Refund', expiry: 'Expired' };
const day = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };

function Loading() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Skel h={132} r={20} />
      <Skel h={250} r={16} />
      <Skel h={64} r={16} />
      <Skel h={90} r={16} />
      <Skel h={180} r={16} />
    </View>
  );
}

export default function Money({ tab }: { tab?: boolean }) {
  useApp();
  const ins = useInsets(), load = useSkeleton();
  const w = wallet();
  const [sel, setSel] = useState<number | 'custom'>(WALLET.chips[0].amt), [custom, setCustom] = useState(''), [busy, setBusy] = useState(false), [ref, setRef] = useState(false), [all, setAll] = useState(false);
  const amt = sel === 'custom' ? Number(custom) || 0 : sel;
  const err = sel === 'custom' && custom ? topUpCheck(amt) : null;
  const bonus = amt ? topUpBonus(amt) : 0;
  const add = async () => {
    const e = topUpCheck(amt); if (e) { toast(e); return }
    setBusy(true);
    try { const r = await act.topUp(amt); if (!r.pending) { confetti(); toast(`${rs(amt)} added to ${WALLET.name}`) } } catch (x: any) { toast(x.message) }
    setBusy(false);
  };
  const refresh = async () => { setRef(true); try { await act.refresh() } catch {} setRef(false) };
  const rows = all ? w.ledger : w.ledger.slice(0, 6);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {tab ? <View style={{ paddingTop: ins.top + 16, paddingHorizontal: 16, paddingBottom: 8 }}><Txt weight={500} size={22}>{WALLET.name}</Txt></View> : <PageBar title={WALLET.name} />}
      {load ? <Loading /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={ref} onRefresh={refresh} tintColor={V} colors={[V]} />} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: (tab ? TAB_H : 0) + ins.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* balance */}
          <View style={{ backgroundColor: V, borderRadius: 20, padding: 20, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt size={14} color="rgba(255,255,255,0.8)">{WALLET.name} balance</Txt>
              <Tap label="About your balance" onPress={openWalletInfo} hitSlop={10} style={{ padding: 2 }}><Info size={16} color="rgba(255,255,255,0.85)" strokeWidth={1.5} /></Tap>
            </View>
            <Txt weight={600} size={36} color="#fff" style={[TNUM, { marginTop: 4 }]}>{rs(w.balance)}</Txt>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <Txt size={13} color="rgba(255,255,255,0.8)">Cash {rs(w.cash)}</Txt>
              <Txt size={13} color="rgba(255,255,255,0.8)">Rewards {rs(w.promo)}</Txt>
            </View>
            {w.expiringSoon > 0 ? <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}><Txt size={12} color="#fff">{rs(w.expiringSoon)} in rewards expires within 7 days</Txt></View> : null}
          </View>

          {/* top-up */}
          <Sec>
            <Txt weight={500} size={17}>Add money</Txt>
            <Txt size={13} color={G.mute} style={{ marginTop: 2 }}>Get {WALLET.cashbackPct}% cashback as rewards on every top-up.</Txt>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {WALLET.chips.map(c => {
                const on = sel === c.amt;
                return (
                  <Tap key={c.amt} label={`Add ${c.amt}`} onPress={() => { setSel(c.amt); setCustom('') }} style={{ flex: 1, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? V : G.line, backgroundColor: on ? V_SOFT : '#fff', alignItems: 'center', paddingTop: 16, paddingBottom: 28 }}>
                    <Txt weight={500} size={17} color={on ? V : G.ink} style={TNUM}>₹{c.amt}</Txt>
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, backgroundColor: on ? V : '#EFEAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt weight={500} size={12} color={on ? '#fff' : V} style={TNUM}>+₹{c.bonus}</Txt>
                    </View>
                  </Tap>
                );
              })}
            </View>
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 12, backgroundColor: G.raised, paddingHorizontal: 14, borderWidth: 1.5, borderColor: sel === 'custom' ? (err ? C.red : V) : 'transparent' }}>
              <Txt size={17} color={G.sub}>₹</Txt>
              <TextInput value={custom} keyboardType="number-pad" placeholder="Enter another amount" placeholderTextColor={G.mute} maxLength={5}
                onFocus={() => setSel('custom')} onChangeText={t => { setCustom(t.replace(/[^0-9]/g, '')); setSel('custom') }}
                style={{ flex: 1, marginLeft: 6, fontSize: 16, color: G.ink, height: 52, outlineStyle: 'none' } as any} />
            </View>
            {err ? <Txt size={13} color={C.red} style={{ marginTop: 6 }}>{err}</Txt> : bonus ? <Txt size={13} color={G.pos} style={{ marginTop: 6 }}>You get {rs(bonus)} as rewards.</Txt> : null}
            <PrimaryBtn label={amt ? `Add ${rs(amt)} to wallet` : 'Add to wallet'} busy={busy} disabled={!amt || !!err} onPress={add} style={{ marginTop: 14 }} />
          </Sec>

          {/* gift card */}
          <Tap label="Claim a gift card" onPress={openGiftCard} style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: G.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}><Gift size={22} color={V} strokeWidth={1.5} /></View>
            <View style={{ flex: 1 }}><Txt weight={500} size={15}>Claim a gift card</Txt><Txt size={13} color={G.mute} style={{ marginTop: 2 }}>Enter gift card details to claim</Txt></View>
            <Chev size={18} color={G.mute} strokeWidth={1.5} />
          </Tap>

          {/* benefits */}
          <View style={{ flexDirection: 'row' }}>
            {WALLET.benefits.map(([a, b], i) => (
              <View key={a} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: G.line }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: V_SOFT, alignItems: 'center', justifyContent: 'center' }}>{i === 0 ? <Zap size={18} color={V} strokeWidth={1.5} /> : i === 1 ? <Check size={18} color={V} strokeWidth={1.5} /> : <WalletIc size={18} color={V} strokeWidth={1.5} />}</View>
                <Txt weight={500} size={12} color={G.sub} style={{ marginTop: 8, textAlign: 'center' }}>{a}</Txt>
                <Txt size={11} color={G.mute} style={{ textAlign: 'center' }}>{b}</Txt>
              </View>
            ))}
          </View>

          {/* transactions */}
          <Sec>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt weight={500} size={17}>Transactions</Txt>
              <Tap label="My refunds" onPress={() => openPage({ k: 'refunds' })} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Receipt size={16} color={V} strokeWidth={1.5} /><Txt weight={500} size={13} color={V}>My refunds</Txt></Tap>
            </View>
            {rows.length === 0 ? <Txt size={14} color={G.mute} style={{ paddingVertical: 24, textAlign: 'center' }}>No transactions yet. Add money to get started.</Txt> : rows.map((l, i) => (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: G.line, marginTop: i ? 0 : 8 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Txt weight={500} size={14} numberOfLines={1}>{l.note || KIND[l.kind]}</Txt>
                  <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{(l.note && l.note !== KIND[l.kind]) ? KIND[l.kind] + ' · ' : ''}{day(l.at)}{l.expires && l.amt > 0 ? ` · expires ${day(l.expires)}` : ''}</Txt>
                </View>
                <Txt weight={500} size={15} color={l.amt >= 0 ? G.pos : G.ink} style={TNUM}>{l.amt >= 0 ? '+' : '−'}{rs(Math.abs(l.amt))}</Txt>
              </View>
            ))}
            {!all && w.ledger.length > 6 ? <Tap label="See all" onPress={() => setAll(true)} style={{ alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: G.line }}><Txt weight={500} size={14} color={V}>See all {w.ledger.length} transactions</Txt></Tap> : null}
          </Sec>

          {/* how it works */}
          <Sec>
            <Txt weight={500} size={17} style={{ marginBottom: 14 }}>How it works</Txt>
            {['Add money to your WD wallet and receive promotional rewards.', 'Check out instantly with the balance in your WD wallet on all bookings.', 'Wallet balance cannot be withdrawn and can only be used on Washing Daddy, in accordance with applicable laws.'].map((t, i, a) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: V, marginTop: 5 }} />
                  {i < a.length - 1 ? <View style={{ flex: 1, width: 0, borderLeftWidth: 1.5, borderLeftColor: V_LINE, borderStyle: 'dashed', marginVertical: 2 }} /> : null}
                </View>
                <Txt size={14} color={G.sub} style={{ flex: 1, lineHeight: 20, paddingBottom: i < a.length - 1 ? 16 : 0 }}>{t}</Txt>
              </View>
            ))}
          </Sec>

          {/* expiry rules */}
          <Sec>
            <Txt weight={500} size={17} style={{ marginBottom: 14 }}>Using your balance</Txt>
            <Bullets items={WALLET.rules} />
          </Sec>
        </ScrollView>
      )}
    </View>
  );
}
