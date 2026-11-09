import { describe, expect, it } from 'vitest';
import { WINDOW_GROWTH, windowScale, windowTransform } from '@/lib/flow/camera';

describe('the screen grows with the web', () => {
  const end = 1000;

  it('starts small and reaches full size exactly at the pull-back, then stays there', () => {
    expect(windowScale(0, end)).toBeCloseTo(WINDOW_GROWTH.start, 9);
    expect(windowScale(end, end)).toBeCloseTo(1, 9);
    expect(windowScale(end * 2, end)).toBe(1);
  });

  it('grows at a steady rate, easing to a stop only at the very end', () => {
    const rate = (s: number) => (windowScale(s + 1, end) - windowScale(s, end)) / 1;
    expect(rate(100)).toBeCloseTo(rate(800), 9);
    expect(rate(end * (1 - WINDOW_GROWTH.landing / 2))).toBeLessThan(rate(500));
    expect(rate(end - 1)).toBeLessThan(rate(500) * 0.05);
    for (let s = 0; s < end; s += 10) expect(windowScale(s + 10, end)).toBeGreaterThan(windowScale(s, end));
  });

  it('is at its page place, unscaled, once full size (the reveal camera takes over from there)', () => {
    expect(windowTransform(1)).toBe('translate(160px, 64px) scale(1)');
  });
});
