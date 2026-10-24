import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassProvider } from '@/components/glassyui/glass-provider';
import { ReceiptProvider } from '@/ui/components/Receipts';
import { Toaster } from '@/ui/components/Toaster';
import { SplashIntro } from '@/ui/splash/SplashIntro';
import { C, FONT_FILES } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Known framework noise (NativeTabs icon modes, Reanimated listener churn); real warnings still show.
LogBox.ignoreLogs(['NativeTabs does not currently support', 'Sending `onAnimatedValueUpdate`', 'luma.gl']);

export default function RootLayout() {
  const [loaded, error] = useFonts(FONT_FILES);
  // The launch screen hands off to an animated copy of itself on phones (web has none).
  const [intro, setIntro] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: C.canvas }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.canvas }}>
      <SafeAreaProvider>
        <GlassProvider defaultTheme="dark">
          <Toaster>
            <ReceiptProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.canvas }, animation: 'fade' }}>
                <Stack.Screen name="scout" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              </Stack>
            </ReceiptProvider>
          </Toaster>
        </GlassProvider>
      </SafeAreaProvider>
      {intro ? <SplashIntro onDone={() => setIntro(false)} /> : null}
    </GestureHandlerRootView>
  );
}
