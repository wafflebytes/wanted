/** A speech MIME header is not a license for unbounded memory allocation. */
export async function readAudioBounded(response: Response, maxBytes = 5 * 1024 * 1024): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) { await response.body?.cancel(); throw new Error('Audio exceeds the bounded speech envelope.'); }
  if (!response.body) throw new Error('Audio response has no body.');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Audio exceeds the bounded speech envelope.'); }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally { reader.releaseLock(); }
}
