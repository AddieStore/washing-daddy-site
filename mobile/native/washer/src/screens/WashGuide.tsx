// The guided wash card: stage by stage (wash, dry, [interior on Sundays], polish, check, photo) from the moment the timer starts.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, F, Group, Icon, TaskIcon, useTheme } from '../ui';
import { guideAt } from '../lib/washGuide';
import { t } from '../lib/i18n';

const STAGE_ICON = { wash: 'pressure', dry: 'dry', interior: 'interior', polish: 'detailing' } as const;

export function WashGuide({ startedAt, onTakePhoto, interiorFrom }: { startedAt: string; onTakePhoto: () => void; interiorFrom?: number | null }) {
  const { c } = useTheme();
  const [, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(i) }, []);
  const g = guideAt(startedAt, Date.now(), interiorFrom);
  if (!g) return null;
  const { idx, step, secsLeft, plan } = g;
  const photo = step.key === 'photo' || step.key === 'end';
  const mm = secsLeft == null ? '' : `${String(Math.floor(secsLeft / 60)).padStart(2, '0')}:${String(secsLeft % 60).padStart(2, '0')}`;
  return (
    <Group>
      <View style={{ padding: 16 }}>
        {/* more than 8 stages (Sunday, or the interior add-on): one compact segmented bar, so it never overflows the card */}
        <View style={{ flexDirection: 'row', gap: plan.length > 8 ? 2 : 4, overflow: 'hidden', borderRadius: 3 }} accessibilityLabel={`${idx + 1} / ${plan.length}`}>
          {plan.map((s, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0, height: 4, borderRadius: 2, backgroundColor: i < idx ? c.primary : i === idx ? c.primary : c.line, opacity: i < idx ? 0.45 : 1 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(84,9,218,0.08)' }}>
            {photo ? <Icon name="cam" size={22} color={c.primary} />
              : step.key === 'check' ? <Icon name="flag" size={22} color={c.primary} />
              : <TaskIcon k={STAGE_ICON[step.key as keyof typeof STAGE_ICON] || 'pressure'} size={22} color={c.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: c.grey, fontVariant: ['tabular-nums'] }}>{`${idx + 1} / ${plan.length}`}</Text>
            <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: c.fg }}>{t(step.title)}</Text>
          </View>
          {!photo ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, color: c.fg, fontVariant: ['tabular-nums'] }}>{mm}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: c.grey }}>{t('agla kadam:')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, marginTop: 10 }}>{t(step.sub)}</Text>
        {photo ? <View style={{ marginTop: 14 }}><Button variant="primary" size="md" icon="cam" label={t('Photo lo')} onPress={onTakePhoto} /></View> : null}
      </View>
    </Group>
  );
}
