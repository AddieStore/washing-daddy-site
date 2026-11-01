// The guided wash: from the moment the timer starts, the washer is told what to do, stage by stage.
//   0-3 min  wash         "wash karna shuru kijiye"
//   3-6 min  dry          dry the car with the cloth (sukhaao)
//   6-9 min  polish       polish the car
//   9-10 min check        look for faults and any part missed
//   10 min+  photo        take the photos (the reminder at the start of the 11th minute)
export type GuideKey = 'wash' | 'dry' | 'polish' | 'check' | 'photo';
export const GUIDE: { key: GuideKey; from: number; clip: string; hi: string; title: string; sub: string }[] = [
  { key: 'wash', from: 0, clip: 'ph_wash', hi: 'वॉश करना शुरू कीजिए', title: 'Wash karo', sub: 'Pressure wash aur foam. Wash karna shuru kijiye' },
  { key: 'dry', from: 180, clip: 'ph_dry', hi: 'अब कपड़े से गाड़ी को सुखाइए', title: 'Kapde se sukhaao', sub: 'Saaf kapde se gaadi ko sukhaao' },
  { key: 'polish', from: 360, clip: 'ph_polish', hi: 'अब गाड़ी पर पॉलिश कीजिए', title: 'Polish karo', sub: 'Gaadi par polish lagao' },
  { key: 'check', from: 540, clip: 'ph_check', hi: 'कोई कमी या छूटा हुआ हिस्सा देख लीजिए', title: 'Kami dekho', sub: 'Koi daag ya chhoota hua hissa dekh lo' },
  { key: 'photo', from: 600, clip: 'ph_photo', hi: 'अब गाड़ी की फोटो लीजिए', title: 'Photo lo', sub: 'Wash khatam: gaadi ki photo lo' },
];
// which stage is it, and how many seconds are left in it (null for the last one)
export function guideAt(startedAt: string | null | undefined, nowMs = Date.now()): { idx: number; step: typeof GUIDE[number]; secsLeft: number | null; elapsed: number } | null {
  const t0 = startedAt ? Date.parse(startedAt) : NaN;
  if (!isFinite(t0)) return null;
  const elapsed = Math.max(0, Math.floor((nowMs - t0) / 1000));
  let idx = 0;
  GUIDE.forEach((g, i) => { if (elapsed >= g.from) idx = i });
  const next = GUIDE[idx + 1];
  return { idx, step: GUIDE[idx], secsLeft: next ? next.from - elapsed : null, elapsed };
}
