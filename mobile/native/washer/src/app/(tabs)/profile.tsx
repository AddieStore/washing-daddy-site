// Profile tab: the violet me-card, settings rows, footer notes. Port of renderMe + #s-me.
import React, { useRef } from 'react';
import { Image, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DashCard, DemoNote, F, IconBubble, ListCard, PillButton, SectionTitle, Segmented, SyncDot, Tile, brand, useTheme,
} from '../../ui';
import { DOC_KINDS, Docs, Kit, REAL, Route, S, act, me, myPhoto, syncState, useStore } from '../../state/store';
import { openPhotoChooser } from '../../screens/PortraitPhoto';
import { fmtPhone } from '../../lib/data';
import { t } from '../../lib/i18n';
import { langLabel } from '../../lib/langs';
import { KitSections } from '../../screens/KitSections';
import { openHelpSheet, openLangSheet, openLogoutSheet, openReferSheet, openResetSheet, openSyncSheet } from '../../screens/sheets';

const WASHER_IMG = require('../../../assets/img/washer.webp');

function MeCard() {
  const { c } = useTheme();
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  const cam = openPhotoChooser;
  return (
    <DashCard style={{ padding: 18, alignItems: 'center' }}>
      <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: brand.gold, padding: 4 }}>
        {src
          ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%', borderRadius: 52, backgroundColor: c.soft }} />
          : <View style={{ flex: 1, borderRadius: 52, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.black, fontSize: 44, color: brand.gold }}>{w.name[0]}</Text></View>}
        <PillButton icon="cam" label={t('Profile photo badlo')} onPress={cam} tone="violet" size={44} style={{ position: 'absolute', right: -6, bottom: -4 }} />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: F.black, fontSize: 24, lineHeight: 30, color: c.fg, marginTop: 12, textAlign: 'center' }}>{w.name}</Text>
      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: c.fg2, marginTop: 2, textAlign: 'center' }}>{t('Washing Daddy washer')} · {w.areas}</Text>
      <View style={{ marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: sf ? 'rgba(20,192,138,0.15)' : c.soft }}>
        <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: sf ? c.ok : c.softInk, textAlign: 'center' }}>
          {sf ? t('✓ Profile photo set hai. Customers ko dikhegi.') : t('Camera icon se apni photo lagao — customer dekhega kaun aaya.')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignSelf: 'stretch' }}>
        <Tile style={{ flex: 1 }} icon="check" label={t('Gaadi dhoyi')} value={(w.lifetime + Route.counts().done).toLocaleString('en-IN')} />
        <Tile style={{ flex: 1 }} icon="star" tone={brand.orange} label={t('Rating')} value={String(w.rating)} />
        <Tile style={{ flex: 1 }} icon="flag" tone={brand.mint} label={t('Se saath')} value={String(w.since)} />
      </View>
    </DashCard>
  );
}

export default function Profile() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const w = me();
  const [sk, , label] = syncState();
  const dot = sk === 'offline' ? 'wait' : sk;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const kitY = useRef(0);
  const goKit = () => scroll.current?.scrollTo({ y: Math.max(0, kitY.current - 12), animated: true });
  const kitCount = Kit.items.reduce((n, i) => n + (i.qty || 0), 0);
  const docsOk = DOC_KINDS.filter(k => Docs.items[k.kind]?.status === 'verified').length;
  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{t('Profile')}</Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <MeCard />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Tile style={{ flex: 1 }} icon="tabExtra" label={t('Mera saaman')} value={kitCount} onPress={goKit} />
          <Tile style={{ flex: 1 }} icon="note" tone={brand.mint} label={t('Mere documents')} value={`${docsOk}/${DOC_KINDS.length}`} onPress={goKit} />
          <Tile style={{ flex: 1 }} icon="globe" tone={brand.orange} label={t('Bhasha')} value={langLabel(S.lang)} onPress={openLangSheet} />
        </View>
        <View onLayout={e => { kitY.current = e.nativeEvent.layout.y }}>
          <KitSections />
        </View>
        <SectionTitle title={t('Settings')} style={{ marginBottom: 0 }} />
        <ListCard icon="tabRound" title={t('Apna round set karo')} detail={t('Gaadiyan slot mein daalo aur round lock karo')} action="chevron" onPress={() => router.push('/round-setup')} />
        <ListCard icon="help" iconTone={brand.red} title={t('Madad / SOS')} detail={t('Paisa, customer ya accident ki problem')} action="chevron" onPress={openHelpSheet} />
        <ListCard icon="user" title={t('Dost ko laao')} detail={t('Apna code share karo, bonus pao')} action="chevron" onPress={openReferSheet} />
        <ListCard icon="globe" title={t('Bhasha')} detail={t('App ki bhasha chuno')} onPress={openLangSheet} action="chevron"
          right={<Text style={{ fontFamily: F.bold, fontSize: 13.5, color: c.fg2 }}>{langLabel(S.lang)}</Text>} />
        <ListCard icon="sun" title={t('Screen')} detail={t('Dhoop mein "Din" saaf dikhta hai')}>
          <Segmented options={[{ value: 'light' as const, label: t('Din') }, { value: 'dark' as const, label: t('Raat') }, { value: 'auto' as const, label: t('Auto') }]} value={S.theme} onChange={v => act.setTheme(v)} />
        </ListCard>
        {Platform.OS === 'android' ? (
          <ListCard icon="sun" title={t('Awaaz alerts pakke chalein')} detail={t('Battery saver mein App ko "No restrictions" do, tab band hone par bhi awaaz aayegi')} action="chevron"
            onPress={() => { Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings().catch(() => {})) }} />
        ) : null}
        <ListCard leading={<IconBubble size={42}><SyncDot state={dot} /></IconBubble>} title={t('Customer app se sync')} detail={t(label)} action="chevron" onPress={openSyncSheet} />
        <ListCard icon="reset" title={t('Aaj ka round reset')} detail={t('Sirf is phone se. Test ke liye.')} action="chevron"
          onPress={() => openResetSheet(() => { try { router.navigate('/' as any) } catch { /* stay */ } })} />
        <ListCard icon="logout" iconTone={brand.red} title={t('Log out')} detail={'+91 ' + fmtPhone(w.phone)} action="chevron" onPress={openLogoutSheet} />
        {!REAL ? <DemoNote>{t('Washing Daddy Washer · test version. OTP 1234.')}</DemoNote> : null}
        <DemoNote>{t('Washing Daddy Private Limited · New Delhi')}</DemoNote>
      </View>
    </ScrollView>
  );
}
