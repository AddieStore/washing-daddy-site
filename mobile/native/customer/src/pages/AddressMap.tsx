// Confirm location: a map under a fixed centre pin ("Washer will arrive here"). Drag the map, the pin stays. OWNER: PROFILE worker.
// No Google Maps / GPS module yet (CONTRACT known gaps): the map is a drawn street grid on both web and phone, the centre is act.locate().
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, PanResponder, Pressable, Platform, ScrollView } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Txt, useInsets } from '../ui/kit';
import { Locate, Pin } from '../ui/icons';
import { C } from '../theme';
import { act, useApp, addressOf, addresses, selectedAddress, here, openPage, closePage, toast, distance, A } from '../state';
import { PageBar } from './Stub';
import { G, PrimaryBtn } from './parts';
import { SearchBox, Shimmer } from '../sheets/address';

const ND = Platform.OS !== 'web', EASE = Easing.bezier(0.22, 1, 0.36, 1);
const KX = 0.016 / 360, KY = 0.039 / 1000;   // degrees per pixel (lng, lat)
const PX = 74, PY = 88;                      // city block pitch in px

/** Pages talk to each other here: AddressForm's "Change location" sets onPick; the map then hands the pin back instead of opening the form. */
export const mapFlow: { onPick: null | ((lat: number, lng: number, area: string) => void); seed: null | { lat: number; lng: number }; viaMap: boolean } = { onPick: null, seed: null, viaMap: false };

const hash = (i: number, j: number) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 };

function Streets({ lat, lng, w, h }: { lat: number; lng: number; w: number; h: number }) {
  const wx = lng / KX, wy = -lat / KY, ox = wx - w / 2, oy = wy - h / 2;
  const i0 = Math.floor(ox / PX), j0 = Math.floor(oy / PY), ni = Math.ceil(w / PX) + 2, nj = Math.ceil(h / PY) + 2, out: React.ReactNode[] = [];
  for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
    const gi = i0 + i, gj = j0 + j, r = hash(gi, gj), x = gi * PX - ox, y = gj * PY - oy, big = gi % 5 === 0 || gj % 4 === 0;
    if (big) continue;
    const park = r > 0.86;
    out.push(<Rect key={i + '_' + j} x={x + 7} y={y + 7} width={PX - 14} height={PY - 14} rx={park ? 14 : 6} fill={park ? '#DCEBDD' : r > 0.5 ? '#E4E4E7' : '#D9D9DE'} />);
  }
  return <Svg width={w} height={h}><Rect width={w} height={h} fill="#F4F4F5" />{out}</Svg>;
}

