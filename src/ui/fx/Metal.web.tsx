/** Liquid metal (metal-fx) on the poster's signature count and the CAUGHT LIVE stamp. */
import { isMetalFxSupported, MetalText } from 'metal-fx';
import type { MetalProps } from './Metal';

export function Metal({ text, size = 40, color = '#d9d4cc', family = '"ChivoMono-Bold", ui-monospace, monospace', weight = 700 }: MetalProps) {
  if (!isMetalFxSupported()) return <span style={{ font: `${weight} ${size}px/1 ${family}`, color }}>{text}</span>;
  return <MetalText font={`${weight} ${size}px/1 ${family}`} color={color} theme="dark" strength={1}>{text}</MetalText>;
}
