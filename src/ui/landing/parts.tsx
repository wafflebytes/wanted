/** Pieces of the landing sheet: Sound tiles, WANTED stamps, the tour passport, step cards. */
import { Image } from 'expo-image';
import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Chip, Row } from '../components/core';
import { T } from '../components/T';
import { haptic } from '../haptics';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/names';
import { LANDING } from '../landing.generated';
import { C, F, gradient, IMAGES, R, S } from '../theme';

/** The sheet's own color: stamp perforations punch through to it. */
export const SHEET = '#0C0C0E';

/** Pressable that dips on touch, the way system cards do. */
export function Press({ children, onPress, style, label, hint }: { children: ReactNode; onPress: () => void; style?: ViewStyle; label: string; hint?: string }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function SoundTile({ icon, title, sub, bg, onPress }: { icon: IconName; title: string; sub: string; bg: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} label={`${title}, ${sub}`} style={{ alignItems: 'center', width: 76, gap: 6 }}>
      <View style={[styles.tile, gradient(bg)]}>
        <Icon name={icon} variant="bold" size={28} color="#fff" />
      </View>
      <View style={{ alignItems: 'center' }}>
        <T style={styles.tileTitle} numberOfLines={1}>
          {title}
        </T>
        <T v="caption" numberOfLines={1}>
          {sub}
        </T>
      </View>
    </Press>
  );
}

const STAMP_W = 152;
const STAMP_H = 196;
/** Sizes a city name to the stamp's width; the web has no adjustsFontSizeToFit. */
const citySize = (name: string) => Math.min(23, Math.floor(116 / (name.length * 0.6)));

const TILT = ['-3deg', '2.2deg', '-1.4deg', '2.8deg', '-2deg'];

/** Perforated edge: a cream sheet with holes punched along every side. */
function Perforation() {
  const holes = [];
  const gap = 12;
  for (let x = gap / 2; x < STAMP_W; x += gap) holes.push([x, 0], [x, STAMP_H]);
  for (let y = gap / 2; y < STAMP_H; y += gap) holes.push([0, y], [STAMP_W, y]);
  return (
    <Svg width={STAMP_W} height={STAMP_H} style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={STAMP_W} height={STAMP_H} fill={C.cream} />
      {holes.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={4} fill={SHEET} />
      ))}
    </Svg>
  );
}

type Wanted = (typeof LANDING.wanted)[number];

export function Stamp({ w, i, onPress }: { w: Wanted; i: number; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      label={`${w.city}, ${w.state}. Qloo rank ${w.rank} of ${LANDING.metros}. ${w.signatures} fans signed. Top neighborhood ${w.top}.`}
      hint="Opens the poster fans sign"
      style={{ width: STAMP_W, height: STAMP_H, transform: [{ rotate: TILT[i % TILT.length] }] }}
    >
      <View style={styles.stampShadow}>
        <Perforation />
        <View style={styles.stampInner}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T maxFontSizeMultiplier={1.2} style={styles.stampKicker}>WANTED IN</T>
            <T maxFontSizeMultiplier={1.2} style={styles.stampRank}>#{w.rank}</T>
          </Row>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <T maxFontSizeMultiplier={1.2} style={[styles.stampCity, { fontSize: citySize(w.city), lineHeight: citySize(w.city) * 1.15 }]} numberOfLines={1}>
              {w.city}
            </T>
            <T maxFontSizeMultiplier={1.2} style={styles.stampState}>{w.state}, USA</T>
          </View>
          <View style={styles.stampRule} />
          <Row gap={6} style={{ alignItems: 'baseline' }}>
            <T maxFontSizeMultiplier={1.2} style={styles.stampCount}>{w.signatures}</T>
            <T maxFontSizeMultiplier={1.2} style={styles.stampSigned}>signed</T>
          </Row>
          <T maxFontSizeMultiplier={1.2} style={styles.stampTop} numberOfLines={1}>
            {w.top}
          </T>
        </View>
      </View>
    </Press>
  );
}

function PassStat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T style={styles.passLabel}>{label}</T>
      <T style={styles.passValue} numberOfLines={1}>
        {value}
        {unit ? <T style={styles.passUnit}> {unit}</T> : null}
      </T>
      <T style={styles.passSub} numberOfLines={1}>
        {sub}
      </T>
    </View>
  );
}

/** Maya's demo as a tour passport, after Flighty's. */
export function Passport({ onPress }: { onPress: () => void }) {
  const { route, wanted, sound } = LANDING;
  const signed = wanted.reduce((n, w) => n + w.signatures, 0);
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  return (
    <View style={styles.pass}>
      <Image source={IMAGES['maya-sticker']} style={styles.passSticker} contentFit="contain" accessibilityIgnoresInvertColors />
      <View style={{ gap: 2, paddingRight: 96 }}>
        <T style={styles.passTitle}>TOUR PASSPORT</T>
        <T style={styles.passTongues}>WANTED · SE BUSCA · RECHERCHÉ</T>
      </View>
      <View style={{ gap: 4, paddingRight: 96 }}>
        <T v="title2">Maya Ortiz</T>
        <T v="footnote" color="rgba(244,233,211,0.72)">
          Indie folk-pop. Sounds like {sound.join(' + ')}.
        </T>
      </View>
      <View style={{ gap: S.lg }}>
        <Row gap={S.lg}>
          <PassStat label="Dates" value={String(route.stops.length)} sub={`${first.city} → ${last.city}`} />
          <PassStat label="Route" value={route.km.toLocaleString('en-US')} unit="km" sub={`${(route.km / 40075).toFixed(2)}× around the world`} />
        </Row>
        <Row gap={S.lg}>
          <PassStat label="Signatures" value={String(signed)} sub={`across ${wanted.length} cities`} />
          <PassStat label="Tour score" value={String(route.score)} sub="Gus's routing, roasted" />
        </Row>
      </View>
      <Press onPress={onPress} label="Open Maya's tour" style={styles.passBtn}>
        <T style={styles.passBtnText}>Open Maya’s tour</T>
        <Icon name="chevron" size={18} color={C.cream} />
      </Press>
      <Chip mono color={C.cream} bg="rgba(244,233,211,0.10)">
        composite persona · demo data
      </Chip>
    </View>
  );
}

