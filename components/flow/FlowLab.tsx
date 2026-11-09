'use client';
/**
 * The dead internet feed: its flow, interactions and pacing.
 *
 * Structure:
 *
 *   spacer                 document height = story length; window scroll drives everything
 *   stage (back)           PAGE design box, fitted so the window is centered on screen
 *     world (back)         the reveal: field + AI-chat sessions (hidden until the reveal)
 *   PageBackdrop           the page: a gradient per era, fills the viewport; fades at the reveal
 *   stage (front)          same fit as the back stage
 *     world (front)        same camera as the back world
 *       window             the browser window; its screen is the site:
 *         screen           backgrounds, feed, pinned pieces, guides, cursor
 *     canvas               dots, then the pixel screen of symbols
 *     RevealOverlay        vignette, session counter, end card
 *   PageHeader             full-width header: logo, era name, links (fades at the reveal)
 *   EraDrawer              full-height drawer: what was happening online in this era
 *   FlowHud                floating play bar
 *
 * Until the reveal the window sits at PAGE_WINDOW on the page, growing from
 * small to full size (windowScale) and showing only its screen. At the reveal
 * the camera takes over at exactly that spot, the page fades away, and the
 * window shrinks into the empty slot of the live chat session.
 *
 * Per frame (rAF): smooth the scroll position, sample the timeline, and write
 * the feed offset, cursor, playhead and camera straight to the DOM. React only
 * re-renders when the era, the fired-event count, typing, the beat, or the
 * reveal phase changes.
 */
import './flow.css';
import { type Ref, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { wireTokens } from '@/data/flow/eras';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS as FLOW_ERAS, FILM_POSTS as FLOW_POSTS, FILM_TITLES } from '@/data/flow/scenes';
import type { EraTokens, FlowEraId } from '@/data/flow/types';
import { cameraAt, PAGE, PAGE_WINDOW, WINDOW, WINDOW_GROWTH, WINDOW_PLACEMENT, windowScale, windowTransform } from '@/lib/flow/camera';
import { DOT_PHASES, drawDots } from '@/lib/flow/dots';
import { measureFlow } from '@/lib/flow/measure';
import { lightInkEra, pageDarkness } from '@/lib/flow/darkness';
import { ENDING, titleOpacity } from '@/lib/flow/ending';
import { formatCount, inboxCounts, type InboxKind } from '@/lib/flow/inbox';
import { musicCues } from '@/lib/flow/music';
import { PLAY_SPEED } from '@/lib/flow/playback';
import {
  compileTimeline,
  deriveEffects,
  FLOW_TIMING,
  NO_EFFECTS,
  REVEAL_PHASES,
  sampleTimeline,
  type PingSlot,
  type RevealPhase,
  type Timeline,
} from '@/lib/flow/timeline';
import { ChromeBackground, ChromeLayers, Guides } from './FlowChrome';
import { FlowFeed } from './FlowFeed';
import { FlowHud, HUD_HEIGHT } from './FlowHud';
import { FlowMusic } from './FlowMusic';
import { FlowNarration } from './FlowNarration';
import { EndTitle, EraDrawer, HEADER_H, PageBackdrop, PageHeader } from './FlowPage';

/** Least room kept above and below the browser window, in page units. */
const PAGE_GAP = 20;
/** Room kept free at the bottom for the floating play bar (it sits 16px up). */
const PLAY_BAR_ROOM = HUD_HEIGHT + 16;
import { WINDOW_SHADOW, WindowChrome } from './FlowWindow';
import { FlowReveal, RevealOverlay, type ToolCall } from './FlowReveal';
import { box, SCREEN, SLOTS } from './parts';

/** Scroll smoothing time constant (s). */
const SMOOTHING = 0.09;

interface Snap {
  era: number;
  fired: number;
  beat: number;
  typingPost: string | null;
  typingText: string;
  phase: RevealPhase | null;
  /** Past "Behind the feed": the reveal narration is playing. */
  behind: boolean;
  /** Step within the reveal phase, 0..24 (drives the streaming chat). */
  revealK: number;
  /** Active notification indices, comma-joined. */
  pings: string;
}

