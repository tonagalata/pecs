import { useEffect } from 'react';
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
  const [fontsLoaded] = useFonts({ Lexend_500Medium, Lexend_600SemiBold, AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });
  const done = ready && voicesReady && fontsLoaded;
  useEffect(() => { if (done) SplashScreen.hideAsync().catch(() => {}); }, [done]);
  if (!done) {
    // Native shows the splash screen over this; on web it replaces the blank page.
    const status = !ready ? 'Opening your board…' : !voicesReady ? 'Getting the voice ready…' : 'Almost ready…';
    const progress = [ready, voicesReady, fontsLoaded].filter(Boolean).length / 3;
    return <Loading status={status} progress={progress} />;
  }
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
