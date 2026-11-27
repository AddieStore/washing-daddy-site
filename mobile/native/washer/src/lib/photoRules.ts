// Photo rule v3 (contract 2026-11-27), pure functions so they can be tested without the store.
// 2 `after` car photos, at least one with the number plate (`plate: true`, ticked by the washer); the manager may reject a photo
// (`rejected`) or confirm the plate (`plate_ok`) in the admin panel; the washer then retakes only the rejected photo.
import type { Photo, Wash } from './data';

export const CAR_PHOTOS = 2;

/** the car's after photos (not inside spots), in the order they were taken */
export const carPhotos = <T extends { kind: string; spot?: string }>(photos: T[]): T[] => photos.filter(p => p.kind === 'after' && !p.spot);
/** the ones that count for the finish gate: a rejected photo does not */
export const goodPhotos = <T extends Photo>(photos: T[]): T[] => carPhotos(photos).filter(p => !p.rejected);
export const rejectedPhotos = <T extends Photo>(photos: T[]): T[] => carPhotos(photos).filter(p => !!p.rejected);

/** what the finish gate needs from the 2 car photos */
export function carGate(photos: Photo[]) {
  const good = goodPhotos(photos);
  const car = good.length, plate = good.filter(p => p.plate).length;
  return { car, plate, rejected: rejectedPhotos(photos).length, ok: car >= CAR_PHOTOS && plate >= 1 };
}

/** reason of the first rejected photo (may be empty) and how many are rejected; null when nothing is rejected */
export function rejectInfo(photos: Photo[]): { reason: string; count: number } | null {
  const r = rejectedPhotos(photos);
  if (!r.length) return null;
  const why = r.map(p => (p.rejected!.reason || '').trim()).filter(Boolean)[0] || '';
  return { reason: why, count: r.length };
}
/** "Photo reject hui: <reason>. Dobara lo"; `tr` translates the two fixed phrases, the manager's reason stays as written */
export const rejectLine = (info: { reason: string }, tr: (s: string) => string) =>
  `${tr('Photo reject hui')}${info.reason ? ': ' + info.reason : ''}. ${tr('Dobara lo')}`;

/**
 * Add a new car photo to `photos` (mutates). With 2 car photos already, the new one replaces the first rejected one (its review goes
 * with it); with none rejected it is refused.
 */
export function placeAfter(photos: Photo[], np: Photo): 'added' | 'replaced' | 'full' {
  const car = carPhotos(photos);
  if (car.length < CAR_PHOTOS) { photos.push(np); return 'added' }
  const bad = car.find(p => p.rejected);
  if (!bad) return 'full';
  photos.splice(photos.indexOf(bad), 1, np);
  return 'replaced';
}

/** wash-level review flag after a retake: 'pending' once nothing is rejected any more */
export const reviewAfterRetake = (photos: Photo[]): 'pending' | 'rejected' => (rejectedPhotos(photos).length ? 'rejected' : 'pending');

/**
 * The manager writes `rejected` / `plate_ok` and photo_review on the same wash doc the washer writes. Copy those from the server's
 * copy `remote` into `local` (mutates local) unless local already holds a newer review for that photo. Photos are matched by `n`
 * and `at` (a retake gets a new n, so an old rejection can never land on the new picture). Returns true when something changed.
 */
export function mergeReview(local: Pick<Wash, 'photos' | 'photo_review' | 'photo_review_at'>, remote: Partial<Pick<Wash, 'photos' | 'photo_review' | 'photo_review_at'>>): boolean {
  let ch = false;
  const later = (a?: string, b?: string) => (a || '') > (b || '');
  for (const rp of remote.photos || []) {
    if (!rp || rp.n == null) continue;
    const lp = local.photos.find(x => x.n === rp.n && x.at === rp.at);
    if (!lp) continue;
    if (rp.rejected && (!lp.rejected || later(rp.rejected.at, lp.rejected.at))) { lp.rejected = rp.rejected; ch = true }
    if (rp.plate_ok && (!lp.plate_ok || later(rp.plate_ok.at, lp.plate_ok.at))) { lp.plate_ok = rp.plate_ok; ch = true }
  }
  if (remote.photo_review && later(remote.photo_review_at, local.photo_review_at)) {
    local.photo_review = remote.photo_review; local.photo_review_at = remote.photo_review_at; ch = true;
  }
  return ch;
}
