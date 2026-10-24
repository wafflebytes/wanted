/**
 * Text with Wanted's type scale. Sizes follow the iOS text styles at the default (Large)
 * Dynamic Type size: largeTitle 34, title1 28, title2 22, title3 20, headline/body 17,
 * callout 16, subhead 15, footnote 13, caption 12. See theme.ts for which face does what:
 * Archivo Expanded for titles and hero numbers, SF for reading, SF Rounded for Gus.
 */
import { Text, type TextProps, type TextStyle } from 'react-native';
import { C, F } from '../theme';

type Variant =
  | 'display'
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'head'
  | 'headline'
  | 'body'
  | 'callout'
  | 'small'
  | 'footnote'
  | 'caption'
  | 'mono'
  | 'monoSmall'
  | 'serif'
  | 'serifLarge'
  | 'label'
  | 'gus';

const NUM: TextStyle = { fontVariant: ['tabular-nums'] };

const V: Record<Variant, TextStyle> = {
  display: { fontFamily: F.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, color: C.text },
  largeTitle: { fontFamily: F.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: C.text },
  title: { fontFamily: F.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: C.text },
  title2: { fontFamily: F.bold, fontWeight: '700', fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: C.text },
  head: { fontFamily: F.head, fontWeight: '600', fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: C.text },
  headline: { fontFamily: F.head, fontWeight: '600', fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: C.text },
  body: { fontFamily: F.body, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: C.text },
  callout: { fontFamily: F.body, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: C.text },
  small: { fontFamily: F.body, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: C.text2 },
  footnote: { fontFamily: F.body, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: C.text2 },
  caption: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.text3 },
  // Numbers in running UI: system face with tabular figures so counters don't jitter.
  mono: { fontFamily: F.body, fontWeight: '600', fontSize: 15, lineHeight: 20, color: C.text, ...NUM },
  monoSmall: { fontFamily: F.body, fontWeight: '500', fontSize: 12, lineHeight: 16, color: C.text2, ...NUM },
  serif: { fontFamily: F.rounded, fontWeight: '600', fontSize: 19, lineHeight: 25, color: C.text, letterSpacing: -0.2 },
  serifLarge: { fontFamily: F.rounded, fontWeight: '700', fontSize: 26, lineHeight: 31, color: C.text, letterSpacing: -0.4 },
  // Section headers: sentence case, semibold, quiet. No mono, no all-caps.
  label: { fontFamily: F.head, fontWeight: '600', fontSize: 13, lineHeight: 18, color: C.text3, letterSpacing: -0.08 },
  gus: { fontFamily: F.rounded, fontWeight: '600', fontSize: 18, lineHeight: 24, color: C.text, letterSpacing: -0.25 },
};

export function T({ v = 'body', color, style, maxFontSizeMultiplier = 2, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={[V[v], color ? { color } : null, style]} />;
}
