/**
 * Outbound request recorder for the privacy gate (PRD 16.8): tests install a recorder and
 * assert that no Qloo or LLM body ever contains a fan's neighborhood, contact or device hash.
 * Also a runtime guard: LLM prompts are checked against known fan strings before sending.
 */
export type OutboundRecord = { kind: 'qloo' | 'llm' | 'tts' | 'asr' | 'web'; url: string; body: string };

type Recorder = (r: OutboundRecord) => void;

const g = globalThis as { __wantedOutbound?: Recorder };

export function setOutboundRecorder(fn: Recorder | undefined) {
  g.__wantedOutbound = fn;
}

export function recordOutbound(r: OutboundRecord) {
  g.__wantedOutbound?.(r);
}
