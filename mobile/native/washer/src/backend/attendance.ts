// Server-side attendance (contract 2026-11-23): attendance/{DATE}_{+91phone}. The server is the source of truth,
// so the rewards history survives logout, reinstall and a new phone (the on-device S.attend is only a cache).
// Pure helpers over the `Db` interface; no import of the store, so there is no cycle.
import type { Data, Db } from './types';

export type AttendDoc = {
  phone: string; name: string; date: string; check_in_at?: string | null; check_in_photo?: string | null; check_in_uniform?: { shirt_match: boolean; shirt_share: number; shirt_color?: string } | null; first_car_at?: string | null;
  check_out_at?: string | null; cars_done?: number; cars_skipped?: number; hours?: number; last_seen_at?: string;
};
export const attId = (date: string, phone: string) => `${date}_${phone}`;

/** Write `patch` into attendance/{DATE}_{phone}: update when the doc exists, else create it with `base` + patch. */
export async function upsertAttendance(db: Db, date: string, phone: string, base: Data, patch: Data): Promise<void> {
  const ref = db.doc('attendance/' + attId(date, phone));
  let exists = false;
  try { exists = (await ref.get()).exists } catch (e) { /* offline: try the create below */ }
  if (exists) await ref.update(patch);
  else await ref.set({ phone, date, ...base, ...patch });
}

/** Check-in mirror. `photo` is the same selfie the checkins/ doc holds (kept off the attendance doc when large). */
export const mirrorCheckIn = (db: Db, o: { date: string; phone: string; name: string; at: string; photo?: string | null; uniform?: Data | null }) =>
  upsertAttendance(db, o.date, o.phone, { name: o.name }, { check_in_at: o.at, ...(o.photo ? { check_in_photo: o.photo } : {}), ...(o.uniform ? { check_in_uniform: o.uniform } : {}) });

/** First car photo of the day (early bird), the one thing the old checkins `first` field carried. */
export const mirrorFirstCar = (db: Db, o: { date: string; phone: string; name: string; at: string }) =>
  upsertAttendance(db, o.date, o.phone, { name: o.name }, { first_car_at: o.at });

/** "Aaj ka kaam khatam": cars done/skipped and hours worked since check-in (or the first start when he never checked in). */
export function dayHours(fromIso: string | null | undefined, toIso: string): number {
  const a = fromIso ? Date.parse(fromIso) : NaN, b = Date.parse(toIso);
  if (!isFinite(a) || !isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 36e5 * 100) / 100;
}
export const writeCheckOut = (db: Db, o: { date: string; phone: string; name: string; at: string; from?: string | null; done: number; skipped: number }) =>
  upsertAttendance(db, o.date, o.phone, { name: o.name, ...(o.from ? { check_in_at: o.from } : {}) },
    { check_out_at: o.at, cars_done: o.done, cars_skipped: o.skipped, hours: dayHours(o.from, o.at) });

/** washers/{phone}.last_seen_at, the heartbeat (rules let a washer update this field). */
export const heartbeat = (db: Db, phone: string, at: string) => db.doc('washers/' + phone).update({ last_seen_at: at });

/** Start the 60 s heartbeat; returns the stop function. */
export function startHeartbeat(db: Db, phone: () => string | null, now: () => string, every = 60000): () => void {
  const beat = () => { const p = phone(); if (p && p !== '+91') heartbeat(db, p, now()).catch(() => {}) };
  beat(); const h = setInterval(beat, every);
  return () => clearInterval(h);
}

/** Server attendance since `fromDate` in the shape lib/rewards.ts reads: { DATE: { in, first } }. Null when offline. */
export async function loadAttendance(db: Db, phone: string, fromDate: string): Promise<Record<string, { in?: string | null; first?: string | null }> | null> {
  try {
    const sn = await db.collection('attendance').where('phone', '==', phone).where('date', '>=', fromDate).get();
    const out: Record<string, { in?: string | null; first?: string | null }> = {};
    sn.docs.forEach(d => {
      const v = d.data() as AttendDoc | undefined; if (!v || !v.date) return;
      out[v.date] = { in: v.check_in_at || null, first: v.first_car_at || null };
    });
    return out;
  } catch (e) { console.warn('attendance load', e); return null }
}
