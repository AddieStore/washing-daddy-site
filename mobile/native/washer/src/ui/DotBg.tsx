// Plain page background (the dotted texture was removed). Kept so every screen keeps one background layer.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from './theme';



export const DotBg = memo(function DotBg() {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
    </View>
  );
});
