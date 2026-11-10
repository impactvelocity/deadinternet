'use client';
/**
 * "How it's made": a drawer from the right that says what is interesting
 * about the film besides its story. It is a web page, not a video: scroll is
 * the playhead, and one feed restyles itself into each era of the internet.
 *
 * It draws a timeline of the eras, the same post in each one's real tokens,
 * lit up by the drawer's own scroll; each era can start the film from there.
 * The film holds still behind it while it's open. Esc, the close
 * button or a click outside closes it.
 */
import { useEffect, useRef } from 'react';
import { viewerFor } from '@/data/flow/posts';
import { FILM_ERAS } from '@/data/flow/scenes';
import type { FlowEra } from '@/data/flow/types';
import { Icon } from './icons';
import { Avatar, eraStyle } from './parts';

const REPO = 'https://github.com/impactvelocity/deadinternet';

/** A stack of layers: what's behind the picture. */
export function LayersIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

/** The first named typeface in a font stack; system stacks are just "the system font". */
function fontName(stack: string) {
  const named = stack.split(',').map((f) => f.trim().replaceAll(/["']/g, '')).find((f) => !/^(-|ui-|system-ui|BlinkMacSystemFont)/.test(f));
  return named && !/^(sans-serif|serif|monospace)$/.test(named) ? named : 'the system font';
}

/** What the era's post says, so the words age with the look. */
const DEMO_LINES: Partial<Record<FlowEra['id'], string>> = {
  profile: 'thx for the add!! new layout, what do u think?? <3',
  wall: 'is procrastinating on her essay again.',
  cards: 'Welcome to the world, little one ❤️',
  viral: 'You won’t BELIEVE what happened next…',
  algorithm: 'Suggested for you · because you reacted',
  stories: 'golden hour ✨ #blessed #ad',
  reels: 'wait for it… 🔥 (sound on)',
  slop: 'Why don’t pictures like this ever trend? 🙏',
  pro: 'I was rejected 47 times. Here’s what it taught me about B2B sales.',
  machine: '{ "template": "post", "author": null }',
  dead: 'I made $4,000 this week from my phone. Ask me how.',
};

const PLAY_PATH = 'M8.5 6.3v11.4c0 .9 1 1.5 1.8 1l9-5.7c.7-.4.7-1.5 0-1.9l-9-5.7c-.8-.5-1.8.1-1.8.9z';

/**
 * The eras as a timeline: each year, a line, and the same post drawn with
 * that era's tokens. The markup is identical in every row; only the CSS
 * variables on it differ (`eraStyle`). The cards keep each era's shape,
 * type and accent but sit in the drawer's dark (`.fl-made-post`).
 *
 * It is driven the way the film is: the drawer's scroll position decides
 * which eras have happened (`data-state`: past, now, next) and how far the
 * spine has filled, written straight to the DOM each frame, so scrolling
 * back un-lights them. Each row can also start the film from its era.
 */
function EraTimeline({ onPlayFrom }: { onPlayFrom: (era: number) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = ref.current;
    const scroller = list?.closest<HTMLElement>('.fl-made-scroll');
    if (!list || !scroller) return;
    const rows = [...list.children] as HTMLElement[];
    let raf = 0;
    const draw = () => {
      raf = 0;
      const view = scroller.getBoundingClientRect();
      // The playhead: a line a little below the middle of the drawer.
      const line = view.top + view.height * 0.62;
      const top = list.getBoundingClientRect().top;
      const centres = rows.map((row) => {
        const r = row.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      // 2005 is always lit: the film opens there.
      let now = 0;
      centres.forEach((c, k) => {
        if (c <= line) now = k;
      });
      rows.forEach((row, k) => {
        row.dataset.state = k < now ? 'past' : k === now ? 'now' : 'next';
      });
      const first = centres[0] - top;
      const run = centres[centres.length - 1] - centres[0];
      list.style.setProperty('--spine-top', `${first.toFixed(1)}px`);
      list.style.setProperty('--spine-h', `${run.toFixed(1)}px`);
      list.style.setProperty('--spine-fill', `${Math.min(run, Math.max(0, line - top - first)).toFixed(1)}px`);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    draw();
    scroller.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, []);
  return (
    <ol ref={ref} className="fl-made-timeline" aria-label="One post in each era's look">
      {FILM_ERAS.map((era, k) => {
        const t = era.tokens;
        const again = k > 0 && FILM_ERAS[k - 1].year === era.year;
        return (
          <li key={era.id} style={eraStyle(t)}>
            <div className="fl-made-when">
              <span className="fl-made-year">{again ? 'now' : era.year}</span>
              <span className="fl-made-era">{era.label}</span>
              <button type="button" className="fl-made-play" onClick={() => onPlayFrom(k)} aria-label={`Play the film from ${era.year} · ${era.label}`}>
                <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d={PLAY_PATH} />
                </svg>
                Play
              </button>
            </div>
            <span className="fl-made-rule" aria-hidden="true" />
            <div className="fl-made-demo">
              <article className="fl-made-post">
                <header>
                  <Avatar author={viewerFor(era.year)} size={t.avatar} shape={t.avatarShape} />
                  <div>
                    <div className="fl-made-post-name">Ashley</div>
                    <div className="fl-made-post-meta">{fontName(t.font)} · {t.size}px · radius {t.radius}px</div>
                  </div>
                </header>
                <p>{DEMO_LINES[era.id] ?? era.beat}</p>
                <footer>
                  <span>Like</span>
                  <span>Comment</span>
                </footer>
              </article>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Sections ease in as they scroll into the drawer (not where motion is reduced, or without the API). */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver !== 'function') return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parts = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.reveal = 'in';
          io.unobserve(e.target);
        }
      },
      { root: root.closest('.fl-made-scroll'), rootMargin: '0px 0px -8% 0px' },
    );
    for (const part of parts) {
      part.dataset.reveal = 'wait';
      io.observe(part);
    }
    return () => io.disconnect();
  }, []);
  return ref;
}

function Body({ onPlayFrom }: { onPlayFrom: (era: number) => void }) {
  const ref = useReveal();
  const years = FILM_ERAS[FILM_ERAS.length - 1].year - FILM_ERAS[0].year;
  const stats = [
    ['1', 'web page'],
    [String(FILM_ERAS.length), 'eras'],
    [String(years), 'years'],
    ['100+', 'AI photos'],
  ];
  return (
    <div ref={ref}>
      <header className="fl-made-hero">
        <p className="fl-made-eyebrow">Behind the film</p>
        <h2 id="fl-made-title">How it’s made</h2>
        <p className="fl-made-lede">Dead Internet isn’t a video. It’s a web page, and scrolling plays it.</p>
        <dl className="fl-made-stats">
          {stats.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Always in view when the drawer opens, so it never waits to be revealed. */}
      <section>
        <h3>Scrolling plays the film</h3>
        <p>
          The page is as tall as the film is long. How far you’ve scrolled decides what’s on screen, so scrolling back rewinds it. Pressing play just
          scrolls for you.
        </p>
      </section>

      <section data-reveal="">
        <h3>One feed, {FILM_ERAS.length} internets</h3>
        <p>
          There are no cuts. It’s one feed the whole way through, and each era only changes its styling: the font, the colours, the corners, the shape
          of the photos. Here’s the same post in every era.
        </p>
        <p className="fl-made-hint">Keep scrolling. This timeline runs on your scroll, the same way the film does.</p>
        <EraTimeline onPlayFrom={onPlayFrom} />
      </section>

      <section data-reveal="">
        <h3>The cursor writes its own script</h3>
        <p>
          The cursor that likes and comments isn’t a recording. The page measures where each button is, then works out the moves: scroll here, click
          this, type that.
        </p>
      </section>

      <section data-reveal="">
        <h3>Built with React</h3>
        <p>React builds each era’s feed. After that, one small loop moves everything in step with your scroll, so it stays smooth.</p>
      </section>

      <section data-reveal="">
        <h3>The ending is the same page</h3>
        <p>
          At the end the page zooms out. The browser shrinks into one AI session, then a wall of them. When they get too small to see, each one
          becomes a dot of light.
        </p>
      </section>

      <section data-reveal="">
        <h3>Voice, photos and video</h3>
        <p>
          Ashley’s voice is AI, made with ElevenLabs, and each era lasts as long as her line. The photos are AI too, over 100 of them, shrunk and
          roughed up for the early years so they look their age.
        </p>
        <p>The video version is this same page, captured one frame at a time.</p>
      </section>

      <footer className="fl-made-foot" data-reveal="">
        <p className="fl-made-links">
          <a href={REPO} target="_blank" rel="noopener noreferrer">Read the code on GitHub</a>
          <a href={`${REPO}#how-i-made-it`} target="_blank" rel="noopener noreferrer">The full write-up</a>
        </p>
        <p className="fl-made-stack">Next.js · React · TypeScript · Tailwind CSS · planned and built in Kiro</p>
      </footer>
    </div>
  );
}

export function HowItsMade({ open, onClose, onPlayFrom }: {
  open: boolean;
  onClose: () => void;
  /** Close the drawer and play the film from this era (index into the film's eras). */
  onPlayFrom: (era: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="fl-made"
      aria-labelledby="fl-made-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fl-made-panel">
        <button type="button" className="fl-made-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
        {/* Mounted only while open. */}
        <div className="fl-made-scroll">{open && <Body onPlayFrom={onPlayFrom} />}</div>
      </div>
    </dialog>
  );
}
