// Profile tab, reference look: small identity header, then Groups of Rows (my work, account preferences, others) and the app version.
import React from 'react';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  DemoNote, F, Group, Icon, Lift, PCard, PageHeader, PTitle, PullToRefresh, Row, StatTile, SyncDot, useTheme,
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
import { rupee } from '../../lib/time';
import { monthComplaints } from '../../state/store';
import { openHelpSheet, openLangSheet, openLogoutSheet, openReferSheet, openResetSheet, openSyncSheet, openThemeSheet } from '../../screens/sheets';

const WASHER_IMG = require('../../../assets/img/washer.webp');
const THEME_LABEL = { light: 'Din', dark: 'Raat', auto: 'Auto' } as const;

/** Identity block that sits on the violet header: 76px ringed photo, name, phone, area, verified chip, gold "change photo" link. */
function Identity() {
  const w = me();
  const sf = myPhoto();
  const src = sf?.url ? { uri: sf.url } : w.img === 'washer' ? WASHER_IMG : null;
  const tr = myTrust();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
      <Pressable onPress={openPhotoChooser} accessibilityRole="button" accessibilityLabel={t('Profile photo badlo')}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#EDE6FF', borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {src
            ? <Image source={src} accessibilityLabel={w.name} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            : <Text style={{ fontFamily: F.display, fontSize: 32, color: '#5409DA' }}>{w.name[0]}</Text>}
        </View>
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFBA08', borderWidth: 2, borderColor: '#5409DA', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="cam" size={14} color="#141414" />
        </View>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.7, color: '#fff' }}>{w.name}</Text>
        <Text numberOfLines={1} style={[TNUM, { fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.84)' }]}>+91 {fmtPhone(w.phone)}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.7)' }}>{w.areas}</Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 24, borderRadius: 12, backgroundColor: tr.verified ? 'rgba(74,222,128,0.2)' : 'rgba(255,209,102,0.22)' }}>
            <Icon name={tr.verified ? 'check' : 'shield'} size={12} color={tr.verified ? '#86EFAC' : '#FFD166'} />
            <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: tr.verified ? '#86EFAC' : '#FFD166' }}>{t(tr.verified ? 'WD Verified' : 'Verification baaki')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Stats() {
  const w = me();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <StatTile icon="car" tone="blue" value={(w.lifetime + Route.counts().done).toLocaleString('en-IN')} label={t('Gaadi dhoyi')} />
      <StatTile icon="star" tone="amber" value={String(w.rating)} label={t('Rating')} />
      <StatTile icon="calendar" tone="violet" value={String(w.since)} label={t('Se saath')} />
    </View>
  );
}

/** What is still missing for a complete profile: photo, documents, kit. Hidden once everything is done. */
function Completion() {
  const { c } = useTheme();
  const sf = myPhoto();
  const steps = [
    { ok: !!sf?.url || me().img === 'washer', label: t('Profile photo'), go: openPhotoChooser },
    { ok: docsApproved() >= DOC_KINDS.length, label: t('Documents'), go: openDocsSheet },
    { ok: kitCount() > 0, label: t('Mera saaman'), go: openKitSheet },
  ];
  const left = steps.filter((x) => !x.ok);
  if (!left.length) return null;
  const doneN = steps.length - left.length;
  return (
    <PCard style={{ padding: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 21, letterSpacing: -0.2, color: c.fg }}>{t('Profile poora karo')}</Text>
        <Text style={[TNUM, { fontFamily: F.semi, fontSize: 12.5, color: c.primary }]}>{doneN}/{steps.length}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.soft, marginTop: 10, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(6, doneN / steps.length * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: c.primary }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {left.map((x) => (
          <Pressable key={x.label} onPress={x.go} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(84,9,218,0.08)' }}>
            <Icon name="plus" size={14} color={c.primary} />
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.primary }}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
    </PCard>
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
      <PullToRefresh style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <PageHeader title={t('Profile')} bottomPad={70}><FadeUp index={0}><Identity /></FadeUp></PageHeader>
        <Lift>
          <FadeUp index={1}><Stats /></FadeUp>
          <FadeUp index={2}><Completion /></FadeUp>

          <PTitle title={t('Mera kaam')} />
          <FadeUp index={2}>
            <Group>
              <Row icon="calendar" label={t('Attendance')} value={`${m.came}/${m.total} ${t('din')}`} onPress={openRewards} />
              <Row icon="gift" label={t('Bonus aur rewards')} value={`${rupee(o.possible)} ${t('tak')}`} onPress={openRewards} />
              <Row icon="note" label={t('Customer feedback')} value={nComp ? String(nComp) : undefined} onPress={openComplaints} />
              <Row icon="kit" label={t('Mera saaman')} value={String(kitCount())} onPress={openKitSheet} />
              <Row icon="doc" label={t('Mere documents')} value={`${docsApproved()}/${DOC_KINDS.length}`} onPress={openDocsSheet} />
            </Group>
          </FadeUp>

          <PTitle title={t('Account preferences')} />
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

          <PTitle title={t('Others')} />
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
        </Lift>
      </PullToRefresh>
    </View>
  );
}
