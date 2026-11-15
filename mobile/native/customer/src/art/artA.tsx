// Service illustrations A (first 10 CAR_SERVICES): drawn in code with react-native-svg, no raster assets.
// Soft 3D-style flat art: gradients, rounded shapes, a highlight and a soft ground shadow. 100x100 viewBox, scales to `size`.
import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Path, Circle, Rect, Ellipse } from 'react-native-svg';

const VIOLET = '#5409DA';
const GOLD = '#FFBA08';
type P = { size: number };
const u = (p: string, n: string) => `url(#${p}${n})`;

/** two-stop vertical gradient */
const Lg = ({ id, a, b, h }: { id: string; a: string; b: string; h?: boolean }) => (
  <LinearGradient id={id} x1="0" y1="0" x2={h ? '1' : '0'} y2={h ? '0' : '1'}><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient>
);
const Rg = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <RadialGradient id={id} cx="0.35" cy="0.3" r="0.8"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></RadialGradient>
);

/** shared frame: soft accent disc, ground shadow and the gradients every drawing reuses (violet, gold, dark, metal, foam, water) */
function Frame({ p, size, accent, children }: { p: string; size: number; accent: string; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <Lg id={`${p}vio`} a="#8A4DFF" b={VIOLET} />
        <Lg id={`${p}gold`} a="#FFD65C" b={GOLD} />
        <Lg id={`${p}dark`} a="#58546E" b="#262338" />
        <Lg id={`${p}metal`} a="#FFFFFF" b="#AEB0C2" />
        <Lg id={`${p}water`} a="#9BE0FF" b="#2F8FF0" />
        <Lg id={`${p}acc`} a={accent} b={accent} />
        <Rg id={`${p}foam`} a="#FFFFFF" b="#DCD2F7" />
      </Defs>
      <Circle cx={50} cy={50} r={45} fill={accent} opacity={0.13} />
      <Ellipse cx={50} cy={89} rx={36} ry={5.5} fill="#1B1240" opacity={0.13} />
      {children}
    </Svg>
  );
}

const spark = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
const Sparkle = ({ x, y, r, c = '#fff', o = 1 }: { x: number; y: number; r: number; c?: string; o?: number }) => <Path d={spark(x, y, r)} fill={c} opacity={o} />;
/** foam blob with a highlight */
const Foam = ({ p, x, y, r }: { p: string; x: number; y: number; r: number }) => (
  <G>
    <Circle cx={x} cy={y + r * 0.12} r={r} fill="#C9BCF0" opacity={0.55} />
    <Circle cx={x} cy={y} r={r} fill={u(p, 'foam')} stroke="#D6CBF5" strokeWidth={0.5} />
    <Circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.22} fill="#fff" />
  </G>
);
const Bubble = ({ x, y, r, c = '#8FB8FF' }: { x: number; y: number; r: number; c?: string }) => (
  <G><Circle cx={x} cy={y} r={r} fill="#fff" opacity={0.45} stroke={c} strokeWidth={0.9} /><Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill="#fff" /></G>
);
const Drop = ({ x, y, s = 1, c = '#4DA3FF' }: { x: number; y: number; s?: number; c?: string }) => (
  <G><Path d={`M${x} ${y - 4 * s} Q${x + 3.4 * s} ${y + 0.5 * s} ${x} ${y + 3 * s} Q${x - 3.4 * s} ${y + 0.5 * s} ${x} ${y - 4 * s} Z`} fill={c} /><Circle cx={x - 0.9 * s} cy={y + 0.3 * s} r={0.8 * s} fill="#fff" opacity={0.8} /></G>
);

