/**
 * A tab screen's header (Flighty's): a large title on the leading side, an optional
 * subtitle, and on the trailing side any round actions plus the artist's own sticker, which
 * opens Settings (so no tab is spent on it).
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useArtist } from '../artist';
import { C, F, IMAGES, S } from '../theme';
import { Row } from './core';
import { T } from './T';

export function ScreenHeader({ title, subtitle, slug, trailing }: { title: string; subtitle?: string; slug: string | null; trailing?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: S.sm, minHeight: 56 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="largeTitle" accessibilityRole="header" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T v="subhead" color={C.text2} numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      <Row gap={S.sm}>
        {trailing}
        {slug ? <ArtistButton slug={slug} /> : null}
      </Row>
    </Row>
  );
}

/** The artist's die-cut sticker (or an initial), 44 pt, opening Settings. */
export function ArtistButton({ slug }: { slug: string }) {
  const { data } = useArtist();
  const name = data?.artist.name ?? '';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${name || 'Artist'}. Settings`} onPress={() => router.push(`/a/${slug}/settings`)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {data?.artist.isDemo ? (
        <Image source={IMAGES['maya-sticker']} style={{ width: 48, height: 46 }} contentFit="contain" />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>{name.slice(0, 1).toUpperCase()}</T>
        </View>
      )}
    </Pressable>
  );
}
