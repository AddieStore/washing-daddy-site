// Partner profile photo: pick or take a picture, cut the person out, put them on the brand gold, shrink to the
// small inline image the contract allows (~30 KB, see photo.ts). The cut-out runs on the phone (modules/wd-cutout,
// Android ML Kit); on web and when the module is missing the plain photo is cropped square on the gold instead.
import { Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { portrait } from '../../modules/wd-cutout/src';
import { brand } from '../ui/theme';
import type { PhotoErr } from './photo';

const fail = (hi: string): PhotoErr => Object.assign(new Error(hi), { hi });
const SIZE = 240;

/** Camera (front) or gallery. null when the washer backs out. The web preview always opens the file picker. */
export async function pickRaw(fromLibrary: boolean): Promise<string | null> {
  const lib = fromLibrary || Platform.OS === 'web';
  if (!lib) {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw fail('Camera ki permission chahiye. Settings mein on karo.');
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, cameraType: ImagePicker.CameraType.front };
  const res = lib ? await ImagePicker.launchImageLibraryAsync(o) : await ImagePicker.launchCameraAsync(o);
  return res.canceled || !res.assets?.[0] ? null : res.assets[0].uri;
}

async function shrink(uri: string) {
  const format = Platform.OS === 'ios' ? SaveFormat.JPEG : SaveFormat.WEBP;
  const r = await manipulateAsync(uri, [{ resize: { width: SIZE } }], { compress: 0.62, format, base64: true });
  return `data:image/${format === SaveFormat.WEBP ? 'webp' : 'jpeg'};base64,${r.base64}`;
}

const size = (uri: string) => new Promise<{ w: number; h: number }>((res, rej) => Image.getSize(uri, (w, h) => res({ w, h }), rej));

// web: the plain photo, centre-cropped square, drawn on the gold
async function webOnGold(uri: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new (globalThis as any).Image() as HTMLImageElement; i.onload = () => res(i); i.onerror = rej; i.src = uri });
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
  const g = cv.getContext('2d')!;
  g.fillStyle = brand.gold; g.fillRect(0, 0, SIZE, SIZE);
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, SIZE, SIZE);
  return cv.toDataURL('image/jpeg', 0.7);
}

export type PortraitResult = { after: string; url: string; cut: boolean };

/** cut = true when the background was really removed; false = plain photo cropped square (see the note in the sheet). */
export async function makePortrait(uri: string): Promise<PortraitResult> {
  try {
    if (Platform.OS === 'web') { const d = await webOnGold(uri); return { after: d, url: d, cut: false } }
    const p = await portrait(uri, brand.gold, 480);
    if (p) { const url = await shrink(p); return { after: url, url, cut: true } }
    const { w, h } = await size(uri), s = Math.min(w, h);
    const sq = await manipulateAsync(uri, [{ crop: { originX: Math.round((w - s) / 2), originY: Math.round((h - s) / 2), width: s, height: s } }], { format: SaveFormat.PNG });
    const url = await shrink(sq.uri);
    return { after: url, url, cut: false };
  } catch {
    throw fail('Photo nahi gayi. Dobara try karo');
  }
}
