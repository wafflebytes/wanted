/**
 * Gus, the veteran tour manager (PRD 8.4). He's the headline, not an avatar: a die-cut sticker
 * that stands free (no circle crop), whose pose follows the data, talking in a speech bubble
 * in Instrument Serif with a "Gus thinks" label and his voice one tap away (Fish Audio,
 * Verity). While he works, the bubble carries a border beam (libraries.dev) in stage purple
 * instead of a spinner. Tough love about routes, never mean about people.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Beam } from '../fx/Beam';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, F, IMAGES, R, S, STICKER_RATIO } from '../theme';
import { sayLine, stopVoice, type VoiceMood } from '../voice';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

export type GusMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it' | 'reading' | 'wave' | 'standing';

type StickerKey = keyof typeof STICKER_RATIO;

const POSE: Record<GusMood, StickerKey> = {
  idle: 'sticker-wave',
  wave: 'sticker-wave',
  thinking: 'sticker-thinking',
  proud: 'sticker-proud',
  unimpressed: 'sticker-unimpressed',
  'losing-it': 'sticker-losing-it',
  reading: 'sticker-reading',
  standing: 'sticker-full-3q',
};

const VOICE: Record<GusMood, VoiceMood> = { idle: 'idle', thinking: 'thinking', proud: 'proud', unimpressed: 'unimpressed', 'losing-it': 'losing-it', reading: 'thinking', wave: 'proud', standing: 'idle' };

/** Mood from a Tour Score (0..100). */
export function moodForScore(score: number | null | undefined): GusMood {
  if (score === null || score === undefined) return 'idle';
  if (score >= 70) return 'proud';
  if (score >= 50) return 'idle';
  if (score >= 35) return 'unimpressed';
  return 'losing-it';
}

/**
 * Gus as a die-cut sticker, sized by height so every pose keeps its own silhouette. `size` is
 * the height in points. A pose change pops; `float` adds a slow idle bob (off under Reduce Motion).
 */
export function GusSticker({ mood = 'idle', size = 64, tilt = -3, float, style }: { mood?: GusMood; size?: number; tilt?: number; float?: boolean; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const last = useRef(mood);
  useEffect(() => {
    if (last.current === mood || reduced) return;
    last.current = mood;
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  }, [mood, pop, reduced]);
  useEffect(() => {
    if (!float || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduced, bob]);
  const key = POSE[mood];
  const width = size * STICKER_RATIO[key];
  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`Gus, ${mood.replace('-', ' ')}`}
      style={[
        {
          width,
          height: size,
          transform: [{ scale: pop }, { rotate: `${tilt}deg` }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          shadowColor: '#000',
          shadowOpacity: 0.55,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        },
        style,
      ]}
    >
      <Image source={IMAGES[key]} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={140} />
    </Animated.View>
  );
}

/** Four bars that dance while Gus talks (or listens). */
export function VoiceBars({ active, color = C.text, height = 14 }: { active: boolean; color?: string; height?: number }) {
  const reduced = useReducedMotion();
  const vals = useRef([0, 1, 2, 3].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (!active || reduced) {
      vals.forEach((v) => v.setValue(0.3));
      return;
    }
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 260 + i * 70, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.25, duration: 300 + i * 50, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, reduced, vals]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2.5, height }}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 1.5, backgroundColor: color, height: v.interpolate({ inputRange: [0, 1], outputRange: [3, height] }) }} />
      ))}
    </View>
  );
}

/** Say a line in Gus's voice; returns [speaking, toggle, error]. */
export function useGusVoice(line: string | null | undefined, mood: GusMood = 'idle') {
  const [speaking, setSpeaking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const live = useRef(false);
  live.current = speaking;
  // Only stop the voice this line started; Gus may be talking from the agent sheet.
  useEffect(() => () => void (live.current && stopVoice()), []);
  const toggle = async () => {
    if (!line) return;
    if (speaking) {
      stopVoice();
      setSpeaking(false);
      return;
    }
    haptic.tap();
    setErr(null);
    setSpeaking(true);
    try {
      await sayLine(line, VOICE[mood], () => setSpeaking(false));
    } catch (e) {
      setSpeaking(false);
      setErr(e instanceof Error ? e.message : 'Gus lost his voice.');
    }
  };
  return [speaking, toggle, err] as const;
}

/** The "Hear Gus" capsule: speaker icon, or dancing bars while he talks. 44 pt tall target. */
export function HearGus({ speaking, onPress, label = 'Hear Gus' }: { speaking: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'Stop Gus' : label} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: R.pill, paddingHorizontal: 12, height: 34, backgroundColor: speaking ? C.purple : 'rgba(155,48,224,0.18)' }}>
        {speaking ? <VoiceBars active color={C.text} height={13} /> : <Icon name="volume" variant="bold" size={16} color={C.purpleHi} />}
        <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 14, color: speaking ? C.text : C.purpleHi }}>{speaking ? 'Stop' : label}</T>
      </View>
    </Pressable>
  );
}

