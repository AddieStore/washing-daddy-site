/* Exact address during sign-up: search box with live suggestions, or "Use my location / Pick on map" (full-screen Modal with the same PickMap the
   address page uses), then flat + street fields. Inline only: sign-up runs outside the Main navigator, so no openPage. Inputs use static styles
   (never restyle on focus: that made the Android keyboard close on build 21). */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { C, F, SP } from '../theme';
import { Txt, useInsets } from './kit';
import { Pressable3, FadeUp } from './motion';
import { MapPin, LocatePill } from './mapparts';
import { SERVICE_AREAS } from '../data/areas';
import { Back, Check, Locate, Pin, Search } from './icons';
import { PickMap, type PickMapRef } from './PickMap';
import { act, here, distance } from '../state';
import { hasKey, reverseGeocode, autocomplete, placeLocation, newSession, type Suggestion, type Place } from '../geo';

export type AddrDraft = { flat: string; street: string; area: string; lat: number; lng: number };
export const emptyAddr = (): AddrDraft => ({ flat: '', street: '', area: '', lat: NaN, lng: NaN });
export const addrLocated = (a: AddrDraft | null | undefined) => !!a && Number.isFinite(a.lat) && Number.isFinite(a.lng);

const K = { ink: '#1A1033', grey: '#4F4766', muted: '#6B6483', line: 'rgba(84,9,218,0.16)', raised: C.canvas, violet: C.violet, ok: '#16a34a' };
const UNAVAILABLE = Platform.OS !== 'web' && !hasKey;
const DEFAULT_START = { lat: 28.668, lng: 77.0989 };
const inputBox = { borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(84,9,218,0.14)', backgroundColor: K.raised, paddingHorizontal: SP.l } as const;
const inputText = { fontFamily: F.b500, fontSize: 15, lineHeight: 22, color: K.ink, paddingTop: 13, paddingBottom: 13, includeFontPadding: false, textAlignVertical: 'center', outlineStyle: 'none' } as any;

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ marginBottom: SP.m }}><Txt weight={500} size={13} color={K.grey} style={{ marginBottom: SP.s }}>{label}</Txt>{children}</View>;
}

