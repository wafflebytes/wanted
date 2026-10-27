import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { reviewReplyPatch, suggestReplyChanges, type ReplySuggestion } from '@/lib/booking-reply';
import { money, showDate } from '@/lib/desk-copy';
import type { Opportunity } from '@/lib/operations';
import { addDays } from '@/lib/tour';
import { Card } from '@/ui/components/core';
import { T } from '@/ui/components/T';
import { C, F, R, S } from '@/ui/theme';
import { Icon } from '@/ui/icons/Icon';

export function useReplyReview() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<'paste' | 'review'>('paste');
  const [sourceVersion, setSourceVersion] = useState(0);
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState<ReplySuggestion | null>(null);
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [useDate, setUseDate] = useState(false);
  const [useBudget, setUseBudget] = useState(false);
  const [checked, setChecked] = useState(false);
  const begin = (show: Opportunity) => { setSourceVersion(show.version); setStage('paste'); setText(''); setSuggestion(null); setChecked(false); setOpen(true); };
  const review = (show: Opportunity) => {
    const result = suggestReplyChanges(text, show.date); setSuggestion(result);
    setDate(result.date ?? show.date); setBudget(String(result.maxFee ?? show.maxFee));
    setUseDate(!!result.date); setUseBudget(result.maxFee !== null && result.maxFee !== show.maxFee); setChecked(false); setStage('review');
  };
  const rebase = (show: Opportunity) => { setSourceVersion(show.version); setStage('paste'); setSuggestion(null); setChecked(false); };
  return { rebase, open, setOpen, stage, setStage, sourceVersion, text, setText, suggestion, date, setDate, budget, setBudget, useDate, setUseDate, useBudget, setUseBudget, checked, setChecked, begin, review };
}
export type ReplyReviewState = ReturnType<typeof useReplyReview>;
export function ReplyReview({ state: s, show, busy }: { state: ReplyReviewState; show: Opportunity; busy: boolean }) {
  const stale = s.sourceVersion !== show.version;
  const result = reviewReplyPatch(show, { useDate: s.useDate, date: s.date, useBudget: s.useBudget, budget: s.budget });
  return <View style={{ gap: S.xl }}>
    <View style={{ gap: S.sm }}><T v="title" accessibilityRole="header">{s.stage === 'paste' ? 'What did the booker say?' : 'Check what changes.'}</T><T v="callout" color={C.text2}>{s.stage === 'paste' ? 'Paste a short, redacted reply. I’ll help spot a new date or support budget, then you decide what’s current.' : 'Select the changes to make. Check them against the reply; I can misread it.'}</T></View>
    {s.stage === 'paste' ? <Card style={{ gap: S.sm }}><T v="headline">Current show</T><T v="callout">Burlington · {showDate(show.date, true)}</T><T v="callout">{money(show.maxFee)} support budget</T><T v="footnote">Update the show record only. This does not send a message or confirm a booking.</T></Card> : <T v="footnote" color={C.amber}>Burlington · review the changes below.</T>}
    {stale && <Card><T v="headline" color={C.amber}>The show changed while you were reviewing.</T><T v="callout" color={C.text2}>The old review cannot update this show. Your pasted text is still on this device.</T><Pressable accessibilityRole="button" onPress={() => s.rebase(show)} style={{ minHeight: 44, justifyContent: 'center' }}><T v="callout" color={C.purpleHi}>Review against the current show</T></Pressable></Card>}
    {s.stage === 'paste' ? <View style={{ gap: S.md }}>
      <T v="headline">Booker’s reply</T><TextInput accessibilityLabel="Booker’s reply" multiline maxLength={4000} value={s.text} onChangeText={s.setText} editable={!busy} placeholder="Could we move to November 21, 2026? The support budget is now $150." placeholderTextColor={C.text3} textAlignVertical="top" style={{ ...inputStyle, minHeight: 160 }} />
      <T v="footnote">Keep out private emails, phone numbers and payment details. The pasted text is read locally on this device. It is not stored or sent to Qloo or an AI model.</T>
      <Pressable accessibilityRole="button" onPress={() => s.setText(`Could we move the show to ${addDays(show.date, 1)}? The support budget is now $150.`)} style={{ minHeight: 44, justifyContent: 'center' }}><T v="callout" color={C.purpleHi}>Use an example reply</T></Pressable>
    </View> : <>
      <View style={{ gap: S.md }}>{s.suggestion?.notes.map((note) => <T key={note} v="callout" color={C.amber}>{note}</T>)}</View>
      <Card style={{ gap: S.md }}>
        <Check label="Change the show date" checked={s.useDate} disabled={busy} onPress={() => { s.setUseDate(!s.useDate); s.setChecked(false); }} />
        <T v="footnote">Current: {showDate(show.date, true)}</T>{s.useDate && <><TextInput accessibilityLabel="New show date" value={s.date} editable={!busy} onChangeText={(value) => { s.setDate(value); s.setChecked(false); }} autoCapitalize="none" placeholder="YYYY-MM-DD" placeholderTextColor={C.text3} style={inputStyle} /><T v="footnote">Full date, including the year. Format: YYYY-MM-DD.</T></>}
      </Card>
      <Card style={{ gap: S.md }}>
        <Check label="Change the support budget" checked={s.useBudget} disabled={busy} onPress={() => { s.setUseBudget(!s.useBudget); s.setChecked(false); }} />
        <T v="footnote">Current: {money(show.maxFee)}</T>{s.useBudget && <><TextInput accessibilityLabel="New support budget in USD" value={s.budget} editable={!busy} onChangeText={(value) => { s.setBudget(value); s.setChecked(false); }} keyboardType="decimal-pad" style={inputStyle} /><T v="footnote">What you can offer support, in USD. Not your guarantee, a deposit, or a payment authorization.</T></>}
      </Card>
      <Card style={{ gap: S.md }}><T v="headline">What happens next</T><T v="callout" color={C.text2}>Old approvals stop. A new date needs fresh availability checks. Previous messages stay on record and are not resent.</T><Check label="I checked these changes against the reply" checked={s.checked} disabled={busy || stale} onPress={() => s.setChecked(!s.checked)} /></Card>
      {!!result.errors.length && <View accessibilityLiveRegion="polite" style={{ gap: S.sm }}>{result.errors.map((e) => <T key={e} v="callout" color={C.amber}>{e}</T>)}</View>}
      <View style={{ gap: S.md }}><T v="headline">The pasted reply</T><T v="callout" color={C.text2}>{s.text}</T><Pressable accessibilityRole="button" onPress={() => { s.setStage('paste'); s.setChecked(false); }} style={{ minHeight: 44, justifyContent: 'center' }}><T v="callout" color={C.purpleHi}>Go back and edit the reply</T></Pressable></View>
    </>}
  </View>;
}
function Check({ label, checked, disabled, onPress }: { label: string; checked: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, flexDirection: 'row', gap: S.md, alignItems: 'center', opacity: disabled ? 0.5 : 1 }}><View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: checked ? C.purple : C.fill2, borderWidth: 1, borderColor: checked ? C.purpleHi : C.lineHi, alignItems: 'center', justifyContent: 'center' }}>{checked && <Icon name="check" size={15} color={C.text} />}</View><T v="callout" style={{ flex: 1 }}>{label}</T></Pressable>;
}
const inputStyle = { minHeight: 50, borderWidth: 1, borderColor: C.lineHi, borderRadius: R.sm, backgroundColor: C.card, padding: S.md, color: C.text, fontFamily: F.body, fontSize: 17, lineHeight: 23 };
