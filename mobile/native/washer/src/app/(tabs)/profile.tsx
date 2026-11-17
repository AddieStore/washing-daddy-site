// Profile tab: the violet me-card, settings rows, footer notes. Port of renderMe + #s-me.
import React, { useRef } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  DemoNote, DutyToggle, F, Footer, Icon, PillButton, PullToRefresh, Segmented, SyncDot, TrustRow, VerifiedBadge, brand, useTheme,
} from '../../ui';
import { FadeUp, IconTile, OnHeaderPill, PRow, PSection, RowsCard, TNUM, TileBox, VHeader, WCard, tint } from '../../screens/ProntoBits';
import { DOC_KINDS, Docs, Kit, REAL, Route, S, act, me, myPhoto, syncState, useStore } from '../../state/store';
import { openPhotoChooser } from '../../screens/PortraitPhoto';
import { fmtPhone } from '../../lib/data';
import { t } from '../../lib/i18n';
import { langLabel } from '../../lib/langs';
import { KitSections } from '../../screens/KitSections';
import { myTrust } from '../../screens/TrustData';
import { openComplaints, openRewards } from '../../screens/RewardsCards';
import { openHelpSheet, openLangSheet, openLogoutSheet, openReferSheet, openResetSheet, openSyncSheet } from '../../screens/sheets';

const WASHER_IMG = require('../../../assets/img/washer.webp');

function ProfileHead() {
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  return (
    <VHeader pad={56}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 22, lineHeight: 28, color: '#fff' }}>{t('Profile')}</Text>
        <OnHeaderPill><DutyToggle /></OnHeaderPill>
      </View>
      <FadeUp index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <View style={{ width: 80, height: 80 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: '#EDE6FF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {src
              ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
              : <Text style={{ fontFamily: F.black, fontSize: 32, color: brand.violet }}>{w.name[0]}</Text>}
          </View>
          <View style={{ position: 'absolute', right: -6, bottom: -4, width: 32, height: 32 }}>
            <PillButton icon="cam" label={t('Profile photo badlo')} onPress={openPhotoChooser} tone="violet" size={32} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 24, lineHeight: 32, color: '#fff' }}>{w.name}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)' }}>{t('Washing Daddy washer')} · {w.areas}</Text>
          <Pressable onPress={openPhotoChooser} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Profile photo badlo')} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#FFD166' }}>{t('Profile photo badlo')}</Text>
            <Icon name="chevron" size={14} color="#FFD166" />
          </Pressable>
        </View>
      </FadeUp>
    </VHeader>
  );
}

function TrustCard() {
  const { c, dark } = useTheme();
  const w = me();
  const sf = myPhoto();
  const tr = myTrust();
  return (
    <WCard style={{ padding: 16, alignItems: 'center' }}>
      <VerifiedBadge verified={tr.verified} label={t(tr.verified ? 'WD Verified' : 'Verification baaki')} />
      <TrustRow
        style={{ justifyContent: 'center', marginTop: 12 }}
        pendingLabel={t('baaki')}
        items={[
          { key: 'id', icon: 'id', label: t('ID verified'), earned: tr.id },
          { key: 'docs', icon: 'doc', label: t('Documents approved'), earned: tr.docs },
          { key: 'kit', icon: 'kit', label: t('Kit ready'), earned: tr.kit },
          { key: 'bg', icon: 'shield', label: t('Background checked'), earned: tr.background },
        ]}
      />
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3, textAlign: 'center', marginTop: 12 }}>{t('Sirf WD team ke check kiye hue badge hi dikhte hain')}</Text>
      <View style={{ marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: sf ? tint(c.ok, 0.12) : c.soft }}>
        <Text style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 16, color: sf ? c.ok : c.softInk, textAlign: 'center' }}>
          {sf ? t('✓ Profile photo set hai. Customers ko dikhegi.') : t('Camera icon se apni photo lagao — customer dekhega kaun aaya.')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignSelf: 'stretch' }}>
        {([
          ['check', c.primary, (w.lifetime + Route.counts().done).toLocaleString('en-IN'), t('Gaadi dhoyi')],
          ['star', dark ? '#FFD566' : '#8A5B00', String(w.rating), t('Rating')],
          ['flag', dark ? '#5CE6B5' : '#0B7A57', String(w.since), t('Se saath')],
        ] as const).map(([ic, tone, v, l]) => (
          <View key={l} accessible accessibilityLabel={`${l} ${v}`} style={{ flex: 1, gap: 8, padding: 12, borderRadius: 12, backgroundColor: c.soft }}>
            <IconTile icon={ic} tone={tone} />
            <View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.bold, fontSize: 18, lineHeight: 24, color: c.fg }]}>{v}</Text>
              <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 11, lineHeight: 16, color: c.fg3 }}>{l}</Text>
            </View>
          </View>
        ))}
      </View>
    </WCard>
  );
}

