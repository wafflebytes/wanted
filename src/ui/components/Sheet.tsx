/**
 * Wanted's one sheet (HIG sheets, the way Apple Maps and Flighty draw them). The glass panel
 * sits flush on the bottom edge and runs on behind it, so it has no bottom corners to show. It
 * opens at a medium detent sized to its content, and dragging the grabber or the title bar up
 * reveals it fully; at full height the content scrolls. Drag down, tap the scrim or the close
 * button to dismiss. Reduce Motion swaps the springs for short fades in place.
 */
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/names';
import { C, HIT, S } from '../theme';
import { T } from './T';

/** How far the panel runs on below the screen, so a hard pull up never shows its bottom. */
const OVERHANG = 240;
/** The grabber strip plus the title row. */
const HEAD = 76;
export const SHEET_RADIUS = 38;

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  leading,
  trailing,
  children,
  footer,
  closeLabel = 'Close',
  large,
  label,
  scrollKey,
}: {
  open: boolean;
  onClose: () => void;
  /** When this changes, the body scrolls to its end (a conversation). */
  scrollKey?: unknown;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Before the title: an icon tile or a sticker. */
  leading?: ReactNode;
  /** Beside the close button: share, more. */
  trailing?: ReactNode;
  children: ReactNode;
  /** Stays pinned above the home indicator: the sheet's main action. */
  footer?: ReactNode;
  closeLabel?: string;
  /** Open straight at full height (forms, long reads). */
  large?: boolean;
  label?: string;
}) {
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  return (
    <Modal transparent visible={present} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {present ? (
        <Panel scrollKey={scrollKey} open={open} onClose={onClose} onHidden={() => setPresent(false)} title={title} subtitle={subtitle} leading={leading} trailing={trailing} footer={footer} closeLabel={closeLabel} large={large} label={label}>
          {children}
        </Panel>
      ) : null}
    </Modal>
  );
}

