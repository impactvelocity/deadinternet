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
 *     canvas               dots, globe, last dot
 *     RevealOverlay        vignette, session counter, end card
 *   PageHeader             full-width header: logo, era name, links (fades at the reveal)
 *   EraDrawer              full-height drawer: what was happening online in this era
 *   FlowHud                floating play bar
 *
 * Until the reveal the window sits at PAGE_WINDOW on the page. At the reveal
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
import { FLOW_ERAS, wireTokens } from '@/data/flow/eras';
import { FLOW_POSTS } from '@/data/flow/posts';
import type { EraTokens, FlowEraId } from '@/data/flow/types';
import { cameraAt, PAGE, PAGE_WINDOW, WINDOW, WINDOW_PLACEMENT } from '@/lib/flow/camera';
import { DOT_PHASES, drawDots } from '@/lib/flow/dots';
import { measureFlow } from '@/lib/flow/measure';
import {
  compileTimeline,
  deriveEffects,
  FLOW_TIMING,
  NO_EFFECTS,
  sampleTimeline,
  type PingSlot,
  type RevealPhase,
  type Timeline,
} from '@/lib/flow/timeline';
import { ChromeBackground, ChromeLayers, Guides } from './FlowChrome';
import { FlowFeed } from './FlowFeed';
import { FlowHud, HUD_HEIGHT } from './FlowHud';
import { EraDrawer, HEADER_H, PageBackdrop, PageHeader } from './FlowPage';

/** Least room kept above and below the browser window, in page units. */
const PAGE_GAP = 20;
/** Room kept free at the bottom for the floating play bar (it sits 16px up). */
const PLAY_BAR_ROOM = HUD_HEIGHT + 16;
import { WINDOW_SHADOW, WindowChrome } from './FlowWindow';
import { FlowReveal, RevealOverlay, type ToolCall } from './FlowReveal';
import { box, SCREEN, SLOTS } from './parts';

/** Autoplay speed at 1×, in story px per second. */
const PLAY_SPEED = 640;
const SPEEDS = [0.5, 1, 2, 4];
/** Scroll smoothing time constant (s). */
const SMOOTHING = 0.09;

interface Snap {
  era: number;
  fired: number;
  beat: number;
  typingPost: string | null;
  typingText: string;
  phase: RevealPhase | null;
  /** Step within the reveal phase, 0..24 (drives the streaming chat). */
  revealK: number;
  /** Active notification indices, comma-joined. */
  pings: string;
  pingsSeen: number;
}

