import { Children, type ReactNode } from 'react';
import { Platform, Text } from 'react-native';
import { displayRuns, isKarl } from '@/lib/display-glyphs';
import { F } from '../theme';

/** Inline runs inherit size, colour, line height and tracking. Only missing glyphs
 * switch face, so headings retain Karl and screen readers hear one intact string. */
export function displayChildren(children: ReactNode, family?: string): ReactNode {
  if (!isKarl(family)) return children;
  const fontWeight = family?.endsWith('Bold') ? '700' : family?.endsWith('Medium') ? '500' : '400';
  return Children.map(children, child => {
    if (typeof child !== 'string' && typeof child !== 'number') return child;
    return displayRuns(String(child)).map((run, i) => run.fallback
      ? <Text key={i} style={{ fontFamily: F.rounded ?? (Platform.OS === 'ios' ? 'System' : 'sans-serif'), fontWeight }}>{run.text}</Text>
      : run.text);
  });
}
