// "Aaj ka kaam khatam": check-out card (attendance/{DATE}_{phone}: cars done / skipped / hours). Shown once the round has started.
import React from 'react';
import { View } from 'react-native';
import { Button, Chip, Group, Row, useTheme } from '../ui';
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
      <Group>
        <Row icon="check" label={t('Kaam khatam')} sub={t12(out)} right={<Chip tone="green">{t('Ho gaya')}</Chip>} />
      </Group>
    );
  }
  return <View><Button label={t('Aaj ka kaam khatam')} variant="violet" onPress={() => { void act.checkOut() }} /></View>;
}
