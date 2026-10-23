/** shadcn's class joiner, without tailwind-merge (Wanted has no Tailwind; see components/ui/map-css.ts). */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}
