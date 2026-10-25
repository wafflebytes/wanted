/**
 * Onboarding art, one piece per page. Each is a small live scene built from the app's real
 * parts (hexes, the poster, Gus, the van) rather than a stock illustration. `active` starts
 * a page's entrance; Reduce Motion shows the final frame.
 *
 * Animation stays on views (opacity and transforms), never on SVG props: animating SVG
 * attributes re-commits the whole SVG tree every frame on native.
 */
import { Image } from 'expo-image';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Poster } from '../components/Poster';
import { T } from '../components/T';
import { C, F, heatColor, IMAGES } from '../theme';

type ArtProps = { w: number; h: number; active: boolean; reduced: boolean };

// ---------- 1. Qloo predicts it: a honeycomb that lights up where the crowd lives ----------

const HEX_R = 15;
const hexD = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
};

/** A deterministic heat field: two hot spots and a sleeper, like a real Sound. */
function heatAt(x: number, y: number) {
  const spot = (sx: number, sy: number, s: number) => Math.exp(-((x - sx) ** 2 + (y - sy) ** 2) / s);
  return Math.min(1, spot(0.78, 0.32, 0.03) * 1 + spot(0.3, 0.62, 0.02) * 0.75 + spot(0.12, 0.25, 0.006) * 0.9 + 0.05);
}

const Honeycomb = memo(function Honeycomb({ w, h, lit }: { w: number; h: number; lit: boolean }) {
  const cells = useMemo(() => {
    const out: { d: string; v: number }[] = [];
    const dx = HEX_R * Math.sqrt(3);
    const dy = HEX_R * 1.5;
    for (let row = 0; row * dy < h + HEX_R; row++) {
      for (let col = 0; col * dx < w + dx; col++) {
        const cx = col * dx + (row % 2 ? dx / 2 : 0);
        const cy = row * dy;
        out.push({ d: hexD(cx, cy, HEX_R - 1.6), v: heatAt(cx / w, cy / h) });
      }
    }
    return out;
  }, [w, h]);
  return (
    <Svg width={w} height={h}>
      {cells.map((c, i) => (
        <Path key={i} d={c.d} fill={lit ? heatColor(c.v) : '#1F1F23'} opacity={lit ? 0.25 + c.v * 0.75 : 1} />
      ))}
    </Svg>
  );
});

function Ring({ x, y, color, delay, reduced }: { x: number; y: number; color: string; delay: number; reduced: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduced) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced]);
  const s = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - t.value), transform: [{ scale: 0.3 + t.value * 1.7 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: color }, s]} />;
}

function Tag({ x, y, children, delay, active, reduced, tone }: { x: number; y: number; children: React.ReactNode; delay: number; active: boolean; reduced: boolean; tone: 'amber' | 'gold' }) {
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (active && !reduced) v.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 160 }));
  }, [active, reduced]);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 10 }, { scale: 0.85 + v.value * 0.15 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, s]}>
      <View style={[styles.tag, tone === 'gold' && { borderColor: 'rgba(245,197,66,0.6)' }]}>{children}</View>
    </Animated.View>
  );
}

export function PredictArt({ w, h, active, reduced }: ArtProps) {
  const sweep = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (active && !reduced && sweep.value === 0) sweep.value = withDelay(150, withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }));
  }, [active, reduced]);
  const reveal = useAnimatedStyle(() => ({ width: w * sweep.value }));
  const scan = useAnimatedStyle(() => ({ left: w * sweep.value - 1, opacity: sweep.value > 0 && sweep.value < 1 ? 1 : 0 }));
  return (
    <View style={{ width: w, height: h }}>
      <Honeycomb w={w} h={h} lit={false} />
      <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, reveal]}>
        <Honeycomb w={w} h={h} lit />
      </Animated.View>
      <Animated.View style={[styles.scan, { height: h }, scan]} />
      <Ring x={w * 0.78} y={h * 0.32} color={C.flame} delay={1600} reduced={reduced} />
      <Ring x={w * 0.12} y={h * 0.25} color={C.gold} delay={2100} reduced={reduced} />
      <Tag x={Math.min(w * 0.78 - 70, w - 160)} y={h * 0.32 - 62} delay={1500} active={active} reduced={reduced} tone="amber">
        <T style={[styles.tagBadge, { color: C.amber }]}>#1</T>
        <T style={styles.tagText}>Burlington, VT</T>
      </Tag>
      <Tag x={Math.max(8, w * 0.12 - 20)} y={h * 0.25 + 26} delay={2000} active={active} reduced={reduced} tone="gold">
        <T style={[styles.tagBadge, { color: C.gold }]}>★</T>
        <T style={styles.tagText}>Sleeper: Eugene</T>
      </Tag>
      <Tag x={w * 0.3 - 40} y={h * 0.62 + 28} delay={2400} active={active} reduced={reduced} tone="amber">
        <T style={[styles.tagBadge, { color: C.amber }]}>#7</T>
        <T style={styles.tagText}>Ithaca, NY</T>
      </Tag>
    </View>
  );
}

