/**
 * Artist app tabs on iPhone: the system Liquid Glass tab bar via NativeTabs (PRD 8.2), with
 * SF Symbols. Four tabs. Gus stands behind each screen's lead card (see GusPerch), not over the
 * content: he stays out of the way until he has something worth a decision.
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useArtist, useRememberArtist } from '@/ui/artist';

const TAB = {
  map: { default: 'map', selected: 'map.fill' },
  tour: { default: 'point.topright.arrow.triangle.backward.to.point.bottomleft.scurvepath', selected: 'point.topright.arrow.triangle.backward.to.point.bottomleft.scurvepath.fill' },
  // Fan Mail lives at /pulse (the route kept its old name so links don't break).
  pulse: { default: 'envelope', selected: 'envelope.fill' },
  posters: { default: 'star.square.on.square', selected: 'star.square.on.square.fill' },
} as const;

export default function ArtistTabs() {
  const { slug, data } = useArtist();
  useRememberArtist(slug, data);
  const unread = data?.unread ?? 0;
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#B45CF0" iconColor={{ default: 'rgba(235,235,245,0.68)', selected: '#B45CF0' }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={TAB.map} />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tour">
        <NativeTabs.Trigger.Icon sf={TAB.tour} />
        <NativeTabs.Trigger.Label>Tour</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pulse">
        <NativeTabs.Trigger.Icon sf={TAB.pulse} />
        <NativeTabs.Trigger.Label>Fan Mail</NativeTabs.Trigger.Label>
        {unread ? <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="posters">
        <NativeTabs.Trigger.Icon sf={TAB.posters} />
        <NativeTabs.Trigger.Label>Posters</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
