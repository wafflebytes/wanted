/**
 * The judges' replay, on the demo artist's Fan Mail only. One tap plays fans signing a city's
 * poster until it fills; Gus does the rest on his own (venues, an offer, his card here). Then it
 * offers the next beats: let Gus call about the offer, see the plan once the date is held, and
 * see the same poster from a fan's side. Every signature it adds is labeled demo data.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Deal } from '@/lib/types';
import { api } from '../api';
import { checkForCall } from '../gus/GusCall';
import { haptic } from '../haptics';
import { invalidate } from '../hooks';
import { Icon } from '../icons/Icon';
import { C, F, R, S } from '../theme';
import { Btn } from './core';
import { T } from './T';

export function DemoRun({ slug, city, cityName, deal, onChange }: { slug: string; city: string; cityName: string; deal: Deal | null; onChange: () => void }) {
  const [busy, setBusy] = useState<'play' | 'call' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const play = async () => {
    haptic.tap();
    setBusy('play');
    setError(null);
    try {
      await api.post(`/artist/${slug}/simulate`, { city, action: 'replay' });
      haptic.success();
      invalidate(`/artist/${slug}`);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t run.');
    } finally {
      setBusy(null);
    }
  };

  // The hold runs out in under three hours, which is when Gus is allowed to call. The check
  // passes midday as the hour, so the demo rings even during the artist's quiet hours.
  const call = async () => {
    haptic.tap();
    setBusy('call');
    setError(null);
    try {
      await api.post(`/artist/${slug}/simulate`, { city, action: 'hold-expiring' });
      await api.get(`/artist/${slug}/call?hour=12`);
      checkForCall();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gus couldn’t get through.');
    } finally {
      setBusy(null);
    }
  };

  const waiting = deal?.status === 'waiting';
  const held = deal?.status === 'held';
  const working = deal?.status === 'talking';
  const line = held
    ? `${deal.roomName} has a simulated hold. Gus prepared the promotion plan.`
    : waiting
      ? `${deal.roomName} has the best simulated offer. Say yes under Holds, or let Gus call you about it.`
      : working
        ? `Gus is talking to venues in ${cityName}.`
        : `Play fans signing ${cityName}’s poster until it fills. Gus takes it from there: he asks venues, brings you the best offer, and once you say yes, prepares the promotion plan.`;

  const primary = held
    ? { label: 'See how he fills the room', icon: 'ticket' as const, onPress: () => (haptic.tap(), router.push(`/a/${slug}/show?deal=${deal.id}`)), busy: false }
    : waiting
      ? { label: 'Have Gus call me', icon: 'volume' as const, onPress: call, busy: busy === 'call' }
      : { label: busy === 'play' ? 'Fans are signing…' : 'Play it', icon: 'play' as const, onPress: play, busy: busy === 'play' };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md } as object}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <View style={{ backgroundColor: 'rgba(255,176,0,0.16)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <T style={{ fontFamily: F.head, fontWeight: '700', fontSize: 11, letterSpacing: 0.6, color: C.amber }}>DEMO</T>
        </View>
        <T v="headline" style={{ flex: 1 }} numberOfLines={1}>
          Watch Gus work on his own
        </T>
      </View>
      <T v="footnote" color={C.text2}>
        {line}
      </T>
      <Btn tone="scout" full busy={primary.busy} disabled={working || (busy !== null && !primary.busy)} icon={<Icon name={primary.icon} size={16} color={C.text} />} onPress={primary.onPress}>
        {primary.label}
      </Btn>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: S.lg }}>
        {held || waiting ? (
          <Pressable accessibilityRole="button" disabled={busy !== null} onPress={play} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 44, justifyContent: 'center' })}>
            <T v="footnote" color={C.purpleHi} style={{ fontWeight: '600' }}>
              {busy === 'play' ? 'Replaying…' : 'Start over'}
            </T>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="link" onPress={() => (haptic.tick(), router.push(`/w/${slug}/${city}`))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 44, justifyContent: 'center' })}>
          <T v="footnote" color={C.purpleHi} style={{ fontWeight: '600' }}>
            {cityName} as a fan sees it
          </T>
        </Pressable>
      </View>
      {error ? (
        <T v="footnote" color={C.warn}>
          {error}
        </T>
      ) : null}
      <T v="caption">Demo signatures are labeled. Simulated venues and offers. No real messages or money move.</T>
    </View>
  );
}
