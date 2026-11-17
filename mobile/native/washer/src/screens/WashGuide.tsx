// The guided wash card: stage by stage (wash, dry, [interior on Sundays], polish, check, photo) from the moment the timer starts.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { F, Icon, Pressy, TaskIcon, useTheme } from '../ui';
import { DashCard } from '../ui/dash';
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
  const fg = photo ? '#fff' : c.fg, fg2 = photo ? 'rgba(255,255,255,0.8)' : c.fg3;
  const mm = secsLeft == null ? '' : `${String(Math.floor(secsLeft / 60)).padStart(2, '0')}:${String(secsLeft % 60).padStart(2, '0')}`;
  return (
    <DashCard style={[{ marginTop: 24, padding: 16 }, photo ? { backgroundColor: c.hero } : null]}>
      {/* more than 8 stages (Sunday, or the interior add-on): one compact segmented bar, so it never overflows the card */}
      <View style={{ flexDirection: 'row', gap: plan.length > 8 ? 2 : 6, overflow: 'hidden', borderRadius: 4 }} accessibilityLabel={`${idx + 1} / ${plan.length}`}>
        {plan.map((s, i) => (
          <View key={i} style={{
            flex: 1, minWidth: 0, height: 6, borderRadius: plan.length > 8 ? 1 : 3,
            backgroundColor: photo ? (i < idx ? '#fff' : i === idx ? '#FFD166' : 'rgba(255,255,255,0.25)') : i < idx ? c.ok : i === idx ? c.primary : c.tile2,
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: photo ? 'rgba(255,255,255,0.18)' : c.primary }}>
          {photo ? <Icon name="cam" size={26} color="#fff" />
            : step.key === 'check' ? <Icon name="flag" size={24} color="#fff" />
            : <TaskIcon k={STAGE_ICON[step.key as keyof typeof STAGE_ICON] || 'pressure'} size={26} color="#fff" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: fg2, fontVariant: ['tabular-nums'] }}>{`${idx + 1} / ${plan.length}`}</Text>
          <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 28, color: fg }}>{t(step.title)}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: fg2, marginTop: 12 }}>{t(step.sub)}</Text>
      {photo ? (
        <Pressy onPress={onTakePhoto} accessibilityLabel={t('Photo lo')} style={{ height: 52, borderRadius: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff' }}>
          <Icon name="cam" size={18} color={c.primary} />
          <Text style={{ fontFamily: F.semi, fontSize: 16, color: c.primary }}>{t('Photo lo')}</Text>
        </Pressy>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: c.fg3 }}>{t('agla kadam:')}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 24, lineHeight: 30, color: c.fg, fontVariant: ['tabular-nums'] }}>{mm}</Text>
        </View>
      )}
    </DashCard>
  );
}
