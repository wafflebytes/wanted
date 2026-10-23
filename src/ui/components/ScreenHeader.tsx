/**
 * A tab screen's header: a large title on the leading side, an optional subtitle, and the
 * artist button on the trailing side that opens Settings (so no tab is spent on it).
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { C, S } from '../theme';
import { IconBtn, Row } from './core';
import { T } from './T';
import { Icon } from '../icons/Icon';

export function ScreenHeader({ title, subtitle, slug, trailing }: { title: string; subtitle?: string; slug: string | null; trailing?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: S.sm }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="largeTitle" accessibilityRole="header">
          {title}
        </T>
        {subtitle ? <T v="callout" color={C.text2}>{subtitle}</T> : null}
      </View>
      <Row gap={S.sm} style={{ paddingBottom: 4 }}>
        {trailing}
        {slug ? <IconBtn icon={<Icon name="profile" size={22} color={C.text} />} label="Settings" onPress={() => router.push(`/a/${slug}/settings`)} /> : null}
      </Row>
    </Row>
  );
}
