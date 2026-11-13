// Customer feedback: the complaints customers sent about this washer's washes, this month first.
// Read-only for the washer: opening the screen marks new ones as seen; the manager resolves them in the approvals page.
// Shows date, car plate, the customer's FIRST name only, what they wrote and where it stands. Never the customer's
// phone number or what the customer pays. Opens from the Rewards screen and the Profile tab.
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DotBg, DashCard, Footer, DemoNote, F, Icon, IconBubble, SectionTitle, brand, useTheme } from '../ui';
import { Complaints, DAY, act, carBy, monthComplaints, useStore } from '../state/store';
import { type Complaint, type ComplaintKind, type ComplaintStatus } from '../lib/complaints';
import { dayShort } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { ScreenBar } from '../screens/JobParts';
import { cleanLine, useOutlook } from '../screens/RewardsCards';

const KIND: Record<ComplaintKind, string> = { quality: 'Safai', late: 'Der se', behaviour: 'Bartaav', damage: 'Nuksaan', other: 'Aur kuch' };
const STATUS: Record<ComplaintStatus, string> = { open: 'Naya', seen: 'Dekh liya', resolved: 'Theek ho gaya', invalid: 'Gini nahi gayi' };

function alpha(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function StatusChip({ status }: { status: ComplaintStatus }) {
  const { c } = useTheme();
  const col = status === 'resolved' ? c.ok : status === 'invalid' ? c.fg3 : c.primary;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: status === 'open' || status === 'seen' ? c.soft : alpha(col, 0.14) }}>
      <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: status === 'open' || status === 'seen' ? c.softInk : col }}>{t(STATUS[status])}</Text>
    </View>
  );
}

function Item({ x }: { x: Complaint }) {
  const { c } = useTheme();
  const plate = carBy(x.reg)?.plate || x.reg;
  const foot = x.status === 'resolved' ? t('Theek ho gaya') : x.status === 'invalid' ? t('Manager ne ise gina nahi') : t('Manager dekh rahe hain');
  return (
    <DashCard style={{ padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 15, color: c.fg }}>{plate}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 2 }}>
            {dayShort(x.date, isHindi())}{x.customer_first ? ` · ${x.customer_first}` : ''} · {t(KIND[x.kind])}
          </Text>
        </View>
        <StatusChip status={x.status} />
      </View>
      {x.text ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg2 }}>{x.text}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={x.status === 'resolved' ? 'check' : 'user'} size={14} color={x.status === 'resolved' ? c.ok : c.fg3} />
        <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: x.status === 'resolved' ? c.ok : c.fg3 }}>{foot}</Text>
      </View>
    </DashCard>
  );
}

export default function ComplaintsScreen() {
  useStore();
  const { c } = useTheme();
  const o = useOutlook(), line = cleanLine(o);
  const month = monthComplaints();
  const older = Complaints.items.filter(x => x.month < DAY.slice(0, 7)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  // opening the screen is the washer seeing them: open -> seen (the only change he can make)
  const openIds = month.filter(x => x.status === 'open').map(x => x.id).join(',');
  useEffect(() => { if (openIds) openIds.split(',').forEach(id => act.complaintSeen(id)) }, [openIds]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DotBg />
      <ScreenBar title={t('Customer feedback')} back />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <DashCard style={{ padding: 16, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBubble icon={line.tone === 'dead' ? 'warn' : 'star'} size={42} tint={line.tone === 'dead' ? brand.red : c.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 15.5, color: c.fg }}>{t('No complaint bonus')}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: line.tone === 'dead' ? brand.red : c.fg2, marginTop: 2 }}>{line.text}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3, marginTop: 12 }}>{t('Bonus Manager mahine ke end mein deta hai')}</Text>
        </DashCard>

        <SectionTitle title={t('Is mahine')} style={{ marginTop: 20 }} />
        {month.length ? (
          <View style={{ gap: 12 }}>{month.map(x => <Item key={x.id} x={x} />)}</View>
        ) : (
          <DashCard style={{ padding: 22, alignItems: 'center', gap: 10 }}>
            <IconBubble icon="check" size={52} tint={c.ok} bg={alpha(c.ok, 0.14)} />
            <Text style={{ fontFamily: F.semi, fontSize: 16, color: c.fg, textAlign: 'center' }}>{t('Abhi koi complaint nahi')}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.fg3, textAlign: 'center' }}>{t('Badhiya kaam! Aise hi chalte raho.')}</Text>
          </DashCard>
        )}

        {older.length ? (
          <>
            <SectionTitle title={t('Pichhle mahine')} style={{ marginTop: 20 }} />
            <View style={{ gap: 12 }}>{older.map(x => <Item key={x.id} x={x} />)}</View>
          </>
        ) : null}
        <DemoNote>{t('Customer feedback Manager ke paas jaata hai. Woh dekh ke theek karte hain.')}</DemoNote>
        <View style={{ marginHorizontal: -16, marginTop: 'auto' }}><Footer /></View>
      </ScrollView>
    </View>
  );
}
