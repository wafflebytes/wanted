/**
 * The artist's app: the tab group plus Settings, which slides up as a sheet over whichever
 * tab opened it.
 */
import { Stack } from 'expo-router';
import { C } from '@/ui/theme';

export default function ArtistStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.canvas } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
