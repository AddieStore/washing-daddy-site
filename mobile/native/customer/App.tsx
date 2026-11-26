import { useEffect, useState } from 'react';
import { Alert, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';   // only for the "WD" letters on the rider's flag and kit box (heroRide.tsx), kept as they were
import { DAY, NIGHT, ThemeContext, InkContext } from './src/theme';
import { boot, useApp, S } from './src/state';
import { ToastHost, SheetHost, ConfettiHost } from './src/ui/hosts';
import Main from './src/screens/Main';
import { PayWebHost } from './src/backend/payweb';
import Auth from './src/screens/Auth';
import { Splash } from './src/ui/motion';

SplashScreen.preventAutoHideAsync().catch(() => {});

// A JS error must never close the app in the middle of a payment: show what happened and carry on.
const EU = (globalThis as any).ErrorUtils;
if (EU && !(globalThis as any).__wdErrHandler) {
  (globalThis as any).__wdErrHandler = true;
  const prev = EU.getGlobalHandler && EU.getGlobalHandler();
  EU.setGlobalHandler((e: any, fatal?: boolean) => {
    try { Alert.alert('Something went wrong', String((e && e.message) || e).slice(0, 220) + '\nIf money was taken it shows in Money within a few minutes.') }
    catch (_) { if (prev) prev(e, fatal) }
  });
}

export default function App() {
  const [fonts] = useFonts({ Anton_400Regular, AlfaSlabOne_400Regular, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, Poppins_700Bold });
  const ui = useApp(), scheme = useColorScheme();
  const [booted, setBooted] = useState(false);
  useEffect(() => { boot().finally(() => setBooted(true)) }, []);
  const ready = fonts && booted && ui.ready;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}) }, [ready]);
  if (!ready) return <Splash />;
  const dark = S.theme === 'dark' || (S.theme === 'system' && scheme === 'dark');
  // the sign-in screen is always the violet poster
  const T = dark && ui.signedIn ? NIGHT : DAY;
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={T}>
        <InkContext.Provider value={T.page}>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: T.bg }}>
            {ui.signedIn ? <Main /> : <Auth />}
            <SheetHost />
            <ConfettiHost />
            <ToastHost />
            <PayWebHost />
          </View>
        </InkContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
