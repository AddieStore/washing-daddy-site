// Pieces of the car screen and the money screen: the top bar, tasks, photo tiles, request cards and the sheets.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, TaskIcon, brand, cardShadow, sheet, ui, useTheme } from '../ui';
import { Button, ChipPicker, Field, LinkButton, Pressy, SyncChip } from '../ui';
import { act, photoSrc, syncState } from '../state/store';
import { t } from '../lib/i18n';
import { t12 } from '../lib/time';
import { TASK, type TaskKey } from '../lib/schedule';
import { NOTE_CHIPS, SKIPS, REQ_KIND, type Photo, type Req, type Wash } from '../lib/data';

/* ---------- top bar with a sync chip ---------- */
export function LiveSyncChip() {
  const [st, label, long] = syncState();
  const state = st === 'offline' ? 'wait' : st;
  return <SyncChip state={state} text={t(label)} onPress={() => ui.toast(t(long))} />;
}

export function ScreenBar({ title, back }: { title: string; back?: boolean }) {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.navigate('/') };
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bg }}>
      {back ? (
        <Pressy onPress={goBack} accessibilityLabel={t('Round par wapas')} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }}>
          <Icon name="back" size={22} color={c.fg} />
        </Pressy>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.black, fontSize: 17, color: c.fg }}>{title}</Text>
      <LiveSyncChip />
    </View>
  );
}

/* ---------- wash timer, ticks every second ---------- */
export function WashTimer({ startedAt }: { startedAt: string }) {
  const [, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(i) }, []);
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return (
    <View style={{ position: 'absolute', top: 58, left: 0, right: 0, alignItems: 'center', zIndex: 3 }} pointerEvents="none">
      <Text style={{ fontFamily: F.shout, fontSize: 58, lineHeight: 64, color: brand.cream, letterSpacing: 1, textShadowColor: brand.ink, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 0 }}>{mm}:{ss}</Text>
      <Text style={{ fontFamily: F.black, fontSize: 11, letterSpacing: 1.8, color: brand.gold, marginTop: 2 }}>{t('WASH TIME')}</Text>
    </View>
  );
}

/* ---------- a task row ---------- */
export function TaskRow({ k, done, doneAt, can, onPress }: { k: TaskKey; done: boolean; doneAt?: string | null; can: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const sh = useRef(new Animated.Value(0)).current;
  const m = TASK[k];
  const press = () => {
    if (!can && !done) Animated.sequence([-8, 8, -5, 5, 0].map(v => Animated.timing(sh, { toValue: v, duration: 55, useNativeDriver: true }))).start();
    onPress();
  };
  const extra = !['pressure', 'dry'].includes(k);
  return (
    <Pressy onPress={press} scaleTo={0.97} accessibilityLabel={m.hi} accessibilityState={{ checked: done, disabled: !can && !done }}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, padding: 10, paddingRight: 14, borderRadius: 20, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }, cardShadow(c), { transform: [{ translateX: sh }] } as any]}>
      <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: done ? brand.mint : c.line, backgroundColor: done ? brand.mint : 'transparent' }}>
        {done ? <Icon name="check" size={26} color="#fff" /> : <TaskIcon k={k} size={26} color={c.fg3} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontFamily: F.black, fontSize: 17, color: c.fg, textDecorationLine: done ? 'line-through' : 'none', textDecorationColor: 'rgba(20,192,138,0.7)' }}>{t(m.hi)}</Text>
          {extra ? <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: brand.gold }}><Text style={{ fontFamily: F.black, fontSize: 10, letterSpacing: 1, color: brand.ink }}>{t('AAJ')}</Text></View> : null}
        </View>
        <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3 }}>{t(m.sub)}</Text>
      </View>
      <Text style={{ fontFamily: F.black, fontSize: 13, color: c.ok }}>{done && doneAt ? t12(doneAt).replace(/ (AM|PM)/, '') : ''}</Text>
    </Pressy>
  );
}

