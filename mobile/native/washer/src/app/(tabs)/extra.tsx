// Extra tab: on-demand jobs (from Ravi, or customer bookings anyone can claim). Port of renderExtra / #s-extra.
import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, DutyToggle, Footer, PullToRefresh, CallButton, DemoNote, F, Icon, Pressy, Sheet, brand, ui, useTheme } from '../../ui';
import { Extra, Money, act, isOnline, useStore } from '../../state/store';
import { mapsOf, telOf, type Job } from '../../lib/data';
import { rupee } from '../../lib/time';
import { takePhoto } from '../../lib/photo';
import { t } from '../../lib/i18n';
import { LiveSyncChip } from '../../screens/JobParts';
import { SheetTitle } from '../../screens/sheets';
import { FadeUp, IconTile, OnHeaderPill, PEmpty, PRow, PSection, RowsCard, TNUM, VHeader, WCard } from '../../screens/ProntoBits';

// the customer sees a 4-digit start code in their app and tells it at the car; the server checks it
function StartCodeSheet({ id, visible, onClose }: { id: string; visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [focus, setFocus] = useState(false);
  React.useEffect(() => { if (visible) { setCode(''); setErr(''); setBusy(false) } }, [visible]);
  const go = async () => {
    if (busy || code.length !== 4) return;
    setBusy(true); setErr('');
    const r = await act.exStartWithCode(id, code);
    setBusy(false);
    if (r === 'ok') onClose();
    else setErr(r === 'wrong' ? t('Galat code. Customer se dobara poochho.') : t('Internet nahi hai. Dobara try karo.'));
  };
  return (
    <Sheet visible={visible} onClose={() => { if (!busy) onClose() }}>
      <SheetTitle title={t('Customer se 4-digit code lo')} sub={t('Customer ke app mein start code dikhta hai. Woh code yahan daalo.')} />
      <TextInput
        value={code}
        onChangeText={(x) => { setCode(x.replace(/\D/g, '').slice(0, 4)); if (err) setErr('') }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={go}
        autoFocus
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        editable={!busy}
        placeholder="••••"
        placeholderTextColor={c.fg3}
        accessibilityLabel={t('Start code')}
        style={[{ height: 72, borderRadius: 16, borderWidth: err ? 2 : focus ? 2 : 1, borderColor: err ? c.red : focus ? c.accent : c.line, backgroundColor: c.inputBg, color: c.fg, fontFamily: F.black, fontSize: 36, letterSpacing: 18, textAlign: 'center', paddingVertical: 0, includeFontPadding: false, fontVariant: ['tabular-nums'] }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
      />
      <View accessibilityLiveRegion="polite" style={{ minHeight: 28, justifyContent: 'center', marginTop: 8 }}>
        {err ? <Text style={{ fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: c.red, textAlign: 'center' }}>{err}</Text> : null}
      </View>
      <View style={{ marginTop: 8 }}>
        <Button variant="violet" label={t('Shuru karo')} disabled={code.length !== 4 || busy} onPress={go} />
        {busy ? <ActivityIndicator color={c.primary} style={{ marginTop: 10 }} /> : null}
      </View>
    </Sheet>
  );
}

const open = (url: string) => { void Linking.openURL(url).catch(() => {}); };

function JobCard({ j }: { j: Job }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
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
      <View style={{ marginTop: 2 }}><Icon name="pin" size={18} color={c.primary} /></View>
      <Text style={[s.whereTxt, { color: c.fg3 }]}>
        {j.car || j.reg || t('Gaadi')}
        {j.area ? <Text>{' · '}<Text style={maps ? { textDecorationLine: 'underline', textDecorationColor: c.fg3 } : undefined}>{j.area}</Text></Text> : null}
        {j.customer_name ? ` · ${j.customer_name}` : ''}
      </Text>
    </View>
  );

  let action: React.ReactNode;
  if (unassigned) {
    action = (
      <>
        <DemoNote style={{ marginBottom: 8, marginTop: 4 }}>{t('Customer ne book kiya — aapke area mein hai')}</DemoNote>
        <Button variant="violet" label={t('Lo yeh kaam')} onPress={() => act.exClaim(j.id)} />
      </>
    );
  } else if (j.status === 'done') {
    action = <DemoNote>{t('Ho gaya')} {(j.finished_at || '').slice(11, 16)} · {t('aapke')} {share}</DemoNote>;
  } else if (j.status === 'doing') {
    action = shot
      ? <Button variant="violet" label={t('Kaam khatam karo')} onPress={() => act.exDone(j.id)} />
      : (
        <>
          <Button variant="violet" label={t('Kaam ki photo lo')} disabled={busy} onPress={snap} />
          <DemoNote>{t('Photo ke bina kaam band nahi hoga')}</DemoNote>
          <Button variant="ghost" label={t('Kaam khatam karo')} style={{ marginTop: 10, opacity: 0.55 }} onPress={() => act.exNeedPhoto()} />
        </>
      );
  } else if (j.status === 'on_the_way') {
    action = (
      <>
        <DemoNote>{t('Raaste mein')}</DemoNote>
        <DemoNote>{t('Pahunch ke customer se start code lo')}</DemoNote>
        <Button variant="violet" label={t('Shuru karo')} onPress={() => setCodeOpen(true)} />
      </>
    );
  } else {
    action = (
      <>
        <Button variant="violet" label={t('Nikal gaya, raaste mein hoon')} onPress={() => act.exOnWay(j.id)} />
        <Button variant="ghost" label={t('Shuru karo')} style={{ marginTop: 10 }} onPress={() => setCodeOpen(true)} />
      </>
    );
  }

  return (
    <WCard style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <IconTile icon="plus" tone={brand.gold} />
        <View style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: '45%' }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[TNUM, { fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: c.ok }]}>{share}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3 }}>{t('aapke')}</Text>
        </View>
      </View>
      {maps
        ? <Pressy onPress={() => open(maps)} scaleTo={0.99} accessibilityRole="link" accessibilityLabel={t('Google Maps mein kholo')}>{where}</Pressy>
        : where}
      {j.note ? <DemoNote>{j.note}</DemoNote> : null}
      {j.photo ? <Image source={{ uri: j.photo }} accessibilityLabel={t('Kaam ki photo')} resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: 12, marginVertical: 12, backgroundColor: c.tile2 }} /> : null}
      {maps || tel ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          {maps ? <Button variant="ghost" icon="pin" label={t('Location / Raasta')} style={{ flex: 1 }} onPress={() => open(maps)} /> : null}
          {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
        </View>
      ) : null}
      {action}
      <StartCodeSheet id={j.id} visible={codeOpen} onClose={() => setCodeOpen(false)} />
    </WCard>
  );
}

