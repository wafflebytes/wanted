'use client';
/**
 * The story's stage (lib/story.ts holds the script). A small caption says what you're looking
 * at and why it matters; the app underneath stays sharp and live. Touch anything and the story
 * pauses so you have the controls; Resume picks up where it left off.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { gus } from '@web/lib/gus';
import { BEATS, story, useStory, type Ctx } from '@web/lib/story';
import { guide } from '@web/lib/guide';
import { haptic } from '@web/lib/haptics';
import { Gus } from './Gus';
import { Icon } from './Icon';
import '../app/story.css';

const STOP = Symbol('stop');
const FINAL_ASKS = ['Who should open for me in Columbus?', 'Don’t call me after 10pm', 'Which venues in Burlington fit me?'];

export function Story({ slug }: { slug: string }) {
  const s = useStory();
  const router = useRouter();
  const run = useRef(0);

  useEffect(() => {
    const u = new URL(location.href);
    if (!u.searchParams.has('story')) return;
    // ?story=1 starts at the top; ?story=11 starts at the eleventh beat.
    const at = Math.max(1, parseInt(u.searchParams.get('story') ?? '1', 10) || 1);
    u.searchParams.delete('story');
    history.replaceState(null, '', u);
    guide.end();
    story.start();
    if (at > 1) story.go(at - 1);
  }, []);

  useEffect(() => {
    if (!s.on || s.done) return;
    const id = ++run.current;
    const alive = () => run.current === id;
    const sleep = async (ms: number) => {
      let left = ms;
      while (left > 0) {
        if (!alive()) throw STOP;
        const step = Math.min(100, left);
        await new Promise((r) => setTimeout(r, step));
        if (!story.get().paused) left -= step;
      }
      if (!alive()) throw STOP;
    };
    const until = async (ok: () => boolean, max: number) => {
      for (let t = 0; t < max; t += 100) {
        if (!alive()) throw STOP;
        if (ok() && !story.get().paused) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    const ctx: Ctx = {
      sleep,
      go: async (path) => {
        const to = `/a/${slug}${path}`;
        if (location.pathname + location.search !== to) router.push(to);
        await sleep(900);
      },
      ask: async (text, dwell = 3500) => {
        await until(() => !story.get().paused, 60_000);
        await gus.dictate(text, alive);
        if (!alive()) throw STOP;
        await until(() => gus.get().phase === 'answer', 50_000);
        await until(() => !gus.get().speaking, 9000);
        await sleep(dwell);
      },
      tap: async (selector) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const dot = document.createElement('i');
        dot.className = 'story-tap';
        dot.style.left = `${r.left + r.width / 2}px`;
        dot.style.top = `${r.top + r.height / 2}px`;
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 900);
        await sleep(380);
        haptic('tap');
        el.click();
        return true;
      },
    };
    BEATS[s.i]
      .run(ctx)
      .then(() => alive() && story.next())
      .catch((e) => e !== STOP && console.error(e));
    return () => {
      run.current++;
    };
  }, [s.on, s.i, s.done, slug, router]);

  // The voice card and the city drawer leave room for the caption while the story runs.
  useEffect(() => {
    const el = document.documentElement;
    if (s.on && !s.done) el.dataset.story = '1';
    else delete el.dataset.story;
    return () => void delete el.dataset.story;
  }, [s.on, s.done]);

  // Touching the app yourself hands you the controls.
  useEffect(() => {
    if (!s.on || s.done) return;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('.story')) return;
      story.pause(true);
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [s.on, s.done]);

  useEffect(() => {
    if (!s.on) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (gus.close(), story.end());
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [s.on]);

  if (!s.on) return null;
  const leave = () => {
    gus.close();
    story.end();
  };

  if (s.done)
    return (
      <div className="story story-end" role="dialog" aria-label="That was Wanted">
        <div className="se-card">
          <Gus mood="proud" size={84} className="se-gus" sticker={false} />
          <h2>That was Maya’s tour manager.</h2>
          <p>He runs on Qloo’s taste graph, works while the app is closed, and never moves money without your slide.</p>
          <dl className="se-facts">
            <div>
              <dt>82%</dt>
              <dd>of independent artists say they can’t afford to tour</dd>
            </div>
            <div>
              <dt>64%</dt>
              <dd>of independent US venues lost money in 2024</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>places Gus can name that Qloo didn’t return</dd>
            </div>
          </dl>
          <div className="se-try">
            <span>Now you ask him</span>
            {FINAL_ASKS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  story.end();
                  gus.open('voice');
                  gus.ask(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="se-keys">
            <button className="btn hot block" onClick={leave}>
              Explore the app
            </button>
            <button className="se-again" onClick={() => story.start()}>
              Watch again
            </button>
          </div>
          <small>Also works inside Claude and ChatGPT as a connector. Venues and payments are stand-ins in this demo.</small>
        </div>
      </div>
    );

  const b = BEATS[s.i];
  return (
    <div className={`story is-${b.pos ?? 'top'} ${s.paused ? 'is-paused' : ''}`} role="status" aria-live="polite">
      <div className="story-bar">
        <i style={{ width: `${((s.i + 1) / BEATS.length) * 100}%` }} />
      </div>
      <div className="story-head">
        <span className="story-ch">{b.chapter}</span>
        <div className="story-keys">
          <button onClick={() => (gus.close(), story.back())} disabled={s.i === 0} aria-label="Back">
            <Icon name="back" size={16} />
          </button>
          <button className="story-play" onClick={() => story.pause()} aria-label={s.paused ? 'Resume' : 'Pause'}>
            <i className={s.paused ? 'is-play' : 'is-pause'} />
          </button>
          <button onClick={() => (gus.close(), story.next())} aria-label="Next">
            <Icon name="forward" size={16} />
          </button>
          <button onClick={leave} aria-label="Close the story">
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
      <div className="story-txt" key={b.id}>
        <h3>{b.title}</h3>
        <p>{s.paused ? 'Paused. The app is yours. Press play to go on.' : b.body}</p>
      </div>
    </div>
  );
}