/* ---------- photo tile ---------- */
export type ShotItem = Photo & { pending?: boolean; display?: string };
export function Shot({ kind, list, enabled, onTake, onView }: { kind: 'after' | 'issue'; list: ShotItem[]; enabled: boolean; onTake: () => void; onView: () => void }) {
  const { c } = useTheme();
  const lab = kind === 'after' ? t('Gaadi') : t('Problem');
  const last = list[list.length - 1];
  const fly = useRef(new Animated.Value(1)).current;
  const n = list.length;
  useEffect(() => { if (n) { fly.setValue(0.85); Animated.spring(fly, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start() } }, [n, fly]);
  if (!last) {
    return (
      <View style={{ flex: 1 }}>
      <Pressy onPress={onTake} disabled={!enabled} accessibilityLabel={lab} scaleTo={0.94}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 20, borderWidth: 2.5, borderStyle: 'dashed', borderColor: c.dash, backgroundColor: c.tile, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: enabled ? 1 : 0.5 }}>
        <Icon name={kind === 'issue' ? 'warn' : 'cam'} size={30} color={c.fg2} />
        <Text style={{ fontFamily: F.black, fontSize: 13, color: c.fg2 }}>{lab}</Text>
      </Pressy>
      </View>
    );
  }
  const src = last.pending ? last.display : photoSrc(last);
  return (
    <View style={{ flex: 1 }}>
    <Pressy onPress={last.pending ? undefined : onView} accessibilityLabel={lab} scaleTo={0.94} style={{ width: '100%', aspectRatio: 1 }}>
      <Animated.View style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: c.tile2, transform: [{ scale: fly }] }}>
        {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {last.pending ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,10,51,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        ) : null}
        <View style={{ position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Text style={{ fontFamily: F.black, fontSize: 10.5, letterSpacing: 0.8, color: '#fff', textTransform: 'uppercase' }}>{lab}</Text>
        </View>
        {n > 1 ? (
          <View style={{ position: 'absolute', right: 6, top: 6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: brand.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.black, fontSize: 12, color: brand.ink }}>{n}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressy>
    </View>
  );
}

/* ---------- customer request card ---------- */
export function ReqCard({ q, customer }: { q: Req; customer: string }) {
  const { c } = useTheme();
  const seen = q.status === 'seen';
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 20, backgroundColor: seen ? c.tile : 'rgba(255,140,30,0.14)', borderWidth: 1.5, borderColor: seen ? c.line : 'rgba(255,106,26,0.4)' }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={q.kind === 'rewash' ? 'redo' : 'note'} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.black, fontSize: 16, color: c.fg }}>{t(REQ_KIND[q.kind] || 'Customer ka note')}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: c.fg3 }}>{customer} · {q.created_at ? t12(q.created_at) : ''}{seen ? t(' · dekh liya') : ''}</Text>
        </View>
      </View>
      {q.text ? <Text style={{ fontFamily: F.semi, fontSize: 16, color: c.fg }}>{'“'}{q.text}{'”'}</Text> : null}
      {q.spots && q.spots.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {q.spots.map((s, i) => (
            <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.tile, borderWidth: 1, borderColor: c.line }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.fg }}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Pressy disabled={seen} onPress={() => act.reqSeen(q.id)} style={{ width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tile, borderWidth: 1, borderColor: c.line, opacity: seen ? 0.5 : 1 }}>
          <Text style={{ fontFamily: F.black, fontSize: 15, color: c.fg }}>{seen ? t('Dekh liya ✓') : t('Dekh liya')}</Text>
        </Pressy></View>
        <View style={{ flex: 1 }}><Pressy onPress={() => act.reqDone(q.id)} style={{ width: '100%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.ink, borderWidth: 1, borderColor: brand.ink }}>
          <Text style={{ fontFamily: F.black, fontSize: 15, color: brand.cream }}>{t('Kar diya')}</Text>
        </Pressy></View>
      </View>
    </View>
  );
}

/* ---------- sheets ---------- */
function SheetTitle({ title, sub }: { title: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 22, color: c.fg }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 14.5, color: c.fg2, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function NoteSheet({ reg, customer, current, close }: { reg: string; customer: string; current: string | null; close: () => void }) {
  const { c } = useTheme();
  const [text, setText] = useState(current || '');
  return (
    <View>
      <SheetTitle title={t('Customer ke liye note')} sub={t(`${customer} ke app mein turant dikhega.`)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {NOTE_CHIPS.map(ch => (
          <Pressy key={ch} onPress={() => setText(v => (v ? v.replace(/\s*$/, '. ') + ch : ch))} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: c.line, backgroundColor: c.tile }}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: c.fg }}>{t(ch)}</Text>
          </Pressy>
        ))}
      </View>
      <Field multiline maxLength={280} value={text} onChangeText={setText} placeholder={t('Apne shabdon mein likho')} />
      <View style={{ height: 12 }} />
      <Button variant="violet" label={t('Note bhejo')} onPress={() => { act.setNote(reg, text.trim()); close() }} />
      {current ? <LinkButton label={t('Note hatao')} onPress={() => { act.setNote(reg, ''); close() }} style={{ marginTop: 6 }} /> : null}
    </View>
  );
}
export function openNoteSheet(reg: string, customer: string, current: string | null) {
  sheet.open(close => <NoteSheet reg={reg} customer={customer} current={current} close={close} />);
}

