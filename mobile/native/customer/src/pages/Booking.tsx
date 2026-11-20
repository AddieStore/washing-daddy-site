// One booking: status, live map, washer, services, bill, address, rating, reschedule / cancel with refund note, repeat. OWNER: BOOKINGS worker.
import React, { useEffect, useState } from 'react';
import { View, Image, ScrollView, Pressable } from 'react-native';
import { C } from '../theme';
import { Txt } from '../ui/kit';
import { Phone, Pin, Copy, Wallet, Receipt, Help as HelpIc, Chev, Check, Clock } from '../ui/icons';
import { FadeUp } from '../ui/motion';
import { feature, useApp, act, jobOf, jobTitle, jobWhen, canRate, addressOf, addrName, addrLine, receiverText, openPage, closePage, toast, UPCOMING, Job } from '../state';
import { RiderTrack } from '../ui/RiderTrack';
import { sheets } from '../sheets';
import { inr } from '../data/dates';
import { SHOW_RATINGS } from '../data/reference';
import { PageBar } from './Stub';
import { G, card, Tap, Photo, PrimaryBtn, TNUM } from './parts';
import { trackable } from './Bookings';
import { Stars, STAR_WORDS, durText, washerImg, washerSub, STATUS_TEXT, IcoBox, refundNote, POLICY, openRateSheet, openCancelSheet, openRescheduleSheet, openBookingHelp } from '../sheets/bookings';

const STEPS = ['Booked', 'Washer assigned', 'On the way', 'Wash in progress', 'Completed'];
const STEP_AT: Record<Job['status'], number> = { upcoming: 0, assigned: 1, on_the_way: 2, in_progress: 3, done: 4, cancelled: -1 };

/** put the same services back in the cart (and optionally switch to the Recurring tab), then open the cart */
export function repeatJob(j: Job, recurring = false) {
  act.clearSvc();
  j.lines.forEach(l => { for (let i = 0; i < Math.max(1, l.q); i++) act.addLine(l.id, l.variant); });
  act.setCartMode(recurring ? 'recurring' : 'instant');
  toast(recurring ? 'Pick how often in the cart' : 'Added to your cart');
  openPage({ k: 'cart' });
}

function Steps({ j }: { j: Job }) {
  const at = STEP_AT[j.status];
  return (
    <View style={{ marginTop: 16 }}>
      {STEPS.map((s, i) => {
        const on = i <= at, now = i === at;
        return (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
            <View style={{ width: 20, alignItems: 'center', alignSelf: 'stretch' }}>
              {i > 0 ? <View style={{ position: 'absolute', top: 0, height: 16, width: 2, backgroundColor: on ? C.violet : G.line }} /> : null}
              {i < STEPS.length - 1 ? <View style={{ position: 'absolute', top: 16, bottom: 0, width: 2, backgroundColor: i < at ? C.violet : G.line }} /> : null}
              <View style={{ marginTop: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: on ? C.violet : '#fff', borderWidth: on ? 0 : 1.5, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center' }}>
                {on ? (now && i < 4 ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : <Check size={12} color="#fff" strokeWidth={2.2} />) : null}
              </View>
            </View>
            <Txt weight={now ? 500 : 400} size={14} color={on ? G.ink : G.mute}>{s}</Txt>
          </View>
        );
      })}
    </View>
  );
}

/** progress along the road + eta for the rider scene (instant jobs default to createdAt + 15 min) */
function Rider({ j }: { j: Job }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(i); }, []);
  const made = Date.parse(j.createdAt), eta = j.eta ? Date.parse(j.eta) : j.mode === 'instant' && Number.isFinite(made) ? made + 15 * 60000 : NaN;
  const timed = Number.isFinite(eta) && Number.isFinite(made) && eta > made ? Math.min(0.95, Math.max(0.2, (now - made) / (eta - made))) : 0.5;
  const p = j.status === 'in_progress' ? 1 : j.status === 'upcoming' ? 0.05 : j.status === 'assigned' ? 0.2 : timed;
  return <RiderTrack progress={p} eta={Number.isFinite(eta) ? eta : null} status={j.status} />;
}

