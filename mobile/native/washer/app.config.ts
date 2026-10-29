/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';

// Firebase native config files are committed in firebase/ (see firebase/README.md). If they are
// missing the app still builds and runs in demo mode.
const androidGoogleServices = './firebase/google-services.json';
const iosGoogleServices = './firebase/GoogleService-Info.plist';
const hasAndroidFirebase = fs.existsSync(path.join(__dirname, androidGoogleServices));
const hasIosFirebase = fs.existsSync(path.join(__dirname, iosGoogleServices));

const PACKAGE = 'com.washingdaddy.washer'; // must not change: store listings carry over

const config: ExpoConfig = {
  name: 'WD Partner',
  slug: 'wd-partner',
  scheme: 'wdpartner',
  version: '2.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  primaryColor: '#5409DA',
  backgroundColor: '#5409DA',
  icon: './assets/icon.png',
  android: {
    package: PACKAGE,
    versionCode: 20,
    adaptiveIcon: {
      backgroundColor: '#FFBA08',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'VIBRATE'],
    ...(hasAndroidFirebase ? { googleServicesFile: androidGoogleServices } : {}),
  },
  ios: {
    bundleIdentifier: PACKAGE,
    buildNumber: '20',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'WD Partner uses the camera so you can take before and after photos of each car you wash.',
      NSLocationWhenInUseUsageDescription:
        'WD Partner uses your location while the app is open so customers can see you on your way to their car.',
      NSPhotoLibraryUsageDescription:
        'WD Partner lets you pick a photo from your library when you cannot take one with the camera.',
    },
    ...(hasIosFirebase ? { googleServicesFile: iosGoogleServices } : {}),
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    // one web bundle, so the preview can be inlined into a single HTML file
    ['expo-router', { asyncRoutes: { web: false } }],
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFF6E9',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#5409DA' },
      },
    ],
    'expo-audio',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'WD Partner uses your location while the app is open so customers can see you on your way to their car.',
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission:
          'WD Partner uses the camera so you can take before and after photos of each car you wash.',
        photosPermission:
          'WD Partner lets you pick a photo from your library when you cannot take one with the camera.',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' },
        // Firebase Android BoM 35 needs Kotlin 2.3 (the customer app hit the same)
        android: { minSdkVersion: 24, kotlinVersion: '2.3.21' },
      },
    ],
    ...(hasAndroidFirebase
      ? ['@react-native-firebase/app', '@react-native-firebase/auth']
      : []),
  ] as ExpoConfig['plugins'],
  experiments: { typedRoutes: false },
};

export default config;
