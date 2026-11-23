// "Aaj ka kaam khatam": check-out card (attendance/{DATE}_{phone}: cars done / skipped / hours). Shown once the round has started.
import React from 'react';
import { Text, View } from 'react-native';
import { Button, DashCard, F, SuccessTick, useTheme } from '../ui';
import { S, act, useStore } from '../state/store';
import { t12 } from '../lib/time';
import { t } from '../lib/i18n';

export function CheckOutCard() {
  useStore();
  const { c } = useTheme();
  if (!S.day?.started) return null;
  const out = S.day.checkout_at;
  if (out) {
    return (
      <DashCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <SuccessTick size={36} />
        <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 24, color: c.fg, flex: 1 }}>{t('Kaam khatam')} · {t12(out)}</Text>
      </DashCard>
    );
  }
  return <View><Button label={t('Aaj ka kaam khatam')} onPress={() => { void act.checkOut() }} /></View>;
}
