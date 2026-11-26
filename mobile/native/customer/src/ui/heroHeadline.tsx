// Home hero headline: a rotating set of two-line headlines in Bricolage Grotesque. Each line rolls up out of its own mask (like a
// split-flap ticker), line two follows a beat later in the accent colour, then a hand-drawn saffron underline draws itself under it.
// Every ~3.6 s the lines roll out upwards and the next headline rolls in. Reduced motion: the first headline, still.
// The rider below the headline (HeroRide) is untouched.
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withDelay, withSpring, withSequence, useReducedMotion, runOnJS, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { F } from '../theme';

/** [line one, line two]. Line two is the payoff (accent colour + underline). Each line stays under ~18 characters so it fits on one
 *  line at 34 pt on a 360 pt wide phone; anything longer shrinks to fit instead of wrapping. */
export const HEADLINES: [string, string][] = [
  ['Gaadi chamkegi,', 'roz subah.'],
  ['Pressure wash.', 'No pocha.'],
  ['Your car, washed', 'before chai.'],
  ['Doorstep wash', 'in 15 minutes.'],
  ['Delhi ki dhool', 'ab nahi chalegi.'],
  ['Parking mein', 'showroom shine.'],
  ['Daily wash,', 'monthly peace.'],
  ['Office jaane se', 'pehle chamak.'],
  ['Foam. Rinse.', 'Hand-dried.'],
  ['Photo proof,', 'every single wash.'],
  ['Book in seconds,', 'shine in minutes.'],
  ['Bina bucket,', 'bina tension.'],
  ['Wakes up shiny,', 'every morning.'],
  ['Sunday-wala shine,', 'every day.'],
  ['Monsoon mud?', 'Gone by 8 AM.'],
  ['Shaadi ready?', 'Car bhi ready.'],
  ['Verified washers,', 'trusted hands.'],
  ['Water and power?', 'We bring both.'],
  ['Less effort,', 'more shine.'],
  ['Festive season?', 'Make it sparkle.'],
  ['No more', 'kapda-pocha.'],
  ['Car so clean,', 'neighbours notice.'],
  ['Your washer is', 'on the way.'],
  ['Chamakti gaadi,', 'khush mood.'],
];
/** a single-line title from the remote config ("Let your car shine brighter") -> two lines, split near the middle on a space */
export function splitTitle(t: string): [string, string] {
  const w = t.trim().split(/\s+/); if (w.length < 2) return [t.trim(), ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}

const SIZE = 34, LH = 44, CYCLE = 3600, OUT = 260, EASE_OUT = Easing.bezier(0.55, 0, 0.75, 0.25);
const SAFF = '#FFBA08';

/** one masked line: when `text` changes the old text rolls up and away, the new one rolls up into place with a soft spring */
function RollLine({ text, delay, color, onWidth }: { text: string; delay: number; color: string; onWidth?: (w: number) => void }) {
  const rm = useReducedMotion(), [shown, setShown] = useState(text), y = useSharedValue(rm ? 0 : LH), o = useSharedValue(rm ? 1 : 0);
  const enter = () => { 'worklet'; y.value = LH; o.value = 0; y.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 170, mass: 0.8 })); o.value = withDelay(delay, withTiming(1, { duration: 220 })) };
  useEffect(() => { if (!rm) enter() }, []);   // first appearance
  useEffect(() => {
    if (text === shown) return;
    if (rm) { setShown(text); return }
    // roll the old line up and out, swap the text off-screen, roll the new one in
    y.value = withDelay(delay * 0.6, withTiming(-LH, { duration: OUT, easing: EASE_OUT }, done => { if (done) runOnJS(setShown)(text) }));
    o.value = withDelay(delay * 0.6, withTiming(0, { duration: OUT }));
  }, [text]);
  useEffect(() => { if (!rm && shown === text && y.value < 0) enter() }, [shown]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: LH, overflow: 'hidden' }}>
      <Reanimated.View style={st}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} onLayout={e => onWidth && onWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: 'flex-start', fontFamily: F.display, fontSize: SIZE, lineHeight: LH, letterSpacing: -1, color, includeFontPadding: false }}>{shown}</Text>
      </Reanimated.View>
    </View>
  );
}

const APath = Reanimated.createAnimatedComponent(Path);
const SWOOSH = 'M2 9 C 40 3, 90 2, 140 5 S 190 9, 198 6';
const SWOOSH_LEN = 205;
/** the saffron underline under line two: draws left to right after the line lands, retracts before it leaves */
function Swoosh({ width, run }: { width: number; run: number }) {
  const rm = useReducedMotion(), d = useSharedValue(rm ? 0 : SWOOSH_LEN);
  useEffect(() => {
    if (rm) return;
    d.value = withSequence(withTiming(SWOOSH_LEN, { duration: 0 }), withDelay(520, withTiming(0, { duration: 520, easing: Easing.bezier(0.22, 1, 0.36, 1) })),
      withDelay(CYCLE - 520 - 520 - 380, withTiming(SWOOSH_LEN, { duration: 240, easing: EASE_OUT })));
  }, [run]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: d.value }));
  if (width < 20) return null;
  return (
    <Svg width={Math.min(width, 260)} height={12} viewBox="0 0 200 12" preserveAspectRatio="none" style={{ marginTop: -4 }}>
      <APath d={SWOOSH} stroke={SAFF} strokeWidth={4} strokeLinecap="round" fill="none" strokeDasharray={SWOOSH_LEN} animatedProps={ap} />
    </Svg>
  );
}

export function HeroHeadline({ first, sub, ink, accent, subColor }: { first?: string; sub?: string; ink: string; accent: string; subColor: string }) {
  const rm = useReducedMotion();
  const list = React.useMemo(() => {
    const f = first ? splitTitle(first) : null;
    return f && !HEADLINES.some(h => h.join(' ') === f.join(' ')) ? [f, ...HEADLINES] : HEADLINES;
  }, [first]);
  const [i, setI] = useState(0), [w2, setW2] = useState(0);
  useEffect(() => { if (rm) return; const t = setInterval(() => setI(n => (n + 1) % list.length), CYCLE); return () => clearInterval(t) }, [rm, list.length]);
  const [l1, l2] = list[i];
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${l1} ${l2}${sub ? '. ' + sub : ''}`}>
      <RollLine text={l1} delay={0} color={ink} />
      <RollLine text={l2} delay={110} color={accent} onWidth={setW2} />
      <Swoosh width={w2} run={i} />
      {sub ? <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 15, lineHeight: 21, color: subColor, marginTop: 6 }}>{sub}</Text> : null}
    </View>
  );
}
