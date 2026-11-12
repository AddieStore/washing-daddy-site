import React, { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Car as the app passes it around. `img` is kept for old callers but the side-profile drawing is used for every car. */
export type Car = { reg: string; type?: string; color?: string; img?: string | null };
type CarType = 'suv' | 'mpv' | 'sedan' | 'hatch';

// Hand-authored side-profile car illustrations (brochure / technical-drawing style), ported 1:1 from the Astryx
// preview (astryx-preview/src/components/CarArt.tsx). Cars face right. viewBox 240x100; wheels sit on y=82.
// Each body outline already contains its wheel-arch cut-outs.
type Spec = {
  body: string;
  wheels: [number, number];
  r: number; // tyre radius
  arch: number; // arch radius
  glass: string[];
  glassEdge: string; // outline of the whole greenhouse (for the frame stroke)
  shoulder: string; // highlight line along the shoulder
  doors: string[]; // shut lines
  handles: [number, number][];
  mirror: string;
  head: string;
  tail: string;
  front: string[]; // grille / bumper details
  rear: string[];
  extras?: string[]; // rails, cladding trims, rocker line, etc.
  cladding?: string; // dark plastic trim shape
  dx?: number; // horizontal centring offset
  sill: number; // y where the dark lower shade starts
};

const CY = 67;

const SPECS: Record<CarType, Spec> = {
  sedan: {
    body: 'M8 67 L8 54 Q8 48 13 47 L48 44.5 C58 43.5 64 41 70 36 L86 24 Q89 22 94 22 L124 22 Q128 22 131 24 L158 42 Q160 43.5 165 44.5 L214 49.5 Q226 51 230 57.5 L232 67 L200 67 A19 19 0 0 0 162 67 L77 67 A19 19 0 0 0 39 67 Z',
    wheels: [58, 181], r: 15, arch: 19,
    glass: ['M74 41.5 L89 28 Q90 27.3 92 27.3 L105 27.3 L105 41.5 Z', 'M109 27.3 L125 27.3 Q127 27.3 128.5 28.4 L149 41.5 L109 41.5 Z'],
    glassEdge: 'M72 42 L88 26.5 Q90 25.5 93 25.5 L124 25.5 Q128 25.5 130 27 L151 42 Z',
    shoulder: 'M16 48 L50 45.5 C60 44.5 67 42 72.5 37.5 M158 43 Q161 44.5 166 45.3 L212 50.3',
    doors: ['M107 27 L106.5 66', 'M148.5 43 L146.5 66', 'M75.5 43 L77 66'],
    handles: [[91, 46.5], [127, 46.5]],
    mirror: 'M149 40 Q153 37.5 158 39.5 L158.5 43 L150 43.5 Z',
    head: 'M211 50 L224.5 52.8 Q228.5 53.8 228.5 56 L227.5 57 L212 54.5 Z',
    tail: 'M8.5 49 Q9 48 12.5 47.8 L16 47.6 L15.5 54 L8.3 54.5 Z',
    front: ['M231 61.5 L206 60.5', 'M228 62.5 L214 62 L214 65 L229 65.3 Z', 'M222 57.5 L230 58.5'],
    rear: ['M8.5 60 L20 60'],
    extras: ['M77 62.5 L163 62.5'],
    sill: 60,
  },
  hatch: {
    body: 'M34 67 L34 52 Q34 47.5 38 46 L42 45 L47 34 Q50 24.5 60 23.5 L112 23.5 Q118 23.5 122 26 L150 41.5 Q153 43.5 158 44.5 L206 49.5 Q218 51 222 57.5 L224 67 L193 67 A19 19 0 0 0 155 67 L91 67 A19 19 0 0 0 53 67 Z',
    wheels: [72, 174], r: 15, arch: 19,
    glass: ['M50 41.5 L56 29.5 Q57 27.8 59.5 27.8 L84 27.8 L84 41.5 Z', 'M88 27.8 L113 27.8 Q115.5 27.8 117.5 29 L139 41.5 L88 41.5 Z'],
    glassEdge: 'M48 42 L54 28.5 Q56 25.5 60 25.5 L112 25.5 Q116.5 25.5 119 27.5 L141 42 Z',
    shoulder: 'M154 43 Q157 44.5 162 45.3 L204 50',
    doors: ['M86 28 L85.5 66', 'M141 42 L139.5 66', 'M41 47 Q38.5 55 38.5 63'],
    handles: [[77, 46.5], [128, 46.5]],
    mirror: 'M141 40 Q145 37.5 150 39.5 L150.5 43 L142 43.5 Z',
    head: 'M206 50 L218.5 52.5 Q222.5 53.6 222.5 55.8 L221.5 56.8 L207 54.5 Z',
    tail: 'M34.4 51.5 L34.4 49 Q34.6 47.5 38 46.3 L41.5 45.4 L40.5 53 Z',
    front: ['M224.5 61.5 L200 60.5', 'M222.5 62.5 L209 62 L209 65 L223 65.3 Z', 'M216.5 57.5 L224 58.5'],
    rear: ['M34.5 60 L45 60'],
    extras: ['M92 62.5 L154 62.5'],
    sill: 60,
    dx: -8,
  },
  suv: {
    body: 'M7 68 L7 43 Q7 38.5 11 37.5 L24 34.5 L30 19 Q31.5 15.5 36 15.5 L131 15.5 Q136 15.5 139 18.5 L160 40 Q162 41.5 166 42 L216 46.5 Q229 48 232 57 L233 68 L209 68 A20 20 0 0 0 169 68 L74 68 A20 20 0 0 0 34 68 Z',
    wheels: [54, 189], r: 15.5, arch: 20,
    glass: ['M33 33 L37.5 21 Q38.2 19.5 40 19.5 L66 19.5 L66 33 Z', 'M70 19.5 L100 19.5 L100 33 L70 33 Z', 'M104 19.5 L129 19.5 Q131 19.5 132.3 20.7 L151 33 L104 33 Z'],
    glassEdge: 'M31 34.5 L36 20 Q37 18 40 18 L130 18 Q133 18 134.5 19.5 L154 34.5 Z',
    shoulder: 'M10 38.5 L24 35.5 M159 41 Q162 42.5 166 43 L214 47.5',
    doors: ['M68 19 L67.5 66', 'M102 19 L101.5 66', 'M153 35 L151 66', 'M34 36 L33 56'],
    handles: [[80, 40], [112, 40], [52, 40]],
    mirror: 'M153 33 Q157.5 30.5 162.5 32.5 L163 36.5 L154 37 Z',
    head: 'M213 47 L226 49 Q230 50 230 52.5 L229 54 L214 51.5 Z',
    tail: 'M7.5 41 Q8 38.7 11 38.2 L15 37.4 L14.5 46 L7.4 46.5 Z',
    front: ['M232.5 62 L206 60.5', 'M229 63 L214 62.5 L214 66 L230 66.3 Z', 'M222 55.5 L231 56.5', 'M219 58.5 L231 59.5'],
    rear: ['M7.5 61 L22 61'],
    extras: ['M34 11.5 L132 11.5 M44 15.5 L44 11.5 M122 15.5 L122 11.5', 'M75 63 L168 63'],
    cladding: 'M7 68 L7 59 L34 59 A20 20 0 0 1 34 68 Z M74 59 L169 59 A20 20 0 0 1 169 68 L74 68 A20 20 0 0 1 74 59 Z',
    sill: 58,
  },
  mpv: {
    body: 'M7 68 L7 46 Q7 39 12 37.5 L26 34 L30 24 Q31.5 19 37 19 L150 19 Q155 19 158.5 22.5 L185 41.5 Q188 43.5 192 44 L214 48 Q227 49.5 231 57.5 L232 68 L207 68 A19 19 0 0 0 169 68 L71 68 A19 19 0 0 0 33 68 Z',
    wheels: [52, 188], r: 15, arch: 19,
    glass: ['M32 36 L35.5 25 Q36.3 23.2 38.5 23.2 L65 23.2 L65 36 Z', 'M69 23.2 L108 23.2 L108 36 L69 36 Z', 'M112 23.2 L147 23.2 Q149 23.2 150.5 24.5 L172 36 L112 36 Z'],
    glassEdge: 'M30 37.5 L34 24.5 Q35 21.5 38.5 21.5 L148 21.5 Q151 21.5 153 23 L176 37.5 Z',
    shoulder: 'M10 38.5 L26 35 M158 41 L185 42.5 Q188 44.5 192 45 L212 49',
    doors: ['M67 23 L66.5 66', 'M110 23 L109.5 66', 'M175 41 L172 66'],
    handles: [[78, 44], [118, 44]],
    mirror: 'M165 36 Q169.5 33.5 174.5 35.5 L175 39.5 L166 40 Z',
    head: 'M210 48.5 L223.5 50.5 Q228 51.5 228 54 L227 55.5 L212 53 Z',
    tail: 'M7.5 42 Q8 39.5 11.5 38.7 L15 37.9 L14.5 47 L7.4 47.5 Z',
    front: ['M231.5 62 L204 60.5', 'M228.5 63 L213 62.5 L213 66 L230 66.3 Z', 'M220 56.5 L230 57.5'],
    rear: ['M7.5 61 L22 61'],
    extras: ['M71 41 L108 41 M71 41 Q69 41 69 43 L69 56', 'M71 62.5 L169 62.5'],
    sill: 59,
  },
};


// Raise everything above the beltline so the cars read tall enough (arches and lower body untouched).
const PIVOT = 50;
const LIFT: Record<CarType, number> = {sedan: 1.32, hatch: 1.3, suv: 1.1, mpv: 1.15};
const ly = (y: number, k: number) => (y < PIVOT ? PIVOT - (PIVOT - y) * k : y);
function lift(d: string, k: number): string {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const out: string[] = [];
  let cmd = '';
  let n = 0;
  for (const tok of t) {
    if (/[A-Za-z]/.test(tok)) { cmd = tok; n = 0; out.push(tok); continue; }
    const v = parseFloat(tok);
    const isY = cmd === 'A' ? n % 7 === 6 : n % 2 === 1;
    const noLift = cmd === 'A' && n % 7 < 6;
    out.push(String(noLift ? v : isY ? +ly(v, k).toFixed(2) : v));
    n++;
  }
  return out.join(' ');
}
function lifted(type: CarType): Spec {
  const s = SPECS[type];
  const k = LIFT[type];
  const f = (d: string) => lift(d, k);
  return {...s, body: f(s.body), glass: s.glass.map(f), glassEdge: f(s.glassEdge), shoulder: f(s.shoulder), doors: s.doors.map(f), handles: s.handles.map(([x, y]) => [x, ly(y, k)] as [number, number]), mirror: f(s.mirror), head: f(s.head), tail: f(s.tail), extras: s.extras?.map(f)};
}


function Wheel({ cx, r, id }: { cx: number; r: number; id: string }) {
  const rim = r * 0.64;
  const rimFill = `url(#${id}-rim)`;
  const spokes = [0, 72, 144, 216, 288].map((a) => (
    <Path key={a} transform={`rotate(${a})`} d={`M-1.7 ${-r * 0.14} L-2.7 ${-rim * 0.93} Q0 ${-rim * 1.02} 2.7 ${-rim * 0.93} L1.7 ${-r * 0.14} Z`} fill={rimFill} />
  ));
  return (
    <G transform={`translate(${cx} ${CY})`}>
      <Circle r={r} fill="#17171d" />
      <Circle r={r * 0.9} fill="none" stroke="#2d2d37" strokeWidth={0.8} />
      <Circle r={r * 0.78} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={0.5} />
      <Circle r={rim} fill="#2a2c35" />
      <Circle r={rim} fill="none" stroke={rimFill} strokeWidth={1.5} />
      {spokes}
      <Circle r={r * 0.2} fill={rimFill} stroke="#4b4f5c" strokeWidth={0.5} />
      {[0, 72, 144, 216, 288].map((a) => <Circle key={a} cx={Math.sin((a * Math.PI) / 180) * r * 0.1} cy={-Math.cos((a * Math.PI) / 180) * r * 0.1} r={0.7} fill="#555a68" />)}
      <Path d={`M${-r * 0.8} ${-r * 0.35} A${r * 0.85} ${r * 0.85} 0 0 1 ${-r * 0.3} ${-r * 0.8}`} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1} strokeLinecap="round" />
    </G>
  );
}

