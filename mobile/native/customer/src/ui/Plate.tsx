// An Indian HSRP number plate drawn in SVG: white plate, thick rounded black frame, two screws, a holographic
// chakra sticker, blue "IND", bold condensed characters and a tiny laser code. `reg` is shown without spaces.
// Masked digits ("•") are drawn as dots. Empty `reg` shows a greyed placeholder.
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Text as SText, Defs, LinearGradient, RadialGradient, Stop, Path, G } from 'react-native-svg';
import { F } from '../theme';

const W = 1000, H = 290;
export const PLATE_RATIO = W / H;
const X0 = 238, X1 = 962, CH_Y = 218;   // character area and baseline

export function plateText(reg: string): string {
  return String(reg || '').toUpperCase().replace(/[^A-Z0-9•*]/g, '').slice(0, 11);
}

export function Plate({ reg, width, style, dim }: { reg?: string; width?: number | string; style?: StyleProp<ViewStyle>; dim?: boolean }) {
  const txt = plateText(reg || ''), empty = txt.length === 0, chars = empty ? 'DL01AB1234' : txt;
  const n = chars.length, cell = Math.min(80, (X1 - X0) / n), fs = Math.min(176, cell * 2.25);
  const x0 = X0 + ((X1 - X0) - cell * n) / 2;
  const ink = '#12172B', ghost = '#B9BCC6';
  const label = empty ? 'Number plate preview' : 'Number plate ' + txt.replace(/[•*]/g, 'x');
  return (
    <View accessible accessibilityLabel={label} style={[{ width: width ?? '100%', aspectRatio: PLATE_RATIO }, dim ? { opacity: 0.75 } : null, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="pl-holo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F4B6D6" /><Stop offset="0.35" stopColor="#9FD4F2" />
            <Stop offset="0.65" stopColor="#B9E8B0" /><Stop offset="1" stopColor="#E9B8F0" />
          </LinearGradient>
          <RadialGradient id="pl-screw" cx="0.4" cy="0.35" r="0.7">
            <Stop offset="0" stopColor="#F3F3F3" /><Stop offset="1" stopColor="#8D9097" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} rx={46} fill="#16171B" />
        <Rect x={6} y={6} width={W - 12} height={H - 12} rx={42} fill="none" stroke="#2A2C33" strokeWidth={3} />
        <Rect x={34} y={30} width={W - 68} height={H - 80} rx={14} fill="#F5F3EC" />
        <Rect x={34} y={30} width={W - 68} height={H - 80} rx={14} fill="none" stroke="#D8D5CB" strokeWidth={3} />
        <Circle cx={118} cy={52} r={11} fill="url(#pl-screw)" stroke="#6C6F76" strokeWidth={1.5} />
        <Circle cx={W - 118} cy={52} r={11} fill="url(#pl-screw)" stroke="#6C6F76" strokeWidth={1.5} />
        <Circle cx={118} cy={52} r={3.5} fill="#55585F" /><Circle cx={W - 118} cy={52} r={3.5} fill="#55585F" />
        <G opacity={0.95}>
          <Rect x={72} y={82} width={52} height={52} rx={6} fill="url(#pl-holo)" />
          <Circle cx={98} cy={108} r={14} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2.5} />
          <Circle cx={98} cy={108} r={4} fill="#fff" fillOpacity={0.8} />
        </G>
        <SText x={64} y={206} fontFamily={F.b800} fontWeight="800" fontSize={64} fill="#2347B0">IND</SText>
        <SText x={66} y={246} fontFamily={F.body} fontSize={19} fill="#B9B7B0">TD0000316834</SText>
        {chars.split('').map((ch, i) => {
          const cx = x0 + cell * (i + 0.5);
          if (ch === '•' || ch === '*') return <Circle key={i} cx={cx} cy={CH_Y - 70} r={Math.min(22, cell * 0.28)} fill={empty ? ghost : ink} />;
          return (
            <G key={i}>
              <SText x={cx} y={CH_Y} textAnchor="middle" fontFamily={F.shout} fontSize={fs} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="round" opacity={empty ? 0 : 0.9}>{ch}</SText>
              <SText x={cx} y={CH_Y} textAnchor="middle" fontFamily={F.shout} fontSize={fs} fill={empty ? ghost : ink}>{ch}</SText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
