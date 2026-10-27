/** Core building blocks: buttons, content cards, chips and rows. */
import { type ReactNode, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { haptic } from '../haptics';
import { C, F, HIT, R, S } from '../theme';
import { T } from './T';

type Tone = 'scout' | 'action' | 'glass' | 'ghost' | 'danger' | 'gold';

/**
 * A capsule button. Scout is stage purple, Action is the blue pill, Glass is the plain
 * control. Glass sits only on navigation and controls, never on content (PRD 8.2 rules).
 */
export function Btn({
  children,
  tone = 'glass',
  size = 'md',
  icon,
  busy,
  disabled,
  onPress,
  style,
  full,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  busy?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  // Small buttons draw at 36 pt and reach 44 pt with hit slop; md and lg are full targets.
  const pad = size === 'sm' ? { minHeight: 36, paddingHorizontal: 14, gap: 6 } : size === 'lg' ? { minHeight: 56, paddingHorizontal: 24, gap: 10 } : { minHeight: 50, paddingHorizontal: 20, gap: 8 };
  const fontSize = size === 'sm' ? 15 : 17;
  const tint = tone === 'scout' ? C.purple : tone === 'action' ? C.blueDeep : tone === 'danger' ? '#8E1B14' : tone === 'gold' ? '#9A6A00' : undefined;
  const label =
    typeof children === 'string' || typeof children === 'number' ? (
      <T style={{ fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize, color: C.text, letterSpacing: -0.1 }} numberOfLines={1}>
        {children}
      </T>
    ) : (
      children
    );
  const inner = (
    <View style={[styles.btnInner, pad]}>
      {busy ? <ActivityIndicator size="small" color={C.text} /> : icon}
      {label}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      hitSlop={size === 'sm' ? 4 : undefined}
      onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 90, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }).start()}
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      style={[full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, disabled && { opacity: 0.45 }, style]}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {tone === 'ghost' ? (
          <View style={[styles.ghost]}>{inner}</View>
        ) : tone === 'action' ? (
          <View style={[styles.action]}>{inner}</View>
        ) : (
          <GlassSurface preset="control" tint={tint} style={{ borderRadius: R.pill, borderCurve: 'continuous', overflow: 'hidden' }}>
            {inner}
          </GlassSurface>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Content card (never glass): #141414, radius 28. */
export function Card({ children, style, hi, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; hi?: boolean; onPress?: () => void; accessibilityLabel?: string }) {
  const body = <View style={[styles.card, hi && { backgroundColor: C.cardHi }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function Chip({ children, color = C.text2, bg = C.fill2, onPress, mono, icon, accessibilityLabel, selected }: { children: ReactNode; color?: string; bg?: string; onPress?: () => void; mono?: boolean; icon?: ReactNode; accessibilityLabel?: string; selected?: boolean }) {
  const content = (
    <View style={[styles.chip, { backgroundColor: bg }, onPress ? { minHeight: 34 } : null]}>
      {icon}
      <T style={{ fontFamily: mono ? F.monoMed : (F.rounded ?? F.bodyMed), fontWeight: mono ? undefined : '600', fontSize: mono ? 12 : 14, color, letterSpacing: mono ? 0.2 : -0.1 }} numberOfLines={1}>
        {children}
      </T>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={6}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function Row({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Col({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineHi, marginVertical: 4 }} />;
}

/** A labeled stat: a Karl display number over a quiet label. */
export function Stat({ value, label, color = C.text, sub }: { value: ReactNode; label: string; color?: string; sub?: string }) {
  return (
    <View style={{ gap: 2, minWidth: 64 }}>
      <T style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color, fontVariant: ['tabular-nums'] }}>{value}</T>
      <T v="footnote">{label}</T>
      {sub ? <T v="caption">{sub}</T> : null}
    </View>
  );
}

/** A horizontal bar from -1 to 1 around a center line (skew bars, FR-13). */
export function SkewBar({ label, skew, color = C.purpleHi }: { label: string; skew: number; color?: string }) {
  const w = Math.min(1, Math.abs(skew)) * 50;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${label}: ${skew > 0.1 ? 'over-indexes' : skew < -0.1 ? 'under-indexes' : 'about average'}`}>
      <T v="footnote" style={{ width: 84 }}>
        {label}
      </T>
      <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: C.lineHi }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 5, backgroundColor: skew >= 0 ? color : 'rgba(255,255,255,0.22)', left: skew >= 0 ? '50%' : `${50 - w}%`, width: `${w}%` }} />
      </View>
    </View>
  );
}

/** Two-bar "see why" (Flighty pattern): Heat and Lift percentiles for a city. */
export function WhyBars({ heatPct, liftPct }: { heatPct: number | null; liftPct: number | null }) {
  const bar = (label: string, sub: string, v: number | null, color: string) => (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="headline">
          {label} <T v="footnote">{sub}</T>
        </T>
        <T v="mono" color={color}>
          {v === null ? '—' : `${Math.round(v * 100)}th pct`}
        </T>
      </View>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.round((v ?? 0) * 100)}%`, backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      {bar('Heat', 'where your taste lives', heatPct, C.heatHi)}
      {bar('Lift', 'vs. a typical act', liftPct, C.gold)}
    </View>
  );
}

export function Empty({ title, line, children }: { title: string; line?: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 24 }}>
      <T v="head" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {line ? (
        <T v="gus" color={C.text2} style={{ textAlign: 'center' }}>
          {line}
        </T>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ghost: { borderRadius: R.pill },
  action: {
    borderRadius: R.pill,
    backgroundColor: C.blueDeep,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    experimental_backgroundImage: `linear-gradient(180deg, ${C.blue}, ${C.blueDeep})`,
  } as ViewStyle,
  card: { backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.lg, gap: S.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
});

/** Section header for grouped content: a title3 heading with an optional trailing action. */
export function Section({ title, trailing, children, style, tint }: { title: string; trailing?: ReactNode; children?: ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  return (
    <View style={[{ gap: S.sm }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: S.sm }}>
        <T v="head" color={tint} accessibilityRole="header" style={{ flexShrink: 1 }}>
          {title}
        </T>
        {trailing}
      </View>
      {children}
    </View>
  );
}

/**
 * Round icon button: draws at `size`, always answers a 44 pt touch. Glass only when it floats
 * over content (map chrome); plain fill inside content.
 */
export function IconBtn({ icon, label, onPress, size = 40, glass, tint, selected, style }: { icon: ReactNode; label: string; onPress: () => void; size?: number; glass?: boolean; tint?: string; selected?: boolean; style?: StyleProp<ViewStyle> }) {
  const slop = Math.max(0, (HIT - size) / 2);
  const face = (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: glass ? undefined : (tint ?? (selected ? C.text : C.fill)) }}>{icon}</View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={slop}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
    >
      {glass ? (
        <GlassSurface preset="control" tint={tint} style={{ borderRadius: size / 2, overflow: 'hidden' }}>
          {face}
        </GlassSurface>
      ) : (
        face
      )}
    </Pressable>
  );
}

/**
 * A list row: leading accessory, title and subtitle, trailing value or control. At least
 * 44 pt tall; pressable rows get a press highlight.
 */
export function ListRow({ leading, title, subtitle, trailing, onPress, accessibilityLabel, style }: { leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; onPress?: () => void; accessibilityLabel?: string; style?: StyleProp<ViewStyle> }) {
  const body = (pressed: boolean) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: HIT + 8, paddingVertical: S.sm, paddingHorizontal: S.lg, backgroundColor: pressed ? C.fill2 : 'transparent' }, style]}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? (
          <T v="body" numberOfLines={2}>
            {title}
          </T>
        ) : (
          title
        )}
        {typeof subtitle === 'string' ? <T v="footnote">{subtitle}</T> : subtitle}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/** Inset grouped list container (Settings-style): rows separated by hairlines. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden' }, style]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineHi, marginLeft: S.lg }} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Segmented control (HIG: closely related choices, about five segments max on iPhone, nouns,
 * equal widths). Fills its container.
 */
export function Segmented<K extends string>({ value, options, onChange, label }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: C.fill, borderRadius: 10, padding: 2, minHeight: 36 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (on) return;
              haptic.tick();
              onChange(o.key);
            }}
            style={{ flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: on ? 'rgba(99,99,102,0.9)' : 'transparent' }}
          >
            <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: on ? '700' : '500', fontSize: 14, color: C.text }} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