/** side-on car, local box 80 x 36; place with a G transform */
function Car({ p, c1, c2, uid }: { p: string; c1: string; c2: string; uid: string }) {
  const id = p + uid;
  return (
    <G>
      <Defs>
        <Lg id={`${id}b`} a={c1} b={c2} />
        <Lg id={`${id}g`} a="#D9EEFF" b="#7FB4F2" />
      </Defs>
      <Path d="M2 27 Q2 19 10 18 L21 17 Q27 6 38 5 L55 5 Q65 6 70 15 L74 18 Q79 20 79 27 L79 29 Q79 31 76 31 L5 31 Q2 31 2 29 Z" fill={u(id, 'b')} />
      <Path d="M25 16 Q30 9 38 8.5 L45 8.5 L45 16 Z M48 8.5 L55 8.5 Q61 9.5 65 16 L48 16 Z" fill={u(id, 'g')} />
      <Path d="M27 15 Q31 10 36 9.6" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d="M8 19.5 Q22 17.5 40 17.5 Q60 17.5 72 19.5" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.4} />
      <Rect x={46} y={20} width={5} height={1.8} rx={0.9} fill="#fff" opacity={0.55} />
      <Rect x={73} y={21} width={5} height={3.4} rx={1.7} fill={u(p, 'gold')} />
      <Rect x={2.5} y={21} width={3.4} height={3} rx={1.5} fill="#FF5C6C" />
      <Path d="M3 28.5 L77 28.5" stroke="#000" strokeWidth={1} opacity={0.12} />
      {[20, 60].map(cx => (
        <G key={cx}>
          <Circle cx={cx} cy={30} r={9} fill="#1E1B2E" opacity={0.9} />
          <Circle cx={cx} cy={30} r={7.4} fill="#2B2840" />
          <Circle cx={cx} cy={30} r={4.4} fill={u(p, 'metal')} />
          <Circle cx={cx} cy={30} r={1.7} fill={u(p, 'gold')} />
          <Path d={`M${cx - 5.5} ${30 - 3} A6 6 0 0 1 ${cx - 1} ${30 - 6.2}`} stroke="#fff" strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.35} />
        </G>
      ))}
    </G>
  );
}

/* ---------- 1. Exterior pressure wash: car + water jet + droplets ---------- */
const Ext: React.FC<P> = ({ size }) => (
  <Frame p="ex" size={size} accent="#2F8FF0">
    <G transform="translate(22 50) scale(0.9)"><Car p="ex" uid="c" c1="#8A4DFF" c2={VIOLET} /></G>
    {/* jet */}
    <Path d="M23 27 Q46 24 70 42 L62 62 Q40 44 23 31 Z" fill={u('ex', 'water')} opacity={0.55} />
    <Path d="M23 28.5 Q45 28 66 46" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.85} />
    <Path d="M24 30 Q40 36 58 54" stroke="#fff" strokeWidth={1} strokeLinecap="round" fill="none" opacity={0.6} />
    {/* gun */}
    <Rect x={5} y={21} width={17} height={9} rx={4.5} fill={u('ex', 'vio')} />
    <Rect x={8} y={22.2} width={9} height={2} rx={1} fill="#fff" opacity={0.4} />
    <Rect x={20} y={24} width={6} height={4.6} rx={2.3} fill={u('ex', 'metal')} />
    <Rect x={9} y={28} width={6.5} height={13} rx={3.2} fill={u('ex', 'gold')} />
    <Path d="M12 41 Q11 54 3 60" stroke="#2F8FF0" strokeWidth={3} strokeLinecap="round" fill="none" />
    {/* splash */}
    <Drop x={70} y={46} s={1.2} /><Drop x={78} y={40} s={0.9} /><Drop x={64} y={36} s={0.8} c="#8FD0FF" />
    <Drop x={84} y={52} s={1} c="#8FD0FF" /><Drop x={58} y={72} s={0.8} /><Drop x={34} y={76} s={0.7} c="#8FD0FF" />
    <Sparkle x={86} y={28} r={5} c={GOLD} /><Sparkle x={48} y={50} r={3} c="#fff" />
  </Frame>
);

