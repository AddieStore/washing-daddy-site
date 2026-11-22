/* Tells looping animations and timers whether their screen is on show. Home and Washes stay mounted (display:none)
   after a first visit (see screens/Main.tsx), so without this their infinite loops and setIntervals keep burning
   the JS/UI thread behind the tab you are actually using. Outside a provider (pages, sheets) everything counts as active. */
import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { subscribeUi, tabNow, type Tab } from '../state';

const Ctx = createContext(true);
export const useActive = () => useContext(Ctx);
/** re-renders only when `tab` flips between shown and hidden, not on every state change */
export function TabActive({ tab, children }: { tab: Tab; children: React.ReactNode }) {
  const on = useSyncExternalStore(subscribeUi, () => tabNow() === tab, () => true);
  return <Ctx.Provider value={on}>{children}</Ctx.Provider>;
}
