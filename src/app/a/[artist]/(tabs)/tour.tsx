/**
 * Tour Builder (FR-8 to FR-12; PRD 2 scene 3). Ten dates, drive times and a Tour Score with
 * a breakdown. Roasts are computed in code; Gus writes the line; each has Fix and Why. Lock,
 * swap and drop stops; re-planning only moves unlocked ones. The van redraws the route.
 */
import Head from 'expo-router/head';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from '@/ui/components/Sheet';
import { useLocalSearchParams } from 'expo-router';
import { inRegions, REGION_LABELS, type Region } from '@/lib/regions';
import type { Roast, RoomBand, TourPlan, TourStop } from '@/lib/types';
import { api } from '@/ui/api';
import { useArtist } from '@/ui/artist';
import { BigStat, Btn, Card, Chip, Empty, FeatureCard, Group, IconBtn, ListRow, Row, Section, Segmented } from '@/ui/components/core';
import { ScreenHeader } from '@/ui/components/ScreenHeader';
import { TAB_BAR_SPACE } from '@/ui/components/TabBar';
import { ScoreDial, VanRun } from '@/ui/components/Dial';
import { GusLine, GusWorking, moodForScore } from '@/ui/components/Gus';
import { PitchSheet, type PitchTarget } from '@/ui/components/PitchSheet';
import { DemoTag, Prov } from '@/ui/components/Receipts';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { Beam } from '@/ui/fx/Beam';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi } from '@/ui/hooks';
import { defaultStart, session } from '@/ui/session';
import { C, F, R, S } from '@/ui/theme';
import type { CityData, MapData, PlanResponse } from '@/ui/types';
import { Icon } from '@/ui/icons/Icon';
import type { IconName } from '@/ui/icons/names';

type Constraints = { regions: Region[]; dates: number; roomBand: RoomBand; startDate: string; homeBase: string | null };
type PlanAction = { kind: 'new' } | { kind: 'replan' } | { kind: 'fix'; fix: NonNullable<Roast['fix']> } | { kind: 'lock'; stopIndex: number; locked: boolean } | { kind: 'drop'; stopIndex: number } | { kind: 'swap'; stopIndex: number; metroId: string } | { kind: 'room'; stopIndex: number; roomId: string };

const RULE_LABEL: Record<Roast['rule'], string> = {
  'cold-city': 'Cold city',
  'long-haul': 'Long haul',
  'weekday-trap': 'Weekday trap',
  'wrong-side': 'Wrong side of town',
  'crowd-split': 'Crowd split',
  'famous-hub': 'Famous-hub bias',
  'ignored-proof': 'Ignored proof',
  'closed-night': 'Dark that night',
};

