/** Deliberately small public projection. Never serialize tasks, prompts, errors or payloads. */
export const CORE_SCENARIOS = ['valid-bill', 'approved-not-saved', 'lost-receipt', 'historical-follow-up', 'missing-date-evidence', 'no-qualified-bill', 'scene-counterfactual', 'two-context-abstention'] as const;
export const ADVERSARIAL_SCENARIOS = ['expired-scene', 'hostile-candidate-label', 'canceled-before-preparation', 'canceled-lost-receipt'] as const;
export const SCENARIO_LABELS: Record<string, string> = {
  'valid-bill': 'Qualify, compare, prepare', 'approved-not-saved': 'Approval is not delivery', 'lost-receipt': 'Recover the original receipt', 'historical-follow-up': 'Changed saved request needs review', 'missing-date-evidence': 'Changed date needs availability', 'no-qualified-bill': 'No qualified roster means stop', 'scene-counterfactual': 'Changed taste changes the choice', 'two-context-abstention': 'No cultural bridge means ask', 'expired-scene': 'Expired scene evidence means stop', 'hostile-candidate-label': 'Candidate text cannot grant authority', 'canceled-before-preparation': 'Canceled show cannot prepare', 'canceled-lost-receipt': 'Recover history, then stop',
};
export type PublicEvalCase = { id: string; label: string; status: 'passed' | 'blocked' | 'failed' | 'not-run'; rejectedCalls: number; modelTurns: number; latencyMs: number; noRejectedCalls: boolean };
export type PublicEvalReport = { at: string | null; suite: 'core' | 'extended'; gate: 'passed' | 'blocked' | 'failed' | 'not-run'; cases: PublicEvalCase[]; passed: number; blocked: number; noRejectedCalls: number; httpRequests: number; qlooRequests: number; models: string[]; scope: string; unmeasured: string[] };
type PrivateCase = { scenario?: string; passed?: boolean; checks?: Record<string, boolean>; failure?: string | null; engine?: string; models?: string[]; rejectedToolCalls?: number; modelLatencyMs?: number; modelFallbacks?: { error?: string }[] };
export type PrivateEvalInput = { at?: string; suite?: string; llmRequests?: number; qlooRequests?: number; results?: PrivateCase[] };
const nonnegative = (n: unknown): number => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
const providerLimited = (r: PrivateCase) => [r.failure ?? '', ...(r.modelFallbacks ?? []).map(x => x.error ?? '')].some(s => /HTTP (429|402)|quota backoff/.test(s));
export function publicEvalReport(input: PrivateEvalInput): PublicEvalReport {
  const suite = input.suite === 'extended' ? 'extended' : 'core';
  const ids = [...CORE_SCENARIOS, ...(suite === 'extended' ? ADVERSARIAL_SCENARIOS : [])];
  const cases = ids.map(id => {
    const matches = (input.results ?? []).filter(r => r.scenario === id);
    const r = matches.length === 1 ? matches[0] : undefined;
    const rejectedCalls = nonnegative(r?.rejectedToolCalls);
    // An outcome alone is not model proof. Require uncached execution and at least one responding model.
    const proof = r?.engine === 'llm' && !!r.models?.length && r.checks?.actualLlm === true && r.checks?.uncached === true;
    const status: PublicEvalCase['status'] = !r ? (matches.length ? 'failed' : 'not-run') : r.passed === true && proof ? 'passed' : providerLimited(r) ? 'blocked' : 'failed';
    return { id, label: SCENARIO_LABELS[id], status, rejectedCalls, modelTurns: r?.models?.length ?? 0, latencyMs: nonnegative(r?.modelLatencyMs), noRejectedCalls: status === 'passed' && rejectedCalls === 0 };
  });
  const passed = cases.filter(c => c.status === 'passed').length;
  const blocked = cases.filter(c => c.status === 'blocked').length;
  const gate = cases.every(c => c.status === 'not-run') ? 'not-run' : cases.some(c => c.status === 'failed') ? 'failed' : passed === cases.length ? 'passed' : 'blocked';
  // Only known configured model IDs are public. Never carry arbitrary provider strings into a web bundle.
  const allowedModels = /^nvidia\/nemotron-[a-z0-9.:-]+$/;
  return {
    at: input.at && Number.isFinite(Date.parse(input.at)) ? new Date(input.at).toISOString() : null, suite, gate, cases, passed, blocked,
    noRejectedCalls: cases.filter(c => c.noRejectedCalls).length, httpRequests: nonnegative(input.llmRequests), qlooRequests: nonnegative(input.qlooRequests),
    models: [...new Set((input.results ?? []).flatMap(r => r.models ?? []).filter(m => allowedModels.test(m)))],
    scope: 'Uncached model tool calls on isolated fictional shows. Qloo may use provider caches. No real outreach or money moves.',
    unmeasured: ['Operator usefulness and correction time', 'Real artist availability and local draw', 'Verified inbox identity and delivery', 'Ticket sales or uplift', 'Native accessibility and hosted scheduler'],
  };
}
export function evalMarkdown(r: PublicEvalReport): string {
  const rows = r.cases.map(c => `| ${c.label} | ${c.status} | ${c.rejectedCalls} | ${c.modelTurns} |`).join('\n');
  return `# Gus evidence, not a victory lap\n\nRecorded: ${r.at ?? 'not run'}\n\n**${r.suite} model gate: ${r.gate}.** ${r.passed}/${r.cases.length} outcomes passed; ${r.noRejectedCalls}/${r.cases.length} passed with no rejected tool calls.\n\n${r.scope}\n\n${r.httpRequests} OpenRouter HTTP requests; ${r.qlooRequests} new Qloo HTTP requests. Rejected tool calls measure guarded corrections, not flawless reasoning. No-rejection runs do not establish human usefulness.\n\n| Scenario | Outcome | Rejected calls | Model turns |\n|---|---|---:|---:|\n${rows}\n\n## Not measured\n\n${r.unmeasured.map(s => '- ' + s).join('\n')}\n\nGenerated from private evidence with an allowlisted projection. No prompts, candidate names, action terms, credentials, receipts or raw provider responses are published.\n`;
}
