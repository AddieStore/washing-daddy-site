// Store tab (Pronto look): header with cart, Drop 01 banner, delivery strip, category chips, two-column product grid.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SP } from '../theme';
import { Page, Txt } from '../ui/kit';
import { Cart, Plus, Check } from '../ui/icons';
import { Art } from '../ui/art';
import { P, Light, PCard, PChips, PTop, PIconBtn } from '../ui/pr';
import { PRODUCTS, CATS, Product } from '../data/reference';
import { inr } from '../data/dates';
import { src } from '../img';
import { car, cartCount, pName, act, useApp } from '../state';
import { sheets } from '../sheets';

function Banner() {
  return (
    <Pressable onPress={() => sheets.product('perfume')}>
      <LinearGradient colors={[C.violet, '#7B3FF0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, minHeight: 150, overflow: 'hidden', padding: SP.card, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -6, bottom: -8 }}><Art kind="perfume" c={['#FFBA08', '#FF6A1A']} size={150} /></View>
        <View style={{ maxWidth: '62%' }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Txt weight={700} size={11} color={C.ink}>DROP 01</Txt></View>
          <Txt weight={700} size={21} color="#FFFFFF" style={{ marginTop: SP.s, lineHeight: 27, letterSpacing: -0.3 }}>Daddy's Own Car Perfume</Txt>
          <Txt size={12.5} color="rgba(255,255,255,.85)" style={{ marginTop: 4 }}>Oud and vetiver, made for Delhi heat. Free with WD Exclusive.</Txt>
          <View style={{ alignSelf: 'flex-start', marginTop: SP.m, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}><Txt weight={700} size={13.5} color={C.violet}>Shop ₹499</Txt></View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Prod({ p, wide, cw }: { p: Product; wide: boolean; cw: number }) {
  const cc = car(), w = wide ? Math.min(150, cw * 0.42) : (cw - SP.m) / 2 - 2 * SP.m;
  const art = (
    <LinearGradient colors={p.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: wide ? w : undefined, aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {p.tag ? <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Txt weight={700} size={10.5} color={C.violet}>{p.tag}</Txt></View> : null}
      {w > 0 ? <Art kind={p.art} c={p.c} size={Math.max(60, w) * 0.78} /> : null}
      <Pressable accessibilityLabel={`Add ${p.name} to cart`} onPress={() => act.addToCart(p.id)} hitSlop={6}
        style={{ position: 'absolute', right: 8, bottom: 8, width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={16} color={C.violet} />
      </Pressable>
    </LinearGradient>
  );
  const info = (
    <View style={{ minWidth: 0, flex: wide ? 1 : undefined, marginTop: wide ? 0 : SP.m }}>
      <Txt weight={600} size={wide ? 16 : 13.5} color={P.ink} style={{ lineHeight: wide ? 21 : 18, minHeight: wide ? 0 : 36 }} numberOfLines={2}>{pName(p)}</Txt>
      {p.fit ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}><Check size={11} color={P.ok} /><Txt weight={600} size={11} color={P.ok}>Fits your {cc.name}</Txt></View> : null}
      {wide ? <Txt size={12.5} color={P.grey} style={{ marginTop: 4 }} numberOfLines={3}>{p.desc}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <Txt weight={700} size={15} color={P.ink}>{inr(p.price)}</Txt>
        <Txt size={12} color={P.grey} style={{ textDecorationLine: 'line-through' }}>{inr(p.mrp)}</Txt>
      </View>
    </View>
  );
  return (
    <PCard pad={SP.m} style={{ flex: 1 }} onPress={() => sheets.product(p.id)}>
      <View style={wide ? { flexDirection: 'row', alignItems: 'center', gap: SP.l } : undefined}>{art}{info}</View>
    </PCard>
  );
}

export default function Store() {
  const { tabNonce } = useApp(), [cat, setCat] = useState('All'), [cw, setCw] = useState(0);
  const sc = useRef<any>(null), first = useRef(true), n = cartCount();
  useEffect(() => { if (first.current) { first.current = false; return } sc.current?.scrollTo({ y: 0, animated: true }); }, [tabNonce]);
  const list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat), rows: Product[][] = [];
  list.forEach(p => { const last = rows[rows.length - 1]; if (p.wide && cat === 'All') rows.push([p]); else if (last && last.length === 1 && !(last[0].wide && cat === 'All')) last.push(p); else rows.push([p]); });
  return (
    <Light>
      <Page {...({ ref: sc } as any)} style={{ backgroundColor: '#FFFFFF' }}
        header={<PTop title="Store" sub="Gear for a car that's washed daily" right={<PIconBtn label="Cart" badge={n} onPress={() => sheets.cart()}><Cart size={22} color={P.ink} /></PIconBtn>} />}>
        <Banner />
        <PCard tint style={{ marginTop: SP.l }} pad={SP.m}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.m }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: C.violet }}><Image source={src('washer')!} style={{ width: 44, height: 44 }} resizeMode="cover" /></View>
            <View style={{ flex: 1 }}>
              <Txt weight={700} size={13.5} color={P.ink}>Your washer brings it with tomorrow's wash</Txt>
              <Txt size={12} color={P.grey}>Order before 9 PM. Free delivery to your car.</Txt>
            </View>
          </View>
        </PCard>
        <View style={{ marginTop: SP.xl }}><PChips scroll items={CATS} value={cat} onChange={setCat} /></View>
        <View onLayout={e => setCw(e.nativeEvent.layout.width)}>
          {cw > 0 && rows.map(r => (
            <View key={r.map(p => p.id).join()} style={{ flexDirection: 'row', gap: SP.m, marginBottom: SP.m }}>
              {r.map(p => <Prod key={p.id} p={p} wide={r.length === 1 && !!p.wide && cat === 'All'} cw={cw} />)}
              {r.length === 1 && !(r[0].wide && cat === 'All') ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      </Page>
    </Light>
  );
}
