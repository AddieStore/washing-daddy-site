// The guided wash card: stage by stage (wash, dry, [interior on Sundays], polish, check, photo) from the moment the timer starts.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { F, Icon, TaskIcon, brand, useTheme } from '../ui';
import { Button, Card } from '../ui';
import { guideAt } from '../lib/washGuide';
import { t } from '../lib/i18n';

const STAGE_ICON = { wash: 'pressure', dry: 'dry', interior: 'interior', polish: 'detailing' } as const;

export function WashGuide({ startedAt, onTakePhoto }: { startedAt: string; onTakePhoto: () => void }) {
  const { c } = useTheme();
  const [, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN(n => n + 1), 1000); return () => clearInterval(i) }, []);
  const g = guideAt(startedAt);
  if (!g) return null;
  const { idx, step, secsLeft, plan } = g;
  const photo = step.key === 'photo' || step.key === 'end';
  const fg = photo ? brand.ink : c.fg, fg2 = photo ? 'rgba(26,10,51,0.72)' : c.fg3;
  const mm = secsLeft == null ? '' : `${String(Math.floor(secsLeft / 60)).padStart(2, '0')}:${String(secsLeft % 60).padStart(2, '0')}`;
  return (
    <Card style={[{ marginTop: 18, padding: 16 }, photo ? { backgroundColor: brand.gold, borderColor: brand.gold } : null]}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${idx + 1} / ${plan.length}`}>
        {plan.map((s, i) => (
          <View key={s.key} style={{
            flex: 1, height: 8, borderRadius: 4,
            backgroundColor: photo ? (i < idx ? brand.ink : 'rgba(26,10,51,0.25)') : i < idx ? brand.mint : i === idx ? brand.violet : c.line,
            ...(i === idx && photo ? { backgroundColor: brand.ink } : null),
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
        <View style={{ width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: photo ? brand.ink : brand.violet }}>
          {photo ? <Icon name="cam" size={30} color={brand.gold} />
            : step.key === 'check' ? <Icon name="flag" size={28} color="#fff" />
            : <TaskIcon k={STAGE_ICON[step.key as keyof typeof STAGE_ICON] || 'pressure'} size={30} color="#fff" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.black, fontSize: 11, letterSpacing: 1.6, color: fg2 }}>{`${idx + 1} / ${plan.length}`}</Text>
          <Text accessibilityRole="header" style={{ fontFamily: F.black, fontSize: 24, lineHeight: 30, color: fg }}>{t(step.title)}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: fg2, marginTop: 10 }}>{t(step.sub)}</Text>
      {photo ? (
        <Button label={t('Photo lo')} icon="cam" variant="ink" onPress={onTakePhoto} style={{ marginTop: 14 }} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: c.fg3 }}>{t('agla kadam:')}</Text>
          <Text style={{ fontFamily: F.shout, fontSize: 26, letterSpacing: 1, color: c.fg }}>{mm}</Text>
        </View>
      )}
    </Card>
  );
}
