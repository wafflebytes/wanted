/**
 * Paper things that live on the black wall: a postage-stamp edge for keepsakes (a fan's
 * signature, a poster pulled off the board), and the status banner Flighty puts on a flight
 * ("Gate departure in 1h 45m"), which Wanted uses for "Proved it", "Held" and "It's on".
 */
import { type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '../haptics';
import { Icon } from '../icons/Icon';
import { C, emberColor, F, S } from '../theme';
import { T } from './T';

/**
 * A stamp: cream paper whose edge is bitten into scallops. The bites are the wall colour, so
 * pass `wall` when the stamp sits on anything but the black canvas.
 */
export function StampPaper({ width, height, children, tilt = 0, wall = C.canvas, paper = C.cream, bite = 3.5, style }: { width: number; height: number; children?: ReactNode; tilt?: number; wall?: string; paper?: string; bite?: number; style?: StyleProp<ViewStyle> }) {
  const step = bite * 2.6;
  const across = Math.max(2, Math.floor(width / step));
  const down = Math.max(2, Math.floor(height / step));
  const dot = (key: string, left: number, top: number) => <View key={key} style={{ position: 'absolute', left: left - bite, top: top - bite, width: bite * 2, height: bite * 2, borderRadius: bite, backgroundColor: wall }} />;
  const dots: ReactNode[] = [];
  for (let i = 0; i <= across; i++) {
    const x = (i / across) * width;
    dots.push(dot(`t${i}`, x, 0), dot(`b${i}`, x, height));
  }
  for (let j = 1; j < down; j++) {
    const y = (j / down) * height;
    dots.push(dot(`l${j}`, 0, y), dot(`r${j}`, width, y));
  }
  return (
    <View style={[{ width, height, transform: [{ rotate: `${tilt}deg` }], shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, style]}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: paper, overflow: 'hidden' } as object}>
        <View style={{ position: 'absolute', left: bite + 3, top: bite + 3, right: bite + 3, bottom: bite + 3, padding: S.sm }}>{children}</View>
        {dots}
      </View>
    </View>
  );
}

type Sig = { initials: string; number: number; font: number; neighborhood: string | null; place?: string; when?: string };

/** One signature as a stamp: their handwriting, their number, where they are. */
export function SignatureStamp({ s, tilt = 0, width = 132, wall }: { s: Sig; tilt?: number; width?: number; wall?: string }) {
  const ink = s.number % 5 === 0 ? '#1d3a6b' : C.posterInk;
  return (
    <View accessible accessibilityLabel={`${s.initials}, signature ${s.number}${s.neighborhood ? `, ${s.neighborhood}` : ''}${s.place ? `, ${s.place}` : ''}${s.when ? `, ${s.when}` : ''}`}>
      <StampPaper width={width} height={width * 1.12} tilt={tilt} wall={wall}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 9, letterSpacing: 1.4, color: C.posterRed }}>WANTED</T>
            <T style={{ fontFamily: F.monoBold, fontSize: 10, color: 'rgba(58,34,19,0.6)' }}>No.{s.number}</T>
          </View>
          <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.sig[s.font % 3], fontSize: 30, lineHeight: 40, color: ink, textAlign: 'center' }}>
            {s.initials}
          </T>
          <View style={{ gap: 1 }}>
            <View style={{ height: 1, backgroundColor: 'rgba(58,34,19,0.22)', marginBottom: 4 }} />
            <T numberOfLines={1} style={{ fontFamily: F.head, fontWeight: '700', fontSize: 12, color: C.posterInk }}>
              {s.neighborhood ?? s.place ?? ' '}
            </T>
            <T numberOfLines={1} style={{ fontFamily: F.body, fontSize: 11, color: 'rgba(58,34,19,0.6)' }}>
              {[s.neighborhood ? s.place : null, s.when].filter(Boolean).join(' · ') || ' '}
            </T>
          </View>
        </View>
      </StampPaper>
    </View>
  );
}

const TONES = {
  good: { bg: 'rgba(48,209,88,0.13)', line: 'rgba(48,209,88,0.32)', fg: C.good },
  fans: { bg: 'rgba(155,48,224,0.16)', line: 'rgba(180,92,240,0.34)', fg: C.purpleHi },
  gold: { bg: 'rgba(245,197,66,0.12)', line: 'rgba(245,197,66,0.3)', fg: C.gold },
  live: { bg: 'rgba(255,69,58,0.12)', line: 'rgba(255,69,58,0.32)', fg: '#FF6B61' },
} as const;
export type BannerTone = keyof typeof TONES;

/** Flighty's status banner: a tinted slab with a coloured headline and one plain sentence. */
export function StatusBanner({ tone, title, body, onPress, style }: { tone: BannerTone; title: string; body?: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const t = TONES[tone];
  const inner = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: t.bg, borderColor: t.line, borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', paddingHorizontal: S.lg, paddingVertical: S.md }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headline" color={t.fg} style={{ fontFamily: F.rounded ?? F.head, fontWeight: '700' }}>
          {title}
        </T>
        {body ? (
          <T v="footnote" color={t.fg} style={{ opacity: 0.9 }}>
            {body}
          </T>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron" size={14} color={t.fg} /> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={() => (haptic.tick(), onPress())} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {inner}
    </Pressable>
  );
}

/** Apple Maps' place actions: a row of equal tiles, an icon over a short word. */
export function ActionTiles({ items }: { items: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void; tint?: string; busy?: boolean }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.sm }}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          disabled={it.busy}
          onPress={() => (haptic.tick(), it.onPress())}
          style={({ pressed }) => ({ flex: 1, minHeight: 64, borderRadius: 16, borderCurve: 'continuous', backgroundColor: pressed ? C.fill : C.cardHi, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: S.sm, opacity: it.busy ? 0.5 : 1 })}
        >
          <Icon name={it.icon} size={22} color={it.tint ?? C.text} variant="bold" />
          <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 12, color: it.tint ?? C.text }} numberOfLines={1}>
            {it.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

/** The map's ranked list: an ember number, a name, a purple count. */
export function RankList({ rows, wall = C.card }: { rows: { key: string; name: string; value: string; mark?: ReactNode }[]; wall?: string }) {
  return (
    <View style={{ backgroundColor: wall, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
          <T style={{ fontFamily: F.displayBold, fontSize: 20, width: 24, color: emberRank(i), fontVariant: ['tabular-nums'] }}>{i + 1}</T>
          <T v="body" style={{ flex: 1 }} numberOfLines={1}>
            {r.name}
          </T>
          {r.mark}
          <T v="footnote" color={C.fans} style={{ fontWeight: '600' }}>
            {r.value}
          </T>
        </View>
      ))}
    </View>
  );
}

const emberRank = (i: number) => emberColor(1 - i * 0.14);
