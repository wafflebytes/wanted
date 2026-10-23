/** Imperative toasts ("New signature: Clintonville") on top of Glassy UI's declarative GlassToast. */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { GlassToast, GlassToastDescription, GlassToastProvider, GlassToastTitle, GlassToastViewport } from '@/components/glassyui/glass-toast';

type Toast = { id: number; title: string; body?: string };
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => setToasts((all) => [...all.slice(-2), { ...t, id: Date.now() + Math.random() }]), []);
  const value = useMemo(() => push, [push]);
  return (
    <GlassToastProvider duration={4200}>
      <Ctx.Provider value={value}>
        {children}
        {toasts.map((t) => (
          <GlassToast key={t.id} defaultOpen onOpenChange={(open) => !open && setToasts((all) => all.filter((x) => x.id !== t.id))}>
            <GlassToastTitle>{t.title}</GlassToastTitle>
            {t.body ? <GlassToastDescription>{t.body}</GlassToastDescription> : null}
          </GlassToast>
        ))}
        <GlassToastViewport />
      </Ctx.Provider>
    </GlassToastProvider>
  );
}

export const useToast = () => useContext(Ctx);
