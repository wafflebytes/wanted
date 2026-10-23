/**
 * Text with Wanted's type scale. Sizes follow the iOS text styles at the default (Large)
 * Dynamic Type size, so 17 pt body, 11 pt floor: largeTitle 34, title1 28, title2 22,
 * title3 20, headline/body 17, callout 16, subhead 15, footnote 13, caption 12. Brand faces
 * stand in for SF: Archivo for UI, Instrument Serif for Gus, Chivo Mono for numbers.
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

const V: Record<Variant, TextStyle> = {
  display: { fontFamily: F.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.4, color: C.text, textTransform: 'uppercase' },
  largeTitle: { fontFamily: F.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.8, color: C.text },
  title: { fontFamily: F.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: C.text },
  title2: { fontFamily: F.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: C.text },
  head: { fontFamily: F.head, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: C.text },
  headline: { fontFamily: F.head, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: C.text },
  body: { fontFamily: F.body, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: C.text },
  callout: { fontFamily: F.body, fontSize: 16, lineHeight: 21, letterSpacing: -0.15, color: C.text },
  small: { fontFamily: F.body, fontSize: 15, lineHeight: 20, letterSpacing: -0.1, color: C.text2 },
  footnote: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.text2 },
  caption: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.text3 },
  mono: { fontFamily: F.mono, fontSize: 15, lineHeight: 20, color: C.text },
  monoSmall: { fontFamily: F.mono, fontSize: 12, lineHeight: 16, color: C.text2 },
  serif: { fontFamily: F.serif, fontSize: 20, lineHeight: 25, color: C.text, letterSpacing: 0.2 },
  serifLarge: { fontFamily: F.serif, fontSize: 30, lineHeight: 34, color: C.text, letterSpacing: 0.2 },
  label: { fontFamily: F.monoMed, fontSize: 12, lineHeight: 16, color: C.text3, letterSpacing: 0.9, textTransform: 'uppercase' },
  gus: { fontFamily: F.serif, fontSize: 21, lineHeight: 26, color: C.text, letterSpacing: 0.2 },
};

export function T({ v = 'body', color, style, maxFontSizeMultiplier = 2, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={[V[v], color ? { color } : null, style]} />;
}
