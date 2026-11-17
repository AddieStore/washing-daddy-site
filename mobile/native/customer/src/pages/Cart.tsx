// My Cart (Pronto f_115..f_123): Instant / Scheduled / Recurring tabs, review booking with steppers, coupons link, booking details
// (location, contact), collapsible bill details, wallet / pass toggles, and one sticky button that is "Select time slot" until a slot is
// chosen, then "Pay ₹x".
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, Animated, Easing, Platform } from 'react-native';
import { Txt, Toggle, useInsets } from '../ui/kit';
import { Chev, Info, Pin, Phone, Gift, Clock, Calendar, Plus } from '../ui/icons';
import {
  useApp, S, act, svcLines, svcQty, openPage, closePage, go, toast, cartMode, when, recur, bill, whenText, instantStatus,
  selectedAddress, addrName, addrLine, receiverText, profile, fmtPhone, wallet, activePass, modeOn, feature, unavailable,
} from '../state';
import { CAR_SERVICES, CART_MODES, RECURRING, WALLET, type CartMode } from '../data/reference';
import { openAddressPicker } from '../sheets/address';
import { openSlotSheet, openRecurSheet, openBillSheet } from '../sheets/slot';
import { PageBar } from './Stub';
import { CountUp } from '../ui/motion';
import { G, card, Photo, AddBtn, PrimaryBtn, SuccessTick, Price, TNUM, SHADOW_F, PAGE_BG, inr, Tap } from './parts';

const ND = Platform.OS !== 'web';
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Modes({ mode }: { mode: CartMode }) {
  const MODES = CART_MODES.filter(m => modeOn(m.id)), n = Math.max(1, MODES.length);
  const [w, setW] = useState(0), i = Math.max(0, MODES.findIndex(m => m.id === mode)), x = useRef(new Animated.Value(i)).current, seg = w ? (w - 8) / n : 0;
  useEffect(() => { Animated.spring(x, { toValue: i, speed: 16, bounciness: 7, useNativeDriver: ND }).start() }, [i]);
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 26, padding: 4, shadowColor: '#1A1033', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      {seg ? <Animated.View style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: seg, borderRadius: 22, backgroundColor: G.violet, transform: [{ translateX: x.interpolate({ inputRange: [0, 1, 2], outputRange: [0, seg, seg * 2] }) }] }} /> : null}
      {MODES.map(m => { const on = m.id === mode; return (
        <Pressable key={m.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { try { act.setCartMode(m.id) } catch (e: any) { toast(e?.message || 'Could not switch') } }} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Txt weight={on ? 600 : 500} size={14} color={on ? '#fff' : G.sub}>{m.label}</Txt>
        </Pressable>) })}
    </View>
  );
}

const Rowx = ({ icon, title, sub, onPress, last, right }: { icon: React.ReactNode; title: string; sub: string; onPress: () => void; last?: boolean; right?: React.ReactNode }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: G.line }}>
    <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
    <View style={{ flex: 1, minWidth: 0 }}><Txt weight={500} size={15} numberOfLines={1}>{title}</Txt><Txt size={13} color={G.mute} numberOfLines={2} style={{ marginTop: 2, lineHeight: 18 }}>{sub}</Txt></View>
    {right}<Chev size={16} color={G.mute} strokeWidth={1.5} />
  </Pressable>
);

