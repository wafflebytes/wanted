/**
 * The WANTED poster in the app and on the signing page. Same layout as the server render
 * (src/lib/poster.ts), so the in-app poster and the share image put text on the same lines.
 * New signatures scrawl in (a left-to-right reveal); the paper gets more battered at 50, 100
 * and 250 signatures; after the show the CAUGHT LIVE stamp slams across it.
 */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import type { ClaimView } from '@/lib/types';
import { POSTER_BOXES as B, POSTER_H, POSTER_INK, POSTER_RED, POSTER_W, signatureSpot } from '@/lib/poster';
import { Metal } from '../fx/Metal';
import { useReducedMotion } from '../hooks';
import { F, IMAGES, type ImageKey } from '../theme';

export type PosterView = {
  artistName: string;
  cityName: string;
  state: string;
  count: number;
  wear: 0 | 1 | 2 | 3;
  topNeighborhoods: string[];
  signatures: Pick<ClaimView, 'number' | 'initials' | 'font'>[];
  played: boolean;
  portrait: string | null;
  imageUrl: string | null;
  isDemo: boolean;
};

const box = (b: { x: number; y: number; w: number; h: number }, s: number) => ({ position: 'absolute' as const, left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
const fit = (text: string, w: number, base: number, charW = 0.78) => Math.min(base, Math.floor(w / Math.max(1, text.length * charW)));

export function Poster({ d, width, fresh, stampKey }: { d: PosterView; width: number; fresh?: number | null; stampKey?: number }) {
  const s = width / POSTER_W;
  const name = d.artistName.toUpperCase();
  const city = `IN ${d.cityName.toUpperCase()}, ${d.state}`;
  const hoods = d.topNeighborhoods.slice(0, 3);
  const wanted = hoods.length ? `Most wanted in ${hoods.join(', ')}` : '';
  const local = d.portrait && d.portrait in IMAGES ? IMAGES[d.portrait as ImageKey] : null;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`WANTED poster: ${d.artistName}, wanted in ${d.cityName}. ${d.count} signatures.${d.played ? ' Caught live.' : ''}`}
      style={{ width, height: POSTER_H * s }}
    >
      <Image source={IMAGES[`poster-${d.wear}` as ImageKey]} style={{ position: 'absolute', width, height: POSTER_H * s }} contentFit="contain" />
      <View style={[box(B.portrait, s), { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
        {local ? (
          <Image source={local} style={{ width: '100%', height: '100%', opacity: 0.94 }} contentFit="cover" />
        ) : d.imageUrl ? (
          <Image
            source={{ uri: d.imageUrl }}
            style={[{ width: '100%', height: '100%', opacity: 0.9 }, Platform.OS === 'web' ? ({ filter: 'sepia(0.95) contrast(1.15) brightness(0.92) grayscale(0.2)' } as object) : null]}
            contentFit="cover"
          />
        ) : (
          <Text style={{ fontFamily: F.mono, color: POSTER_INK, fontSize: 22 * s, letterSpacing: 4 * s, opacity: 0.8 }}>PORTRAIT ON FILE</Text>
        )}
      </View>
      <View style={[box(B.name, s), { alignItems: 'center', justifyContent: 'flex-end' }]}>
        <Text numberOfLines={1} style={{ fontFamily: F.displayBlack, color: POSTER_INK, fontSize: fit(name, B.name.w, 58) * s, letterSpacing: -1 * s, lineHeight: 62 * s }}>
          {name}
        </Text>
      </View>
      <View style={[box(B.city, s), { alignItems: 'center', justifyContent: 'center' }]}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, color: POSTER_RED, fontSize: fit(city, B.city.w, 40) * s, letterSpacing: 1 * s }}>
          {city}
        </Text>
      </View>
      <View style={[box(B.reward, s), { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: F.serif, color: POSTER_INK, fontSize: 44 * s, letterSpacing: 1 * s }}>One sold-out show.</Text>
      </View>
      {wanted ? (
        <View style={[box(B.wantedIn, s), { alignItems: 'center', justifyContent: 'center' }]}>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, color: POSTER_INK, fontSize: fit(wanted, B.wantedIn.w, 30, 0.42) * s }}>
            {wanted}
          </Text>
        </View>
      ) : null}
      {d.signatures.slice(0, 28).map((c) => (
        <Signature key={c.number} c={c} s={s} animate={c.number === fresh} />
      ))}
      <View
        style={[
          box(B.count, s),
          {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            backgroundColor: '#c99434',
            borderWidth: 4 * s,
            borderColor: '#4a2c0c',
            transform: [{ rotate: '-8deg' }],
            experimental_backgroundImage: 'linear-gradient(145deg, #fff4c9 0%, #d9a640 38%, #8a5a12 70%, #f5d27a 100%)',
          } as object,
        ]}
      >
        <Metal text={String(d.count)} size={(d.count > 999 ? 40 : 54) * s} color="#2b1806" />
        <Text style={{ fontFamily: F.display, fontSize: 17 * s, color: '#2b1806', letterSpacing: 2 * s }}>SIGNED</Text>
      </View>
      {d.played ? <Stamp s={s} k={stampKey} /> : null}
      {d.isDemo ? <Text style={{ position: 'absolute', left: 120 * s, top: 1462 * s, fontFamily: F.mono, fontSize: 18 * s, color: POSTER_INK, opacity: 0.7 }}>DEMO DATA</Text> : null}
    </View>
  );
}

/** One signature. The newest one scrawls in: the ink reveals left to right like a pen stroke. */
function Signature({ c, s, animate }: { c: Pick<ClaimView, 'number' | 'initials' | 'font'>; s: number; animate: boolean }) {
  const reduced = useReducedMotion();
  const spot = signatureSpot(c.number);
  const text = `${c.initials} #${c.number}`;
  const [w, setW] = useState(0);
  const reveal = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;
  useEffect(() => {
    if (!animate || reduced || !w) return;
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [animate, reduced, reveal, w]);
  const color = c.number % 5 === 0 ? '#1d3a6b' : '#2a1a10';
  return (
    <View style={{ position: 'absolute', left: spot.x * s, top: spot.y * s, transform: [{ rotate: `${spot.rot}deg` }], transformOrigin: 'left top' } as object}>
      <Animated.View style={{ overflow: 'hidden', width: w ? reveal.interpolate({ inputRange: [0, 1], outputRange: [0, w] }) : undefined }}>
        <Text
          onLayout={(e) => !w && setW(Math.ceil(e.nativeEvent.layout.width) + 2)}
          numberOfLines={1}
          style={{ fontFamily: F.sig[c.font % 3], fontSize: spot.size * s, color, opacity: 0.86, width: w || undefined }}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

/** The CAUGHT LIVE stamp slams down: overshoot scale, then a thump. */
export function Stamp({ s, k }: { s: number; k?: number }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(k !== undefined && !reduced ? 0 : 1)).current;
  useEffect(() => {
    if (k === undefined || reduced) return;
    v.setValue(0);
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 6 }).start();
  }, [k, reduced, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 100 * s,
        top: 560 * s,
        width: 820 * s,
        height: 410 * s,
        opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.94] }),
        transform: [{ rotate: '-12deg' }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }],
      }}
    >
      <Image source={IMAGES['stamp-caught-live']} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Animated.View>
  );
}

export const POSTER_RATIO = POSTER_H / POSTER_W;
