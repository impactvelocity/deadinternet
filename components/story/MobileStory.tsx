/**
 * The phone page. The scrolling film needs a wide screen and a scroll bar,
 * so on a phone it becomes two things instead: the film as a video, and
 * under it the story to scroll through and read, one era at a time: the
 * year, a still of the feed, and Ashley's own words (the narration,
 * data/flow/narration.json) over her picture from that year.
 *
 * Like the film, the page gets darker the further you scroll: each era sits
 * on its own backdrop colour, drained a little more toward black, and the
 * text turns light once it has passed mid-grey.
 *
 * Rendered by the server for everyone and shown by CSS on phones only
 * (story.css, PHONE_QUERY); FilmGate keeps the film itself off them.
 */
import './story.css';
import type { CSSProperties } from 'react';
import { Avatar } from '@/components/flow/parts';
import narration from '@/data/flow/narration.json';
import { viewerFor } from '@/data/flow/posts';
import { FILM_ERAS } from '@/data/flow/scenes';
import type { FlowEraId } from '@/data/flow/types';
import { StoryVideo } from './StoryParts';

const REPO = 'https://github.com/impactvelocity/deadinternet';
const NIGHT = '#050507';

/** A still of each era's feed (public/assets/story). */
const SHOTS: Partial<Record<FlowEraId, string>> = {
  profile: '2005-profile',
  wall: '2008-wall',
  cards: '2012-cards',
  viral: '2014-viral',
  algorithm: '2017-algorithm',
  stories: '2019-stories',
  reels: '2021-reels',
  pro: '2024-pro',
  dead: '2025-dead',
};

/**
 * How dark the page is behind each era, 0 (its own backdrop) to 1 (black):
 * slow while the early web is still ours, then quickly. The step past 0.5 is
 * where the text turns light.
 */
const DARKNESS = [0, 0.02, 0.06, 0.12, 0.2, 0.3, 0.62, 0.8, 0.92];

/**
 * The reveal, in the three beats the camera makes. The words are the
 * reveal's narration, split where the picture changes (a test keeps them in
 * step with narration.json).
 */
export const REVEAL_BEATS = [
  {
    shot: 'reveal-sandbox',
    alt: 'Ashley’s browser inside an AI agent session, with a task that repeats every five minutes',
    sees: 'The camera pulls back. Ashley’s browser was one AI agent session all along, on a task that repeats every five minutes.',
    says: 'The internet used to be our sandbox... A place to play, to connect, to be ourselves.',
  },
  {
    shot: 'reveal-sessions',
    alt: 'A wall of identical agent sessions under a counter that reads 20 sessions running, 0 people',
    sees: 'Then further back: twenty sessions, then thousands. The counter reads 0 people.',
    says: 'Now it’s just a chat agent pretending to be us... pretending to be me... pretending to be you... but who are they speaking to?',
  },
  {
    shot: 'reveal-title',
    alt: 'The title, Dead Internet, over a field of dim dots',
    sees: 'Every session shrinks into a dot of light, and the dots go quiet.',
    says: '...Is there anyone here? Can anyone hear me?',
  },
] as const;

function mix(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t)).join(' ')})`;
}

/** Kiro's ghost, as in the film's header. */
function KiroGhost({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M13 3C17.5 3 20 6 20 10C20 13.5 19.5 16 20.5 18.5C21 19.8 19.8 20.6 18.6 20C17.5 19.5 16.5 19.4 15.6 20.3C13.8 22 11 22 9.3 20.4C7.6 21.6 4.6 21.8 3.6 20.6C5.5 19.4 6.2 17 6.3 14C6.4 11.5 6 9 6.6 7.4C7.6 4.6 10 3 13 3ZM9.9 10.6a1.25 1.75 0 1 0 2.5 0a1.25 1.75 0 1 0 -2.5 0ZM14.3 10.6a1.25 1.75 0 1 0 2.5 0a1.25 1.75 0 1 0 -2.5 0Z"
      />
    </svg>
  );
}

/** The dead-internet mark: a globe with its edge cut off by an ×. */
function Mark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20.4 8.8A9 9 0 1 0 20.4 15.2M3 12h12M12 3c-4 4.5-4 13.5 0 18M12 3c2.2 2.5 3.2 5.5 3.2 9S14.2 18.5 12 21" />
      <path d="M19 10l4 4m0-4-4 4" />
    </svg>
  );
}

function Shot({ name, alt, wide }: { name: string; alt: string; wide?: boolean }) {
  return (
    <figure className="ms-shot" data-wide={wide ? 'true' : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/story/${name}.jpg`} alt={alt} width={1280} height={818} loading="lazy" decoding="async" />
    </figure>
  );
}

