/**
 * Landing and onboarding (PRD 8.5: three cards). Each card is a scene with Gus standing in
 * it, not a bullet list: Qloo predicts it, fans prove it, Gus books it (and you can just talk
 * to him). Round back and next buttons and a progress track sit at the bottom, in thumb reach;
 * the last card holds the two ways in: Scout your own crowd, or open the demo.
 */
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import Head from 'expo-router/head';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Group, ListRow } from '@/ui/components/core';
import { GusSticker, HearGus, useGusVoice } from '@/ui/components/Gus';
import { T } from '@/ui/components/T';
import { Beam } from '@/ui/fx/Beam';
import { haptic } from '@/ui/haptics';
import { useReducedMotion, useWindowSize } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { C, F, IMAGES, R, S } from '@/ui/theme';

type Page = { eyebrow: string; title: string; body: string; art: (h: number) => ReactNode; line: string };

const PAGES: Page[] = [
  {
    eyebrow: 'Qloo predicts it',
    title: 'Know where your crowd lives',
    body: 'Name the acts you sound like. Qloo’s taste graph lights up the country, then the neighborhood, then the room.',
    line: "Your people aren't where your streams are.",
    art: (h) => <HeatArt h={h} />,
  },
  {
    eyebrow: 'Fans prove it',
    title: 'Put up a WANTED poster',
    body: 'One poster per city. Fans sign it in one tap, no app, no account. Every signature lands on your map.',
    line: 'Columbus says it wants you. Prove it.',
    art: (h) => <PosterArt h={h} />,
  },
  {
    eyebrow: 'Gus books it',
    title: 'Just talk to Gus',
    body: 'Your tour manager routes the van, roasts bad dates and drafts the booking email. Ask him anything, out loud.',
    line: "Load-in at six. Doors at eight. Don't be late.",
    art: (h) => <TalkArt h={h} />,
  },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowSize();
  const reduced = useReducedMotion();
  const [page, setPage] = useState(0);
  const last = page === PAGES.length;
  const enter = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);

  const go = (to: number) => {
    if (to < 0 || to > PAGES.length || to === page) return;
    haptic.tick();
    dir.current = to > page ? 1 : -1;
    setPage(to);
  };
  useEffect(() => {
    if (reduced) return;
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [page, reduced, enter]);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50 || g.vx < -0.5) go(page + 1);
          else if (g.dx > 50 || g.vx > 0.5) go(page - 1);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page],
  );

  const artH = Math.min(440, Math.round(height * 0.5));
  const motion = { opacity: enter, transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [28 * dir.current, 0] }) }] };

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>Wanted · Find out where you're wanted</title>
        <meta property="og:title" content="Wanted" />
        <meta property="og:description" content="Qloo predicts it. Fans prove it. Gus books it." />
        <meta property="og:image" content="/cover.jpg" />
      </Head>
      <T accessibilityRole="header" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}>
        Wanted: find out where you're wanted.
      </T>

      {last ? (
        <Final insets={insets} width={width} onBack={() => go(PAGES.length - 1)} />
      ) : (
        <View style={{ flex: 1 }} {...swipe.panHandlers}>
          <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.gutter, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: insets.top + 52 }}>
            <Wordmark />
            <Pressable accessibilityRole="button" onPress={() => go(PAGES.length)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: S.sm })}>
              <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, color: C.text2 }}>Skip</T>
            </Pressable>
          </View>
          <Animated.View style={[{ flex: 1 }, motion]}>
            <View style={{ height: artH, marginHorizontal: S.gutter, marginTop: S.sm }}>{PAGES[page].art(artH)}</View>
            <View style={{ paddingHorizontal: S.xl, paddingTop: S.xl, gap: S.sm, alignItems: 'center' }}>
              <T v="eyebrow" color={C.amber}>
                {PAGES[page].eyebrow}
              </T>
              <T v="title" style={{ textAlign: 'center' }}>
                {PAGES[page].title}
              </T>
              <T v="callout" color={C.text2} style={{ textAlign: 'center', maxWidth: 340 }}>
                {PAGES[page].body}
              </T>
            </View>
          </Animated.View>
          <Controls page={page} onBack={() => go(page - 1)} onNext={() => go(page + 1)} bottom={insets.bottom} />
        </View>
      )}
    </View>
  );
}

function Wordmark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <Image source={IMAGES['gus-mark']} style={{ width: 30, height: 30, borderRadius: 8 }} contentFit="cover" />
      <T style={{ fontFamily: F.logo, fontSize: 22, letterSpacing: -0.8, color: C.text }}>Wanted</T>
    </View>
  );
}

