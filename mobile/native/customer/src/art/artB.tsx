// Service illustrations B (ceramic .. leather): soft 3D-style flat vector art, drawn in code with react-native-svg.
// 100x100 viewBox, scales to `size`. No stock photos, no raster images.
import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Path, Rect, Circle, Ellipse, ClipPath } from 'react-native-svg';

const V = '#5409DA', V2 = '#9B6BFF', GOLD = '#FFBA08', GOLD2 = '#FF8A00', DARK = '#1A0A33', SKIN = '#F2B58F';

/** four-point sparkle path */
const sp = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

/** vertical (or diagonal) linear gradient */
const Lg = ({ id, a, b, c, x2 = '0', y2 = '1' }: { id: string; a: string; b: string; c?: string; x2?: string; y2?: string }) => (
  <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
    <Stop offset="0" stopColor={a} />
    <Stop offset={c ? '0.55' : '1'} stopColor={b} />
    <Stop offset="1" stopColor={c || b} />
  </LinearGradient>
);
const Rg = ({ id, a, b, cx = '0.38', cy = '0.32', r = '0.75' }: { id: string; a: string; b: string; cx?: string; cy?: string; r?: string }) => (
  <RadialGradient id={id} cx={cx} cy={cy} r={r}>
    <Stop offset="0" stopColor={a} />
    <Stop offset="1" stopColor={b} />
  </RadialGradient>
);

const Shadow = ({ cx = 50, cy = 88, rx = 34, ry = 5, o = 0.16 }: { cx?: number; cy?: number; rx?: number; ry?: number; o?: number }) => (
  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={DARK} opacity={o} />
);
const Spark = ({ x, y, r, c = '#fff', o = 1 }: { x: number; y: number; r: number; c?: string; o?: number }) => (
  <Path d={sp(x, y, r)} fill={c} opacity={o} />
);

/** side-view car in local 0..80 x 4..42 space. Needs gradients `${p}b` (body) and `${p}g` (glass) defined by caller. */
const Car = ({ p }: { p: string }) => (
  <G>
    <Ellipse cx={40} cy={42} rx={36} ry={3} fill={DARK} opacity={0.15} />
    <Path d="M4 28C4 22 8 20 14 19L24 10C26 8 28 7 31 7H50C53 7 55 8 57 10L64 19C71 20 76 22 76 28V31C76 33 75 34 73 34H7C5 34 4 33 4 31Z" fill={`url(#${p}b)`} />
    <Path d="M23 18L29 10.8Q30 9.6 32 9.6H38V18Z" fill={`url(#${p}g)`} />
    <Path d="M42 18V9.6H50Q52 9.6 53.4 10.8L59.5 18Z" fill={`url(#${p}g)`} />
    <Path d="M25 17L30 11.5" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    <Path d="M9 25Q40 20 71 24" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.45} />
    <Rect x={39} y={21} width={5} height={1.6} rx={0.8} fill="#fff" opacity={0.5} />
    <Path d="M69 23H75Q76 25 75 27H69Z" fill={GOLD} />
    <Path d="M4 24H8V28H4Z" fill="#FF4D5E" />
    <Circle cx={20} cy={34} r={9} fill={DARK} opacity={0.85} />
    <Circle cx={60} cy={34} r={9} fill={DARK} opacity={0.85} />
    <Circle cx={20} cy={34} r={7} fill="#2A2140" />
    <Circle cx={60} cy={34} r={7} fill="#2A2140" />
    <Circle cx={20} cy={34} r={4.2} fill="#E4E8F4" />
    <Circle cx={60} cy={34} r={4.2} fill="#E4E8F4" />
    <Circle cx={20} cy={34} r={1.6} fill={V} />
    <Circle cx={60} cy={34} r={1.6} fill={V} />
  </G>
);

type P = { size: number };
const Frame: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">{children}</Svg>
);

