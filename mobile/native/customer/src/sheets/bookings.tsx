// Bookings sheets (rate, cancel with refund note, reschedule, booking help) and the small pieces the Bookings pages share
// (stars, duration text, washer photo, rating form). OWNER: BOOKINGS worker. Pages import from here; this file imports no page.
import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme';
import { Txt } from '../ui/kit';
import { Chev, Phone, Clock, Close, WhatsApp, Help as HelpIc, Check } from '../ui/icons';
import { SheetTitle, SheetSub } from '../ui/hosts';
import { IMG } from '../img';
import { inr, fmt, iso, TODAY } from '../data/dates';
import { SHOW_RATINGS } from '../data/reference';
import { act, jobOf, jobTitle, jobWhen, canRate, UPCOMING, slotDays, slotsFor, openSheet, closeSheet, openPage, toast, Job } from '../state';
import { G, Tap, PrimaryBtn, TNUM } from '../pages/parts';

/* ---------- shared bits ---------- */
export const STAR_WORDS = ['', 'Very bad', 'Not good', 'Okay', 'Good', 'Excellent'];
const STAR = 'M12 3.3l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.6l6-.8z';
/** five stars; with onPick they are tappable (44 px targets) */
export function Stars({ n = 0, size = 20, onPick, gap = 4 }: { n?: number; size?: number; onPick?: (n: number) => void; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityLabel={`${n} of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => {
        const star = <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={STAR} fill={i <= n ? C.violet : 'none'} stroke={i <= n ? C.violet : '#A3A3A3'} strokeWidth={1.5} strokeLinejoin="round" /></Svg>;
        return onPick
          ? <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`} hitSlop={{ top: 8, bottom: 8, left: gap / 2, right: gap / 2 }} onPress={() => onPick(i)}>{star}</Pressable>
          : <View key={i}>{star}</View>;
      })}
    </View>
  );
}
/** 55 min / 1.5 hr */
export const durText = (mins: number) => (mins >= 60 ? `${+(mins / 60).toFixed(1)} hr` : `${Math.max(1, Math.round(mins))} min`);
export const washerImg = (j: Job) => (j.washer && j.washer.photo ? { uri: j.washer.photo } : IMG.washer);
/** "3 · 4.8 · 312 jobs" style line, ratings only while SHOW_RATINGS is on */
export const washerSub = (j: Job) => (j.washer ? (SHOW_RATINGS ? `${j.washer.rating.toFixed(1)} · ${j.washer.jobs} jobs` : `${j.washer.jobs} jobs`) : '');
export const STATUS_TEXT: Record<Job['status'], string> = { upcoming: 'Booked', assigned: 'Washer assigned', on_the_way: 'Washer on the way', in_progress: 'Wash in progress', done: 'Completed', cancelled: 'Cancelled' };
/** "Booked" for a not yet started wash, else the washer step */
export const dayLabel = (d: string) => (d === iso(TODAY) ? 'Today' : fmt(d, { day: 'numeric', month: 'short' }));
export const IcoBox = ({ children }: { children: React.ReactNode }) => <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;

/** refund line for the cancel sheet and the booking page */
export function refundNote(j: Job): string {
  if (j.pay === 'paid') return `${inr(j.total)} goes back to WD Money right away.`;
  if (j.pay === 'pay_on_arrival') return 'You have not paid yet, so there is nothing to refund.';
  if (j.pay === 'pass') return 'This used a WD Pass visit. If the visit does not come back, chat with us.';
  return 'Your refund is already on its way.';
}
export const POLICY = 'Free cancellation up to 6 hours before your slot. Closer than that, the washer may already be on the way, so chat with us.';

