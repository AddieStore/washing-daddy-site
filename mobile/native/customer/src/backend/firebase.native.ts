// Firebase on the phone: native phone sign-in (SMS code) and Firestore, through @react-native-firebase.
// The project and the security rules are the ones the web app used (mobile/firebase/firestore.rules):
// rules key everything on request.auth.token.phone_number, which native phone sign-in sets the same way.
// Needs google-services.json / GoogleService-Info.plist for com.washingdaddy.customer (see README.md).
// A build without those files (app.config.ts leaves the Firebase plugins out), or with EXPO_PUBLIC_DEMO=1,
// runs on test data instead, like the preview.
import Constants from 'expo-constants';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import {
  getFirestore, doc, collection, query, where, onSnapshot, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
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
  const raw = String((e && e.code) || '');
  const m = AUTH_ERR[raw] || ['failed', "Couldn't sign in. Try again."];
  // the Firebase code is shown for setup problems and unknown errors, so a screenshot tells us the real cause
  const msg = m[0] === 'setup' || m[0] === 'failed' ? `${m[1]} (${raw || 'no code'})` : m[1];
  return Object.assign(new Error(msg), { code: m[0], en: msg, cause: e });
};
const e164 = (p: string) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? '+91' + d : null };

/* ---------- WhatsApp code (n8n workflow 15: wd-wa-otp-send / wd-wa-otp-verify) ---------- */
const N8N = 'https://n8n.washingdaddy.com/webhook/';
const WA_ERR: Record<string, string> = {
  bad_number: "That number doesn't look right.",
  use_sms: 'This number signs in by SMS.',
  too_many: 'Too many codes for this number. Wait a while and try again.',
  not_on_whatsapp: "This number isn't on WhatsApp. We'll send an SMS instead.",
  bad_code: 'Enter the 6-digit code.',
  wrong_code: 'That code is wrong. Check WhatsApp and try again.',
  expired: 'That code has expired. Tap resend for a new one.',
  server: "We couldn't send the code right now. Try again in a minute.",
};
const waErr = (code: string, extra = ''): AuthError => { const m = (WA_ERR[code] || "Couldn't sign in. Try again.") + extra; return Object.assign(new Error(m), { code, en: m }) };
async function waPost(path: string, body: object): Promise<any> {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 20000);
  let r: Response;
  try { r = await fetch(N8N + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal }) }
  catch (e) { throw Object.assign(new Error('No internet. Check your signal and try again.'), { code: 'offline', en: 'No internet. Check your signal and try again.' }) }
  finally { clearTimeout(t) }
  // n8n answers 404 only when the webhook is not registered: workflow 15 is not imported/published yet
  if (r.status === 404) throw Object.assign(new Error('WhatsApp codes are not live yet.'), { code: 'not_ready', en: 'WhatsApp codes are not live yet.' });
  const j: any = await r.json().catch(() => null);
  if (!j || j.ok !== true) {
    const c = (j && typeof j.code === 'string' && j.code) || 'server';
    throw waErr(c);
  }
  return j;
}

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
    async sendWhatsApp(phone10) {
      if (!e164(phone10)) throw authErr({ code: 'auth/invalid-phone-number' });
      try { await waPost('wd-wa-otp-send', { phone: phone10 }); confirmer = null; return { ok: true } }
      catch (e: any) { if (e && e.code === 'wait') throw Object.assign(new Error('A code was just sent. Wait a few seconds and try again.'), { code: 'wait', en: 'A code was just sent. Wait a few seconds and try again.' }); throw e }
    },
    async confirmWhatsApp(phone10, code) {
      const j = await waPost('wd-wa-otp-verify', { phone: phone10, code: String(code).replace(/\D/g, '') });
      let cred: any;
      try { cred = await signInWithCustomToken(auth, j.token) } catch (e) { throw authErr(e) }
      user = cred?.user ?? auth.currentUser;
      // the rules know a customer only by the phone number on the Firebase user
      if (!user?.phoneNumber) { try { await signOut(auth) } catch (e) {} throw authErr({ code: 'auth/invalid-custom-token' }) }
      return { uid: user.uid };
    },
    async idToken() { try { return user ? await user.getIdToken() : null } catch (e) { return null } },
    async signOut() { confirmer = null; try { await signOut(auth) } catch (e) {} user = null },
    onChange(f) { listeners.add(f); return () => { listeners.delete(f) } },
  };
}

function makeDb(): Db {
  const fs = getFirestore();
  const snap = (s: any): Snap => ({ id: s.id, exists: typeof s.exists === 'function' ? s.exists() : !!s.exists, data: () => s.data(), fromCache: !!(s.metadata && s.metadata.fromCache) });
  const ref = (r: any): DocRef => ({
    id: r.id,
    get: () => getDoc(r).then(snap),
    set: d => setDoc(r, d),
    update: p => updateDoc(r, p),
    delete: () => deleteDoc(r),
    onSnapshot: (cb, err) => onSnapshot(r, (s: any) => cb(snap(s)), (e: any) => err && err(e)),
  });
  const q = (name: string, filters: [string, any, unknown][]): Query => ({
    where: (f, op, v) => q(name, filters.concat([[f, op, v]])),
    onSnapshot: (cb, err) => onSnapshot(query(collection(fs, name), ...filters.map(f => where(f[0], f[1], f[2]))),
      (s: any) => cb(s.docs.map(snap), { fromCache: !!(s.metadata && s.metadata.fromCache) }), (e: any) => err && err(e)),
    doc: id => ref(id ? doc(fs, name, id) : doc(collection(fs, name))),
    add: d => addDoc(collection(fs, name), d).then((r: any) => ({ id: r.id })),
  });
  return { doc: path => ref(doc(fs, path)), collection: name => q(name, []) };
}

const configured = !!(Constants.expoConfig?.extra as any)?.firebase && process.env.EXPO_PUBLIC_DEMO !== '1';
export const backend: Backend | null = configured ? { auth: makeAuth(), db: makeDb() } : null;
export const SIM_RELEASE = false;
