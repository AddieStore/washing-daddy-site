// Rewards screen: this month's attendance as a calendar, the three bonuses with progress, and what is still possible.
// The manager pays any bonus at the end of the month; the app only shows where the washer stands.
// Third bonus (No Complaint): no customer complaint this month, or a 4.8+ average rating (lib/complaints.ts).
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DemoNote, F, Group, ui, Icon, Receipt, ReceiptRow, Ring, Row, SectionLabel, brand, useTheme } from '../ui';
import { DAY, attendLog, useStore, monthComplaints } from '../state/store';
import { BEST, CLEAN_BONUS, EARLY_BONUS, EARLY_DAYS, MONTH_BONUS } from '../lib/rewards';
import { unseen } from '../lib/complaints';
import { monthDays, type DayState } from '../lib/rewardsView';
import { rupee } from '../lib/time';
import { t } from '../lib/i18n';
import { FadeUp } from '../screens/ProntoBits';
import { BackTitle, LineChip, cleanLine, cleanRing, earlyLine, monthLine, openComplaints, useOutlook, useToneColors, type Line } from '../screens/RewardsCards';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function alpha(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function Cell({ day, state, early }: { day: number; state: DayState; early: boolean }) {
  const { c } = useTheme();
  const base = { flex: 1, aspectRatio: 1, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, marginHorizontal: 2 };
  const look = state === 'came' ? { backgroundColor: alpha(c.ok, 0.16) }
    : state === 'missed' ? { backgroundColor: alpha(brand.red, 0.12) }
    : state === 'today' ? { borderWidth: 2, borderColor: c.primary, backgroundColor: c.soft }
    : { backgroundColor: 'transparent' };
  const ink = state === 'came' ? c.ok : state === 'missed' ? brand.red : state === 'today' ? c.primary : c.fg3;
  return (
    <View style={[base, look]} accessible accessibilityLabel={`${day}, ${t(state === 'came' ? 'Aaye' : state === 'missed' ? 'Chhoot gaye' : state === 'today' ? 'Aaj' : 'Aane wale din')}${early ? ', ' + t('Early bird') : ''}`}>
      <Text style={{ fontFamily: state === 'upcoming' ? F.body : F.bold, fontSize: 13, lineHeight: 16, color: ink }}>{day}</Text>
      <View style={{ height: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
        {state === 'came' ? <Icon name="check" size={9} color={c.ok} />
          : state === 'missed' ? <Text style={{ fontFamily: F.black, fontSize: 10, lineHeight: 10, color: brand.red }}>×</Text>
          : null}
      </View>
      {early ? <View style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} /> : null}
    </View>
  );
}

function Legend({ label, swatch }: { label: string; swatch: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Text style={{ fontFamily: F.body, fontSize: 12, color: c.grey }}>{label}</Text>
    </View>
  );
}

function Calendar({ title }: { title: string }) {
  const { c } = useTheme();
  const { lead, days } = monthDays(attendLog(), DAY);
  const cells: (typeof days[number] | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const rows = [...Array(cells.length / 7)].map((_, i) => cells.slice(i * 7, i * 7 + 7));
  const sw = (bg: string, extra?: object) => <View style={[{ width: 14, height: 14, borderRadius: 5, backgroundColor: bg }, extra]} />;
  return (
    <Group><View style={{ padding: 16 }}>

      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {WEEK.map(w => <Text key={w} style={{ flex: 1, textAlign: 'center', fontFamily: F.semi, fontSize: 11.5, color: c.fg3, marginHorizontal: 2 }} numberOfLines={1}>{t(w)}</Text>)}
      </View>
      <View style={{ gap: 4 }}>
        {rows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            {r.map((d, j) => d
              ? <Cell key={j} day={d.day} state={d.state} early={d.early} />
              : <View key={j} style={{ flex: 1, marginHorizontal: 2 }} />)}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 14 }}>
        <Legend label={t('Aaye')} swatch={sw(alpha(c.ok, 0.3))} />
        <Legend label={t('Chhoot gaye')} swatch={sw(alpha(brand.red, 0.25))} />
        <Legend label={t('Aaj')} swatch={sw(c.soft, { borderWidth: 2, borderColor: c.primary })} />
        <Legend label={t('Aane wale din')} swatch={sw('transparent', { borderWidth: 1, borderColor: c.line })} />
        <Legend label={t('Early bird din')} swatch={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, margin: 3 }} />} />
      </View>
    </View></Group>
  );
}

