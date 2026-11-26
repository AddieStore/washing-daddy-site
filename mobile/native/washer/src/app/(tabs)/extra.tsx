// Extra tab: on-demand jobs (from Ravi, or customer bookings anyone can claim). Port of renderExtra / #s-extra.
import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, CallButton, Chip, F, Group, Icon, Lift, PCard, PageHeader, PTitle, PullToRefresh, Row, Sheet, StatTile, ui, useTheme } from '../../ui';
import { DAY, Extra, Money, act, isOnline, useStore } from '../../state/store';
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

  const where = [j.car || j.reg || t('Gaadi'), j.area, j.customer_name].filter(Boolean).join(' · ');

  // the claim button lives in the sticky bar; the other steps stay on the card
  let action: React.ReactNode = null;
  if (unassigned) {
    action = (
      <>
        <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey, marginBottom: 10 }}>{t('Customer ne book kiya, aapke area mein hai')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}><Button variant="violet" label={t('Accept · Lo yeh kaam')} onPress={() => act.exClaim(j.id)} /></View>
          <View style={{ flex: 1 }}><Button variant="ghost" label={t('Deny')} onPress={() => act.exPass(j.id)} /></View>
        </View>
      </>
    );
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
  const stage = j.status === 'done' ? 3 : j.status === 'doing' ? 2 : j.status === 'on_the_way' ? 1 : 0;
  const Steps = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 }}>
      {[t('Baaki'), t('Raaste mein'), t('Kaam'), t('Ho gaya')].map((lb, i) => (
        <React.Fragment key={lb}>
          {i > 0 ? <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: i <= stage ? c.primary : c.line, marginHorizontal: 4 }} /> : null}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: i <= stage ? c.primary : c.soft, alignItems: 'center', justifyContent: 'center' }}>
              {i < stage || (i === stage && stage === 3) ? <Icon name="check" size={11} color="#fff" /> : i === stage ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} /> : null}
            </View>
            <Text style={{ fontFamily: i === stage ? F.semi : F.medium, fontSize: 10.5, color: i === stage ? c.fg : c.grey }}>{lb}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
  const card = (
    <PCard style={{ overflow: 'hidden', ...(unassigned ? { borderColor: c.primary, borderWidth: 1.5 } : null) }}>
      <View style={{ padding: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: unassigned ? 'rgba(255,186,8,0.2)' : 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="tabExtra" size={22} color={unassigned ? '#C77700' : c.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 22, letterSpacing: -0.3, color: c.fg }}>{j.service || t('Extra kaam')}</Text>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>{chip}</View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: c.ok }]}>{share}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: c.grey }}>{t('Aapke')}</Text>
        </View>
      </View>
      {!unassigned ? <Steps /> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
        <Row icon="pin" label={where} sub={maps ? t('Google Maps mein kholo') : undefined} onPress={maps ? () => open(maps) : undefined} chevron={!!maps} />
      </View>
      {j.note ? <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: c.soft }}><Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.fg }}>{j.note}</Text></View> : null}
      {j.photo ? <Image source={{ uri: j.photo }} accessibilityLabel={t('Kaam ki photo')} resizeMode="contain" style={{ width: '100%', height: 220, backgroundColor: c.canvas }} /> : null}
      {maps || tel ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center' }}>
          {maps ? <Button variant="ghost" icon="pin" label={t('Location / Raasta')} style={{ flex: 1 }} onPress={() => open(maps)} /> : null}
          {tel ? <CallButton small label={t('Call')} phone={tel.slice(4)} /> : null}
        </View>
      ) : null}
      {action ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{action}</View> : null}
    </PCard>
  );
  return (
    <View>
      {card}
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
  const monthKey = DAY.slice(0, 7);
  const doneMonth = done.filter((j) => (j.finished_at || j.date || '').slice(0, 7) === monthKey);
  const earnedMonth = doneMonth.reduce((a, j) => a + Money.share(j.price), 0);
  const active = list.filter((j) => j.washer_id && j.status !== 'done');
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <PageHeader title={t('Extra kaam')} sub={list.length ? t(`${list.length} kaam baaki`) : t('Sab ho gaya')} bottomPad={70}>
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' }}>{t('Is mahine extra kaam se')}</Text>
            <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 44, lineHeight: 52, letterSpacing: -1.4, color: '#fff' }]}>{rupee(earnedMonth)}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>{t('Subah monthly route, uske baad extra kaam: accept karo aur kamao')}</Text>
          </View>
        </PageHeader>
        <Lift>
          <FadeUp index={0}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile icon="plus" tone="amber" value={String(open_.length)} label={t('Naye kaam')} />
              <StatTile icon="clock" tone="blue" value={String(active.length)} label={t('Chal rahe')} />
              <StatTile icon="check" tone="green" value={String(doneMonth.length)} label={t('Ho gaye')} />
            </View>
          </FadeUp>
          {list.length ? (
            <View style={{ gap: 14, marginTop: 16 }}>
              {list.map((j, i) => <FadeUp key={j.id} index={i + 1}><JobCard j={j} /></FadeUp>)}
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              {isOnline()
                ? <EmptyBlock art="jobs" icon="tabExtra" title={t('Abhi koi extra kaam nahi')} text={t('Customer ya Manager ka koi kaam aaya toh yahan dikhega.')} />
                : <EmptyBlock art="jobs" icon="tabExtra" title={t('Aap offline ho')} text={t('Naye customer kaam nahi dikhenge. Round tab pe online karo.')} />}
            </View>
          )}

          <PTitle title={t('Ho gaye')} note={done.length ? `${rupee(earned)} ${t('ab tak')}` : undefined} />
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
        </Lift>
      </PullToRefresh>
    </View>
  );
}
