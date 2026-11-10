/**
 * The ending, after the last voice: the skull gets the screen to itself for
 * a moment, then the field of dots dims and the film's title comes up over
 * it and stays through the final fade, so the film ends on it (with links
 * you can click).
 *
 * Like everything else it follows story position, so scrubbing back takes it
 * all away again.
 */
import narration from '@/data/flow/narration.json';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

export const ENDING = {
  /** Seconds after the reveal narration ends before the title starts (the skull has the screen first). */
  delay: 1.9,
  /** Seconds the title takes to fade up. */
  fade: 1.8,
  /** How far the field of dots dims under the title (0 = not at all)... */
  veil: 0.6,
  /** ...and how many seconds that takes. */
  veilIn: 0.6,
} as const;

const P = PLAY_SPEED;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/** When the title starts to appear, in story px. */
export function titleStart(t: Pick<Timeline, 'revealStart'>): number {
  return t.revealStart + (narration.reveal.durationSeconds + ENDING.delay) * P;
}

/** 0..1: how visible the title is at story position `s`. */
export function titleOpacity(t: Timeline, s: number): number {
  return smooth((s - titleStart(t)) / (ENDING.fade * P));
}

/** 0..1: how far to dim the field of dots, from the title to the end. */
export function endingVeil(t: Timeline, s: number): number {
  return smooth((s - titleStart(t)) / (ENDING.veilIn * P)) * ENDING.veil;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
