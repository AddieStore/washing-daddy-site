// Product art: the web app's art() SVG renders, one per kind, tinted by a two-colour gradient.
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, G, Text as SText } from 'react-native-svg';
import { F } from '../theme';
import { useUid } from './icons';

export type ArtKind = 'perfume' | 'cloth' | 'bottle' | 'spray' | 'mount' | 'inflator' | 'cover' | 'mats' | 'cam' | 'sparkle';
const INK = '#1A0A33', CREAM = '#FFF6E9', GOLD = '#FFBA08', VIO = '#5409DA', MINT = '#2EE6A6';

export function Art({ kind, c, size = 120 }: { kind: ArtKind | string; c: [string, string] | string[]; size?: number }) {
  const id = useUid(), g = `url(#${id})`, h = `url(#${id}h)`;
  const T = (p: { x: number; y: number; s: number; f: string; fill: string; ls?: number; children: string }) => (
    <SText x={p.x} y={p.y} textAnchor="middle" fontFamily={p.f} fontSize={p.s} letterSpacing={p.ls} fill={p.fill}>{p.children}</SText>
  );
  const body = (() => {
    switch (kind) {
      case 'perfume': return <>
        <Rect x={70} y={30} width={60} height={26} rx={6} fill={INK} /><Rect x={62} y={52} width={76} height={12} rx={4} fill={CREAM} />
        <Path d="M48 70h104a16 16 0 0 1 16 16v74a22 22 0 0 1-22 22H54a22 22 0 0 1-22-22V86a16 16 0 0 1 16-16z" fill={g} />
        <Rect x={50} y={102} width={100} height={44} rx={8} fill={INK} />
        <T x={100} y={122} s={15} f={F.hero} fill={GOLD}>DADDY</T><T x={100} y={138} s={8} f={F.b600} ls={2} fill={CREAM}>OUD · VETIVER</T>
        <Path d="M44 80h18v94H50a10 10 0 0 1-6-4z" fill={h} /></>;
      case 'cloth': return <>
        <Path d="M30 120c20-8 120-8 140 0v40c-20 8-120 8-140 0z" fill={VIO} /><Path d="M34 96c20-8 112-8 132 0v30c-20 8-112 8-132 0z" fill={GOLD} />
        <Path d="M38 72c20-8 104-8 124 0v30c-20 8-104 8-124 0z" fill={g} /><Path d="M38 72c20-8 104-8 124 0" stroke="#fff" strokeOpacity={0.4} strokeWidth={3} fill="none" />
        <G stroke="#fff" strokeOpacity={0.18} strokeWidth={2}>{Array.from({ length: 9 }, (_, i) => <Path key={i} d={`M${50 + i * 12} 70v32`} />)}</G></>;
      case 'bottle': return <>
        <Rect x={82} y={22} width={36} height={22} rx={5} fill={GOLD} />
        <Path d="M78 44h44v14c14 6 24 18 24 34v74a14 14 0 0 1-14 14H68a14 14 0 0 1-14-14V92c0-16 10-28 24-34z" fill={g} />
        <Rect x={62} y={104} width={76} height={52} rx={8} fill={CREAM} />
        <T x={100} y={128} s={18} f={F.shout} fill={INK}>TYRE</T><T x={100} y={146} s={14} f={F.shout} fill={VIO}>SHINE</T>
        <Path d="M60 92h16v80h-6a10 10 0 0 1-10-10z" fill={h} /></>;
      case 'spray': return <>
        <Path d="M84 18h40l14 10-6 8h-20v14H90V36l-6-6z" fill={INK} /><Path d="M130 22l26-6v14z" fill={INK} />
        <G fill={MINT} opacity={0.7}><Circle cx={166} cy={20} r={3} /><Circle cx={176} cy={14} r={2} /><Circle cx={174} cy={28} r={2.5} /><Circle cx={186} cy={22} r={2} /></G>
        <Path d="M86 50h36v10c12 6 18 16 18 30v78a12 12 0 0 1-12 12H80a12 12 0 0 1-12-12V90c0-14 6-24 18-30z" fill={g} />
        <Rect x={74} y={100} width={60} height={56} rx={8} fill={INK} />
        <T x={104} y={124} s={14} f={F.shout} fill={MINT}>CERAMIC</T><T x={104} y={142} s={8} f={F.b600} ls={1.5} fill={CREAM}>QUICK COAT</T>
        <Path d="M72 90h14v80h-4a10 10 0 0 1-10-10z" fill={h} /></>;
      case 'mount': return <>
        <Rect x={88} y={120} width={24} height={50} rx={6} fill={INK} /><Rect x={70} y={160} width={60} height={14} rx={5} fill={INK} />
        <Circle cx={100} cy={92} r={58} fill={g} stroke={INK} strokeWidth={6} />
        <Circle cx={100} cy={92} r={36} fill="none" stroke={VIO} strokeWidth={5} strokeDasharray="6 5" /><Circle cx={100} cy={92} r={10} fill={GOLD} />
        <Path d="M60 60a58 58 0 0 1 40-26" stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.7} /></>;
      case 'inflator': return <>
        <Rect x={44} y={54} width={112} height={120} rx={24} fill={g} /><Rect x={60} y={72} width={80} height={44} rx={8} fill={INK} />
        <T x={100} y={103} s={24} f={F.shout} fill={MINT}>35 PSI</T>
        <Circle cx={78} cy={142} r={10} fill={INK} /><Circle cx={122} cy={142} r={10} fill={INK} />
        <Path d="M156 80c26 0 30 30 10 40" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
        <Path d="M50 64h14v100h-2a12 12 0 0 1-12-12z" fill={h} /></>;
      case 'cover': return <>
        <Path d="M20 140c4-26 30-30 46-34l22-26c6-6 12-8 22-8h34c12 0 18 4 24 12l14 22c14 2 22 10 22 34z" fill={g} />
        <Path d="M90 84h50l12 22H76z" fill="#fff" opacity={0.25} />
        <Circle cx={56} cy={146} r={18} fill={INK} /><Circle cx={150} cy={146} r={18} fill={INK} />
        <Circle cx={56} cy={146} r={7} fill={GOLD} /><Circle cx={150} cy={146} r={7} fill={GOLD} /></>;
      case 'mats': return <>
        <Path d="M46 40h80l22 30v96a12 12 0 0 1-12 12H58a12 12 0 0 1-12-12z" fill={INK} transform="rotate(-8 100 110)" />
        <Path d="M60 34h80l22 30v96a12 12 0 0 1-12 12H72a12 12 0 0 1-12-12z" fill={g} />
        <G stroke={INK} strokeOpacity={0.35} strokeWidth={3}>{Array.from({ length: 6 }, (_, i) => <Path key={i} d={`M72 ${70 + i * 16}h76`} />)}</G></>;
      case 'cam': return <>
        <Rect x={38} y={66} width={124} height={80} rx={18} fill={g} />
        <Circle cx={100} cy={106} r={30} fill="#0a0418" /><Circle cx={100} cy={106} r={20} fill="#2E8BFF" /><Circle cx={100} cy={106} r={10} fill="#0a0418" />
        <Circle cx={93} cy={99} r={5} fill="#fff" opacity={0.8} /><Rect x={84} y={40} width={32} height={28} rx={6} fill={INK} /><Circle cx={146} cy={80} r={4} fill="#FF4D6D" /></>;
      default: return <>
        <Path d="M100 20l16 50 50 16-50 16-16 50-16-50-50-16 50-16z" fill={g} />
        <Path d="M158 130l7 20 20 7-20 7-7 20-7-20-20-7 20-7z" fill={CREAM} /><Path d="M44 130l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill={GOLD} /></>;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor={c[0]} /><Stop offset="1" stopColor={c[1] ?? c[0]} /></LinearGradient>
        <LinearGradient id={id + 'h'} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0" stopColor="#fff" stopOpacity={0} /><Stop offset="0.35" stopColor="#fff" stopOpacity={0.55} /><Stop offset="0.5" stopColor="#fff" stopOpacity={0} /></LinearGradient>
      </Defs>
      {body}
    </Svg>
  );
}
