// FCM token of this phone, saved on the washer's own doc (washers/<phone>.push_token) so the server can push an
// 'extra kaam' to the phone even when the app is closed. Installed app with real Firebase only; demo / web do nothing.
// The notification permission itself is asked by setupWashAlerts (washAlerts.ts), not here.
import { Platform } from 'react-native';
import { backend } from '../backend';
import { isoIST } from './time';

const { db, auth } = backend;
const NATIVE = Platform.OS === 'android' || Platform.OS === 'ios';
let unsub: (() => void) | null = null;
let last = '';

async function save(token: string) {
  const phone = auth.phone(); if (!phone || !token) return;
  try { await db.doc('washers/' + phone).update({ push_token: token, push_at: isoIST() }); last = token }
  catch (e) { console.warn('push token save', e) }
}

/** Get the FCM token, save it, and keep it fresh when Firebase rotates it. Safe to call again. */
export async function registerPushToken(): Promise<void> {
  if (!NATIVE || !auth.real || unsub) return;
  try {
    const m = await import('@react-native-firebase/messaging');
    const msg = m.getMessaging();
    unsub = m.onTokenRefresh(msg, t => { void save(t) });
    await save(await m.getToken(msg));
  } catch (e) { console.warn('push token', e) }
}

/** On logout: stop listening and blank the token on the doc (best effort; call before signing out). */
export async function clearPushToken(): Promise<void> {
  if (unsub) { unsub(); unsub = null }
  if (!NATIVE || !auth.real) return;
  const phone = auth.phone(); if (!phone || !last) return;
  try { await db.doc('washers/' + phone).update({ push_token: '', push_at: isoIST() }); last = '' }
  catch (e) { console.warn('push token clear', e) }
}
