/**
 * The page dims as the internet empties out. The light around the browser
 * window drains away over the whole film, slowly while the early web is
 * still ours and faster toward the end, and reaches the sandbox chat's black
 * exactly as the camera starts to pull back, so the page fades into it.
 *
 * Darkness is a pure function of story position, like everything else, so
 * scrubbing backwards brightens it again. `revealStart` here is where the
 * camera starts pulling back (`Timeline.pullbackStart`).
 */
import type { Timeline } from './timeline';

export const DARKNESS = {
  /** Curve exponent: above 1 keeps the early eras bright and deepens later. */
  // 2 since the reveal moved earlier (AI Slop hidden, a shorter last line).
  curve: 2,
  /** Darkness where the page passes mid-grey: page text turns light near here. */
  inkFlip: 0.47,
} as const;

/** 0 (the era's own backdrop) to 1 (the sandbox's black) at story position `s`. */
export function pageDarkness(s: number, revealStart: number): number {
  if (revealStart <= 0) return 0;
  return Math.min(1, Math.max(0, s / revealStart)) ** DARKNESS.curve;
}

/**
 * The era from which page text is light: the era change nearest the moment
 * the page crosses mid-grey, so the flip hides inside the era's own title
 * change instead of happening on its own.
 */
export function lightInkEra(t: Timeline): number {
  const crossing = t.pullbackStart * DARKNESS.inkFlip ** (1 / DARKNESS.curve);
  let best = t.eraStarts.length;
  let gap = Infinity;
  t.eraStarts.forEach((s, k) => {
    if (k > 0 && Math.abs(s - crossing) < gap) {
      gap = Math.abs(s - crossing);
      best = k;
    }
  });
  return best;
}
