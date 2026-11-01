import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = requireOptionalNativeModule<{ cutout(uri: string): Promise<string | null> }>('WdCutout');

// file:// PNG of the subject on a transparent background, or null (no module, iOS, no subject, any failure)
export async function cutout(uri: string): Promise<string | null> {
  try { return Native ? await Native.cutout(uri) : null } catch { return null }
}
