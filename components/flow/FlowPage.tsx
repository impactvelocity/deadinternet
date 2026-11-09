'use client';
/**
 * The page around the browser window: a soft gradient behind the window that
 * shifts colour with each era, and a full-width header at the top of the
 * viewport with the logo, the era name in the middle and links. Clicking the
 * era name opens a full-height drawer about what was happening online.
 *
 * All of this fades away when the reveal starts, leaving the browser window
 * to shrink into the AI chat it was really running in.
 *
 * Era drawer copy is draft context to fact-check before shipping.
 */
import { type Ref, useEffect, useRef, useState, type CSSProperties } from 'react';
import { FILM_ERAS as FLOW_ERAS } from '@/data/flow/scenes';
import narration from '@/data/flow/narration.json';
import { SITE } from '@/data/flow/site';
import { FILM_VIDEO, youtubeEmbed } from '@/data/flow/video';
import type { FlowEra } from '@/data/flow/types';
import type { Ambience, Rgb } from '@/lib/flow/movie';
import { Icon } from './icons';

/** Header height in real (unscaled) px. The page is fitted below it. */
export const HEADER_H = 56;
const INK = '#1f1d1a';
const UI = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

function eraTitle(era: FlowEra) {
  return era.id === 'machine' ? 'The machine' : `${era.year} · ${era.label}`;
}

/**
 * The page behind the browser window, filling the viewport. Its colours are
 * registered custom properties (`.fl-backdrop` in flow.css), so moving to the
 * next era eases from one gradient to the next. Over it, the sandbox's own
 * black fades in with the story (`--page-dark`, lib/flow/darkness.ts).
 */
export function PageBackdrop({ era }: { era: FlowEra }) {
  const b = era.backdrop;
  return (
    <div
      aria-hidden
      className="fl-backdrop absolute inset-0"
      style={{ '--bd-base': b.base, '--bd-glow': b.glow, '--bd-glow2': b.glow2, opacity: 'var(--page-o, 1)' } as CSSProperties}
    >
      <div className="fl-backdrop-dark absolute inset-0" />
    </div>
  );
}

/** Kiro's ghost, as on gpty.lol, in the grey of the text around it. */
function KiroGhost({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" className="fl-kiro" width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M13 3C17.5 3 20 6 20 10C20 13.5 19.5 16 20.5 18.5C21 19.8 19.8 20.6 18.6 20C17.5 19.5 16.5 19.4 15.6 20.3C13.8 22 11 22 9.3 20.4C7.6 21.6 4.6 21.8 3.6 20.6C5.5 19.4 6.2 17 6.3 14C6.4 11.5 6 9 6.6 7.4C7.6 4.6 10 3 13 3ZM9.9 10.6a1.25 1.75 0 1 0 2.5 0a1.25 1.75 0 1 0 -2.5 0ZM14.3 10.6a1.25 1.75 0 1 0 2.5 0a1.25 1.75 0 1 0 -2.5 0Z"
      />
    </svg>
  );
}

/** The dead-internet mark: a globe with its edge cut off by an ×. */
function BrandMark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20.4 8.8A9 9 0 1 0 20.4 15.2M3 12h12M12 3c-4 4.5-4 13.5 0 18M12 3c2.2 2.5 3.2 5.5 3.2 9S14.2 18.5 12 21" />
      <path d="M19 10l4 4m0-4-4 4" />
    </svg>
  );
}

/**
 * The ending over the last screen of dots: the film's title. Its opacity is
 * set every frame by the lab from story position (lib/flow/ending.ts); it
 * only takes clicks once it's showing.
 */
export function EndTitle() {
  return (
    <section className="fl-end-title" aria-label="Dead Internet: credits">
      <span className="fl-end-mark">
        <BrandMark size={26} />
      </span>
      <div className="fl-end-center">
        <h2>Dead Internet</h2>
        <p className="fl-end-credit">Short film by Dylan Jones for Kiroween</p>
        <p className="fl-end-date">2026 — the year the internet died</p>
      </div>
      <nav className="fl-end-links" aria-label="Links">
        <a href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">Written &amp; built by Dylan Jones</a>
        <span aria-hidden="true">·</span>
        <a href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">
          <KiroGhost size={14} />
          <span>built for Kiroween</span>
        </a>
      </nav>
    </section>
  );
}

/**
 * The start screen, like a film's page: a play button over the (still small)
 * window, and under it a line saying what this is, with a button to watch
 * the film as a plain video instead. Positions are in viewport px, worked
 * out by the lab from the window's fit. It fades away once the film starts.
 */
