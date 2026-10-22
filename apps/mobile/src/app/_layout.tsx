import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Lexend_500Medium, Lexend_600SemiBold } from '@expo-google-fonts/lexend';
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/lib/store';
import { MessageProvider } from '@/lib/message';
import { lockTabletLandscape } from '@/lib/orientation';
import { setupWeb } from '@/lib/webSetup';
import { Loading } from '@/components/Loading';

setupWeb();
lockTabletLandscape();

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready, voicesReady, palette, settings } = useApp();
  const [fontsLoaded, fontError] = useFonts({ Lexend_500Medium, Lexend_600SemiBold, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });
  // Safari can leave `document.fonts.load()` pending forever, so on web the fonts get 2 s at most.
  // Their @font-face rules are already on the page, so text switches to them when they arrive.
  const [fontWaitOver, setFontWaitOver] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => setFontWaitOver(true), 2000);
    return () => clearTimeout(t);
  }, []);
  const done = ready && voicesReady && (fontsLoaded || !!fontError || fontWaitOver);
  useEffect(() => { if (done) SplashScreen.hideAsync().catch(() => {}); }, [done]);
  // Native shows the splash screen over this; on web it replaces the blank page.
  if (!done) return <Loading />;
  return (
    <MessageProvider>
      <StatusBar style={settings.theme === 'dim' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: settings.reduceMotion ? 'none' : 'fade', contentStyle: { backgroundColor: palette.ground } }} />
    </MessageProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
