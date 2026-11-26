// Profile tab, reference look: small identity header, then Groups of Rows (my work, account preferences, others) and the app version.
import React from 'react';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  Chip, DemoNote, DutyToggle, F, Group, Icon, PullToRefresh, Row, ScreenTitle, SectionLabel, SyncDot, useTheme,
} from '../../ui';
import { FadeUp, TNUM } from '../../screens/ProntoBits';
import { DOC_KINDS, REAL, Route, S, me, myPhoto, syncState, useStore } from '../../state/store';
import { openPhotoChooser } from '../../screens/PortraitPhoto';
import { fmtPhone } from '../../lib/data';
import { t } from '../../lib/i18n';
import { langLabel } from '../../lib/langs';
import { docsApproved, kitCount, openDocsSheet, openKitSheet } from '../../screens/KitSections';
import { myTrust } from '../../screens/TrustData';
import { openComplaints, openRewards, useOutlook } from '../../screens/RewardsCards';
import { openAttendanceMonth } from '../../screens/DayCards';
import { rupee } from '../../lib/time';
import { monthComplaints } from '../../state/store';
import { openHelpSheet, openLangSheet, openLogoutSheet, openReferSheet, openResetSheet, openSyncSheet, openThemeSheet } from '../../screens/sheets';

const WASHER_IMG = require('../../../assets/img/washer.webp');
const THEME_LABEL = { light: 'Din', dark: 'Raat', auto: 'Auto' } as const;

/** Small identity header: 60px avatar, name, role line, quiet "change photo" link. */
function Identity() {
  const { c } = useTheme();
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  const tr = myTrust();
  return (
    <Group>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
        <Pressable onPress={openPhotoChooser} accessibilityRole="button" accessibilityLabel={t('Profile photo badlo')}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {src
              ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
              : <Text style={{ fontFamily: F.bold, fontSize: 24, color: c.fg }}>{w.name[0]}</Text>}
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.fg }}>{w.name}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.grey }}>+91 {fmtPhone(w.phone)}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: c.grey }}>{w.areas}</Text>
        </View>
        <Chip tone={tr.verified ? 'green' : 'amber'} icon={tr.verified ? 'check' : undefined}>{t(tr.verified ? 'WD Verified' : 'Verification baaki')}</Chip>
      </View>
      <Pressable onPress={openPhotoChooser} accessibilityRole="button" accessibilityLabel={t('Profile photo badlo')}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}>
        <Icon name="cam" size={16} color={c.fg} />
        <Text style={{ fontFamily: F.medium, fontSize: 14, color: c.fg }}>{sf ? t('Profile photo badlo') : t('Apni photo lagao')}</Text>
      </Pressable>
    </Group>
  );
}

function Stats() {
  const { c } = useTheme();
  const w = me();
  const cell = (v: string, l: string) => (
    <View key={l} accessible accessibilityLabel={`${l} ${v}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.bold, fontSize: 20, lineHeight: 26, color: c.fg }]}>{v}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey }}>{l}</Text>
    </View>
  );
  return (
    <Group>
      <View style={{ flexDirection: 'row' }}>
        {cell((w.lifetime + Route.counts().done).toLocaleString('en-IN'), t('Gaadi dhoyi'))}
        {cell(String(w.rating), t('Rating'))}
        {cell(String(w.since), t('Se saath'))}
      </View>
    </Group>
  );
}

export default function Profile() {
  useStore();
  const { c } = useTheme();
  const w = me();
  const [sk, , label] = syncState();
  const dot = sk === 'offline' ? 'wait' : sk;
  const o = useOutlook(), m = o.r.month;
  const nComp = monthComplaints().length;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <ScreenTitle title={t('Profile')} right={<DutyToggle />} />
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FadeUp index={0}><Identity /></FadeUp>
          <FadeUp index={1} style={{ marginTop: 12 }}><Stats /></FadeUp>

          <SectionLabel>{t('Mera kaam')}</SectionLabel>
          <FadeUp index={2}>
            <Group>
              <Row icon="tabRound" label={t('Apna round')} sub={t('Gaadiyan slot mein daalo aur round lock karo')} onPress={() => router.push('/round-setup')} />
              <Row icon="calendar" label={t('Attendance')} sub={t('Check-in, check-out aur mahine ka hisaab')} value={`${m.came}/${m.total} ${t('din')}`} onPress={openAttendanceMonth} />
              <Row icon="gift" label={t('Bonus aur rewards')} value={`${rupee(o.possible)} ${t('tak')}`} onPress={openRewards} />
              <Row icon="note" label={t('Customer feedback')} value={nComp ? String(nComp) : undefined} onPress={openComplaints} />
              <Row icon="kit" label={t('Mera saaman')} value={String(kitCount())} onPress={openKitSheet} />
              <Row icon="doc" label={t('Mere documents')} value={`${docsApproved()}/${DOC_KINDS.length}`} onPress={openDocsSheet} />
            </Group>
          </FadeUp>

          <SectionLabel>{t('Account preferences')}</SectionLabel>
          <FadeUp index={3}>
            <Group>
              <Row icon="globe" label={t('Bhasha')} value={langLabel(S.lang)} onPress={openLangSheet} />
              <Row icon="sun" label={t('Screen')} value={t(THEME_LABEL[S.theme] ?? 'Auto')} onPress={openThemeSheet} />
              {Platform.OS === 'android' ? (
                <Row icon="bell" label={t('Battery')} sub={t('Awaaz alerts pakke chalein: App ko "No restrictions" do')}
                  onPress={() => { Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings().catch(() => {})) }} />
              ) : null}
              <Row icon={<SyncDot state={dot} />} label={t('Customer app se sync')} sub={t(label)} onPress={openSyncSheet} />
              <Row icon="reset" label={t('Aaj ka round reset')} sub={t('Sirf is phone se. Test ke liye.')}
                onPress={() => openResetSheet(() => { try { router.navigate('/' as any) } catch { /* stay */ } })} />
              <Row icon="shield" label={t('Privacy')} sub={t('Hum aapka data kaise rakhte hain')} onPress={() => { Linking.openURL('https://washingdaddy.com/privacy.html').catch(() => {}) }} />
            </Group>
          </FadeUp>

          <SectionLabel>{t('Others')}</SectionLabel>
          <FadeUp index={4}>
            <Group>
              <Row icon="user" label={t('Refer & earn')} sub={t('Apna code share karo, bonus pao')} onPress={openReferSheet} />
              <Row icon="help" label={t('Madad / SOS')} sub={t('Paisa, customer ya accident ki problem')} onPress={openHelpSheet} />
              <Row icon="doc" label={t('Account delete karwao')}
                onPress={() => { Linking.openURL('mailto:Business@washingdaddy.com?subject=' + encodeURIComponent('WD Partner: delete my account +91 ' + w.phone) + '&body=' + encodeURIComponent('Please delete my WD Partner account and data. Phone: +91 ' + w.phone)).catch(() => Linking.openURL('https://washingdaddy.com/privacy.html#deletion-of-account-and-personal-data').catch(() => {})) }} />
              <Row icon="logout" label={t('Log out')} destructive onPress={openLogoutSheet} />
            </Group>
          </FadeUp>

          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, textAlign: 'center', marginTop: 28 }}>
            {'Washing Daddy Partner · v' + (Constants.expoConfig?.version ?? '1.0.0')}
          </Text>
          {!REAL ? <DemoNote style={{ marginTop: 8, textAlign: 'center' }}>{t('Washing Daddy washer · test version. OTP 1234.')}</DemoNote> : null}
        </View>
      </PullToRefresh>
    </View>
  );
}
