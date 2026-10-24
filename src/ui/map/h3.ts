/**
 * h3-js for React Native. Its Emscripten build asks for a UTF-16 TextDecoder at load time,
 * which Hermes doesn't ship; give it a small one first, then re-export what the map uses.
 */
const Native = globalThis.TextDecoder;
class Utf16Aware {
  private inner: InstanceType<typeof TextDecoder> | null;
  private utf16: boolean;
  readonly encoding: string;
  constructor(label = 'utf-8', opts?: TextDecoderOptions) {
    this.utf16 = /^utf-?16(le)?$/i.test(label);
    this.encoding = this.utf16 ? 'utf-16le' : 'utf-8';
    this.inner = this.utf16 ? null : new Native(label, opts);
  }
  decode(input?: ArrayBufferView | ArrayBuffer) {
    if (!this.utf16) return this.inner!.decode(input as never);
    if (!input) return '';
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    let out = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return out;
  }
}
try {
  new Native('utf-16le');
} catch {
  (globalThis as { TextDecoder: unknown }).TextDecoder = Utf16Aware;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const h3 = require('h3-js') as typeof import('h3-js');
export const cellToBoundary = h3.cellToBoundary;
export const cellToLatLng = h3.cellToLatLng;