/* ---------------- ceramic: glossy car + shield sparkle ---------------- */
const Ceramic: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="ceb" a="#B58CFF" b="#5409DA" c="#32068F" />
      <Lg id="ceg" a="#DDF1FF" b="#6FA8E8" />
      <Lg id="ces" a="#FFE27A" b="#FFBA08" c="#FF8A00" x2="0.4" y2="1" />
      <RadialGradient id="ceh" cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#FFF3B0" stopOpacity={0.9} />
        <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Shadow cy={79} rx={36} />
    <G transform="translate(10 42)"><Car p="ce" /></G>
    <Circle cx={50} cy={27} r={26} fill="url(#ceh)" />
    <Path d="M50 7L69 13V27C69 37 61 43 50 48C39 43 31 37 31 27V13Z" fill={DARK} opacity={0.18} transform="translate(0 2)" />
    <Path d="M50 6L69 12V26C69 36 61 42 50 47C39 42 31 36 31 26V12Z" fill="url(#ces)" />
    <Path d="M50 11L64 16V26C64 33 58 38 50 42C42 38 36 33 36 26V16Z" fill="#fff" opacity={0.22} />
    <Path d="M50 6L69 12V26C69 36 61 42 50 47Z" fill={GOLD2} opacity={0.22} />
    <Path d="M38 17L47 14" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
    <Path d="M41 27L48 34L60 21" stroke="#fff" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Spark x={78} y={16} r={7} c={GOLD} />
    <Spark x={20} y={30} r={5} c="#fff" />
    <Spark x={86} y={44} r={3.5} c="#fff" />
    <Spark x={14} y={52} r={3} c={GOLD} />
  </Frame>
);

/* ---------------- underbody: chassis from below + jets ---------------- */
const Under: React.FC<P> = ({ size }) => {
  const jets = [28, 50, 72];
  return (
    <Frame size={size}>
      <Defs>
        <Lg id="unc" a="#6B6290" b="#3A3158" c="#231A3D" />
        <Lg id="unw" a="#5A5470" b="#1F1736" />
        <Lg id="uns" a="#7FD0FF" b="#2E8BFF" />
        <LinearGradient id="unj" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#4DB2FF" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#BFE6FF" stopOpacity={0.15} />
        </LinearGradient>
        <Lg id="unf" a="#D9D5EA" b="#A9A3C4" />
      </Defs>
      {[24, 66].map((x) => (
        <G key={x}>
          <Rect x={x} y={5} width={12} height={13} rx={4} fill="url(#unw)" />
          <Rect x={x} y={54} width={12} height={13} rx={4} fill="url(#unw)" />
        </G>
      ))}
      <Path d="M8 36C8 23 18 15 32 15H68C83 15 92 24 92 36C92 48 83 57 68 57H32C18 57 8 49 8 36Z" fill="url(#unc)" />
      <Path d="M12 30C14 22 22 18 32 18H66" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.3} />
      <Rect x={26} y={13} width={7} height={46} rx={3} fill="#8E87AE" />
      <Rect x={68} y={13} width={7} height={46} rx={3} fill="#8E87AE" />
      <Rect x={18} y={34} width={64} height={4.5} rx={2.2} fill="#9A94B8" />
      <Rect x={72} y={24} width={16} height={24} rx={6} fill={V} />
      <Rect x={74} y={26} width={5} height={20} rx={2.5} fill="#fff" opacity={0.25} />
      <Rect x={52} y={27} width={14} height={18} rx={5} fill="#7466A8" />
      <Rect x={34} y={20} width={16} height={11} rx={4} fill="#5C527F" />
      <Path d="M52 44C44 44 42 49 34 49H22" stroke="#B3ADCB" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Rect x={13} y={43} width={14} height={11} rx={5} fill="#C8C2DE" />
      <Rect x={15} y={45} width={8} height={2.6} rx={1.3} fill="#fff" opacity={0.6} />
      <Circle cx={43} cy={36} r={2} fill={GOLD} /><Circle cx={60} cy={36} r={2} fill={GOLD} />
      {jets.map((x, i) => (
        <G key={x}>
          <Path d={`M${x - 2} 80L${x - 14} 62Q${x} 55 ${x + 14} 62L${x + 2} 80Z`} fill="url(#unj)" />
          <Circle cx={x - 12} cy={58 - (i % 2) * 3} r={1.8} fill="#BFE6FF" />
          <Circle cx={x + 11} cy={56 + (i % 2) * 3} r={1.4} fill="#fff" />
          <Circle cx={x + 1} cy={53} r={1.6} fill="#BFE6FF" />
          <Rect x={x - 4} y={79} width={8} height={7} rx={2.5} fill={GOLD} />
          <Rect x={x - 2.5} y={80} width={2} height={4} rx={1} fill="#fff" opacity={0.6} />
        </G>
      ))}
      <Rect x={10} y={84} width={80} height={9} rx={4.5} fill="url(#unf)" />
      <Rect x={10} y={84} width={80} height={3} rx={1.5} fill="#fff" opacity={0.5} />
      <Spark x={92} y={14} r={5} c={GOLD} />
      <Spark x={8} y={70} r={3.5} c={V2} />
    </Frame>
  );
};

