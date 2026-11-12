// On-device T-shirt colour check for the check-in selfie. A face or a cap cannot be found reliably on a phone, so
// this only answers one thing: is there enough brand violet (#5409DA, hue ~265) in the chest area of the photo?
// The washer confirms the cap himself and the manager reviews the photo. Pure JS: decodes a small JPEG with jpeg-js
// (useTArray, so it needs no Buffer in Hermes); the shrinking to ~48px is done by the caller (expo-image-manipulator).
import jpeg from 'jpeg-js';

export const SHIRT = { hueMin: 245, hueMax: 285, satMin: 0.35, lightMin: 0.15, lightMax: 0.65, okShare: 0.2, sureShare: 0.4 };
// centre-lower torso: middle 40% across, 45% to 80% down
export const REGION = { x0: 0.3, x1: 0.7, y0: 0.45, y1: 0.8 };

export type ShirtResult = { ok: boolean; share: number; confidence: number };

/** r,g,b 0..255 -> h 0..360, s 0..1, l 0..1 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
}

export const isViolet = (r: number, g: number, b: number) => {
  const [h, s, l] = rgbToHsl(r, g, b);
  return h >= SHIRT.hueMin && h <= SHIRT.hueMax && s > SHIRT.satMin && l >= SHIRT.lightMin && l <= SHIRT.lightMax;
};

/** data: RGBA (4 bytes a pixel) of a w x h image. Share of violet pixels in the torso region. */
export function classifyPixels(data: ArrayLike<number>, w: number, h: number): ShirtResult {
  const xa = Math.floor(w * REGION.x0), xb = Math.max(xa + 1, Math.ceil(w * REGION.x1));
  const ya = Math.floor(h * REGION.y0), yb = Math.max(ya + 1, Math.ceil(h * REGION.y1));
  let n = 0, hit = 0;
  for (let y = ya; y < yb && y < h; y++) {
    for (let x = xa; x < xb && x < w; x++) {
      const i = (y * w + x) * 4; n++;
      if (isViolet(data[i], data[i + 1], data[i + 2])) hit++;
    }
  }
  const share = n ? hit / n : 0;
  return { ok: share >= SHIRT.okShare, share: Math.round(share * 1000) / 1000, confidence: Math.round(Math.min(1, share / SHIRT.sureShare) * 100) / 100 };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i]), b = B64.indexOf(s[i + 1]), c = i + 2 < s.length ? B64.indexOf(s[i + 2]) : -1, d = i + 3 < s.length ? B64.indexOf(s[i + 3]) : -1;
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}

/** base64 (or data URL) of a small JPEG -> verdict. Throws when it is not a decodable JPEG. */
export function checkShirtJpeg(b64: string): ShirtResult {
  const img = jpeg.decode(base64ToBytes(b64), { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 2 });
  return classifyPixels(img.data, img.width, img.height);
}
