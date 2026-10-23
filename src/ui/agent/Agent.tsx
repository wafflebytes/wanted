/**
 * Talk to Gus: Wanted's voice agent. Tap Gus (he lives at the end of the tab bar), say what you
 * need ("brief me", "how's Columbus?", "roast my route", "pitch Columbus"), and he answers out
 * loud, shows the steps he took against the real data, then does it: opens the city, re-plans
 * the van, drafts the pitch. Typing works everywhere; on the web the mic listens hands-free
 * inside a voice-glow, and on iPhone the keyboard's dictation does.
 */
import { router } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { api } from '../api';
import { GusSticker, GusWorking, VoiceBars, type GusMood } from '../components/Gus';
import { Sheet, SheetButton } from '../components/Sheet';
import { T } from '../components/T';
import { useToast } from '../components/Toaster';
import { VoiceGlow } from '../fx/VoiceGlow';
import { haptic } from '../haptics';
import { invalidate } from '../hooks';
import { Icon } from '../icons/Icon';
import { session } from '../session';
import { C, F, R, S } from '../theme';
import { sayLine, stopVoice } from '../voice';
import { useListen } from './listen';

type Step = { tool: string; label: string; detail: string };
type Action =
  | { kind: 'open'; tab: 'map' | 'tour' | 'crowd' | 'posters' | 'inbox'; city?: string }
  | { kind: 'plan' }
  | { kind: 'pitch'; city: string; cityName: string }
  | { kind: 'post'; city: string; cityName: string }
  | { kind: 'withoutQloo'; on: boolean }
  | { kind: 'refresh' };
type Reply = { reply: string; mood: GusMood; steps: Step[]; actions: Action[]; suggestions: string[] };
type Turn = { id: number; who: 'you' | 'gus'; text: string; reply?: Reply; done?: string[] };

const Ctx = createContext<{ open: (say?: string) => void } | null>(null);

export function useAgent() {
  return useContext(Ctx) ?? { open: () => {} };
}

const STARTERS = ['Brief me', 'Where am I most wanted?', 'Roast my route', 'Who is my crowd?'];

const ACTION_LABEL = (a: Action): string | null => {
  switch (a.kind) {
    case 'open':
      return a.city ? 'Opened it on the map' : `Opened ${a.tab[0].toUpperCase()}${a.tab.slice(1)}`;
    case 'plan':
      return 'Re-routing the van';
    case 'pitch':
      return `Pitch for ${a.cityName}`;
    case 'post':
      return `Poster up in ${a.cityName}`;
    case 'withoutQloo':
      return a.on ? 'Qloo off' : 'Qloo back on';
    default:
      return null;
  }
};