/* ---------- 2. Foam wash: car under snow foam ---------- */
const FoamWash: React.FC<P> = ({ size }) => (
  <Frame p="fo" size={size} accent="#8B5CF6">
    <G transform="translate(10 52) scale(1)"><Car p="fo" uid="c" c1="#8A4DFF" c2={VIOLET} /></G>
    {/* foam blankets */}
    <Path d="M32 58 Q33 49 46 49 L60 49 Q70 51 72 58 Z" fill={u('fo', 'foam')} />
    <Path d="M70 62 Q76 58 86 62 L88 66 Q78 68 70 66 Z" fill={u('fo', 'foam')} />
    <Path d="M12 66 Q14 61 24 60 L30 62 L28 68 Q18 70 12 68 Z" fill={u('fo', 'foam')} />
    {[[36, 50, 6], [45, 46, 7.5], [55, 46, 7], [64, 50, 6], [74, 60, 4.5], [82, 62, 4], [20, 62, 5], [28, 60, 4.5], [50, 40, 5], [40, 41, 3.6], [60, 41, 3.8], [47, 52, 4], [58, 52, 4]].map(([x, y, r], i) => <Foam key={i} p="fo" x={x} y={y} r={r} />)}
    {/* drips */}
    {[[38, 56, 6], [52, 55, 9], [66, 55, 5], [24, 66, 5]].map(([x, y, h], i) => <Rect key={i} x={x - 1.6} y={y} width={3.2} height={h} rx={1.6} fill="#fff" stroke="#D6CBF5" strokeWidth={0.4} />)}
    <Bubble x={20} y={30} r={5} c="#B79BFF" /><Bubble x={32} y={20} r={3} c="#B79BFF" /><Bubble x={78} y={26} r={6} c="#B79BFF" /><Bubble x={88} y={40} r={2.6} c="#B79BFF" /><Bubble x={66} y={18} r={2.6} c="#B79BFF" />
    <Sparkle x={52} y={26} r={5} c={GOLD} /><Sparkle x={12} y={44} r={3} c={GOLD} />
  </Frame>
);

/* ---------- 3. Interior cleaning: seat + steering wheel + cloth ---------- */
const Int: React.FC<P> = ({ size }) => (
  <Frame p="in" size={size} accent={GOLD}>
    <Defs><Lg id="inseat" a="#6C6884" b="#3A3752" /></Defs>
    {/* seat */}
    <Rect x={58} y={8} width={16} height={11} rx={5.5} fill={u('in', 'seat')} />
    <Rect x={50} y={15} width={32} height={46} rx={13} fill={u('in', 'seat')} />
    <Rect x={54} y={19} width={5} height={36} rx={2.5} fill="#fff" opacity={0.14} />
    <Path d="M57 24 Q66 22 76 24 M57 52 Q66 54 76 52" stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 2.4" strokeLinecap="round" fill="none" />
    <Rect x={36} y={56} width={52} height={17} rx={8.5} fill={u('in', 'seat')} />
    <Rect x={40} y={58.5} width={40} height={3} rx={1.5} fill="#fff" opacity={0.16} />
    <Rect x={44} y={73} width={36} height={5} rx={2.5} fill={u('in', 'dark')} />
    {/* steering wheel */}
    <Path d="M30 52 L44 66" stroke={u('in', 'dark')} strokeWidth={5} strokeLinecap="round" />
    <Ellipse cx={22} cy={44} rx={17} ry={15} fill="none" stroke={u('in', 'vio')} strokeWidth={6} />
    <Ellipse cx={22} cy={44} rx={17} ry={15} fill="none" stroke="#fff" strokeWidth={1} opacity={0.3} strokeDasharray="30 100" />
    <Path d="M6 44 L38 44 M22 44 L22 58" stroke={VIOLET} strokeWidth={3.6} strokeLinecap="round" />
    <Circle cx={22} cy={44} r={5.2} fill={u('in', 'gold')} />
    {/* cloth wiping */}
    <G transform="translate(62 34) rotate(-18)"><Rect x={-11} y={-8} width={22} height={16} rx={5} fill="#FFD65C" /><Rect x={-11} y={2} width={22} height={6} rx={3} fill={GOLD} /><Path d="M-7 -4 L5 -4" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} /></G>
    <Path d="M40 24 Q36 34 42 44" stroke={GOLD} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
    <Sparkle x={80} y={34} r={6} c="#fff" /><Sparkle x={42} y={14} r={4} c={GOLD} /><Sparkle x={90} y={20} r={3} c={GOLD} />
  </Frame>
);

