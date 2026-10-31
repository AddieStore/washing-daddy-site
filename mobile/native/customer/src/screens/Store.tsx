// Store tab: Drop 01 hero, deliver strip, category chips, product grid. Ported from renderStore/card in the web app.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, ScrollView, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { C, InkContext, SP, R as RAD } from '../theme';
import { Page, Topbar, IconBtn, Eyebrow, BigTitle, Em, Txt, Card, Btn, Hard, Gap, PAD, useTheme } from '../ui/kit';
import { Cart, Plus } from '../ui/icons';
import { Art } from '../ui/art';
import { PRODUCTS, CATS, Product } from '../data/reference';
import { inr } from '../data/dates';
import { src } from '../img';
import { car, cartCount, pName, act, useApp } from '../state';
import { sheets } from '../sheets';

// conic-gradient rays around a point, drawn as wedges on a big square that turns slowly
const R = 700;
function Rays({ cx, cy }: { cx: number; cy: number }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(r, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, []);
  const d = Array.from({ length: 20 }, (_, i) => { const a = i * 18 * Math.PI / 180, b = (i * 18 + 6) * Math.PI / 180; return `M${R} ${R}L${R + R * 1.5 * Math.cos(a)} ${R + R * 1.5 * Math.sin(a)}L${R + R * 1.5 * Math.cos(b)} ${R + R * 1.5 * Math.sin(b)}Z`; }).join('');
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, transform: [{ rotate: r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={2 * R} height={2 * R}><Path d={d} fill="rgba(255,246,233,.07)" /></Svg>
    </Animated.View>
  );
}

function Hero() {
  const T = useTheme(), [w, setW] = useState(0), h = 330, fl = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(fl, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(fl, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])); l.start(); return () => l.stop(); }, []);
  const art = w * 0.46;
  return (
    <Hard dx={8} dy={8} radius={24} style={{ marginTop: SP.l }}>
      <InkContext.Provider value={T.block}>
        <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ minHeight: h, borderRadius: 24, overflow: 'hidden', backgroundColor: T.day ? C.violetDeep : C.violet2, borderWidth: T.day ? 12 : 1, borderColor: T.day ? C.gold : T.blockBorder }}>
          <Rays cx={w * 0.78} cy={h * 0.6} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -18, bottom: -10, transform: [{ translateY: fl.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }, { rotate: fl.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-3deg'] }) }] }}>
            {w ? <Art kind="perfume" c={['#FFBA08', '#FF6A1A']} size={art} /> : null}
          </Animated.View>
          <View style={{ padding: SP.card, paddingBottom: 0, maxWidth: '60%' }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Txt weight={800} size={11} upper color={C.ink} style={{ letterSpacing: 1.3 }}>Drop 01</Txt>
            </View>
            <Txt font="shout" size={40} upper style={{ marginTop: SP.m, marginBottom: SP.s }}>Daddy's Own Car Perfume</Txt>
            <Txt size={13} color={T.block.fg2}>Oud and vetiver, made for Delhi heat. Free with WD Exclusive.</Txt>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ margin: SP.card }}><Btn full={false} label="Shop ₹499" onPress={() => sheets.product('perfume')} /></View>
        </View>
      </InkContext.Provider>
    </Hard>
  );
}

