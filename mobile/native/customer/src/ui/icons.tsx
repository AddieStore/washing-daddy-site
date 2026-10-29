// Line icons ported from the web app's inline SVGs (24px grid). Colour defaults to the surrounding ink.
import React, { ReactNode, useId } from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useInk } from '../theme';

export type IconProps = { size?: number; color?: string; strokeWidth?: number };
export const useUid = () => 'u' + useId().replace(/\W/g, '');

const mk = (sw: number, body: (c: string) => ReactNode) =>
  function Icon({ size = 24, color, strokeWidth }: IconProps) {
    const c = useInk().fg, col = color ?? c;
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={strokeWidth ?? sw} strokeLinecap="round" strokeLinejoin="round">
        {body(col)}
      </Svg>
    );
  };

export const Bell = mk(2, () => <><Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><Path d="M10 20a2 2 0 0 0 4 0" /></>);
export const Sun = mk(2, () => <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const Moon = mk(2, () => <Path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />);
export const Auto = mk(2, c => <><Circle cx="12" cy="12" r="9" /><Path d="M12 3v18" /><Path d="M12 3a9 9 0 0 1 0 18z" fill={c} /></>);
export const Help = mk(2, () => <><Circle cx="12" cy="12" r="9" /><Path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>);
export const Pen = mk(2, () => <Path d="M4 20h4L19 9l-4-4L4 16z" />);
export const Cart = mk(2, () => <><Path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7h-7A2 2 0 0 1 6.5 18z" /><Path d="M9 7a3 3 0 0 1 6 0" /></>);
export const Store = Cart;
export const Home = mk(2, () => <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />);
export const Live = mk(2, c => <><Path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><Circle cx="12" cy="12" r="5" /><Circle cx="12" cy="12" r="1.5" fill={c} /></>);
export const Drop = mk(2, () => <Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />);
export const User = mk(2, () => <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>);
export const Book = mk(2, () => <><Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" /><Path d="M12 11v6M9 14h6" /></>);
export const Pause = mk(2.2, () => <Path d="M9 6v12M15 6v12" />);
export const Note = mk(2, () => <Path d="M4 5h16v11H8l-4 4z" />);
export const Warn = mk(2, () => <Path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />);
export const Heart = mk(2.4, () => <Path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />);
export const Chev = mk(2, () => <Path d="M9 6l6 6-6 6" />);
export const Camera = mk(2, () => <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></>);
export const Card = mk(2.2, () => <><Rect x="3" y="6" width="18" height="13" rx="3" /><Path d="M3 10h18" /></>);
export const Arrow = mk(2.4, () => <Path d="M5 12h14M13 6l6 6-6 6" />);
export const Check = mk(3.5, () => <Path d="M5 12l5 5 9-10" />);
export const Pin = mk(2, () => <><Path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><Circle cx="12" cy="10" r="2.5" /></>);
export const Clock = mk(2, () => <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>);
export const Key = mk(2, () => <><Circle cx="8" cy="15" r="4" /><Path d="M11 12l9-9M16 7l3 3" /></>);
export const WhatsApp = mk(2, () => <Path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />);
export const Logout = mk(2, () => <Path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />);
export const Swipe = mk(2, () => <Path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />);
export const Plus = mk(3, () => <Path d="M12 5v14M5 12h14" />);

// the dashed outline car shown when a car has no photo
export function GhostCar({ width = 200, color }: { width?: number; color?: string }) {
  const c = useInk().fg3, col = color ?? c;
  return (
    <Svg width={width} height={width * 0.4} viewBox="0 0 400 160" fill="none" stroke={col} strokeWidth={3} strokeDasharray="8 7" strokeLinecap="round">
      <Path d="M20 118c0-22 14-30 44-34l40-34c10-8 22-12 38-12h92c18 0 30 6 42 18l26 28c32 2 58 10 70 22 6 6 8 14 8 22v4H20z" />
      <Circle cx="98" cy="122" r="26" />
      <Circle cx="306" cy="122" r="26" />
      <Path d="M120 52h76v34h-108zM214 52h56l30 34h-86z" />
    </Svg>
  );
}
