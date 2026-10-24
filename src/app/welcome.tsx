/**
 * First run, and every new act. Not a stack of slides: a world you touch.
 *
 * The country at night as a halftone of taste. Drag the van onto the road and a card rises
 * (Gus riding on top of it) that asks only what Wanted can't work out itself:
 *   1. Act or fan.
 *   2. Your link. Spotify, Apple Music, Bandcamp, SoundCloud, YouTube, RYM, or a name.
 *   3. Who you sound like, already filled in from who your listeners also play.
 *   4. How big your rooms are.
 *   5. Gus: hold him to talk. You learn the gesture by doing it.
 * Then the card drops away and the map ignites city by city while Gus actually reads the
 * taste graph, and you land on your own map. No account, no sign-in.
 */
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActEntity, RoomBand } from '@/lib/types';
import { api, ApiError, streamNdjson } from '@/ui/api';
import { GusSticker, type GusMood } from '@/ui/components/Gus';
import { T } from '@/ui/components/T';
import { haptic } from '@/ui/haptics';
import { prime, useApi, useReducedMotion } from '@/ui/hooks';
import { Icon } from '@/ui/icons/Icon';
import { heatFromHexes, World, type Pin } from '@/ui/onboarding/World';
import { Roll } from '@/ui/fx/Roll';
import { enterSheet, enterSide, enterUp, exitSheet, exitSide, exitUp, fadeIn, settle, timing } from '@/ui/motion';
import { defaultStart, session } from '@/ui/session';
import { C, F, IMAGES, S } from '@/ui/theme';
import type { MapData, PublicArtist } from '@/ui/types';

type Step = 'who' | 'link' | 'sound' | 'rooms' | 'gus' | 'fan' | 'run';
const ARTIST_STEPS: Step[] = ['who', 'link', 'sound', 'rooms', 'gus'];

type Similar = { name: string; image: string | null; fans: number | null; entity: ActEntity | null };
type LinkResult = { source: string; name: string; image: string | null; fans: number | null; genres: string[]; self: ActEntity | null; similar: Similar[]; spotifyId?: string | null };
type Matched = { self: ActEntity | null; genres: string[]; similar: Similar[] };
type RunEvent =
  | { type: 'progress'; text: string }
  | { type: 'tool'; tool: string; text: string }
  | { type: 'line'; text: string }
  | { type: 'error'; error: string }
  | { type: 'result'; artist: { id: string; slug: string; name: string }; line: string; model: string; picks: { metroId: string; name: string; state: string; reason: string; sleeper: boolean }[]; notices: string[]; map: MapData };

const LINES: Record<Step, { line: string; mood: GusMood }> = {
  who: { line: 'Name’s Gus. I route vans.', mood: 'wave' },
  link: { line: 'Paste anything. I’ll figure out who you are.', mood: 'reading' },
  sound: { line: 'Your listeners also play these. Keep the ones that fit.', mood: 'thinking' },
  rooms: { line: 'Be honest. Nobody fills a theater on hope.', mood: 'unimpressed' },
  gus: { line: 'Hold me. I don’t bite.', mood: 'proud' },
  fan: { line: 'Good. Fans are how this works.', mood: 'proud' },
  run: { line: '', mood: 'thinking' },
};

const ROOMS: { band: RoomBand; title: string; sub: string; cap: string }[] = [
  { band: 'small', title: 'Bars and back rooms', sub: 'Where you can see every face', cap: 'up to 150' },
  { band: 'mid', title: 'Clubs', sub: 'A real stage, a real door count', cap: '150 to 500' },
  { band: 'big', title: 'Theaters', sub: 'Seats, a balcony, a merch line', cap: '500+' },
];

