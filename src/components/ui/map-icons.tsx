/** The icons mapcn draws, from MX Icons instead of lucide-react, as inline SVG (works in DOM components). */
import { MX_SVG } from '@/ui/icons/mx.native.generated';

type P = { className?: string };

function Mx({ name, variant = 'linear', className }: { name: keyof typeof MX_SVG; variant?: 'linear' | 'bold' } & P) {
  const size = className?.includes('size-3.5') ? 14 : className?.includes('size-5') ? 20 : 16;
  return (
    <span
      aria-hidden
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: MX_SVG[name][variant].replace('<svg ', `<svg width="${size}" height="${size}" `).replace(/width="24" height="24" /, '') }}
    />
  );
}

export const X = (p: P) => <Mx name="close" {...p} />;
export const Minus = (p: P) => <Mx name="minus" {...p} />;
export const Plus = (p: P) => <Mx name="add" {...p} />;
export const Locate = (p: P) => <Mx name="gps" {...p} />;
export const Maximize = (p: P) => <Mx name="discover" {...p} />;
export const Loader2 = ({ className }: P) => (
  <span className={className} style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 8, border: '2px solid rgba(255,255,255,.25)', borderTopColor: '#fff' }} />
);