/** Back, progress track, next: the onboarding reference's controls, 52 pt targets. */
function Controls({ page, onBack, onNext, bottom }: { page: number; onBack: () => void; onNext: () => void; bottom: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.gutter, paddingBottom: Math.max(bottom, S.lg) + S.sm, paddingTop: S.md }}>
      <Round label="Back" onPress={onBack} disabled={page === 0} dark>
        <Icon name="back" size={22} color={C.text} />
      </Round>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={`Card ${page + 1} of ${PAGES.length + 1}`}>
        {[...PAGES, null].map((_, i) => (
          <View key={i} style={{ height: 8, width: i === page ? 28 : 8, borderRadius: 4, backgroundColor: i <= page ? C.amber : 'rgba(255,255,255,0.22)' }} />
        ))}
      </View>
      <Round label="Next" onPress={onNext}>
        <Icon name="forward" size={22} color="#000" />
      </Round>
    </View>
  );
}

function Round({ children, label, onPress, disabled, dark }: { children: ReactNode; label: string; onPress: () => void; disabled?: boolean; dark?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.3 : pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.12)' : C.text }}>{children}</View>
    </Pressable>
  );
}

/** A warm stage for each scene: the card the art stands on. */
function Stage({ children, tone = 'stage' }: { children: ReactNode; tone?: 'stage' | 'heat' | 'cream' }) {
  const bg = tone === 'heat' ? 'radial-gradient(120% 90% at 50% 100%, #FF6A1A 0%, #7A2FB0 45%, #16072B 100%)' : tone === 'cream' ? 'radial-gradient(110% 90% at 50% 20%, #F4E9D3 0%, #E3C9A0 55%, #8A5A2E 100%)' : 'radial-gradient(120% 90% at 50% 100%, #9B30E0 0%, #3A1266 50%, #12061F 100%)';
  return <View style={{ flex: 1, borderRadius: 36, borderCurve: 'continuous', overflow: 'hidden', experimental_backgroundImage: bg, backgroundColor: '#1A0B2E', alignItems: 'center', justifyContent: 'flex-end' } as object}>{children}</View>;
}

function HeatArt({ h }: { h: number }) {
  const dots = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 62, r: 4 + ((i * 7) % 10), t: ((i * 13) % 100) / 100 })), []);
  return (
    <Stage tone="heat">
      {dots.map((d, i) => (
        <View key={i} style={{ position: 'absolute', left: `${d.x}%`, top: `${8 + d.y}%`, width: d.r * 2, height: d.r * 2, borderRadius: d.r, backgroundColor: d.t > 0.66 ? '#FFB000' : d.t > 0.33 ? '#FF4D2E' : '#B45CF0', opacity: 0.55 + d.t * 0.4, boxShadow: `0 0 ${d.r * 2}px ${d.t > 0.66 ? '#FFB000' : '#FF4D2E'}` } as object} />
      ))}
      <View style={{ position: 'absolute', top: 18, left: 18, flexDirection: 'row', gap: 6 }}>
        <Pill text="1 Burlington" />
        <Pill text="★ Eugene" gold />
      </View>
      <GusSticker mood="standing" size={h * 0.86} tilt={0} float style={{ marginBottom: -h * 0.06 }} />
    </Stage>
  );
}

function PosterArt({ h }: { h: number }) {
  return (
    <Stage tone="cream">
      <View style={{ position: 'absolute', top: 18, width: h * 0.56, height: h * 0.8, transform: [{ rotate: '-5deg' }] }}>
        <Image source={IMAGES['poster-0']} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        <Image source={IMAGES['maya-engraving']} style={{ position: 'absolute', left: '19%', right: '19%', top: '24%', height: '36%', opacity: 0.92 }} contentFit="cover" />
        <T style={{ position: 'absolute', left: 0, right: 0, top: '62%', textAlign: 'center', fontFamily: F.display, fontSize: h * 0.04, color: C.posterInk }}>MAYA ORTIZ</T>
        <T style={{ position: 'absolute', left: 0, right: 0, top: '69%', textAlign: 'center', fontFamily: F.displayBold, fontSize: h * 0.028, color: C.posterRed }}>IN COLUMBUS, OH</T>
      </View>
      <Image source={IMAGES['deputy-star']} style={{ position: 'absolute', top: h * 0.08, right: 22, width: 76, height: 76, transform: [{ rotate: '12deg' }] }} contentFit="contain" />
      <View style={{ position: 'absolute', left: 18, bottom: 22 }}>
        <Pill text="SIGNATURE #37 · DEPUTY" />
      </View>
      <GusSticker mood="proud" size={h * 0.42} tilt={4} style={{ position: 'absolute', right: -10, bottom: -6 }} />
    </Stage>
  );
}

