// Firestore and phone sign-in for the installed app, through React Native Firebase (native SDKs).
// Same Firebase project as washingdaddy.com, same collections, same rules (mobile/firebase/firestore.rules).
// The native config comes from google-services.json / GoogleService-Info.plist (see README.md).
import { getApps } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import {
  getFirestore, doc, collection, query, where, onSnapshot, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
} from '@react-native-firebase/firestore';
import type { Auth, AuthError, Backend, Data, Db, DbError, DocRef, DocSnap, Op, Query, QuerySnap } from './types';

const RANGE = new Set<Op>(['<', '<=', '>', '>=', '!=']);
const test = (a: any, op: Op, b: any) => op === '==' ? a === b : op === '!=' ? a !== b : op === '<' ? a < b : op === '<=' ? a <= b
  : op === '>' ? a > b : op === '>=' ? a >= b : op === 'in' ? (b || []).includes(a) : op === 'array-contains' ? Array.isArray(a) && a.includes(b) : true;
const bare = (e: any) => String((e && e.code) || '').replace(/^[a-z]+\//, '');

// the screens check e.code: 'unavailable' means retry, 'invalid_argument' means the store refused for good
const wrapErr = (e: any): DbError => {
  const c = bare(e);
  const out: DbError = new Error((e && e.message) || String(e));
  out.code = c === 'permission-denied' || c === 'invalid-argument' ? 'invalid_argument'
    : c === 'unavailable' || c === 'deadline-exceeded' ? 'unavailable' : c.replace(/-/g, '_');
  return out;
};
const docSnap = (s: any): DocSnap => ({ id: s.id, exists: s.exists(), data: () => (s.exists() ? s.data() : undefined) });
const qSnap = (docs: DocSnap[]): QuerySnap => ({ docs, size: docs.length, empty: !docs.length });

function makeDb(): Db {
  const fs = getFirestore();
  const docRef = (path: string): DocRef => {
    const ref = doc(fs, path);
    return {
      id: ref.id, path: ref.path,
      get: () => getDoc(ref).then(docSnap, e => { throw wrapErr(e) }),
      set: (data: Data) => setDoc(ref, data).catch(e => { throw wrapErr(e) }),
      update: (patch: Data) => updateDoc(ref, patch).catch(e => { throw wrapErr(e) }),
      delete: () => deleteDoc(ref).catch(e => { throw wrapErr(e) }),
      onSnapshot: (cb, err) => onSnapshot(ref, s => cb(docSnap(s)), e => err && err(wrapErr(e))),
    };
  };
  const q = (coll: string, filters: [string, Op, unknown][]): Query => {
    const build = (fl: typeof filters) => query(collection(fs, coll), ...fl.map(f => where(f[0], f[1], f[2])));
    const eqOnly = filters.filter(f => !RANGE.has(f[1]));
    const wrapDocs = (s: any, filterLocally: boolean) => (s.docs as any[]).map(docSnap)
      .filter(d => !filterLocally || filters.every(f => test(d.data()![f[0]], f[1], f[2])));
    // A range filter beside an equality filter needs a composite index. If the project lacks it,
    // ask for the equality part only and apply the range here, so the app works before the index exists.
    const needsIndex = (e: any) => bare(e) === 'failed-precondition' && eqOnly.length < filters.length;
    return {
      where: (f, op, v) => q(coll, filters.concat([[f, op, v]])),
      get: () => getDocs(build(filters)).then(s => qSnap(wrapDocs(s, false)), e => {
        if (needsIndex(e)) return getDocs(build(eqOnly)).then(s => qSnap(wrapDocs(s, true)), e2 => { throw wrapErr(e2) });
        throw wrapErr(e);
      }),
      onSnapshot: (cb, err) => {
        let un: (() => void) | null = null, dead = false;
        const start = (fl: typeof filters, local: boolean): (() => void) => onSnapshot(build(fl), s => cb(qSnap(wrapDocs(s, local))), e => {
          if (!local && needsIndex(e) && !dead) { un = start(eqOnly, true); return }
          err && err(wrapErr(e));
        });
        un = start(filters, false);
        return () => { dead = true; un && un() };
      },
    };
  };
  return { collection: c => q(c, []), doc: docRef };
}

// Each error carries a short reason plus Hinglish wording (same table as wd-sync.js)
const AUTH_ERR: Record<string, [string, string]> = {
  'invalid-verification-code': ['wrong_code', 'OTP galat hai. SMS dekh ke dobara daalo.'],
  'code-expired': ['expired', 'OTP purana ho gaya. Naya OTP mangao.'],
  'session-expired': ['expired', 'OTP purana ho gaya. Naya OTP mangao.'],
  'invalid-phone-number': ['bad_number', 'Number sahi nahi lag raha.'],
  'too-many-requests': ['too_many', 'Bahut baar try hua. Thodi der baad try karo.'],
  'quota-exceeded': ['too_many', 'Abhi OTP nahi ja raha. Thodi der baad try karo.'],
  'network-request-failed': ['offline', 'Internet nahi hai. Signal dekh ke dobara try karo.'],
  'app-not-authorized': ['setup', 'App abhi Firebase mein register nahi hai. Ravi ko batao.'],
  'missing-client-identifier': ['setup', 'App abhi Firebase mein register nahi hai. Ravi ko batao.'],
  'missing-verification-code': ['wrong_code', '6 number ka OTP daalo.'],
};
const authErr = (e: any): AuthError => {
  const m = AUTH_ERR[bare(e)] || ['failed', 'Login nahi hua. Dobara try karo.'];
  return Object.assign(new Error(m[1]), { code: m[0], hi: m[1] });
};

function makeAuth(): Auth {
  const auth = getAuth();
  let user = auth.currentUser, confirmer: any = null, sentTo: string | null = null;
  const subs = new Set<(p: string | null) => void>();
  let resolveReady: (p: string | null) => void;
  const readyP = new Promise<string | null>(r => { resolveReady = r });
  onAuthStateChanged(auth, (u: any) => {
    user = u; resolveReady(u?.phoneNumber ?? null);
    subs.forEach(f => { try { f(u?.phoneNumber ?? null) } catch (e) { } });
  });
  return {
    real: true,
    codeLength: 6,
    ready: () => readyP,
    phone: () => user?.phoneNumber ?? null,
    onChange(cb) { subs.add(cb); return () => { subs.delete(cb) } },
    async send(p10) {
      if (!/^\d{10}$/.test(p10)) throw authErr({ code: 'auth/invalid-phone-number' });
      sentTo = '+91' + p10;
      try { confirmer = await signInWithPhoneNumber(auth, sentTo) } catch (e) { confirmer = null; throw authErr(e) }
    },
    async confirm(code) {
      // Android can read the SMS itself and sign in before the washer types anything
      if (user?.phoneNumber && user.phoneNumber === sentTo) return;
      if (!confirmer) throw authErr({ code: 'auth/code-expired' });
      try { await confirmer.confirm(code.replace(/\D/g, '')); confirmer = null }
      catch (e) {
        if (auth.currentUser?.phoneNumber && auth.currentUser.phoneNumber === sentTo) return;
        throw authErr(e);
      }
    },
    async signOut() { confirmer = null; try { await signOut(auth) } catch (e) { } },
    async idToken() { try { return auth.currentUser ? await auth.currentUser.getIdToken() : null } catch (e) { return null } },
  };
}

// null when this build has no Firebase config: the app then runs on the demo store
export function firebaseBackend(): Backend | null {
  try {
    if (!getApps().length) return null;
    return { mode: 'live', db: makeDb(), auth: makeAuth() };
  } catch (e) {
    console.warn('firebase', e);
    return null;
  }
}
