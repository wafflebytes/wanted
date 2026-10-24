/**
 * Fan Mail: what came in for you, the screen an artist opens every morning. Gus brings the mail
 * and reads it out in plain words. No gauges, no scores: who signed, where, what people said,
 * and what to do about it.
 *
 *   1. This week, as one headline and one sentence, with the two-week line.
 *   2. Notes from Gus, when something needs a decision.
 *   3. A city that proved it (50 signatures): its own moment, with the pitch one tap away.
 *   4. New signatures, in the signers' own handwriting. Then the cities almost there.
 *   5. What people are posting, and who your fans are, in one sentence.
 *
 * The route is still /pulse so old links work. Everything is real: poster signatures, public
 * posts on Bluesky and Lemmy, Qloo taste. When nobody is posting about the act yet, it says so.
 */
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import Head from 'expo-router/head';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Deal, DealLimits, InboxMessage } from '@/lib/types';
import type { Pulse } from '@/server/pulse';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { Btn, Empty, Group, Row, Section, SkewBar } from '@/ui/components/core';
import type { GusMood } from '@/ui/components/Gus';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { Roll } from '@/ui/fx/Roll';
import { deals as dealStore, useDeals } from '@/ui/deals/store';
import { gus } from '@/ui/gus/store';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { enterUp } from '@/ui/motion';
import { C, F, R, S } from '@/ui/theme';
import type { Crowd, PlanResponse } from '@/ui/types';

const MOOD: Record<InboxMessage['kind'], GusMood> = { threshold: 'proud', sunday: 'reading', info: 'idle', drift: 'unimpressed', welcome: 'wave', deal: 'proud' };
const PROOF = 50;

const prettyCity = (id: string) => id.replace(/-[a-z]{2}$/, '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const ago = (t: number) => {
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
};