export function StartScreen({ visible, above, below, center, onPlay, onWatchVideo }: {
  visible: boolean;
  /** Where the line over the window ends (phones only: the credit moves there from the header). */
  above: number;
  /** Where the text under the window starts. */
  below: number;
  /** The window's centre. */
  center: { x: number; y: number };
  onPlay: () => void;
  onWatchVideo: () => void;
}) {
  return (
    <div className="fl-start" data-visible={visible} inert={!visible} aria-hidden={!visible}>
      <p className="fl-start-by" style={{ top: above }}>
        <a href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">
          built by <span className="fl-start-by-name">Dylan Jones</span>
        </a>
      </p>
      <button type="button" className="fl-start-play" style={{ left: center.x, top: center.y }} onClick={onPlay} aria-label="Play the film">
        <span className="fl-start-play-disc">
          {/* A soft-cornered triangle, its centroid on the disc's centre. */}
          <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24">
            <path d="M8.5 6.3v11.4c0 .9 1 1.5 1.8 1l9-5.7c.7-.4.7-1.5 0-1.9l-9-5.7c-.8-.5-1.8.1-1.8.9z" fill="currentColor" />
          </svg>
        </span>
      </button>
      <div className="fl-start-below" style={{ top: below }}>
        <p className="fl-start-line">Press play to watch the scrolling film</p>
        <button type="button" className="fl-start-video" onClick={onWatchVideo}>
          Watch as a Video
        </button>
      </div>
    </div>
  );
}

const PLAY_PATH = 'M8.5 6.3v11.4c0 .9 1 1.5 1.8 1l9-5.7c.7-.4.7-1.5 0-1.9l-9-5.7c-.8-.5-1.8.1-1.8.9z';

function Glyph({ kind }: { kind: 'play' | 'pause' }) {
  return (
    <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
      {kind === 'play' ? (
        <path d={PLAY_PATH} />
      ) : (
        <>
          <rect x="6.8" y="5.5" width="3.6" height="13" rx="1.2" />
          <rect x="13.6" y="5.5" width="3.6" height="13" rx="1.2" />
        </>
      )}
    </svg>
  );
}

/**
 * The window itself is a play/pause button, like a video: click (or tap)
 * anywhere on the feed to pause or carry on. Hovering shows what a click will
 * do; a click flashes what it did. Before the film starts, the start screen's
 * own button shows instead, but a click on the window still starts it. It
 * sits inside the window, so it grows and moves with it.
 */
export function WindowToggle({ playing, started, isPlaying, onToggle }: {
  playing: boolean;
  started: boolean;
  /** Whether the film is playing right now (read at the moment of the press). */
  isPlaying: () => boolean;
  onToggle: () => void;
}) {
  const [flash, setFlash] = useState<{ n: number; kind: 'play' | 'pause' } | null>(null);
  // Whether it was playing when the press began: on a phone the touch itself
  // already pauses the film (FlowLab), so the click must not undo that.
  const pressedWhilePlaying = useRef<boolean | null>(null);
  return (
    <button
      type="button"
      className="fl-window-toggle"
      data-started={started}
      aria-label={playing ? 'Pause the film' : 'Play the film'}
      onPointerDown={() => {
        pressedWhilePlaying.current = isPlaying();
      }}
      onClick={() => {
        const want = !(pressedWhilePlaying.current ?? isPlaying());
        pressedWhilePlaying.current = null;
        if (isPlaying() !== want) onToggle();
        if (started) setFlash((f) => ({ n: (f?.n ?? 0) + 1, kind: want ? 'play' : 'pause' }));
      }}
    >
      <span className="fl-window-icon">
        <Glyph kind={playing ? 'pause' : 'play'} />
      </span>
      {flash && (
        // What the press just did: paused, or carried on.
        <span key={flash.n} className="fl-window-icon fl-window-flash">
          <Glyph kind={flash.kind} />
        </span>
      )}
    </button>
  );
}

/** GitHub's mark, in the grey of the credits around it. */
function GitHubIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-1.97c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}

function ShareIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5" />
    </svg>
  );
}

/**
 * Share the film: a pop-up with a line about it and its link, to copy (or to
 * hand to the phone's own share sheet where there is one). The link is this
 * page's, without any query string. Esc, the close button or a click outside
 * closes it.
 */