const fmtFans = (n: number | null) => (n === null ? null : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ start?: string }>();
  // "New act" from inside the app skips the van and the act-or-fan question.
  const [entered, setEntered] = useState(params.start === 'link');
  const [step, setStep] = useState<Step>(params.start === 'link' ? 'link' : 'who');
  const [linkText, setLinkText] = useState('');
  const [found, setFound] = useState<LinkResult | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [matched, setMatched] = useState<Matched | null>(null);
  const [band, setBand] = useState<RoomBand>('small');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ title: string; line: string | null; pins: Pin[]; heat: ReturnType<typeof heatFromHexes> | null }>({ title: 'Reading the taste graph', line: null, pins: [], heat: null });
  const ignite = useSharedValue(params.start === 'link' ? 0.5 : 0.3);
  // With the card up, the map rises into the space above it; during the run it comes back down.
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = timing(entered && step !== 'run' ? -height * 0.17 : 0, 520);
  }, [entered, step, height, rise]);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  // The card rides the keyboard up.
  const kb = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      kb.value = withTiming(e.endCoordinates.height - Math.max(insets.bottom, 8) + 8, { duration: e.duration || 250, easing: Easing.out(Easing.cubic) });
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
      kb.value = withTiming(0, { duration: e?.duration || 250, easing: Easing.out(Easing.cubic) });
    });
    return () => (show.remove(), hide.remove());
  }, [insets.bottom, kb]);
  const cardLift = useAnimatedStyle(() => ({ transform: [{ translateY: -kb.value }] }));

  const flow: Step[] = step === 'fan' ? ['who', 'fan'] : params.start === 'link' ? ARTIST_STEPS.slice(1) : ARTIST_STEPS;
  const index = Math.max(0, flow.indexOf(step));
  const go = (s: Step) => {
    haptic.tick();
    setErr(null);
    Keyboard.dismiss();
    setStep(s);
  };
  const back = () => {
    if (step === 'fan') return go('who');
    const i = flow.indexOf(step);
    if (i > 0) go(flow[i - 1]);
    else if (params.start === 'link') router.back();
  };

  const enter = () => {
    haptic.success();
    ignite.value = withTiming(0.55, { duration: 900 });
    setEntered(true);
  };

  const readLink = async (text = linkText) => {
    if (!text.trim()) return setErr('Paste a link or type your name.');
    setBusy(true);
    setErr(null);
    Keyboard.dismiss();
    try {
      const r = await api.post<LinkResult>('/scout/link', { text: text.trim() });
      setFound(r);
      setMatched(null);
      setKeep(Object.fromEntries(r.similar.map((s, i) => [s.name, i < 3])));
      haptic.success();
      // Pin them to Qloo while the artist checks their card.
      api
        .post<Matched>('/scout/link', { match: { name: r.name, spotifyId: r.spotifyId ?? null, similar: r.similar } })
        .then((m) => {
          setMatched(m);
          setKeep((k) => Object.fromEntries(m.similar.map((s, i) => [s.name, k[s.name] ?? i < 3])));
        })
        .catch(() => setMatched({ self: null, genres: [], similar: [] }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That link didn’t work.');
      haptic.warn();
    } finally {
      setBusy(false);
    }
  };

  const paste = async () => {
    const t = (await Clipboard.getStringAsync().catch(() => '')).trim();
    if (!t) return setErr('Nothing on your clipboard yet.');
    setLinkText(t);
    readLink(t);
  };

  const start = async () => {
    if (!found || !matched) return;
    const refs = matched.similar.filter((s) => keep[s.name] && s.entity).map((s) => s.entity!);
    const self = matched.self;
    if (!refs.length && !self) return setErr('Keep at least one act you sound like.');
    setStep('run');
    haptic.thump();
    ignite.value = withTiming(0.15, { duration: 500 });
    const ctl = new AbortController();
    abort.current = ctl;
    let done = false;
    const steps = ['Finding where your people are', 'Comparing with 20 other acts', 'Finding sleeper cities'];
    try {
      await streamNdjson<RunEvent>(
        '/scout/run',
        {
          artistName: found.name,
          self: self ? { id: self.id, name: self.name } : null,
          refs: refs.map((r) => ({ id: r.id, name: r.name })),
          kind: 'music',
          text: `I'm ${found.name}. I sound like ${refs.map((r) => r.name).join(' and ')}.`,
          roomBand: band,
          homeBase: null,
        },
        (e) => {
          if (e.type === 'progress') {
            const i = steps.indexOf(e.text);
            ignite.value = withTiming(0.2 + Math.max(0, i + 1) * 0.22, { duration: 1400, easing: Easing.out(Easing.cubic) });
            setRun((r) => ({ ...r, title: e.text }));
            haptic.tick();
          } else if (e.type === 'line') setRun((r) => ({ ...r, line: e.text }));
          else if (e.type === 'error') throw new ApiError(500, e.error);
          else if (e.type === 'result') {
            done = true;
            const slug = e.artist.slug;
            const byId = new Map(e.map.metros.map((m) => [m.id, m]));
            const pins = e.picks.flatMap((p) => {
              const m = byId.get(p.metroId);
              return m ? [{ id: p.metroId, name: p.name, lat: m.lat, lon: m.lon, sleeper: p.sleeper }] : [];
            });
            setRun({ title: 'Here’s where you’re wanted', line: e.line, pins, heat: heatFromHexes(e.map.hexes) });
            ignite.value = withTiming(1, { duration: 1200 });
            prime(`/artist/${slug}/map`, e.map);
            session.setScout(slug, { line: e.line, model: e.model, picks: e.picks, at: Date.now() });
            session.setConstraints(slug, { regions: [], dates: 10, roomBand: band, homeBase: null, startDate: defaultStart() });
            session.setLastArtist(slug);
            session.setOnboarded(true);
            session.addAct({ slug, name: e.artist.name, sounds: refs.map((r) => r.name) });
            haptic.success();
            setTimeout(() => router.replace(`/a/${slug}`), 2600 + pins.length * 260);
          }
        },
        ctl.signal,
      );
      if (!done) throw new ApiError(500, 'Gus lost the thread. Try again.');
    } catch (e) {
      if (ctl.signal.aborted) return;
      setErr(e instanceof Error ? e.message : 'Scout failed.');
      setStep('gus');
    }
  };

  const demo = () => {
    session.setOnboarded(true);
    haptic.tap();
    router.replace('/a/maya-ortiz');
  };

  const line = LINES[step];

  return (
    <View style={{ flex: 1, backgroundColor: '#05060B' }}>
      <Head>
        <title>Wanted · Find out where you’re wanted</title>
      </Head>
      <World width={width} height={height} ignite={ignite} rise={rise} heat={run.heat} pins={run.pins} reduced={reduced} />

      {!entered ? <Intro onEnter={enter} onDemo={demo} reduced={reduced} /> : null}

      {step === 'run' ? (
        <Animated.View entering={fadeIn(400)} style={{ position: 'absolute', top: insets.top + 36, left: 24, right: 24, alignItems: 'center', gap: 14 }}>
          <Roll text={`${run.title}${run.pins.length ? '' : '…'}`} by="word" align="center" style={{ fontFamily: F.display, fontSize: 30, lineHeight: 34, color: '#fff', letterSpacing: -0.6 }} />
          {run.line ? (
            <Animated.View entering={enterUp(120)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', maxWidth: 420 }}>
              <GusSticker mood={run.pins.length ? 'proud' : 'reading'} size={56} />
              <T v="gus" style={{ flex: 1 }}>{run.line}</T>
            </Animated.View>
          ) : null}
          {err ? <T color={C.bad}>{err}</T> : null}
        </Animated.View>
      ) : null}

      {entered && step !== 'run' ? (
        <Animated.View entering={enterSheet()} exiting={exitSheet()} style={{ position: 'absolute', left: 8, right: 8, bottom: Math.max(insets.bottom, 8) }}>
          {/* The keyboard lift lives on its own view so it never fights the enter/exit animation. */}
          <Animated.View style={[{ alignItems: 'center' }, cardLift]}>
          <FloatingGus line={line.line} mood={line.mood} reduced={reduced} />
          <View style={[styles.card, { zIndex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
              <View style={{ width: 64 }}>
                {index > 0 || step === 'fan' || params.start === 'link' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={styles.round}>
                    <Icon name="back" size={18} color={C.text} />
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center' }} accessibilityLabel={`Step ${index + 1} of ${flow.length}`}>
                {flow.map((s, i) => (
                  <Dash key={s} on={i <= index} />
                ))}
              </View>
              <View style={{ width: 64, alignItems: 'flex-end' }}>
                {step === 'who' ? (
                  <Pressable accessibilityRole="button" onPress={demo} hitSlop={8}>
                    <T v="footnote" color={C.text2}>
                      Just look
                    </T>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Animated.View key={step} entering={reduced ? fadeIn() : enterSide()} exiting={reduced ? undefined : exitSide()} style={{ gap: S.lg, paddingTop: S.sm }}>
              {step === 'who' ? (
                <>
                  <Title>Who’s this for?</Title>
                  <Choice image="maya-sticker" title="I play shows" sub="Find the cities that already want you, and prove it." onPress={() => go('link')} />
                  <Choice image="gus-signing" title="I want someone to play my city" sub="Sign their WANTED poster. Enough names and they come." onPress={() => go('fan')} />
                </>
              ) : null}

              {step === 'link' ? (
                <>
                  {found ? <Title>Is this you?</Title> : <Title sub="Spotify, Apple Music, Bandcamp, SoundCloud, YouTube or Rate Your Music. Or just type your name.">Drop your link</Title>}
                  {found ? (
                    <Identity found={found} onReject={() => (setFound(null), setLinkText(''))} />
                  ) : (
                    <View style={styles.field}>
                      <Icon name="link" size={18} color={C.text3} />
                      <TextInput
                        value={linkText}
                        onChangeText={(t) => (setLinkText(t), setErr(null))}
                        onSubmitEditing={() => readLink()}
                        placeholder="open.spotify.com/artist/…"
                        placeholderTextColor={C.text3}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        accessibilityLabel="Your link or name"
                        style={{ flex: 1, color: C.text, fontSize: 17, paddingVertical: 14, outlineStyle: 'none' } as object}
                      />
                      {linkText ? null : Clipboard.isPasteButtonAvailable ? (
                        // The system Paste control: reads the clipboard without the "Allow Paste" prompt.
                        <Clipboard.ClipboardPasteButton
                          acceptedContentTypes={['plain-text']}
                          displayMode="labelOnly"
                          cornerStyle="capsule"
                          backgroundColor="#3A3A3E"
                          foregroundColor="#FFFFFF"
                          style={{ width: 76, height: 36 }}
                          onPress={(d) => {
                            if (d.type !== 'text' || !d.text.trim()) return setErr('Nothing on your clipboard yet.');
                            setLinkText(d.text.trim());
                            readLink(d.text.trim());
                          }}
                        />
                      ) : (
                        <Pressable accessibilityRole="button" onPress={paste} hitSlop={6} style={({ pressed }) => [styles.paste, { opacity: pressed ? 0.6 : 1 }]}>
                          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 14, color: C.text }}>Paste</T>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {err ? <T v="footnote" color={C.bad}>{err}</T> : null}
                  {found ? <Primary onPress={() => go('sound')}>That’s me</Primary> : <Primary busy={busy} disabled={!linkText.trim()} onPress={() => readLink()}>{busy ? 'Reading your link' : 'Continue'}</Primary>}
                </>
              ) : null}

              {step === 'sound' && found ? (
                <>
                  <Title sub={matched && !matched.similar.length ? 'Qloo doesn’t know who you sound like yet. Go back and try your Spotify link, or a bigger act you sound like.' : 'From who your listeners also play. Tap to keep or drop.'}>You sound like</Title>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingVertical: 4 }}>
                    {(matched ? matched.similar : found.similar.slice(0, 5)).map((s, i) => (
                      <Portrait key={s.name} s={s} on={!!keep[s.name]} i={i} pending={!matched} onPress={() => (haptic.tick(), setKeep((k) => ({ ...k, [s.name]: !k[s.name] })))} />
                    ))}
                  </View>
                  {!matched ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={C.text3} />
                      <T v="footnote">Checking each one against Qloo’s taste graph</T>
                    </View>
                  ) : null}
                  {err ? <T v="footnote" color={C.bad}>{err}</T> : null}
                  <Primary busy={!matched} disabled={!!matched && !matched.similar.some((s) => keep[s.name]) && !matched.self} onPress={() => go('rooms')}>
                    {!matched ? 'One sec' : `Keep ${matched.similar.filter((s) => keep[s.name]).length || 'none'}`}
                  </Primary>
                </>
              ) : null}

              {step === 'rooms' ? (
                <>
                  <Title sub="I’ll plan ten dates from December. Change any of it later.">How big are your rooms?</Title>
                  <View style={{ gap: 8 }}>
                    {ROOMS.map((r) => (
                      <RoomRow key={r.band} r={r} on={band === r.band} onPress={() => (haptic.tick(), setBand(r.band))} />
                    ))}
                  </View>
                  <Primary onPress={() => go('gus')}>Continue</Primary>
                </>
              ) : null}

              {step === 'gus' ? (
                <>
                  <Title sub="Your tour manager. Hold him and talk: “take me to Chicago”, “where do I stay in Denver”. He lives at the bottom of every screen.">Meet Gus</Title>
                  <HoldToMeet onDone={() => haptic.success()} />
                  {err ? <T v="footnote" color={C.bad}>{err}</T> : null}
                  <Primary onPress={start}>Find my cities</Primary>
                </>
              ) : null}

              {step === 'fan' ? <FanPick /> : null}
            </Animated.View>
          </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The first screen: the wordmark, the country, and one gesture. Slide the van along the track to start. */
function Intro({ onEnter, onDemo, reduced }: { onEnter: () => void; onDemo: () => void; reduced: boolean }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const trackW = width - 48;
  const VAN_W = 84;
  const VAN_H = 56;
  const PAD = 6;
  const reach = trackW - VAN_W - PAD * 2;
  const x = useSharedValue(0);
  const lift = useSharedValue(1);
  const gone = useSharedValue(0);
  const hint = useSharedValue(0);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    if (reduced) return;
    // A small nudge along the track, so the gesture explains itself.
    hint.value = withDelay(1500, withRepeat(withSequence(withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 650 }), withTiming(0, { duration: 1100 })), -1));
  }, [reduced, hint]);

  const finish = () => {
    setLeft(true);
    haptic.success();
    onEnter();
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      lift.value = timing(1.05, 140);
      hint.value = 0;
      runOnJS(haptic.tap)();
    })
    .onUpdate((e) => {
      x.value = Math.max(0, Math.min(reach, e.translationX));
    })
    .onEnd((e) => {
      if (x.value > reach * 0.7 || e.velocityX > 900) {
        x.value = settle(reach, 220);
        gone.value = withDelay(120, timing(1, 320));
        runOnJS(finish)();
      } else {
        x.value = settle(0, 300);
      }
    })
    .onFinalize(() => {
      lift.value = timing(1, 200);
    });

  const van = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value + hint.value * 22 }, { scale: lift.value }, { rotate: '-4deg' }],
  }));
  // The track fills behind the van as it goes, and the label steps aside.
  const fill = useAnimatedStyle(() => ({ width: PAD * 2 + VAN_W + x.value, opacity: 0.35 + 0.65 * Math.min(1, x.value / (reach * 0.5)) }));
  const label = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - x.value / (reach * 0.45)) }));
  const fade = useAnimatedStyle(() => ({ opacity: 1 - gone.value, transform: [{ translateY: -gone.value * 24 }] }));
  const dock = useAnimatedStyle(() => ({ opacity: 1 - gone.value, transform: [{ translateY: gone.value * 24 }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={left ? 'none' : 'box-none'}>
      <Animated.View style={[{ position: 'absolute', top: insets.top + 44, left: 0, right: 0, alignItems: 'center', gap: 12 }, fade]} pointerEvents="none">
        <Wordmark reduced={reduced} />
        <Animated.View entering={reduced ? undefined : enterUp(520, 8, 320)} style={{ alignItems: 'center', gap: 2 }}>
          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 20, lineHeight: 26, color: '#fff', textAlign: 'center' }}>Find the cities that want you.</T>
          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 20, lineHeight: 26, color: C.text3, textAlign: 'center' }}>Prove it. Go.</T>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', bottom: insets.bottom + 24, left: 24, right: 24, alignItems: 'center', gap: 18 }, dock]} pointerEvents="box-none">
        <View style={{ width: trackW, height: VAN_H + PAD * 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: C.purple }, fill]} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: VAN_W + PAD * 2, right: 20, alignItems: 'center' }, label]}>
            <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 17, color: 'rgba(255,255,255,0.85)' }}>Slide to find your cities</T>
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Start. Slide the van to begin."
              accessibilityActions={[{ name: 'activate' }]}
              onAccessibilityAction={finish}
              style={[{ position: 'absolute', left: PAD, top: PAD, width: VAN_W, height: VAN_H, alignItems: 'center', justifyContent: 'center' }, van]}
            >
              <Image source={IMAGES.van} style={{ width: VAN_W + 8, height: VAN_H }} contentFit="contain" />
            </Animated.View>
          </GestureDetector>
        </View>
        <Pressable accessibilityRole="button" onPress={onDemo} hitSlop={12}>
          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 15, color: C.text2 }}>Look around with a demo act</T>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** WANTED, letter by letter, like it's being stamped. */