/* ---------- rate ---------- */
const GOOD = ['Spotless', 'On time', 'Polite washer', 'Great value'], BAD = ['Missed spots', 'Came late', 'Rude behaviour', 'Water or foam left'];
/** stars + quick tags + note -> act.rateJob. Used by the Rate page and the rate sheet. */
export function RateForm({ id, initial = 0, onDone, big }: { id: string; initial?: number; onDone: () => void; big?: boolean }) {
  const j = jobOf(id), [n, setN] = useState(initial || (j && j.stars) || 0), [tags, setTags] = useState<string[]>([]), [note, setNote] = useState((j && j.review) || ''), [busy, setBusy] = useState(false);
  if (!j) return <Txt size={14} color={G.sub}>Booking not found.</Txt>;
  if (!canRate(j)) return <Txt size={14} color={G.sub}>You can rate a booking once the wash is done.</Txt>;
  const opts = n && n < 4 ? BAD : GOOD;
  const submit = async () => {
    if (!n || busy) return; setBusy(true);
    try { await act.rateJob(id, n, [tags.join(', '), note.trim()].filter(Boolean).join('. ')); onDone(); }
    catch (e: any) { toast(e.message || 'Could not save your rating. Try again.'); }
    setBusy(false);
  };
  return (
    <View>
      <View style={{ alignItems: 'center', paddingVertical: big ? 16 : 8 }}>
        <Stars n={n} size={big ? 44 : 38} gap={big ? 10 : 8} onPick={v => { setN(v); setTags([]); }} />
        <Txt weight={500} size={15} color={n ? G.ink : G.mute} style={{ marginTop: 12, minHeight: 20 }}>{n ? STAR_WORDS[n] : 'Tap a star to rate'}</Txt>
      </View>
      {n ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {opts.map(t => { const on = tags.includes(t); return (
            <Tap key={t} onPress={() => setTags(on ? tags.filter(x => x !== t) : [...tags, t])} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.06)' : '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
              {on ? <Check size={14} color={C.violet} strokeWidth={2} /> : null}<Txt weight={500} size={13} color={on ? C.violet : G.ink}>{t}</Txt>
            </Tap>); })}
        </View>
      ) : null}
      <TextInput value={note} onChangeText={setNote} maxLength={300} multiline placeholder="Anything else for your washer or us? (optional)" placeholderTextColor="#A3A3A3"
        style={[{ marginTop: 16, minHeight: 84, borderRadius: 10, borderWidth: 1, borderColor: G.line, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: G.ink, textAlignVertical: 'top', backgroundColor: '#fff' }, { outlineStyle: 'none' } as any]} />
      <PrimaryBtn label={j.stars ? 'Update rating' : 'Submit'} disabled={!n} busy={busy} onPress={submit} style={{ marginTop: 16 }} />
    </View>
  );
}
/** stars + note -> act.rateJob(id, stars, note). `initial` pre-selects the tapped star. */
export function openRateSheet(id: string, initial = 0) {
  const j = jobOf(id);
  openSheet(<>
    <SheetTitle>{j && j.stars ? 'Your rating' : 'Rate your wash'}</SheetTitle>
    <SheetSub>{j ? `${jobTitle(j)}${j.washer ? ' · ' + j.washer.name : ''}` : 'How was it?'}</SheetSub>
    <RateForm id={id} initial={initial} onDone={closeSheet} />
  </>);
}

