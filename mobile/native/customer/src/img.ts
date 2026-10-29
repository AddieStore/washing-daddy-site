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
} satisfies Record<string, ImageSourcePropType>;

export type ImgKey = keyof typeof IMG;
// a picture from the washer feed or the customer's own photo arrives as a URI
export const src = (v: ImgKey | string | null | undefined): ImageSourcePropType | null =>
  !v ? null : v in IMG ? IMG[v as ImgKey] : { uri: v };
// image sizes (px), so a car fills the hero at its own aspect ratio
export const RATIO: Record<ImgKey, number> = {
  scorpio: 1100 / 652, civic: 1000 / 469, washer: 512 / 520, proof: 900 / 675, logo: 260 / 157, trust: 400 / 470,
  authphoto: 420 / 525, slide0: .8, slide1: .8, slide2: .8, slide3: .8, slide4: .8, slide5: .8, slide6: 1,
};
