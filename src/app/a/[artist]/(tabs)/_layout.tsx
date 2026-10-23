/**
 * Artist app tabs on the web and Android: a floating Glassy UI capsule (PRD 8.2). Five tabs;
 * Settings opens from each screen's header.
 */
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useArtist } from '@/ui/artist';
import { GlassTabBar } from '@/ui/components/TabBar';
import { session } from '@/ui/session';
import { C } from '@/ui/theme';

export default function ArtistTabs() {
  const { slug, data } = useArtist();
  useEffect(() => {
    if (slug) session.setLastArtist(slug);
  }, [slug]);
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} unread={data?.unread ?? 0} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.canvas } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="tour" options={{ title: 'Tour' }} />
      <Tabs.Screen name="crowd" options={{ title: 'Crowd' }} />
      <Tabs.Screen name="posters" options={{ title: 'Posters' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
    </Tabs>
  );
}
