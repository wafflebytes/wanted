/**
 * The fan's Signature Card (PRD 6.2, 8.3): a ticket-stub crop of the poster with their number,
 * neighborhood and Deputy mark. It flutters down like paper when they sign; after the show
 * the CAUGHT LIVE stamp slams across it.
 */
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, View, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { ClaimView } from '@/lib/types';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { C, F, IMAGES, R } from '../theme';
import { T } from './T';

const INK = '#3a2213';

export function SignatureCard({
  claim,
  artistName,
  cityName,
  played,
  playedVenue,
  animate,
  total,
}: {
  claim: Pick<ClaimView, 'number' | 'initials' | 'font' | 'neighborhood' | 'deputy' | 'createdAt'>;
  artistName: string;
  cityName: string;
  played: boolean;
  playedVenue: string | null;
  animate?: boolean;
  total: number;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;
  useEffect(() => {
    if (!animate || reduced) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
    // Paper ticks as it lands.
    const ts = [260, 420, 560].map((d) => setTimeout(() => haptic.tick(), d));
    return () => ts.forEach(clearTimeout);
  }, [animate, reduced, v]);
  const date = new Date(claim.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
  const where = [claim.neighborhood, cityName].filter(Boolean).join(', ');
  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Signature card. Signature number ${claim.number} for ${artistName}, ${where}.${claim.deputy ? ' Deputy.' : ''}${played ? ' Caught live.' : ''}`}
      style={{
        opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) },
          { rotate: v.interpolate({ inputRange: [0, 0.4, 0.7, 1], outputRange: ['9deg', '-4deg', '2deg', '-1deg'] }) },
        ],
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      <View style={{ backgroundColor: C.cream, borderRadius: R.md, borderCurve: 'continuous', overflow: 'hidden', flexDirection: 'row' } as object}>
        <View style={{ flex: 1, padding: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 13, letterSpacing: 2, color: C.posterRed }}>WANTED</T>
            <T style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: INK, opacity: 0.7 }}>SIGNED {date}</T>
          </View>
          <View>
            <T style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.4, color: INK, opacity: 0.7 }}>SIGNATURE</T>
            <T style={{ fontFamily: F.displayBlack, fontSize: 46, lineHeight: 50, letterSpacing: -1, color: INK }} maxFontSizeMultiplier={1.2}>
              #{claim.number}
            </T>
          </View>
          <T style={{ fontFamily: F.sig[claim.font % 3], fontSize: 28, lineHeight: 34, color: '#1d3a6b' }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {claim.initials}
          </T>
          <View style={{ height: 1, backgroundColor: 'rgba(58,34,19,0.3)' }} />
          <View style={{ gap: 2 }}>
            <T style={{ fontFamily: F.display, fontSize: 15, color: INK, textTransform: 'uppercase' }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {artistName}
            </T>
            <T style={{ fontFamily: F.head, fontSize: 14, color: INK, opacity: 0.8 }} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {where}
            </T>
          </View>
          <T style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: INK }} maxFontSizeMultiplier={1.3}>
            {played ? `You were one of ${total} who brought ${artistName.split(' ')[0]} to ${cityName}${playedVenue ? ` at ${playedVenue}` : ''}.` : `One of ${total} asking for a show.`}
          </T>
        </View>
        {/* Perforated tear line and the stub. */}
        <Svg width={10} height="100%" style={{ position: 'absolute', right: 96, top: 0, bottom: 0 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <Circle key={i} cx={5} cy={8 + i * 14} r={3} fill={C.canvas} opacity={0.85} />
          ))}
        </Svg>
        <View style={{ width: 96, alignItems: 'center', justifyContent: 'center', gap: 6, borderLeftWidth: 0, backgroundColor: 'rgba(163,38,27,0.08)' }}>
          {claim.deputy ? (
            <>
              <Image source={IMAGES['deputy-star']} style={{ width: 62, height: 62 }} contentFit="contain" />
              <T style={{ fontFamily: F.displayBlack, fontSize: 11, letterSpacing: 1.5, color: C.posterRed }}>DEPUTY</T>
            </>
          ) : (
            <>
              <T style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1, color: INK, opacity: 0.7, textAlign: 'center' }}>{'REWARD\nONE SOLD-OUT\nSHOW'}</T>
            </>
          )}
        </View>
        {played ? (
          <Image
            source={IMAGES['stamp-caught-live']}
            style={{ position: 'absolute', left: 30, top: 40, width: 220, height: 110, transform: [{ rotate: '-14deg' }], opacity: 0.92 }}
            contentFit="contain"
          />
        ) : null}
      </View>
    </Animated.View>
  );
}
