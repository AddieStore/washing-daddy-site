// Store tab: header with cart, perfume banner, delivery strip, category chips, two-column product grid.
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import { C } from '../theme';
import { Page, Txt } from '../ui/kit';
import { Cart, Plus, Check } from '../ui/icons';
import { Art } from '../ui/art';
import { P, Light, PCard, PChips, PTop, PIconBtn } from '../ui/pr';
import { PRODUCTS, CATS, Product } from '../data/reference';
import { inr } from '../data/dates';
import { src } from '../img';
import { car, cartCount, pName, act, useApp } from '../state';
import { sheets } from '../sheets';

const NUM = { fontVariant: ['tabular-nums'] } as const;

function Banner() {
  return (
    <Pressable onPress={() => sheets.product('perfume')} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: P.line, minHeight: 152, overflow: 'hidden', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13} color={P.muted}>New in the store</Txt>
          <Txt weight={500} size={18} color={P.ink} style={{ marginTop: 4, lineHeight: 24 }}>Daddy's Own Car Perfume</Txt>
          <Txt size={13} color={P.grey} style={{ marginTop: 4, lineHeight: 18 }}>Oud and vetiver, made for Delhi heat. Free with WD Exclusive.</Txt>
          <View style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: C.violet, borderRadius: 10, paddingHorizontal: 16, height: 40, justifyContent: 'center' }}><Txt weight={500} size={14} color="#FFFFFF" style={NUM}>Shop {inr(499)}</Txt></View>
        </View>
        <View style={{ width: 120, height: 120, borderRadius: 6, backgroundColor: P.raised, alignItems: 'center', justifyContent: 'center' }}><Art kind="perfume" c={['#FFBA08', '#FF6A1A']} size={100} /></View>
      </View>
    </Pressable>
  );
}

function Prod({ p, wide, cw }: { p: Product; wide: boolean; cw: number }) {
  const cc = car(), w = wide ? Math.min(144, cw * 0.4) : (cw - 12) / 2 - 16;
  const art = (
    <View style={{ width: wide ? w : undefined, aspectRatio: 1, borderRadius: 6, backgroundColor: P.raised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {w > 0 ? <Art kind={p.art} c={p.c} size={Math.max(60, w) * 0.78} /> : null}
      <Pressable accessibilityLabel={`Add ${p.name} to cart`} onPress={() => act.addToCart(p.id)} hitSlop={6}
        style={{ position: 'absolute', right: 8, bottom: 8, width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={18} color={C.violet} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
  const info = (
    <View style={{ minWidth: 0, flex: wide ? 1 : undefined, marginTop: wide ? 0 : 12, paddingHorizontal: 4, paddingBottom: wide ? 0 : 4 }}>
      <Txt weight={500} size={wide ? 15 : 14} color={P.ink} style={{ lineHeight: wide ? 20 : 20, minHeight: wide ? 0 : 40 }} numberOfLines={2}>{pName(p)}</Txt>
      {p.fit ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}><Check size={14} color={P.ok} strokeWidth={1.5} /><Txt size={12} color={P.ok}>Fits your {cc.name}</Txt></View> : null}
      {wide ? <Txt size={13} color={P.grey} style={{ marginTop: 4, lineHeight: 18 }} numberOfLines={3}>{p.desc}</Txt> : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <Txt weight={500} size={15} color={P.ink} style={NUM}>{inr(p.price)}</Txt>
        <Txt size={12} color={P.muted} style={[{ textDecorationLine: 'line-through' }, NUM]}>{inr(p.mrp)}</Txt>
      </View>
    </View>
  );
  return (
    <PCard pad={8} style={{ flex: 1, minWidth: 0 }} onPress={() => sheets.product(p.id)}>
      <View style={wide ? { flexDirection: 'row', alignItems: 'center', gap: 16 } : undefined}>{art}{info}</View>
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
        header={<PTop title="Store" sub="Gear for a car that's washed daily" right={<PIconBtn label="Cart" badge={n} onPress={() => sheets.cart()}><Cart size={18} color={P.grey} strokeWidth={1.5} /></PIconBtn>} />}>
        <Banner />
        <PCard style={{ marginTop: 12 }} pad={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: P.raised }}><Image source={src('washer')!} style={{ width: 44, height: 44 }} resizeMode="cover" /></View>
            <View style={{ flex: 1 }}>
              <Txt weight={500} size={14} color={P.ink}>Your washer brings it with tomorrow's wash</Txt>
              <Txt size={13} color={P.muted}>Order before 9 PM. Free delivery to your car.</Txt>
            </View>
          </View>
        </PCard>
        <View style={{ marginTop: 32 }}><PChips scroll items={CATS} value={cat} onChange={setCat} /></View>
        <View onLayout={e => setCw(e.nativeEvent.layout.width)}>
          {cw > 0 && rows.map(r => (
            <View key={r.map(p => p.id).join()} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {r.map(p => <Prod key={p.id} p={p} wide={r.length === 1 && !!p.wide && cat === 'All'} cw={cw} />)}
              {r.length === 1 && !(r[0].wide && cat === 'All') ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      </Page>
    </Light>
  );
}
