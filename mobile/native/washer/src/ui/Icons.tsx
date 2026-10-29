import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'phone' | 'pin' | 'arrow' | 'check' | 'cam' | 'walk' | 'flag' | 'drop' | 'star' | 'note' | 'warn'
  | 'redo' | 'pause' | 'help' | 'plus' | 'back' | 'user' | 'globe' | 'sun' | 'reset' | 'logout' | 'sos'
  | 'tabRound' | 'tabExtra' | 'tabPaisa' | 'tabMe';

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
  tabRound: (c, a) => (
    <>
      <Circle cx={6} cy={18} r={2.5} fill={c} fillOpacity={a ? 0.22 : 0} />
      <Circle cx={18} cy={6} r={2.5} fill={c} fillOpacity={a ? 0.22 : 0} />
      <Path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </>
  ),
  tabExtra: (c, a) => <Path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11H12z" fill={c} fillOpacity={a ? 0.22 : 0} />,
  tabPaisa: (c, a) => (
    <>
      <Rect x={2.5} y={5.5} width={19} height={14} rx={3} fill={c} fillOpacity={a ? 0.22 : 0} />
      <Path d="M9 9h6M9 11.5h6M10.5 9c1.6 0 2.7.8 2.7 2.5s-1.1 2.5-2.7 2.5H9.5l3.8 3" />
    </>
  ),
  tabMe: (c, a) => (
    <>
      <Circle cx={12} cy={12} r={9.5} fill={c} fillOpacity={a ? 0.22 : 0} />
      <Circle cx={12} cy={10} r={3.2} />
      <Path d="M6.3 18.4c1.4-1.9 3.4-2.9 5.7-2.9s4.3 1 5.7 2.9" />
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
  tabRound: { w: 2, cap: 'round', join: 'round' },
  tabExtra: { w: 2, cap: 'round', join: 'round' },
  tabPaisa: { w: 2, cap: 'round', join: 'round' },
  tabMe: { w: 2, cap: 'round', join: 'round' },
};

export function Icon({ name, size = 24, color = '#000', active = false }: P & { name: IconName }) {
  const solid = name === 'star';
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
