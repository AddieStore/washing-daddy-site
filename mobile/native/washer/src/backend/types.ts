// The one small data interface every screen goes through, shaped like the web apps' `db`
// (window.claude.use('db') in the artifact, wd-sync.js on washingdaddy.com), so the logic ports 1:1:
//   db.doc('washes/2026-10-29_DL4CAB2731').set(...)
//   db.collection('washes').where('washer_id','==','chotte').onSnapshot(...)
// Two implementations: Firestore through React Native Firebase (the installed app) and an in-memory
// demo store (the preview, and any build without Firebase config).
export type Data = Record<string, any>;
export type Unsub = () => void;
export type DocSnap = { id: string; exists: boolean; data: () => Data | undefined };
export type QuerySnap = { docs: DocSnap[]; size: number; empty: boolean };
// e.code: 'unavailable' means retry later; 'invalid_argument' means the store refused for good
export type DbError = Error & { code?: string };
export type Op = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';

export interface DocRef {
  id: string;
  path: string;
  get(): Promise<DocSnap>;
  set(data: Data): Promise<void>;
  update(patch: Data): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(cb: (s: DocSnap) => void, err?: (e: DbError) => void): Unsub;
}
export interface Query {
  where(field: string, op: Op, value: unknown): Query;
  get(): Promise<QuerySnap>;
  onSnapshot(cb: (s: QuerySnap) => void, err?: (e: DbError) => void): Unsub;
}
export interface Db {
  collection(name: string): Query;
  doc(path: string): DocRef;
}

// Phone sign-in. The installed app sends a real 6-digit SMS code; the demo takes 1234.
export interface Auth {
  real: boolean;
  codeLength: number;
  ready(): Promise<string | null>;
  phone(): string | null;            // '+919876504210': the doc id in washers/
  onChange(cb: (phone: string | null) => void): Unsub;
  send(phone10: string): Promise<void>;
  confirm(code: string): Promise<void>;
  signOut(): Promise<void>;
}
// Thrown by send/confirm: a short reason plus Hinglish wording for the screen
export type AuthError = Error & { code: string; hi: string };

export type Backend = { mode: 'live' | 'demo'; db: Db; auth: Auth };
