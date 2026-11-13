// Pieces of the car screen and the money screen: the top bar, tasks, photo tiles, request cards and the sheets.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, R as RAD, TaskIcon, brand, cardBox, cardShadow, sheet, ui, useTheme } from '../ui';
import { Button, ChipPicker, Field, LinkButton, Pressy, SyncChip } from '../ui';
import { DashCard, IconBubble, Ring } from '../ui/dash';
import { guideAt } from '../lib/washGuide';
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
    <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bg }}>
      {back ? (
        <Pressy onPress={goBack} accessibilityLabel={t('Round par wapas')} hitSlop={6} style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, ...cardShadow(c) }}>
          <Icon name="back" size={18} color={c.fg} />
        </Pressy>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: back ? F.semi : F.bold, fontSize: back ? 17 : 20, lineHeight: back ? 24 : 28, color: c.fg }}>{title}</Text>
      <LiveSyncChip />
    </View>
  );
}

/* ---------- wash timer, ticks every second ---------- */
export function WashTimer({ startedAt, extraMinutes = 0, interiorFrom }: { startedAt: string; extraMinutes?: number; interiorFrom?: number | null }) {
  const { c } = useTheme();
  const [, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(i) }, []);
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  const g = guideAt(startedAt, Date.now(), interiorFrom);
  const total = g ? g.plan[g.plan.length - 1].from : 660;
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel={`${t('WASH TIME')} ${mm}:${ss}`}>
      <Ring size={104} stroke={11.5} color={c.fg} fraction={total ? s / total : 0}>
        <Text style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 26, color: c.heroInk }}>{mm}:{ss}</Text>
        <Text style={{ fontFamily: F.semi, fontSize: 9.5, letterSpacing: 1, color: c.fg3 }}>{t('WASH TIME')}{extraMinutes > 0 ? ` +${extraMinutes}` : ''}</Text>
      </Ring>
    </View>
  );
}

/* ---------- interior add-on: confirmation sheet, the button and the chip ---------- */
function InteriorSheet({ reg, close }: { reg: string; close: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <SheetTitle title={t('Is gaadi ka interior bhi karna hai?')} sub={t('10 minute extra milenge')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button variant="ghost" label={t('Nahi')} onPress={close} /></View>
        <View style={{ flex: 1 }}><Button variant="violet" label={t('Haan, karna hai')} onPress={() => { close(); act.addInterior(reg) }} /></View>
      </View>
    </View>
  );
}
export function openInteriorSheet(reg: string) { sheet.open(close => <InteriorSheet reg={reg} close={close} />) }

export function InteriorButton({ reg }: { reg: string }) {
  const { c } = useTheme();
  return (
    <DashCard onPress={() => openInteriorSheet(reg)} accessibilityLabel={t('Interior kar raha hoon · +10 min')}
      style={{ marginTop: 12, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11 }}>
      <IconBubble size={44} bg={c.primary}><TaskIcon k="interior" size={22} color="#fff" /></IconBubble>
      <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 17, color: c.fg }}>{t('Interior kar raha hoon · +10 min')}</Text>
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: c.primary }}><Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>+10</Text></View>
    </DashCard>
  );
}

