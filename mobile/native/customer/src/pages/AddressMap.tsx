// Confirm location, like Pronto's: a real Google map (phones) centred on the GPS fix, a fixed centre pin with a dark "Washer will arrive here"
// bubble, drag the map to move, Places search on top, "Current location" pill, bottom card with the reverse-geocoded address. OWNER: PROFILE worker.
// The map itself is src/ui/PickMap.native.tsx (react-native-maps, Google) / PickMap.web.tsx (stand-in streets in the preview). Without
// GOOGLE_MAPS_API_KEY at build time the phone shows "Map unavailable" and the address is typed instead.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Platform, TextInput, Keyboard } from 'react-native';
import { Txt, useInsets } from '../ui/kit';
import { Locate, Pin } from '../ui/icons';
import { MapPin, LocatePill, FarNote } from '../ui/mapparts';
import { FadeUp } from '../ui/motion';
import { C } from '../theme';
import { act, useApp, addressOf, addresses, selectedAddress, here, openPage, closePage, toast, distance, A } from '../state';
import { PageBar } from './Stub';
import { G, PrimaryBtn } from './parts';
import { SearchBox, Shimmer } from '../sheets/address';
import { PickMap, type PickMapRef } from '../ui/PickMap';
import { hasKey, reverseGeocode, autocomplete, placeLocation, newSession, type Suggestion, type Place } from '../geo';

const UNAVAILABLE = Platform.OS !== 'web' && !hasKey;

/** Pages talk to each other here: AddressForm's "Change location" sets onPick; the map then hands the pin back instead of opening the form. */
export const mapFlow: { onPick: null | ((lat: number, lng: number, area: string) => void); seed: null | { lat: number; lng: number }; viaMap: boolean } = { onPick: null, seed: null, viaMap: false };

