/**
 * The fan signing page (PRD 6.2; FR-18 to FR-23b): no install, no account. The WANTED poster
 * full width, where the act's crowd lives in this city, a neighborhood picker, initials that
 * write themselves onto a "sign here" strip, and one big button. Signing scrawls the fan's
 * initials onto the poster and drops in their Signature Card, with a bring-two-friends link.
 */
import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { absoluteUrl, api, ApiError } from '@/ui/api';
import { Btn, Empty } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { Poster } from '@/ui/components/Poster';
import { SignatureCard } from '@/ui/components/SignatureCard';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { shareLink } from '@/ui/share';
import { C, F, heatColor, R, S } from '@/ui/theme';
import type { PosterState } from '@/ui/types';

type SignOut = { claim: PosterState['mine'] & {}; alreadySigned: boolean; count: number; wear: 0 | 1 | 2 | 3 };

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

export default function SignPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const toast = useToast();
  const { artist, city, ref } = useLocalSearchParams<{ artist: string; city: string; ref?: string }>();
  const path = artist && city ? `/w/${artist}/${city}` : null;
  const { data: p, error, reload, setData } = useApi<PosterState>(path, { poll: 10000 });

  const [hood, setHood] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [initials, setInitials] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [justSigned, setJustSigned] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const wide = width >= 900;
  const posterW = wide ? Math.min(460, width * 0.4) : Math.min(width - 40, 420);
  const colW = wide ? 440 : Math.min(width - S.gutter * 2, 520);

  // The poster drops in and settles, like it was just nailed up.
  const drop = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (!p || reduced) return;
    Animated.timing(drop, { toValue: 1, duration: 360, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }).start();
  }, [!!p, reduced]);

  const hoodsRanked = useMemo(() => {
    if (!p) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of [...p.topNeighborhoods, ...p.neighborhoods.map((x) => x.name)]) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out;
  }, [p]);
  const visibleHoods = hoodsRanked.slice(0, 9);
  const matches = otherText.trim() ? hoodsRanked.filter((n) => n.toLowerCase().includes(otherText.trim().toLowerCase())).slice(0, 6) : [];

  const first = p?.artist.name.split(' ')[0] ?? '';
  const mine = p?.mine ?? null;
  const chosenHood = other ? otherText.trim() || null : hood;

  const sign = async () => {
    if (!path || !p) return;
    if (!initials.trim()) {
      setErr('Add your initials so the poster knows who signed.');
      haptic.warn();
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const r = await api.post<SignOut>(`${path}/sign`, { neighborhood: chosenHood, initials: initials.trim(), contact: contact.trim() || null, ref: ref ?? null });
      haptic.success();
      setFresh(r.claim.number);
      setJustSigned(!r.alreadySigned);
      // Show the signature on the poster at once, then refetch for the server's view.
      setData({
        ...p,
        count: r.count,
        wear: r.wear,
        mine: { ...r.claim, friends: 0 },
        signatures: [r.claim, ...p.signatures.filter((s) => s.number !== r.claim.number)],
      });
      invalidate(`/artist/${p.artist.slug}`);
      setTimeout(reload, 1500);
      setTimeout(() => scroller.current?.scrollTo({ y: 0, animated: !reduced }), 150);
    } catch (e) {
      haptic.warn();
      setErr(e instanceof ApiError ? e.message : 'Network trouble. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const refLink = mine && p ? absoluteUrl(`/w/${p.artist.slug}/${p.city.id}?ref=${mine.refCode}`) : '';
  const shareInvite = async () => {
    if (!p) return;
    const r = await shareLink(refLink, `WANTED in ${p.city.name}`, `Help bring ${p.artist.name} to ${p.city.name}. Sign the poster:`);
    if (r === 'copied') toast({ title: 'Link copied', body: 'Send it to two friends who would show up.' });
  };
  const shareCard = async () => {
    if (!p || !mine) return;
    const url = absoluteUrl(`/api/og/card/${p.artist.slug}/${p.city.id}/${mine.number}.png`);
    const r = await shareLink(url, `Signature #${mine.number}`, `I signed ${p.artist.name}'s WANTED poster in ${p.city.name}.`);
    if (r === 'copied') toast({ title: 'Card link copied' });
  };

  if (error && !p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: insets.top + 80, paddingHorizontal: S.gutter }}>
        <Empty title="No poster here" line={error}>
          <Btn size="sm" onPress={() => router.replace('/')}>
            Go to Wanted
          </Btn>
        </Empty>
      </View>
    );
  }
  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: insets.top + 80, paddingHorizontal: S.gutter }}>
        <GusLine line={null} thinking="Nailing the poster up…" orb="working" />
      </View>
    );
  }

  const title = `WANTED in ${p.city.name}: ${p.artist.name}`;
  const posterBlock = (
    <Animated.View
      style={{
        alignSelf: 'center',
        transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '-1.2deg'] }) }],
        opacity: drop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        shadowColor: '#000',
        shadowOpacity: 0.7,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 18 },
      }}
    >
      <Poster
        width={posterW}
        fresh={fresh}
        stampKey={undefined}
        d={{
          artistName: p.artist.name,
          cityName: p.city.name,
          state: p.city.state,
          count: p.count,
          wear: p.wear,
          topNeighborhoods: p.topNeighborhoods,
          signatures: p.signatures,
          played: !!p.played,
          portrait: p.artist.portrait,
          imageUrl: p.artist.imageUrl,
          isDemo: p.artist.isDemo,
          cityId: p.city.id,
          hexes: p.hexes,
        }}
      />
    </Animated.View>
  );

  const form = mine ? (
    <View style={{ gap: S.xl }}>
      <SignatureCard
        claim={mine}
        artistName={p.artist.name}
        cityName={p.city.name}
        played={!!p.played}
        playedVenue={p.played?.venue ?? null}
        animate={justSigned}
        total={p.count}
      />
      <View style={{ gap: S.sm }}>
        <Btn tone="action" size="lg" full onPress={shareCard} icon={<Icon name="share" size={19} color="#fff" />}>
          Share my card
        </Btn>
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.xl, gap: S.md } as object}>
        <T v="label" color={C.fans}>
          Deputize two friends
        </T>
        <T v="headline">{mine.earlyAccess ? 'Early access unlocked.' : `Bring two friends, get first access when ${first} announces ${p.city.name}.`}</T>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {[0, 1].map((i) => (
            <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < Math.min(2, mine.friends) || mine.earlyAccess ? C.fans : C.fill }} />
          ))}
        </View>
        <T v="footnote">{mine.earlyAccess ? 'You will hear first. Nice work, deputy.' : `${Math.min(2, mine.friends)} of 2 friends signed with your link.`}</T>
        <Btn size="md" full onPress={shareInvite} icon={<Icon name="link" size={18} color="#fff" />}>
          Send my link
        </Btn>
      </View>
      <GusLine line={p.played ? `${p.city.name} showed up. That one's going on the wall.` : `That's ${p.count} signatures in ${p.city.name}. ${first}'s watching this one.`} mood="proud" model="gus-lite" compact voice={false} />
    </View>
  ) : (
    <View style={{ gap: S.xl }}>
      <GusLine line={`${p.city.name} says it wants ${first}. Prove it.`} mood="wave" model="gus-lite" compact voice={false} />

      <View style={{ gap: S.md }}>
        <T v="label">Your neighborhood</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {visibleHoods.map((n, i) => (
            <HoodChip
              key={n}
              label={n}
              hot={i < 3}
              selected={!other && hood === n}
              onPress={() => {
                haptic.tick();
                setOther(false);
                setHood(hood === n ? null : n);
              }}
            />
          ))}
          <HoodChip
            label="Somewhere else"
            selected={other}
            onPress={() => {
              haptic.tick();
              setOther(!other);
              setHood(null);
            }}
          />
        </View>
        {other ? (
          <View style={{ gap: S.sm }}>
            <Field value={otherText} onChangeText={setOtherText} placeholder={`Neighborhood in ${p.city.name}`} label="Your neighborhood" autoCapitalize="words" />
            {matches.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                {matches.map((n) => (
                  <HoodChip key={n} label={n} selected={otherText === n} onPress={() => setOtherText(n)} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: S.md }}>
        <T v="label">Sign here</T>
        <SignStrip initials={initials} onChange={setInitials} />
      </View>

      <View style={{ gap: S.sm }}>
        <Field value={contact} onChangeText={setContact} placeholder="Email or phone (optional)" label="Email or phone for first access, optional" keyboardType="email-address" autoCapitalize="none" />
        <T v="caption">Only for first access when tickets go up. {first} never sees it; we never sell it.</T>
      </View>

      {err ? (
        <T v="footnote" color={C.bad} accessibilityLiveRegion="assertive">
          {err}
        </T>
      ) : null}

      <SignButton onPress={sign} busy={busy} deputy={p.deputiesLeft > 0} />
      <T v="caption" style={{ textAlign: 'center' }}>
        {p.deputiesLeft > 0 ? `${p.deputiesLeft} Deputy badges left: the first 50 signers in ${p.city.name} get one.` : `All 50 Deputy badges in ${p.city.name} are taken. Your signature still counts.`}
      </T>
    </View>
  );

  const recent = [...p.signatures].sort((a, b) => b.number - a.number).slice(0, 6);
  const facts = (
    <View style={{ gap: S.xl }}>
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', paddingVertical: S.lg } as object}>
        <Fact value={String(p.count)} label="signed" color={C.fans} />
        <Fact value={p.rank ? `#${p.rank}` : '—'} label="Qloo rank" color={C.amber} />
        <Fact value={String(p.deputiesLeft)} label="badges left" color={C.gold} />
      </View>
      {p.hexes.length ? <MiniHeat p={p} width={colW} /> : null}
      {recent.length ? (
        <View style={{ gap: S.sm }}>
          <T v="label">Latest signatures</T>
          <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden' } as object}>
            {recent.map((s, i) => (
              <View key={s.number} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                <T style={{ fontFamily: F.monoBold, fontSize: 13, color: C.text3, width: 40 }}>#{s.number}</T>
                <T style={{ fontFamily: F.sig[s.font % 3], fontSize: 20, color: C.cream, flex: 1 }} numberOfLines={1}>
                  {s.initials}
                </T>
                <T v="footnote" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {s.neighborhood ?? p.city.name}
                </T>
                {s.deputy ? <Icon name="star" variant="bold" size={14} color={C.gold} label="Deputy" /> : null}
                <T v="caption" style={{ width: 30, textAlign: 'right' }}>
                  {ago(s.createdAt)}
                </T>
              </View>
            ))}
          </View>
          {p.artist.isDemo ? <T v="caption">Demo poster: these signatures are seeded test data, labeled as such everywhere.</T> : null}
        </View>
      ) : null}
      <View style={{ gap: S.sm, paddingTop: S.sm }}>
        <T v="caption">
          Signing is free and non-binding: it tells {first} and bookers that {p.city.name} would show up. We store your neighborhood and initials for this poster, and your contact only if you add it, encrypted. None of it goes to Qloo or any AI model.
        </T>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 })}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 13, letterSpacing: 1, color: C.text }}>WANTED</T>
            <T v="caption">Find out where you're wanted</T>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.canvas }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={`${p.count} people in ${p.city.name} signed. Sign the poster and help bring ${p.artist.name} to town.`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={`Reward: one sold-out show. ${p.count} signed so far.`} />
        <meta property="og:image" content={absoluteUrl(`/api/og/poster/${p.artist.slug}/${p.city.id}.png?format=wide`)} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      {/* Warm light behind the poster, like a streetlamp on a wall. */}
      <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 760 }, glow]} />
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + 48 }}>
        <TopBar count={p.count} cityName={p.city.name} canGoBack={Platform.OS !== 'web' && router.canGoBack()} />
        {wide ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 64, paddingHorizontal: 32, paddingTop: S.xl }}>
            <View style={{ width: posterW, gap: S.xl }}>
              {posterBlock}
              <Headline p={p} />
            </View>
            <View style={{ width: colW, gap: S.xxl }}>
              {form}
              {facts}
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: S.xxl, paddingTop: S.md }}>
            {posterBlock}
            <View style={{ width: colW, gap: S.xxl }}>
              <Headline p={p} />
              {form}
              {facts}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const glow = Platform.OS === 'web' ? { backgroundImage: 'radial-gradient(60% 50% at 50% 30%, rgba(255,176,0,0.16), rgba(255,106,26,0.05) 55%, transparent 80%)' } : { experimental_backgroundImage: 'radial-gradient(60% 50% at 50% 30%, rgba(255,176,0,0.16), rgba(255,106,26,0.05) 55%, transparent 80%)' };

