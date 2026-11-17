// Customer complaints (feedback) about a washer, and what they mean for the No Complaint Bonus.
// Pure helpers only: the store (state/store.ts, "complaints" block) feeds Firestore docs in, screens read the result.
//
// Firestore: complaints/{id}, written by the customer app, handled by the manager in the approvals page (admin/).
//   { id, date 'YYYY-MM-DD' (IST), month 'YYYY-MM', reg, washer_id, customer_phone, customer_name, text (<=500),
//     kind 'quality'|'late'|'behaviour'|'damage'|'other', stars? 1-5, status 'open'|'seen'|'resolved'|'invalid',
//     manager_note (<=300), created_at, seen_at, resolved_at, updated_at }
//   washer_id is the washer's ROUND id (washers/{phone}.route_id, me().id in this app): the same key the washes,
//   newcars, ondemand and locations docs use, so the rules can check it with myRound().
//   The washer may only read his own and move 'open' -> 'seen'. The customer's phone is never kept in this app
//   (cleanComplaint() drops it) and never shown; only the customer's first name is.
//
// The bonus rule (decided 2026-11-12, see cleanMonth() in rewards.ts):
//   month   = calendar month in IST, taken from the complaint's `month` (or its `date`), never from the device clock;
//   counted = complaints of that month whose status is open, seen or resolved. 'invalid' (manager says it was not
//             his fault / not real) does not count;
//   rating  = the customers' stars for his washes that month: ratings/{DATE}_{REG} docs joined with his washes docs
//             (ratings carry no washer_id), averaged. Stars typed into a complaint are not part of the average;
//   eligible if counted === 0, OR (ratingCount >= 5 AND average >= 4.8). The manager pays it at month end.
import { CLEAN_MIN_AVG, CLEAN_MIN_RATINGS, type CleanInput } from './rewards.ts';

export type ComplaintKind = 'quality' | 'late' | 'behaviour' | 'damage' | 'other';
export type ComplaintStatus = 'open' | 'seen' | 'resolved' | 'invalid';
export const KINDS: ComplaintKind[] = ['quality', 'late', 'behaviour', 'damage', 'other'];
export const STATUSES: ComplaintStatus[] = ['open', 'seen', 'resolved', 'invalid'];