/* ---------- cancel ---------- */
function CancelBody({ id }: { id: string }) {
  const j = jobOf(id), [busy, setBusy] = useState(false);
  if (!j || !UPCOMING.includes(j.status)) return <><SheetTitle>Cannot cancel</SheetTitle><SheetSub>This booking is not open for cancellation any more.</SheetSub><PrimaryBtn label="Close" onPress={closeSheet} /></>;
  return (
    <View>
      <SheetTitle>Cancel booking?</SheetTitle>
      <SheetSub>{`${jobTitle(j)} · ${jobWhen(j)}`}</SheetSub>
      <View style={{ backgroundColor: G.raised, borderRadius: 14, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}><IcoBox><Clock size={18} color={G.mute} strokeWidth={1.5} /></IcoBox><Txt size={13} color={G.sub} style={{ flex: 1, lineHeight: 19 }}>{POLICY}</Txt></View>
        <View style={{ flexDirection: 'row', gap: 12 }}><IcoBox><Check size={18} color={G.pos} strokeWidth={1.5} /></IcoBox><Txt weight={500} size={13} color={G.ink} style={{ flex: 1, lineHeight: 19 }}>{refundNote(j)}</Txt></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <PrimaryBtn outline label="Keep booking" onPress={closeSheet} style={{ flex: 1 }} />
        <PrimaryBtn label="Cancel booking" busy={busy} onPress={async () => { setBusy(true); try { await act.cancelJob(id); closeSheet(); } catch (e: any) { toast(e.message || 'Could not cancel. Try again.'); setBusy(false); } }} style={{ flex: 1, backgroundColor: G.neg }} />
      </View>
    </View>
  );
}
/** 'Cancel booking?' with the cancellation policy and refund line -> act.cancelJob(id). */
export function openCancelSheet(id: string) { openSheet(<CancelBody id={id} />); }

/* ---------- reschedule ---------- */
function RescheduleBody({ id }: { id: string }) {
  const j = jobOf(id), days = slotDays(7).filter(d => !d.disabled), [date, setDate] = useState(() => (days.find(d => !d.soldOut) || days[0] || { date: iso(TODAY) }).date), [slot, setSlot] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { act.loadSlots().catch(() => {}); }, []);
  if (!j || !UPCOMING.includes(j.status)) return <><SheetTitle>Cannot reschedule</SheetTitle><SheetSub>Only upcoming bookings can be moved.</SheetSub><PrimaryBtn label="Close" onPress={closeSheet} /></>;
  const slots = slotsFor(date);
  const confirm = async () => {
    if (!slot || busy) return; setBusy(true);
    try {
      const fn = (act as any).rescheduleJob;   // act.rescheduleJob exists; the WhatsApp fallback below is only for older state builds
      if (typeof fn === 'function') { await fn(id, { date, slot }); }
      else { act.whatsapp(`Please reschedule my booking ${id} (${jobTitle(j)}) to ${fmt(date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${slots.find(s => s.t === slot)?.label || slot}.`); toast('Sent to our team on WhatsApp'); }
      closeSheet();
    } catch (e: any) { toast(e.message || 'Could not reschedule. Try again.'); setBusy(false); }
  };
  return (
    <View>
      <SheetTitle>Reschedule</SheetTitle>
      <SheetSub>{`Now: ${jobWhen(j)}. Free to change up to 6 hours before.`}</SheetSub>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {days.map(d => { const on = d.date === date; return (
          <Tap key={d.date} disabled={d.soldOut} onPress={() => { setDate(d.date); setSlot(''); }} style={{ width: '22.8%', minHeight: 60, borderRadius: 10, borderWidth: 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? 'rgba(84,9,218,0.06)' : '#fff', alignItems: 'center', justifyContent: 'center', opacity: d.soldOut ? 0.4 : 1 }}>
            <Txt size={12} color={on ? C.violet : G.mute}>{d.label === 'Today' || d.label === 'Tomorrow' ? d.label : d.short}</Txt>
            <Txt weight={500} size={16} color={on ? C.violet : G.ink} style={TNUM}>{d.d}</Txt>
            {d.soldOut ? <Txt size={10} color={G.mute}>Full</Txt> : null}
          </Tap>); })}
      </View>
      <Txt weight={500} size={14} style={{ marginTop: 16, marginBottom: 8 }}>Pick a time</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {slots.filter(s => s.ok).map(s => { const on = s.t === slot; return (
          <Tap key={s.t} onPress={() => setSlot(s.t)} style={{ minHeight: 40, width: '31%', paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: on ? C.violet : G.line, backgroundColor: on ? C.violet : '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={500} size={13} color={on ? '#fff' : G.ink} style={TNUM}>{s.label}</Txt>
          </Tap>); })}
        {!slots.some(s => s.ok) ? <Txt size={13} color={G.sub}>No slots left on this day.</Txt> : null}
      </View>
      <Txt size={12} color={G.mute} style={{ marginTop: 12 }}>Your washer arrives within 30 minutes of the slot.</Txt>
      <PrimaryBtn label="Confirm new time" disabled={!slot} busy={busy} onPress={confirm} style={{ marginTop: 16 }} />
    </View>
  );
}
export function openRescheduleSheet(id: string) { openSheet(<RescheduleBody id={id} />); }

/* ---------- help on one booking ---------- */
function HelpBody({ id }: { id: string }) {
  const j = jobOf(id), up = !!j && UPCOMING.includes(j.status);
  const row = (icon: React.ReactNode, title: string, sub: string, onPress: () => void) => (
    <Tap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16 }}>
      <IcoBox>{icon}</IcoBox><View style={{ flex: 1 }}><Txt weight={500} size={15}>{title}</Txt><Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{sub}</Txt></View><Chev size={18} color={G.mute} strokeWidth={1.5} />
    </Tap>
  );
  const sep = <View style={{ height: 1, backgroundColor: G.line, marginLeft: 52 }} />;
  return (
    <View>
      <SheetTitle>Need help?</SheetTitle>
      <SheetSub>{j ? `${jobTitle(j)} · ${jobWhen(j)}` : 'Washing Daddy support'}</SheetSub>
      <View style={{ borderWidth: 1, borderColor: G.line, borderRadius: 14, overflow: 'hidden' }}>
        {row(<WhatsApp size={18} color={G.mute} strokeWidth={1.5} />, 'Chat with us', 'WhatsApp, 7 AM to 9 PM', () => { closeSheet(); act.whatsapp(j ? `Hi, I need help with my Washing Daddy booking ${id} (${jobTitle(j)}, ${jobWhen(j)}).` : ''); })}
        {sep}
        {row(<Phone size={18} color={G.mute} strokeWidth={1.5} />, 'Call us', '77018 08924', () => { closeSheet(); act.call(); })}
        {up ? <>{sep}{row(<Clock size={18} color={G.mute} strokeWidth={1.5} />, 'Reschedule', 'Move to another day or time', () => { closeSheet(); setTimeout(() => openRescheduleSheet(id), 280); })}
          {sep}{row(<Close size={18} color={G.mute} strokeWidth={1.5} />, 'Cancel booking', refundNote(j!), () => { closeSheet(); setTimeout(() => openCancelSheet(id), 280); })}</> : null}
        {sep}
        {row(<HelpIc size={18} color={G.mute} strokeWidth={1.5} />, 'Help topics', 'Booking, payments, service quality', () => { closeSheet(); openPage({ k: 'help' }); })}
      </View>
    </View>
  );
}
/** Help on one booking: chat (act.whatsapp with the booking id), call, reschedule and cancel for upcoming ones. */
export function openBookingHelp(id: string) { openSheet(<HelpBody id={id} />); }
