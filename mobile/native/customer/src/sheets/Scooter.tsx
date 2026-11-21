// The WD scooter and the home pin, ported from the web app's marker SVGs (used by both TrackMap files).
import React from 'react';
import { View } from 'react-native';
import { RiderArt } from '../ui/heroRide';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SText } from 'react-native-svg';

// The washer marker is the same character as the Home hero (Ravi 2026-11-21), so tracking feels seamless.
// He always faces right (flipping would mirror the WD lettering); `flip` is kept for callers.
export function Scooter({ scale = 1 }: { flip?: boolean; scale?: number }) {
  return <View style={{ width: 72 * scale, height: 52 * scale, justifyContent: 'flex-end' }}><RiderArt w={72 * scale} /></View>;
}

export function HomePin({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={44 * scale} height={52 * scale} viewBox="0 0 44 52">
      <G>
        <Path d="M22 2 C11.5 2 3 10.5 3 21 C3 34 22 50 22 50 C22 50 41 34 41 21 C41 10.5 32.5 2 22 2Z" fill="#5409DA" stroke="#FFFFFF" strokeWidth={2} />
        <Path d="M15 22 L22 15 L29 22 V29 H24.5 V24 H19.5 V29 H15 Z" fill="#FFFFFF" />
      </G>
    </Svg>
  );
}