export function AgentProvider({ slug, name, children }: { slug: string; name?: string; children: ReactNode }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [mood, setMood] = useState<GusMood>('wave');
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const seq = useRef(0);
  const input = useRef<TextInput>(null);

  const run = useCallback(
    async (actions: Action[]) => {
      let leave = false;
      for (const a of actions) {
        if (a.kind === 'open') {
          router.push(a.city ? `/a/${slug}${a.tab === 'map' ? '' : `/${a.tab}`}?city=${a.city}` : `/a/${slug}${a.tab === 'map' ? '' : `/${a.tab}`}`);
          leave = true;
        } else if (a.kind === 'plan') {
          router.push(`/a/${slug}/tour?do=plan&t=${Date.now()}`);
          leave = true;
        } else if (a.kind === 'pitch') {
          router.push(`/a/${slug}/tour?pitch=${a.city}&t=${Date.now()}`);
          leave = true;
        } else if (a.kind === 'post') {
          try {
            await api.post(`/artist/${slug}/posters`, { city: a.city });
            invalidate(`/artist/${slug}`);
            haptic.success();
            router.push(`/a/${slug}/posters?city=${a.city}`);
            leave = true;
          } catch (e) {
            toast({ title: "Gus couldn't post it", body: e instanceof Error ? e.message : undefined });
          }
        } else if (a.kind === 'withoutQloo') {
          session.setWithoutQloo(a.on);
        } else if (a.kind === 'refresh') {
          invalidate(`/artist/${slug}`);
        }
      }
      // Gus goes and does it: the sheet steps aside so you can see the result.
      if (leave) setTimeout(() => setOpen(false), 1400);
    },
    [slug, toast],
  );

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      haptic.tap();
      stopVoice();
      setSpeaking(false);
      setDraft('');
      const id = ++seq.current;
      setTurns((t) => [...t, { id, who: 'you', text: q }]);
      setBusy(true);
      setMood('thinking');
      try {
        const r = await api.post<Reply>(`/artist/${slug}/ask`, { text: q });
        setTurns((t) => [...t, { id: ++seq.current, who: 'gus', text: r.reply, reply: r, done: r.actions.map(ACTION_LABEL).filter((x): x is string => !!x) }]);
        setMood(r.mood);
        setSuggestions(r.suggestions);
        haptic.success();
        if (voiceOn) {
          setSpeaking(true);
          sayLine(r.reply, r.mood === 'reading' || r.mood === 'wave' ? 'idle' : (r.mood as never), () => setSpeaking(false)).catch(() => setSpeaking(false));
        }
        setTimeout(() => run(r.actions), 900);
      } catch (e) {
        setTurns((t) => [...t, { id: ++seq.current, who: 'gus', text: e instanceof Error ? e.message : 'Lost the signal. Say it again?' }]);
        setMood('unimpressed');
      } finally {
        setBusy(false);
      }
    },
    [busy, slug, voiceOn, run],
  );

  const listen = useListen({ onPartial: setDraft, onFinal: (t) => ask(t) });

  const openAgent = useCallback(
    (say?: string) => {
      haptic.thump();
      setOpen(true);
      if (say) setTimeout(() => ask(say), 250);
      else if (listen.supported) setTimeout(() => listen.start(), 350);
    },
    [ask, listen],
  );

  useEffect(() => {
    if (!open) {
      listen.stop();
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const value = useMemo(() => ({ open: openAgent }), [openAgent]);
  const state = listen.listening ? 'Listening…' : busy ? 'On it…' : speaking ? 'Talking' : 'Your tour manager';
  const level = useCallback(() => (speaking ? 0.32 + 0.28 * Math.abs(Math.sin(Date.now() / 170)) : 0), [speaking]);

  const mic = () => {
    if (listen.listening) return listen.stop();
    if (listen.supported) {
      stopVoice();
      setSpeaking(false);
      return listen.start();
    }
    input.current?.focus();
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          listen.stop();
        }}
        large
        scrollKey={`${turns.length}-${busy}`}
        label="Talk to Gus"
        leading={<GusSticker mood={listen.listening ? 'wave' : busy ? 'thinking' : mood} size={56} tilt={-4} style={{ marginVertical: -8 }} />}
        title={<T v="title" accessibilityRole="header">Gus</T>}
        subtitle={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20 }}>
            {listen.listening || speaking ? <VoiceBars active color={listen.listening ? C.amber : C.purpleHi} height={12} /> : null}
            <T v="subhead" color={listen.listening ? C.amber : speaking ? C.purpleHi : C.text2}>
              {state}
            </T>
          </View>
        }
        trailing={
          <SheetButton
            icon="volume"
            label={voiceOn ? 'Voice replies on. Turn off' : 'Voice replies off. Turn on'}
            tint={voiceOn ? 'rgba(155,48,224,0.35)' : undefined}
            onPress={() => {
              if (voiceOn) stopVoice();
              setVoiceOn((v) => !v);
            }}
          />
        }
        footer={
          <View style={{ gap: S.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -S.xl }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.xl }}>
              {suggestions.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => ask(s)} disabled={busy} style={({ pressed }) => ({ opacity: pressed || busy ? 0.6 : 1 })}>
                  <View style={{ height: 36, borderRadius: R.pill, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 15, color: C.text }}>{s}</T>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <VoiceGlow active={listen.listening || speaking} stream={listen.listening ? listen.stream : null} level={speaking ? level : undefined} radius={28}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 56, borderRadius: 28, paddingLeft: S.lg, paddingRight: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: listen.listening ? 'rgba(255,176,0,0.5)' : 'rgba(255,255,255,0.1)' }}>
                <TextInput
                  ref={input}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => ask(draft)}
                  placeholder={listen.listening ? 'Listening…' : 'Ask Gus anything'}
                  placeholderTextColor={C.text3}
                  returnKeyType="send"
                  accessibilityLabel="Ask Gus"
                  style={{ flex: 1, color: C.text, fontFamily: F.serif, fontSize: 20, minHeight: 44, outlineStyle: 'none' } as object}
                />
                {draft.trim() && !listen.listening ? (
                  <RoundButton label="Send to Gus" onPress={() => ask(draft)} bg={C.text}>
                    <Icon name="send" variant="bold" size={20} color="#000" />
                  </RoundButton>
                ) : (
                  <RoundButton label={listen.listening ? 'Stop listening' : Platform.OS === 'web' && listen.supported ? 'Talk to Gus' : 'Dictate to Gus'} onPress={mic} bg={listen.listening ? C.amber : C.purple}>
                    {listen.listening ? <VoiceBars active color="#1A120B" height={16} /> : <Icon name="mic" variant="bold" size={22} color={C.text} />}
                  </RoundButton>
                )}
              </View>
            </VoiceGlow>
          </View>
        }
      >
        <View style={{ gap: S.lg }}>
          {!turns.length ? <Hello name={name} /> : null}
          {turns.map((t) => (t.who === 'you' ? <YouBubble key={t.id} text={t.text} /> : <GusBubble key={t.id} t={t} />))}
          {busy ? <GusWorking label="Gus is on it" step="Checking the posters, the route and Qloo" style={{ alignSelf: 'flex-start' }} /> : null}
        </View>
      </Sheet>
    </Ctx.Provider>
  );
}

