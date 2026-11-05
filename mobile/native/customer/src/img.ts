// Photos from our own rounds, taken out of the web app's inline images. Number plates are blurred.
import type { ImageSourcePropType } from 'react-native';

export const IMG = {
  scorpio: require('../assets/img/scorpio.webp'),
  civic: require('../assets/img/civic.webp'),
  washer: require('../assets/img/washer.webp'),
  proof: require('../assets/img/proof.webp'),
  logo: require('../assets/img/logo.webp'),
  trust: require('../assets/img/trust.webp'),
  authphoto: require('../assets/img/authphoto.webp'),
  slide0: require('../assets/img/slide0.webp'),
  slide1: require('../assets/img/slide1.webp'),
  slide2: require('../assets/img/slide2.webp'),
  slide3: require('../assets/img/slide3.webp'),
  slide4: require('../assets/img/slide4.webp'),
  slide5: require('../assets/img/slide5.webp'),
  slide6: require('../assets/img/slide6.webp'),
  'after': require('../assets/img/after.webp'),
  'before': require('../assets/img/before.webp'),
  'bmw-front': require('../assets/img/bmw-front.webp'),
  'foam': require('../assets/img/foam.webp'),
  'gh9': require('../assets/img/gh9.webp'),
  'guy': require('../assets/img/guy.webp'),
  'hero-shirt': require('../assets/img/hero-shirt.webp'),
  'i8': require('../assets/img/i8.webp'),
  'kit': require('../assets/img/kit.webp'),
  'pochaa': require('../assets/img/pochaa.webp'),
  'poster-trust': require('../assets/img/poster-trust.webp'),
  'red-foam': require('../assets/img/red-foam.webp'),
  'shirt-999': require('../assets/img/shirt-999.webp'),
  'spray': require('../assets/img/spray.webp'),
  'thar': require('../assets/img/thar.webp'),
  'wheel': require('../assets/img/wheel.webp'),
  'wipe': require('../assets/img/wipe.webp'),
  washerCut: require('../assets/img/washer-cut.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type ImgKey = keyof typeof IMG;
// a picture from the washer feed or the customer's own photo arrives as a URI
export const src = (v: ImgKey | string | null | undefined): ImageSourcePropType | null =>
  !v ? null : v in IMG ? IMG[v as ImgKey] : { uri: v };
// image sizes (px), so a car fills the hero at its own aspect ratio
export const RATIO: Record<ImgKey, number> = {
  scorpio: 1100 / 652, civic: 1000 / 469, washer: 512 / 520, proof: 900 / 675, logo: 260 / 157, trust: 400 / 470,
  authphoto: 420 / 525, slide0: .8, slide1: .8, slide2: .8, slide3: .8, slide4: .8, slide5: .8, slide6: 1,
  'after': 520/520, 'before': 520/520, 'bmw-front': 470/588, 'foam': 470/588, 'gh9': 470/588, 'guy': 380/309, 'hero-shirt': 470/588, 'i8': 470/588, 'kit': 470/588, 'pochaa': 470/588, 'poster-trust': 520/611, 'red-foam': 470/588, 'shirt-999': 470/588, 'spray': 470/588, 'thar': 470/588, 'wheel': 470/588, 'wipe': 470/588, washerCut: 380 / 309,
};

// Background cut-out of a car photo (Android ML Kit). A file:// PNG with transparency, or null on any failure.
import { cutout as nativeCutout } from '../modules/wd-cutout/src';
export const cutout = async (uri: string): Promise<string | null> => { try { return await nativeCutout(uri) } catch { return null } };
