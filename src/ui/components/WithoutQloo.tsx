/**
 * "Without Qloo", measured (FR-30; PRD 4.3, 4.4 move 1). The same question goes to a generic
 * LLM with the same inputs; every claim it makes is checked live against Qloo. Red means
 * Qloo's data contradicts it; amber means nothing backs it up. Then the map goes dark: the
 * cold start every fan-demand app faces on day one.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Region } from '@/lib/regions';
import { api } from '../api';
import { C, F } from '../theme';
import { Card, Chip, Row } from './core';
import { GusLine } from './Gus';
import { Prov } from './Receipts';
import { T } from './T';
import type { Receipt } from '@/lib/types';
import { Icon } from '@/ui/icons/Icon';

type Mark = { ok: boolean; level?: 'ok' | 'unverified' | 'wrong'; reason: string };
type Report = {
  inputs: { act: string; references: string[]; region: string; focusCity: string; focusDay: string; roomBand: string };
  llm: { cities: string[]; neighborhoods: string[]; rooms: string[]; model: string; promptVersion: string; samples: unknown[] };
  cities: { name: string; wantedRank: number | null; inWantedTop15: boolean; sleeper: boolean; mark: Mark }[];
  missedSleepers: { name: string; liftRank: number | null }[];
  overlapTop15: number;
  neighborhoods: { name: string; qlooRank: number | null; mark: Mark }[];
  rooms: { name: string; found: string | null; address: string | null; mark: Mark }[];
  wanted: { top15: { name: string; state: string; score: number | null; sleeper: boolean }[]; neighborhoods: string[]; rooms: { name: string; neighborhood: string | null; closedDays: string[] | null }[] };
  errorRate: { rooms: number | null; neighborhoods: number | null };
  unverifiedRate?: { rooms: number | null; neighborhoods: number | null; cities: number | null };
  receipts: Receipt[];
};

const cache = new Map<string, Report>();

function MarkIcon({ m }: { m: Mark }) {
  const level = m.level ?? (m.ok ? 'ok' : 'wrong');
  const color = level === 'ok' ? C.good : level === 'wrong' ? C.bad : C.warn;
  return (
    <View style={{ paddingTop: 1 }}>
      <Icon name={level === 'ok' ? 'check' : level === 'wrong' ? 'close' : 'info'} variant="bold" size={17} color={color} label={level === 'ok' ? 'Checks out' : level === 'wrong' ? 'Wrong' : 'Unverified'} />
    </View>
  );
}

function Claim({ name, m }: { name: string; m: Mark }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <MarkIcon m={m} />
      <View style={{ flex: 1 }}>
        <T v="body" style={{ fontSize: 14 }}>
          {name}
        </T>
        <T v="caption" color={(m.level ?? (m.ok ? 'ok' : 'wrong')) === 'wrong' ? '#ff8a80' : C.text3}>
          {m.reason}
        </T>
      </View>
    </View>
  );
}

export function WithoutQlooPanel({ slug, focusCity, regions, wide }: { slug: string; focusCity: string; regions: Region[]; wide: boolean }) {
  const key = `${slug}|${focusCity}|${regions.join()}`;
  const [r, setR] = useState<Report | null>(cache.get(key) ?? null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (cache.has(key)) return setR(cache.get(key)!);
    let live = true;
    setR(null);
    setErr(null);
    api
      .post<Report>(`/artist/${slug}/without-qloo`, { focusCity, regions, focusDay: 'tuesday' })
      .then((x) => {
        cache.set(key, x);
        if (live) setR(x);
      })
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [key, slug, focusCity, regions]);

  if (err) return <T color={C.bad}>{err}</T>;
  if (!r) return <GusLine line={null} thinking="Asking a generic LLM the same question, then checking every answer against Qloo…" orb="searching" />;

  const wrongRooms = r.rooms.filter((x) => x.mark.level === 'wrong').length;
  const llmCol = (
    <Card style={{ flex: 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label" color="#ff8a80">
          Generic LLM
        </T>
        <Chip mono>{r.llm.model.split('/').pop()?.replace(':free', '')}</Chip>
      </Row>
      <T v="caption">Same inputs, no taste data. Majority answer of 3 samples at temperature 0.</T>
      <T v="label">Cities</T>
      {r.cities.slice(0, 8).map((c) => (
        <Claim key={c.name} name={c.name} m={c.mark} />
      ))}
      <T v="label">Neighborhoods in {r.inputs.focusCity}</T>
      {r.neighborhoods.map((n) => (
        <Claim key={n.name} name={n.name} m={n.mark} />
      ))}
      <T v="label">Rooms for a {r.inputs.focusDay} show</T>
      {r.rooms.map((x) => (
        <Claim key={x.name} name={x.name} m={x.mark} />
      ))}
    </Card>
  );
  const wantedCol = (
    <Card style={{ flex: 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label" color={C.amber}>
          Wanted (Qloo)
        </T>
        <Prov kind="qloo" receipts={r.receipts} title="The checks behind this comparison" />
      </Row>
      <T v="caption">Ranked from Qloo’s taste graph, heat plus lift over a 20-act baseline.</T>
      <T v="label">Top cities</T>
      {r.wanted.top15.slice(0, 8).map((c, i) => (
        <Row key={c.name} gap={8}>
          <T style={{ fontFamily: F.monoBold, color: C.amber, width: 22 }}>{i + 1}</T>
          <T v="body" style={{ flex: 1, fontSize: 14 }}>
            {c.name}, {c.state}
          </T>
          {c.sleeper ? <Icon name="star" variant="bold" size={14} color={C.gold} label="Sleeper city" /> : null}
        </Row>
      ))}
      <T v="label">Neighborhoods in {r.inputs.focusCity}</T>
      {r.wanted.neighborhoods.map((n, i) => (
        <Row key={n} gap={8}>
          <T style={{ fontFamily: F.monoBold, color: C.amber, width: 22 }}>{i + 1}</T>
          <T v="body" style={{ fontSize: 14 }}>
            {n}
          </T>
        </Row>
      ))}
      <T v="label">Rooms</T>
      {r.wanted.rooms.map((x) => (
        <View key={x.name}>
          <T v="body" style={{ fontSize: 14 }}>
            {x.name}
          </T>
          <T v="caption">{[x.neighborhood, x.closedDays?.length ? `dark ${x.closedDays.map((d) => d.slice(0, 3)).join(', ')}` : null].filter(Boolean).join(' · ') || ' '}</T>
        </View>
      ))}
    </Card>
  );
  return (
    <View style={{ gap: 12 }}>
      <Row gap={8} wrap>
        <Chip mono color={C.text}>
          {r.overlapTop15}/{r.cities.length} cities in Wanted’s top 15
        </Chip>
        <Chip mono color={C.gold} bg="rgba(245,197,66,0.12)">
          missed {r.missedSleepers.length} sleeper cities
        </Chip>
        <Chip mono color={wrongRooms ? '#ff8a80' : C.text2} bg={wrongRooms ? 'rgba(255,69,58,0.14)' : undefined}>
          {wrongRooms}/{r.rooms.length} rooms contradicted by Qloo
        </Chip>
      </Row>
      {r.missedSleepers.length ? <T v="small">Missed: {r.missedSleepers.slice(0, 6).map((s) => s.name).join(', ')}.</T> : null}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
        {llmCol}
        {wantedCol}
      </View>
      <Row gap={12} wrap>
        <Row gap={4}>
          <Icon name="check" variant="bold" size={13} color={C.good} />
          <T v="caption">checks out</T>
        </Row>
        <Row gap={4}>
          <Icon name="info" variant="bold" size={13} color={C.warn} />
          <T v="caption">no evidence behind it</T>
        </Row>
        <Row gap={4}>
          <Icon name="close" variant="bold" size={13} color={C.bad} />
          <T v="caption">Qloo’s data contradicts it</T>
        </Row>
        <T v="caption">Every check is a live Qloo call; tap the receipt.</T>
      </Row>
    </View>
  );
}
