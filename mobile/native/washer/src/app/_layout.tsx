// Root: fonts, theme, the sign-in gate, and the overlays every screen shares (toast, sheet, confetti, job alert).
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { ThemeProvider, useTheme } from '../ui/theme';
import { UiHosts } from '../ui/Hosts';
import { boot, onForeground, useStore, view, S } from '../state/store';
import AuthScreen from '../screens/Auth';
import JobAlert from '../screens/JobAlert';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  useStore();
  const { c, dark } = useTheme();
  const step = view.authStep;
  useEffect(() => { if (step !== 'loading') SplashScreen.hideAsync().catch(() => {}) }, [step]);
  if (step === 'loading') return <View style={{ flex: 1, backgroundColor: '#5409DA' }} />;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {step === 'in'
        ? <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="job" options={{ animation: 'slide_from_right' }} />
          </Stack>
        : <AuthScreen />}
      <JobAlert />
      <UiHosts />
    </View>
  );
}

export default function RootLayout() {
  const [fontsOk, fontErr] = useFonts({ Anton_400Regular, AlfaSlabOne_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold });
  useStore();
  useEffect(() => {
    boot();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') onForeground() });
    return () => sub.remove();
  }, []);
  if (!fontsOk && !fontErr) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider mode={S.theme}>
        <Gate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
