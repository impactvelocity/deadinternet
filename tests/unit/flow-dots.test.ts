import { describe, expect, it } from 'vitest';
import { DOT_PHASES, gridLight } from '@/lib/flow/dots';
import { MASK, sampleMask, signalAt, SPOKEN } from '@/lib/flow/signal';
import narration from '@/data/flow/narration.json';

const speech = narration.reveal.durationSeconds;

describe('flow reveal: dots, then a screen of them', () => {
  it('forms the session dots bright, then lets them twinkle', () => {
    expect(gridLight(0.1, 0, 42)).toBeCloseTo(0.9, 5);
    const later = new Set([0, 200, 400, 600, 800, 1000].map((t) => gridLight(1, t, 42)));
    expect(later.size).toBeGreaterThan(1);
    expect(DOT_PHASES).toEqual(['dots', 'signal', 'end']);
  });

  it('shows one symbol per line of the voice, in order, inside it', () => {
    for (let i = 0; i < SPOKEN.length; i++) {
      expect(SPOKEN[i].until).toBeGreaterThan(SPOKEN[i].at);
      if (i) expect(SPOKEN[i].at).toBeGreaterThanOrEqual(SPOKEN[i - 1].until);
    }
    expect(SPOKEN.at(-1)!.until).toBeLessThanOrEqual(speech + 1e-9);
    // Nothing yet over "The internet used to be our sandbox…".
    expect(signalAt(3, speech).glyph).toBeNull();
    const q = signalAt(15.2, speech);
    expect(q.glyph).toBe('question');
    expect(q.level).toBeGreaterThan(0.5);
  });

  it('flickers on and hums rather than switching cleanly', () => {
    const start = SPOKEN.find((s) => s.glyph === 'eye')!.at;
    const levels = new Set<number>();
    for (let t = start; t < start + 0.3; t += 0.01) levels.add(Math.round(signalAt(t, speech).level * 100));
    expect(levels.size).toBeGreaterThan(1);
  });

  it('keeps cycling unsettling symbols after the voice, with brief flashes, the same on every replay', () => {
    const shown = new Set<string>();
    let flashes = 0;
    for (let t = speech; t < speech + 30; t += 0.02) {
      const f = signalAt(t, speech);
      if (f.glyph) shown.add(f.glyph);
      if (f.flash) flashes++;
    }
    expect(shown.has('skull')).toBe(true);
    expect(shown.has('eye')).toBe(true);
    expect(shown.size).toBeGreaterThanOrEqual(4);
    // Frames, not seconds: a flash is gone almost as soon as it lands.
    expect(flashes).toBeGreaterThan(5);
    expect(flashes).toBeLessThan(150);
    expect(signalAt(speech + 12.34, speech)).toEqual(signalAt(speech + 12.34, speech));
  });

  it('samples a symbol’s shading at each pixel', () => {
    const mask = new Float32Array(MASK.w * MASK.h);
    // Bright left half, dark right half.
    for (let y = 0; y < MASK.h; y++) for (let x = 0; x < MASK.w / 2; x++) mask[y * MASK.w + x] = 1;
    expect(sampleMask(mask, 200, 500, 20)).toBeCloseTo(1, 5);
    expect(sampleMask(mask, 1400, 500, 20)).toBe(0);
    const edge = sampleMask(mask, 800, 500, 20);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
    expect(sampleMask(mask, -500, 500, 20)).toBe(0);
  });
});
