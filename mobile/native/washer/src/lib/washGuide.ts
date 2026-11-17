// The guided wash: from the moment the timer starts, the washer is told what to do, stage by stage.
// Mon-Sat:  0-3 min wash, 3-6 dry, 6-9 polish (tyre and trim), 9-10 check, 10+ photo (start of the 11th minute)
// Sunday is the interior-cleaning day: 12 min outside (wash, dry, polish), 12 min inside (dashboard, seats, back seats, mats, mirrors and glass), check, then the photos
// (2 of the car plus 5 of the inside: driver mat, passenger mat, back seat, boot, dashboard).
export type GuideKey = 'wash' | 'dry' | 'interior' | 'polish' | 'check' | 'photo' | 'end';
// pre: a clip played first (the buzzer at the very end)
export type GuideStep = { key: GuideKey; from: number; clip: string; hi: string; title: string; sub: string; pre?: string };
const END: GuideStep = { key: 'end', from: 660, clip: 'ph_end', pre: 'buzz', hi: 'आपका इस कार पर समय पूरा हो चुका है। कृपया अगली गाड़ी पर जाइए।', title: 'Samay poora', sub: 'Aapka is car par samay poora ho chuka hai. Kripya agli gaadi par jaayen' };
export const GUIDE: GuideStep[] = [
  { key: 'wash', from: 0, clip: 'ph_wash', hi: 'कार वॉश शुरू कीजिए, आपका टाइमर शुरू हो गया है', title: 'Wash karo', sub: 'Car wash shuru kijiye, aapka timer shuru ho gaya hai' },
  { key: 'dry', from: 180, clip: 'ph_dry', hi: 'कपड़े से सुखाइए और हर कोने का ध्यान रखिए, कहीं भी मिट्टी न रहे', title: 'Kapde se sukhaao', sub: 'Kapde se sukhaye aur har kone ka dhyan rakhe, kahi bhi mitti na rahe' },
  { key: 'polish', from: 360, clip: 'ph_polish', hi: 'अब टायर और ट्रिम पर पॉलिश लगाइए, और कोई गंदगी हो तो पहले उसे हटाइए', title: 'Polish karo', sub: 'Ab tyre aur trim par polish lagaiye. Koi gandagi ho toh pehle usse hataye' },
  { key: 'check', from: 540, clip: 'ph_check', hi: 'आख़िर में अगर कोई कमी है तो उसे सही कीजिए', title: 'Kami dekho', sub: 'Aakhir mein agar koi kami hai toh usse sahi kijiye' },
  { key: 'photo', from: 600, clip: 'ph_photo', hi: 'अब कार की फोटो लीजिए, कम से कम दो', title: 'Photo lo', sub: 'Ab car ki photo lijiye, kam se kam 2' },
  END,   // 11:00 sharp: buzzer, then the time-up line
];
export const GUIDE_SUNDAY: GuideStep[] = [
  // 12 min outside (4 + 4 + 4), then 12 min inside, then the check and the photos: about 25 min in all
  { ...GUIDE[0], from: 0 }, { ...GUIDE[1], from: 240 }, { ...GUIDE[2], from: 480 },
  { key: 'interior', from: 720, clip: 'ph_i_dash', hi: 'अब डैशबोर्ड साफ़ कीजिए', title: 'Dashboard saaf karo', sub: 'Ab dashboard saaf kijiye' },
  { key: 'interior', from: 900, clip: 'ph_i_seat', hi: 'अब गाड़ी की सीटें साफ़ कीजिए', title: 'Seats saaf karo', sub: 'Ab gaadi ki seats saaf kijiye' },
  { key: 'interior', from: 1080, clip: 'ph_i_back', hi: 'अब पिछली सीटें साफ़ कीजिए', title: 'Back seats saaf karo', sub: 'Ab peeche ki seats saaf kijiye' },
  { key: 'interior', from: 1200, clip: 'ph_i_mat', hi: 'अब सारी मैट साफ़ कीजिए', title: 'Mats saaf karo', sub: 'Ab saari mats saaf kijiye' },
  { key: 'interior', from: 1320, clip: 'ph_i_glass', hi: 'आख़िर में गाड़ी के शीशे और मिरर साफ़ कीजिए', title: 'Sheeshe aur mirror', sub: 'Aakhir mein gaadi ke sheeshe aur mirrors saaf kijiye' },
  { ...GUIDE[3], from: 1440 },
  { key: 'photo', from: 1500, clip: 'ph_photo_sun', hi: 'अब बाहर से गाड़ी की कम से कम दो फोटो लीजिए, फिर अंदर की पाँच फोटो', title: 'Photo lo', sub: 'Car ki 2 photo, phir andar ki 5: driver mat, passenger mat, back seat, boot, dashboard' },
  { ...END, from: 1560 },   // 26:00 sharp
];
// the five inside photos asked for on Sundays, in the order the voice asks for them
export const SPOTS: { key: string; label: string; clip: string }[] = [
  { key: 'driver_mat', label: 'Driver side mat', clip: 'ph_s_driver' },
  { key: 'passenger_mat', label: 'Passenger side mat', clip: 'ph_s_pass' },
  { key: 'back_seat', label: 'Back seat', clip: 'ph_s_back' },
  { key: 'boot', label: 'Boot', clip: 'ph_s_boot' },
  { key: 'dashboard', label: 'Dashboard', clip: 'ph_s_dash' },
];
// Sunday in India (IST = UTC+5:30) for the instant the timer started
export const isSundayIST = (iso: string | null | undefined): boolean => {
  const t = iso ? Date.parse(iso) : NaN; return isFinite(t) && new Date(t + 19800000).getUTCDay() === 0;
};
// The interior add-on (Mon-Sat): from second `at` a 10-minute interior block is inserted (2 min each: dashboard, seats,
// back seats, mats, glass) and every later stage moves 10 minutes later. Sundays already have the interior in the plan.
export const INTERIOR_SECS = 600;
export function withInterior(plan: GuideStep[], at: number): GuideStep[] {
  const block = GUIDE_SUNDAY.filter(g => g.clip.startsWith('ph_i_')).map((g, i) => ({ ...g, from: at + i * 120 }));
  return [...plan.filter(g => g.from < at), ...block, ...plan.filter(g => g.from >= at).map(g => ({ ...g, from: g.from + INTERIOR_SECS }))];
}
export const planFor = (startedAt: string | null | undefined, interiorFrom?: number | null): GuideStep[] =>
  isSundayIST(startedAt) ? GUIDE_SUNDAY : interiorFrom != null ? withInterior(GUIDE, interiorFrom) : GUIDE;
// the washer's first name as a clip key suffix: "Sharukh Khan" -> nm_sharukh (spoken before each announcement when that clip exists)
export const nameClip = (name: string | null | undefined): string | null => {
  const w = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, ''); return w ? 'nm_' + w : null;
};
// which stage is it, and how many seconds are left in it (null for the last one)
export function guideAt(startedAt: string | null | undefined, nowMs = Date.now(), interiorFrom?: number | null): { idx: number; step: GuideStep; plan: GuideStep[]; secsLeft: number | null; elapsed: number } | null {
  const t0 = startedAt ? Date.parse(startedAt) : NaN;
  if (!isFinite(t0)) return null;
  const plan = planFor(startedAt, interiorFrom);
  const elapsed = Math.max(0, Math.floor((nowMs - t0) / 1000));
  let idx = 0;
  plan.forEach((g, i) => { if (elapsed >= g.from) idx = i });
  const next = plan[idx + 1];
  return { idx, step: plan[idx], plan, secsLeft: next ? next.from - elapsed : null, elapsed };
}