function Wordmark({ reduced }: { reduced: boolean }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityRole="header" accessibilityLabel="Wanted">
      {'WANTED'.split('').map((ch, i) => (
        <Animated.View key={i} entering={reduced ? undefined : enterUp(80 + i * 40, 10, 300)}>
          <T style={{ fontFamily: F.displayBlack, fontSize: 62, lineHeight: 66, color: '#fff', letterSpacing: -1.5 }}>{ch}</T>
        </Animated.View>
      ))}
    </View>
  );
}

function FloatingGus({ line, mood, reduced }: { line: string; mood: GusMood; reduced: boolean }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, bob]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * 2 }] }));
  // Rendered before the card, so the card's top edge hides Gus from the chest down.
  return (
    <View style={{ width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 22, marginBottom: -GUS_TUCK, zIndex: 0 }}>
      <Animated.View style={st}>
        <GusSticker mood={mood} size={GUS_H} />
      </Animated.View>
      <View style={{ flexShrink: 1, marginBottom: GUS_TUCK + 14, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 9, alignSelf: 'flex-end', maxWidth: 270 }}>
        <Roll text={line} by="word" style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 15, lineHeight: 19, color: C.ink }} />
      </View>
    </View>
  );
}

const GUS_H = 136;
/** How much of Gus the card covers. */
const GUS_TUCK = 14;

