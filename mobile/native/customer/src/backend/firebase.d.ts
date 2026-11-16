// Types for the platform files: firebase.native.ts on phones, firebase.web.ts in the preview.
import type { Backend } from './types';
export declare const backend: Backend | null;
/** web preview opened with ?release=1: REAL code paths on an empty in-memory Firestore (release check). Always false on phones. */
export declare const SIM_RELEASE: boolean;