const INITIAL_SNAP: Snap = {
  era: 0,
  fired: 0,
  beat: 0,
  typingPost: null,
  typingText: '',
  phase: null,
  behind: false,
  revealK: 0,
  pings: '',
};
const NO_PINGS: readonly PingSlot[] = [];
const GLITCH_BARS = 9;
/** The dot canvas overhangs the page by this much (design px) on every side. */
const DOT_BLEED = 4;

/** Deterministic 0..1 noise. */
function noise(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const sameSnap = (a: Snap, b: Snap) =>
  a.era === b.era &&
  a.fired === b.fired &&
  a.beat === b.beat &&
  a.typingPost === b.typingPost &&
  a.typingText === b.typingText &&
  a.phase === b.phase &&
  a.behind === b.behind &&
  a.revealK === b.revealK &&
  a.pings === b.pings;

/* Window size as an external store, so the fit is computed during render. */
function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}
// clientWidth leaves out the scrollbar, so "centered" matches what you see.
const getSize = () => `${document.documentElement.clientWidth}x${window.innerHeight}`;
const getServerSize = () => '1440x900';

function toolCalls(t: Timeline): ToolCall[] {
  const out: ToolCall[] = [];
  for (const b of t.beats) {
    if (b.kind === 'scroll') out.push({ tool: 'scroll', args: `(down, ${Math.round(b.to - b.from)}px)` });
    if (b.kind !== 'act') continue;
    const at = `(${Math.round(b.cursorEnd.x)}, ${Math.round(b.cursorEnd.y)})`;
    if (b.action.type === 'comment' || b.action.type === 'publish' || b.action.type === 'message') {
      out.push({ tool: 'type', args: JSON.stringify(b.action.text) });
      out.push({ tool: 'key', args: '"Return"' });
    } else {
      out.push({ tool: 'left_click', args: at, note: b.label });
    }
  }
  return out.slice(-6);
}