// ---------- 2. Fans prove it: the poster, a signature landing, the deputy star ----------

export function ProveArt({ w, h, active, reduced }: ArtProps) {
  const posterW = Math.min(w * 0.56, h * 0.62);
  const drop = useSharedValue(reduced ? 1 : 0);
  const star = useSharedValue(reduced ? 1 : 0);
  const count = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!active || reduced) return;
    drop.value = withSpring(1, { damping: 11, stiffness: 90 });
    star.value = withDelay(700, withSpring(1, { damping: 8, stiffness: 140 }));
    count.value = withDelay(1100, withRepeat(withSequence(withTiming(1, { duration: 380 }), withDelay(1600, withTiming(0, { duration: 0 }))), -1, false));
  }, [active, reduced]);
  const posterStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, drop.value * 3), transform: [{ translateY: (1 - drop.value) * -50 }, { rotate: `${-6 + drop.value * 3}deg` }] }));
  const starStyle = useAnimatedStyle(() => ({ opacity: star.value, transform: [{ scale: 0.3 + star.value * 0.7 }, { rotate: `${(1 - star.value) * -60 + 12}deg` }] }));
  const plusStyle = useAnimatedStyle(() => ({ opacity: count.value < 0.05 ? 0 : 1 - count.value * 0.2, transform: [{ translateY: -count.value * 26 }, { scale: 0.7 + count.value * 0.3 }] }));
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } }, posterStyle]}>
        <Poster
          width={posterW}
          d={{
            artistName: 'Maya Ortiz',
            cityName: 'Columbus',
            state: 'OH',
            count: 56,
            wear: 1,
            topNeighborhoods: ['Clintonville', 'Italian Village'],
            signatures: Array.from({ length: 18 }, (_, i) => ({ number: i + 1, initials: ['J.R.', 'A.L.', 'K.T.', 'M.K.', 'S.W.', 'P.Q.'][i % 6], font: i % 3 })),
            played: false,
            portrait: 'maya-engraving',
            imageUrl: null,
            isDemo: false,
          }}
        />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: w * 0.08, bottom: h * 0.06 }, starStyle]}>
        <Image source={IMAGES['deputy-star']} style={{ width: 96, height: 96 }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: w * 0.1, top: h * 0.2 }, plusStyle]}>
        <View style={styles.plus}>
          <T style={{ fontFamily: F.monoBold, fontSize: 15, color: '#fff' }}>+1</T>
          <T style={{ fontFamily: F.head, fontSize: 13, color: '#fff' }}>Clintonville</T>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------- 3. Gus books it: the roast, the fix, the pitch ----------

