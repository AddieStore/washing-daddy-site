/* The city behind the Home hero. By day it is a warm, coloured skyline (red and orange towers, cream blocks, a green hill, trees);
   from 6 pm to 6 am the sky goes deep blue with stars and every tower lights up its windows, a few of them flickering like a real city.
   Everything is drawn in one SVG path per colour, so it stays light on the phone. The tiles scroll slowly for a lively feel. */
import { memo, useEffect, useId, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient as SG, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/** true from 6 pm to 6 am on the phone's clock; checked again every minute (a test can force it with globalThis.__WD_NIGHT) */
export function useNight(): boolean {
  const calc = () => { const f = (globalThis as any).__WD_NIGHT; if (typeof f === 'boolean') return f; const h = new Date().getHours(); return h >= 18 || h < 6 };
  const [n, setN] = useState(calc);
  useEffect(() => { const t = setInterval(() => setN(calc()), 60000); return () => clearInterval(t) }, []);
  return n;
}

function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const DAY_WALLS = ['#E8643C', '#D9502C', '#F08A4B', '#E9D8B4', '#C9CDD2', '#E2754A', '#F2C078', '#B9B2A6'];
const NIGHT_WALLS = ['#0F1D78', '#13279A', '#1730AC', '#0B1566', '#122486'];

type Layer = { seed: number; minW: number; maxW: number; minH: number; maxH: number; haze: number; step: number; lit: number; detail: number };
type Gen = { bodies: { c: string; d: string }[]; all: string; shade: string; lightEdge: string; ledge: string; parapet: string; frames: string; glass: string; glass2: string; litS: string; litA: string; litB: string; glow: string; neon: string; balc: string; ac: string; grainD: string; grainL: string; roofs: { x: number; y: number }[]; tops: string; trees: { x: number; y: number; r: number }[] };

function build(W: number, h: number, L: Layer, night: boolean, tree: boolean): Gen {
  const r = rng(L.seed), walls = night ? NIGHT_WALLS : DAY_WALLS;
  const bodies = new Map<string, string>();
  const add = (c: string, d: string) => bodies.set(c, (bodies.get(c) || '') + d);
  const o = { all: '', shade: '', lightEdge: '', ledge: '', parapet: '', frames: '', glass: '', glass2: '', litS: '', litA: '', litB: '', glow: '', neon: '', balc: '', ac: '', grainD: '', grainL: '', tops: '' };
  const roofs: { x: number; y: number }[] = [], trees: { x: number; y: number; r: number }[] = [];
  const rect = (rx: number, ry: number, rw: number, rh: number) => `M${rx} ${ry}h${rw}v${rh}h${-rw}z`;
  let x = -4;
  while (x < W) {
    const w = Math.round(L.minW + r() * (L.maxW - L.minW)), bh = Math.round(h * (L.minH + r() * (L.maxH - L.minH))), y = h - bh;
    const raw = walls[Math.floor(r() * walls.length)], c = mix(raw, night ? '#050B3A' : '#FFFFFF', L.haze), style = r();
    add(c, rect(x, y, w, bh)); o.all += rect(x, y, w, bh);
    o.shade += rect(x + w * 0.72, y, w * 0.28, bh);                       // the side away from the light
    o.lightEdge += rect(x, y, 1.3, bh);                                    // the lit edge
    o.parapet += rect(x - 0.6, y - 1.8, w + 1.2, 2.6);                     // roof cap
    let topY = y;
    if (style < 0.3 && bh > h * 0.45) {            // stepped crown
      const cw = Math.round(w * 0.62), ch = Math.round(bh * 0.14), cx = x + (w - cw) / 2;
      add(c, rect(cx, y - ch, cw, ch)); o.all += rect(cx, y - ch, cw, ch); o.shade += rect(cx + cw * 0.72, y - ch, cw * 0.28, ch); o.parapet += rect(cx - 0.6, y - ch - 1.8, cw + 1.2, 2.6); o.lightEdge += rect(cx, y - ch, 1.2, ch);
      topY = y - ch;
      if (r() < 0.6) { o.tops += rect(cx + cw / 2 - 0.9, topY - 18, 1.8, 18); roofs.push({ x: cx + cw / 2, y: topY - 19 }) }
    } else if (style < 0.5) {                      // roof house + water tank
      const tw = Math.round(w * 0.3); add(c, rect(x + w * 0.2, y - 7, tw, 7)); o.all += rect(x + w * 0.2, y - 7, tw, 7); o.shade += rect(x + w * 0.2 + tw * 0.7, y - 7, tw * 0.3, 7);
      o.tops += rect(x + w * 0.62, y - 6, 7, 6) + rect(x + w * 0.62 + 2.4, y - 9, 2.2, 3); topY = y - 7;
    } else if (style < 0.64 && bh > h * 0.5) {     // tall mast
      o.tops += rect(x + w / 2 - 0.9, y - 24, 1.8, 24) + rect(x + w / 2 - 3, y - 14, 6, 1.2); roofs.push({ x: x + w / 2, y: y - 25 });
    }
    if (night && r() < 0.2 && bh > h * 0.4) o.neon += rect(x + w - 2.4, y + 2, 1.5, bh - 4);     // glowing vertical light strip
    // floors: ledges, windows, frames, balconies, air-conditioners
    const gap = L.step + 3, cols = Math.max(1, Math.floor((w - 6) / L.step)), rows = Math.max(0, Math.floor((bh - 8) / gap));
    const offx = x + (w - cols * L.step + (L.step - 3.6)) / 2;
    for (let j = 0; j < rows; j++) {
      const wy = y + 6 + j * gap;
      if (j > 0 && j % 3 === 0) o.ledge += rect(x, wy - 3.2, w, 1.1);
      for (let i = 0; i < cols; i++) {
        const wx = offx + i * L.step, rr = r(), box = rect(wx, wy, 3.6, 5.2);
        if (L.detail > 0 && !night) o.frames += rect(wx - 0.9, wy - 0.9, 5.4, 7.0);
        if (L.detail > 1 && r() < 0.16) o.balc += rect(wx - 1.3, wy + 5.4, 6.2, 1.4) + rect(wx - 1.3, wy + 4.4, 0.7, 1.4) + rect(wx + 4.2, wy + 4.4, 0.7, 1.4);
        if (L.detail > 1 && r() < 0.07) o.ac += rect(wx + 0.2, wy + 5.9, 3.2, 2);
        if (night) {
          if (rr < L.lit) { const g = r(); if (g < 0.66) o.litS += box; else if (g < 0.83) o.litA += box; else o.litB += box; o.glow += rect(wx - 1.5, wy - 1.5, 6.6, 8.2) }
          else o.glass += box;
        } else { if (rr < 0.22) o.glass2 += box; else o.glass += box }
      }
    }
    // grain: speckle so the walls feel like printed paper, not flat fills
    const specks = Math.round(w * bh / (L.detail ? 70 : 140));
    for (let k = 0; k < specks; k++) { const gx = x + r() * w, gy = y + r() * bh; if (r() < 0.55) o.grainD += rect(gx, gy, 1.1, 1.1); else o.grainL += rect(gx, gy, 1, 1) }
    if (tree && r() < 0.75) trees.push({ x: x + w * (0.1 + r() * 0.8), y: h - 2, r: 7 + r() * 6 });
    x += w + (r() < 0.25 ? 3 : 1);
  }
  return { bodies: [...bodies].map(([c, d]) => ({ c, d })), roofs, trees, ...o };
}

function Twinkle({ children, ms, delay }: { children: any; ms: number; delay: number }) {
  const rm = !!useReducedMotion(), v = useSharedValue(1);
  useEffect(() => { if (rm) return; v.value = withDelay(delay, withRepeat(withSequence(withTiming(0.12, { duration: ms * 0.5, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: ms * 0.5, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: ms * 0.6 })), -1, false)); return () => cancelAnimation(v) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, st]}>{children}</Animated.View>;
}
function Blink({ x, y }: { x: number; y: number }) {
  const rm = !!useReducedMotion(), v = useSharedValue(1);
  useEffect(() => { if (rm) return; v.value = withDelay((x * 37) % 1400, withRepeat(withSequence(withTiming(0.15, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false)); return () => cancelAnimation(v) }, [rm]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 2, top: y - 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF4D4D' }, st]} />;
}

const LayerTile = memo(function LayerTile({ W, h, L, night, tree }: { W: number; h: number; L: Layer; night: boolean; tree?: boolean }) {
  const g = useMemo(() => build(W, h, L, night, !!tree), [W, h, L, night, tree]);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glass = night ? mix('#1B2A88', '#050B3A', L.haze) : mix('#2C4A5E', '#FFFFFF', L.haze * 0.7);
  return (
    <View style={{ width: W, height: h }}>
      <Svg width={W} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <ClipPath id={`c${id}`}><Path d={g.all} /></ClipPath>
          <SG id={`v${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={night ? '#5C7CFF' : '#FFF4D0'} stopOpacity={night ? 0.22 : 0.34} />
            <Stop offset="0.55" stopColor={night ? '#1B2A88' : '#FFFFFF'} stopOpacity={0} />
            <Stop offset="1" stopColor={night ? '#FF9A4A' : '#7A3A1E'} stopOpacity={night ? 0.3 : 0.2} />
          </SG>
        </Defs>
        {g.bodies.map((b, i) => <Path key={i} d={b.d} fill={b.c} />)}
        <Path d={g.shade} fill={night ? '#000A3A' : '#5A2A14'} opacity={night ? 0.34 : 0.13} />
        <Path d={g.grainD} fill={night ? '#000820' : '#3A1A0E'} opacity={0.18} />
        <Path d={g.grainL} fill={night ? '#6C86FF' : '#FFFFFF'} opacity={night ? 0.14 : 0.32} />
        <Path d={g.ledge} fill={night ? '#050B3A' : '#4A2A1C'} opacity={night ? 0.5 : 0.2} />
        <Path d={g.lightEdge} fill={night ? '#7C93FF' : '#FFFFFF'} opacity={night ? 0.5 : 0.55} />
        <Path d={g.parapet} fill={night ? '#16208A' : '#4A3A34'} opacity={night ? 0.9 : 0.5} />
        <Path d={g.tops} fill={night ? '#26308F' : '#6D5B52'} />
        {g.frames ? <Path d={g.frames} fill="#FFF3DC" opacity={0.7} /> : null}
        <Path d={g.glass} fill={glass} opacity={night ? 0.92 : 0.86} />
        {g.glass2 ? <Path d={g.glass2} fill={mix('#BFE3F2', '#FFFFFF', L.haze)} opacity={0.95} /> : null}
        {g.balc ? <Path d={g.balc} fill={night ? '#0A1250' : '#3A2A26'} opacity={0.75} /> : null}
        {g.ac ? <Path d={g.ac} fill={night ? '#3C4BB0' : '#B9BDC4'} /> : null}
        {night ? <>
          <Path d={g.glow} fill="#FFB84A" opacity={0.2} />
          <Path d={g.litS} fill="#FFD36A" />
          {g.neon ? <><Path d={g.neon} fill="#5CC4FF" opacity={0.28} transform="translate(-0.9 0)" /><Path d={g.neon} fill="#9BE0FF" /></> : null}
        </> : null}
        <Rect x={0} y={0} width={W} height={h} fill={`url(#v${id})`} clipPath={`url(#c${id})`} />
        {g.trees.map((t, i) => <G key={i}>
          <Circle cx={t.x} cy={t.y - t.r * 0.5} r={t.r} fill={night ? '#0B3A3A' : i % 2 ? '#4F8A3A' : '#6E9C3C'} />
          <Circle cx={t.x - t.r * 0.35} cy={t.y - t.r * 0.8} r={t.r * 0.55} fill={night ? '#145050' : '#9DBB4E'} opacity={0.9} />
          <Circle cx={t.x + t.r * 0.45} cy={t.y - t.r * 0.3} r={t.r * 0.45} fill={night ? '#082C30' : '#3F7433'} opacity={0.8} />
        </G>)}
      </Svg>
      {night ? <>
        <Twinkle ms={2600} delay={0}><Svg width={W} height={h}><Path d={g.litA} fill="#FFC24A" /></Svg></Twinkle>
        <Twinkle ms={3400} delay={900}><Svg width={W} height={h}><Path d={g.litB} fill="#8FD3FF" /></Svg></Twinkle>
        {L.step > 8 ? g.roofs.map((p, i) => <Blink key={i} x={p.x} y={p.y} />) : null}
      </> : null}
    </View>
  );
});

/** a layer that scrolls left forever: two copies of the tile side by side */
function Scroller({ W, h, ms, children }: { W: number; h: number; ms: number; children: any }) {
  const rm = !!useReducedMotion(), p = useSharedValue(0);
  useEffect(() => { if (rm) return; p.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false); return () => cancelAnimation(p) }, [rm, ms]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -p.value * W }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row', width: W * 2, height: h }, st]}>{children}{children}</Animated.View>
    </View>
  );
}

function Hill({ W, h, night }: { W: number; h: number; night: boolean }) {
  // one wide wooded hill with a rocky ridge and thousands of leaves' worth of texture; ends level so the tile joins up
  const d = `M0 ${h} L0 ${h * 0.7} C${W * 0.1} ${h * 0.62} ${W * 0.2} ${h * 0.3} ${W * 0.36} ${h * 0.16} C${W * 0.42} ${h * 0.1} ${W * 0.5} ${h * 0.08} ${W * 0.56} ${h * 0.2} C${W * 0.7} ${h * 0.42} ${W * 0.86} ${h * 0.58} ${W} ${h * 0.7} L${W} ${h} Z`;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const leaves = useMemo(() => {
    const r = rng(77); let dark = '', light = '';
    for (let i = 0; i < 260; i++) { const x = r() * W, y = h * (0.14 + r() * 0.8), edge = h * 0.7 - Math.abs(x - W * 0.46) * 0.5; if (y < edge - h * 0.2) continue; const rr = 1.6 + r() * 2.6; const c = `M${x - rr} ${y}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0z`; if (r() < 0.5) dark += c; else light += c }
    return { dark, light };
  }, [W, h]);
  return (
    <Svg width={W} height={h}>
      <Defs><ClipPath id={`h${id}`}><Path d={d} /></ClipPath>
        <SG id={`hg${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={night ? '#2A3FB8' : '#9DC9A6'} /><Stop offset="1" stopColor={night ? '#08124F' : '#4F8A68'} /></SG></Defs>
      <Path d={d} fill={`url(#hg${id})`} />
      <G clipPath={`url(#h${id})`}>
        <Path d={leaves.dark} fill={night ? '#050C3A' : '#2F6B4C'} opacity={0.5} />
        <Path d={leaves.light} fill={night ? '#3A55D0' : '#B7DDA8'} opacity={night ? 0.25 : 0.55} />
        <Path d={`M${W * 0.3} ${h * 0.3} L${W * 0.36} ${h * 0.16} L${W * 0.46} ${h * 0.14} L${W * 0.52} ${h * 0.3} L${W * 0.42} ${h * 0.26}Z`} fill={night ? '#3F5BE0' : '#D9E7C9'} opacity={0.55} />
        <Path d={`M${W * 0.36} ${h * 0.16} L${W * 0.4} ${h * 0.42} M${W * 0.46} ${h * 0.14} L${W * 0.44} ${h * 0.38} M${W * 0.52} ${h * 0.2} L${W * 0.5} ${h * 0.36}`} stroke={night ? '#050C3A' : '#35604A'} strokeWidth={1.2} opacity={0.5} />
      </G>
    </Svg>
  );
}

function Cloud({ x, y, s, night }: { x: number; y: number; s: number; night: boolean }) {
  const f = night ? '#2B3FA8' : '#FFF6DE', sh = night ? '#1B2A88' : '#F0D9AC';
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Circle cx={0} cy={6} r={12} fill={sh} /><Circle cx={18} cy={0} r={17} fill={sh} /><Circle cx={40} cy={6} r={13} fill={sh} /><Rect x={-12} y={6} width={64} height={12} rx={6} fill={sh} />
      <Circle cx={0} cy={3} r={11} fill={f} /><Circle cx={18} cy={-4} r={16} fill={f} /><Circle cx={38} cy={2} r={12} fill={f} /><Rect x={-11} y={3} width={62} height={10} rx={5} fill={f} />
      <Circle cx={14} cy={-8} r={6} fill="#FFFFFF" opacity={night ? 0.12 : 0.7} />
    </G>
  );
}
function Birds({ W, h }: { W: number; h: number }) {
  const rm = !!useReducedMotion(), p = useSharedValue(0), f = useSharedValue(0);
  useEffect(() => { if (rm) return; p.value = withRepeat(withTiming(1, { duration: 36000, easing: Easing.linear }), -1, false); f.value = withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })), -1, false); return () => { cancelAnimation(p); cancelAnimation(f) } }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -40 + p.value * (W + 80) }, { translateY: Math.sin(p.value * 6.28) * 6 }] }));
  const wing = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.55 + f.value * 0.7 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: h * 0.32 }, st]}>
      {[[0, 0, 1], [16, 9, 0.8], [30, -4, 0.7]].map(([x, y, sc], i) => (
        <Animated.View key={i} style={[{ position: 'absolute', left: x, top: y }, wing]}><Svg width={14 * sc} height={7 * sc} viewBox="0 0 14 7"><Path d="M0 6 Q4 -1 7 4 Q10 -1 14 6" stroke="#4B3A6B" strokeWidth={1.4} fill="none" strokeLinecap="round" /></Svg></Animated.View>
      ))}
    </Animated.View>
  );
}
function DriftClouds({ W, h, night }: { W: number; h: number; night: boolean }) {
  const rm = !!useReducedMotion(), p = useSharedValue(0);
  useEffect(() => { if (rm) return; p.value = withRepeat(withTiming(1, { duration: 140000, easing: Easing.linear }), -1, false); return () => cancelAnimation(p) }, [rm]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -p.value * W }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: h, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row', width: W * 2, height: h }, st]}>
        {[0, 1].map(k => <Svg key={k} width={W} height={h}><Cloud x={W * 0.04} y={h * 0.62} s={1.0} night={night} /><Cloud x={W * 0.66} y={h * 0.5} s={0.8} night={night} /><Cloud x={W * 0.38} y={h * 0.78} s={0.6} night={night} /></Svg>)}
      </Animated.View>
    </View>
  );
}

