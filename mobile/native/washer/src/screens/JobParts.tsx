// Pieces of the car screen and the money screen: the top bar, plate, tasks, photo tiles, request notes and the sheets.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, Chip, Group, Row, SheetHeader, TaskIcon, sheet, ui, useTheme } from '../ui';
import { Button, Field, LinkButton, Pressy, SyncChip } from '../ui';
import { act, photoSrc, syncState } from '../state/store';
import { t } from '../lib/i18n';
import { t12 } from '../lib/time';
import { TASK, type TaskKey } from '../lib/schedule';
import { NOTE_CHIPS, SKIPS, REQ_KIND, type Photo, type Req, type Wash } from '../lib/data';
import { ChipPick } from './JobReport';

/* ---------- top bar with a sync chip ---------- */
export function LiveSyncChip() {
  const [st, label, long] = syncState();
  const state = st === 'offline' ? 'wait' : st;
  return <SyncChip state={state} text={t(label)} onPress={() => ui.toast(t(long))} />;
}

/** Plain page bar: round back button, 17/600 title, sync chip. */
export function ScreenBar({ title, back, onBack }: { title: string; back?: boolean; onBack?: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = onBack || (() => { if (router.canGoBack()) router.back(); else router.navigate('/') });
  return (
    <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bg }}>
      {back ? (
        <Pressy onPress={goBack} accessibilityLabel={t('Round par wapas')} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
          <Icon name="back" size={20} color={c.fg} />
        </Pressy>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: back ? 17 : 20, lineHeight: 26, letterSpacing: -0.3, color: c.fg }}>{title}</Text>
      <LiveSyncChip />
    </View>
  );
}

/** Indian HSRP number plate: white body, dark border, blue "IND" strip on the left. */
export function HsrpPlate({ reg }: { reg: string }) {
  return (
    <View accessibilityLabel={reg} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'stretch', borderRadius: 6, borderWidth: 1.5, borderColor: '#141414', backgroundColor: '#fff', overflow: 'hidden' }}>
      <View style={{ width: 16, backgroundColor: '#1F4DB8', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 6, color: '#fff' }}>IND</Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 14, lineHeight: 20, letterSpacing: 1.2, color: '#141414', paddingHorizontal: 8, paddingVertical: 2 }}>{reg}</Text>
    </View>
  );
}

/** Round 40px icon button (call, route). */
export function RoundIcon({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.92}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
      <Icon name={icon} size={19} color={c.fg} />
    </Pressy>
  );
}

/* ---------- wash timer chip, ticks every second ---------- */
export function WashTimer({ startedAt, extraMinutes = 0 }: { startedAt: string; extraMinutes?: number; interiorFrom?: number | null }) {
  const [, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(i) }, []);
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return <Chip tone="violet" icon="clock">{`${mm}:${ss}${extraMinutes > 0 ? ` +${extraMinutes}` : ''}`}</Chip>;
}

/* ---------- interior add-on: confirmation sheet, the row and the chip ---------- */
function SheetSub({ children }: { children?: string }) {
  const { c } = useTheme();
  return children ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, marginTop: -6, marginBottom: 16 }}>{children}</Text> : <View style={{ height: 4 }} />;
}
function SheetTitle({ title, sub }: { title: string; sub?: string }) {
  return <View><SheetHeader title={title} /><SheetSub>{sub}</SheetSub></View>;
}