/** A complaint as the washer app keeps it (no customer phone). */
export type Complaint = {
  id: string; date: string; month: string; reg: string; washer_id: string;
  customer_first: string; text: string; kind: ComplaintKind; stars: number | null;
  status: ComplaintStatus; manager_note: string;
  created_at: string; seen_at: string | null; resolved_at: string | null; updated_at: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-\d{2}$/;
export const monthOf = (date: string) => String(date || '').slice(0, 7);
/** First name only ("Pooja S." -> "Pooja"); empty when there is none. */
export const firstName = (s: unknown) => String(s ?? '').trim().split(/\s+/)[0].replace(/[.,;:!?()"@0-9+]/g, '').slice(0, 30);
const s = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
const sOrNull = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 40) : null);

/** A Firestore doc -> Complaint, or null when it is not one we can show. Drops customer_phone on purpose. */
export function cleanComplaint(v: Record<string, unknown> | null | undefined, id: string): Complaint | null {
  if (!v || typeof v !== 'object') return null;
  const date = s(v.date, 10);
  if (!DATE_RE.test(date)) return null;
  const month = MONTH_RE.test(String(v.month || '')) ? String(v.month) : monthOf(date);
  const kind = KINDS.includes(v.kind as ComplaintKind) ? (v.kind as ComplaintKind) : 'other';
  const status = STATUSES.includes(v.status as ComplaintStatus) ? (v.status as ComplaintStatus) : 'open';
  const st = Number(v.stars);
  return {
    id: s(v.id, 80) || id, date, month, reg: s(v.reg, 20), washer_id: s(v.washer_id, 40),
    customer_first: firstName(v.customer_name), text: s(v.text, 500), kind,
    stars: Number.isInteger(st) && st >= 1 && st <= 5 ? st : null,
    status, manager_note: s(v.manager_note, 300),
    created_at: s(v.created_at, 40), seen_at: sOrNull(v.seen_at), resolved_at: sOrNull(v.resolved_at), updated_at: sOrNull(v.updated_at),
  };
}

/** Does this complaint count against the bonus? Everything except one the manager marked invalid. */
export const counts = (c: Pick<Complaint, 'status'>) => c.status !== 'invalid';
const newestFirst = (a: Complaint, b: Complaint) => (b.created_at || b.date).localeCompare(a.created_at || a.date);
/** The complaints of one month (all statuses), newest first. */
export const inMonth = (list: Complaint[], month: string) => list.filter(c => c.month === month).sort(newestFirst);
/** How many count against the bonus in that month. */
export const countInMonth = (list: Complaint[], month: string) => list.filter(c => c.month === month && counts(c)).length;
/** Open ones the washer has not opened yet (the badge on the Complaints row). */
export const unseen = (list: Complaint[]) => list.filter(c => c.status === 'open').length;

/** Complaints that arrived since the last snapshot (for the toast): ids not in `prev`, still open. */
export const arrivals = (prev: Set<string>, next: Complaint[]) => next.filter(c => !prev.has(c.id) && c.status === 'open');

/* ---------- ratings: the month's average ---------- */
export type WashRow = { date: string; reg: string; status?: string };
export type RatingRow = { date: string; reg: string; stars: number };

/** ratings doc ids (DATE_REG) worth fetching for this month: his washes that were done, newest first, at most `cap`. */
export function ratingKeys(washes: WashRow[], month: string, cap = 120): string[] {
  const seen = new Set<string>(), out: string[] = [];
  [...washes].filter(w => w && monthOf(w.date) === month && w.reg && (!w.status || w.status === 'done'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(w => { const k = w.date + '_' + w.reg; if (!seen.has(k) && out.length < cap) { seen.add(k); out.push(k) } });
  return out;
}

/** Count and average of valid star ratings in the month (1-5 whole stars; anything else is ignored). */
export function ratingStats(rows: RatingRow[], month: string) {
  const ok = rows.filter(r => r && monthOf(r.date) === month && Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5);
  const sum = ok.reduce((n, r) => n + r.stars, 0);
  return { count: ok.length, avg: ok.length ? sum / ok.length : null };
}

/** The input rewards()/cleanMonth() takes. */
export function cleanInput(list: Complaint[], ratings: RatingRow[], month: string): CleanInput {
  const r = ratingStats(ratings, month);
  return { complaints: countInMonth(list, month), ratingCount: r.count, ratingAvg: r.avg };
}

/** Rating for the screen: floored to one decimal, so 4.78 shows 4.7 and never looks like it already meets 4.8. */
export const showAvg = (avg: number | null) => (avg == null ? '–' : (Math.floor(avg * 10 + 1e-9) / 10).toFixed(1));

/** Which progress sentence the bonus card shows (the screen turns it into words through t()). */
export type CleanState =
  | { kind: 'loading' }
  | { kind: 'none' }                                            // Abhi koi complaint nahi
  | { kind: 'rated'; n: number; avg: string }                   // complaints, but 4.8+ over 5+ ratings: still on course
  | { kind: 'low'; n: number; avg: string; few: boolean }       // N complaint aayi, rating X.X (4.8 chahiye)
  | { kind: 'lost'; n: number; avg: string };                   // month over and not eligible
export function cleanState(c: { known: boolean; complaints: number; ratingCount: number; ratingAvg: number | null; byNone: boolean; byRating: boolean; possible: boolean }): CleanState {
  if (!c.known) return { kind: 'loading' };
  if (c.byNone) return { kind: 'none' };
  const avg = showAvg(c.ratingAvg);
  if (c.byRating) return { kind: 'rated', n: c.complaints, avg };
  if (!c.possible) return { kind: 'lost', n: c.complaints, avg };
  return { kind: 'low', n: c.complaints, avg, few: c.ratingCount < CLEAN_MIN_RATINGS };
}
export { CLEAN_MIN_AVG, CLEAN_MIN_RATINGS };

/** Demo / tests only: a complaint doc as the customer app writes it. */
export function sampleComplaintDoc(p: { id: string; date: string; reg: string; washer_id: string; text?: string; kind?: ComplaintKind; customer_name?: string; status?: ComplaintStatus; stars?: number }) {
  return {
    id: p.id, date: p.date, month: monthOf(p.date), reg: p.reg, washer_id: p.washer_id,
    customer_phone: '+910000000000', customer_name: p.customer_name ?? 'Pooja Sharma',
    text: p.text ?? 'Peeche ka sheesha theek se saaf nahi tha.', kind: p.kind ?? 'quality', ...(p.stars ? { stars: p.stars } : {}),
    status: p.status ?? 'open', manager_note: '', created_at: p.date + 'T09:30:00+05:30', seen_at: null, resolved_at: null, updated_at: p.date + 'T09:30:00+05:30',
  };
}
