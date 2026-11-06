/**
 * The last beat of the reveal: every session becomes a dot of light, the dots
 * become the world, and the world collapses into one dot.
 *
 * - `dots`      each session's browser shrinks into a dot (quickly), then the
 *               dots twinkle
 * - `globe`     the dots swirl into a spinning 3D globe made of dots: land
 *               bright, ocean faint, the far side dim through the sphere;
 *               waves of light sweep around it
 * - `collapse`  the globe spins faster and every dot falls into the center,
 *               with one last ripple as it lands
 * - `blink`     a single dot, blinking
 * - `end`       the dot rises above the headline and keeps blinking
 *
 * Scroll position drives every step, so scrolling back undoes it. The twinkle,
 * the spin, the waves and the blink also move with time, so a held frame is
 * still alive.
 *
 * Drawn on a canvas in page space (design px) on top of the reveal world,
 * using the same camera, so the first dots sit exactly where their sessions
 * were.
 */
import { REVEAL_GEOMETRY as G, type Camera } from './camera';
import { isLand } from './land';
import type { RevealPhase } from './timeline';

export const DOT_PHASES: readonly RevealPhase[] = ['dots', 'globe', 'collapse', 'blink', 'end'];

const PITCH = { x: G.tile.w + G.gap, y: G.tile.h + G.gap };
const TILE_C = { x: G.tile.w / 2, y: G.tile.h / 2 };
const SLOT_C = { x: G.slot.x + G.slot.w / 2, y: G.slot.y + G.slot.h / 2 };
/** Share of the dots phase spent shrinking sessions into dots. */
const MORPH = 0.3;
const DOT_RGB = '226, 233, 255';
/** Matches the stage background, so the field fades into the same night. */
const NIGHT = '16, 16, 20';

/** Globe size and pose. */
const GLOBE_R = 330;
const GLOBE_POINTS = 3200;
const TILT = (-18 * Math.PI) / 180;
/** Turned so the Atlantic faces the viewer first. */
const SPIN0 = 0.6;
/** How far the last dot rises above the headline in `end`. */
const RISE = 150;

const D2R = Math.PI / 180;
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

/** On/off blink, each dot on its own clock. */
function twinkle(seed: number, now: number): number {
  const slot = Math.floor(now / 170 + noise(seed) * 11);
  return noise(seed * 7.31 + slot * 1.7) > 0.42 ? 1 : 0.2;
}

export interface DotState {
  phase: RevealPhase;
  /** Progress through the phase, 0..1. */
  u: number;
  /** Clock in ms, for the twinkle, spin, waves and blink. */
  now: number;
}

/* ------------------------------- Grid dots -------------------------------- */

/** Brightness of one session dot during `dots`: bright as it forms, then twinkling. */
export function gridLight(u: number, now: number, seed: number): number {
  return lerp(0.9, twinkle(seed, now), smooth((u - MORPH) / 0.25));
}

/* --------------------------------- Globe ---------------------------------- */

export interface GlobePoint {
  lat: number;
  lon: number;
  land: boolean;
  seed: number;
}

let globe: { all: GlobePoint[]; land: GlobePoint[]; sea: GlobePoint[] } | null = null;

/** Evenly spread points on the sphere (Fibonacci lattice), tagged land or sea. */
export function globePoints() {
  if (globe) return globe;
  const all: GlobePoint[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < GLOBE_POINTS; i++) {
    const y = 1 - (2 * (i + 0.5)) / GLOBE_POINTS;
    const lat = Math.asin(y) / D2R;
    let lon = ((i * golden) % (2 * Math.PI)) / D2R;
    if (lon > 180) lon -= 360;
    all.push({ lat, lon, land: isLand(lat, lon), seed: i * 31 + 7 });
  }
  globe = { all, land: all.filter((p) => p.land), sea: all.filter((p) => !p.land) };
  return globe;
}

/** Rotation of the globe: a slow constant spin, nudged by scroll, whipped up in the collapse. */
function spinAt(st: DotState): number {
  const scroll = st.phase === 'globe' ? st.u * 1.1 : st.phase === 'collapse' ? 1.1 + st.u * st.u * 7 : 0;
  return SPIN0 - st.now / 9000 + scroll;
}