const FAR: Layer = { seed: 5, minW: 22, maxW: 38, minH: 0.34, maxH: 0.74, haze: 0.42, step: 9, lit: 0.34, detail: 0 };
const MID: Layer = { seed: 17, minW: 26, maxW: 44, minH: 0.3, maxH: 0.66, haze: 0.1, step: 8, lit: 0.58, detail: 1 };
const NEAR: Layer = { seed: 41, minW: 30, maxW: 52, minH: 0.16, maxH: 0.36, haze: 0, step: 8, lit: 0.62, detail: 2 };

/** The whole skyline, filling `W x h` and standing on the bottom edge. */
export function CityScape({ W, h, night }: { W: number; h: number; night: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h }}>
      {/* sun glow behind the towers by day; the warm city glow on the horizon by night */}
      <Svg width={W} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <RadialGradient id={`s${id}`} cx="0.78" cy="0.42" rx="0.46" ry="0.4"><Stop offset="0" stopColor={night ? '#7C93FF' : '#FFE9A8'} stopOpacity={night ? 0.25 : 0.75} /><Stop offset="1" stopColor={night ? '#7C93FF' : '#FFE9A8'} stopOpacity={0} /></RadialGradient>
          <SG id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FF9A4A" stopOpacity={0} /><Stop offset="1" stopColor="#FF9A4A" stopOpacity={night ? 0.42 : 0.12} /></SG>
        </Defs>
        <Rect x={0} y={0} width={W} height={h} fill={`url(#s${id})`} />
        <Rect x={0} y={h * 0.45} width={W} height={h * 0.55} fill={`url(#g${id})`} />
      </Svg>
      <DriftClouds W={W} h={h * 0.55} night={night} />
      {night ? null : <Birds W={W} h={h} />}
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h * 0.8, opacity: night ? 0.95 : 0.9 }}><Hill W={W} h={h * 0.8} night={night} /></View>
      <Scroller W={W} h={h * 0.86} ms={110000}><LayerTile W={W} h={h * 0.86} L={FAR} night={night} /></Scroller>
      {/* haze between the far and the middle rows gives the depth of the reference */}
      <Svg width={W} height={h * 0.7} style={{ position: 'absolute', left: 0, bottom: 0 }}>
        <Defs><SG id={`f${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={night ? '#2B3FA8' : '#FFFFFF'} stopOpacity={0} /><Stop offset="1" stopColor={night ? '#2B3FA8' : '#FFF6E6'} stopOpacity={night ? 0.3 : 0.4} /></SG></Defs>
        <Rect x={0} y={0} width={W} height={h * 0.7} fill={`url(#f${id})`} />
      </Svg>
      <Scroller W={W} h={h * 0.7} ms={70000}><LayerTile W={W} h={h * 0.7} L={MID} night={night} /></Scroller>
      <Scroller W={W} h={h * 0.4} ms={42000}><LayerTile W={W} h={h * 0.4} L={NEAR} night={night} tree /></Scroller>
    </View>
  );
}

