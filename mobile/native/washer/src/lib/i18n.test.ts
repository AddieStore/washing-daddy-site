import test from 'node:test';
import assert from 'node:assert/strict';
import * as HI from './i18n/hi.ts';
import * as EN from './i18n/en.ts';
import * as PA from './i18n/pa.ts';
import * as MR from './i18n/mr.ts';
import * as GU from './i18n/gu.ts';
import * as BN from './i18n/bn.ts';
import * as TA from './i18n/ta.ts';
import * as TE from './i18n/te.ts';

const LANGS: Record<string, { T: Record<string, string>; P: [RegExp, string][] }> = { en: EN, pa: PA, mr: MR, gu: GU, bn: BN, ta: TA, te: TE };
// things that must survive translation unchanged
const keep = (s: string) => (s.match(/₹|\bWD\d+|WhatsApp|SOS|OTP|\b112\b|Washing Daddy|\$\d/g) || []).sort().join('|');

for (const [code, tb] of Object.entries(LANGS)) {
  test(`${code}: every Hindi key is translated`, () => {
    const missing = Object.keys(HI.T).filter(k => !tb.T[k]);
    assert.equal(missing.length, 0, `${code} is missing ${missing.length} keys, e.g. ${missing.slice(0, 5).join(' | ')}`);
    const extra = Object.keys(tb.T).filter(k => !(k in HI.T));
    assert.equal(extra.length, 0, `${code} has keys that are not in the source: ${extra.slice(0, 5).join(' | ')}`);
  });
  test(`${code}: patterns match the Hindi ones`, () => {
    assert.equal(tb.P.length, HI.P.length);
    HI.P.forEach(([re, out], i) => {
      assert.equal(tb.P[i][0].source, re.source, `pattern ${i} regex differs`);
      assert.equal((tb.P[i][1].match(/\$\d/g) || []).sort().join(), (out.match(/\$\d/g) || []).sort().join(), `pattern ${i}: $-groups differ`);
    });
  });
  test(`${code}: ₹, codes, brand words and placeholders are kept`, () => {
    for (const [k, v] of Object.entries(tb.T)) assert.equal(keep(v), keep(k), `${code}: "${k}" -> "${v}"`);
  });
}
