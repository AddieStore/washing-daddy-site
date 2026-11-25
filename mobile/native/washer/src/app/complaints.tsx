// Customer feedback: the complaints customers sent about this washer's washes, this month first.
// Read-only for the washer: opening the screen marks new ones as seen; the manager resolves them in the approvals page.
// Shows date, car plate, the customer's FIRST name only, what they wrote and where it stands. Never the customer's
// phone number or what the customer pays. Opens from the Rewards screen and the Profile tab.
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip, DemoNote, F, Group, Icon, SectionLabel, brand, useTheme } from '../ui';
import { Complaints, DAY, act, carBy, monthComplaints, useStore } from '../state/store';
import { type Complaint, type ComplaintKind, type ComplaintStatus } from '../lib/complaints';
import { dayShort } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { FadeUp } from '../screens/ProntoBits';
import { EmptyBlock } from '../screens/EmptyBlock';
import { BackTitle, cleanLine, useOutlook } from '../screens/RewardsCards';

const KIND: Record<ComplaintKind, string> = { quality: 'Safai', late: 'Der se', behaviour: 'Bartaav', damage: 'Nuksaan', other: 'Aur kuch' };
const STATUS: Record<ComplaintStatus, string> = { open: 'Naya', seen: 'Dekh liya', resolved: 'Theek ho gaya', invalid: 'Gini nahi gayi' };

function StatusChip({ status }: { status: ComplaintStatus }) {
  const tone = status === 'resolved' ? 'green' : status === 'invalid' ? 'grey' : status === 'open' ? 'violet' : 'amber';
  return <Chip tone={tone}>{t(STATUS[status])}</Chip>;
}

function Item({ x }: { x: Complaint }) {
  const { c } = useTheme();
  const plate = carBy(x.reg)?.plate || x.reg;
  const foot = x.status === 'resolved' ? t('Theek ho gaya') : x.status === 'invalid' ? t('Manager ne ise gina nahi') : t('Manager dekh rahe hain');
  return (
    <Group>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg }}>{plate}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.grey, marginTop: 2 }}>
            {dayShort(x.date, isHindi())}{x.customer_first ? ` · ${x.customer_first}` : ''} · {t(KIND[x.kind])}
          </Text>
        </View>
        <StatusChip status={x.status} />
      </View>
      {x.text ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.fg, paddingHorizontal: 16, paddingVertical: 12 }}>{x.text}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Icon name={x.status === 'resolved' ? 'check' : 'user'} size={14} color={x.status === 'resolved' ? c.ok : c.grey} />
        <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: x.status === 'resolved' ? c.ok : c.grey }}>{foot}</Text>
      </View>
    </Group>
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
  const router = useRouter();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.navigate('/') };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <BackTitle title={t('Customer feedback')} subtitle={t('Customer ki complaint aur unka haal')} onBack={goBack} />
        <View style={{ paddingHorizontal: 16 }}>
          <FadeUp index={0} style={{ marginTop: 8 }}>
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <Icon name={line.tone === 'dead' ? 'warn' : 'star'} size={22} color={line.tone === 'dead' ? brand.red : c.fg} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 21, color: c.fg }}>{t('No complaint bonus')}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: line.tone === 'dead' ? brand.red : c.grey, marginTop: 2 }}>{line.text}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.grey, paddingHorizontal: 16, paddingVertical: 10 }}>{t('Bonus Manager mahine ke end mein deta hai')}</Text>
            </Group>
          </FadeUp>

          <SectionLabel>{t('Is mahine')}</SectionLabel>
          {month.length ? (
            <View style={{ gap: 12 }}>{month.map((x, i) => <FadeUp key={x.id} index={i + 1}><Item x={x} /></FadeUp>)}</View>
          ) : (
            <EmptyBlock icon="check" title={t('Abhi koi complaint nahi')} text={t('Badhiya kaam! Aise hi chalte raho.')} />
          )}

          {older.length ? (
            <>
              <SectionLabel>{t('Pichhle mahine')}</SectionLabel>
              <View style={{ gap: 12 }}>{older.map(x => <Item key={x.id} x={x} />)}</View>
            </>
          ) : null}
          <DemoNote style={{ marginTop: 16 }}>{t('Customer feedback Manager ke paas jaata hai. Woh dekh ke theek karte hain.')}</DemoNote>
        </View>
      </ScrollView>
    </View>
  );
}
