import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { classifyPixels, isViolet, rgbToHsl, checkShirtJpeg, base64ToBytes } from './shirt.ts';

const fill = (w: number, h: number, rgb: [number, number, number]) => {
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255 }
  return d;
};

test('brand violet #5409DA is in the band; white, green, skin, black are not', () => {
  const [h] = rgbToHsl(0x54, 0x09, 0xda);
  assert.ok(h > 260 && h < 268, String(h));
  assert.ok(isViolet(0x54, 0x09, 0xda));
  assert.ok(isViolet(110, 60, 220));          // lighter, in shade
  assert.ok(!isViolet(255, 255, 255));
  assert.ok(!isViolet(20, 160, 80));
  assert.ok(!isViolet(224, 172, 140));
  assert.ok(!isViolet(0, 0, 0));
  assert.ok(!isViolet(37, 99, 235));          // blue is outside the hue band
});

test('all-violet frame passes, white and green fail', () => {
  const v = classifyPixels(fill(48, 64, [0x54, 0x09, 0xda]), 48, 64);
  assert.equal(v.ok, true); assert.equal(v.share, 1); assert.equal(v.confidence, 1);
  assert.equal(classifyPixels(fill(48, 64, [255, 255, 255]), 48, 64).ok, false);
  assert.equal(classifyPixels(fill(48, 64, [30, 150, 70]), 48, 64).ok, false);
});

test('only the chest region counts: violet outside it is ignored', () => {
  const w = 48, h = 64, d = fill(w, h, [230, 200, 180]);
  for (let y = 0; y < 20; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = 0x54; d[i + 1] = 9; d[i + 2] = 0xda }
  assert.equal(classifyPixels(d, w, h).ok, false);
  // violet only in the middle-lower torso passes
  const e = fill(w, h, [230, 200, 180]);
  for (let y = 29; y < 52; y++) for (let x = 14; x < 34; x++) { const i = (y * w + x) * 4; e[i] = 0x54; e[i + 1] = 9; e[i + 2] = 0xda }
  assert.equal(classifyPixels(e, w, h).ok, true);
});

test('real JPEG round trip through the decoder', () => {
  const enc = (rgb: [number, number, number]) => jpeg.encode({ data: fill(48, 64, rgb), width: 48, height: 64 }, 80).data;
  const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
  assert.equal(checkShirtJpeg(b64(enc([0x54, 9, 0xda]))).ok, true);
  assert.equal(checkShirtJpeg('data:image/jpeg;base64,' + b64(enc([255, 255, 255]))).ok, false);
  assert.equal(checkShirtJpeg(b64(enc([30, 150, 70]))).ok, false);
  assert.deepEqual([...base64ToBytes('TWFu')], [77, 97, 110]);
  assert.deepEqual([...base64ToBytes('TWE=')], [77, 97]);
});
