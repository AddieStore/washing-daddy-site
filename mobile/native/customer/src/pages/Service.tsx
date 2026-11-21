// Service detail page (Pronto): parallax hero with back + share, title and rating, car-size variants with Add / stepper, frequently added
// together, "How is the service done", Included / Not included, FAQ accordion, trust block, sticky mini-cart bar. Skeleton while it "loads".
// Pressure-wash services show a small Before / After pair side by side.
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Pressable, Share, Image, Platform, useWindowDimensions } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Check, Close, Chev, Clock, Shield } from '../ui/icons';
import { IMG, RATIO } from '../img';
import { useApp, act, toast, svcQtyAll, svcQty, svcOf, lineKey, closePage, openPage, unavailable, svcLines, modeOn } from '../state';
import { CAR_SERVICES, PACKS, SVC_PHOTO, SHOW_RATINGS, TRUST, VARIANTS, variantPrice, variantsFor, packInfo, type VariantId } from '../data/reference';
import { PageBar } from './Stub';
import { Laurel } from '../ui/art2';
import { CartBar, Shimmer, useSkeleton, FadeUp, takeOrigin, flyFrom, AddButton } from '../ui/motion';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SvcArt } from './parts';
import { PrimaryBtn } from './parts';
import { G, card, imgOf, BackCircle, ShareCircle, Price, Tap, TNUM, AddBtn } from './parts';
import { src } from '../img';

const ND = Platform.OS !== 'web';
const HERO_H = 380;
const GALLERY = ['ext', 'wash', 'under'];   // pressure-wash services: show the before / after pair

const FAQ_FOR = (name: string, pack: boolean): [string, string][] => [
  ['Do I need to be at the car?', 'No. Your washer comes to your parking spot. Leave the car where it is, and tell us about keys or gate access in the booking.'],
  ['Do you need water or power from my society?', 'No. Your washer brings a pressure unit and uses minimal water. If your society restricts water, we use a low-water method.'],
  ['Can I book this on repeat?', 'Yes. Choose the Recurring tab in your cart for a weekly or alternate-day plan at a lower price per wash.'],
  [pack ? 'What if I want to add more?' : `Is ${name} safe for my paint?`, pack ? 'You can add any service to the same visit. Your washer does them all in one go.' : 'Yes. We use pH-balanced products and clean microfibre, and never dry-wipe a dusty car.'],
  ['What if I am not happy?', 'Tell us from the Washes tab within 24 hours and we will redo it or refund you to WD Money.'],
];

