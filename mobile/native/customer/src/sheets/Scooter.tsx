// The WD scooter and the home pin, ported from the web app's marker SVGs (used by both TrackMap files).
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SText } from 'react-native-svg';

export function Scooter({ flip, scale = 1 }: { flip?: boolean; scale?: number }) {
  return (
    <Svg width={72 * scale} height={52 * scale} viewBox="0 0 72 52" style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <Ellipse cx={36} cy={50} rx={22} ry={3.5} fill="rgba(84,9,218,.35)" />
      <Circle cx={12} cy={36} r={9} fill="none" stroke="#22094F" strokeWidth={4} /><Circle cx={12} cy={36} r={4} fill="#22094F" /><Circle cx={12} cy={36} r={1.5} fill="#FFBA08" />
      <Circle cx={58} cy={36} r={9} fill="none" stroke="#22094F" strokeWidth={4} /><Circle cx={58} cy={36} r={4} fill="#22094F" /><Circle cx={58} cy={36} r={1.5} fill="#FFBA08" />
      <Path d="M12 36 Q16 20 30 18 L48 18 Q58 20 58 36" fill="none" stroke="#5409DA" strokeWidth={4.5} strokeLinecap="round" />
      <Path d="M20 28 Q28 16 42 20 L52 28 Q44 38 22 36 Z" fill="#5409DA" />
      <Rect x={16} y={33} width={30} height={5} rx={2.5} fill="#3A06A0" />
      <Rect x={36} y={10} width={18} height={14} rx={7} fill="#2E8BFF" stroke="#1E6ECF" strokeWidth={1} />
      <Rect x={42} y={7} width={6} height={5} rx={3} fill="#2E8BFF" />
      <Circle cx={45} cy={17} r={4} fill="none" stroke="#14C08A" strokeWidth={2} /><Circle cx={45} cy={17} r={2} fill="none" stroke="#14C08A" strokeWidth={1.5} />
      <Rect x={24} y={17} width={15} height={6} rx={3} fill="#3A06A0" />
      <Rect x={26} y={22} width={13} height={9} rx={3} fill="#5409DA" />
      <Circle cx={32} cy={11} r={8.5} fill="#FFBA08" />
      <Path d="M23.5 11 Q23.5 4 32 4 Q40.5 4 40.5 11" fill="#FFBA08" />
      <Path d="M24.5 12 Q32 10 39.5 12" fill="none" stroke="#22094F" strokeWidth={2} strokeLinecap="round" />
      <Path d="M25.5 11 Q32 9.5 38.5 11 Q32 15.5 25.5 11Z" fill="rgba(46,139,255,.45)" />
      <SText x={32} y={30} textAnchor="middle" fontSize={5.5} fill="#FFBA08" fontWeight="700">WD</SText>
    </Svg>
  );
}

export function HomePin({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={44 * scale} height={52 * scale} viewBox="0 0 44 52">
      <G>
        <Path d="M22 2 C11.5 2 3 10.5 3 21 C3 34 22 50 22 50 C22 50 41 34 41 21 C41 10.5 32.5 2 22 2Z" fill="#FFBA08" stroke="#5409DA" strokeWidth={1.5} />
        <Circle cx={22} cy={21} r={10} fill="#fff" opacity={0.25} />
        <Path d="M15 22 L22 15 L29 22 V29 H24.5 V24 H19.5 V29 H15 Z" fill="#1A0A33" />
      </G>
    </Svg>
  );
}