/* ---------- full-screen map ---------- */
function MapModal({ visible, start, onClose, onConfirm }: { visible: boolean; start: { lat: number; lng: number }; onClose: () => void; onConfirm: (p: { lat: number; lng: number }, pl: Place) => void }) {
  const ins = useInsets(), map = useRef<PickMapRef>(null), cRef = useRef(start), seq = useRef(0), live = useRef(true), settled = useRef<{ lat: number; lng: number } | null>(null);
  const [moving, setMoving] = useState(true), [pl, setPl] = useState<Place>({ title: 'Pinned location', sub: '' }), [me, setMe] = useState(here()), [locating, setLocating] = useState(false), [typed, setTyped] = useState('');
  const movingRef = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false } }, []);
  const onMoveStart = () => { if (movingRef.current) return; movingRef.current = true; setMoving(true) };
  const onSettle = (p: { lat: number; lng: number }) => {
    if (settled.current && distance(p.lat, p.lng, settled.current.lat, settled.current.lng) < 2) return;
    settled.current = p; cRef.current = p; const n = ++seq.current; movingRef.current = true; setMoving(true);
    reverseGeocode(p.lat, p.lng).then(r => { if (!live.current || n !== seq.current) return; setPl(r || { title: 'Pinned location', sub: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` }); movingRef.current = false; setMoving(false) });
  };
  const jump = (p: { lat: number; lng: number }, zoomed = false) => { if (UNAVAILABLE) { cRef.current = p; return } onMoveStart(); map.current?.flyTo(p, zoomed) };
  const locate = async () => {
    if (locating) return; setLocating(true);
    try { const f = await act.locate({ prompt: true }); if (!live.current) return; if (f.source === 'gps') { setMe({ lat: f.lat, lng: f.lng }); jump(f, true) } else jump(f) }
    finally { if (live.current) setLocating(false) }
  };
  useEffect(() => { if (visible && !UNAVAILABLE) locate() }, [visible]);   // eslint-disable-line
  const ok = UNAVAILABLE ? typed.trim().length >= 3 : !moving;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#F4F4F5' }}>
          {UNAVAILABLE ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(84,9,218,0.08)', alignItems: 'center', justifyContent: 'center' }}><Pin size={26} color={K.violet} /></View>
              <Txt weight={500} size={16} style={{ marginTop: 16 }}>Map unavailable</Txt>
              <Txt size={13} color={K.muted} style={{ marginTop: 4, textAlign: 'center', lineHeight: 19 }}>Type your area below and our washer will call you to find the exact spot.</Txt>
            </View>
          ) : (
            <>
              <PickMap ref={map} areas={SERVICE_AREAS} start={start} me={me} onMoveStart={onMoveStart} onSettle={onSettle} />
              <MapPin moving={moving} title={pl.title} />
              <LocatePill onPress={locate} busy={locating} label="Use my location" style={{ bottom: 40 }} />
            </>
          )}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close map" hitSlop={8} style={{ position: 'absolute', left: 16, top: ins.top + 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
            <Back size={22} color={K.ink} />
          </Pressable>
        </View>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -22, padding: 16, paddingBottom: Math.max(ins.bottom, 12) + 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
          <Txt size={12} color={K.muted} style={{ marginBottom: 8 }}>{UNAVAILABLE ? 'Your area' : 'Map location'}</Txt>
          <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(84,9,218,0.25)', backgroundColor: 'rgba(84,9,218,0.04)' }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(84,9,218,0.1)', alignItems: 'center', justifyContent: 'center' }}><Locate size={20} color={K.violet} /></View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              {UNAVAILABLE ? <TextInput value={typed} onChangeText={setTyped} placeholder="Area, street or landmark" placeholderTextColor={K.muted} multiline maxLength={160} style={{ fontFamily: F.body, fontSize: 14, color: K.ink, minHeight: 40, paddingVertical: 4 }} />
                : moving ? <Txt size={13} color={K.muted}>Locating…</Txt>
                : <><Txt weight={500} size={15} color={K.ink} numberOfLines={1}>{pl.title}</Txt><Txt size={13} color={K.grey} numberOfLines={2} style={{ marginTop: 2 }}>{pl.sub}</Txt></>}
            </View>
          </View>
          <Pressable3 disabled={!ok} accessibilityRole="button" onPress={() => { const p = cRef.current; onConfirm(p, UNAVAILABLE ? { title: typed.trim().split(',')[0], sub: typed.trim() } : pl) }}
            style={{ marginTop: 16, minHeight: 54, borderRadius: 16, backgroundColor: ok ? K.violet : '#E6E0F5', alignItems: 'center', justifyContent: 'center' }}>
            <Txt weight={600} size={16} color={ok ? '#fff' : K.muted}>Confirm this spot</Txt>
          </Pressable3>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- the field group ---------- */
export function AddressEntry({ value, onChange }: { value: AddrDraft | null; onChange: (v: AddrDraft) => void }) {
  const cur = value || emptyAddr(), located = addrLocated(value);
  const [q, setQ] = useState(''), [sug, setSug] = useState<Suggestion[]>([]), [searching, setSearching] = useState(false), [name, setName] = useState(''), [mapOpen, setMapOpen] = useState(false), [picking, setPicking] = useState(false);
  const curRef = useRef(cur); curRef.current = cur;
  useEffect(() => { newSession() }, []);

  useEffect(() => {
    const t = q.trim(); if (t.length < 3 || UNAVAILABLE) { setSug([]); setSearching(false); return }
    setSearching(true); const ctl = new AbortController();
    const h = setTimeout(() => {
      const near = here() || (Number.isFinite(curRef.current.lat) ? { lat: curRef.current.lat, lng: curRef.current.lng } : DEFAULT_START);
      autocomplete(t, near, ctl.signal).then(r => { if (!ctl.signal.aborted) { setSug(r); setSearching(false) } });
    }, 300);
    return () => { clearTimeout(h); ctl.abort() };
  }, [q]);

  const pickSug = async (s: Suggestion) => {
    Keyboard.dismiss(); setPicking(true);
    const r = await placeLocation(s.id); setPicking(false);
    if (!r) return;
    setQ(''); setSug([]); setName(s.main);
    onChange({ ...curRef.current, area: r.address || [s.main, s.secondary].filter(Boolean).join(', '), lat: r.lat, lng: r.lng, street: curRef.current.street || s.main });
  };
  const fromMap = (p: { lat: number; lng: number }, pl: Place) => {
    setMapOpen(false); setQ(''); setSug([]); setName(pl.title);
    const useTitle = pl.title && !/^\d+[a-z]?$/i.test(pl.title) && pl.title !== 'Pinned location';
    onChange({ ...curRef.current, area: pl.sub, lat: p.lat, lng: p.lng, street: curRef.current.street || (useTitle ? pl.title : '') });
  };
  const change = () => { setName(''); onChange({ ...cur, area: '', lat: NaN, lng: NaN }) };
  const start = located ? { lat: cur.lat, lng: cur.lng } : here() || DEFAULT_START;

  return (
    <View>
      <Txt weight={500} size={13} color={K.grey} style={{ marginBottom: SP.s }}>Where is your car parked?</Txt>
      {located ? (
        <FadeUp distance={6} duration={220}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(22,163,74,0.35)', backgroundColor: 'rgba(22,163,74,0.06)' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: K.ok, alignItems: 'center', justifyContent: 'center' }}><Check size={18} color="#fff" strokeWidth={2.2} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt weight={600} size={15} color={K.ink} numberOfLines={1}>{name || cur.area.split(',')[0] || 'Pinned location'}</Txt>
              {cur.area ? <Txt size={12} color={K.grey} numberOfLines={2} style={{ marginTop: 1, lineHeight: 16 }}>{cur.area}</Txt> : null}
            </View>
            <Pressable onPress={change} hitSlop={12} accessibilityRole="button" accessibilityLabel="Change location"><Txt weight={600} size={14} color={K.violet}>Change</Txt></Pressable>
          </View>
        </FadeUp>
      ) : (
        <>
          <View style={[inputBox, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Search size={18} color={K.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search your society, street or area" placeholderTextColor={K.muted} autoCorrect={false} accessibilityLabel="Search address" style={[inputText, { flex: 1, minWidth: 0 }]} />
            {searching || picking ? <ActivityIndicator size="small" color={K.violet} /> : null}
          </View>
          {sug.length ? (
            <FadeUp key={sug.map(s => s.id).join()} distance={6} duration={200} style={{ marginTop: SP.s }}>
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: K.line, backgroundColor: '#fff', overflow: 'hidden' }}>
                {sug.map((s, i) => (
                  <Pressable key={s.id} onPress={() => pickSug(s)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: pressed ? K.raised : '#fff', borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(84,9,218,0.08)' })}>
                    <Pin size={18} color={K.violet} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt weight={500} size={14} color={K.ink} numberOfLines={1}>{s.main}</Txt>
                      {s.secondary ? <Txt size={12} color={K.grey} numberOfLines={1}>{s.secondary}</Txt> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </FadeUp>
          ) : null}
          <Pressable3 onPress={() => { Keyboard.dismiss(); setMapOpen(true) }} accessibilityRole="button" haptics={false} scaleTo={0.98}
            style={{ marginTop: SP.m, minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: K.violet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Locate size={18} color={K.violet} /><Txt weight={600} size={15} color={K.violet}>Use my location / Pick on map</Txt>
          </Pressable3>
        </>
      )}
      {located ? (
        <FadeUp delay={80} distance={8} style={{ marginTop: SP.l }}>
          <FieldRow label="Flat / house no., floor, building *">
            <View style={inputBox}><TextInput value={cur.flat} onChangeText={flat => onChange({ ...cur, flat })} placeholder="e.g. B-204, 2nd floor, Sunrise Apartments" placeholderTextColor={K.muted} maxLength={120} accessibilityLabel="Flat or house number" style={inputText} /></View>
          </FieldRow>
          <FieldRow label="Street, society or landmark">
            <View style={inputBox}><TextInput value={cur.street} onChangeText={street => onChange({ ...cur, street })} placeholder="Where the washer should look" placeholderTextColor={K.muted} maxLength={120} accessibilityLabel="Street, society or landmark" style={inputText} /></View>
          </FieldRow>
        </FadeUp>
      ) : null}
      {mapOpen ? <MapModal visible start={start} onClose={() => setMapOpen(false)} onConfirm={fromMap} /> : null}
    </View>
  );
}
