import { describe, expect, it } from 'vitest';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { DARKNESS, lightInkEra, pageDarkness } from '@/lib/flow/darkness';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { compileTimeline, eraAt } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));

/** WCAG relative luminance and contrast, for checking the page text stays legible. */
const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** The dark layer over the backdrop near the header (between its centre and edge colours). */
const SANDBOX = rgb('#0b0b10');

describe('page darkness', () => {
  it('starts as each era’s own backdrop and darkens steadily to the sandbox’s black at the reveal', () => {
    expect(pageDarkness(0, t.pullbackStart)).toBe(0);
    let previous = 0;
    for (let s = PLAY_SPEED; s <= t.pullbackStart; s += PLAY_SPEED) {
      const d = pageDarkness(s, t.pullbackStart);
      expect(d).toBeGreaterThan(previous);
      previous = d;
    }
    expect(pageDarkness(t.pullbackStart, t.pullbackStart)).toBe(1);
    expect(pageDarkness(t.total, t.pullbackStart)).toBe(1);
  });

  it('keeps the early web light and saves most of the dark for the end', () => {
    const stories = FILM_ERAS.findIndex((era) => era.id === 'stories');
    expect(pageDarkness(t.eraStarts[stories], t.pullbackStart)).toBeLessThan(0.3);
    const dead = FILM_ERAS.findIndex((era) => era.id === 'dead');
    expect(pageDarkness(t.eraStarts[dead], t.pullbackStart)).toBeGreaterThan(0.6);
  });

  it('turns page text light at the era change nearest mid-grey', () => {
    const k = lightInkEra(t);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(FILM_ERAS.length);
    expect(Math.abs(pageDarkness(t.eraStarts[k], t.pullbackStart) - DARKNESS.inkFlip)).toBeLessThan(0.1);
  });

  it('keeps the header readable against the page at every moment of the film', () => {
    // Mirrors flow.css: `color-mix(in srgb, a, b p)` with --toward-mid / --past-mid.
    const mix = (a: string, b: string, p: number) => rgb(a).map((v, i) => v + (rgb(b)[i] - v) * p);
    const k = lightInkEra(t);
    let text = Infinity;
    let quiet = Infinity;
    for (let s = 0; s < t.pullbackStart; s += PLAY_SPEED / 10) {
      const era = eraAt(t, s);
      const d = pageDarkness(s, t.pullbackStart);
      const page = rgb(FILM_ERAS[era].backdrop.base).map((v, i) => v + (SANDBOX[i] - v) * d);
      const towardMid = Math.min(1, d * 2);
      const pastMid = Math.min(1, (1 - d) * 2);
      const light = era >= k;
      text = Math.min(text, contrast(light ? mix('#ece8f1', '#ffffff', pastMid) : rgb('#1f1d1a'), page));
      // The dimmest header text ("built by …").
      quiet = Math.min(quiet, contrast(light ? mix('#a9a3b2', '#f6f4f9', pastMid) : mix('#625d57', '#1f1d1a', towardMid), page));
    }
    expect(text).toBeGreaterThanOrEqual(3.5);
    expect(quiet).toBeGreaterThanOrEqual(3.2);
  });
});
