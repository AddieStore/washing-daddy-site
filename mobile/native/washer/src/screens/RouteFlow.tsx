// The washer's route, run for him: one dark "do this now" card for the car he is on (slot, society, flat, what to do,
// ONE big button), a track of all the cars with green check circles, and the rest of the route in order below.
// The order and the time slots come from operations; the washer never plans, picks or reorders anything.
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Chip, F, Icon, Pressy as BasePressy, sheet, ui, useTheme } from '../ui';
import { CarArt } from '../ui';
import { CarPic } from './CarPhoto';
import { HsrpPlate, PlateToggle, RejectBanner, WashTimer, openSkipSheet } from './JobParts';
import { rejectInfo } from '../lib/photoRules';
import { DAY, MIN_PHOTOS, Rounds, me, Route, W, act, carBy, openReqs, spotFor, photoNeeds, planName, route, useStore, view } from '../state/store';
import { STATUS, navOf, telOf } from '../lib/data';
import type { Car } from '../lib/data';
import { PLAN, TASK, tasksFor, type PlanId } from '../lib/schedule';
import { slotRange } from '../lib/slots';
import { hm12, rupee, short12, t12 } from '../lib/time';
import { takePhoto } from '../lib/photo';
import { t } from '../lib/i18n';
import { PCard } from '../ui/page';
import { SheetTitle } from './sheets';
import { FadeUp, TNUM } from './ProntoBits';

const GREEN = '#22C58B';
/** Pressy that keeps a flex slot: the flex goes on a wrapper, the button fills it (the base one drops flex from its style) */
function Pressy(props: React.ComponentProps<typeof BasePressy>) {
  const f = (StyleSheet.flatten(props.style as any) || {}) as any, { flex, ...rest } = f;
  if (flex == null) return <BasePressy {...props} />;
  return <View style={{ flex }}><BasePressy {...props} style={[rest, { width: '100%' }]} /></View>;
}
const tm = (h?: string | null) => (h ? short12(hm12(h)) : '');

/** where the car is: "GH-9 Paschim Vihar · Flat 212" */
export const societyOf = (c: Car) => c.society || c.house;
const flatOf = (c: Car) => (c.society ? c.house : '');
export function slotText(reg: string): string {
  const w = W(reg), s = Route.slotOf(reg);
  if (w && w.slot_from && w.slot_to) return `${tm(w.slot_from)} – ${tm(w.slot_to)}`;
  if (s == null) return '';
  const r = slotRange(s); return `${tm(r.from)} – ${tm(r.to)}`;
}

const shooting = new Set<string>();
async function shootAfter(reg: string) {
  if (!W(reg)) { ui.toast(t('Pehle round shuru karo')); return }
  if (shooting.has(reg)) return;   // the camera is already opening for this car
  shooting.add(reg); act.platePrompt(); ui.flash();
  try {
    const r = await takePhoto();
    if (!r) return;
    act.photoPending(reg, 'after', r.preview);
    try { act.addPhoto(reg, 'after', r.url, undefined, r.file) } finally { act.photoPending(reg, 'after', null) }
  } catch (e: any) { ui.toast(t(e?.hi || 'Photo nahi gayi. Dobara try karo')) }
  finally { shooting.delete(reg) }
}

