// The guided wash: from the moment the timer starts, the washer is told what to do, stage by stage.
// Mon-Sat:  0-3 min wash, 3-6 dry, 6-9 polish (tyre and trim), 9-10 check, 10+ photo (start of the 11th minute)
// Sunday is the interior-cleaning day, so it has its own plan: wash, dry, interior, polish, check, then the photos
// (2 of the car plus 4 of the inside: driver mat, passenger mat, back seat, dashboard).
export type GuideKey = 'wash' | 'dry' | 'interior' | 'polish' | 'check' | 'photo';
export type GuideStep = { key: GuideKey; from: number; clip: string; hi: string; title: string; sub: string };
export const GUIDE: GuideStep[] = [
  { key: 'wash', from: 0, clip: 'ph_wash', hi: 'कार वॉश शुरू कीजिए, आपका टाइमर शुरू हो गया है', title: 'Wash karo', sub: 'Car wash shuru kijiye, aapka timer shuru ho gaya hai' },
  { key: 'dry', from: 180, clip: 'ph_dry', hi: 'कपड़े से सुखाइए और हर कोने का ध्यान रखिए, कहीं भी मिट्टी न रहे', title: 'Kapde se sukhaao', sub: 'Kapde se sukhaye aur har kone ka dhyan rakhe, kahi bhi mitti na rahe' },
  { key: 'polish', from: 360, clip: 'ph_polish', hi: 'अब टायर और ट्रिम पर पॉलिश लगाइए, और कोई गंदगी हो तो पहले उसे हटाइए', title: 'Polish karo', sub: 'Ab tyre aur trim par polish lagaiye. Koi gandagi ho toh pehle usse hataye' },
  { key: 'check', from: 540, clip: 'ph_check', hi: 'आख़िर में अगर कोई कमी है तो उसे सही कीजिए', title: 'Kami dekho', sub: 'Aakhir mein agar koi kami hai toh usse sahi kijiye' },
  { key: 'photo', from: 600, clip: 'ph_photo', hi: 'अब कार की फोटो लीजिए, कम से कम दो', title: 'Photo lo', sub: 'Ab car ki photo lijiye, kam se kam 2' },
];
export const GUIDE_SUNDAY: GuideStep[] = [
  GUIDE[0], GUIDE[1],
  { key: 'interior', from: 360, clip: 'ph_int', hi: 'अब गाड़ी के अंदर की सफाई कीजिए: मैट, सीटें और डैशबोर्ड, कोई कोना न छूटे', title: 'Andar ki safai', sub: 'Mats, seats aur dashboard saaf karo. Koi kona na chhute' },
  { ...GUIDE[2], from: 600 },
  { ...GUIDE[3], from: 780 },
  { key: 'photo', from: 840, clip: 'ph_photo_sun', hi: 'अब बाहर से गाड़ी की कम से कम दो फोटो लीजिए, फिर अंदर की चार फोटो', title: 'Photo lo', sub: 'Car ki 2 photo, phir andar ki 4: driver mat, passenger mat, back seat, dashboard' },
];
// the four inside photos asked for on Sundays, in the order the voice asks for them
export const SPOTS: { key: string; label: string; clip: string }[] = [
  { key: 'driver_mat', label: 'Driver side mat', clip: 'ph_s_driver' },
  { key: 'passenger_mat', label: 'Passenger side mat', clip: 'ph_s_pass' },
  { key: 'back_seat', label: 'Back seat', clip: 'ph_s_back' },
  { key: 'dashboard', label: 'Dashboard', clip: 'ph_s_dash' },
];
// Sunday in India (IST = UTC+5:30) for the instant the timer started
export const isSundayIST = (iso: string | null | undefined): boolean => {
  const t = iso ? Date.parse(iso) : NaN; return isFinite(t) && new Date(t + 19800000).getUTCDay() === 0;
};
export const planFor = (startedAt: string | null | undefined): GuideStep[] => isSundayIST(startedAt) ? GUIDE_SUNDAY : GUIDE;
// the washer's first name as a clip key suffix: "Sharukh Khan" -> nm_sharukh (spoken before each announcement when that clip exists)
export const nameClip = (name: string | null | undefined): string | null => {
  const w = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, ''); return w ? 'nm_' + w : null;
};
// which stage is it, and how many seconds are left in it (null for the last one)
export function guideAt(startedAt: string | null | undefined, nowMs = Date.now()): { idx: number; step: GuideStep; plan: GuideStep[]; secsLeft: number | null; elapsed: number } | null {
  const t0 = startedAt ? Date.parse(startedAt) : NaN;
  if (!isFinite(t0)) return null;
  const plan = planFor(startedAt);
  const elapsed = Math.max(0, Math.floor((nowMs - t0) / 1000));
  let idx = 0;
  plan.forEach((g, i) => { if (elapsed >= g.from) idx = i });
  const next = plan[idx + 1];
  return { idx, step: plan[idx], plan, secsLeft: next ? next.from - elapsed : null, elapsed };
}
