// Wash proof photos and the washer's own photo. There is no file storage in the Firebase project, so a photo
// travels inside the doc as a small inline image (contract: photos[].url, a data: thumbnail of ~30 KB).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type PhotoErr = Error & { hi: string };
const fail = (hi: string): PhotoErr => Object.assign(new Error(hi), { hi });

async function shrink(uri: string, max: number, q: number) {
  const format = Platform.OS === 'ios' ? SaveFormat.JPEG : SaveFormat.WEBP;
  const r = await manipulateAsync(uri, [{ resize: { width: max } }], { compress: q, format, base64: true });
  return `data:image/${format === SaveFormat.WEBP ? 'webp' : 'jpeg'};base64,${r.base64}`;
}

// null when the washer backs out of the camera
export async function takePhoto(opts: { selfie?: boolean; fromLibrary?: boolean } = {}): Promise<{ preview: string; url: string } | null> {
  if (!opts.fromLibrary && Platform.OS !== 'web') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw fail('Camera ki permission chahiye. Settings mein on karo.');
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, cameraType: opts.selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back };
  // the web preview has no camera: it opens the file picker instead
  const res = opts.fromLibrary || Platform.OS === 'web' ? await ImagePicker.launchImageLibraryAsync(o) : await ImagePicker.launchCameraAsync(o);
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  try {
    return { preview: uri, url: await shrink(uri, opts.selfie ? 240 : 420, 0.62) };
  } catch (e) {
    throw fail('Photo nahi gayi. Dobara try karo');
  }
}
