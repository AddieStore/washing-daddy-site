// Line icons ported from the web app's inline SVGs (24px grid). Colour defaults to the surrounding ink.
import React, { ReactNode, useId } from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useInk } from '../theme';

export type IconProps = { size?: number; color?: string; strokeWidth?: number };
export const useUid = () => 'u' + useId().replace(/\W/g, '');

const mk = (sw: number, body: (c: string) => ReactNode) =>
  function Icon({ size = 18, color, strokeWidth }: IconProps) {
    const c = useInk().fg, col = color ?? c;
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={strokeWidth ?? sw} strokeLinecap="round" strokeLinejoin="round">
        {body(col)}
      </Svg>
    );
  };

export const Bell = mk(1.5, () => <><Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><Path d="M10 20a2 2 0 0 0 4 0" /></>);
export const Sun = mk(1.5, () => <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const Moon = mk(1.5, () => <Path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />);
export const Auto = mk(1.5, c => <><Circle cx="12" cy="12" r="9" /><Path d="M12 3v18" /><Path d="M12 3a9 9 0 0 1 0 18z" fill={c} /></>);
export const Help = mk(1.5, () => <><Circle cx="12" cy="12" r="9" /><Path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>);
export const Pen = mk(1.5, () => <Path d="M4 20h4L19 9l-4-4L4 16z" />);
export const Cart = mk(1.5, () => <><Path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7h-7A2 2 0 0 1 6.5 18z" /><Path d="M9 7a3 3 0 0 1 6 0" /></>);
export const Store = Cart;
export const Home = mk(1.5, () => <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />);
export const Live = mk(1.5, c => <><Path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><Circle cx="12" cy="12" r="5" /><Circle cx="12" cy="12" r="1.5" fill={c} /></>);
export const Drop = mk(1.5, () => <Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />);
export const User = mk(1.5, () => <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>);
export const Book = mk(1.5, () => <><Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" /><Path d="M12 11v6M9 14h6" /></>);
export const Pause = mk(1.5, () => <Path d="M9 6v12M15 6v12" />);
export const Note = mk(1.5, () => <Path d="M4 5h16v11H8l-4 4z" />);
export const Warn = mk(1.5, () => <Path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />);
export const Heart = mk(1.5, () => <Path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />);
export const Chev = mk(1.5, () => <Path d="M9 6l6 6-6 6" />);
export const Close = mk(1.5, () => <Path d="M6 6l12 12M18 6L6 18" />);
export const Camera = mk(1.5, () => <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></>);
export const Card = mk(1.5, () => <><Rect x="3" y="6" width="18" height="13" rx="3" /><Path d="M3 10h18" /></>);
export const Arrow = mk(1.5, () => <Path d="M5 12h14M13 6l6 6-6 6" />);
export const Check = mk(1.5, () => <Path d="M5 12l5 5 9-10" />);
export const Pin = mk(1.5, () => <><Path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><Circle cx="12" cy="10" r="2.5" /></>);
export const Clock = mk(1.5, () => <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>);
export const Key = mk(1.5, () => <><Circle cx="8" cy="15" r="4" /><Path d="M11 12l9-9M16 7l3 3" /></>);
export const WhatsApp = mk(1.5, () => <Path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />);
export const Logout = mk(1.5, () => <Path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />);
export const Swipe = mk(1.5, () => <Path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />);
export const Plus = mk(1.5, () => <Path d="M12 5v14M5 12h14" />);

// --- Pronto additions: filled tab icons and extra line icons ---
export const HomeFill = mk(1.5, c => <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={c} />);
export const WashFill = mk(1.5, c => <><Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" fill={c} /></>);
export const PlanFill = mk(1.5, c => <><Rect x="3" y="5" width="18" height="16" rx="3" fill={c} /><Path d="M3 10h18M8 3v4M16 3v4" stroke="#fff" /></>);
export const StoreFill = mk(1.5, c => <><Path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7h-7A2 2 0 0 1 6.5 18z" fill={c} /><Path d="M9 7a3 3 0 0 1 6 0" /></>);
export const Plan = mk(1.5, () => <><Rect x="3" y="5" width="18" height="16" rx="3" /><Path d="M3 10h18M8 3v4M16 3v4" /></>);
export const Back = mk(1.5, () => <Path d="M15 5l-7 7 7 7" />);
export const Search = mk(1.5, () => <><Circle cx="11" cy="11" r="7" /><Path d="M20 20l-4-4" /></>);
export const Star = mk(1.5, c => <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill={c} />);
export const Phone = mk(1.5, () => <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />);
export const Wallet = mk(1.5, () => <><Path d="M3 7a2 2 0 0 1 2-2h13v4" /><Rect x="3" y="7" width="18" height="13" rx="3" /><Circle cx="16.5" cy="13.5" r="1.2" /></>);
export const Gift = mk(1.5, () => <><Rect x="3" y="9" width="18" height="4" rx="1" /><Path d="M5 13v7h14v-7M12 9v11M12 9c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3" /></>);
export const Receipt = mk(1.5, () => <><Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><Path d="M9 8h6M9 12h6" /></>);
export const More = mk(1.5, c => <><Circle cx="12" cy="5" r="1" fill={c} /><Circle cx="12" cy="12" r="1" fill={c} /><Circle cx="12" cy="19" r="1" fill={c} /></>);
export const Share = mk(1.5, () => <><Path d="M12 15V3M8 7l4-4 4 4" /><Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>);
export const Locate = mk(1.5, () => <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>);
export const Trash = mk(1.5, () => <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const Info = mk(1.5, () => <><Circle cx="12" cy="12" r="9" /><Path d="M12 11v5M12 8h.01" /></>);
export const Shield = mk(1.5, () => <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />);
export const Car = mk(1.5, () => <><Path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2h3v-2M17 16v2h3v-2" /><Circle cx="8" cy="13" r=".8" /><Circle cx="16" cy="13" r=".8" /></>);

// --- Unslop additions: line icons for chrome (replace 3D/glossy icons) ---
export const Zap = mk(1.5, () => <Path d="M13 2L4 14h7l-1 8 9-12h-7z" />);
export const Calendar = Plan;
export const MapPin = Pin;
export const X = Close;
export const ChevronRight = Chev;
export const ChevronDown = mk(1.5, () => <Path d="M6 9l6 6 6-6" />);
export const Copy = mk(1.5, () => <><Rect x="9" y="9" width="11" height="11" rx="2" /><Path d="M5 15V6a2 2 0 0 1 2-2h8" /></>);
export const Sunrise = mk(1.5, () => <><Path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 5v3M5 11l1.5 1.5M19 11l-1.5 1.5" /></>);

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
