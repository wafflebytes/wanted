/** Local-only scenario workbench. No financial inputs are sent to an AI, Qloo or Stripe. */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { showEconomics, parseUsdInput, parsePercentInput, type ShowEconomicsInput } from '@/lib/show-economics';
import type { Desk } from '@/lib/operations';
import { currentEvidence } from '@/lib/operations';
import { useApi } from '@/ui/hooks';
import { C, F, R, S } from '@/ui/theme';
type Field = Exclude<keyof ShowEconomicsInput, 'deal'>;
const fields: { key: Field; label: string; helper: string }[] = [
  { key: 'guaranteeCents', label: 'Artist guarantee, USD', helper: 'Organizer pays the artist. For versus: the minimum, not extra pay.' },
  { key: 'artistShareBps', label: 'Artist share, %', helper: 'Share of net ticket receipts after the agreed deductions below.' },
  { key: 'netTicketCents', label: 'Net receipt per paid ticket, USD', helper: 'Already exclude taxes and ticketing fees. Not the advertised face price.' },
  { key: 'paidCapacity', label: 'Paid-ticket capacity', helper: 'Saleable tickets only. Exclude comps and unavailable seats.' },
  { key: 'scenarioTickets', label: 'Hypothetical paid tickets', helper: 'Your scenario, not a Qloo or fan-signature forecast.' },
  { key: 'agreedDeductionsCents', label: 'Agreed backend deductions, USD', helper: 'Only costs explicitly deductible under the written deal.' },
  { key: 'otherOrganizerCostsCents', label: 'Other organizer costs, USD', helper: 'Do not include the deductions above again.' },
  { key: 'artistCostsCents', label: 'Artist costs for this show, USD', helper: 'Travel, people, support, lodging and other non-overlapping costs.' },
  { key: 'depositPaidCents', label: 'Organizer advance already paid, USD', helper: 'Organizer to artist. Credited against artist pay, never counted twice.' },
];
const empty = Object.fromEntries(fields.map(f => [f.key, ''])) as Record<Field, string>;
const example: Record<Field, string> = { guaranteeCents: '500', artistShareBps: '70', netTicketCents: '15', paidCapacity: '150', scenarioTickets: '80', agreedDeductionsCents: '200', otherOrganizerCostsCents: '0', artistCostsCents: '550', depositPaidCents: '0' };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export default function EconomicsScreen() {
  const { artist } = useLocalSearchParams<{ artist?: string }>();
  const slug = typeof artist === 'string' && /^[a-z0-9-]+$/.test(artist) ? artist : null;
  const { data } = useApi<{ desk: Desk | null }>(slug ? `/artist/${slug}/desk` : null);
  const desk = data?.desk;
  const pressure = desk?.pressure;
  const contextCurrent = !!desk && !!pressure && pressure.version === desk.opportunity.version && currentEvidence(desk.opportunity.sceneEvidence, Date.now(), desk.opportunity.mode) && Date.now() - pressure.observedAt < 86_400_000 && !pressure.views.act.error && !pressure.views.scene.error;
  const selected = contextCurrent ? pressure?.rows.find(r => r.id === pressure.selectedId) : null;
  const [deal, setDeal] = useState<ShowEconomicsInput['deal']>('door-split');
  const [values, setValues] = useState<Record<Field, string>>(empty);
  const [copied, setCopied] = useState(false);
  const shownFields = fields.filter(f => !(deal === 'door-split' && f.key === 'guaranteeCents') && !(deal === 'guarantee' && f.key === 'artistShareBps'));
  const input = { deal } as ShowEconomicsInput;
  const missing: string[] = [];
  for (const f of fields) {
    const hidden = !shownFields.includes(f);
    const raw = hidden ? '0' : values[f.key];
    const parsed = f.key === 'artistShareBps' ? parsePercentInput(raw) : f.key === 'paidCapacity' || f.key === 'scenarioTickets' ? /^\d+$/.test(raw.trim()) ? Number(raw) : null : parseUsdInput(raw);
    if (parsed === null) missing.push(f.label);
    input[f.key] = parsed ?? NaN;
  }
  const result = showEconomics(input);
  const scenario = missing.length === 0 && result.valid ? result.scenario : null;
  const copy = async () => {
    if (!scenario) return;
    await Clipboard.setStringAsync(`Wanted: hypothetical USD show scenario, not a confirmed deal or payment approval.\nDeal: ${deal}. Paid tickets: ${input.scenarioTickets}/${input.paidCapacity}. Net ticket receipt: ${money(input.netTicketCents)}.\nTicket receipts: ${money(scenario.receiptsCents)}. Artist gross pay: ${money(scenario.artistPayCents)}. Artist contribution after listed costs: ${money(scenario.artistContributionCents)}. Organizer contribution after listed costs: ${money(scenario.organizerContributionCents)}. Remaining artist balance after credited advance: ${money(scenario.balanceCents)}.\nOrganizer break-even: ${result.organizerBreakEvenTickets ?? 'not reached within capacity'}. Artist break-even: ${result.artistBreakEvenTickets ?? 'not reached within capacity'}.\nQloo cultural fit does not establish sales. Costs/terms require written review. Taxes, cancellation and settlement are not modeled.`);
    setCopied(true);
  };
  return <SafeAreaView style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <View style={styles.top}><Text style={styles.logo}>WANTED</Text><Link href={slug ? { pathname: '/a/[artist]/desk', params: { artist: slug } } : '/'} style={styles.link}>Back to {slug ? 'the bill' : 'Wanted'}</Link></View>
    <Text style={styles.eyebrow}>THE NEXT QUESTION</Text><Text accessibilityRole="header" style={styles.title}>Good fit.{ '\n' }Bad deal?</Text>
    <Text style={styles.lead}>Taste finds the crowd. Written terms decide who carries the risk.</Text>
    <View style={styles.card}><Text style={styles.heading}>Qloo and money answer different questions.</Text>
      <Text style={styles.body}>{selected ? `The current illustrative Qloo comparison selected ${selected.name} for act-and-scene fit. That is cultural evidence, not a local draw estimate.` : 'Qloo can compare a qualified bill against the act and scene. No current defensible selection is loaded here.'}</Text>
      {desk ? <Text style={styles.small}>Practice show {desk.opportunity.date}, version {desk.opportunity.version}. The support budget is fictional and is not imported as a whole-show guarantee.</Text> : null}
      <Text style={styles.small}>Financial entries stay on this device. This page sends no financial input to Qloo, an AI model, Stripe or the application server. Copying is your separate choice.</Text>
    </View>
    <View style={styles.actions}><Pressable onPress={() => { setValues(example); setDeal('door-split'); setCopied(false); }} style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>Try a worked example</Text></Pressable><Pressable onPress={() => { setValues(empty); setCopied(false); }} style={styles.secondary} accessibilityRole="button"><Text style={styles.secondaryText}>Clear</Text></Pressable></View>
    <Text accessibilityRole="header" style={styles.section}>Define the deal</Text>
    <View style={styles.radios}>{(['guarantee', 'door-split', 'versus'] as const).map(d => <Pressable key={d} accessibilityRole="radio" accessibilityState={{ checked: deal === d }} onPress={() => { setDeal(d); setCopied(false); }} style={[styles.radio, deal === d && styles.radioSelected]}><Text style={[styles.radioText, deal === d && { color: C.ink }]}>{d === 'door-split' ? 'Door split' : d === 'versus' ? 'Versus' : 'Guarantee'}</Text></Pressable>)}</View>
    <Text style={styles.body}>{deal === 'guarantee' ? 'Artist receives a fixed guarantee, regardless of the hypothetical receipts.' : deal === 'versus' ? 'Artist receives the greater of the guarantee or the defined net split. Not guarantee plus percentage.' : 'Artist receives a percentage of the defined ticket pool after agreed deductions.'}</Text>
    {shownFields.map(f => <View key={f.key} style={styles.field}><Text style={styles.label}>{f.label}</Text><TextInput accessibilityLabel={f.label} value={values[f.key]} onChangeText={text => { setValues(v => ({ ...v, [f.key]: text })); setCopied(false); }} keyboardType="decimal-pad" placeholder="Required, including zero" placeholderTextColor={C.text2} style={styles.input} /><Text style={styles.small}>{f.helper}</Text></View>)}
    <Text accessibilityRole="header" style={styles.section}>Your hypothetical outcome</Text>
    {!scenario ? <View style={styles.card}><Text style={styles.body}>{missing.length ? 'Enter every visible field, including zero, with at most two decimal places for money or percentages. Blank is unknown, not zero.' : result.errors.join(' ')}</Text></View> : <>
      <View style={styles.card}><Text style={styles.heading}>{input.scenarioTickets} paid tickets is your assumption.</Text>
        {([['Net ticket receipts', scenario.receiptsCents], ['Artist gross pay', scenario.artistPayCents], ['Artist contribution after costs', scenario.artistContributionCents], ['Organizer contribution after costs', scenario.organizerContributionCents], ['Artist balance after credited advance', scenario.balanceCents]] as const).map(([label, cents]) => <View key={label} style={styles.resultRow}><Text style={styles.resultLabel}>{label}</Text><Text style={[styles.resultMoney, cents < 0 && { color: C.bad }]}>{money(cents)}</Text></View>)}
        <Text style={styles.small}>Organizer break-even: {result.organizerBreakEvenTickets === null ? 'not reached within paid capacity' : `${result.organizerBreakEvenTickets} paid tickets`}. Artist break-even: {result.artistBreakEvenTickets === null ? 'not reached within paid capacity' : `${result.artistBreakEvenTickets} paid tickets`}.</Text>
      </View>
      {result.warnings.map(w => <Text key={w} style={styles.small}>{w}</Text>)}
      <Pressable accessibilityRole="button" onPress={copy} style={styles.button}><Text style={styles.buttonText}>{copied ? 'Scenario copied' : 'Copy this scenario'}</Text></Pressable>
    </>}
    <View style={styles.commerce}><Text style={styles.heading}>A scenario is never a payment approval.</Text><Text style={styles.body}>This check models organizer-to-artist payment. Wanted's existing venue-deposit demo is a separate artist-to-venue simulation, using a sandbox ledger or Stripe test mode. Do not treat them as the same contract.</Text><Text style={styles.small}>Before real commerce: verified payer and payee, written amount/currency, a current offer version, exact human authorization, a permitted connector and receipt reconciliation. No money moves from this screen. A Stripe test charge is not a transfer to a venue or a booking confirmation.</Text><Link href="/evals" style={styles.link}>See what Gus has actually passed</Link></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas }, page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: S.xl, paddingBottom: 70, gap: S.lg }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, marginBottom: S.xl }, logo: { color: C.cream, fontFamily: F.logo, fontSize: 21 }, link: { color: C.gus, fontSize: 14, minHeight: 44, paddingVertical: 12, textDecorationLine: 'underline' }, eyebrow: { color: C.gold, fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5 }, title: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 51 }, lead: { color: C.gus, fontFamily: F.rounded, fontSize: 20, lineHeight: 28 }, card: { backgroundColor: C.card, padding: S.xl, borderRadius: R.md, gap: S.md }, heading: { color: C.cream, fontSize: 18, fontWeight: '700', lineHeight: 25 }, body: { color: C.text2, fontSize: 15, lineHeight: 23 }, small: { color: C.text2, fontSize: 12, lineHeight: 19 }, actions: { flexDirection: 'row', gap: S.md }, button: { backgroundColor: C.cream, paddingVertical: 15, paddingHorizontal: 18, borderRadius: R.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: C.ink, fontSize: 15, fontWeight: '700' }, secondary: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 }, secondaryText: { color: C.text2, fontSize: 15 }, section: { color: C.text, fontFamily: F.displayBold, fontSize: 26, marginTop: S.lg }, radios: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }, radio: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 14, borderRadius: R.sm, backgroundColor: C.card }, radioSelected: { backgroundColor: C.cream }, radioText: { color: C.text2, fontSize: 14 }, field: { gap: S.sm }, label: { color: C.text, fontSize: 16, fontWeight: '600' }, input: { minHeight: 50, borderWidth: 1, borderColor: C.lineHi, borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 12, color: C.text, backgroundColor: C.card, fontSize: 18 }, resultRow: { flexDirection: 'row', justifyContent: 'space-between', gap: S.md, paddingVertical: 5 }, resultLabel: { flex: 1, color: C.text2, fontSize: 14, lineHeight: 21 }, resultMoney: { color: C.cream, fontFamily: F.mono, fontSize: 15 }, commerce: { gap: S.md, borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: S.lg, marginTop: S.xl },
});
