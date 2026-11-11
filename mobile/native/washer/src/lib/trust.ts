// What we may honestly say about a washer. Every flag is true only when the washer's own records say so
// (admin-written washers/ doc, washerdocs status, the kit list). Nothing here is ever assumed.
import type { KitItem, WasherDoc } from './data.ts';

export type TrustIn = {
  profile: WasherDoc | null;
  docs: Record<string, { status?: string } | undefined>;
  docKinds: string[];
  kit: KitItem[];
};
export type Trust = {
  id: boolean;          // Aadhaar checked by an admin (aadhaar_verified_at)
  docs: boolean;        // every document marked 'verified' by an admin
  docsDone: number; docsTotal: number;
  kit: boolean;         // kit list has items, and the assigned clothes (if any) are all there
  background: boolean;  // police clearance certificate status 'clear'
  verified: boolean;    // the "WD Verified" badge: ID and documents both checked
  earned: number;       // how many of the four checks are earned
};

export function trustOf(i: TrustIn): Trust {
  const p = i.profile;
  const docsDone = i.docKinds.filter(k => i.docs[k]?.status === 'verified').length;
  const docsTotal = i.docKinds.length;
  const id = !!p?.aadhaar_verified_at;
  const docs = docsTotal > 0 && docsDone === docsTotal;
  const clothes = i.kit.filter(k => k.kind === 'clothes').reduce((n, k) => n + (k.qty || 0), 0);
  const kit = i.kit.length > 0 && (!(p?.assigned_clothes && p.assigned_clothes > 0) || clothes >= p.assigned_clothes);
  const background = p?.pcc?.status === 'clear';
  return { id, docs, docsDone, docsTotal, kit, background, verified: id && docs, earned: [id, docs, kit, background].filter(Boolean).length };
}