/* "In your cart" strip: shown when this service is already in the cart; quantity + a way back */
function InCart({ id, fromCart }: { id: string; fromCart: boolean }) {
  const L = svcLines().lines.filter(l => l.id === id), q = L.reduce((a, l) => a + l.q, 0), tot = L.reduce((a, l) => a + l.total, 0);
  if (!q) return null;
  const det = L.map(l => (l.variantLabel ? l.variantLabel + ' x' : 'x') + l.q).join(' · ');
  return (
    <FadeUp distance={10} style={{ marginTop: 16, backgroundColor: 'rgba(84,9,218,0.07)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: G.violet, alignItems: 'center', justifyContent: 'center' }}><Check size={18} color="#fff" strokeWidth={2.2} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt weight={600} size={14} color={G.violet}>{q} in your cart</Txt>
        <Txt size={12} color={G.sub} numberOfLines={1} style={{ marginTop: 1 }}>{det} · ₹{tot}</Txt>
      </View>
      <Tap label="Back to cart" onPress={() => (fromCart ? closePage() : openPage({ k: 'cart' }))} style={{ height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: G.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Txt weight={600} size={13} color="#fff">{fromCart ? 'Back to cart' : 'View cart'}</Txt>
      </Tap>
    </FadeUp>
  );
}

/* "What you get" summary chips */
function GetChip({ big, small }: { big: string; small: string }) {
  return <View style={{ flex: 1, backgroundColor: '#F6F2FF', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}><Txt weight={700} size={18} color={G.violet} style={TNUM}>{big}</Txt><Txt size={11} color={G.sub} style={{ marginTop: 1 }}>{small}</Txt></View>;
}

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

/* hero art: flies up from the tapped card (shared-element feel), then settles with a spring */
function HeroArt({ id, size, top, W, org, rm }: { id: string; size: number; top: number; W: number; org: ReturnType<typeof takeOrigin>; rm: boolean }) {
  const cx = W / 2, cy = top + size / 2;
  const from = org && !rm ? { x: org.x + org.w / 2 - cx, y: org.y + org.h / 2 - cy, s: Math.max(0.2, org.w / size) } : { x: 0, y: rm ? 0 : 24, s: rm ? 1 : 0.86 };
  const p = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) p.value = withSpring(1, { damping: 17, stiffness: 150, mass: 0.9 }) }, []);
  const st = useAnimatedStyle(() => ({ opacity: org || rm ? 1 : Math.min(1, p.value * 2), transform: [{ translateX: from.x * (1 - p.value) }, { translateY: from.y * (1 - p.value) }, { scale: from.s + (1 - from.s) * p.value }] }));
  return (
    <Reanimated.View style={[{ position: 'absolute', left: cx - size / 2, top, width: size, height: size, alignItems: 'center', justifyContent: 'center' }, st]}>
      <View style={{ position: 'absolute', width: size * 0.92, height: size * 0.92, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <SvcArt id={id} size={size} radius={24} />
    </Reanimated.View>
  );
}
/* photo hero: the washer photo fills the upper half edge to edge; eases in from a slight zoom */
function PhotoHero({ id, W, H, rm }: { id: string; W: number; H: number; rm: boolean }) {
  const p = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) p.value = withTiming(1, { duration: 380 }) }, []);
  const st = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * p.value, transform: [{ scale: 1.06 - 0.06 * p.value }] }));
  return <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, st]}><SvcArt id={id} size={W} h={H} radius={0} photo /></Reanimated.View>;
}
function HeroTitle({ name, chip, rm, delay }: { name: string; chip: string; rm: boolean; delay: number }) {
  const v = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) v.value = withDelay(delay + 80, withSpring(1, { damping: 16, stiffness: 140 })) }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 18 }] }));
  return (
    <Reanimated.View style={[{ position: 'absolute', left: 16, right: 16, bottom: 40 }, st]}>
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 999, paddingHorizontal: 10, height: 24, backgroundColor: 'rgba(255,255,255,0.10)' }}>
        <Clock size={12} color="#fff" strokeWidth={1.8} /><Txt weight={600} size={11} color="#fff" style={{ letterSpacing: 0.6 }}>{chip.toUpperCase()}</Txt>
      </View>
      <Txt weight={800} size={28} color="#fff" numberOfLines={2} style={{ marginTop: 8, lineHeight: 34, letterSpacing: -0.5 }}>{name}</Txt>
    </Reanimated.View>
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
  const key = lineKey(id, v.id), q = svcQty(key), on = q > 0, p = variantPrice(base, v.id as VariantId), ref = useRef<any>(null);
  return (
    <View ref={ref} style={[card({ width: w, borderWidth: 2, borderColor: on ? G.violet : 'transparent', padding: 10, alignItems: 'center' }), on ? { backgroundColor: '#FBF9FF' } : null]}>
      <Txt weight={600} size={14} numberOfLines={1}>{v.label}</Txt>
      <Txt size={11} color={G.mute} numberOfLines={1} style={{ lineHeight: 15 }}>{p.mins} mins</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6, marginBottom: 10 }}>
        <Price v={p.price} size={14} />{p.mrp > p.price ? <Price v={p.mrp} size={11} weight={400} strike /> : null}
      </View>
      {on ? <AddBtn qty={q} onAdd={() => act.addLine(id, v.id as VariantId)} onSub={() => act.subLine(id, v.id as VariantId)} />
        : <Tap label={'Add ' + v.label} scaleTo={0.9} onPress={() => { flyFrom(ref, id); act.addLine(id, v.id as VariantId) }} style={{ height: 36, alignSelf: 'stretch', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(84,9,218,0.08)', borderWidth: 1, borderColor: 'rgba(84,9,218,0.25)' }}><Txt weight={600} size={14} color={G.violet}>Add</Txt></Tap>}
      <Txt size={10} color={G.mute} numberOfLines={1} style={{ marginTop: 6, lineHeight: 14 }}>{v.sub.split(',')[0]}</Txt>
    </View>
  );
}

const DUAL_H = 76;
/* sticky dual CTA: Schedule (outline) + Instant (filled); adds the first car size when nothing of this service is in the cart yet */
function DualCta({ bottom, onGo }: { bottom: number; onGo: (m: 'instant' | 'scheduled') => void }) {
  const rm = useReducedMotion(), v = useSharedValue(rm ? 1 : 0);
  useEffect(() => { if (!rm) v.value = withDelay(250, withSpring(1, { damping: 16, stiffness: 170 })) }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 80 }] }));
  const hasInstant = modeOn('instant'), hasSched = modeOn('scheduled');
  if (!hasInstant && !hasSched) return null;
  return (
    <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: G.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(bottom, 12) + 4 }, st]}>
      {hasSched ? <PrimaryBtn outline label="Schedule" onPress={() => onGo('scheduled')} style={{ flex: 1 }} /> : null}
      {hasInstant ? <PrimaryBtn label="Instant" onPress={() => onGo('instant')} style={{ flex: 1 }} /> : null}
    </Reanimated.View>
  );
}