/** The week as a headline a friend would say. The meter decides the tone; nobody sees "62". */
function headline(p: Pulse) {
  // A proven city gets its own card right below, so the headline never names it too.
  const v = p.meter.value;
  if (v >= 80) return 'You’re on fire.';
  if (v >= 60) return 'A hot week.';
  if (v >= 35) return 'Heating up.';
  if (v >= 15) return 'Warming up.';
  return 'A quiet week.';
}

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { slug, data: state, reload: reloadState } = useArtist(5000);
  const { data: pulse, error, reload } = useApi<Pulse>(slug ? `/artist/${slug}/pulse` : null, { poll: 20000 });
  const { data: inbox } = useApi<{ messages: InboxMessage[] }>(slug ? `/artist/${slug}/inbox` : null, { poll: 8000 });
  const { data: crowd } = useApi<Crowd>(slug ? `/artist/${slug}/crowd` : null);
  const { data: planRes } = useApi<PlanResponse>(slug ? `/artist/${slug}/plan` : null);
  const { data: dealRes, reload: reloadDeals } = useApi<{ deals: Deal[]; limits: DealLimits }>(slug ? `/artist/${slug}/deals` : null);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);
  const { asking, deal: liveDeal } = useDeals();
  const [busy, setBusy] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [earlier, setEarlier] = useState(false);

  const name = state?.artist.name ?? '';
  const messages = inbox?.messages ?? [];
  const needs = messages.filter((m) => m.action && !m.read).slice(0, 2);
  const rest = messages.filter((m) => !needs.includes(m));
  const unread = messages.filter((m) => !m.read).length;
  const cityName = (id: string) => state?.opened.find((o) => o.city === id)?.name ?? prettyCity(id);

  useFocusEffect(
    useCallback(() => {
      gus.set({ screen: 'pulse' });
      if (!pulse) return;
      const top = pulse.signatures.cities[0];
      const next = pulse.signatures.cities.find((c) => c.toProof > 0);
      if (needs[0]) gus.say(needs[0].body, MOOD[needs[0].kind]);
      else if (top && top.toProof === 0) gus.say(`${top.name} proved it. Want me to write to the rooms there?`, 'proud');
      else if (next) gus.say(`${next.toProof} more in ${next.name} and I start pitching venues.`, 'reading');
      else gus.say('Nothing moved yet. One poster in your top city changes that.', 'reading');
    }, [pulse, needs[0]?.id]),
  );

  // Opening Pulse reads the inbox, after a beat so the unread dots register first.
  useEffect(() => {
    if (!slug || !unread) return;
    const t = setTimeout(async () => {
      await api.post(`/artist/${slug}/inbox`, { read: 'all' }).catch(() => undefined);
      invalidate(`/artist/${slug}`);
      reloadState();
    }, 4000);
    return () => clearTimeout(t);
  }, [slug, unread, reloadState]);

  const deals = dealRes?.deals ?? [];

  // Gus writes to the room's booking agent; the conversation runs in the deals store, so it
  // keeps going if the artist leaves this screen.
  const askForDate = async (city: string) => {
    if (!slug) return;
    const held = (liveDeal?.city === city ? liveDeal : null) ?? deals.find((d) => d.city === city && d.status !== 'passed' && d.status !== 'declined');
    if (held) return dealStore.show(held);
    haptic.tap();
    try {
      await dealStore.ask(slug, city);
      reloadDeals();
    } catch (e) {
      toast({ title: "Gus couldn't reach the room", body: e instanceof Error ? e.message : undefined });
    }
  };

  const act = async (m: InboxMessage) => {
    if (!m.action || !slug) return;
    haptic.tap();
    if (m.action.kind === 'deal') {
      const d = deals.find((x) => x.id === m.action?.dealId);
      if (d) dealStore.show(d);
      return;
    }
    if (m.action.kind === 'pitch' && m.action.city) {
      setPitch({ city: m.action.city, cityName: cityName(m.action.city), roomId: m.action.roomId ?? null, date: null });
      return;
    }
    if (m.action.kind === 'add-city' && m.action.city) {
      const constraints = planRes?.plan?.constraints;
      if (!constraints) return router.push(`/a/${slug}/tour`);
      setBusy(m.id);
      try {
        await api.post(`/artist/${slug}/plan`, { constraints: { ...constraints, region: 'all' }, action: { kind: 'fix', fix: { kind: 'add-city', metroId: m.action.city } } });
        invalidate(`/artist/${slug}/plan`);
        haptic.success();
        router.push(`/a/${slug}/tour`);
      } catch (e) {
        toast({ title: "Gus couldn't add it", body: e instanceof Error ? e.message : undefined });
      } finally {
        setBusy(null);
      }
    }
  };

  const openCity = (id: string, proven: boolean) => {
    if (!slug) return;
    haptic.tap();
    if (proven) setPitch({ city: id, cityName: cityName(id), roomId: null, date: null });
    else router.push(`/a/${slug}/posters?city=${id}`);
  };

  const talk = pulse?.chatter.posts.filter((p) => p.kind === 'talk').slice(0, 6) ?? [];
  // A proven city isn't "close to a show": it gets its own moment, and the list keeps the climbers.
  const proven = pulse?.signatures.cities.filter((c) => c.toProof === 0) ?? [];
  const climbing = pulse?.signatures.cities.filter((c) => c.toProof > 0) ?? [];
  const aboutMe = pulse ? pulse.chatter.about.includes(name) : true;

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${name} · Fan Mail` : 'Fan Mail'} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + TAB_BAR_SPACE + S.xl, gap: S.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: S.gutter }}>
          <ScreenHeader title="Fan Mail" subtitle={pulse ? (pulse.signatures.today ? `${pulse.signatures.today} new today` : 'Nothing new yet today') : undefined} slug={slug} />
        </View>

        {error ? (
          <View style={{ paddingHorizontal: S.gutter }}>
            <Empty title="The mail didn't come" line={error}>
              <Btn size="sm" onPress={reload}>
                Try again
              </Btn>
            </Empty>
          </View>
        ) : !pulse ? (
          <View style={{ paddingHorizontal: S.gutter }}>
            <WeekSkeleton />
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: S.gutter }}>
              <Week pulse={pulse} />
            </View>

            {needs.length ? (
              <View style={{ paddingHorizontal: S.gutter, gap: S.md }}>
                {needs.map((m) => (
                  <Note key={m.id} m={m} city={(m.evidence as { city?: string } | null)?.city ? cityName((m.evidence as { city: string }).city) : null} busy={busy === m.id} onAct={() => act(m)} hi />
                ))}
              </View>
            ) : null}

            {proven.length ? (
              <View style={{ paddingHorizontal: S.gutter }}>
                <Proved cities={proven} deal={(liveDeal?.city === proven[0].city ? liveDeal : null) ?? deals.find((d) => d.city === proven[0].city && d.status !== 'passed') ?? null} asking={asking === proven[0].city} onAsk={askForDate} onPitch={(id) => openCity(id, true)} />
              </View>
            ) : null}

            {deals.some((d) => d.status === 'held' || d.status === 'waiting' || d.status === 'talking') ? (
              <Section title="Holds" style={{ paddingHorizontal: S.gutter }}>
                <Group>
                  {deals
                    .filter((d) => d.status === 'held' || d.status === 'waiting' || d.status === 'talking')
                    .map((d) => (
                      <HoldRow key={d.id} d={d} onPress={() => (haptic.tap(), dealStore.show(d))} />
                    ))}
                </Group>
              </Section>
            ) : null}

            {pulse.signatures.latest.length ? (
              <Section
                title="New signatures"
                style={{ paddingHorizontal: S.gutter }}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.gutter, paddingVertical: S.sm }}>
                  {pulse.signatures.latest.map((s, i) => (
                    <Animated.View key={`${s.number}-${s.city}`} entering={enterUp(i * 30, 6)}>
                      <Stub s={s} tilt={i % 2 ? 1.6 : -1.4} />
                    </Animated.View>
                  ))}
                </ScrollView>
                {pulse.signatures.latest.some((s) => s.demo) ? <T v="caption" style={{ paddingHorizontal: S.xs }}>Some are demo signatures, so day one isn’t empty.</T> : null}
              </Section>
            ) : null}

            {climbing.length ? (
              <Section title="Almost there" style={{ paddingHorizontal: S.gutter }}>
                <Group>
                  {climbing.slice(0, 4).map((c) => (
                    <CityProgress key={c.city} c={c} onPress={() => openCity(c.city, false)} />
                  ))}
                </Group>
                <T v="caption" style={{ paddingHorizontal: S.xs }}>
                  At {PROOF} signatures a city has proved it, and Gus can pitch its venues for you.
                </T>
              </Section>
            ) : null}

            {talk.length ? (
              <Section title="Overheard" style={{ paddingHorizontal: S.gutter }}>
                {!aboutMe ? (
                  <T v="footnote" style={{ marginTop: -S.xs }}>
                    Nobody’s posting about you yet. Here’s what fans of {list(pulse.chatter.about.slice(0, 2))} are saying.
                  </T>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={292} decelerationRate="fast" style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.gutter, paddingVertical: S.xs }}>
                  {talk.map((p) => (
                    <Quote key={p.id} p={p} />
                  ))}
                </ScrollView>
                <T v="caption" style={{ paddingHorizontal: S.xs }}>
                  Public posts on {list(pulse.chatter.sources)}
                  {pulse.chatter.radio ? `, plus ${pulse.chatter.radio} radio plays` : ''}.
                </T>
              </Section>
            ) : null}

            {crowd?.who?.line || crowd?.love.shows[0] ? (
              <Section title="Who your fans are" style={{ paddingHorizontal: S.gutter }}>
                <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
                  <T v="gus" style={{ fontSize: 20, lineHeight: 26 }}>
                    {portrait(crowd)}
                  </T>
                  {more ? (
                    <Animated.View entering={enterUp(0, 6)} style={{ gap: S.lg }}>
                      {crowd.who ? (
                        <View style={{ gap: S.sm }}>
                          {[...crowd.who.age, ...crowd.who.gender].map((b) => (
                            <SkewBar key={b.key} label={b.label} skew={b.skew} />
                          ))}
                          <T v="caption">More or less than a typical audience. From Qloo, never about any one person.</T>
                        </View>
                      ) : null}
                      {crowd.openers.length ? (
                        <View style={{ gap: S.xs }}>
                          <T v="headline">Openers who share your crowd</T>
                          {crowd.openers.slice(0, 4).map((o) => (
                            <T key={o.id} v="callout" color={C.text2}>
                              <T v="callout">{o.name}</T>
                              {o.shared.length ? `, both pull ${list(o.shared.slice(0, 2).map((s) => s.name.toLowerCase()))} fans` : ''}
                            </T>
                          ))}
                        </View>
                      ) : null}
                    </Animated.View>
                  ) : null}
                  <Pressable onPress={() => (haptic.tick(), setMore((v) => !v))} accessibilityRole="button" hitSlop={8}>
                    <Row gap={4}>
                      <T v="headline" color={C.purpleHi}>
                        {more ? 'Less' : 'More about them'}
                      </T>
                      <Icon name={more ? 'chevronUp' : 'chevronDown'} size={14} color={C.purpleHi} />
                    </Row>
                  </Pressable>
                </View>
              </Section>
            ) : null}

            {rest.length ? (
              <View style={{ paddingHorizontal: S.gutter, gap: S.md }}>
                <Pressable onPress={() => setEarlier((v) => !v)} accessibilityRole="button" hitSlop={8}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="head">Older notes</T>
                    <Row gap={4}>
                      <T v="callout" color={C.text3}>
                        {earlier ? 'Hide' : rest.length}
                      </T>
                      <Icon name={earlier ? 'chevronUp' : 'chevronDown'} size={14} color={C.text3} />
                    </Row>
                  </Row>
                </Pressable>
                {earlier ? rest.map((m) => <Note key={m.id} m={m} city={null} busy={busy === m.id} onAct={() => act(m)} />) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
    </View>
  );
}

/** This week: a headline, one plain sentence, and the two-week line. The lead card Gus leans on. */
function Week({ pulse }: { pulse: Pulse }) {
  const s = pulse.signatures;
  const diff = s.week - s.lastWeek;
  return (
    <View style={{ backgroundColor: C.cardHi, borderRadius: 22, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
      <T v="footnote" color={C.amber} style={{ fontWeight: '600' }}>
        This week
      </T>
      <Roll text={headline(pulse)} by="word" style={{ fontFamily: F.displayBold, fontSize: 30, lineHeight: 34, color: C.text, letterSpacing: -0.6 }} />
      <T v="callout" color={C.text2}>
        <T v="callout" style={{ fontWeight: '600' }}>
          {s.week === 1 ? '1 person' : `${s.week} people`} signed
        </T>
        {s.lastWeek ? (diff > 0 ? `, ${diff} more than last week.` : diff < 0 ? `, ${-diff} fewer than last week.` : ', same as last week.') : '.'}
        {s.cities[0]?.week && s.cities[0].toProof > 0 ? ` Most from ${s.cities[0].name}.` : ''}
      </T>
      {s.daily.some(Boolean) ? <Trend daily={s.daily} /> : null}
    </View>
  );
}

/** Two weeks of signatures as a soft area line, today marked. */
function Trend({ daily }: { daily: number[] }) {
  const [w, setW] = useState(0);
  const h = 56;
  const path = useMemo(() => {
    if (!w) return null;
    const max = Math.max(1, ...daily);
    const pts = daily.map((d, i) => [(i / (daily.length - 1)) * w, h - 4 - (d / max) * (h - 12)] as const);
    // Catmull-Rom through the points, as cubic Béziers: smooth without overshooting much.
    let line = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[Math.max(0, i - 1)];
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
      line += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
    }
    return { line, area: `${line} L ${w} ${h} L 0 ${h} Z`, last: pts[pts.length - 1] };
  }, [w, daily]);
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={`Signatures over two weeks, ${daily[daily.length - 1]} today`}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
        {path ? (
          <Svg width={w} height={h}>
            <Defs>
              <LinearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.fans} stopOpacity={0.35} />
                <Stop offset="1" stopColor={C.fans} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={path.area} fill="url(#trend)" />
            <Path d={path.line} stroke={C.fans} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Circle cx={path.last[0] - 4} cy={path.last[1]} r={4} fill={C.text} stroke={C.fans} strokeWidth={2} />
          </Svg>
        ) : null}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="caption">Two weeks ago</T>
        <T v="caption">Today</T>
      </Row>
    </View>
  );
}

function WeekSkeleton() {
  return (
    <View style={{ backgroundColor: C.cardHi, borderRadius: 22, borderCurve: 'continuous', padding: S.lg, gap: S.md, height: 230 }}>
      <View style={{ width: 120, height: 12, borderRadius: 6, backgroundColor: C.fill }} />
      <View style={{ width: 200, height: 28, borderRadius: 8, backgroundColor: C.fill }} />
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.fill }} />
      <T v="footnote">Gus is opening the mail…</T>
    </View>
  );
}

type CityRowData = Pulse['signatures']['cities'][number];

/** The payoff: a city crossed 50. Same card shape as the Map's next move, in the proof colour. */
function Proved({ cities, deal, asking, onAsk, onPitch }: { cities: CityRowData[]; deal: Deal | null; asking: boolean; onAsk: (id: string) => void; onPitch: (id: string) => void }) {
  const top = cities[0];
  const others = cities.slice(1).map((c) => c.name);
  return (
    <View style={{ backgroundColor: '#0f1d14', borderRadius: 22, borderCurve: 'continuous', padding: S.lg, gap: S.sm, borderWidth: 1, borderColor: 'rgba(52,199,89,0.3)' }}>
      <T v="footnote" color={C.good} style={{ fontWeight: '600' }}>
        Proved it
      </T>
      <T style={{ fontFamily: F.displayBold, fontSize: 22, lineHeight: 27, color: C.text, letterSpacing: -0.4 }}>{top.name} wants you.</T>
      <T v="callout" color={C.text2}>
        {top.total} people signed{top.hoods.length ? `, most from ${list(top.hoods.slice(0, 2))}` : ''}. That’s enough for a booker to take you seriously.
        {others.length ? ` ${list(others)} ${others.length > 1 ? 'have' : 'has'} too.` : ''}
      </T>
      <View style={{ gap: S.sm, paddingTop: S.sm }}>
        <Btn tone="scout" full busy={asking} onPress={() => onAsk(top.city)}>
          {deal?.status === 'held' ? `Held at ${deal.roomName}` : deal?.status === 'waiting' ? `${deal.roomName} said yes` : deal?.status === 'talking' ? `Talking to ${deal.roomName}` : asking ? 'Gus is asking…' : 'Have Gus ask for a date'}
        </Btn>
        <Pressable onPress={() => onPitch(top.city)} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 6, opacity: pressed ? 0.5 : 1 })}>
          <T v="headline" color={C.purpleHi}>
            Or write to the rooms yourself
          </T>
        </Pressable>
      </View>
    </View>
  );
}

/** A night Gus is holding, or one waiting on the artist's yes. */
function HoldRow({ d, onPress }: { d: Deal; onPress: () => void }) {
  const date = d.terms ? new Date(`${d.terms.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const held = d.status === 'held';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: pressed ? C.fill2 : 'transparent' })}>
      <Row gap={S.md} style={{ paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="body" numberOfLines={1}>
            {d.roomName}, {d.cityName}
          </T>
          <T v="footnote" numberOfLines={1} color={held ? C.good : C.fans}>
            {date} · {held ? `Held, $${d.payment?.amount ?? 0} paid (test)` : d.status === 'talking' ? 'Gus is talking to them' : 'Waiting on you'}
          </T>
        </View>
        <Icon name="chevron" size={14} color={C.text3} />
      </Row>
    </Pressable>
  );
}

