/**
 * Shell for the two reference pages (Report Card, Known limits): a large title that the
 * header picks up once it scrolls away, a Done/back control, and a readable column.
 * Opened as a sheet on iPhone and as a plain page on the web.
 */
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { type ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from './T';
import { C, F, S } from '../theme';

export function DocPage({ title, eyebrow, lede, children }: { title: string; eyebrow: string; lede: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{`${title} · Wanted`}</title>
      </Head>
      <View style={{ paddingTop: insets.top + S.xs, paddingHorizontal: S.gutter, minHeight: 52 + insets.top, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: scrolled ? 0.5 : 0, borderBottomColor: C.line }}>
        <View style={{ width: 72 }} />
        <T v="headline" style={{ opacity: scrolled ? 1 : 0 }} accessibilityElementsHidden={!scrolled}>
          {title}
        </T>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 72, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' })}>
          <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, color: C.purpleHi }}>{Platform.OS === 'web' ? 'Close' : 'Done'}</T>
        </Pressable>
      </View>
      <ScrollView
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 56)}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: insets.bottom + S.xxxl, gap: S.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      >
        <View style={{ gap: S.sm }}>
          <T v="label" color={C.amber}>
            {eyebrow}
          </T>
          <T v="title" accessibilityRole="header">
            {title}
          </T>
          <T v="callout" color={C.text2} style={{ lineHeight: 23 }}>
            {lede}
          </T>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}
