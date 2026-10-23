/**
 * Listening for Gus on iOS and Android: the system keyboard's dictation does the speech to
 * text there, so this reports "not supported" and the agent focuses its text field instead.
 */
export type Listen = { supported: boolean; listening: boolean; stream: MediaStream | null; start: () => Promise<void>; stop: () => void };

export function useListen(_opts: { onPartial: (t: string) => void; onFinal: (t: string) => void }): Listen {
  return { supported: false, listening: false, stream: null, start: async () => {}, stop: () => {} };
}
