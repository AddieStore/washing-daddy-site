// Quiet neutral ramp (white page, #F4F4F5 raised, hairline) with one violet accent; Night is graphite. "Ink" is the set of colours text and
// lines take inside one surface, the way the CSS variables cascaded: the violet page, a cream card,
// a violet block. Components read it from InkContext so a Txt inside a card turns ink by itself.
import { createContext, useContext } from 'react';

export const C = {
  violet: '#5409DA', violet2: '#5409DA', violetDeep: '#5409DA', violetInk: '#5409DA', violetNight: '#5409DA',   // one accent, no deep variants
  ink: '#171717', ink2: '#171717',
  gold: '#FFBA08',   // only inside the 3D renders, not for chrome
  cream: '#FFFFFF', cream2: '#F4F4F5',
  orange: '#FF6A1A', sky: '#2E8BFF', mint: '#16a34a', mint2: '#16a34a', red: '#dc2626',
  white: '#FFFFFF',
  // neutral ramp: raised surface, hairline, text roles
  tint: '#F4F4F5', tint2: '#F4F4F5', grey: '#737373', hair: 'rgba(23,23,23,0.08)', card: '#FFFFFF', green: '#16a34a',
  text2: '#525252',
  // Brand surfaces: a soft violet-tinted canvas behind white cards (signed-in app, login sheet), the deep brand violets for the login top.
  canvas: '#F6F2FF', canvas2: '#EDE5FF', tabBar: '#FFFFFF', page: '#FFFFFF', hairViolet: 'rgba(84,9,218,0.10)', brandTop: '#5409DA', brandDeep: '#3A0599', saffron: '#FFBA08',
};

// Layout tokens on a 4px grid. SP.page = side margin, SP.section = space between page sections, SP.card = padding inside a card,
// SP.stack = gap between cards in a list, SP.tight = gap between a title and its sub line.
export const SP = { hair: 4, tight: 4, s: 8, m: 12, l: 16, stack: 12, page: 16, card: 16, xl: 24, section: 32, xxl: 40 } as const;
export const R = { card: 16, inner: 12, ctl: 12, chip: 8, sheet: 24, pill: 999 } as const;   // card, tile/row icon, button/field, chip, sheet/panel, pill
export const HIT = 44;   // minimum touch target (iOS HIG)
export const SHADOW_SM = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } as const;
// r5: cards lose their hairline and float on a soft spread shadow over a grey page (Pronto)
export const SHADOW_CARD = { shadowColor: '#1A1033', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 } as const;
export const PAGE_GREY = '#FFFFFF';   // every page is white; C.canvas (lavender) is only for small tinted surfaces
export const SHADOW_FLOAT = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 } as const;

// Type: Plus Jakarta Sans for everything you read and tap (400 body, 500 labels, 600 titles, 700 numbers), Bricolage Grotesque for the
// few big expressive headlines (home hero, page heroes). Any 500 text >= 17px renders 600.
export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  display700: 'BricolageGrotesque_700Bold',
  shout: 'BricolageGrotesque_700Bold',
  hero: 'BricolageGrotesque_700Bold',
  body: 'PlusJakartaSans_400Regular',
  b500: 'PlusJakartaSans_500Medium',
  b600: 'PlusJakartaSans_600SemiBold',
  b700: 'PlusJakartaSans_700Bold',
  b800: 'PlusJakartaSans_800ExtraBold',
};

export type Ink = {
  fg: string; fg2: string; fg3: string; line: string; tile: string; tile2: string;
  accent: string; accentInk: string; em: string; ok: string; dash: string;
};

const creamInk: Ink = {   // dark text on white / light tinted surfaces (Pronto look)
  fg: C.ink, fg2: '#525252', fg3: C.grey, line: C.hair, tile: '#FFFFFF',
  tile2: C.tint, accent: C.violet, accentInk: C.white, em: C.violet, ok: '#16a34a', dash: 'rgba(23,23,23,.2)',
};
const violetInk: Ink = {   // light text on violet blocks
  fg: C.white, fg2: 'rgba(255,255,255,.88)', fg3: 'rgba(255,255,255,.66)', line: 'rgba(255,255,255,.22)',
  tile: 'rgba(255,255,255,.12)', tile2: 'rgba(255,255,255,.18)', accent: C.gold, accentInk: C.ink, em: C.gold,
  ok: C.mint2, dash: 'rgba(255,255,255,.4)',
};
const nightInk: Ink = {
  fg: '#EDEDED', fg2: '#A1A1A6', fg3: '#85858B', line: 'rgba(237,237,237,.08)',
  tile: '#19191B', tile2: '#232325', accent: '#A67BFF', accentInk: C.white, em: '#A67BFF',
  ok: '#4cc38a', dash: 'rgba(237,237,237,.25)',
};

export type Theme = {
  day: boolean;
  bg: string; dots: string;
  page: Ink;          // text straight on the page
  card: Ink;          // inside cards, rows, sheets
  block: Ink;         // inside violet blocks (hero, ritual, washer)
  cardBg: string; cardBorder: string; cardBorderW: number; shadow: string | null;
  blockBg: string; blockBorder: string;
  sheetBg: string; tabBg: string; barBg: string;
  todayBg: string; todayFg: string;
};

export const DAY: Theme = {
  day: true, bg: C.page, dots: 'transparent',
  page: creamInk, card: creamInk, block: creamInk,
  cardBg: C.card, cardBorder: C.hair, cardBorderW: 1, shadow: null,
  blockBg: C.white, blockBorder: C.hair,
  sheetBg: C.white, tabBg: C.tabBar, barBg: C.page,
  todayBg: C.violet, todayFg: C.white,
};

export const NIGHT: Theme = {
  day: false, bg: '#141415', dots: 'transparent',
  page: nightInk, card: nightInk, block: nightInk,
  cardBg: '#19191B', cardBorder: 'rgba(237,237,237,.08)', cardBorderW: 1, shadow: null,
  blockBg: '#19191B', blockBorder: 'rgba(237,237,237,.08)',
  sheetBg: '#19191B', tabBg: '#141415', barBg: '#141415',
  todayBg: C.violet, todayFg: C.white,
};

export const ThemeContext = createContext<Theme>(DAY);
export const InkContext = createContext<Ink>(violetInk);
export const useTheme = () => useContext(ThemeContext);
export const useInk = () => useContext(InkContext);
export { creamInk, violetInk, nightInk };
