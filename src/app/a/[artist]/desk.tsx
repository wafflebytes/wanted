/** One artist decision at a time. Technical proof is available, not the main reading task. */
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSegmentedControl, GlassSegmentedControlItem } from '@/components/glassyui/glass-segmented-control';
import { billSummary, comparisonRule, eventSummary, money, requestFocus, requestSummary, sensitivitySummary, showDate } from '@/lib/desk-copy';
import { taskSummary, type AgentTask } from '@/lib/agent-task';
import type { BookingAction, Candidate, Desk, OperationEvent, PressureRow, SensitivityReport } from '@/lib/operations';
import { addDays } from '@/lib/tour';
import { reviewReplyPatch } from '@/lib/booking-reply';
import { ReplyReview, useReplyReview } from '@/ui/booking/ReplyReview';
import { api } from '@/ui/api';
import { useArtistSlug } from '@/ui/artist';
import { Btn, Card, Chip, Row, Section } from '@/ui/components/core';
import { GusLine, GusSticker } from '@/ui/components/Gus';
import { StatusBanner } from '@/ui/components/Paper';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { prime, useApi } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { C, F, R, S } from '@/ui/theme';

type DeskResponse = { task?: AgentTask | null; desk: Desk | null; sensitivity: SensitivityReport | null; hashes: Record<string, string>; reply?: { duplicate: boolean; noChange?: boolean; version: number } | null };
type Pane = 'bill' | 'request' | 'trail';
const ACT = C.purpleHi;
const SCENE = C.amber;

