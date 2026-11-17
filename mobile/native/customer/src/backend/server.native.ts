// Money and security calls to n8n (pronto-video-2026-11-15/BACKEND.md). The phone is never trusted with amounts:
// every call sends a Firebase ID token, n8n verifies it, takes the phone number from the token (never from the body),
// prices the order itself and writes wallets/passes/referrals/refunds with a service account (rules block clients).
import { backend } from './firebase';
import type { Server, ServerError } from './server.d';

const N8N = 'https://n8n.washingdaddy.com/webhook/';
const err = (msg: string, extra: Partial<ServerError> = {}): ServerError => Object.assign(new Error(msg), extra);

export const server: Server | null = backend ? {
  async call(path, body) {
    const tok = await backend!.auth.idToken();
    if (!tok) throw err('Sign in again to continue.', { status: 401 });
    let r: Response;
    // A hung request would leave the button spinning forever. After 30 s we stop waiting, but the server may still
    // have done it, so the message sends the customer to look before trying again (workflow 13 also de-duplicates
    // the same request for 2 minutes).
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 30000) : null;
    try { r = await fetch(N8N + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body), ...(ac ? { signal: ac.signal } : {}) }) }
    catch (e: any) {
      if (e && e.name === 'AbortError') throw err('The server is taking too long. Check Bookings and WD Money before you try again.', { status: 0 });
      throw err('No internet. Check your signal and try again.');
    }
    finally { if (timer) clearTimeout(timer) }
    // n8n answers 404 only when the webhook is not registered (workflow 13 not imported/published). Workflow 13
    // itself never answers 404, so this stays a safe "not live yet" signal for the app's fallbacks.
    if (r.status === 404) throw err('This is not available yet. WhatsApp us on 77018 08924.', { notReady: true, status: 404 });
    const j: any = await r.json().catch(() => null);
    // Only messages written by workflow 13 ({ ok:false, message }) are shown as they are. n8n's own errors
    // ("Error in workflow", "Workflow could not be started!") are replaced by a plain sentence.
    if (!r.ok || !j || j.ok === false) {
      const own = j && j.ok === false && typeof j.message === 'string' && j.message;
      throw err(own || `That didn't go through (server answered ${r.status}). Nothing was charged. If it keeps happening, WhatsApp us on 77018 08924.`, { status: r.status });
    }
    return j;
  },
} : null;
