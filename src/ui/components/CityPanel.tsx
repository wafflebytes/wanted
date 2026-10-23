/**
 * City drill-down (FR-5, FR-6, FR-7, FR-21): street-level heat, Qloo's ranked neighborhoods
 * (ranks, not percentages), up to five rooms with open days and explainability, fan proof,
 * and the Post WANTED poster action. A "data thin" state never fills gaps with guesses.
 */
import { Image } from 'expo-image';
import { Linking, Pressable, View } from 'react-native';
import type { DayKey } from '@/lib/types';
import { haptic } from '../haptics';
import { C, F } from '../theme';
import type { CityData, CityRoom } from '../types';
import { Btn, Card, Chip, Row, Stat, WhyBars } from './core';
import { GusLine } from './Gus';
import { DemoTag, Prov } from './Receipts';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

const DAY_SHORT: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
/** ["monday", "tuesday"] -> "Mondays and Tuesdays". */
const plural = (d: string[]) => {
  const w = d.map((x) => `${x.charAt(0).toUpperCase()}${x.slice(1)}s`);
  return w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w[0];
};
const days = (d: string[] | null) => (d ?? []).map((x) => DAY_SHORT[x] ?? x).join(', ');

/** Gus's line for a city, built only from the data on screen (Gus lite, labeled). */
export function cityGusLine(d: CityData): string {
  if (d.thin) return "The graph's quiet here. I won't make stuff up.";
  const dark = d.rooms.find((r) => r.closedDays && r.closedDays.length && r.closedDays.length <= 4);
  if (dark) return `${dark.name} is dark ${plural(dark.closedDays!)}. Don't route it there.`;
  const top = d.neighborhoods.slice(0, 2).map((n) => n.name);
  if (d.proof && d.proof.ratio !== null && d.proof.ratio >= 1.5) return `${d.metro.name} is out-signing its prediction ${d.proof.ratio.toFixed(1)}x. That's a real crowd.`;
  if (top.length === 2) return `Your people are in ${top[0]} and ${top[1]}. Book on that side of town.`;
  return `${d.metro.name} has heat. Start with the rooms near the hottest blocks.`;
}

export function CityPanel({
  d,
  pending,
  isDemo,
  onBack,
  onPost,
  onPoster,
  posting,
  focusRoom,
}: {
  d: CityData;
  pending: boolean;
  isDemo: boolean;
  onBack: () => void;
  onPost: () => void;
  onPoster: () => void;
  posting: boolean;
  focusRoom: string | null;
}) {
  const s = d.score;
  const heatReceipts = d.receipts.filter((r) => /heat/i.test(r.purpose));
  const hoodReceipts = d.receipts.filter((r) => /neighborhood/i.test(r.purpose));
  const roomReceipts = d.receipts.filter((r) => /room|venue|place/i.test(r.purpose));
  const rooms = focusRoom ? [...d.rooms].sort((a, b) => (a.id === focusRoom ? -1 : b.id === focusRoom ? 1 : 0)) : d.rooms;
  return (
    <View style={{ gap: 14 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={5}>
            {s?.sleeper ? <Icon name="star" variant="bold" size={12} color={C.gold} /> : null}
            <T v="label" color={s?.sleeper ? C.gold : undefined}>
              {s?.sleeper ? 'Sleeper city' : s?.kind === 'college' ? 'College town' : 'City'}
            </T>
          </Row>
          <T v="title" accessibilityRole="header">
            {d.metro.name}, {d.metro.state}
          </T>
        </View>
        <Btn size="sm" onPress={onBack} accessibilityLabel="Back to the whole country" icon={<Icon name="back" size={15} color={C.text} />}>
          US
        </Btn>
      </Row>

      {s && !d.thin ? (
        <Row gap={18} wrap>
          <Stat label="Wanted Score" value={s.score?.toFixed(0) ?? '—'} color={C.amber} sub={s.rank ? `#${s.rank} of ${194}` : undefined} />
          <Stat label="Heat rank" value={s.heatRank ? `#${s.heatRank}` : '—'} />
          <Stat label="Lift rank" value={s.liftRank ? `#${s.liftRank}` : '—'} color={s.sleeper ? C.gold : C.text} />
          <Prov kind="qloo" receipts={heatReceipts} title={`Heat in ${d.metro.name}`} values={{ heat: s.heat ?? 0, lift: s.lift ?? 0, 'heat percentile': s.heatPct ?? 0, 'lift percentile': s.liftPct ?? 0, cells: s.cells }} />
        </Row>
      ) : null}

      <GusLine line={cityGusLine(d)} mood={d.thin ? 'unimpressed' : 'idle'} model="gus-lite" compact />

      {d.thin ? (
        <Card>
          <T v="head">Data thin here</T>
          <T v="small">Qloo has {d.cellCount} street-level cells for this Sound in {d.metro.name}. Too few to rank neighborhoods or rooms, so Wanted shows nothing rather than guess.</T>
        </Card>
      ) : null}

      {s && !d.thin ? (
        <Card>
          <T v="label">Why this city</T>
          <WhyBars heatPct={s.heatPct} liftPct={s.liftPct} />
        </Card>
      ) : null}

      {!d.thin ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label">Most wanted neighborhoods</T>
            <Prov kind="qloo" receipts={hoodReceipts} title={`Qloo's ranked neighborhoods in ${d.metro.name}`} />
          </Row>
          {pending && !d.neighborhoods.length ? <T v="small">Qloo is ranking the neighborhoods (this call takes a few seconds)…</T> : null}
          {d.neighborhoods.slice(0, 6).map((n) => {
            const fans = d.proof?.neighborhoods.find((x) => x.name.toLowerCase() === n.name.toLowerCase());
            return (
              <Row key={n.id} gap={10}>
                <T style={{ fontFamily: F.monoBold, fontSize: 15, width: 26, color: n.rank <= 3 ? C.amber : C.text3 }}>{n.rank}</T>
                <T v="body" style={{ flex: 1 }}>
                  {n.name}
                </T>
                {fans ? (
                  <Chip mono color={C.fans} bg="rgba(180,92,240,0.14)">
                    {fans.count} signed
                  </Chip>
                ) : null}
              </Row>
            );
          })}
          {d.neighborhoods.length ? <T v="caption">Ranks from Qloo’s taste affinity for this Sound. Ranks only: Qloo predicts where taste lives, not headcounts.</T> : null}
        </Card>
      ) : null}

      {d.proof ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label">Proof</T>
            <Row gap={6}>
              <Prov kind="fans" />
              {isDemo ? <DemoTag /> : null}
            </Row>
          </Row>
          <Row gap={18} wrap>
            <Stat label="Signatures" value={d.proof.signatures} color={C.fans} />
            <Stat label="Proof ratio" value={d.proof.ratio !== null ? `${d.proof.ratio.toFixed(1)}x` : '—'} color={d.proof.ratio && d.proof.ratio >= 1.5 ? C.good : C.text} sub="share of signatures ÷ share of heat" />
          </Row>
          <Btn size="sm" onPress={onPoster}>
            See the poster
          </Btn>
        </Card>
      ) : !d.thin ? (
        <Btn tone="scout" full busy={posting} onPress={onPost} accessibilityLabel={`Post a WANTED poster for ${d.metro.name}`} icon={<Icon name="posters" variant="bold" size={18} color={C.text} />}>
          Post WANTED poster
        </Btn>
      ) : null}

      {!d.thin ? (
        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label">Rooms</T>
            <Prov kind="qloo" receipts={roomReceipts} title={`Rooms in ${d.metro.name}`} />
          </Row>
          {d.rooms.length === 0 ? <T v="small">No rooms with venue tags and affinity for this Sound here.</T> : null}
          {rooms.map((r) => (
            <RoomCard key={r.id} r={r} highlight={r.id === focusRoom} />
          ))}
          {d.droppedClosed.length ? <T v="caption">Dropped as permanently closed: {d.droppedClosed.map((x) => x.name).join(', ')}.</T> : null}
        </View>
      ) : null}
    </View>
  );
}

