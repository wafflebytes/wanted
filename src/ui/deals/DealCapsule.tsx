/**
 * A backgrounded deal, as a small glass capsule above the tab bar, like a Live Activity: who
 * Gus is talking to and where it stands. Tap to bring the conversation back. Shows only while
 * the agents are talking or a yes is waiting on the artist; gone otherwise.
 */
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { enterUp } from '../motion';
import { C } from '../theme';
import { T } from '../components/T';
import { deals, useDeals } from './store';

export function DealCapsule({ bottom }: { bottom: number }) {
  const { deal, open, seen } = useDeals();
  if (!deal || open || (deal.status !== 'talking' && deal.status !== 'waiting')) return null;
  const live = deal.status === 'talking';
  const fresh = deal.thread.length - seen;
  const line = live ? (fresh > 0 ? `${fresh} new` : 'Talking') : 'Said yes';
  return (
    <Animated.View entering={enterUp(0, 8)} exiting={FadeOut.duration(150)} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}>
      <Pressable
        onPress={() => (haptic.tap(), deals.open())}
        accessibilityRole="button"
        accessibilityLabel={`Gus and ${deal.roomName}. ${live ? 'Still talking' : 'They said yes, waiting on you'}. Opens the conversation.`}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
      >
        <View style={{ borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
          {/* Tinted like the map drawer, so it reads over bright poster art. */}
          <GlassSurface preset="standard" elevation="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 44, paddingLeft: 14, paddingRight: 16, borderRadius: 22, backgroundColor: 'rgba(12,12,14,0.6)' }}>
            <Pulse live={live} />
            <T v="headline" numberOfLines={1} style={{ maxWidth: 200 }}>
              Gus · {deal.roomName}
            </T>
            <T v="footnote" color={live ? C.text2 : C.good}>
              {line}
            </T>
          </GlassSurface>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** A quiet breathing dot while they talk; solid green once there's a yes. */
function Pulse({ live }: { live: boolean }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!live || reduced) return;
    o.value = withRepeat(withSequence(withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })), -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, reduced]);
  const s = useAnimatedStyle(() => ({ opacity: live ? o.value : 1 }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: live ? C.purpleHi : C.good }, s]} />;
}
