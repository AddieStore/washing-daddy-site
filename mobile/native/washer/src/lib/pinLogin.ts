// Phone + PIN login (no SMS). The manager sets a 4-6 digit PIN in the approvals page; n8n workflow 12
// (POST wd-washer-pin) checks it and answers with a Firebase custom token for the washer's own phone-number user.
// This file only talks to that webhook and turns its answer into one of a few codes; the store signs in.

export type PinCode = 'bad_pin' | 'locked' | 'not_set' | 'not_washer' | 'server' | 'offline';
export type PinResult = { ok: true; token: string } | { ok: false; code: PinCode };

// Hinglish wording for each code (the screen passes it through t())
export const PIN_MSG: Record<PinCode, string> = {
  bad_pin: 'PIN galat hai. Dobara daalo.',
  locked: 'Bahut baar galat PIN. 15 minute baad try karo.',
  not_set: 'Aapka PIN abhi set nahi hai. Manager se PIN lo.',
  not_washer: 'Yeh number washer list mein nahi hai. Manager se baat karo.',
  server: 'Abhi login nahi ho raha. Thodi der baad try karo.',
  offline: 'Internet nahi hai. Net dekh ke dobara try karo.',
};

export const isPhone10 = (v: string) => /^[6-9]\d{9}$/.test(v);
export const isPin = (v: string) => /^\d{4,6}$/.test(v);
const CODES = new Set<PinCode>(['bad_pin', 'locked', 'not_set', 'not_washer', 'server']);

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal; cache?: 'no-store' }) =>
  Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export async function requestPinToken(url: string, phone10: string, pin: string, fetchImpl: FetchLike = fetch as any, timeoutMs = 15000): Promise<PinResult> {
  if (!isPhone10(phone10) || !isPin(pin)) return { ok: false, code: 'bad_pin' };
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const to = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone: phone10, pin }),
      signal: ctl?.signal,
    });
  } catch (e) {
    return { ok: false, code: 'offline' };   // no signal, DNS, or the 15 s timeout
  } finally {
    if (to) clearTimeout(to);
  }
  let j: any = null;
  try { j = await res.json() } catch (e) { j = null }
  if (j && j.ok === true && typeof j.token === 'string' && j.token.split('.').length === 3) return { ok: true, token: j.token };
  if (j && j.ok === false && CODES.has(j.code)) return { ok: false, code: j.code };
  return { ok: false, code: 'server' };
}
