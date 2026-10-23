/**
 * Artist app tabs on iPhone: the system Liquid Glass tab bar via NativeTabs (PRD 8.2), with
 * MX Icons. Five tabs, so nothing overflows into a system More list (HIG: avoid tab overflow); Settings
 * opens from each screen's header instead.
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useArtist } from '@/ui/artist';

// MX Icons rendered as template images by scripts/build-icons.ts; the system tints them. Bold when selected.
const TAB = {
  map: { default: require('../../../../../assets/icons/tab-map-linear.png'), selected: require('../../../../../assets/icons/tab-map-bold.png') },
  tour: { default: require('../../../../../assets/icons/tab-tour-linear.png'), selected: require('../../../../../assets/icons/tab-tour-bold.png') },
  crowd: { default: require('../../../../../assets/icons/tab-crowd-linear.png'), selected: require('../../../../../assets/icons/tab-crowd-bold.png') },
  posters: { default: require('../../../../../assets/icons/tab-posters-linear.png'), selected: require('../../../../../assets/icons/tab-posters-bold.png') },
  inbox: { default: require('../../../../../assets/icons/tab-inbox-linear.png'), selected: require('../../../../../assets/icons/tab-inbox-bold.png') },
};

export default function ArtistTabs() {
  const { data } = useArtist();
  const unread = data?.unread ?? 0;
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#B45CF0">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon src={TAB.map} />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tour">
        <NativeTabs.Trigger.Icon src={TAB.tour} />
        <NativeTabs.Trigger.Label>Tour</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="crowd">
        <NativeTabs.Trigger.Icon src={TAB.crowd} />
        <NativeTabs.Trigger.Label>Crowd</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="posters">
        <NativeTabs.Trigger.Icon src={TAB.posters} />
        <NativeTabs.Trigger.Label>Posters</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Icon src={TAB.inbox} />
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        {unread ? <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
