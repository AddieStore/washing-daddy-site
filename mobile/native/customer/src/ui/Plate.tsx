// An Indian HSRP number plate: white plate, black border, two screws, a holographic chakra sticker, blue "IND" and a tiny
// laser code. Frame/sticker are Views; the registration is real React Native <Text> in a loaded condensed font (Anton),
// grouped like a real plate (state / district / series / number), sized from the plate's measured width and then
// shrunk to fit if the font metrics turn out wider. Masked digits ("•") are drawn as dots. Empty `reg` = greyed example.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleProp, Text, View, ViewStyle } from 'react-native';
import { F } from '../theme';

const W = 1000, H = 290;
export const PLATE_RATIO = W / H;
const CONDENSED = 'Anton_400Regular';
const INK = '#12172B', GHOST = '#C4C6CE', BLUE = '#2347B0';

export function plateText(reg: string): string {
  return String(reg || '').toUpperCase().replace(/[^A-Z0-9•*]/g, '').slice(0, 11);
}

// "DL8CAB1234" -> ["DL","8C","AB","1234"]: state(2), number = trailing run of up to 4 digits, the middle split into district / series.
export function plateGroups(t: string): string[] {
  const state = t.slice(0, 2), rest = t.slice(2);
  const m = /^(.*?)([0-9•*]{1,4})$/.exec(rest);
  const mid = m && m[1] ? m[1] : m ? '' : rest, num = m ? m[2] : '';
  const dm = /^([0-9•*]{1,2})(.*)$/.exec(mid);
  let district = dm ? dm[1] : mid, series = dm ? dm[2] : '';
  if (dm && dm[1].length === 1 && series.length >= 3) { district += series[0]; series = series.slice(1); }   // "8" + "CAB" -> "8C" + "AB"
  return [state, district, series, num].filter(Boolean);
}

function Ch({ c, fs, color, animate }: { c: string; fs: number; color: string; animate: boolean }) {
  const v = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (animate) Animated.timing(v, { toValue: 1, duration: 160, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const st = { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] };
  if (c === '•' || c === '*') {
    const d = fs * 0.3;
    return <Animated.View style={[{ width: fs * 0.5, height: fs, alignItems: 'center', justifyContent: 'center' }, st]}><View style={{ width: d, height: d, borderRadius: d, backgroundColor: color }} /></Animated.View>;
  }
  return <Animated.Text allowFontScaling={false} numberOfLines={1} style={[{ fontFamily: CONDENSED, fontSize: fs, lineHeight: fs * 1.18, color, letterSpacing: fs * 0.03, includeFontPadding: false }, st]}>{c}</Animated.Text>;
}

export function Plate({ reg, width, style, dim }: { reg?: string; width?: number | string; style?: StyleProp<ViewStyle>; dim?: boolean }) {
  const txt = plateText(reg || ''), empty = txt.length === 0, chars = empty ? 'DL8CAB1234' : txt;
  const [pw, setPw] = useState(0);
  const [rowW, setRowW] = useState(0);
  const mounted = useRef(false);
  const prevLen = useRef(txt.length);
  useEffect(() => { mounted.current = true; }, []);
  const lenBefore = prevLen.current;
  useEffect(() => { prevLen.current = txt.length; });

  const s = pw / W || 0;                              // px per design unit
  const availW = (962 - 262) * s, availH = 150 * s;   // character area
  const groups = plateGroups(chars), n = chars.length;
  const em = 0.5 * 1.06, gapEm = 0.34;                // conservative per-char advance (em) and gap between groups (em)
  const fs = Math.max(4, Math.min(availH, availW / (n * em + (groups.length - 1) * gapEm)));
  const color = empty ? GHOST : INK;
  const scale = rowW > availW && rowW > 0 ? availW / rowW : 1;   // measured safety net
  const label = empty ? 'Number plate preview' : 'Number plate ' + txt.replace(/[•*]/g, 'x');
  const px = (v: number) => v * s;
  let idx = 0;

  return (
    <View accessible accessibilityLabel={label} onLayout={(e: LayoutChangeEvent) => setPw(e.nativeEvent.layout.width)}
      style={[{ width: width ?? '100%', aspectRatio: PLATE_RATIO }, dim ? { opacity: 0.75 } : null, style]}>
      {pw > 0 ? (
        <View style={{ width: pw, height: px(H), borderRadius: px(46), backgroundColor: '#16171B', padding: px(14) }}>
          <View style={{ flex: 1, borderRadius: px(34), backgroundColor: '#FBFAF6', borderWidth: Math.max(0.5, px(3)), borderColor: '#D8D5CB', overflow: 'hidden' }}>
            {/* screws */}
            {[px(96), pw - px(96) - px(28) - px(28)].map((x, i) => (
              <View key={i} style={{ position: 'absolute', left: x - px(14), top: px(12), width: px(22), height: px(22), borderRadius: px(11), backgroundColor: '#B4B7BD', borderWidth: Math.max(0.5, px(2)), borderColor: '#6C6F76' }} />
            ))}
            {/* left strip: chakra sticker + IND */}
            <View style={{ position: 'absolute', left: px(26), top: px(46), width: px(150), alignItems: 'center' }}>
              <View style={{ width: px(70), height: px(70), borderRadius: px(10), backgroundColor: '#A9D8F0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <View style={{ position: 'absolute', left: 0, top: 0, width: px(70), height: px(35), backgroundColor: '#F3BAD8', opacity: 0.85 }} />
                <View style={{ position: 'absolute', left: px(35), top: px(35), width: px(35), height: px(35), backgroundColor: '#C9B8F0', opacity: 0.8 }} />
                <View style={{ width: px(36), height: px(36), borderRadius: px(18), borderWidth: Math.max(1, px(3.5)), borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: px(9), height: px(9), borderRadius: px(5), backgroundColor: 'rgba(255,255,255,0.9)' }} />
                </View>
              </View>
              <Text allowFontScaling={false} numberOfLines={1} style={{ marginTop: px(8), fontFamily: F.b800, fontSize: px(52), lineHeight: px(60), color: BLUE, includeFontPadding: false }}>IND</Text>
            </View>
            <View style={{ position: 'absolute', left: px(212), top: px(40), bottom: px(40), width: Math.max(1, px(3)), backgroundColor: '#E3E1D8' }} />
            <Text allowFontScaling={false} numberOfLines={1} style={{ position: 'absolute', left: px(26), bottom: px(18), fontFamily: F.body, fontSize: Math.max(3, px(17)), color: '#B3B1AA', includeFontPadding: false }}>TD0000316834</Text>
            {/* registration */}
            <View style={{ position: 'absolute', left: px(248) - px(14), width: availW, top: 0, bottom: px(8), alignItems: 'center', justifyContent: 'center' }}>
              <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
                style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, transform: [{ scale }] }}>
                {groups.map((g, gi) => (
                  <View key={gi} style={{ flexDirection: 'row', flexShrink: 0, marginRight: gi < groups.length - 1 ? fs * gapEm : 0 }}>
                    {g.split('').map((c) => {
                      const k = idx++;
                      return <Ch key={k + ':' + (empty ? 'e' : '')} c={c} fs={fs} color={color} animate={!empty && mounted.current && k >= lenBefore} />;
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
