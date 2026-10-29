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
  bg: '#FFF6E9',
  stage: '#EFE2CC',
  fg: '#1A0A33',
  fg2: 'rgba(26,10,51,0.76)',
  fg3: 'rgba(26,10,51,0.56)',
  line: 'rgba(26,10,51,0.12)',
  tile: '#FFFFFF',
  tile2: 'rgba(26,10,51,0.06)',
  accent: '#5409DA',
  accentInk: '#FFF6E9',
  em: '#5409DA',
  barBg: 'rgba(255,246,233,0.86)',
  tabBg: 'rgba(255,255,255,0.9)',
  sheetBg: '#FFF6E9',
  inputBg: '#FFFFFF',
  ok: '#0E9F6E',
  dash: 'rgba(26,10,51,0.28)',
  shadow: true,
};

export const darkTokens: Tokens = {
  ...lightTokens,
  bg: '#1A0A33',
  stage: '#120724',
  fg: '#FFF6E9',
  fg2: 'rgba(255,246,233,0.78)',
  fg3: 'rgba(255,246,233,0.56)',
  line: 'rgba(255,246,233,0.14)',
  tile: 'rgba(255,255,255,0.07)',
  tile2: 'rgba(255,255,255,0.11)',
  accent: '#FFBA08',
  accentInk: '#1A0A33',
  em: '#FFBA08',
  barBg: 'rgba(26,10,51,0.8)',
  tabBg: 'rgba(34,9,79,0.86)',
  sheetBg: '#22094F',
  inputBg: 'rgba(255,255,255,0.07)',
  ok: '#2EE6A6',
  dash: 'rgba(255,246,233,0.32)',
  shadow: false,
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

/** Card shadow like --card-shadow (light only). */
export function cardShadow(c: Tokens) {
  return c.shadow
    ? ({
        shadowColor: '#5409DA',
        shadowOpacity: 0.09,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      } as const)
    : ({} as const);
}
