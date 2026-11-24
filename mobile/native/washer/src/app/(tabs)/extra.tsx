// Extra tab: on-demand jobs (from Ravi, or customer bookings anyone can claim). Port of renderExtra / #s-extra.
import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, CallButton, Chip, DemoNote, DutyToggle, F, Group, PullToRefresh, Pressy, ReceiptRow, Row, ScreenTitle, SectionLabel, Sheet, StickyBar, ui, useTheme } from '../../ui';
import { Extra, Money, act, isOnline, useStore } from '../../state/store';
import { mapsOf, telOf, type Job } from '../../lib/data';
import { rupee } from '../../lib/time';
import { takePhoto } from '../../lib/photo';
import { t } from '../../lib/i18n';
import { SheetTitle } from '../../screens/sheets';
import { FadeUp, TNUM } from '../../screens/ProntoBits';
import { EmptyBlock } from '../../screens/EmptyBlock';

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
      <View style={{ height: 72, marginTop: 4 }}>
        <View pointerEvents="none" style={{ flexDirection: 'row', gap: 12, height: 72 }}>
          {[0, 1, 2, 3].map((i) => {
            const active = focus && !err && i === Math.min(code.length, 3);
            return (
              <View key={i} style={{ flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: err || active ? 1.5 : 1, borderColor: err ? c.red : active ? c.primary : c.line, backgroundColor: active ? c.card : c.canvas }}>
                <Text style={{ fontFamily: F.bold, fontSize: 32, lineHeight: 40, color: c.fg, fontVariant: ['tabular-nums'] }}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          value={code}
          onChangeText={(x) => { setCode(x.replace(/\D/g, '').slice(0, 4)); if (err) setErr('') }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onSubmitEditing={go}
          autoFocus
          caretHidden
          selection={{ start: code.length, end: code.length }}   // the input is invisible over the boxes: a tap must never put the caret mid-code
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          editable={!busy}
          accessibilityLabel={t('Start code')}
          style={[StyleSheet.absoluteFill, { color: 'transparent', backgroundColor: 'transparent', fontSize: 32, textAlign: 'center', opacity: 0.02 }, Platform.OS === 'web' ? ({ outlineStyle: 'none', cursor: 'text' } as any) : null]}
        />
      </View>
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

function JobCard({ j, picked, onPick }: { j: Job; picked?: boolean; onPick?: () => void }) {
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

  const where = [j.car || j.reg || t('Gaadi'), j.area, j.customer_name].filter(Boolean).join(' · ');

  // the claim button lives in the sticky bar; the other steps stay on the card
  let action: React.ReactNode = null;
  if (unassigned) {
    action = <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey }}>{t('Customer ne book kiya — aapke area mein hai')}</Text>;
  } else if (j.status === 'done') {
    action = <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey }}>{t('Ho gaya')} {(j.finished_at || '').slice(11, 16)} · {t('aapke')} {share}</Text>;
  } else if (j.status === 'doing') {
    action = shot
      ? <Button variant="violet" label={t('Kaam khatam karo')} onPress={() => act.exDone(j.id)} />
      : (
        <>
          <Button variant="violet" label={t('Kaam ki photo lo')} disabled={busy} onPress={snap} />
          <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.grey, textAlign: 'center', marginTop: 8 }}>{t('Photo ke bina kaam band nahi hoga')}</Text>
          <Button variant="ghost" label={t('Kaam khatam karo')} style={{ marginTop: 10, opacity: 0.55 }} onPress={() => act.exNeedPhoto()} />
        </>
      );
  } else if (j.status === 'on_the_way') {
    action = (
      <>
        <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.grey, marginBottom: 10 }}>{t('Pahunch ke customer se start code lo')}</Text>
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

  const chip = unassigned ? <Chip tone="violet">{t('Naya')}</Chip>
    : j.status === 'done' ? <Chip tone="green" icon="check">{t('Ho gaya')}</Chip>
    : j.status === 'on_the_way' ? <Chip tone="blue">{t('Raaste mein')}</Chip>
    : j.status === 'doing' ? <Chip tone="amber">{t('Kaam chal raha hai')}</Chip>
    : <Chip tone="grey">{t('Baaki')}</Chip>;
  const card = (
    <Group style={picked ? { borderColor: c.primary, borderWidth: 1.5 } : undefined}>
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, fontFamily: F.semi, fontSize: 17, lineHeight: 24, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
          {chip}
        </View>
        <ReceiptRow label={t('Aapke')} value={share} tone="ok" />
      </View>
      <Row icon="pin" label={where} sub={maps ? t('Google Maps mein kholo') : undefined} onPress={maps ? () => open(maps) : undefined} chevron={!!maps} />
      {j.note ? <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}><Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey }}>{j.note}</Text></View> : null}
      {j.photo ? <Image source={{ uri: j.photo }} accessibilityLabel={t('Kaam ki photo')} resizeMode="contain" style={{ width: '100%', height: 220, backgroundColor: c.canvas }} /> : null}
      {maps || tel ? (
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' }}>
          {maps ? <Button variant="ghost" icon="pin" label={t('Location / Raasta')} style={{ flex: 1 }} onPress={() => open(maps)} /> : null}
          {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
        </View>
      ) : null}
      {action ? <View style={{ padding: 16 }}>{action}</View> : null}
    </Group>
  );
  return (
    <View>
      {unassigned && onPick ? <Pressy onPress={onPick} scaleTo={0.995} accessibilityLabel={(j.service || t('Extra kaam')) + ' ' + share} accessibilityState={{ selected: !!picked }}>{card}</Pressy> : card}
      <StartCodeSheet id={j.id} visible={codeOpen} onClose={() => setCodeOpen(false)} />
    </View>
  );
}

