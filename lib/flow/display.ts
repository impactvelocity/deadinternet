/**
 * The screen the feed is watched on gets newer with the web. 2005 plays on
 * a CRT: scanlines, a round-cornered tube, colour fringes, flicker and
 * noise. Then come cheap LCD panels that wash out toward the top, then
 * glossy glass with a reflection across it, and by the last eras nothing is
 * in the way at all: the feed is perfectly clear just as it stops being real.
 *
 * The look is a pure function of story position, like everything else, so
 * scrubbing backwards brings the old screen back. Each era holds its own look
 * and hands over to the next one around the era change. The corners are the
 * exception: they sharpen steadily the whole way, from the round CRT tube of
 * 2005 to the screen's plain 12px by 2024.
 */
import type { FlowEraId } from '@/data/flow/types';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

/** Strengths, 0 (absent) to 1 (full), except `fringe` and `corner`. */
export interface DisplayLook {
  /** CRT scanlines. */
  scan: number;
  /** The tube: vignette, a dark rim and a reflection on the glass. */
  tube: number;
  /** Corner rounding on top of the screen's own radius, in design px. */
  corner: number;
  /** Colour fringes on text (misaligned CRT guns), in design px. */
  fringe: number;
  /** Brightness flicker and the slow band rolling down a filmed CRT. */
  flicker: number;
  /** Analog noise. */
  grain: number;
  /** Early LCD: washed out toward the top (narrow viewing angle), backlight bleed. */
  panel: number;
  /** Glossy glass: a soft reflection across the screen. */
  glare: number;
}

export const CLEAR: DisplayLook = { scan: 0, tube: 0, corner: 0, fringe: 0, flicker: 0, grain: 0, panel: 0, glare: 0 };

/** One look per era, oldest screen first, clearing up toward the end. */
export const DISPLAY_LOOKS: Readonly<Record<FlowEraId, DisplayLook>> = {
  // A CRT monitor on the family computer desk.
  profile: { scan: 1, tube: 1, corner: 78, fringe: 1.2, flicker: 1, grain: 1, panel: 0, glare: 0 },
  // The CRT's last days; the first flat panels.
  wall: { scan: 0.35, tube: 0.4, corner: 44, fringe: 0.45, flicker: 0.25, grain: 0.5, panel: 0.6, glare: 0 },
  // A cheap laptop LCD.
  cards: { scan: 0, tube: 0.12, corner: 24, fringe: 0, flicker: 0, grain: 0.25, panel: 0.8, glare: 0.3 },
  // Glossy laptops.
  viral: { ...CLEAR, tube: 0.05, corner: 14, grain: 0.12, panel: 0.45, glare: 0.45 },
  algorithm: { ...CLEAR, corner: 8, grain: 0.05, panel: 0.18, glare: 0.32 },
  // Phones and retina screens: only the glass is left.
  stories: { ...CLEAR, corner: 4, panel: 0.06, glare: 0.2 },
  reels: { ...CLEAR, corner: 2, glare: 0.1 },
  slop: { ...CLEAR, corner: 1, glare: 0.05 },
  // Perfectly clear from here on.
  pro: CLEAR,
  machine: CLEAR,
  dead: CLEAR,
};

export const DISPLAY = {
  /** Seconds (at 1× playback) one look takes to give way to the next, centred on the era change. */
  fade: 1.4,
} as const;

const KEYS = Object.keys(CLEAR) as (keyof DisplayLook)[];

function mix(a: DisplayLook, b: DisplayLook, m: number): DisplayLook {
  const out = { ...a };
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * m;
  return out;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/**
 * Corner rounding at `s`: each era's `corner` is where the corners are as the
 * era starts, and they sharpen steadily toward the next era's.
 */
function cornerAt(t: Timeline, eras: readonly { id: FlowEraId }[], s: number): number {
  const n = Math.min(eras.length, t.eraStarts.length);
  for (let k = 0; k + 1 < n; k++) {
    const a = t.eraStarts[k];
    const b = t.eraStarts[k + 1];
    if (s >= b) continue;
    const from = DISPLAY_LOOKS[eras[k].id].corner;
    return from + (DISPLAY_LOOKS[eras[k + 1].id].corner - from) * (b > a ? clamp01((s - a) / (b - a)) : 1);
  }
  return DISPLAY_LOOKS[eras[Math.max(0, n - 1)].id].corner;
}

/** The screen's look at story position `s`, for the film's `eras` (in timeline order). */
export function displayAt(t: Timeline, eras: readonly { id: FlowEraId }[], s: number): DisplayLook {
  if (!eras.length) return CLEAR;
  const half = (DISPLAY.fade * PLAY_SPEED) / 2;
  let look = DISPLAY_LOOKS[eras[0].id];
  for (let k = 1; k < eras.length && k < t.eraStarts.length; k++) {
    const m = smooth((s - (t.eraStarts[k] - half)) / (2 * half));
    if (m <= 0) break;
    look = m >= 1 ? DISPLAY_LOOKS[eras[k].id] : mix(look, DISPLAY_LOOKS[eras[k].id], m);
  }
  return { ...look, corner: cornerAt(t, eras, s) };
}

/** True when nothing would show, so the overlay can be skipped entirely. */
export function isClear(look: DisplayLook): boolean {
  return KEYS.every((key) => look[key] < 0.005);
}