export function CarArt({ car, width, height }: { car: Car; width: number; height?: number }) {
  const type: CarType = car.type === 'suv' || car.type === 'mpv' || car.type === 'sedan' || car.type === 'hatch' ? car.type : 'suv';
  const color = car.color || '#8a8f98';
  const s = lifted(type);
  const id = 'car' + useId().replace(/[^A-Za-z0-9]/g, '');
  const u = (n: string) => `${id}-${n}`;
  const line = { fill: 'none', stroke: '#000', strokeOpacity: 0.38, strokeWidth: 0.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const h = height ?? Math.round((width * 100) / 240);
  return (
    <Svg width={width} height={h} viewBox="0 0 240 100" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id={u('body')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.34} />
          <Stop offset="0.3" stopColor="#fff" stopOpacity={0.06} />
          <Stop offset="0.62" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.34} />
        </LinearGradient>
        <LinearGradient id={u('sill')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.3} />
        </LinearGradient>
        <LinearGradient id={u('glass')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#e6f0f8" />
          <Stop offset="0.55" stopColor="#a6bccd" />
          <Stop offset="1" stopColor="#6f8599" />
        </LinearGradient>
        <LinearGradient id={u('rim')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#f4f6f9" />
          <Stop offset="0.5" stopColor="#bcc2cc" />
          <Stop offset="1" stopColor="#8b919e" />
        </LinearGradient>
        <LinearGradient id={u('lamp')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff" />
          <Stop offset="1" stopColor="#c7d6e3" />
        </LinearGradient>
        <RadialGradient id={u('shadow')} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity={0.34} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={u('clip')}><Path d={s.body} /></ClipPath>
      </Defs>

      <Ellipse cx={120} cy={82} rx={112} ry={5} fill={`url(#${u('shadow')})`} />

      <G transform={`translate(${s.dx ?? 0} 0)`}>
        {/* wheel wells */}
        {s.wheels.map((cx) => <Path key={cx} d={`M${cx - s.arch} ${CY} A${s.arch} ${s.arch} 0 0 1 ${cx + s.arch} ${CY} Z`} fill="#0f0f14" />)}
        {s.wheels.map((cx) => <Wheel key={cx} cx={cx} r={s.r} id={id} />)}

        {/* roof rails sit behind the body */}
        {type === 'suv' && <Path d={s.extras![0]} fill="none" stroke="#2a2a33" strokeWidth={1.8} strokeLinecap="round" />}

        {/* body */}
        <Path d={s.body} fill={color} />
        <G clipPath={`url(#${u('clip')})`}>
          <Path d={s.body} fill={`url(#${u('body')})`} />
          <Rect x={0} y={s.sill} width={240} height={80 - s.sill} fill={`url(#${u('sill')})`} />
          <Rect x={0} y={s.sill + 3} width={240} height={1} fill="#000" opacity={0.12} />
          {s.cladding ? <Path d={s.cladding} fill="#25252d" opacity={0.92} /> : null}
          {/* shoulder highlight */}
          <Path d={s.shoulder} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.1} strokeLinecap="round" />
          <Path d={s.shoulder} fill="none" stroke="#000" strokeOpacity={0.16} strokeWidth={0.8} strokeLinecap="round" transform="translate(0 1.8)" />
        </G>
        <Path d={s.body} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={0.9} strokeLinejoin="round" />

        {/* greenhouse */}
        <Path d={s.glassEdge} fill="#1d2129" opacity={0.92} />
        {s.glass.map((g, i) => <Path key={i} d={g} fill={`url(#${u('glass')})`} stroke="#1d2129" strokeWidth={0.6} strokeLinejoin="round" />)}

        {/* panel lines, handles, trims */}
        {s.doors.map((d, i) => <Path key={i} d={d} {...line} />)}
        {s.handles.map(([x, y], i) => (
          <G key={i}>
            <Rect x={x - 4.5} y={y - 1} width={9} height={2.2} rx={1.1} fill="#000" opacity={0.28} />
            <Rect x={x - 4.5} y={y - 1.6} width={9} height={2.2} rx={1.1} fill="#e9edf2" stroke="#000" strokeOpacity={0.4} strokeWidth={0.4} />
          </G>
        ))}
        {s.extras?.slice(type === 'suv' ? 1 : 0).map((d, i) => <Path key={i} d={d} {...line} strokeOpacity={0.3} />)}
        {s.rear.map((d, i) => <Path key={i} d={d} {...line} strokeOpacity={0.4} />)}
        {s.front.map((d, i) => <Path key={i} d={d} {...line} strokeOpacity={0.55} fill={d.endsWith('Z') ? '#15151b' : 'none'} />)}
        <Path d={s.mirror} fill={color} stroke="#000" strokeOpacity={0.55} strokeWidth={0.7} strokeLinejoin="round" />
        <Path d={s.mirror} fill={`url(#${u('body')})`} />

        {/* lamps */}
        <Path d={s.head} fill={`url(#${u('lamp')})`} stroke="#000" strokeOpacity={0.55} strokeWidth={0.6} strokeLinejoin="round" />
        <Path d={s.tail} fill="#c4202c" stroke="#000" strokeOpacity={0.55} strokeWidth={0.6} strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
