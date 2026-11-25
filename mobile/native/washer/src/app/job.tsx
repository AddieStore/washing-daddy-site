// The car screen: pushed from the round. Plain light page: car header, step tracker, requests, tasks, photos, report,
// and ONE main action in the sticky bar at the bottom.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Button, CarArt, Chip, Empty, F, Group, Icon, PullToRefresh, Row, SectionLabel, StickyBar, Pressy, ui, useTheme } from '../ui';
import { WorkingArt } from '../ui/art';
import { CarPic } from '../screens/CarPhoto';
import { Route, RT, W, act, route, photoSrc, carBy, ensureDay, openReqs, planName, skipAsk, S, useStore, DAY, view, MIN_PHOTOS, photoNeeds } from '../state/store';
import { STATUS, navOf, telOf } from '../lib/data';
import type { Photo } from '../lib/data';
import { SPOTS, isSundayIST } from '../lib/washGuide';
import { tasksFor } from '../lib/schedule';
import { t } from '../lib/i18n';
import { hm12, t12 } from '../lib/time';
import { takePhoto } from '../lib/photo';
import { WashGuide } from '../screens/WashGuide';
import { HsrpPlate, InteriorButton, ExtrasRow, ReqCard, RoundIcon, ScreenBar, Shot, TaskRow, WashTimer, openNoteSheet, openPhotoSheet, openSkipSheet, openSuccessSheet, type ShotItem } from '../screens/JobParts';
import { ReportSection, ReportSummary, StartCapture, newStartInfo, openLeaveSheet, saveStartInfo } from '../screens/JobReport';

const ORDER = ['scheduled', 'on_the_way', 'arrived', 'washing', 'done'];
const STEPS: [string, string, string][] = [
  ['on_the_way', 'Nikla', 'on_the_way_at'],
  ['arrived', 'Pahuncha', 'arrived_at'],
  ['washing', 'Wash', 'started_at'],
  ['done', 'Ho gaya', 'finished_at'],
];
type Step = { label: string; time?: string; state: 'ok' | 'now' | 'none' };

/* ---------- car header: one compact white card ---------- */
function CarHeader({ reg, st }: { reg: string; st: string }) {
  const { c } = useTheme();
  const c0 = carBy(reg)!, wd = W(reg);
  const tel = telOf(c0.phone);
  const nav = navOf(c0);
  const idx = route().findIndex(x => x.reg === reg) + 1;
  const fmt = (h: string) => h.replace(/^0/, '');
  const slot = wd && wd.slot_from && wd.slot_to ? `${fmt(wd.slot_from)} – ${fmt(wd.slot_to)}` : null;
  const stTone = st === 'done' ? 'green' : st === 'skipped' ? 'red' : st === 'scheduled' ? 'grey' : 'violet';
  return (
    <Group>
      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 92, height: 62, borderRadius: 12, backgroundColor: c.canvas, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <CarPic reg={reg} w={92} h={62} size={26} radius={12}>
              <View style={{ marginBottom: 4 }}><CarArt car={c0} width={80} /></View>
            </CarPic>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <HsrpPlate reg={c0.plate} />
            <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: c.fg }}>{c0.model}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.grey }}>{c0.customer}{idx ? ` · ${idx}/${route().length}` : ''}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {slot ? <Chip tone="violet" icon="clock">{`${t('Slot')} ${slot}`}</Chip> : null}
            <Chip tone={stTone}>{t(STATUS[st as keyof typeof STATUS])}{wd && st === 'scheduled' ? ` · ${hm12(wd.eta)}` : ''}</Chip>
            <Chip tone="grey">{planName(c0)}</Chip>
            {st === 'washing' && wd?.started_at ? <WashTimer startedAt={wd.started_at} interiorFrom={wd.interior_from} extraMinutes={wd.extra_minutes || 0} /> : null}
          </View>
          {tel && c0.phone ? <RoundIcon icon="phone" label={t('Call')} onPress={() => { void Linking.openURL('tel:' + String(c0.phone).replace(/[^\d+]/g, '')).catch(() => {}) }} /> : null}
          {nav ? <RoundIcon icon="pin" label={t('Raasta')} onPress={() => { void Linking.openURL(nav).catch(() => {}) }} /> : null}
        </View>
      </View>
    </Group>
  );
}

