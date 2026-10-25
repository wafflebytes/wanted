/**
 * The map's sheet when no city is open. It reads like a board, top to bottom:
 *   1. Your next move: one headline and one button. That's the whole peek.
 *   2. The five: your most-wanted cities as small WANTED handbills you can flick through.
 *   3. Everywhere else: search and the rest of the list.
 * Gus stands on the sheet's edge and says the map's line out loud, so none of it needs a caption.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import type { useArtist } from '../artist';
import { haptic } from '../haptics';
import { T } from '../components/T';
import { Icon } from '../icons/Icon';
import { C, F, R, S } from '../theme';
import type { MapData, MapMetroRow } from '../types';
import { cellToLatLng } from './h3';
import { PosterTile } from './PosterTile';

/** Small caps over a section, like a printed program. */
export function SectionLabel({ children, color = C.text3, trailing }: { children: string; color?: string; trailing?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 }}>
      <T accessibilityRole="header" style={{ fontFamily: F.head, fontWeight: '700', fontSize: 12, letterSpacing: 1.4, color }}>
        {children.toUpperCase()}
      </T>
      {trailing}
    </View>
  );
}

type Move = { title: string; line: string; action: string; go: () => void; progress: number | null };

export function nextMove(state: ReturnType<typeof useArtist>['data'], ranked: MapMetroRow[], sleepers: MapMetroRow[], onDive: (id: string) => void, onPosters: (city: string) => void): Move | null {
  const opened = state?.opened ?? [];
  const proven = opened.find((o) => o.proof?.crossed);
  const warm = [...opened].sort((a, b) => (b.proof?.signatures ?? 0) - (a.proof?.signatures ?? 0))[0];
  const top = ranked[0];
  if (proven) return { title: `${proven.name} proved it.`, line: `${proven.proof!.signatures} people signed. Time to pitch a room.`, action: `Open ${proven.name}`, go: () => onDive(proven.city), progress: null };
  if (warm && (warm.proof?.signatures ?? 0) > 0) {
    const n = warm.proof?.signatures ?? 0;
    return { title: `${warm.name} is warming up.`, line: `${n} of 50 signed. Share the poster where they hang out.`, action: 'Share the poster', go: () => onPosters(warm.city), progress: Math.min(1, n / 50) };
  }
  if (top) {
    const s = sleepers[0];
    return { title: `Start in ${top.name}.`, line: s && s.id !== top.id ? `Your biggest crowd. Then try ${s.name}.` : 'Your biggest crowd. Put a poster up and see who signs.', action: `Open ${top.name}`, go: () => onDive(top.id), progress: null };
  }
  return null;
}

/** The peek: what to do next, in one line, with one button. */
export function NextMoveHead({ move, compact, onDismiss }: { move: Move; compact: boolean; onDismiss: () => void }) {
  const close = (
    <Pressable onPress={() => (haptic.tick(), onDismiss())} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={12} color={C.text2} />
      </View>
    </Pressable>
  );
  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <Pressable
          onPress={() => (haptic.tick(), move.go())}
          accessibilityRole="button"
          accessibilityLabel={`${move.title} ${move.action}`}
          style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, height: 48, paddingLeft: S.lg, paddingRight: S.xs, borderRadius: R.pill, backgroundColor: C.cardHi, opacity: pressed ? 0.75 : 1 })}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber }} />
          <T style={{ flex: 1, fontFamily: F.rounded, fontWeight: '700', fontSize: 16, color: C.text }} numberOfLines={1}>
            {move.title}
          </T>
          <View style={{ height: 38, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: C.purple, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 15, color: C.text }}>Open</T>
            <Icon name="forward" size={13} color={C.text} />
          </View>
        </Pressable>
        {close}
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.duration(260)} style={{ gap: S.md, paddingTop: 2 }}>
      <View style={{ gap: S.xs }}>
        <SectionLabel color={C.amber} trailing={close}>
          Your next move
        </SectionLabel>
        <T style={{ fontFamily: F.rounded, fontWeight: '700', fontSize: 26, lineHeight: 31, letterSpacing: -0.4, color: C.text }} accessibilityRole="header" numberOfLines={2}>
          {move.title}
        </T>
        <T v="callout" color={C.text2} numberOfLines={2}>
          {move.line}
        </T>
      </View>
      {move.progress !== null ? (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.fill, overflow: 'hidden' }}>
          <View style={{ width: `${move.progress * 100}%`, height: '100%', backgroundColor: C.fans, borderRadius: 3 }} />
        </View>
      ) : null}
      <Pressable
        onPress={() => (haptic.tick(), move.go())}
        accessibilityRole="button"
        style={({ pressed }) => ({ height: 50, borderRadius: R.pill, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S.sm, opacity: pressed ? 0.75 : 1 })}
      >
        <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 17, color: C.text }}>{move.action}</T>
        <Icon name="forward" size={16} color={C.text} />
      </Pressable>
    </Animated.View>
  );
}

const TILTS = [-3, 2.2, -1.6, 2.8, -2.2];

/** Your five most-wanted cities as handbills, in a row you flick through. */
export function TheFive({ ranked, map, onDive }: { ranked: MapMetroRow[]; map: MapData; onDive: (id: string) => void }) {
  const five = ranked.slice(0, 5);
  const proof = Object.fromEntries(map.proof.map((p) => [p.city, p]));
  // Country hexes are coarse, so a tile draws the whole region around its city, not just the cells tagged to it.
  const around = useMemo(() => {
    const centers = map.hexes.map((h) => ({ h, c: cellToLatLng(h.h3) }));
    return Object.fromEntries(five.map((m) => [m.id, centers.filter(({ c }) => Math.hypot(c[0] - m.lat, (c[1] - m.lon) * Math.cos((m.lat * Math.PI) / 180)) < 1.1).map(({ h }) => h)]));
  }, [map.hexes, five.map((m) => m.id).join()]);
  return (
    <View style={{ gap: S.xs }}>
      <SectionLabel>The five</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.lg, paddingHorizontal: S.gutter + 4, paddingTop: S.md, paddingBottom: S.lg }}>
        {five.map((m, i) => {
          const p = proof[m.id];
          return (
            <View key={m.id} style={{ alignItems: 'center', gap: S.sm }}>
              <PosterTile
                cityId={m.id}
                name={m.name}
                state={m.state}
                hexes={around[m.id] ?? []}
                signed={map.opened.includes(m.id) ? (p?.signatures ?? 0) : null}
                proven={!!p?.crossed}
                tilt={TILTS[i % TILTS.length]}
                onPress={() => onDive(m.id)}
              />
              <T v="footnote" color={m.sleeper ? C.gold : C.text2} numberOfLines={1} style={{ maxWidth: 132 }}>
                {i === 0 ? 'Your biggest crowd' : m.sleeper ? 'Sleeper city' : (m.liftPct ?? 0) > 0.7 ? 'More yours than most' : `#${m.rank} for your sound`}
              </T>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