/* ---------- 4. Vacuum: nozzle over seats ---------- */
const Vac: React.FC<P> = ({ size }) => (
  <Frame p="va" size={size} accent="#1CA7EC">
    <Defs><Lg id="vaseat" a="#7B7894" b="#47435F" /><Lg id="vacan" a="#4DB8F5" b="#1B86CC" /></Defs>
    {/* seat */}
    <Rect x={8} y={36} width={17} height={42} rx={8.5} fill={u('va', 'seat')} />
    <Rect x={10.5} y={40} width={3.6} height={30} rx={1.8} fill="#fff" opacity={0.15} />
    <Rect x={8} y={64} width={72} height={16} rx={8} fill={u('va', 'seat')} />
    <Rect x={26} y={66} width={50} height={3} rx={1.5} fill="#fff" opacity={0.15} />
    <Path d="M30 72 L76 72" stroke={GOLD} strokeWidth={1.1} strokeDasharray="3 2.4" strokeLinecap="round" />
    {/* canister */}
    <Rect x={70} y={9} width={22} height={26} rx={9} fill={u('va', 'can')} />
    <Rect x={73} y={12} width={4} height={14} rx={2} fill="#fff" opacity={0.35} />
    <Rect x={70} y={22} width={22} height={5} fill={u('va', 'gold')} />
    <Circle cx={76} cy={37} r={3.4} fill={u('va', 'dark')} /><Circle cx={87} cy={37} r={3.4} fill={u('va', 'dark')} />
    {/* hose + wand + nozzle */}
    <Path d="M72 24 C56 22 62 40 54 46" stroke={u('va', 'dark')} strokeWidth={5} strokeLinecap="round" fill="none" />
    <Path d="M72 24 C56 22 62 40 54 46" stroke="#fff" strokeWidth={1} strokeLinecap="round" fill="none" opacity={0.25} strokeDasharray="2 4" />
    <Path d="M54 46 L46 54" stroke={u('va', 'metal')} strokeWidth={5} strokeLinecap="round" />
    <Path d="M30 55 Q30 52 34 52 L62 52 Q66 52 66 55 L68 62 Q68 64 65 64 L31 64 Q28 64 28 62 Z" fill={u('va', 'vio')} />
    <Rect x={33} y={53.4} width={26} height={2} rx={1} fill="#fff" opacity={0.4} />
    <Rect x={30} y={61.5} width={36} height={3} rx={1.5} fill="#2A1060" opacity={0.6} />
    {/* suction */}
    {[[36, 76], [46, 82], [56, 76], [64, 82]].map(([x, y], i) => <Circle key={i} cx={x} cy={y - 10 - i} r={1.4 + (i % 2)} fill="#C9A978" />)}
    <Path d="M38 46 L42 42 L46 46 M50 40 L54 36 L58 40" stroke="#1CA7EC" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8} />
    <Path d="M30 46 L34 42 L38 46" stroke="#1CA7EC" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
    <Sparkle x={16} y={22} r={5} c={GOLD} /><Sparkle x={40} y={26} r={3} c="#fff" />
  </Frame>
);

