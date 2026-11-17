// The morning round as a timeline: 6 time slots between 5:30 and 11:00 (55 minutes each).
// The washer drags each car card into a slot, orders the cars inside a slot, then locks the round.
export const SLOT_COUNT = 6;
export const DAY_FROM = 5 * 60 + 30;   // 05:30
export const DAY_TO = 11 * 60;         // 11:00
export const SLOT_LEN = (DAY_TO - DAY_FROM) / SLOT_COUNT;   // 55 min
const hm = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
export function slotRange(i: number): { i: number; fromMin: number; toMin: number; from: string; to: string } {
  const k = Math.max(0, Math.min(SLOT_COUNT - 1, i)), a = DAY_FROM + k * SLOT_LEN, b = a + SLOT_LEN;
  return { i: k, fromMin: a, toMin: b, from: hm(a), to: hm(b) };
}
export const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => slotRange(i));
/** the ETA of the j-th car (0-based) of n cars in a slot: spread evenly across the slot, "HH:MM" */
export function etaIn(slot: number, j: number, n: number): string {
  const r = slotRange(slot); return hm(r.fromMin + Math.floor((SLOT_LEN * j) / Math.max(1, n)));
}
/** regs grouped per slot (in order), and the ones not placed yet */
export function lists(order: string[], slots: Record<string, number>): { slots: string[][]; pool: string[] } {
  const out: string[][] = Array.from({ length: SLOT_COUNT }, () => []), pool: string[] = [];
  for (const r of order) { const s = slots[r]; if (typeof s === 'number' && s >= 0 && s < SLOT_COUNT) out[s].push(r); else pool.push(r) }
  return { slots: out, pool };
}
/** put reg into slot at index (clamped); returns the new full order. slot = null puts it back in the pool */
export function place(order: string[], slots: Record<string, number>, reg: string, slot: number | null, index = 1e9): { order: string[]; slots: Record<string, number> } {
  const ns = { ...slots }; delete ns[reg];
  const l = lists(order.filter(r => r !== reg), ns);
  if (slot == null) { l.pool.push(reg); return { order: [...l.slots.flat(), ...l.pool], slots: ns } }
  ns[reg] = slot;
  const at = Math.max(0, Math.min(l.slots[slot].length, index)); l.slots[slot].splice(at, 0, reg);
  return { order: [...l.slots.flat(), ...l.pool], slots: ns };
}
/** minutes since midnight (IST) of the end of a slot, for "is this car late" */
export const slotEndMin = (slot: number) => slotRange(slot).toMin;
