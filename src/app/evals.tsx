/**
 * The Report Card (FR-30c, PRD 16.11). Shows the Gauntlet's holdout results once a run is
 * recorded; until then it says so, and shows the improvement log (evals/LOG.md) as it stands.
 */
import { View } from 'react-native';
import { FeatureCard } from '@/ui/components/core';
import { DocScreen, DocSection } from '@/ui/components/DocScreen';
import { T } from '@/ui/components/T';
import { C, S } from '@/ui/theme';

const LOG: { when: string; title: string; change: string; decision: string }[] = [
  {
    when: '23 Oct · Iteration 1',
    title: 'Heat field',
    change: 'Heat moved from Qloo’s affinity_rank (saturated near 1 everywhere, so college towns were “sleepers” for every act) to affinity, weighted by each cell’s popularity.',
    decision: 'Kept. Golden checks hold: Wallen’s top heat is Knoxville, Bad Bunny’s San Juan, Bridgers’ Portland.',
  },
  {
    when: '23 Oct · Iteration 2',
    title: 'Grounding loopholes and honest marks',
    change: 'Spelled-out numbers are now checked like digits (prompt gus-v2). City names match case-sensitively. Without Qloo marks have three levels: ok, unverified, wrong; only wrong counts as an error.',
    decision: 'Kept. Plus county hygiene: localities over 1,200 km² are dropped; point boundaries are read.',
  },
];

export default function Evals() {
  return (
    <DocScreen eyebrow="Report Card" title="How Gus is graded" line="No holdout run on file yet. When there is one, it goes here, losses and all." mood="reading">
      <FeatureCard tone="stage">
        <T v="eyebrow" color="#E3B8FF">
          The Gauntlet
        </T>
        <T v="title2">No run recorded</T>
        <T v="subhead" color="rgba(235,235,245,0.8)">
          The Report Card shows Wanted vs a generic LLM vs population, split by small and established acts, with sample sizes. Ties and losses are shown too. Nothing here until a run is recorded.
        </T>
      </FeatureCard>
      <DocSection title="Improvement log">
        {LOG.map((e) => (
          <FeatureCard key={e.title} tone="plain">
            <T v="eyebrow">{e.when}</T>
            <T v="headline">{e.title}</T>
            <T v="subhead" color={C.text2}>
              {e.change}
            </T>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <T v="subhead" color={C.good}>
                {e.decision}
              </T>
            </View>
          </FeatureCard>
        ))}
      </DocSection>
    </DocScreen>
  );
}