// "Interior jud gaya · +10 min" (washing) or the whole list of extras with their time (done)
export function ExtrasRow({ addons, compact }: { addons: { key: string; at: string; minutes: number }[]; compact?: boolean }) {
  const { c } = useTheme();
  if (!addons.length) return null;
  const name = (k: string) => (k === 'interior' ? t('Interior') : k);
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {compact ? null : <Text accessibilityRole="header" style={{ fontFamily: F.semi, fontSize: 17, color: c.fg, marginTop: 10 }}>{t('Extras')}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {addons.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(20,192,138,0.16)' }}>
            <Icon name="check" size={14} color="#0B7A57" />
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg }}>{compact && a.key === 'interior' ? t('Interior jud gaya · +10 min') : `${name(a.key)} · +${a.minutes} min`}</Text>
          </View>
        ))}
      </View>
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
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, padding: 11 }, cardBox(c), cardShadow(c), { transform: [{ translateX: sh }] } as any]}>
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? brand.mint : c.card, borderWidth: done ? 0 : 1, borderColor: c.line }}>
        {done ? <Icon name="check" size={24} color="#fff" /> : <TaskIcon k={k} size={24} color={c.softInk} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 17, lineHeight: 24, color: c.fg, textDecorationLine: done ? 'line-through' : 'none', textDecorationColor: 'rgba(20,192,138,0.7)' }}>{t(m.hi)}</Text>
          {extra ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: c.primary }}><Text style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 1, color: '#fff' }}>{t('AAJ')}</Text></View> : null}
        </View>
        <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 20, color: c.fg3 }}>{t(m.sub)}</Text>
      </View>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: c.ok }}>{done && doneAt ? t12(doneAt).replace(/ (AM|PM)/, '') : ''}</Text>
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
  const R = RAD.card;
  // the wrapper owns the flex slot; the tile inside is a fixed-aspect square that can never exceed it
  if (!last) {
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressy onPress={onTake} disabled={!enabled} accessibilityLabel={lab} scaleTo={0.94}
          style={{ width: '100%', aspectRatio: 1, ...cardBox(c), ...cardShadow(c), alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', opacity: enabled ? 1 : 0.5 }}>
          <IconBubble icon={kind === 'issue' ? 'warn' : 'cam'} size={52} tint={kind === 'issue' ? '#C41F37' : undefined} bg={kind === 'issue' ? 'rgba(232,56,79,0.12)' : undefined} />
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 14, color: c.fg3 }}>{lab}</Text>
        </Pressy>
      </View>
    );
  }
  const src = last.pending ? last.display : photoSrc(last);
  const thumbs = list.slice(-3, -1).reverse(); // up to 2 earlier photos, newest first
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressy onPress={last.pending ? undefined : onView} accessibilityLabel={`${lab} (${n})`} scaleTo={0.94} style={{ width: '100%', aspectRatio: 1 }}>
        <Animated.View style={{ flex: 1, borderRadius: R, overflow: 'hidden', backgroundColor: c.tile2, transform: [{ scale: fly }] }}>
          {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {last.pending ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,20,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : null}
          {n > 1 ? (
            <View style={{ position: 'absolute', right: 8, top: 8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#111114' }}>{n}</Text>
            </View>
          ) : null}
          {thumbs.length ? (
            <View style={{ position: 'absolute', left: 8, top: 8, flexDirection: 'row', gap: 4 }}>
              {thumbs.map((p, i) => {
                const u = p.pending ? p.display : photoSrc(p);
                return (
                  <View key={i} style={{ width: 20, height: 20, borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: '#fff', backgroundColor: c.tile2 }}>
                    {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row' }}>
            <View style={{ flexShrink: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Text numberOfLines={1} style={{ fontFamily: F.black, fontSize: 10.5, letterSpacing: 0.8, color: '#fff', textTransform: 'uppercase' }}>{lab}</Text>
            </View>
          </View>
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
    <View style={{ gap: 10, padding: 11, ...cardBox(c), backgroundColor: seen ? c.card : c.soft, ...(seen ? cardShadow(c) : null) }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={q.kind === 'rewash' ? 'redo' : 'note'} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 17, color: c.fg }}>{t(REQ_KIND[q.kind] || 'Customer ka note')}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3 }}>{customer} · {q.created_at ? t12(q.created_at) : ''}{seen ? t(' · dekh liya') : ''}</Text>
        </View>
      </View>
      {q.text ? <Text style={{ fontFamily: F.semi, fontSize: 17, lineHeight: 24, color: c.fg }}>{'“'}{q.text}{'”'}</Text> : null}
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
        <View style={{ flex: 1 }}><Pressy disabled={seen} onPress={() => act.reqSeen(q.id)} style={{ width: '100%', minHeight: 40, borderRadius: RAD.button, alignItems: 'center', justifyContent: 'center', backgroundColor: c.tile2, opacity: seen ? 0.5 : 1 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{seen ? t('Dekh liya ✓') : t('Dekh liya')}</Text>
        </Pressy></View>
        <View style={{ flex: 1 }}><Pressy onPress={() => act.reqDone(q.id)} style={{ width: '100%', minHeight: 40, borderRadius: RAD.button, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#fff' }}>{t('Kar diya')}</Text>
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
      <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 20, color: c.fg }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.fg3, marginTop: 2 }}>{sub}</Text> : null}
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
          <Pressy key={ch} onPress={() => setText(v => (v ? v.replace(/\s*$/, '. ') + ch : ch))} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.tile }}>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: c.fg }}>{t(ch)}</Text>
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
      <Text style={{ fontFamily: F.black, fontSize: 30, color: c.fg }}>{t('Chamak gayi!')}</Text>
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

