// Identity documents (Aadhaar / PAN): a photo kept readable, or a small PDF, returned as a data: URL for uploadDoc().
// Photos: 1600 px wide, quality ~0.7, re-shrunk once if the data URL is still too big. PDFs are sent as picked (<= ~600 KB).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type DocErr = Error & { hi: string };
const fail = (hi: string): DocErr => Object.assign(new Error(hi), { hi });

export type PickedDoc = { mime: string; name: string; data: string; preview?: string };

const MAX_DATA = 800000;       // data URL chars (the rules allow 900000)
const MAX_PDF_BYTES = 600 * 1024;

async function shrink(uri: string, width: number, q: number) {
  const format = Platform.OS === 'ios' ? SaveFormat.JPEG : SaveFormat.WEBP;
  const r = await manipulateAsync(uri, [{ resize: { width } }], { compress: q, format, base64: true });
  const mime = format === SaveFormat.WEBP ? 'image/webp' : 'image/jpeg';
  return { mime, data: `data:${mime};base64,${r.base64}` };
}

async function pickImage(source: 'camera' | 'gallery'): Promise<PickedDoc | null> {
  const web = Platform.OS === 'web';
  if (source === 'camera' && !web) {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw fail('Camera ki permission chahiye. Settings mein on karo.');
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  // the web preview has no camera: it opens the file picker instead
  const res = source === 'camera' && !web ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  try {
    let r = await shrink(a.uri, 1600, 0.7);
    if (r.data.length > MAX_DATA) r = await shrink(a.uri, 1100, 0.5);
    if (r.data.length > MAX_DATA) throw new Error('big');
    return { mime: r.mime, name: a.fileName || (source === 'camera' ? 'photo' : 'gallery') + (r.mime === 'image/webp' ? '.webp' : '.jpg'), data: r.data, preview: a.uri };
  } catch (e) {
    throw fail('Photo nahi gayi. Dobara try karo, ya chhoti photo chuno.');
  }
}

function toBase64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

async function readBase64(uri: string): Promise<string> {
  const f = new File(uri) as File & { base64?: () => Promise<string> };
  // expo-file-system 58 has base64() natively but does not declare it in its types
  if (typeof f.base64 === 'function') return f.base64();
  return toBase64(await f.arrayBuffer());
}

async function pickPdf(): Promise<PickedDoc | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false, base64: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const name = a.name || 'document.pdf';
  if (a.mimeType && a.mimeType !== 'application/pdf') throw fail('Sirf PDF file chuno.');
  if (a.size != null && a.size > MAX_PDF_BYTES) throw fail('PDF bahut badi hai (600 KB se kam chahiye). Chhoti PDF chuno ya photo kheecho.');
  try {
    let data: string;
    if (a.base64 && a.base64.startsWith('data:')) data = a.base64;   // web gives a full data URL
    else data = 'data:application/pdf;base64,' + (a.base64 || await readBase64(a.uri));
    if (data.startsWith('data:') && !data.startsWith('data:application/pdf')) data = 'data:application/pdf;base64,' + data.split(',')[1];
    if (data.length > MAX_DATA) throw fail('PDF bahut badi hai (600 KB se kam chahiye). Chhoti PDF chuno ya photo kheecho.');
    return { mime: 'application/pdf', name, data };
  } catch (e: any) {
    if (e?.hi) throw e;
    throw fail('PDF padh nahi paye. Dobara try karo');
  }
}

/** null when the washer backs out; throws an Error with a Hinglish `.hi` message otherwise. */
export async function pickDocument(source: 'camera' | 'gallery' | 'pdf'): Promise<PickedDoc | null> {
  return source === 'pdf' ? pickPdf() : pickImage(source);
}
