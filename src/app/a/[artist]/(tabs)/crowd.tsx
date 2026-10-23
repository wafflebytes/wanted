/**
 * Crowd (FR-13 to FR-17): who your crowd is, from Qloo's taste graph. Skew bars, never
 * percentages; what else they love (labeled as the act's crowd, not the city's); vibe words
 * from allowlisted tag types only; openers who share the crowd; and a pre-show hang in the
 * city's hottest neighborhood. Aggregate affinity, never individual facts.
 */
import { Image } from 'expo-image';
import Head from 'expo-router/head';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtist } from '@/ui/artist';
import { Btn, Chip, Empty, Group, ListRow, Row, Section, SkewBar } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { Prov } from '@/ui/components/Receipts';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { T } from '@/ui/components/T';
import { useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { C, F, R, S } from '@/ui/theme';
import type { Crowd, PlanResponse } from '@/ui/types';
import type { TasteItem } from '@/lib/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CrowdScreen() {
  const insets = useSafeAreaInsets();
  const { slug, data: state } = useArtist();
  const { data: planRes } = useApi<PlanResponse>(slug ? `/artist/${slug}/plan` : null);
  // Cities to scope the pre-show hang: posters first, then tour stops.
  const cities = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const o of state?.opened ?? []) if (!seen.has(o.city)) (seen.add(o.city), out.push({ id: o.city, name: o.name }));
    for (const s of planRes?.plan?.stops ?? []) if (!seen.has(s.metroId)) (seen.add(s.metroId), out.push({ id: s.metroId, name: s.city }));
    return out.slice(0, 12);
  }, [state, planRes]);
  const [city, setCity] = useState<string | null>(null);
  const scope = city ?? cities[0]?.id ?? null;
  const { data, error, reload } = useApi<Crowd>(slug ? `/artist/${slug}/crowd${scope ? `?city=${scope}` : ''}` : null);
  const cityName = cities.find((c) => c.id === scope)?.name ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${state.artist.name} · Crowd` : 'Crowd'} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + TAB_BAR_SPACE + S.xxl, gap: S.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: S.gutter }}>
          <ScreenHeader title="Crowd" subtitle={state ? `Who shows up for ${state.artist.name}` : undefined} slug={slug} />
        </View>

        {error ? (
          <View style={{ paddingHorizontal: S.gutter }}>
            <Empty title="The crowd didn't load" line={error}>
              <Btn size="sm" onPress={reload}>
                Try again
              </Btn>
            </Empty>
          </View>
        ) : !data ? (
          <View style={{ paddingHorizontal: S.gutter }}>
            <GusLine line={null} thinking="Asking Qloo who your crowd is: ages, what they watch, who they'd see before you…" orb="searching" />
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
              {data.love.shows[0] || data.love.podcasts[0] ? (
                <GusLine
                  line={[data.love.shows[0] ? `Your crowd watches ${data.love.shows[0].name}` : null, data.love.podcasts[0] ? `${data.love.shows[0] ? 'and' : 'Your crowd'} listens to ${data.love.podcasts[0].name}` : null].filter(Boolean).join(' ') + '. Put that in the pitch, not your streams.'}
                  mood="reading"
                  model="gus-lite"
                />
              ) : null}

              {data.who ? (
                <Section title="Who they are" trailing={<Prov kind="qloo" receipts={data.receipts} title="Who your crowd is" />}>
                  <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.lg }}>
                    {data.who.line ? <T v="title2">{cap(data.who.line)}</T> : null}
                    <View style={{ gap: S.sm }}>
                      <T v="label">Age</T>
                      {data.who.age.map((b) => (
                        <SkewBar key={b.key} label={b.label} skew={b.skew} />
                      ))}
                    </View>
                    <View style={{ gap: S.sm }}>
                      <T v="label">Gender</T>
                      {data.who.gender.map((b) => (
                        <SkewBar key={b.key} label={b.label} skew={b.skew} color={C.blue} />
                      ))}
                    </View>
                    <Row gap={S.lg} wrap>
                      <Row gap={6}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.purpleHi }} />
                        <T v="caption">more than a typical audience</T>
                      </Row>
                      <Row gap={6}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                        <T v="caption">less</T>
                      </Row>
                    </Row>
                  </View>
                </Section>
              ) : null}
            </View>

            <View style={{ gap: S.md }}>
              <View style={{ paddingHorizontal: S.gutter, gap: S.sm }}>
                <T v="label" accessibilityRole="header">
                  What else they love
                </T>
                <T v="footnote">Your crowd’s taste across the country, not this city’s. Handy for merch, playlists and pre-show music.</T>
              </View>
              <TasteRow title="Shows and films" icon="ticket" items={data.love.shows} />
              <TasteRow title="Brands" icon="crown" items={data.love.brands} />
              <TasteRow title="Podcasts" icon="mic" items={data.love.podcasts} />
            </View>

            <View style={{ paddingHorizontal: S.gutter, gap: S.xl }}>
              {data.vibe.length ? (
                <Section title="The vibe">
                  <Row gap={S.sm} wrap>
                    {data.vibe.map((v) => (
                      <Chip key={v.id} color={C.text} bg={C.fill}>
                        {v.name}
                      </Chip>
                    ))}
                  </Row>
                  <T v="caption">Style, theme and artist tags only. Wanted never shows identity tags.</T>
                </Section>
              ) : null}

              {data.openers.length ? (
                <Section title="Openers who share your crowd">
                  <Group>
                    {data.openers.map((o) => (
                      <ListRow
                        key={o.id}
                        style={{ alignItems: 'flex-start' }}
                        leading={<Avatar uri={o.image} name={o.name} />}
                        title={<T v="headline">{o.name}</T>}
                        subtitle={
                          <View style={{ gap: S.sm, paddingTop: 2 }}>
                            {o.genres.length ? <T v="footnote">{o.genres.slice(0, 3).join(' · ')}</T> : null}
                            {o.shared.length ? (
                              <Row gap={6} wrap>
                                {o.shared.slice(0, 4).map((s) => (
                                  <Chip key={s.name} color={C.amber} bg="rgba(255,176,0,0.12)">
                                    {s.name}
                                  </Chip>
                                ))}
                              </Row>
                            ) : null}
                          </View>
                        }
                      />
                    ))}
                  </Group>
                  <T v="caption">Smaller acts (Qloo popularity under 0.6) whose fans overlap yours, with the tags you share. Qloo has no hometown data, so none is called local.</T>
                </Section>
              ) : null}

              {cities.length ? (
                <Section title="Pre-show hang">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter }}>
                    {cities.map((c) => {
                      const on = c.id === scope;
                      return (
                        <Chip key={c.id} selected={on} onPress={() => setCity(c.id)} color={on ? C.ink : C.text} bg={on ? C.cream : C.fill}>
                          {c.name}
                        </Chip>
                      );
                    })}
                  </ScrollView>
                  {data.hang?.spots.length ? (
                    <>
                      <T v="footnote">
                        Bars and cafes in {data.hang.neighborhood}, {cityName}’s hottest neighborhood for your crowd.
                      </T>
                      <Group>
                        {data.hang.spots.map((s, i) => (
                          <ListRow
                            key={s.id}
                            leading={<Avatar uri={s.image} name={s.name} square />}
                            title={s.name}
                            subtitle={i === 0 ? 'Best fit' : undefined}
                            trailing={typeof s.affinity === 'number' ? <T style={{ fontFamily: F.monoBold, fontSize: 15, color: C.amber }}>{Math.round(s.affinity * 100)}</T> : null}
                          />
                        ))}
                      </Group>
                    </>
                  ) : (
                    <T v="footnote">The graph’s quiet on hang spots in {cityName ?? 'this city'}. I won’t make stuff up.</T>
                  )}
                </Section>
              ) : null}

              <T v="caption" style={{ textAlign: 'center' }}>
                Aggregate taste affinity from Qloo, never facts about any one person.
              </T>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TasteRow({ title, icon, items }: { title: string; icon: IconName; items: TasteItem[] }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: S.sm }}>
      <Row gap={6} style={{ paddingHorizontal: S.gutter }}>
        <Icon name={icon} size={16} color={C.text2} />
        <T v="headline">{title}</T>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.gutter }}>
        {items.map((it) => (
          <View key={it.id} style={{ width: 132, gap: S.sm }} accessible accessibilityLabel={it.name}>
            <View style={{ width: 132, height: 132, borderRadius: 18, borderCurve: 'continuous', backgroundColor: C.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {it.image ? <Image source={{ uri: it.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} /> : <Icon name={icon} size={36} color={C.text3} />}
            </View>
            <T v="footnote" color={C.text} numberOfLines={2}>
              {it.name}
            </T>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Avatar({ uri, name, square }: { uri: string | null; name: string; square?: boolean }) {
  const r = square ? 10 : 22;
  return uri ? (
    <Image source={{ uri }} style={{ width: 44, height: 44, borderRadius: r, backgroundColor: C.fill2 }} contentFit="cover" />
  ) : (
    <View style={{ width: 44, height: 44, borderRadius: r, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontFamily: F.bold, fontSize: 17, color: C.text2 }}>{name.slice(0, 1).toUpperCase()}</T>
    </View>
  );
}