const PAY_BANNER: Record<string, { t: string; s: string; bg: string; fg: string }> = {
  pending: { t: 'Payment pending', s: 'We are confirming your payment with the bank. Your money is safe and this updates by itself.', bg: 'rgba(255,186,8,0.2)', fg: '#7A5000' },
  failed: { t: 'Payment failed', s: 'No money was taken for this booking. If anything was deducted it is refunded in 3 to 5 working days.', bg: 'rgba(220,38,38,0.08)', fg: '#B91C1C' },
  cancelled: { t: 'Payment cancelled', s: 'No money was taken. Book again whenever you are ready.', bg: '#F4F4F5', fg: '#525252' },
};

const Row = ({ k, v, tone, strike, bold }: { k: string; v: string; tone?: 'pos'; strike?: boolean; bold?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 }}>
    <Txt weight={bold ? 500 : 400} size={bold ? 15 : 14} color={bold ? G.ink : G.sub}>{k}</Txt>
    <Txt weight={bold ? 500 : 400} size={bold ? 15 : 14} color={tone === 'pos' ? G.pos : strike ? G.mute : G.ink} style={[TNUM, strike ? { textDecorationLine: 'line-through' } : null]}>{v}</Txt>
  </View>
);

export default function Booking({ id }: { id: string }) {
  useApp();
  const j = jobOf(id);
  const help = (
    <Tap label="Help" onPress={() => openBookingHelp(id)} style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: G.line, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
      <HelpIc size={18} color={G.mute} strokeWidth={1.5} /><Txt weight={500} size={14}>Help</Txt>
    </Tap>
  );
  if (!j) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}><PageBar title="Booking" />
      <View style={{ alignItems: 'center', padding: 48 }}><Txt weight={500} size={17}>Booking not found</Txt><Txt size={13} color={G.sub} style={{ marginTop: 4, textAlign: 'center' }}>It may have been removed. Your other bookings are in the Washes tab.</Txt></View>
    </View>
  );
  const up = UPCOMING.includes(j.status), done = j.status === 'done', gone = j.status === 'cancelled', a = j.addressId ? addressOf(j.addressId) : null;
  const itemTotal = j.lines.reduce((s, l) => s + l.price * l.q, 0), other = j.total - itemTotal, saved = j.saved;
  const payText = j.pay === 'paid' ? `Paid${j.payVia ? ' via ' + j.payVia : ''}` : j.pay === 'pass' ? 'Paid with WD Pass' : j.pay === 'refunded' ? 'Refunded to WD Money' : j.pay === 'pending' ? 'Payment pending' : j.pay === 'failed' ? 'Payment failed' : j.pay === 'cancelled' ? 'Payment cancelled' : 'Pay on arrival';
  const ref = j.orderId || j.id.toUpperCase();
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F8' }}>
      <PageBar title="Booking details" right={help} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <FadeUp>
          <View style={card({ padding: 16 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt weight={500} size={20} style={{ flex: 1 }}>{STATUS_TEXT[j.status]}</Txt>
              {gone ? null : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: done ? G.pos : C.violet }} />}
            </View>
            <Txt size={14} color={G.sub} style={{ marginTop: 4 }}>{jobWhen(j)}</Txt>
            <Pressable onPress={() => act.copy(ref, 'Booking ID copied')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 24 }}>
              <Txt size={12} color={G.mute}>Booking ID: {ref}</Txt><Copy size={13} color={G.mute} strokeWidth={1.5} />
            </Pressable>
            {gone ? (
              <View style={{ marginTop: 12, backgroundColor: G.raised, borderRadius: 10, padding: 12 }}>
                <Txt size={13} color={G.sub} style={{ lineHeight: 19 }}>{j.pay === 'refunded' ? `${inr(j.total)} was refunded to WD Money.` : 'This booking was cancelled.'}</Txt>
                {j.pay === 'refunded' ? <Pressable onPress={() => openPage({ k: 'refunds' })} style={{ marginTop: 8, minHeight: 24 }}><Txt weight={500} size={13} color={C.violet}>See my refunds</Txt></Pressable> : null}
              </View>
            ) : <Steps j={j} />}
          </View>
        </FadeUp>

        {PAY_BANNER[j.pay] ? <View style={{ backgroundColor: PAY_BANNER[j.pay].bg, borderRadius: 16, padding: 16 }}><Txt weight={600} size={15} color={PAY_BANNER[j.pay].fg}>{PAY_BANNER[j.pay].t}</Txt><Txt size={13} color={PAY_BANNER[j.pay].fg} style={{ marginTop: 4, lineHeight: 19 }}>{PAY_BANNER[j.pay].s}</Txt>{j.pay !== 'pending' ? <PrimaryBtn outline small label="Chat with us" onPress={() => act.whatsapp(`Hi Washing Daddy, about my booking ${ref}.`)} style={{ marginTop: 12 }} /> : null}</View> : null}

        {trackable(j) && !PAY_BANNER[j.pay] ? <FadeUp><Rider j={j} /></FadeUp> : null}

        <View style={card({ padding: 16 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {j.washer ? <Image source={washerImg(j)} resizeMode="cover" accessibilityLabel={`Photo of ${j.washer.name}`} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: G.raised }} />
              : <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}><Pin size={22} color={G.mute} strokeWidth={1.5} /></View>}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={16} numberOfLines={1}>{j.washer ? j.washer.name : 'Washer not assigned yet'}</Txt>
              <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{j.washer ? washerSub(j) : gone ? 'No washer was sent' : 'We assign one shortly before your slot'}</Txt>
            </View>
            {j.washer && up ? <Tap label="Call support" onPress={() => act.call()} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' }}><Phone size={18} color="#fff" strokeWidth={1.5} /></Tap> : null}
          </View>
          {done && feature('ratings') ? (
            <View style={{ borderTopWidth: 1, borderColor: G.line, marginTop: 12, paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt size={14} color={G.sub}>{j.stars ? `Your rating · ${STAR_WORDS[j.stars]}` : 'Rate your wash'}</Txt>
                <Stars n={j.stars || 0} size={24} gap={6} onPick={n => openRateSheet(j.id, n)} />
              </View>
              {j.review ? <Txt size={13} color={G.sub} style={{ marginTop: 8, lineHeight: 19 }}>{`"${j.review}"`}</Txt> : null}
              {canRate(j) && !j.stars ? <PrimaryBtn label="Rate your wash" onPress={() => openPage({ k: 'rate', id: j.id })} style={{ marginTop: 12 }} /> : null}
            </View>
          ) : null}
        </View>

        <View style={card({ padding: 16 })}>
          <Txt size={12} color={G.mute}>{`${j.lines.length} service${j.lines.length > 1 ? 's' : ''} · ${durText(j.mins)}`}</Txt>
          <View style={{ gap: 12, marginTop: 12 }}>
            {j.lines.map(l => (
              <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Photo id={l.id} radius={8} style={{ width: 48, height: 48 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt weight={500} size={14} numberOfLines={2}>{l.q > 1 ? `${l.name} × ${l.q}` : l.name}</Txt>
                  <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{`${l.variant ? l.variant + ' · ' : ''}${durText(l.mins * l.q)}`}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt weight={500} size={14} style={TNUM}>{inr(l.price * l.q)}</Txt>
                  {l.mrp > l.price ? <Txt size={12} color={G.mute} style={[TNUM, { textDecorationLine: 'line-through' }]}>{inr(l.mrp * l.q)}</Txt> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={card({ padding: 16 })}>
          <Txt weight={500} size={16} style={{ marginBottom: 8 }}>Bill details</Txt>
          <Row k="Item total" v={inr(itemTotal)} />
          {Math.abs(other) >= 0.5 ? <Row k={other > 0 ? 'Fees and GST' : j.coupon ? `Coupon ${j.coupon}` : 'Offers'} v={(other < 0 ? '−' : '') + inr(Math.abs(other))} tone={other < 0 ? 'pos' : undefined} /> : null}
          <View style={{ height: 1, backgroundColor: G.line, marginVertical: 8 }} />
          <Row k={j.pay === 'pay_on_arrival' ? 'To pay' : 'Total'} v={inr(j.total)} bold />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <IcoBox><Wallet size={18} color={G.mute} strokeWidth={1.5} /></IcoBox><Txt size={13} color={G.sub} style={{ flex: 1 }}>{payText}</Txt>
          </View>
          {j.payRef ? <Pressable onPress={() => act.copy(j.payRef!, 'Payment ref copied')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 36, minHeight: 24 }}><Txt size={12} color={G.mute}>Ref {j.payRef}</Txt><Copy size={13} color={G.mute} strokeWidth={1.5} /></Pressable> : null}
          {saved > 0 && !gone ? <View style={{ marginTop: 12, backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Receipt size={16} color={G.pos} strokeWidth={1.5} /><Txt weight={500} size={13} color={G.pos}>{`You saved ${inr(saved)} on this booking`}</Txt></View> : null}
        </View>

        {a ? (
          <View style={card({ padding: 16, flexDirection: 'row', gap: 12 })}>
            <IcoBox><Pin size={18} color={G.mute} strokeWidth={1.5} /></IcoBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={500} size={15}>{addrName(a)}</Txt>
              <Txt size={13} color={G.sub} style={{ marginTop: 4, lineHeight: 19 }}>{addrLine(a)}</Txt>
              <Txt size={12} color={G.mute} style={{ marginTop: 4 }}>{receiverText(a.receiver)}</Txt>
            </View>
          </View>
        ) : null}

        {up ? (
          <View style={card({ padding: 16 })}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <IcoBox><Clock size={18} color={G.mute} strokeWidth={1.5} /></IcoBox>
              <View style={{ flex: 1 }}>
                <Txt weight={500} size={15}>Change of plan?</Txt>
                <Txt size={13} color={G.sub} style={{ marginTop: 4, lineHeight: 19 }}>{POLICY}</Txt>
                <Txt weight={500} size={13} color={j.pay === 'paid' ? G.pos : G.sub} style={{ marginTop: 8, lineHeight: 19 }}>{refundNote(j)}</Txt>
              </View>
            </View>
            {feature('reschedule') ? <PrimaryBtn label="Reschedule" onPress={() => openRescheduleSheet(j.id)} style={{ marginTop: 16 }} /> : null}
            {feature('cancel') ? <PrimaryBtn outline label="Cancel booking" onPress={() => openCancelSheet(j.id)} style={{ marginTop: 12 }} /> : null}
            {!feature('reschedule') || !feature('cancel') ? <PrimaryBtn outline label="Chat with us" onPress={() => act.whatsapp(`Hi Washing Daddy, about my booking ${j.id}.`)} style={{ marginTop: 12 }} /> : null}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <PrimaryBtn label="Book again" onPress={() => repeatJob(j)} />
            {!gone ? <PrimaryBtn outline label="Repeat on a schedule" onPress={() => repeatJob(j, true)} /> : null}
          </View>
        )}

        <Tap onPress={() => openBookingHelp(j.id)} style={card({ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
          <IcoBox><HelpIc size={18} color={G.mute} strokeWidth={1.5} /></IcoBox>
          <View style={{ flex: 1 }}><Txt weight={500} size={15}>Help with this booking</Txt><Txt size={12} color={G.mute} style={{ marginTop: 2 }}>Chat, call, issues with the wash</Txt></View>
          <Chev size={18} color={G.mute} strokeWidth={1.5} />
        </Tap>
      </ScrollView>
    </View>
  );
}
