import { demoBackend } from './demo';
import { firebaseBackend } from './firebase';
import type { Backend } from './types';

export * from './types';

// EXPO_PUBLIC_DEMO=1 builds a demo app (sample round, OTP 1234) even when Firebase is configured
const forceDemo = process.env.EXPO_PUBLIC_DEMO === '1';
export const backend: Backend = (!forceDemo && firebaseBackend()) || demoBackend();
