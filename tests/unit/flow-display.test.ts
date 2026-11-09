import { describe, expect, it } from 'vitest';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { CLEAR, DISPLAY, DISPLAY_LOOKS, displayAt, isClear } from '@/lib/flow/display';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { compileTimeline } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const half = (DISPLAY.fade * PLAY_SPEED) / 2;
/** How much is in the way: every layer added up (the corners have their own test). */
const weight = (s: number) => {
  const look = displayAt(t, FILM_ERAS, s);
  return Object.values(look).reduce((a, b) => a + b, 0) - look.corner;
};
const corner = (s: number) => displayAt(t, FILM_ERAS, s).corner;

describe('the screen display', () => {
  it('opens on a full CRT', () => {
    expect(displayAt(t, FILM_ERAS, 0)).toEqual(DISPLAY_LOOKS.profile);
    expect(DISPLAY_LOOKS.profile.scan).toBe(1);
  });

  it('holds each era’s own look away from the era changes', () => {
    FILM_ERAS.forEach((era, k) => {
      const end = t.eraStarts[k + 1] ?? t.total;
      const mid = (t.eraStarts[k] + end) / 2;
      expect({ ...displayAt(t, FILM_ERAS, mid), corner: 0 }, era.id).toEqual({ ...DISPLAY_LOOKS[era.id], corner: 0 });
    });
  });

  it('opens on round CRT corners that sharpen steadily, era by era, to the plain screen', () => {
    expect(DISPLAY_LOOKS.profile.corner).toBeGreaterThan(DISPLAY_LOOKS.wall.corner);
    FILM_ERAS.forEach((era, k) => expect(corner(t.eraStarts[k]), era.id).toBeCloseTo(DISPLAY_LOOKS[era.id].corner, 6));
    let previous = Infinity;
    for (let s = 0; s <= t.total; s += PLAY_SPEED / 8) {
      expect(corner(s)).toBeLessThanOrEqual(previous);
      previous = corner(s);
    }
    // Sharpening the whole way through an era, not only at its change.
    const wall = FILM_ERAS.findIndex((era) => era.id === 'wall');
    expect(corner((t.eraStarts[wall - 1] + t.eraStarts[wall]) / 2)).toBeLessThan(DISPLAY_LOOKS.profile.corner);
    expect(corner((t.eraStarts[wall - 1] + t.eraStarts[wall]) / 2)).toBeGreaterThan(DISPLAY_LOOKS.wall.corner);
  });

  it('clears up era by era, and is perfectly clear by the end', () => {
    for (let k = 1; k < FILM_ERAS.length; k++) {
      expect(weight(t.eraStarts[k] + half), FILM_ERAS[k].id).toBeLessThanOrEqual(weight(t.eraStarts[k - 1] + half));
    }
    const pro = FILM_ERAS.findIndex((era) => era.id === 'pro');
    for (let s = t.eraStarts[pro] + half; s <= t.total; s += PLAY_SPEED / 4) expect(isClear(displayAt(t, FILM_ERAS, s))).toBe(true);
    expect(displayAt(t, FILM_ERAS, t.total)).toEqual(CLEAR);
  });

  it('eases from one screen to the next without jumping', () => {
    for (let s = 0; s < t.eraStarts.at(-1)! + half; s += 8) {
      const a = displayAt(t, FILM_ERAS, s);
      const b = displayAt(t, FILM_ERAS, s + 8);
      for (const key of Object.keys(a) as (keyof typeof a)[]) {
        // Corners are in px; everything else is a 0..1 strength.
        expect(Math.abs(a[key] - b[key]), key).toBeLessThan(key === 'corner' ? 1 : 0.05);
      }
    }
  });
});