export default function Profile() {
  useStore();
  const { c } = useTheme();
  const w = me();
  const [sk, , label] = syncState();
  const dot = sk === 'offline' ? 'wait' : sk;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const kitY = useRef(0);
  const goKit = () => scroll.current?.scrollTo({ y: Math.max(0, kitY.current - 12), animated: true });
  const kitCount = Kit.items.reduce((n, i) => n + (i.qty || 0), 0);
  const docsOk = DOC_KINDS.filter(k => Docs.items[k.kind]?.status === 'verified').length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <PullToRefresh ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
      <ProfileHead />
      <View style={{ paddingHorizontal: 16, marginTop: -36, gap: 12 }}>
        <FadeUp index={1} style={{ flexDirection: 'row', gap: 12 }}>
          <TileBox icon="tabExtra" label={t('Mera saaman')} value={kitCount} onPress={goKit} />
          <TileBox icon="note" label={t('Mere documents')} value={`${docsOk}/${DOC_KINDS.length}`} onPress={goKit} />
          <TileBox icon="globe" label={t('Bhasha')} value={langLabel(S.lang)} onPress={openLangSheet} />
        </FadeUp>
        <FadeUp index={2}><TrustCard /></FadeUp>
        <View onLayout={e => { kitY.current = e.nativeEvent.layout.y }}>
          <KitSections />
        </View>
        <FadeUp index={3}>
          <RowsCard>
            <PRow icon="gift" title={t('Attendance aur bonus')} sub={t('Early bird, poora mahina aur no complaint, ₹3,000 tak')} onPress={openRewards} />
            <PRow icon="note" title={t('Customer feedback')} sub={t('Customer ki complaint aur unka haal')} onPress={openComplaints} last />
          </RowsCard>
        </FadeUp>
        <PSection title={t('Settings')} style={{ marginTop: 12, marginBottom: 0 }} />
        <FadeUp index={4}>
          <RowsCard>
            <PRow icon="tabRound" title={t('Apna round set karo')} sub={t('Gaadiyan slot mein daalo aur round lock karo')} onPress={() => router.push('/round-setup')} />
            <PRow icon="help" tone={brand.red} title={t('Madad / SOS')} sub={t('Paisa, customer ya accident ki problem')} onPress={openHelpSheet} />
            <PRow icon="user" title={t('Dost ko laao')} sub={t('Apna code share karo, bonus pao')} onPress={openReferSheet} />
            <PRow icon="globe" title={t('Bhasha')} sub={t('App ki bhasha chuno')} onPress={openLangSheet}
              right={<Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3 }}>{langLabel(S.lang)}</Text>} />
            <PRow icon="sun" title={t('Screen')} sub={t('Dhoop mein "Din" saaf dikhta hai')}>
              <Segmented options={[{ value: 'light' as const, label: t('Din') }, { value: 'dark' as const, label: t('Raat') }, { value: 'auto' as const, label: t('Auto') }]} value={S.theme} onChange={v => act.setTheme(v)} />
            </PRow>
            {Platform.OS === 'android' ? (
              <PRow icon="sun" title={t('Awaaz alerts pakke chalein')} sub={t('Battery saver mein App ko "No restrictions" do, tab band hone par bhi awaaz aayegi')}
                onPress={() => { Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings().catch(() => {})) }} />
            ) : null}
            <PRow leading={<View style={{ width: 24, alignItems: 'center' }}><SyncDot state={dot} /></View>} title={t('Customer app se sync')} sub={t(label)} onPress={openSyncSheet} />
            <PRow icon="reset" title={t('Aaj ka round reset')} sub={t('Sirf is phone se. Test ke liye.')}
              onPress={() => openResetSheet(() => { try { router.navigate('/' as any) } catch { /* stay */ } })} />
            <PRow icon="logout" danger title={t('Log out')} sub={'+91 ' + fmtPhone(w.phone)} onPress={openLogoutSheet} last />
          </RowsCard>
        </FadeUp>
        {!REAL ? <DemoNote>{t('Washing Daddy Washer · test version. OTP 1234.')}</DemoNote> : null}
      </View>
      <Footer bottomPad={120} />
    </PullToRefresh>
    </View>
  );
}
