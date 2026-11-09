/**
 * Page and reveal geometry for the /flow lab.
 *
 * The page is a simple background with a browser window in the middle; the
 * site (the 1280×800 feed screen) lives inside that window. Everything is
 * designed at PAGE size and scaled to fit the viewport.
 *
 * The reveal world is a field of AI-chat "computer use" sessions. A 5×5 block
 * of them is built in full; around it, a repeating pattern stands in for
 * thousands more. The center tile's computer panel has an empty slot: the
 * browser window lands there.
 *
 * Before the reveal, the camera is set so that slot sits exactly where the
 * browser window sits on the page, so the hand-off is seamless. The reveal
 * then pulls back in steps:
 *
 * - `sandbox`  page browser → the whole chat session it lives in
 * - `chat`     hold on the chat (the "user" turns out to be a scheduler)
 * - `servers`  chat → the 5×5 wall of sessions
 * - `farm`     wall → the field it sits in
 * - `dots`, `signal`   every session becomes a dot of light; the camera
 *              pulls further back so the dots pack tight enough to draw symbols
 *              (see dots.ts, signal.ts)
 * - `end`      the screen fades out with the music, still creeping out
 *
 * Each pull-back is a pure zoom about one fixed point, so nothing slides
 * sideways in a way the eye reads as panning, and every phase starts exactly
 * where the previous one ended.
 */
import { FLOW_TIMING, type RevealPhase } from './timeline';

/** The page, in design px. */
export const PAGE = { w: 1600, h: 1020 } as const;

/** The browser window: 42px of compact browser chrome, then the 1280×800 site, edge to edge. */
export const WINDOW = { w: 1280, h: 842, chrome: 42 } as const;

/** Where the browser window sits on the page. */
export const PAGE_WINDOW = { x: (PAGE.w - WINDOW.w) / 2, y: 64 } as const;

export const REVEAL_GEOMETRY = {
  tile: { w: 1280, h: 800 },
  gap: 96,
  cols: 5,
  rows: 5,
  center: { col: 2, row: 2 },
  /** Where the browser window sits inside a session tile (its computer panel). */
  slot: { x: 460, y: 112, w: 800, h: (800 * WINDOW.h) / WINDOW.w },
} as const;

const G = REVEAL_GEOMETRY;
const VIEW = { x: PAGE.w / 2, y: PAGE.h / 2 };

export function tileOrigin(col: number, row: number) {
  return { x: col * (G.tile.w + G.gap), y: row * (G.tile.h + G.gap) };
}

export const GRID_SIZE = {
  w: G.cols * G.tile.w + (G.cols - 1) * G.gap,
  h: G.rows * G.tile.h + (G.rows - 1) * G.gap,
};

const centerTile = tileOrigin(G.center.col, G.center.row);

/** The browser window's placement in world coords once the reveal runs. */
export const WINDOW_PLACEMENT = {
  x: centerTile.x + G.slot.x,
  y: centerTile.y + G.slot.y,
  scale: G.slot.w / WINDOW.w,
};

type Pt = { x: number; y: number };

const z0 = 1 / WINDOW_PLACEMENT.scale;
const F0: Pt = { x: WINDOW_PLACEMENT.x + G.slot.w / 2, y: WINDOW_PLACEMENT.y + G.slot.h / 2 };
const C0: Pt = { x: PAGE_WINDOW.x + WINDOW.w / 2, y: PAGE_WINDOW.y + WINDOW.h / 2 };
/** Center of the live tile, which is also the center of the grid. */
const F1: Pt = { x: centerTile.x + G.tile.w / 2, y: centerTile.y + G.tile.h / 2 };
const z1 = Math.min(PAGE.w / G.tile.w, PAGE.h / G.tile.h) * 0.86;
const z2 = Math.min(PAGE.w / GRID_SIZE.w, PAGE.h / GRID_SIZE.h) * 0.94;
const z3 = z2 / 6;
/** After the farm the camera drifts out a little over the rows of dots... */
const DRIFT: Partial<Record<RevealPhase, [number, number]>> = {
  dots: [z3, z3 * 0.97],
};
/**
 * ...then, once the symbols start, pulls further back so more sessions fill
 * the screen: the dots pack tighter and the symbols they draw get sharper.
 * It keeps creeping out to the end.
 */
const PUSH = { from: z3 * 0.97, to: z3 * 0.55, creep: 0.97, share: 0.12 };
/** The farthest the camera ever gets: the end of the film. */
const z4 = PUSH.to * PUSH.creep;