function TalkArt({ h }: { h: number }) {
  return (
    <Stage>
      <View style={{ position: 'absolute', top: 22, left: 18, right: 18, gap: 10 }}>
        <View style={{ alignSelf: 'flex-end', backgroundColor: C.purple, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
          <T v="callout">Gus, how’s Columbus doing?</T>
        </View>
        <Beam variant="stage" radius={20}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(28,28,32,0.92)', borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '86%' }}>
            <T v="gus" style={{ fontSize: 18, lineHeight: 23 }}>
              36 signatures, 1.9× what Qloo expected. 14 more and I call it.
            </T>
          </View>
        </Beam>
      </View>
      <GusSticker mood="wave" size={h * 0.5} tilt={-3} float style={{ marginBottom: -4 }} />
    </Stage>
  );
}

function Pill({ text, gold }: { text: string; gold?: boolean }) {
  return (
    <View style={{ height: 28, paddingHorizontal: 10, borderRadius: R.pill, justifyContent: 'center', backgroundColor: 'rgba(20,20,24,0.78)', borderWidth: 1, borderColor: gold ? 'rgba(245,197,66,0.5)' : 'rgba(255,255,255,0.14)' }}>
      <T style={{ fontFamily: F.monoBold, fontSize: 12, color: gold ? C.gold : C.text }}>{text}</T>
    </View>
  );
}

function Final({ insets, width, onBack }: { insets: { top: number; bottom: number }; width: number; onBack: () => void }) {
  const [speaking, speak] = useGusVoice("Your people aren't where your streams are. Let's go find them.", 'wave');
  const hero = Math.min(width, 520);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + S.xxxl }} contentInsetAdjustmentBehavior="never">
      <View style={{ width: '100%', height: hero * 0.78 + insets.top, overflow: 'hidden', backgroundColor: '#120c08' }}>
        <Image source={IMAGES.cover} style={{ position: 'absolute', left: 0, right: 0, top: insets.top, bottom: 0 } as object} contentFit="cover" contentPosition="top" transition={250} accessibilityLabel="Gus pins a WANTED poster to a wall while fans sign it, the tour van parked at sunset." />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 60%, #000 100%)' } as object} />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ position: 'absolute', top: insets.top + S.sm, right: S.gutter }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <Icon name="back" size={20} color={C.text} />
          </View>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: S.gutter, marginTop: -S.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center', gap: S.xl }}>
        <View style={{ gap: S.sm }}>
          <T v="serifLarge" style={{ fontSize: 36, lineHeight: 40 }}>
            Find out where you’re wanted.
          </T>
          <T v="callout" color={C.text2}>
            Qloo predicts it. Fans prove it. Gus books it.
          </T>
        </View>
        <View style={{ gap: S.md }}>
          <Btn tone="scout" size="lg" full onPress={() => router.push('/scout')} accessibilityLabel="Scout: find where your crowd lives" icon={<Icon name="mic" variant="bold" size={20} color={C.text} />}>
            Scout my crowd
          </Btn>
          <Btn tone="glass" size="lg" full onPress={() => router.push('/a/maya-ortiz')}>
            Open the demo
          </Btn>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Open Maya Ortiz's demo tour" onPress={() => router.push('/a/maya-ortiz')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card, borderRadius: R.card, padding: S.lg, paddingLeft: S.sm }}>
            <Image source={IMAGES['maya-sticker']} style={{ width: 78, height: 75, marginVertical: -S.sm }} contentFit="contain" />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="eyebrow" color={C.cream}>
                The demo · composite persona
              </T>
              <T v="headline">Maya Ortiz</T>
              <T v="footnote">Indie folk-pop, 40k monthly listeners, ten dates and one van.</T>
            </View>
            <Icon name="chevron" size={18} color={C.text3} />
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.xs }}>
          <GusSticker mood="wave" size={96} />
          <View style={{ flex: 1, backgroundColor: C.cardHi, borderRadius: 22, borderBottomLeftRadius: 6, padding: S.lg, gap: S.sm }}>
            <T v="gus">“Your people aren't where your streams are. Let's go find them.”</T>
            <HearGus speaking={speaking} onPress={speak} />
          </View>
        </View>

        <View style={{ gap: S.sm }}>
          <T v="label">Or try a preset Sound</T>
          <Group>
            <ListRow title="Hip-hop" subtitle="Little Simz + JID" onPress={() => router.push({ pathname: '/scout', params: { preset: 'hiphop' } })} trailing={<Icon name="chevron" size={18} color={C.text3} />} />
            <ListRow title="Stand-up" subtitle="John Mulaney + Taylor Tomlinson" onPress={() => router.push({ pathname: '/scout', params: { preset: 'standup' } })} trailing={<Icon name="chevron" size={18} color={C.text3} />} />
          </Group>
        </View>

        <View style={{ gap: S.sm, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: S.xs }}>
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
          </View>
          <T v="caption" style={{ textAlign: 'center', maxWidth: 320 }}>
            Taste data from Qloo. Aggregate affinity, never individual facts. Gus roasts routes, not people.
          </T>
        </View>
      </View>
    </ScrollView>
  );
}