/* ---------------- wax: hand + polishing pad on paint, shine ---------------- */
const Wax: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="wxp" a="#8A5BFF" b="#5409DA" c="#3A0AA0" x2="0.3" y2="1" />
      <Lg id="wxd" a="#FFE27A" b="#FFBA08" c="#F29A00" />
      <Lg id="wxh" a="#FFD5B8" b="#F2B58F" c="#DE9870" x2="0.5" y2="1" />
      <Lg id="wxs" a="#7B3CF0" b="#3A0AA0" />
      <RadialGradient id="wxg" cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor="#fff" stopOpacity={0.85} />
        <Stop offset="1" stopColor="#fff" stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Shadow cy={90} rx={40} />
    <Rect x={6} y={56} width={88} height={32} rx={11} fill="url(#wxp)" />
    <Path d="M10 62Q50 54 90 62" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.3} />
    <Ellipse cx={50} cy={68} rx={30} ry={9} fill="url(#wxg)" />
    <Path d="M14 79Q30 74 40 79" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.4} />
    <Ellipse cx={50} cy={64} rx={20} ry={7} fill="#C99400" />
    <Rect x={30} y={55} width={40} height={10} fill="url(#wxd)" />
    <Ellipse cx={50} cy={55} rx={20} ry={7} fill="#FFE98A" />
    <Ellipse cx={50} cy={55} rx={14} ry={4.6} fill="#FFD23A" />
    <Path d="M31 55V64M69 55V64" stroke="#fff" strokeWidth={0.8} opacity={0.0} />
    <Path d="M36 23C36 15 43 12 50 12H55C62 12 66 17 66 24V34C66 40 62 46 56 52H42C37 46 36 40 36 34Z" fill="url(#wxh)" />
    <Path d="M30 30C26 30 24 34 26 39L34 50C37 53 41 52 41 48L38 38Z" fill="url(#wxh)" />
    <Path d="M45 14V28M54 14V28M62 17V30" stroke="#C88660" strokeWidth={1.3} strokeLinecap="round" opacity={0.7} />
    <Path d="M40 22C41 17 45 15 48 15" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
    <Rect x={35} y={1} width={32} height={14} rx={5} fill="url(#wxs)" />
    <Rect x={38} y={3} width={26} height={2.4} rx={1.2} fill="#fff" opacity={0.35} />
    <Rect x={72} y={8} width={14} height={24} rx={5} fill={V} opacity={0.0} />
    <Spark x={80} y={58} r={8} c="#fff" />
    <Spark x={18} y={68} r={5} c={GOLD} />
    <Spark x={86} y={72} r={3.5} c={GOLD} />
    <Spark x={26} y={22} r={3} c={V2} />
  </Frame>
);

