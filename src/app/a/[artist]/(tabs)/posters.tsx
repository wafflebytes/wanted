/**
 * Posters (PRD 8.5; FR-18 to FR-23b): every opened city's WANTED poster, live. Signatures
 * scrawl in as fans sign; the paper gets more battered past 50, 100 and 250; marking the show
 * played slams the CAUGHT LIVE stamp across the poster and every fan's card.
 */
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, absoluteUrl } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { Btn, Chip, Empty, Group, ListRow, Row, Section } from '@/ui/components/core';
import { BountyCard } from '@/ui/components/BountyCard';
import { deals } from '@/ui/deals/store';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { Poster, POSTER_RATIO } from '@/ui/components/Poster';
import { Prov } from '@/ui/components/Receipts';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { shareLink } from '@/ui/share';
import { C, F, R, S } from '@/ui/theme';
import type { Deal } from '@/lib/types';
import type { PosterState } from '@/ui/types';

const fmtAgo = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

const nightOf = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const dealLine = (d: Deal) =>
  d.status === 'held' && d.terms
    ? `${nightOf(d.terms.date)}. You keep ${d.terms.split}% of the door.`
    : d.status === 'waiting' && d.terms
      ? `${d.roomName} offered ${nightOf(d.terms.date)}. Waiting on your yes.`
      : `Gus is asking ${d.roomName} for a date.`;

