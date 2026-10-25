/**
 * A tab screen's header. Who you are sits above the title as plain words, the artist's name
 * with a chevron, which opens your acts and Settings. No avatar, no icon buttons.
 * Gus stands at the trailing edge with his waist tucked behind whatever comes next (the
 * screen's lead card), so he reads as part of the page, not chrome stuck on top of it.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useArtist } from '../artist';
import { GusPerch } from '../gus/GusDock';
import { haptic } from '../haptics';
import { Icon } from '../icons/Icon';
import { C, S } from '../theme';
import { ActsSheet } from './ActsSheet';
import { T } from './T';

/** Gus's height on the perch, and how much of him hides behind the card below (past the stack's gap). */
const GUS = 84;
const TUCK = 14;

export function ScreenHeader({ title, subtitle, slug, gus = true }: { title: string; subtitle?: string; slug: string | null; gus?: boolean }) {
  const { data } = useArtist();
  const [acts, setActs] = useState(false);
  const name = data?.artist.name;
  return (
    <View style={{ paddingTop: S.sm, paddingRight: gus ? GUS * 0.7 : 0 }}>
      {slug ? (
        <Pressable
          onPress={() => {
            haptic.tap();
            setActs(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${name ?? 'Artist'}. Switch act or open Settings`}
          hitSlop={{ top: 10, bottom: 6, right: 12 }}
          style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24, opacity: pressed ? 0.6 : 1 })}
        >
          <T v="small" color={C.text2} numberOfLines={1} style={{ fontWeight: '600', flexShrink: 1 }}>
            {name ?? ' '}
          </T>
          <Icon name="chevronDown" size={12} color={C.text3} />
        </Pressable>
      ) : null}
      <T v="largeTitle" accessibilityRole="header">
        {title}
      </T>
      {subtitle ? (
        <T v="callout" color={C.text2}>
          {subtitle}
        </T>
      ) : null}
      {slug && gus ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 10, bottom: -(S.xl + TUCK) }}>
          <GusPerch size={GUS} />
        </View>
      ) : null}
      {slug ? <ActsSheet open={acts} onClose={() => setActs(false)} slug={slug} current={name ?? ''} /> : null}
    </View>
  );
}