function TopBar({ count, cityName, canGoBack }: { count: number; cityName: string; canGoBack: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.gutter, minHeight: 44 }}>
      {canGoBack ? (
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 44, height: 44, justifyContent: 'center' })}>
          <Icon name="back" size={22} color={C.text} />
        </Pressable>
      ) : (
        <T style={{ fontFamily: F.displayBlack, fontSize: 17, letterSpacing: 1.5, color: C.text }}>WANTED</T>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(180,92,240,0.16)', paddingHorizontal: 12, height: 32, borderRadius: 16 }} accessible accessibilityLabel={`${count} signed in ${cityName}`}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.fans }} />
        <T style={{ fontFamily: F.monoBold, fontSize: 13, color: C.text }}>{count}</T>
        <T v="footnote" color={C.text2}>
          signed
        </T>
      </View>
    </View>
  );
}

function Headline({ p }: { p: PosterState }) {
  return (
    <View style={{ gap: S.xs }}>
      <T v="label" color={C.amber}>
        {p.played ? 'Caught live' : `Wanted in ${p.city.name}, ${p.city.state}`}
      </T>
      <T style={{ fontFamily: F.displayBlack, fontSize: 30, lineHeight: 34, letterSpacing: -0.5, color: C.text, textTransform: 'uppercase' }}>{p.artist.name}</T>
      <T v="serif" color={C.text2}>
        {p.played ? `${p.count} people brought ${p.artist.name.split(' ')[0]} to ${p.city.name}${p.played.venue ? ` at ${p.played.venue}` : ''}.` : 'Reward: one sold-out show.'}
      </T>
    </View>
  );
}

