import { describe, expect, it } from 'vitest';
import { collapseAt, globePoints, gridLight, lastDot } from '@/lib/flow/dots';
import { isLand } from '@/lib/flow/land';

describe('flow reveal: dots, globe, last dot', () => {
  it('knows land from sea well enough to draw the world', () => {
    expect(isLand(51.5, -0.1)).toBe(true); // London
    expect(isLand(40.7, -74)).toBe(true); // New York
    expect(isLand(-33.9, 151.2)).toBe(true); // Sydney
    expect(isLand(20, 10)).toBe(true); // Sahara
    expect(isLand(35.7, 139.7)).toBe(true); // Tokyo
    expect(isLand(-15, -50)).toBe(true); // Brazil
    expect(isLand(0, -30)).toBe(false); // Atlantic
    expect(isLand(0, -150)).toBe(false); // Pacific
    expect(isLand(-20, 75)).toBe(false); // Indian Ocean
    expect(isLand(43, 34)).toBe(false); // Black Sea
  });

  it('builds a globe that is roughly a third land', () => {
    const { all, land } = globePoints();
    const share = land.length / all.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.4);
  });

  it('forms the session dots bright, then lets them twinkle', () => {
    expect(gridLight(0.1, 0, 42)).toBeCloseTo(0.9, 5);
    const later = new Set([0, 200, 400, 600, 800, 1000].map((t) => gridLight(1, t, 42)));
    expect(later.size).toBeGreaterThan(1);
  });

  it('collapses every globe dot into the center', () => {
    for (const p of globePoints().all.slice(0, 200)) {
      expect(collapseAt(0, p.seed)).toBe(0);
      expect(collapseAt(1, p.seed)).toBe(1);
    }
  });

  it('leaves one dot that blinks, then rises above the headline', () => {
    const at = (now: number) => lastDot({ phase: 'blink', u: 1, now }).a;
    expect(Math.max(at(0), at(500), at(1000), at(1500))).toBeGreaterThan(0.9);
    expect(Math.min(at(0), at(500), at(1000), at(1500))).toBeLessThan(0.3);
    expect(lastDot({ phase: 'end', u: 1, now: 0 }).rise).toBeGreaterThan(100);
    expect(lastDot({ phase: 'globe', u: 0.5, now: 0 }).a).toBe(0);
  });

  it('carries the last light through the collapse and end without a brightness jump', () => {
    for (const now of [0, 400, 1200, 2300]) {
      const collapsed = lastDot({ phase: 'collapse', u: 1, now });
      const blinking = lastDot({ phase: 'blink', u: 0, now });
      const ending = lastDot({ phase: 'end', u: 0, now });
      expect(blinking).toEqual(collapsed);
      expect(ending).toEqual(blinking);
    }
  });
});
