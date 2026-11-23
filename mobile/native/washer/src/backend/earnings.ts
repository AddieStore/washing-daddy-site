// Daily earnings ledger (contract 2026-11-23): earnings/{DATE}_{+91phone}
// { phone, date, washes:[{reg,amount}], extras:[{id,amount}], bonus:[{kind,amount}], total, paid:false }.
// The amounts come from the existing on-phone logic (Money in state/store.ts); this file only shapes and writes them.
// earnings_payouts/{YYYY-MM}_{phone} is admin-written; the washer only reads.
import type { Data, Db } from './types';

export type LedgerLine = { reg: string; amount: number };
export type ExtraLine = { id: string; amount: number };
export type BonusLine = { kind: string; amount: number };
export type Ledger = { phone: string; date: string; washes: LedgerLine[]; extras: ExtraLine[]; bonus: BonusLine[]; total: number; paid: boolean; updated_at?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const clean = <T extends { amount: number }>(l: T[]) => l.filter(x => x && isFinite(x.amount) && x.amount > 0).map(x => ({ ...x, amount: r2(x.amount) }));

export function buildLedger(o: { phone: string; date: string; washes: LedgerLine[]; extras: ExtraLine[]; bonus?: BonusLine[] }): Ledger {
  const washes = clean(o.washes), extras = clean(o.extras), bonus = clean(o.bonus || []);
  const total = r2([...washes, ...extras, ...bonus].reduce((a, x) => a + x.amount, 0));
  return { phone: o.phone, date: o.date, washes, extras, bonus, total, paid: false };
}

/** Write the day's ledger (whole doc). `paid` is kept if an admin already flipped it, and an empty day writes nothing. */
export async function writeLedger(db: Db, l: Ledger, at: string): Promise<void> {
  if (!l.total) return;
  const ref = db.doc('earnings/' + l.date + '_' + l.phone);
  let paid = false;
  try { const s = await ref.get(); if (s.exists) paid = !!(s.data() as Data)?.paid } catch (e) { /* offline: write anyway */ }
  await ref.set({ ...l, paid, updated_at: at });
}

/** Debounced writer for "on each finish": many calls in a burst become one write. */
export function ledgerWriter(db: Db, build: () => Ledger | null, now: () => string, wait = 2500) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const run = () => { t = null; const l = build(); if (l) writeLedger(db, l, now()).catch(e => console.warn('earnings', e)) };
  return { soon() { if (!t) t = setTimeout(run, wait) }, now() { if (t) clearTimeout(t); run() } };
}

/** Month's ledger rows for the washer (own docs only), for a server-backed Paisa history. Null when offline. */
export async function loadLedger(db: Db, phone: string, fromDate: string): Promise<Ledger[] | null> {
  try {
    const sn = await db.collection('earnings').where('phone', '==', phone).where('date', '>=', fromDate).get();
    return sn.docs.map(d => d.data() as Ledger).filter(Boolean);
  } catch (e) { console.warn('earnings load', e); return null }
}
