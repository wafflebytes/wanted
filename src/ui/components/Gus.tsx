/**
 * Gus, the veteran tour manager (PRD 8.4): a die-cut sticker whose mood follows the data,
 * his line in SF Rounded, and a small speaker to hear it in his voice (Fish Audio, Verity).
 * Which model wrote a line lives in the receipts, not on screen. Tough love about routes, never mean about people.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Orb } from '../fx/Orb';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, F, IMAGES } from '../theme';
import { sayLine, stopVoice, type VoiceMood } from '../voice';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

export type GusMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it' | 'reading' | 'wave';

/** Die-cut busts (transparent, cut at the waist) so Gus can stand behind cards and peek over them. */
export const GUS_CUT: Record<GusMood, keyof typeof IMAGES> = {
  idle: 'gus-cut-idle',
  thinking: 'gus-cut-thinking',
  proud: 'gus-cut-proud',
  unimpressed: 'gus-cut-unimpressed',
  'losing-it': 'gus-cut-losing-it',
  reading: 'gus-cut-reading',
  wave: 'gus-cut-wave',
};

/** Width/height of each cut. All share one height and eye line, so sizing by height keeps his head the same size in every mood. */
const CUT_RATIO: Record<GusMood, number> = { idle: 0.81, thinking: 0.885, proud: 1.21, unimpressed: 0.84, 'losing-it': 0.97, reading: 0.93, wave: 1.02 };

const VOICE: Record<GusMood, VoiceMood> = { idle: 'idle', thinking: 'thinking', proud: 'proud', unimpressed: 'unimpressed', 'losing-it': 'losing-it', reading: 'thinking', wave: 'proud' };

/** Mood from a Tour Score (0..100). */
export function moodForScore(score: number | null | undefined): GusMood {
  if (score === null || score === undefined) return 'idle';
  if (score >= 70) return 'proud';
  if (score >= 50) return 'idle';
  if (score >= 35) return 'unimpressed';
  return 'losing-it';
}

/**
 * Gus himself: the die-cut bust, no frame. Bottom-aligned in a `size` square so he can sit on
 * an edge (or behind one). A new mood dips him down and back up, like he ducked behind the card.
 */
export function GusSticker({ mood = 'idle', size = 56, style }: { mood?: GusMood; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const dip = useRef(new Animated.Value(0)).current;
  const last = useRef(mood);
  useEffect(() => {
    if (last.current === mood || reduced) return;
    last.current = mood;
    dip.setValue(1);
    Animated.timing(dip, { toValue: 0, duration: 260, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
  }, [mood, dip, reduced]);
  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`Gus, ${mood.replace('-', ' ')}`}
      style={[
        {
          width: size,
          height: size,
          transform: [{ translateY: dip.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.18] }) }],
          opacity: dip.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }),
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {/* Sized by height and centred, so wide poses overhang the box instead of shrinking. */}
      <Image source={IMAGES[GUS_CUT[mood]]} style={{ position: 'absolute', bottom: 0, height: size, width: size * CUT_RATIO[mood], left: (size - size * CUT_RATIO[mood]) / 2 }} contentFit="contain" transition={120} />
    </Animated.View>
  );
}

/**
 * Gus's line. `thinking` shows the orb instead of a line. The play button speaks the line
 * in Gus's voice; Reduce Motion keeps the sticker still.
 */
export function GusLine({
  line,
  mood = 'idle',
  thinking,
  orb = 'working',
  model,
  compact,
  style,
  voice = true,
  sticker = true,
}: {
  line: string | null | undefined;
  mood?: GusMood;
  thinking?: string | null;
  orb?: 'working' | 'searching' | 'solving' | 'composing';
  model?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  voice?: boolean;
  /** Off when Gus is already standing right above (the header perch), so he isn't on screen twice. */
  sticker?: boolean;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  useEffect(() => () => stopVoice(), []);
  const speak = async () => {
    if (!line) return;
    if (speaking) {
      stopVoice();
      setSpeaking(false);
      return;
    }
    haptic.tap();
    setVoiceErr(null);
    setSpeaking(true);
    try {
      await sayLine(line, VOICE[mood], () => setSpeaking(false));
    } catch (e) {
      setSpeaking(false);
      setVoiceErr(e instanceof Error ? e.message : 'Gus lost his voice.');
    }
  };
  return (
    <View style={[{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, style]}>
      {sticker ? <GusSticker mood={thinking ? 'thinking' : mood} size={compact ? 40 : 48} /> : null}
      <View style={{ flex: 1, gap: 6, paddingTop: compact ? 0 : 2 }}>
        {thinking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
            <Orb state={orb} size={32} color={C.text} />
            <T v="gus" color={C.text2} style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {thinking}
            </T>
          </View>
        ) : line ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <T v="gus" style={[{ flex: 1 }, compact ? { fontSize: 16, lineHeight: 21 } : null]} accessibilityLiveRegion="polite">
              {line}
            </T>
            {voice ? (
              <Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'Stop Gus' : 'Hear Gus say it'} onPress={speak} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: speaking ? C.purple : C.fill2 }}>
                  <Icon name={speaking ? 'stop' : 'volume'} variant="bold" size={14} color={speaking ? C.text : C.text2} />
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {voiceErr ? <T v="caption">{voiceErr}</T> : null}
      </View>
    </View>
  );
}
