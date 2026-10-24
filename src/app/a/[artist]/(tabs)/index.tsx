/**
 * The Map answers one question: where am I wanted, and what do I do about it? The country
 * lights up hex by hex; the drawer leads with your one next move, then the cities in plain
 * words. How the ranking works (and the Without Qloo comparison) sits one tap deeper for
 * anyone who wants to check the math. Gus's take rides in the accessory, not in the drawer.
 */
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSheet, GlassSheetContent, GlassSheetTitle } from '@/components/glassyui/glass-sheet';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { CITY_HERO, CitySheet, cityHeroHeight } from '@/ui/map/CitySheet';
import { nextMove, NextMoveHead, SectionLabel, TheFive } from '@/ui/map/MapBoard';
import { PosterTile } from '@/ui/map/PosterTile';
import { Btn, Card, Chip, Empty, Group, ListRow, Row, Section, WhyBars } from '@/ui/components/core';
import { Drawer } from '@/ui/components/Drawer';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { GusLine } from '@/ui/components/Gus';
import { gus } from '@/ui/gus/store';
import { ActsMenuNative, LayersMenuNative } from '@/ui/components/NativeMenus';
import { ActsMenu } from '@/ui/components/ActsSheet';
import { GusPerch } from '@/ui/gus/GusDock';
import { DemoTag, Prov } from '@/ui/components/Receipts';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { WithoutQlooPanel } from '@/ui/components/WithoutQloo';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { CrowdMapView } from '@/ui/map/CrowdMapView';
import { BASEMAPS, type Basemap } from '@/ui/map/types';
import { session } from '@/ui/session';
import { C, F, gradient, IMAGES, R, S } from '@/ui/theme';
import { Image } from 'expo-image';
import type { CityData, MapData, MapMetroRow, PlanResponse } from '@/ui/types';
import { Icon } from '@/ui/icons/Icon';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const reduced = useReducedMotion();
  const toast = useToast();
  const { slug, data: state, reload: reloadState } = useArtist();
  const { data: map, error: mapErr, reload: reloadMap } = useApi<MapData>(slug ? `/artist/${slug}/map` : null);
  const { data: planRes } = useApi<PlanResponse>(slug ? `/artist/${slug}/plan` : null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [focusRoom, setFocusRoom] = useState<string | null>(null);
  const [why, setWhy] = useState<MapMetroRow | null>(null);
  const [dark, setDark] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>('dark');
  const [layersOpen, setLayersOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [q, setQ] = useState('');
  const [actsOpen, setActsOpen] = useState(false);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);
  const city = useApi<CityData>(slug && cityId ? `/artist/${slug}/city/${cityId}` : null);
  const cityWait = useApi<CityData>(slug && cityId && city.data?.neighborhoodsPending ? `/artist/${slug}/city/${cityId}?wait=1` : null);
  const cityData = cityWait.data && !cityWait.data.neighborhoodsPending ? cityWait.data : city.data;
  const memo = slug ? session.scout(slug) : null;
  const constraints = slug ? session.constraints(slug) : null;

  // The Without Qloo switch also lives in Settings; pick up its state whenever the map is shown.
  useFocusEffect(useCallback(() => setDark(session.withoutQloo()), []));
  // Deep links from Posters and the Inbox: /a/{slug}?city=columbus-oh dives straight in.
  const params = useLocalSearchParams<{ city?: string }>();
  useEffect(() => {
    if (params.city) {
      setCityId(params.city);
      setDetent(1);
    }
  }, [params.city]);

  // New signatures: ripple the dots, thump, toast (PRD 2 scene 4).
  const lastTotal = useRef<number | null>(null);
  const lastHoods = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!state) return;
    const total = state.opened.reduce((s, o) => s + (o.proof?.signatures ?? 0), 0);
    const hoods: Record<string, number> = {};
    for (const o of state.opened) for (const n of o.proof?.neighborhoods ?? []) hoods[`${o.name}|${n.name}`] = n.count;
    if (lastTotal.current !== null && total > lastTotal.current) {
      const grew = Object.entries(hoods).find(([k, v]) => v > (lastHoods.current[k] ?? 0));
      const [cityName, hood] = grew ? grew[0].split('|') : ['', ''];
      haptic.thump();
      setPulse((p) => p + 1);
      toast({ title: `New signature${total - lastTotal.current > 1 ? `s (+${total - lastTotal.current})` : ''}`, body: hood ? `${hood}, ${cityName}` : undefined });
      reloadMap();
      if (cityId) city.reload();
    }
    lastTotal.current = total;
    lastHoods.current = hoods;
  }, [state]);

  const ranked = useMemo(() => (map ? [...map.metros].filter((m) => m.rank !== null).sort((a, b) => a.rank! - b.rank!) : []), [map]);
  const sleepers = useMemo(() => (map ? map.metros.filter((m) => m.sleeper).sort((a, b) => (a.liftRank ?? 999) - (b.liftRank ?? 999)) : []), [map]);
  const matches = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    // Names that start with the query first (Apple Maps style), then any other match, each by rank.
    const hit = ranked.filter((m) => `${m.name} ${m.state}`.toLowerCase().includes(k));
    return [...hit.filter((m) => m.name.toLowerCase().startsWith(k)), ...hit.filter((m) => !m.name.toLowerCase().startsWith(k))].slice(0, 25);
  }, [q, ranked]);
  const proofBy = useMemo(() => Object.fromEntries((map?.proof ?? []).map((p) => [p.city, p])), [map]);
  const gusLine = useMemo(() => {
    if (memo?.line) return { line: memo.line, model: memo.model };
    if (!ranked.length) return null;
    const s = sleepers[0];
    return { line: `Your crowd's thickest in ${ranked[0].name}.${s ? ` Everyone plays the big cities. Your sleeper is ${s.name}.` : ''}`, model: 'gus-lite' };
  }, [memo, ranked, sleepers]);

  // Gus's standing line for this screen lives in the accessory.
  useFocusEffect(
    useCallback(() => {
      gus.set({ screen: 'map' });
      if (dark) gus.say('This is every fan-demand app on day one. Empty.', 'unimpressed');
      else if (gusLine) gus.say(gusLine.line, 'proud');
    }, [gusLine, dark]),
  );

  const post = async () => {
    if (!cityId || !slug) return;
    setPosting(true);
    try {
      await api.post(`/artist/${slug}/posters`, { city: cityId });
      haptic.success();
      toast({ title: 'WANTED poster posted', body: `${cityData?.metro.name ?? ''}: share the link and let fans sign it.` });
      invalidate(`/artist/${slug}`);
      reloadState();
      router.push(`/a/${slug}/posters?city=${cityId}`);
    } catch (e) {
      toast({ title: 'Could not post the poster', body: e instanceof Error ? e.message : undefined });
    } finally {
      setPosting(false);
    }
  };

  const toggleDark = (on: boolean) => {
    haptic.thump();
    setDark(on);
    session.setWithoutQloo(on);
    if (on) setCityId(null);
  };

  const route = planRes?.plan?.stops.map((s) => ({ lat: s.lat, lon: s.lon, city: s.city })) ?? null;
  const focusCity = state?.opened[0]?.city ?? ranked[0]?.id ?? 'columbus-oh';
  const signatures = state?.opened.reduce((n, o) => n + (o.proof?.signatures ?? 0), 0) ?? 0;

  // Drawer detents: a peek that shows Gus, about half the screen, and nearly full height.
  // Clear the tab bar (the system one on iOS, the glass capsule elsewhere).
  const bottomInset = Platform.OS === 'ios' ? insets.bottom + 56 : TAB_BAR_SPACE + Math.max(insets.bottom - 6, 8);
  const headerH = insets.top + 64;
  const detents = useMemo(() => [cityId ? 300 : 262, Math.round((height - bottomInset) * 0.5), Math.max(300, height - bottomInset - headerH - 8)], [height, bottomInset, headerH, cityId]);
  const [detent, setDetent] = useState(0);
  const sheetH = detents[Math.min(detent, 1)];

  const dive = (id: string, room: string | null = null) => {
    haptic.tap();
    setFocusRoom(room);
    setCityId(id);
    setDetent((d) => Math.max(d, 1));
  };

  const gusHead = map || mapErr || dark || cityId ? null : <GusLine line={null} thinking="Reading the taste graph…" orb="searching" />;
  const [howOpen, setHowOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // The peek is one headline and one button; search and the full list sit further up the sheet.
  const move = map && !dark && !cityId ? nextMove(state, ranked, sleepers, dive, (c) => router.push(`/a/${slug}/posters?city=${c}`)) : null;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const head = move ? (dismissed === move.title ? null : <NextMoveHead move={move} compact={detent > 0} onDismiss={() => setDismissed(move.title)} />) : gusHead;

  const panel = dark ? (
    slug ? (
      <WithoutQlooPanel slug={slug} focusCity={focusCity} regions={constraints?.regions ?? ['midwest', 'east']} wide={false} />
    ) : null
  ) : cityId ? (
    cityData ? (
      <CitySheet
        d={cityData}
        full={detent === detents.length - 1}
        pending={!!city.data?.neighborhoodsPending && !cityWait.data}
        isDemo={!!state?.artist.isDemo}
        onClose={() => {
          setCityId(null);
          setFocusRoom(null);
          setDetent(0);
        }}
        onPost={post}
        onPoster={() => router.push(`/a/${slug}/posters?city=${cityId}`)}
        onPitch={() => setPitch({ city: cityData.metro.id, cityName: cityData.metro.name, roomId: focusRoom, date: null })}
        onAsk={() => {
          gus.say(`${cityData.metro.name}. What do you want to know?`, 'reading');
          gus.openCard();
        }}
        posting={posting}
        focusRoom={focusRoom}
      />
    ) : city.error ? (
      <Empty title="Couldn't load this city" line={city.error}>
        <Btn size="sm" onPress={() => setCityId(null)}>
          Back
        </Btn>
      </Empty>
    ) : (
      <GusLine line={null} thinking="Diving in. Street-level heat first, then Qloo's neighborhoods…" orb="searching" />
    )
  ) : map ? (
    <>
      {map.notices.map((n) => (
        <T key={n} v="footnote">
          {n}
        </T>
      ))}
      {!q.trim() ? <TheFive ranked={ranked} map={map} onDive={dive} /> : null}
      <View style={{ gap: S.sm }}>
        <SectionLabel>{q.trim() ? 'Search' : 'Everywhere else'}</SectionLabel>
        <SearchBar value={q} onChange={setQ} count={ranked.length} onFocus={() => setDetent(detents.length - 1)} />
        {q.trim() && !matches.length ? (
          <Empty title={`No “${q.trim()}” in ${ranked.length} cities`} line="Wanted scores US cities with enough taste data. Try the nearest big city." />
        ) : (
          <Group style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
            {(q.trim() ? matches : ranked.slice(5, showAll ? 60 : 15)).map((m) => (
              <CityRow
                key={m.id}
                m={m}
                top={m.id === ranked[0]?.id}
                opened={map.opened.includes(m.id)}
                signatures={proofBy[m.id]?.signatures ?? 0}
                onPress={() => {
                  setQ('');
                  dive(m.id);
                  setDetent(1);
                }}
              />
            ))}
            {!q.trim() && ranked.length > 15 ? (
              <ListRow
                onPress={() => setShowAll((v) => !v)}
                title={
                  <T v="body" color={C.purpleHi}>
                    {showAll ? 'Show fewer' : `Show all ${ranked.length}`}
                  </T>
                }
              />
            ) : null}
          </Group>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => (haptic.tick(), setHowOpen(true))}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'center', paddingVertical: S.sm })}
      >
        <Row gap={6}>
          <Icon name="info" size={15} color={C.text3} />
          <T v="footnote" color={C.text3}>
            How Wanted ranks cities
          </T>
        </Row>
      </Pressable>
    </>
  ) : mapErr ? (
    <Empty title="The map didn't load" line={mapErr}>
      <Btn size="sm" onPress={reloadMap}>
        Try again
      </Btn>
    </Empty>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${state.artist.name} · Crowd Map` : 'Crowd Map'} · Wanted</title>
      </Head>
      <View style={{ position: 'absolute', inset: 0 } as object}>
        {map ? (
          <CrowdMapView
            hexes={map.hexes}
            metros={map.metros.map((m) => ({ id: m.id, name: m.name, state: m.state, lat: m.lat, lon: m.lon, score: m.score, heat: m.heat, rank: m.rank, sleeper: m.sleeper }))}
            opened={map.opened}
            dots={dark ? [] : map.dots}
            city={
              cityId && cityData && !dark
                ? {
                    id: cityData.metro.id,
                    lat: cityData.metro.lat,
                    lon: cityData.metro.lon,
                    hexes: cityData.hexes,
                    neighborhoods: cityData.neighborhoods.map((n) => ({ name: n.name, rank: n.rank, lat: n.lat, lon: n.lon })),
                    rooms: cityData.rooms.map((r) => ({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, rank: r.rank })),
                    outline: cityData.outline,
                  }
                : null
            }
            route={cityId ? null : route}
            dark={dark}
            basemap={basemap}
            reduceMotion={reduced}
            pulse={pulse}
            padding={wide ? { top: headerH, left: (dark ? 760 : 420) + 24, bottom: 90, right: 20 } : { top: headerH + 8, left: 28, bottom: sheetH + bottomInset + 16, right: 28 }}
            onPick={async (p) => {
              if (p.kind === 'metro') dive(p.id);
              else if (p.kind === 'room') setFocusRoom(p.id);
            }}
            dom={{ style: { flex: 1 }, scrollEnabled: false, matchContents: false }}
          />
        ) : null}
      </View>

      {dark ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: headerH + 40, left: 0, right: wide ? -440 : 0, alignItems: 'center' } as object}>
          <T style={{ fontFamily: F.display, fontSize: wide ? 30 : 24, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>NO TASTE DATA.</T>
          <T v="serif" color={C.text2} style={{ textAlign: 'center', marginTop: S.xs }}>
            No signatures yet. Nobody to ask.
          </T>
        </View>
      ) : null}

      {/* Header: who you are (switch acts, Settings). Glass only on this chrome. */}
      <View
        style={{ position: 'absolute', top: insets.top + S.sm, left: S.gutter, right: S.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm }}
        pointerEvents="box-none"
      >
        {Platform.OS === 'ios' && slug ? (
          <ActsMenuNative slug={slug} name={state?.artist.name ?? ''} />
        ) : (
        <GlassSurface preset="prominent" style={{ borderRadius: 999, overflow: 'hidden', flexShrink: 1 }}>
          <Pressable
            onPress={() => {
              haptic.tap();
              setActsOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${state?.artist.name ?? 'Artist'}. Switch act`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 44 }}>
              <T v="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                {state?.artist.name ?? ' '}
              </T>
              <Icon name="chevronDown" size={14} color={C.text2} />
            </View>
          </Pressable>
        </GlassSurface>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          {!dark && map ? (
            Platform.OS === 'ios' ? (
              <GlassSurface preset="prominent" style={{ borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="layers" size={20} color={C.text} />
                </View>
                <LayersMenuNative value={basemap} options={BASEMAPS} onChange={(k) => (haptic.tick(), setBasemap(k))} />
              </GlassSurface>
            ) : (
            <GlassSurface preset="prominent" style={{ borderRadius: 999, overflow: 'hidden' }}>
              <Pressable onPress={() => (haptic.tap(), setLayersOpen((o) => !o))} accessibilityRole="button" accessibilityLabel="Map style" accessibilityState={{ expanded: layersOpen }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="layers" size={20} color={C.text} />
                </View>
              </Pressable>
            </GlassSurface>
            )
          ) : null}
          {dark ? (
            <GlassSurface preset="prominent" tint="#8E1B14" style={{ borderRadius: 999, overflow: 'hidden' }}>
              <Pressable onPress={() => toggleDark(false)} accessibilityRole="button" accessibilityLabel="Turn taste data back on" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 46 }}>
                  <Icon name="eye" size={18} color={C.text} />
                  <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 15, color: C.text }}>Back to Wanted</T>
                </View>
              </Pressable>
            </GlassSurface>
          ) : null}
          {slug ? (
            <GlassSurface preset="prominent" style={{ borderRadius: 999, overflow: 'hidden' }}>
              <Pressable onPress={() => (haptic.tap(), router.push(`/a/${slug}/settings`))} accessibilityRole="button" accessibilityLabel="Settings" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="settings" size={20} color={C.text} />
                </View>
              </Pressable>
            </GlassSurface>
          ) : null}
        </View>
      </View>

      {layersOpen && Platform.OS !== 'ios' ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLayersOpen(false)} accessibilityLabel="Close map styles" />
          <GlassSurface preset="prominent" style={{ position: 'absolute', top: insets.top + S.sm + 52, right: S.gutter, width: 200, borderRadius: 22, overflow: 'hidden', paddingVertical: 6 }}>
            {BASEMAPS.map((b) => (
              <Pressable
                key={b.key}
                onPress={() => {
                  haptic.tick();
                  setBasemap(b.key);
                  setLayersOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: basemap === b.key }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44, backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' })}
              >
                <T v="body">{b.label}</T>
                {basemap === b.key ? <Icon name="check" variant="bold" size={16} color={C.text} /> : null}
              </Pressable>
            ))}
          </GlassSurface>
        </>
      ) : null}

      {wide ? (
        <View
          style={{
            position: 'absolute',
            top: headerH + 8,
            left: S.md,
            bottom: insets.bottom + 92,
            width: dark ? 760 : 420,
            maxWidth: width - 24,
            backgroundColor: 'rgba(18,18,20,0.97)',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: C.line,
            overflow: 'hidden',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: S.gutter, gap: S.xl }}>
            {head}
            {panel}
          </ScrollView>
        </View>
      ) : (
        <Drawer detents={detents} index={detent} onIndexChange={setDetent} header={head} bottomInset={bottomInset} label={cityId ? 'City panel' : 'Crowd panel'}
          perch={<GusPerch size={84} line={!cityId && !dark && map ? gusLine?.line : null} />}
          hero={
            cityId && cityData && !dark ? (
              <PosterTile
                cityId={cityData.metro.id}
                name={cityData.metro.name}
                state={cityData.metro.state}
                hexes={cityData.hexes}
                signed={cityData.proof ? cityData.proof.signatures : null}
                proven={!!cityData.proof?.crossed}
                width={CITY_HERO.width}
                tilt={-5}
              />
            ) : null
          }
          heroLift={CITY_HERO.lift}
          heroHeight={cityHeroHeight}
        >
          {panel}
        </Drawer>
      )}

      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
      {slug && Platform.OS !== 'ios' ? <ActsMenu open={actsOpen} onClose={() => setActsOpen(false)} slug={slug} top={insets.top + S.sm + 52} /> : null}

      <GlassSheet open={howOpen} onOpenChange={(o) => !o && setHowOpen(false)}>
        <GlassSheetContent closeLabel="Close">
          <View style={{ gap: S.lg }}>
            <GlassSheetTitle>How Wanted ranks cities</GlassSheetTitle>
            <T v="callout" color={C.text2} style={{ lineHeight: 22 }}>
              We ask Qloo’s taste graph where people who love the acts you sound like actually live, block by block. Then we compare that with twenty other acts, so a city only ranks high if it likes
              you more than it likes everyone.
            </T>
            <View style={{ gap: S.sm }}>
              <HowRow icon="map" title="Where your crowd lives" body="Heat: how many of your kind of fans are in each city." />
              <HowRow icon="star" title="Sleeper cities" body="Places that over-index for you but that every other act skips. Cheaper rooms, hungrier crowds." color={C.gold} />
              <HowRow icon="signature" title="Proof" body="Fans sign your WANTED poster. When a city beats what we predicted, Gus tells you to book it." color={C.fans} />
            </View>
            {map ? (
              <Prov
                kind="qloo"
                receipts={map.receipts}
                title="Every Qloo call behind this map"
                values={{ 'cells (geohash-4)': map.sound.cellCount, 'baseline acts': 20, 'metros scored': ranked.length }}
              />
            ) : null}
            <Btn
              tone="glass"
              full
              icon={<Icon name="moon" size={18} color={C.text} />}
              onPress={() => {
                setHowOpen(false);
                setTimeout(() => toggleDark(true), 250);
              }}
            >
              See it without taste data
            </Btn>
          </View>
        </GlassSheetContent>
      </GlassSheet>

      <GlassSheet open={!!why} onOpenChange={(o) => !o && setWhy(null)}>
        <GlassSheetContent closeLabel="Close">
          {why ? (
            <View style={{ gap: 14 }}>
              <GlassSheetTitle>
                Why {why.name}, {why.state}?
              </GlassSheetTitle>
              <WhyBars heatPct={why.heatPct} liftPct={why.liftPct} />
              <T v="small">
                Heat rank #{why.heatRank} · Lift rank #{why.liftRank} · Wanted Score {why.score?.toFixed(0)}. Lift is this Sound’s heat minus what a typical act gets here (a 20-act baseline), so a
                sleeper is a city that loves you more than it loves everyone.
              </T>
              <GusLine
                line={
                  why.sleeper
                    ? `Everyone skips ${why.name}. Your crowd doesn't. That's a sleeper.`
                    : `${why.name} ranks #${why.rank} for you. ${why.liftPct && why.liftPct > 0.7 ? 'More yours than most.' : 'Mostly just a big city.'}`
                }
                model="gus-lite"
                compact
              />
              <Btn
                tone="scout"
                onPress={() => {
                  const id = why.id;
                  setWhy(null);
                  dive(id);
                }}
              >
                Dive into {why.name}
              </Btn>
            </View>
          ) : null}
        </GlassSheetContent>
      </GlassSheet>
    </View>
  );
}

