// The scooter-through-the-city scene for one booking: every upcoming or active booking shows it.
// Instant: ETA = created + 15 min (or the server's eta), the rider moves along the road with the clock.
// Scheduled: the rider waits at the WD hub until 15 min before the slot, then rides with the countdown.
import React, { useEffect, useState } from 'react';
import { RiderTrack } from './RiderTrack';
import { whenText, type Job } from '../state';

export const ETA_MINS = 15;
const UPCOMING = ['upcoming', 'assigned', 'on_the_way', 'in_progress'];
export const showsRider = (j: Job) => UPCOMING.includes(j.status) && !['pending', 'failed', 'cancelled'].includes(j.pay);

// "2026-11-23" + "09:00" in IST -> epoch ms
const slotMs = (date: string, slot: string) => (/^\d{4}-\d\d-\d\d$/.test(date) && /^\d\d:\d\d$/.test(slot) ? Date.parse(`${date}T${slot}:00+05:30`) : NaN);
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
