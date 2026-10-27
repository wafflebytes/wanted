/**
 * A progressive blur at a screen edge: stacked backdrop blurs, each masked to its own band, so
 * content melts as it reaches the dock (or the header) and reads as "there's more under here".
 */
const LAYERS = [0.5, 1, 2, 4, 8, 16];

export function ProgressiveBlur({ side }: { side: 'top' | 'bottom' }) {
  const n = LAYERS.length;
  const step = 100 / (n + 1);
  const dir = side === 'bottom' ? 'to bottom' : 'to top';
  return (
    <div className={`pblur pblur-${side}`} aria-hidden>
      {LAYERS.map((px, i) => {
        const a = i * step;
        const mask = `linear-gradient(${dir}, transparent ${a}%, #000 ${a + step}%, #000 ${a + 2 * step}%, transparent ${Math.min(100, a + 3 * step)}%)`;
        return <i key={px} style={{ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)`, maskImage: mask, WebkitMaskImage: mask }} />;
      })}
      <b />
    </div>
  );
}
