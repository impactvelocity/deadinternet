import { describe, expect, it } from 'vitest';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { ENDING, endingVeil, titleOpacity, titleStart } from '@/lib/flow/ending';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { signalAt } from '@/lib/flow/signal';
import { compileTimeline } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const voiceEnds = t.revealStart + narration.reveal.durationSeconds * PLAY_SPEED;
const P = PLAY_SPEED;

describe('the ending', () => {
  it('stays out of the way of every spoken line', () => {
    for (let s = 0; s <= voiceEnds; s += P / 4) {
      expect(titleOpacity(t, s)).toBe(0);
      expect(endingVeil(t, s)).toBe(0);
    }
  });

  it('lets the skull have the screen before the title comes up', () => {
    const start = titleStart(t);
    expect((start - voiceEnds) / P).toBeCloseTo(ENDING.delay, 6);
    expect(signalAt((start - t.revealStart) / P - 0.5, narration.reveal.durationSeconds).glyph).toBe('skull');
  });

  it('goes straight to the title after that, and ends on it, over dimmed dots', () => {
    const start = titleStart(t);
    expect(titleOpacity(t, start)).toBe(0);
    expect(titleOpacity(t, start + ENDING.fade * P)).toBe(1);
    // The dots dim as the title comes up, not before.
    expect(endingVeil(t, start)).toBe(0);
    expect(endingVeil(t, start + ENDING.veilIn * P)).toBeCloseTo(ENDING.veil, 9);
    // Time to take it in before the film ends, and it's still up at the very end.
    expect((t.total - (start + ENDING.fade * P)) / P).toBeGreaterThan(8);
    expect(titleOpacity(t, t.total)).toBe(1);
    expect(endingVeil(t, t.total)).toBeCloseTo(ENDING.veil, 9);
  });
});
