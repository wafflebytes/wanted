/**
 * Posters (PRD 8.5; FR-18 to FR-23b): the board of every city with a WANTED poster up.
 *
 *   1. The board: your heat as halftone, a trail through the poster cities, one pin that rides
 *      the trail as you swipe.
 *   2. A pager: the city's name centred with its neighbours peeking at the edges, and below it
 *      the poster itself, tilting in like a stamp. Tap the poster and it lifts off the wall.
 *   3. Where the city stands, as one banner, one button and a row of actions.
 *   4. Where they signed, and the newest signatures as stamps.
 *
 * Signatures scrawl in as fans sign; the paper gets more battered past 50, 100 and 250;
 * marking the show played slams the CAUGHT LIVE stamp across the poster and every fan's card.
 */
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { Deal } from '@/lib/types';
import { api, absoluteUrl } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { Btn, Empty, Section } from '@/ui/components/core';
import { BountyCard } from '@/ui/components/BountyCard';
import { ActionTiles, RankList, SignatureStamp, StatusBanner, type BannerTone } from '@/ui/components/Paper';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { Poster, POSTER_RATIO, type PosterView } from '@/ui/components/Poster';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { deals } from '@/ui/deals/store';
import { Roll } from '@/ui/fx/Roll';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { BoardMap } from '@/ui/map/BoardMap';
import { EASE } from '@/ui/motion';
import { shareLink } from '@/ui/share';
import { C, F, R, S } from '@/ui/theme';
import type { MapData, OpenedCity, PosterState } from '@/ui/types';

const PROOF = 50;

const fmtAgo = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
const nightOf = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

const toView = (p: PosterState): PosterView => ({
  artistName: p.artist.name,
  cityName: p.city.name,
  state: p.city.state,
  count: p.count,
  wear: p.wear,
  topNeighborhoods: p.topNeighborhoods,
  signatures: p.signatures,
  played: !!p.played,
  portrait: p.artist.portrait,
  imageUrl: p.artist.imageUrl,
  isDemo: p.artist.isDemo,
  cityId: p.city.id,
  hexes: p.hexes,
});

/** Where a city stands, as Flighty would put it on a flight: a coloured word and one sentence. */
function standing(o: OpenedCity, live: Deal | null): { tone: BannerTone; title: string; body: string } {
  const signed = o.proof?.signatures ?? 0;
  if (o.playedAt) return { tone: 'live', title: 'Caught live', body: `You played ${o.name}${o.playedVenue ? ` at ${o.playedVenue}` : ''}. Every fan’s card has the stamp.` };
  if (live?.status === 'held' && live.terms) return { tone: 'good', title: `Held at ${live.roomName}`, body: `${nightOf(live.terms.date)}. You keep ${live.terms.split}% of the door.` };
  if (live?.status === 'waiting' && live.terms) return { tone: 'good', title: `${live.roomName} said yes`, body: `They offered ${nightOf(live.terms.date)}. It’s waiting on your OK.` };
  if (live?.status === 'talking') return { tone: 'fans', title: `Gus is talking to ${live.roomName}`, body: 'He’ll bring you the best offer.' };
  if (o.proof?.crossed) return { tone: 'good', title: `${o.name} proved it`, body: `${signed} people signed. That’s enough for a booker to take you seriously.` };
  return { tone: 'fans', title: `${PROOF - signed} more to prove it`, body: `${signed} signed so far. At ${PROOF}, Gus starts pitching rooms here.` };
}

