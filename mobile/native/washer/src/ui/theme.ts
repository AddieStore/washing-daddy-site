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
  hero: 'AlfaSlabOne_400Regular',
  body: 'Poppins_500Medium',
  semi: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_800ExtraBold',
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
  bg: '#F4F2FA',
  stage: '#E9E5F4',
  fg: '#1A0A33',
  fg2: 'rgba(26,10,51,0.76)',
  fg3: 'rgba(26,10,51,0.56)',
  line: 'rgba(26,10,51,0.12)',
  tile: '#FFFFFF',
  tile2: 'rgba(84,9,218,0.07)',
  accent: '#5409DA',
  accentInk: '#FFF6E9',
  em: '#5409DA',
  barBg: 'rgba(244,242,250,0.88)',
  tabBg: '#FFFFFF',
  sheetBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  ok: '#0E9F6E',
  dash: 'rgba(26,10,51,0.28)',
  shadow: true,
  card: '#FFFFFF',
  soft: '#E3D9FB',
  softInk: '#5409DA',
  primary: '#5409DA',
  hero: '#FFF1C7',
  heroTrack: '#FFE08A',
  heroInk: '#1A0A33',
  shadowColor: '#24065F',
};

export const darkTokens: Tokens = {
  ...lightTokens,
  bg: '#120724',
  stage: '#0C0418',
  fg: '#FFF6E9',
  fg2: 'rgba(255,246,233,0.78)',
  fg3: 'rgba(255,246,233,0.56)',
  line: 'rgba(255,246,233,0.14)',
  tile: '#1E1233',
  tile2: 'rgba(255,255,255,0.11)',
  accent: '#FFBA08',
  accentInk: '#1A0A33',
  em: '#FFBA08',
  barBg: 'rgba(18,7,36,0.86)',
  tabBg: '#1E1233',
  sheetBg: '#1E1233',
  inputBg: 'rgba(255,255,255,0.07)',
  ok: '#2EE6A6',
  dash: 'rgba(255,246,233,0.32)',
  shadow: false,
  card: '#1E1233',
  soft: 'rgba(255,255,255,0.14)',
  softInk: '#CDB8FF',
  primary: '#7A42F0',
  hero: '#3A2C14',
  heroTrack: 'rgba(255,186,8,0.22)',
  heroInk: '#FFF6E9',
  shadowColor: '#000000',
};

/** Overrides applied inside violet hero cards (.on-violet). */
export const onVioletOverrides: Partial<Tokens> = {
  fg: '#FFF6E9',
  fg2: 'rgba(255,246,233,0.84)',
  fg3: 'rgba(255,246,233,0.62)',
  line: 'rgba(255,246,233,0.18)',
  tile: 'rgba(255,255,255,0.1)',
  tile2: 'rgba(255,255,255,0.16)',
  accent: '#FFBA08',
  accentInk: '#1A0A33',
  ok: '#2EE6A6',
  dash: 'rgba(255,246,233,0.38)',
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

/** Soft card shadow (0 4 16, 6-7% violet-deep), light mode only. */
export function cardShadow(c: Tokens) {
  return c.shadow
    ? ({
        shadowColor: c.shadowColor,
        shadowOpacity: 0.07,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      } as const)
    : ({} as const);
}
