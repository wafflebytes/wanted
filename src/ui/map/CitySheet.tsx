/**
 * A city, opened from the map: a place card in the Apple Maps mould, told as a story.
 * Its WANTED handbill hangs out over the top of the sheet (drawn by the map screen), and Gus
 * leans on the other end. Top to bottom: the name and one sentence, three things you can do,
 * where your people are, the rooms worth playing, what Gus noticed, and the numbers last,
 * folded away for whoever wants them.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { T } from '../components/T';
import { DemoTag, Prov } from '../components/Receipts';
import { haptic } from '../haptics';
import { Icon, type IconProps } from '../icons/Icon';
import { enterUp } from '../motion';
import { C, emberColor, F, R, S } from '../theme';
import type { CityData, CityRoom } from '../types';
import { SectionLabel } from './MapBoard';

/** How big the hanging handbill is, so the header can leave room beside it. */
/** Panes inside the glass sheet: a light frost, so the glass stays the material. */
const PANE = 'rgba(255,255,255,0.07)';

export const CITY_HERO = { width: 100, lift: 66 };
export const cityHeroHeight = Math.round(CITY_HERO.width * 1.32);

const DAY: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const days = (d: string[] | null) => (d ?? []).map((x) => DAY[x] ?? x).join(', ');
const plural = (d: string[]) => {
  const w = d.map((x) => `${x.charAt(0).toUpperCase()}${x.slice(1)}s`);
  return w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w[0];
};

/** One sentence that says what this city is to you. */
function story(d: CityData) {
  const p = d.proof;
  const s = d.score;
  if (d.thin) return 'Too little taste data here to say anything honest.';
  if (p?.crossed) return `${p.signatures} people signed. It proved it.`;
  if (p && p.signatures > 0) return `${p.signatures} signed so far, ${Math.max(0, 50 - p.signatures)} to go.`;
  if (s?.sleeper) return 'Likes you more than it likes most acts.';
  const hood = d.neighborhoods[0]?.name;
  return hood ? `Your people are around ${hood}.` : 'Your sound has a crowd here.';
}

/** What Gus noticed, from the data on screen only. */
function noticed(d: CityData): string | null {
  if (d.thin) return null;
  const dark = d.rooms.find((r) => r.closedDays && r.closedDays.length && r.closedDays.length <= 4);
  if (dark) return `${dark.name} is dark ${plural(dark.closedDays!)}. Don’t route it there.`;
  if (d.proof && d.proof.ratio !== null && d.proof.ratio >= 1.5) return `More people signed here than the taste data predicted (${d.proof.ratio.toFixed(1)}×). That’s a real crowd.`;
  const top = d.neighborhoods.slice(0, 2).map((n) => n.name);
  if (top.length === 2) return `Book on the ${top[0]}–${top[1]} side of town. That’s where they are.`;
  return null;
}