/* ---------------- headlight: clear glowing lamp ---------------- */
const Headlight: React.FC<P> = ({ size }) => {
  const rays = [[84, 24, 91, 17], [90, 40, 96, 39], [88, 58, 94, 63], [76, 72, 80, 78]];
  return (
    <Frame size={size}>
      <Defs>
        <Lg id="hll" a="#F4FAFF" b="#CFE6FA" c="#9FC6EE" x2="0.6" y2="1" />
        <Rg id="hlr" a="#FFFFFF" b="#A8B0C8" cx="0.4" cy="0.35" r="0.8" />
        <Rg id="hlb" a="#FFFBE0" b="#FFBA08" cx="0.5" cy="0.5" r="0.6" />
        <RadialGradient id="hlg" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFE27A" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
        </RadialGradient>
        <Lg id="hlf" a="#8A5BFF" b="#5409DA" c="#32068F" />
      </Defs>
      <Shadow cy={86} rx={36} />
      <Path d="M0 74C14 58 40 54 62 64C80 72 92 84 100 92V100H0Z" fill="url(#hlf)" opacity={0.0} />
      <Circle cx={46} cy={46} r={42} fill="url(#hlg)" opacity={0.7} />
      <Path d="M10 44C10 28 28 20 50 22C72 24 90 34 90 48C90 62 72 72 50 72C28 72 10 62 10 44Z" fill={DARK} opacity={0.15} transform="translate(0 4)" />
      <Path d="M10 44C10 28 28 20 50 22C72 24 90 34 90 48C90 62 72 72 50 72C28 72 10 62 10 44Z" fill="url(#hll)" stroke="#fff" strokeWidth={2} />
      <Path d="M16 44C16 32 30 26 50 27C68 29 83 36 83 48C83 59 68 67 50 67C30 67 16 58 16 44Z" fill="#7C86A8" opacity={0.28} />
      <Circle cx={40} cy={47} r={20} fill="url(#hlr)" />
      <Circle cx={40} cy={47} r={20} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
      <Circle cx={40} cy={47} r={14} fill="#fff" opacity={0.5} />
      <Circle cx={40} cy={47} r={10} fill="url(#hlg)" />
      <Circle cx={40} cy={47} r={7} fill="url(#hlb)" />
      <Circle cx={38} cy={45} r={2.4} fill="#fff" />
      <Path d="M66 38C74 38 79 41 80 46" stroke={GOLD} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M66 38C74 38 79 41 80 46" stroke="#FFE27A" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M18 36C24 28 36 25 48 25" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d="M30 66Q46 70 62 66" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.7} />
      {rays.map((r, i) => (
        <Path key={i} d={`M${r[0]} ${r[1]}L${r[2]} ${r[3]}`} stroke={GOLD} strokeWidth={3.2} strokeLinecap="round" />
      ))}
      <Spark x={16} y={16} r={8} c={GOLD} />
      <Spark x={28} y={84} r={4} c={V2} />
      <Spark x={90} y={84} r={3} c="#fff" />
    </Frame>
  );
};

/* ---------------- trim: black bumper trim with shine ---------------- */
const Trim: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="trb" a="#B58CFF" b="#5409DA" c="#3A0AA0" />
      <Lg id="trt" a="#4A4660" b="#1E1A2E" c="#0C0916" />
      <Lg id="trg" a="#FFE27A" b="#FFBA08" c="#FF8A00" />
      <LinearGradient id="trs" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#fff" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#fff" stopOpacity={0.75} />
        <Stop offset="1" stopColor="#fff" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="trc"><Rect x={6} y={50} width={88} height={30} rx={13} /></ClipPath>
    </Defs>
    <Shadow cy={88} rx={40} />
    <Path d="M6 52C6 30 20 20 50 20C80 20 94 30 94 52V58H6Z" fill="url(#trb)" />
    <Path d="M16 40C22 30 34 27 50 27" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.45} />
    <Rect x={6} y={50} width={88} height={30} rx={13} fill="url(#trt)" />
    <G clipPath="url(#trc)">
      <G transform="rotate(-24 50 65)">
        <Rect x={22} y={36} width={16} height={60} fill="url(#trs)" opacity={0.7} />
        <Rect x={44} y={36} width={6} height={60} fill="url(#trs)" opacity={0.55} />
      </G>
      <Rect x={6} y={50} width={88} height={5} fill="#fff" opacity={0.12} />
    </G>
    <Rect x={32} y={58} width={36} height={14} rx={7} fill="#05030B" />
    {[62, 66, 70].map((y) => (<Rect key={y} x={37} y={y - 1} width={26} height={1.6} rx={0.8} fill="#4A4660" />))}
    <Circle cx={19} cy={65} r={6.5} fill="#05030B" />
    <Circle cx={19} cy={65} r={4.4} fill="url(#trg)" />
    <Circle cx={17.6} cy={63.4} r={1.4} fill="#fff" />
    <Circle cx={81} cy={65} r={6.5} fill="#05030B" />
    <Circle cx={81} cy={65} r={4.4} fill="url(#trg)" />
    <Circle cx={79.6} cy={63.4} r={1.4} fill="#fff" />
    <Rect x={6} y={50} width={88} height={2.6} fill={GOLD} opacity={0.0} />
    <Spark x={30} y={56} r={8} c="#fff" />
    <Spark x={74} y={74} r={5} c={GOLD} />
    <Spark x={88} y={16} r={5} c={GOLD} />
    <Spark x={12} y={14} r={3} c={V2} />
  </Frame>
);

