import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export type Car = { reg: string; type?: string; color?: string; img?: string | null };

const BODY: Record<string, string> = {
  suv: 'M28 128c0-15 8-23 26-27l40-5 32-34c8-8 18-12 32-12h140c16 0 26 6 34 16l22 30 36 6c16 3 24 12 24 24v12H28z',
  mpv: 'M24 128c0-15 8-23 26-27l36-4 28-38c8-9 18-13 32-13h168c16 0 26 6 32 16l18 34 30 5c16 3 24 12 24 24v12H24z',
  sedan: 'M22 126c0-12 8-19 26-21l62-7 40-32c10-8 22-10 36-10h86c16 0 28 6 38 16l26 26 56 6c14 2 22 10 22 22v12H22z',
  hatch: 'M40 126c0-14 8-21 24-24l40-6 34-38c6-6 14-8 24-8h128c14 0 22 6 28 16l22 32 40 6c14 2 20 10 20 22v12H40z',
};
const GLASS: Record<string, string> = {
  suv: 'M134 70c4-5 10-7 18-7h54v33h-86zM216 63h66c10 0 16 4 22 12l15 21H216z',
  mpv: 'M120 66c4-6 10-8 18-8h66v38h-96zM214 58h76c10 0 16 4 20 12l14 26H214z',
  sedan: 'M158 72c8-6 16-8 28-8h28v32h-80zM224 64h46c10 0 18 4 26 12l18 20H224z',
  hatch: 'M144 66c4-5 10-6 18-6h52v36h-84zM224 60h58c10 0 16 4 20 10l16 26H224z',
};

const IMGS: Record<string, number> = {
  scorpio: require('../../assets/img/scorpio.webp'),
  civic: require('../../assets/img/civic.webp'),
};

const LIGHT = ['#f2f2f0', '#e9e9ec', '#e8e3d8', '#cfc7b8'];

export function CarArt({ car, width, height }: { car: Car; width: number; height?: number }) {
  const h = height ?? Math.round((width * 170) / 440);
  if (car.img && IMGS[car.img]) {
    return <Image source={IMGS[car.img]} style={{ width, height: h }} resizeMode="contain" accessibilityElementsHidden />;
  }
  const t = car.type && BODY[car.type] ? car.type : 'suv';
  const color = car.color || '#8a8f98';
  const id = 'g' + String(car.reg || 'x').replace(/[^A-Za-z0-9]/g, '');
  const w1 = t === 'hatch' ? 118 : 108;
  const w2 = t === 'hatch' ? 334 : 344;
  const light = LIGHT.includes(color.toLowerCase());
  return (
    <Svg width={width} height={h} viewBox="0 0 440 170">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.85} />
          <Stop offset="0.45" stopColor={color} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
        </LinearGradient>
        <LinearGradient id={id + 'h'} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#fff" stopOpacity={light ? 0.5 : 0.28} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={222} cy={152} rx={200} ry={10} fill="#000" opacity={0.28} />
      <Path d={BODY[t]} fill={`url(#${id})`} stroke="rgba(0,0,0,.35)" strokeWidth={1.5} />
      <Path d={BODY[t]} fill={`url(#${id}h)`} opacity={0.7} />
      <Path d={GLASS[t]} fill="#141a26" opacity={0.88} />
      <Path d="M60 112h330" stroke="rgba(255,255,255,.25)" strokeWidth={2} />
      <Rect x={396} y={108} width={20} height={8} rx={3} fill="#ffe7a3" />
      <Rect x={28} y={108} width={14} height={8} rx={3} fill="#d22" />
      {[w1, w2].map((x) => (
        <React.Fragment key={x}>
          <Circle cx={x} cy={136} r={27} fill="#111" />
          <Circle cx={x} cy={136} r={15} fill="#9aa0a8" />
          <Circle cx={x} cy={136} r={5} fill="#333" />
        </React.Fragment>
      ))}
    </Svg>
  );
}