function Dash({ on }: { on: boolean }) {
  const w = useSharedValue(on ? 22 : 12);
  useEffect(() => {
    w.value = timing(on ? 22 : 12, 240);
  }, [on, w]);
  const st = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: on ? '#fff' : 'rgba(255,255,255,0.2)' }, st]} />;
}

function Title({ children, sub }: { children: string; sub?: string }) {
  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <View accessibilityRole="header">
        <Roll text={children} by="word" align="center" style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: '#fff', letterSpacing: -0.5 }} />
      </View>
      {sub ? (
        <T v="callout" color={C.text2} style={{ textAlign: 'center', maxWidth: 360 }}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

function Primary({ children, onPress, busy, disabled }: { children: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!busy }} disabled={disabled || busy} onPress={() => (haptic.tap(), onPress())} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: disabled ? 0.4 : 1 })}>
      <View style={{ height: 54, borderRadius: 27, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {busy ? <ActivityIndicator color={C.ink} /> : null}
        <T style={{ fontFamily: F.rounded, fontWeight: '700', fontSize: 17, color: '#000' }}>{children}</T>
      </View>
    </Pressable>
  );
}

function Choice({ image, title, sub, onPress }: { image: keyof typeof IMAGES; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={() => (haptic.tap(), onPress())} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.07)' }}>
        <Image source={IMAGES[image]} style={{ width: 64, height: 64 }} contentFit="contain" />
        <View style={{ flex: 1, gap: 3 }}>
          <T v="headline">{title}</T>
          <T v="footnote">{sub}</T>
        </View>
        <Icon name="chevron" size={18} color={C.text3} />
      </View>
    </Pressable>
  );
}

