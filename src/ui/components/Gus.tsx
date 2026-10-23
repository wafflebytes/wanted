/**
 * Gus, the veteran tour manager (PRD 8.4): a die-cut sticker whose mood follows the data,
 * his line in Instrument Serif, a "Gus thinks" label, and a play button for his voice
 * (Fish Audio, Verity). Tough love about routes, never mean about people.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Orb } from '../fx/Orb';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { PLACEHOLDERS } from '../placeholders.generated';
import { C, F, IMAGES } from '../theme';
import { sayLine, stopVoice, type VoiceMood } from '../voice';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

export type GusMood = 'idle' | 'thinking' | 'proud' | 'unimpressed' | 'losing-it' | 'reading' | 'wave';

const FACE: Record<GusMood, keyof typeof IMAGES> = {
  idle: 'gus-idle',
  thinking: 'gus-thinking',
  proud: 'gus-proud',
  unimpressed: 'gus-unimpressed',
  'losing-it': 'gus-losing-it',
  reading: 'gus-reading',
  wave: 'gus-wave',
};

const VOICE: Record<GusMood, VoiceMood> = { idle: 'idle', thinking: 'thinking', proud: 'proud', unimpressed: 'unimpressed', 'losing-it': 'losing-it', reading: 'thinking', wave: 'proud' };

/** Mood from a Tour Score (0..100). */
export function moodForScore(score: number | null | undefined): GusMood {
  if (score === null || score === undefined) return 'idle';
  if (score >= 70) return 'proud';
  if (score >= 50) return 'idle';
  if (score >= 35) return 'unimpressed';
  return 'losing-it';
}

export function GusSticker({ mood = 'idle', size = 56, style }: { mood?: GusMood; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const last = useRef(mood);
  useEffect(() => {
    if (last.current === mood || reduced) return;
    last.current = mood;
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  }, [mood, pop, reduced]);
  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel={`Gus, ${mood.replace('-', ' ')}`}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, size / 22),
          borderColor: '#fff',
          overflow: 'hidden',
          backgroundColor: C.cream,
          transform: [{ scale: pop }, { rotate: '-4deg' }],
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        },
        style,
      ]}
    >
      <Image source={IMAGES[FACE[mood]]} placeholder={{ uri: PLACEHOLDERS[FACE[mood]] }} placeholderContentFit="cover" style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} />
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
}: {
  line: string | null | undefined;
  mood?: GusMood;
  thinking?: string | null;
  orb?: 'working' | 'searching' | 'solving' | 'composing';
  model?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  voice?: boolean;
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
  const lite = model?.startsWith('gus-lite');
  return (
    <View style={[{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, style]}>
      <GusSticker mood={thinking ? 'thinking' : mood} size={compact ? 40 : 52} />
      <View style={{ flex: 1, gap: 6, paddingTop: compact ? 0 : 2 }}>
        {thinking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
            <Orb state={orb} size={32} color={C.text} />
            <T v="gus" color={C.text2} style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {thinking}
            </T>
          </View>
        ) : line ? (
          <T v="gus" style={compact ? { fontSize: 18, lineHeight: 23 } : null} accessibilityLiveRegion="polite">
            “{line}”
          </T>
        ) : null}
        {!thinking && line ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: 'rgba(127,209,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <T style={{ fontFamily: F.monoMed, fontSize: 12, lineHeight: 15, color: C.gus }}>{lite ? 'Gus (lite)' : 'Gus thinks'}</T>
            </View>
            {voice ? (
              <Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'Stop Gus' : 'Hear Gus say it'} onPress={speak} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, minHeight: 30, backgroundColor: speaking ? C.purple : C.fill }}>
                  <Icon name={speaking ? 'stop' : 'volume'} variant="bold" size={15} color={C.text} />
                  <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 14, color: C.text }}>{speaking ? 'Stop' : 'Hear Gus'}</T>
                </View>
              </Pressable>
            ) : null}
            {voiceErr ? <T v="caption">{voiceErr}</T> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