function InteriorSheet({ reg, close }: { reg: string; close: () => void }) {
  return (
    <View>
      <SheetTitle title={t('Is gaadi ka interior bhi karna hai?')} sub={t('10 minute extra milenge')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" label={t('Nahi')} onPress={close} /></View>
        <View style={{ flex: 1 }}><Button variant="primary" label={t('Haan, karna hai')} onPress={() => { close(); act.addInterior(reg) }} /></View>
      </View>
    </View>
  );
}
export function openInteriorSheet(reg: string) { sheet.open(close => <InteriorSheet reg={reg} close={close} />) }

export function InteriorButton({ reg }: { reg: string }) {
  const { c } = useTheme();
  return (
    <Group>
      <Row icon={<TaskIcon k="interior" size={22} color={c.fg} />} label={t('Interior kar raha hoon')} sub={t('Customer ne bola ho to tap karo')}
        right={<Chip tone="violet">+10 min</Chip>} onPress={() => openInteriorSheet(reg)} />
    </Group>
  );
}

// "Interior jud gaya · +10 min" (washing) or the whole list of extras with their time (done)
export function ExtrasRow({ addons, compact }: { addons: { key: string; at: string; minutes: number }[]; compact?: boolean }) {
  const { c } = useTheme();
  if (!addons.length) return null;
  const name = (k: string) => (k === 'interior' ? t('Interior') : k);
  return (
    <View style={{ marginTop: compact ? 0 : 8 }}>
      {compact ? null : <Text accessibilityRole="header" style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: c.grey, marginTop: 16, marginBottom: 8, marginLeft: 4 }}>{t('Extras')}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {addons.map((a, i) => (
          <Chip key={i} tone="green" icon="check">{compact && a.key === 'interior' ? t('Interior jud gaya · +10 min') : `${name(a.key)} · +${a.minutes} min`}</Chip>
        ))}
      </View>
    </View>
  );
}

/* ---------- a task row: check circle, name, time ---------- */
export function TaskRow({ k, done, doneAt, can, onPress }: { k: TaskKey; done: boolean; doneAt?: string | null; can: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const sh = useRef(new Animated.Value(0)).current;
  const m = TASK[k];
  const press = () => {
    if (!can && !done) Animated.sequence([-8, 8, -5, 5, 0].map(v => Animated.timing(sh, { toValue: v, duration: 55, useNativeDriver: true }))).start();
    onPress();
  };
  const extra = !['pressure', 'dry'].includes(k);
  const circle = (
    <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.primary : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: can ? c.fg : c.dash }}>
      {done ? <Icon name="check" size={14} color="#fff" /> : null}
    </View>
  );
  return (
    <Animated.View style={{ transform: [{ translateX: sh }] }}>
      <Row icon={circle} label={t(m.hi)} sub={t(m.sub)} chevron={false} onPress={press}
        right={done && doneAt ? <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.grey, fontVariant: ['tabular-nums'] }}>{t12(doneAt).replace(/ (AM|PM)/, '')}</Text> : extra ? <Chip tone="violet">{t('AAJ')}</Chip> : undefined}
        style={{ opacity: !can && !done ? 0.62 : 1 }} />
    </Animated.View>
  );
}

/* ---------- photo tile: square picture, caption underneath ---------- */
export type ShotItem = Photo & { pending?: boolean; display?: string };
export function Shot({ kind, list, enabled, onTake, onView }: { kind: 'before' | 'after' | 'issue'; list: ShotItem[]; enabled: boolean; onTake: () => void; onView: () => void }) {
  const { c } = useTheme();
  const lab = kind === 'before' ? t('Pehle') : kind === 'after' ? t('Baad mein') : t('Problem');
  const last = list[list.length - 1];
  const fly = useRef(new Animated.Value(1)).current;
  const n = list.length;
  useEffect(() => { if (n) { fly.setValue(0.88); Animated.spring(fly, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start() } }, [n, fly]);
  const caption = (
    <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.grey, textAlign: 'center', marginTop: 6 }}>{lab}{n ? ` · ${n}` : ''}</Text>
  );
  // the wrapper owns the flex slot; the tile inside is a fixed-aspect square that can never exceed it
  if (!last) {
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressy onPress={onTake} disabled={!enabled} accessibilityLabel={lab} scaleTo={0.95}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.dash, alignItems: 'center', justifyContent: 'center', opacity: enabled ? 1 : 0.5 }}>
          <Icon name={kind === 'issue' ? 'warn' : 'cam'} size={22} color={c.grey} />
        </Pressy>
        {caption}
      </View>
    );
  }
  const src = last.pending ? last.display : photoSrc(last);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressy onPress={last.pending ? undefined : onView} accessibilityLabel={`${lab} (${n})`} scaleTo={0.95} style={{ width: '100%', aspectRatio: 1 }}>
        <Animated.View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: c.tile2, transform: [{ scale: fly }] }}>
          {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {last.pending ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,20,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : null}
        </Animated.View>
      </Pressy>
      {caption}
    </View>
  );
}

