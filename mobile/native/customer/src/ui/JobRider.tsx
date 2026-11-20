// The scooter-through-the-city scene for one booking: every upcoming or active booking shows it.
// Instant: ETA = created + 15 min (or the server's eta), the rider moves along the road with the clock.
// Scheduled: the rider waits at the WD hub until 15 min before the slot, then rides with the countdown.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { RiderTrack } from './RiderTrack';
import { Txt } from './kit';
import { whenText, jobCode, type Job } from '../state';

export const ETA_MINS = 15;
const UPCOMING = ['upcoming', 'assigned', 'on_the_way', 'in_progress'];
export const showsRider = (j: Job) => UPCOMING.includes(j.status) && !['pending', 'failed', 'cancelled'].includes(j.pay);

// "2026-11-23" + "09:00" in IST -> epoch ms
const slotMs = (date: string, slot: string) => (/^\d{4}-\d\d-\d\d$/.test(date) && /^\d\d:\d\d$/.test(slot) ? Date.parse(`${date}T${slot}:00+05:30`) : NaN);
const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const parseIST = (s: string) => (s ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + '+05:30') : NaN);

export function JobRider({ j, compact }: { j: Job; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(i) }, []);
  const slot = slotMs(j.date, j.slot), made = parseIST(j.createdAt);
  let eta = j.eta ? Date.parse(j.eta) : NaN, start = NaN;
  if (j.mode === 'instant') { if (!Number.isFinite(eta) && Number.isFinite(made)) eta = made + ETA_MINS * 60000; start = Number.isFinite(made) ? made : eta - ETA_MINS * 60000 }
  else if (Number.isFinite(slot)) { eta = slot; start = slot - ETA_MINS * 60000 }
  const riding = Number.isFinite(eta) && now >= start;
  let p = Number.isFinite(eta) && eta > start ? Math.min(0.95, Math.max(0.05, (now - start) / (eta - start))) : 0.05;
  // live position from WD Partner (on the way): the closer the washer, the further along the road; ETA from distance
  const live = j.status === 'on_the_way' && j.washerAt && j.carAt && now - parseIST(j.washerAt.at) < 5 * 60000 ? metres(j.washerAt, j.carAt) : NaN;
  if (Number.isFinite(live)) { p = Math.max(p, Math.min(0.95, 1 - live / 2000)); eta = now + Math.max(1, Math.ceil(live / 250)) * 60000 }   // ~15 km/h in city lanes
  if (j.status === 'in_progress') p = 1;
  else if (j.status === 'on_the_way') p = Math.max(p, 0.25);
  if (!riding && j.status !== 'in_progress' && j.status !== 'on_the_way') {
    // a scheduled booking still far from its slot: rider parked at the hub
    const when = whenText({ date: j.date, slot: j.slot });
    return <RiderTrack progress={0.02} eta={null} status={j.status as any} compact={compact} title={compact ? 'Scheduled' : `Booked for ${when}`} subtitle={`Your washer sets off ${ETA_MINS} min before the slot`} />;
  }
  // status follows the clock until the washer app updates it: a paid instant booking shows the rider on its way
  const st = j.status === 'in_progress' ? 'in_progress' : j.status === 'upcoming' || j.status === 'assigned' ? (p > 0.06 ? 'on_the_way' : j.status) : j.status;
  return <RiderTrack progress={p} eta={eta} status={st as any} compact={compact} />;
}

/* ---- start code: the washer types it in WD Partner to start the wash ---- */
export const showsCode = (j: Job) => ['upcoming', 'assigned', 'on_the_way'].includes(j.status) && !['pending', 'failed', 'cancelled'].includes(j.pay) && !!jobCode(j.id);
export function StartCode({ j, compact }: { j: Job; compact?: boolean }) {
  const code = jobCode(j.id); if (!code) return null;
  const hot = j.status === 'on_the_way' || j.status === 'assigned';
  if (compact) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <Txt size={13} color="#525252">Start code for your washer</Txt>
      <Txt weight={700} size={18} color="#5409DA" style={{ letterSpacing: 4 }}>{code}</Txt>
    </View>
  );
  return (
    <View style={{ backgroundColor: hot ? '#5409DA' : '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt weight={600} size={15} color={hot ? '#fff' : '#1a1a1a'}>{hot ? 'Share this code with your washer' : 'Your start code'}</Txt>
        <Txt size={13} color={hot ? 'rgba(255,255,255,0.85)' : '#525252'} style={{ marginTop: 4, lineHeight: 19 }}>Your washer asks for it before starting, so the right washer washes the right car. Never share it on a call.</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Start code ${code.split('').join(' ')}`}>
        {code.split('').map((d, i) => (
          <View key={i} style={{ width: 34, height: 44, borderRadius: 10, backgroundColor: hot ? '#fff' : '#F4EEFF', alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={700} size={22} color="#5409DA">{d}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