export function CitySheet({
  d,
  pending,
  isDemo,
  onClose,
  onPost,
  onPoster,
  onPitch,
  onAsk,
  posting,
  focusRoom,
  full = false,
}: {
  d: CityData;
  pending: boolean;
  isDemo: boolean;
  onClose: () => void;
  onPost: () => void;
  onPoster: () => void;
  onPitch: () => void;
  onAsk: () => void;
  posting: boolean;
  focusRoom: string | null;
  /** The sheet is all the way up and the handbill has faded, so the name takes the left edge. */
  full?: boolean;
}) {
  const [more, setMore] = useState(false);
  const room = useSharedValue(full ? 0 : 1);
  useEffect(() => {
    room.value = withTiming(full ? 0 : 1, { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) });
  }, [full]);
  const heroRoom = useAnimatedStyle(() => ({ width: (CITY_HERO.width + 6 + S.md) * room.value }));
  const heroRow = useAnimatedStyle(() => ({ minHeight: (cityHeroHeight - CITY_HERO.lift - 4) * room.value }));
  const s = d.score;
  const rooms = focusRoom ? [...d.rooms].sort((a, b) => (a.id === focusRoom ? -1 : b.id === focusRoom ? 1 : 0)) : d.rooms;
  const signedIn = (name: string) => d.proof?.neighborhoods.find((x) => x.name.toLowerCase() === name.toLowerCase())?.count ?? 0;
  const note = noticed(d);
  const hasPoster = !!d.proof || d.opened;
  return (
    <View style={{ gap: S.xl }}>
      {/* The handbill hangs over the left; the name sits beside it. */}
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-start' }, heroRow]}>
        <Animated.View style={heroRoom} />
        <View style={{ flex: 1, gap: 3, paddingTop: 2, paddingRight: S.md }}>
          {s?.sleeper ? (
            <SectionLabel color={C.gold}>Sleeper city</SectionLabel>
          ) : null}
          <T numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, color: C.text }} accessibilityRole="header">
            {d.metro.name}
          </T>
          <T v="footnote" color={C.text2}>
            {d.metro.stateName}
          </T>
        </View>
        <Pressable onPress={() => (haptic.tick(), onClose())} accessibilityRole="button" accessibilityLabel="Close city" hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" variant="bold" size={14} color={C.text2} />
          </View>
        </Pressable>
      </Animated.View>

      <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 19, lineHeight: 25, color: C.text, marginTop: -S.sm }}>{story(d)}</T>

      {/* Apple Maps style: the one thing to do next, filled; the rest as round glass buttons. */}
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {d.proof?.crossed && d.rooms.length ? (
          <>
            <Action primary icon="mail" label="Pitch a room" onPress={onPitch} />
            <Action icon="posters" label="See the poster" onPress={onPoster} />
          </>
        ) : (
          <>
            <Action primary icon="posters" label={hasPoster ? 'See the poster' : posting ? 'Putting it up…' : 'Put up a poster'} onPress={hasPoster ? onPoster : onPost} disabled={d.thin} />
            <Action icon="mail" label="Pitch a room" onPress={onPitch} disabled={d.thin || !d.rooms.length} />
          </>
        )}
        <Action icon="message" label="Ask Gus" onPress={onAsk} />
      </View>

      {d.thin ? (
        <View style={{ backgroundColor: PANE, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.xs }}>
          <T v="headline">Quiet here</T>
          <T v="callout" color={C.text2}>
            Only {d.cellCount} spots in {d.metro.name} show your sound. Too few to rank neighborhoods or rooms, so Wanted shows nothing rather than guess.
          </T>
        </View>
      ) : null}

      {!d.thin ? (
        <View style={{ gap: S.sm }}>
          <SectionLabel>Where your people are</SectionLabel>
          {pending && !d.neighborhoods.length ? <T v="callout" color={C.text2}>Finding the neighborhoods…</T> : null}
          <View style={{ backgroundColor: PANE, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden' }}>
            {d.neighborhoods.slice(0, 5).map((n, i) => {
              const signed = signedIn(n.name);
              return (
                <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                  <T style={{ fontFamily: F.displayBold, fontSize: 20, width: 24, color: emberColor(1 - i * 0.14), fontVariant: ['tabular-nums'] }}>{n.rank}</T>
                  <T v="body" style={{ flex: 1 }} numberOfLines={1}>
                    {n.name}
                  </T>
                  {signed ? (
                    <T v="footnote" color={C.fans} style={{ fontWeight: '600' }}>
                      {signed} signed
                    </T>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {!d.thin && rooms.length ? (
        <View style={{ gap: S.sm }}>
          <SectionLabel>Rooms worth playing</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast" style={{ marginHorizontal: -S.gutter }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.gutter }}>
            {rooms.map((r) => (
              <RoomTile key={r.id} r={r} highlight={r.id === focusRoom} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {note ? (
        <View style={{ gap: S.sm }}>
          <SectionLabel>Good to know</SectionLabel>
          <View style={{ flexDirection: 'row', gap: S.md, backgroundColor: PANE, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg }}>
            <Icon name="info" size={18} color={C.amber} />
            <T v="callout" style={{ flex: 1 }}>
              {note}
            </T>
          </View>
        </View>
      ) : null}

      {s && !d.thin ? (
        <View style={{ gap: S.sm }}>
          <Pressable onPress={() => (haptic.tick(), setMore((v) => !v))} accessibilityRole="button" accessibilityState={{ expanded: more }} hitSlop={8}>
            <SectionLabel trailing={<Icon name={more ? 'chevronUp' : 'chevronDown'} size={14} color={C.text3} />}>How it compares</SectionLabel>
          </Pressable>
          {more ? (
            <Animated.View entering={enterUp(0, 6)} style={{ backgroundColor: PANE, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
              <Compare label="Fans of your sound" value={s.heatPct} words={(v) => (v >= 0.75 ? 'Lots, more than most cities' : v >= 0.45 ? 'A healthy number' : 'Fewer than most cities')} color={C.amber} />
              <Compare label="Compared with a typical act" value={s.liftPct} words={(v) => (v >= 0.65 ? 'Likes you more' : v >= 0.4 ? 'About the same' : 'Likes other acts more')} color={C.gold} />
              <T v="footnote" color={C.text2}>
                {s.rank ? `#${s.rank} of the cities Wanted scored for your sound.` : ''}
              </T>
              <View style={{ flexDirection: 'row', gap: S.lg, flexWrap: 'wrap' }}>
                <Prov kind="qloo" receipts={d.receipts} title={`What Qloo said about ${d.metro.name}`} />
                {d.proof ? <Prov kind="fans" /> : null}
                {isDemo ? <DemoTag /> : null}
              </View>
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Action({ icon, label, onPress, disabled, primary }: { icon: IconProps['name']; label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable
      onPress={() => (haptic.tap(), onPress())}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ flex: primary ? 1 : 0, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 })}
    >
      <View style={{ height: 50, minWidth: 50, paddingHorizontal: primary ? S.lg : 0, borderRadius: 25, backgroundColor: primary ? C.purple : 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name={icon} variant={primary ? 'bold' : 'linear'} size={20} color={C.text} />
        {primary ? (
          <T v="headline" color={C.text}>
            {label}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

function Compare({ label, value, words, color }: { label: string; value: number | null; words: (v: number) => string; color: string }) {
  if (value === null) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.sm }}>
        <T v="callout" color={C.text2}>
          {label}
        </T>
        <T v="callout" style={{ fontWeight: '600' }}>
          {words(value)}
        </T>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: C.fill, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** A room as a card you flick through: a photo when there is one, the name, one line. Tap for its site. */
function RoomTile({ r, highlight }: { r: CityRoom; highlight: boolean }) {
  const line = [r.neighborhood, r.openDays?.length ? `Open ${days(r.openDays)}` : null, r.sizeGuess ? `${r.sizeGuess} room` : null].filter(Boolean).join(' · ');
  const go = r.website ? () => (haptic.tick(), Linking.openURL(r.website!)) : undefined;
  return (
    <Pressable onPress={go} disabled={!go} accessibilityRole={go ? 'link' : undefined} accessibilityLabel={`${r.name}. ${line}`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ width: 220, borderRadius: R.card, borderCurve: 'continuous', backgroundColor: PANE, overflow: 'hidden', borderWidth: highlight ? 1.5 : 0, borderColor: C.blue }}>
        {r.image ? (
          <Image source={{ uri: r.image }} style={{ width: 220, height: 118 }} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: 220, height: 118, backgroundColor: '#2a1d1a', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 40, color: emberColor(0.6) }}>{r.name.charAt(0)}</T>
          </View>
        )}
        <View style={{ padding: S.md, gap: 3 }}>
          <T v="headline" numberOfLines={1}>
            {r.name}
          </T>
          <T v="footnote" color={C.text2} numberOfLines={2}>
            {line || 'No hours on file'}
          </T>
          {r.closedDays?.length ? (
            <T v="footnote" color={C.text3} numberOfLines={1}>
              Dark {days(r.closedDays)}
            </T>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
