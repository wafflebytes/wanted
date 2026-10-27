import { MX_SVG } from '@/ui/icons/mx.native.generated';

export type IconName = keyof typeof MX_SVG | 'apple' | 'github' | 'gus';

const EXTRA: Record<string, string> = {
  apple:
    '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16.37 12.7c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.97.9-3.76 2.28-1.61 2.79-.41 6.91 1.15 9.17.77 1.11 1.68 2.35 2.87 2.31 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.03-1.13 2.78-2.24.88-1.29 1.24-2.53 1.26-2.6-.03-.01-2.42-.93-2.44-3.68zM14.1 5.94c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.77-.97 2.82 1.03.08 2.07-.52 2.71-1.28z"/></svg>',
  github:
    '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
};

/** MX Icons: line when idle, bold when chosen. Plus Apple and GitHub marks. */
export function Icon({ name, bold, size = 22, className, style }: { name: IconName; bold?: boolean; size?: number; className?: string; style?: React.CSSProperties }) {
  const svg = EXTRA[name] ?? MX_SVG[name]?.[bold ? 'bold' : 'linear'] ?? '';
  return <span className={`ic ${className ?? ''}`} style={{ width: size, height: size, display: 'inline-grid', flex: 'none', ...style }} aria-hidden dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg style="width:100%;height:100%" `) }} />;
}