/** offline fallback (preview, no key, geocoder error): the nearest saved address names the pin */
function place(lat: number, lng: number): Place {
  const all = addresses(); let best: (typeof all)[number] | null = null, bd = 2500;
  for (const a of all) { const d = distance(lat, lng, a.lat, a.lng); if (d < bd) { bd = d; best = a } }
  const area = best?.area || (A() && A().area) || '';
  const t = (area.split(',')[0] || '').trim();
  return { title: t || 'Pinned location', sub: area || `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
}

type Row = { key: string; main: string; secondary: string; saved?: boolean; go(): void };

export default function AddressMap({ id }: { id?: string }) {
  useApp();
  const ins = useInsets(), ex = id ? addressOf(id) : null, h0 = here(), sel = selectedAddress();
  const start = useMemo(() => mapFlow.seed || (ex ? { lat: ex.lat, lng: ex.lng } : h0 || (sel ? { lat: sel.lat, lng: sel.lng } : { lat: 28.668, lng: 77.0989 })), []);
  const cRef = useRef(start), map = useRef<PickMapRef>(null), seq = useRef(0), live = useRef(true);
  const [moving, setMoving] = useState(true), [pl, setPl] = useState<Place>(() => place(start.lat, start.lng)), [busy, setBusy] = useState(false), [q, setQ] = useState('');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(h0), [locating, setLocating] = useState(false), [typed, setTyped] = useState(''), [sug, setSug] = useState<Suggestion[]>([]), [searching, setSearching] = useState(false);
  const flow = useRef(mapFlow.onPick ? { ...mapFlow } : null).current;
  const movingRef = useRef(true), settled = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => () => { live.current = false }, []);

  const onMoveStart = () => { if (movingRef.current) return; movingRef.current = true; setMoving(true) };
  /** the map came to rest: name the point under the pin (Google Geocoding), falling back to the saved-address name */
  const onSettle = (p: { lat: number; lng: number }) => {
    // the map reports 'idle' again for tiny shifts and for its own re-layout: ignore anything under ~2 m so the pin and card do not flicker
    if (settled.current && distance(p.lat, p.lng, settled.current.lat, settled.current.lng) < 2) return;
    settled.current = p; cRef.current = p; const n = ++seq.current; movingRef.current = true; setMoving(true);
    reverseGeocode(p.lat, p.lng).then(r => { if (!live.current || n !== seq.current) return; setPl(r || place(p.lat, p.lng)); movingRef.current = false; setMoving(false) });
  };
  const jump = (p: { lat: number; lng: number }, zoomed = false) => { if (UNAVAILABLE) { cRef.current = p; return } onMoveStart(); map.current?.flyTo(p, zoomed) };

  const locate = async (first = false) => {
    if (locating) return; setLocating(true);
    try {
      const f = await act.locate({ prompt: true });
      if (!live.current) return;
      if (f.source === 'gps') { setMe({ lat: f.lat, lng: f.lng }); jump(f, true) }
      else if (!first) { toast(f.reason === 'off' ? 'Turn on your phone location to find you.' : 'Location is off for Washing Daddy. Search or move the pin instead.'); jump(f) }
    } finally { if (live.current) setLocating(false) }
  };
  useEffect(() => { if (!ex && !mapFlow.seed && !UNAVAILABLE) locate(true) }, []);

  /* search: saved addresses (instant) + Google Places (debounced 300 ms, one session token per search) */
  useEffect(() => {
    const t = q.trim(); if (t.length < 2 || UNAVAILABLE) { setSug([]); setSearching(false); return }
    setSearching(true); const ctl = new AbortController();
    const h = setTimeout(() => { autocomplete(t, cRef.current, ctl.signal).then(r => { if (!ctl.signal.aborted) { setSug(r); setSearching(false) } }) }, 300);
    return () => { clearTimeout(h); ctl.abort() };
  }, [q]);
  const t = q.trim().toLowerCase();
  const rows: Row[] = [
    ...(t ? addresses().filter(a => (a.label + ' ' + a.flat + ' ' + a.street + ' ' + a.area).toLowerCase().includes(t)).slice(0, 3).map(a => ({ key: 's' + a.id, main: a.label === 'Other' && a.other ? a.other : a.label, secondary: [a.flat, a.area].filter(Boolean).join(', '), saved: true,
      go: () => { setQ(''); newSession(); Keyboard.dismiss(); if (UNAVAILABLE) setTyped([a.flat, a.area].filter(Boolean).join(', ')); jump({ lat: a.lat, lng: a.lng }, true) } })) : []),
    ...sug.map(s => ({ key: 'p' + s.id, main: s.main, secondary: s.secondary,
      go: async () => { setQ(''); setSug([]); Keyboard.dismiss(); const r = await placeLocation(s.id); if (!live.current) return; if (r) jump(r, true); else toast('Could not open that place. Try another.') } })),
  ];
  const confirm = () => {
    setBusy(true); const p = cRef.current, area = UNAVAILABLE ? typed.trim() : pl.sub;
    if (flow?.onPick) { flow.onPick(p.lat, p.lng, area); mapFlow.onPick = null; mapFlow.seed = null; closePage(); return }
    mapFlow.viaMap = true; setBusy(false); openPage({ k: 'addressForm', id, lat: p.lat, lng: p.lng, area });
  };
  const far = me && !moving ? distance(me.lat, me.lng, cRef.current.lat, cRef.current.lng) : null;
  const card = { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(84,9,218,0.25)', backgroundColor: 'rgba(84,9,218,0.04)' } as const;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageBar title="Confirm your location" onBack={() => { mapFlow.onPick = null; mapFlow.seed = null; closePage() }} />
      <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#F4F4F5' }}>
        {UNAVAILABLE ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 72 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}><Pin size={26} color={C.violet} strokeWidth={1.5} /></View>
            <Txt weight={500} size={16} style={{ marginTop: 16 }}>Map unavailable</Txt>
            <Txt size={13} color={G.sub} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>We could not load the map in this version. Type your address below and our washer will call you to find the exact spot.</Txt>
          </View>
        ) : (
          <>
            <PickMap ref={map} start={start} me={me} onMoveStart={onMoveStart} onSettle={onSettle} />
            <MapPin moving={moving} title={pl.title} />
            <LocatePill onPress={() => locate()} busy={locating} style={{ bottom: 36 }} />
          </>
        )}
        <View style={{ position: 'absolute', left: 16, right: 16, top: 12 }}>
          <View style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3, backgroundColor: '#fff', borderRadius: 12 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Search saved address or a new location" />
          </View>
          {rows.length || searching ? <View style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: G.line, overflow: 'hidden', elevation: 4 }}>
            {rows.map((r, i) => <Pressable key={r.key} onPress={r.go} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: pressed ? G.raised : '#fff', borderTopWidth: i ? 1 : 0, borderTopColor: G.line })}>
              <Pin size={18} color={r.saved ? C.violet : G.mute} strokeWidth={1.5} />
              <View style={{ flex: 1, minWidth: 0 }}><Txt weight={500} size={14} numberOfLines={1}>{r.main}</Txt>{r.secondary ? <Txt size={12} color={G.sub} numberOfLines={1}>{r.secondary}</Txt> : null}</View>
              {r.saved ? <Txt size={11} color={C.violet}>Saved</Txt> : null}
            </Pressable>)}
            {searching && !sug.length ? <View style={{ padding: 12, borderTopWidth: rows.length ? 1 : 0, borderTopColor: G.line }}><Shimmer h={14} w={'60%'} /></View> : null}
          </View> : null}
        </View>
      </View>
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
        <FarNote meters={far} />
        <Txt size={12} color={G.mute} style={{ marginBottom: 8 }}>{UNAVAILABLE ? 'Your address' : 'Map location'}</Txt>
        <View style={card}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Locate size={20} color={C.violet} strokeWidth={1.5} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {UNAVAILABLE ? <TextInput value={typed} onChangeText={setTyped} placeholder="Area, street or landmark" placeholderTextColor={G.mute} multiline maxLength={160} style={{ fontFamily: 'Poppins_400Regular', fontSize: 14, color: G.ink, minHeight: 40, paddingVertical: 4 }} />
              : moving ? <View style={{ gap: 8 }}><Shimmer w={90} h={14} /><Shimmer h={12} /></View> : <><Txt weight={500} size={15} numberOfLines={1}>{pl.title}</Txt><Txt size={13} color={G.sub} numberOfLines={2} style={{ marginTop: 2 }}>{pl.sub}</Txt></>}
            <Txt size={12} color={C.violet} style={{ marginTop: 6 }}>Add details about your flat on next step</Txt>
          </View>
        </View>
        <PrimaryBtn label={flow?.onPick ? 'Confirm location' : 'Confirm and add details'} onPress={confirm} busy={busy} disabled={UNAVAILABLE ? typed.trim().length < 3 : moving} style={{ marginTop: 16 }} />
      </View>
    </View>
  );
}
