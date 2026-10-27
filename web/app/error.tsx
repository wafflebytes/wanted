'use client';
import { Art } from '@web/components/Art';

/** Something broke mid-page: the amp's unplugged. One key to try again. */
export default function Failed({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="lost">
      <Art name="amp" size={148} />
      <h1>Something came unplugged.</h1>
      <p>That one’s on us. Try again, and if it keeps happening, give it a minute.</p>
      <button className="btn hot" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
