// The web build is only the Claude preview: no Firebase, the app runs on test data (OTP 1234).
// Release check: open the preview with ?release=1 and it runs the REAL code paths (REAL = true, no demo data) against
// an EMPTY in-memory Firestore and a fake phone sign-in (any 6-digit code). That is what a release build sees before
// the admin has written anything: clean empty states. Nothing here ships in the phone app (firebase.native.ts does).
import type { Auth, Backend, Db, DocRef, Query, Snap } from './types';

const qs = typeof window !== 'undefined' && window.location ? window.location.search : '';
export const SIM_RELEASE = /[?&]release=1\b/.test(qs);

function fakeBackend(): Backend {
  const LS = 'wd-sim-db', US = 'wd-sim-user';
  let store: Record<string, any> = {};
  try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {} } catch (e) {}
  const persist = () => { try { localStorage.setItem(LS, JSON.stringify(store)) } catch (e) {} };
  const listeners = new Set<() => void>();
  const changed = () => { persist(); setTimeout(() => listeners.forEach(f => f()), 0) };
  const snap = (path: string): Snap => ({ id: path.split('/').pop()!, exists: path in store, data: () => (store[path] ? JSON.parse(JSON.stringify(store[path])) : undefined), fromCache: false });
  let n = 0; const newId = () => 'sim' + Date.now().toString(36) + (n++);
  const ref = (path: string): DocRef => ({
    id: path.split('/').pop()!,
    get: async () => snap(path),
    set: async d => { store[path] = JSON.parse(JSON.stringify(d)); changed() },
    update: async p => { if (!(path in store)) throw new Error('not-found'); store[path] = { ...store[path], ...JSON.parse(JSON.stringify(p)) }; changed() },
    delete: async () => { delete store[path]; changed() },
    onSnapshot: cb => { const f = () => cb(snap(path)); listeners.add(f); setTimeout(f, 30); return () => { listeners.delete(f) } },
  });
  const q = (name: string, filters: [string, string, unknown][]): Query => ({
    where: (f, op, v) => q(name, filters.concat([[f, op, v]])),
    onSnapshot: cb => {
      const f = () => cb(Object.keys(store).filter(p => p.startsWith(name + '/') && p.split('/').length === 2).filter(p => filters.every(([k, op, v]) => {
        const x = store[p][k]; return op === '==' ? x === v : op === 'in' ? (v as unknown[]).includes(x) : Array.isArray(x) && x.includes(v);
      })).map(snap), { fromCache: false });
      listeners.add(f); setTimeout(f, 30); return () => { listeners.delete(f) };
    },
    doc: id => ref(name + '/' + (id || newId())),
    add: async d => { const id = newId(); store[name + '/' + id] = JSON.parse(JSON.stringify(d)); changed(); return { id } },
  });
  const db: Db = { doc: path => ref(path), collection: name => q(name, []) };

  let phone: string | null = null, pending: string | null = null;
  try { phone = localStorage.getItem(US) } catch (e) {}
  const authL = new Set<(b: boolean) => void>();
  const auth: Auth = {
    ready: async () => phone,
    phone: () => phone, phone10: () => (phone ? phone.slice(-10) : null), uid: () => (phone ? 'sim-' + phone : null),
    async send(p) { pending = '+91' + String(p).replace(/\D/g, '').slice(-10); return { ok: true } },
    async confirm(code) {
      if (!/^\d{6}$/.test(String(code))) throw Object.assign(new Error('Enter the 6-digit code.'), { code: 'wrong_code', en: 'Enter the 6-digit code.' });
      phone = pending; try { localStorage.setItem(US, phone || '') } catch (e) {} authL.forEach(f => f(true)); return { uid: 'sim-' + phone };
    },
    async signOut() { phone = null; try { localStorage.removeItem(US) } catch (e) {} authL.forEach(f => f(false)) },
    async idToken() { return null },
    onChange(f) { authL.add(f); return () => { authL.delete(f) } },
  };
  return { db, auth };
}

export const backend: Backend | null = SIM_RELEASE ? fakeBackend() : null;
