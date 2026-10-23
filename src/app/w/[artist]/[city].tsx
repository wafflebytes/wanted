/**
 * The fan's signing page (PRD 6.2, FR-19 to FR-23): no app, no account. The WANTED poster
 * fills the top of the screen; Gus stands under it with the city's dare; the fan picks their
 * neighborhood (Qloo's ranked list, the hottest first), optionally leaves initials and a way
 * to hear first, and signs. Their signature scrawls onto the poster and a Signature Card drops
 * in, ready to share. After the show, the CAUGHT LIVE stamp slams across both.
 */
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, absoluteUrl } from '@/ui/api';
import { BigStat, Btn, FeatureCard, Progress, Row } from '@/ui/components/core';
import { GusSticker, HearGus, useGusVoice } from '@/ui/components/Gus';
import { Poster } from '@/ui/components/Poster';
import { DemoTag } from '@/ui/components/Receipts';
import { Sheet } from '@/ui/components/Sheet';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { Beam } from '@/ui/fx/Beam';
import { Metal } from '@/ui/fx/Metal';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { shareLink } from '@/ui/share';
import { C, F, IMAGES, R, S } from '@/ui/theme';
import type { PosterState } from '@/ui/types';

type Mine = NonNullable<PosterState['mine']>;

const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();

