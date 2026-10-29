// Profile tab: the violet me-card, settings rows, footer notes. Port of renderMe + #s-me.
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DemoNote, F, Icon, OnViolet, Pressy, Row, Section, Segmented, SyncDot, brand, ui, useTheme,
} from '../../ui';
import { REAL, Route, S, act, me, myPhoto, syncState, useStore } from '../../state/store';
import { takePhoto } from '../../lib/photo';
import { fmtPhone } from '../../lib/data';
import { t } from '../../lib/i18n';
import { openHelpSheet, openLogoutSheet, openReferSheet, openResetSheet, openSyncSheet } from '../../screens/sheets';

const WASHER_IMG = require('../../../assets/img/washer.webp');
const INK_SHADOW = '#2A0478';

function CountUp({ to, style }: { to: number; style?: object }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [to]);
  return <Text style={style}>{v.toLocaleString('en-IN')}</Text>;
}

function MeCard() {
  const { c } = useTheme();
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  const cam = async () => {
    try {
      const r = await takePhoto({ selfie: true });
      if (r) act.setSelfie(r.url);
    } catch (e: any) {
      ui.toast(e?.hi ? t(e.hi) : t('Selfie nahi lagi. Dobara try karo'));
    }
  };
  const stat = (big: React.ReactNode, small: string) => (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, backgroundColor: 'rgba(18,7,36,0.3)', borderWidth: 2, borderColor: brand.cream, alignItems: 'center' }}>
      {big}
      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: c.fg2, marginTop: 4 }}>{small}</Text>
    </View>
  );
  const num = { fontFamily: F.shout, fontSize: 28, lineHeight: 30, color: c.fg } as const;
  return (
    <View style={{ marginHorizontal: 10, marginTop: 4, borderRadius: 28, backgroundColor: brand.violet, borderWidth: 3, borderColor: brand.gold, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', shadowColor: INK_SHADOW, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 8, height: 8 }, elevation: 6 }}>
      <View style={{ width: 150, height: 150, marginTop: 6, borderRadius: 75, backgroundColor: brand.gold, padding: 5 }}>
        {src
          ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%', borderRadius: 70, backgroundColor: brand.cream }} />
          : <View style={{ flex: 1, borderRadius: 70, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.hero, fontSize: 60, color: brand.violet }}>{w.name[0]}</Text></View>}
        <Pressy onPress={cam} scaleTo={0.9} accessibilityLabel={t('Profile photo badlo')}
          style={{ position: 'absolute', right: -2, bottom: 1, width: 48, height: 48, borderRadius: 24, backgroundColor: brand.ink, borderWidth: 3, borderColor: brand.violet, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="cam" size={22} color={brand.gold} />
        </Pressy>
      </View>
      <Text style={{ fontFamily: F.hero, fontSize: 36, lineHeight: 40, color: c.fg, marginTop: 12, textShadowColor: brand.ink, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 }}>{w.name}</Text>
      <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg2, marginTop: 8, textAlign: 'center' }}>{t('Washing Daddy washer')} · {w.areas}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: brand.gold, marginTop: 14, textAlign: 'center' }}>
        {sf ? t('✓ Profile photo set hai. Customers ko dikhegi.') : t('Camera icon se apni photo lagao — customer dekhega kaun aaya.')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, alignSelf: 'stretch' }}>
        {stat(<CountUp to={w.lifetime + Route.counts().done} style={num} />, t('Gaadi dhoyi'))}
        {stat(<Text style={num}>{w.rating}★</Text>, t('Rating'))}
        {stat(<Text style={num}>{w.since}</Text>, t('Se saath'))}
      </View>
    </View>
  );
}

export default function Profile() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const w = me();
  const [sk, , label] = syncState();
  const dot = sk === 'offline' ? 'wait' : sk;
  const box = { borderRadius: 22, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, overflow: 'hidden' } as const;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 17, color: c.fg }}>{t('Profile')}</Text>
      </View>
      <OnViolet><MeCard /></OnViolet>
      <View style={{ paddingHorizontal: 16 }}>
        <Section title={t('Settings')}>
          <View style={box}>
            <Row icon="help" iconColor={brand.red} title={t('Madad / SOS')} subtitle={t('Paisa, customer ya accident ki problem')} onPress={openHelpSheet} />
            <Row divider icon="user" title={t('Dost ko laao')} subtitle={t('Apna code share karo, bonus pao')} onPress={openReferSheet} />
            <Row divider icon="globe" title={t('Bhasha')} subtitle={t('Poora app Hindi mein')}
              right={<Segmented options={[{ value: 'hinglish' as const, label: 'Hinglish' }, { value: 'hi' as const, label: 'हिंदी' }]} value={S.lang || 'hinglish'} onChange={v => act.setLang(v)} />} />
            <Row divider icon="sun" title={t('Screen')} subtitle={t('Dhoop mein "Din" saaf dikhta hai')}
              right={<Segmented options={[{ value: 'light' as const, label: t('Din') }, { value: 'dark' as const, label: t('Raat') }, { value: 'auto' as const, label: t('Auto') }]} value={S.theme} onChange={v => act.setTheme(v)} />} />
            <Row divider icon={<SyncDot state={dot} />} title={t('Customer app se sync')} subtitle={t(label)} onPress={openSyncSheet} />
            <Row divider icon="reset" title={t('Aaj ka round reset')} subtitle={t('Sirf is phone se. Test ke liye.')}
              onPress={() => openResetSheet(() => { try { router.navigate('/' as any) } catch { /* stay */ } })} />
            <Row divider icon="logout" iconColor={brand.red} title={t('Log out')} subtitle={'+91 ' + fmtPhone(w.phone)} onPress={openLogoutSheet} />
          </View>
        </Section>
        {!REAL ? <DemoNote>{t('Washing Daddy Washer · test version. OTP 1234.')}</DemoNote> : null}
        <DemoNote>{t('Washing Daddy Private Limited · New Delhi')}</DemoNote>
      </View>
    </ScrollView>
  );
}
