// Wash proof photos and the washer's own photo. A wash photo is uploaded to Firebase Storage (store.ts, Photos); the small
// inline image made here (~30 KB) is the offline fallback and the on-screen preview until the upload is done.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { cutout } from '../../modules/wd-cutout/src';

export type PhotoErr = Error & { hi: string };
const fail = (hi: string): PhotoErr => Object.assign(new Error(hi), { hi });

async function shrink(uri: string, max: number, q: number) {
  const format = Platform.OS === 'ios' ? SaveFormat.JPEG : SaveFormat.WEBP;
  const r = await manipulateAsync(uri, [{ resize: { width: max } }], { compress: q, format, base64: true });
  return `data:image/${format === SaveFormat.WEBP ? 'webp' : 'jpeg'};base64,${r.base64}`;
}

/** Car photo with the background removed (transparent, no colour). cut=false when it cannot be done (web, no module). */
export async function takeCarPhoto(): Promise<{ url: string; cut: boolean } | null> {
  const p = await takePhoto({ quality: 0.8 });
  if (!p) return null;
  try {
    const c = Platform.OS === 'web' ? null : await cutout(p.preview);
    if (c) {
      const r = await manipulateAsync(c, [{ resize: { width: 420 } }], { compress: 0.7, format: SaveFormat.WEBP, base64: true });
      return { url: `data:image/webp;base64,${r.base64}`, cut: true };
    }
  } catch {}
  return { url: p.url, cut: false };
}

// null when the washer backs out of the camera
// file: a 1280 px jpeg on disk for the Storage upload (the inline `url` is only the small offline fallback)
export async function takePhoto(opts: { selfie?: boolean; fromLibrary?: boolean; quality?: number } = {}): Promise<{ preview: string; url: string; file?: string } | null> {
  if (!opts.fromLibrary && Platform.OS !== 'web') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw fail('Camera ki permission chahiye. Settings mein on karo.');
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: opts.quality ?? 0.8, cameraType: opts.selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back };
  // the web preview has no camera: it opens the file picker instead
  const res = opts.fromLibrary || Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(o) : await ImagePicker.launchCameraAsync(o);
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  try {
    const url = await shrink(uri, opts.selfie ? 240 : 420, 0.62);
    let file: string | undefined;
    if (!opts.selfie && Platform.OS !== 'web') {
      try { file = (await manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: SaveFormat.JPEG })).uri } catch { /* the inline copy still goes */ }
    }
    return { preview: uri, url, file };
  } catch (e) {
    throw fail('Photo nahi gayi. Dobara try karo');
  }
}
