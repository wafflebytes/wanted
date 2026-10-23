import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlassProvider } from '@/components/glassyui/glass-provider';
import { ReceiptProvider } from '@/ui/components/Receipts';
import { Toaster } from '@/ui/components/Toaster';
import { C, FONT_FILES } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts(FONT_FILES);
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
    </GestureHandlerRootView>
  );
}
