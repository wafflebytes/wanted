// MX Icons ships per-folder modules without type declarations.
declare module 'mx-icons/components/*' {
  import type { ComponentType } from 'react';
  export const variants: { variant: string; slug: string; componentName: string; Component: ComponentType<{ size?: number | string; color?: string; className?: string }> }[];
}