export function StepCard({ n, kicker, big, unit, title, body, bg, ink = C.text, art }: { n: string; kicker: string; big: string; unit: string; title: string; body: string; bg: string; ink?: string; art?: ReactNode }) {
  return (
    <View style={[styles.step, gradient(bg)]}>
      {art}
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={[styles.stepKicker, { color: ink }]}>{kicker}</T>
        <T style={[styles.stepKicker, { color: ink }]}>{n}</T>
      </Row>
      <View style={{ maxWidth: art ? '58%' : '100%' }}>
        <T style={[styles.stepBig, { color: ink }]} numberOfLines={1}>
          {big}
        </T>
        <T style={[styles.stepUnit, { color: ink }]}>{unit}</T>
      </View>
      <View style={{ gap: 4, maxWidth: art ? '58%' : '100%' }}>
        <T v="headline" color={ink}>
          {title}
        </T>
        <T v="footnote" color={ink} style={{ opacity: 0.8 }}>
          {body}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  tileTitle: { fontFamily: F.head, fontSize: 13, lineHeight: 17, color: C.text },

  stampShadow: { width: STAMP_W, height: STAMP_H, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  stampInner: { position: 'absolute', left: 10, top: 10, right: 10, bottom: 10, borderWidth: 1, borderColor: 'rgba(58,34,19,0.35)', padding: 10, gap: 4 },
  stampKicker: { fontFamily: F.monoBold, fontSize: 10, lineHeight: 13, letterSpacing: 1.2, color: C.posterRed },
  stampRank: { fontFamily: F.monoBold, fontSize: 11, lineHeight: 13, color: C.posterInk },
  stampCity: { fontFamily: F.bold, color: C.ink, letterSpacing: -0.4 },
  stampState: { fontFamily: F.mono, fontSize: 10, lineHeight: 13, color: 'rgba(26,18,11,0.6)' },
  stampRule: { height: 1, backgroundColor: 'rgba(58,34,19,0.25)', marginVertical: 2 },
  stampCount: { fontFamily: F.displayBlack, fontSize: 34, lineHeight: 36, color: C.posterRed },
  stampSigned: { fontFamily: F.serif, fontSize: 17, lineHeight: 20, color: C.posterInk },
  stampTop: { fontFamily: F.head, fontSize: 11, lineHeight: 14, color: 'rgba(26,18,11,0.7)' },

  pass: {
    borderRadius: R.card,
    borderCurve: 'continuous',
    padding: S.xl,
    gap: S.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,176,0,0.35)',
    ...gradient('linear-gradient(160deg, #4A2709 0%, #22130A 55%, #120B07 100%)'),
  },
  passSticker: { position: 'absolute', right: -6, top: -4, width: 116, height: 116, transform: [{ rotate: '7deg' }] },
  passTitle: { fontFamily: F.displayBlack, fontSize: 18, lineHeight: 22, letterSpacing: 0.6, color: C.cream },
  passTongues: { fontFamily: F.monoMed, fontSize: 9, lineHeight: 12, letterSpacing: 1.1, color: 'rgba(255,176,0,0.75)' },
  passLabel: { fontFamily: F.monoMed, fontSize: 10, lineHeight: 13, letterSpacing: 1, color: 'rgba(255,176,0,0.8)' },
  passValue: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 32, color: C.text, letterSpacing: -0.5 },
  passUnit: { fontFamily: F.head, fontSize: 15, color: 'rgba(244,233,211,0.7)', letterSpacing: 0 },
  passSub: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: 'rgba(244,233,211,0.6)' },
  passBtn: { minHeight: 48, borderRadius: 14, borderCurve: 'continuous', backgroundColor: 'rgba(244,233,211,0.10)', paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passBtnText: { fontFamily: F.rounded ?? F.head, fontWeight: '600', fontSize: 16, color: C.cream },

  step: { borderRadius: R.card, borderCurve: 'continuous', padding: S.xl, gap: S.md, overflow: 'hidden', minHeight: 196 },
  stepKicker: { fontFamily: F.monoMed, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, opacity: 0.8 },
  stepBig: { fontFamily: F.displayBlack, fontSize: 48, lineHeight: 54, letterSpacing: -1.5 },
  stepUnit: { fontFamily: F.serif, fontSize: 20, lineHeight: 22, marginTop: -2 },
});