export function RoomCard({ r, highlight, day }: { r: CityRoom; highlight?: boolean; day?: DayKey }) {
  const darkThatNight = day && r.closedDays?.includes(day);
  return (
    <Card hi={highlight} style={highlight ? { borderWidth: 1.5, borderColor: C.blue } : null}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        {r.image ? <Image source={{ uri: r.image }} style={{ width: 56, height: 56, borderRadius: 14 }} contentFit="cover" accessibilityLabel={`Photo of ${r.name}`} /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <T v="head" style={{ fontSize: 16 }}>
            {r.name}
          </T>
          <T v="caption">{[r.neighborhood ? `${r.neighborhood}${r.neighborhoodRank ? ` (#${r.neighborhoodRank} neighborhood)` : ''}` : null, r.address].filter(Boolean).join(' · ')}</T>
        </View>
        <T v="monoSmall" color={C.amber}>
          #{r.rank}
        </T>
      </Row>
      {r.description ? (
        <View style={{ gap: 4 }}>
          <Prov kind="qloo" />
          <T v="small" color={C.text}>
            {r.description}
          </T>
        </View>
      ) : null}
      {r.crowd ? <T v="small">Crowd: {r.crowd}</T> : null}
      <Row gap={6} wrap>
        {r.openDays?.length ? <Chip mono>open {days(r.openDays)}</Chip> : <Chip mono color={C.text3}>no hours on file</Chip>}
        {r.closedDays?.length ? (
          <Chip mono color={darkThatNight ? C.bad : C.warn} bg={darkThatNight ? 'rgba(255,69,58,0.14)' : 'rgba(255,176,0,0.10)'}>
            dark {days(r.closedDays)}
          </Chip>
        ) : null}
        {r.sizeGuess ? (
          <Chip mono color={C.gus} bg="rgba(127,209,255,0.12)">
            Gus thinks: {r.sizeGuess}
          </Chip>
        ) : null}
        {r.rating ? <Chip mono icon={<Icon name="star" variant="bold" size={11} color={C.text2} />}>{r.rating.toFixed(1)}</Chip> : null}
      </Row>
      {r.sizeReason ? <T v="caption">Gus thinks {r.sizeGuess} because of {r.sizeReason}.</T> : null}
      {r.pulledBy && r.pulledBy.length > 1 ? (
        <View style={{ gap: 4 }}>
          <T v="label">Who pulled it here</T>
          {r.pulledBy.map((p) => (
            <Row key={p.name} gap={8}>
              <T v="small" style={{ width: 140 }} numberOfLines={1}>
                {p.name}
              </T>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ width: `${Math.round(p.share * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: C.purpleHi }} />
              </View>
              <T v="monoSmall">{Math.round(p.share * 100)}%</T>
            </Row>
          ))}
        </View>
      ) : null}
      <Row gap={8} wrap>
        {r.website ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              haptic.tick();
              Linking.openURL(r.website!);
            }}
          >
            <Row gap={4}>
              <Icon name="link" size={14} color={C.blue} />
              <T style={{ color: C.blue, fontFamily: F.bodyMed, fontSize: 13 }}>Website</T>
            </Row>
          </Pressable>
        ) : null}
        {r.phone ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`tel:${r.phone}`)}>
            <T style={{ color: C.blue, fontFamily: F.bodyMed, fontSize: 13 }}>{r.phone}</T>
          </Pressable>
        ) : null}
      </Row>
    </Card>
  );
}
