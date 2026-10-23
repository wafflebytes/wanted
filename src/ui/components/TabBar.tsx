/**
 * The floating glass tab capsule (PRD 8.2: web and Android; iOS uses NativeTabs). Glass sits
 * on navigation only. A badge shows unread Gus messages.
 */
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { haptic } from '../haptics';
import { C, F, S } from '../theme';
import { T } from './T';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/names';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, IconName> = { index: 'map', tour: 'tour', crowd: 'crowd', posters: 'posters', inbox: 'inbox' };

/** Height of the floating bar plus its gap from the bottom edge; screens pad scroll content by this. */
export const TAB_BAR_SPACE = 64 + 8;

export function GlassTabBar({ state, descriptors, navigation, unread }: BottomTabBarProps & { unread: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: S.gutter, right: S.gutter, bottom: Math.max(insets.bottom - 6, 8), alignItems: 'center' }}>
      <GlassSurface preset="prominent" style={{ borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden', width: '100%', maxWidth: 440 }}>
        <View style={{ flexDirection: 'row', padding: 4, height: 64 }} accessibilityRole="tablist">
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const label = (descriptors[route.key].options.title ?? route.name) as string;
            const badge = route.name === 'inbox' && unread > 0 ? unread : 0;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
                onPress={() => {
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) {
                    haptic.tick();
                    navigation.navigate(route.name, route.params);
                  }
                }}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 999, backgroundColor: focused ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                  <View>
                    <Icon name={ICONS[route.name] ?? 'more'} variant={focused ? 'bold' : 'linear'} size={24} color={focused ? C.purpleHi : C.text} />
                    {badge ? (
                      <View style={{ position: 'absolute', top: -5, right: -11, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1.5, borderColor: '#1c1c1e' }}>
                        <T style={{ fontFamily: F.rounded ?? F.bold, fontWeight: '700', fontSize: 11, lineHeight: 13, color: '#fff' }}>{badge}</T>
                      </View>
                    ) : null}
                  </View>
                  <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 11, lineHeight: 13, color: focused ? C.purpleHi : C.text }}>{label}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}
