/** Shared cancellation fence for native/web speech. A canceled download may finish,
 * but its generation can never play, invoke onEnd or unlock the next decision. */
export class VoiceSessionGate {
  private generation = 0;
  private controller: AbortController | null = null;
  begin() {
    this.cancel();
    const generation = this.generation;
    const controller = new AbortController(); this.controller = controller;
    return { signal: controller.signal, active: () => this.generation === generation && !controller.signal.aborted };
  }
  cancel() { this.generation++; this.controller?.abort(); this.controller = null; }
}
export class VoiceCanceled extends Error { constructor() { super('Voice playback canceled or superseded.'); } }
