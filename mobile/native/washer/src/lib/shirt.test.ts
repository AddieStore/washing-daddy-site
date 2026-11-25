import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { classifyPixels, uniformColor, rgbToHsl, checkShirtJpeg, base64ToBytes } from './shirt.ts';

const fill = (w: number, h: number, rgb: [number, number, number]) => {
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255 }
  return d;
};

test('uniform colours: WD blue and white pass; skin, green, black, violet do not', () => {
  assert.equal(uniformColor(37, 99, 235), 'blue');
  assert.equal(uniformColor(60, 110, 200), 'blue');     // blue in shade
  assert.equal(uniformColor(250, 250, 250), 'white');
  assert.equal(uniformColor(224, 224, 228), 'white');
  assert.equal(uniformColor(224, 172, 140), null);      // skin
  assert.equal(uniformColor(20, 160, 80), null);
  assert.equal(uniformColor(0, 0, 0), null);
  assert.equal(uniformColor(0x54, 0x09, 0xda), null);   // violet
  assert.ok(rgbToHsl(37, 99, 235)[0] > 210 && rgbToHsl(37, 99, 235)[0] < 230);
});

test('all-white or all-blue chest passes and names the colour, green and skin fail', () => {
  const b = classifyPixels(fill(48, 64, [37, 99, 235]), 48, 64);
  assert.equal(b.ok, true); assert.equal(b.color, 'blue'); assert.equal(b.share, 1);
  const wh = classifyPixels(fill(48, 64, [250, 250, 250]), 48, 64);
  assert.equal(wh.ok, true); assert.equal(wh.color, 'white');
  assert.equal(classifyPixels(fill(48, 64, [30, 150, 70]), 48, 64).ok, false);
  assert.equal(classifyPixels(fill(48, 64, [230, 200, 180]), 48, 64).ok, false);
});

test('only the chest region counts', () => {
  const w = 48, h = 64, d = fill(w, h, [230, 200, 180]);
  for (let y = 0; y < 20; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = 37; d[i + 1] = 99; d[i + 2] = 235 }
  assert.equal(classifyPixels(d, w, h).ok, false);
  const e = fill(w, h, [230, 200, 180]);
  for (let y = 29; y < 52; y++) for (let x = 14; x < 34; x++) { const i = (y * w + x) * 4; e[i] = 37; e[i + 1] = 99; e[i + 2] = 235 }
  assert.equal(classifyPixels(e, w, h).ok, true);
});

test('real JPEG round trip through the decoder', () => {
  const enc = (rgb: [number, number, number]) => jpeg.encode({ data: fill(48, 64, rgb), width: 48, height: 64 }, 80).data;
  const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
  assert.equal(checkShirtJpeg(b64(enc([37, 99, 235]))).ok, true);
  assert.equal(checkShirtJpeg('data:image/jpeg;base64,' + b64(enc([250, 250, 250]))).ok, true);
  assert.equal(checkShirtJpeg(b64(enc([30, 150, 70]))).ok, false);
  assert.deepEqual([...base64ToBytes('TWFu')], [77, 97, 110]);
  assert.deepEqual([...base64ToBytes('TWE=')], [77, 97]);
});