function Cursor({ visible, cursorRef }: { visible: boolean; cursorRef: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={cursorRef}
      data-flow-cursor=""
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{ opacity: visible ? 1 : 0, willChange: 'transform' }}
    >
      <span className="fl-cursor-ring absolute -left-[13px] -top-[13px] size-[28px] rounded-full border-2 border-sky-400/80 bg-sky-400/20" />
      <svg width="18" height="26" viewBox="0 0 18 26" className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">
        <path
          d="M1 1 L1 20.5 L5.6 16.4 L8.9 24 L12 22.6 L8.8 15.2 L15 15.2 Z"
          fill="#000"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function FlowLab() {
  const [wire, setWire] = useState(false);
  const [guides, setGuides] = useState(false);
  const [cursorOn, setCursorOn] = useState(true);
  const [hud, setHud] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [snap, setSnap] = useState<Snap>(INITIAL_SNAP);

  const size = useSyncExternalStore(subscribeResize, getSize, getServerSize);
  const [vw, vh] = size.split('x').map(Number);
  // Fit the browser window into the band between the header and the play bar
  // and center it there, both ways. The rest of the page box (and the reveal
  // world that takes over from it) runs on under the header and the play bar.
  const band = Math.max(1, vh - HEADER_H - PLAY_BAR_ROOM);
  const scale = Math.min(vw / PAGE.w, band / (WINDOW.h + 2 * PAGE_GAP));
  const fitX = vw / 2 - (PAGE_WINDOW.x + WINDOW.w / 2) * scale;
  // Centre the screen itself: the browser chrome above it only shows at the reveal.
  const fitY = HEADER_H + band / 2 - (PAGE_WINDOW.y + WINDOW.chrome + (WINDOW.h - WINDOW.chrome) / 2) * scale;
  const stageStyle = { width: PAGE.w, height: PAGE.h, transform: `translate(${fitX}px, ${fitY}px) scale(${scale})` };
  const [drawer, setDrawer] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const worldBackRef = useRef<HTMLDivElement>(null);
  const worldFrontRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLCanvasElement>(null);
  /** Page fit scale, for sizing the dot canvas's backing store. */
  const fitRef = useRef(1);
  const cursorRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const snapRef = useRef<Snap>(INITIAL_SNAP);
  const shownRef = useRef(0);
  const playRef = useRef(false);
  const autoRef = useRef(0);

  const tokens = useMemo<ReadonlyMap<FlowEraId, EraTokens>>(
    () => new Map(FLOW_ERAS.map((e) => [e.id, wire ? wireTokens(e.tokens) : e.tokens])),
    [wire],
  );
  const effects = useMemo(() => (timeline ? deriveEffects(timeline.events, snap.fired) : NO_EFFECTS), [timeline, snap.fired]);
  const typing = useMemo(
    () => (snap.typingPost ? { postId: snap.typingPost, text: snap.typingText } : null),
    [snap.typingPost, snap.typingText],
  );
  const calls = useMemo(() => (timeline ? toolCalls(timeline) : []), [timeline]);
  const musicCuesFor = useMemo(() => (timeline ? musicCues(timeline) : null), [timeline]);
  const inkEra = useMemo(() => (timeline ? lightInkEra(timeline) : Infinity), [timeline]);
  const activePings = useMemo(() => (snap.pings ? snap.pings.split(',').map(Number) : []), [snap.pings]);

  const beat = timeline?.beats[snap.beat];
  const beatLabel = !beat
    ? 'measuring…'
    : beat.kind === 'act'
      ? `▸ ${beat.label}`
      : beat.kind === 'hold'
        ? `‖ ${beat.label}`
        : beat.kind === 'tail'
          ? '↓ endless tail'
          : '↓ scrolling';

  useEffect(() => {
    fitRef.current = scale;
  }, [scale]);

  /* ---------------------------- Playback control --------------------------- */

  const stopPlay = useCallback(() => {
    if (!playRef.current) return;
    playRef.current = false;
    setPlaying(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    stopPlay();
    setDrawer((open) => !open);
  }, [stopPlay]);

  const togglePlay = useCallback(() => {
    const t = timelineRef.current;
    if (!t) return;
    if (playRef.current) {
      stopPlay();
      return;
    }
    let from = window.scrollY;
    if (from >= t.total - 1) {
      from = 0;
      window.scrollTo(0, 0);
      shownRef.current = 0;
    }
    autoRef.current = from;
    playRef.current = true;
    setHasStarted(true);
    setPlaying(true);
  }, [stopPlay]);

  const seek = useCallback(
    (s: number) => {
      stopPlay();
      const destination = Math.max(0, Math.ceil(s));
      shownRef.current = destination;
      autoRef.current = destination;
      window.scrollTo(0, destination);
    },
    [stopPlay],
  );

  const toggle = useCallback((key: 'guides' | 'wire' | 'cursor' | 'hud') => {
    if (key === 'guides') setGuides((v) => !v);
    if (key === 'wire') setWire((v) => !v);
    if (key === 'cursor') setCursorOn((v) => !v);
    if (key === 'hud') setHud((v) => !v);
  }, []);

  /* -------------------------- Measure and compile -------------------------- */

  useEffect(() => {
    const screen = screenRef.current;
    const content = screen?.querySelector<HTMLElement>('[data-flow-content]');
    if (!screen || !content) return;
    contentRef.current = content;
    let raf = 0;
    let alive = true;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!alive) return;
        const m = measureFlow(screen);
        if (!m) {
          console.warn('[flow] could not measure the feed');
          return;
        }
        let t: Timeline;
        try {
          t = compileTimeline(FLOW_ERAS, FLOW_POSTS, m);
        } catch (err) {
          console.error('[flow] timeline failed to compile', err);
          return;
        }
        if (t.warnings.length) console.warn('[flow] timeline warnings:\n' + t.warnings.join('\n'));
        timelineRef.current = t;
        setTimeline(t);
      });
    };
    run();
    document.fonts?.ready.then(run, () => {});
    const ro = new ResizeObserver(run);
    ro.observe(content);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [wire]);

  // The story uses document scroll as its playhead; always open at the start.
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const resetPlayhead = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      shownRef.current = 0;
      autoRef.current = 0;
    };
    resetPlayhead();
    window.addEventListener('load', resetPlayhead, { once: true });
    return () => {
      window.removeEventListener('load', resetPlayhead);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  /* ------------------------------- Frame loop ------------------------------ */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    shownRef.current = window.scrollY;

    const glitch = (g: number, now: number) => {
      const screen = screenRef.current;
      const vp = viewportRef.current;
      const layer = glitchRef.current;
      if (!screen || !vp || !layer) return;
      const on = g > 0.02;
      screen.dataset.glitch = on ? 'on' : 'off';
      screen.style.setProperty('--glitch', on ? g.toFixed(3) : '0');
      const bars = layer.children as HTMLCollectionOf<HTMLElement>;
      if (!on) {
        vp.style.transform = '';
        vp.style.filter = '';
        for (const bar of Array.from(bars)) bar.style.opacity = '0';
        return;
      }
      // Flicker on a ~55ms clock so a held scroll position still twitches.
      const tick = Math.floor(now / 55);
      const r = (i: number) => noise(tick * 31 + i * 7.13);
      vp.style.transform = `translate(${(r(1) - 0.5) * 28 * g}px, ${(r(2) - 0.5) * 6 * g}px) skewX(${(r(3) - 0.5) * 5 * g}deg)`;
      vp.style.filter = `saturate(${1 + g * 2}) hue-rotate(${(r(4) - 0.5) * 100 * g}deg) contrast(${1 + g * 0.5})`;
      Array.from(bars).forEach((bar, i) => {
        const visible = r(10 + i) < 0.25 + g * 0.55;
        bar.style.opacity = visible ? String(0.3 + g * 0.6) : '0';
        bar.style.top = `${r(20 + i) * 800}px`;
        bar.style.height = `${2 + r(30 + i) * 42 * g}px`;
        bar.style.transform = `translateX(${(r(40 + i) - 0.5) * 80 * g}px)`;
      });
    };

    const apply = (t: Timeline, s: number, now: number) => {
      const f = sampleTimeline(t, s);
      const content = contentRef.current;
      if (content) content.style.transform = `translate3d(0, ${-f.offset}px, 0)`;
      const cursor = cursorRef.current;
      if (cursor) {
        cursor.style.transform = `translate(${f.cursor.x}px, ${f.cursor.y}px)`;
        cursor.dataset.pressed = f.pressed ? 'true' : 'false';
      }
      if (playheadRef.current) {
        playheadRef.current.style.left = `${(f.s / t.total) * 100}%`;
        playheadRef.current.closest('[role="slider"]')?.setAttribute('aria-valuenow', String(Math.round((f.s / t.total) * 100)));
      }
      if (readoutRef.current) readoutRef.current.textContent = `${Math.round(f.s)}`;

      const back = worldBackRef.current;
      const front = worldFrontRef.current;
      const win = windowRef.current;
      const root = rootRef.current;
      if (back && front && win && root) {
        win.dataset.agent = f.reveal ? 'on' : 'off';
        // Once the voice stops, let the screen and the music have the room.
        const quiet = !!f.reveal && f.s >= t.revealStart + narration.reveal.durationSeconds * PLAY_SPEED;
        root.dataset.monitor = quiet ? 'true' : 'false';
        let pageOpacity = 1;
        const canvas = dotsRef.current;
        const dotsOn = !!f.reveal && DOT_PHASES.includes(f.reveal.phase);
        if (canvas) canvas.style.display = dotsOn ? 'block' : 'none';
        // Once every session is a dot, nothing behind the canvas needs drawing.
        const night = dotsOn && !(f.reveal?.phase === 'dots' && f.reveal.u < 0.6);
        back.style.visibility = night ? 'hidden' : '';
        front.style.visibility = night ? 'hidden' : '';
        const dissolve = f.reveal?.phase === 'dots' ? Math.min(1, f.reveal.u / 0.55) : dotsOn ? 1 : 0;
        // Descendants explicitly set visibility, so fade the whole layer too.
        // This also carries the field's soft edges cleanly into the canvas.
        back.style.opacity = String(1 - dissolve * dissolve * (3 - 2 * dissolve));
        if (f.reveal) {
          root.style.setProperty('--reveal-u', String(f.reveal.u));
          // Match the live browser's handoff to the lighter field rendering.
          front.style.opacity = f.reveal.phase === 'farm' ? String(1 - Math.min(1, f.reveal.u * 2.5)) : dotsOn ? '0' : '1';
          const edge = f.reveal.phase === 'servers' ? Math.min(1, f.reveal.u * 2) : f.reveal.phase === 'sandbox' || f.reveal.phase === 'chat' ? 0 : 1;
          root.style.setProperty('--field-edge', String(1 - edge * edge * (3 - 2 * edge)));
          // Hand-off: the camera starts with the window's slot exactly where
          // the window sat on the page, so nothing jumps.
          const cam = cameraAt(f.reveal.phase, f.reveal.u);
          const ctx = dotsOn ? canvas?.getContext('2d') : null;
          if (canvas && ctx) {
            const k = fitRef.current * (window.devicePixelRatio || 1);
            const bw = Math.max(1, Math.round((PAGE.w + 2 * DOT_BLEED) * k));
            const bh = Math.max(1, Math.round((PAGE.h + 2 * DOT_BLEED) * k));
            if (canvas.width !== bw || canvas.height !== bh) {
              canvas.width = bw;
              canvas.height = bh;
            }
            ctx.setTransform(k, 0, 0, k, DOT_BLEED * k, DOT_BLEED * k);
            drawDots(ctx, cam, { phase: f.reveal.phase, u: f.reveal.u, now, clock: (f.s - t.revealStart) / PLAY_SPEED, speech: narration.reveal.durationSeconds, veil: titleOpacity(t, f.s) * ENDING.veil }, PAGE.w, PAGE.h);
          }
          const tf = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`;
          back.style.transform = tf;
          front.style.transform = tf;
          win.style.transform = `translate(${WINDOW_PLACEMENT.x}px, ${WINDOW_PLACEMENT.y}px) scale(${WINDOW_PLACEMENT.scale})`;
          const u = f.reveal.phase === 'sandbox' ? Math.min(1, f.reveal.u / 0.6) : 1;
          pageOpacity = 1 - u * u * (3 - 2 * u);
        } else {
          front.style.opacity = '1';
          root.style.setProperty('--field-edge', '1');
          back.style.transform = '';
          front.style.transform = '';
          // The screen grows steadily with the web, to full size at the pull-back.
          win.style.transform = windowTransform(windowScale(f.s, t.pullbackStart));
        }
        root.style.setProperty('--page-o', pageOpacity.toFixed(3));
        root.style.setProperty('--page-dark', pageDarkness(f.s, t.pullbackStart).toFixed(4));
        // The closing title, once the last voice is done; clickable once it shows.
        const titleO = titleOpacity(t, f.s);
        root.style.setProperty('--title-o', titleO.toFixed(3));
        const titleOn = titleO > 0.5 ? 'on' : 'off';
        if (root.dataset.title !== titleOn) {
          root.dataset.title = titleOn;
          const card = root.querySelector<HTMLElement>('.fl-end-title');
          card?.toggleAttribute('inert', titleOn === 'off');
          card?.setAttribute('aria-hidden', String(titleOn === 'off'));
        }
        // Unread badges climb every frame, and explode at the reveal.
        const counts = inboxCounts(FLOW_ERAS, t, f.s);
        for (const el of root.querySelectorAll<HTMLElement>('[data-flow-count]')) {
          const n = counts[el.dataset.flowCount as InboxKind];
          const text = el.dataset.machine === 'true' ? `${el.dataset.label}=${n}` : formatCount(n);
          if (el.textContent !== text) el.textContent = text;
          const empty = n > 0 ? 'false' : 'true';
          if (el.dataset.empty !== empty) el.dataset.empty = empty;
        }
      }

      glitch(f.glitch, now);

      const next: Snap = {
        era: f.era,
        fired: f.fired,
        beat: f.beat,
        typingPost: f.typing?.postId ?? null,
        typingText: f.typing?.text ?? '',
        phase: f.reveal?.phase ?? null,
        behind: f.s >= t.revealStart,
        revealK: f.reveal ? Math.min(24, Math.floor(f.reveal.u * 25)) : 0,
        pings: f.pings.join(','),
      };
      if (!sameSnap(snapRef.current, next)) {
        snapRef.current = next;
        setSnap(next);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = timelineRef.current;
      let target = window.scrollY;
      if (playRef.current && t) {
        // One speed: the film runs on the narration's clock.
        autoRef.current = Math.min(t.total, autoRef.current + PLAY_SPEED * dt);
        window.scrollTo(0, autoRef.current);
        target = autoRef.current;
        if (autoRef.current >= t.total) {
          playRef.current = false;
          setPlaying(false);
        }
      }
      const shown = shownRef.current + (target - shownRef.current) * (1 - Math.exp(-dt / SMOOTHING));
      shownRef.current = playRef.current || Math.abs(target - shown) < 0.25 ? target : shown;
      if (t) apply(t, shownRef.current, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* -------------------------------- Input ---------------------------------- */

  useEffect(() => {
    const jump = (dir: 1 | -1, points: number[]) => {
      // From where the scroll is headed, not the smoothed position, so
      // repeated presses step one point at a time.
      const s = playRef.current ? shownRef.current : window.scrollY;
      const eps = 4;
      const next = dir > 0 ? points.find((p) => p > s + eps) : [...points].reverse().find((p) => p < s - eps);
      if (next !== undefined) seek(next);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Native controls own Space/Enter; the page shortcuts apply elsewhere.
      if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="slider"]')) return;
      const t = timelineRef.current;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          return;
        case 'g':
          toggle('guides');
          return;
        case 'w':
          toggle('wire');
          return;
        case 'c':
          toggle('cursor');
          return;
        case 'h':
          toggle('hud');
          return;
        case 'e':
          toggleDrawer();
          return;
        case 'Escape':
          setDrawer(false);
          return;
        case '[':
        case ']':
          if (t) jump(e.key === ']' ? 1 : -1, [...t.eraStarts, t.pullbackStart, t.revealStart]);
          return;
        case ',':
        case '.':
          if (t)
            jump(
              e.key === '.' ? 1 : -1,
              t.beats.filter((b) => b.kind === 'act').map((b) => b.s0),
            );
          return;
        default:
          if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) stopPlay();
      }
    };
    const onUser = () => stopPlay();
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchstart', onUser, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchstart', onUser);
    };
  }, [seek, stopPlay, toggle, togglePlay, toggleDrawer]);

  /* -------------------------------- Render --------------------------------- */

  const revealOn = snap.phase !== null;
  const era = FLOW_ERAS[snap.era];
  const drawerOpen = drawer && !revealOn;
  const jumpToEra = (k: number) => {
    const t = timelineRef.current;
    if (t) seek(t.eraStarts[k]);
  };

  return (
    <div
      ref={rootRef}
      data-flow-root=""
      // Page text turns light once the page has darkened past mid-grey.
      data-ink={revealOn || snap.era >= inkEra ? 'light' : 'dark'}
      className="bg-[#050507]"
      style={{ overflowAnchor: 'none' }}
    >
      <div aria-hidden style={{ height: timeline ? timeline.total + vh : vh * 30 }} />

      <div className="fixed inset-0 overflow-hidden bg-[#050507]">
        <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={{ ...stageStyle, maskImage: 'linear-gradient(to bottom, rgb(0 0 0 / var(--field-edge, 1)), #000 16%, #000 84%, rgb(0 0 0 / var(--field-edge, 1)))' }}>
          <div ref={worldBackRef} className="absolute left-0 top-0 origin-top-left">
            <FlowReveal visible={revealOn} phase={snap.phase} k={snap.revealK} calls={calls} />
          </div>
        </div>

        {/* The page: covers the reveal world until the hand-off fades it out. */}
        <PageBackdrop era={era} />

        <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={stageStyle}>
          <div ref={worldFrontRef} className="absolute left-0 top-0 origin-top-left">
            <div
              ref={windowRef}
              data-flow-window=""
              data-agent="off"
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: WINDOW.w,
                height: WINDOW.h,
                transform: windowTransform(WINDOW_GROWTH.start),
              }}
            >
              <WindowChrome narration={hasStarted && !revealOn ? FILM_TITLES[era.id] : ''} />
              <div
                ref={screenRef}
                data-flow-screen=""
                data-flow-guides={guides ? 'on' : 'off'}
                className="absolute overflow-hidden rounded-[12px]"
                style={{ left: 0, top: WINDOW.chrome, width: SCREEN.w, height: SCREEN.h, boxShadow: WINDOW_SHADOW }}
              >
                <ChromeBackground active={snap.era} tokens={tokens} />
                <div ref={viewportRef} data-flow-viewport="" className="overflow-hidden" style={box(SLOTS.feed)}>
                  <FlowFeed activeEra={era.id} revealing={revealOn} tokens={tokens} wire={wire} guides={guides && !revealOn} effects={effects} typing={typing} />
                </div>
                <ChromeLayers
                  active={snap.era}
                  revealStep={snap.phase ? REVEAL_PHASES.indexOf(snap.phase) * 25 + snap.revealK : -1}
                  tokens={tokens}
                  wire={wire}
                  effects={effects}
                  typing={typing}
                  pings={timeline?.pings ?? NO_PINGS}
                  activePings={activePings}
                />
                <div ref={glitchRef} aria-hidden className="pointer-events-none absolute inset-0 z-[45]">
                  {Array.from({ length: GLITCH_BARS }, (_, i) => (
                    <div key={i} className="fl-glitch-bar" />
                  ))}
                </div>
                <Guides visible={guides && !revealOn} readingLine={FLOW_TIMING.readingLine} focusLine={FLOW_TIMING.focusLine} />
                <Cursor visible={cursorOn} cursorRef={cursorRef} />
              </div>
            </div>
          </div>

          {/* Every session becomes a dot of light at the end (lib/flow/dots.ts). */}
          <canvas
            ref={dotsRef}
            aria-hidden
            className="pointer-events-none absolute"
            style={{ left: -DOT_BLEED, top: -DOT_BLEED, width: PAGE.w + 2 * DOT_BLEED, height: PAGE.h + 2 * DOT_BLEED, display: 'none', maskImage: 'linear-gradient(to bottom, transparent, #000 16%, #000 84%, transparent)' }}
          />
          <RevealOverlay phase={snap.phase} k={snap.revealK} />
        </div>

        <PageHeader era={era} drawerOpen={drawerOpen} onToggleDrawer={toggleDrawer} interactive={!revealOn} />
        <EndTitle />
        <FlowNarration
          era={era.id}
          revealing={snap.behind}
          playing={playing}
          enabled={voiceEnabled}
          position={shownRef}
          eraStart={(snap.behind ? timeline?.revealStart : timeline?.eraStarts[snap.era]) ?? 0}
        />
        <FlowMusic playing={playing} enabled={voiceEnabled} position={shownRef} cues={musicCuesFor} total={timeline?.total ?? 0} />
        <EraDrawer era={era} index={snap.era} open={drawerOpen} onClose={() => setDrawer(false)} onJump={jumpToEra} />
      </div>

      {hud ? (
        <FlowHud
          browserWidth={WINDOW.w * scale}
          readingNotes={drawerOpen}
          timeline={timeline}
          era={snap.era}
          behind={snap.behind}
          beatLabel={snap.phase ? `◎ ${snap.phase} · ${beatLabel}` : beatLabel}
          playing={playing}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
          guides={guides}
          wire={wire}
          cursor={cursorOn}
          playheadRef={playheadRef}
          readoutRef={readoutRef}
          onPlay={togglePlay}
          onSeek={seek}
          onToggle={toggle}
        />
      ) : (
        <button
          type="button"
          onClick={() => setHud(true)}
          className="fixed bottom-3 right-3 z-50 rounded-full bg-black/70 px-3 py-1.5 font-mono text-[11px] text-white/80"
        >
          Show player
        </button>
      )}
      <h1 className="sr-only">Dead Internet: feed flow lab</h1>
    </div>
  );
}