/* ---------------- alloy: wheel + brush ---------------- */
const Alloy: React.FC<P> = ({ size }) => {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <Frame size={size}>
      <Defs>
        <Rg id="alt" a="#4A4660" b="#0E0A1A" cx="0.4" cy="0.3" r="0.85" />
        <Lg id="alr" a="#FFFFFF" b="#C9CFE0" c="#8D96B3" x2="0.7" y2="1" />
        <Rg id="alb" a="#5C5778" b="#1B1530" />
        <Lg id="als" a="#FFFFFF" b="#D4D9E8" c="#98A1BD" x2="0.5" y2="1" />
        <Lg id="alh" a="#9B6BFF" b="#5409DA" />
        <Lg id="alg" a="#FFE27A" b="#FFBA08" c="#FF8A00" />
      </Defs>
      <Shadow cx={42} cy={90} rx={34} />
      <Circle cx={42} cy={52} r={38} fill="url(#alt)" />
      <Circle cx={42} cy={52} r={38} fill="none" stroke="#5A5475" strokeWidth={1.2} opacity={0.6} />
      <Path d="M14 36A32 32 0 0 1 38 15" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.3} />
      <Circle cx={42} cy={52} r={29} fill="url(#alr)" />
      <Circle cx={42} cy={52} r={25} fill="url(#alb)" />
      <Path d="M24 40A22 22 0 0 1 44 29" stroke="#FF6A1A" strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.0} />
      <Rect x={50} y={30} width={9} height={14} rx={3} fill={GOLD} transform="rotate(30 54 37)" />
      {spokes.map((a) => (
        <G key={a} transform={`translate(42 52) rotate(${a})`}>
          <Path d="M-4.6 -7L-8.5 -24Q0 -28 8.5 -24L4.6 -7Q0 -9 -4.6 -7Z" fill="url(#als)" />
          <Path d="M-6 -22Q-1 -25 3 -24" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.9} />
        </G>
      ))}
      <Circle cx={42} cy={52} r={9} fill="url(#alr)" />
      <Circle cx={42} cy={52} r={6.4} fill="url(#alg)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <Circle key={a} cx={42 + 4.2 * Math.sin((a * Math.PI) / 180)} cy={52 - 4.2 * Math.cos((a * Math.PI) / 180)} r={0.9} fill="#8D5200" />
      ))}
      <Circle cx={40.4} cy={50.4} r={1.6} fill="#fff" opacity={0.9} />
      <G transform="rotate(-38 78 74)">
        <Rect x={64} y={62} width={34} height={13} rx={6.5} fill="url(#alh)" />
        <Rect x={66} y={64} width={30} height={3} rx={1.5} fill="#fff" opacity={0.3} />
        <Rect x={56} y={59} width={10} height={19} rx={3} fill="url(#alg)" />
        {[60, 63, 66, 69, 72, 75].map((y) => (<Path key={y} d={`M56 ${y}H50`} stroke="#E8A200" strokeWidth={1.6} strokeLinecap="round" />))}
      </G>
      <Circle cx={72} cy={62} r={4} fill="#fff" stroke="#BFE6FF" strokeWidth={1} />
      <Circle cx={80} cy={55} r={2.6} fill="#fff" stroke="#BFE6FF" strokeWidth={0.8} />
      <Circle cx={66} cy={70} r={2.4} fill="#fff" stroke="#BFE6FF" strokeWidth={0.8} />
      <Spark x={20} y={22} r={6} c="#fff" />
      <Spark x={92} y={28} r={5} c={GOLD} />
      <Spark x={86} y={90} r={3} c={V2} />
    </Frame>
  );
};