function Identity({ found, onReject }: { found: LinkResult; onReject: () => void }) {
  const stamp = useSharedValue(1.35);
  useEffect(() => {
    stamp.value = withDelay(200, timing(1, 200));
  }, [stamp]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: stamp.value }, { rotate: '-10deg' }], opacity: (1.35 - stamp.value) / 0.35 }));
  const fans = fmtFans(found.fans);
  return (
    <Animated.View entering={fadeIn()} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.07)' }}>
      {found.image ? <Image source={{ uri: found.image }} style={{ width: 72, height: 72, borderRadius: 36 }} contentFit="cover" transition={200} /> : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.fill }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: F.displayBold, fontSize: 20, color: '#fff' }} numberOfLines={1}>
          {found.name}
        </T>
        <T v="footnote">{[fans ? `${fans} fans on Deezer` : null, found.genres[0] ?? null].filter(Boolean).join(' · ') || 'Found you'}</T>
        <Pressable accessibilityRole="button" onPress={onReject} hitSlop={8} style={{ paddingTop: 4 }}>
          <T v="footnote" color={C.purpleHi}>
            Not me
          </T>
        </Pressable>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 14, bottom: 12, borderWidth: 2.5, borderColor: C.flame, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }, st]}>
        <T style={{ fontFamily: F.displayBlack, fontSize: 14, color: C.flame, letterSpacing: 1 }}>FOUND</T>
      </Animated.View>
    </Animated.View>
  );
}

