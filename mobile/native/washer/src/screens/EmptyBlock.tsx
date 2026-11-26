// Calm empty state used by the tab screens: art spot, 15/600 title, grey line, optional action.
import React from 'react';
import { Text, View } from 'react-native';
import { F, Icon, useTheme, type IconName } from '../ui';
import { EmptyArt } from '../ui/art';

export function EmptyBlock({ icon = 'note', art, title, text, action }: { icon?: IconName; art?: 'jobs' | 'history'; title: string; text?: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 32 }}>
      {art ? <EmptyArt kind={art} width={180} /> : (
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={34} color={c.grey} />
        </View>
      )}
      <Text style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, color: c.fg, marginTop: 20, textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: c.grey, marginTop: 4, textAlign: 'center' }}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}
