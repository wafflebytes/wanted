/**
 * Gus as a calm, ambient agent. The rules, from calm technology (Weiser, Case) and Horvitz's
 * mixed-initiative principles:
 *   - Silent by default. No bar, no ticker. He takes the least attention that does the job.
 *   - One summon point: Gus himself, standing behind each screen's lead card. Tap to ask, hold to talk.
 *   - The periphery carries state: his pose follows his mood; a small bubble says when he has a note.
 *   - He interrupts only with a decision, in context (a note in Fan Mail, the Map's next move),
 *     and only at a breakpoint. Never a banner over what you're reading.
 *   - Work you hand him runs in the background, visible only while it runs ("On it"), and
 *     lands as a review card: you accept, or not. He never acts unseen.
 */
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, Keyframe, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GlassSurface } from '@/components/glassyui/glass-surface';
import { GusSticker, type GusMood } from '../components/Gus';
import { T } from '../components/T';
import { Orb } from '../fx/Orb';
import { haptic } from '../haptics';
import { useReducedMotion } from '../hooks';
import { Icon } from '../icons/Icon';
import { C, F, S } from '../theme';
import { stopVoice } from '../voice';
import { Roll } from '../fx/Roll';
import { enterSheet, exitSheet, enterSide, enterUp, fadeIn, fadeOut, timing } from '../motion';
import { gus, useGus } from './store';
import { useArtist } from '../artist';

const HOLD_MS = 200;

const toggle = () => {
  haptic.tick();
  const { phase: p, minimized } = gus.get();
  if (p === 'thinking' && minimized) gus.set({ minimized: false });
  else if (p === 'card' || p === 'answer' || p === 'thinking') gus.dismiss();
  else gus.openCard();
};

/**
 * Press handling for Gus: a short tap opens the conversation, a hold talks. On the web the
 * press-in/out pair doesn't fire reliably, so it uses a plain click and a long press instead.
 */
function useHold() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (Platform.OS === 'web')
    return {
      onPress: toggle,
      onLongPress: () => (gus.set({ holding: true }), gus.start()),
      onPressOut: () => gus.get().holding && (gus.set({ holding: false }), gus.stop(true)),
    };
  return {
    onPressIn: () => {
      gus.set({ holding: true });
      timer.current = setTimeout(() => {
        timer.current = null;
        gus.start();
      }, HOLD_MS);
    },
    onPressOut: () => {
      gus.set({ holding: false });
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        toggle();
        return;
      }
      gus.stop(true);
    },
  };
}

/**
 * Gus on his perch: standing behind the screen's lead card (or the map's sheet), waist tucked
 * out of sight, the way he stands behind the onboarding card. Tap him to ask, hold to talk.
 * The caller places him so his bottom `tuck` points sit behind something opaque.
 * When he has something to say it comes out as a small speech bubble by his head, never a badge:
 * "On it" while he works on what you handed him, "Got a note" when one is waiting in Fan Mail.
 */