/* ---------- the track: one circle per car, green check when done, violet ring on the one he is on ---------- */
export function RouteTrack() {
  useStore();
  const { c } = useTheme();
  const cars = route(), cn = Route.counts(), live = Route.liveReg() || Route.nextReg();
  if (!cars.length) return null;
  const societies = new Set(cars.map(societyOf)).size;
  return (
    <PCard style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, letterSpacing: -0.2, color: c.fg }}>{t('Aaj ka route')}</Text>
        <Text style={[TNUM, { fontFamily: F.medium, fontSize: 12.5, color: c.grey }]}>{cars.length} {t('gaadi')} · {societies} {t('society')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {cars.map((car, i) => {
          const w = W(car.reg), done = !!w && w.status === 'done', skipped = !!w && w.status === 'skipped', now = car.reg === live && !done;
          return (
            <React.Fragment key={car.reg}>
              {i > 0 ? <View style={{ flex: 1, height: 0, borderTopWidth: 2, borderStyle: 'dotted', borderColor: done || (W(cars[i - 1].reg)?.status === 'done' && now) ? GREEN : c.line, marginHorizontal: 1 }} /> : null}
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                backgroundColor: done ? GREEN : skipped ? '#F2B01E' : now ? c.card : c.soft, borderWidth: now ? 3 : 0, borderColor: c.primary }}>
                {done ? <Icon name="check" size={13} color="#fff" /> : skipped ? <Icon name="pause" size={11} color="#fff" /> : now ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} /> : null}
              </View>
            </React.Fragment>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: c.fg }]}>{cn.done} {t('ho gayi')}</Text>
        <Text style={[TNUM, { fontFamily: F.medium, fontSize: 13, color: c.grey }]}>{cn.total - cn.done - cn.skipped} {t('baaki')}</Text>
      </View>
    </PCard>
  );
}

/* ---------- three-step track inside the card ---------- */
function Steps({ stage }: { stage: number }) {
  const { c } = useTheme();
  const labels = [t('Nikla'), t('Wash'), t('Ho gaya')];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {labels.map((lb, i) => {
        const ok = i < stage, now = i === stage;
        return (
          <React.Fragment key={lb}>
            {i > 0 ? <View style={{ flex: 1, height: 0, borderTopWidth: 2, borderStyle: 'dotted', borderColor: i <= stage ? GREEN : c.line, marginHorizontal: 6, marginBottom: 18 }} /> : null}
            <View style={{ alignItems: 'center', gap: 6, minWidth: 54 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? GREEN : c.card, borderWidth: ok ? 0 : 2, borderColor: now ? c.primary : c.line }}>
                {ok ? <Icon name="check" size={16} color="#fff" /> : now ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary }} /> : null}
              </View>
              <Text style={{ fontFamily: now ? F.bold : F.medium, fontSize: 12, color: now ? c.primary : ok ? c.fg : c.grey }}>{lb}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function ShotBox({ url, pending, onPress, n, bad, plate, pn, reg }: { url?: string; pending?: boolean; onPress: () => void; n: number; bad?: boolean; plate?: boolean; pn?: number; reg: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Pressy onPress={url && !bad ? undefined : onPress} accessibilityLabel={`Photo ${n}`} scaleTo={0.96}
        style={{ width: '100%', height: 92, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: url ? c.soft : 'rgba(84,9,218,0.05)', borderWidth: bad ? 3 : url ? 0 : 1.5, borderStyle: bad ? 'solid' : 'dashed', borderColor: bad ? '#E8384F' : 'rgba(84,9,218,0.35)' }}>
        {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Icon name="cam" size={24} color={c.primary} />
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: c.primary }}>{t('Photo')} {n}</Text>
          </View>
        )}
        {url && !bad ? <View style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={13} color="#fff" /></View> : null}
        {pending ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontFamily: F.semi, fontSize: 11, color: '#fff' }}>{t('Bhej raha hai…')}</Text></View> : null}
      </Pressy>
      {url && !pending && !bad && pn != null ? <PlateToggle on={!!plate} onToggle={() => act.setPlate(reg, pn, !plate)} /> : null}
      {bad ? <Text style={{ fontFamily: F.semi, fontSize: 12, color: '#C62639', textAlign: 'center', marginTop: 6 }}>{t('Dobara lo')}</Text> : null}
    </View>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.semi, fontSize: 11.5, letterSpacing: 0.5, color: c.grey, marginBottom: 8 }}>{children}</Text>;
};

