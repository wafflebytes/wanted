/**
 * Landing (PRD 8.5), map-first like Apple Maps: Maya's real heat map is the hero and a sheet
 * rides over it with the way in (Scout), preset Sounds, the cities fans signed and the demo.
 * Wide screens float the sheet as a side panel over a full-bleed map.
 */
import { Link, Redirect, router } from 'expo-router';
import Head from 'expo-router/head';
import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { Btn, IconBtn, Row } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { useReducedMotion } from '@/ui/hooks';
import { session } from '@/ui/session';
import { Icon } from '@/ui/icons/Icon';
import { HeatField } from '@/ui/landing/HeatField';
import { Passport, Press, SHEET, SoundTile, Stamp, StepCard } from '@/ui/landing/parts';
import { LANDING } from '@/ui/landing.generated';
import { C, F, gradient, IMAGES, S } from '@/ui/theme';

const MAYA = '/a/maya-ortiz';
const signed = LANDING.wanted.reduce((n, w) => n + w.signatures, 0);
const sleeper = LANDING.wanted.reduce((a, b) => ((b.rank ?? 0) > (a.rank ?? 0) ? b : a));

function SectionHead({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <T v="head" accessibilityRole="header">
        {title}
      </T>
      {trailing ? <T v="footnote">{trailing}</T> : null}
    </Row>
  );
}

function Sheet({ bleed }: { bleed: number }) {
  return (
    <View style={{ gap: S.xxl }}>
      <View style={{ gap: S.xs }}>
        <T accessibilityRole="header" style={styles.wordmark}>
          Wanted
        </T>
        <T v="serifLarge" color={C.text2} style={{ fontSize: 24, lineHeight: 28 }}>
          Find out where you’re wanted.
        </T>
      </View>

      <Pressable
        onPress={() => {
          haptic.tap();
          router.push('/scout');
        }}
        accessibilityRole="search"
        accessibilityLabel="Scout. Name an act you sound like."
        style={({ pressed }) => [styles.search, pressed && { backgroundColor: 'rgba(118,118,128,0.34)' }]}
      >
        <Icon name="search" size={20} color={C.text2} />
        <T v="body" color={C.text3} style={{ flex: 1 }} numberOfLines={1}>
          Name an act you sound like
        </T>
        <Icon name="mic" size={20} color={C.text2} />
      </Pressable>

      <View style={{ gap: S.md }}>
        <SectionHead title="Start from a Sound" />
        <Row style={{ justifyContent: 'space-between' }}>
          <SoundTile icon="music" title="Folk-pop" sub="Maya’s demo" bg="linear-gradient(145deg, #FFB000 0%, #FF4D2E 100%)" onPress={() => router.push(MAYA)} />
          <SoundTile icon="mic" title="Hip-hop" sub="Simz + JID" bg="linear-gradient(145deg, #B45CF0 0%, #5A13A0 100%)" onPress={() => router.push({ pathname: '/scout', params: { preset: 'hiphop' } })} />
          <SoundTile icon="ticket" title="Stand-up" sub="Mulaney +" bg="linear-gradient(145deg, #4FB3FF 0%, #0A4FC2 100%)" onPress={() => router.push({ pathname: '/scout', params: { preset: 'standup' } })} />
          <SoundTile icon="add" title="Yours" sub="Scout it" bg="linear-gradient(145deg, #2C2C2E 0%, #1C1C1E 100%)" onPress={() => router.push('/scout')} />
        </Row>
      </View>

      <View style={{ gap: S.md }}>
        <SectionHead title="Wanted in" trailing={`${signed} fans signed`} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={152 + S.lg}
          decelerationRate="fast"
          style={{ marginHorizontal: -bleed, overflow: 'visible' }}
          contentContainerStyle={{ paddingHorizontal: bleed, paddingVertical: S.lg, gap: S.lg }}
        >
          {LANDING.wanted.map((w, i) => (
            <Stamp key={w.id} w={w} i={i} onPress={() => router.push(`/w/maya-ortiz/${w.id}`)} />
          ))}
        </ScrollView>
        <GusLine line={`Qloo ranked ${sleeper.city} #${sleeper.rank}. ${sleeper.signatures} fans signed anyway. That's why we ask them.`} mood="wave" voice />
      </View>

      <View style={{ gap: S.md }}>
        <SectionHead title="The demo" />
        <Passport onPress={() => router.push(MAYA)} />
      </View>

      <View style={{ gap: S.md }}>
        <SectionHead title="How it works" />
        <StepCard
          n="01"
          kicker="Qloo predicts it"
          big={LANDING.hexes.toLocaleString('en-US')}
          unit="neighborhood hexes, scored"
          title="Your crowd, hex by hex"
          body="Name the acts you sound like. Qloo’s taste graph lights up the US down to the neighborhood and the room."
          bg="linear-gradient(150deg, #FFC233 0%, #FF8A1A 55%, #E2491C 100%)"
          ink={C.ink}
        />
        <StepCard
          n="02"
          kicker="Fans prove it"
          big="1 tap"
          unit="to sign. No app, no account."
          title="A WANTED poster per city"
          body="Fans sign in one tap. Every signature lands on your map, so a ranking turns into proof."
          bg="linear-gradient(150deg, #8E2BD6 0%, #4B0F85 60%, #2A0750 100%)"
          art={<Image source={IMAGES['stamp-caught-live']} style={styles.stepStamp} contentFit="contain" accessibilityIgnoresInvertColors />}
        />
        <StepCard
          n="03"
          kicker="Gus books it"
          big={String(LANDING.route.stops.length)}
          unit="dates, routed and roasted"
          title="Your tour manager"
          body="Gus routes the van, roasts bad dates and drafts the booking email with the proof attached."
          bg="linear-gradient(150deg, #134B6E 0%, #0B2A40 60%, #071823 100%)"
          art={<Image source={IMAGES['gus-lets-ride']} style={styles.stepGus} contentFit="contain" accessibilityIgnoresInvertColors />}
        />
      </View>

      <Btn tone="scout" size="lg" full onPress={() => router.push('/scout')} icon={<Icon name="scout" variant="bold" size={20} color={C.text} />}>
        Scout my crowd
      </Btn>

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
  );
}