/* ---------- 5. Engine bay: open bonnet ---------- */
const Engine: React.FC<P> = ({ size }) => (
  <Frame p="en" size={size} accent="#6B6F86">
    <Defs><Lg id="enbay" a="#34314A" b="#1D1B2C" /><Lg id="enblk" a="#C7C9D8" b="#7C7F96" /></Defs>
    {/* bonnet raised */}
    <Path d="M16 34 L25 13 Q27 9 31 9 L69 9 Q73 9 75 13 L84 34 Z" fill={u('en', 'vio')} />
    <Path d="M28 14 L70 14" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.45} />
    <Path d="M20 30 L80 30" stroke="#2A1060" strokeWidth={1} opacity={0.3} />
    <Path d="M50 34 L50 24" stroke={u('en', 'metal')} strokeWidth={2} strokeLinecap="round" />
    {/* bay */}
    <Rect x={12} y={33} width={76} height={42} rx={9} fill={u('en', 'bay')} />
    {/* engine block */}
    <Rect x={24} y={44} width={44} height={22} rx={5} fill={u('en', 'blk')} />
    <Rect x={24} y={44} width={44} height={5} rx={2.5} fill="#fff" opacity={0.4} />
    {[28, 38, 48, 58].map(x => <Rect key={x} x={x} y={37} width={7.5} height={11} rx={2.5} fill={u('en', 'gold')} />)}
    {[28, 38, 48, 58].map(x => <Rect key={x} x={x + 1.2} y={38} width={2} height={7} rx={1} fill="#fff" opacity={0.5} />)}
    <Path d="M24 58 Q16 58 16 66 L16 70" stroke="#2F8FF0" strokeWidth={3.2} strokeLinecap="round" fill="none" />
    <Path d="M68 52 Q76 52 76 44" stroke="#FF7A45" strokeWidth={3} strokeLinecap="round" fill="none" />
    {/* battery + fan */}
    <Rect x={16} y={45} width={9} height={9} rx={2.5} fill={u('en', 'vio')} /><Rect x={18} y={43.5} width={2.2} height={2} fill={GOLD} />
    <Circle cx={77} cy={60} r={9} fill="#14121F" />
    {[0, 60, 120].map(a => <Rect key={a} x={72} y={59} width={10} height={2.2} rx={1.1} fill="#9EA1B6" transform={`rotate(${a} 77 60)`} />)}
    <Circle cx={77} cy={60} r={2.4} fill={u('en', 'gold')} />
    {/* front bumper */}
    <Path d="M8 76 Q8 71 14 71 L86 71 Q92 71 92 76 L92 84 Q92 88 88 88 L12 88 Q8 88 8 84 Z" fill={u('en', 'vio')} />
    <Rect x={14} y={73} width={72} height={2.4} rx={1.2} fill="#fff" opacity={0.35} />
    <Rect x={38} y={78} width={24} height={6} rx={3} fill="#2A1060" opacity={0.55} />
    <Ellipse cx={20} cy={79} rx={6} ry={3.6} fill={u('en', 'gold')} /><Ellipse cx={80} cy={79} rx={6} ry={3.6} fill={u('en', 'gold')} />
    <Sparkle x={88} y={22} r={5} c={GOLD} /><Sparkle x={10} y={20} r={3} c="#fff" />
  </Frame>
);

/* ---------- 6. Tyre and rim ---------- */
const Tyre: React.FC<P> = ({ size }) => {
  const spoke = [0, 72, 144, 216, 288];
  return (
    <Frame p="ty" size={size} accent="#59597A">
      <Defs><Rg id="tyrim" a="#FFFFFF" b="#9A9CB2" /><Rg id="tytyre" a="#4A4660" b="#14121F" /></Defs>
      <Circle cx={44} cy={49} r={38} fill={u('ty', 'tyre')} />
      {Array.from({ length: 24 }).map((_, i) => <Rect key={i} x={43} y={11.5} width={2} height={4} rx={1} fill="#000" opacity={0.35} transform={`rotate(${i * 15} 44 49)`} />)}
      <Circle cx={44} cy={49} r={30} fill="none" stroke="#000" strokeWidth={1} opacity={0.3} />
      <Circle cx={44} cy={49} r={26} fill={u('ty', 'rim')} />
      <Circle cx={44} cy={49} r={21} fill="#34314A" />
      {spoke.map(a => <Path key={a} d="M-4.5 -7 L-6.5 -21 Q0 -24 6.5 -21 L4.5 -7 Z" fill={u('ty', 'metal')} transform={`translate(44 49) rotate(${a})`} />)}
      {spoke.map(a => <Path key={a} d="M-2 -10 L-2.6 -20" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} transform={`translate(44 49) rotate(${a})`} />)}
      <Circle cx={44} cy={49} r={7.4} fill={u('ty', 'gold')} />
      {spoke.map(a => <Circle key={a} cx={44} cy={44} r={1.2} fill="#8A5E00" transform={`rotate(${a + 36} 44 49)`} />)}
      <Path d="M18 34 A30 30 0 0 1 36 20" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.28} />
      {/* sponge */}
      <G transform="translate(76 76) rotate(-12)">
        <Rect x={-14} y={-8} width={28} height={16} rx={6} fill="#2F8FF0" /><Rect x={-14} y={-8} width={28} height={7} rx={6} fill="#6CB5FF" />
        {[[-7, 1], [0, 3], [7, 0], [3, -3]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={1.1} fill="#1B64B8" opacity={0.6} />)}
      </G>
      <Bubble x={90} y={60} r={3} c="#8FB8FF" /><Bubble x={84} y={52} r={1.8} c="#8FB8FF" />
      <Sparkle x={80} y={22} r={7} c={GOLD} /><Sparkle x={92} y={34} r={3.4} c="#fff" /><Sparkle x={14} y={80} r={3} c={GOLD} />
    </Frame>
  );
};