function RoundButton({ children, label, onPress, bg }: { children: ReactNode; label: string; onPress: () => void; bg: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>{children}</View>
    </Pressable>
  );
}

function Hello({ name }: { name?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: S.sm, gap: S.md }}>
      <GusSticker mood="standing" size={250} tilt={2} float />
      <T v="serifLarge" style={{ textAlign: 'center' }}>
        {name ? `What do you need, ${name.split(' ')[0]}?` : 'What do you need?'}
      </T>
      <T v="callout" color={C.text2} style={{ textAlign: 'center', maxWidth: 300 }}>
        Talk to me like your tour manager. I check the posters, the route and Qloo, then I do it.
      </T>
    </View>
  );
}

function YouBubble({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: C.purple, borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: S.lg, paddingVertical: S.md }}>
      <T v="body">{text}</T>
    </View>
  );
}

function GusBubble({ t }: { t: Turn }) {
  const r = t.reply;
  return (
    <View style={{ gap: S.sm, maxWidth: '94%' }}>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22, borderBottomLeftRadius: 6, paddingHorizontal: S.lg, paddingVertical: S.md }}>
        <T v="gus">{t.text}</T>
      </View>
      {r?.steps.length ? (
        <View style={{ gap: 2, paddingLeft: S.xs }} accessibilityLabel={`What Gus checked: ${r.steps.map((s) => `${s.label}, ${s.detail}`).join('. ')}`}>
          {r.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', paddingVertical: 3 }}>
              <View style={{ marginTop: 2 }}>
                <Icon name="check" variant="bold" size={15} color={C.good} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.head, fontSize: 14, lineHeight: 18, color: C.text }}>{s.label}</T>
                <T v="monoSmall" color={C.text3}>
                  {s.detail}
                </T>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {t.done?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {t.done.map((d) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: R.pill, backgroundColor: 'rgba(155,48,224,0.22)' }}>
              <Icon name="flash" variant="bold" size={13} color={C.purpleHi} />
              <T style={{ fontFamily: F.rounded ?? F.bodyMed, fontWeight: '600', fontSize: 13, color: C.purpleHi }}>{d}</T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Gus at the end of the tab bar: his die-cut sticker standing on the bar, a purple mic badge on
 * his chest. Tapping him starts a conversation (and listening, where the browser can).
 */
export function GusButton({ size = 64 }: { size?: number }) {
  const { open } = useAgent();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Talk to Gus"
      accessibilityHint="Ask your tour manager anything, out loud or typed"
      onPress={() => open()}
      hitSlop={6}
      style={({ pressed }) => ({ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View style={{ position: 'absolute', bottom: 0, width: size, height: size, borderRadius: size / 2, experimental_backgroundImage: `linear-gradient(160deg, ${C.purpleHi}, ${C.purple} 55%, #5B1590)`, backgroundColor: C.purple, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' } as object} />
      <GusSticker mood="wave" size={size * 0.98} tilt={-6} style={{ marginBottom: size * 0.16 }} />
      <View style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#111' }}>
        <Icon name="mic" variant="bold" size={13} color="#1A120B" />
      </View>
    </Pressable>
  );
}