function Ellipsis() {
  const reduced = useReducedMotion();
  const [n, setN] = useState(3);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setN((x) => (x % 3) + 1), 420);
    return () => clearInterval(t);
  }, [reduced]);
  return <T v="gus" color={C.text3}>{'.'.repeat(n)}</T>;
}

/**
 * Gus's line: the sticker stands at the left edge, his speech bubble beside him. `thinking`
 * swaps the line for what he's doing, inside a stage-purple border beam.
 */
export function GusLine({
  line,
  mood = 'idle',
  thinking,
  model,
  compact,
  style,
  voice = true,
}: {
  line: string | null | undefined;
  mood?: GusMood;
  thinking?: string | null;
  /** Kept for callers; the beam replaced the orb states. */
  orb?: 'working' | 'searching' | 'solving' | 'composing';
  model?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  voice?: boolean;
}) {
  const [speaking, speak, voiceErr] = useGusVoice(line, mood);
  const lite = model?.startsWith('gus-lite');
  const h = compact ? 72 : 96;
  const bubble = (
    <View style={{ backgroundColor: C.cardHi, borderRadius: 22, borderCurve: 'continuous', borderBottomLeftRadius: 6, paddingHorizontal: S.lg, paddingVertical: S.md, gap: S.sm }}>
      {thinking ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: 26 }}>
          <T v="gus" color={C.text2} style={{ flexShrink: 1, fontSize: compact ? 18 : 20, lineHeight: compact ? 23 : 25 }} accessibilityLiveRegion="polite">
            {thinking.replace(/[.…]+$/, '')}
          </T>
          <Ellipsis />
        </View>
      ) : line ? (
        <T v="gus" style={compact ? { fontSize: 18, lineHeight: 23 } : null} accessibilityLiveRegion="polite">
          “{line}”
        </T>
      ) : null}
      {!thinking && line ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: 'rgba(127,209,255,0.12)', borderRadius: R.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}>
            <T style={{ fontFamily: F.monoMed, fontSize: 12, lineHeight: 15, color: C.gus }}>{lite ? 'Gus (lite)' : 'Gus thinks'}</T>
          </View>
          {voice ? <HearGus speaking={speaking} onPress={speak} /> : null}
          {voiceErr ? <T v="caption">{voiceErr}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: S.xs }, style]}>
      <GusSticker mood={thinking ? 'thinking' : mood} size={h} style={{ marginLeft: -4, marginBottom: -2 }} />
      <View style={{ flex: 1 }}>
        {thinking ? (
          <Beam variant="stage" radius={22}>
            {bubble}
          </Beam>
        ) : (
          bubble
        )}
      </View>
    </View>
  );
}

/**
 * The "working" pill (the ref's "Scanning 12,403 photos…" pattern): Gus's tiny sticker, what
 * he's doing right now, inside a stage-purple border beam. Replaces every spinner.
 */
export function GusWorking({ label, step, style }: { label: string; step?: string | null; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'center' }, style]} accessibilityLiveRegion="polite" accessibilityLabel={`${label}${step ? `. ${step}` : ''}`}>
      <Beam variant="stage" radius={R.pill} size="sm">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, height: 44, paddingLeft: 6, paddingRight: S.lg, borderRadius: R.pill, backgroundColor: 'rgba(28,28,32,0.92)' }}>
          <GusSticker mood="thinking" size={34} tilt={0} />
          <View>
            <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 15, color: C.text }}>{label}</T>
            {step ? (
              <T v="caption" color={C.text2} numberOfLines={1}>
                {step}
              </T>
            ) : null}
          </View>
        </View>
      </Beam>
    </View>
  );
}