/* ---------- THE card: what to do right now (light, one screen, one button) ---------- */
export function NowCard({ reg }: { reg: string }) {
  useStore();
  const { c } = useTheme();
  const car = carBy(reg), wd = W(reg);
  if (!car) return null;
  const st = wd ? wd.status : 'scheduled';
  const idx = route().findIndex(x => x.reg === reg) + 1, total = route().length;
  const tel = telOf(car.phone), nav = navOf(car), q = openReqs(reg).filter(x => x.status === 'open').length;
  const stage = st === 'scheduled' ? 0 : st === 'washing' ? 2 : st === 'done' ? 3 : 1;
  const tasks = wd ? wd.tasks : tasksFor(reg, car.plan, DAY).map(k => ({ key: k, label: '', done: false, done_at: null as string | null }));
  const need = wd ? photoNeeds(wd) : null;
  const pend = (view.pendingPhotos[reg] || []).filter(p => p.kind === 'after');
  const shots = ((wd ? wd.photos : []).filter(p => p.kind === 'after' && !p.spot).map(p => ({ url: p.url, pending: false, n: p.n, plate: !!p.plate, bad: !!p.rejected })) as { url?: string; pending: boolean; n?: number; plate?: boolean; bad?: boolean }[])
    .concat(pend.map(p => ({ url: p.display, pending: true })));
  const rej = wd ? rejectInfo(wd.photos) : null;
  const have = need ? need.car : 0;
  const late = Route.isLate(reg);
  const slot = slotText(reg), flat = flatOf(car);

  let label = t('Nikla · gaadi ki taraf'), onPress: () => void = () => act.onTheWay(reg), hint = t('Dabate hi customer ko dikhega: aap aa rahe ho');
  if (st === 'on_the_way' || st === 'arrived') { label = t('Pahunch gaya · Wash shuru'); onPress = () => act.startWash(reg); hint = t('Timer chalu ho jayega'); }
  let ready = false;
  if (st === 'washing') {
    if (have < MIN_PHOTOS) { label = `${t('Photo lo')} ${Math.min(have, MIN_PHOTOS)}/${MIN_PHOTOS}`; onPress = () => { void shootAfter(reg) }; hint = t('Ek photo mein number plate dikhni chahiye (aage ya peeche)'); }
    else if (need && need.car >= MIN_PHOTOS && !need.plate) { label = t('Number plate tick karo'); onPress = () => { ui.toast(t('Ek photo mein number plate dikhni chahiye. "Number plate dikh rahi hai" tick karo')) }; hint = t('Ek photo mein number plate dikhni chahiye (aage ya peeche)'); }
    else if (need && !need.ok) { label = t('Andar ki photo lo'); onPress = () => { act.setCurrent(reg); router.push('/job') }; hint = t('Sunday: andar ki photo bhi chahiye'); }
    else { label = t('Wash khatam · Ho gaya'); onPress = () => { act.finish(reg) }; hint = t('Customer ko photo aur report chali jayegi'); ready = true }
  }
  const go = () => { ui.haptic(10); onPress() };

  return (
    <PCard style={{ padding: 20, shadowOpacity: 0.12, shadowRadius: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(84,9,218,0.08)' }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary }} />
          <Text style={{ fontFamily: F.bold, fontSize: 11.5, letterSpacing: 0.8, color: c.primary }}>{t('ABHI YEH KARO')}</Text>
        </View>
        <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: c.grey }]}>{t('Gaadi')} {idx} / {total}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 }}>
        <View style={{ width: 96, height: 70, borderRadius: 16, backgroundColor: '#F3EEFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <CarPic reg={reg} w={96} h={70} size={26} radius={16}><CarArt car={car} width={84} height={42} /></CarPic>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.7, color: c.fg }}>{car.model}</Text>
          <HsrpPlate reg={car.plate} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        {slot ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: late ? 'rgba(232,56,79,0.10)' : 'rgba(84,9,218,0.08)' }}>
            <Icon name="clock" size={14} color={late ? '#E8384F' : c.primary} />
            <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: late ? '#E8384F' : c.primary }]}>{slot}{late ? ` · ${t('Late')}` : ''}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: c.soft }}>
          <Icon name="pin" size={14} color={c.grey} />
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 13, color: c.fg, maxWidth: 200 }}>{societyOf(car)}</Text>
        </View>
        <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: c.soft, justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: c.fg }}>{planName(car)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 18, flexDirection: 'row', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Label>{t('KAHAN')}</Label>
          <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg }}>{[flat, car.spot].filter(Boolean).join(' · ') || societyOf(car)}</Text>
          {car.keys ? <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: '#9A6A00', marginTop: 3 }}>{t('Chaabi')}: {car.keys}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Label>{t('CUSTOMER')}</Label>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg, maxWidth: 120 }}>{car.customer}</Text>
        </View>
      </View>
      {q ? (
        <Pressable onPress={() => { act.setCurrent(reg); router.push('/job') }} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#FFF6DB' }}>
          <Icon name="note" size={17} color="#9A6A00" />
          <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: '#6B4A00' }}>{t(`${q} customer request`)} · {t('Detail mein dekho')}</Text>
        </Pressable>
      ) : null}

      {rej ? <View style={{ marginTop: 14 }}><RejectBanner info={rej} onPress={() => { void shootAfter(reg) }} /></View> : null}
      <View style={{ height: 1, backgroundColor: c.line, marginVertical: 18 }} />
      <Steps stage={stage} />

      {st === 'washing' ? (
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 11.5, letterSpacing: 0.5, color: c.grey }}>{t('BAAD KI PHOTO')} · {Math.min(have, MIN_PHOTOS)}/{MIN_PHOTOS}</Text>
            {wd?.started_at ? <WashTimer startedAt={wd.started_at} interiorFrom={wd.interior_from} extraMinutes={wd.extra_minutes || 0} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[0, 1].map(i => <ShotBox key={i} n={i + 1} url={shots[i]?.url} pending={shots[i]?.pending} bad={shots[i]?.bad} plate={shots[i]?.plate} pn={shots[i]?.n} reg={reg} onPress={() => { void shootAfter(reg) }} />)}
          </View>
        </View>
      ) : null}

      <Pressy onPress={go} accessibilityLabel={label} scaleTo={0.98}
        style={{ marginTop: 20, height: 58, borderRadius: 18, backgroundColor: ready ? GREEN : c.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
        {st === 'washing' && have < MIN_PHOTOS ? <Icon name="cam" size={22} color="#fff" /> : ready ? <Icon name="check" size={22} color="#fff" /> : null}
        <Text style={{ fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3, color: '#fff' }}>{label}</Text>
      </Pressy>
      <Text style={{ fontFamily: F.body, fontSize: 12.5, textAlign: 'center', color: c.grey, marginTop: 10 }}>{hint}</Text>

      <View style={{ height: 1, backgroundColor: c.line, marginVertical: 16 }} />
      <Label>{t('KAAM')}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tasks.map(tk => {
          const on = st === 'washing', done = tk.done;
          return (
            <Pressable key={tk.key} disabled={!on} onPress={() => act.task(reg, tk.key)} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: done ? 'rgba(34,197,139,0.14)' : c.soft, borderWidth: 1, borderColor: done ? GREEN : 'transparent' }}>
              {done ? <Icon name="check" size={13} color="#0E9F6E" /> : null}
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: done ? '#0B7A55' : c.fg }}>{t(TASK[tk.key].hi)}</Text>
            </Pressable>
          );
        })}
      </View>

      {st !== 'washing' && (nav || tel) ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          {nav ? (
            <Pressy onPress={() => { void Linking.openURL(nav).catch(() => {}) }} accessibilityLabel={t('Raasta')} scaleTo={0.97}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: c.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="pin" size={18} color={c.primary} /><Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{t('Raasta')}</Text>
            </Pressy>
          ) : null}
          {tel ? (
            <Pressy onPress={() => { void Linking.openURL('tel:' + String(car.phone).replace(/[^\d+]/g, '')).catch(() => {}) }} accessibilityLabel={t('Call')} scaleTo={0.97}
              style={{ flex: 1, height: 46, borderRadius: 14, backgroundColor: c.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="phone" size={18} color={c.primary} /><Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{car.customer.split(' ')[0]} {t('ko call')}</Text>
            </Pressy>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        <Pressable onPress={() => { act.setCurrent(reg); router.push('/job') }} hitSlop={10}><Text style={{ fontFamily: F.semi, fontSize: 13, color: c.primary }}>{t('Detail / report')}</Text></Pressable>
        {st !== 'washing' ? <Pressable onPress={() => openSkipSheet(reg, car.customer)} hitSlop={10}><Text style={{ fontFamily: F.semi, fontSize: 13, color: c.grey }}>{t('Gaadi nahi mili? Skip')}</Text></Pressable> : null}
      </View>
    </PCard>
  );
}

/* ---------- tap a car: everything about it in one sheet ---------- */
const PLAN_LINES = (plan: PlanId): string[] => {
  const p = PLAN[plan] || PLAN.std, f = p.f, out: string[] = [];
  const per = (n: number) => (n >= 7 ? 'roz' : `hafte mein ${n} baar`);
  out.push(`${t('Pressure wash + haath se sukhana')}: ${t('roz')}`);
  if (f.foam) out.push(`${t('Foam wash')}: ${t(per(f.foam))}`); else if (f.fm) out.push(`${t('Foam wash')}: ${t('mahine mein 1 baar')}`);
  if (f.interior) out.push(`${t('Andar ki safai')}: ${t(per(f.interior))}`);
  if (f.tyre) out.push(`${t('Tyre aur trim polish')}: ${t(per(f.tyre))}`);
  if (p.det) out.push(`${t('Detailing')}: ${t(p.det === 'm2' ? 'mahine mein 2 baar' : p.det === 'w4' ? 'hafte mein 4 baar' : 'mahine mein 1 baar')}`);
  return out;
};

function CarSheet({ reg, close }: { reg: string; close: () => void }) {
  useStore();
  const { c } = useTheme();
  const car = carBy(reg), wd = W(reg);
  if (!car) return null;
  const st = wd ? wd.status : 'scheduled';
  const tel = telOf(car.phone), nav = navOf(car);
  const tasks = wd ? wd.tasks : tasksFor(reg, car.plan, DAY).map(k => ({ key: k, label: '', done: false, done_at: null as string | null }));
  const shots = wd ? wd.photos.filter(p => p.url && !p.spot) : [];
  const stTone = st === 'done' ? '#22C58B' : st === 'skipped' ? '#F2B01E' : st === 'scheduled' ? c.grey : c.primary;
  const times: [string, string | null | undefined][] = [['Nikla', wd?.on_the_way_at], ['Pahuncha', wd?.arrived_at], ['Wash shuru', wd?.started_at], ['Khatam', wd?.finished_at]];
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginTop: 20 }}><Text style={{ fontFamily: F.bold, fontSize: 14, color: c.fg, marginBottom: 10 }}>{title}</Text>{children}</View>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 92, height: 66, borderRadius: 14, backgroundColor: '#F3EEFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <CarPic reg={reg} w={92} h={66} size={26} radius={14}><CarArt car={car} width={80} height={40} /></CarPic>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.5, color: c.fg }}>{car.model}</Text>
          <HsrpPlate reg={car.plate} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 10 }}>
          <Pressy onPress={close} accessibilityLabel={t('Band karo')} scaleTo={0.9} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.fg }}>✕</Text>
          </Pressy>
          <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: c.soft, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: stTone }}>{t(STATUS[st])}</Text>
          </View>
        </View>
      </View>

      <Block title={t('Plan')}>
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: c.soft, gap: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: c.primary }}>{planName(car)}{car.fee ? ` · ${rupee(car.fee)}/${t('mahina')}` : ''}</Text>
          {PLAN_LINES(car.plan).map(l => <Text key={l} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.fg }}>• {l}</Text>)}
        </View>
      </Block>

      <Block title={t('Aaj ka kaam')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tasks.map(tk => (
            <View key={tk.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: tk.done ? 'rgba(34,197,139,0.14)' : c.soft }}>
              {tk.done ? <Icon name="check" size={13} color="#0E9F6E" /> : null}
              <Text style={{ fontFamily: F.semi, fontSize: 13, color: tk.done ? '#0B7A55' : c.fg }}>{t(TASK[tk.key].hi)}</Text>
            </View>
          ))}
        </View>
      </Block>

      {wd && times.some(x => x[1]) ? (
        <Block title={t('Kab kya hua')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {times.map(([lb, at]) => (
              <View key={lb} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[TNUM, { fontFamily: F.bold, fontSize: 14, color: at ? c.fg : c.grey }]}>{at ? short12(t12(at)) : '–'}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: c.grey }}>{t(lb)}</Text>
              </View>
            ))}
          </View>
          {wd.minutes ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: c.grey, marginTop: 10 }}>{wd.minutes} min · {wd.water_litres ?? '–'} L {t('paani')}</Text> : null}
        </Block>
      ) : null}

      {shots.length ? (
        <Block title={`${t('Photo')} · ${shots.length}`}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {shots.slice(0, 4).map((p, i) => <Image key={i} source={{ uri: p.url }} style={{ flex: 1, height: 76, borderRadius: 12, backgroundColor: c.soft }} resizeMode="cover" />)}
          </View>
        </Block>
      ) : null}

      <Block title={t('Kahan aur kaun')}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: c.fg }}>{societyOf(car)}{flatOf(car) ? ` · ${flatOf(car)}` : ''}</Text>
          {car.spot ? <Text style={{ fontFamily: F.body, fontSize: 13, color: c.grey }}>{car.spot}</Text> : null}
          <Text style={{ fontFamily: F.body, fontSize: 13, color: c.grey }}>{car.customer}{car.keys ? ` · ${t('Chaabi')}: ${car.keys}` : ''}</Text>
        </View>
      </Block>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
        {nav ? <Pressy onPress={() => { void Linking.openURL(nav).catch(() => {}) }} accessibilityLabel={t('Raasta')} scaleTo={0.97} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: c.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="pin" size={18} color={c.primary} /><Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{t('Raasta')}</Text></Pressy> : null}
        {tel ? <Pressy onPress={() => { void Linking.openURL('tel:' + String(car.phone).replace(/[^\d+]/g, '')).catch(() => {}) }} accessibilityLabel={t('Call')} scaleTo={0.97} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: c.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="phone" size={18} color={c.primary} /><Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg }}>{t('Call')}</Text></Pressy> : null}
        <Pressy onPress={() => { close(); act.setCurrent(reg); router.push('/job') }} accessibilityLabel={t('Poora detail')} scaleTo={0.97} style={{ flex: 1.3, height: 48, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 14, color: '#fff' }}>{t('Poora detail')}</Text></Pressy>
      </View>
    </View>
  );
}
export const openCarSheet = (reg: string) => sheet.open(close => <CarSheet reg={reg} close={close} />);

