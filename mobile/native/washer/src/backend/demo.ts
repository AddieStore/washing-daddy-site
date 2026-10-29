// In-memory stand-in for Firestore and phone sign-in. The preview runs on this, so every tap behaves like
// the real app (writes show up in listeners) without touching anyone's data. Test login: OTP 1234.
import type { Auth, Backend, Data, Db, DocRef, DocSnap, Op, Query, QuerySnap } from './types';

const test = (a: unknown, op: Op, b: unknown) =>
  op === '==' ? a === b : op === '!=' ? a !== b : op === '<' ? (a as any) < (b as any) : op === '<=' ? (a as any) <= (b as any)
    : op === '>' ? (a as any) > (b as any) : op === '>=' ? (a as any) >= (b as any) : op === 'in' ? ((b as unknown[]) || []).includes(a)
      : op === 'array-contains' ? Array.isArray(a) && a.includes(b) : true;

export function demoDb(): Db {
  const store = new Map<string, Data>();           // 'washes/2026-10-29_DL4CAB2731' -> doc
  const subs = new Set<() => void>();
  const copy = (d: Data | undefined) => (d === undefined ? undefined : JSON.parse(JSON.stringify(d)));
  const snap = (path: string): DocSnap => {
    const d = store.get(path);
    return { id: path.split('/').pop()!, exists: d !== undefined, data: () => copy(d) };
  };
  const changed = () => setTimeout(() => subs.forEach(f => f()), 0);
  const listen = (fire: () => void) => { subs.add(fire); setTimeout(fire, 0); return () => { subs.delete(fire) } };

  const docRef = (path: string): DocRef => ({
    id: path.split('/').pop()!, path,
    get: async () => snap(path),
    set: async data => { store.set(path, copy(data)); changed() },
    update: async patch => {
      if (!store.has(path)) throw Object.assign(new Error('not found'), { code: 'not_found' });
      store.set(path, { ...store.get(path), ...copy(patch) }); changed();
    },
    delete: async () => { store.delete(path); changed() },
    onSnapshot: cb => listen(() => cb(snap(path))),
  });
  const query = (coll: string, filters: [string, Op, unknown][]): Query => {
    const run = (): QuerySnap => {
      const docs = [...store.keys()].filter(k => k.startsWith(coll + '/') && k.split('/').length === 2)
        .map(snap).filter(d => filters.every(([f, op, v]) => test(d.data()![f], op, v)));
      return { docs, size: docs.length, empty: !docs.length };
    };
    return {
      where: (f, op, v) => query(coll, filters.concat([[f, op, v]])),
      get: async () => run(),
      onSnapshot: cb => listen(() => cb(run())),
    };
  };
  return { collection: c => query(c, []), doc: docRef };
}

export function demoAuth(): Auth {
  let phone: string | null = null, pending: string | null = null;
  const subs = new Set<(p: string | null) => void>();
  const fail = (code: string, hi: string) => Object.assign(new Error(hi), { code, hi });
  return {
    real: false,
    codeLength: 4,
    ready: async () => phone,
    phone: () => phone,
    onChange(cb) { subs.add(cb); return () => { subs.delete(cb) } },
    async send(p10) { await new Promise(r => setTimeout(r, 500)); pending = '+91' + p10 },
    async confirm(code) {
      if (code !== '1234') throw fail('wrong_code', 'OTP galat hai. Test mein 1234 daalo.');
      phone = pending; pending = null; subs.forEach(f => f(phone));
    },
    async signOut() { phone = null; subs.forEach(f => f(null)) },
    async idToken() { return null },
  };
}

export const demoBackend = (): Backend => ({ mode: 'demo', db: demoDb(), auth: demoAuth() });