export default function Posters() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const params = useLocalSearchParams<{ city?: string }>();
  const { slug, data: state, reload: reloadState } = useArtist(5000);
  const opened = state?.opened ?? [];
  const [city, setCity] = useState<string | null>(params.city ?? null);
  useEffect(() => {
    if (params.city) setCity(params.city);
  }, [params.city]);
  useEffect(() => {
    if (!city && opened.length) setCity(opened[0].city);
  }, [city, opened]);

  const { data: poster, reload } = useApi<PosterState>(slug && city ? `/w/${slug}/${city}` : null, { poll: 4000 });
  const o = opened.find((x) => x.city === city) ?? null;
  // Once Gus is working on a room here, the card shows that deal instead of offering a new pitch.
  const { data: dealList } = useApi<{ deals: Deal[] }>(slug ? `/artist/${slug}/deals` : null, { poll: 6000 });
  const live = dealList?.deals.find((d) => d.city === city && (d.status === 'held' || d.status === 'waiting' || d.status === 'talking')) ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [stampKey, setStampKey] = useState<number | undefined>(undefined);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);

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

  const posterW = Math.min(width - S.gutter * 2, 420);
  const link = slug && city ? absoluteUrl(`/w/${slug}/${city}`) : '';
  const total = opened.reduce((n, x) => n + (x.proof?.signatures ?? 0), 0);

  const share = async () => {
    if (!o) return;
    const r = await shareLink(link, `WANTED in ${o.name}`, `${state?.artist.name} is WANTED in ${o.name}. Sign the poster:`);
    if (r === 'copied') toast({ title: 'Link copied', body: link });
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

  const recent = useMemo(() => [...(poster?.signatures ?? [])].sort((a, b) => b.number - a.number).slice(0, 8), [poster]);
  const hoods = o?.proof?.neighborhoods ?? [];
  const maxHood = Math.max(1, ...hoods.map((h) => h.count));

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter }} accessibilityRole="tablist">
              {opened.map((x) => {
                const on = x.city === city;
                return (
                  <Chip
                    key={x.city}
                    selected={on}
                    onPress={() => setCity(x.city)}
                    color={on ? C.ink : C.text}
                    bg={on ? C.cream : C.fill}
                    icon={x.playedAt ? <Icon name="verify" variant="bold" size={14} color={on ? C.posterRed : C.bad} /> : undefined}
                    accessibilityLabel={`${x.name}, ${x.proof?.signatures ?? 0} signatures`}
                  >
                    {`${x.name} · ${x.proof?.signatures ?? 0}`}
                  </Chip>
                );
              })}
            </ScrollView>

            <View style={{ alignItems: 'center', paddingHorizontal: S.gutter }}>
              {poster && o ? (
                <View style={{ width: posterW, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}>
                  <Poster
                    width={posterW}
                    fresh={fresh}
                    stampKey={stampKey}
                    d={{
                      artistName: poster.artist.name,
                      cityName: poster.city.name,
                      state: poster.city.state,
                      count: poster.count,
                      wear: poster.wear,
                      topNeighborhoods: poster.topNeighborhoods,
                      signatures: poster.signatures,
                      played: !!poster.played,
                      portrait: poster.artist.portrait,
                      imageUrl: poster.artist.imageUrl,
                      isDemo: poster.artist.isDemo,
                      cityId: poster.city.id,
                      hexes: poster.hexes,
                    }}
                  />
                </View>
              ) : (
                <View style={{ width: posterW, height: posterW * POSTER_RATIO, borderRadius: 8, backgroundColor: C.card }} />
              )}
            </View>

            {o ? (
              <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
                <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', paddingVertical: S.md }}>
                  <Cell value={`${o.proof?.signatures ?? 0}`} label="Signed" color={C.fans} />
                  {o.proof?.crossed ? <Cell value="Proved" label="Enough to book" color={C.good} /> : <Cell value={`${Math.max(0, 50 - (o.proof?.signatures ?? 0))}`} label="To go" />}
                  <Cell value={`${poster?.deputiesLeft ?? '—'}`} label="Deputy spots left" color={C.gold} />
                </View>

                <View style={{ gap: S.md }}>
                  <Btn tone="scout" size="lg" full onPress={share} icon={<Icon name="share" variant="bold" size={20} color={C.text} />}>
                    Share the poster
                  </Btn>
                  <Row gap={S.sm}>
                    <Btn full style={{ flex: 1 }} onPress={() => router.push(`/w/${slug}/${city}`)} icon={<Icon name="eye" size={18} color={C.text} />}>
                      Fan view
                    </Btn>
                    <Btn full style={{ flex: 1 }} onPress={() => router.push(`/a/${slug}?city=${city}`)} icon={<Icon name="map" size={18} color={C.text} />}>
                      On the map
                    </Btn>
                  </Row>
                </View>

                {o.proof?.crossed ? (
                  <Pressable
                    onPress={() => (haptic.tap(), live ? deals.show(live) : setPitch({ city: o.city, cityName: o.name, roomId: null, date: null }))}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: 'rgba(52,199,89,0.12)', borderRadius: R.card, borderCurve: 'continuous', padding: S.lg }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T v="headline">{live?.status === 'held' ? `${live.roomName} is held` : `${o.name} proved it`}</T>
                        <T v="footnote" color={C.text2}>
                          {live ? dealLine(live) : 'Enough people signed. Gus will write to a room for you.'}
                        </T>
                      </View>
                      <T v="callout" color={C.good} style={{ fontWeight: '600' }}>
                        {live ? 'See the deal' : 'Pitch a room'}
                      </T>
                      <Icon name="chevron" size={14} color={C.good} />
                    </View>
                  </Pressable>
                ) : null}

                {poster?.bounty && (!poster.played || poster.bounty.drawn) ? <BountyCard bounty={poster.bounty} artistFirst={poster.artist.name.split(' ')[0]} side="artist" onDraw={draw} drawing={busy === 'draw'} /> : null}

                {hoods.length ? (
                  <Section title="Where they signed" trailing={<Prov kind="fans" />}>
                    <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
                      {hoods.slice(0, 6).map((h) => (
                        <View key={h.name} style={{ gap: 6 }} accessible accessibilityLabel={`${h.name}: ${h.count} signatures${poster?.topNeighborhoods.includes(h.name) ? ', Qloo predicted it' : ''}`}>
                          <Row style={{ justifyContent: 'space-between' }}>
                            <Row gap={6} style={{ flexShrink: 1 }}>
                              <T v="callout" numberOfLines={1} style={{ flexShrink: 1 }}>
                                {h.name}
                              </T>
                              {poster?.topNeighborhoods.includes(h.name) ? <Icon name="check" variant="bold" size={14} color={C.amber} label="Qloo predicted it" /> : null}
                            </Row>
                            <T style={{ fontFamily: F.monoBold, fontSize: 15, color: C.fans }}>{h.count}</T>
                          </Row>
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.fill2 }}>
                            <View style={{ height: '100%', width: `${(h.count / maxHood) * 100}%`, borderRadius: 3, backgroundColor: C.fans }} />
                          </View>
                        </View>
                      ))}
                      <Row gap={6}>
                        <Icon name="check" variant="bold" size={13} color={C.amber} />
                        <T v="caption">Qloo predicted this neighborhood before anyone signed.</T>
                      </Row>
                    </View>
                  </Section>
                ) : null}

                {recent.length ? (
                  <Section title="Latest signatures">
                    <Group>
                      {recent.map((sig) => (
                        <ListRow
                          key={sig.number}
                          leading={
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: sig.deputy ? 'rgba(245,197,66,0.16)' : C.fill2, alignItems: 'center', justifyContent: 'center' }}>
                              <T style={{ fontFamily: F.sig[sig.font % 3], fontSize: 18, color: sig.deputy ? C.gold : C.text }}>{sig.initials}</T>
                            </View>
                          }
                          title={<T v="body">{`No. ${sig.number}${sig.neighborhood ? ` · ${sig.neighborhood}` : ''}`}</T>}
                          subtitle={`${fmtAgo(sig.createdAt)}${sig.isDemo ? ' · demo' : ''}`}
                          trailing={sig.deputy ? <Icon name="star" variant="bold" size={18} color={C.gold} label="Deputy" /> : null}
                        />
                      ))}
                    </Group>
                  </Section>
                ) : null}

                <Section title="After the show">
                  <Group>
                    <ListRow
                      onPress={o.playedAt ? undefined : markPlayed}
                      leading={<Icon name="verify" variant="bold" size={22} color={o.playedAt ? C.bad : C.text2} />}
                      title={o.playedAt ? 'Caught live' : busy === 'played' ? 'Stamping…' : 'Mark the show played'}
                      subtitle={o.playedAt ? `Stamped ${fmtAgo(o.playedAt)}. Every fan's card for ${o.name} has the stamp too.` : `Slams CAUGHT LIVE across the poster and every fan's Signature Card for ${o.name}.`}
                      trailing={o.playedAt ? null : <Icon name="chevron" size={16} color={C.text3} />}
                    />
                  </Group>
                </Section>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
    </View>
  );
}

function Cell({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${value} ${label}`}>
      <T style={{ fontFamily: F.monoBold, fontSize: 22, lineHeight: 26, color }}>{value}</T>
      <T v="caption" color={C.text2}>
        {label}
      </T>
    </View>
  );
}
