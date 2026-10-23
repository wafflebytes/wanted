/**
 * Landing and onboarding (PRD 8.5: three cards). The purple Scout button starts the flow;
 * the demo opens Maya Ortiz, a composite persona labeled as such.
 */
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, Group, ListRow, Row, Section } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { T } from '@/ui/components/T';
import { useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { PLACEHOLDERS } from '@/ui/placeholders.generated';
import { C, IMAGES, S } from '@/ui/theme';

type Artists = { artists: { id: string; slug: string; name: string; kind: string; isDemo: boolean; sound: { entities: { name: string }[] } }[] };

const STEPS: { n: string; icon: IconName; title: string; body: string }[] = [
  { n: '01', icon: 'map', title: 'Qloo predicts it', body: 'Name the acts you sound like. Qloo’s taste graph lights up the US, hex by hex, down to the neighborhood and the room.' },
  { n: '02', icon: 'signature', title: 'Fans prove it', body: 'Post a WANTED poster per city. Fans sign it in one tap, no app, no account. Every signature lands on your map.' },
  { n: '03', icon: 'van', title: 'Gus books it', body: 'Your tour manager routes the van, roasts bad dates, and drafts the booking email with the proof attached.' },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const { data } = useApi<Artists>('/artists');
  const maya = data?.artists.find((a) => a.slug === 'maya-ortiz');
  const hero = Math.min(width, 760) / 1.5;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.canvas }} contentContainerStyle={{ paddingBottom: insets.bottom + S.xxxl }} contentInsetAdjustmentBehavior="never">
      <Head>
        <title>Wanted · Find out where you're wanted</title>
        <meta property="og:title" content="Wanted" />
        <meta property="og:description" content="Qloo predicts it. Fans prove it. Gus books it." />
        <meta property="og:image" content="/cover.jpg" />
      </Head>
      {/* The cover art carries the wordmark and tagline; the heading below is for screen readers and search. */}
      <View style={{ width: '100%', height: wide ? 560 : hero + insets.top, overflow: 'hidden', backgroundColor: '#120c08' }}>
        <Image
          source={IMAGES.cover}
          placeholder={{ uri: PLACEHOLDERS.cover }}
          placeholderContentFit="cover"
          style={{ position: 'absolute', left: 0, right: 0, top: wide ? 0 : insets.top, bottom: 0 } as object}
          contentFit="cover"
          contentPosition="top"
          transition={250}
          accessibilityLabel="Wanted. Find out where you're wanted. Gus pins a WANTED poster to a wall while fans sign it, the tour van parked at sunset."
        />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 55%, #000 100%)' } as object} />
      </View>

      <View style={{ paddingHorizontal: S.gutter, marginTop: -S.xxl, maxWidth: 640, width: '100%', alignSelf: 'center', gap: S.xl }}>
        <View style={{ gap: S.sm }}>
          <T accessibilityRole="header" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
            Wanted: find out where you're wanted.
          </T>
          <T v="serifLarge">Qloo predicts it. Fans prove it. Gus books it.</T>
          <T v="callout" color={C.text2}>
            Know where your crowd lives before you book the van.
          </T>
        </View>

        <View style={{ gap: S.md }}>
          <Btn tone="scout" size="lg" full onPress={() => router.push('/scout')} accessibilityLabel="Scout: find where your crowd lives" icon={<Icon name="scout" variant="bold" size={20} color={C.text} />}>
            Scout my crowd
          </Btn>
          <Btn tone="glass" size="lg" full onPress={() => router.push('/a/maya-ortiz')}>
            Open the demo
          </Btn>
        </View>

        <GusLine line="Your people aren't where your streams are. Let's go find them." mood="wave" voice />

        <Section title="How it works">
          <Group>
            {STEPS.map((s) => (
              <ListRow
                key={s.n}
                leading={
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,176,0,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} variant="bold" size={18} color={C.amber} />
                  </View>
                }
                title={<T v="headline">{s.title}</T>}
                subtitle={s.body}
                style={{ alignItems: 'flex-start', paddingVertical: S.md }}
              />
            ))}
          </Group>
        </Section>

        {maya ? (
          <Section title="The demo">
            <Card onPress={() => router.push(`/a/${maya.slug}`)} accessibilityLabel="Open Maya Ortiz's demo tour">
              <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
                <Image source={IMAGES['maya-sticker']} style={{ width: 64, height: 64 }} contentFit="contain" />
                <View style={{ flex: 1, gap: S.xs }}>
                  <T v="headline">Maya Ortiz</T>
                  <T v="footnote">Indie folk-pop, 40k monthly listeners, ten dates and one van. Sounds like {maya.sound.entities.map((e) => e.name).join(' + ')}.</T>
                  <Chip mono color={C.cream} bg="rgba(244,233,211,0.10)">
                    composite persona · demo data
                  </Chip>
                </View>
                <Icon name="chevron" size={18} color={C.text3} />
              </Row>
            </Card>
          </Section>
        ) : null}

        <Section title="Or try a preset Sound">
          <Group>
            <ListRow
              title="Hip-hop"
              subtitle="Little Simz + JID"
              onPress={() => router.push({ pathname: '/scout', params: { preset: 'hiphop' } })}
              trailing={<Icon name="chevron" size={18} color={C.text3} />}
            />
            <ListRow
              title="Stand-up"
              subtitle="John Mulaney + Taylor Tomlinson. Comedians resolve as people; rooms come from comedy-club tags."
              onPress={() => router.push({ pathname: '/scout', params: { preset: 'standup' } })}
              trailing={<Icon name="chevron" size={18} color={C.text3} />}
            />
          </Group>
        </Section>

        <View style={{ gap: S.sm, alignItems: 'center' }}>
          <Row gap={S.xs}>
            <Link href="/evals" asChild>
              <Btn tone="ghost" size="sm">
                Report Card
              </Btn>
            </Link>
            <Link href="/limits" asChild>
              <Btn tone="ghost" size="sm">
                Known limits
              </Btn>
            </Link>
          </Row>
          <T v="caption" style={{ textAlign: 'center', maxWidth: 320 }}>
            Taste data from Qloo. Aggregate affinity, never individual facts. Gus roasts routes, not people.
          </T>
        </View>
      </View>
    </ScrollView>
  );
}
