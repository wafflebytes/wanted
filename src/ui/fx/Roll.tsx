/**
 * Text that rolls when it changes, like SwiftUI's numeric content transition: the old
 * glyphs slip up and out, the new ones rise in, a few milliseconds apart. Characters for
 * numbers and short words, whole words for sentences (fewer views, same feel).
 */
import { memo } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Keyframe, LayoutAnimationConfig } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks';
import { displayChildren } from '../components/DisplayGlyphs';
import { EASE, EASE_IN } from '../motion';

const inAt = (delay: number, dy: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: dy }, { scale: 0.96 }] },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
      easing: EASE,
    },
  })
    .duration(260)
    .delay(delay);
const outAt = (delay: number, dy: number) =>
  new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: -dy }], easing: EASE_IN },
  })
    .duration(160)
    .delay(delay);

export const Roll = memo(function Roll({
  text,
  style,
  by,
  align = 'left',
  stagger,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  by?: 'char' | 'word';
  align?: 'left' | 'center';
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const family = StyleSheet.flatten(style)?.fontFamily;
  const mode = by ?? (text.length > 18 ? 'word' : 'char');
  if (reduced || Platform.OS === 'web') return <Text accessibilityLabel={text} style={[style, { textAlign: align }]}>{displayChildren(text, family)}</Text>;
  const parts = mode === 'word' ? text.split(/(\s+)/).filter((p) => p.length) : [...text];
  const step = stagger ?? (mode === 'word' ? 22 : 14);
  const size = (style as TextStyle | undefined)?.fontSize ?? 17;
  const dy = Math.max(4, Math.round(size * 0.35));
  return (
    // skipExiting: when the whole Roll unmounts (screen torn down), don't animate the glyphs out.
    // Exiting views under a removed parent crash Fabric's unmount.
    <LayoutAnimationConfig skipExiting>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={text}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        {/* Keyed by the whole string: a new string is a new set of glyphs; the old set exits in place. */}
        <Animated.View
          key={text}
          exiting={outAt(0, dy)}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
          }}
        >
          {parts.map((p, i) => (
            <Animated.Text key={i} entering={inAt(i * step, dy)} style={style} importantForAccessibility="no">
              {displayChildren(p, family)}
            </Animated.Text>
          ))}
        </Animated.View>
      </View>
    </LayoutAnimationConfig>
  );
});
