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
};

export const F = {
  shout: 'Anton_400Regular',
  hero: 'AlfaSlabOne_400Regular',
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

const creamInk: Ink = {
  fg: C.ink, fg2: '#3B2C55', fg3: 'rgba(26,10,51,.6)', line: 'rgba(26,10,51,.14)', tile: '#FFFFFF',
  tile2: 'rgba(26,10,51,.07)', accent: C.violet, accentInk: C.cream, em: C.violet, ok: '#0E9F6E', dash: 'rgba(26,10,51,.3)',
};
const violetInk: Ink = {
  fg: C.cream, fg2: 'rgba(255,246,233,.85)', fg3: 'rgba(255,246,233,.62)', line: 'rgba(255,246,233,.2)',
  tile: 'rgba(255,255,255,.1)', tile2: 'rgba(255,255,255,.16)', accent: C.gold, accentInk: C.ink, em: C.gold,
  ok: C.mint2, dash: 'rgba(255,246,233,.38)',
};
const nightInk: Ink = {
  fg: C.cream, fg2: 'rgba(255,246,233,.72)', fg3: 'rgba(255,246,233,.48)', line: 'rgba(255,246,233,.12)',
  tile: 'rgba(255,255,255,.06)', tile2: 'rgba(255,255,255,.1)', accent: C.gold, accentInk: C.ink, em: C.gold,
  ok: C.mint2, dash: 'rgba(255,246,233,.3)',
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
  day: true, bg: C.violet, dots: 'rgba(255,246,233,.09)',
  page: violetInk, card: creamInk, block: violetInk,
  cardBg: C.cream, cardBorder: C.ink, cardBorderW: 3, shadow: C.violetInk,
  blockBg: C.violetDeep, blockBorder: C.cream,
  sheetBg: C.cream, tabBg: C.violetDeep, barBg: C.violet,
  todayBg: C.gold, todayFg: C.ink,
};

export const NIGHT: Theme = {
  day: false, bg: C.ink, dots: 'rgba(255,246,233,.06)',
  page: nightInk, card: nightInk, block: violetInk,
  cardBg: 'rgba(255,255,255,.06)', cardBorder: 'rgba(255,246,233,.12)', cardBorderW: 1, shadow: null,
  blockBg: C.violet2, blockBorder: 'rgba(255,246,233,.16)',
  sheetBg: '#22094F', tabBg: 'rgba(26,10,51,.96)', barBg: C.ink,
  todayBg: C.cream, todayFg: C.ink,
};

export const ThemeContext = createContext<Theme>(DAY);
export const InkContext = createContext<Ink>(violetInk);
export const useTheme = () => useContext(ThemeContext);
export const useInk = () => useContext(InkContext);
export { creamInk, violetInk, nightInk };
