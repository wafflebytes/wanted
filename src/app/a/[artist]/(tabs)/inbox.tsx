/**
 * Inbox (FR-22, PRD 5.1 loop 6): Gus pings only when something changed, and only with a
 * decision attached. A threshold message carries the evidence and one action: pitch the best
 * room, or add the city to the route.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InboxMessage } from '@/lib/types';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { Btn, Chip, Empty, Row } from '@/ui/components/core';
import { GusSticker, type GusMood } from '@/ui/components/Gus';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { DemoTag, Prov } from '@/ui/components/Receipts';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { Beam } from '@/ui/fx/Beam';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { C, IMAGES, R, S } from '@/ui/theme';
import type { PlanResponse } from '@/ui/types';

const MOOD: Record<InboxMessage['kind'], GusMood> = { threshold: 'proud', sunday: 'reading', info: 'idle', drift: 'unimpressed', welcome: 'wave' };
const KIND_LABEL: Record<InboxMessage['kind'], string> = { threshold: 'City proved itself', sunday: 'Sunday Most Wanted', info: 'Note', drift: 'Heads up', welcome: 'Welcome' };

/** "columbus-oh" -> "Columbus" when the city isn't one of the artist's opened cities. */
const prettyCity = (id: string) => id.replace(/-[a-z]{2}$/, '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const when = (t: number) => {
  const d = new Date(t);
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { slug, data: state, reload: reloadState } = useArtist(5000);
  const { data, reload } = useApi<{ messages: InboxMessage[] }>(slug ? `/artist/${slug}/inbox` : null, { poll: 6000 });
  const { data: planRes } = useApi<PlanResponse>(slug ? `/artist/${slug}/plan` : null);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const messages = data?.messages ?? [];
  const cityName = (id: string) => state?.opened.find((o) => o.city === id)?.name ?? prettyCity(id);
  const unread = messages.filter((m) => !m.read).length;

  // Opening the inbox reads it, after a beat so the unread dots register first.
  useEffect(() => {
    if (!slug || !unread) return;
    const t = setTimeout(async () => {
      await api.post(`/artist/${slug}/inbox`, { read: 'all' }).catch(() => undefined);
      invalidate(`/artist/${slug}`);
      reloadState();
    }, 2500);
    return () => clearTimeout(t);
  }, [slug, unread, reloadState]);

  const act = async (m: InboxMessage) => {
    if (!m.action || !slug) return;
    haptic.tap();
    if (m.action.kind === 'pitch' && m.action.city) {
      setPitch({ city: m.action.city, cityName: cityName(m.action.city), roomId: m.action.roomId ?? null, date: null });
      return;
    }
    if (m.action.kind === 'add-city' && m.action.city) {
      const constraints = planRes?.plan?.constraints;
      if (!constraints) {
        router.push(`/a/${slug}/tour`);
        return;
      }
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

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${state.artist.name} · Inbox` : 'Inbox'} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + TAB_BAR_SPACE + S.xxl, paddingHorizontal: S.gutter, gap: S.lg, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <ScreenHeader title="Inbox" subtitle={unread ? `${unread} new from Gus` : messages.length ? 'All caught up' : undefined} slug={slug} />

        {data && !messages.length ? (
          <Empty title="Nothing yet" line="I only ping you when a city proves itself. Put a poster up and let the fans talk.">
            <Image source={IMAGES['gus-tumbleweed']} style={{ width: 220, height: 160 }} contentFit="contain" accessibilityIgnoresInvertColors />
          </Empty>
        ) : null}

        {messages.map((m) => {
          const ev = (m.evidence ?? {}) as { city?: string; signatures?: number; ratio?: number; signatureShare?: number; heatShare?: number; demo?: boolean; demoSignatures?: number; model?: string };
          const threshold = m.kind === 'threshold';
          const card = (
            <View style={{ backgroundColor: threshold ? '#1a1220' : C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md, borderWidth: threshold ? 1 : 0, borderColor: 'rgba(180,92,240,0.35)' }}>
              <Row gap={S.md} style={{ alignItems: 'center' }}>
                <GusSticker mood={MOOD[m.kind]} size={40} />
                <View style={{ flex: 1 }}>
                  <T v="headline">{KIND_LABEL[m.kind]}</T>
                  <T v="footnote">
                    Gus · {when(m.createdAt)}
                    {ev.city ? ` · ${cityName(ev.city)}` : ''}
                  </T>
                </View>
                {!m.read ? <View accessibilityLabel="Unread" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} /> : null}
              </Row>
              {threshold ? <Image source={IMAGES['gus-lets-ride']} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }} contentFit="cover" accessibilityLabel="Gus waving the van out: let's ride" /> : null}
              <T v="gus" style={{ fontSize: 19, lineHeight: 25 }}>
                {m.body}
              </T>
              {threshold ? (
                <Row gap={6} wrap>
                  {ev.signatures !== undefined ? <Chip color={C.fans} bg="rgba(180,92,240,0.14)">{`${ev.signatures} signatures`}</Chip> : null}
                  {typeof ev.signatureShare === 'number' && typeof ev.heatShare === 'number' ? (
                    <Chip color={C.text}>{`${(ev.signatureShare * 100).toFixed(1)}% of signatures vs ${(ev.heatShare * 100).toFixed(1)}% expected`}</Chip>
                  ) : null}
                  {typeof ev.ratio === 'number' ? <Chip color={C.good} bg="rgba(52,199,89,0.14)">{`${ev.ratio}× proof`}</Chip> : null}
                  <Prov kind="fans" />
                  {ev.demoSignatures ? <DemoTag /> : null}
                </Row>
              ) : ev.demo ? (
                <Row>
                  <DemoTag />
                </Row>
              ) : null}
              {m.action ? (
                <Btn tone={m.action.kind === 'pitch' ? 'action' : 'scout'} full busy={busy === m.id} onPress={() => act(m)} icon={<Icon name={m.action.kind === 'pitch' ? 'mail' : 'tour'} variant="bold" size={18} color={C.text} />}>
                  {m.action.label}
                </Btn>
              ) : null}
            </View>
          );
          return threshold && !m.read ? (
            <Beam key={m.id} active radius={R.card}>
              {card}
            </Beam>
          ) : (
            <View key={m.id}>{card}</View>
          );
        })}

        {messages.length ? (
          <T v="caption" style={{ textAlign: 'center', paddingTop: S.sm }}>
            Gus writes when a city crosses 50 signatures at 1.5× what Qloo predicted. One ping per city per day, at most.
          </T>
        ) : null}
      </ScrollView>
      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
    </View>
  );
}