/* ---------- the rest of the route, in order, grouped by society ---------- */
export function RouteList({ nowReg }: { nowReg: string | null }) {
  useStore();
  const { c } = useTheme();
  const cars = route();
  if (!cars.length) return null;
  let last = '';
  return (
    <View>
      {cars.map((car, i) => {
        const w = W(car.reg), st = w ? w.status : 'scheduled', done = st === 'done', skipped = st === 'skipped', now = car.reg === nowReg;
        const soc = societyOf(car), head = soc !== last; last = soc;
        const count = cars.filter(x => societyOf(x) === soc).length;
        const slot = tm(w?.eta || Route.slotEta(car.reg));
        return (
          <View key={car.reg}>
            {head ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: i ? 20 : 2, paddingBottom: 10 }}>
                <Icon name="pin" size={15} color={c.primary} />
                <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 14.5, letterSpacing: -0.1, color: c.fg }}>{soc}</Text>
                <Text style={[TNUM, { fontFamily: F.medium, fontSize: 12.5, color: c.grey }]}>{count} {t('gaadi')}</Text>
              </View>
            ) : null}
            <Pressy onPress={() => openCarSheet(car.reg)} accessibilityLabel={`${car.model} ${car.plate}`} scaleTo={0.98}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 74, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: done ? '#EEF9F4' : now ? '#F4F0FF' : c.card,   // solid fills: a see-through fill lets Android draw its shadow through the box
                borderWidth: now ? 1.5 : 1, borderColor: now ? c.primary : done ? 'rgba(34,197,139,0.35)' : 'rgba(23,23,23,0.08)', opacity: skipped ? 0.65 : 1,
                shadowColor: '#1A1033', shadowOpacity: now ? 0.1 : 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: now ? 3 : 1 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? GREEN : skipped ? '#F2B01E' : now ? c.primary : c.soft }}>
                {done ? <Icon name="check" size={20} color="#fff" /> : skipped ? <Icon name="pause" size={16} color="#fff" /> : <Text style={[TNUM, { fontFamily: F.bold, fontSize: 14, color: now ? '#fff' : c.grey }]}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15.5, letterSpacing: -0.2, color: c.fg }}>{car.model}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={[TNUM, { fontFamily: F.medium, fontSize: 12, color: c.grey }]}>{car.plate}</Text>
                  {spotFor(car.reg) ? <Chip tone="amber" icon="pin">{t('Alag jagah')}</Chip> : null}
                </View>
                <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{[car.society ? car.house : car.spot, car.customer].filter(Boolean).join(' · ')}</Text>
                {w && rejectInfo(w.photos) ? <View style={{ marginTop: 4 }}><RejectBanner compact info={rejectInfo(w.photos)!} /></View> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                {done ? <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: '#0E9F6E' }]}>{w?.finished_at ? short12(t12(w.finished_at)) : ''}</Text>
                  : <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: now ? c.primary : c.fg }]}>{slot}</Text>}
                {now ? <View style={{ paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: c.primary, justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 0.5, color: '#fff' }}>{t('ABHI')}</Text></View>
                  : done ? <Text style={{ fontFamily: F.medium, fontSize: 11, color: '#0E9F6E' }}>{t('Ho gaya')}</Text> : null}
              </View>
              <Icon name="chevron" size={16} color={c.grey} />
            </Pressy>
          </View>
        );
      })}
    </View>
  );
}

