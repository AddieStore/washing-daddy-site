/* Washing Daddy sync shim.
   Inside the claude.ai artifact the page already has window.claude.use('db'), so this file does nothing there.
   Everywhere else (washingdaddy.com, the Android APKs, an iPhone home-screen app) it defines window.claude.use
   and answers 'db' with Firebase Firestore, shaped like the artifact db the apps were written against:
   collection(c).where(f,op,v).onSnapshot/get, collection(c).doc(id?), doc(path).set/update/get/onSnapshot.
   Collections: washes, requests, ratings, washers, customers (see .notes/sync-contract.md).
   It also defines window.WDAuth: real phone sign-in (Firebase Phone Auth, SMS OTP). The apps use it when
   present and fall back to their test login (OTP 1234) inside the artifact, where it is absent. */
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, connectAuthEmulator, RecaptchaVerifier, signInWithPhoneNumber, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  connectFirestoreEmulator, collection, doc, query, where, onSnapshot, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';

const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyAFNwmEFj4BywMcIsWndyZ2BoI_82-pSac',
  authDomain: 'gen-lang-client-0799769592.firebaseapp.com',
  projectId: 'gen-lang-client-0799769592',
  appId: '1:82190943726:web:36ab06c79b2a00c842faff',
};

(function () {
  if (window.claude && typeof window.claude.use === 'function') return;   // inside the artifact: use its own db

  let ready = null;
  const RANGE = new Set(['<', '<=', '>', '>=', '!=']);
  const test = (a, op, b) => op === '==' ? a === b : op === '!=' ? a !== b : op === '<' ? a < b : op === '<=' ? a <= b
    : op === '>' ? a > b : op === '>=' ? a >= b : op === 'in' ? (b || []).includes(a)
    : op === 'array-contains' ? Array.isArray(a) && a.includes(b) : true;

  // The apps check e.code: 'unavailable' means retry, 'invalid_argument' means the store refused for good.
  const wrapErr = e => {
    const c = (e && e.code) || '';
    const out = new Error((e && e.message) || String(e));
    out.code = c === 'permission-denied' || c === 'invalid-argument' ? 'invalid_argument'
      : c === 'unavailable' || c === 'deadline-exceeded' ? 'unavailable' : c.replace(/-/g, '_');
    out.cause = e;
    return out;
  };
  const docSnap = s => ({ id: s.id, exists: s.exists(), data: () => (s.exists() ? s.data() : undefined) });
  const qSnap = (docs) => ({ docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f) });

  function DocRef(fs, path) {
    const ref = doc(fs, path);
    return {
      id: ref.id, path: ref.path,
      set: (data) => setDoc(ref, data).catch(e => { throw wrapErr(e) }),
      update: (patch) => updateDoc(ref, patch).catch(e => { throw wrapErr(e) }),
      delete: () => deleteDoc(ref).catch(e => { throw wrapErr(e) }),
      get: () => getDoc(ref).then(docSnap, e => { throw wrapErr(e) }),
      onSnapshot: (cb, err) => onSnapshot(ref, s => cb(docSnap(s)), e => err && err(wrapErr(e))),
    };
  }

  function Query(fs, coll, filters) {
    const build = (fl) => query(collection(fs, coll), ...fl.map(f => where(f[0], f[1], f[2])));
    const eqOnly = filters.filter(f => !RANGE.has(f[1]));
    const local = (d) => filters.every(f => test(d.data()[f[0]], f[1], f[2]));
    const wrapDocs = (s, filterLocally) => s.docs.map(docSnap).filter(d => !filterLocally || local(d));
    // A range filter beside an equality filter needs a composite index. If the project lacks it,
    // ask for the equality part only and apply the range here, so the app works before the index exists.
    const needsIndex = e => e && e.code === 'failed-precondition' && eqOnly.length < filters.length;
    return {
      where: (f, op, v) => Query(fs, coll, filters.concat([[f, op, v]])),
      doc: (id) => DocRef(fs, id ? coll + '/' + id : doc(collection(fs, coll)).path),
      get: () => getDocs(build(filters)).then(s => qSnap(wrapDocs(s, false)), e => {
        if (needsIndex(e)) return getDocs(build(eqOnly)).then(s => qSnap(wrapDocs(s, true)), e2 => { throw wrapErr(e2) });
        throw wrapErr(e);
      }),
      onSnapshot: (cb, err) => {
        let un = null, dead = false;
        const start = (fl, filterLocally) => onSnapshot(build(fl), s => cb(qSnap(wrapDocs(s, filterLocally))), e => {
          if (!filterLocally && needsIndex(e) && !dead) { un = start(eqOnly, true); return }
          err && err(wrapErr(e));
        });
        un = start(filters, false);
        return () => { dead = true; un && un() };
      },
    };
  }

  function Db(fs) {
    return {
      collection: (c) => Query(fs, c, []),
      doc: (path) => DocRef(fs, path),
    };
  }

  // The emulator switch and the config override are developer tools: honour them on localhost only, never on the live site
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  let emu = null;
  try { if (local) emu = localStorage.getItem('wd-firestore-emulator') } catch (e) {}
  const cfg = (local && window.WD_FIREBASE) || DEFAULT_CONFIG;
  const app = initializeApp(cfg, 'wd-sync');

  /* ---------- phone sign-in ---------- */
  const auth = getAuth(app);
  auth.languageCode = 'en';
  if (emu) {
    connectAuthEmulator(auth, 'http://' + emu.split(':')[0] + ':9099', { disableWarnings: true });
    auth.settings.appVerificationDisabledForTesting = true;
  }
  let user = null, confirmer = null, verifier = null;
  const listeners = new Set();
  const authReady = new Promise(res => onAuthStateChanged(auth, u => {
    user = u; res(u); listeners.forEach(f => { try { f(u) } catch (e) {} });
  }));
  // Each error carries a short reason plus wording for both apps (customer: English, washer: Hinglish).
  const AUTH_ERR = {
    'auth/invalid-verification-code': ['wrong_code', 'That code is wrong. Check the SMS and try again.', 'OTP galat hai. SMS dekh ke dobara daalo.'],
    'auth/code-expired': ['expired', 'That code has expired. Tap resend for a new one.', 'OTP purana ho gaya. Naya OTP mangao.'],
    'auth/session-expired': ['expired', 'That code has expired. Tap resend for a new one.', 'OTP purana ho gaya. Naya OTP mangao.'],
    'auth/invalid-phone-number': ['bad_number', "That number doesn't look right.", 'Number sahi nahi lag raha.'],
    'auth/too-many-requests': ['too_many', 'Too many tries from this phone. Wait a few minutes and try again.', 'Bahut baar try hua. Thodi der baad try karo.'],
    'auth/quota-exceeded': ['too_many', "We can't send more codes right now. Try again in a while.", 'Abhi OTP nahi ja raha. Thodi der baad try karo.'],
    'auth/network-request-failed': ['offline', 'No internet. Check your signal and try again.', 'Internet nahi hai. Signal dekh ke dobara try karo.'],
    'auth/captcha-check-failed': ['captcha', 'The security check failed. Try again.', 'Security check fail hua. Dobara try karo.'],
    'auth/missing-verification-code': ['wrong_code', 'Enter the 6-digit code.', '6 number ka OTP daalo.'],
  };
  const authErr = e => {
    const c = (e && e.code) || '';
    const m = AUTH_ERR[c] || ['failed', "Couldn't sign in. Try again.", 'Login nahi hua. Dobara try karo.'];
    const out = new Error(m[1]);
    out.code = m[0]; out.en = m[1]; out.hi = m[2]; out.cause = e;
    return out;
  };
  function freshVerifier() {
    try { verifier && verifier.clear() } catch (e) {}
    let box = document.getElementById('wd-recaptcha');
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'wd-recaptcha';
    document.body.appendChild(box);
    verifier = new RecaptchaVerifier(auth, box, { size: 'invisible' });
    return verifier;
  }
  const e164 = p => {
    const d = String(p || '').replace(/\D/g, '').slice(-10);
    return d.length === 10 ? '+91' + d : null;
  };
  window.WDAuth = {
    ready: () => authReady,
    user: () => user,
    // the signed-in number: '+919876504210' (doc id for washers/ and customers/) and '9876504210'
    phone: () => (user && user.phoneNumber) || null,
    phone10: () => (user && user.phoneNumber ? user.phoneNumber.slice(-10) : null),
    onChange(f) { listeners.add(f); return () => listeners.delete(f) },
    async send(phone) {
      const num = e164(phone);
      if (!num) throw authErr({ code: 'auth/invalid-phone-number' });
      try { confirmer = await signInWithPhoneNumber(auth, num, freshVerifier()); return { ok: true, phone: num } }
      catch (e) { confirmer = null; throw authErr(e) }
    },
    async confirm(code) {
      if (!confirmer) throw authErr({ code: 'auth/code-expired' });
      try { const r = await confirmer.confirm(String(code).replace(/\D/g, '')); user = r.user; confirmer = null; return r.user }
      catch (e) { throw authErr(e) }
    },
    async signOut() { confirmer = null; try { await signOut(auth) } catch (e) {} user = null },
  };

  async function init() {
    if (!cfg || !cfg.apiKey || !cfg.projectId) return null;
    let fs;
    try {
      fs = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true,
        localCache: emu ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch (e) {
      fs = initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: memoryLocalCache() });
    }
    if (emu) {
      const [h, p] = emu.split(':');
      connectFirestoreEmulator(fs, h, Number(p));
    }
    // let the saved sign-in come back first, so the first queries go out as the signed-in phone
    await Promise.race([authReady, new Promise(res => setTimeout(res, 4000))]);
    return Db(fs);
  }

  window.claude = {
    wdShim: true,
    use(name) {
      if (name !== 'db') return Promise.resolve(null);
      if (!ready) ready = init().catch(e => { console.warn('wd-sync', e); return null });
      return ready;
    },
  };
})();
