import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export const brand = {
  violet: '#5409DA',
  violet2: '#3A06A0',
  violetDeep: '#24065F',
  ink: '#1A0A33',
  ink2: '#120724',
  gold: '#FFBA08',
  cream: '#FFF6E9',
  cream2: '#F5E8D3',
  orange: '#FF6A1A',
  sky: '#2E8BFF',
  mint: '#14C08A',
  red: '#E8384F',
} as const;

export const F = {
  shout: 'Anton_400Regular',
  hero: 'Poppins_700Bold',
  // Pronto r5 scale (customer app): 400 body, 500 label, 600 title, 700 figure, 800 hero.
  body: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semi: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_800ExtraBold',   // Pronto r5: hero headlines are ExtraBold (customer app)
} as const;

export type Tokens = {
  bg: string;
  stage: string;
  fg: string;
  fg2: string;
  fg3: string;
  line: string;
  tile: string;
  tile2: string;
  accent: string;
  accentInk: string;
  em: string;
  barBg: string;
  tabBg: string;
  sheetBg: string;
  inputBg: string;
  ok: string;
  dash: string;
  shadow: boolean;
  /** Redesign tokens (2026-11): see partner-redesign-spec.md. */
  card: string;        // white card surface
  soft: string;        // light-violet: inactive bars, inactive tab, quiet bubbles
  softInk: string;     // text/icon colour on `soft`
  primary: string;     // violet for selected day, highlighted bar, centre button
  hero: string;        // tinted gold hero card
  heroTrack: string;   // ring track on the hero card
  heroInk: string;     // text on the hero card
  shadowColor: string; // soft card shadow colour
  /** Reference-look tokens (v22 kit). */
  canvas: string;      // page canvas (same as bg)
  grey: string;        // the one grey: section labels, values, captions
  navOn: string;       // selected pill in the floating tab bar
  navOnInk: string;    // icon + label on navOn
  navShadow: string;   // floating bar shadow colour
  violet: string;
  violet2: string;
  /** Primary text colour (#141414 light, near-white dark). */
  ink: string;
  gold: string;
  cream: string;
  orange: string;
  sky: string;
  mint: string;
  red: string;
};

const base = {
  violet: brand.violet,
  violet2: brand.violet2,
  ink: '#141414',
  gold: brand.gold,
  cream: brand.cream,
  orange: brand.orange,
  sky: brand.sky,
  mint: brand.mint,
  red: brand.red,
};

export const lightTokens: Tokens = {
  ...base,
  // Pronto look shared with the customer app (customer src/theme.ts + pages/parts.tsx): grey page, white floating cards, neutral ink ramp.
  // 2026-11-21: brand canvas from the customer app (customer src/theme.ts C.canvas / C.tabBar), white cards float on it.
  // 2026-11-24 feel pass (DESIGN-REFERENCE): neutral canvas, two text colours only (#141414 / #7A7A80), hairline #EDEDF0.
  bg: '#F6F6F7',
  stage: '#EFEFF2',
  fg: '#141414',
  fg2: '#7A7A80',
  fg3: '#7A7A80',
  line: '#EDEDF0',
  tile: '#FFFFFF',
  tile2: '#F4F4F5',
  accent: '#5409DA',
  accentInk: '#FFFFFF',
  em: '#171717',
  barBg: 'rgba(247,247,248,0.94)',
  tabBg: '#FFFFFF',
  sheetBg: '#FFFFFF',
  inputBg: '#F4F4F6',
  ok: '#16a34a',
  dash: 'rgba(17,17,20,0.28)',
  shadow: true,
  card: '#FFFFFF',
  soft: '#F4F4F6',
  softInk: '#141414',
  primary: '#5409DA',
  hero: '#5409DA',
  heroTrack: 'rgba(255,255,255,0.22)',
  heroInk: '#FFFFFF',
  shadowColor: '#1A1033',
  canvas: '#F6F6F7',
  grey: '#7A7A80',
  navOn: '#1A1A1F',
  navOnInk: '#FFFFFF',
  navShadow: '#000000',
};