function SkipSheet({ reg, customer, close }: { reg: string; customer: string; close: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [text, setText] = useState('');
  const reason = text.trim() || pick || '';
  return (
    <View>
      <SheetTitle title={t('Skip kyun?')} sub={t(`${customer} ko yahi wajah dikhegi.`)} />
      <ChipPicker options={SKIPS.map(s => ({ value: s, label: t(s) }))} value={pick} onChange={setPick} />
      <Field multiline maxLength={160} value={text} onChangeText={setText} placeholder={t('Ya khud likho')} style={{ minHeight: 70 }} />
      <View style={{ height: 12 }} />
      <Button variant="ink" label={t('Skip karo')} disabled={!reason} onPress={() => { act.skip(reg, reason); close() }} />
    </View>
  );
}
export function openSkipSheet(reg: string, customer: string) {
  sheet.open(close => <SkipSheet reg={reg} customer={customer} close={close} />);
}

export function openPhotoSheet(reg: string, kind: 'after' | 'issue', list: Wash['photos'], can: boolean, retake: () => void) {
  const title = kind === 'after' ? t('Gaadi ki photo') : t('Problem ki photo');
  sheet.open(close => (
    <PhotoSheet title={title} reg={reg} kind={kind} list={list} can={can} retake={retake} close={close} />
  ));
}
function PhotoSheet({ title, reg, kind, list, can, retake, close }: { title: string; reg: string; kind: 'after' | 'issue'; list: Wash['photos']; can: boolean; retake: () => void; close: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <SheetTitle title={title} sub={t(`${list.length} photo · customer ke app mein dikh rahi hai`)} />
      <View style={{ gap: 10 }}>
        {list.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: photoSrc(p) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: c.tile2 }} resizeMode="cover" />
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg3, marginTop: 4 }}>{t12(p.at)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}><Button variant="ghost" icon="cam" label={t('Aur lo')} disabled={!can} onPress={() => { close(); retake() }} /></View>
        <View style={{ flex: 1 }}>
          {can ? <Button variant="ghost" label={t('Aakhri hatao')} onPress={() => { act.delPhoto(reg, kind); close() }} />
            : <Button variant="ghost" label={t('Band karo')} onPress={close} />}
        </View>
      </View>
    </View>
  );
}

export function openSuccessSheet(customer: string, next: { reg: string; model: string } | null, goPaisa: () => void) {
  sheet.open(close => <SuccessSheet customer={customer} next={next} goPaisa={goPaisa} close={close} />);
}
function SuccessSheet({ customer, next, goPaisa, close }: { customer: string; next: { reg: string; model: string } | null; goPaisa: () => void; close: () => void }) {
  const { c } = useTheme();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }).start() }, [pop]);
  return (
    <View style={{ alignItems: 'center', paddingTop: 6 }}>
      <Animated.View style={{ width: 104, height: 104, borderRadius: 52, marginTop: 6, marginBottom: 14, backgroundColor: brand.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: 'rgba(20,192,138,0.18)', transform: [{ scale: pop }] }}>
        <Icon name="check" size={48} color="#fff" />
      </Animated.View>
      <Text style={{ fontFamily: F.shout, fontSize: 44, textTransform: 'uppercase', color: c.fg }}>{t('Chamak gayi!')}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 15, color: c.fg2, marginTop: 4, textAlign: 'center' }}>{t(`${customer} ke phone pe pahunch gaya`)}</Text>
      <Text style={{ fontSize: 24, marginTop: 10, letterSpacing: 2 }}>{'🧽 · · · · 📱'}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
        {next
          ? <Button variant="gold" iconRight="arrow" label={t(`Agli gaadi: ${next.model}`)} onPress={() => { act.setCurrent(next.reg); close() }} />
          : <Button variant="gold" label={t('Round poora · hisaab dekho')} onPress={() => { close(); goPaisa() }} />}
      </View>
      <LinkButton label={t('Yahin raho')} onPress={close} style={{ marginTop: 6 }} />
    </View>
  );
}