/* ---------- 7. Glass: windshield with sparkle ---------- */
const Glass: React.FC<P> = ({ size }) => (
  <Frame p="gl" size={size} accent="#4C9BFF">
    <Defs><Lg id="glsky" a="#E6F4FF" b="#6AA8F5" /></Defs>
    <Path d="M18 22 Q20 10 32 10 L68 10 Q80 10 82 22 L90 68 Q92 80 80 80 L20 80 Q8 80 10 68 Z" fill={u('gl', 'dark')} />
    <Path d="M24 25 Q25 18 33 18 L67 18 Q75 18 76 25 L82 66 Q82 70 78 70 L22 70 Q18 70 18 66 Z" fill={u('gl', 'sky')} />
    {/* sky details */}
    <Ellipse cx={36} cy={32} rx={9} ry={4.4} fill="#fff" opacity={0.9} /><Ellipse cx={42} cy={29} rx={6} ry={4} fill="#fff" opacity={0.9} />
    <Ellipse cx={62} cy={50} rx={8} ry={3.6} fill="#fff" opacity={0.7} />
    <Path d="M30 70 L50 18 L58 18 L38 70 Z" fill="#fff" opacity={0.28} /><Path d="M60 70 L72 38 L76 40 L68 70 Z" fill="#fff" opacity={0.2} />
    {/* wiper */}
    <Path d="M24 66 L62 56" stroke="#14121F" strokeWidth={3.4} strokeLinecap="round" />
    <Path d="M24 66 L40 62" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.3} />
    <Circle cx={22} cy={67} r={2.4} fill={u('gl', 'gold')} />
    {/* dash lip */}
    <Rect x={14} y={73} width={72} height={7} rx={3.5} fill="#14121F" opacity={0.5} />
    <Drop x={70} y={60} s={0.9} c="#7DB7FF" /><Drop x={76} y={54} s={0.7} c="#7DB7FF" />
    <Sparkle x={66} y={31} r={12} c="#fff" /><Sparkle x={66} y={31} r={7} c={GOLD} o={0.9} />
    <Sparkle x={86} y={14} r={5} c={GOLD} /><Sparkle x={12} y={34} r={4} c="#fff" /><Sparkle x={50} y={46} r={3.4} c="#fff" />
  </Frame>
);

