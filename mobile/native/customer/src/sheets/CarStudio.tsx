// Car Studio: a full-screen 3D car with a car picker, exhaust sounds, a hold-to-rev button and smoke.
// Opened only from the car image in the Home hero. The caller mounts it while open, so closing unmounts the
// WebView / iframe and stops the audio.
import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { C, SP, HIT } from '../theme';
import { useInsets } from '../ui/kit';
import { Close } from '../ui/icons';
import { CAR3D_HTML } from '../assets/car3dHtml';
import type { Car } from '../data/model';

// pick the preview model that matches the customer's car, else BMW
export function studioCar(c: Pick<Car, 'make' | 'name'>): string {
  const t = `${c.make} ${c.name}`.toLowerCase();
  if (/bmw/.test(t)) return 'bmw';
  if (/urus|lamborghini|suv/.test(t)) return 'urus';
  if (/ferrari|mclaren|porsche|supercar|aventador|huracan/.test(t)) return 'super';
  if (/classic|ambassador|beetle|fiat|vintage/.test(t)) return 'classic';
  if (/swift|i10|i20|baleno|alto|wagon|polo|tiago|santro|glanza|hatch/.test(t)) return 'hatch';
  return 'bmw';
}

export function CarStudio({ car, onClose }: { car: Pick<Car, 'make' | 'name' | 'plate'>; onClose: () => void }) {
  const ins = useInsets();
  const wd = useMemo(() => ({ plate: car.plate, car: studioCar(car), embed: true, sat: 0, sab: ins.bottom }), [car.plate, car.make, car.name, ins.bottom]);
  const boot = `window.WD=${JSON.stringify(wd)};true;`;
  const web = Platform.OS === 'web';
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {web ? (
          React.createElement('iframe', {
            title: 'Car Studio',
            srcDoc: `<script>${boot}</script>` + CAR3D_HTML,
            allow: 'autoplay',
            style: { border: 0, width: '100%', height: '100%', background: C.violet2 },
            'data-testid': 'car-studio-frame',
          })
        ) : (
          <WebView
            style={styles.web}
            source={{ html: CAR3D_HTML }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            injectedJavaScriptBeforeContentLoaded={boot}
            setSupportMultipleWindows={false}
            overScrollMode="never"
            bounces={false}
            automaticallyAdjustContentInsets={false}
            androidLayerType="hardware"
          />
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Close Car Studio" onPress={onClose} hitSlop={8}
          style={[styles.x, { top: ins.top + SP.m, right: SP.l }]}>
          <Close size={22} color={C.cream} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.violet2 },
  web: { flex: 1, backgroundColor: C.violet2 },
  x: { position: 'absolute', width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18,7,36,.55)', borderWidth: 1, borderColor: 'rgba(255,246,233,.2)' },
});