/* ---------------- roof: sunroof ---------------- */
const Roof: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="rob" a="#B58CFF" b="#5409DA" c="#3A0AA0" x2="0.3" y2="1" />
      <Lg id="rog" a="#BFE3FF" b="#4F8FE0" c="#1F4DA8" x2="0.5" y2="1" />
      <Lg id="rod" a="#2A2145" b="#0E0A1A" />
      <Lg id="ror" a="#F2F3FA" b="#A3AAC4" />
      <LinearGradient id="ros" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#fff" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#fff" stopOpacity={0.7} />
        <Stop offset="1" stopColor="#fff" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="roc"><Rect x={25} y={27} width={50} height={26} rx={7} /></ClipPath>
    </Defs>
    <Shadow cy={91} rx={38} />
    <Rect x={6} y={10} width={88} height={78} rx={20} fill="url(#rob)" />
    <Path d="M14 24Q18 15 32 14" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.4} />
    <Rect x={11} y={22} width={5} height={54} rx={2.5} fill="url(#ror)" />
    <Rect x={84} y={22} width={5} height={54} rx={2.5} fill="url(#ror)" />
    <Rect x={20} y={20} width={60} height={50} rx={12} fill="#1A0A33" />
    <Rect x={22} y={22} width={56} height={46} rx={10} fill="url(#rod)" />
    <Rect x={25} y={27} width={50} height={26} rx={7} fill="url(#rog)" />
    <G clipPath="url(#roc)">
      <G transform="rotate(-24 50 40)">
        <Rect x={30} y={10} width={11} height={60} fill="url(#ros)" />
        <Rect x={48} y={10} width={4} height={60} fill="url(#ros)" opacity={0.8} />
      </G>
      <Ellipse cx={36} cy={36} rx={9} ry={2.6} fill="#fff" opacity={0.0} />
    </G>
    <Rect x={25} y={27} width={50} height={26} rx={7} fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.6} />
    <Rect x={25} y={55} width={50} height={9} rx={4} fill="#3B3158" />
    <Rect x={28} y={57} width={44} height={2} rx={1} fill="#fff" opacity={0.2} />
    <Path d="M70 50L78 40" stroke={GOLD} strokeWidth={0.0} />
    <Circle cx={66} cy={34} r={4.4} fill="#FFE27A" opacity={0.95} />
    <Circle cx={66} cy={34} r={8} fill={GOLD} opacity={0.25} />
    <Spark x={88} y={12} r={7} c={GOLD} />
    <Spark x={10} y={80} r={4} c="#fff" />
    <Spark x={52} y={40} r={4} c="#fff" />
  </Frame>
);

/* ---------------- tar: spot being wiped ---------------- */
const Tar: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="tap" a="#8FC0FF" b="#2E8BFF" c="#1C5FD0" />
      <Lg id="tac" a="#FFE27A" b="#FFBA08" c="#F29A00" x2="0.4" y2="1" />
      <Rg id="tat" a="#4A3A33" b="#1A1210" />
      <LinearGradient id="tas" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#fff" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#fff" stopOpacity={0.75} />
        <Stop offset="1" stopColor="#fff" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="tacl"><Rect x={6} y={30} width={88} height={56} rx={14} /></ClipPath>
    </Defs>
    <Shadow cy={91} rx={40} />
    <Rect x={6} y={30} width={88} height={56} rx={14} fill="url(#tap)" />
    <G clipPath="url(#tacl)">
      <G transform="rotate(-22 50 58)">
        <Rect x={26} y={20} width={22} height={80} fill="url(#tas)" opacity={0.85} />
        <Rect x={54} y={20} width={5} height={80} fill="url(#tas)" opacity={0.6} />
      </G>
    </G>
    <Path d="M12 42Q16 35 28 34" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.5} />
    <Path d="M16 52C13 52 11 56 14 59C12 63 17 66 20 63C24 65 28 62 26 58C29 54 24 50 21 53C19 51 17 51 16 52Z" fill="url(#tat)" />
    <Circle cx={22} cy={72} r={3.4} fill="url(#tat)" />
    <Circle cx={32} cy={46} r={2.2} fill="url(#tat)" />
    <Circle cx={15.4} cy={55.4} r={1.1} fill="#fff" opacity={0.5} />
    <Path d="M70 70C66 68 66 64 70 63C71 60 76 60 78 63C82 62 85 65 82 68C84 71 80 74 77 72C75 74 71 74 70 70Z" fill="#fff" />
    <Circle cx={75} cy={67} r={2.4} fill="#6B6560" opacity={0.7} />
    <Circle cx={80} cy={65} r={1} fill="#6B6560" opacity={0.6} />
    <G transform="translate(8 14) rotate(-18 48 42)">
      <Rect x={26} y={14} width={44} height={34} rx={11} fill="#C99400" transform="translate(0 3)" />
      <Rect x={26} y={14} width={44} height={34} rx={11} fill="url(#tac)" />
      <Path d="M33 24Q48 18 63 24" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
      <Path d="M32 33Q48 28 64 33M32 40Q48 36 64 40" stroke="#E8A200" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.7} />
    </G>
    <Circle cx={88} cy={44} r={3.2} fill="#fff" stroke="#BFE6FF" strokeWidth={0.8} />
    <Circle cx={80} cy={52} r={2} fill="#fff" stroke="#BFE6FF" strokeWidth={0.8} />
    <Spark x={36} y={66} r={7} c="#fff" />
    <Spark x={86} y={20} r={6} c={GOLD} />
    <Spark x={10} y={22} r={3.5} c={V2} />
  </Frame>
);