/* ---------- 8. Dashboard polish ---------- */
const Dash: React.FC<P> = ({ size }) => (
  <Frame p="da" size={size} accent="#FF7A45">
    <Path d="M6 36 Q6 22 22 22 L78 22 Q94 22 94 36 L94 52 Q94 58 88 58 L12 58 Q6 58 6 52 Z" fill={u('da', 'dark')} />
    <Path d="M14 26 L84 26" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.28} />
    <Rect x={6} y={50} width={88} height={3.4} fill={u('da', 'gold')} />
    {/* gauges */}
    {[24, 40].map((cx, i) => (
      <G key={cx}>
        <Circle cx={cx} cy={38} r={8.4} fill="#14121F" stroke={i ? '#9EA1B6' : GOLD} strokeWidth={1.4} />
        <Path d={`M${cx} 38 L${cx + (i ? 4 : -4)} ${i ? 33 : 33}`} stroke="#FF5C6C" strokeWidth={1.4} strokeLinecap="round" />
        <Circle cx={cx} cy={38} r={1.4} fill="#fff" />
      </G>
    ))}
    {/* screen + vents */}
    <Rect x={52} y={30} width={18} height={13} rx={3} fill="#19324F" /><Rect x={54} y={32} width={14} height={9} rx={2} fill="#4DB8F5" opacity={0.8} /><Path d="M55 40 L60 35 L63 38 L67 33" stroke="#fff" strokeWidth={1} fill="none" strokeLinecap="round" />
    <Rect x={74} y={30} width={15} height={9} rx={3} fill="#14121F" />
    {[32.5, 35, 37.5].map(y => <Path key={y} d={`M76 ${y} L87 ${y}`} stroke="#8A8DA6" strokeWidth={1} strokeLinecap="round" />)}
    {/* steering wheel */}
    <Path d="M32 64 L40 78" stroke={u('da', 'dark')} strokeWidth={4} strokeLinecap="round" />
    <Ellipse cx={30} cy={66} rx={20} ry={11} fill="none" stroke="#14121F" strokeWidth={6} />
    <Ellipse cx={30} cy={66} rx={20} ry={11} fill="none" stroke="#5C5876" strokeWidth={1.6} opacity={0.8} />
    <Circle cx={30} cy={66} r={4.4} fill={u('da', 'vio')} />
    {/* polish cloth */}
    <G transform="translate(72 72) rotate(-14)"><Rect x={-17} y={-10} width={34} height={20} rx={7} fill="#FF9B6B" /><Rect x={-17} y={1} width={34} height={9} rx={5} fill="#FF7A45" /><Path d="M-11 -5 L7 -5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.6} /></G>
    <Path d="M52 20 Q70 14 90 20" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
    <Sparkle x={58} y={16} r={6} c="#fff" /><Sparkle x={86} y={14} r={4.4} c={GOLD} /><Sparkle x={12} y={18} r={3.4} c={GOLD} />
  </Frame>
);

/* ---------- 9. Seat shampoo: seat with foam bubbles ---------- */
const Seat: React.FC<P> = ({ size }) => (
  <Frame p="se" size={size} accent="#F0506E">
    <Defs><Lg id="sefab" a="#9A97B4" b="#5E5B7A" /></Defs>
    <Rect x={36} y={6} width={28} height={15} rx={7.5} fill={u('se', 'fab')} />
    <Rect x={26} y={16} width={48} height={46} rx={15} fill={u('se', 'fab')} />
    <Rect x={20} y={56} width={60} height={20} rx={10} fill={u('se', 'fab')} />
    <Rect x={30} y={20} width={5} height={34} rx={2.5} fill="#fff" opacity={0.16} />
    <Path d="M34 24 Q50 21 66 24 M34 52 Q50 55 66 52" stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 2.4" strokeLinecap="round" fill="none" />
    <Rect x={30} y={76} width={40} height={5} rx={2.5} fill={u('se', 'dark')} />
    {/* foam */}
    {[[40, 36, 7], [50, 30, 8.5], [60, 38, 6.5], [46, 46, 6], [57, 49, 5], [34, 62, 6], [44, 64, 7.5], [56, 63, 6.5], [68, 64, 5], [34, 48, 4]].map(([x, y, r], i) => <Foam key={i} p="se" x={x} y={y} r={r} />)}
    {/* brush */}
    <G transform="translate(80 54) rotate(-28)"><Rect x={-5} y={-22} width={10} height={30} rx={5} fill={u('se', 'gold')} /><Rect x={-9} y={6} width={18} height={9} rx={3.5} fill="#F0506E" />{[-6, -3, 0, 3, 6].map(x => <Rect key={x} x={x - 0.7} y={13} width={1.4} height={5} rx={0.7} fill="#FFD0D8" />)}</G>
    <Bubble x={14} y={28} r={5} c="#FF8FA3" /><Bubble x={20} y={14} r={3} c="#FF8FA3" /><Bubble x={84} y={26} r={4} c="#FF8FA3" /><Bubble x={90} y={38} r={2.4} c="#FF8FA3" /><Bubble x={12} y={46} r={2.4} c="#FF8FA3" />
    <Sparkle x={74} y={12} r={5} c={GOLD} /><Sparkle x={10} y={66} r={3.4} c={GOLD} />
  </Frame>
);