const INITIAL_SNAP: Snap = {
  era: 0,
  fired: 0,
  beat: 0,
  typingPost: null,
  typingText: '',
  phase: null,
  revealK: 0,
  pings: '',
  pingsSeen: 0,
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
  a.revealK === b.revealK &&
  a.pings === b.pings &&
  a.pingsSeen === b.pingsSeen;

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
    if (b.action.type === 'comment') {
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
  const [speedIndex, setSpeedIndex] = useState(1);
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
  const fitY = HEADER_H + band / 2 - (PAGE_WINDOW.y + WINDOW.h / 2) * scale;
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
  const speedRef = useRef(SPEEDS[1]);

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
  const activePings = useMemo(() => (snap.pings ? snap.pings.split(',').map(Number) : []), [snap.pings]);

  const beat = timeline?.beats[snap.beat];
  const beatLabel = !beat
    ? 'measuring…'
    : beat.kind === 'act'
      ? `▸ ${beat.label}`
      : beat.kind === 'hold'
        ? `‖ ${beat.label}`
        : beat.kind === 'reveal'
          ? `◎ reveal: ${beat.phase}`
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
    setPlaying(true);
  }, [stopPlay]);

  const seek = useCallback(
    (s: number) => {
      stopPlay();
      window.scrollTo(0, Math.max(0, Math.ceil(s)));
    },
    [stopPlay],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => {
      const next = (i + 1) % SPEEDS.length;
      speedRef.current = SPEEDS[next];
      return next;
    });
  }, []);

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
      if (playheadRef.current) playheadRef.current.style.left = `${(f.s / t.total) * 100}%`;
      if (readoutRef.current) readoutRef.current.textContent = `${Math.round(f.s)}`;

      const back = worldBackRef.current;
      const front = worldFrontRef.current;
      const win = windowRef.current;
      const root = rootRef.current;
      if (back && front && win && root) {
        win.dataset.agent = f.reveal ? 'on' : 'off';
        let pageOpacity = 1;
        const canvas = dotsRef.current;
        const dotsOn = !!f.reveal && DOT_PHASES.includes(f.reveal.phase);
        if (canvas) canvas.style.display = dotsOn ? 'block' : 'none';
        // Once every session is a dot, nothing behind the canvas needs drawing.
        const night = dotsOn && !(f.reveal?.phase === 'dots' && f.reveal.u < 0.5);
        back.style.visibility = night ? 'hidden' : '';
        front.style.visibility = night ? 'hidden' : '';
        if (f.reveal) {
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
            drawDots(ctx, cam, { phase: f.reveal.phase, u: f.reveal.u, now }, PAGE.w, PAGE.h);
          }
          const tf = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`;
          back.style.transform = tf;
          front.style.transform = tf;
          win.style.transform = `translate(${WINDOW_PLACEMENT.x}px, ${WINDOW_PLACEMENT.y}px) scale(${WINDOW_PLACEMENT.scale})`;
          const u = f.reveal.phase === 'sandbox' ? Math.min(1, f.reveal.u / 0.22) : 1;
          pageOpacity = 1 - u * u * (3 - 2 * u);
        } else {
          back.style.transform = '';
          front.style.transform = '';
          win.style.transform = `translate(${PAGE_WINDOW.x}px, ${PAGE_WINDOW.y}px)`;
        }
        root.style.setProperty('--page-o', pageOpacity.toFixed(3));
      }

      glitch(f.glitch, now);

      const next: Snap = {
        era: f.era,
        fired: f.fired,
        beat: f.beat,
        typingPost: f.typing?.postId ?? null,
        typingText: f.typing?.text ?? '',
        phase: f.reveal?.phase ?? null,
        revealK: f.reveal ? Math.min(24, Math.floor(f.reveal.u * 25)) : 0,
        pings: f.pings.join(','),
        pingsSeen: f.pingsSeen,
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
        autoRef.current = Math.min(t.total, autoRef.current + PLAY_SPEED * speedRef.current * dt);
        window.scrollTo(0, autoRef.current);
        target = autoRef.current;
        if (autoRef.current >= t.total) {
          playRef.current = false;
          setPlaying(false);
        }
      }
      const shown = shownRef.current + (target - shownRef.current) * (1 - Math.exp(-dt / SMOOTHING));
      shownRef.current = Math.abs(target - shown) < 0.25 ? target : shown;
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
          setDrawer((v) => !v);
          return;
        case 'Escape':
          setDrawer(false);
          return;
        case '[':
        case ']':
          if (t) jump(e.key === ']' ? 1 : -1, [...t.eraArrivals, t.revealStart]);
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
  }, [seek, stopPlay, toggle, togglePlay]);

  /* -------------------------------- Render --------------------------------- */

  const revealOn = snap.phase !== null;
  const era = FLOW_ERAS[snap.era];
  const drawerOpen = drawer && !revealOn;
  const jumpToEra = (k: number) => {
    const t = timelineRef.current;
    if (t) seek(t.eraArrivals[k]);
  };

  return (
    <div ref={rootRef} data-flow-root="" className="bg-[#101014]" style={{ overflowAnchor: 'none' }}>
      <div aria-hidden style={{ height: timeline ? timeline.total + vh : vh * 30 }} />

      <div className="fixed inset-0 overflow-hidden bg-[#101014]">
        <div className="absolute left-0 top-0 origin-top-left overflow-hidden" style={stageStyle}>
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
              className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[12px]"
              style={{
                width: WINDOW.w,
                height: WINDOW.h,
                transform: `translate(${PAGE_WINDOW.x}px, ${PAGE_WINDOW.y}px)`,
                boxShadow: WINDOW_SHADOW,
              }}
            >
              <WindowChrome title={era.tab.title} url={era.tab.url} />
              <div
                ref={screenRef}
                data-flow-screen=""
                data-flow-guides={guides ? 'on' : 'off'}
                className="absolute overflow-hidden"
                style={{ left: 0, top: WINDOW.chrome, width: SCREEN.w, height: SCREEN.h }}
              >
                <ChromeBackground active={snap.era} tokens={tokens} />
                <div ref={viewportRef} data-flow-viewport="" className="overflow-hidden" style={box(SLOTS.feed)}>
                  <FlowFeed tokens={tokens} wire={wire} guides={guides && !revealOn} effects={effects} typing={typing} />
                </div>
                <ChromeLayers
                  active={snap.era}
                  tokens={tokens}
                  wire={wire}
                  effects={effects}
                  pings={timeline?.pings ?? NO_PINGS}
                  activePings={activePings}
                  pingsSeen={snap.pingsSeen}
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
            style={{ left: -DOT_BLEED, top: -DOT_BLEED, width: PAGE.w + 2 * DOT_BLEED, height: PAGE.h + 2 * DOT_BLEED, display: 'none' }}
          />
          <RevealOverlay phase={snap.phase} k={snap.revealK} />
        </div>

        <PageHeader era={era} drawerOpen={drawerOpen} onToggleDrawer={() => setDrawer((v) => !v)} interactive={!revealOn} />
        <EraDrawer era={era} index={snap.era} open={drawerOpen} onClose={() => setDrawer(false)} onJump={jumpToEra} />
      </div>

      {hud ? (
        <FlowHud
          timeline={timeline}
          era={snap.era}
          beatLabel={beatLabel}
          playing={playing}
          speed={SPEEDS[speedIndex]}
          guides={guides}
          wire={wire}
          cursor={cursorOn}
          playheadRef={playheadRef}
          readoutRef={readoutRef}
          onPlay={togglePlay}
          onSpeed={cycleSpeed}
          onSeek={seek}
          onToggle={toggle}
        />
      ) : (
        <button
          type="button"
          onClick={() => setHud(true)}
          className="fixed bottom-3 right-3 z-50 rounded-full bg-black/70 px-3 py-1.5 font-mono text-[11px] text-white/80"
        >
          lab ⌃
        </button>
      )}
      <h1 className="sr-only">Dead Internet: feed flow lab</h1>
    </div>
  );
}