/* ---------------- rain: water beading on glass ---------------- */
const BEADS: [number, number, number][] = [
  [24, 38, 6], [44, 32, 4.4], [66, 36, 7], [82, 46, 4], [34, 56, 8], [56, 52, 5], [76, 64, 6.4], [20, 70, 4.6], [48, 72, 6], [64, 82, 3.6], [86, 78, 3.4], [34, 80, 3.2], [12, 50, 3],
];
const Rain: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="rag" a="#E4F3FF" b="#A8D2F5" c="#6FA8E8" x2="0.6" y2="1" />
      <Lg id="raf" a="#4A4660" b="#1A1430" />
      <Rg id="rab" a="#FFFFFF" b="#6FB6FF" cx="0.35" cy="0.3" r="0.8" />
      <Lg id="rac" a="#F4FAFF" b="#CFE4F7" />
      <LinearGradient id="ras" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#fff" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#fff" stopOpacity={0.6} />
        <Stop offset="1" stopColor="#fff" stopOpacity={0} />
      </LinearGradient>
      <ClipPath id="rac1"><Rect x={12} y={24} width={76} height={64} rx={12} /></ClipPath>
    </Defs>
    <Shadow cy={92} rx={38} />
    <Rect x={8} y={20} width={84} height={72} rx={16} fill="url(#raf)" />
    <Rect x={12} y={24} width={76} height={64} rx={12} fill="url(#rag)" />
    <G clipPath="url(#rac1)">
      <G transform="rotate(-24 50 56)">
        <Rect x={22} y={10} width={14} height={90} fill="url(#ras)" />
        <Rect x={44} y={10} width={5} height={90} fill="url(#ras)" opacity={0.8} />
      </G>
    </G>
    {BEADS.map(([x, y, r], i) => (
      <G key={i}>
        <Ellipse cx={x + r * 0.15} cy={y + r * 0.35} rx={r} ry={r * 0.92} fill="#1F4DA8" opacity={0.22} />
        <Circle cx={x} cy={y} r={r} fill="url(#rab)" stroke="#fff" strokeWidth={0.8} opacity={0.98} />
        <Circle cx={x - r * 0.35} cy={y - r * 0.38} r={Math.max(r * 0.28, 0.9)} fill="#fff" />
      </G>
    ))}
    <Path d="M56 14C56 14 51 20 51 23C51 25.7 53.2 28 56 28C58.8 28 61 25.7 61 23C61 20 56 14 56 14Z" fill="#4DB2FF" opacity={0.0} />
    <Path d="M20 8C20 8 12 17 12 22C12 26.4 15.6 30 20 30C24.4 30 28 26.4 28 22C28 17 20 8 20 8Z" fill="url(#rab)" stroke="#2E8BFF" strokeWidth={1.6} />
    <Path d="M16.5 21C16.5 18.6 17.8 17 18.8 15.8" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    <Path d="M70 10L74 18M80 8L84 16" stroke="#4DB2FF" strokeWidth={2.6} strokeLinecap="round" opacity={0.0} />
    <Spark x={90} y={26} r={6} c={GOLD} />
    <Spark x={44} y={16} r={4} c="#fff" />
  </Frame>
);

