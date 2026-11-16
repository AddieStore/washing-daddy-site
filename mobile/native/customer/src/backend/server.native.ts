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
    try { r = await fetch(N8N + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) }) }
    catch (e) { throw err('No internet. Check your signal and try again.') }
    if (r.status === 404) throw err('This is not available yet. WhatsApp us on 77018 08924.', { notReady: true, status: 404 });
    const j: any = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) throw err((j && j.message) || `That didn't go through (server answered ${r.status}). Nothing was charged.`, { status: r.status });
    return j;
  },
} : null;