/* ---------- 10. Odour removal: air waves and leaf ---------- */
const Odour: React.FC<P> = ({ size }) => (
  <Frame p="od" size={size} accent="#19B26B">
    <Defs><Lg id="odleaf" a="#4BDB94" b="#0E9E58" /><Lg id="odleaf2" a="#8CF0B8" b="#25B96F" /></Defs>
    {/* vent */}
    <Rect x={6} y={12} width={40} height={32} rx={9} fill={u('od', 'dark')} />
    <Rect x={9} y={15} width={34} height={26} rx={6} fill="#14121F" />
    {[20, 26, 32].map(y => <Rect key={y} x={12} y={y} width={28} height={3.6} rx={1.8} fill="#8A8DA6" />)}
    <Rect x={12} y={20} width={28} height={1.2} rx={0.6} fill="#fff" opacity={0.5} />
    <Circle cx={46} cy={28} r={4.4} fill={u('od', 'gold')} stroke="#fff" strokeWidth={0.8} />
    {/* air waves */}
    {[18, 28, 38].map((y, i) => (
      <Path key={y} d={`M52 ${y} q6 -6 12 0 t12 0 t12 0`} stroke={i === 1 ? '#19B26B' : '#6FE0A6'} strokeWidth={3.2 - i * 0.4} strokeLinecap="round" fill="none" opacity={1 - i * 0.18} />
    ))}
    <Path d="M52 28 q6 -6 12 0" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.6} />
    {/* leaf */}
    <Path d="M20 84 C16 60 38 48 76 50 C80 76 54 92 20 84 Z" fill={u('od', 'leaf')} />
    <Path d="M20 84 C16 60 38 48 76 50 C54 56 38 66 20 84 Z" fill={u('od', 'leaf2')} opacity={0.55} />
    <Path d="M20 84 Q46 66 72 52" stroke="#E5FFF0" strokeWidth={2} strokeLinecap="round" fill="none" />
    <Path d="M38 72 L40 62 M50 66 L53 58 M32 78 L26 72 M46 74 L50 80 M58 64 L64 70" stroke="#E5FFF0" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.8} />
    <Path d="M20 84 Q16 88 12 88" stroke="#0E9E58" strokeWidth={2.4} strokeLinecap="round" fill="none" />
    {/* small leaf + sparkles */}
    <Path d="M84 74 C80 62 90 56 96 58 C98 68 92 76 84 74 Z" fill={u('od', 'leaf2')} /><Path d="M84 74 Q90 66 95 59" stroke="#E5FFF0" strokeWidth={1} fill="none" strokeLinecap="round" />
    <Sparkle x={86} y={42} r={5} c={GOLD} /><Sparkle x={12} y={62} r={3.4} c={GOLD} /><Sparkle x={62} y={86} r={3} c="#fff" />
    <Circle cx={90} cy={22} r={2} fill="#6FE0A6" /><Circle cx={84} cy={12} r={1.4} fill="#6FE0A6" />
  </Frame>
);

/** key = CAR_SERVICES id */
export const ART: Record<string, React.FC<{ size: number }>> = {
  ext: Ext, foam: FoamWash, int: Int, vac: Vac, engine: Engine, tyre: Tyre, glass: Glass, dash: Dash, seat: Seat, odour: Odour,
};
