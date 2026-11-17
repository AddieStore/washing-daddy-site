import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'phone' | 'pin' | 'arrow' | 'check' | 'cam' | 'walk' | 'flag' | 'drop' | 'star' | 'note' | 'warn'
  | 'redo' | 'pause' | 'help' | 'plus' | 'back' | 'user' | 'globe' | 'sun' | 'reset' | 'logout' | 'sos'
  | 'calendar' | 'bell' | 'shield' | 'id' | 'kit' | 'doc' | 'gift' | 'tabRound' | 'tabExtra' | 'tabPaisa' | 'tabMe' | 'car' | 'chevron' | 'clock';

export type TaskKey = 'pressure' | 'foam' | 'interior' | 'tyre' | 'detailing' | 'dry';

type P = { size?: number; color?: string; active?: boolean };

const ICONS: Record<IconName, (color: string, active: boolean) => React.ReactNode> = {
  phone: (c) => <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  pin: () => (
    <>
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.5} r={2.5} />
    </>
  ),
  arrow: () => <Path d="M5 12h14M13 6l6 6-6 6" />,
  check: () => <Path d="M5 12l5 5 9-10" />,
  cam: () => (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  walk: () => (
    <>
      <Circle cx={13} cy={4} r={2} />
      <Path d="M10 21l2-6 3 3v3M8 12l3-4 3 3 3 1M11 8l-1 5" />
    </>
  ),
  flag: () => <Path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  drop: () => <Path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />,
  star: () => <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  note: () => <Path d="M4 5h16v11H8l-4 4z" />,
  warn: () => <Path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  redo: () => (
    <>
      <Path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <Path d="M21 3v5h-5" />
    </>
  ),
  pause: () => <Path d="M9 6v12M15 6v12" />,
  help: () => (
    <>
      <Circle cx={12} cy={12} r={9.5} />
      <Path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4.2M12 17.7h.01" />
    </>
  ),
  plus: () => <Path d="M12 5v14M5 12h14" />,
  back: () => <Path d="M15 6l-6 6 6 6" />,
  user: () => (
    <>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
    </>
  ),
  globe: () => (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
    </>
  ),
  sun: () => (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2" />
    </>
  ),
  reset: () => (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5" />
    </>
  ),
  logout: () => <Path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  sos: () => (
    <>
      <Path d="M12 3 2.8 19.5h18.4z" />
      <Path d="M12 10v4.2M12 17h.01" />
    </>
  ),
  calendar: () => (
    <>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  bell: () => <Path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21.5a2.2 2.2 0 0 0 4 0" />,
  shield: () => (
    <>
      <Path d="M12 3l7.5 2.8v5.6c0 4.6-3.1 8.1-7.5 9.6-4.4-1.5-7.5-5-7.5-9.6V5.8z" />
      <Path d="M8.6 12.2l2.6 2.6 4.4-5" />
    </>
  ),
  id: () => (
    <>
      <Rect x={2.8} y={5} width={18.4} height={14} rx={3} />
      <Circle cx={8.6} cy={11} r={2} />
      <Path d="M5.6 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14.5 9.5h4M14.5 13h3" />
    </>
  ),
  kit: () => (
    <>
      <Path d="M3.5 8.5h17V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
      <Path d="M8.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2M3.5 13.5h17M10.5 13.5v2h3v-2" />
    </>
  ),
  doc: () => (
    <>
      <Path d="M6 3h8l4.5 4.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <Path d="M14 3v4.5h4.5M8.5 13.5l2.2 2.2 4-4.4" />
    </>
  ),
  gift: () => (
    <>
      <Rect x={3.5} y={8.5} width={17} height={4} rx={1.2} />
      <Path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10 8.5 7.5 8 7.5 6a2 2 0 0 1 3.4-1.4c.7.7 1.1 2 1.1 3.9zM12 8.5c2 0 4.5-.5 4.5-2.5a2 2 0 0 0-3.4-1.4c-.7.7-1.1 2-1.1 3.9z" />
    </>
  ),
  car: () => (
    <>
      <Path d="M4 16v-3l1.8-4.6A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.4L20 13v3z" />
      <Path d="M4 16v2.5M20 16v2.5M4 13h16" />
      <Circle cx={8} cy={14.5} r={0.6} />
      <Circle cx={16} cy={14.5} r={0.6} />
    </>
  ),
  chevron: () => <Path d="m9.5 6 6 6-6 6" />,
  clock: () => (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  // Same glyphs as the Astryx preview (sun, bolt, rupee, person); "active" is shown by colour only.
  tabRound: (c, a) => (
    <>
      <Circle cx={6} cy={18} r={2.6} fill={a ? c : 'none'} />
      <Circle cx={18} cy={6} r={2.6} fill={a ? c : 'none'} />
      <Path d="M8.6 18H15a3.2 3.2 0 0 0 0-6.4H9a3.2 3.2 0 0 1 0-6.4h6.4" />
    </>
  ),
  tabExtra: (c, a) => <Path d="M13.2 2.8 5 13.4h6l-1.2 7.8 8.2-10.6h-6z" fill={a ? c : 'none'} />,
  tabPaisa: (c, a) => (
    <>
      <Path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h9.5a2 2 0 0 1 2 2v1.5" />
      <Rect x={3} y={7.5} width={18} height={12.5} rx={3.2} fill={a ? c : 'none'} />
      <Circle cx={16.4} cy={13.8} r={1.4} fill={a ? '#fff' : c} stroke="none" />
    </>
  ),
  tabMe: (c, a) => (
    <>
      <Circle cx={12} cy={8} r={4} fill={a ? c : 'none'} />
      <Path d="M4.6 20.4c.6-4 3.6-6 7.4-6s6.8 2 7.4 6z" fill={a ? c : 'none'} />
    </>
  ),
};

// stroke width / linejoin / cap per icon, mirroring the web SVGs
const STROKE: Partial<Record<IconName, { w: number; cap?: 'round'; join?: 'round' }>> = {
  phone: { w: 2.2, cap: 'round', join: 'round' },
  pin: { w: 2.2 },
  arrow: { w: 2.8, cap: 'round', join: 'round' },
  check: { w: 3.2, cap: 'round', join: 'round' },
  cam: { w: 2, join: 'round' },
  walk: { w: 2.2, cap: 'round', join: 'round' },
  flag: { w: 2.2, cap: 'round' },
  drop: { w: 2.2, join: 'round' },
  note: { w: 2.2, join: 'round' },
  warn: { w: 2.2, cap: 'round' },
  redo: { w: 2.2, cap: 'round' },
  pause: { w: 2.6, cap: 'round' },
  help: { w: 2.4, cap: 'round', join: 'round' },
  plus: { w: 2.6, cap: 'round' },
  back: { w: 2.4, cap: 'round' },
  user: { w: 2, cap: 'round', join: 'round' },
  globe: { w: 2, cap: 'round' },
  sun: { w: 2, cap: 'round' },
  reset: { w: 2, cap: 'round' },
  logout: { w: 2, cap: 'round' },
  sos: { w: 2, cap: 'round', join: 'round' },
  calendar: { w: 2, cap: 'round', join: 'round' },
  bell: { w: 2, cap: 'round', join: 'round' },
  shield: { w: 2, cap: 'round', join: 'round' },
  id: { w: 2, cap: 'round', join: 'round' },
  kit: { w: 2, cap: 'round', join: 'round' },
  doc: { w: 2, cap: 'round', join: 'round' },
  gift: { w: 2, cap: 'round', join: 'round' },
  car: { w: 1.9, cap: 'round', join: 'round' },
  clock: { w: 1.9, cap: 'round', join: 'round' },
  chevron: { w: 2, cap: 'round', join: 'round' },
  tabRound: { w: 2.2, cap: 'round', join: 'round' },
  tabExtra: { w: 2.2, cap: 'round', join: 'round' },
  tabPaisa: { w: 2.2, cap: 'round', join: 'round' },
  tabMe: { w: 2.2, cap: 'round', join: 'round' },
};

export function Icon({ name, size = 24, color = '#000', active = false }: P & { name: IconName }) {
  const solid = name === 'star' && size <= 14;
  const s = STROKE[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? color : 'none'}
      stroke={solid ? undefined : color}
      strokeWidth={s?.w}
      strokeLinecap={s?.cap}
      strokeLinejoin={s?.join}
    >
      {ICONS[name](color, active)}
    </Svg>
  );
}

const TASKS: Record<TaskKey, React.ReactNode> = {
  pressure: (
    <>
      <Path d="M3 8h8l2 2h3M16 10l5-3M16 10l5 0M16 10l5 3" />
      <Path d="M5 8v5h4" />
    </>
  ),
  foam: (
    <>
      <Circle cx={8} cy={14} r={4} />
      <Circle cx={15.5} cy={9} r={3.5} />
      <Circle cx={17} cy={17} r={2.5} />
    </>
  ),
  interior: <Path d="M7 4h6l1 9H6zM5 13h12l1 4H4zM7 17v3M15 17v3" />,
  tyre: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={3.5} />
      <Path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21" />
    </>
  ),
  detailing: (
    <>
      <Path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5z" />
      <Path d="M19 16l.8 2 2 .8-2 .8L19 22l-.8-2.4-2-.8 2-.8z" />
    </>
  ),
  dry: <Path d="M4 7c4-3 12-3 16 0M4 12c4-3 12-3 16 0M4 17c4-3 12-3 16 0" />,
};

export function TaskIcon({ k, size = 26, color = '#000' }: P & { k: TaskKey }) {
  const join = k === 'interior' || k === 'detailing' ? 'round' : undefined;
  const cap = k === 'pressure' || k === 'dry' ? 'round' : undefined;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap={cap} strokeLinejoin={join}>
      {TASKS[k] ?? null}
    </Svg>
  );
}
