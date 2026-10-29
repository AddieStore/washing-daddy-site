/// <reference types="node" />
// app.json holds the config; this adds the Firebase files and plugins only when the files are present
// (same convention as the washer app, .notes/native-apps.md). Without them the build runs in demo mode.
import { existsSync } from 'fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const android = existsSync('./firebase/google-services.json'), ios = existsSync('./firebase/GoogleService-Info.plist');
  const firebase = android || ios;
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
