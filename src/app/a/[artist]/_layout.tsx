/**
 * The artist's app: the tab group plus Settings, which slides up as a sheet over whichever
 * tab opened it. Gus, the voice agent, wraps all of it so any screen can talk to him.
 */
import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentProvider, GusButton } from '@/ui/agent/Agent';
import { useArtist } from '@/ui/artist';
import { C, S } from '@/ui/theme';

export default function ArtistStack() {
  const { slug, data } = useArtist();
  const insets = useSafeAreaInsets();
  return (
    <AgentProvider slug={slug} name={data?.artist.name}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
      {/* iPhone's system tab bar can't hold him, so Gus floats just above its trailing end. */}
      {Platform.OS === 'ios' ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', right: S.gutter, bottom: insets.bottom + 62 }}>
          <GusButton size={58} />
        </View>
      ) : null}
    </AgentProvider>
  );
}
