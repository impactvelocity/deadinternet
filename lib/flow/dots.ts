/**
 * The last beat of the reveal: every session becomes a dot of light, and the
 * dots become a screen.
 *
 * - `dots`    each session's browser shrinks into a dot (quickly), then the
 *             rows of dots twinkle
 * - `signal`  the camera pulls back so the small round dots pack tighter, and
 *             they light up as symbols nobody is there to see (see signal.ts)
 * - `end`     the last symbol fades out with the music
 *
 * Scroll position drives every step, so scrolling back undoes it. The twinkle
 * and the flicker also move with time, so a held frame is still alive.
 *
 * Drawn on a canvas in page space (design px) on top of the reveal world,
 * using the same camera, so the first dots sit exactly where their sessions
 * were.
 */
import { REVEAL_GEOMETRY as G, type Camera } from './camera';
import { maskOf, sampleMask, signalAt } from './signal';
import { DOT_MORPH, type RevealPhase } from './timeline';

export const DOT_PHASES: readonly RevealPhase[] = ['dots', 'signal', 'end'];

const PITCH = { x: G.tile.w + G.gap, y: G.tile.h + G.gap };
const TILE_C = { x: G.tile.w / 2, y: G.tile.h / 2 };
const SLOT_C = { x: G.slot.x + G.slot.w / 2, y: G.slot.y + G.slot.h / 2 };
/** Share of the dots phase spent shrinking sessions into dots. */
const MORPH = DOT_MORPH;
const DOT_RGB = '226, 233, 255';
/** Dot size on the final screen, in page px (about 4px on screen). */
const SIGNAL_DOT = 4.6;
/** How much of the red/blue fringe shows in a symbol's colour (0 = pure white light). */
const SIGNAL_TINT = 0.35;
/** Matches the stage background, so the field fades into the same night. */
const NIGHT = '5, 5, 7';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function noise(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Slow variations in light, interpolated so the field never strobes. */
function twinkle(seed: number, now: number): number {
  const clock = now / 1100 + noise(seed) * 11;
  const slot = Math.floor(clock);
  return 0.35 + 0.55 * lerp(noise(seed * 7.31 + slot * 1.7), noise(seed * 7.31 + (slot + 1) * 1.7), smooth(clock - slot));
}

export interface DotState {
  phase: RevealPhase;
  /** Progress through the phase, 0..1. */
  u: number;
  /** Clock in ms, for the twinkle and flicker. */
  now: number;
  /** Seconds since "Behind the feed" (drives the symbols). */
  clock?: number;
  /** Seconds after "Behind the feed" when the voice stops. */
  speech?: number;
  /** 0..1: dim the screen behind the closing title. */
  veil?: number;
}

/* ------------------------------- Grid dots -------------------------------- */

/** Brightness of one session dot during `dots`: bright as it forms, then twinkling. */
export function gridLight(u: number, now: number, seed: number): number {
  return lerp(0.9, twinkle(seed, now), smooth((u - MORPH) / 0.25));
}

/* --------------------------------- Draw ----------------------------------- */

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= 0.01) return;
  if (a > 0.6) {
    ctx.fillStyle = `rgba(${DOT_RGB}, ${(a - 0.6) * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(${DOT_RGB}, ${a})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Every session dot on screen, in page px, at this camera. */
function gridDots(cam: Camera, W: number, H: number) {
  const { z, tx, ty } = cam;
  const out: { sx: number; sy: number; ox: number; oy: number; seed: number }[] = [];
  const col0 = Math.floor((-tx / z - G.tile.w) / PITCH.x) - 1;
  const col1 = Math.ceil((W - tx) / z / PITCH.x) + 1;
  const row0 = Math.floor((-ty / z - G.tile.h) / PITCH.y) - 1;
  const row1 = Math.ceil((H - ty) / z / PITCH.y) + 1;
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const ox = col * PITCH.x;
      const oy = row * PITCH.y;
      out.push({ sx: (ox + TILE_C.x) * z + tx, sy: (oy + TILE_C.y) * z + ty, ox, oy, seed: col * 7919 + row * 104729 });
    }
  }
  return out;
}

/** Draw this frame. `ctx` is already scaled to page px; W × H is the page. */
export function drawDots(ctx: CanvasRenderingContext2D, cam: Camera, st: DotState, W: number, H: number) {
  // Paint a little past the page so no half-covered edge pixel lets the
  // field behind show through.
  ctx.clearRect(-8, -8, W + 16, H + 16);
  const morph = st.phase === 'dots' ? smooth(st.u / MORPH) : 1;
  ctx.fillStyle = `rgba(${NIGHT}, ${morph})`;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  const { z } = cam;
  const dotD = Math.max(3, PITCH.x * z * 0.11);

  if (st.phase === 'dots') {
    for (const g of gridDots(cam, W, H)) {
      const a = gridLight(st.u, st.now, g.seed);
      if (morph < 1) {
        // The session's browser shrinks into a dot at the tile's center.
        const fromX = (g.ox + SLOT_C.x) * z + cam.tx;
        const fromY = (g.oy + SLOT_C.y) * z + cam.ty;
        const w = lerp(G.slot.w * z, dotD, morph);
        const h = lerp(G.slot.h * z, dotD, morph);
        ctx.fillStyle = `rgba(${DOT_RGB}, ${smooth(morph * 2.5) * a})`;
        ctx.beginPath();
        ctx.roundRect(lerp(fromX, g.sx, morph) - w / 2, lerp(fromY, g.sy, morph) - h / 2, w, h, lerp(12 * z, dotD / 2, morph));
        ctx.fill();
      } else {
        dot(ctx, g.sx, g.sy, dotD / 2, a);
      }
    }
    return;
  }

  // `signal` and `end`: the same small round dots, now showing symbols.
  const frame = signalAt(st.clock ?? 0, st.speech ?? Infinity);
  const main = frame.glyph && frame.level > 0 ? maskOf(frame.glyph) : null;
  const flash = frame.flash ? maskOf(frame.flash) : null;
  const settle = st.phase === 'signal' ? smooth(st.u / 0.12) : 1;
  // Dots stay small and round (about 4px on screen) however close the camera gets.
  const size = lerp(dotD, SIGNAL_DOT, settle);
  // The red and blue channels slip a little against the green, re-slipping every 90ms.
  const tick = Math.floor(st.now / 90);
  const split = PITCH.x * z * (0.1 + 0.12 * noise(tick * 1.3));
  // The last note takes the screen to black.
  const fade = (st.phase === 'end' ? 1 - smooth(st.u) : 1) * (1 - (st.veil ?? 0));
  // Each dot averages the symbol over its share of the screen, for soft shading.
  const radius = PITCH.y * z * 0.4;
  const glows = new Map<string, Path2D>();
  const dots = new Map<string, Path2D>();
  for (const g of gridDots(cam, W, H)) {
    // The rows keep a faint twinkle, dimming as the symbols take over.
    const idle = twinkle(g.seed, st.now) * lerp(0.9, 0.3, settle);
    const hum = 0.85 + 0.15 * noise(g.seed + tick);
    let r = 0;
    let gr = 0;
    let b = 0;
    if (main) {
      r = sampleMask(main, g.sx - split, g.sy, radius) * frame.level * hum;
      gr = sampleMask(main, g.sx, g.sy, radius) * frame.level * hum;
      b = sampleMask(main, g.sx + split, g.sy, radius) * frame.level * hum;
    }
    if (flash) {
      const f = sampleMask(flash, g.sx, g.sy, radius) * 0.75;
      r = Math.max(r, f);
      gr = Math.max(gr, f);
      b = Math.max(b, f);
    }
    // Mostly white light, with only a hint of the colour fringe.
    const lum = (r + gr + b) / 3;
    const tint = (c: number) => lum + (c - lum) * SIGNAL_TINT;
    const light = Math.min(1, Math.max(idle * 0.55, lum * 0.9));
    if (light * fade < 0.01) continue;
    const R = Math.min(255, 226 * idle * 0.55 + 240 * tint(r)) * fade;
    const Gc = Math.min(255, 233 * idle * 0.55 + 240 * tint(gr)) * fade;
    const B = Math.min(255, 255 * idle * 0.55 + 250 * tint(b)) * fade;
    const rgb = `${step(R)},${step(Gc)},${step(B)}`;
    // A faint glow around the brightest dots.
    if (lum > 0.45) addCircle(glows, `rgba(${rgb},${(Math.round((lum - 0.45) * 0.18 * fade * 50) / 50).toFixed(2)})`, g.sx, g.sy, size * 1.8);
    addCircle(dots, `rgb(${rgb})`, g.sx, g.sy, size / 2);
  }
  // Thousands of dots, but only a few dozen colours: one fill per colour.
  for (const [style, path] of glows) {
    ctx.fillStyle = style;
    ctx.fill(path);
  }
  for (const [style, path] of dots) {
    ctx.fillStyle = style;
    ctx.fill(path);
  }
}

/** Colour channels rounded to steps of 8, so dots can share a fill. */
const step = (v: number) => Math.round(v / 8) * 8;

function addCircle(paths: Map<string, Path2D>, style: string, x: number, y: number, r: number) {
  let path = paths.get(style);
  if (!path) {
    path = new Path2D();
    paths.set(style, path);
  }
  path.moveTo(x + r, y);
  path.arc(x, y, r, 0, Math.PI * 2);
}
