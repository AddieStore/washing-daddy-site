// Hazri tab: one big button. Tapping it stamps the time at once, opens the front camera, reads the photo on the phone and
// checks the T-shirt is WD white or WD blue. A verified photo is sent by itself (no extra taps); the manager sees it too.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { F, Icon, Lift, PCard, PTitle, PageHeader, PullToRefresh, Pressy, ui, useTheme } from '../../ui';
import { DAY, S, act, useStore } from '../../state/store';
import { addDaysStr, dayLong, dayNarrow, isoIST, t12 } from '../../lib/time';
import { isHindi, t } from '../../lib/i18n';
import { takePhoto } from '../../lib/photo';
import type { ShirtResult } from '../../lib/shirt';
import { readShirt } from '../../screens/AttendanceSheet';
import { CheckOutCard } from '../../screens/CheckOutCard';
import { FadeUp, TNUM } from '../../screens/ProntoBits';

const GREEN = '#22C58B', MAX_PHOTO = 40000;
const colorName = (c?: string) => (c === 'blue' ? t('Blue T-shirt') : c === 'white' ? t('White T-shirt') : t('T-shirt'));

function Clock() {
  const { c } = useTheme();
  const [now, setNow] = useState(isoIST());
  useEffect(() => { const i = setInterval(() => setNow(isoIST()), 1000); return () => clearInterval(i) }, []);
  return <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 34, letterSpacing: -1, color: c.fg }]}>{t12(now)}</Text>;
}

type Shot = { at: string; preview: string; url: string; shirt: ShirtResult | null };

