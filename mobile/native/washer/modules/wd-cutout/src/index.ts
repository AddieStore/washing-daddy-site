import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = {
  cutout(uri: string): Promise<string | null>;
  portrait(uri: string, bg: string, size: number): Promise<string | null>;
};
const Native = requireOptionalNativeModule<Native>('WdCutout');

// file:// PNG of the subject on a transparent background, or null (no module, iOS, no subject, any failure)
export async function cutout(uri: string): Promise<string | null> {
  try { return Native ? await Native.cutout(uri) : null } catch { return null }
}

// file:// PNG (size x size) of the person on a solid colour (#RRGGBB), or null when it cannot be done
export async function portrait(uri: string, bg: string, size = 480): Promise<string | null> {
  try { return Native?.portrait ? await Native.portrait(uri, bg, size) : null } catch { return null }
}
