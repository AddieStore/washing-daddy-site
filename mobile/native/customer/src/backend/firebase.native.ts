// Firebase on the phone: native phone sign-in (SMS code) and Firestore, through @react-native-firebase.
// The project and the security rules are the ones the web app used (mobile/firebase/firestore.rules):
// rules key everything on request.auth.token.phone_number, which native phone sign-in sets the same way.
// Needs google-services.json / GoogleService-Info.plist for com.washingdaddy.customer (see README.md).
// A build without those files (app.config.ts leaves the Firebase plugins out), or with EXPO_PUBLIC_DEMO=1,
// runs on test data instead, like the preview.
import Constants from 'expo-constants';
import { getAuth, onAuthStateChanged, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import {
  getFirestore, doc, collection, query, where, onSnapshot, getDoc, setDoc, updateDoc, addDoc,
} from '@react-native-firebase/firestore';
import type { Auth, AuthError, Backend, Db, DocRef, Query, Snap } from './types';

const AUTH_ERR: Record<string, [string, string]> = {
  'auth/invalid-verification-code': ['wrong_code', 'That code is wrong. Check the SMS and try again.'],
  'auth/code-expired': ['expired', 'That code has expired. Tap resend for a new one.'],
  'auth/session-expired': ['expired', 'That code has expired. Tap resend for a new one.'],
  'auth/invalid-phone-number': ['bad_number', "That number doesn't look right."],
  'auth/too-many-requests': ['too_many', 'Too many tries from this phone. Wait a few minutes and try again.'],
  'auth/quota-exceeded': ['too_many', "We can't send more codes right now. Try again in a while."],
  'auth/network-request-failed': ['offline', 'No internet. Check your signal and try again.'],
  'auth/missing-verification-code': ['wrong_code', 'Enter the 6-digit code.'],
  'auth/app-not-authorized': ['setup', "This app isn't set up for sign-in yet. Call us on 77018 08924."],
  'auth/missing-client-identifier': ['setup', "This app isn't set up for sign-in yet. Call us on 77018 08924."],
};
const authErr = (e: any): AuthError => {
  const m = AUTH_ERR[(e && e.code) || ''] || ['failed', "Couldn't sign in. Try again."];
  return Object.assign(new Error(m[1]), { code: m[0], en: m[1], cause: e });
};
const e164 = (p: string) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? '+91' + d : null };

function makeAuth(): Auth {
  const auth = getAuth();
  let confirmer: any = null, user: any = auth.currentUser;
  const listeners = new Set<(b: boolean) => void>();
  const ready = new Promise(res => onAuthStateChanged(auth, (u: any) => { user = u; res(u); listeners.forEach(f => { try { f(!!u) } catch (e) {} }) }));
  return {
    ready: () => ready,
    phone: () => (user && user.phoneNumber) || null,
    phone10: () => (user && user.phoneNumber ? String(user.phoneNumber).slice(-10) : null),
    uid: () => (user && user.uid) || null,
    async send(phone) {
      const num = e164(phone); if (!num) throw authErr({ code: 'auth/invalid-phone-number' });
      try { confirmer = await signInWithPhoneNumber(auth, num); return { ok: true } } catch (e) { confirmer = null; throw authErr(e) }
    },
    async confirm(code) {
      // Android can read the SMS itself and sign in before the code is typed
      if (user && user.phoneNumber) return { uid: user.uid };
      if (!confirmer) throw authErr({ code: 'auth/code-expired' });
      try { const r = await confirmer.confirm(String(code).replace(/\D/g, '')); user = r.user; confirmer = null; return { uid: r.user.uid } }
      catch (e) { if (auth.currentUser && auth.currentUser.phoneNumber) { user = auth.currentUser; return { uid: user.uid } } throw authErr(e) }
    },
    async signOut() { confirmer = null; try { await signOut(auth) } catch (e) {} user = null },
    onChange(f) { listeners.add(f); return () => { listeners.delete(f) } },
  };
}

function makeDb(): Db {
  const fs = getFirestore();
  const snap = (s: any): Snap => ({ id: s.id, exists: typeof s.exists === 'function' ? s.exists() : !!s.exists, data: () => s.data() });
  const ref = (r: any): DocRef => ({
    id: r.id,
    get: () => getDoc(r).then(snap),
    set: d => setDoc(r, d),
    update: p => updateDoc(r, p),
    onSnapshot: (cb, err) => onSnapshot(r, (s: any) => cb(snap(s)), (e: any) => err && err(e)),
  });
  const q = (name: string, filters: [string, any, unknown][]): Query => ({
    where: (f, op, v) => q(name, filters.concat([[f, op, v]])),
    onSnapshot: (cb, err) => onSnapshot(query(collection(fs, name), ...filters.map(f => where(f[0], f[1], f[2]))),
      (s: any) => cb(s.docs.map(snap)), (e: any) => err && err(e)),
    doc: id => ref(id ? doc(fs, name, id) : doc(collection(fs, name))),
    add: d => addDoc(collection(fs, name), d).then((r: any) => ({ id: r.id })),
  });
  return { doc: path => ref(doc(fs, path)), collection: name => q(name, []) };
}

const configured = !!(Constants.expoConfig?.extra as any)?.firebase && process.env.EXPO_PUBLIC_DEMO !== '1';
export const backend: Backend | null = configured ? { auth: makeAuth(), db: makeDb() } : null;
