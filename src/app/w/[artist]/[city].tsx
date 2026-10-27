/**
 * The fan signing page (PRD 6.2; FR-18 to FR-23b): no install, no account. One narrow column:
 * who's wanted, your initials, your neighborhood, one button pinned to the bottom. Signing swaps
 * the form for the full poster with the fan's initials on it, their Signature Card and a share link.
 */
import { Link, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { absoluteUrl, api, ApiError } from '@/ui/api';
import { Btn, Empty } from '@/ui/components/core';
import { GusLine } from '@/ui/components/Gus';
import { Poster } from '@/ui/components/Poster';
import { BountyCard } from '@/ui/components/BountyCard';
import { StatusBanner } from '@/ui/components/Paper';
import { SignatureCard } from '@/ui/components/SignatureCard';
import { T } from '@/ui/components/T';
import { useToast } from '@/ui/components/Toaster';
import { haptic } from '@/ui/haptics';
import { invalidate, useApi, useReducedMotion } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { shareLink } from '@/ui/share';
import { C, F, gradient, R, S } from '@/ui/theme';
import type { PosterState } from '@/ui/types';

type SignOut = { claim: PosterState['mine'] & {}; alreadySigned: boolean; count: number; wear: 0 | 1 | 2 | 3 };

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

  const colW = Math.min(width - S.gutter * 2, 480);
  const posterW = Math.min(colW * 0.8, 320);
  const [contactOpen, setContactOpen] = useState(false);

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
  const visibleHoods = hoodsRanked.slice(0, 6);
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
  const posterData = {
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
  };

  // The poster, nailed up on the wall, with the city's warmth glowing behind it.
  const pitch = p.show ? `Sign and you’re on the first-dibs list for ${p.city.name}.` : p.bounty && !p.played ? `Sign it. One signer in ${p.city.name} meets ${first}.` : `Sign it, and show ${first} that ${p.city.name} wants a show.`;
  const hero = (
    <View style={{ alignItems: 'center', gap: S.xl }}>
      <View style={{ position: 'absolute', top: -40, width: posterW * 1.6, height: posterW * 1.6, borderRadius: posterW, opacity: 0.55, ...gradient(`radial-gradient(circle at 50% 50%, rgba(255,106,26,0.35) 0%, rgba(255,106,26,0) 62%)`) } as object} pointerEvents="none" />
      <Animated.View style={{ opacity: drop, transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', mine ? '0deg' : '-2deg'] }) }], shadowColor: '#000', shadowOpacity: 0.75, shadowRadius: 26, shadowOffset: { width: 0, height: 16 } }}>
        <Poster width={posterW} fresh={fresh} stampKey={undefined} d={posterData} />
      </Animated.View>
      {mine ? null : (
        <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: S.md }}>
          <T v="footnote" color={C.amber} style={{ fontWeight: '600' }}>
            {p.played ? 'Caught live' : `Wanted in ${p.city.name}, ${p.city.state}`}
          </T>
          <T style={{ fontFamily: F.displayBlack, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: C.text, textAlign: 'center' }}>{p.artist.name}</T>
          <T v="callout" color={C.text2} style={{ textAlign: 'center' }}>
            {pitch}
          </T>
        </View>
      )}
    </View>
  );

  const signed = mine ? (
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
      <Btn tone="action" size="lg" full onPress={shareCard} icon={<Icon name="share" size={19} color="#fff" />}>
        Share my card
      </Btn>
      {p.bounty && (!p.played || p.bounty.drawn) ? <BountyCard bounty={p.bounty} artistFirst={first} side="fan" signed /> : null}
      <View style={{ backgroundColor: C.card, borderRadius: R.card, borderCurve: 'continuous', padding: S.xl, gap: S.md } as object}>
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
    </View>
  ) : null;

  const form = (
    <View style={{ gap: S.xxl }}>
      <SignLine value={initials} onChange={setInitials} number={p.count + 1} city={p.city.name} />

      <View style={{ gap: S.sm }}>
        <T v="headline">Where in {p.city.name}?</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {visibleHoods.map((n) => (
            <HoodChip
              key={n}
              label={n}
              selected={!other && hood === n}
              onPress={() => {
                haptic.tick();
                setOther(false);
                setHood(hood === n ? null : n);
              }}
            />
          ))}
          <HoodChip
            label="Elsewhere"
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

      {contactOpen ? (
        <View style={{ gap: S.sm }}>
          <T v="label">Email or phone</T>
          <Field value={contact} onChangeText={setContact} placeholder="For first access when tickets go up" label="Email or phone for first access, optional" keyboardType="email-address" autoCapitalize="none" />
          <T v="caption">{first} never sees it, and we never sell it.</T>
        </View>
      ) : (
        <Pressable onPress={() => setContactOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minHeight: 44, justifyContent: 'center' })}>
          <T v="footnote" color={C.amber}>
            + Add email or phone for first access
          </T>
        </Pressable>
      )}

      {err ? (
        <T v="footnote" color={C.bad} accessibilityLiveRegion="assertive">
          {err}
        </T>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ gap: S.sm, paddingTop: S.sm }}>
      <T v="caption">
        Signing is free and non-binding. We keep your initials and neighborhood for this poster, and your contact only if you add it, encrypted. None of it goes to Qloo or any AI model.
        {p.artist.isDemo ? ' Demo poster: signatures are seeded test data.' : ''}
      </T>
      <Link href="/" asChild>
        <Pressable accessibilityRole="link" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 })}>
          <T style={{ fontFamily: F.displayBlack, fontSize: 13, letterSpacing: 1, color: C.text }}>WANTED</T>
          <T v="caption">Find out where you're wanted</T>
        </Pressable>
      </Link>
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
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + (mine ? 48 : 130), alignItems: 'center' }}>
        <View style={{ width: '100%' }}>
          <TopBar count={p.count} cityName={p.city.name} canGoBack={Platform.OS !== 'web' && router.canGoBack()} />
        </View>
        <View style={{ width: colW, gap: S.xxl, paddingTop: S.lg }}>
          {hero}
          {p.show && !p.played ? <ItsOn show={p.show} signed={!!mine} first={first} /> : null}
          {mine ? signed : form}
          {mine ? null : footer}
        </View>
      </ScrollView>
      {mine ? null : (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: C.canvas, borderTopWidth: 1, borderColor: C.line, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.md) }}>
          <View style={{ width: colW, gap: 6 }}>
            <SignButton onPress={sign} busy={busy} />
            <T v="caption" style={{ textAlign: 'center' }}>
              {p.deputiesLeft > 0 ? `${p.deputiesLeft} Deputy badges left in ${p.city.name}` : 'Your signature still counts'}
            </T>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** The poster worked: the date is held. Signers hear first; everyone else is told how to. */