/** twinkling stars + a glowing moon for the night sky */
export function NightSky({ W, h }: { W: number; h: number }) {
  const stars = useMemo(() => { const r = rng(9); return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * h * 0.78, s: 1 + r() * 1.6, big: r() < 0.12 })) }, [W, h]);
  const cl = useMemo(() => [[0.06, 0.58, 0.9], [0.66, 0.5, 1.1], [0.36, 0.7, 0.7]], []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: h }}>
      <Svg width={W} height={h}>
        <Defs><RadialGradient id="moonG" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor="#FFF3C4" stopOpacity={0.55} /><Stop offset="1" stopColor="#FFF3C4" stopOpacity={0} /></RadialGradient></Defs>
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.s * 0.6} fill="#FFFFFF" opacity={0.55} />)}
        {cl.map(([x, y, sc], i) => <Cloud key={i} x={W * x} y={h * y} s={sc} night />)}
        <Circle cx={W * 0.82} cy={h * 0.32} r={46} fill="url(#moonG)" />
        <Circle cx={W * 0.82} cy={h * 0.32} r={15} fill="#FFF3C4" />
        <Circle cx={W * 0.82 + 5} cy={h * 0.32 - 3} r={13} fill="#E9D9A0" opacity={0.0} />
        <Circle cx={W * 0.82 - 4} cy={h * 0.32 + 3} r={2.6} fill="#E6D492" opacity={0.7} /><Circle cx={W * 0.82 + 3} cy={h * 0.32 - 4} r={1.8} fill="#E6D492" opacity={0.6} />
      </Svg>
      {stars.filter(s => s.big).map((s, i) => <Twinkle key={i} ms={1800 + i * 300} delay={i * 260}><Svg width={W} height={h}><Path d={`M${s.x} ${s.y - 4}L${s.x + 1} ${s.y - 1}L${s.x + 4} ${s.y}L${s.x + 1} ${s.y + 1}L${s.x} ${s.y + 4}L${s.x - 1} ${s.y + 1}L${s.x - 4} ${s.y}L${s.x - 1} ${s.y - 1}Z`} fill="#FFFFFF" /></Svg></Twinkle>)}
    </View>
  );
}
