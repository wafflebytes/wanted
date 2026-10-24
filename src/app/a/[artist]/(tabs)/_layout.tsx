/**
 * Artist app tabs on the web and Android: a floating Glassy UI capsule (PRD 8.2). Four tabs.
 * Gus lives in each screen's header; Settings opens from there too.
 */
import { Tabs } from 'expo-router';
import { useArtist, useRememberArtist } from '@/ui/artist';
import { GlassTabBar } from '@/ui/components/TabBar';
import { C } from '@/ui/theme';

export default function ArtistTabs() {
  const { slug, data } = useArtist();
  useRememberArtist(slug, data);
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} unread={data?.unread ?? 0} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.canvas } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="tour" options={{ title: 'Tour' }} />
      <Tabs.Screen name="pulse" options={{ title: 'Fan Mail' }} />
      <Tabs.Screen name="posters" options={{ title: 'Posters' }} />
    </Tabs>
  );
}
