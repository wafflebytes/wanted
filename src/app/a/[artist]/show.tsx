/**
 * Filling the room (PRD 9.3c): once a date is held, what Gus is doing to sell it. What he prepared
 * on his own comes first, then the few things that speak or spend for the artist, each with a
 * yes or a not now. Presented as a sheet, like the Logbook.
 */
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ShowPlan, ShowStep } from '@/lib/types';
import { api } from '@/ui/api';
import { useArtistSlug } from '@/ui/artist';
import { Btn, Empty, Section } from '@/ui/components/core';
import { StatusBanner } from '@/ui/components/Paper';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { enterUp } from '@/ui/motion';
import { C, F, R, S } from '@/ui/theme';

const ICON: Record<ShowStep['id'], IconName> = {
  'first-dibs': 'ticket',
  posters: 'location',
  podcast: 'mic',
  opener: 'music',
  ads: 'radar',
};

const YES: Record<ShowStep['id'], (s: ShowStep) => string> = {
  'first-dibs': () => 'OK',
  posters: () => 'OK',
  podcast: () => 'Approve note',
  opener: () => 'Approve request',
  ads: (s) => `Simulate ${s.cost}`,
};

const longDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function ShowScreen() {
  const insets = useSafeAreaInsets();
  const slug = useArtistSlug();
  const { deal } = useLocalSearchParams<{ deal?: string }>();
  const path = slug && deal ? `/artist/${slug}/show?deal=${deal}` : null;
  const { data, error, setData } = useApi<{ plan: ShowPlan }>(path);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/a/${slug}`));
  const plan = data?.plan;

  const answer = async (step: ShowStep, yes: boolean) => {
    if (!slug || !plan) return;
    haptic.tap();
    setBusy(step.id);
    setFailed(null);
    try {
      const r = await api.post<{ plan: ShowPlan }>(`/artist/${slug}/show`, { deal: plan.dealId, step: step.id, yes });
      if (yes) haptic.success();
      setData(r);
      invalidate(`/artist/${slug}/logbook`);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'That didn’t go through.');
    } finally {
      setBusy(null);
    }
  };

  const done = plan?.steps.filter((s) => ['prepared', 'approved', 'simulated'].includes(s.status)) ?? [];
  const asks = plan?.steps.filter((s) => s.status === 'needs_ok') ?? [];
  const skipped = plan?.steps.filter((s) => s.status === 'skipped') ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0c' }}>
      <Head>
        <title>Filling the room · Wanted</title>
      </Head>
      <View style={{ paddingTop: Platform.OS === 'ios' ? S.xs : insets.top + S.sm, paddingHorizontal: S.gutter, paddingBottom: S.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 64 }} />
        <T v="headline" accessibilityRole="header">
          Filling the room
        </T>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 64, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' })}>
          <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, color: C.purpleHi }}>Done</T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: insets.bottom + S.xxxl, gap: S.xxl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {error && !plan ? (
          <Empty title="No plan yet" line="Gus makes one as soon as a date is held." />
        ) : !plan ? (
          <View style={{ gap: S.md }}>
            <View style={{ height: 120, borderRadius: R.card, backgroundColor: C.card }} />
            <T v="footnote" style={{ textAlign: 'center' }}>
              Gus is working out how to sell it…
            </T>
          </View>
        ) : (
          <>
            <Hero plan={plan} done={done.length} asks={asks.length} />

            {asks.length ? (
              <Section title="Needs your OK">
                <View style={{ gap: S.md }}>
                  {asks.map((s) => (
                    <Ask key={s.id} s={s} busy={busy === s.id} onYes={() => answer(s, true)} onNo={() => answer(s, false)} />
                  ))}
                </View>
                {failed ? (
                  <T v="footnote" color={C.warn} style={{ marginTop: S.sm }}>
                    {failed}
                  </T>
                ) : null}
              </Section>
            ) : null}

            {done.length ? (
              <Section title="Prepared on his own">
                <Timeline steps={done} />
              </Section>
            ) : null}

            {skipped.length ? (
              <Section title="You passed">
                <Timeline steps={skipped} />
              </Section>
            ) : null}

            <T v="caption">Nothing goes out and nothing gets paid without your OK. Test mode: no real money moves, and notes aren’t really sent.</T>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const daysUntil = (date: string) => Math.max(0, Math.round((Date.parse(`${date}T20:00:00Z`) - Date.now()) / 86_400_000));

/**
 * The booked night, as Flighty shows a flight: where and when in big type, a green status
 * banner, then how far along Gus is, as one bar of done, waiting and passed.
 */
function Hero({ plan, done, asks }: { plan: ShowPlan; done: number; asks: number }) {
  const at = new Date(`${plan.date}T12:00:00Z`);
  const days = daysUntil(plan.date);
  const total = plan.steps.length || 1;
  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: 2 }}>
        <T v="footnote" color={C.text2}>
          {plan.cityName}
        </T>
        <T style={{ fontFamily: F.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: C.text }}>{plan.roomName}</T>
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="caption" style={{ fontWeight: '600' }}>
            The night
          </T>
          <T style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 30, color: C.good, fontVariant: ['tabular-nums'] }}>{at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</T>
          <T v="footnote">{at.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}</T>
        </View>
        <View style={{ width: 1, backgroundColor: C.line, marginHorizontal: S.lg }} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="caption" style={{ fontWeight: '600' }}>
            First in line
          </T>
          <T style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 30, color: C.text, fontVariant: ['tabular-nums'] }}>{plan.signers}</T>
          <T v="footnote">fans who signed</T>
        </View>
      </View>
      <StatusBanner
        tone="good"
        title={days === 0 ? 'Tonight' : days === 1 ? 'Tomorrow night' : `Simulated hold · in ${days} days`}
        body={asks ? `Simulation only. Gus has prepared ${done === 1 ? 'one thing' : `${done} things`}, and ${asks === 1 ? 'one needs' : `${asks} need`} your OK.` : 'Prepared work only. No live messages, poster distribution or ads.'}
      />
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }} accessible accessibilityLabel={`${done} of ${total} done, ${asks} waiting on you`}>
        {plan.steps.map((s) => (
          <View key={s.id} style={{ flex: 1, backgroundColor: ['prepared', 'approved', 'simulated'].includes(s.status) ? C.good : s.status === 'needs_ok' ? C.purpleHi : C.fill }} />
        ))}
      </View>
    </View>
  );
}

/** Something that speaks or spends for the artist: what, why, and a yes or a not now. */
function Ask({ s, busy, onYes, onNo }: { s: ShowStep; busy: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Animated.View entering={enterUp(0, 6)} style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md } as object}>
      <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', backgroundColor: 'rgba(155,48,224,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={ICON[s.id]} size={20} color={C.purpleHi} variant="bold" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T v="headline">{s.title}</T>
          <T v="footnote" color={C.text2}>
            {s.detail}
          </T>
          <T v="caption" color={C.purpleHi}>{s.status === 'simulated' ? 'Sandbox only' : s.status === 'approved' ? 'Approved · not sent' : s.status === 'prepared' ? 'Prepared · not sent' : s.status}</T>
        </View>
        {s.cost ? <T style={{ fontFamily: F.displayBold, fontSize: 18, color: C.text, fontVariant: ['tabular-nums'] }}>${s.cost}</T> : null}
      </View>
      <Extras s={s} />
      {s.why ? <T v="caption">{s.why}</T> : null}
      <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
        <Btn tone="scout" style={{ flex: 1 }} full busy={busy} onPress={onYes}>
          {YES[s.id](s)}
        </Btn>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onNo} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, minHeight: 50, paddingHorizontal: S.lg, justifyContent: 'center' })}>
          <T v="headline" color={C.text2}>
            Not now
          </T>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** What Gus did, as a timeline: a dot per thing, joined by a thread, details a tap away. */
function Timeline({ steps }: { steps: ShowStep[] }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', paddingVertical: S.sm }}>
      {steps.map((s, i) => (
        <TimelineRow key={s.id} s={s} first={i === 0} last={i === steps.length - 1} />
      ))}
    </View>
  );
}

function TimelineRow({ s, first, last }: { s: ShowStep; first: boolean; last: boolean }) {
  const [open, setOpen] = useState(false);
  const done = ['prepared', 'approved', 'simulated'].includes(s.status);
  const more = s.items.length > 0 || !!s.draft;
  return (
    <Pressable disabled={!more} accessibilityRole={more ? 'button' : undefined} accessibilityState={more ? { expanded: open } : undefined} onPress={() => (haptic.tick(), setOpen((o) => !o))} style={({ pressed }) => ({ backgroundColor: pressed ? C.fill2 : 'transparent' })}>
      <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg }}>
        <View style={{ width: 24, alignItems: 'center' }}>
          <View style={{ width: 2, height: 14, backgroundColor: first ? 'transparent' : C.lineHi }} />
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? 'rgba(48,209,88,0.18)' : C.fill2 }}>
            <Icon name={done ? 'check' : ICON[s.id]} size={14} color={done ? C.good : C.text3} variant={done ? 'bold' : 'linear'} />
          </View>
          <View style={{ width: 2, flex: 1, backgroundColor: last ? 'transparent' : C.lineHi }} />
        </View>
        <View style={{ flex: 1, gap: 3, paddingTop: 14, paddingBottom: S.lg, opacity: done ? 1 : 0.6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <T v="headline" style={{ flex: 1 }}>
              {s.title}
            </T>
            {more ? <Icon name={open ? 'chevronUp' : 'chevronDown'} size={13} color={C.text3} /> : null}
          </View>
          <T v="footnote" color={C.text2}>
            {s.detail}
          </T>
          {open ? <Extras s={s} expanded /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** The list behind a step (the spots, the shows) and the note Gus wrote, if any. */
function Extras({ s, expanded }: { s: ShowStep; expanded?: boolean }) {
  const [read, setRead] = useState(!!expanded);
  if (!s.items.length && !s.draft) return null;
  return (
    <View style={{ gap: S.sm, marginTop: expanded ? S.sm : 0 }}>
      {s.items.length ? (
        <View style={{ borderRadius: 14, borderCurve: 'continuous', backgroundColor: C.fill2, paddingVertical: 2 }}>
          {s.items.map((it, i) => (
            <View key={it.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: S.md, paddingVertical: 9, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
              <Icon name={ICON[s.id]} size={14} color={C.text3} />
              <View style={{ flex: 1 }}>
                <T v="callout" numberOfLines={1}>
                  {it.name}
                </T>
                {it.sub ? (
                  <T v="caption" numberOfLines={1}>
                    {it.sub}
                  </T>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {s.draft ? (
        read ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: C.purpleHi, paddingLeft: S.md }}>
            <T v="callout" color={C.text2} style={{ fontFamily: F.rounded }}>
              {s.draft}
            </T>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => (haptic.tick(), setRead(true))} style={{ minHeight: 36, justifyContent: 'center' }}>
            <T v="footnote" color={C.purpleHi} style={{ fontWeight: '600' }}>
              Read the note
            </T>
          </Pressable>
        )
      ) : null}
    </View>
  );
}