function Fact({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${value} ${label}`}>
      <T style={{ fontFamily: F.monoBold, fontSize: 22, lineHeight: 26, color }}>{value}</T>
      <T v="caption" color={C.text2}>
        {label}
      </T>
    </View>
  );
}

function HoodChip({ label, selected, hot, onPress }: { label: string; selected: boolean; hot?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={hot ? `${label}, one of the hottest neighborhoods` : label} hitSlop={4}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 40,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: selected ? C.cream : pressed ? C.fill : C.fill2,
            borderWidth: 1,
            borderColor: selected ? C.cream : C.line,
          }}
        >
          {hot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: selected ? C.flame : C.heatMid }} /> : null}
          <T style={{ fontFamily: F.head, fontSize: 15, color: selected ? C.ink : C.text }}>{label}</T>
        </View>
      )}
    </Pressable>
  );
}

function Field(props: { value: string; onChangeText: (t: string) => void; placeholder: string; label: string; keyboardType?: 'email-address' | 'default'; autoCapitalize?: 'none' | 'words' | 'characters' }) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor={C.text3}
      accessibilityLabel={props.label}
      keyboardType={props.keyboardType}
      autoCapitalize={props.autoCapitalize}
      autoCorrect={false}
      style={{ minHeight: 50, borderRadius: R.sm + 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.lg, color: C.text, fontSize: 17, fontFamily: F.body, outlineStyle: 'none' } as object}
    />
  );
}

/** A strip of poster paper; what you type is written on the line in a hand-drawn face. */
function SignStrip({ initials, onChange }: { initials: string; onChange: (s: string) => void }) {
  const input = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <View style={{ backgroundColor: C.cream, borderRadius: R.sm + 4, borderCurve: 'continuous', paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.lg, overflow: 'hidden' } as object}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.sm }}>
          <T style={{ fontFamily: F.display, fontSize: 22, color: C.posterRed, paddingBottom: 10 }}>✕</T>
          <TextInput
            ref={input}
            value={initials}
            onChangeText={(t) => onChange(t.slice(0, 18))}
            placeholder="Your initials"
            placeholderTextColor="rgba(58,34,19,0.35)"
            accessibilityLabel="Your initials or first name, written on the poster"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={18}
            style={{ flex: 1, fontFamily: F.sig[0], fontSize: 38, lineHeight: 50, color: '#1d3a6b', paddingVertical: 0, outlineStyle: 'none' } as object}
          />
        </View>
        <View style={{ height: 1.5, backgroundColor: 'rgba(58,34,19,0.5)', marginTop: 2 }} />
        <T style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2, color: 'rgba(58,34,19,0.6)', marginTop: 6 }}>INITIALS OR FIRST NAME · SHOWN ON THE POSTER</T>
      </View>
    </Pressable>
  );
}

function SignButton({ onPress, busy, deputy }: { onPress: () => void; busy: boolean; deputy: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)} disabled={busy} accessibilityRole="button" accessibilityState={{ busy }} accessibilityLabel="Sign the poster">
      <Animated.View
        style={[
          { minHeight: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, transform: [{ scale: s }], opacity: busy ? 0.7 : 1 },
          Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #FF6A1A, #E0401C)' } as object) : ({ experimental_backgroundImage: 'linear-gradient(180deg, #FF6A1A, #E0401C)' } as object),
        ]}
      >
        <Icon name="signature" variant="bold" size={22} color="#fff" />
        <T style={{ fontFamily: F.displayBold, fontSize: 18, letterSpacing: 0.4, color: '#fff' }}>{busy ? 'Signing…' : deputy ? 'Sign the poster' : 'Sign the poster'}</T>
      </Animated.View>
    </Pressable>
  );
}

/** The city's street-level heat as a halftone: where this act's crowd lives. */
function MiniHeat({ p, width }: { p: PosterState; width: number }) {
  const W = width;
  const H = Math.round(width * 0.62);
  const proj = useMemo(() => {
    const lats = p.hexes.map((h) => h.lat);
    const lons = p.hexes.map((h) => h.lon);
    const k = Math.cos((p.city.lat * Math.PI) / 180);
    const x0 = Math.min(...lons) * k;
    const x1 = Math.max(...lons) * k;
    const y0 = Math.min(...lats);
    const y1 = Math.max(...lats);
    const pad = 22;
    const sc = Math.min((W - pad * 2) / Math.max(1e-6, x1 - x0), (H - pad * 2) / Math.max(1e-6, y1 - y0));
    const ox = (W - (x1 - x0) * sc) / 2;
    const oy = (H - (y1 - y0) * sc) / 2;
    return (lat: number, lon: number) => [ox + (lon * k - x0) * sc, oy + (y1 - lat) * sc] as const;
  }, [p, W, H]);
  const maxHeat = Math.max(...p.hexes.map((h) => h.heat), 1e-6);
  const labels = p.neighborhoods.filter((n) => n.lat !== null && n.lon !== null && p.topNeighborhoods.includes(n.name)).slice(0, 3);
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', overflow: 'hidden' } as object}>
      <View style={{ padding: S.lg, paddingBottom: 0, gap: 2 }}>
        <T v="label" color={C.amber}>
          Qloo says
        </T>
        <T v="headline">
          Where {p.artist.name.split(' ')[0]}'s crowd lives in {p.city.name}
        </T>
      </View>
      <Svg width={W} height={H} accessibilityLabel={`Heat map of ${p.city.name}. Hottest: ${p.topNeighborhoods.join(', ')}.`}>
        {p.hexes.map((h) => {
          const [x, y] = proj(h.lat, h.lon);
          const t = h.heat / maxHeat;
          return <Circle key={h.h3} cx={x} cy={y} r={1.6 + t * 4.2} fill={heatColor(0.1 + t * 0.9)} opacity={0.35 + t * 0.65} />;
        })}
        {labels.map((n) => {
          const [x, y] = proj(n.lat!, n.lon!);
          return (
            <SvgText key={n.name} x={x} y={y - 10} fill="#fff" fontSize={12} fontWeight="600" textAnchor="middle">
              {n.name}
            </SvgText>
          );
        })}
      </Svg>
      <T v="caption" style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
        Predicted taste, not a headcount. Fan signatures are what prove it.
      </T>
    </View>
  );
}
