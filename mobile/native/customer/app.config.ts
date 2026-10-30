/// <reference types="node" />
// app.json holds the config; this adds the Firebase files and plugins only when the files are present
// (same convention as the washer app, .notes/native-apps.md). Without them the build runs in demo mode.
import { existsSync } from 'fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const android = existsSync('./firebase/google-services.json'), ios = existsSync('./firebase/GoogleService-Info.plist');
  const firebase = android || ios;
  // WD_RELEASE=1 (set by the release build jobs) must never produce a demo build: without Firebase config the
  // app silently falls back to the demo backend (OTP 1234, fake data). Fail the build instead.
  if (process.env.WD_RELEASE === '1') {
    const wantIos = process.env.EAS_BUILD_PLATFORM === 'ios' || process.argv.some(a => a === 'ios');
    const wantAndroid = process.env.EAS_BUILD_PLATFORM === 'android' || !wantIos;
    if (wantAndroid && !android) throw new Error('WD_RELEASE=1: firebase/google-services.json is missing (CUSTOMER_GOOGLE_SERVICES_JSON secret not set?), refusing to build a demo app');
    if (wantIos && !ios) throw new Error('WD_RELEASE=1: firebase/GoogleService-Info.plist is missing, refusing to build a demo app');
    if (process.env.EXPO_PUBLIC_DEMO) throw new Error('WD_RELEASE=1: EXPO_PUBLIC_DEMO must not be set in a release build');
  }
  const plugins = (config.plugins || []).filter(p => firebase || !String(Array.isArray(p) ? p[0] : p).startsWith('@react-native-firebase'));
  return {
    ...config,
    name: config.name!, slug: config.slug!,
    plugins,
    android: { ...config.android, ...(android ? { googleServicesFile: './firebase/google-services.json' } : {}) },
    ios: { ...config.ios, ...(ios ? { googleServicesFile: './firebase/GoogleService-Info.plist' } : {}) },
    extra: { ...config.extra, firebase },
  };
};