/* ---------- horizontal stepper ---------- */
function Stepper({ steps }: { steps: Step[] }) {
  const { c } = useTheme();
  const n = steps.length;
  const reached = steps.reduce((m, s, i) => (s.state !== 'none' ? i : m), -1);
  const done = steps.reduce((m, s, i) => (s.state === 'ok' ? i : m), -1);
  const frac = n > 1 ? Math.max(0, Math.min(reached, done + 1)) / (n - 1) : 0;
  return (
    <Group>
      <View style={{ flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 4 }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: `${50 / n}%`, right: `${50 / n}%`, top: 26, height: 2, borderRadius: 1, backgroundColor: c.line }}>
          <View style={{ height: 2, borderRadius: 1, backgroundColor: c.primary, width: `${frac * 100}%` }} />
        </View>
        {steps.map((s, i) => {
          const ok = s.state === 'ok', now = s.state === 'now';
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${s.label}${s.time ? ' ' + s.time : ''}`}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? c.primary : c.card, borderWidth: ok ? 0 : 2, borderColor: now ? c.primary : c.dash }}>
                {ok ? <Icon name="check" size={14} color="#fff" /> : now ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: now ? F.semi : F.medium, fontSize: 12, lineHeight: 16, color: now ? c.primary : ok ? c.fg : c.grey }}>{s.label}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 11, lineHeight: 14, color: c.grey, marginTop: -4, minHeight: 14 }}>{s.time || ' '}</Text>
            </View>
          );
        })}
      </View>
    </Group>
  );
}

/** Tinted note row (amber, red or violet) for late / skip-asked / photo gate. */
function NoteRow({ icon, tone, children }: { icon: React.ComponentProps<typeof Icon>['name']; tone: 'red' | 'amber' | 'violet'; children: React.ReactNode }) {
  const { c, dark } = useTheme();
  const T = {
    red: [dark ? 'rgba(248,113,113,0.14)' : '#FEF2F2', dark ? '#FCA5A5' : '#dc2626'],
    amber: [dark ? 'rgba(255,186,8,0.14)' : '#FFF6DB', dark ? '#FFD66B' : '#9A6A00'],
    violet: [dark ? 'rgba(139,92,246,0.18)' : 'rgba(84,9,218,0.06)', c.primary],
  }[tone];
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: T[0] }}>
      <Icon name={icon} size={20} color={T[1]} />
      <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 14, lineHeight: 20, color: c.fg }}>{children}</Text>
    </View>
  );
}

/* ---------- the screen ---------- */
export default function JobScreen() {
  useStore();
  const { c: th } = useTheme();
  const router = useRouter();
  ensureDay();
  const reg = act.currentReg();
  const car = reg ? carBy(reg) : undefined;
  const wd = reg ? W(reg) : null;
  const st = wd ? wd.status : 'scheduled';
  const unseen = reg ? openReqs(reg).filter(q => q.status === 'open').length : 0;
  const lastReg = useRef<string | null>(null);
  const [spotPend, setSpotPend] = useState<Record<string, string>>({});

  // keep S.current in step with what is shown
  useEffect(() => { if (reg && S.current !== reg) act.setCurrent(reg) }, [reg]);
  // opening a car with an open request counts as "seen"
  useFocusEffect(useCallback(() => { if (reg && unseen) act.markSeen(reg) }, [reg, unseen]));
  useEffect(() => { lastReg.current = reg || null }, [reg]);

  const goPaisa = () => router.navigate('/paisa' as any);
  const leave = () => { if (router.canGoBack()) router.back(); else router.navigate('/') };
  // A started wash (status washing) cannot be left silently: every way out opens the finish / abandon sheet.
  const guarded = st === 'washing';
  const guardRef = useRef(false);
  guardRef.current = guarded;
  const allowRef = useRef(false);
  const ask = () => { if (reg) openLeaveSheet(reg, () => { allowRef.current = true; leave() }) };
  const askRef = useRef(ask);
  askRef.current = ask;
  const goRound = () => { if (guarded) ask(); else leave() };
  const navigation = useNavigation() as any;
  useEffect(() => navigation.addListener('beforeRemove', (e: any) => {
    if (!guardRef.current || allowRef.current) return;
    e.preventDefault();
    askRef.current();
  }), [navigation]);
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!guardRef.current) return false;
      askRef.current(); return true;
    });
    return () => sub.remove();
  }, []));
  const startInfo = useRef(newStartInfo());
  useEffect(() => { startInfo.current = newStartInfo() }, [reg]);

  if (!reg || !car) {
    return (
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <ScreenBar title={t('Abhi')} back onBack={leave} />
        <View style={{ padding: 16 }}>
          {S.day?.started
            ? <Empty title={t('Koi gaadi baaki nahi')} text={t('Aaj ka round poora. Shabash!')} />
            : <>
                <Empty title={t('Pehle round shuru karo')} text={t('Round tab pe jao, phir pehli gaadi yahan khulegi.')} />
                <View style={{ height: 14 }} />
                <Button variant="primary" label={t('Round pe chalo')} onPress={goRound} />
              </>}
        </View>
      </View>
    );
  }

  const tasks = wd ? wd.tasks : tasksFor(reg, car.plan, DAY).map(k => ({ key: k, done: false, done_at: null as string | null }));
  const can = !!wd && wd.status === 'washing';
  const tdone = tasks.filter(x => x.done).length;
  const idx = ORDER.indexOf(st);
  const steps: Step[] = STEPS.map(([k, l, field], i) => {
    const si = i + 1;
    const state = st === 'skipped' ? 'none' : (idx > si || st === 'done') ? 'ok' : idx === si ? 'now' : 'none';
    const at = wd ? (wd as any)[field] as string | null : null;
    return { label: t(l), time: at ? t12(at).replace(/ (AM|PM)/, '') : undefined, state } as Step;
  });
  const reqs = openReqs(reg).filter(q => q.kind !== 'skip_tomorrow');
  const sk = skipAsk(reg);
  const pend = view.pendingPhotos[reg] || [];
  const photosOf = (kind: 'before' | 'after' | 'issue'): ShotItem[] =>
    ((wd ? wd.photos : []) as ShotItem[]).filter(p => p.kind === kind && !p.spot).concat(pend.filter(p => p.kind === kind).map(p => ({ kind: p.kind, at: '', display: p.display, pending: true } as ShotItem)));
  const need = wd ? photoNeeds(wd) : null;
  const afterN = need ? need.car : 0;
  const photosOk = !!need && need.ok;
  const late = !!wd && Route.isLate(reg);
  const sunday = !!wd && !!need && need.sunday && (st === 'washing' || st === 'done');
  const pre = !!wd && ['scheduled', 'on_the_way', 'arrived'].includes(st);

  const shoot = async (kind: Photo['kind'], spot?: string) => {
    if (!W(reg)) { ui.toast(t('Pehle round shuru karo')); return }
    ui.flash();
    try {
      const r = await takePhoto();
      if (!r) return;
      if (spot) setSpotPend(m => ({ ...m, [spot]: r.preview }));
      else act.photoPending(reg, kind, r.preview);
      try { act.addPhoto(reg, kind, r.url, spot, r.file) } finally {
        if (spot) setSpotPend(m => { const n = { ...m }; delete n[spot]; return n });
        else act.photoPending(reg, kind, null);
      }
    } catch (e: any) { ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo')) }
  };
  const viewShot = (kind: 'before' | 'after' | 'issue') => {
    const w = W(reg); if (!w) return;
    openPhotoSheet(reg, kind, w.photos.filter(p => p.kind === kind), !['done', 'skipped'].includes(w.status), () => { void shoot(kind) });
  };
  const finish = () => {
    if (act.finish(reg)) {
      const nx = Route.nextReg();
      const n = nx ? carBy(nx) : null;
      openSuccessSheet(car.customer, nx && n ? { reg: nx, model: n.model } : null, goPaisa);
    }
  };
  const startWash = () => { if (!wd) return; act.startWash(reg); saveStartInfo(reg, startInfo.current, wd.issues) };
  const nxReg = Route.nextReg();
  const nxCar = nxReg ? carBy(nxReg) : null;

  /* the one main action, in the sticky bar */
  const mins = wd?.started_at ? Math.max(0, Math.round((Date.now() - Date.parse(wd.started_at)) / 60000)) : 0;
  const nextBar = nxReg && nxCar
    ? { label: t(`Agli gaadi: ${nxCar.model}`), onPress: () => act.setCurrent(nxReg) }
    : { label: t('Aaj ka hisaab dekho'), onPress: goPaisa };
  let bar: { label: string; onPress: () => void; summary?: string; summaryLabel?: string; variant?: 'primary' | 'secondary' };
  if (!wd) bar = { label: t('Round shuru karo'), onPress: () => { act.startRound() }, summary: t(`${route().length} gaadi`), summaryLabel: t('Aaj ka round') };
  else if (st === 'scheduled') bar = { label: t('Nikla · gaadi ki taraf'), onPress: () => act.onTheWay(reg), summary: `ETA ${hm12(wd.eta)}`, summaryLabel: t('Abhi tak nikle nahi') };
  else if (st === 'on_the_way') bar = { label: t('Pahuncha · gaadi ke paas'), onPress: () => act.arrived(reg), summary: `ETA ${hm12(wd.eta)}`, summaryLabel: t('Raste mein') };
  else if (st === 'arrived') bar = { label: t('Wash shuru karo'), onPress: startWash, summary: t(`${tasks.length} kaam`), summaryLabel: t('Pahunch gaye') };
  else if (st === 'washing') bar = { label: t('Wash khatam karo'), onPress: photosOk ? finish : () => act.needPhoto(reg), variant: photosOk ? 'primary' : 'secondary', summary: `${tdone} of ${tasks.length} tasks`, summaryLabel: `${mins} min` };
  else if (st === 'done') bar = { ...nextBar, summary: `${wd.minutes ?? '–'} min`, summaryLabel: t('Ho gaya') };
  else bar = nxReg && nxCar ? { ...nextBar, summary: t('Skip kiya'), summaryLabel: t('Aaj ke liye') } : { label: t('Round par wapas'), onPress: leave, summary: t('Skip kiya'), summaryLabel: t('Aaj ke liye') };

  const photoHint = need && need.sunday
    ? t(`Gaadi ki ${Math.max(0, MIN_PHOTOS - afterN)} aur andar ki ${need.missing.length} photo baaki hain, phir wash band hogi`)
    : t(`Gaadi ki ${Math.min(afterN, MIN_PHOTOS)}/${MIN_PHOTOS} photo lo, phir wash band hogi`);

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <ScreenBar title={car.society ? `${car.society} · ${car.house}` : car.house} back onBack={goRound} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <CarHeader reg={reg} st={st} />
          <Stepper steps={steps} />

          {st === 'washing' ? <View style={{ alignItems: 'center' }}><WorkingArt width={220} /></View> : null}

          {reqs.map(q => <ReqCard key={q.id} q={q} customer={car.customer} />)}
          {late ? <NoteRow icon="warn" tone="red">{t('Late · slot khatam ho gaya')}</NoteRow> : null}
          {pre && sk ? (
            <>
              <NoteRow icon="pause" tone="red"><Text style={{ fontFamily: F.semi }}>{t('Customer ne aaj mana kiya hai.')}</Text> {sk.text || t('Kal wash mat karna.')}</NoteRow>
              <Group><Row icon="pause" label={t('Skip karo · customer ne mana kiya')} destructive onPress={() => act.skip(reg, 'Customer ne mana kiya')} /></Group>
            </>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {!wd ? <View style={{ marginTop: 12 }}><NoteRow icon="clock" tone="violet">{t('Round abhi shuru nahi hua. Shuru karte hi saare customers ko time chala jayega.')}</NoteRow></View> : null}

          {pre ? (
            <>
              <StartCapture key={reg} info={startInfo} />
              <SectionLabel>{t('Jagah')}</SectionLabel>
              <Group>
                <Row icon="pin" label={car.house} sub={[car.spot, car.keys].filter(Boolean).join(' · ') || undefined} />
                {st !== 'arrived' ? <Row icon="drop" label={t('Seedha wash shuru karo')} sub={t('Nikla / Pahuncha ke bina')} onPress={startWash} /> : null}
              </Group>
            </>
          ) : null}

          {wd && st === 'done' ? (
            <>
              <SectionLabel>{t('Customer ko bhej diya')}</SectionLabel>
              <Group>
                <Row icon="clock" label={t('Khatam')} value={t12(wd.finished_at)} />
                <Row icon="drop" label={t('Time')} value={`${wd.minutes ?? '–'} min`} />
                <Row icon="drop" label={t('Paani')} value={`${wd.water_litres ?? '–'} L`} />
                {RT[reg] ? <Row icon="star" label={t('Rating')} value={'★'.repeat(RT[reg])} /> : null}
              </Group>
              <ReportSummary wd={wd} />
              {wd.addons && wd.addons.length ? <ExtrasRow addons={wd.addons} /> : null}
            </>
          ) : null}

          {wd && st === 'skipped' ? (
            <>
              <SectionLabel>{t('Skip kiya')}</SectionLabel>
              <Group>
                <Row icon="pause" label={wd.skip_reason || t('Skip')} sub={t('Customer ko wajah dikh rahi hai.')} />
                <Row icon="redo" label={t('Galti se hua? Wapas kholo')} onPress={() => act.unskip(reg)} />
              </Group>
            </>
          ) : null}

          {st !== 'skipped' ? (
            <>
              <SectionLabel>{`${t('Aaj ke kaam')} · ${tdone}/${tasks.length}${can || st === 'done' ? '' : t(' · wash shuru hone pe tick karo')}`}</SectionLabel>
              <Group>
                {tasks.map(tk => <TaskRow key={tk.key} k={tk.key} done={tk.done} doneAt={tk.done_at} can={can} onPress={() => act.task(reg, tk.key)} />)}
              </Group>
            </>
          ) : null}

          {st === 'washing' && wd?.started_at ? (
            <>
              <SectionLabel>{t('Abhi ka kadam')}</SectionLabel>
              <WashGuide startedAt={wd.started_at} interiorFrom={wd.interior_from} onTakePhoto={() => { void shoot('after') }} />
              {!isSundayIST(wd.started_at) ? (
                <View style={{ marginTop: 12 }}>
                  {wd.interior ? <ExtrasRow addons={wd.addons || []} compact /> : <InteriorButton reg={reg} />}
                </View>
              ) : null}
            </>
          ) : null}

          {wd && st === 'washing' ? (
            <>
              <SectionLabel>{`${t('Report')} · ${t('Kuch hua to yahan tap karo')}`}</SectionLabel>
              <ReportSection reg={reg} wd={wd} />
            </>
          ) : null}

          {st !== 'skipped' ? (
            <>
              <SectionLabel>{t('Photo')}</SectionLabel>
              <Group>
                <View style={{ padding: 14, gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['after', 'issue'] as const).map(k => (
                      <Shot key={k} kind={k} list={photosOf(k)} enabled={!!wd} onTake={() => { void shoot(k) }} onView={() => viewShot(k)} />
                    ))}
                  </View>
                  <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 17, color: th.grey }}>{t(`Wash khatam hone par gaadi ki ${MIN_PHOTOS} photo zaroori. Shuru mein koi photo nahi.`)}</Text>
                </View>
              </Group>
            </>
          ) : null}

          {sunday && wd ? (
            <>
              <SectionLabel>{`${t('Andar ki photo')} · ${SPOTS.filter(sp => wd.photos.some(p => p.spot === sp.key)).length}/${SPOTS.length}`}</SectionLabel>
              <Group>
                <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
                  {SPOTS.map(sp => {
                    const got = wd.photos.filter(p => p.spot === sp.key).slice(-1)[0];
                    const pendSrc = spotPend[sp.key];
                    const src = pendSrc || (got ? photoSrc(got) : undefined);
                    return (
                      <View key={sp.key} style={{ width: '48%' }}>
                        <Pressy onPress={pendSrc || st !== 'washing' ? undefined : () => { void shoot('inside', sp.key) }} accessibilityLabel={t(sp.label)} scaleTo={0.95}
                          style={{ width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: src ? th.tile2 : 'transparent', borderWidth: src ? 0 : 1.5, borderStyle: 'dashed', borderColor: th.dash }}>
                          {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Icon name="cam" size={22} color={th.grey} />}
                          {pendSrc ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,20,0.45)', alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color="#fff" size="large" /></View> : null}
                          {got && !pendSrc ? <View style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#fff" /></View> : null}
                        </Pressy>
                        <Text numberOfLines={1} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: th.grey, textAlign: 'center', marginTop: 6 }}>{t(sp.label)}</Text>
                      </View>
                    );
                  })}
                </View>
              </Group>
            </>
          ) : null}

          {wd && st === 'washing' && !photosOk ? <View style={{ marginTop: 12 }}><NoteRow icon="cam" tone="amber">{photoHint}</NoteRow></View> : null}

          {wd ? (
            <>
              <SectionLabel>{t('Customer')}</SectionLabel>
              <Group>
                <Row icon="note" label={wd.washer_note ? t('Customer ke liye note') : t('Customer ko kuch batana hai?')} sub={wd.washer_note || t('Scratch, tyre, kuch bhi. Unke app mein dikhega.')} onPress={() => openNoteSheet(reg, car.customer, wd.washer_note)} />
                {!['done', 'skipped'].includes(st) ? <Row icon="pause" label={t('Gaadi nahi dho paye? Skip karo')} onPress={() => openSkipSheet(reg, car.customer)} /> : null}
              </Group>
            </>
          ) : null}
        </View>
      </PullToRefresh>
      <StickyBar label={bar.label} onPress={bar.onPress} summary={bar.summary} summaryLabel={bar.summaryLabel} variant={bar.variant || 'primary'} />
    </View>
  );
}
