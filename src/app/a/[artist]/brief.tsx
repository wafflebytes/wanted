/** One reviewed operator brief, using Gus's durable preparation worker. Export only. */
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { briefSchema, briefWithDate, currentBriefRequest, type BriefResponse, type OperatorBrief } from '@/lib/operator-brief';
import { qualify } from '@/lib/operations';
import type { SoundEntity } from '@/lib/types';
import { money, showDate } from '@/lib/desk-copy';
import { api } from '@/ui/api';
import { useArtistSlug } from '@/ui/artist';
import { Btn, Card, Row } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { StatusBanner } from '@/ui/components/Paper';
import { T } from '@/ui/components/T';
import { C, F, R, S } from '@/ui/theme';

type CandidateInput = OperatorBrief['roster'][number];
const freshCandidate = (key: string): CandidateInput => ({ key, name: '', entity: null, format: 'music', inCircuit: null, liveSuitable: null, scale: null, fee: null, availability: 'unknown', routeHeld: false, source: '' });
const blank: OperatorBrief = { city: '', date: '', format: 'music', roomCapacity: 150, maxFee: 200, act: [], scene: [], sceneSource: '', roster: [freshCandidate('c1'), freshCandidate('c2')], consent: true };
export default function OperatorBriefScreen() {
  const slug = useArtistSlug();
  const inset = useSafeAreaInsets();
  const [data, setData] = useState<BriefResponse | null>(null);
  const [form, setForm] = useState<OperatorBrief>(blank);
  const [reviewed, setReviewed] = useState(false);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState<string | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const path = `/artist/${slug}/brief`;
  useEffect(() => {
    if (!slug) return;
    let canceled = false;
    api.get<BriefResponse>(path).then(r => { if (!canceled) { setData(r); if (r.brief) { setForm(r.brief); setEditing(false); } } }).catch(e => { if (!canceled) setError(e.message); }).finally(() => { if (!canceled) setBusy(null); });
    return () => { canceled = true; };
  }, [slug]);
  const change = <K extends keyof OperatorBrief>(key: K, value: OperatorBrief[K]) => { setForm(f => key === 'date' ? briefWithDate(f, String(value)) : ({ ...f, [key]: value })); setReviewed(false); setNotice(null); };
  const candidate = (index: number, patch: Partial<CandidateInput>) => { setForm(f => ({ ...f, roster: f.roster.map((c, i) => i === index ? { ...c, ...patch } : c) })); setReviewed(false); };
  const run = async (kind: 'save' | 'start' | 'pause' | 'reload' | 'export') => {
    if (!slug || pending.current) return;
    pending.current = true; setBusy(kind); setError(null); setNotice(null);
    try {
      if (kind === 'save') {
        if (!reviewed) throw new Error('Review the current facts and privacy check before saving.');
        const result = briefSchema.safeParse(form);
        if (!result.success) throw new Error(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).slice(0, 3).join('\n'));
        const r = await api.post<BriefResponse>(path, { kind, version: data?.desk?.opportunity.version ?? 0, brief: result.data });
        setData(r); if (r.brief) setForm(r.brief); setEditing(false); setReviewed(false);
        setNotice(r.saved === 'unchanged' ? 'Already saved. No duplicate revision or request.' : 'Your reviewed brief is saved. No message was sent.');
      } else if (kind === 'export') {
        const r = await api.post<{ markdown: string }>(path, { kind, version: data?.desk?.opportunity.version });
        await Clipboard.setStringAsync(r.markdown); setNotice('Preparation copied. Review it before using your own authorized sending tool. Nothing was sent.');
      } else {
        const r = kind === 'reload' ? await api.get<BriefResponse>(path) : await api.post<BriefResponse>(path, { kind, ...(kind === 'start' ? { version: data?.desk?.opportunity.version } : {}) });
        setData(r);
        if (kind === 'reload' && r.brief) { setForm(r.brief); setReviewed(false); }
      }
      if (kind !== 'export') scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) { setError(e instanceof Error ? e.message : 'The step did not finish. Reload before trying again.'); }
    finally { pending.current = false; setBusy(null); }
  };
  const desk = data?.desk;
  const task = data?.task;
  const request = desk ? currentBriefRequest(desk) : null;
  const missing = desk?.opportunity.roster.map(c => ({ c, q: qualify(c, desk.opportunity) }));
  const jobTitle = task?.state === 'paused' ? 'Gus is paused' : task?.state === 'failed' ? 'The check needs another try' : request ? 'Your request is ready to review' : task?.waitingFor === 'availability' ? 'Check who can make this date' : task?.waitingFor === 'choice' ? 'This bill needs your judgment' : task?.state === 'running' || task?.state === 'queued' ? 'Gus is checking the brief' : 'Missing facts stay missing';
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.canvas }}>
    <Head><title>Your show brief · Wanted</title></Head>
    <View style={{ paddingTop: inset.top + 8, paddingHorizontal: S.gutter, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T v="headline" accessibilityRole="header">Your show brief</T>
      <Btn tone="ghost" disabled={!!busy} onPress={() => router.replace(`/a/${slug}/desk`)}>Back</Btn>
    </View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: 640, alignSelf: 'center', padding: S.gutter, paddingBottom: inset.bottom + 60, gap: S.xl }}>
      <View style={{ gap: S.sm }}><T v="largeTitle">Your show. Your shortlist.</T><GusLine line="I can compare the bill and prepare the request. You supply the facts. I won’t invent availability or contact anyone." />
        <T v="footnote" color={C.amber}>Preparation sandbox under the demo act. Music acts only. No verified operator login, sending or payments. Inputs remain operator assertions.</T></View>
      {error && <StatusBanner tone="live" title="I couldn’t finish that step" body={error} />}
      {notice && <StatusBanner tone="good" title="Saved without sending" body={notice} />}
      {busy === 'load' && <T>Loading your saved brief…</T>}
      {!editing && desk ? <>
        <Card style={{ gap: S.md }}><T v="title2">{form.city} · revision {desk.opportunity.version}</T><T v="headline">{showDate(desk.opportunity.date, true)}</T><T>{money(desk.opportunity.maxFee)} support ceiling · {desk.opportunity.roomCapacity} room ceiling</T><T v="small">Sound: {desk.opportunity.act.map(e => e.name).join(', ')}</T><T v="small">Scene: {desk.opportunity.scene.map(e => e.name).join(', ')}</T><T v="footnote">Basis: {form.sceneSource}</T><Btn tone="ghost" disabled={!!busy} onPress={() => { setEditing(true); setReviewed(false); }}>Edit reviewed facts</Btn></Card>
        {task && <StatusBanner tone={request ? 'good' : 'live'} title={jobTitle} body={request ? 'Exact current terms prepared. Export is separate from delivery or approval.' : 'Gus works only from the supplied evidence. Correct the facts below, then resume. Provider failures and cultural ties do not become invented winners.'} />}
        {request && <Card style={{ gap: S.md }}><T v="label">Prepared request · not sent</T><T v="title">{request.payload.payee}</T><T v="headline">{showDate(request.payload.date, true)}</T><T v="title2">{money(request.payload.amount)}</T><T v="callout">{desk.pressure?.explanation}</T><T v="footnote">Taste fit is not ticket demand. Confirm written terms and the recipient before using any sending tool.</T></Card>}
        <View style={{ gap: S.md }}><T v="title2">Who is ready, and what’s missing?</T>{missing?.map(({ c, q }) => <Card key={c.id} style={{ gap: S.sm }}><T v="headline">{c.name}</T><T color={q.status === 'eligible' ? C.good : C.amber}>{q.status === 'eligible' ? 'Clears your stated constraints' : q.status === 'blocked' ? 'Does not clear your constraints' : 'Needs confirmation'}</T>{q.reasons.map(reason => <T key={reason} v="small">{reason}</T>)}{desk.pressure?.rows.find(r => r.id === c.id)?.actRank != null && <T v="small">Sound rank {desk.pressure.rows.find(r => r.id === c.id)?.actRank} · scene rank {desk.pressure.rows.find(r => r.id === c.id)?.sceneRank}</T>}</Card>)}</View>
        <Row wrap><Btn tone="action" busy={busy === 'start'} disabled={!!busy} onPress={() => run('start')}>{task?.state === 'paused' || task?.state === 'failed' ? 'Resume Gus' : task ? 'Recheck with Gus' : 'Let Gus compare my bill'}</Btn>{task && task.state !== 'paused' && <Btn disabled={!!busy} onPress={() => run('pause')}>Pause Gus</Btn>}</Row>
        <Btn disabled={!!busy} busy={busy === 'export'} onPress={() => run('export')}>{request ? 'Copy reviewed preparation' : 'Copy checks and missing facts'}</Btn>
        <Btn tone="ghost" disabled={!!busy} onPress={() => run('reload')}>Reload current record</Btn>
        {task?.execution && <View style={{ gap: S.sm }}><T v="label">Execution evidence</T><T v="footnote">{task.execution.engine === 'llm' ? `Model-directed · ${task.execution.models.join(', ')}${task.execution.cached ? ' · cached' : ''}` : 'Rules fallback, not a successful model run'}</T>{task.execution.steps.map((step, i) => <T key={i} v="footnote">{step.tool}: {step.ok ? 'accepted' : 'rejected'}</T>)}</View>}
      </> : <>
        <Card style={{ gap: S.lg }}><T v="title2">1. The show</T><Field label="City or circuit" value={form.city} onChange={v => change('city', v)} placeholder="Burlington, VT" /><Field label="Performance date" value={form.date} onChange={v => change('date', v)} placeholder="2026-11-21" /><Field label="Room capacity ceiling" value={String(form.roomCapacity)} numeric onChange={v => change('roomCapacity', numeric(v) ?? NaN)} /><Field label="Support budget ceiling, USD" value={String(form.maxFee)} numeric onChange={v => change('maxFee', numeric(v) ?? NaN)} /></Card>
        <Card style={{ gap: S.lg }}><T v="title2">2. Sound and scene</T><EntityPicker label="Your sound references" selected={form.act} path={path} disabled={!!busy} onChange={v => change('act', v)} /><EntityPicker label="Scene references" selected={form.scene} path={path} disabled={!!busy} onChange={v => change('scene', v)} /><Field label="Where did this scene context come from?" value={form.sceneSource} onChange={v => change('sceneSource', v)} placeholder="Redacted operator-curated reference list" /><T v="footnote">Only public act names and Qloo entity IDs go to Qloo. A scene reference is your stated context, not proof of local draw.</T></Card>
        <View style={{ gap: S.lg }}><T v="title2">3. Your supplied shortlist</T><T v="small">Unknown is a valid answer. Gus cannot turn it into a yes. Scale is your suitability ceiling, not Qloo-predicted ticket sales.</T>
          {form.roster.map((c, i) => <Card key={c.key} style={{ gap: S.lg }}><T v="headline">Candidate {i + 1}</T><Field label={`Candidate ${i + 1} public name`} value={c.name} onChange={v => candidate(i, { name: v, entity: null })} placeholder="An act you actually want to consider" /><EntityPicker label={`Candidate ${i + 1} Qloo match`} selected={c.entity ? [c.entity] : []} initialQuery={c.name} single path={path} disabled={!!busy} onChange={v => candidate(i, { entity: v[0] ?? null, ...(v[0] ? { name: v[0].name } : {}) })} />
            <Choice label="In your circuit?" value={c.inCircuit} onChange={v => candidate(i, { inCircuit: v })} /><Choice label="Suitable live act?" value={c.liveSuitable} onChange={v => candidate(i, { liveSuitable: v })} />
            <Field label="Suitable room ceiling, or blank if unknown" value={c.scale === null ? '' : String(c.scale)} numeric onChange={v => candidate(i, { scale: numeric(v) })} /><Field label="Support fee in USD, or blank if unknown" value={c.fee === null ? '' : String(c.fee)} numeric onChange={v => candidate(i, { fee: numeric(v) })} />
            <View style={{ gap: S.sm }}><T v="small">Availability for {form.date || 'the show date'}</T><Row wrap>{(['unknown', 'available', 'unavailable'] as const).map(v => <Btn key={v} tone={c.availability === v ? 'action' : 'ghost'} accessibilityState={{ selected: c.availability === v }} onPress={() => candidate(i, { availability: v })}>{v === 'unknown' ? 'Unknown' : v === 'available' ? 'Confirmed yes' : 'Confirmed no'}</Btn>)}</Row></View>
            <Check label="I hold an appropriate contact route privately" checked={c.routeHeld} onPress={() => candidate(i, { routeHeld: !c.routeHeld })} /><T v="footnote">No address or contact is shared. This is not authorization to send.</T><Field label="Redacted source for these assertions" value={c.source} onChange={v => candidate(i, { source: v })} placeholder="My reviewed notes, checked today" />
            {form.roster.length > 1 && <Btn tone="ghost" onPress={() => change('roster', form.roster.filter((_, n) => n !== i))}>Remove candidate</Btn>}</Card>)}
          {form.roster.length < 8 && <Btn onPress={() => change('roster', [...form.roster, freshCandidate(`c${Date.now()}`)])}>Add a candidate</Btn>}
        </View>
        <Card style={{ gap: S.md }}><T v="title2">4. Review before Gus works</T><T v="callout">I’m saving only the fields above, not a raw email, private contact, rider or payment details. These are my reviewed assertions, not independently verified facts. Changing a revision invalidates the earlier preparation.</T><Check label="I reviewed the current date and facts, removed private details, and may share this brief (or it is clearly labelled test evidence)" checked={reviewed} onPress={() => setReviewed(!reviewed)} /><Btn tone="action" full disabled={!reviewed || !!busy} busy={busy === 'save'} onPress={() => run('save')}>Save reviewed brief</Btn>{desk && <Btn tone="ghost" disabled={!!busy} onPress={() => { setEditing(false); setForm(data!.brief!); setReviewed(false); }}>Discard unsaved edits</Btn>}</Card>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
function numeric(value: string): number | null { return value.trim() === '' ? null : /^\d+(?:\.\d{0,2})?$/.test(value) ? Number(value) : NaN; }
function Field({ label, value, onChange, placeholder, numeric: numberInput }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; numeric?: boolean }) {
  const [raw, setRaw] = useState(value === 'NaN' ? '' : value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setRaw(value === 'NaN' ? '' : value); }, [value]);
  return <View style={{ gap: S.sm }}><T v="small">{label}</T><TextInput accessibilityLabel={label} value={raw} onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }} onChangeText={v => { setRaw(v); onChange(v); }} placeholder={placeholder} placeholderTextColor={C.text3} keyboardType={numberInput ? 'decimal-pad' : 'default'} autoCapitalize="none" style={{ minHeight: 50, padding: S.md, borderWidth: 1, borderColor: C.fill2, borderRadius: R.sm, color: C.text, backgroundColor: C.canvas, fontFamily: F.body, fontSize: 16 }} /></View>;
}
function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: S.md }}><View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: checked ? C.purpleHi : C.text3, backgroundColor: checked ? C.purpleHi : 'transparent', alignItems: 'center', justifyContent: 'center' }}><T v="footnote" color={C.canvas}>{checked ? '✓' : ''}</T></View><T v="callout" style={{ flex: 1 }}>{label}</T></Pressable>;
}
function Choice({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return <View style={{ gap: S.sm }}><T v="small">{label}</T><Row wrap>{([null, true, false] as const).map(v => <Btn key={String(v)} tone={value === v ? 'action' : 'ghost'} accessibilityLabel={`${label} ${v === null ? 'Unknown' : v ? 'Yes' : 'No'}`} accessibilityState={{ selected: value === v }} onPress={() => onChange(v)}>{v === null ? 'Unknown' : v ? 'Yes' : 'No'}</Btn>)}</Row></View>;
}
function EntityPicker({ label, selected, onChange, path, single, initialQuery = '', disabled }: { label: string; selected: SoundEntity[]; onChange: (e: SoundEntity[]) => void; path: string; single?: boolean; initialQuery?: string; disabled: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [matches, setMatches] = useState<(SoundEntity & { description?: string | null; disambiguation?: string | null })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (initialQuery) { setQuery(initialQuery); setMatches([]); } }, [initialQuery]);
  const search = async () => {
    if (busy || disabled) return;
    setBusy(true); setError(null); setMatches([]);
    try { const r = await api.post<{ matches: typeof matches }>(path, { kind: 'search', query }); setMatches(r.matches); if (!r.matches.length) setError('No match. Keep this candidate unresolved rather than choosing another act.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Search did not finish.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: S.sm }}><T v="headline">{label}</T>{selected.map(e => <Row key={e.id} wrap><T v="callout" color={C.purpleHi}>{e.name}</T><Btn tone="ghost" disabled={disabled} accessibilityLabel={`Remove ${e.name} from ${label}`} onPress={() => onChange(selected.filter(s => s.id !== e.id))}>Remove</Btn></Row>)}
    {(!single || !selected.length) && <><Field label={`Search ${label}`} value={query} onChange={v => { setQuery(v); setMatches([]); }} placeholder="Public artist name" /><Btn disabled={disabled || query.trim().length < 2 || (!single && selected.length >= 5)} busy={busy} onPress={search}>Search Qloo</Btn>{matches.map(e => <View key={e.id} style={{ gap: S.xs, paddingVertical: S.sm }}><T v="headline">{e.name}</T>{(e.disambiguation || e.description) && <T v="footnote">{e.disambiguation || e.description}</T>}<Btn disabled={disabled || selected.some(s => s.id === e.id)} onPress={() => { onChange(single ? [{ id: e.id, name: e.name }] : [...selected, { id: e.id, name: e.name }]); setMatches([]); setQuery(''); }}>Use {e.name}</Btn></View>)}</>}{error && <T v="footnote" color={C.amber}>{error}</T>}
  </View>;
}
