// Shared type for PickMap.native.tsx (Google map, react-native-maps) and PickMap.web.tsx (stand-in streets in the preview).
import type { ReactElement, Ref } from 'react';
export type PickMapRef = { flyTo(p: { lat: number; lng: number }, zoomed?: boolean): void };
export type PickMapProps = {
  start: { lat: number; lng: number };
  /** the user starts dragging (or the map starts an animation) */
  onMoveStart(): void;
  /** the map came to rest: the point under the fixed centre pin */
  onSettle(p: { lat: number; lng: number }): void;
  /** show the blue "you are here" dot */
  me?: { lat: number; lng: number } | null;
  ref?: Ref<PickMapRef>;
};
export declare function PickMap(p: PickMapProps): ReactElement;
