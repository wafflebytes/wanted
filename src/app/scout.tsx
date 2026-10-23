/**
 * Scout (FR-1 to FR-3; PRD 2 scene 1): say who you sound like, confirm the acts (always a
 * confirm sheet, because fuzzy search can pick the wrong act), then watch Gus read the taste
 * graph. The ~6 s country call plays as theater with real progress steps, never a bare spinner.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSegmentedControl, GlassSegmentedControlItem } from '@/components/glassyui/glass-segmented-control';
import type { Region } from '@/lib/regions';
import type { ActEntity, RoomBand } from '@/lib/types';
import { api, ApiError, streamNdjson } from '@/ui/api';
import { Btn, Card, Chip, FeatureCard, Row } from '@/ui/components/core';
import { Prov } from '@/ui/components/Receipts';
import { T } from '@/ui/components/T';
import { useListen } from '@/ui/agent/listen';
import { GusSticker, GusWorking, VoiceBars } from '@/ui/components/Gus';
import { SheetButton } from '@/ui/components/Sheet';
import { Beam } from '@/ui/fx/Beam';
import { VoiceGlow } from '@/ui/fx/VoiceGlow';
import { haptic } from '@/ui/haptics';
import { prime } from '@/ui/hooks';
import { defaultStart, session } from '@/ui/session';
import { C, F, IMAGES, R, S } from '@/ui/theme';
import { Icon } from '@/ui/icons/Icon';

type Lookup = { role: 'self' | 'reference'; name: string; candidates: ActEntity[]; receipts: never[] };
type Resolved = {
  ask: { self: string | null; references: string[]; kind: 'music' | 'comedy'; regions: Region[]; dates: number | null; roomBand: RoomBand | null; homeBase: string | null; source: 'llm' | 'rules' } | null;
  kind: 'music' | 'comedy';
  lookups: Lookup[];
};
type Event =
  | { type: 'progress'; text: string }
  | { type: 'tool'; tool: string; text: string }
  | { type: 'line'; text: string }
  | { type: 'error'; error: string }
  | {
      type: 'result';
      artist: { id: string; slug: string; name: string };
      line: string;
      model: string;
      picks: { metroId: string; name: string; state: string; reason: string; sleeper: boolean }[];
      notices: string[];
      map: unknown;
    };

const PRESETS: Record<string, { text: string; kind: 'music' | 'comedy' }> = {
  hiphop: { text: 'I sound like Little Simz and JID. Twelve dates, small rooms.', kind: 'music' },
  standup: { text: 'I do stand-up like John Mulaney and Taylor Tomlinson. Eight dates, West and Midwest.', kind: 'comedy' },
  maya: { text: 'I sound like Phoebe Bridgers and Japanese Breakfast. Ten dates, Midwest and East Coast, small rooms.', kind: 'music' },
};

const STEPS = ['Asking Qloo where your people are', 'Comparing with 20 other acts', 'Finding sleeper cities'];

export default function Scout() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ preset?: string }>();
  const preset = params.preset ? PRESETS[params.preset] : null;
  const [text, setText] = useState(preset?.text ?? '');
  // Say it instead of typing it: the transcript fills the box live; a pause ends the take.
  const listen = useListen({ onPartial: setText, onFinal: setText });
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'music' | 'comedy'>(preset?.kind ?? 'music');
  const [band, setBand] = useState<RoomBand>('small');
  const [phase, setPhase] = useState<'ask' | 'confirm' | 'run'>('ask');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [chosen, setChosen] = useState<Record<number, string | null>>({});
  const [progress, setProgress] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [line, setLine] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const resolve = async () => {
    if (!text.trim() && !name.trim()) return setErr('Name at least one act you sound like.');
    setErr(null);
    setBusy(true);
    try {
      const r = await api.post<Resolved>('/scout/resolve', { text: text.trim() || `I sound like ${name}`, kind, self: name.trim() || null });
      if (!r.lookups.length) throw new ApiError(400, "Gus couldn't find an act name in that. Try “I sound like Phoebe Bridgers and Japanese Breakfast.”");
      setResolved(r);
      setKind(r.kind);
      if (r.ask?.roomBand) setBand(r.ask.roomBand);
      // Preselect the top candidate for each act; the user still confirms.
      setChosen(Object.fromEntries(r.lookups.map((l, i) => [i, l.candidates[0]?.id ?? null])));
      setPhase('confirm');
      haptic.tick();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something broke. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!resolved) return;
    const picked = resolved.lookups
      .map((l, i) => ({ role: l.role, entity: l.candidates.find((c) => c.id === chosen[i]) }))
      .filter((p): p is { role: 'self' | 'reference'; entity: ActEntity } => !!p.entity);
    if (!picked.length) return setErr('Confirm at least one act.');
    const self = picked.find((p) => p.role === 'self')?.entity ?? null;
    const refs = picked.filter((p) => p.role === 'reference').map((p) => p.entity);
    setErr(null);
    setPhase('run');
    setProgress([]);
    setTools([]);
    setLine(null);
    haptic.tap();
    const ctl = new AbortController();
    abort.current = ctl;
    let done = false;
    try {
      await streamNdjson<Event>(
        '/scout/run',
        {
          artistName: name.trim() || self?.name || `Act like ${refs.map((r) => r.name).join(' + ')}`,
          self: self ? { id: self.id, name: self.name } : null,
          refs: refs.map((r) => ({ id: r.id, name: r.name })),
          kind,
          text,
          roomBand: band,
          homeBase: resolved.ask?.homeBase ?? null,
        },
        (e) => {
          if (e.type === 'progress') {
            setProgress((p) => (p.includes(e.text) ? p : [...p, e.text]));
            haptic.tick();
          } else if (e.type === 'tool') setTools((t) => [...t.slice(-5), e.text]);
          else if (e.type === 'line') setLine(e.text);
          else if (e.type === 'error') throw new ApiError(500, e.error);
          else if (e.type === 'result') {
            done = true;
            const slug = e.artist.slug;
            prime(`/artist/${slug}/map`, e.map);
            session.setScout(slug, { line: e.line, model: e.model, picks: e.picks, at: Date.now() });
            const ask = resolved.ask;
            session.setConstraints(slug, {
              regions: ask?.regions ?? [],
              dates: ask?.dates ?? 10,
              roomBand: band,
              homeBase: ask?.homeBase ?? null,
              startDate: defaultStart(),
            });
            session.setLastArtist(slug);
            haptic.success();
            setTimeout(() => router.replace(`/a/${slug}`), 900);
          }
        },
        ctl.signal,
      );
      if (!done) throw new ApiError(500, 'Scout ended early. Try again.');
    } catch (e) {
      if (ctl.signal.aborted) return;
      setErr(e instanceof Error ? e.message : 'Scout failed.');
      setPhase('confirm');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>Scout · Wanted</title>
      </Head>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 18, maxWidth: 680, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <T v="eyebrow" color={C.purpleHi}>
            Scout
          </T>
          <SheetButton icon="close" label="Close Scout" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </Row>

        {phase === 'ask' ? (
          <>
            <Row gap={S.sm} style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1, gap: S.xs }}>
                <T v="largeTitle">Who do you sound like?</T>
                <T v="callout" color={C.text2}>
                  Say it or type it: 1 to 3 acts, plus dates, regions and room size if you like. Gus parses the rest.
                </T>
              </View>
              <GusSticker mood={listen.listening ? 'wave' : 'thinking'} size={104} tilt={3} style={{ marginBottom: -S.xl, marginRight: -S.sm }} />
            </Row>
            <VoiceGlow active={listen.listening} stream={listen.stream} radius={24}>
              <View style={{ backgroundColor: C.cardHi, borderRadius: 24, borderCurve: 'continuous', padding: S.lg, paddingBottom: 64, minHeight: 156, borderWidth: 1, borderColor: listen.listening ? 'rgba(255,176,0,0.5)' : 'rgba(255,255,255,0.08)' }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="I sound like Phoebe Bridgers and Japanese Breakfast. Ten dates, Midwest and East Coast, small rooms."
                  placeholderTextColor={C.text3}
                  multiline
                  accessibilityLabel="Describe your sound and tour"
                  style={{ color: C.text, fontFamily: F.serif, fontSize: 22, lineHeight: 28, minHeight: 84, outlineStyle: 'none' } as object}
                />
                <View style={{ position: 'absolute', left: S.lg, right: S.md, bottom: S.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T v="footnote" color={listen.listening ? C.amber : C.text3}>
                    {listen.listening ? 'Listening… pause when you’re done' : listen.supported ? 'Tap the mic and talk' : 'Use the keyboard’s mic to dictate'}
                  </T>
                  {listen.supported ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={listen.listening ? 'Stop dictation' : 'Dictate'} onPress={() => (listen.listening ? listen.stop() : listen.start())} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: listen.listening ? C.amber : C.purple }}>
                        {listen.listening ? <VoiceBars active color="#1A120B" height={16} /> : <Icon name="mic" variant="bold" size={22} color={C.text} />}
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </VoiceGlow>
            <View style={{ gap: 6 }}>
              <T v="label">Your act's name (optional)</T>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Maya Ortiz"
                placeholderTextColor={C.text3}
                accessibilityLabel="Your act's name"
                style={{ color: C.text, fontFamily: F.body, fontSize: 16, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, outlineStyle: 'none' } as object}
              />
              <T v="caption">If Qloo knows you, your own taste signal leads; reference acts fill in when your data is thin.</T>
            </View>
            <View style={{ gap: S.sm }}>
              <GlassSegmentedControl value={kind} onValueChange={(v) => setKind(v as 'music' | 'comedy')} accessibilityLabel="Kind of act" style={{ alignSelf: 'stretch' }}>
                <GlassSegmentedControlItem value="music">Music</GlassSegmentedControlItem>
                <GlassSegmentedControlItem value="comedy">Comedy</GlassSegmentedControlItem>
              </GlassSegmentedControl>
              <GlassSegmentedControl value={band} onValueChange={(v) => setBand(v as RoomBand)} accessibilityLabel="Room size" style={{ alignSelf: 'stretch' }}>
                <GlassSegmentedControlItem value="small">Small rooms</GlassSegmentedControlItem>
                <GlassSegmentedControlItem value="mid">Mid-size</GlassSegmentedControlItem>
                <GlassSegmentedControlItem value="big">Theaters</GlassSegmentedControlItem>
              </GlassSegmentedControl>
            </View>
            <Row gap={8} wrap>
              {Object.entries(PRESETS).map(([k, p]) => (
                <Chip key={k} onPress={() => (setText(p.text), setKind(p.kind))}>
                  {k === 'maya' ? 'Indie folk-pop' : k === 'hiphop' ? 'Hip-hop' : 'Stand-up'}
                </Chip>
              ))}
            </Row>
            {err ? <T color={C.bad}>{err}</T> : null}
            <Btn tone="scout" size="lg" full busy={busy} onPress={resolve}>
              Find my acts
            </Btn>
          </>
        ) : null}

        {phase === 'confirm' && resolved ? (
          <>
            <T v="title">Is this you?</T>
            <T v="small">Qloo’s search is fuzzy, so confirm each act. Wrong one? Pick another, or skip it.</T>
            {resolved.ask ? (
              <Row gap={6} wrap>
                {resolved.ask.dates ? <Chip mono>{resolved.ask.dates} dates</Chip> : null}
                {resolved.ask.regions.map((r) => (
                  <Chip mono key={r}>
                    {r}
                  </Chip>
                ))}
                {resolved.ask.roomBand ? <Chip mono>{resolved.ask.roomBand} rooms</Chip> : null}
                <Chip mono color={C.text3}>
                  parsed by {resolved.ask.source === 'llm' ? 'Gus' : 'rules'}
                </Chip>
              </Row>
            ) : null}
            {resolved.lookups.map((l, i) => (
              <View key={`${l.name}-${i}`} style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="label">
                    {l.role === 'self' ? 'You' : 'Sounds like'} · “{l.name}”
                  </T>
                  <Prov kind="qloo" receipts={l.receipts} title={`Qloo search for “${l.name}”`} />
                </Row>
                {l.candidates.length === 0 ? <T v="small">Qloo has nobody by that name. This one will be skipped.</T> : null}
                {l.candidates.slice(0, 4).map((c) => {
                  const on = chosen[i] === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${c.name}${c.disambiguation ? `, ${c.disambiguation}` : ''}`}
                      onPress={() => {
                        haptic.tick();
                        setChosen((s) => ({ ...s, [i]: on ? null : c.id }));
                      }}
                    >
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: on ? 'rgba(155,48,224,0.18)' : C.card, borderWidth: 1.5, borderColor: on ? C.purple : 'transparent' }}>
                        {c.image ? <Image source={{ uri: c.image }} style={{ width: 52, height: 52, borderRadius: 12 }} contentFit="cover" /> : <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.cardHi }} />}
                        <View style={{ flex: 1, gap: 2 }}>
                          <T v="head" style={{ fontSize: 16 }} numberOfLines={1}>
                            {c.name}
                          </T>
                          <T v="caption" numberOfLines={2}>
                            {[c.type === 'person' ? 'Person' : 'Artist', c.disambiguation && c.disambiguation !== c.name ? c.disambiguation : null, c.genres.slice(0, 2).join(', ') || null].filter(Boolean).join(' · ')}
                          </T>
                          {c.description ? (
                            <T v="caption" numberOfLines={2} color={C.text2}>
                              {c.description}
                            </T>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <T v="monoSmall">pop {c.popularity.toFixed(2)}</T>
                          <Icon name="check" variant={on ? 'bold' : 'linear'} size={20} color={on ? C.purpleHi : C.text3} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {err ? <T color={C.bad}>{err}</T> : null}
            <Row gap={10}>
              <Btn tone="ghost" onPress={() => setPhase('ask')}>
                Back
              </Btn>
              <Btn tone="scout" size="lg" style={{ flex: 1 }} full onPress={run} disabled={!Object.values(chosen).some(Boolean)}>
                Scout it
              </Btn>
            </Row>
          </>
        ) : null}

        {phase === 'run' ? (
          <View style={{ gap: 18 }}>
            <View style={{ alignItems: 'center', gap: S.md }}>
              <Image source={IMAGES['gus-loading']} style={{ width: 300, height: 250 }} contentFit="contain" accessibilityLabel="Gus tracing the route on the van's hood" />
              <GusWorking label={progress.length && !line ? progress[progress.length - 1] : line ? 'Done. Here’s your crowd.' : 'Reading the taste graph'} step={tools.length ? tools[tools.length - 1] : null} />
            </View>
            <T v="gus" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
              {line ? `“${line}”` : ''}
            </T>
            <FeatureCard tone="stage" style={{ gap: S.sm }}>
              {STEPS.map((s, i) => {
                const done = progress.includes(s) && (progress.indexOf(s) < progress.length - 1 || !!line);
                const active = progress.includes(s) && !done;
                const row = (
                  <Row gap={10} style={{ minHeight: 44, paddingHorizontal: S.sm, borderRadius: 14, backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                    <View style={{ width: 22 }}>
                      <Icon name={done ? 'check' : active ? 'radar' : 'clock'} variant={done ? 'bold' : 'linear'} size={18} color={done ? C.good : active ? C.amber : C.text3} />
                    </View>
                    <T v="body" color={done || active ? C.text : C.text3} style={{ flex: 1 }}>
                      {s}
                    </T>
                  </Row>
                );
                return active ? (
                  <Beam key={s} variant="heat" radius={14} size="sm">
                    {row}
                  </Beam>
                ) : (
                  <View key={s}>{row}</View>
                );
              })}
            </FeatureCard>
            {tools.length ? (
              <View style={{ gap: 4 }}>
                <T v="label">Gus’s tool calls</T>
                {tools.map((t, i) => (
                  <T key={`${t}-${i}`} v="monoSmall">
                    → {t}
                  </T>
                ))}
              </View>
            ) : null}
            {err ? <T color={C.bad}>{err}</T> : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
