import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, NotoSansTamil_400Regular, NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil';
import { RobotoMono_400Regular, RobotoMono_700Bold } from '@expo-google-fonts/roboto-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from './src/api/queryClient';
import { useAuthStore } from './src/store/auth.store';
import { initOfflineDb } from './src/offline/db';
import { startAutoSync } from './src/offline/sync';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/theme/tokens';
import { initMobileSentry } from './src/config/sentry';
import { initPostHog } from './src/config/posthog';

SplashScreen.preventAutoHideAsync();
initMobileSentry();
initPostHog();

/**
 * PKG-038 — CRITICAL: Tamil font loading MUST be awaited before any
 * screen renders. If this promise isn't awaited, Tamil text flashes in
 * the system default font on first paint — extremely visible on Android
 * and directly undermines the "Tamil-first" product positioning in the
 * first three seconds of every session. The splash screen stays up
 * (SplashScreen.preventAutoHideAsync above) until fontsLoaded AND
 * auth-store hydration both complete.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansTamil_400Regular,
    NotoSansTamil_700Bold,
    RobotoMono_400Regular,
    RobotoMono_700Bold,
  });

  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initOfflineDb();
    setDbReady(true);
    hydrate();
    const unsubscribe = startAutoSync();
    return unsubscribe;
  }, [hydrate]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && hydrated && dbReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated, dbReady]);

  if (!fontsLoaded || !hydrated || !dbReady) {
    return null; // splash screen still visible
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <RootNavigator />
      </QueryClientProvider>
    </View>
  );
}