/** Screen position and depth (-1 back … 1 front) of a point on the spinning, tilted globe. */
function project(p: GlobePoint, spin: number, cx: number, cy: number) {
  const lat = p.lat * D2R;
  const lon = p.lon * D2R + spin;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  return { x: cx + GLOBE_R * x, y: cy - GLOBE_R * y2, z: z2, lon };
}

/** Land glows, ocean barely shows; the far side is dimmed through the sphere. */
function globeLight(p: GlobePoint, z: number): number {
  const front = z > 0;
  if (p.land) return front ? 0.95 : 0.1;
  return front ? 0.16 : 0.04;
}

/** Where a globe dot is on its way into the center during `collapse` (0 = on the globe, 1 = center). */
export function collapseAt(u: number, seed: number): number {
  const t = clamp01((u - noise(seed) * 0.3) / 0.6);
  return t ** 2.2;
}

/* ------------------------------ The last dot ------------------------------ */

/** The single dot left at the end: brightness, and how far it has risen. */
export function lastDot(st: DotState): { a: number; rise: number } {
  const pulse = 0.5 + 0.5 * Math.tanh(4 * Math.sin(st.now / 320));
  switch (st.phase) {
    case 'collapse':
      return { a: smooth((st.u - 0.45) / 0.4), rise: 0 };
    case 'blink':
      return { a: lerp(1, 0.12 + 0.88 * pulse, smooth(st.u / 0.25)), rise: 0 };
    case 'end':
      return { a: 0.12 + 0.88 * pulse, rise: RISE * smooth(st.u / 0.45) };
    default:
      return { a: 0, rise: 0 };
  }
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

  const cx = W / 2;
  const cy = H / 2;
  const { z } = cam;
  const dotD = Math.max(4, PITCH.x * z * 0.2);

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

  const spin = spinAt(st);
  const { all, land, sea } = globePoints();

  if (st.phase === 'globe') {
    const appear = smooth((st.u - 0.12) / 0.45);
    const waves = smooth((st.u - 0.5) / 0.2);
    // The globe, back half first so the front draws over it.
    for (const pass of [0, 1]) {
      for (const p of all) {
        const q = project(p, spin, cx, cy);
        if (q.z > 0 !== (pass === 1)) continue;
        const sweep = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(q.lon * 3 + st.now / 420));
        const a = globeLight(p, q.z) * appear * lerp(1, sweep, waves);
        dot(ctx, q.x, q.y, (p.land ? 2.4 : 1.6) * (0.55 + 0.225 * (q.z + 1)), a);
      }
    }
    // The session dots swirl in and dissolve into it.
    for (const g of gridDots(cam, W, H)) {
      const d = noise(g.seed);
      const t = smooth((st.u - d * 0.2) / 0.5);
      if (t >= 1) continue;
      const pool = d < 0.6 ? land : sea;
      const q = project(pool[Math.floor(noise(g.seed * 3.7) * pool.length)], spin, cx, cy);
      const curl = Math.sin(Math.PI * t) * 60 * (d < 0.5 ? 1 : -1);
      const dx = q.x - g.sx;
      const dy = q.y - g.sy;
      const len = Math.hypot(dx, dy) || 1;
      const x = lerp(g.sx, q.x, t) - (dy / len) * curl;
      const y = lerp(g.sy, q.y, t) + (dx / len) * curl;
      dot(ctx, x, y, lerp(dotD / 2, 2, t), twinkle(g.seed, st.now) * (1 - t));
    }
    return;
  }

  if (st.phase === 'collapse') {
    for (const pass of [0, 1]) {
      for (const p of all) {
        const q = project(p, spin, cx, cy);
        if (q.z > 0 !== (pass === 1)) continue;
        const k = collapseAt(st.u, p.seed);
        if (k >= 1) continue;
        dot(ctx, lerp(q.x, cx, k), lerp(q.y, cy, k), (p.land ? 2.4 : 1.6) * (1 - 0.6 * k), globeLight(p, q.z) * (1 - 0.2 * k));
      }
    }
    // One last ripple as everything lands.
    if (st.u > 0.8) {
      const r = smooth((st.u - 0.8) / 0.2);
      ctx.strokeStyle = `rgba(${DOT_RGB}, ${0.55 * (1 - r)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + r * 460, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const last = lastDot(st);
  dot(ctx, cx, cy - last.rise, 5, last.a);
}
