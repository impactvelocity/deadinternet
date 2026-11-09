import { describe, expect, it } from 'vitest';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { ENDING, titleOpacity, titleStart } from '@/lib/flow/ending';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { signalAt } from '@/lib/flow/signal';
import { compileTimeline } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const voiceEnds = t.revealStart + narration.reveal.durationSeconds * PLAY_SPEED;

describe('closing title', () => {
  it('stays out of the way of every spoken line', () => {
    for (let s = 0; s <= voiceEnds; s += PLAY_SPEED / 4) expect(titleOpacity(t, s)).toBe(0);
  });

  it('fades up just after the last line, as the skull comes on, and closes the film', () => {
    const start = titleStart(t);
    expect((start - voiceEnds) / PLAY_SPEED).toBeCloseTo(ENDING.delay, 6);
    // The skull is the first symbol after the voice.
    expect(signalAt((start - t.revealStart) / PLAY_SPEED, narration.reveal.durationSeconds).glyph).toBe('skull');
    expect(titleOpacity(t, start + (ENDING.fade / 2) * PLAY_SPEED)).toBeCloseTo(0.5, 6);
    expect(titleOpacity(t, start + ENDING.fade * PLAY_SPEED)).toBe(1);
    expect(titleOpacity(t, t.total)).toBe(1);
  });
});