export default function Posters() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const toast = useToast();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ city?: string }>();
  const { slug, data: state, reload: reloadState } = useArtist(5000);
  const opened = state?.opened ?? [];
  const { data: map } = useApi<MapData>(slug ? `/artist/${slug}/map` : null);
  const { data: dealList } = useApi<{ deals: Deal[] }>(slug ? `/artist/${slug}/deals` : null, { poll: 6000 });

  const W = Math.min(winW, 720);
  const [idx, setIdx] = useState(0);
  const at = useSharedValue(0);
  const pager = useRef<Animated.ScrollView>(null);
  const o = opened[Math.min(idx, opened.length - 1)] ?? null;
  const city = o?.city ?? null;

  // A deep link (from Fan Mail or the map) lands on its city.
  useEffect(() => {
    if (!params.city || !opened.length) return;
    const i = opened.findIndex((x) => x.city === params.city);
    if (i < 0) return;
    setIdx(i);
    at.value = i;
    requestAnimationFrame(() => pager.current?.scrollTo({ x: i * W, animated: false }));
  }, [params.city, opened.length, W]);

  const { data: poster, reload } = useApi<PosterState>(slug && city ? `/w/${slug}/${city}` : null, { poll: 4000 });
  const live = dealList?.deals.find((d) => d.city === city && (d.status === 'held' || d.status === 'waiting' || d.status === 'talking')) ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [stampKey, setStampKey] = useState<number | undefined>(undefined);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);
  const [lifted, setLifted] = useState(false);

  // The newest signature scrawls in when the count goes up while you watch.
  const lastCount = useRef<{ city: string | null; n: number } | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    if (!poster) return;
    const prev = lastCount.current;
    if (prev && prev.city === city && poster.count > prev.n) {
      setFresh(poster.count);
      haptic.thump();
    }
    lastCount.current = { city, n: poster.count };
  }, [poster, city]);

  const onSettle = (i: number) => {
    if (i === idx) return;
    haptic.tick();
    setIdx(i);
  };
  const scroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      at.value = e.contentOffset.x / W;
    },
    onMomentumEnd: (e) => {
      runOnJS(onSettle)(Math.round(e.contentOffset.x / W));
    },
  });
  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * W, animated: !reduced });
    if (reduced) {
      at.value = i;
      onSettle(i);
    }
  };

  const link = slug && city ? absoluteUrl(`/w/${slug}/${city}`) : '';
  const total = opened.reduce((n, x) => n + (x.proof?.signatures ?? 0), 0);

  const share = async () => {
    if (!o) return;
    const r = await shareLink(link, `WANTED in ${o.name}`, `${state?.artist.name} is WANTED in ${o.name}. Sign the poster:`);
    if (r === 'copied') toast({ title: 'Link copied', body: link });
  };
  // The 1080x1920 share image: open it so it can be saved or posted as a story.
  const saveImage = () => {
    if (!slug || !city) return;
    Linking.openURL(absoluteUrl(`/api/og/poster/${slug}/${city}.png?format=story`));
  };
  const markPlayed = async () => {
    if (!slug || !city) return;
    setBusy('played');
    try {
      await api.post(`/artist/${slug}/posters`, { city, action: 'played', venue: null });
      haptic.thump();
      setStampKey(Date.now());
      invalidate(`/artist/${slug}`);
      reload();
      reloadState();
    } catch (e) {
      toast({ title: "Couldn't mark it played", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };
  const draw = async () => {
    if (!slug || !city) return;
    setBusy('draw');
    try {
      await api.post(`/artist/${slug}/posters`, { city, action: 'draw' });
      haptic.success();
      invalidate(`/artist/${slug}/inbox`);
      reload();
    } catch (e) {
      toast({ title: "Couldn't pick the winner", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const pins = useMemo(() => {
    if (!map) return [];
    return opened
      .map((x) => {
        const m = map.metros.find((mm) => mm.id === x.city);
        return m ? { lat: m.lat, lon: m.lon, name: x.name, played: !!x.playedAt, proven: !!x.proof?.crossed } : null;
      })
      .filter((p): p is NonNullable<typeof p> => !!p);
  }, [map, opened]);

  const recent = useMemo(() => [...(poster?.signatures ?? [])].sort((a, b) => b.number - a.number).slice(0, 8), [poster]);
  const crossed = !!o?.proof?.crossed;
  const hoods = o?.proof?.neighborhoods ?? [];
  const posterW = Math.min(W * 0.7, 320);
  const st = o ? standing(o, live) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${state.artist.name} · Posters` : 'Posters'} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + TAB_BAR_SPACE + S.xxl, gap: S.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: S.gutter }}>
          <ScreenHeader title="Posters" subtitle={opened.length ? `${opened.length} ${opened.length === 1 ? 'city' : 'cities'} · ${total} signatures` : undefined} slug={slug} gus={false} />
        </View>

        {!state ? null : !opened.length ? (
          <View style={{ paddingHorizontal: S.gutter }}>
            <Empty title="No posters up yet" line="Pick a city on the map and put up a WANTED poster. Fans sign it in one tap.">
              <Btn tone="scout" onPress={() => router.push(`/a/${slug}`)} icon={<Icon name="map" variant="bold" size={18} color={C.text} />}>
                Open the map
              </Btn>
            </Empty>
          </View>
        ) : (
          <>
            {/* The board, the lead card. */}
            <View style={{ marginHorizontal: S.gutter, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: C.card, height: 196 }}>
              {map && pins.length === opened.length ? (
                <BoardMap hexes={map.hexes} pins={pins} names={opened.map((x) => x.name)} width={W - S.gutter * 2} height={196} at={at} />
              ) : null}
            </View>

            <View style={{ gap: S.md }}>
              <TitleTrack names={opened.map((x) => x.name)} at={at} W={W} onPick={goTo} />
              {o ? (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: S.md, marginTop: -S.xs }}>
                  <Meta icon="signature" text={`${o.proof?.signatures ?? 0} signed`} />
                  <Meta icon={o.playedAt ? 'verify' : crossed ? 'check' : 'flag'} text={o.playedAt ? 'Caught live' : crossed ? 'Proved it' : `${Math.max(0, PROOF - (o.proof?.signatures ?? 0))} to go`} color={o.playedAt ? '#FF6B61' : crossed ? C.good : C.text3} />
                </View>
              ) : null}

              {/* The pager: one poster per page, tilting in like a stamp being dealt. */}
              <Animated.ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scroll}
                scrollEventThrottle={16}
                style={{ width: W }}
                contentContainerStyle={{ paddingVertical: S.lg }}
              >
                {opened.map((x, i) => (
                  <PosterPage
                    key={x.city}
                    i={i}
                    at={at}
                    W={W}
                    posterW={posterW}
                    slug={slug}
                    city={x.city}
                    live={i === idx ? poster : null}
                    fresh={i === idx ? fresh : null}
                    stampKey={i === idx ? stampKey : undefined}
                    onLift={() => {
                      haptic.tap();
                      setLifted(true);
                    }}
                  />
                ))}
              </Animated.ScrollView>
            </View>

            {o && st ? (
              <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
                <View style={{ gap: S.md }}>
                  <StatusBanner tone={st.tone} title={st.title} body={st.body} onPress={live ? () => deals.show(live) : undefined} />
                  {!o.playedAt && !live ? (
                    crossed ? (
                      <Btn tone="scout" size="lg" full onPress={() => setPitch({ city: o.city, cityName: o.name, roomId: null, date: null })} icon={<Icon name="send" variant="bold" size={20} color={C.text} />}>
                        Pitch a room
                      </Btn>
                    ) : (
                      <Btn tone="scout" size="lg" full onPress={share} icon={<Icon name="share" variant="bold" size={20} color={C.text} />}>
                        Share the poster
                      </Btn>
                    )
                  ) : null}
                  <ActionTiles
                    items={[
                      { icon: 'share', label: 'Share', onPress: share },
                      { icon: 'posters', label: 'Story', onPress: saveImage },
                      { icon: 'eye', label: 'Fan view', onPress: () => router.push(`/w/${slug}/${city}`) },
                      o.playedAt
                        ? { icon: 'verify', label: 'Caught live', tint: '#FF6B61', onPress: () => setLifted(true) }
                        : { icon: 'verify', label: busy === 'played' ? 'Stamping…' : 'Played it', busy: busy === 'played', onPress: markPlayed },
                    ]}
                  />
                </View>

                {poster?.bounty && (!poster.played || poster.bounty.drawn) ? <BountyCard bounty={poster.bounty} artistFirst={poster.artist.name.split(' ')[0]} side="artist" onDraw={draw} drawing={busy === 'draw'} /> : null}

                {hoods.length ? (
                  <Section title="Where they signed">
                    <RankList
                      rows={hoods.slice(0, 5).map((h) => ({
                        key: h.name,
                        name: h.name,
                        value: `${h.count} signed`,
                        mark: poster?.topNeighborhoods.includes(h.name) ? <Icon name="check" variant="bold" size={15} color={C.amber} label="Gus called this one" /> : undefined,
                      }))}
                    />
                    {hoods.slice(0, 5).some((h) => poster?.topNeighborhoods.includes(h.name)) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.xs }}>
                        <Icon name="check" variant="bold" size={12} color={C.amber} />
                        <T v="caption">Called before anyone signed, from your fans’ taste.</T>
                      </View>
                    ) : null}
                  </Section>
                ) : null}
              </View>
            ) : null}

            {recent.length ? (
              <Section title="Latest signatures" style={{ paddingHorizontal: S.gutter }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.gutter, paddingVertical: S.md }}>
                  {recent.map((sig, i) => (
                    <SignatureStamp key={sig.number} tilt={i % 2 ? 2 : -2} s={{ initials: sig.initials, number: sig.number, font: sig.font, neighborhood: sig.neighborhood, when: `${fmtAgo(sig.createdAt)}${sig.isDemo ? ' · demo' : ''}` }} />
                  ))}
                </ScrollView>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
      {poster && o ? <Lift open={lifted} onClose={() => setLifted(false)} d={toView(poster)} name={o.name} line={st?.title ?? ''} onShare={share} onStory={saveImage} /> : null}
    </View>
  );
}

function Meta({ icon, text, color = C.text2 }: { icon: Parameters<typeof Icon>[0]['name']; text: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Icon name={icon} size={14} color={color} />
      <Roll text={text} style={{ fontFamily: F.body, fontSize: 13, color }} />
    </View>
  );
}

/**
 * City names on a track that slides at a slower rate than the posters, so the current name sits
 * centred and its neighbours peek in faded at the edges. Tap a neighbour to go there.
 */
function TitleTrack({ names, at, W, onPick }: { names: string[]; at: SharedValue<number>; W: number; onPick: (i: number) => void }) {
  const TW = W * 0.58;
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: (W - TW) / 2 - at.value * TW }] }));
  return (
    <View style={{ width: W, height: 40, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row' }, track]}>
        {names.map((n, i) => (
          <TrackName key={`${n}-${i}`} name={n} i={i} at={at} TW={TW} onPress={() => onPick(i)} />
        ))}
      </Animated.View>
    </View>
  );
}

function TrackName({ name, i, at, TW, onPress }: { name: string; i: number; at: SharedValue<number>; TW: number; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(at.value - i);
    return { opacity: interpolate(d, [0, 1, 2], [1, 0.22, 0], 'clamp'), transform: [{ scale: interpolate(d, [0, 1], [1, 0.86], 'clamp') }] };
  });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} style={{ width: TW, alignItems: 'center', justifyContent: 'center', height: 40 }}>
      <Animated.View style={style}>
        <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 36, letterSpacing: -0.6, color: C.text }}>
          {name}
        </T>
      </Animated.View>
    </Pressable>
  );
}

/**
 * One page of the pager. Each poster loads its own city once; the current one gets the
 * screen's live, polled copy. Away from centre it drops, shrinks and tilts the way it's moving.
 */
function PosterPage({ i, at, W, posterW, slug, city, live, fresh, stampKey, onLift }: { i: number; at: SharedValue<number>; W: number; posterW: number; slug: string | null; city: string; live: PosterState | null; fresh: number | null; stampKey?: number; onLift: () => void }) {
  const { data } = useApi<PosterState>(slug && !live ? `/w/${slug}/${city}` : null);
  const p = live ?? data;
  const style = useAnimatedStyle(() => {
    const d = at.value - i;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.9], [1, 0.35], 'clamp'),
      transform: [
        { translateY: interpolate(Math.abs(d), [0, 1], [0, 46], 'clamp') },
        { rotate: `${interpolate(d, [-1, 0, 1], [9, -2.5, -11], 'clamp')}deg` },
        { scale: interpolate(Math.abs(d), [0, 1], [1, 0.84], 'clamp') },
      ],
    };
  });
  return (
    <View style={{ width: W, alignItems: 'center' }}>
      <Animated.View style={style}>
        <Pressable onPress={onLift} accessibilityRole="button" accessibilityHint="Lifts the poster off the wall" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <View style={{ shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } }}>
            {p ? <Poster width={posterW} fresh={fresh} stampKey={stampKey} d={toView(p)} /> : <View style={{ width: posterW, height: posterW * POSTER_RATIO, borderRadius: 8, backgroundColor: C.card }} />}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * The poster lifted off the wall: everything else blurs back, the poster rises, straightens and
 * grows, with its caption and the two ways to send it. Tap anywhere else to put it back.
 */
function Lift({ open, onClose, d, name, line, onShare, onStory }: { open: boolean; onClose: () => void; d: PosterView; name: string; line: string; onShare: () => void; onStory: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(open ? 1 : 0, { duration: open ? 340 : 200, easing: EASE });
  }, [open]);
  const w = Math.min(width - S.gutter * 2, (height - insets.top - insets.bottom - 220) / POSTER_RATIO, 460);
  const card = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.3, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(v.value, [0, 1], [120, 0]) }, { rotate: `${interpolate(v.value, [0, 1], [-9, -1.5])}deg` }, { scale: interpolate(v.value, [0, 1], [0.8, 1]) }],
  }));
  const back = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[{ flex: 1 }, back]}>
        <BlurView intensity={40} tint="dark" style={{ position: 'absolute', inset: 0 } as object} />
        <Pressable accessibilityRole="button" accessibilityLabel="Put the poster back" onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' } as object} />
        <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom, gap: S.xl }}>
          <Animated.View style={[{ shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } }, card]}>
            <Poster width={w} d={d} />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <T style={{ fontFamily: F.displayBold, fontSize: 24, color: C.text, letterSpacing: -0.4 }}>{name}</T>
            <T v="footnote">{line}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Btn onPress={onShare} icon={<Icon name="share" size={18} color={C.text} />}>
              Share
            </Btn>
            <Btn onPress={onStory} icon={<Icon name="posters" size={18} color={C.text} />}>
              Story image
            </Btn>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
