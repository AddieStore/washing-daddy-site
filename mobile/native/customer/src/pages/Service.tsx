// Service detail page (Pronto): parallax hero with back + share, title and rating, car-size variants with Add / stepper, frequently added
// together, "How is the service done", Included / Not included, FAQ accordion, trust block, sticky mini-cart bar. Skeleton while it "loads".
// Pressure-wash services show a small Before / After pair side by side.
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Pressable, Share, Image, Platform, useWindowDimensions } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Check, Close, Chev, Clock, Shield } from '../ui/icons';
import { IMG, RATIO } from '../img';
import { useApp, act, svcQty, svcOf, lineKey, closePage, openPage } from '../state';
import { CAR_SERVICES, PACKS, SHOW_RATINGS, TRUST, VARIANTS, variantPrice, packInfo, type VariantId } from '../data/reference';
import { Laurel } from '../ui/art2';
import { CartBar, Shimmer, useSkeleton, FadeUp } from '../ui/motion';
import { G, card, imgOf, BackCircle, ShareCircle, Price, Tap, TNUM, AddBtn } from './parts';
import { src } from '../img';

const ND = Platform.OS !== 'web';
const HERO_H = 300;
const GALLERY = ['ext', 'wash', 'under'];   // pressure-wash services: show the before / after pair

const FAQ_FOR = (name: string, pack: boolean): [string, string][] => [
  ['Do I need to be at the car?', 'No. Your washer comes to your parking spot. Leave the car where it is, and tell us about keys or gate access in the booking.'],
  ['Do you need water or power from my society?', 'No. Your washer brings a pressure unit and uses minimal water. If your society restricts water, we use a low-water method.'],
  ['Can I book this on repeat?', 'Yes. Choose the Recurring tab in your cart for a weekly or alternate-day plan at a lower price per wash.'],
  [pack ? 'What if I want to add more?' : `Is ${name} safe for my paint?`, pack ? 'You can add any service to the same visit. Your washer does them all in one go.' : 'Yes. We use pH-balanced products and clean microfibre, and never dry-wipe a dusty car.'],
  ['What if I am not happy?', 'Tell us from the Washes tab within 24 hours and we will redo it or refund you to WD Money.'],
];

function Skeleton() {
  return (
    <View>
      <Shimmer height={HERO_H} radius={0} />
      <View style={{ padding: 16, marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 }}>
        <Shimmer width={220} height={28} />
        <Shimmer width={120} height={16} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>{[0, 1, 2].map(i => <Shimmer key={i} height={120} radius={14} style={{ flex: 1 }} />)}</View>
        <Shimmer width={180} height={20} style={{ marginTop: 24 }} />
        {[0, 1, 2].map(i => <Shimmer key={i} height={48} radius={10} />)}
      </View>
    </View>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false), rot = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(rot, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: ND }).start() }, [open]);
  return (
    <View style={{ backgroundColor: G.raised, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(o => !o)} style={{ minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt weight={500} size={14} style={{ flex: 1, lineHeight: 20 }}>{q}</Txt>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '-90deg'] }) }] }}><Chev size={16} color={G.mute} strokeWidth={1.5} /></Animated.View>
      </Pressable>
      {open ? <FadeUp distance={4} duration={200}><Txt size={13} color={G.sub} style={{ paddingHorizontal: 16, paddingBottom: 16, lineHeight: 20 }}>{a}</Txt></FadeUp> : null}
    </View>
  );
}

function Variant({ id, v, base, w }: { id: string; v: (typeof VARIANTS)[number]; base: { price: number; mrp: number; mins: number }; w: number }) {
  const key = lineKey(id, v.id), q = svcQty(key), on = q > 0, p = variantPrice(base, v.id as VariantId);
  return (
    <View style={{ width: w, borderRadius: 14, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, backgroundColor: '#fff', padding: 10, alignItems: 'center', ...(on ? {} : {}) }}>
      <Txt weight={500} size={14} numberOfLines={1}>{v.label}</Txt>
      <Txt size={11} color={G.mute} numberOfLines={1} style={{ lineHeight: 15 }}>{p.mins} mins</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6, marginBottom: 10 }}>
        <Price v={p.price} size={14} />{p.mrp > p.price ? <Price v={p.mrp} size={11} weight={400} strike /> : null}
      </View>
      {on ? <AddBtn qty={q} onAdd={() => act.addLine(id, v.id as VariantId)} onSub={() => act.subLine(id, v.id as VariantId)} />
        : <Tap label={'Add ' + v.label} onPress={() => act.addLine(id, v.id as VariantId)} style={{ height: 36, alignSelf: 'stretch', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: G.raised }}><Txt weight={500} size={14} color={G.violet}>Add</Txt></Tap>}
      <Txt size={10} color={G.mute} numberOfLines={1} style={{ marginTop: 6, lineHeight: 14 }}>{v.sub.split(',')[0]}</Txt>
    </View>
  );
}