function HowRow({ icon, title, body, color = C.text }: { icon: 'map' | 'star' | 'signature'; title: string; body: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} variant="bold" size={16} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headline">{title}</T>
        <T v="footnote">{body}</T>
      </View>
    </View>
  );
}

/** The one thing to do now, in a sentence. Proof beats a warm city beats a first poster. */


/** Plain words for why a city ranks, so nobody has to read a score. */
function reason(m: MapMetroRow, top: boolean) {
  if (top) return 'Your biggest crowd';
  if (m.sleeper) return 'Sleeper · likes you more than most acts';
  if ((m.liftPct ?? 0) > 0.7) return 'More yours than most cities';
  if ((m.heatPct ?? 0) > 0.8) return 'Big crowd, shared with everyone';
  return 'Steady crowd';
}

function CityRow({ m, top, opened, signatures, onPress }: { m: MapMetroRow; top: boolean; opened: boolean; signatures: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Number ${m.rank}, ${m.name}. ${reason(m, top)}${opened ? `. ${signatures} signatures` : ''}.`}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? C.fill2 : 'transparent' })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 58, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
        <T numberOfLines={1} style={{ fontFamily: F.displayBold, fontSize: 15, width: 30, color: m.sleeper ? C.gold : C.text3, fontVariant: ['tabular-nums'] }}>
          {m.rank}
        </T>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="body" numberOfLines={1}>
            {m.name}, {m.state}
          </T>
          <T v="footnote" numberOfLines={1} color={m.sleeper ? C.gold : C.text2}>
            {reason(m, top)}
          </T>
        </View>
        {opened ? (
          <T v="footnote" color={C.fans} style={{ fontWeight: '600' }}>
            {signatures} signed
          </T>
        ) : null}
        <Icon name="chevron" size={14} color={C.text3} />
      </View>
    </Pressable>
  );
}

function SearchBar({ value, onChange, count, onFocus }: { value: string; onChange: (v: string) => void; count: number; onFocus: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, borderCurve: 'continuous', backgroundColor: C.fill, paddingLeft: 14, paddingRight: 6 }}>
      <Icon name="search" size={18} color={C.text2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholder={count ? `Search ${count} cities` : 'Search cities'}
        placeholderTextColor={C.text3}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        accessibilityLabel="Search cities"
        style={{ flex: 1, height: 44, color: C.text, fontFamily: F.body, fontSize: 17 }}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}>
          <Icon name="close" variant="bold" size={18} color={C.text3} />
        </Pressable>
      ) : null}
    </View>
  );
}

