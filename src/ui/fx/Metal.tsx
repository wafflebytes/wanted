/** Native stand-in for metal-fx: brushed-silver text. */
import { Text } from 'react-native';
import { F } from '../theme';

export type MetalProps = { text: string; size?: number; color?: string; family?: string; weight?: number };

export function Metal({ text, size = 40, color = '#d9d4cc' }: MetalProps) {
  return (
    <Text style={{ fontFamily: F.monoBold, fontSize: size, lineHeight: size * 1.05, color, textShadowColor: 'rgba(255,255,255,0.35)', textShadowOffset: { width: 0, height: -1 }, textShadowRadius: 0 }}>
      {text}
    </Text>
  );
}