function Panel({
  open,
  onClose,
  onHidden,
  title,
  subtitle,
  leading,
  trailing,
  children,
  footer,
  closeLabel,
  large,
  label,
  scrollKey,
}: {
  scrollKey?: unknown;
  open: boolean;
  onClose: () => void;
  onHidden: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  large?: boolean;
  label?: string;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [contentH, setContentH] = useState<number | null>(null);
  const [footerH, setFooterH] = useState(0);
  const [headH, setHeadH] = useState(HEAD);
  const [expanded, setExpanded] = useState(!!large);

  // Detents as the panel's top edge, in points from the top of the screen.
  const top = insets.top + S.sm;
  const fitted = contentH === null ? height * 0.5 : headH + contentH + footerH + Math.max(insets.bottom, S.lg);
  const medium = Math.max(top, height - Math.min(fitted, height * 0.62));
  const canGrow = medium > top + 1;
  const at = expanded || !canGrow ? top : medium;

  const y = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const current = useRef(height);
  const start = useRef(0);
  const scrollY = useRef(0);
  const scroller = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollKey === undefined) return;
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [scrollKey]);

  const to = (v: number, velocity = 0, done?: () => void) => {
    current.current = v;
    if (reduced) {
      y.setValue(v);
      done?.();
      return;
    }
    Animated.spring(y, { toValue: v, velocity, useNativeDriver: false, damping: 30, stiffness: 300, mass: 0.9, overshootClamping: v >= height }).start(({ finished }) => finished && done?.());
  };

  useEffect(() => {
    if (open) {
      if (reduced) y.setValue(at);
      Animated.timing(fade, { toValue: 1, duration: reduced ? 120 : 260, useNativeDriver: false }).start();
      to(at);
    } else {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      to(height, 0, onHidden);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, at, height]);

  const settle = (dy: number, vy: number) => {
    const from = start.current + dy;
    const projected = from + vy * 160;
    if (projected > (canGrow ? medium : top) + 90 || vy > 1.1) {
      haptic.tick();
      onClose();
      return;
    }
    const grow = canGrow && projected < (top + medium) / 2;
    if (grow !== expanded) haptic.tick();
    setExpanded(grow);
    to(grow ? top : canGrow ? medium : top, vy);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => y.stopAnimation((v) => (start.current = v)),
        onPanResponderMove: (_, g) => {
          const next = start.current + g.dy;
          y.setValue(next < top ? top - Math.sqrt(top - next) * 2 : next);
        },
        onPanResponderRelease: (_, g) => settle(g.dy, g.vy),
        onPanResponderTerminate: (_, g) => settle(g.dy, g.vy),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top, medium, canGrow, expanded],
  );

  // At the medium detent the body drags the sheet up instead of scrolling; at full height a
  // pull down from the top of the scroll drags the sheet down.
  const bodyPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2 && ((!expanded && canGrow) || (g.dy > 0 && scrollY.current <= 0)),
        onPanResponderGrant: () => y.stopAnimation((v) => (start.current = v)),
        onPanResponderMove: (_, g) => {
          const next = start.current + g.dy;
          y.setValue(next < top ? top - Math.sqrt(top - next) * 2 : next);
        },
        onPanResponderRelease: (_, g) => settle(g.dy, g.vy),
        onPanResponderTerminate: (_, g) => settle(g.dy, g.vy),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top, medium, canGrow, expanded],
  );

  const cycle = () => {
    if (!canGrow) return;
    haptic.tick();
    setExpanded((e) => !e);
  };

  const visible = height - top;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fade }]} pointerEvents="none" />
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: visible + OVERHANG, transform: [{ translateY: y }] }}>
        <GlassSurface
          preset="overlay"
          elevation="raised"
          accessibilityViewIsModal
          accessibilityLabel={label}
          onAccessibilityEscape={onClose}
          style={{ flex: 1, borderRadius: SHEET_RADIUS, overflow: 'hidden', maxWidth: 680, width: '100%', alignSelf: 'center' }}
        >
          <View {...pan.panHandlers} onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}>
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel={canGrow ? (expanded ? 'Collapse sheet' : 'Expand sheet') : 'Sheet grabber'}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => setExpanded(e.nativeEvent.actionName === 'increment')}
              onPress={cycle}
              style={{ alignItems: 'center', justifyContent: 'center', height: 20 }}
            >
              <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(235,235,245,0.32)' }} />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingLeft: S.xl, paddingRight: S.lg, paddingBottom: S.md, minHeight: 56 }}>
              {leading}
              <View style={{ flex: 1, gap: 2 }}>
                {typeof title === 'string' ? (
                  <T v="title" accessibilityRole="header" numberOfLines={2}>
                    {title}
                  </T>
                ) : (
                  title
                )}
                {typeof subtitle === 'string' ? <T v="subhead" color={C.text2}>{subtitle}</T> : subtitle}
              </View>
              {trailing}
              <SheetButton icon="close" label={closeLabel} onPress={onClose} />
            </View>
          </View>
          <View style={{ height: visible - headH - footerH }} {...bodyPan.panHandlers}>
            <ScrollView
              ref={scroller}
              scrollEnabled={expanded || !canGrow}
              onScroll={(e) => (scrollY.current = e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: footer ? S.lg : Math.max(insets.bottom, S.lg) + S.lg, gap: S.lg }}
            >
              <View onLayout={(e) => setContentH(e.nativeEvent.layout.height + (footer ? S.lg : S.lg * 2))} style={{ gap: S.lg }}>
                {children}
              </View>
            </ScrollView>
          </View>
          {footer ? (
            <View onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} style={{ paddingHorizontal: S.xl, paddingTop: S.sm, paddingBottom: Math.max(insets.bottom, S.lg) }}>
              {footer}
            </View>
          ) : null}
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

/** The round 44 pt button in a sheet's title bar (close, share, more). */
export function SheetButton({ icon, label, onPress, tint }: { icon: IconName; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tick();
        onPress();
      }}
      style={({ pressed }) => ({ width: HIT, height: HIT, borderRadius: HIT / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tint ?? (pressed ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)') })}
    >
      {icon === 'close' ? <CloseGlyph /> : <Icon name={icon} size={20} color={C.text} />}
    </Pressable>
  );
}

/** The plain SF-style X: two strokes, not MX's circled close, which reads as a badge at this size. */
function CloseGlyph() {
  return (
    <View style={{ width: 14, height: 14 }}>
      <View style={{ position: 'absolute', left: 6, top: -1.5, width: 2.2, height: 17, borderRadius: 1.1, backgroundColor: C.text, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', left: 6, top: -1.5, width: 2.2, height: 17, borderRadius: 1.1, backgroundColor: C.text, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}
