// Customer feedback: the complaints customers sent about this washer's washes, this month first.
// Read-only for the washer: opening the screen marks new ones as seen; the manager resolves them in the approvals page.
// Shows date, car plate, the customer's FIRST name only, what they wrote and where it stands. Never the customer's
// phone number or what the customer pays. Opens from the Rewards screen and the Profile tab.
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Footer, DemoNote, F, Icon, brand, useTheme } from '../ui';
import { Complaints, DAY, act, carBy, monthComplaints, useStore } from '../state/store';
import { type Complaint, type ComplaintKind, type ComplaintStatus } from '../lib/complaints';
import { dayShort } from '../lib/time';
import { isHindi, t } from '../lib/i18n';
import { Chip8, FadeUp, IconTile, PEmpty, PSection, VBack, VHeader, WCard, tint } from '../screens/ProntoBits';
import { cleanLine, useOutlook } from '../screens/RewardsCards';

const KIND: Record<ComplaintKind, string> = { quality: 'Safai', late: 'Der se', behaviour: 'Bartaav', damage: 'Nuksaan', other: 'Aur kuch' };
const STATUS: Record<ComplaintStatus, string> = { open: 'Naya', seen: 'Dekh liya', resolved: 'Theek ho gaya', invalid: 'Gini nahi gayi' };

function StatusChip({ status }: { status: ComplaintStatus }) {
  const { c } = useTheme();
  const quiet = status === 'open' || status === 'seen';
  const col = status === 'resolved' ? c.ok : status === 'invalid' ? c.fg3 : c.primary;
  return <Chip8 label={t(STATUS[status])} color={quiet ? c.softInk : col} bg={quiet ? c.soft : tint(col, 0.12)} />;
}

function Item({ x }: { x: Complaint }) {
  const { c } = useTheme();
  const plate = carBy(x.reg)?.plate || x.reg;
  const foot = x.status === 'resolved' ? t('Theek ho gaya') : x.status === 'invalid' ? t('Manager ne ise gina nahi') : t('Manager dekh rahe hain');
  return (
    <WCard style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg }}>{plate}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: c.fg3, marginTop: 2 }}>
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
    </WCard>
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <VHeader pad={56}>
          <VBack title={t('Customer feedback')} onBack={goBack} />
        </VHeader>
        <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
          <FadeUp index={0}>
            <WCard style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconTile icon={line.tone === 'dead' ? 'warn' : 'star'} tone={line.tone === 'dead' ? brand.red : undefined} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg }}>{t('No complaint bonus')}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: line.tone === 'dead' ? brand.red : c.fg3, marginTop: 2 }}>{line.text}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: c.fg3, marginTop: 12 }}>{t('Bonus Manager mahine ke end mein deta hai')}</Text>
            </WCard>
          </FadeUp>

          <PSection title={t('Is mahine')} />
          {month.length ? (
            <View style={{ gap: 12 }}>{month.map((x, i) => <FadeUp key={x.id} index={i + 1}><Item x={x} /></FadeUp>)}</View>
          ) : (
            <PEmpty icon="check" title={t('Abhi koi complaint nahi')} text={t('Badhiya kaam! Aise hi chalte raho.')} />
          )}

          {older.length ? (
            <>
              <PSection title={t('Pichhle mahine')} />
              <View style={{ gap: 12 }}>{older.map(x => <Item key={x.id} x={x} />)}</View>
            </>
          ) : null}
          <DemoNote>{t('Customer feedback Manager ke paas jaata hai. Woh dekh ke theek karte hain.')}</DemoNote>
        </View>
        <View style={{ marginTop: 'auto' }}><Footer /></View>
      </ScrollView>
    </View>
  );
}