/** One city's march to proof: where it stands, what moved this week, and the next move. */
function CityProgress({ c, onPress }: { c: CityRowData; onPress: () => void }) {
  const proven = c.toProof === 0;
  const pct = Math.min(1, c.total / PROOF);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.name}. ${proven ? `Proven, ${c.total} signed. Opens the pitch.` : `${c.toProof} to go. Opens the poster.`} ${c.week} this week.`}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? C.fill2 : 'transparent' })}
    >
      <View style={{ paddingHorizontal: S.lg, paddingVertical: S.md, gap: 10 }}>
        <Row gap={S.md}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="body" numberOfLines={1}>
              {c.name}
            </T>
            <T v="footnote" numberOfLines={1} color={proven ? C.good : C.text2}>
              {proven ? 'Proven. Ready to pitch venues' : `${c.toProof} more to prove it`}
            </T>
          </View>
          {/* This week's movement, stacked so the row never truncates. */}
          {c.week ? (
            <View style={{ alignItems: 'flex-end' }}>
              <T v="headline" color={C.fans} style={{ fontVariant: ['tabular-nums'] }}>
                +{c.week}
              </T>
              <T v="caption">this week</T>
            </View>
          ) : null}
          <Icon name="chevron" size={14} color={C.text3} />
        </Row>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: C.fill, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: proven ? C.good : C.fans }} />
        </View>
      </View>
    </Pressable>
  );
}

/** A signature as it lands: poster paper, the signer's own handwriting, where they are. */
function Stub({ s, tilt }: { s: Pulse['signatures']['latest'][number]; tilt: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${s.initials}, number ${s.number}, ${s.neighborhood ? `${s.neighborhood}, ` : ''}${s.name}, ${ago(s.at)}`}
      style={{ width: 148, padding: 12, gap: 6, backgroundColor: C.cream, borderRadius: 14, borderCurve: 'continuous', transform: [{ rotate: `${tilt}deg` }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}
    >
      <T numberOfLines={1} style={{ fontFamily: F.sig[s.font % 3], fontSize: 24, lineHeight: 32, color: s.number % 5 === 0 ? '#1d3a6b' : C.posterInk }}>
        {s.initials} <T style={{ fontFamily: F.sig[s.font % 3], fontSize: 17, color: C.posterRed }}>#{s.number}</T>
      </T>
      <View style={{ height: 1, backgroundColor: 'rgba(58,34,19,0.18)' }} />
      <T numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, fontWeight: '600', color: C.posterInk }}>
        {s.neighborhood ?? s.name}
      </T>
      <T numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(58,34,19,0.6)' }}>
        {s.neighborhood ? `${s.name} · ` : ''}
        {ago(s.at)}
      </T>
    </View>
  );
}

