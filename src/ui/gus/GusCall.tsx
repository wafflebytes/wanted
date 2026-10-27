/**
 * Gus calls (rung 4 of the escalation ladder, PRD 9.3e). The app checks in with the server
 * every so often; when a paid hold is about to run out and the mandate allows a call, Gus rings:
 * a full-screen incoming call, the way a phone does it. Pick up and he says it out loud, with
 * captions; the call ends in the same yes or no as the review card in Fan Mail, so declining or
 * missing it loses nothing. One component for iPhone and the web.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Deal, GusCall } from '@/lib/types';
import { api } from '../api';
import { GusSticker } from '../components/Gus';
import { T } from '../components/T';
import { Roll } from '../fx/Roll';
import { haptic } from '../haptics';
import { invalidate, useReducedMotion } from '../hooks';
import { Icon } from '../icons/Icon';
import { fadeIn, fadeOut } from '../motion';
import { C, F, S } from '../theme';
import { sayLine, stopVoice } from '../voice';
import { VoiceSessionGate } from '@/lib/voice-session';

const CHECK_MS = 12_000;

// Anything that knows a call is coming (the demo) can ask the overlay to check right away.
const pokes = new Set<() => void>();
export function checkForCall() {
  pokes.forEach((f) => f());
}

const spoken = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

type Phase = 'ringing' | 'talking' | 'asking' | 'paying' | 'done';

export function GusCallOverlay({ slug }: { slug: string }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [call, setCall] = useState<GusCall | null>(null);
  const [phase, setPhase] = useState<Phase>('ringing');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionGate = useRef(new VoiceSessionGate());
  const session = useRef<ReturnType<VoiceSessionGate["begin"]> | null>(null);
  const handled = useRef(new Set<string>());

  // Check in: the server climbs the ladder and hands back a ringing call, if any.
  useEffect(() => {
    if (!slug) return;
    sessionGate.current.cancel(); stopVoice(); setCall(null);
    let alive = true;
    const check = async () => {
      try {
        const r = await api.get<{ call: GusCall | null }>(`/artist/${slug}/call?hour=${new Date().getHours()}`);
        if (alive && !session.current?.active() && r.call && r.call.status === 'ringing' && !handled.current.has(r.call.id)) {
          session.current = sessionGate.current.begin();
          setCall(r.call);
          setPhase('ringing');
          setResult(null);
          setError(null);
        }
      } catch {}
    };
    check();
    pokes.add(check);
    const t = setInterval(check, CHECK_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      alive = false; sessionGate.current.cancel(); stopVoice();
      pokes.delete(check);
      clearInterval(t);
      sub.remove();
    };
  }, [slug]);

  // The ring: a heavy tap, a pause, again, for as long as it rings.
  useEffect(() => {
    if (!call || phase !== 'ringing') return;
    haptic.thump();
    const t = setInterval(() => haptic.thump(), 1400);
    return () => clearInterval(t);
  }, [call, phase]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = reduced ? 0.5 : withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [reduced, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.35 }], opacity: 0.5 * (1 - pulse.value) }));

  if (!call) return null;

  const close = () => {
    sessionGate.current.cancel();
    stopVoice();
    handled.current.add(call.id);
    setCall(null);
  };
  const post = (action: 'pickup' | 'decline' | 'yes' | 'no') => api.post<{ call: GusCall; deal: Deal | null }>(`/artist/${slug}/call`, { call: call.id, action });

  const pickup = async () => {
    const active = session.current;
    haptic.tap(); setPhase('talking');
    let current: GusCall;
    try {
      const response = await post('pickup');
      if (!active?.active()) return;
      current = response.call;
      if (current.status !== 'answered') throw new Error('This call is no longer active. Review the current offer in Fan Mail.');
      setCall(current);
    } catch (e) {
      if (active?.active()) { setError(e instanceof Error ? e.message : 'The call could not be opened.'); setPhase('ringing'); }
      return; // A rejected pickup is not a captions-based permission to decide.
    }
    try {
      await sayLine(current.script, 'idle', () => { if (active?.active()) setPhase(p => p === 'talking' ? 'asking' : p); }, {artist:slug,call:current.id});
    } catch {
      if (active?.active()) setPhase('asking'); // Actual TTS failure may use exact server captions.
    }
  };
  const decline = async () => {
    const active = session.current; haptic.tick();
    try { await post('decline'); if (active?.active()) close(); }
    catch (e) { if (active?.active()) setError(e instanceof Error ? e.message : 'Call decision is unresolved. Review its receipt.'); }
  };
  const answer = async (yes: boolean) => {
    const active = session.current;
    stopVoice();
    setPhase('paying');
    try {
      const r = await post(yes ? 'yes' : 'no');
      invalidate(`/artist/${slug}`);
      if (!active?.active()) return;
      if (yes) haptic.success();
      const d = r.deal;
      setResult(yes && d?.status === 'held' ? `Recorded a simulated hold${d.terms ? ` on ${spoken(d.terms.date)}` : ''}. Test deposit: ${d.payment?.amount ?? d.terms?.deposit}. No real venue agreement or settlement.` :'Recorded that you passed on this simulated offer. Nothing was sent.');
      setPhase('done');
      setTimeout(() => { if (active?.active()) close(); }, 3200);
    } catch (e) {
      if (!active?.active()) return;
      setError(e instanceof Error ? e.message : 'That didn’t go through.');
      setPhase('asking');
    }
  };

  const status = phase === 'ringing' ? 'calling…' : phase === 'done' ? 'call ended' : 'on the line';
  return (
    <Animated.View
      entering={fadeIn(220)}
      exiting={fadeOut(200)}
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: '#07070A', paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.xxl, paddingHorizontal: S.gutter, alignItems: 'center', justifyContent: 'space-between' }]}
    >
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T v="title" accessibilityRole="header">
          Gus
        </T>
        <T v="callout" color={C.text2}>
          {status}
        </T>
        <T v="caption">Your tour manager, from Wanted</T>
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'center', width: 240, height: 240 }}>
        {phase === 'ringing' ? <Animated.View style={[{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: C.purple }, ring]} /> : null}
        <GusSticker mood={phase === 'done' ? 'proud' : phase === 'ringing' ? 'wave' : 'idle'} size={200} />
      </View>

      <View style={{ width: '100%', maxWidth: 440, minHeight: 120, justifyContent: 'center' }}>
        {phase === 'ringing' ? null : (
          <Roll
            text={phase === 'done' ? (result ?? '') : call.script}
            by="word"
            align="center"
            style={{ fontFamily: F.rounded, fontWeight: '600', fontSize: 19, lineHeight: 26, color: C.text }}
          />
        )}
        {error ? (
          <T v="footnote" color={C.bad} style={{ textAlign: 'center', marginTop: S.sm }}>
            {error}
          </T>
        ) : null}
      </View>

      {phase === 'ringing' ? (
        <View style={{ flexDirection: 'row', width: '100%', maxWidth: 360, justifyContent: 'space-between' }}>
          <RoundBtn label="Decline" color={C.bad} icon="close" onPress={decline} />
          <RoundBtn label="Accept" color={C.good} icon="volume" onPress={pickup} />
        </View>
      ) : phase === 'talking' || phase === 'asking' || phase === 'paying' ? (
        <View style={{ width: '100%', maxWidth: 440, gap: S.sm }}>
          <Choice primary label={phase === 'paying' ? 'Paying…' : 'Yes, record test deposit'} onPress={() => answer(true)} disabled={phase === 'paying' || phase === 'talking'} />
          <Choice label="No, pass" onPress={() => answer(false)} disabled={phase === 'paying'} />
          <Pressable accessibilityRole="button" onPress={decline} hitSlop={8} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
            <T v="footnote" color={C.text3}>
              Hang up. It stays in Fan Mail.
            </T>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: 120 }} />
      )}
    </Animated.View>
  );
}

function RoundBtn({ label, color, icon, onPress }: { label: string; color: string; icon: 'close' | 'volume'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ alignItems: 'center', gap: 8, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} variant="bold" size={30} color="#fff" />
      </View>
      <T v="footnote" color={C.text}>
        {label}
      </T>
    </Pressable>
  );
}

function Choice({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.6 : pressed ? 0.8 : 1 })}>
      <View style={{ minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? C.good : C.fill }}>
        <T style={{ fontFamily: F.rounded, fontWeight: '700', fontSize: 18, color: primary ? '#06210F' : C.text }}>{label}</T>
      </View>
    </Pressable>
  );
}
