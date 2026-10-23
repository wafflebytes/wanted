/**
 * Listening for Gus on the web: the Web Speech API transcribes (Chrome, Safari) and
 * voice-glow's microphone hook hands the live stream to the glow, so it moves with your voice.
 * A pause ends the turn: the final transcript goes to Gus hands-free.
 */
import { useEffect, useRef, useState } from 'react';
import { useMicrophone } from 'voice-glow';
import type { Listen } from './listen';

type Rec = { start(): void; stop(): void; abort(): void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function recognizer(): Rec | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return R ? new R() : null;
}

export function useListen({ onPartial, onFinal }: { onPartial: (t: string) => void; onFinal: (t: string) => void }): Listen {
  const mic = useMicrophone();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<Rec | null>(null);
  const cb = useRef({ onPartial, onFinal });
  cb.current = { onPartial, onFinal };
  useEffect(() => setSupported(!!recognizer() && mic.supported), [mic.supported]);

  const stop = () => {
    rec.current?.stop();
    mic.stop();
    setListening(false);
  };
  const start = async () => {
    const r = recognizer();
    if (!r) return;
    rec.current?.abort();
    rec.current = r;
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    let text = '';
    let sent = false;
    r.onresult = (e) => {
      text = '';
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        final = e.results[i].isFinal;
      }
      cb.current.onPartial(text.trim());
      if (final && !sent) {
        sent = true;
        cb.current.onFinal(text.trim());
      }
    };
    r.onend = () => {
      mic.stop();
      setListening(false);
      if (!sent && text.trim()) {
        sent = true;
        cb.current.onFinal(text.trim());
      }
    };
    r.onerror = () => stop();
    await mic.start().catch(() => null);
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  useEffect(() => () => rec.current?.abort(), []);
  return { supported, listening, stream: mic.stream, start, stop };
}