export default function ExtraScreen() {
  useStore();
  const { c } = useTheme();
  const list = Extra.shown(), done = Extra.jobs.filter((j) => j.status === 'done');
  const earned = done.reduce((a, j) => a + Money.share(j.price), 0);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <VHeader pad={56}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 }}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 22, lineHeight: 28, color: '#fff' }}>{t('Extra kaam')}</Text>
            <LiveSyncChip />
          </View>
          <View style={{ marginTop: 8 }}><OnHeaderPill><DutyToggle /></OnHeaderPill></View>
          <FadeUp index={0} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' }}>{t('On-demand')}</Text>
            <Text style={{ fontFamily: F.black, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: '#fff' }}>{list.length ? t(`${list.length} kaam baaki`) : t('Sab ho gaya')}</Text>
          </FadeUp>
        </VHeader>
        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          <View style={{ gap: 12 }}>
            {list.length
              ? list.map((j, i) => <FadeUp key={j.id} index={i + 1}><JobCard j={j} /></FadeUp>)
              : isOnline()
                ? <PEmpty icon="tabExtra" title={t('Abhi koi extra kaam nahi')} text={t('Customer ya Manager ka koi kaam aaya toh yahan dikhega.')} />
                : <PEmpty icon="tabExtra" title={t('Aap offline ho')} text={t('Naye customer kaam nahi dikhenge. Round tab pe online karo.')} />}
          </View>
          <PSection title={t('Ho gaye')} note={done.length ? `${rupee(earned)} ${t('ab tak')}` : undefined} />
          {done.length ? (
            <RowsCard>
              {done.slice(0, 20).map((j, i, arr) => (
                <PRow
                  key={j.id}
                  tile
                  icon="check"
                  tone={c.ok}
                  last={i === arr.length - 1}
                  title={j.service || t('Extra kaam')}
                  sub={`${j.car || j.reg || ''} · ${(j.finished_at || j.date || '').slice(0, 10)}`}
                  chevron={false}
                  right={<Text style={[TNUM, { fontFamily: F.bold, fontSize: 20, lineHeight: 26, color: c.fg }]}>{rupee(Money.share(j.price))}</Text>}
                />
              ))}
            </RowsCard>
          ) : <PEmpty icon="check" title={t('Abhi kuch nahi')} text={t('Jo extra kaam khatam karoge woh yahan jama hoga.')} />}
        </View>
        <Footer bottomPad={128} />
      </PullToRefresh>
    </View>
  );
}

const s = StyleSheet.create({
  where: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 },
  whereTxt: { flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
});