export default function BookingDesk() {
  const slug = useArtistSlug();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const path = slug ? `/artist/${slug}/desk` : null;
  const { data, error, setData, loading, reload } = useApi<DeskResponse>(path);
  const [pane, setPane] = useState<Pane>('bill');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [boundary, setBoundary] = useState(false);
  const [why, setWhy] = useState(false);
  const [others, setOthers] = useState(true);
  const [practice, setPractice] = useState(false);
  const [technical, setTechnical] = useState(false);
  const [history, setHistory] = useState(false);
  const [confirmation, setConfirmation] = useState<'cancel' | 'reset' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<Record<string, unknown> | null>(null);
  const replyReview = useReplyReview();
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const desk = data?.desk;
  const show = desk?.opportunity;
  const task = data?.task;
  const pressure = desk?.pressure;
  const selected = pressure?.rows.find((r) => r.id === pressure.selectedId);
  const selectedCandidate = show?.roster.find((c) => c.id === selected?.id);
  const focus = desk ? requestFocus(desk, requestId) : null;
  const bridgeAction = desk?.actions.find((a) => a.version === show?.version && a.candidateId === selected?.id && a.state !== 'invalidated');
  const recheck = show?.roster.some((c) => c.availability?.value.date !== show.date);
  const summary = desk ? billSummary(desk) : { title: 'Who’s on the bill?', body: 'Find someone who fits your sound and the scene you’re playing.' };
  const latestChange = desk?.events.find((e) => e.kind === 'reply' && e.version === show?.version && e.change);
  const sens = data?.sensitivity;
  useEffect(() => { if (pressure) setOthers(false); }, [pressure?.observedAt]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [pane, show?.version, focus?.state, pressure?.observedAt, replyReview.open, replyReview.stage]);
  const changePane = (next: Pane) => { haptic.tick(); setPane(next); setFailed(null); };
  const run = async (key: string, payload: Record<string, unknown>, next?: Pane) => {
    if (!slug || !path || pending.current || needsRefresh) return;
    pending.current = true; setBusy(key); setFailed(null); setReplyNotice(null);
    try {
      const response = await api.post<DeskResponse>(`/artist/${slug}/desk`, payload);
      setData(response); prime(path, response); haptic.success();
      if (payload.kind === 'agent-start' || payload.kind === 'agent-resume') { setRequestId(response.task?.actionId ?? null); if (response.task?.waitingFor === 'approval' || response.task?.waitingFor === 'save') setPane('request'); }
      if (payload.kind === 'prepare') setRequestId(response.desk?.actions.find((a) => a.candidateId === payload.candidateId && a.version === payload.version)?.id ?? null);
      if (next) setPane(next);
      if (payload.kind === 'reset') { setRequestId(null); setLastReply(null); setWhy(false); setOthers(false); setHistory(false); setPractice(false); setTechnical(false); }
      setConfirmation(null);
      return response;
    } catch (e) { setFailed(friendlyError(e instanceof Error ? e.message : '')); setNeedsRefresh(true); replyReview.setChecked(false); }
    finally { pending.current = false; setBusy(null); }
  };
  const refreshShow = async () => {
    if (!path || pending.current) return;
    pending.current = true; setBusy('refresh');
    try {
      const current = await reload();
      if (!current) return;
      setFailed(null); setNeedsRefresh(false);
      replyReview.setChecked(false);
      // Keep the local excerpt. A changed version triggers the existing rebase review.
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) { setFailed(friendlyError(e instanceof Error ? e.message : '')); }
    finally { pending.current = false; setBusy(null); }
  };
  const prepare = (candidateId: string) => show && run(`prepare:${candidateId}`, { kind: 'prepare', candidateId, version: show.version }, 'request');
  const approve = (action: BookingAction) => run(`approve:${action.id}`, { kind: 'approve', actionId: action.id, version: action.version, payloadHash: data!.hashes[action.id], yes: true }, 'request');
  const execute = (action: BookingAction, lose = false) => run(`execute:${action.id}`, { kind: 'execute', actionId: action.id, token: action.approval?.token ?? 'reconcile', loseAcknowledgment: lose }, 'request');
  const reply = (patch: Record<string, unknown>, kind: string) => {
    if (!show) return;
    const payload = { kind: 'reply', sourceMessageId: `fixture:${show.id}:v${show.version}:${kind}`, contactId: `fixture-booker:${show.id}`, version: show.version, patch };
    setLastReply(payload); run(`reply:${kind}`, payload, 'request');
  };
  const deskPrimary = !desk
    ? { label: 'Find my bill', go: () => run('init', { kind: 'init' }) }
    : pane === 'bill'
      ? show!.status === 'canceled'
        ? { label: 'See what changed', go: () => changePane('trail') }
        : recheck
          ? { label: 'Check the new date', go: () => run('reconfirm', { kind: 'reconfirm', version: show!.version }, 'bill') }
          : !pressure
            ? { label: 'Let Gus handle the bill', go: () => run('agent-start', { kind: 'agent-start', version: show!.version }) }
            : selected
              ? bridgeAction
                ? { label: 'Review the request', go: () => { setRequestId(bridgeAction.id); changePane('request'); } }
                : { label: `Write to ${selected.name}`, go: () => prepare(selected.id) }
              : { label: 'Review the options', go: () => { setOthers(true); setWhy(true); } }
      : pane === 'request' && focus?.state === 'uncertain'
        ? { label: 'Check the original receipt', go: () => execute(focus) }
        : pane === 'request' && focus?.version === show!.version && ['prepared', 'approved'].includes(focus.state)
          ? focus.state === 'prepared' || !focus.approval || focus.approval.expiresAt <= Date.now()
            ? { label: focus.state === 'approved' ? 'Approve these terms again' : 'These terms look good', go: () => approve(focus) }
            : { label: 'Save to test inbox', go: () => execute(focus) }
          : pane === 'request'
            ? { label: recheck ? 'Review the new date' : focus?.version !== show!.version ? 'Review the current bill' : 'See the updates', go: () => changePane(recheck || focus?.version !== show!.version ? 'bill' : 'trail') }
            : { label: 'Back to the bill', go: () => changePane('bill') };
  const applyReviewedReply = async () => {
    if (!show || !replyReview.checked || replyReview.sourceVersion !== show.version) return;
    const reviewed = reviewReplyPatch(show, { useDate: replyReview.useDate, date: replyReview.date, useBudget: replyReview.useBudget, budget: replyReview.budget });
    if (reviewed.errors.length) return;
    // Only this fingerprint and reviewed structured changes leave the device, never pasted text.
    const fingerprint = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, show.id + '|' + replyReview.text.trim());
    const result = await run('reviewed-reply', { kind: 'reply', sourceMessageId: `reviewed:${fingerprint}`, contactId: `fixture-booker:${show.id}`, version: replyReview.sourceVersion, patch: reviewed.patch }, 'request');
    if (!result) return;
    replyReview.setOpen(false); replyReview.setText(''); setPractice(false);
    setReplyNotice(result.reply?.duplicate ? 'This reply was already recorded for this show. No second change or message.' : result.reply?.noChange ? 'The tracked date and budget were already current. Nothing changed and your approval stayed as it was.' : null);
  };
  const reviewResult = show ? reviewReplyPatch(show, { useDate: replyReview.useDate, date: replyReview.date, useBudget: replyReview.useBudget, budget: replyReview.budget }) : null;
  const primary = needsRefresh ? { label: 'Refresh the current show', go: refreshShow } : replyReview.open && show ? {
    label: replyReview.stage === 'paste' ? 'Review this reply' : 'Update show',
    go: () => replyReview.stage === 'paste' ? replyReview.review(show) : applyReviewedReply(),
  } : deskPrimary;
  const reviewBlocked = !needsRefresh && replyReview.open && (!show || replyReview.sourceVersion !== show.version || (replyReview.stage === 'paste' ? !replyReview.text.trim() : !replyReview.checked || !!reviewResult?.errors.length));
  const hint = replyReview.open ? 'Review first. You choose what changes.' : !desk ? 'Your sound. Their scene. One good bill.' : pane === 'bill' ? 'You review the exact terms before saving.' : pane === 'request' ? 'Test inbox only. No artist is contacted.' : 'Your show record is saved when you leave.';

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.canvas }}>
    <Head><title>Booking desk · Wanted</title></Head>
    <View style={{ paddingTop: insets.top + S.xs, paddingHorizontal: S.gutter, paddingBottom: S.sm, gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        {!largeText && <View style={{ width: 44 }} />}<T v="headline" accessibilityRole="header" style={{ flexShrink: 1, textAlign: 'center' }}>{replyReview.open ? 'Booker’s reply' : 'Booking desk'}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={replyReview.open ? 'Back to Booking desk' : 'Close Booking desk'} onPress={() => { if (replyReview.open) { replyReview.setOpen(false); replyReview.setText(''); } else if (router.canGoBack()) router.back(); else router.replace(`/a/${slug}/pulse`); }} hitSlop={8} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}><T v="headline" color={ACT}>{replyReview.open ? 'Back' : Platform.OS === 'web' ? 'Close' : 'Done'}</T></Pressable>
      </View>
      {desk && !replyReview.open && <View style={{ maxWidth: 608, width: '100%', alignSelf: 'center' }}><GlassSegmentedControl style={{ flexDirection: largeText ? 'column' : 'row' }} value={pane} onValueChange={(v) => changePane(v as Pane)} accessibilityLabel="Booking desk view">
        <GlassSegmentedControlItem value="bill" style={{ minHeight: 44 }}>The bill</GlassSegmentedControlItem>
        <GlassSegmentedControlItem value="request" style={{ minHeight: 44 }}>Your OK</GlassSegmentedControlItem>
        <GlassSegmentedControlItem value="trail" style={{ minHeight: 44 }}>Updates</GlassSegmentedControlItem>
      </GlassSegmentedControl></View>}
    </View>
    <ScrollView ref={scroll} key={pane} contentContainerStyle={{ alignSelf: 'center', width: '100%', maxWidth: 640, paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.xxl, gap: S.xl }}>
      {replyReview.open && (failed || error) && <View style={{ gap: S.sm }}><StatusBanner tone="live" title="I couldn’t confirm the update" body={failed ?? friendlyError(error ?? '')} /><DeskButton size="sm" tone="ghost" disabled={!!busy} onPress={refreshShow}>Refresh the current show</DeskButton></View>}
      {replyReview.open && show ? <ReplyReview state={replyReview} show={show} busy={!!busy} /> : <>
      <View style={{ gap: S.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="About this preview" accessibilityState={{ expanded: boundary }} onPress={() => setBoundary(!boundary)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm }}><Icon name="info" size={16} color={SCENE} /><T v="footnote" color={SCENE} style={{ flex: 1 }}>Preview · sends stay local</T><Icon name={boundary ? 'chevronUp' : 'chevronDown'} size={12} color={SCENE} /></Pressable>
        {boundary && <Card style={{ gap: S.sm }}><T v="headline">About this preview</T><T v="callout" color={C.text2}>Qloo compares recognized artists using real taste data. The date, support fees, availability and Burlington roster are made up. The scene choices are examples, not researched local history.</T><T v="callout" color={C.text2}>The test inbox never contacts these artists. No money moves. A musical match is not a ticket-sales forecast.</T></Card>}
      </View>
      <DeskButton tone="ghost" disabled={!!busy} onPress={() => router.push(`/a/${slug}/brief`)}>Use my own show and shortlist</DeskButton>
      {replyNotice && <StatusBanner tone="good" title="Reply reviewed" body={replyNotice} />}
      {(failed || error) && <View style={{ gap: S.sm }}><StatusBanner tone="live" title="I couldn’t confirm that step" body={failed ?? friendlyError(error ?? '')} /><DeskButton size="sm" tone="ghost" disabled={!!busy} onPress={refreshShow}>Refresh the show</DeskButton></View>}
      {task && <AgentJob task={task} compact={task.state === 'waiting' && pane === 'request' && ['approval', 'save'].includes(task.waitingFor ?? '')} busy={!!busy} onPause={() => run('agent-pause', { kind: 'agent-pause' })} onResume={() => run('agent-resume', { kind: 'agent-resume', version: show!.version })} onReview={() => { setRequestId(task.actionId); changePane('request'); }} />}
      {latestChange && <ChangeCard event={latestChange} hasReceipt={desk!.metrics.fixtureEffects > 0} />}
      {(pane === 'bill' || !desk) && <>
        <Hero title={summary.title} line={summary.body} mood={busy ? 'thinking' : selected ? 'proud' : 'reading'} largeText={largeText} compact={!!selected} width={width} />
        {show && <Row wrap><Chip>Burlington</Chip><Chip>{showDate(show.date)}</Chip><Chip>${show.maxFee} support limit</Chip></Row>}
        {!desk && <Card style={{ gap: S.sm }}><T v="headline">Start with one useful decision.</T><T v="callout" color={C.text2}>Gus checks a short support list, writes up the exact terms, and waits for your OK. If the date moves, your old OK stops.</T></Card>}
        {selectedCandidate && <Card style={{ gap: S.md, borderWidth: 1, borderColor: 'rgba(180,92,240,.3)' }}>
          <T v="label" color={ACT}>A support set with {selectedCandidate.name}</T>
          <T v="title2">{money(selectedCandidate.fee!.value)} support fee</T>
          <T v="footnote">Example fee, not this artist’s quote. Still inside your ${show!.maxFee} limit.</T>
          <Disclosure label="Why this pick?" open={why} onPress={() => setWhy(!why)} />
          {why && pressure && <View style={{ gap: S.md }}>
            <RankLine name="Your sound" rank={selected!.actRank} total={pressure.rows.filter((r) => r.status === 'eligible').length} color={ACT} />
            <RankLine name="This scene" rank={selected!.sceneRank} total={pressure.rows.filter((r) => r.status === 'eligible').length} color={SCENE} />
            <T v="callout" color={C.text2}>{comparisonRule(pressure)}</T>
            <T v="footnote">This compares taste, not local draw, live performance or ticket sales.</T>
            <DeskButton size="sm" disabled={!!busy} tone="ghost" onPress={() => run('sensitivity', { kind: 'sensitivity' })}>Double-check my sound references</DeskButton>
          </View>}
        </Card>}
        {sens && <View style={{ gap: S.sm }}><StatusBanner tone={sens.status === 'stable' ? 'good' : 'gold'} {...sensitivityBanner(sens)} />{why && sens.variants.map((v) => <T key={v.removedReference} v="footnote">Without {v.removedReference}: {v.error ? 'comparison unavailable' : show!.roster.find((c) => c.id === v.selectedId)?.name ?? 'no clear pick'}</T>)}</View>}
        {desk && <>
          {!task && pressure && <DeskButton full tone="ghost" disabled={!!busy} onPress={() => run('agent-start', { kind: 'agent-start', version: show!.version, policy: pressure?.policyName })}>Let Gus handle the bill</DeskButton>}
          <Section title="Who’s this night for?">
            <T v="callout" color={C.text2}>Try a different scene. Keep the same acts, date and support budget.</T>
            <GlassSegmentedControl style={{ flexDirection: largeText ? 'column' : 'row' }} value={show!.scene[0]?.name === 'Bon Iver' ? 'indie' : 'left-field'} disabled={!!busy || show!.status === 'canceled'} onValueChange={(context) => run('scene', { kind: 'scene', context, version: show!.version })} accessibilityLabel="Example scene">
              <GlassSegmentedControlItem value="left-field" style={{ minHeight: 44 }}>Left-field</GlassSegmentedControlItem><GlassSegmentedControlItem value="indie" style={{ minHeight: 44 }}>Indie / folk</GlassSegmentedControlItem>
            </GlassSegmentedControl>
            <T v="footnote">Scene example: {show!.scene.map((s) => s.name).join(' + ') || 'not resolved'}. Your sound: {show!.act.map((s) => s.name).join(' + ')}.</T>
          </Section>
          {busy && <GusLine voice={false} sticker={false} line={null} thinking="Checking the show details…" orb="searching" />}
          <View style={{ gap: S.md }}>{!pressure && <DeskButton size="sm" tone="ghost" disabled={!!busy || show!.status === 'canceled'} onPress={() => run('rank', { kind: 'rank' })}>Compare the bill myself</DeskButton>}<Disclosure label={pressure ? 'Compare the other options' : 'Who Gus will check'} open={others} onPress={() => setOthers(!others)} />
            {others && <><T v="footnote">This sample list is not a verified list of local artists. Open an act to see what’s known.</T>{show!.roster.map((candidate) => <CandidateCard key={`${candidate.id}:${show!.version}`} candidate={candidate} row={pressure?.rows.find((r) => r.id === candidate.id)} selected={selected?.id === candidate.id} disabled={!!busy || show!.status === 'canceled'} onPrepare={() => prepare(candidate.id)} />)}</>}
          </View>
          {pressure && <Row wrap><DeskButton size="sm" disabled={!!busy || show!.status === 'canceled'} tone="ghost" onPress={() => run('rank', { kind: 'rank' })}>Check the bill again</DeskButton><DeskButton size="sm" disabled={!!busy || show!.status === 'canceled'} tone="ghost" onPress={() => run('rank-strict', { kind: 'rank', policy: pressure.policyName === 'strict' ? 'balanced' : 'strict' })}>{pressure.policyName === 'strict' ? 'Allow more of a trade-off' : 'Be pickier about both sides'}</DeskButton></Row>}
        </>}
      </>}
      {pane === 'request' && desk && <>
        {focus ? <RequestCard key={focus.id} action={focus} currentVersion={show!.version} copied={copied === focus.id} onCopy={async () => { try { await Clipboard.setStringAsync(practiceMessage(focus)); setCopied(focus.id); haptic.success(); } catch { setFailed('The copy didn’t work. You can still read the request here.'); } }} /> : <Hero title="Nothing needs your OK yet." line="Pick a support act on The bill. I’ll bring back the artist, date and fee before asking you to approve anything." mood="reading" largeText={largeText} width={width} />}
        {desk.actions.length > 1 && <View style={{ gap: S.md }}><Disclosure label={`Other requests (${desk.actions.length - 1})`} open={history} onPress={() => setHistory(!history)} />{history && desk.actions.filter((a) => a.id !== focus?.id).map((a) => <Card key={a.id} onPress={() => setRequestId(a.id)} accessibilityLabel={`Review the request to ${a.payload.payee}`} style={{ gap: S.sm }}><T v="headline">{a.payload.payee} · {money(a.payload.amount)}</T><T v="footnote">{showDate(a.payload.date)} · {requestSummary(a, show!.version).title}</T></Card>)}</View>}
      </>}
      {pane === 'trail' && desk && <>
        <Hero title="Nothing gets lost." line="What you approved, what reached the test inbox, and what changed since." mood="reading" largeText={largeText} width={width} />
        <Card style={{ gap: S.md }}><View style={{ flexDirection: largeText ? 'column' : 'row', gap: S.lg }}><Metric value={desk.metrics.fixtureEffects} label="Saved messages" color={ACT} /><Metric value={desk.metrics.awaitingApproval} label="Need your OK" color={SCENE} /><Metric value={desk.metrics.invalidatedActions} label="Old requests stopped" color={C.text2} /></View><T v="footnote">These are saved records. No real artist has been contacted or agreed to play.</T></Card>
        <View style={{ gap: S.lg }}>{desk.events.map((event) => { const text = eventSummary(event); return <View key={event.id} style={{ paddingLeft: S.md, borderLeftWidth: 2, borderLeftColor: event.kind === 'uncertain' ? SCENE : C.lineHi, gap: S.xs }}><T v="footnote">{new Date(event.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</T><T v="headline">{text.title}</T><T v="callout" color={C.text2}>{text.body}</T></View>; })}</View>
        <T v="footnote">You can close Wanted and come back. Your approvals and messages stay on record.</T>
      </>}
      {show && <DeskButton full tone="ghost" disabled={!!busy || show.status === 'canceled'} onPress={() => { replyReview.begin(show); setFailed(null); }}>Work through a booker’s reply</DeskButton>}
      {desk && <View style={{ gap: S.md, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: S.md }}>
        <Disclosure label="Test a show change" open={practice} onPress={() => setPractice(!practice)} />
        {practice && <Card style={{ gap: S.md }}>
          <T v="headline">What if the booker changes things?</T><T v="callout" color={C.text2}>Try a date move, a smaller support budget or a cancellation. Old approvals stop. Previous messages stay on record.</T>
          <DeskButton full disabled={!!busy || show!.status === 'canceled'} onPress={() => reply({ date: addDays(show!.date, 1) }, 'move-date')}>Move the date one day</DeskButton>
          <DeskButton full disabled={!!busy || show!.status === 'canceled'} onPress={() => reply({ maxFee: 100 }, 'cut-budget')}>Change support budget to $100</DeskButton>
          {lastReply && <DeskButton full tone="ghost" disabled={!!busy} onPress={() => run('replay-reply', lastReply)}>Receive the same reply again</DeskButton>}
          {focus?.state === 'approved' && focus.version === show!.version && <DeskButton full tone="ghost" disabled={!!busy} onPress={() => execute(focus, true)}>Test a missing send result</DeskButton>}
          {confirmation ? <View style={{ gap: S.md }}><T v="headline">{confirmation === 'cancel' ? 'Cancel this show?' : 'Start this show over?'}</T><T v="footnote">{confirmation === 'cancel' ? 'Old approvals will stop. Earlier messages remain on record.' : 'This clears this show, approvals and saved messages.'}</T><DeskButton full tone="danger" disabled={!!busy} onPress={() => confirmation === 'cancel' ? reply({ canceled: true }, 'cancel') : run('reset', { kind: 'reset' }, 'bill')}>{confirmation === 'cancel' ? 'Yes, cancel the show' : 'Yes, start over'}</DeskButton><DeskButton full tone="ghost" onPress={() => setConfirmation(null)}>Keep it as it is</DeskButton></View> : <Row wrap><DeskButton size="sm" tone="ghost" disabled={!!busy || show!.status === 'canceled'} onPress={() => setConfirmation('cancel')}>Cancel show</DeskButton><DeskButton size="sm" tone="ghost" disabled={!!busy} onPress={() => setConfirmation('reset')}>Start over</DeskButton></Row>}
        </Card>}
        <Disclosure label="How Gus checked this · technical details" open={technical} onPress={() => setTechnical(!technical)} />
        {technical && <TechnicalDetails task={task ?? null} desk={desk} sensitivity={sens ?? null} />}
      </View>}
      </>}
    </ScrollView>
    <View style={{ paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.md), borderTopWidth: 0.5, borderTopColor: C.line, backgroundColor: C.canvas, gap: S.xs }}>
      <View style={{ width: '100%', maxWidth: 608, alignSelf: 'center', gap: S.xs }}><DeskButton full tone={focus?.state === 'uncertain' && pane === 'request' ? 'gold' : 'scout'} busy={!!busy || loading} disabled={reviewBlocked} onPress={primary.go}>{primary.label}</DeskButton><T v="footnote" style={{ textAlign: 'center' }}>{hint}</T></View>
    </View>
  </KeyboardAvoidingView>;
}

function AgentJob({ task, compact, busy, onPause, onResume, onReview }: { task: AgentTask; compact?: boolean; busy: boolean; onPause: () => void; onResume: () => void; onReview: () => void }) {
  const text = taskSummary(task);
  if (compact) return <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44 }}><T v="footnote" color={C.gus} style={{ flex: 1 }}>Gus prepared this. Your decision comes next.</T><DeskButton size="sm" tone="ghost" disabled={busy} onPress={onPause}>Pause Gus</DeskButton></View>;
  const canResume = task.state === 'paused' || task.state === 'failed' || ['evidence', 'choice'].includes(task.waitingFor ?? '');
  return <Card style={{ gap: S.md, borderWidth: 1, borderColor: 'rgba(127,209,255,.22)' }}>
    <T v="label" color={C.gus}>Gus’s job · find the right support</T>
    <View accessibilityLiveRegion="polite" style={{ gap: S.xs }}><T v="headline">{text.title}</T><T v="callout" color={C.text2}>{text.body}</T></View>
    <T v="footnote">Saved between visits. Show changes wake the job; your approvals never become send or payment permission.</T>
    <Row wrap>{task.actionId && ['approval', 'save'].includes(task.waitingFor ?? '') && <DeskButton size="sm" tone="ghost" disabled={busy} onPress={onReview}>Review Gus’s request</DeskButton>}{canResume ? <DeskButton size="sm" tone="ghost" disabled={busy} onPress={onResume}>Resume Gus</DeskButton> : task.state !== 'canceled' && <DeskButton size="sm" tone="ghost" disabled={busy} onPress={onPause}>Pause Gus</DeskButton>}</Row>
  </Card>;
}
function Hero({ title, line, mood, largeText, width, compact }: { title: string; line: string; mood: 'proud' | 'reading' | 'thinking'; largeText: boolean; width: number; compact?: boolean }) {
  return <View style={{ gap: S.md }}><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.sm }}><T accessibilityRole="header" style={{ flex: 1, fontFamily: F.displayBold, fontSize: width < 500 ? compact ? 27 : 30 : 36, lineHeight: width < 500 ? compact ? 33 : 36 : 42, letterSpacing: -0.7 }}>{title}</T>{!largeText && <GusSticker mood={mood} size={64} />}</View><GusLine compact voice={false} sticker={false} line={line} /></View>;
}
function DeskButton({ children, style, ...props }: ComponentProps<typeof Btn>) {
  return <Btn {...props} style={[{ minHeight: 44, maxWidth: '100%' }, style]}><T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 17, textAlign: 'center', flexShrink: 1 }}>{children}</T></Btn>;
}
function Disclosure({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => (haptic.tick(), onPress())} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm }}><T v="callout" color={C.text2} style={{ flex: 1 }}>{label}</T><Icon name={open ? 'chevronUp' : 'chevronDown'} size={12} color={C.text3} /></Pressable>;
}
function RankLine({ name, rank, total, color }: { name: string; rank: number | null; total: number; color: string }) {
  return <Row wrap><T v="headline" color={color}>{name}</T><T v="callout">{rank === null ? 'Not compared' : `#${rank} of ${total}`}</T></Row>;
}
const FIELD = { locality: 'Local connection', live: 'Live show suitability', capacity: 'Room size', fee: 'Support fee', availability: 'Can make this date', intake: 'How to reach them' };
function CandidateCard({ candidate, row, selected, disabled, onPrepare }: { candidate: Candidate; row?: PressureRow; selected: boolean; disabled: boolean; onPrepare: () => void }) {
  const [open, setOpen] = useState(false);
  return <Card style={{ gap: S.sm, borderWidth: 1, borderColor: selected ? 'rgba(180,92,240,.35)' : C.line }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${candidate.name}. ${selected ? 'Gus’s pick. ' : ''}Show details`} accessibilityState={{ expanded: open }} onPress={() => (haptic.tick(), setOpen(!open))} style={{ minHeight: 44, gap: S.sm }}><Row><T v="headline" style={{ flex: 1 }}>{candidate.name}</T><Icon name={selected ? 'star' : open ? 'chevronUp' : 'chevronDown'} size={selected ? 18 : 12} color={selected ? C.gold : C.text3} /></Row><T v="callout" color={selected ? ACT : C.text2}>{candidate.fee ? `${money(candidate.fee.value)} example fee` : 'Fee needs checking'}</T>{row && <T v="footnote">{row.status === 'eligible' ? `Your sound #${row.actRank ?? '?'} · Scene #${row.sceneRank ?? '?'}` : row.status === 'blocked' ? 'Doesn’t meet the show’s requirements' : 'Show details need checking'}</T>}</Pressable>
    {open && <View style={{ gap: S.md, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: S.md }}>
      {!!row?.reasons.length && row.reasons.map((reason) => <T key={reason} v="callout" color={SCENE}>{humanReason(reason)}</T>)}
      <T v="footnote">These show details are examples, not verified claims about {candidate.name}.</T>
      {(Object.keys(FIELD) as (keyof typeof FIELD)[]).map((key) => { const e = candidate[key]; return <View key={key} style={{ gap: S.xs }}><T v="headline">{FIELD[key]}</T><T v="footnote">{!e ? 'Not checked' : key === 'fee' ? `${money(Number(e.value))} · example, not a quote` : key === 'capacity' ? `${e.value}-person room · example, not expected attendance` : key === 'availability' ? `${showDate(candidate.availability!.value.date)} · ${candidate.availability!.value.status === 'available' ? 'available in the example' : 'not confirmed'}` : 'Example only, not independently verified'}</T></View>; })}
      {row?.status === 'eligible' && <DeskButton full disabled={disabled} onPress={onPrepare}>Write to {candidate.name} instead</DeskButton>}
    </View>}
  </Card>;
}
function RequestCard({ action, currentVersion, copied, onCopy }: { action: BookingAction; currentVersion: number; copied: boolean; onCopy: () => void }) {
  const [message, setMessage] = useState(false);
  const [oldTerms, setOldTerms] = useState(false);
  const historical = action.version !== currentVersion;
  const text = requestSummary(action, currentVersion);
  return <View style={{ gap: S.xl }}>
    <View style={{ gap: S.sm }}><T v="title" accessibilityRole="header" accessibilityLiveRegion="polite">{text.title}</T><T v="callout" color={C.text2}>{text.body}</T></View>
    <Card style={{ gap: S.lg }}><T v="label" color={ACT}>{historical ? 'Previous request' : 'Support request'}</T>{historical && <><T v="callout">{action.payload.payee} · {money(action.payload.amount)}</T><T v="footnote">{showDate(action.payload.date, true)} · These are old terms.</T><Disclosure label="See the old terms" open={oldTerms} onPress={() => setOldTerms(!oldTerms)} /></>}{(!historical || oldTerms) && <><Term label="To" value={action.payload.payee} /><Term label="Show date" value={showDate(action.payload.date, true)} /><Term label="Support fee" value={money(action.payload.amount)} /><T v="footnote">Your OK covers this request only, not a payment. The fee is an example, not an artist quote.</T></>}
      <Disclosure label="Read the request" open={message} onPress={() => setMessage(!message)} />{message && <View style={{ gap: S.md }}><T v="callout" color={C.text2}>{practiceMessage(action)}</T><DeskButton full tone="ghost" onPress={onCopy}>{copied ? 'Request copied' : 'Copy request'}</DeskButton></View>}
      {action.approval && <T v="footnote">Your OK {action.approval.expiresAt > Date.now() ? 'ends' : 'ended'} {new Date(action.approval.expiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</T>}
      {action.receipt && <View style={{ padding: S.md, backgroundColor: C.fill2, borderRadius: R.sm, gap: S.sm }}><T v="headline" color={C.good}>One saved message</T><T v="footnote">{action.receipt.acknowledgment ?? 'No artist reply. The show is not confirmed.'}</T><T v="footnote">Received {new Date(action.receipt.acceptedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</T></View>}
    </Card>
  </View>;
}
function Term({ label, value }: { label: string; value: string }) { return <View style={{ gap: S.xs }}><T v="label">{label}</T><T v="title2">{value}</T></View>; }
function ChangeCard({ event, hasReceipt }: { event: OperationEvent; hasReceipt: boolean }) {
  if (!event.change) return null;
  const { before, after } = event.change;
  return <Card style={{ gap: S.md, borderWidth: 1, borderColor: 'rgba(255,179,64,.35)' }}><T v="headline" color={SCENE}>The show details changed</T>{before.date !== after.date && <Term label="Show date" value={`${showDate(before.date)} → ${showDate(after.date)}`} />}{before.maxFee !== after.maxFee && <Term label="Support budget" value={`${money(before.maxFee)} → ${money(after.maxFee)}`} />}{before.status !== after.status && <T v="headline">{after.status === 'canceled' ? 'The show is canceled.' : 'The show is back in planning.'}</T>}<T v="callout" color={C.text2}>{hasReceipt ? 'Your old OK stopped. Keep the earlier message on record; it was not resent. The new terms need a fresh look.' : 'Your old OK stopped. Nobody was contacted. Review the new terms before starting again.'}</T></Card>;
}
function Metric({ value, label, color }: { value: number; label: string; color: string }) { return <View style={{ flex: 1, minWidth: 0, gap: S.xs }}><T style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 32, color }}>{value}</T><T v="footnote">{label}</T></View>; }
function TechnicalDetails({ task, desk, sensitivity }: { task: AgentTask | null; desk: Desk; sensitivity: SensitivityReport | null }) {
  return <Card style={{ gap: S.lg }}><T v="headline">Evidence & execution record · v{desk.opportunity.version}</T>{task?.execution && <View style={{ gap: S.sm }}><T v="headline">{task.execution.engine === 'llm' ? 'LLM-directed tool planning' : task.execution.engine === 'rules' ? 'Rules fallback' : 'Model unavailable'}</T><T v="footnote">{task.execution.models.join(' → ') || 'No model call'} · {!task.execution.models.length ? 'no model response' : task.execution.cached ? 'cached model response' : 'uncached model response'} · {task.execution.latencyMs} ms</T>{task.execution.steps.map((step, i) => <T key={i} v="footnote">{step.tool} · {step.ok ? 'accepted' : 'rejected'} · {step.note}</T>)}{task.execution.failure && <T v="footnote" color={C.amber}>{task.execution.failure}</T>}</View>}<T v="footnote">Cookie-isolated fixture. Durable SQLite/Turso state. Fictional operating facts. No real delivery or payment connector.</T>{desk.pressure && <><T v="footnote">{desk.pressure.policy}</T>{Object.entries(desk.pressure.views).map(([name, view]) => <View key={name} style={{ gap: S.xs }}><T v="headline">{name} · {view.error ? 'comparison unavailable' : `${view.scores.length} scores`}</T><T v="footnote">{view.error ?? `${view.receipt?.endpoint} · ${view.receipt?.cached ? 'cached' : 'live'} · ${view.receipt?.latencyMs ?? 0} ms`}</T></View>)}</>}{sensitivity && <T v="footnote">Reference sensitivity: {sensitivity.status}. {sensitivity.detail}</T>}{desk.actions.filter((a) => a.receipt).map((a) => <T key={a.id} v="footnote">Receipt: {a.receipt!.ref} · {a.state}</T>)}{desk.events.map((e) => <View key={e.id} style={{ gap: S.xs }}><T v="footnote" color={ACT}>{e.kind} · v{e.version}</T><T v="footnote">{e.detail}</T></View>)}</Card>;
}
function sensitivityBanner(sens: SensitivityReport) { const text = sensitivitySummary(sens); return { title: text.title, body: text.body }; }
function practiceMessage(action: BookingAction) { return `PRACTICE ONLY · NOT A REAL BOOKING REQUEST\n\nWould ${action.payload.payee} be available for a support set in Burlington on ${showDate(action.payload.date, true)}, for ${money(action.payload.amount)}?\n\nThis is a fictional Wanted demo. The fee and availability are examples, not this artist’s terms. No message has been sent to the artist.`; }
function humanReason(reason: string) { return ({ 'Qloo mapping unresolved': 'I couldn’t confidently identify this artist in the taste data.', 'Locality missing or stale': 'The local connection needs checking.', 'Live suitability not verified': 'We still need to check the live show.', 'Live suitability rejected': 'The live show doesn’t fit this bill.', 'Scale not verified': 'The room size needs checking.', 'Fee missing or stale': 'The support fee needs checking.', 'Outside support budget': 'The fee is above your support budget.', 'Performance availability not confirmed for this date': 'This date has not been confirmed.', 'Intake route missing or stale': 'We need a current way to contact them.', 'Wrong performance format': 'The performance format doesn’t fit.', 'Wrong room scale': 'This act doesn’t fit the room size.', 'Not in this circuit': 'This act isn’t in the selected circuit.', 'Unavailable on this date': 'They can’t make this date.', 'Show canceled': 'The show is canceled.' } as Record<string, string>)[reason] ?? 'A show requirement needs review.'; }
function friendlyError(message: string) { return /too many/i.test(message) ? 'Gus needs a minute before another check. Your saved work is still here.' : /changed|older|stale|expired|current-version/i.test(message) ? 'The show or approval changed. Refresh it and review the current terms.' : /403|authority|authentication|login|demo-only/i.test(message) ? 'Real accounts and contacts are not connected in this preview.' : /network|fetch/i.test(message) ? 'The connection dropped. The change may already be saved. Refresh the show before trying again.' : 'The result did not come back clearly. Refresh the show to check what was saved before trying again.'; }
