// Background removal for customer car photos and washer selfies, shared by both apps.
// Runs on the phone: ISNet general-use model (DIS, Apache-2.0) with its weights stored as uint8,
// on ONNX Runtime Web (MIT). Everything is served from washingdaddy.com/bg/. See NOTICE.md.
const BASE = new URL('./', import.meta.url).href;
const MODEL = BASE + 'isnet-u8.onnx', SIZE = 1024, CACHE = 'wd-bg-1';

let _sess;
async function modelBytes() {
  // Keep the 47 MB model in Cache Storage so it downloads once per phone
  try {
    const c = await caches.open(CACHE);
    let r = await c.match(MODEL);
    if (!r) {
      r = await fetch(MODEL);
      if (!r.ok) throw new Error('model ' + r.status);
      await c.put(MODEL, r.clone());
    }
    return new Uint8Array(await r.arrayBuffer());
  } catch (e) {
    const r = await fetch(MODEL);
    if (!r.ok) throw new Error('model ' + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }
}
function session() {
  if (!_sess) {
    _sess = (async () => {
      const ort = await import(BASE + 'ort.js');
      ort.env.wasm.wasmPaths = { mjs: BASE + 'ort-wasm.js', wasm: BASE + 'ort-wasm.wasm' };
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const s = await ort.InferenceSession.create(await modelBytes(), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return { ort, s };
    })();
    _sess.catch(() => { _sess = null });
  }
  return _sess;
}

// Download and load the model ahead of time (e.g. when the photo picker opens)
export function warmUp() { return session().then(() => true, () => false) }

// blob: any image the browser can decode. Returns a PNG blob of the same size with the background transparent.
export async function removeBackground(blob) {
  const { ort, s } = await session();
  const bmp = await createImageBitmap(blob);
  const W = bmp.width, H = bmp.height, N = SIZE * SIZE;

  const inC = document.createElement('canvas');
  inC.width = inC.height = SIZE;
  const ix = inC.getContext('2d', { willReadFrequently: true });
  ix.drawImage(bmp, 0, 0, SIZE, SIZE);
  const px = ix.getImageData(0, 0, SIZE, SIZE).data;
  const x = new Float32Array(3 * N);
  for (let i = 0; i < N; i++) {
    x[i] = px[i * 4] / 255 - .5;
    x[N + i] = px[i * 4 + 1] / 255 - .5;
    x[2 * N + i] = px[i * 4 + 2] / 255 - .5;
  }
  const out = await s.run({ input_image: new ort.Tensor('float32', x, [1, 3, SIZE, SIZE]) });
  const m = out.output_image.data;

  // Mask at model size, then let the canvas scale it smoothly onto the full-size photo
  const mk = ix.createImageData(SIZE, SIZE), md = mk.data;
  for (let i = 0; i < N; i++) md[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(m[i] * 255)));
  ix.putImageData(mk, 0, 0);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const cx = c.getContext('2d');
  cx.drawImage(bmp, 0, 0);
  cx.globalCompositeOperation = 'destination-in';
  cx.drawImage(inC, 0, 0, W, H);
  bmp.close && bmp.close();
  return await new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('toBlob')), 'image/png'));
}
export default removeBackground;