/** Floating chrome over the map: the live count and the Report Card. */
function MapChrome({ top, left, right }: { top: number; left: number; right: number }) {
  return (
    <View style={{ position: 'absolute', top, left, right, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} pointerEvents="box-none">
      <Press onPress={() => router.push(MAYA)} label={`Live: ${signed} fans signed Maya's posters. Opens the demo.`}>
        <GlassSurface preset="control" elevation="raised" style={styles.live}>
          <View style={styles.liveDot} />
          <T style={styles.liveText}>
            <T style={[styles.liveText, { fontFamily: F.monoBold }]}>{signed}</T> fans signed
          </T>
        </GlassSurface>
      </Press>
      <IconBtn glass size={44} label="Report Card" icon={<Icon name="chart" size={20} color={C.text} />} onPress={() => router.push('/evals')} />
    </View>
  );
}

const MAP_LABEL = `Map of the United States. Qloo heat for Maya Ortiz's Sound glows brightest across the Northeast; her ${LANDING.route.stops.length}-date tour runs from ${LANDING.route.stops[0].city} to ${LANDING.route.stops[LANDING.route.stops.length - 1].city}.`;

/** On iPhone the app opens into onboarding the first time, then straight into the artist's map. */
export default function Index() {
  if (Platform.OS !== 'web') {
    if (!session.onboarded()) return <Redirect href="/welcome" />;
    return <Redirect href={`/a/${session.lastArtist() ?? 'maya-ortiz'}`} />;
  }
  return <Landing />;
}

function Landing() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const wide = width >= 900;
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });

  const heroH = Math.round(Math.max(380, Math.min(height * 0.58, 560)));
  const mapTop = insets.top + 60;
  const parallax = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, heroH * 0.8], [1, 0.25], Extrapolation.CLAMP),
    transform: [{ translateY: -y.value * 0.45 }, { scale: interpolate(y.value, [-200, 0], [1.12, 1], Extrapolation.CLAMP) }],
  }));

  const chrome = useAnimatedStyle(() => {
    const o = interpolate(y.value, [heroH - 200, heroH - 120], [1, 0], Extrapolation.CLAMP);
    return { opacity: o, transform: [{ translateY: (o - 1) * 12 }], pointerEvents: o < 0.1 ? 'none' : 'box-none' };
  });
  const bar = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [heroH - 60, heroH], [0, 1], Extrapolation.CLAMP) }));

  const head = (
    <Head>
      <title>Wanted · Find out where you're wanted</title>
      <meta name="description" content="Qloo predicts it. Fans prove it. Gus books it." />
      <meta property="og:title" content="Wanted" />
      <meta property="og:description" content="Qloo predicts it. Fans prove it. Gus books it." />
    </Head>
  );

  if (wide) {
    const panel = 440;
    const mapX = panel + S.xxl * 2;
    return (
      <View style={{ flex: 1, backgroundColor: C.canvas }}>
        {head}
        <View style={{ position: 'absolute', left: mapX, right: S.xxl, top: 96, bottom: S.xxl }} accessible accessibilityRole="image" accessibilityLabel={MAP_LABEL}>
          <HeatField width={width - mapX - S.xxl} height={height - 96 - S.xxl} reduced={reduced} />
        </View>
        <MapChrome top={S.xxl} left={mapX} right={S.xxl} />
        <View style={[styles.panel, { width: panel, left: S.xxl, top: S.xxl, bottom: S.xxl }]}>
          <ScrollView contentContainerStyle={{ padding: S.xxl, paddingBottom: S.xxxl }} showsVerticalScrollIndicator={false}>
            <Sheet bleed={S.xxl} />
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      {head}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: mapTop }, parallax]} accessible accessibilityRole="image" accessibilityLabel={MAP_LABEL}>
        <HeatField width={width} height={heroH - mapTop + 10} reduced={reduced} />
      </Animated.View>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: heroH }}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.xxxl, minHeight: height - insets.top }]}>
          <View style={styles.grabber} />
          <Sheet bleed={S.gutter} />
        </View>
      </Animated.ScrollView>
      <View pointerEvents="none" style={[styles.topFade, { height: insets.top + 8 }]} />
      <Animated.View pointerEvents="none" style={[styles.topBar, { height: insets.top }, bar]} />
      <Animated.View style={[StyleSheet.absoluteFill, chrome]} pointerEvents="box-none">
        <MapChrome top={insets.top + 8} left={S.gutter} right={S.gutter} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { fontFamily: F.displayBlack, fontSize: 44, lineHeight: 48, letterSpacing: -1.2, color: C.text },
  search: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: C.fill,
    paddingHorizontal: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderCurve: 'continuous',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.lineHi,
    paddingHorizontal: S.gutter,
    paddingTop: S.sm,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(235,235,245,0.3)', marginBottom: S.lg },
  panel: {
    position: 'absolute',
    backgroundColor: SHEET,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.lineHi,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, ...gradient('linear-gradient(180deg, #000 30%, rgba(0,0,0,0) 100%)') },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: SHEET },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: 22 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purpleHi, shadowColor: C.purpleHi, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  liveText: { fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.text },
  stepStamp: { position: 'absolute', right: -28, top: 52, width: 160, height: 104, opacity: 0.6, transform: [{ rotate: '-14deg' }] },
  stepGus: { position: 'absolute', right: -34, bottom: -8, width: 168, height: 132 },
});
