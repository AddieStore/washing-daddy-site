// Spoken Hindi for an amount in rupees, as a list of clip keys: 'n1'..'n99', 'sau', 'hazaar'.
// The voice is built from short recorded clips (see tools/make-voice.mjs), so any price can be said.
export const HINDI_WORDS: Record<string, string> = {
  intro: 'एक्स्ट्रा काम आया है', rupaye: 'रुपये', sau: 'सौ', hazaar: 'हज़ार',
  // the guided wash (src/lib/washGuide.ts)
  ph_wash: 'कार वॉश शुरू कीजिए, आपका टाइमर शुरू हो गया है',
  ph_dry: 'कपड़े से सुखाइए और हर कोने का ध्यान रखिए, कहीं भी मिट्टी न रहे',
  ph_polish: 'अब टायर और ट्रिम पर पॉलिश लगाइए, और कोई गंदगी हो तो पहले उसे हटाइए',
  ph_check: 'आख़िर में अगर कोई कमी है तो उसे सही कीजिए',
  ph_photo: 'अब कार की फोटो लीजिए, कम से कम दो',
  // 5:00 every morning, and the late-car alert (said after the car number and slot)
  ph_morning: 'काम का समय हो गया है, कृपया तैयार हो जाएँ और हब पहुँचें।',
  ph_late: 'इस गाड़ी पर काम नहीं हुआ है। कृपया इस गाड़ी पर पहुँचें और काम शुरू करें।',
  ph_slot: 'स्लॉट', ph_bajkar: 'बजकर', ph_min: 'मिनट',
  ph_interior: 'इंटीरियर का काम जोड़ दिया गया है, दस मिनट बढ़ा दिए गए हैं।',
  // letters and zero for reading a car number aloud (digits 1-9 reuse n1..n9)
  pl_0: 'शून्य', pl_a: 'ए', pl_b: 'बी', pl_c: 'सी', pl_d: 'डी', pl_e: 'ई', pl_f: 'एफ', pl_g: 'जी', pl_h: 'एच', pl_i: 'आई',
  pl_j: 'जे', pl_k: 'के', pl_l: 'एल', pl_m: 'एम', pl_n: 'एन', pl_o: 'ओ', pl_p: 'पी', pl_q: 'क्यू', pl_r: 'आर', pl_s: 'एस',
  pl_t: 'टी', pl_u: 'यू', pl_v: 'वी', pl_w: 'डबल्यू', pl_x: 'एक्स', pl_y: 'वाई', pl_z: 'ज़ेड',
  // 11:00 sharp (26:00 on Sundays): the buzzer plays first, then this line
  ph_end: 'आपका इस कार पर समय पूरा हो चुका है। कृपया अगली गाड़ी पर जाइए।',
  // Sunday: interior cleaning day
  ph_i_dash: 'अब डैशबोर्ड साफ़ कीजिए', ph_i_seat: 'अब गाड़ी की सीटें साफ़ कीजिए', ph_i_back: 'अब पिछली सीटें साफ़ कीजिए',
  ph_i_mat: 'अब सारी मैट साफ़ कीजिए', ph_i_glass: 'आख़िर में गाड़ी के शीशे और मिरर साफ़ कीजिए',
  ph_photo_sun: 'अब बाहर से गाड़ी की कम से कम दो फोटो लीजिए, फिर अंदर की चार फोटो',
  ph_s_driver: 'ड्राइवर साइड की मैट की फोटो लीजिए', ph_s_pass: 'पैसेंजर साइड की मैट की फोटो लीजिए',
  ph_s_back: 'पिछली सीट की फोटो लीजिए', ph_s_dash: 'डैशबोर्ड की फोटो लीजिए',
  // the washer's name, said before every announcement (nm_<first name>); add a line per washer, then re-run the voice script
  nm_chotte: 'छोटे जी', nm_shahrukh: 'शाहरुख जी',
};
const N = ('एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस '
  + 'इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस '
  + 'इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ '
  + 'इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी '
  + 'इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे').split(' ');
N.forEach((w, i) => { HINDI_WORDS['n' + (i + 1)] = w });

// 799 -> ['n7','sau','n99'], 1500 -> ['n1','hazaar','n5','sau'], 40 -> ['n40']. Amounts above 99,999 are said as 99,999.
export function amountClips(amount: number): string[] {
  let a = Math.max(0, Math.min(99999, Math.round(Number(amount) || 0)));
  const out: string[] = [];
  const th = Math.floor(a / 1000); a %= 1000;
  if (th) out.push('n' + th, 'hazaar');
  const h = Math.floor(a / 100); a %= 100;
  if (h) out.push('n' + h, 'sau');
  if (a) out.push('n' + a);
  return out;
}
// the whole announcement: intro, amount, rupaye (no amount: just the intro)
export const announceClips = (amount?: number | null): string[] =>
  amount && amount > 0 ? ['intro', ...amountClips(amount), 'rupaye'] : ['intro'];

// a car number read out one character at a time: DL4CAB2731 -> d l 4 c a b 2 7 3 1
export function plateClips(reg: string): string[] {
  const out: string[] = [];
  for (const ch of String(reg || '').toLowerCase().replace(/[^a-z0-9]/g, '')) {
    if (ch >= '1' && ch <= '9') out.push('n' + ch); else if (ch === '0') out.push('pl_0'); else out.push('pl_' + ch);
  }
  return out;
}
// "<car number>, slot 7 bajkar 20 minute, <this car has not been done ...>"; from is the slot start "HH:MM"
export function lateClips(reg: string, from?: string | null): string[] {
  const out = plateClips(reg);
  const m = /^(\d{1,2}):(\d{2})$/.exec(from || '');
  if (m) {
    const h = Number(m[1]) % 12 || 12, mi = Number(m[2]);
    out.push('ph_slot', 'n' + h); if (mi) out.push('ph_bajkar', 'n' + mi, 'ph_min');
  }
  out.push('ph_late');
  return out;
}
