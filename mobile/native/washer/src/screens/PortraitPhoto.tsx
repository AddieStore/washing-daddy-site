// "Change my photo": camera or gallery -> background removed + brand gold -> before/after -> Theek hai / Dobara lo.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { Button, F, brand, sheet, ui, useTheme } from '../ui';
import { act } from '../state/store';
import { t } from '../lib/i18n';
import { makePortrait, pickRaw, type PortraitResult } from '../lib/portrait';
import { SheetTitle } from './sheets';

/** Opens the picker (camera or gallery) and then the cut-out sheet. */
export async function changeProfilePhoto(fromLibrary: boolean) {
  try {
    const uri = await pickRaw(fromLibrary);
    if (uri) sheet.open(close => <PortraitBody uri={uri} fromLibrary={fromLibrary} close={close} />);
  } catch (e: any) {
    ui.toast(e?.hi ? t(e.hi) : t('Photo nahi gayi. Dobara try karo'));
  }
}

function Pic({ uri, label, ring }: { uri: string; label: string; ring?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Image source={{ uri }} accessibilityLabel={label} resizeMode="cover" style={{ width: '100%', aspectRatio: 1, borderRadius: 24, backgroundColor: brand.gold, borderWidth: ring ? 3 : 0, borderColor: brand.gold }} />
      <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: c.fg2, marginTop: 6 }}>{label}</Text>
    </View>
  );
}

function PortraitBody({ uri, fromLibrary, close }: { uri: string; fromLibrary: boolean; close: () => void }) {
  const { c } = useTheme();
  const [r, setR] = useState<PortraitResult | null>(null);
  const [err, setErr] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    makePortrait(uri).then(x => { if (alive.current) setR(x) }).catch((e: any) => { if (alive.current) setErr(e?.hi || 'Photo nahi gayi. Dobara try karo') });
    return () => { alive.current = false };
  }, [uri]);
  const again = () => { close(); setTimeout(() => { void changeProfilePhoto(fromLibrary) }, 350) };
  const ok = () => { if (r) { act.setSelfie(r.url); close() } };
  return (
    <View>
      <SheetTitle title={t('Aapki photo')} />
      {err ? (
        <>
          <Text style={{ fontFamily: F.body, fontSize: 14.5, color: c.fg2, marginBottom: 14 }}>{t(err)}</Text>
          <Button label={t('Dobara lo')} onPress={again} />
        </>
      ) : !r ? (
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Image source={{ uri }} resizeMode="cover" style={{ width: 150, aspectRatio: 1, borderRadius: 24, opacity: 0.55 }} />
          <ActivityIndicator color={brand.violet} style={{ marginTop: 16 }} />
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 15, color: c.fg, marginTop: 10 }}>{t('Background hata rahe hain…')}</Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pic uri={uri} label={t('Pehle')} />
            <Pic uri={r.after} label={t('Ab')} ring />
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, textAlign: 'center', marginTop: 12 }}>
            {r.cut ? t('Background hat gaya, peeche hamara golden yellow.') : t('Background hata nahi paaye, isliye photo seedhi golden yellow par lagi. Phone ke app mein background hat jata hai.')}
          </Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            <Button label={t('Theek hai')} icon="check" onPress={ok} />
            <Button label={t('Dobara lo')} variant="ghost" onPress={again} />
          </View>
        </>
      )}
    </View>
  );
}

/** Camera or gallery, then the cut-out. The web preview has no camera, so it goes straight to the file picker. */
export function openPhotoChooser() {
  sheet.open(close => (
    <View>
      <SheetTitle title={t('Profile photo badlo')} sub={t('Background apne aap hat jayega, peeche golden yellow aayega.')} />
      <View style={{ gap: 10 }}>
        <Button label={t('Camera se lo')} icon="cam" onPress={() => { close(); setTimeout(() => { void changeProfilePhoto(false) }, 350) }} />
        <Button label={t('Gallery se chuno')} variant="ghost" onPress={() => { close(); setTimeout(() => { void changeProfilePhoto(true) }, 350) }} />
      </View>
    </View>
  ));
}
