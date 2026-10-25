/**
 * The artist's app: the tab group plus Settings, which slides up as a sheet over whichever
 * tab opened it. Keyed by artist so switching acts remounts every tab, and the slug goes down
 * through context so every tab reads the act this layout was opened for. Gus's controller and
 * overlay live here, once, above every tab, and so does the deal he's working on (its sheet and
 * the capsule that brings it back), and Gus's call when a paid hold is about to run out.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtistSlug } from '@/ui/artist';
import { DealSheet } from '@/ui/components/DealSheet';
import { DealCapsule } from '@/ui/deals/DealCapsule';
import { deals } from '@/ui/deals/store';
import { useGusController } from '@/ui/gus/controller';
import { GusCallOverlay } from '@/ui/gus/GusCall';
import { GusOverlay } from '@/ui/gus/GusDock';
import { C } from '@/ui/theme';

export default function ArtistStack() {
  const { artist } = useLocalSearchParams<{ artist: string }>();
  const slug = String(artist ?? '');
  const insets = useSafeAreaInsets();
  useGusController(slug);
  // A deal Gus was mid-way through picks up where it left off.
  useEffect(() => {
    if (slug) deals.resume(slug);
  }, [slug]);
  // Gus's cards rise from just above the tab bar.
  const dockBottom = Platform.OS === 'ios' ? insets.bottom + 58 : Math.max(insets.bottom - 6, 8) + 76;
  return (
    <ArtistSlug.Provider value={slug || null}>
      <View style={{ flex: 1, backgroundColor: C.canvas }}>
        <Stack key={slug} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="logbook" options={{ presentation: 'modal' }} />
        </Stack>
        <GusOverlay dockBottom={dockBottom} />
        <DealCapsule bottom={dockBottom + 10} />
        <DealSheet />
        <GusCallOverlay slug={slug} />
      </View>
    </ArtistSlug.Provider>
  );
}
