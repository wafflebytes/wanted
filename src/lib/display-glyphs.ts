/** Audited cmap of all three Karl ST Trial TTFs. The trial omits most punctuation,
 * symbols and accented letters. Keep those in the system rounded face, not .notdef.
 * Regular, Medium and Bold have identical coverage. */
const KARL_GLYPHS = new Set([...' ,-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00a0']);
export function displayRuns(text: string): { text: string; fallback: boolean }[] {
  const runs: { text: string; fallback: boolean }[] = [];
  for (const char of text) {
    const fallback = !KARL_GLYPHS.has(char) && char !== '\n' && char !== '\t' && char !== '\r';
    const last = runs[runs.length - 1];
    if (last?.fallback === fallback) last.text += char;
    else runs.push({ text: char, fallback });
  }
  return runs;
}
export const isKarl = (family?: string) => !!family?.startsWith('KarlSTTrial-');