export default function ExtraScreen() {
  useStore();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const list = Extra.shown(), done = Extra.jobs.filter((j) => j.status === 'done');
  const earned = done.reduce((a, j) => a + Money.share(j.price), 0);
  const open_ = list.filter((j) => !j.washer_id);
  const [pick, setPick] = useState<string | null>(null);
  const target = open_.find((j) => j.id === pick) ?? open_[0];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: target ? 200 : 120 }} showsVerticalScrollIndicator={false}>
        <ScreenTitle title={t('Extra kaam')} subtitle={list.length ? t(`${list.length} kaam baaki`) : t('Sab ho gaya')} right={<DutyToggle />} />
        <View style={{ paddingHorizontal: 16 }}>
          {list.length ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              {list.map((j, i) => <FadeUp key={j.id} index={i}><JobCard j={j} picked={target?.id === j.id && open_.length > 1} onPick={() => setPick(j.id)} /></FadeUp>)}
            </View>
          ) : isOnline()
            ? <EmptyBlock icon="tabExtra" title={t('Abhi koi extra kaam nahi')} text={t('Customer ya Manager ka koi kaam aaya toh yahan dikhega.')} />
            : <EmptyBlock icon="tabExtra" title={t('Aap offline ho')} text={t('Naye customer kaam nahi dikhenge. Round tab pe online karo.')} />}

          <SectionLabel>{done.length ? `${t('Ho gaye')} · ${rupee(earned)} ${t('ab tak')}` : t('Ho gaye')}</SectionLabel>
          {done.length ? (
            <Group>
              {done.slice(0, 20).map((j) => (
                <Row
                  key={j.id}
                  icon="check"
                  label={j.service || t('Extra kaam')}
                  sub={`${j.car || j.reg || ''} · ${(j.finished_at || j.date || '').slice(0, 10)}`}
                  right={<Text style={[TNUM, { fontFamily: F.bold, fontSize: 16, color: c.fg }]}>{rupee(Money.share(j.price))}</Text>}
                />
              ))}
            </Group>
          ) : <Text style={{ fontFamily: F.body, fontSize: 13, color: c.grey, marginLeft: 4 }}>{t('Jo extra kaam khatam karoge woh yahan jama hoga.')}</Text>}
        </View>
      </PullToRefresh>
      {target ? (
        <StickyBar
          style={{ left: 16, right: 16, bottom: 88 + insets.bottom, borderRadius: 16, borderWidth: 1, borderColor: c.line, borderTopWidth: 1 }}
          summaryLabel={t('Aapke')} summary={rupee(Money.share(target.price))}
          label={t('Lo yeh kaam')} onPress={() => act.exClaim(target.id)}
        />
      ) : null}
    </View>
  );
}
