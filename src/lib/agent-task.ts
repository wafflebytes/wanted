/** A durable goal, not chat memory. This task owns research and preparation only.
 * Approval and saving still use the exact existing action contracts. */
export type AgentExecution = { engine: 'llm' | 'rules' | 'unavailable'; models: string[]; providerModels?: string[]; cached: boolean; latencyMs: number; steps: { tool: string; ok: boolean; note: string }[]; failure: string | null; modelFallbacks?: { model: string; error: string }[] };
export type AgentTask = {
  id: string;
  artistId: string;
  opportunityId: string;
  goal: 'find-support';
  version: number;
  generation: number;
  state: 'queued' | 'running' | 'waiting' | 'paused' | 'failed' | 'canceled';
  waitingFor: 'approval' | 'save' | 'availability' | 'evidence' | 'choice' | 'reply' | 'follow-up' | null;
  actionId: string | null;
  policy: 'balanced' | 'strict';
  attempts: number;
  nextCheckAt: number | null;
  execution?: AgentExecution;
  reason: string;
  createdAt: number;
  updatedAt: number;
};
export function taskSummary(task: AgentTask) {
  if (task.state === 'paused') return { title: 'Gus is paused.', body: 'Your saved work stays here. Resume when you’re ready.' };
  if (task.state === 'canceled') return { title: 'This job stopped.', body: 'The show is canceled. Earlier messages remain on record.' };
  if (task.state === 'failed') return { title: 'Gus needs another try.', body: 'The check didn’t finish. Your exact approvals and saved messages are unchanged.' };
  if (task.state === 'queued' || task.state === 'running') return { title: 'Gus is on it.', body: 'Checking the current show, qualifying the list and preparing one useful next step.' };
  const copy = {
    approval: { title: 'Ready for your decision.', body: 'Gus checked the bill and prepared the exact request. Nothing is saved to the inbox until you review it.' },
    save: { title: 'Your OK is saved.', body: 'The approved request is ready. Saving it to the test inbox is a separate choice.' },
    availability: { title: 'The date needs checking.', body: 'Gus stopped rather than assume who can make the new date. Confirm availability before he compares the bill again.' },
    evidence: { title: 'A few facts are missing.', body: 'Gus can’t make a defensible pick yet. Check the roster and taste evidence, then resume.' },
    choice: { title: 'This one needs your taste.', body: 'No single option clears the rule, or the best options tie. Pick an eligible act or change the scene.' },
    reply: { title: 'Waiting on the other side.', body: 'One request is in the test inbox. No artist agreement or confirmed show is implied.' },
    'follow-up': { title: 'The earlier message needs a follow-up.', body: 'The show changed after a request was saved. Gus kept the receipt and stopped rather than quietly send a replacement.' },
  };
  return task.waitingFor ? copy[task.waitingFor] : { title: 'Gus is waiting.', body: task.reason };
}