function BonusCard({ title, amount, rule, fraction, value, unit, line }: { title: string; amount: number; rule: string; fraction: number; value: number | string; unit: string; line: Line }) {
  const { c } = useTheme();
  const col = useToneColors();
  const icon = line.tone === 'ok' ? 'check' : line.tone === 'dead' ? 'warn' : 'flag';
  return (
    <Group>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
        <Ring size={80} stroke={9} fraction={fraction} value={value} label={unit} color={col.ring[line.tone]} track={c.soft} ink={c.fg} disc="transparent" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg, flexShrink: 1 }}>{title}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'], color: line.tone === 'dead' ? c.grey : c.fg, textDecorationLine: line.tone === 'dead' ? 'line-through' : 'none' }}>{rupee(amount)}</Text>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 17, color: c.grey, marginTop: 4 }}>{rule}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Icon name={icon} size={16} color={col.ink[line.tone]} />
        <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: line.tone === 'dead' ? brand.red : c.fg }}>{line.text}</Text>
        <LineChip line={line} />
      </View>
    </Group>
  );
}

export default function Rewards() {
  useStore();
  const { c } = useTheme();
  const router = useRouter();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.navigate('/') };
  const o = useOutlook(), m = o.r.month, cr = cleanRing(o);
  const total = BEST, mine = monthComplaints(), newOnes = unseen(mine);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <BackTitle title={t('Bonus')} subtitle={t('Attendance aur bonus')} onBack={goBack} />
        <View style={{ paddingHorizontal: 16 }}>
          <FadeUp index={0} style={{ marginTop: 8 }}>
            <Receipt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: c.grey }}>{t('Is mahine ka bonus')}</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: c.fg, fontVariant: ['tabular-nums'] }}>{rupee(o.possible)}</Text>
                </View>
                <Ring size={72} stroke={8} fraction={m.total ? m.came / m.total : 0} value={m.came} label={`/${m.total} ${t('din')}`} color={c.primary} track={c.soft} ink={c.fg} disc="transparent" />
              </View>
              <ReceiptRow label={t('Teeno saath')} value={rupee(total)} hint onHint={() => ui.toast(t('Teeno bonus mil jayein to itna'))} />
              <ReceiptRow label={t('Abhi mumkin')} value={rupee(o.possible)} hint onHint={() => ui.toast(t('Jo bonus abhi bhi mil sakta hai'))} />
              <ReceiptRow label={t('Pakka')} value={rupee(o.earnedSoFar)} total tone={o.earnedSoFar ? 'ok' : undefined} />
            </Receipt>
          </FadeUp>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, marginTop: 10, marginHorizontal: 4 }}>{t('Bonus Manager mahine ke end mein deta hai. App mein paisa nahi chalta.')}</Text>

          <SectionLabel>{t('Is mahine ki attendance')}</SectionLabel>
          <FadeUp index={1}><Calendar title={t('Is mahine ki attendance')} /></FadeUp>

          <SectionLabel>{t('Teen bonus')}</SectionLabel>
          <View style={{ gap: 12 }}>
            <FadeUp index={2}><BonusCard
              title={t('Early bird')} amount={EARLY_BONUS}
              rule={t('Subah 6:00 AM se pehle pehli gaadi ki photo, lagatar 30 din = ₹1,000')}
              fraction={o.streak / EARLY_DAYS} value={o.streak} unit={`/${EARLY_DAYS}`} line={earlyLine(o)}
            /></FadeUp>
            <FadeUp index={3}><BonusCard
              title={t('Poora mahina')} amount={MONTH_BONUS}
              rule={t('Mahine ke har din aao = ₹1,000')}
              fraction={m.total ? m.came / m.total : 0} value={m.came} unit={`/${m.total}`} line={monthLine(o)}
            /></FadeUp>
            <FadeUp index={4}><BonusCard
              title={t('No complaint')} amount={CLEAN_BONUS}
              rule={t('Mahine mein koi customer complaint nahi, ya rating 4.8★ ya upar (kam se kam 5 rating) = ₹1,000')}
              fraction={cr.fraction} value={cr.value} unit={cr.unit} line={cleanLine(o)}
            /></FadeUp>
          </View>

          <SectionLabel>{t('Customer feedback')}</SectionLabel>
          <FadeUp index={5}>
            <Group>
              <Row
                icon="note"
                label={t('Customer feedback')}
                sub={mine.length ? `${t('Is mahine')}: ${mine.length}${newOnes ? ` · ${t('Naya')}: ${newOnes}` : ''}` : t('Abhi koi complaint nahi')}
                onPress={openComplaints}
              />
            </Group>
          </FadeUp>
          <DemoNote style={{ marginTop: 16 }}>{t('"Aaye" = us din hub pe check-in. Early bird = pehli gaadi ki photo 6:00 AM se pehle.')}</DemoNote>
          <DemoNote style={{ marginTop: 4 }}>{t('Jo complaint Manager galat maane, woh nahi gini jaati.')}</DemoNote>
        </View>
      </ScrollView>
    </View>
  );
}
