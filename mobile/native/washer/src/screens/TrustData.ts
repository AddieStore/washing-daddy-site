// Reads the washer's real records out of the store and turns them into trust flags (see lib/trust.ts).
import { DOC_KINDS, Docs, Kit, me, myPhoto } from '../state/store';
import { trustOf } from '../lib/trust';

export const myTrust = () => trustOf({ profile: Kit.profile, docs: Docs.items, docKinds: DOC_KINDS.map(k => k.kind), kit: Kit.items });

// the photo the customer sees: the selfie the washer took in the app, else the roster photo
const WASHER_IMG = require('../../assets/img/washer.webp');
export function myPhotoSource() {
  const sf = myPhoto(), w = me();
  return sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
}
