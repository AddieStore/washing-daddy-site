// Variant A (diagnostic): no react-native-maps. Shows a placeholder where the map goes.
import React, { useImperativeHandle } from 'react';
import { View, Text } from 'react-native';
import type { PickMapProps, PickMapRef } from './PickMap';

export function PickMap({ ref }: PickMapProps) {
  useImperativeHandle(ref, (): PickMapRef => ({ flyTo: () => {} }), []);
  return <View style={{ flex: 1, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' }}><Text>Map test build</Text></View>;
}