/**
 * The pattern field around the grid: big enough to fill the page at the
 * farthest zoom, aligned so its repeats land exactly on the grid's tiles.
 */
const FIELD_W = Math.ceil((PAGE.w / z4) * 1.15);
const FIELD_H = Math.ceil((PAGE.h / z4) * 1.15);
export const FIELD = {
  x: F1.x - FIELD_W / 2,
  y: F1.y - FIELD_H / 2,
  w: FIELD_W,
  h: FIELD_H,
  /** One repeat: a tile plus the gap after it. */
  pitch: { x: G.tile.w + G.gap, y: G.tile.h + G.gap },
};

export interface Camera {
  z: number;
  tx: number;
  ty: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * World transform for a zoom that takes world point Fa (at scale za) from
 * screen point Ca to world point Fb (at scale zb) at screen point Cb, about
 * the one fixed point that makes that a pure zoom.
 */
function zoom(Fa: Pt, za: number, Ca: Pt, Fb: Pt, zb: number, Cb: Pt, t: number): Camera {
  const z = Math.exp(Math.log(za) + (Math.log(zb) - Math.log(za)) * t);
  const P = {
    x: (Fa.x * za - Fb.x * zb - Ca.x + Cb.x) / (za - zb),
    y: (Fa.y * za - Fb.y * zb - Ca.y + Cb.y) / (za - zb),
  };
  const Ps = { x: Ca.x - (Fa.x - P.x) * za, y: Ca.y - (Fa.y - P.y) * za };
  return { z, tx: Ps.x - P.x * z, ty: Ps.y - P.y * z };
}

export function cameraAt(phase: RevealPhase, u: number): Camera {
  switch (phase) {
    case 'sandbox':
      return zoom(F0, z0, C0, F1, z1, VIEW, ease(u));
    case 'chat':
      return { z: z1, tx: VIEW.x - F1.x * z1, ty: VIEW.y - F1.y * z1 };
    case 'servers':
    case 'farm': {
      // One continuous pullback through the grid and field. The phase boundary
      // changes detail level, not the camera's velocity.
      const { servers, farm } = FLOW_TIMING.reveal;
      const t = phase === 'servers' ? u * servers : servers + u * farm;
      return zoom(F1, z1, VIEW, F1, z3, VIEW, ease(t / (servers + farm)));
    }
    case 'signal': {
      // A pull back over the first part of the phase, then a slow creep.
      const t = 0.85 * ease(Math.min(1, u / PUSH.share)) + 0.15 * u;
      return zoom(F1, PUSH.from, VIEW, F1, PUSH.to, VIEW, t);
    }
    case 'end':
      return zoom(F1, PUSH.to, VIEW, F1, PUSH.to * PUSH.creep, VIEW, u);
    default: {
      // Keep drifting out, slowly, so no frame is ever quite still.
      const [a, b] = DRIFT[phase] ?? [z4, z4 * 0.99];
      return zoom(F1, a, VIEW, F1, b, VIEW, u);
    }
  }
}

/**
 * The screen grows with the web: small at first (MySpace-era screens were
 * lower resolution) and steadily larger era by era, reaching full size just
 * as the camera starts to pull back, so the hand-off to the reveal is exact.
 * The growth rate is constant until the last `WINDOW_GROWTH.landing` of the
 * way, where it eases to a stop.
 */
export const WINDOW_GROWTH = { start: 0.55, landing: 0.08 } as const;

export function windowScale(s: number, pullbackStart: number): number {
  const { start, landing } = WINDOW_GROWTH;
  if (pullbackStart <= 0) return 1;
  const x = Math.min(1, Math.max(0, s / pullbackStart));
  // Constant speed v, then a linear slowdown to zero over the landing.
  const v = 1 / (1 - landing / 2);
  const a = 1 - landing;
  const p = x <= a ? v * x : v * a + v * (x - a) - (v * (x - a) ** 2) / (2 * landing);
  return start + (1 - start) * Math.min(1, p);
}

/** The window's place on the page at scale `g`, grown about the screen's centre. */
export function windowTransform(g: number): string {
  const cx = WINDOW.w / 2;
  const cy = WINDOW.chrome + (WINDOW.h - WINDOW.chrome) / 2;
  return `translate(${PAGE_WINDOW.x + cx * (1 - g)}px, ${PAGE_WINDOW.y + cy * (1 - g)}px) scale(${g})`;
}
