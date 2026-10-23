/** A plain reading screen (Report Card, Known limits): large title, Gus's take, then sections. */
import { router } from 'expo-router';
import Head from 'expo-router/head';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, S } from '../theme';
import { Row } from './core';
import { GusLine, type GusMood } from './Gus';
import { SheetButton } from './Sheet';
import { T } from './T';

export function DocScreen({ title, eyebrow, line, mood = 'reading', children }: { title: string; eyebrow: string; line: string; mood?: GusMood; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{title} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.xxxl, paddingHorizontal: S.gutter, gap: S.xl, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <T v="eyebrow" color={C.amber}>
            {eyebrow}
          </T>
          <SheetButton icon="close" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </Row>
        <T v="largeTitle" accessibilityRole="header">
          {title}
        </T>
        <GusLine line={line} mood={mood} model="gus-lite" />
        {children}
      </ScrollView>
    </View>
  );
}

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <T v="title2" accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}