/* ---------- the round: every car of one area in one list; any washer can take it ---------- */
function RoundSheet({ close }: { close: () => void }) {
  useStore();
  const { c } = useTheme();
  const mine = Rounds.mine(), all = Rounds.all();
  return (
    <View>
      <SheetTitle title={t('Apna round chuno')} sub={t('Round = ek area ki saari gaadiyan. Round lete hi uski saari gaadiyan aapke naam ho jaati hain.')} />
      <View style={{ gap: 10 }}>
        {all.map(r => {
          const on = r.id === mine.id, taken = !!(r as any).washer && (r as any).washer !== me().id && !on;
          return (
            <Pressy key={r.id} onPress={() => { if (taken) { ui.toast(t('Yeh round kisi aur washer ke paas hai. Manager se poochho')); return } if (on || act.pickRound(r.id)) close() }} accessibilityLabel={`${r.name}, ${r.count} gaadi`} accessibilityState={{ selected: on }} scaleTo={0.98}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: on ? 'rgba(84,9,218,0.06)' : c.card, opacity: taken ? 0.55 : 1, borderWidth: on ? 1.5 : 1, borderColor: on ? c.primary : c.line }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: on ? c.primary : c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pin" size={22} color={on ? '#fff' : c.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15.5, letterSpacing: -0.2, color: c.fg }}>{r.name}</Text>
                <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey }}>{r.areas}</Text>
                <Text style={[TNUM, { fontFamily: F.semi, fontSize: 12.5, color: c.primary, marginTop: 2 }]}>{r.count} {t('gaadi')}{taken ? ` · ${t('kisi aur ke paas')}` : ''}</Text>
              </View>
              {on ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#fff" /></View> : null}
            </Pressy>
          );
        })}
      </View>
      {all.length < 2 ? <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: c.grey, marginTop: 14 }}>{t('Doosre rounds abhi load ho rahe hain ya manager ne banaye nahi.')}</Text> : null}
    </View>
  );
}
export const openRoundSheet = () => { void Rounds.load(); sheet.open(close => <RoundSheet close={close} />) };
