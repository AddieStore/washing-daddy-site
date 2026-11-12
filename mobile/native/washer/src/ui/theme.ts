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
  // Astryx scale tops out at 700: `black` (formerly 800) maps to bold so every heading matches the web preview.
  body: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semi: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_700Bold',
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
  bg: '#FFFFFF',
  stage: '#EFEFF1',
  fg: '#111114',
  fg2: '#4B4B55',
  fg3: '#6B6B76',
  line: 'rgba(17,17,20,0.094)',
  tile: '#FFFFFF',
  tile2: 'rgba(17,17,20,0.06)',
  accent: '#5409DA',
  accentInk: '#FFFFFF',
  em: '#111114',
  barBg: 'rgba(255,255,255,0.92)',
  tabBg: '#FFFFFF',
  sheetBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  ok: '#0B7A57',
  dash: 'rgba(17,17,20,0.28)',
  shadow: true,
  card: '#FFFFFF',
  soft: '#F3F4F6',
  softInk: '#3F3F46',
  primary: '#5409DA',
  hero: '#F7F7F8',
  heroTrack: '#E7E7EA',
  heroInk: '#111114',
  shadowColor: '#111114',
};

export const darkTokens: Tokens = {
  ...lightTokens,
  bg: '#0E0E10',
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
  hero: '#1B1B1E',
  heroTrack: '#34343A',
  heroInk: '#F4F4F5',
  shadowColor: '#000000',
};

/** Violet panels are gone (white look): OnViolet is now a pass-through with no overrides. */
export const onVioletOverrides: Partial<Tokens> = {};

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
    () => ({ c: { ...parent.c, ...onVioletOverrides }, dark: parent.dark, onViolet: false }),
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
        shadowColor: '#000000',
        shadowOpacity: 0.07,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      } as const)
    : ({} as const);
}

/** Astryx shape tokens: cards 16, buttons 12, small chips/badges are pills. */
export const R = { card: 16, button: 12, pill: 9999, input: 12 } as const;
/** Card surface: 1px neutral border + radius 16 (spread into a style). */
export function cardBox(c: Tokens) {
  return { borderRadius: R.card, backgroundColor: c.card, borderWidth: 1, borderColor: c.line } as const;
}
