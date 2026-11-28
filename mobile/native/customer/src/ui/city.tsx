/* The city behind the Home hero. By day it is a warm, coloured skyline (red and orange towers, cream blocks, a green hill, trees);
   from 6 pm to 6 am the sky goes deep blue with stars and every tower lights up its windows, a few of them flickering like a real city.
   Everything is drawn in one SVG path per colour, so it stays light on the phone. The tiles scroll slowly for a lively feel. */
import { memo, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SG, Path, Rect, Stop } from 'react-native-svg';
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

type Layer = { seed: number; minW: number; maxW: number; minH: number; maxH: number; haze: number; step: number; lit: number };
type Gen = { bodies: { c: string; d: string }[]; shade: string; glass: string; glass2: string; lit: string[]; litA: string; litB: string; roofs: { x: number; y: number }[]; tops: string; trees: { x: number; y: number; r: number }[] };

function build(W: number, h: number, L: Layer, night: boolean, tree: boolean): Gen {
  const r = rng(L.seed), walls = night ? NIGHT_WALLS : DAY_WALLS;
  const bodies = new Map<string, string>();
  const add = (c: string, d: string) => bodies.set(c, (bodies.get(c) || '') + d);
  let shade = '', glass = '', glass2 = '', litS = '', litA = '', litB = '', tops = '';
  const roofs: { x: number; y: number }[] = [], trees: { x: number; y: number; r: number }[] = [];
  let x = -4;
  while (x < W) {
    const w = Math.round(L.minW + r() * (L.maxW - L.minW)), bh = Math.round(h * (L.minH + r() * (L.maxH - L.minH))), y = h - bh;
    const raw = walls[Math.floor(r() * walls.length)], c = mix(raw, night ? '#050B3A' : '#FFFFFF', L.haze), style = r();
    const rect = (rx: number, ry: number, rw: number, rh: number) => `M${rx} ${ry}h${rw}v${rh}h${-rw}z`;
    add(c, rect(x, y, w, bh));
    shade += rect(x + w * 0.74, y, w * 0.26, bh);
    let topY = y, bx = x, bw = w;
    if (style < 0.3 && bh > h * 0.45) {            // stepped crown
      const cw = Math.round(w * 0.62), ch = Math.round(bh * 0.14);
      add(c, rect(x + (w - cw) / 2, y - ch, cw, ch)); shade += rect(x + (w - cw) / 2 + cw * 0.74, y - ch, cw * 0.26, ch);
      topY = y - ch; bx = x + (w - cw) / 2; bw = cw;
      if (r() < 0.6) { tops += rect(bx + bw / 2 - 0.9, topY - 16, 1.8, 16); roofs.push({ x: bx + bw / 2, y: topY - 17 }) }
    } else if (style < 0.5) {                      // water tank / roof house
      const tw = Math.round(w * 0.3); add(c, rect(x + w * 0.2, y - 6, tw, 6)); topY = y - 6;
    } else if (style < 0.62 && bh > h * 0.5) {     // tall mast
      tops += rect(x + w / 2 - 0.9, y - 22, 1.8, 22); roofs.push({ x: x + w / 2, y: y - 23 });
    }
    // windows
    const cols = Math.max(1, Math.floor((w - 6) / L.step)), rows = Math.max(0, Math.floor((bh - 8) / (L.step + 3)));
    const offx = x + (w - cols * L.step + (L.step - 3.6)) / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const wx = offx + i * L.step, wy = y + 6 + j * (L.step + 3), rr = r(), box = rect(wx, wy, 3.6, 5.2);
      if (night) { if (rr < L.lit) { const g = r(); if (g < 0.68) litS += box; else if (g < 0.84) litA += box; else litB += box } else glass += box }
      else { if (rr < 0.16) glass2 += box; else glass += box }
    }
    if (tree && r() < 0.7) trees.push({ x: x + w * (0.1 + r() * 0.8), y: h - 3, r: 6 + r() * 5 });
    x += w + (r() < 0.25 ? 3 : 1);
  }
  return { bodies: [...bodies].map(([c, d]) => ({ c, d })), shade, glass, glass2, lit: [litS], litA, litB, roofs, tops, trees };
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
  const glass = night ? mix('#1B2A88', '#050B3A', L.haze) : mix('#2C4A5E', '#FFFFFF', L.haze * 0.7);
  return (
    <View style={{ width: W, height: h }}>
      <Svg width={W} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
        {g.bodies.map((b, i) => <Path key={i} d={b.d} fill={b.c} />)}
        <Path d={g.shade} fill={night ? '#000A3A' : '#5A2A14'} opacity={night ? 0.32 : 0.1} />
        <Path d={g.tops} fill={night ? '#26308F' : '#6D5B52'} />
        <Path d={g.glass} fill={glass} opacity={night ? 0.9 : 0.78} />
        {g.glass2 ? <Path d={g.glass2} fill={mix('#BFE3F2', '#FFFFFF', L.haze)} opacity={0.9} /> : null}
        {night ? <Path d={g.lit[0]} fill="#FFD36A" /> : null}
        {g.trees.map((t, i) => <Circle key={i} cx={t.x} cy={t.y - t.r * 0.5} r={t.r} fill={i % 2 ? '#5E8F3E' : '#7BA146'} />)}
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
  // one wide green hill with a rocky ridge, ends level so the tile joins up
  const d = `M0 ${h} L0 ${h * 0.7} C${W * 0.1} ${h * 0.62} ${W * 0.2} ${h * 0.3} ${W * 0.36} ${h * 0.16} C${W * 0.42} ${h * 0.1} ${W * 0.5} ${h * 0.08} ${W * 0.56} ${h * 0.2} C${W * 0.7} ${h * 0.42} ${W * 0.86} ${h * 0.58} ${W} ${h * 0.7} L${W} ${h} Z`;
  return (
    <Svg width={W} height={h}>
      <Path d={d} fill={night ? '#08124F' : '#6FA383'} />
      <Path d={`M${W * 0.3} ${h * 0.3} L${W * 0.36} ${h * 0.16} L${W * 0.46} ${h * 0.14} L${W * 0.52} ${h * 0.3} L${W * 0.42} ${h * 0.26}Z`} fill={night ? '#0B1A6C' : '#9FBFB3'} opacity={0.8} />
    </Svg>
  );
}

