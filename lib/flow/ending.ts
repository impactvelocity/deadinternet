/**
 * The title card. Once the last voice has finished and the skull flickers on,
 * the film's title fades up over the dots and stays through the final fade,
 * so the film ends on it (with links you can click). Like everything else it
 * follows story position, so scrubbing back takes it away again.
 */
import narration from '@/data/flow/narration.json';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

export const ENDING = {
  /** Seconds after the reveal narration ends before the title starts to appear. */
  delay: 0.9,
  /** Seconds the title takes to fade up. */
  fade: 1.8,
  /** How far the dots behind dim while the title is up (0 = not at all). */
  veil: 0.55,
} as const;

/** When the title starts to appear, in story px. */
export function titleStart(t: Timeline): number {
  return t.revealStart + (narration.reveal.durationSeconds + ENDING.delay) * PLAY_SPEED;
}

/** 0..1: how visible the title is at story position `s`. */
export function titleOpacity(t: Timeline, s: number): number {
  const x = Math.min(1, Math.max(0, (s - titleStart(t)) / (ENDING.fade * PLAY_SPEED)));
  return x * x * (3 - 2 * x);
}
