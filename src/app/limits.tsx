/** Known limits (FR-28): what Wanted can and can't tell you, said plainly. */
import { View } from 'react-native';
import { FeatureCard } from '@/ui/components/core';
import { DocScreen } from '@/ui/components/DocScreen';
import { T } from '@/ui/components/T';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';
import { C, S } from '@/ui/theme';

const LIMITS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'people', title: 'Aggregate taste, never people', body: 'Qloo’s heat is affinity across an area, not a count of fans and nothing about any one person. Wanted never shows a headcount or promises a ticket number.' },
  { icon: 'signature', title: 'Signatures are non-binding', body: 'A signature says “I want this show here”. It isn’t a ticket. The proof ratio compares shares, signatures against predicted heat, never raw counts.' },
  { icon: 'location', title: 'Coverage varies', body: 'Some cities are data thin for some Sounds. When Qloo has too few cells, Wanted shows nothing rather than guess. Neighborhood lists can include whole counties; very large areas are dropped.' },
  { icon: 'building', title: 'Rooms and hours come from Qloo', body: 'Room sizes are Gus’s guess, labeled as his. Open days come from Qloo’s place data and can be missing or out of date: check before you book.' },
  { icon: 'van', title: 'Drive times are estimates', body: 'Straight-line distance × 1.25 at 88 km/h. Good enough to spot a 13-hour haul, not a substitute for a map.' },
  { icon: 'mic', title: 'Gus answers from the data', body: 'Every number Gus says has to be in the evidence. When a model is down he runs as Gus (lite), deterministic and labeled.' },
];

export default function Limits() {
  return (
    <DocScreen eyebrow="Known limits" title="What Wanted can’t tell you" line="The graph's quiet in places. I won't make stuff up." mood="unimpressed">
      {LIMITS.map((l) => (
        <FeatureCard key={l.title} tone="plain">
          <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,176,0,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={l.icon} variant="bold" size={19} color={C.amber} />
            </View>
            <View style={{ flex: 1, gap: S.xs }}>
              <T v="headline">{l.title}</T>
              <T v="subhead" color={C.text2}>
                {l.body}
              </T>
            </View>
          </View>
        </FeatureCard>
      ))}
    </DocScreen>
  );
}