function Portrait({ s, on, i, onPress, pending }: { s: Similar; on: boolean; i: number; onPress: () => void; pending?: boolean }) {
  const sc = useSharedValue(on ? 1 : 0.92);
  useEffect(() => {
    sc.value = timing(on ? 1 : 0.92, 180);
  }, [on, sc]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.View entering={enterUp(i * 35, 6)}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: pending }} disabled={pending} accessibilityLabel={s.name} onPress={onPress} style={{ width: 92, alignItems: 'center', gap: 6, opacity: pending ? 0.55 : 1 }}>
        <Animated.View style={[{ width: 84, height: 84 }, st]}>
          {s.image ? <Image source={{ uri: s.image }} style={{ width: 84, height: 84, borderRadius: 42, opacity: on ? 1 : 0.35 }} contentFit="cover" transition={200} /> : <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.fill }} />}
          {on ? (
            <Animated.View entering={fadeIn(140)} style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#141416' }}>
              <Icon name="check" variant="bold" size={18} color={C.purple} />
            </Animated.View>
          ) : null}
        </Animated.View>
        <T v="footnote" color={on ? C.text : C.text3} numberOfLines={1} style={{ textAlign: 'center' }}>
          {s.name}
        </T>
      </Pressable>
    </Animated.View>
  );
}

