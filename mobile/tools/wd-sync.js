/* Washing Daddy sync shim.
   Inside the claude.ai artifact the page already has window.claude.use('db'), so this file does nothing there.
   Everywhere else (washingdaddy.com, the Android APKs, an iPhone home-screen app) it defines window.claude.use
   and answers 'db' with Firebase Firestore, shaped like the artifact db the apps were written against:
   collection(c).where(f,op,v).onSnapshot/get, collection(c).doc(id?), doc(path).set/update/get/onSnapshot.
   Collections: washes, requests, ratings (see .notes/sync-contract.md). */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  connectFirestoreEmulator, collection, doc, query, where, onSnapshot, getDocs, getDoc, setDoc, updateDoc,
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

  async function init() {
    const cfg = window.WD_FIREBASE || DEFAULT_CONFIG;
    if (!cfg || !cfg.apiKey || !cfg.projectId) return null;
    let emu = null;
    try { emu = localStorage.getItem('wd-firestore-emulator') } catch (e) {}
    const app = initializeApp(cfg, 'wd-sync');
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
    } else {
      // Anonymous sign-in, so the security rules can require a signed-in app. Never blocks the app:
      // if it fails (provider off, no signal) the db is still handed over and the rules decide.
      try {
        const auth = getAuth(app);
        await Promise.race([
          new Promise(res => { const un = onAuthStateChanged(auth, u => { if (u) { un(); res(u) } }) ; signInAnonymously(auth).catch(() => res(null)) }),
          new Promise(res => setTimeout(res, 4000)),
        ]);
      } catch (e) {}
    }
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
