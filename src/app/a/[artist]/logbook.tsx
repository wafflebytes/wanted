/**
 * Gus’s Logbook (PRD 9.3d, 9.3f), written for the artist: what he did, day by day, in his
 * own words, then the few things he may do without asking, which the artist can change.
 * Presented as a sheet.
 */
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSwitch } from '@/components/glassyui/glass-switch';
import type { LogEntry, Mandate } from '@/lib/types';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { Empty, Group, ListRow, Section } from '@/ui/components/core';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { C, F, R, S } from '@/ui/theme';

const KIND: Record<LogEntry['kind'], { icon: IconName; color: string }> = {
  lookup: { icon: 'search', color: C.text2 },
  decision: { icon: 'flag', color: C.text2 },
  letter: { icon: 'mail', color: C.text2 },
  escalation: { icon: 'notification', color: C.amber },
  payment: { icon: 'card', color: C.good },
  bounty: { icon: 'star', color: C.gold },
};

const hour = (h: number) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);
const time = (t: number) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayOf = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export default function LogbookScreen() {
  const insets = useSafeAreaInsets();
  const { slug } = useArtist();
  const { data, setData } = useApi<{ entries: LogEntry[]; mandate: Mandate }>(slug ? `/artist/${slug}/logbook` : null, { poll: 6000 });
  const [saving, setSaving] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/a/${slug}`));
  const m = data?.mandate;

  const change = async (patch: Partial<Mandate>) => {
    if (!slug || !data || !m) return;
    haptic.tick();
    setData({ ...data, mandate: { ...m, ...patch } });
    setSaving(true);
    try {
      const r = await api.post<{ mandate: Mandate }>(`/artist/${slug}/logbook`, { mandate: patch });
      setData((cur) => (cur ? { ...cur, mandate: r.mandate } : cur));
    } catch {
      setData({ ...data, mandate: m });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b0c' }}>
      <Head>
        <title>Gus’s Logbook · Wanted</title>
      </Head>
      <View style={{ paddingTop: Platform.OS === 'ios' ? S.xs : insets.top + S.sm, paddingHorizontal: S.gutter, paddingBottom: S.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 64 }} />
        <T v="headline" accessibilityRole="header">
          Gus’s Logbook
        </T>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 64, alignItems: 'flex-end', minHeight: 44, justifyContent: 'center' })}>
          <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, color: C.purpleHi }}>Done</T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: insets.bottom + S.xxxl, gap: S.xxl, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {data && !data.entries.length ? (
          <Empty title="Nothing yet" line="When a city fills its poster, Gus gets to work. Everything he does shows up here." />
        ) : (
          days(data?.entries ?? []).map(([day, entries]) => (
            <Section key={day} title={day}>
              <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', paddingVertical: S.xs } as object}>
                {entries.map((e, i) => (
                  <Entry key={e.id} e={e} last={i === entries.length - 1} />
                ))}
              </View>
            </Section>
          ))
        )}

        <Section title="What Gus can do for you" trailing={saving ? <T v="caption">Saving…</T> : undefined}>
          {m ? (
            <Group>
              <ListRow
                title="Talk to venues for you"
                subtitle="When a city fills its poster, he asks a few venues and brings you the best offer."
                trailing={<GlassSwitch checked={m.autoAsk} onCheckedChange={(on) => change({ autoAsk: on })} accessibilityLabel="Talk to venues for you" />}
              />
              <Stepper title="Biggest deposit" subtitle="He won’t agree to put down more" value={`$${m.maxDeposit}`} onMinus={() => change({ maxDeposit: m.maxDeposit - 25 })} onPlus={() => change({ maxDeposit: m.maxDeposit + 25 })} min={m.maxDeposit <= 0} max={m.maxDeposit >= 2000} />
              <Stepper title="Your cut of the door" subtitle="He won’t take less" value={`${m.minSplit}%`} onMinus={() => change({ minSplit: m.minSplit - 5 })} onPlus={() => change({ minSplit: m.minSplit + 5 })} min={m.minSplit <= 50} max={m.minSplit >= 95} />
              <ListRow
                title="Gus can call you"
                subtitle={`Only when money’s on the line and a date is about to go. Never between ${hour(m.quietStart)} and ${hour(m.quietEnd)}.`}
                trailing={<GlassSwitch checked={m.callsPerWeek > 0} onCheckedChange={(on) => change({ callsPerWeek: on ? 1 : 0 })} accessibilityLabel="Gus can call you" />}
              />
            </Group>
          ) : (
            <View style={{ height: 240, borderRadius: R.card, backgroundColor: C.card }} />
          )}
          <T v="caption" style={{ marginTop: S.sm }}>
            Gus never pays anything without your OK. Test mode: no real money moves.
          </T>
        </Section>
      </ScrollView>
    </View>
  );
}

/** Newest day first, each day's notes newest first. */
function days(entries: LogEntry[]): [string, LogEntry[]][] {
  const out: [string, LogEntry[]][] = [];
  for (const e of entries) {
    const d = dayOf(e.createdAt);
    const last = out[out.length - 1];
    if (last && last[0] === d) last[1].push(e);
    else out.push([d, [e]]);
  }
  return out;
}

function Entry({ e, last }: { e: LogEntry; last: boolean }) {
  const k = KIND[e.kind];
  return (
    <View accessible accessibilityLabel={`${time(e.createdAt)}. ${e.title}. ${e.detail ?? ''}`} style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: C.line }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.fill2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={k.icon} size={15} color={k.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="callout">{e.title}</T>
        {e.detail ? <T v="footnote">{e.detail}</T> : null}
      </View>
      <T v="caption" style={{ marginTop: 2 }}>
        {time(e.createdAt)}
      </T>
    </View>
  );
}

function Stepper({ title, subtitle, value, onMinus, onPlus, min, max }: { title: string; subtitle?: string; value: string; onMinus: () => void; onPlus: () => void; min: boolean; max: boolean }) {
  const btn = (icon: 'minus' | 'add', onPress: () => void, off: boolean, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${title}`} disabled={off} onPress={() => (haptic.tick(), onPress())} hitSlop={6} style={({ pressed }) => ({ opacity: off ? 0.3 : pressed ? 0.6 : 1 })}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} color={C.text} />
      </View>
    </Pressable>
  );
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      trailing={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {btn('minus', onMinus, min, 'Less')}
          <T style={{ fontFamily: F.monoMed, fontSize: 15, minWidth: 48, textAlign: 'center' }} accessibilityLiveRegion="polite">
            {value}
          </T>
          {btn('add', onPlus, max, 'More')}
        </View>
      }
    />
  );
}