function RoomRow({ r, on, onPress }: { r: (typeof ROOMS)[number]; on: boolean; onPress: () => void }) {
  // Rows of five: one short row, one full row, two full rows.
  const dots = r.band === 'small' ? 3 : r.band === 'mid' ? 5 : 10;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${r.title}, ${r.cap}`} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderCurve: 'continuous', backgroundColor: on ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: on ? '#fff' : 'transparent' }}>
        <View style={{ width: 48, flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {Array.from({ length: dots }, (_, k) => (
            <View key={k} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: on ? C.amber : C.text3 }} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <T v="headline">{r.title}</T>
          <T v="footnote">{r.sub}</T>
        </View>
        <T v="monoSmall" color={on ? C.text : C.text3}>
          {r.cap}
        </T>
      </View>
    </Pressable>
  );
}

/** Teach the gesture by doing it: hold Gus until the ring closes. */
function HoldToMeet({ onDone }: { onDone: () => void }) {
  const p = useSharedValue(0);
  const [done, setDone] = useState(false);
  const finish = () => {
    setDone(true);
    onDone();
  };
  const press = Gesture.LongPress()
    .minDuration(900)
    .onBegin(() => {
      p.value = withTiming(1, { duration: 900, easing: Easing.linear });
    })
    .onStart(() => runOnJS(finish)())
    .onFinalize(() => {
      if (p.value < 1) p.value = withTiming(0, { duration: 200 });
    });
  const glow = useAnimatedStyle(() => ({ opacity: 0.2 + p.value * 0.8, transform: [{ scaleX: 0.7 + p.value * 0.5 }] }));
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <GestureDetector gesture={press}>
        <View accessible accessibilityRole="button" accessibilityLabel="Hold Gus" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={finish} style={{ width: 200, height: 150, alignItems: 'center', justifyContent: 'flex-end' }}>
          {/* A stage light on the floor: it opens up while you hold. */}
          <Animated.View style={[{ position: 'absolute', bottom: -6, width: 180, height: 26, borderRadius: 90, backgroundColor: C.purple, shadowColor: C.purpleHi, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }, glow]} />
          <GusSticker mood={done ? 'proud' : 'wave'} size={150} />
        </View>
      </GestureDetector>
      <View style={{ width: 120, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: done ? C.good : C.purpleHi }, bar]} />
      </View>
      <T v="footnote" color={done ? C.good : C.text2}>
        {done ? 'That’s it. He’s yours now.' : 'Touch and hold'}
      </T>
    </View>
  );
}

/** Fans: pick an act on Wanted, then your city, and land on its poster. */
function FanPick() {
  const { data } = useApi<{ artists: PublicArtist[] }>('/artists');
  const [artist, setArtist] = useState<PublicArtist | null>(null);
  const { data: map } = useApi<MapData>(artist ? `/artist/${artist.slug}/map` : null);
  const cities = useMemo(() => (map?.metros ?? []).filter((m) => m.rank !== null).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 8), [map]);
  return (
    <>
      <Title sub={artist ? 'Every signature counts toward a show there.' : 'Acts on Wanted right now.'}>{artist ? 'Where are you?' : 'Who do you want?'}</Title>
      {!artist ? (
        <View style={{ gap: 8 }}>
          {(data?.artists ?? []).map((a) => (
            <Pressable key={a.slug} accessibilityRole="button" onPress={() => (haptic.tick(), setArtist(a))}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                {a.portrait || a.imageUrl ? <Image source={{ uri: (a.portrait ?? a.imageUrl)! }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" /> : <Image source={IMAGES['maya-sticker']} style={{ width: 48, height: 48 }} contentFit="contain" />}
                <T v="headline" style={{ flex: 1 }}>
                  {a.name}
                </T>
                <Icon name="chevron" size={16} color={C.text3} />
              </View>
            </Pressable>
          ))}
          {!data ? <ActivityIndicator color={C.text2} /> : null}
        </View>
      ) : (
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          {cities.map((c, i) => (
            <Pressable key={c.id} accessibilityRole="button" onPress={() => (haptic.tap(), session.setOnboarded(true), router.replace(`/w/${artist.slug}/${c.id}`))} style={({ pressed }) => ({ backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: C.lineHi }}>
                <T v="body" style={{ flex: 1 }}>
                  {c.name}, {c.state}
                </T>
                <Icon name="chevron" size={16} color={C.text3} />
              </View>
            </Pressable>
          ))}
          {!map ? <ActivityIndicator color={C.text2} style={{ padding: 16 }} /> : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#16161A',
    borderRadius: 38,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 30px 80px rgba(0,0,0,0.6)' } as object) : { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } }),
  },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', minHeight: 56 },
  paste: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});