export default function Service({ id }: { id?: string }) {
  useApp();
  const app = useApp(), fromCart = app.pages.length > 1 && app.pages[app.pages.length - 2]?.k === 'cart';
  const ins = useInsets(), { width } = useWindowDimensions(), W = Math.min(width, 520);
  const [org] = useState(() => takeOrigin(id || 'ext')), skel = useSkeleton(org ? 0 : 380), rm = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  const sid = id || 'ext', svc = svcOf(sid), pack = packInfo(sid), paused = unavailable(sid), def = pack ? pack.def : null;
  const name = svc ? svc.name : pack ? pack.name : 'Wash';
  const rating = svc ? svc.rating : 4.9, count = svc ? svc.count : '24k';
  const blurb = svc ? svc.blurb : pack?.sub || '';
  const packDesc = (pack?.sub || '').split(/ \+ |, | and /).map(x => x.trim()).filter(Boolean);
  const steps: [string, string][] = svc ? svc.steps : def && def.steps && def.steps.length ? def.steps : packDesc.map(x => [x.charAt(0).toUpperCase() + x.slice(1), 'Done by your washer at your parking spot']);
  const included = svc ? svc.included : def && def.included && def.included.length ? def.included : packDesc.map(x => x.charAt(0).toUpperCase() + x.slice(1));
  const excluded = svc ? svc.excluded : def && def.excluded && def.excluded.length ? def.excluded : sid === 'exclusive' ? ['Paint correction'] : ['Engine bay', 'Ceramic coating'];
  const share = () => { Share.share({ message: `${name} at your car park from Washing Daddy. https://washingdaddy.com/` }).catch(() => {}) };
  const together = CAR_SERVICES.filter(s => s.id !== sid && !unavailable(s.id)).slice(0, 6);
  const faqs: [string, string][] = svc && svc.faqs && svc.faqs.length ? svc.faqs : def && def.faqs && def.faqs.length ? def.faqs : FAQ_FOR(name, !svc);
  const gallery = GALLERY.includes(sid);
  const vw = Math.floor((W - 32 - 16) / 3), ART_S = Math.min(Math.round(W * 0.5), 210);
  const gw = Math.floor((W - 32 - 12) / 2 * 0.62);   // small: about 60% of half the page width

  const hasPhoto = !!(svc?.photo || SVC_PHOTO[sid]), { height: WH } = useWindowDimensions(), PH = Math.round(WH * 0.5), HH = hasPhoto ? PH : HERO_H;
  const heroY = y.interpolate({ inputRange: [-HH, 0, HH], outputRange: [-HH / 2, 0, HH * 0.45], extrapolate: 'clamp' });
  const heroS = y.interpolate({ inputRange: [-HH, 0], outputRange: [1.6, 1], extrapolate: 'clamp' });
  const bar = y.interpolate({ inputRange: [HH - 120, HH - 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const hasBar = true;
  const go = (mode: 'instant' | 'scheduled') => {
    try {
      if (!svcQtyAll(sid)) { if (svc) act.addLine(sid, (variantsFor(svc)[0]?.id || 'hatch') as VariantId); else act.addSvc(sid) }
      act.setCartMode(mode);
    } catch (e: any) { toast(e?.message || 'Could not start this booking'); return }
    fromCart ? closePage() : openPage({ k: 'cart' });
  };
  const tint = svc?.tint || '#F3EEFD';
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: ND });
  const im = String(imgOf(sid)), r3d = im.startsWith('r3d');
  // removed or hidden from the dashboard while the page was open (or an old link)
  if (!svc && !pack) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Service" />
      <Txt size={15} color={G.sub} style={{ padding: 16, lineHeight: 22 }}>This service is not available right now.</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} contentContainerStyle={{ paddingBottom: 190 }}>
        {skel ? <Skeleton /> : (
          <>
            {hasPhoto ? (
              <View style={{ height: HH, overflow: 'hidden', backgroundColor: '#1A1033' }}>
                <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: [{ translateY: heroY }, { scale: heroS }] }}>
                  <PhotoHero id={sid} W={W} H={HH} rm={rm} />
                </Animated.View>
              </View>
            ) : (
            <View style={{ height: HERO_H, overflow: 'hidden' }}>
              <LinearGradient colors={['#6A1BF2', '#5409DA', '#33058F']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ position: 'absolute', right: -60, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <View style={{ position: 'absolute', left: -50, bottom: 30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: [{ translateY: heroY }, { scale: heroS }] }}>
                <HeroArt id={sid} size={ART_S} top={ins.top + 52} W={W} org={org} rm={rm} />
                <HeroTitle name={name} chip={svc ? svc.cat + ' · ' + svc.mins + ' mins' : 'Wash pack · ' + pack!.mins + ' mins'} rm={rm} delay={org ? 160 : 0} />
              </Animated.View>
            </View>
            )}
            <FadeUp delay={org ? 200 : 60} style={{ marginTop: -24, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 16 }}>
              {hasPhoto ? <View style={{ marginBottom: 12 }}>
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, height: 24, backgroundColor: 'rgba(84,9,218,0.08)' }}>
                  <Clock size={12} color={G.violet} strokeWidth={1.8} /><Txt weight={600} size={11} color={G.violet} style={{ letterSpacing: 0.6 }}>{(svc ? svc.cat + ' · ' + svc.mins + ' mins' : 'Wash pack · ' + pack!.mins + ' mins').toUpperCase()}</Txt>
                </View>
                <Txt weight={800} size={26} numberOfLines={2} style={{ marginTop: 8, lineHeight: 32, letterSpacing: -0.5 }}>{name}</Txt>
              </View> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {svc ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Price v={svc.price} size={20} weight={600} />{svc.mrp > svc.price ? <Price v={svc.mrp} size={13} weight={400} strike /> : null}{svc.mrp > svc.price ? <View style={{ backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Txt weight={600} size={11} color={G.pos}>{Math.round((1 - svc.price / svc.mrp) * 100)}% off</Txt></View> : null}</View> : null}
                {SHOW_RATINGS ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Txt weight={500} size={13} style={TNUM}>{'★ ' + rating.toFixed(1)}</Txt><Txt size={13} color={G.mute}>({count} ratings)</Txt></View> : null}
              </View>
              <Txt size={14} color={G.sub} style={{ marginTop: 10, lineHeight: 20 }}>{blurb}</Txt>
              <InCart id={sid} fromCart={fromCart} />

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

              {paused ? (
                <View style={card({ marginTop: 24, padding: 16, backgroundColor: G.raised, shadowOpacity: 0, elevation: 0 })}>
                  <Txt weight={600} size={15}>Not available right now</Txt>
                  {paused !== 'Not available right now' ? <Txt size={13} color={G.sub} style={{ marginTop: 4, lineHeight: 18 }}>{paused}</Txt> : null}
                </View>
              ) : <Txt weight={600} size={16} style={{ marginTop: 28 }}>{pack ? 'Choose your pack' : 'Select your car size'}</Txt>}
              {paused ? null : svc ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {variantsFor(svc).map(v => <Variant key={v.id} id={sid} v={v} base={svc} w={vw} />)}
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {PACKS.filter(pk => !unavailable(pk.id)).map(pk => {
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
            </FadeUp>

            <View style={{ paddingHorizontal: 16 }}><Txt weight={600} size={18} style={{ marginTop: 32 }}>Frequently added together</Txt></View>
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
              {together.map(s => (
                <Tap key={s.id} label={s.name} onPress={() => openPage({ k: 'svc', id: s.id })} style={{ width: 128 }}>
                  <View pointerEvents="none" style={{ width: 128, height: 104, borderRadius: 16, backgroundColor: s.tint || G.raised, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><SvcArt id={s.id} size={96} /></View>
                  <View style={{ position: 'absolute', right: 6, top: 104 - 40 }}><AddButton compact id={s.id} qty={svcQty(s.id)} onAdd={() => act.addSvc(s.id)} onSub={() => act.subSvc(s.id)} /></View>
                  <Txt weight={500} size={13} numberOfLines={2} style={{ marginTop: 8, lineHeight: 18 }}>{s.short}</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}><Price v={s.price} size={14} weight={600} /><Price v={s.mrp} size={12} weight={400} strike /></View>
                </Tap>
              ))}
            </Animated.ScrollView>

            <View style={{ paddingHorizontal: 16 }}>
              <Txt weight={700} size={20} style={{ marginTop: 32 }}>What you get</Txt>
              <FadeUp distance={10} style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <GetChip big={(svc ? svc.mins : pack!.mins) + ''} small="minutes" />
                <GetChip big={included.length + ''} small="included" />
                <GetChip big={steps.length + ''} small="steps" />
              </FadeUp>
              <Txt weight={500} size={18} style={{ marginTop: 28 }}>How is the service done</Txt>
              <View style={{ marginTop: 16, gap: 16 }}>
                {steps.map(([t, s], i) => (
                  <FadeUp key={i} index={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                      <Txt weight={500} size={17} color={G.violet} style={TNUM}>{i + 1}</Txt>
                    </View>
                    <View style={{ flex: 1 }}><Txt weight={500} size={15}>{t}</Txt><Txt size={13} color={G.sub} style={{ marginTop: 2, lineHeight: 20 }}>{s}</Txt></View>
                  </FadeUp>
                ))}
              </View>

              <Txt weight={500} size={18} style={{ marginTop: 32 }}>Included in service</Txt>
              <View style={{ marginTop: 8 }}>
                {included.map((x, i) => <FadeUp key={x} index={i} distance={12} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(22,163,74,.12)', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color={G.pos} strokeWidth={2} /></View><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></FadeUp>)}
              </View>
              <Txt weight={500} size={18} style={{ marginTop: 24 }}>Excluded from service</Txt>
              <View style={{ marginTop: 8 }}>
                {excluded.map(x => <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: G.raised, alignItems: 'center', justifyContent: 'center' }}><Close size={13} color={G.mute} strokeWidth={2} /></View><Txt size={14} color={G.sub} style={{ flex: 1 }}>{x}</Txt></View>)}
              </View>

              <Txt weight={500} size={18} style={{ marginTop: 32, marginBottom: 12 }}>Frequently asked questions</Txt>
              {faqs.map(([q, a]) => <Faq key={q} q={q} a={a} />)}

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
      {hasPhoto && !skel ? <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: ins.top + 84, opacity: bar.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}><LinearGradient colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']} style={{ flex: 1 }} /></Animated.View> : null}
      <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <BackCircle onPress={closePage} /><ShareCircle onPress={share} />
      </View>
      {hasBar ? <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: DUAL_H + ins.bottom, height: 72 }}><CartBar /></View> : null}
      {!skel && !paused ? <DualCta bottom={ins.bottom} onGo={go} /> : null}
    </View>
  );
}