export function GusPerch({ size = 84, line }: { size?: number; /** A standing line he says out loud on this screen (the map), in a bigger bubble. */ line?: string | null }) {
  const hold = useHold();
  const phase = useGus((s) => s.phase);
  const holding = useGus((s) => s.holding);
  const mood = useGus((s) => s.mood);
  const { data } = useArtist();
  const minimized = useGus((s) => s.minimized);
  const working = phase === 'thinking' && !holding && minimized;
  // While the dialog is open he's down there talking to you, so the perch is empty.
  const away = holding || (!minimized && (phase === 'card' || phase === 'thinking' || phase === 'answer'));
  const presence = useSharedValue(1);
  useEffect(() => {
    presence.value = timing(away ? 0 : 1, away ? 160 : 260);
  }, [away, presence]);
  const perch = useAnimatedStyle(() => ({ opacity: presence.value, transform: [{ translateY: (1 - presence.value) * size * 0.35 }] }));
  const note = (data?.unread ?? 0) > 0;
  const says = working ? 'On it' : note ? 'Got a note' : null;
  const speech = !says && !away && line ? line : null;
  return (
    <View pointerEvents="box-none" style={{ width: size, height: size }}>
      <Animated.View style={[{ flex: 1 }, perch]}>
        <Pressable
          {...hold}
          accessibilityRole="button"
          accessibilityLabel={working ? 'Gus, working on it' : note ? 'Gus, he has a note for you' : 'Ask Gus'}
          accessibilityHint="Tap to ask. Touch and hold to talk."
          style={({ pressed }) => ({ flex: 1, transform: [{ translateY: pressed ? 3 : 0 }] })}
        >
          <GusSticker mood={phase === 'thinking' ? 'thinking' : phase === 'listening' ? 'reading' : mood} size={size} />
        </Pressable>
      </Animated.View>
      {speech ? (
        <Animated.View
          key={speech}
          entering={enterSide(10, 240)}
          exiting={fadeOut()}
          pointerEvents="none"
          style={{ position: 'absolute', right: size * 0.78, top: -size * 0.12, width: 236, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 5, backgroundColor: '#F7F4EE', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
        >
          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 14, lineHeight: 18, color: C.ink }} numberOfLines={4}>
            {speech}
          </T>
        </Animated.View>
      ) : null}
      {says && !away ? (
        <Animated.View
          key={says}
          entering={enterSide(8, 200)}
          exiting={fadeOut()}
          pointerEvents="none"
          style={{ position: 'absolute', right: size * 0.82, top: size * 0.04, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14, borderBottomRightRadius: 4, backgroundColor: '#F7F4EE' }}
        >
          {working ? <Orb size={20} color={C.ink} /> : null}
          <T style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 13, color: C.ink }} numberOfLines={1}>
            {says}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A soft glow behind Gus that breathes with your voice while he listens; invisible otherwise. */
function Halo({ size, color = C.purpleHi }: { size: number; color?: string }) {
  const lvl = useGus((s) => s.level);
  const listening = useGus((s) => s.phase === 'listening');
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = timing(listening ? lvl : 0, 120);
  }, [lvl, listening, v]);
  const st = useAnimatedStyle(() => ({ opacity: listening ? 0.15 + v.value * 0.55 : 0, transform: [{ scale: 0.8 + v.value * 0.5 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: size / 3,
          shadowOffset: { width: 0, height: 0 },
        },
        st,
      ]}
    />
  );
}

/** What you'd plausibly ask on each screen. Three at most: suggestions, not a menu. */
const SUGGEST: Record<string, string[]> = {
  map: ['Where should I play first?', 'What’s my sleeper city?', 'Why is my top city on top?'],
  tour: ['Is this route any good?', 'Find me a place to stay on the first night', 'Which date is weakest?'],
  pulse: ['Who’s signing my posters?', 'Write to the rooms in my top city', 'What are people saying?'],
  posters: ['Where should my next poster go?', 'How do I get more signatures?'],
};
const suggestFor = (screen: string) => SUGGEST[screen] ?? SUGGEST.map;

/** The blur, the listening Gus, and the cards. Mount once, above the tabs. */
export function GusOverlay({ dockBottom }: { dockBottom: number }) {
  const minimized = useGus((s) => s.minimized);
  const insets = useSafeAreaInsets();
  const tabBar = Platform.OS === 'ios' ? insets.bottom + 50 : dockBottom - 8;
  const reduced = useReducedMotion();
  const phase = useGus((s) => s.phase);
  const holding = useGus((s) => s.holding);
  const answer = useGus((s) => s.answer);
  const error = useGus((s) => s.error);
  const mood = useGus((s) => s.mood);
  const speaking = useGus((s) => s.speaking);
  // A long, soft purr for as long as Gus is working, so the wait feels alive.
  useEffect(() => {
    if (phase !== 'thinking') return;
    haptic.think.start();
    return () => haptic.think.stop();
  }, [phase]);
  const focused = phase === 'listening' || (holding && (phase === 'thinking' || phase === 'answer'));
  const dialog = !holding && !minimized && (phase === 'card' || phase === 'thinking' || phase === 'answer');
  // The click that opens the dialog must not also land on its backdrop (it does on the web).
  const openedAt = useRef(0);
  useEffect(() => {
    if (dialog) openedAt.current = Date.now();
  }, [dialog]);

  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduced || !focused) return;
    breathe.value = withRepeat(withTiming(1.025, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      breathe.value = 1;
    };
  }, [focused, reduced, breathe]);
  const breatheSt = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));

  // Answers are review cards: they wait for you. Nothing he found disappears on a timer.

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {focused ? (
        <Animated.View entering={fadeIn(180)} exiting={fadeOut(240)} pointerEvents="none" style={StyleSheet.absoluteFill}>
          <BlurView intensity={Platform.OS === 'ios' ? 38 : 24} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 22, paddingBottom: 80 }}>
            <Animated.View style={[{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }, breatheSt]}>
              <Halo size={140} />
              <GusSticker mood={phase === 'thinking' ? 'thinking' : phase === 'answer' ? mood : 'reading'} size={180} />
            </Animated.View>
            {phase === 'listening' ? (
              <Animated.View entering={enterUp()} style={{ alignItems: 'center', gap: 14 }}>
                <T style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>Listening</T>
                <View style={{ gap: 6, alignItems: 'center' }}>
                  {suggestFor(gus.get().screen).map((s) => (
                    <T key={s} v="callout" color={C.text3} style={{ textAlign: 'center' }}>
                      “{s}”
                    </T>
                  ))}
                </View>
              </Animated.View>
            ) : phase === 'thinking' ? (
              <Animated.View entering={fadeIn()} style={{ alignItems: 'center', gap: 12 }}>
                <Orb size={32} color={C.text} />
                <T v="callout" color={C.text2}>
                  Let go anytime. I’ll keep working.
                </T>
              </Animated.View>
            ) : answer ? (
              <Roll text={answer.reply} by="word" align="center" style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 22, lineHeight: 28, color: C.text }} />
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {dialog ? (
        // A conversation you started gets the stage: the page dims, and tapping it lets him go.
        // The tab bar stays crisp and tappable: the stage stops at its top edge.
        <Animated.View entering={fadeIn(200)} exiting={fadeOut(180)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: tabBar }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Gus" onPress={() => Date.now() - openedAt.current > 400 && gus.dismiss()} style={StyleSheet.absoluteFill}>
            {/* Same frosted stage as hold-to-talk, so both ways of talking to him feel like one place. */}
            <BlurView intensity={Platform.OS === 'ios' ? 30 : 18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
          </Pressable>
        </Animated.View>
      ) : null}
      {dialog ? <GusDialog bottom={dockBottom} /> : null}
    </View>
  );
}