export function MobileStory() {
  const first = FILM_ERAS[0].backdrop;
  const tones = FILM_ERAS.map((era, k) => mix(era.backdrop.base, NIGHT, DARKNESS[k] ?? 1));
  return (
    <main className="ms">
      <header
        className="ms-hero"
        style={{ '--bd-base': first.base, '--bd-glow': first.glow, '--bd-glow2': first.glow2 } as CSSProperties}
      >
        <div className="ms-top">
          <p className="ms-brand">
            <Mark size={22} />
            <span>dead internet</span>
          </p>
          <a className="ms-kiro" href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">
            <KiroGhost size={15} />
            <span>
              built for <strong>Kiroween</strong>
            </span>
          </a>
        </div>
        <p className="ms-eyebrow">A short film by Dylan Jones</p>
        <h1>Dead Internet</h1>
        <p className="ms-lede">Twenty years of the internet, from MySpace to a feed where nobody is real.</p>
        <StoryVideo />
        <p className="ms-desktop">Made to be scrolled. Open it on a computer to play it with your scroll bar.</p>
        <a className="ms-down" href="#story">
          <span>Or read the story</span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </header>

      <div className="ms-story" id="story">
        {FILM_ERAS.map((era, k) => {
          const line = narration.chunks.find((chunk) => chunk.era === era.id)?.text;
          const dark = DARKNESS[k] ?? 1;
          const light = dark > 0.5;
          // The quiet text keeps its contrast as the page passes through grey.
          const muted = light ? mix('#f1eef6', '#a9a3b2', Math.max(0, (dark - 0.6) / 0.4)) : mix('#625d57', '#1f1d1a', Math.min(1, dark * 3));
          const shot = SHOTS[era.id];
          return (
            <section
              key={era.id}
              className="ms-chapter"
              data-ink={light ? 'light' : 'dark'}
              style={{ '--tone': tones[k], '--tone-next': tones[k + 1] ?? NIGHT, '--muted': muted } as CSSProperties}
            >
              <p className="ms-when">{era.year}</p>
              {shot && <Shot name={shot} alt={`The feed in ${era.year}, looking like ${era.reference}`} />}
              {line && (
                <blockquote>
                  <p>{line}</p>
                  {/* Ashley as she looked that year, signing her line. */}
                  <Avatar author={viewerFor(era.year)} size={68} shape="circle" />
                </blockquote>
              )}
            </section>
          );
        })}

        <section className="ms-reveal">
          <p className="ms-when">2026</p>
          {REVEAL_BEATS.map((beat) => (
            <div key={beat.shot} className="ms-beat">
              <Shot name={beat.shot} alt={beat.alt} wide />
              <p className="ms-sees">{beat.sees}</p>
              <blockquote>
                <p>{beat.says}</p>
              </blockquote>
            </div>
          ))}
        </section>

        <footer className="ms-foot">
          <p className="ms-brand">
            <Mark size={20} />
            <span>dead internet</span>
          </p>
          <p>
            <a href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">Dylan Jones</a>
            <span aria-hidden="true"> · </span>
            <a href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">Kiroween</a>
            <span aria-hidden="true"> · </span>
            <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
