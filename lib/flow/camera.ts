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
 * - `dots`, `globe`, `collapse`, `blink`   every session becomes a dot of
 *              light, the dots become a globe, it collapses to one blinking
 *              dot (see dots.ts); the camera keeps drifting slowly out
 * - `end`      the end card, still drifting
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
/** After the farm the camera keeps drifting out, a little per phase. */
const DRIFT: Partial<Record<RevealPhase, [number, number]>> = {
  dots: [z3, z3 * 0.97],
  globe: [z3 * 0.97, z3 * 0.94],
  collapse: [z3 * 0.94, z3 * 0.91],
  blink: [z3 * 0.91, z3 * 0.88],
  end: [z3 * 0.88, z3 * 0.86],
};
const z4 = z3 * 0.86;

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
    default: {
      // Keep drifting out, slowly, so no frame is ever quite still.
      const [a, b] = DRIFT[phase] ?? [z4, z4 * 0.99];
      return zoom(F1, a, VIEW, F1, b, VIEW, u);
    }
  }
}
