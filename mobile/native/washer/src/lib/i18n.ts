// App language. The app is written in Hinglish; t() swaps in the washer's language. Car names, plates, plans, areas and
// people's names are data and never pass through t().
// ---- languages ----
// Hinglish is the source language written in the code. Every other language is a table keyed by that Hinglish text
// (src/lib/i18n/<code>.ts exports T = strings and P = the same patterns as HI_PATTERNS with translated output).
// A key a table lacks falls back to the Hinglish original (Marathi falls back to Hindi first: same script).
import * as HIT from './i18n/hi';
import * as EN from './i18n/en';
import * as PA from './i18n/pa';
import * as MR from './i18n/mr';
import * as GU from './i18n/gu';
import * as BN from './i18n/bn';
import * as TA from './i18n/ta';
import * as TE from './i18n/te';
export type Lang = 'hinglish' | 'hi' | 'en' | 'pa' | 'mr' | 'gu' | 'bn' | 'ta' | 'te';
type Tbl = { T: Record<string, string>; P: [RegExp, string][] };
const TABLES: Partial<Record<Lang, Tbl>> = { hi: HIT, en: EN, pa: PA, mr: MR, gu: GU, bn: BN, ta: TA, te: TE };
const FALLBACK: Partial<Record<Lang, Lang>> = { mr: 'hi' };

function trIn(tb: Tbl, t: string): string | null {
  const s = t.trim();
  if (!s) return null;
  const hit = tb.T[s];
  if (hit) return t.replace(s, hit);
  for (const [re, out] of tb.P) if (re.test(s)) return t.replace(s, s.replace(re, out));
  if (s.includes(' · ')) {
    let any = false;
    const done = s.split(' · ').map(part => {
      const h = tb.T[part];
      if (h) { any = true; return h }
      for (const [re, out] of tb.P) if (re.test(part)) { any = true; return part.replace(re, out) }
      return part;
    });
    if (any) return t.replace(s, done.join(' · '));
  }
  return null;
}
export function trOf(lang: Lang, t: string): string | null {
  for (let l: Lang | undefined = lang; l; l = FALLBACK[l]) {
    const tb = TABLES[l];
    const r = tb ? trIn(tb, t) : null;
    if (r) return r;
  }
  return null;
}
export const hiOf = (t: string) => trOf('hi', t);
export const TRANSLATED: Lang[] = ['hinglish', 'hi', 'en', 'pa', 'mr', 'gu', 'bn', 'ta', 'te'];

let lang: Lang = 'hinglish';
export const setLang = (l: Lang) => { lang = l };
export const currentLang = () => lang;
export const setHindi = (on: boolean) => { lang = on ? 'hi' : 'hinglish' };
export const isHindi = () => lang === 'hi' || lang === 'mr';   // Devanagari weekday names etc.
// t('Round shuru karo') -> 'राउंड शुरू करो' in Hindi, 'Start round' in English, unchanged in Hinglish
export const t = (s: string) => (lang === 'hinglish' ? s : trOf(lang, s) ?? s);