export function ShareFilm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setUrl(new URL('/', window.location.href).toString());
      setCopied(false);
      setCanShare(typeof navigator.share === 'function');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access: select the link so it can be copied by hand.
      ref.current?.querySelector('input')?.select();
    }
  };
  const share = () => {
    navigator.share({ title: SITE.title, text: SITE.description, url }).catch(() => {});
  };
  return (
    <dialog
      ref={ref}
      className="fl-share"
      aria-labelledby="fl-share-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fl-share-card">
        <button type="button" className="fl-share-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
        <p className="fl-share-mark">
          <BrandMark size={22} />
          <span id="fl-share-title">{SITE.name}</span>
        </p>
        <p className="fl-share-kind">A scrolling short film</p>
        <p className="fl-share-text">{SITE.description}</p>
        <div className="fl-share-link">
          <input readOnly value={url} aria-label="Link to the film" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="fl-share-copy" onClick={copy}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {canShare && (
          <button type="button" className="fl-share-native" onClick={share}>
            <ShareIcon size={15} />
            Share…
          </button>
        )}
        <p className="fl-share-status" role="status">
          {copied ? 'Link copied to the clipboard.' : ''}
        </p>
      </div>
    </dialog>
  );
}

/**
 * The film as a plain video, in a pop-up over the page (FILM_VIDEO in
 * data/flow/video.ts). The player is only mounted while it's open, so
 * closing it stops the video. Esc, the close button or a click outside closes it.
 */
export function FilmVideo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const embed = youtubeEmbed(FILM_VIDEO.youtube);
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
      className="fl-video"
      aria-label={FILM_VIDEO.title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fl-video-frame">
        {open &&
          (embed ? (
            <iframe
              src={embed}
              title={FILM_VIDEO.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <p className="fl-video-soon">
              The video version is on its way.
              <br />
              Until then, press play to watch it scroll.
            </p>
          ))}
      </div>
      <button type="button" className="fl-video-close" onClick={onClose} aria-label="Close the video">
        <Icon name="close" size={20} />
      </button>
    </dialog>
  );
}

/**
 * The movie's ambience (/movie): a faint glow in the era's colours behind the
 * window, so the frame isn't flat black. Two soft pools drift slowly in from
 * the corners, where the site's page gradient has its glows, and the screen
 * spills a little light around itself. `paintAmbience` sets it every frame
 * from story position (lib/flow/movie.ts `ambienceAt`); it fades with the
 * page at the reveal.
 */
export function MovieAmbience({ ambienceRef }: { ambienceRef: Ref<HTMLDivElement> }) {
  return <div ref={ambienceRef} aria-hidden className="fl-ambience" />;
}

const rgbVar = (c: Rgb) => c.map((v) => Math.round(v)).join(' ');