/** A public post as a quote card. Tapping opens it where it lives. */
function Quote({ p }: { p: Pulse['chatter']['posts'][number] }) {
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(p.url)}
      accessibilityRole="link"
      accessibilityLabel={`${p.author}: ${p.text}`}
      style={({ pressed }) => ({ width: 280, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View style={{ height: 176, backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.sm }}>
        <Row gap={S.sm}>
          {p.avatar ? <Image source={{ uri: p.avatar }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.fill }} /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.fill }} />}
          <View style={{ flex: 1 }}>
            <T v="footnote" color={C.text} style={{ fontWeight: '600' }} numberOfLines={1}>
              {p.author}
            </T>
            <T v="caption" numberOfLines={1}>
              {p.source === 'bluesky' ? 'Bluesky' : 'Lemmy'} · {ago(p.at)}
            </T>
          </View>
        </Row>
        <T v="callout" numberOfLines={5} style={{ flex: 1 }}>
          {p.text}
        </T>
      </View>
    </Pressable>
  );
}

/** "Skews under 35, leans women. They watch PEN15, listen to Song Exploder and buy Glossier." */
function portrait(c: Crowd) {
  const bits = [c.love.shows[0] && `watch ${c.love.shows[0].name}`, c.love.podcasts[0] && `listen to ${c.love.podcasts[0].name}`, c.love.brands[0] && `buy ${c.love.brands[0].name}`].filter(Boolean) as string[];
  const who = c.who?.line ? c.who.line.charAt(0).toUpperCase() + c.who.line.slice(1).replace(/\.?$/, '.') : '';
  return `${who}${who && bits.length ? ' ' : ''}${bits.length ? `They ${list(bits)}.` : ''}`;
}

/** A note from Gus, like a letter in the pile: who it's from, when, what he thinks, one button. */
function Note({ m, city, busy, onAct, hi }: { m: InboxMessage; city: string | null; busy: boolean; onAct: () => void; hi?: boolean }) {
  return (
    <View style={{ backgroundColor: hi ? '#1a1220' : C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md, borderWidth: hi ? 1 : 0, borderColor: 'rgba(180,92,240,0.35)' }}>
      <Row gap={S.sm}>
        {!m.read ? <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.fans }} /> : null}
        <T v="footnote" style={{ flex: 1 }}>
          <T v="footnote" color={C.text} style={{ fontWeight: '600' }}>
            From Gus
          </T>
          {city ? ` · ${city}` : ''} · {ago(m.createdAt)}
        </T>
      </Row>
      <T v="gus">{m.body}</T>
      {m.action ? (
        <Btn tone={m.action.kind === 'pitch' ? 'action' : 'scout'} full busy={busy} onPress={onAct}>
          {m.action.label}
        </Btn>
      ) : null}
    </View>
  );
}