export default function SignPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { artist, city, ref } = useLocalSearchParams<{ artist: string; city: string; ref?: string }>();
  const path = artist && city ? `/w/${artist}/${city}` : null;
  const { data: d, error, reload } = useApi<PosterState>(path, { poll: 6000 });
  const [hood, setHood] = useState<string | null>(null);
  const [initials, setInitials] = useState('');
  const [contact, setContact] = useState('');
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const card = useRef<ScrollView>(null);
  const me = mine ?? d?.mine ?? null;

  const line = d ? (me ? `You're on the poster, ${me.deputy ? 'Deputy' : 'partner'}. Now bring two friends.` : `${d.city.name} says it wants ${d.artist.name.split(' ')[0]}. Prove it.`) : null;
  const [speaking, speak] = useGusVoice(line, me ? 'proud' : 'wave');

  const sign = async () => {
    if (!path || !hood) return;
    setBusy(true);
    try {
      const r = await api.post<{ claim: Mine; alreadySigned: boolean; count: number }>(`${path}/sign`, { neighborhood: hood, initials: initials.trim() || null, contact: contact.trim() || null, ref: ref ?? null });
      haptic.success();
      setMine({ ...r.claim, friends: r.claim.friends ?? 0, refCode: r.claim.refCode ?? '', earlyAccess: r.claim.earlyAccess ?? false });
      setFresh(r.claim.number);
      invalidate(path);
      reload();
      setTimeout(() => card.current?.scrollToEnd({ animated: true }), 700);
    } catch (e) {
      toast({ title: "That didn't go through", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const shareCard = async () => {
    if (!d || !me) return;
    const url = absoluteUrl(`/w/${d.artist.slug}/${d.city.id}${me.refCode ? `?ref=${me.refCode}` : ''}`);
    const r = await shareLink(url, `I signed ${d.artist.name}'s WANTED poster`, `Signature #${me.number} in ${d.city.name}. Sign it too:`);
    if (r === 'copied') toast({ title: 'Link copied', body: 'Two friends sign it and you get early access.' });
  };

  const hoods = useMemo(() => (d?.neighborhoods ?? []).filter((n) => n.name.toLowerCase().includes(query.trim().toLowerCase())), [d, query]);
  const posterW = Math.min(width - S.gutter * 2, 420);

  if (error && !d) {
    return (
      <View style={{ flex: 1, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.lg }}>
        <GusSticker mood="unimpressed" size={160} />
        <T v="title2" style={{ textAlign: 'center' }}>
          No poster here
        </T>
        <T v="callout" color={C.text2} style={{ textAlign: 'center' }}>
          {error}
        </T>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0805' }}>
      <Head>
        <title>{d ? `${d.artist.name} is WANTED in ${d.city.name}` : 'WANTED'} · Sign the poster</title>
        {d ? <meta property="og:image" content={absoluteUrl(`/api/og/poster/${d.artist.slug}/${d.city.id}`)} /> : null}
      </Head>
      <Image source={IMAGES.backdrop} style={{ position: 'absolute', inset: 0, opacity: 0.35 } as object} contentFit="cover" />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 45%, #000 80%)' } as object} />
      <ScrollView ref={card} contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: insets.bottom + 140, paddingHorizontal: S.gutter, gap: S.xl, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={S.sm}>
            <Image source={IMAGES['gus-mark']} style={{ width: 26, height: 26, borderRadius: 7 }} />
            <T style={{ fontFamily: F.logo, fontSize: 19, letterSpacing: -0.6, color: C.text }}>Wanted</T>
          </Row>
          {d?.artist.isDemo ? <DemoTag /> : null}
        </Row>

        {d ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ transform: [{ rotate: '-1.2deg' }], shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 14 } }}>
              <Poster
                width={posterW}
                fresh={fresh}
                d={{ artistName: d.artist.name, cityName: d.city.name, state: d.city.state, count: d.count, wear: d.wear, topNeighborhoods: d.topNeighborhoods, signatures: d.signatures, played: !!d.played, portrait: d.artist.portrait, imageUrl: d.artist.imageUrl, isDemo: d.artist.isDemo }}
              />
            </View>
          </View>
        ) : (
          <View style={{ height: posterW * 1.5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        )}

        {d ? (
          <FeatureCard tone="heat">
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ gap: 2 }}>
                <T v="eyebrow" color="rgba(255,226,190,0.85)">
                  Signed in {d.city.name}
                </T>
                <Metal text={String(d.count)} size={52} />
              </View>
              <BigStat label="Deputy spots" value={d.deputiesLeft} color={C.gold} sub="of the first 50" />
            </Row>
            <Progress value={d.count / 50} color={C.amber} height={8} />
            <T v="footnote" color="rgba(255,226,190,0.85)">
              {d.played ? `Caught live${d.played.venue ? ` at ${d.played.venue}` : ''}. You made this happen.` : `At 50 signatures Gus pitches the room. ${Math.max(0, 50 - d.count)} to go.`}
            </T>
          </FeatureCard>
        ) : null}

        {line ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.xs }}>
            <GusSticker mood={me ? 'proud' : 'wave'} size={110} />
            <View style={{ flex: 1, backgroundColor: C.cardHi, borderRadius: 22, borderBottomLeftRadius: 6, padding: S.lg, gap: S.sm }}>
              <T v="gus">“{line}”</T>
              <HearGus speaking={speaking} onPress={speak} />
            </View>
          </View>
        ) : null}

        {d && !me && !d.played ? (
          <View style={{ gap: S.md }}>
            <T v="title2">Where do you live?</T>
            <T v="footnote">Qloo’s ranked neighborhoods for this act, hottest first. Your neighborhood shows on the artist’s map as a dot, never your name.</T>
            <Row gap={S.sm} wrap>
              {d.neighborhoods.slice(0, 7).map((n) => {
                const on = hood === n.name;
                return (
                  <Pressable key={n.name} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => (haptic.tick(), setHood(n.name))} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                    <Row gap={6} style={{ height: 44, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: on ? C.purple : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: on ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
                      {n.rank <= 3 ? <T style={{ fontFamily: F.monoBold, fontSize: 12, color: on ? C.text : C.amber }}>{n.rank}</T> : null}
                      <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 16, color: C.text }}>{n.name}</T>
                    </Row>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" onPress={() => setPicker(true)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                <Row gap={6} style={{ height: 44, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                  <Icon name="search" size={16} color={C.text2} />
                  <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 16, color: C.text2 }}>{hood && !d.neighborhoods.slice(0, 7).some((n) => n.name === hood) ? hood : 'Somewhere else'}</T>
                </Row>
              </Pressable>
            </Row>
            <View style={{ gap: S.sm, marginTop: S.sm }}>
              <TextInput value={initials} onChangeText={(t) => setInitials(t.slice(0, 4))} placeholder="Your initials (optional)" placeholderTextColor={C.text3} autoCapitalize="characters" accessibilityLabel="Your initials" style={inputStyle} />
              <TextInput value={contact} onChangeText={setContact} placeholder="Email or phone for first access (optional)" placeholderTextColor={C.text3} keyboardType="email-address" autoCapitalize="none" accessibilityLabel="Email or phone for first access" style={inputStyle} />
              <T v="caption">Only Wanted stores this, encrypted, to tell you first when tickets drop. Never the artist, never Qloo.</T>
            </View>
          </View>
        ) : null}

        {d && me ? <SignatureCard d={d} me={me} onShare={shareCard} /> : null}
      </ScrollView>

      {d && !me && !d.played ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.xl, paddingBottom: Math.max(insets.bottom, S.lg), experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.92) 45%, #000 70%)' } as object}>
          {/* Opaque backing so the dimmed (disabled) button never shows the page through it. */}
          <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center', backgroundColor: '#000', borderRadius: 999 }}>
            <Beam variant="heat" active={!!hood} radius={999}>
              <Btn tone="scout" size="lg" full busy={busy} disabled={!hood} onPress={sign} icon={<Icon name="signature" variant="bold" size={20} color={C.text} />}>
                {hood ? `Sign the poster · ${hood}` : 'Pick your neighborhood to sign'}
              </Btn>
            </Beam>
          </View>
        </View>
      ) : null}

      <Sheet open={picker} onClose={() => setPicker(false)} title="Your neighborhood" subtitle={d ? `${d.neighborhoods.length} in ${d.city.name}, by Qloo rank` : undefined} large>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={C.text3} accessibilityLabel="Search neighborhoods" style={inputStyle} />
        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
          {hoods.map((n) => (
            <Pressable
              key={n.name}
              accessibilityRole="radio"
              accessibilityState={{ checked: hood === n.name }}
              onPress={() => {
                haptic.tick();
                setHood(n.name);
                setPicker(false);
              }}
              style={({ pressed }) => ({ backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' })}
            >
              <Row gap={S.md} style={{ minHeight: 52, paddingHorizontal: S.lg, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' }}>
                <T style={{ fontFamily: F.monoBold, width: 26, color: n.rank <= 3 ? C.amber : C.text3 }}>{n.rank}</T>
                <T v="body" style={{ flex: 1 }}>
                  {n.name}
                </T>
                {hood === n.name ? <Icon name="check" variant="bold" size={20} color={C.purpleHi} /> : null}
              </Row>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const inputStyle = { color: C.text, fontFamily: F.body, fontSize: 17, minHeight: 50, borderRadius: 14, paddingHorizontal: S.lg, backgroundColor: 'rgba(255,255,255,0.08)', outlineStyle: 'none' } as object;

/** The keepsake: a ticket-stub card with the fan's number, neighborhood and Deputy star. It drops in with a flutter. */
function SignatureCard({ d, me, onShare }: { d: PosterState; me: Mine; onShare: () => void }) {
  const reduced = useReducedMotion();
  const drop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(drop, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [drop, reduced]);
  const left = Math.max(0, 2 - (me.friends ?? 0));
  return (
    <Animated.View style={{ gap: S.md, opacity: drop, transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }] }}>
      <View style={{ backgroundColor: C.cream, borderRadius: 18, padding: S.lg, gap: S.sm, borderWidth: 2, borderColor: '#1A120B', borderStyle: 'dashed' }} accessibilityLabel={`Signature card: number ${me.number}, ${d.artist.name}, ${me.neighborhood ?? ''} ${d.city.name}${me.deputy ? ', Deputy' : ''}`}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <T style={{ fontFamily: F.displayBold, fontSize: 13, letterSpacing: 1, color: C.posterRed }}>SIGNATURE</T>
            <T style={{ fontFamily: F.displayBlack, fontSize: 52, lineHeight: 56, color: C.ink }}>#{me.number}</T>
          </View>
          {me.deputy ? <Image source={IMAGES['deputy-star']} style={{ width: 78, height: 78, transform: [{ rotate: '10deg' }] }} contentFit="contain" accessibilityLabel="Deputy star" /> : null}
        </Row>
        <T style={{ fontFamily: F.display, fontSize: 20, color: C.ink }}>{d.artist.name.toUpperCase()}</T>
        <T style={{ fontFamily: F.monoBold, fontSize: 13, letterSpacing: 0.4, color: '#5A3B22' }}>
          {(me.neighborhood ?? '').toUpperCase()}
          {me.neighborhood ? ', ' : ''}
          {d.city.name.toUpperCase()} · {me.deputy ? 'DEPUTY · ' : ''}SIGNED {fmtDay(me.createdAt)}
        </T>
        {d.played ? <Image source={IMAGES['stamp-caught-live']} style={{ position: 'absolute', right: 10, bottom: 10, width: 150, height: 75, transform: [{ rotate: '-12deg' }] }} contentFit="contain" /> : null}
      </View>
      <FeatureCard tone="stage">
        <T v="eyebrow" color="#E3B8FF">
          Deputize two friends
        </T>
        <T v="callout">{left ? `${left} more ${left === 1 ? 'friend signs' : 'friends sign'} with your link and you get early access when tickets drop.` : 'Early access unlocked. You hear first.'}</T>
        <Btn tone="scout" size="lg" full onPress={onShare} icon={<Icon name="share" variant="bold" size={18} color={C.text} />}>
          Share your card
        </Btn>
      </FeatureCard>
    </Animated.View>
  );
}