/** nearest saved address names the pin, since there is no geocoder yet */
function place(lat: number, lng: number): { title: string; sub: string } {
  const all = addresses(); let best: (typeof all)[number] | null = null, bd = 2500;
  for (const a of all) { const d = distance(lat, lng, a.lat, a.lng); if (d < bd) { bd = d; best = a } }
  const area = best?.area || (A() && A().area) || '';
  const t = (area.split(',')[0] || '').trim();
  return { title: t || 'Pinned location', sub: area ? area + (best ? '' : '') : `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
}

export default function AddressMap({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), ex = id ? addressOf(id) : null, h0 = here(), sel = selectedAddress();
  const start = useMemo(() => mapFlow.seed || (ex ? { lat: ex.lat, lng: ex.lng } : h0 || (sel ? { lat: sel.lat, lng: sel.lng } : { lat: 28.668, lng: 77.0989 })), []);
  const [c, setC] = useState(start), cRef = useRef(start), [size, setSize] = useState({ w: 360, h: 460 }), [moving, setMoving] = useState(false), [pl, setPl] = useState(() => place(start.lat, start.lng)), [busy, setBusy] = useState(false), [q, setQ] = useState('');
  const lift = useRef(new Animated.Value(0)).current, base = useRef(start), timer = useRef<any>(null), flow = useRef(mapFlow.onPick ? { ...mapFlow } : null).current;
  const to = (v: number) => Animated.timing(lift, { toValue: v, duration: 180, easing: EASE, useNativeDriver: ND }).start();
  const settle = (p: { lat: number; lng: number }) => { clearTimeout(timer.current); timer.current = setTimeout(() => { setPl(place(p.lat, p.lng)); setMoving(false); to(0) }, 450) };
  const jump = (p: { lat: number; lng: number }) => { cRef.current = p; setC(p); setMoving(true); to(1); settle(p) };
  useEffect(() => () => clearTimeout(timer.current), []);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { base.current = cRef.current; setMoving(true); to(1); clearTimeout(timer.current) },
    onPanResponderMove: (_, g) => { const p = { lat: base.current.lat + g.dy * KY, lng: base.current.lng - g.dx * KX }; cRef.current = p; setC(p) },
    onPanResponderRelease: () => settle(cRef.current), onPanResponderTerminate: () => settle(cRef.current),
  })).current;
  const results = q.trim() ? addresses().filter(a => (a.label + ' ' + a.flat + ' ' + a.street + ' ' + a.area).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 4) : [];
  const locate = async () => { try { const p = await act.locate(); jump(p) } catch (e: any) { toast(e.message || 'Could not find your location.') } };
  const confirm = () => {
    setBusy(true); const p = cRef.current, area = place(p.lat, p.lng).sub;
    if (flow?.onPick) { flow.onPick(p.lat, p.lng, area); mapFlow.onPick = null; mapFlow.seed = null; closePage(); return }
    mapFlow.viaMap = true; setBusy(false); openPage({ k: 'addressForm', id, lat: p.lat, lng: p.lng, area });
  };
  useEffect(() => { if (!h0 && !ex && !mapFlow.seed) act.locate().then(p => { if (Math.abs(p.lat - cRef.current.lat) > 1e-9) jump(p) }).catch(() => {}) }, []);
  const pinY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Confirm your location" onBack={() => { mapFlow.onPick = null; mapFlow.seed = null; closePage() }} />
      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}>
        <Streets lat={c.lat} lng={c.lng} w={size.w} h={size.h} />
        <View pointerEvents="none" style={{ position: 'absolute', left: size.w / 2 - 12, top: size.h / 2 - 3, width: 24, height: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)' }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: size.w / 2 - 80, width: 160, top: size.h / 2 - 82, alignItems: 'center', transform: [{ translateY: pinY }] }}>
          <View style={{ backgroundColor: '#171717', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', maxWidth: 190 }}>
            <Txt size={12} color="#fff">Washer will arrive here</Txt>
            {moving ? <Txt size={12} color="rgba(255,255,255,0.7)">Locating…</Txt> : <Txt weight={500} size={12} color="#fff" numberOfLines={1}>{pl.title}</Txt>}
          </View>
          <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#171717' }} />
          <Pin size={40} color={C.violet} strokeWidth={1.5} />
        </Animated.View>
        <View style={{ position: 'absolute', left: 16, right: 16, top: 12 }}>
          <View style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3, backgroundColor: '#fff', borderRadius: 12 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Search saved address or area" />
          </View>
          {results.length ? <View style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: G.line, overflow: 'hidden' }}>
            {results.map((a, i) => <Pressable key={a.id} onPress={() => { setQ(''); jump({ lat: a.lat, lng: a.lng }) }} style={({ pressed }) => ({ padding: 12, backgroundColor: pressed ? G.raised : '#fff', borderTopWidth: i ? 1 : 0, borderTopColor: G.line })}><Txt weight={500} size={14}>{a.label === 'Other' && a.other ? a.other : a.label}</Txt><Txt size={12} color={G.sub} numberOfLines={1}>{[a.flat, a.area].filter(Boolean).join(', ')}</Txt></Pressable>)}
          </View> : null}
        </View>
        <Pressable onPress={locate} style={({ pressed }) => ({ position: 'absolute', alignSelf: 'center', bottom: 16, left: size.w / 2 - 80, width: 160, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.violet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Locate size={18} color={C.violet} strokeWidth={1.5} /><Txt weight={500} size={14} color={C.violet}>Current location</Txt>
        </Pressable>
      </View>
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
        <Txt size={12} color={G.mute} style={{ marginBottom: 8 }}>Map location</Txt>
        <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(84,9,218,0.25)', backgroundColor: 'rgba(84,9,218,0.04)' }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Locate size={20} color={C.violet} strokeWidth={1.5} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {moving ? <View style={{ gap: 8 }}><Shimmer w={90} h={14} /><Shimmer h={12} /></View> : <><Txt weight={500} size={15} numberOfLines={1}>{pl.title}</Txt><Txt size={13} color={G.sub} numberOfLines={2} style={{ marginTop: 2 }}>{pl.sub}</Txt></>}
            <Txt size={12} color={C.violet} style={{ marginTop: 6 }}>Add details about your flat on the next step</Txt>
          </View>
        </View>
        <PrimaryBtn label={flow?.onPick ? 'Confirm location' : 'Confirm and add details'} onPress={confirm} busy={busy} disabled={moving} style={{ marginTop: 16 }} />
      </View>
    </View>
  );
}
