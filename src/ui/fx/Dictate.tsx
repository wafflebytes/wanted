/** On iOS and Android the system keyboard already dictates, so no extra mic button. */
import type { ReactNode } from 'react';

export type DictateProps = {
  children: (button: ReactNode) => ReactNode;
  onText: (text: string) => void;
  renderButton: (s: { listening: boolean; toggle: () => void }) => ReactNode;
};

export function Dictate({ children }: DictateProps) {
  return <>{children(null)}</>;
}
