import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { DAY, NIGHT, ThemeContext, InkContext } from './src/theme';
import { boot, useApp, S } from './src/state';
import { ToastHost, SheetHost, ConfettiHost } from './src/ui/hosts';
import Main from './src/screens/Main';
import Auth from './src/screens/Auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fonts] = useFonts({ Anton_400Regular, AlfaSlabOne_400Regular, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold });
  const ui = useApp(), scheme = useColorScheme();
  const [booted, setBooted] = useState(false);
  useEffect(() => { boot().finally(() => setBooted(true)) }, []);
  const ready = fonts && booted && ui.ready;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}) }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#5409DA' }} />;
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
          </View>
        </InkContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
