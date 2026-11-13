// A car's picture area with a round camera button at its top-right. The washer snaps the car once so they
// remember which one to wash; the small photo then replaces the drawn car. Tap again opens the big photo.
import React from 'react';
import { Image, View } from 'react-native';
import { Button, F, Icon, LinkButton, Pressy, brand, sheet, ui, useTheme } from '../ui';
import { act, carPhoto, useStore } from '../state/store';
import { takeCarPhoto } from '../lib/photo';
import { t } from '../lib/i18n';
import { SheetTitle } from './sheets';

async function snap(reg: string) {
  try {
    const p = await takeCarPhoto();
    if (p) act.setCarPhoto(reg, p.url, p.cut);
  } catch (e: any) {
    ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo'));
  }
}

function PhotoBody({ reg, url, cut, close }: { reg: string; url: string; cut?: boolean; close: () => void }) {
  return (
    <View>
      <SheetTitle title={t('Gaadi ki photo')} />
      <Image source={{ uri: url }} accessibilityLabel={t('Gaadi ki photo')} resizeMode={cut ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: cut ? 'transparent' : '#0002' }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button variant="violet" label={t('Dobara lo')} style={{ flex: 1 }} onPress={() => { close(); setTimeout(() => { void snap(reg) }, 250); }} />
        <Button variant="ghost" label={t('Hata do')} style={{ flex: 1 }} onPress={() => { act.setCarPhoto(reg, null); close(); }} />
      </View>
      <View style={{ alignItems: 'center', marginTop: 8 }}><LinkButton label={t('Band karo')} onPress={close} /></View>
    </View>
  );
}

/** `size` is the diameter of the camera button; the box is w x h (w omitted = full width). */
export function CarPic({ reg, w, h, size = 30, radius = 14, children }: { reg: string; w?: number; h: number; size?: number; radius?: number; children: React.ReactNode }) {
  useStore();
  const { c, dark } = useTheme();
  const ph = carPhoto(reg);
  const onPress = () => {
    if (ph) sheet.open(close => <PhotoBody reg={reg} url={ph.url} cut={ph.cut} close={close} />);
    else void snap(reg);
  };
  return (
    <View style={{ width: w ?? '100%', height: h, alignItems: 'center', justifyContent: 'flex-end' }}>
      {ph ? <Image source={{ uri: ph.url }} resizeMode={ph.cut ? 'contain' : 'cover'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius }} /> : children}
      <View style={{ position: 'absolute', top: 0, right: 0, width: size, height: size }}>
        <Pressy onPress={onPress} accessibilityLabel={t(ph ? 'Gaadi ki photo' : 'Gaadi ki photo lo')} hitSlop={6}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
            backgroundColor: ph ? (dark ? brand.ink : '#fff') : c.card, borderWidth: 1, borderColor: c.line }}>
          <Icon name="cam" size={Math.round(size * 0.55)} color={c.primary} />
        </Pressy>
      </View>
    </View>
  );
}