const FAR: Layer = { seed: 5, minW: 22, maxW: 38, minH: 0.34, maxH: 0.74, haze: 0.42, step: 9, lit: 0.34 };
const MID: Layer = { seed: 17, minW: 26, maxW: 44, minH: 0.3, maxH: 0.66, haze: 0.1, step: 8, lit: 0.58 };
const NEAR: Layer = { seed: 41, minW: 30, maxW: 52, minH: 0.16, maxH: 0.36, haze: 0, step: 8, lit: 0.62 };

/** The whole skyline, filling `W x h` and standing on the bottom edge. */
export function CityScape({ W, h, night }: { W: number; h: number; night: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h }}>
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: h * 0.8, opacity: night ? 0.9 : 0.75 }}><Hill W={W} h={h * 0.8} night={night} /></View>
      <Scroller W={W} h={h * 0.86} ms={110000}><LayerTile W={W} h={h * 0.86} L={FAR} night={night} /></Scroller>
      <Scroller W={W} h={h * 0.7} ms={70000}><LayerTile W={W} h={h * 0.7} L={MID} night={night} /></Scroller>
      <Scroller W={W} h={h * 0.4} ms={42000}><LayerTile W={W} h={h * 0.4} L={NEAR} night={night} tree /></Scroller>
    </View>
  );
}

/** twinkling stars + a soft moon for the night sky */
export function NightSky({ W, h }: { W: number; h: number }) {
  const stars = useMemo(() => { const r = rng(9); return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * h * 0.7, s: 1 + r() * 1.6, big: r() < 0.14 })) }, [W, h]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: h }}>
      <Svg width={W} height={h}>
        <Defs><SG id="moon" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF6D6" /><Stop offset="1" stopColor="#FFE7A1" /></SG></Defs>
        {stars.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.s * 0.6} fill="#FFFFFF" opacity={0.55} />)}
      </Svg>
      {stars.filter(s => s.big).map((s, i) => <Twinkle key={i} ms={1800 + i * 300} delay={i * 260}><Svg width={W} height={h}><Path d={`M${s.x} ${s.y - 4}L${s.x + 1} ${s.y - 1}L${s.x + 4} ${s.y}L${s.x + 1} ${s.y + 1}L${s.x} ${s.y + 4}L${s.x - 1} ${s.y + 1}L${s.x - 4} ${s.y}L${s.x - 1} ${s.y - 1}Z`} fill="#FFFFFF" /></Svg></Twinkle>)}
    </View>
  );
}
