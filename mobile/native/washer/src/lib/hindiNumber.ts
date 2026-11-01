// Spoken Hindi for an amount in rupees, as a list of clip keys: 'n1'..'n99', 'sau', 'hazaar'.
// The voice is built from short recorded clips (see tools/make-voice.mjs), so any price can be said.
export const HINDI_WORDS: Record<string, string> = {
  intro: 'एक्स्ट्रा काम आया है', rupaye: 'रुपये', sau: 'सौ', hazaar: 'हज़ार',
  // the guided wash (src/lib/washGuide.ts)
  ph_wash: 'वॉश करना शुरू कीजिए', ph_dry: 'अब कपड़े से गाड़ी को सुखाइए', ph_polish: 'अब गाड़ी पर पॉलिश कीजिए',
  ph_check: 'कोई कमी या छूटा हुआ हिस्सा देख लीजिए', ph_photo: 'अब गाड़ी की फोटो लीजिए',
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