export default function Service({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), { width } = useWindowDimensions(), W = Math.min(width, 520), skel = useSkeleton(380);
  const y = useRef(new Animated.Value(0)).current;
  const sid = id || 'ext', svc = svcOf(sid), pack = packInfo(sid);
  const name = svc ? svc.name : pack ? pack.name : 'Wash';
  const rating = svc ? svc.rating : 4.9, count = svc ? svc.count : '24k';
  const blurb = svc ? svc.blurb : pack?.sub || '';
  const packDesc = (pack?.sub || '').split(/ \+ |, | and /).map(x => x.trim()).filter(Boolean);
  const steps: [string, string][] = svc ? svc.steps : packDesc.map(x => [x.charAt(0).toUpperCase() + x.slice(1), 'Done by your washer at your parking spot']);
  const included = svc ? svc.included : packDesc.map(x => x.charAt(0).toUpperCase() + x.slice(1));
  const excluded = svc ? svc.excluded : sid === 'exclusive' ? ['Paint correction'] : ['Engine bay', 'Ceramic coating'];
  const share = () => { Share.share({ message: `${name} at your car park from Washing Daddy. https://washingdaddy.com/` }).catch(() => {}) };
  const together = CAR_SERVICES.filter(s => s.id !== sid && (!svc || s.cat !== svc.cat || true)).slice(0, 6);
  const gallery = GALLERY.includes(sid);
  const vw = Math.floor((W - 32 - 16) / 3);
  const gw = Math.floor((W - 32 - 12) / 2 * 0.62);   // small: about 60% of half the page width

  const heroY = y.interpolate({ inputRange: [-HERO_H, 0, HERO_H], outputRange: [-HERO_H / 2, 0, HERO_H * 0.45], extrapolate: 'clamp' });
  const heroS = y.interpolate({ inputRange: [-HERO_H, 0], outputRange: [1.6, 1], extrapolate: 'clamp' });
  const bar = y.interpolate({ inputRange: [HERO_H - 120, HERO_H - 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const hasBar = true;
  const tint = svc?.tint || '#F3EEFD';
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: ND });
  const im = String(imgOf(sid)), r3d = im.startsWith('r3d');

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ paddingBottom: 140 }}>
        {skel ? <Skeleton /> : (
          <>
            <View style={{ height: HERO_H, overflow: 'hidden', backgroundColor: tint }}>
              <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: heroY }, { scale: heroS }] }}>
                <Image source={src(im) as any} resizeMode={r3d ? 'contain' : 'cover'} style={{ width: r3d ? W * 0.72 : '100%', height: r3d ? HERO_H * 0.82 : '100%', marginTop: r3d ? 24 : 0 }} />
              </Animated.View>
            </View>
            <View style={{ marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 24, paddingHorizontal: 16 }}>
              <Txt weight={500} size={24} style={{ lineHeight: 32 }}>{name}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {SHOW_RATINGS ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Txt weight={500} size={13} style={TNUM}>{'★ ' + rating.toFixed(1)}</Txt><Txt size={13} color={G.mute}>({count} ratings)</Txt></View> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={14} color={G.mute} strokeWidth={1.5} /><Txt size={13} color={G.mute}>{svc ? svc.mins + ' mins' : pack!.mins + ' mins'}</Txt></View>
              </View>
              <Txt size={14} color={G.sub} style={{ marginTop: 10, lineHeight: 20 }}>{blurb}</Txt>

              {gallery ? (
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {([['before', 'Before'], ['after', 'After']] as const).map(([k, l]) => (
                      <View key={k} style={{ width: gw }}>
                        <Image source={IMG[k]} resizeMode="cover" style={{ width: gw, height: gw * 0.75, borderRadius: 10, backgroundColor: G.raised }} accessibilityLabel={l + ' pressure wash'} />
                        <Txt size={11} color={G.mute} style={{ marginTop: 4, lineHeight: 14 }}>{l}</Txt>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <Txt weight={500} size={13} color={G.mute} style={{ marginTop: 28 }}>{pack ? 'Wash packs' : 'Select your car size'}</Txt>
              {svc ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {VARIANTS.map(v => <Variant key={v.id} id={sid} v={v} base={svc} w={vw} />)}
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {PACKS.map(pk => {
                    const p = packInfo(pk.id)!, q = svcQty(pk.id), on = q > 0;
                    return (
                      <View key={pk.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: on ? 1.5 : 1, borderColor: on ? G.violet : G.line, padding: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Txt weight={500} size={15}>{p.name}</Txt>
                          <Txt size={12} color={G.mute} style={{ marginTop: 2 }}>{p.mins >= 60 ? p.mins / 60 + (p.mins === 60 ? ' hour' : ' hours') : p.mins + ' mins'}</Txt>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}><Price v={p.price} size={14} />{p.mrp > p.price ? <Price v={p.mrp} size={12} weight={400} strike /> : null}</View>
                        </View>
                        {on ? <AddBtn size="lg" qty={q} onAdd={() => act.addSvc(pk.id)} onSub={() => act.subSvc(pk.id)} />
                          : <Tap label={'Add ' + p.name} onPress={() => act.addSvc(pk.id)} style={{ height: 40, width: 88, borderRadius: 10, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}><Txt weight={500} size={14} color={G.violet}>Add</Txt></Tap>}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 16 }}><Txt weight={500} size={18} style={{ marginTop: 32 }}>Frequently added together</Txt></View>
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
              {together.map(s => (
                <Pressable key={s.id} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ width: 128 }}>
                  <View pointerEvents="none" style={{ width: 128, height: 104, borderRadius: 14, backgroundColor: s.tint || G.raised, overflow: 'hidden' }}><Image source={src(s.img) as any} resizeMode="contain" style={{ width: '100%', height: '100%' }} /></View>
                  <View style={{ position: 'absolute', right: 8, top: 104 - 17 }}><AddBtn qty={svcQty(s.id)} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
                  <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 26, lineHeight: 18 }}>{s.short}</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}><Price v={s.price} size={14} /><Price v={s.mrp} size={12} weight={400} strike /></View>
                </Pressable>
              ))}
            </Animated.ScrollView>

            <View style={{ paddingHorizontal: 16 }}>
              <Txt weight={500} size={18} style={{ marginTop: 32 }}>How is the service done</Txt>
              <View style={{ marginTop: 16, gap: 16 }}>
                {steps.map(([t, s], i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                      <Txt weight={500} size={17} color={G.violet} style={TNUM}>{i + 1}</Txt>
                    </View>
                    <View style={{ flex: 1 }}><Txt weight={500} size={15}>{t}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 20 }}>{s}</Txt></View>
                  </View>
                ))}
              </View>

              <Txt weight={500} size={18} style={{ marginTop: 32 }}>Included in service</Txt>
              <View style={{ marginTop: 8 }}>
                {included.map(x => <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(22,163,74,.12)', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color={G.pos} strokeWidth={2} /></View><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></View>)}
              </View>
              <Txt weight={500} size={18} style={{ marginTop: 24 }}>Excluded from service</Txt>
              <View style={{ marginTop: 8 }}>
                {excluded.map(x => <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}><Close size={13} color={G.mute} strokeWidth={2} /></View><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></View>)}
              </View>

              <Txt weight={500} size={18} style={{ marginTop: 32, marginBottom: 12 }}>Frequently asked questions</Txt>
              {FAQ_FOR(name, !svc).map(([q, a]) => <Faq key={q} q={q} a={a} />)}

              <View style={{ marginTop: 32, alignItems: 'center' }}>
                <Txt weight={500} size={18} style={{ textAlign: 'center', lineHeight: 26 }}>Relax, your car is in professional hands</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <Laurel size={40} />
                  <View style={{ alignItems: 'center', maxWidth: 190 }}>
                    <Shield size={20} color={G.violet} strokeWidth={1.5} />
                    <Txt weight={500} size={14} style={{ marginTop: 4, textAlign: 'center' }}>{TRUST.cars ? `${TRUST.cars} ${TRUST.carsLabel.toLowerCase()}` : 'Verified washers'}</Txt>
                    <Txt size={12} color={G.mute} style={{ textAlign: 'center', lineHeight: 16 }}>Photo proof after every wash</Txt>
                  </View>
                  <Laurel size={40} flip />
                </View>
              </View>
              <View style={card({ marginTop: 24, padding: 16, backgroundColor: G.raised, borderWidth: 0, shadowOpacity: 0, elevation: 0 })}>
                <Txt weight={500} size={15}>Washer arrives in 45-60 min</Txt>
                <Txt size={13} color={G.sub} style={{ marginTop: 4 }}>Book now, or pick Scheduled or Recurring in the cart</Txt>
              </View>
            </View>
          </>
        )}
      </Animated.ScrollView>

      {/* floating back + share; a white bar with the name fades in once the hero has scrolled away */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: ins.top + 64, backgroundColor: '#fff', opacity: bar, borderBottomWidth: 1, borderBottomColor: G.line }} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 64, right: 64, top: ins.top + 12, height: 40, justifyContent: 'center', opacity: bar }}><Txt weight={500} size={16} numberOfLines={1} style={{ textAlign: 'center' }}>{name}</Txt></Animated.View>
      <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <BackCircle onPress={closePage} /><ShareCircle onPress={share} />
      </View>
      {hasBar ? <CartBar /> : null}
    </View>
  );
}
