// Profile tab: the violet me-card, settings rows, footer notes. Port of renderMe + #s-me.
import React, { useRef } from 'react';
import { Image, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DashCard, DemoNote, DutyToggle, F, Footer, Icon, IconBubble, ListCard, PillButton, PullToRefresh, SectionTitle, Segmented, SyncDot, Tile, TrustRow, VerifiedBadge, brand, useTheme,
} from '../../ui';
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

function MeCard() {
  const { c, dark } = useTheme();
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  const cam = openPhotoChooser;
  const tr = myTrust();
  return (
    <DashCard style={{ padding: 19, alignItems: 'center' }}>
      <View style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: c.primary, backgroundColor: c.soft, padding: 2 }}>
        {src
          ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%', borderRadius: 52, backgroundColor: c.soft }} />
          : <View style={{ flex: 1, borderRadius: 52, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.black, fontSize: 44, color: '#fff' }}>{w.name[0]}</Text></View>}
        <View style={{ position: 'absolute', right: -10, bottom: -6, width: 36, height: 36 }}>
          <PillButton icon="cam" label={t('Profile photo badlo')} onPress={cam} tone="violet" size={36} />
        </View>
      </View>
      <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 29, lineHeight: 40, color: c.fg, marginTop: 8, textAlign: 'center' }}>{w.name}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 20, color: c.fg3, marginTop: 0, textAlign: 'center' }}>{t('Washing Daddy washer')} · {w.areas}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 10, alignItems: 'center' }}>
        <VerifiedBadge verified={tr.verified} label={t(tr.verified ? 'WD Verified' : 'Verification baaki')} />
        <TrustRow
          style={{ justifyContent: 'center' }}
          pendingLabel={t('baaki')}
          items={[
            { key: 'id', icon: 'id', label: t('ID verified'), earned: tr.id },
            { key: 'docs', icon: 'doc', label: t('Documents approved'), earned: tr.docs },
            { key: 'kit', icon: 'kit', label: t('Kit ready'), earned: tr.kit },
            { key: 'bg', icon: 'shield', label: t('Background checked'), earned: tr.background },
          ]}
        />
        <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3, textAlign: 'center' }}>{t('Sirf WD team ke check kiye hue badge hi dikhte hain')}</Text>
      </View>
      <View style={{ marginTop: 14, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: sf ? 'rgba(20,192,138,0.16)' : c.soft }}>
        <Text style={{ fontFamily: F.semi, fontSize: 12, color: sf ? c.ok : c.softInk, textAlign: 'center' }}>
          {sf ? t('✓ Profile photo set hai. Customers ko dikhegi.') : t('Camera icon se apni photo lagao — customer dekhega kaun aaya.')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignSelf: 'stretch' }}>
        {([
          ['check', c.primary, (w.lifetime + Route.counts().done).toLocaleString('en-IN'), t('Gaadi dhoyi')],
          ['star', brand.gold, String(w.rating), t('Rating')],
          ['flag', brand.mint, String(w.since), t('Se saath')],
        ] as const).map(([ic, tone, v, l]) => (
          <View key={l} accessible accessibilityLabel={`${l} ${v}`} style={{ flex: 1, gap: 8, padding: 11, borderRadius: 16, borderWidth: 1, borderColor: c.fg, backgroundColor: c.soft }}>
            <IconBubble icon={ic} size={36} tint={tone === brand.gold ? (dark ? '#FFD566' : '#8A5B00') : tone === brand.mint ? (dark ? '#5CE6B5' : '#0B7A57') : tone} bg={tone === c.primary ? 'rgba(84,9,218,0.12)' : tone === brand.gold ? 'rgba(255,186,8,0.22)' : 'rgba(20,192,138,0.16)'} />
            <View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 24, color: c.fg }}>{v}</Text>
              <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 10, lineHeight: 16, color: c.fg3 }}>{l}</Text>
            </View>
          </View>
        ))}
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
    <PullToRefresh ref={scroll} style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 28, lineHeight: 36, color: c.fg }}>{t('Profile')}</Text>
        <View style={{ marginTop: 8 }}><DutyToggle /></View>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <MeCard />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Tile compact style={{ flex: 1, minWidth: 0 }} icon="tabExtra" label={t('Mera saaman')} value={kitCount} onPress={goKit} />
          <Tile compact style={{ flex: 1, minWidth: 0 }} icon="note" tone={brand.mint} label={t('Mere documents')} value={`${docsOk}/${DOC_KINDS.length}`} onPress={goKit} />
          <Tile compact style={{ flex: 1, minWidth: 0 }} icon="globe" tone={brand.gold} label={t('Bhasha')} value={langLabel(S.lang)} onPress={openLangSheet} />
        </View>
        <View onLayout={e => { kitY.current = e.nativeEvent.layout.y }}>
          <KitSections />
        </View>
        <ListCard icon="gift" title={t('Attendance aur bonus')} detail={t('Early bird, poora mahina aur no complaint, ₹3,000 tak')} action="chevron" onPress={openRewards} />
        <ListCard icon="note" title={t('Customer feedback')} detail={t('Customer ki complaint aur unka haal')} action="chevron" onPress={openComplaints} />
        <SectionTitle title={t('Settings')} style={{ marginBottom: 0 }} />
        <ListCard icon="tabRound" title={t('Apna round set karo')} detail={t('Gaadiyan slot mein daalo aur round lock karo')} action="chevron" onPress={() => router.push('/round-setup')} />
        <ListCard icon="help" iconTone={brand.red} title={t('Madad / SOS')} detail={t('Paisa, customer ya accident ki problem')} action="chevron" onPress={openHelpSheet} />
        <ListCard icon="user" title={t('Dost ko laao')} detail={t('Apna code share karo, bonus pao')} action="chevron" onPress={openReferSheet} />
        <ListCard icon="globe" title={t('Bhasha')} detail={t('App ki bhasha chuno')} onPress={openLangSheet} action="chevron"
          right={<Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3 }}>{langLabel(S.lang)}</Text>} />
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
      </View>
      <Footer bottomPad={120} />
    </PullToRefresh>
  );
}
