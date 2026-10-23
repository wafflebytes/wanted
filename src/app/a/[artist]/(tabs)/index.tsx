/**
 * The Crowd Map (PRD 2 scenes 1, 2 and 6; FR-4 to FR-7, FR-21, FR-30). The country lights up
 * hex by hex; tap a city and the camera dives in. Fan signatures land as dots with a thump.
 * The Without Qloo toggle puts a generic LLM's answer beside Wanted's and turns the map dark.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSheet, GlassSheetContent, GlassSheetTitle } from '@/components/glassyui/glass-sheet';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { CityPanel } from '@/ui/components/CityPanel';
import { Btn, Card, Chip, Empty, Group, ListRow, Row, Section, WhyBars } from '@/ui/components/core';
import { Drawer } from '@/ui/components/Drawer';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { GusLine } from '@/ui/components/Gus';
import { DemoTag, Prov } from '@/ui/components/Receipts';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { WithoutQlooPanel } from '@/ui/components/WithoutQloo';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { CrowdMapView } from '@/ui/map/CrowdMapView';
import { session } from '@/ui/session';
import { C, F, IMAGES, R, S } from '@/ui/theme';
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
  const [posting, setPosting] = useState(false);
  const [pulse, setPulse] = useState(0);
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
  const proofBy = useMemo(() => Object.fromEntries((map?.proof ?? []).map((p) => [p.city, p])), [map]);
  const gusLine = useMemo(() => {
    if (memo?.line) return { line: memo.line, model: memo.model };
    if (!ranked.length) return null;
    const s = sleepers[0];
    return { line: `Your crowd's thickest in ${ranked[0].name}.${s ? ` Everyone plays the big cities. Your sleeper is ${s.name}.` : ''}`, model: 'gus-lite' };
  }, [memo, ranked, sleepers]);

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
  const bottomInset = TAB_BAR_SPACE + Math.max(insets.bottom - 6, 8);
  const headerH = insets.top + 64;
  const detents = useMemo(() => [158, Math.round((height - bottomInset) * 0.5), Math.max(300, height - bottomInset - headerH - 8)], [height, bottomInset, headerH]);
  const [detent, setDetent] = useState(0);
  const sheetH = detents[Math.min(detent, 1)];

  const dive = (id: string, room: string | null = null) => {
    haptic.tap();
    setFocusRoom(room);
    setCityId(id);
    setDetent((d) => Math.max(d, 1));
  };

  const head = dark ? (
    <GusLine line="This is every fan-demand app on day one. Empty." mood="unimpressed" model="gus-lite" />
  ) : cityId ? null : map ? (
    gusLine ? <GusLine line={gusLine.line} model={gusLine.model} mood="proud" /> : null
  ) : mapErr ? null : (
    <GusLine line={null} thinking="Gus is reading the taste graph…" orb="searching" />
  );

  const panel = dark ? (
    slug ? <WithoutQlooPanel slug={slug} focusCity={focusCity} regions={constraints?.regions ?? ['midwest', 'east']} wide={false} /> : null
  ) : cityId ? (
    cityData ? (
      <CityPanel
        d={cityData}
        pending={!!city.data?.neighborhoodsPending && !cityWait.data}
        isDemo={!!state?.artist.isDemo}
        onBack={() => {
          setCityId(null);
          setFocusRoom(null);
        }}
        onPost={post}
        onPoster={() => router.push(`/a/${slug}/posters?city=${cityId}`)}
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
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', paddingVertical: S.md }}>
        <StatCell value={ranked.length} label="Cities scored" />
        <StatCell value={sleepers.length} label="Sleepers" color={C.gold} />
        <StatCell value={signatures} label="Signatures" color={C.fans} />
      </View>
      {map.notices.map((n) => (
        <Card key={n} style={{ padding: S.md }}>
          <T v="footnote">{n}</T>
        </Card>
      ))}
      {state?.opened.length ? (
        <Section title="Posters up" tint={C.fans} trailing={state.artist.isDemo ? <DemoTag /> : undefined}>
          <Group>
            {state.opened.map((o) => (
              <ListRow
                key={o.city}
                onPress={() => dive(o.city)}
                accessibilityLabel={`${o.name}: ${o.proof?.signatures ?? 0} signatures. Dive in.`}
                leading={
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(180,92,240,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="signature" variant="bold" size={17} color={C.fans} />
                  </View>
                }
                title={o.name}
                subtitle={`${o.proof?.signatures ?? 0} signatures${o.proof?.ratio !== null && o.proof?.ratio !== undefined ? ` · ${o.proof.ratio.toFixed(1)}× predicted` : ''}`}
                trailing={
                  <Row gap={S.sm}>
                    {o.proof?.crossed ? <Chip color={C.good} bg="rgba(52,199,89,0.14)">Proven</Chip> : null}
                    <Icon name="chevron" size={16} color={C.text3} />
                  </Row>
                }
              />
            ))}
          </Group>
        </Section>
      ) : null}
      {sleepers.length ? (
        <Section title="Sleeper cities" tint={C.gold}>
          <T v="footnote">Top 15 for lift, outside the top 15 for raw heat: they like you more than they like everyone.</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter }}>
            {sleepers.map((m) => (
              <Chip key={m.id} color={C.gold} bg="rgba(245,197,66,0.13)" icon={<Icon name="star" variant="bold" size={14} color={C.gold} />} onPress={() => setWhy(m)} accessibilityLabel={`Sleeper city ${m.name}. See why.`}>
                {m.name}, {m.state}
              </Chip>
            ))}
          </ScrollView>
        </Section>
      ) : null}
      <Section title="Most wanted cities" trailing={<Prov kind="qloo" receipts={map.receipts} title="Where this taste lives" values={{ 'cells (geohash-4)': map.sound.cellCount, 'baseline acts': 20, 'metros scored': ranked.length }} />}>
        <Group>
          {ranked.slice(0, 20).map((m) => (
            <CityRow key={m.id} m={m} opened={map.opened.includes(m.id)} signatures={proofBy[m.id]?.signatures ?? 0} onPress={() => dive(m.id)} onWhy={() => setWhy(m)} />
          ))}
        </Group>
        <T v="caption">
          Color is the Wanted Score (0.6 × heat percentile + 0.4 × lift percentile); height is heat. Gold stars are sleepers; white dots are fan signatures, grouped by neighborhood. {ranked.length} metros scored against a 20-act baseline.
        </T>
      </Section>
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

      {/* Header: who (opens Settings) and the Without Qloo toggle. Glass only on this chrome. */}
      <View style={{ position: 'absolute', top: insets.top + S.sm, left: S.gutter, right: S.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm }} pointerEvents="box-none">
        <GlassSurface preset="prominent" style={{ borderRadius: 999, overflow: 'hidden', flexShrink: 1 }}>
          <Pressable onPress={() => router.push(`/a/${slug}/settings`)} accessibilityRole="button" accessibilityLabel={`${state?.artist.name ?? 'Artist'}. Settings`} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingLeft: 6, paddingRight: 14, height: 46 }}>
              <Avatar name={state?.artist.name ?? ''} demo={!!state?.artist.isDemo} />
              <T v="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                {state?.artist.name ?? ' '}
              </T>
              <Icon name="chevronDown" size={14} color={C.text2} />
            </View>
          </Pressable>
        </GlassSurface>
        <GlassSurface preset="prominent" tint={dark ? '#8E1B14' : undefined} style={{ borderRadius: 999, overflow: 'hidden' }}>
          <Pressable
            onPress={() => toggleDark(!dark)}
            accessibilityRole="button"
            accessibilityState={{ selected: dark }}
            accessibilityLabel="Without Qloo"
            accessibilityHint="Compares Wanted with a generic LLM and turns the taste data off"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 46 }}>
              <Icon name={dark ? 'moon' : 'eye'} variant={dark ? 'bold' : 'linear'} size={18} color={C.text} />
              <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 15, color: C.text }}>Without Qloo</T>
            </View>
          </Pressable>
        </GlassSurface>
      </View>

      {wide ? (
        <View style={{ position: 'absolute', top: headerH + 8, left: S.md, bottom: insets.bottom + 92, width: dark ? 760 : 420, maxWidth: width - 24, backgroundColor: 'rgba(18,18,20,0.97)', borderRadius: 28, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: S.gutter, gap: S.xl }}>
            {head}
            {panel}
          </ScrollView>
        </View>
      ) : (
        <Drawer detents={detents} index={detent} onIndexChange={setDetent} header={head} bottomInset={bottomInset} label={cityId ? 'City panel' : 'Crowd panel'}>
          {panel}
        </Drawer>
      )}

      <GlassSheet open={!!why} onOpenChange={(o) => !o && setWhy(null)}>
        <GlassSheetContent closeLabel="Close">
          {why ? (
            <View style={{ gap: 14 }}>
              <GlassSheetTitle>
                Why {why.name}, {why.state}?
              </GlassSheetTitle>
              <WhyBars heatPct={why.heatPct} liftPct={why.liftPct} />
              <T v="small">
                Heat rank #{why.heatRank} · Lift rank #{why.liftRank} · Wanted Score {why.score?.toFixed(0)}. Lift is this Sound’s heat minus what a typical act gets here (a 20-act baseline), so a sleeper is a city that loves you more than it loves everyone.
              </T>
              <GusLine
                line={why.sleeper ? `Everyone skips ${why.name}. Your crowd doesn't. That's a sleeper.` : `${why.name} ranks #${why.rank} for you. ${why.liftPct && why.liftPct > 0.7 ? 'More yours than most.' : 'Mostly just a big city.'}`}
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

function StatCell({ value, label, color = C.text }: { value: number; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${value} ${label}`}>
      <T style={{ fontFamily: F.monoBold, fontSize: 22, lineHeight: 26, color }}>{value}</T>
      <T v="caption" color={C.text2}>
        {label}
      </T>
    </View>
  );
}

function Avatar({ name, demo }: { name: string; demo: boolean }) {
  return demo ? (
    <Image source={IMAGES['maya-sticker']} style={{ width: 34, height: 34 }} contentFit="contain" accessibilityIgnoresInvertColors />
  ) : (
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{name.slice(0, 1).toUpperCase()}</T>
    </View>
  );
}

function CityRow({ m, opened, signatures, onPress, onWhy }: { m: MapMetroRow; opened: boolean; signatures: number; onPress: () => void; onWhy: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${m.name}, rank ${m.rank}, Wanted Score ${m.score?.toFixed(0)}${m.sleeper ? ', sleeper city' : ''}${opened ? `, ${signatures} signatures` : ''}. Dive in.`}
        onPress={onPress}
        style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? C.fill2 : 'transparent' })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56, paddingLeft: S.lg, paddingVertical: S.sm }}>
          <T style={{ fontFamily: F.monoBold, fontSize: 15, width: 24, color: C.text3 }}>{m.rank}</T>
          <View style={{ flex: 1, gap: 6 }}>
            <Row gap={6}>
              <T v="body" numberOfLines={1} style={{ flexShrink: 1 }}>
                {m.name}, {m.state}
              </T>
              {m.sleeper ? <Icon name="star" variant="bold" size={14} color={C.gold} label="Sleeper city" /> : null}
              {opened ? <Icon name="signature" variant="bold" size={14} color={C.fans} label={`${signatures} signatures`} /> : null}
            </Row>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: C.fill2 }}>
              <View style={{ height: '100%', width: `${m.score ?? 0}%`, borderRadius: 2, backgroundColor: m.sleeper ? C.gold : C.heatHi }} />
            </View>
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onWhy} accessibilityRole="button" accessibilityLabel={`Why ${m.name}? Wanted Score ${m.score?.toFixed(0)}`} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minWidth: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center' })}>
        <T style={{ fontFamily: F.monoBold, fontSize: 17, color: C.amber }}>{m.score?.toFixed(0)}</T>
        <T v="caption" style={{ fontSize: 11, lineHeight: 13 }}>
          why
        </T>
      </Pressable>
    </View>
  );
}
