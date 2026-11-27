import { requireOptionalNativeModule } from 'expo-modules-core';

/** Android only (iOS has a stub that is never called; web has no module). All payloads are JSON strings. */
export type WdParkNative = {
  configure(json: string): void;
  bondedDevices(): Promise<string>;      // [{address, name}]
  pendingParks(): Promise<string>;       // parks not yet cleared by the app: [{id, carId, reg, lat, lng, acc, at, away, distM}]
  getPark(id: string): Promise<string | null>;
  lastAsked(): Promise<string | null>;   // the last park the customer was notified about
  clearPark(id: string): void;
  openBatterySettings(): void;
};
export const WdPark = requireOptionalNativeModule<WdParkNative>('WdPark');