export const darkTokens: Tokens = {
  ...lightTokens,
  bg: '#101012',
  canvas: '#101012',
  ink: '#F4F4F5',
  grey: '#9A9AA2',
  navOn: '#F4F4F5',
  navOnInk: '#141414',
  navShadow: '#000000',
  stage: '#08080A',
  fg: '#F4F4F5',
  fg2: '#A1A1AA',
  fg3: '#A1A1AA',
  line: 'rgba(255,255,255,0.09)',
  tile: '#1A1A1D',
  tile2: 'rgba(255,255,255,0.08)',
  accent: '#7A42F0',
  accentInk: '#FFFFFF',
  em: '#F4F4F5',
  barBg: 'rgba(14,14,16,0.88)',
  tabBg: '#1C1C1F',
  sheetBg: '#1A1A1D',
  inputBg: 'rgba(255,255,255,0.06)',
  ok: '#5CE6B5',
  dash: 'rgba(244,244,245,0.32)',
  shadow: false,
  card: '#1A1A1D',
  soft: '#232326',
  softInk: '#D4D4D8',
  primary: '#7A42F0',
  hero: '#3A06A0',
  heroTrack: 'rgba(255,255,255,0.18)',
  heroInk: '#F4F4F5',
  shadowColor: '#000000',
};

/** Tokens for anything drawn on a violet block (VioletHeader, HeroCard): white ink, translucent white fills. */
export const onVioletOverrides: Partial<Tokens> = {
  fg: '#FFFFFF',
  fg2: 'rgba(255,255,255,0.86)',
  fg3: 'rgba(255,255,255,0.72)',
  line: 'rgba(255,255,255,0.22)',
  tile2: 'rgba(255,255,255,0.15)',
  soft: 'rgba(255,255,255,0.15)',
  softInk: '#FFFFFF',
  shadow: false,
};

export type ThemeMode = 'light' | 'dark' | 'auto';
type Ctx = { c: Tokens; dark: boolean; onViolet: boolean };

const ThemeCtx = createContext<Ctx>({ c: lightTokens, dark: false, onViolet: false });

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children?: React.ReactNode }) {
  const scheme = useColorScheme();
  const dark = mode === 'dark' || (mode === 'auto' && scheme === 'dark');
  const value = useMemo<Ctx>(() => ({ c: dark ? darkTokens : lightTokens, dark, onViolet: false }), [dark]);
  return React.createElement(ThemeCtx.Provider, { value }, children);
}

export function OnViolet({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ThemeCtx);
  const value = useMemo<Ctx>(
    () => ({ c: { ...parent.c, ...onVioletOverrides }, dark: parent.dark, onViolet: true }),
    [parent.c, parent.dark],
  );
  return React.createElement(ThemeCtx.Provider, { value }, children);
}

export function useTheme(): { c: Tokens; dark: boolean; onViolet: boolean } {
  return useContext(ThemeCtx);
}

/** Very soft elevation (0 1 3 @ 5%), light mode only. Cards also carry a hairline (cardBox), so this is barely there. */
export function cardShadow(c: Tokens) {
  return c.shadow
    ? ({
        shadowColor: '#000000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 0,
      } as const)
    : ({} as const);
}

/** Shape tokens: cards 16, buttons 12, small chips/badges are pills. */
export const R = { card: 16, button: 12, pill: 9999, input: 12, sheet: 24 } as const;
/** Layout rhythm: 16 side margin, 28 between sections, 12 between cards, 56 tap rows, 52 primary button. */
export const SP = { side: 16, section: 28, gap: 12, row: 56, btn: 52 } as const;
/** Card surface: radius 16, white, 1px hairline (both modes). */
export function cardBox(c: Tokens) {
  return { borderRadius: R.card, backgroundColor: c.card, borderWidth: 1, borderColor: c.line } as const;
}

/** Type scale (DESIGN-REFERENCE): size / line / weight / tracking. Colour is c.fg for titles, c.fg3 for body and captions. */
export const TYPE = {
  hero: { fontSize: 26, lineHeight: 32, fontFamily: F.bold, letterSpacing: -0.8 },
  section: { fontSize: 20, lineHeight: 26, fontFamily: F.bold, letterSpacing: -0.5 },
  card: { fontSize: 17, lineHeight: 22, fontFamily: F.semi, letterSpacing: -0.3 },
  body: { fontSize: 13, lineHeight: 18, fontFamily: F.body, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: F.medium, letterSpacing: 0 },
  price: { fontSize: 16, lineHeight: 22, fontFamily: F.bold, letterSpacing: -0.2 },
  button: { fontSize: 15, lineHeight: 20, fontFamily: F.semi, letterSpacing: -0.1 },
} as const;
