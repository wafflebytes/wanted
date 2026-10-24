/**
 * Settings (PRD 8.5): the artist, the Without Qloo switch, Qloo usage, the models and voice
 * Gus runs on, the 20-act baseline panel behind lift, "How Gus used Qloo" (FR-27), and links
 * to Known limits (FR-28) and the Report Card (FR-30c). Presented as a sheet over the tabs.
 */
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { GlassSwitch } from '@/components/glassyui/glass-switch';
import { useArtist } from '@/ui/artist';
import { Btn, Group, ListRow, Row, Section } from '@/ui/components/core';
import { DemoTag } from '@/ui/components/Receipts';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { session } from '@/ui/session';
import { C, F, IMAGES, R, S } from '@/ui/theme';
import type { TraceCall } from '@/ui/types';

type Settings = {
  qlooMonth: { remaining: number; limit: number; at: number } | null;
  baselinePanel: { name: string; cells: number }[];
  models: Record<string, string | string[]>;
  voice: { models: string[] | Record<string, string>; voice: string };
  offline: boolean;
};

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { slug, data: state } = useArtist();
  const { data: settings } = useApi<Settings>('/settings');
  const { data: trace } = useApi<{ calls: TraceCall[] }>(slug ? `/artist/${slug}/trace` : null);
  const [withoutQloo, setWithoutQloo] = useState(false);
  const [allCalls, setAllCalls] = useState(false);
  useEffect(() => setWithoutQloo(session.withoutQloo()), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace(`/a/${slug}`));
  const a = state?.artist;
  const sounds = a?.sound.entities.filter((e) => e.role !== 'self').map((e) => e.name) ?? [];
  const month = settings?.qlooMonth;
  const used = month ? month.limit - month.remaining : 0;
  const calls = trace?.calls ?? [];
  const shown = allCalls ? calls.slice(0, 120) : calls.slice(0, 8);
  const live = calls.filter((c) => !c.cached).length;
  const modelList = settings ? Object.entries(settings.models).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => ({ role: k, id: x })) : [{ role: k, id: v }])) : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0c' }}>
      <Head>
        <title>Settings · Wanted</title>
      </Head>
      <View style={{ paddingTop: Platform.OS === 'ios' ? S.xs : insets.top + S.sm, paddingHorizontal: S.gutter, paddingBottom: S.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 64 }} />
        <T v="headline" accessibilityRole="header">
          Settings
        </T>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 64, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' })}>
          <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, color: C.purpleHi }}>Done</T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: insets.bottom + S.xxxl, gap: S.xxl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {a ? (
          <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.md }}>
            {a.isDemo ? (
              <Image source={IMAGES['maya-sticker']} style={{ width: 96, height: 96 }} contentFit="contain" />
            ) : (
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
                <T style={{ fontFamily: F.bold, fontSize: 36 }}>{a.name.slice(0, 1).toUpperCase()}</T>
              </View>
            )}
            <T v="title2">{a.name}</T>
            {sounds.length ? (
              <T v="callout" color={C.text2} style={{ textAlign: 'center' }}>
                Sounds like {sounds.join(' + ')}
              </T>
            ) : null}
            {a.isDemo ? <DemoTag /> : null}
          </View>
        ) : null}

        <Group>
          <ListRow leading={<RowIcon name="scout" tint={C.purple} />} title="Add an act" subtitle="Paste a link. About ten seconds." onPress={() => router.push('/welcome?start=link')} trailing={<Chevron />} />
          <ListRow leading={<RowIcon name="clipboard" tint="#1f6f8b" />} title="Gus’s Logbook" subtitle="Everything he’s done for you, and what he can do without asking" onPress={() => router.push(`/a/${slug}/logbook`)} trailing={<Chevron />} />
          <ListRow leading={<RowIcon name="home" tint="#3a3a3c" />} title="Back to start" onPress={() => router.replace('/')} trailing={<Chevron />} />
        </Group>

        <Section title="Data">
          <Group>
            <ListRow
              leading={<RowIcon name="moon" tint={C.flame} />}
              title="Without Qloo"
              subtitle="Compare with a generic LLM and turn the taste data off on the map."
              trailing={
                <GlassSwitch
                  checked={withoutQloo}
                  onCheckedChange={(on) => {
                    haptic.thump();
                    setWithoutQloo(on);
                    session.setWithoutQloo(on);
                  }}
                  accessibilityLabel="Without Qloo"
                />
              }
            />
          </Group>
        </Section>

        <Section title="Qloo this month">
          <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="body">{month ? `${used.toLocaleString()} of ${month.limit.toLocaleString()} calls` : '—'}</T>
              {settings?.offline ? <T v="footnote" color={C.warn}>Offline, cached only</T> : null}
            </Row>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.fill2 }}>
              <View style={{ height: '100%', width: `${month ? Math.min(100, (used / month.limit) * 100) : 0}%`, borderRadius: 4, backgroundColor: C.amber }} />
            </View>
            <T v="footnote">Qloo answers are cached for 7 days, so replaying the demo costs almost nothing.</T>
          </View>
        </Section>

        <Section title="How Gus used Qloo" trailing={calls.length ? <T v="caption">{`${calls.length} calls · ${live} live`}</T> : undefined}>
          {calls.length ? (
            <Group>
              {shown.map((c) => (
                <ListRow
                  key={`${c.id}-${c.at}`}
                  leading={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.status && c.status < 400 ? (c.cached ? C.text3 : C.good) : C.bad }} />}
                  title={<T v="callout" numberOfLines={2}>{c.purpose}</T>}
                  subtitle={
                    <T v="monoSmall" numberOfLines={1}>
                      {`${c.method} ${c.endpoint} · ${c.cached ? 'cached' : `${c.latencyMs} ms`} · ${ago(c.at)}`}
                    </T>
                  }
                />
              ))}
            </Group>
          ) : (
            <T v="footnote">No calls yet for this artist.</T>
          )}
          {calls.length > 8 ? (
            <Btn size="sm" tone="ghost" onPress={() => setAllCalls((x) => !x)}>
              {allCalls ? 'Show fewer' : `Show all ${Math.min(calls.length, 120)}`}
            </Btn>
          ) : null}
          <T v="caption">Endpoint, parameters, status and latency for every call. The API key never leaves the server.</T>
        </Section>

        {settings ? (
          <Section title="Gus runs on">
            <Group>
              {modelList.slice(0, 6).map((m) => (
                <ListRow key={`${m.role}-${m.id}`} title={<T v="callout">{m.id.split('/').pop()?.replace(':free', '')}</T>} subtitle={m.role} />
              ))}
              <ListRow title={<T v="callout">{settings.voice.voice}</T>} subtitle="voice" leading={<RowIcon name="volume" tint={C.blueDeep} />} />
            </Group>
            <T v="caption">If every model is down, Gus (lite) writes the lines from templates. Routing and scoring are always code, never the model.</T>
          </Section>
        ) : null}

        {settings?.baselinePanel.length ? (
          <Section title={`Baseline panel · ${settings.baselinePanel.length} acts`}>
            <T v="callout" color={C.text2}>
              {settings.baselinePanel.map((b) => b.name).join(', ')}
            </T>
            <T v="caption">Lift compares your heat in a city with these acts’ average there. A sleeper city loves you more than it loves everyone.</T>
          </Section>
        ) : null}

        <Group>
          <ListRow leading={<RowIcon name="shield" tint="#2c6e49" />} title="Known limits" subtitle="What Qloo’s data can and can’t tell you" onPress={() => router.push('/limits')} trailing={<Chevron />} />
          <ListRow leading={<RowIcon name="chart" tint="#8a5a00" />} title="Report Card" subtitle="Holdout backtest and evals" onPress={() => router.push('/evals')} trailing={<Chevron />} />
        </Group>

        <T v="caption" style={{ textAlign: 'center' }}>
          Wanted uses aggregate taste affinity, never facts about individuals. Fan contact details are optional and encrypted at rest. Gus roasts routes, not people.
        </T>
      </ScrollView>
    </View>
  );
}

function RowIcon({ name, tint }: { name: IconName; tint: string }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} variant="bold" size={17} color="#fff" />
    </View>
  );
}

function Chevron() {
  return <Icon name="chevron" size={16} color={C.text3} />;
}
