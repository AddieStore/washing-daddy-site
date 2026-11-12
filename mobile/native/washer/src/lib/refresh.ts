// One "pull to refresh" for every tab: runs the store's existing load/listen entry points and gives up after ~6s.
// Nothing here changes how they work; it only calls them. Safe in demo mode (Book.load only marks the demo) and offline
// (each call fails quietly, the wait is capped).
import { Book, Hist, Sync } from '../state/store';
import { refreshLocality } from './geo';

const CAP_MS = 6000;

export async function refreshAll(): Promise<void> {
  const quiet = (f: () => unknown) => { try { return Promise.resolve(f()).catch(() => {}); } catch { return Promise.resolve(); } };
  const work = Promise.all([
    quiet(() => Sync.flush()),     // what the sync sheet's "send now" runs
    quiet(() => Book.load()),      // today's list; also restarts Sync.listen()
    quiet(() => Hist.load()),      // this month's finished washes
    quiet(() => refreshLocality()),
  ]);
  await Promise.race([work, new Promise<void>((r) => setTimeout(r, CAP_MS))]);
}