const DAY3 = (d: string) => d.slice(0, 3).toUpperCase();
const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function Tour() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { slug, data: state } = useArtist();
  const { data: planRes, setData: setPlanRes, loading } = useApi<PlanResponse>(slug ? `/artist/${slug}/plan` : null);
  const { data: map } = useApi<MapData>(slug ? `/artist/${slug}/map` : null);
  const plan = planRes?.plan ?? null;
  const [c, setC] = useState<Constraints | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [why, setWhy] = useState<Roast | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [roomFor, setRoomFor] = useState<number | null>(null);
  const [pitch, setPitch] = useState<PitchTarget | null>(null);

  useEffect(() => {
    // Wait for the saved plan so its constraints (regions, dates) are the starting point.
    if (c || !slug || (loading && !planRes)) return;
    const fromPlan = plan?.constraints as (TourPlan['constraints'] & { regions?: Region[] }) | undefined;
    const fromScout = session.constraints(slug);
    setC({
      regions: fromPlan?.regions ?? fromScout?.regions ?? [],
      dates: fromPlan?.dates ?? fromScout?.dates ?? 10,
      roomBand: fromPlan?.roomBand ?? fromScout?.roomBand ?? state?.artist.roomBand ?? 'small',
      startDate: fromPlan?.startDate ?? fromScout?.startDate ?? defaultStart(),
      homeBase: fromPlan?.homeBase ?? fromScout?.homeBase ?? null,
    });
  }, [plan, slug, state, c, loading, planRes]);

  const act = async (action: PlanAction, label: string) => {
    if (!slug || !c) return;
    setBusy(label);
    try {
      const r = await api.post<PlanResponse>(`/artist/${slug}/plan`, { constraints: { ...c, region: 'all' }, action });
      setPlanRes(r);
      invalidate(`/artist/${slug}/plan`);
      setRunKey((k) => k + 1);
      haptic.success();
      if (action.kind === 'new') setDismissed(new Set());
    } catch (e) {
      toast({ title: "Gus couldn't do that", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  // Gus's actions arrive as params: ?do=plan re-routes the van, ?pitch=city opens the pitch.
  const params = useLocalSearchParams<{ do?: string; pitch?: string; t?: string }>();
  useEffect(() => {
    if (!c || !params.t) return;
    if (params.do === 'plan') act({ kind: 'new' }, 'new');
    else if (params.pitch) {
      const stop = plan?.stops.find((x) => x.metroId === params.pitch);
      const name = stop?.city ?? state?.opened.find((o) => o.city === params.pitch)?.name ?? params.pitch;
      setPitch({ city: params.pitch, cityName: name, roomId: stop?.room?.id ?? null, date: stop ? { date: stop.date, day: stop.day } : null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.t, !!c]);

  const roasts = (plan?.roasts ?? []).filter((r) => !dismissed.has(r.id));
  const proofBy = useMemo(() => Object.fromEntries((state?.opened ?? []).map((o) => [o.city, o.proof])), [state]);
  const alternatives = useMemo(() => {
    if (!map || !plan || !c) return [];
    const inRoute = new Set(plan.stops.map((s) => s.metroId));
    return map.metros.filter((m) => m.score !== null && !inRoute.has(m.id) && inRegions(m.state, c.regions)).sort((a, b) => b.score! - a.score!).slice(0, 8);
  }, [map, plan, c]);

  const toggleRegion = (r: Region) => setC((x) => (x ? { ...x, regions: x.regions.includes(r) ? x.regions.filter((y) => y !== r) : [...x.regions, r] } : x));
  const [editing, setEditing] = useState(false);
  const driveH = plan ? Math.round(plan.stops.reduce((n, x) => n + x.driveHoursFromPrev, 0)) : 0;
  const summary = c
    ? [c.regions.length ? c.regions.map((r) => REGION_LABELS[r]).join(', ') : 'Anywhere in the US', `${c.dates} dates`, `${ROOM_LABEL[c.roomBand]} rooms`, `from ${fmtDate(c.startDate)}`].join(' · ')
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{state ? `${state.artist.name} · Tour` : 'Tour'} · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + TAB_BAR_SPACE + S.xxl, paddingHorizontal: S.gutter, gap: S.xl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <ScreenHeader title="Tour" subtitle={plan ? `${fmtDate(plan.stops[0]?.date)} – ${fmtDate(plan.stops[plan.stops.length - 1]?.date)}` : undefined} slug={slug} />

        {plan ? (
          <>
            <FeatureCard tone="stage" style={{ paddingBottom: S.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="eyebrow" color="rgba(235,235,245,0.72)">
                  {state?.artist.name ?? 'Your'} · {plan.stops.length}-date run
                </T>
                {state?.artist.isDemo ? <DemoTag /> : null}
              </Row>
              <Row gap={S.md} style={{ alignItems: 'center' }}>
                <ScoreDial score={plan.total} size={136} />
                <View style={{ flex: 1, gap: S.md }}>
                  <Row gap={S.lg}>
                    <BigStat label="Dates" value={plan.stops.length} />
                    <BigStat label="Driving" value={`${driveH}h`} />
                  </Row>
                  <BigStat label="Roasts" value={roasts.length} color={roasts.length ? '#FF8A7A' : C.good} sub={roasts.length ? 'Gus has notes' : 'Clean route'} />
                </View>
              </Row>
              <VanRun runKey={runKey} width={Math.min(width, 720) - S.gutter * 2 - S.lg * 2} />
            </FeatureCard>
            <GusLine line={plan.gusLine} mood={moodForScore(plan.total)} model={plan.gusModel} />
          </>
        ) : null}

        {c ? (
          <Section title="Constraints">
            <Group>
              <ListRow
                onPress={() => setEditing(true)}
                accessibilityLabel={`Constraints: ${summary}. Edit`}
                leading={<Icon name="sliders" size={20} color={C.text2} />}
                title={<T v="callout">{summary}</T>}
                trailing={<T v="callout" color={C.purpleHi}>Edit</T>}
              />
            </Group>
            {!plan ? (
              <Btn tone="scout" size="lg" full busy={busy === 'new'} onPress={() => act({ kind: 'new' }, 'new')}>
                Plan the tour
              </Btn>
            ) : plan.stops.some((s) => s.locked) ? (
              <Btn full busy={busy === 'replan'} onPress={() => act({ kind: 'replan' }, 'replan')} icon={<Icon name="refresh" size={18} color={C.text} />}>
                Re-plan unlocked stops
              </Btn>
            ) : null}
          </Section>
        ) : null}

        {!plan && !loading && busy !== 'new' ? <GusLine line="Pick your regions and dates. I'll route the van and tell you what's wrong with it." mood="reading" model="gus-lite" /> : null}
        {busy === 'new' ? <GusWorking label="Routing the van" step="Nearest neighbor, then 2-opt, then the roasts" /> : null}

        {roasts.length ? (
          <Section title={`Gus roasts · ${roasts.length}`} tint="#FF8A7A">
            {roasts.map((r) => (
              <RoastCard
                key={r.id}
                r={r}
                busy={busy === r.id}
                onFix={r.fix ? () => act({ kind: 'fix', fix: r.fix! }, r.id) : undefined}
                onWhy={() => setWhy(r)}
                onDismiss={() => setDismissed((s) => new Set(s).add(r.id))}
              />
            ))}
          </Section>
        ) : plan ? (
          <Card>
            <Row gap={S.sm}>
              <Icon name="check" variant="bold" size={20} color={C.good} />
              <T v="callout" style={{ flex: 1 }}>
                No roasts. {plan.total >= 60 ? "Load-in at six. Doors at eight. Don't be late." : 'Nothing broken, just not great.'}
              </T>
            </Row>
          </Card>
        ) : null}

        {plan ? (
          <Section title="The route" trailing={state?.artist.isDemo ? <DemoTag /> : undefined}>
            <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden' }}>
              {plan.stops.map((s, i) => (
                <StopRow
                  key={`${s.metroId}-${i}`}
                  s={s}
                  i={i}
                  last={i === plan.stops.length - 1}
                  expanded={open === i}
                  proofRatio={proofBy[s.metroId]?.ratio ?? null}
                  signatures={proofBy[s.metroId]?.signatures ?? 0}
                  busy={busy}
                  onToggle={() => setOpen(open === i ? null : i)}
                  onLock={() => act({ kind: 'lock', stopIndex: i, locked: !s.locked }, `lock-${i}`)}
                  onDrop={() => act({ kind: 'drop', stopIndex: i }, `drop-${i}`)}
                  onSwap={() => setSwapFor(i)}
                  onRoom={() => setRoomFor(i)}
                  onPitch={() => setPitch({ city: s.metroId, cityName: s.city, roomId: s.room?.id ?? null, date: { date: s.date, day: s.day } })}
                />
              ))}
            </View>
            <T v="caption">
              Stop score = 40% Wanted Score + 20% fan proof + 15% room fit + 10% open that night + 15% drive. Tour Score is the mean stop score minus a crowd-split penalty ({plan.splitPenalty} points here). Drive times are straight-line distance × 1.25 at 88 km/h.
            </T>
          </Section>
        ) : null}
      </ScrollView>

      <Sheet
        open={editing && !!c}
        onClose={() => setEditing(false)}
        closeLabel="Done"
        title="Constraints"
        subtitle="Where, when and how big"
        footer={
          <Btn
            tone="scout"
            size="lg"
            full
            busy={busy === 'new'}
            onPress={async () => {
              setEditing(false);
              await act({ kind: 'new' }, 'new');
            }}
          >
            {plan ? 'Plan again from scratch' : 'Plan the tour'}
          </Btn>
        }
      >
          {c ? (
            <View style={{ gap: S.xl }}>
              <Section title="Regions">
                <Row gap={S.sm} wrap>
                  {(Object.keys(REGION_LABELS) as Region[]).map((r) => {
                    const on = c.regions.includes(r);
                    return (
                      <Chip key={r} selected={on} onPress={() => toggleRegion(r)} color={on ? C.text : C.text2} bg={on ? C.purple : C.fill} icon={on ? <Icon name="check" variant="bold" size={14} color={C.text} /> : undefined} accessibilityLabel={REGION_LABELS[r]}>
                        {REGION_LABELS[r]}
                      </Chip>
                    );
                  })}
                </Row>
                {!c.regions.length ? <T v="footnote">None picked means anywhere in the US.</T> : null}
              </Section>
              <Section title="Dates">
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="body">{c.dates} shows</T>
                  <Row gap={S.sm}>
                    <IconBtn icon={<Icon name="minus" size={18} color={C.text} />} label="Fewer dates" onPress={() => setC({ ...c, dates: Math.max(5, c.dates - 1) })} />
                    <IconBtn icon={<Icon name="add" size={18} color={C.text} />} label="More dates" onPress={() => setC({ ...c, dates: Math.min(20, c.dates + 1) })} />
                  </Row>
                </Row>
              </Section>
              <Section title="Room size">
                <Segmented
                  label="Room size"
                  value={c.roomBand}
                  onChange={(v) => setC({ ...c, roomBand: v })}
                  options={[
                    { key: 'small', label: 'Small' },
                    { key: 'mid', label: 'Mid' },
                    { key: 'big', label: 'Big' },
                  ]}
                />
                <T v="footnote">Small is up to about 400, mid up to 1,500, big is theaters.</T>
              </Section>
              <Section title="First show on or after">
                <TextInput
                  value={c.startDate}
                  onChangeText={(t) => setC({ ...c, startDate: t })}
                  accessibilityLabel="Start date, year month day"
                  inputMode="numeric"
                  style={{ color: C.text, fontFamily: F.mono, fontSize: 17, backgroundColor: C.fill, borderRadius: 12, paddingHorizontal: S.md, minHeight: 44, outlineStyle: 'none' } as object}
                />
              </Section>
            </View>
          ) : null}
      </Sheet>

      <Sheet open={!!why} onClose={() => setWhy(null)} title={why ? RULE_LABEL[why.rule] : ''} subtitle="Why Gus flagged it">
          {why ? (
            <View style={{ gap: S.lg }}>
              <T v="gus">“{why.line}”</T>
              <T v="body">{why.why}</T>
              <Row gap={S.sm}>
                <Prov kind="qloo" />
                <Prov kind="gus" />
              </Row>
              {why.fix ? (
                <Btn
                  tone="scout"
                  size="lg"
                  full
                  onPress={() => {
                    const f = why.fix!;
                    setWhy(null);
                    act({ kind: 'fix', fix: f }, why.id);
                  }}
                >
                  {why.gain ? `Fix it (+${why.gain.toFixed(1)} Tour Score)` : 'Fix it'}
                </Btn>
              ) : (
                <T v="footnote">No fix makes the tour better here, so Gus isn't offering one. Swap or drop the stop by hand if you disagree.</T>
              )}
              <T v="caption">Roasts are rules in code (PRD 6.4). Every Fix is simulated first; Gus only writes the line. Gus roasts routes, not people.</T>
            </View>
          ) : null}
      </Sheet>

      <Sheet open={swapFor !== null} onClose={() => setSwapFor(null)} title={`Swap ${swapFor !== null ? (plan?.stops[swapFor]?.city ?? '') : ''}`} subtitle="Best-scoring cities not on the route">
          <View>
            <Group>
              {alternatives.map((m) => (
                <ListRow
                  key={m.id}
                  onPress={() => {
                    const i = swapFor!;
                    setSwapFor(null);
                    act({ kind: 'swap', stopIndex: i, metroId: m.id }, `swap-${i}`);
                  }}
                  title={`${m.name}, ${m.state}`}
                  trailing={<T style={{ fontFamily: F.monoBold, fontSize: 17, color: C.amber }}>{m.score?.toFixed(0)}</T>}
                />
              ))}
            </Group>
            {!alternatives.length ? <T v="footnote">No other scored cities in these regions.</T> : null}
          </View>
      </Sheet>

      {slug && roomFor !== null && plan ? (
        <RoomPicker
          slug={slug}
          stop={plan.stops[roomFor]}
          onClose={() => setRoomFor(null)}
          onPick={(roomId) => {
            const i = roomFor;
            setRoomFor(null);
            act({ kind: 'room', stopIndex: i, roomId }, `room-${i}`);
          }}
        />
      ) : null}

      {slug ? <PitchSheet slug={slug} target={pitch} onClose={() => setPitch(null)} /> : null}
    </View>
  );
}

const ROOM_LABEL: Record<RoomBand, string> = { small: 'Small', mid: 'Mid', big: 'Big' };

function MiniStat({ icon, value, label, color = C.text }: { icon: IconName; value: string; label: string; color?: string }) {
  return (
    <Row gap={S.sm}>
      <Icon name={icon} size={18} color={C.text2} />
      <T style={{ fontFamily: F.monoBold, fontSize: 17, color }}>{value}</T>
      <T v="footnote">{label}</T>
    </Row>
  );
}

const SEVERITY = (n: number) => (n >= 3 ? '#FF8A7A' : n === 2 ? '#FFB199' : C.warn);

function RoastCard({ r, busy, onFix, onWhy, onDismiss }: { r: Roast; busy: boolean; onFix?: () => void; onWhy: () => void; onDismiss: () => void }) {
  return (
    <FeatureCard tone="roast">
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Icon name="danger" variant="bold" size={16} color={SEVERITY(r.severity)} />
          <T v="eyebrow" color={SEVERITY(r.severity)}>
            {RULE_LABEL[r.rule]}
          </T>
        </Row>
        <IconBtn size={32} icon={<Icon name="close" size={18} color="rgba(255,255,255,0.6)" />} label={`Dismiss ${RULE_LABEL[r.rule]}`} onPress={onDismiss} tint="rgba(255,255,255,0.08)" />
      </Row>
      <T v="gus" style={{ fontSize: 22, lineHeight: 27 }}>
        “{r.line}”
      </T>
      <Row gap={S.sm}>
        {onFix ? (
          <Btn tone="scout" busy={busy} onPress={onFix} accessibilityLabel={`Fix: ${RULE_LABEL[r.rule]}${r.gain ? `, plus ${r.gain.toFixed(1)} Tour Score` : ''}`} icon={<Icon name="flash" variant="bold" size={16} color={C.text} />}>
            {r.gain ? `Fix it  +${r.gain.toFixed(1)}` : 'Fix it'}
          </Btn>
        ) : null}
        <Btn onPress={onWhy}>Why</Btn>
      </Row>
    </FeatureCard>
  );
}

function StopRow({
  s,
  i,
  last,
  expanded,
  proofRatio,
  signatures,
  busy,
  onToggle,
  onLock,
  onDrop,
  onSwap,
  onRoom,
  onPitch,
}: {
  s: TourStop;
  i: number;
  last: boolean;
  expanded: boolean;
  proofRatio: number | null;
  signatures: number;
  busy: string | null;
  onToggle: () => void;
  onLock: () => void;
  onDrop: () => void;
  onSwap: () => void;
  onRoom: () => void;
  onPitch: () => void;
}) {
  const strong = proofRatio !== null && proofRatio >= 1.5;
  const parts = s.score.parts;
  const weekend = ['friday', 'saturday'].includes(s.day);
  const longDrive = s.driveHoursFromPrev > 5;
  const scoreColor = s.score.total >= 60 ? C.good : s.score.total >= 40 ? C.amber : C.flame;
  const bar = (label: string, v: number, max: number, color: string) => (
    <Row key={label} gap={S.sm}>
      <T v="footnote" style={{ width: 84 }}>
        {label}
      </T>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.fill2 }}>
        <View style={{ height: '100%', width: `${Math.round((v / max) * 100)}%`, borderRadius: 3, backgroundColor: color }} />
      </View>
      <T v="monoSmall" style={{ width: 36, textAlign: 'right' }}>
        {v.toFixed(1)}
      </T>
    </Row>
  );
  const action = (icon: IconName, label: string, onPress: () => void, key: string, tint?: string) => (
    <Btn size="sm" busy={busy === key} onPress={onPress} icon={<Icon name={icon} size={16} color={tint ?? C.text} />} style={{ flexGrow: 1, flexBasis: '45%' }}>
      {label}
    </Btn>
  );
  return (
    <View>
      {i > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingLeft: S.lg + 22, height: 26 }} accessibilityLabel={`${s.driveHoursFromPrev.toFixed(1)} hour drive`}>
          <View style={{ position: 'absolute', left: S.lg + 21, top: 0, bottom: 0, width: 2, backgroundColor: longDrive ? C.flame : C.lineHi }} />
          <T v="monoSmall" color={longDrive ? C.flame : C.text3} style={{ marginLeft: S.md }}>
            {s.driveHoursFromPrev.toFixed(1)} h · {Math.round(s.driveKmFromPrev)} km
          </T>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Stop ${i + 1}: ${s.city} on ${s.day} ${s.date}, ${s.room?.name ?? 'no room'}, score ${s.score.total.toFixed(0)}`}
        onPress={onToggle}
        style={({ pressed }) => ({ backgroundColor: pressed ? C.fill2 : 'transparent' })}
      >
        <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, alignItems: 'center' }}>
          <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: weekend ? 'rgba(255,176,0,0.14)' : C.fill2, alignItems: 'center', justifyContent: 'center', borderWidth: s.locked ? 1.5 : 0, borderColor: C.purpleHi }}>
            <T style={{ fontFamily: F.monoBold, fontSize: 11, lineHeight: 13, color: weekend ? C.amber : C.text2 }}>{DAY3(s.day)}</T>
            <T style={{ fontFamily: F.monoBold, fontSize: 17, lineHeight: 20, color: C.text }}>{new Date(`${s.date}T12:00:00`).getDate()}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={6}>
              <T v="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                {s.city}, {s.state}
              </T>
              {s.locked ? <Icon name="lock" variant="bold" size={14} color={C.purpleHi} label="Locked" /> : null}
            </Row>
            <T v="footnote" numberOfLines={1}>
              {s.room ? `${s.room.name}${s.room.neighborhood ? ` · ${s.room.neighborhood}` : ''}` : 'No room picked'}
            </T>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2, minWidth: 40 }}>
            <T style={{ fontFamily: F.monoBold, fontSize: 18, color: scoreColor }}>{s.score.total.toFixed(0)}</T>
            {signatures ? (
              <Row gap={3}>
                <Icon name="signature" size={12} color={C.fans} />
                <T v="monoSmall" color={C.fans}>
                  {signatures}
                </T>
              </Row>
            ) : null}
          </View>
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} color={C.text3} />
        </View>
      </Pressable>
      {expanded ? (
        <View style={{ gap: S.md, paddingHorizontal: S.lg, paddingBottom: S.lg }}>
          {s.blurb ? (
            <T v="gus" style={{ fontSize: 17, lineHeight: 22 }} color={C.text2}>
              “{s.blurb}”
            </T>
          ) : null}
          <View style={{ gap: 6 }}>
            {bar('Wanted', parts.wanted, 40, C.heatHi)}
            {bar('Fan proof', parts.proof, 20, C.fans)}
            {bar('Room fit', parts.roomFit, 15, C.blue)}
            {bar('Open night', parts.openNight, 10, C.good)}
            {bar('Drive', parts.drive, 15, C.text2)}
          </View>
          <Row gap={6} wrap>
            <Prov kind="qloo" suffix={s.score.inputs.wantedScore !== null ? `Wanted ${s.score.inputs.wantedScore.toFixed(0)}` : undefined} />
            {s.score.inputs.proofRatio !== null ? <Prov kind="fans" suffix={`${s.score.inputs.proofRatio.toFixed(1)}× proof`} /> : null}
            {s.score.inputs.openThatNight === false ? <Chip color={C.bad}>Dark that night</Chip> : s.score.inputs.openThatNight === null ? <Chip>No hours on file</Chip> : <Chip color={C.good}>Open that night</Chip>}
          </Row>
          <Beam active={strong} radius={999}>
            <Btn tone="action" full onPress={onPitch} icon={<Icon name="mail" variant="bold" size={18} color={C.text} />} accessibilityLabel={`Pitch ${s.room?.name ?? s.city}`}>
              {s.room ? `Pitch ${s.room.name}` : 'Pitch a room'}
            </Btn>
          </Beam>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {action(s.locked ? 'unlock' : 'lock', s.locked ? 'Unlock' : 'Lock date', onLock, `lock-${i}`)}
            {action('swap', 'Swap city', onSwap, `swap-${i}`)}
            {action('building', 'Change room', onRoom, `room-${i}`)}
            {action('trash', 'Drop stop', onDrop, `drop-${i}`, C.bad)}
          </View>
        </View>
      ) : null}
      {!last ? null : <View style={{ height: S.xs }} />}
    </View>
  );
}

function RoomPicker({ slug, stop, onClose, onPick }: { slug: string; stop: TourStop; onClose: () => void; onPick: (id: string) => void }) {
  const { data } = useApi<CityData>(`/artist/${slug}/city/${stop.metroId}`);
  return (
    <Sheet open onClose={onClose} title={`Rooms in ${stop.city}`} subtitle={`For ${stop.day.charAt(0).toUpperCase()}${stop.day.slice(1)} ${fmtDate(stop.date)}`}>
        <View>
          {!data ? <GusWorking label="Pulling Qloo's rooms" style={{ alignSelf: 'flex-start' }} /> : null}
          {data ? (
            <Group>
              {data.rooms.map((r) => {
                const dark = r.closedDays?.includes(stop.day);
                const current = r.id === stop.room?.id;
                return (
                  <ListRow
                    key={r.id}
                    onPress={() => onPick(r.id)}
                    accessibilityLabel={`${r.name}${current ? ', current room' : ''}${dark ? `, dark on ${stop.day}` : ''}`}
                    title={r.name}
                    subtitle={[r.neighborhood, r.neighborhoodRank ? `#${r.neighborhoodRank} neighborhood` : null, r.sizeGuess ? `Gus thinks ${r.sizeGuess}` : null].filter(Boolean).join(' · ')}
                    trailing={current ? <Icon name="check" variant="bold" size={20} color={C.blue} /> : dark ? <Chip color={C.bad}>Dark {stop.day.slice(0, 3)}</Chip> : null}
                  />
                );
              })}
            </Group>
          ) : null}
        </View>
    </Sheet>
  );
}
