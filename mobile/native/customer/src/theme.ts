// Colours and type from washingdaddy.com, the same tokens the web app kept in :root.
// Day is the violet poster look (the default), Night is ink. "Ink" is the set of colours text and
// lines take inside one surface, the way the CSS variables cascaded: the violet page, a cream card,
// a violet block. Components read it from InkContext so a Txt inside a card turns ink by itself.
import { createContext, useContext } from 'react';

export const C = {
  violet: '#5409DA', violet2: '#3A06A0', violetDeep: '#4207B5', violetInk: '#2A0478', violetNight: '#24065F',
  ink: '#1A0A33', ink2: '#120724',
  gold: '#FFBA08', cream: '#FFF6E9', cream2: '#F5E8D3',
  orange: '#FF6A1A', sky: '#2E8BFF', mint: '#14C08A', mint2: '#2EE6A6', red: '#E8384F',
  white: '#FFFFFF',
  // Pronto-style tokens
  tint: '#F6F1FF', tint2: '#EFE8FD', grey: '#6B6580', hair: '#ECE8F4', card: '#F7F5FB', green: '#0E9F6E',
};

// Layout tokens, an 8pt grid (4 for hairline gaps). Screens use these instead of loose numbers:
// SP.page = side margin, SP.section = space between page sections, SP.card = padding inside a card,
// SP.stack = gap between items in a list, SP.tight = gap between a title and its sub line.
export const SP = { hair: 4, tight: 4, s: 8, m: 12, l: 16, stack: 12, page: 20, card: 20, xl: 24, section: 32, xxl: 40 } as const;
export const R = { card: 18, inner: 12, ctl: 14, pill: 999 } as const;   // card, tile/row icon, field/control, pill
export const HIT = 44;   // minimum touch target (iOS HIG)

export const F = {
  shout: 'Poppins_700Bold',   // legacy poster fonts now map to clean Poppins
  hero: 'Poppins_700Bold',
  body: 'Poppins_400Regular',
  b500: 'Poppins_500Medium',
  b600: 'Poppins_600SemiBold',
  b700: 'Poppins_700Bold',
  b800: 'Poppins_800ExtraBold',
};

export type Ink = {
  fg: string; fg2: string; fg3: string; line: string; tile: string; tile2: string;
  accent: string; accentInk: string; em: string; ok: string; dash: string;
};

const creamInk: Ink = {   // dark text on white / light tinted surfaces (Pronto look)
  fg: C.ink, fg2: '#3B2C55', fg3: C.grey, line: C.hair, tile: '#FFFFFF',
  tile2: C.tint, accent: C.violet, accentInk: C.white, em: C.violet, ok: '#0E9F6E', dash: 'rgba(26,10,51,.25)',
};
const violetInk: Ink = {   // light text on violet blocks
  fg: C.white, fg2: 'rgba(255,255,255,.88)', fg3: 'rgba(255,255,255,.66)', line: 'rgba(255,255,255,.22)',
  tile: 'rgba(255,255,255,.12)', tile2: 'rgba(255,255,255,.18)', accent: C.gold, accentInk: C.ink, em: C.gold,
  ok: C.mint2, dash: 'rgba(255,255,255,.4)',
};
const nightInk: Ink = {
  fg: '#F4F0FB', fg2: 'rgba(244,240,251,.78)', fg3: 'rgba(244,240,251,.52)', line: 'rgba(244,240,251,.12)',
  tile: 'rgba(255,255,255,.06)', tile2: 'rgba(255,255,255,.1)', accent: '#A67BFF', accentInk: C.white, em: '#A67BFF',
  ok: C.mint2, dash: 'rgba(244,240,251,.3)',
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
  day: true, bg: C.white, dots: 'transparent',
  page: creamInk, card: creamInk, block: violetInk,
  cardBg: C.card, cardBorder: C.hair, cardBorderW: 1, shadow: null,
  blockBg: C.violet, blockBorder: 'transparent',
  sheetBg: C.white, tabBg: C.white, barBg: C.white,
  todayBg: C.violet, todayFg: C.white,
};

export const NIGHT: Theme = {
  day: false, bg: '#12091F', dots: 'transparent',
  page: nightInk, card: nightInk, block: violetInk,
  cardBg: 'rgba(255,255,255,.06)', cardBorder: 'rgba(244,240,251,.1)', cardBorderW: 1, shadow: null,
  blockBg: C.violet2, blockBorder: 'rgba(244,240,251,.12)',
  sheetBg: '#1E1233', tabBg: '#12091F', barBg: '#12091F',
  todayBg: C.violet, todayFg: C.white,
};

export const ThemeContext = createContext<Theme>(DAY);
export const InkContext = createContext<Ink>(violetInk);
export const useTheme = () => useContext(ThemeContext);
export const useInk = () => useContext(InkContext);
export { creamInk, violetInk, nightInk };