function ItsOn({ show, signed, first }: { show: { room: string; date: string }; signed: boolean; first: string }) {
  const night = new Date(`${show.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return (
    <StatusBanner
      tone="good"
      title={`Simulated show: ${show.room}, ${night}`}
      body={signed ? 'You signed your interest. This demo hold is not a real concert or ticket sale. First-dibs announcement copy is prepared, not sent.' : 'This is a simulated hold, not a real concert or ticket sale. Signing records interest only.'}
    />
  );
}

/**
 * Where the fan signs: a strip of poster paper with a ruled line, an ✕, and their initials in
 * handwriting as they type, numbered the way the poster will number them.
 */
function SignLine({ value, onChange, number, city }: { value: string; onChange: (t: string) => void; number: number; city: string }) {
  const font = F.sig[number % 3];
  return (
    <View style={{ backgroundColor: C.cream, borderRadius: 18, borderCurve: 'continuous', padding: S.lg, gap: S.md, transform: [{ rotate: '-0.6deg' }], shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } } as object}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T style={{ fontFamily: F.displayBlack, fontSize: 11, letterSpacing: 1.6, color: C.posterRed }}>{`WANTED IN ${city.toUpperCase()}`}</T>
        <T style={{ fontFamily: F.monoBold, fontSize: 12, color: 'rgba(58,34,19,0.65)' }}>No. {number}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, borderBottomWidth: 1.5, borderColor: 'rgba(58,34,19,0.45)', paddingBottom: 2 }}>
        <T style={{ fontFamily: F.displayBold, fontSize: 20, color: C.posterRed, paddingBottom: 10 }}>✕</T>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.slice(0, 18))}
          placeholder="Your initials"
          placeholderTextColor="rgba(58,34,19,0.35)"
          accessibilityLabel="Your initials or first name, written on the poster"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={18}
          style={{ flex: 1, minHeight: 60, color: '#1d3a6b', fontSize: 34, fontFamily: font, outlineStyle: 'none' } as object}
        />
      </View>
      <T style={{ fontFamily: F.body, fontSize: 13, color: 'rgba(58,34,19,0.7)' }}>Your initials go on the poster for everyone in {city} to see.</T>
    </View>
  );
}

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

function Field(props: { value: string; onChangeText: (t: string) => void; placeholder: string; label: string; keyboardType?: 'email-address' | 'default'; autoCapitalize?: 'none' | 'words' | 'characters'; big?: boolean }) {
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
      maxLength={props.big ? 18 : undefined}
      style={{ minHeight: props.big ? 60 : 50, borderRadius: R.sm + 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.lg, color: C.text, fontSize: props.big ? 30 : 17, fontFamily: props.big ? F.sig[0] : F.body, outlineStyle: 'none' } as object}
    />
  );
}

function SignButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)} disabled={busy} accessibilityRole="button" accessibilityState={{ busy }} accessibilityLabel="Sign the poster">
      <Animated.View
        style={[
          { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, transform: [{ scale: s }], opacity: busy ? 0.7 : 1 },
          Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(180deg, #FF6A1A, #E0401C)' } as object) : ({ experimental_backgroundImage: 'linear-gradient(180deg, #FF6A1A, #E0401C)' } as object),
        ]}
      >
        <Icon name="signature" variant="bold" size={22} color="#fff" />
        <T style={{ fontFamily: F.displayBold, fontSize: 18, letterSpacing: 0.4, color: '#fff' }}>{busy ? 'Signing…' : 'Sign the poster'}</T>
      </Animated.View>
    </Pressable>
  );
}
