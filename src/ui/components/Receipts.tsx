/**
 * Provenance labels (FR-26) and receipts (FR-30b). Every "Qloo says" chip opens the exact
 * call behind it: endpoint, params (never the key), time, cache date and the values used.
 */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { GlassSheet, GlassSheetContent, GlassSheetTitle } from '@/components/glassyui/glass-sheet';
import type { Provenance, Receipt } from '@/lib/types';
import { api } from '../api';
import { C, F } from '../theme';
import { Chip, Divider, Row } from './core';
import { T } from './T';
import { Icon } from '@/ui/icons/Icon';

type Open = { receipts: Receipt[]; title?: string; values?: Record<string, unknown> | null; note?: string };

const Ctx = createContext<{ open: (o: Open) => void; openId: (id: string, values?: Record<string, unknown>) => void } | null>(null);

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Open | null>(null);
  const [visible, setVisible] = useState(false);
  const open = useCallback((o: Open) => {
    setState(o);
    setVisible(true);
  }, []);
  const openId = useCallback(
    async (id: string, values?: Record<string, unknown>) => {
      try {
        const r = await api.get<Receipt & { at: number }>(`/receipt/${id}`);
        open({ receipts: [r], values });
      } catch {
        open({ receipts: [], note: 'That receipt has expired from the trace.' });
      }
    },
    [open],
  );
  const value = useMemo(() => ({ open, openId }), [open, openId]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <GlassSheet open={visible} onOpenChange={setVisible}>
        <GlassSheetContent closeLabel="Close receipt">
          <GlassSheetTitle>{state?.title ?? 'Receipt'}</GlassSheetTitle>
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14, paddingTop: 8 }}>
            <T v="small">The exact Qloo call behind this. Params as sent; the API key is never stored or shown.</T>
            {state?.note ? <T v="small">{state.note}</T> : null}
            {state?.receipts.map((r) => <ReceiptBody key={r.id} r={r} />)}
            {state?.values ? (
              <View style={{ gap: 6 }}>
                <T v="label">Values used</T>
                {Object.entries(state.values).map(([k, v]) => (
                  <Row key={k} style={{ justifyContent: 'space-between' }}>
                    <T v="small">{k}</T>
                    <T v="mono" style={{ fontSize: 12.5 }}>
                      {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(3)) : String(v)}
                    </T>
                  </Row>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </GlassSheetContent>
      </GlassSheet>
    </Ctx.Provider>
  );
}

function ReceiptBody({ r }: { r: Receipt }) {
  const when = r.cachedAt ? new Date(r.cachedAt) : null;
  return (
    <View style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14 }}>
      <T v="head" style={{ fontSize: 15 }}>
        {r.purpose}
      </T>
      <Row wrap gap={6}>
        <Chip mono color={C.qloo}>
          {r.method} {r.endpoint}
        </Chip>
        <Chip mono>{r.status ?? 'error'}</Chip>
        <Chip mono>{r.cached ? `cached ${when ? when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}` : `${r.latencyMs} ms live`}</Chip>
        {r.stale ? <Chip mono color={C.warn}>stale (Qloo was down)</Chip> : null}
        {r.resultCount !== null ? <Chip mono>{r.resultCount} results</Chip> : null}
      </Row>
      <Divider />
      {Object.entries(r.params).map(([k, v]) => (
        <View key={k} style={{ gap: 1 }}>
          <T v="monoSmall" color={C.text3}>
            {k}
          </T>
          <T v="mono" style={{ fontSize: 12, lineHeight: 16 }} selectable>
            {typeof v === 'string' ? v : JSON.stringify(v)}
          </T>
        </View>
      ))}
    </View>
  );
}

export function useReceipts() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useReceipts needs ReceiptProvider');
  return c;
}

/** Where a claim comes from, said plainly. Qloo stays quiet but probe-able: its label opens the receipt. */
const PROV: Record<Provenance, { label: string; color: string }> = {
  qloo: { label: 'Qloo taste data', color: C.qloo },
  fans: { label: 'Fan signatures', color: C.fans },
  gus: { label: 'Gus’s read', color: C.gus },
};

/** A provenance note: small grey words, not a pill. With receipts, tapping it opens them. */
export function Prov({ kind, receipts, values, title, suffix }: { kind: Provenance; receipts?: Receipt[] | null; values?: Record<string, unknown> | null; title?: string; suffix?: string }) {
  const { open } = useReceipts();
  const p = PROV[kind];
  const can = kind === 'qloo' && !!receipts?.length;
  const text = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: can ? 28 : undefined }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: p.color }} />
      <T v="caption" numberOfLines={1}>
        {p.label}
        {suffix ? ` · ${suffix}` : ''}
      </T>
      {can ? <Icon name="receipt" size={12} color={C.text3} /> : null}
    </View>
  );
  if (!can) return text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${p.label}. Open the receipt.`} hitSlop={8} onPress={() => open({ receipts: receipts!, values, title })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {text}
    </Pressable>
  );
}

export function DemoTag() {
  return <T v="caption">Demo data</T>;
}

export const monoNum = (n: number | null | undefined, d = 0) => (n === null || n === undefined ? '—' : n.toFixed(d));
export { F };
