// Extra tab: on-demand jobs (from Ravi, or customer bookings anyone can claim). Port of renderExtra / #s-extra.
import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigTitle, Button, CallButton, Card, DemoNote, Empty, Eyebrow, F, Icon, Pressy, brand, ui, useTheme } from '../../ui';
import { Extra, Money, act, isOnline, useStore } from '../../state/store';
import { mapsOf, telOf, type Job } from '../../lib/data';
import { rupee } from '../../lib/time';
import { takePhoto } from '../../lib/photo';
import { t } from '../../lib/i18n';
import { TopBar } from '../../screens/TopBar';

const open = (url: string) => { void Linking.openURL(url).catch(() => {}); };

function SecHead({ title, meta }: { title: string; meta?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.shout, fontSize: 24, lineHeight: 28, textTransform: 'uppercase', color: c.fg, flexShrink: 1 }}>{title}</Text>
      {meta ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{meta}</Text> : null}
    </View>
  );
}

function JobCard({ j }: { j: Job }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const shot = !!j.photo, unassigned = !j.washer_id;
  const maps = mapsOf(j), tel = telOf(j.phone);
  const share = rupee(Money.share(j.price));

  const snap = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await takePhoto();
      if (p) await act.exPhoto(j.id, p.url);
    } catch (e: any) {
      ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo'));
    } finally { setBusy(false); }
  };

  const where = (
    <View style={s.where}>
      <View style={{ marginTop: 2 }}><Icon name="pin" size={18} color={brand.orange} /></View>
      <Text style={[s.whereTxt, { color: c.fg2 }]}>
        {j.car || j.reg || t('Gaadi')}
        {j.area ? <Text>{' · '}<Text style={maps ? { textDecorationLine: 'underline', textDecorationColor: brand.orange } : undefined}>{j.area}</Text></Text> : null}
        {j.customer_name ? ` · ${j.customer_name}` : ''}
      </Text>
    </View>
  );

  let action: React.ReactNode;
  if (unassigned) {
    action = (
      <>
        <DemoNote style={{ marginBottom: 8, marginTop: 4 }}>{t('Customer ne book kiya — aapke area mein hai')}</DemoNote>
        <Button variant="gold" label={t('Lo yeh kaam')} onPress={() => act.exClaim(j.id)} />
      </>
    );
  } else if (j.status === 'done') {
    action = <DemoNote>{t('Ho gaya')} {(j.finished_at || '').slice(11, 16)} · {t('aapke')} {share}</DemoNote>;
  } else if (j.status === 'doing') {
    action = shot
      ? <Button variant="mint" label={t('Kaam khatam karo')} onPress={() => act.exDone(j.id)} />
      : (
        <>
          <Button variant="violet" label={t('Kaam ki photo lo')} disabled={busy} onPress={snap} />
          <DemoNote>{t('Photo ke bina kaam band nahi hoga')}</DemoNote>
          <Button variant="ghost" label={t('Kaam khatam karo')} style={{ marginTop: 10, opacity: 0.55 }} onPress={() => act.exNeedPhoto()} />
        </>
      );
  } else {
    action = <Button variant="violet" label={t('Shuru karo')} onPress={() => act.exStart(j.id)} />;
  }

  return (
    <Card style={{ padding: 16, marginBottom: 14 }}>
      <SecHead title={j.service || t('Extra kaam')} meta={`${rupee(j.price)} · ${t('aapke')} ${share}`} />
      {maps
        ? <Pressy onPress={() => open(maps)} scaleTo={0.99} accessibilityRole="link" accessibilityLabel={t('Google Maps mein kholo')}>{where}</Pressy>
        : where}
      {j.note ? <DemoNote>{j.note}</DemoNote> : null}
      {maps || tel ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4, alignItems: 'center' }}>
          {maps ? <Button variant="ghost" icon="pin" label={t('Location / Raasta')} style={{ flex: 1 }} onPress={() => open(maps)} /> : null}
          {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
        </View>
      ) : null}
      {j.photo ? <Image source={{ uri: j.photo }} accessibilityLabel={t('Kaam ki photo')} resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: 22, marginVertical: 10, backgroundColor: c.tile2 }} /> : null}
      {action}
    </Card>
  );
}

export default function ExtraScreen() {
  useStore();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const list = Extra.shown(), done = Extra.jobs.filter((j) => j.status === 'done');
  const earned = done.reduce((a, j) => a + Money.share(j.price), 0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 128 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <TopBar title={t('Extra kaam')} />
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ paddingTop: 18, paddingBottom: 4 }}>
            <Eyebrow>{list.length ? t(`${list.length} kaam baaki`) : t('Sab ho gaya')}</Eyebrow>
            <BigTitle size={50} em={t('kaam.')}>{t('On-demand')}</BigTitle>
          </View>
          <View style={{ marginTop: 18 }}>
            {list.length
              ? list.map((j) => <JobCard key={j.id} j={j} />)
              : isOnline()
                ? <Empty title={t('Abhi koi extra kaam nahi')} text={t('Customer ya Ravi ka koi kaam aaya toh yahan dikhega.')} />
                : <Empty title={t('Aap offline ho')} text={t('Naye customer kaam nahi dikhenge. Round tab pe online karo.')} />}
          </View>
          <View style={{ marginTop: 26 }}>
            <SecHead title={t('Ho gaye')} meta={done.length ? `${rupee(earned)} ${t('ab tak')}` : undefined} />
            {done.length ? (
              <Card style={{ overflow: 'hidden' }}>
                {done.slice(0, 20).map((j, i) => (
                  <View key={j.id} style={[s.row, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 16, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, color: c.fg3 }}>{j.car || j.reg || ''} · {(j.finished_at || j.date || '').slice(0, 10)}</Text>
                    </View>
                    <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg }}>{rupee(Money.share(j.price))}</Text>
                  </View>
                ))}
              </Card>
            ) : <Empty title={t('Abhi kuch nahi')} text={t('Jo extra kaam khatam karoge woh yahan jama hoga.')} />}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  where: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 },
  whereTxt: { flex: 1, fontFamily: F.semi, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 66 },
});
