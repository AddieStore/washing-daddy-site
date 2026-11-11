// Monthly rewards: the shared status wording, the card for the Paisa tab and the compact one for the Round tab.
// Numbers come from lib/rewards.ts (+ lib/rewardsView.ts) over the attendance log; nothing moves money in the app.
import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { DashCard, F, Icon, IconBubble, ListCard, Ring, brand, useTheme } from '../ui';
import { DAY, attendLog } from '../state/store';
import { EARLY_BONUS, EARLY_DAYS, MONTH_BONUS } from '../lib/rewards';
import { outlook } from '../lib/rewardsView';
import { rupee } from '../lib/time';
import { t } from '../lib/i18n';

export const openRewards = () => router.push('/rewards' as any);
export const useOutlook = () => outlook(attendLog(), DAY);
export type Outlook = ReturnType<typeof outlook>;

export type Line = { text: string; tone: 'ok' | 'live' | 'dead' };
/** One plain sentence on where the early-bird bonus stands. */
export function earlyLine(o: Outlook): Line {
  if (o.r.early.earned) return { text: t('Early bird bonus pakka! Mahine ke end mein milega'), tone: 'ok' };
  if (o.lateToday) return { text: t('Aaj photo 6 baje ke baad thi, streak toot gayi'), tone: 'dead' };
  if (!o.earlyLive) return { text: t('Is mahine bonus nahi, streak jaari rakho'), tone: 'dead' };
  return { text: `${o.need} ${t('din aur baaki')}`, tone: 'live' };
}
/** The same for the full-month bonus. */
export function monthLine(o: Outlook): Line {
  const m = o.r.month;
  if (m.earned) return { text: t('Poora mahina aaye! Bonus pakka'), tone: 'ok' };
  if (!o.monthLive) return { text: t('Din chhoot gaya, is mahine bonus nahi'), tone: 'dead' };
  return { text: `${m.total - m.came} ${t('din aur aana hai')}`, tone: 'live' };
}

export function useToneColors() {
  const { c } = useTheme();
  return {
    ink: { ok: c.ok, live: c.softInk, dead: brand.red },
    ring: { ok: c.ok, live: c.primary, dead: brand.red },
  };
}

function MiniRing({ fraction, value, label, tone, title, line }: { fraction: number; value: string | number; label: string; tone: Line['tone']; title: string; line: Line }) {
  const { c } = useTheme();
  const col = useToneColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <Ring size={76} stroke={9} fraction={fraction} value={value} label={label} color={col.ring[tone]} track={c.soft} ink={c.fg} disc="transparent" />
      <Text style={{ fontFamily: F.semi, fontSize: 14, color: c.fg, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: line.tone === 'dead' ? brand.red : c.fg3, textAlign: 'center' }}>{line.text}</Text>
    </View>
  );
}

/** Paisa tab: both bonuses side by side with what is still possible. Opens the rewards screen. */
export function RewardsCard() {
  const { c } = useTheme();
  const o = useOutlook(), m = o.r.month;
  return (
    <DashCard onPress={openRewards} accessibilityLabel={t('Attendance aur bonus')} style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBubble icon="gift" size={42} tint={brand.orange} bg="rgba(255,106,26,0.14)" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 15.5, color: c.fg }}>{t('Attendance aur bonus')}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 12.5, color: c.fg3, marginTop: 2 }}>
            {t('Dono saath')} {rupee(EARLY_BONUS + MONTH_BONUS)} · {t('Abhi mumkin')} {rupee(o.possible)}
          </Text>
        </View>
        <Icon name="arrow" size={18} color={c.fg3} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <MiniRing fraction={o.streak / EARLY_DAYS} value={o.streak} label={`/${EARLY_DAYS}`} tone={earlyLine(o).tone} title={t('Early bird')} line={earlyLine(o)} />
        <MiniRing fraction={m.total ? m.came / m.total : 0} value={m.came} label={`/${m.total}`} tone={monthLine(o).tone} title={t('Poora mahina')} line={monthLine(o)} />
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 12, color: c.fg3, marginTop: 14, textAlign: 'center' }}>{t('Bonus Manager mahine ke end mein deta hai')}</Text>
    </DashCard>
  );
}

/** Round tab: one compact row. */
export function RewardsMini() {
  const o = useOutlook(), m = o.r.month;
  return (
    <ListCard
      icon="gift"
      iconTone={brand.orange}
      title={t('Bonus')}
      detail={`${t('Early bird')} ${o.streak}/${EARLY_DAYS} · ${t('Poora mahina')} ${m.came}/${m.total}`}
      action="chevron"
      onPress={openRewards}
    />
  );
}