function CardBtn({ label, onPress, primary, icon }: { label: string; onPress: () => void; primary?: boolean; icon?: 'forward' | 'link' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: primary ? 1 : undefined, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View
        style={{
          minHeight: 44,
          borderRadius: 22,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: primary ? C.purple : 'rgba(255,255,255,0.1)',
        }}
      >
        <T numberOfLines={1} style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 16, color: C.text }}>
          {label}
        </T>
        {icon ? <Icon name={icon} size={16} color={C.text} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Gus's spotlight, drawn in the app's own texture: a halftone burst like the heat map's dots.
 * Fat amber dots at the centre shrink to purple specks at the edge, over a soft bloom. While he
 * works it breathes. SVG, so it's identical on iOS and the web.
 */
const HALFTONE = (() => {
  const D = 220,
    step = 11,
    out: { x: number; y: number; r: number; c: string; o: number }[] = [];
  for (let y = step / 2; y < D; y += step)
    for (let x = step / 2; x < D; x += step) {
      // Offset every other row, like print halftone.
      const xx = x + ((Math.round(y / step) % 2) * step) / 2;
      const d = Math.hypot(xx - D / 2, y - D / 2) / (D / 2);
      if (d >= 1) continue;
      const k = 1 - d;
      // A hint of texture, not a light show: fine dots, faint, warm only at the very centre.
      out.push({ x: xx, y, r: 0.5 + k * k * 1.9, c: d < 0.3 ? C.amber : C.purpleHi, o: 0.05 + k * k * 0.22 });
    }
  return { D, dots: out };
})();

function StageGlow({ working }: { working: boolean }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced || !working) {
      pulse.value = timing(0, 300);
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [working, reduced, pulse]);
  const st = useAnimatedStyle(() => ({ opacity: 0.75 + pulse.value * 0.25 }));
  const { D, dots } = HALFTONE;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: D, height: D, left: 62 - D / 2, top: 58 - D / 2 }, st]}>
      <Svg width={D} height={D}>
        <Defs>
          <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.purpleHi} stopOpacity={0.16} />
            <Stop offset="1" stopColor={C.purple} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={D / 2} cy={D / 2} r={D / 2} fill="url(#bloom)" />
        {dots.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** "Want me to write to the rooms there?" -> "Yes, write to them". Falls back to a plain yes. */
function yesLabel(line: string | null) {
  if (line && /write to the rooms|pitch/i.test(line)) return 'Yes, write to them';
  if (line && /open|show|take me/i.test(line)) return 'Yes, show me';
  return 'Yes, do it';
}

const QUIPS = ['Hmm. Let me look.', 'Checking the map…', 'Asking around…', 'Give me a sec, I’m on it.'];

/**
 * Talking to Gus: the same picture as onboarding. He hops down from the header, stands behind
 * the card and talks in a speech bubble. One card carries the whole exchange: ask, work, answer.
 * He reads while you type, scratches his head while he works, and reacts to what he found.
 */
function GusDialog({ bottom }: { bottom: number }) {
  const phase = useGus((s) => s.phase);
  const line = useGus((s) => s.line);
  const screen = useGus((s) => s.screen);
  const mood = useGus((s) => s.mood);
  const answer = useGus((s) => s.answer);
  const error = useGus((s) => s.error);
  const speaking = useGus((s) => s.speaking);
  const [text, setText] = useState('');
  const [quip] = useState(() => QUIPS[Math.floor(Math.random() * QUIPS.length)]);
  const kb = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      kb.value = withTiming(Math.max(0, e.endCoordinates.height - bottom + 8), { duration: e.duration || 250, easing: Easing.out(Easing.cubic) });
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
      kb.value = withTiming(0, { duration: e?.duration || 250, easing: Easing.out(Easing.cubic) });
    });
    return () => (show.remove(), hide.remove());
  }, [bottom, kb]);
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -kb.value }] }));

  const send = (q: string) => {
    if (!q.trim()) return;
    Keyboard.dismiss();
    setText('');
    haptic.tap();
    gus.ask(q.trim());
  };

  const said = phase === 'thinking' ? quip : phase === 'answer' ? (error ?? answer?.reply ?? '') : (line ?? 'What do you need?');
  const pose: GusMood = phase === 'thinking' ? 'thinking' : phase === 'answer' ? (error ? 'unimpressed' : mood) : text ? 'reading' : line ? mood : 'wave';
  const asks = phase === 'card' && !!line && /\?\s*$/.test(line);

  return (
    <Animated.View entering={enterSheet(40, 300)} exiting={exitSheet(30, 200)} style={{ position: 'absolute', left: 8, right: 8, bottom }}>
      {/* The keyboard lift lives on its own view so it never fights the enter/exit animation. */}
      <Animated.View style={[{ alignItems: 'center' }, lift]}>
        <View style={{ width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 18, marginBottom: -12, zIndex: 0 }}>
          <View>
            <StageGlow working={phase === 'thinking'} />
            <GusSticker mood={pose} size={124} />
          </View>
          <View style={{ flexShrink: 1, marginBottom: 26, backgroundColor: '#F7F4EE', borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 10, alignSelf: 'flex-end' }}>
            <Roll text={said} by="word" style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 16, lineHeight: 21, color: C.ink }} />
          </View>
        </View>
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            backgroundColor: '#16161A',
            borderRadius: 30,
            borderCurve: 'continuous',
            padding: S.lg,
            gap: S.md,
            zIndex: 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.lineHi,
          }}
        >
          {/* "Not now" already closes a question; the ✕ is for everything else. */}
          {!asks ? (
            <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={phase === 'thinking' ? 'Let him work in the background' : 'Close'}
                hitSlop={12}
                onPress={() => (haptic.tick(), gus.dismiss())}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={phase === 'thinking' ? 'chevronDown' : 'close'} size={14} color={C.text2} />
              </Pressable>
            </View>
          ) : null}

          {phase === 'thinking' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingRight: 36 }}>
              <Orb size={20} color={C.text} />
              <T v="callout" color={C.text2} style={{ flex: 1 }}>
                Close this if you like. I’ll keep working and come back with it.
              </T>
            </View>
          ) : phase === 'answer' ? (
            <>
              {answer?.heard ? (
                <T v="footnote" color={C.text3} numberOfLines={2} style={{ paddingRight: 36 }}>
                  {/* A tapped "Yes, do it" carries Gus's own question; show what you actually said. */}
                  You: {/^Yes\. /.test(answer.heard) ? 'Yes, do it' : answer.heard}
                </T>
              ) : null}
              <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
                {answer?.action ? <CardBtn primary label={answer.action.label} icon={answer.action.type === 'link' ? 'link' : 'forward'} onPress={() => gus.act(answer.action!)} /> : null}
                <CardBtn label={answer?.action ? 'Not now' : 'Thanks, Gus'} onPress={() => gus.dismiss()} />
                {answer ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={speaking ? 'Stop Gus' : 'Hear it again'}
                    hitSlop={10}
                    onPress={() => (speaking ? (stopVoice(), gus.set({ speaking: false })) : gus.speak(answer.reply, mood))}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: speaking ? C.purple : C.fill }}>
                      <Icon name={speaking ? 'stop' : 'volume'} size={18} color={C.text} />
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : (
            <>
              {/* He asked you something: answering him comes first, as two plain choices. */}
              {asks ? (
                <View style={{ flexDirection: 'row', gap: S.sm }}>
                  <CardBtn primary label={yesLabel(line)} onPress={() => send(`Yes. ${line}`)} />
                  <CardBtn label="Not now" onPress={() => (haptic.tick(), gus.dismiss())} />
                </View>
              ) : null}
              {!asks ? (
                <View style={{ paddingRight: 40 }}>
                  {suggestFor(screen)
                    .slice(0, 2)
                    .map((q, i) => (
                      <Pressable key={q} accessibilityRole="button" onPress={() => send(q)} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
                        <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: C.line }}>
                          <Icon name="forward" size={14} color={C.purpleHi} />
                          <T v="callout" style={{ flex: 1 }} numberOfLines={1}>
                            {q}
                          </T>
                        </View>
                      </Pressable>
                    ))}
                </View>
              ) : null}
              {/* One composer line: type, or hold the mic and talk, right here. */}
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineHi, marginHorizontal: -S.lg }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 40 }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={() => send(text)}
                  returnKeyType="send"
                  placeholder={asks ? 'Or tell him something else…' : 'Ask Gus anything…'}
                  placeholderTextColor={C.text3}
                  accessibilityLabel="Message Gus"
                  style={{ flex: 1, color: C.text, fontSize: 17, paddingVertical: 8, outlineStyle: 'none' } as object}
                />
                {text.trim() ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => send(text)} hitSlop={6}>
                    <Animated.View entering={fadeIn(140)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.purple }}>
                      <Icon name="send" variant="bold" size={16} color={C.text} />
                    </Animated.View>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Hold to talk to Gus"
                    hitSlop={6}
                    onPressIn={() => (gus.set({ holding: true }), gus.start())}
                    onPressOut={() => (gus.set({ holding: false }), gus.stop(true))}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.fill }}>
                      <Icon name="mic" variant="bold" size={16} color={C.text} />
                    </View>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
