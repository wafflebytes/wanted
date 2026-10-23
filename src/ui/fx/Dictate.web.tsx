/**
 * Dictation on the web (voice-glow): "I sound like..." spoken into the Scout input. The beam
 * reacts to the live mic level; the Web Speech API does the transcription where the browser
 * has it (Chrome, Safari). Elsewhere the mic button doesn't show.
 */
import { useEffect, useRef, useState } from 'react';
import { useMicrophone, VoiceBeam } from 'voice-glow';
import type { DictateProps } from './Dictate';

type Rec = { start(): void; stop(): void; abort(): void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function recognizer(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return R ? new R() : null;
}

export function Dictate({ children, onText, renderButton }: DictateProps) {
  const mic = useMicrophone();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<Rec | null>(null);
  useEffect(() => setSupported(!!recognizer() && mic.supported), [mic.supported]);

  const stop = () => {
    rec.current?.stop();
    mic.stop();
    setListening(false);
  };
  const start = async () => {
    const r = recognizer();
    if (!r) return;
    rec.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onText(text.trim());
    };
    r.onend = () => {
      mic.stop();
      setListening(false);
    };
    r.onerror = () => stop();
    await mic.start();
    r.start();
    setListening(true);
  };
  useEffect(() => () => stop(), []);

  const button = supported ? renderButton({ listening, toggle: () => (listening ? stop() : start()) }) : null;
  if (!listening) return <>{children(button)}</>;
  return (
    <VoiceBeam stream={mic.stream} type="default" theme="dark" colorVariant="sunset">
      <div style={{ borderRadius: 20 }}>{children(button)}</div>
    </VoiceBeam>
  );
}