export default function Attendance() {
  useStore();
  const { c } = useTheme();
  const hi = isHindi();
  const day = S.day, inAt = day?.checkin_at, uni = day?.checkin_uniform;
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [misses, setMisses] = useState(0);
  const [sending, setSending] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false }, []);

  const send = async (s: Shot, matched: boolean) => {
    setSending(true);
    await act.checkIn({ at: s.at, photo: s.url.length <= MAX_PHOTO ? s.url : undefined, shirt: { shirt_match: matched, shirt_share: s.shirt?.share ?? 0, shirt_color: s.shirt?.color } });
    if (alive.current) { setSending(false); setShot(null); setMisses(0) }
  };
  const mark = async () => {
    if (busy || sending) return;
    const at = isoIST();   // the time is taken the moment the button is pressed
    setBusy(true);
    try {
      const p = await takePhoto({ selfie: true, quality: 0.5 });
      if (!p || !alive.current) return;
      const shirt = await readShirt(p.preview);
      if (!alive.current) return;
      const s: Shot = { at, preview: p.preview, url: p.url, shirt };
      if (shirt?.ok) { setShot(s); await send(s, true) }
      else { setShot(s); setMisses(m => m + 1); ui.haptic(14) }
    } catch (e: any) { ui.toast(e?.hi ? t(e.hi) : t('Photo nahi gayi. Dobara try karo')) }
    finally { if (alive.current) setBusy(false) }
  };

  const days = [...Array(14)].map((_, i) => addDaysStr(DAY, i - 13));
  const present = (d: string) => (d === DAY ? !!inAt : !!S.attend?.[d]?.in);
  const nPresent = days.filter(present).length;
  const failed = !!shot && !shot.shirt?.ok;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <PullToRefresh contentContainerStyle={{ flexGrow: 1, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <PageHeader title={t('Hazri')} sub={dayLong(DAY, hi)} bottomPad={66} />
        <Lift>
          <FadeUp index={0}>
            <PCard style={{ padding: 22, alignItems: 'center' }}>
              {inAt ? (
                <>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={38} color="#fff" /></View>
                  <Text style={{ fontFamily: F.display, fontSize: 24, letterSpacing: -0.6, color: c.fg, marginTop: 14 }}>{t('Hazri lag gayi')}</Text>
                  <Text style={[TNUM, { fontFamily: F.displayBlack, fontSize: 38, letterSpacing: -1.2, color: c.primary, marginTop: 2 }]}>{t12(inAt)}</Text>
                  {day?.checkin_photo ? <Image source={{ uri: day.checkin_photo }} style={{ width: 110, height: 132, borderRadius: 16, marginTop: 16, backgroundColor: c.soft }} resizeMode="cover" accessibilityLabel={t('Hazri ki photo')} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: uni?.shirt_match ? 'rgba(34,197,139,0.14)' : 'rgba(255,186,8,0.2)' }}>
                    <Icon name={uni?.shirt_match ? 'check' : 'shield'} size={14} color={uni?.shirt_match ? '#0E9F6E' : '#9A6A00'} />
                    <Text style={{ fontFamily: F.semi, fontSize: 13, color: uni?.shirt_match ? '#0B7A55' : '#6B4A00' }}>{uni?.shirt_match ? `${colorName(uni.shirt_color)} ${t('verify hui')}` : t('Manager photo dekhega')}</Text>
                  </View>
                </>
              ) : failed && shot ? (
                <>
                  <Image source={{ uri: shot.preview }} style={{ width: 150, height: 180, borderRadius: 18, backgroundColor: c.soft }} resizeMode="cover" />
                  <Text style={[TNUM, { fontFamily: F.semi, fontSize: 13, color: c.grey, marginTop: 10 }]}>{t12(shot.at)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(232,56,79,0.08)', alignSelf: 'stretch' }}>
                    <Icon name="warn" size={20} color="#E8384F" />
                    <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19, color: c.fg }}>{t('White ya blue T-shirt nahi dikhi. T-shirt poori dikhe, roshni mein photo lo.')}</Text>
                  </View>
                  <Pressy onPress={mark} accessibilityLabel={t('Dobara photo lo')} scaleTo={0.98} style={{ marginTop: 16, height: 54, borderRadius: 18, backgroundColor: c.primary, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
                    <Icon name="cam" size={20} color="#fff" /><Text style={{ fontFamily: F.bold, fontSize: 16, color: '#fff' }}>{t('Dobara photo lo')}</Text>
                  </Pressy>
                  {misses >= 2 ? (
                    <Pressable onPress={() => { void send(shot, false) }} disabled={sending} hitSlop={10} style={{ marginTop: 14 }}>
                      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: c.grey }}>{t('Phir bhi bhejo (manager dekhega)')}</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <>
                  <Clock />
                  <Text style={{ fontFamily: F.body, fontSize: 13, color: c.grey, marginTop: 2 }}>{dayLong(DAY, hi)}</Text>
                  <Pressy onPress={mark} accessibilityLabel={t('Hazri lagao')} scaleTo={0.95} style={{ marginTop: 24, width: 168, height: 168, borderRadius: 84, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#5409DA', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
                    {busy || sending ? <ActivityIndicator color="#fff" size="large" /> : (
                      <>
                        <Icon name="cam" size={44} color="#fff" />
                        <Text style={{ fontFamily: F.bold, fontSize: 17, color: '#fff', marginTop: 8 }}>{t('Hazri lagao')}</Text>
                      </>
                    )}
                  </Pressy>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, textAlign: 'center', marginTop: 22, maxWidth: 280 }}>{t('Dabate hi time lag jayega aur camera khulega. White ya blue WD T-shirt pehen ke selfie lo.')}</Text>
                </>
              )}
            </PCard>
          </FadeUp>

          {!inAt && !failed ? (
            <FadeUp index={1} style={{ marginTop: 12 }}>
              <PCard style={{ padding: 16, gap: 12 }}>
                {[['clock', t('Time apne aap lag jayega')], ['cam', t('Seedhe khade ho, chehra aur T-shirt poori dikhe')], ['check', t('White ya blue WD T-shirt: phone khud check karega')]].map(([ic, tx]) => (
                  <View key={tx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic as any} size={17} color={c.primary} /></View>
                    <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, color: c.fg }}>{tx}</Text>
                  </View>
                ))}
              </PCard>
            </FadeUp>
          ) : null}

          {day?.started ? <FadeUp index={2} style={{ marginTop: 12 }}><CheckOutCard /></FadeUp> : null}

          <PTitle title={t('Pichhle 14 din')} note={`${nPresent}/14 ${t('din hazir')}`} />
          <FadeUp index={3}>
            <PCard style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
                {days.map(d => {
                  const p = present(d), today = d === DAY;
                  return (
                    <View key={d} style={{ width: `${100 / 7}%`, alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: p ? GREEN : c.soft, borderWidth: today && !p ? 2 : 0, borderColor: c.primary }}>
                        {p ? <Icon name="check" size={16} color="#fff" /> : null}
                      </View>
                      <Text style={{ fontFamily: today ? F.bold : F.medium, fontSize: 11.5, color: today ? c.primary : c.grey }}>{today ? t('Aaj') : dayNarrow(d, hi)}</Text>
                    </View>
                  );
                })}
              </View>
            </PCard>
          </FadeUp>
        </Lift>
      </PullToRefresh>
    </View>
  );
}