/* ---------------- leather: seat with cream ---------------- */
const Leather: React.FC<P> = ({ size }) => (
  <Frame size={size}>
    <Defs>
      <Lg id="lea" a="#E0705A" b="#B4452E" c="#7C2A1A" x2="0.3" y2="1" />
      <Lg id="led" a="#A8392A" b="#6B2014" />
      <Lg id="lei" a="#EA8A72" b="#C1503A" c="#92301F" />
      <Lg id="lec" a="#FFFFFF" b="#FFF1D6" c="#F3D9A8" />
      <Lg id="lej" a="#FFE27A" b="#FFBA08" c="#FF8A00" />
      <Lg id="lew" a="#FFFFFF" b="#E7E2F7" />
    </Defs>
    <Shadow cx={44} cy={90} rx={36} />
    <Rect x={34} y={5} width={22} height={17} rx={7} fill="url(#led)" />
    <Rect x={37} y={7} width={9} height={2.4} rx={1.2} fill="#fff" opacity={0.45} />
    <Rect x={24} y={16} width={42} height={46} rx={13} fill="url(#led)" />
    <Rect x={29} y={19} width={32} height={42} rx={9} fill="url(#lea)" />
    <Path d="M33 22Q31 36 33 52" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.4} />
    <Rect x={29} y={19} width={32} height={42} rx={9} fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 2.4" opacity={0.95} />
    <Path d="M45 22V58" stroke="#7C2A1A" strokeWidth={1.2} opacity={0.35} />
    <Rect x={14} y={52} width={62} height={26} rx={12} fill="url(#led)" />
    <Rect x={17} y={50} width={56} height={22} rx={11} fill="url(#lei)" />
    <Path d="M24 54Q40 51 62 54" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.45} />
    <Rect x={21} y={53} width={48} height={16} rx={8} fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 2.4" />
    <Rect x={22} y={76} width={46} height={6} rx={3} fill="#2A2140" />
    <Ellipse cx={44} cy={60} rx={11} ry={4.6} fill="#C99C62" opacity={0.0} />
    <Path d="M32 63C32 58 38 57 44 57C52 57 58 58 58 63C58 66 52 67 45 67C37 67 32 66 32 63Z" fill="#E4C99A" />
    <Path d="M35 60C35 56 40 55 45 55C51 55 55 56 55 59C55 62 50 63 45 63C39 63 35 62 35 60Z" fill="url(#lec)" />
    <Path d="M38 56C38 52 42 51 45 51C49 51 52 52 52 55C52 57 49 58 45 58C41 58 38 57 38 56Z" fill="url(#lec)" />
    <Path d="M41 52C41 49 43 47.5 45.4 47.5C47.6 47.5 49 49 48.6 51C48 52.4 46 53 44 53C42.4 53 41 52.6 41 52Z" fill="#fff" />
    <Circle cx={43} cy={50} r={1} fill="#fff" />
    <Rect x={72} y={62} width={22} height={24} rx={7} fill="#B8B0D8" opacity={0.0} />
    <Rect x={72} y={68} width={23} height={20} rx={7} fill="url(#lew)" />
    <Rect x={72} y={68} width={23} height={20} rx={7} fill="none" stroke="#CFC6EE" strokeWidth={1} />
    <Rect x={74} y={58} width={19} height={12} rx={4} fill="url(#lej)" />
    <Rect x={76} y={60} width={5} height={7} rx={2.5} fill="#fff" opacity={0.55} />
    <Rect x={76} y={74} width={15} height={7} rx={3.5} fill={V} />
    <Rect x={78} y={76} width={11} height={3} rx={1.5} fill="#fff" opacity={0.7} />
    <Spark x={78} y={30} r={7} c={GOLD} />
    <Spark x={12} y={30} r={5} c="#fff" />
    <Spark x={84} y={46} r={3} c={V2} />
  </Frame>
);

export const ART: Record<string, React.FC<{ size: number }>> = {
  ceramic: Ceramic,
  under: Under,
  wax: Wax,
  headlight: Headlight,
  trim: Trim,
  alloy: Alloy,
  roof: Roof,
  tar: Tar,
  rain: Rain,
  leather: Leather,
};