/** Write the ambience for one frame: its colours, strength, drift (movie `seconds`) and the screen's size in px. */
export function paintAmbience(el: HTMLElement, amb: Ambience, level: number, seconds: number, screen: { w: number; h: number }) {
  // The screen's own light: white, tinted by the era.
  const spill = [0, 1, 2].map((i) => 0.5 * 255 + 0.25 * (amb.a[i] + amb.b[i])) as [number, number, number];
  const vars: Record<string, string> = {
    '--amb-a': rgbVar(amb.a),
    '--amb-b': rgbVar(amb.b),
    '--amb-spill': rgbVar(spill),
    '--amb-level': level.toFixed(3),
    // A slow drift, so the light is never quite still.
    '--amb-ax': `${(14 + 5 * Math.sin(seconds / 9)).toFixed(2)}%`,
    '--amb-ay': `${(10 + 5 * Math.cos(seconds / 11)).toFixed(2)}%`,
    '--amb-bx': `${(86 - 5 * Math.sin(seconds / 10 + 1)).toFixed(2)}%`,
    '--amb-by': `${(90 - 5 * Math.cos(seconds / 12 + 2)).toFixed(2)}%`,
    '--amb-sw': `${(screen.w * 0.68).toFixed(1)}px`,
    '--amb-sh': `${(screen.h * 0.78).toFixed(1)}px`,
  };
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

/**
 * The movie's opening cards on black (/movie), one after the other: the
 * dead-internet mark, then who it was made for. Their opacities are set
 * every frame by the lab (`--intro-0..1`, lib/flow/movie.ts). Watched live, a quiet hint says how to start it; the
 * rendered video never shows it.
 */
export function MovieIntro({ hint }: { hint: boolean }) {
  return (
    <div className="fl-movie-intro" aria-hidden={!hint}>
      <p className="fl-movie-card fl-movie-mark" style={{ opacity: 'var(--intro-0, 0)' }}>
        <BrandMark size={24} />
        dead internet
      </p>
      <p className="fl-movie-card fl-movie-line" style={{ opacity: 'var(--intro-1, 0)' }}>
        <span>A short film built for <strong>Kiroween</strong></span>
      </p>
      {hint && <p className="fl-movie-hint">Click or press Space to play</p>}
    </div>
  );
}

/**
 * The header pinned to the top of the viewport, at real size: the logo at
 * the top left (it rewinds to the beginning), who built it in the middle and
 * what for at the right with a share button, kept quiet so the page reads
 * like a film's. (The era drawer still opens with the E key.)
 */
export function PageHeader({ interactive, onShare }: { interactive: boolean; onShare: () => void }) {
  return (
    <header
      className="fl-page-header absolute inset-x-0 top-0 z-30"
      inert={!interactive}
      style={
        {
          height: HEADER_H,
          fontFamily: UI,
          opacity: 'var(--page-o, 1)',
          pointerEvents: interactive ? 'auto' : 'none',
        } as CSSProperties
      }
    >
      <a href="#top" className="fl-brand" aria-label="Dead internet — back to the beginning">
        <BrandMark size={24} />
        <span>dead internet</span>
      </a>
      <div className="fl-header-credits fl-header-by">
        <a className="fl-credit" href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">
          <span>built by <span className="fl-credit-name">Dylan Jones</span></span>
        </a>
      </div>
      <div className="fl-header-credits">
        <a className="fl-credit" href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">
          <KiroGhost size={15} />
          <span>built for <span className="fl-credit-name">Kiroween</span></span>
        </a>
        <a
          className="fl-github"
          href="https://github.com/impactvelocity/deadinternet"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source on GitHub"
          title="Source on GitHub"
        >
          <GitHubIcon size={16} />
        </a>
        <button type="button" className="fl-share-button" onClick={onShare} aria-haspopup="dialog">
          <ShareIcon size={14} />
          <span className="fl-share-label">Share</span>
        </button>
      </div>
    </header>
  );
}

/**
 * The era drawer: what was happening online, with jumps to the eras either
 * side. Full viewport height, over the header, at real size.
 */
export function EraDrawer({
  era,
  index,
  open,
  onClose,
  onJump,
}: {
  era: FlowEra;
  index: number;
  open: boolean;
  onClose: () => void;
  onJump: (index: number) => void;
}) {
  const prev = FLOW_ERAS[index - 1];
  const next = FLOW_ERAS[index + 1];
  return (
    <div className="absolute inset-0 z-40" style={{ pointerEvents: open ? 'auto' : 'none', fontFamily: UI, color: INK }}>
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="era-drawer"
        aria-hidden={!open}
        inert={!open}
        className="absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col bg-[#fbfaf7] shadow-[-20px_0_60px_rgba(0,0,0,.15)] transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(105%)' }}
      >
        <div className="flex items-center justify-between px-8 pt-7 text-[12px] text-[#625d56]">
          <span className="font-mono uppercase tracking-wider">
            Era {index + 1} of {FLOW_ERAS.length}
          </span>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
          <div className="font-mono text-[14px] text-[#625d56]">{era.id === 'machine' ? '—' : era.year}</div>
          <h2 className="mt-1 text-[34px] font-semibold leading-tight tracking-tight">{era.label}</h2>
          <div className="mt-1 text-[14px] text-[#625d56]">Looks like: {era.reference}</div>
          <p className="mt-6 text-[16px] leading-relaxed">{era.context.summary}</p>
          <details className="mt-5 text-[14px] leading-relaxed">
            <summary className="cursor-pointer font-medium">Ashley’s narration · transcript</summary>
            <p className="mt-2">{narration.chunks.find((chunk) => chunk.era === era.id)?.text}</p>
          </details>
          <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-wider text-[#625d56]">What was happening</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {era.context.points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: INK }} />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-black/10 px-8 pb-[104px] pt-5 text-[13px]">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onJump(index - 1)}
            className="rounded-xl border border-black/10 px-3 py-2.5 text-left hover:bg-black/5 disabled:opacity-30"
          >
            <div className="text-[#625d56]">← Previous</div>
            <div className="truncate font-semibold">{prev ? eraTitle(prev) : '—'}</div>
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onJump(index + 1)}
            className="rounded-xl border border-black/10 px-3 py-2.5 text-right hover:bg-black/5 disabled:opacity-30"
          >
            <div className="text-[#625d56]">Next →</div>
            <div className="truncate font-semibold">{next ? eraTitle(next) : '—'}</div>
          </button>
        </div>
      </aside>
    </div>
  );
}
