// The small surface the app needs from the backend. Same shape as wd-sync.js gave the web app, so the
// app logic ported over unchanged. Native builds get Firebase (firebase.native.ts); the web build, which is
// only the Claude preview, gets none and runs on test data.
export type Snap = { id: string; exists: boolean; data: () => any };
export type Unsub = () => void;
export type DocRef = {
  id: string;
  get(): Promise<Snap>;
  set(data: object): Promise<void>;
  update(patch: object): Promise<void>;
  onSnapshot(cb: (s: Snap) => void, err?: (e: any) => void): Unsub;
};
export type Query = {
  where(field: string, op: '==' | 'in' | 'array-contains', v: unknown): Query;
  onSnapshot(cb: (docs: Snap[]) => void, err?: (e: any) => void): Unsub;
  doc(id?: string): DocRef;
  add(data: object): Promise<{ id: string }>;
};
export type Db = { doc(path: string): DocRef; collection(name: string): Query };

export type AuthError = Error & { code: string; en: string };
export type Auth = {
  ready(): Promise<unknown>;
  phone(): string | null;      // '+919876504210', the doc id for customers/
  phone10(): string | null;    // '9876504210'
  uid(): string | null;
  send(phone10: string): Promise<{ ok: true }>;
  confirm(code: string): Promise<{ uid: string }>;
  signOut(): Promise<void>;
  onChange(f: (signedIn: boolean) => void): Unsub;
};
export type Backend = { db: Db; auth: Auth };
