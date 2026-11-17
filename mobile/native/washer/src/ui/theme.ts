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
  violet: string;
  violet2: string;
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
  ink: brand.ink,
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
  bg: '#F5F5F8',
  stage: '#EFEFF1',
  fg: '#171717',
  fg2: '#525252',
  fg3: '#737373',
  line: 'rgba(23,23,23,0.08)',
  tile: '#FFFFFF',
  tile2: '#F4F4F5',
  accent: '#5409DA',
  accentInk: '#FFFFFF',
  em: '#171717',
  barBg: 'rgba(255,255,255,0.92)',
  tabBg: '#FFFFFF',
  sheetBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  ok: '#16a34a',
  dash: 'rgba(17,17,20,0.28)',
  shadow: true,
  card: '#FFFFFF',
  soft: '#F4F4F5',
  softInk: '#525252',
  primary: '#5409DA',
  hero: '#5409DA',
  heroTrack: 'rgba(255,255,255,0.22)',
  heroInk: '#FFFFFF',
  shadowColor: '#1A1033',
};

export const darkTokens: Tokens = {
  ...lightTokens,
  bg: '#141415',
  stage: '#08080A',
  fg: '#F4F4F5',
  fg2: '#C4C4CC',
  fg3: '#A1A1AA',
  line: 'rgba(255,255,255,0.10)',
  tile: '#161618',
  tile2: 'rgba(255,255,255,0.08)',
  accent: '#7A42F0',
  accentInk: '#FFFFFF',
  em: '#F4F4F5',
  barBg: 'rgba(14,14,16,0.88)',
  tabBg: '#161618',
  sheetBg: '#161618',
  inputBg: 'rgba(255,255,255,0.06)',
  ok: '#5CE6B5',
  dash: 'rgba(244,244,245,0.32)',
  shadow: false,
  card: '#161618',
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

/** Astryx "low" elevation: a very light 0 2 6 shadow, light mode only. */
export function cardShadow(c: Tokens) {
  return c.shadow
    ? ({
        shadowColor: '#1A1033',
        shadowOpacity: 0.07,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      } as const)
    : ({} as const);
}

/** Astryx shape tokens: cards 16, buttons 12, small chips/badges are pills. */
export const R = { card: 16, button: 12, pill: 9999, input: 12 } as const;
/** Card surface: radius 16, white; light mode floats on cardShadow (spread into a style). */
export function cardBox(c: Tokens) {
  // Pronto r5: no hairline on light cards (the spread shadow carries them); dark mode keeps a faint edge.
  return { borderRadius: R.card, backgroundColor: c.card, borderWidth: c.shadow ? 0 : 1, borderColor: c.line } as const;
}
