'use client';
/**
 * One small vocabulary of touch feedback, played the best way each device allows:
 *
 * - Android (Chrome, Firefox, Samsung): `navigator.vibrate` patterns.
 * - iPhone (Safari 18+, and every iOS browser, since they're all WebKit): there's no vibrate,
 *   but toggling a native `<input type="checkbox" switch>` fires the system's own selection
 *   haptic. One toggle per tick; a pattern is a few toggles spaced out. It only fires inside a
 *   user gesture, which is when feedback belongs anyway.
 * - Mac and other desktops: the browser can't reach the trackpad's Taptic Engine. The press
 *   motion already lives in CSS (:active scales); when the person turns on "Sound ticks" in
 *   Settings, a quiet 4 ms click plays instead, the way a keyboard click stands in for touch.
 *
 * Named by meaning, not by strength, so screens say what happened and this file decides how
 * it feels: `haptic('commit')`, not `vibrate(30)`.
 */
export type Haptic =
  | 'tick' //     a detent: a slider step, a segment, a pager snap
  | 'tap' //      a light press: opening a sheet, a key
  | 'hold' //     the Gus button caught your hold; the mic is open
  | 'heard' //    Gus stopped listening and took your words
  | 'step' //     one lookup finished while Gus works (kept very light)
  | 'answer' //   Gus has an answer
  | 'commit' //   you agreed to something real: a poster up, a deposit, a sign
  | 'success' //  it worked: signed, held, booked
  | 'warn' //     Gus needs you
  | 'error'; //   it didn't work

// Android patterns in ms (vibrate, pause, vibrate…).
const PATTERN: Record<Haptic, number[]> = {
  tick: [6],
  tap: [10],
  hold: [18],
  heard: [8, 40, 8],
  step: [4],
  answer: [12, 60, 18],
  commit: [28],
  success: [14, 70, 28],
  warn: [20, 90, 20],
  error: [30, 60, 30, 60, 30],
};
// iOS: how many system ticks, and the gap between them.
const TICKS: Record<Haptic, [number, number]> = {
  tick: [1, 0],
  tap: [1, 0],
  hold: [1, 0],
  heard: [2, 70],
  step: [1, 0],
  answer: [2, 90],
  commit: [1, 0],
  success: [2, 110],
  warn: [2, 140],
  error: [3, 90],
};

type Mode = 'vibrate' | 'switch' | 'sound' | 'none';
let mode: Mode | null = null;
let enabled = true;
let sound = false;
let label: HTMLLabelElement | null = null;
let audio: AudioContext | null = null;

function detect(): Mode {
  if (typeof window === 'undefined') return 'none';
  if (typeof navigator.vibrate === 'function' && /android/i.test(navigator.userAgent)) return 'vibrate';
  const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return 'switch';
  return 'sound';
}

function switchTick() {
  if (!label) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'wanted-haptic';
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    label = document.createElement('label');
    label.htmlFor = input.id;
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9px;top:-9px';
    label.appendChild(input);
    document.body.appendChild(label);
  }
  label.click();
}

function click(strength: number) {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = 1800 - strength * 600;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.03 + strength * 0.03, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + strength * 0.006);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  } catch {}
}

export function haptic(kind: Haptic) {
  if (!enabled) return;
  mode ??= detect();
  if (mode === 'vibrate') {
    navigator.vibrate(PATTERN[kind]);
  } else if (mode === 'switch') {
    const [n, gap] = TICKS[kind];
    switchTick();
    for (let i = 1; i < n; i++) setTimeout(switchTick, gap * i);
  } else if (mode === 'sound' && sound) {
    const [n, gap] = TICKS[kind];
    const strength = kind === 'commit' || kind === 'error' ? 1 : kind === 'step' || kind === 'tick' ? 0 : 0.5;
    click(strength);
    for (let i = 1; i < n; i++) setTimeout(() => click(strength), gap * i);
  }
}

/** What this device can do, for the Settings row ("Haptics" on phones, "Sound ticks" on a Mac). */
export function hapticKind(): Mode {
  mode ??= detect();
  return mode;
}

export function setHaptics(opts: { enabled?: boolean; sound?: boolean }) {
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.sound !== undefined) sound = opts.sound;
  try {
    localStorage.setItem('wanted-haptics', JSON.stringify({ enabled, sound }));
  } catch {}
}

if (typeof window !== 'undefined') {
  try {
    const saved = JSON.parse(localStorage.getItem('wanted-haptics') ?? 'null') as { enabled?: boolean; sound?: boolean } | null;
    if (saved) (enabled = saved.enabled ?? true), (sound = saved.sound ?? false);
  } catch {}
}
