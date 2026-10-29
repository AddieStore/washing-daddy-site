// The morning's task list. Both apps compute the same thing: see .notes/sync-contract.md.
import { dObj } from './time.ts';

export type PlanId = 'legacy' | 'std' | 'pro' | 'exc' | 'res';
export type TaskKey = 'pressure' | 'foam' | 'interior' | 'tyre' | 'detailing' | 'dry';

export const PLAN: Record<PlanId, { name: string; f: { interior: number; tyre: number; foam: number }; det: null | 'm1' | 'm2' | 'w4' }> = {
  legacy: { name: 'Legacy', f: { interior: 1, tyre: 0, foam: 0 }, det: null },
  std: { name: 'WD Standard', f: { interior: 1, tyre: 2, foam: 1 }, det: null },
  pro: { name: 'WD Pro', f: { interior: 2, tyre: 7, foam: 2 }, det: 'm1' },
  exc: { name: 'WD Exclusive', f: { interior: 3, tyre: 7, foam: 4 }, det: 'm2' },
  res: { name: 'WD Reserve', f: { interior: 7, tyre: 7, foam: 7 }, det: 'w4' },
};
export const isPlan = (p: unknown): p is PlanId => typeof p === 'string' && p in PLAN;
// Monthly list price per plan (customer app PLANS). Legacy cars pay anywhere from 500 up, so the washer can adjust it.
export const PLAN_PRICE: Record<PlanId, number> = { legacy: 500, std: 999, pro: 1800, exc: 2500, res: 5555 };

// en goes into washes/{id}.tasks[].label; hi (Hinglish) is what the washer reads
export const TASK: Record<TaskKey, { en: string; hi: string; sub: string; litres: number }> = {
  pressure: { en: 'Pressure wash', hi: 'Pressure wash', sub: 'Upar se neeche. Kapda nahi lagega.', litres: 9 },
  foam: { en: 'Foam wash', hi: 'Foam wash', sub: 'Foam 2 minute rukne do', litres: 3 },
  interior: { en: 'Interior cleaning', hi: 'Andar ki safai', sub: 'Mat, dashboard, seat', litres: 1 },
  tyre: { en: 'Tyre & trim polish', hi: 'Tyre aur trim polish', sub: 'Satin finish, chikna nahi', litres: 0 },
  detailing: { en: 'Detailing', hi: 'Detailing', sub: 'Clay, polish, wax', litres: 2 },
  dry: { en: 'Hand dry', hi: 'Haath se sukhao', sub: 'Sirf microfibre', litres: 0 },
};

// 'DL 4C AB 2731' -> 'DL4CAB2731'
export const normReg = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function tasksFor(reg: string, plan: string, date: string): TaskKey[] {
  const p = PLAN[plan as PlanId] || PLAN.std, h = hash(reg), d = dObj(date), di = (d.getDay() + 6) % 7, due = new Set<TaskKey>();
  const spread = (k: TaskKey, n: number, off: number) => {
    if (!n) return;
    if (n >= 7) { due.add(k); return }
    for (let i = 0; i < n; i++) if ((off + Math.floor(i * 7 / n)) % 7 === di) due.add(k);
  };
  spread('foam', p.f.foam, h % 7);
  spread('interior', p.f.interior, (h >>> 3) % 7);
  spread('tyre', p.f.tyre, (h >>> 6) % 7);
  if (p.det === 'w4') spread('detailing', 4, (h >>> 9) % 7);
  else if (p.det) {
    const dom = ((h >>> 9) % 28) + 1, day = d.getDate(), two = dom + 14 <= 28 ? dom + 14 : dom - 14;
    if (day === dom || (p.det === 'm2' && day === two)) due.add('detailing');
  }
  return ['pressure', ...(['foam', 'interior', 'tyre', 'detailing'] as TaskKey[]).filter(k => due.has(k)), 'dry'];
}