export function BookArt({ w, h, active, reduced }: ArtProps) {
  const a = useSharedValue(reduced ? 1 : 0);
  const b = useSharedValue(reduced ? 1 : 0);
  const gus = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!active || reduced) return;
    gus.value = withSpring(1, { damping: 12, stiffness: 120 });
    a.value = withDelay(400, withSpring(1, { damping: 13, stiffness: 150 }));
    b.value = withDelay(1100, withSpring(1, { damping: 13, stiffness: 150 }));
  }, [active, reduced]);
  const gusStyle = useAnimatedStyle(() => ({ opacity: gus.value, transform: [{ translateX: (1 - gus.value) * -40 }] }));
  const aStyle = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ translateY: (1 - a.value) * 14 }, { scale: 0.9 + a.value * 0.1 }] }));
  const bStyle = useAnimatedStyle(() => ({ opacity: b.value, transform: [{ translateY: (1 - b.value) * 14 }, { scale: 0.9 + b.value * 0.1 }] }));
  const gusH = h * 0.86;
  return (
    <View style={{ width: w, height: h }}>
      <Animated.View style={[{ position: 'absolute', left: -w * 0.04, bottom: 0 }, gusStyle]}>
        <Image source={IMAGES['gus-signing']} style={{ width: gusH * 0.72, height: gusH }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: 12, top: 12, width: w * 0.6 }, aStyle]}>
        <View style={styles.bubble}>
          <T style={{ fontFamily: F.monoMed, fontSize: 11, letterSpacing: 0.8, color: C.flame }}>ROAST · WEEKDAY TRAP</T>
          <T style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 21, color: C.text }}>“Cleveland on a Tuesday after Chicago on a Saturday? Bold. Swap it.”</T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={[styles.mini, { backgroundColor: C.blueDeep }]}>
              <T style={styles.miniText}>Fix</T>
            </View>
            <View style={[styles.mini, { backgroundColor: C.fill }]}>
              <T style={styles.miniText}>Why?</T>
            </View>
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: 12, bottom: 12, width: w * 0.62 }, bStyle]}>
        <View style={[styles.bubble, { backgroundColor: '#0E2235', borderColor: 'rgba(127,209,255,0.3)' }]}>
          <T style={{ fontFamily: F.monoMed, fontSize: 11, letterSpacing: 0.8, color: C.gus }}>PITCH DRAFTED</T>
          <T style={{ fontFamily: F.head, fontSize: 14, lineHeight: 18, color: C.text }} numberOfLines={1}>Maya Ortiz × Rumba Café</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={[styles.chip, { backgroundColor: 'rgba(255,176,0,0.16)' }]}>
              <T style={[styles.chipText, { color: C.amber }]}>Qloo: very high affinity</T>
            </View>
            <View style={[styles.chip, { backgroundColor: 'rgba(180,92,240,0.18)' }]}>
              <T style={[styles.chipText, { color: C.fans }]}>56 fans signed</T>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------- 4. Let's ride: the van rolls along the route ----------

export function RideArt({ w, h, active, reduced }: ArtProps) {
  const ride = useSharedValue(reduced ? 0.5 : 0);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!active || reduced) return;
    ride.value = 0;
    ride.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 180 })), -1, false);
  }, [active, reduced]);
  const vanW = Math.min(150, w * 0.4);
  const road = h * 0.84;
  const van = useAnimatedStyle(() => ({ transform: [{ translateX: -vanW + ride.value * (w + vanW) }, { translateY: -bob.value * 1.5 }] }));
  const stamps = [
    { city: 'Columbus', n: 36, x: 0.04, r: '-8deg' },
    { city: 'Burlington', n: 26, x: 0.36, r: '5deg' },
    { city: 'Ithaca', n: 14, x: 0.68, r: '-3deg' },
  ];
  return (
    <View style={{ width: w, height: h }}>
      {stamps.map((s) => (
        <View key={s.city} style={[styles.stamp, { left: w * s.x, top: h * 0.08, transform: [{ rotate: s.r }] }]}>
          <T style={{ fontFamily: F.monoMed, fontSize: 9, letterSpacing: 1, color: C.posterRed }}>WANTED IN</T>
          <T style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }} numberOfLines={1} adjustsFontSizeToFit>
            {s.city}
          </T>
          <T style={{ fontFamily: F.displayBlack, fontSize: 22, color: C.posterRed }}>{s.n}</T>
        </View>
      ))}
      {/* The road: a dashed center line. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: road, height: 3, flexDirection: 'row', gap: 10, overflow: 'hidden' }}>
        {Array.from({ length: Math.ceil(w / 28) }, (_, i) => (
          <View key={i} style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        ))}
      </View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: road - vanW * 0.62 }, van]}>
        <Image source={IMAGES.van} style={{ width: vanW, height: vanW * 0.62 }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scan: { position: 'absolute', top: 0, width: 2, backgroundColor: C.amber, shadowColor: C.amber, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(14,14,16,0.92)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineHi },
  tagBadge: { fontFamily: F.monoBold, fontSize: 12, lineHeight: 15 },
  tagText: { fontFamily: F.head, fontSize: 13, lineHeight: 16, color: C.text },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: C.purple, shadowColor: C.purple, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  bubble: { gap: 6, padding: 12, borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#1A1A1D', borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineHi },
  mini: { paddingHorizontal: 12, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  miniText: { fontFamily: F.head, fontSize: 13, color: '#fff' },
  chip: { paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontFamily: F.head, fontSize: 12 },
  stamp: { position: 'absolute', width: 108, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.cream, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(163,38,27,0.35)', borderStyle: 'dashed', gap: 1 },
});
