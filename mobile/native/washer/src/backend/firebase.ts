// Web build (the Claude preview): no native Firebase, so the app runs on the demo store.
import type { Backend } from './types';

export function firebaseBackend(): Backend | null {
  return null;
}