export default function Cart() {
  useApp();
  const ins = useInsets(), { lines, sub, count, mins } = svcLines(), mode = cartMode(), w = when(), rc = recur(), b = bill(), st = instantStatus();
  const [busy, setBusy] = useState(false), [ok, setOk] = useState<null | { paid: boolean; pending: boolean }>(null), [open, setOpen] = useState(false);
  const addr = selectedAddress(), pr = profile(), pass = activePass(), wal = wallet();
  const together = CAR_SERVICES.filter(s => !svcQty(s.id) && !lines.some(l => l.id === s.id) && !unavailable(s.id)).slice(0, 6);
  const needSlot = mode === 'scheduled' && !w, needRecur = mode === 'recurring' && !rc, instantShut = mode === 'instant' && !st.open;
  const contact = addr ? (addr.receiver.self ? `${pr.first || 'You'}${pr.last ? ' ' + pr.last : ''}, ${fmtPhone(pr.phone || '')}` : receiverText(addr.receiver)) : '';
  const cta = needSlot ? 'Select time slot' : needRecur ? 'Set repeat plan' : instantShut ? 'Instant is closed' : 'Pay ' + inr(b.toPay);
  const press = async () => {
    if (needSlot) return openSlotSheet();
    if (needRecur) return openRecurSheet();
    if (instantShut) return toast(st.label);
    if (!addr) { toast('Add where your car is parked'); return openAddressPicker() }
    setBusy(true);
    try { const r = await act.placeOrder(); if (r.pending) toast('Complete the payment to confirm your booking'); setOk({ paid: r.paid, pending: r.pending }) } catch (e: any) { toast(e?.message || 'Could not book. Try again.') }
    setBusy(false);
  };
  const modeLine = mode === 'scheduled' ? (w ? whenText(w) : null) : mode === 'recurring' && rc ? `${RECURRING.find(r => r.id === rc.freq)?.label}, ${rc.freq === 'alt' ? 'every other day' : rc.days.map(d => DOW[d]).join(' & ')} · from ${whenText({ date: rc.start, slot: rc.slot })}` : null;
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <PageBar title="My Cart" />
      {!count && !ok ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Txt weight={500} size={17}>Your cart is empty</Txt>
          <Txt size={14} color={G.sub} style={{ marginTop: 4, marginBottom: 24, textAlign: 'center' }}>Add a service to book a wash for your car</Txt>
          <PrimaryBtn label="Browse services" onPress={() => go('home')} style={{ width: 200 }} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 148 }}>
            {CART_MODES.filter(m => modeOn(m.id)).length > 1 ? <Modes mode={mode} /> : null}
            <Txt size={12} color={G.mute} style={{ marginTop: 8, textAlign: 'center' }}>{CART_MODES.find(m => m.id === mode)?.sub}</Txt>

            {instantShut ? (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 12, backgroundColor: '#FFF4E5', borderRadius: 12, padding: 12 }}>
                <Clock size={18} color="#B45309" strokeWidth={1.5} />
                <View style={{ flex: 1 }}><Txt weight={500} size={14} color="#92400E">{st.label}</Txt><Pressable onPress={() => act.setCartMode('scheduled')}><Txt size={13} color="#92400E" style={{ marginTop: 2 }}>Switch to <Txt weight={500} size={13} color={G.violet}>Scheduled</Txt> and pick a slot</Txt></Pressable></View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20, marginBottom: 8 }}>
              <Txt weight={500} size={17}>Review booking</Txt><Txt size={13} color={G.mute}>{count} {count === 1 ? 'service' : 'services'} · {mins} mins</Txt>
            </View>
            <View style={card({ padding: 16 })}>
              <View style={{ gap: 16 }}>
                {lines.map(l => (
                  <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Photo id={l.id} radius={10} pad={4} style={{ width: 52, height: 52 }} />
                    <View style={{ flex: 1 }}>
                      <Txt weight={500} size={14} numberOfLines={2} style={{ lineHeight: 20 }}>{l.name}</Txt>
                      {l.variantLabel ? <Txt size={12} color={G.mute} style={{ lineHeight: 16 }}>{l.variantLabel}</Txt> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Price v={l.total} size={14} />
                        {l.mrp > l.price ? <Price v={l.mrp * l.q} size={12} weight={400} strike /> : null}
                      </View>
                    </View>
                    <AddBtn size="lg" qty={l.q} onAdd={() => act.addSvc(l.key)} onSub={() => act.subSvc(l.key)} unit={l.mins * l.q + ' mins'} />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16, backgroundColor: G.raised, borderRadius: 10, padding: 10 }}>
                <Info size={16} color={G.mute} strokeWidth={1.5} /><Txt size={12} color={G.sub} style={{ flex: 1, lineHeight: 16 }}>Slots may vary based on washer availability and the selected service.</Txt>
              </View>
              <View style={{ height: 1, backgroundColor: G.line, marginTop: 16 }} />
              <Pressable onPress={() => go('home')} style={{ paddingTop: 14, alignItems: 'center' }} accessibilityRole="button"><Txt size={14} color={G.sub}>Missed something? <Txt weight={500} size={14} color={G.violet}>Add more services.</Txt></Txt></Pressable>
            </View>

            {modeLine || mode !== 'instant' ? (
              <View style={card({ marginTop: 12, overflow: 'hidden' })}>
                <Rowx last icon={mode === 'recurring' ? <Clock size={20} color={G.mute} strokeWidth={1.5} /> : <Calendar size={20} color={G.mute} strokeWidth={1.5} />}
                  title={mode === 'recurring' ? 'Repeat plan' : 'Time slot'} sub={modeLine || (mode === 'recurring' ? 'Choose how often' : 'Select a day and time')}
                  onPress={mode === 'recurring' ? openRecurSheet : openSlotSheet} right={<Txt weight={500} size={13} color={G.violet} style={{ marginRight: 4 }}>{modeLine ? 'Change' : 'Select'}</Txt>} />
              </View>
            ) : null}

            {feature('coupons') ? <Pressable accessibilityRole="button" onPress={() => openPage({ k: 'coupons' })} style={card({ marginTop: 12, minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
              <Gift size={20} color={b.coupon ? G.violet : G.mute} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                {b.coupon ? <><Txt weight={500} size={14} color={G.violet}>{b.coupon.code} applied</Txt><Txt size={12} color={G.pos}>You save {inr(b.coupon.off)}</Txt></> : <Txt size={14} color={G.ink}>View all coupons</Txt>}
              </View>
              {b.coupon ? <Pressable hitSlop={10} onPress={() => act.removeCoupon()} accessibilityLabel="Remove coupon"><Txt weight={500} size={13} color={G.neg}>Remove</Txt></Pressable> : <Chev size={16} color={G.mute} strokeWidth={1.5} />}
            </Pressable> : null}
            {!b.coupon && S.coupon && b.couponError ? <Txt size={12} color={G.neg} style={{ marginTop: 6, marginLeft: 4 }}>{b.couponError}</Txt> : null}

            <Txt weight={500} size={17} style={{ marginTop: 24, marginBottom: 8 }}>Booking details</Txt>
            <View style={card({ overflow: 'hidden' })}>
              <Rowx icon={<Pin size={20} color={G.mute} strokeWidth={1.5} />} title={addr ? addrName(addr) : 'Add address'} sub={addr ? addrLine(addr) : 'Where is your car parked?'} onPress={() => openAddressPicker()} />
              <Rowx last icon={<Phone size={20} color={G.mute} strokeWidth={1.5} />} title={addr ? (addr.receiver.self ? 'Your number' : 'Contact at the car') : 'Contact'} sub={contact || 'Add an address first'}
                onPress={() => (addr ? openPage({ k: 'addressForm', id: addr.id }) : openAddressPicker())} />
            </View>

            {((wal.balance > 0 && feature('wallet')) || (pass && feature('pass'))) ? (
              <View style={card({ marginTop: 12, paddingHorizontal: 16 })}>
                {pass && feature('pass') && mode !== 'recurring' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: wal.balance > 0 ? 1 : 0, borderBottomColor: G.line }}>
                    <View style={{ flex: 1 }}><Txt weight={500} size={14}>Use a WD Pass visit</Txt><Txt size={12} color={G.mute}>{pass.visitsLeft} left</Txt></View>
                    <Toggle on={S.usePass} onChange={v => act.setUsePass(v)} />
                  </View>
                ) : null}
                {wal.balance > 0 && feature('wallet') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
                    <View style={{ flex: 1 }}><Txt weight={500} size={14}>Pay with {WALLET.name}</Txt><Txt size={12} color={G.mute}>Balance {Number.isInteger(wal.balance) ? inr(wal.balance) : '₹' + wal.balance.toFixed(2)}</Txt></View>
                    <Toggle on={S.useWallet} onChange={v => act.setUseWallet(v)} />
                  </View>
                ) : null}
              </View>
            ) : null}

            <Txt weight={500} size={17} style={{ marginTop: 24, marginBottom: 8 }}>Bill details</Txt>
            <View style={card({ overflow: 'hidden' })}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(o => !o)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Txt weight={600} size={16}>To pay</Txt><CountUp to={inr(b.toPay)} duration={500} style={[TNUM, { fontFamily: 'Poppins_700Bold', fontSize: 17, color: G.ink }]} /></View>
                  {b.saved > 0 ? <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: 'rgba(22,163,74,0.10)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row' }}><CountUp to={inr(b.saved)} duration={500} style={[TNUM, { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: G.pos }]} /><Txt weight={600} size={13} color={G.pos}> saved on the total!</Txt></View> : null}
                </View>
                <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Chev size={16} color={G.mute} strokeWidth={1.5} /></View>
              </Pressable>
              {open ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10, borderTopWidth: 1, borderTopColor: G.line, paddingTop: 14 }}>
                  {b.rows.filter(r => r.k !== 'topay').map((r, i) => (
                    <View key={r.k + i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Txt weight={r.k === 'total' ? 500 : 400} size={14} color={r.tone === 'pos' ? G.pos : r.k === 'total' ? G.ink : G.sub}>{r.label}</Txt>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                        {r.strike ? <Price v={r.strike} size={13} weight={400} strike /> : null}
                        {r.amt === 0 && r.strike ? <Txt weight={500} size={14} color={G.pos}>Free</Txt> : <Price v={r.amt} size={14} weight={r.k === 'total' ? 500 : 400} color={r.tone === 'pos' ? G.pos : r.tone === 'mute' ? G.mute : G.ink} />}
                      </View>
                    </View>
                  ))}
                  <Pressable onPress={openBillSheet} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 2 }}><Txt weight={500} size={13} color={G.violet}>View full bill</Txt></Pressable>
                </View>
              ) : null}
            </View>
            {b.perMonth ? <Txt size={12} color={G.mute} style={{ marginTop: 8, marginLeft: 4 }}>About {b.perMonth.visits} visits a month, around {inr(b.perMonth.total)} a month.</Txt> : null}

            {together.length ? (
              <>
                <Txt weight={500} size={17} style={{ marginTop: 28 }}>Frequently added together</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
                  {together.map(s => (
                    <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={card({ width: 128, padding: 8 })}>
                      <Photo id={s.id} radius={8} pad={4} style={{ width: '100%', height: 80 }} />
                      <View style={{ position: 'absolute', right: 12, top: 56 }}><AddBtn qty={0} onAdd={() => act.addSvc(s.id)} onSub={() => {}} /></View>
                      <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 24, lineHeight: 18 }}>{s.short}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}><Price v={s.price} size={13} /><Price v={s.mrp} size={12} weight={400} strike /></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            {mode === 'instant' ? (
              <View style={[card({ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 20, padding: 16 })]}>
                <View style={{ marginTop: 2 }}><Info size={18} color={G.mute} strokeWidth={1.5} /></View>
                <View style={{ flex: 1 }}><Txt weight={500} size={14}>Cancel for free before the washer leaves</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 20 }}>Cancel from the Washes tab. Refunds go to WD Money.</Txt></View>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 4, ...SHADOW_F }}>
            <PrimaryBtn label={cta} onPress={press} busy={busy} disabled={instantShut} />
          </View>
        </>
      )}
      {ok ? <SuccessTick title="Booking confirmed" sub={ok.pending ? 'We will confirm as soon as the payment clears' : ok.paid ? 'Payment received. Your washer is on the way' : mode === 'instant' ? 'Your washer is on the way' : 'We will send your washer at the chosen time'} onDone={() => { go('live') }} /> : null}
    </View>
  );
}