function Cats({ cat, setCat }: { cat: string; setCat: (c: string) => void }) {
  const T = useTheme(), box = useRef<Record<string, { x: number; w: number }>>({}).current;
  const x = useRef(new Animated.Value(0)).current, w = useRef(new Animated.Value(0)).current, shown = useRef(false);
  const move = (c: string) => {
    const b = box[c]; if (!b) return;
    if (!shown.current) { x.setValue(b.x); w.setValue(b.w); shown.current = true; return }
    Animated.spring(x, { toValue: b.x, useNativeDriver: false, friction: 8, tension: 120 }).start();
    Animated.spring(w, { toValue: b.w, useNativeDriver: false, friction: 8, tension: 120 }).start();
  };
  useEffect(() => { move(cat); }, [cat]);
  const edge = T.day ? C.cream : 'rgba(255,246,233,.3)';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -PAD, marginTop: SP.xl }} contentContainerStyle={{ paddingHorizontal: PAD, paddingVertical: SP.hair }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: w, borderRadius: 999, backgroundColor: C.gold, borderWidth: T.day ? 2.5 : 1.5, borderColor: T.day ? C.ink : C.gold }} />
        {CATS.map(c => (
          <Pressable key={c} role="tab" aria-selected={c === cat} onPress={() => setCat(c)}
            onLayout={e => { box[c] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }; if (c === cat) move(c); }}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: SP.l, borderRadius: 999, borderWidth: T.day ? 2.5 : 1.5, borderColor: c === cat ? 'transparent' : edge }}>
            <Txt weight={600} size={13.5} color={c === cat ? C.ink : C.cream}>{c}</Txt>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Prod({ p, wide, cw }: { p: Product; wide: boolean; cw: number }) {
  const T = useTheme(), cc = car();
  const aw = wide ? (cw - 6 - 24 - 12) / 2.1 : (cw - 16) / 2 - 6 - 24;
  const art = (
    <LinearGradient colors={p.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: wide ? aw : undefined, aspectRatio: 1, borderRadius: RAD.inner + 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {p.tag ? <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: C.ink, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 }}><Txt weight={800} size={10.5} upper color={C.gold} style={{ letterSpacing: 0.8 }}>{p.tag}</Txt></View> : null}
      {aw > 0 ? <Art kind={p.art} c={p.c} size={aw * 0.78} /> : null}
    </LinearGradient>
  );
  const info = (
    <View style={{ minWidth: 0, flex: wide ? 1.1 : undefined }}>
      <Txt weight={600} size={wide ? 16 : 13} style={{ marginTop: wide ? 0 : SP.m, lineHeight: wide ? 20 : 16, minHeight: wide ? 0 : 32 }}>{pName(p)}</Txt>
      {p.fit ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SP.hair }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.card.ok }} /><Txt weight={700} size={10.5} color={T.card.ok}>Fits your {cc.name}</Txt></View> : null}
      {wide ? <Txt size={12.5} color={T.card.fg2} style={{ marginTop: SP.s }}>{p.desc}</Txt> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.s, gap: 6 }}>
        <Txt weight={800} size={15} style={{ flexShrink: 1 }}>{inr(p.price)}<Txt weight={500} size={11} color={T.card.fg3} style={{ textDecorationLine: 'line-through' }}>{'  ' + inr(p.mrp)}</Txt></Txt>
        <Pressable accessibilityLabel={`Add ${p.name} to cart`} onPress={() => act.addToCart(p.id)} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.violet, borderWidth: T.day ? 2.5 : 0, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} color={C.cream} />
        </Pressable>
      </View>
    </View>
  );
  return (
    <Card pad={12} style={{ flex: 1 }} onPress={() => sheets.product(p.id)} inner={wide ? { flexDirection: 'row', alignItems: 'center', gap: SP.m } : undefined}>
      {art}{info}
    </Card>
  );
}

export default function Store() {
  const { tabNonce } = useApp(), T = useTheme(), [cat, setCat] = useState('All'), [cw, setCw] = useState(0);
  const sc = useRef<any>(null), first = useRef(true), n = cartCount();
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat), rows: Product[][] = [];
  list.forEach(p => { const last = rows[rows.length - 1]; if (p.wide && cat === 'All') rows.push([p]); else if (last && last.length === 1 && !(last[0].wide && cat === 'All')) last.push(p); else rows.push([p]); });
  return (
    <Page {...({ ref: sc } as any)} header={<Topbar left={<Eyebrow>Daddy's store</Eyebrow>} right={<IconBtn label="Cart" badge={n} onPress={() => sheets.cart()}><Cart size={22} /></IconBtn>} />}>
      <BigTitle><>Gear for a car that's <Em>washed daily.</Em></></BigTitle>
      <Hero />
      <Card pad={SP.l} style={{ marginTop: SP.l }} inner={{ flexDirection: 'row', alignItems: 'center', gap: SP.m }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: C.violet }}><Image source={src('washer')!} style={{ width: 44, height: 44 }} resizeMode="cover" /></View>
        <View style={{ flex: 1 }}>
          <Txt weight={700} size={13.5}>Your washer brings it with tomorrow's wash</Txt>
          <Txt size={12} color={T.card.fg3}>Order before 9 PM. Free delivery to your car.</Txt>
        </View>
      </Card>
      <Cats cat={cat} setCat={setCat} />
      <Gap h={SP.m} />
      <View onLayout={e => setCw(e.nativeEvent.layout.width)}>
        {cw > 0 && rows.map((r, i) => (
          <View key={r.map(p => p.id).join()} style={{ flexDirection: 'row', gap: SP.l, marginBottom: SP.m }}>
            {r.map(p => <Prod key={p.id} p={p} wide={r.length === 1 && !!p.wide && cat === 'All'} cw={cw} />)}
            {r.length === 1 && !(r[0].wide && cat === 'All') ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </Page>
  );
}