/* ---------- customer request: a tinted note row ---------- */
export function ReqCard({ q, customer }: { q: Req; customer: string }) {
  const { c, dark } = useTheme();
  const seen = q.status === 'seen';
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: seen ? c.card : dark ? 'rgba(139,92,246,0.16)' : 'rgba(84,9,218,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: seen ? c.line : 'rgba(84,9,218,0.18)' }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Icon name={q.kind === 'rewash' ? 'redo' : 'note'} size={22} color={c.primary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg }}>{t(REQ_KIND[q.kind] || 'Customer ka note')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey }}>{customer} · {q.created_at ? t12(q.created_at) : ''}{seen ? t(' · dekh liya') : ''}</Text>
        </View>
      </View>
      {q.text ? <Text style={{ fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: c.fg }}>{'“'}{q.text}{'”'}</Text> : null}
      {q.spots && q.spots.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {q.spots.map((sp, i) => <Chip key={i} tone="grey">{sp}</Chip>)}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" size="md" disabled={seen} label={seen ? t('Dekh liya ✓') : t('Dekh liya')} onPress={() => act.reqSeen(q.id)} /></View>
        <View style={{ flex: 1 }}><Button variant="primary" size="md" label={t('Kar diya')} onPress={() => act.reqDone(q.id)} /></View>
      </View>
    </View>
  );
}

/* ---------- sheets ---------- */
function NoteSheet({ reg, customer, current, close }: { reg: string; customer: string; current: string | null; close: () => void }) {
  const [text, setText] = useState(current || '');
  const { c } = useTheme();
  return (
    <View>
      <SheetTitle title={t('Customer ke liye note')} sub={t(`${customer} ke app mein turant dikhega.`)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {NOTE_CHIPS.map(ch => (
          <Pressy key={ch} onPress={() => setText(v => (v ? v.replace(/\s*$/, '. ') + ch : ch))} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.tile2 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: c.fg }}>{t(ch)}</Text>
          </Pressy>
        ))}
      </View>
      <Field multiline maxLength={280} value={text} onChangeText={setText} placeholder={t('Apne shabdon mein likho')} />
      <View style={{ height: 12 }} />
      <Button variant="primary" label={t('Note bhejo')} onPress={() => { act.setNote(reg, text.trim()); close() }} />
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
      <ChipPick options={SKIPS.map(s => ({ value: s, label: t(s) }))} value={pick} onChange={setPick} />
      <View style={{ height: 12 }} />
      <Field multiline maxLength={160} value={text} onChangeText={setText} placeholder={t('Ya khud likho')} style={{ minHeight: 70 }} />
      <View style={{ height: 12 }} />
      <Button variant="ink" label={t('Skip karo')} disabled={!reason} onPress={() => { act.skip(reg, reason); close() }} />
    </View>
  );
}
export function openSkipSheet(reg: string, customer: string) {
  sheet.open(close => <SkipSheet reg={reg} customer={customer} close={close} />);
}

export function openPhotoSheet(reg: string, kind: 'before' | 'after' | 'issue', list: Wash['photos'], can: boolean, retake: () => void) {
  const title = kind === 'before' ? t('Pehle ki photo') : kind === 'after' ? t('Baad ki photo') : t('Problem ki photo');
  sheet.open(close => (
    <PhotoSheet title={title} reg={reg} kind={kind} list={list} can={can} retake={retake} close={close} />
  ));
}
function PhotoSheet({ title, reg, kind, list, can, retake, close }: { title: string; reg: string; kind: 'before' | 'after' | 'issue'; list: Wash['photos']; can: boolean; retake: () => void; close: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <SheetTitle title={title} sub={t(`${list.length} photo · customer ke app mein dikh rahi hai`)} />
      <View style={{ gap: 12 }}>
        {list.map((p, i) => (
          <View key={i}>
            <Image source={{ uri: photoSrc(p) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: c.tile2 }} resizeMode="cover" />
            <Text style={{ fontFamily: F.medium, fontSize: 12, color: c.grey, marginTop: 4 }}>{t12(p.at)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" icon="cam" label={t('Aur lo')} disabled={!can} onPress={() => { close(); retake() }} /></View>
        <View style={{ flex: 1 }}>
          {can ? <Button variant="secondary" label={t('Aakhri hatao')} onPress={() => { act.delPhoto(reg, kind); close() }} />
            : <Button variant="secondary" label={t('Band karo')} onPress={close} />}
        </View>
      </View>
    </View>
  );
}

