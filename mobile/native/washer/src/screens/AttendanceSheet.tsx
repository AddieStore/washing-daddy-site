// "Hub pahunch gaya": the check-in opens this sheet first. The washer takes a live front-camera photo in his cap and
// WD T-shirt. The T-shirt colour is checked on the phone (lib/shirt.ts); the cap cannot be, so he ticks it himself
// and the manager reviews the photo in the admin panel. After 2 misses he can still send it: nobody is locked out.
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Button, F, Icon, SuccessTick, brand, sheet, ui, useTheme } from '../ui';
import { act } from '../state/store';
import { t } from '../lib/i18n';
import { takePhoto } from '../lib/photo';
import { checkShirtJpeg, type ShirtResult } from '../lib/shirt';
import { SheetTitle } from './sheets';

const MAX_PHOTO = 40000;   // chars of the data URL the checkins doc may carry

/** Run the colour check on a ~48px JPEG of the photo. null when it cannot be read (the washer is not blocked). */
async function readShirt(uri: string): Promise<ShirtResult | null> {
  try {
    const r = await manipulateAsync(uri, [{ resize: { width: 48 } }], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
    return r.base64 ? checkShirtJpeg(r.base64) : null;
  } catch { return null }
}

/** A drawn washer: cap on the head, violet shirt, the chest area the check looks at is dotted. */
function Figure({ size = 120 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 120 132" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M20 132 C20 98 38 88 60 88 C82 88 100 98 100 132 Z" fill={brand.violet} />
      <Path d="M48 88 C52 98 68 98 72 88 Z" fill={c.card} />
      <Rect x={53} y={72} width={14} height={18} rx={5} fill="#E9B79A" />
      <Ellipse cx={60} cy={52} rx={21} ry={24} fill="#F1C5AA" />
      <Path d="M37 46 C37 22 83 22 83 46 C76 38 44 38 37 46 Z" fill={brand.violet2} />
      <Path d="M62 40 L96 44 C96 48 78 48 62 46 Z" fill={brand.violet2} />
      <Circle cx={52} cy={54} r={2.2} fill="#3a2a22" /><Circle cx={68} cy={54} r={2.2} fill="#3a2a22" />
      <Path d="M52 64 C56 68 64 68 68 64" stroke="#3a2a22" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Rect x={44} y={106} width={32} height={16} rx={4} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="3 3" />
    </Svg>
  );
}

function Tip({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name="check" size={16} color={brand.violet} />
      <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: c.fg2 }}>{text}</Text>
    </View>
  );
}

type Shot = { preview: string; url: string; shirt: ShirtResult | null };

function AttendanceBody({ close }: { close: () => void }) {
  const { c } = useTheme();
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [misses, setMisses] = useState(0);
  const [sure, setSure] = useState(false);
  const [sending, setSending] = useState(false);
  const alive = useRef(true);
  React.useEffect(() => () => { alive.current = false }, []);

  const snap = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await takePhoto({ selfie: true, quality: 0.5 });
      if (!p || !alive.current) return;
      const shirt = await readShirt(p.preview);
      if (!alive.current) return;
      setShot({ preview: p.preview, url: p.url, shirt }); setSure(false);
      if (!shirt?.ok) setMisses(m => m + 1);
    } catch (e: any) {
      ui.toast(e?.hi ? t(e.hi) : t('Photo nahi gayi. Dobara try karo'));
    } finally { if (alive.current) setBusy(false) }
  };

  const matched = !!shot?.shirt?.ok;
  const canForce = !!shot && !matched && misses >= 2;
  const canSend = !!shot && sure && (matched || canForce) && !sending;
  const send = async () => {
    if (!shot || !canSend) return;
    setSending(true);
    await act.checkIn({
      photo: shot.url.length <= MAX_PHOTO ? shot.url : undefined,
      shirt: { shirt_match: matched, shirt_share: shot.shirt?.share ?? 0 },
    });
    close();
  };

  return (
    <View>
      <SheetTitle title={t('Hazri ki photo')} sub={t('Cap aur WD T-shirt pehen kar apni photo lo')} />
      {!shot ? (
        <View>
          <View style={{ alignItems: 'center', paddingVertical: 8, backgroundColor: c.tile2, borderRadius: 20 }}><Figure /></View>
          <View style={{ gap: 8, marginTop: 14, marginBottom: 16 }}>
            <Tip text={t('Seedhe khade ho, chehra saaf dikhe')} />
            <Tip text={t('Cap sir par, T-shirt poori dikhe')} />
            <Tip text={t('Roshni mein ho, peeche se nahi')} />
          </View>
          {busy ? <ActivityIndicator color={brand.violet} style={{ marginBottom: 8 }} /> : null}
          <Button variant="violet" icon="cam" label={t('Photo lo')} onPress={snap} disabled={busy} />
        </View>
      ) : (
        <View>
          <View style={{ alignItems: 'center' }}>
            <Image source={{ uri: shot.preview }} accessibilityLabel={t('Hazri ki photo')} resizeMode="cover"
              style={{ width: 200, height: 240, borderRadius: 20, backgroundColor: c.tile2, transform: [{ scaleX: 1 }] }} />
          </View>
          <View accessibilityLiveRegion="polite" style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {matched ? <SuccessTick size={28} /> : null}
            <Text style={{ flex: 1, fontFamily: matched ? F.semi : F.body, fontSize: 14.5, color: matched ? c.fg : c.fg2 }}>
              {matched ? t('T-shirt pehchan li') : t('T-shirt ka rang nahi mila, roshni mein dobara photo lo')}
            </Text>
          </View>
          {matched || canForce ? (
            <Pressable onPress={() => setSure(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: sure }}
              accessibilityLabel={t('Cap aur T-shirt pehne hain?')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, minHeight: 48 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: sure ? brand.violet : c.fg3, backgroundColor: sure ? brand.violet : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {sure ? <Icon name="check" size={18} color="#fff" /> : null}
              </View>
              <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15.5, color: c.fg }}>{t('Cap aur T-shirt pehne hain?')}</Text>
            </Pressable>
          ) : null}
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 6 }}>{t('Manager yeh photo dekhega')}</Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {matched || canForce ? (
              <Button variant="violet" icon="check" disabled={!canSend} label={matched ? t('Hazri lagao') : t('Phir bhi bhejo (manager dekhega)')} onPress={send} />
            ) : null}
            <Button variant="ghost" icon="cam" label={t('Dobara photo lo')} onPress={snap} disabled={busy || sending} />
          </View>
          {!sure && (matched || canForce) ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 8, textAlign: 'center' }}>{t('Pehle tick lagao ki cap aur T-shirt pehne hain')}</Text> : null}
        </View>
      )}
    </View>
  );
}

/** Check-in entry point: the sheet first, act.checkIn() only once the photo is accepted. */
export function openAttendance() {
  sheet.open(close => <AttendanceBody close={close} />);
}
