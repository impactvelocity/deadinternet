import { describe, expect, it } from 'vitest';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { cellKey, CURSOR, cursorGone, cursorLight, DOT_PHASES, ECHO, echoLight, gridLight, TYPING, typingAt } from '@/lib/flow/dots';
import { compileTimeline } from '@/lib/flow/timeline';
import { clipLevel, voiceTrack } from '@/lib/flow/voice-levels';
import { fakeMeasure } from '../fixtures/flow-measure';
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

  it('leaves only the skull after the voice, blinking on and off, the same on every replay', () => {
    const shown = new Set<string>();
    let on = 0;
    let blinks = 0;
    let was = false;
    for (let t = speech; t < speech + 30; t += 0.02) {
      const f = signalAt(t, speech);
      if (f.glyph) shown.add(f.glyph);
      expect(f.flash).toBeNull();
      const lit = f.glyph !== null;
      if (lit) on += 0.02;
      if (lit && !was) blinks++;
      was = lit;
    }
    expect([...shown]).toEqual(['skull']);
    expect(blinks).toBeGreaterThan(8);
    expect(on).toBeGreaterThan(15);
    expect(on).toBeLessThan(25);
    // While the voice lasts, other symbols still flash through.
    let flashes = 0;
    for (let t = SPOKEN[0].at; t < speech; t += 0.02) if (signalAt(t, speech).flash) flashes++;
    expect(flashes).toBeGreaterThan(5);
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

describe('flow reveal: the field under her voice', () => {
  const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
  const voice = voiceTrack(t, FILM_ERAS.at(-1)!.id);
  /** A moment she's speaking up, and one she's quiet, early in "Behind the feed". */
  const loud = (() => {
    let best = 0;
    for (let c = 0; c < 4; c += 0.05) if (voice.her(c) > voice.her(best)) best = c;
    return best;
  })();

  it('reads her voice, then the robot’s, from the measured clips', () => {
    expect(voice.her(loud)).toBeGreaterThan(0.6);
    expect(voice.robot(loud)).toBe(0);
    expect(voice.her(voice.handover + 1)).toBe(0);
    expect(voice.robot(voice.handover + 2)).toBeGreaterThan(0.5);
    // Before "Behind the feed": the end of the last era's line.
    let before = 0;
    for (let c = -3; c < 0; c += 0.05) before = Math.max(before, voice.her(c));
    expect(before).toBeGreaterThan(0.3);
    expect(clipLevel(narration.reveal.src, 999)).toBe(0);
    expect(clipLevel('/missing.mp3', 1)).toBe(0);
  });

  it('sends her voice out from her dot as rings of light, arriving later and fainter further out', () => {
    // Strongest as a word starts, fainter while she holds it.
    let onset = 0;
    for (let c = 0; c < 4; c += 0.01) if (echoLight(voice, c, 0) > echoLight(voice, onset, 0)) onset = c;
    const near = echoLight(voice, onset, 0);
    expect(near).toBeGreaterThan(0.3);
    expect(echoLight(voice, onset + 0.3, 0)).toBeLessThan(near);
    const d = ECHO.reach * 2;
    // Out there it arrives d / speed later, and weaker.
    const far = echoLight(voice, onset + d / ECHO.speed, d);
    expect(far).toBeCloseTo(near * Math.exp(-2), 6);
    expect(echoLight(voice, voice.handover + 3, 0)).toBe(0);
  });

  it('keeps her cursor solid while she talks and blinking in the pauses, until her credits run out', () => {
    expect(cursorLight(voice, loud, 0)).toBeGreaterThan(0.9);
    expect(cursorLight(voice, loud, CURSOR.period * 1000 * 0.8)).toBeGreaterThan(0.9);
    // In a pause, it blinks with the wall clock.
    let pause = loud;
    while (Math.max(voice.her(pause), voice.her(pause - 0.15), voice.her(pause - 0.3)) > 0.05) pause += 0.05;
    const blinks = new Set([0.1, 0.3, 0.7, 0.9].map((p) => Math.round(cursorLight(voice, pause, p * CURSOR.period * 1000))));
    expect(blinks).toEqual(new Set([0, 1]));
    // The robot takes over: it stutters, then it's gone.
    const flicker = new Set<number>();
    for (let c = voice.handover + CURSOR.out; c < cursorGone(voice); c += 0.02) flicker.add(Math.round(cursorLight(voice, c, 0)));
    expect(flicker).toEqual(new Set([0, 1]));
    for (const c of [cursorGone(voice) + 1e-6, cursorGone(voice) + 5, 60]) expect(cursorLight(voice, c, 0)).toBe(0);
  });

  it('has sessions typing to no one, three dots at a time, more where her voice has been', () => {
    const count = (from: number, to: number, v?: typeof voice) => {
      let lit = 0;
      for (let c = from; c < to; c += 0.1) lit += [...typingAt(c, v).values()].filter((x) => x.light > 0.2).length;
      return lit / ((to - from) / 0.1);
    };
    // A few at a time, never a crowd.
    const speaking = count(0, 7, voice);
    expect(speaking).toBeGreaterThan(count(0, 7));
    expect(speaking).toBeLessThan(30);
    expect(count(60, 70)).toBeGreaterThan(0);
    // Each one is a row of three, around but never on her dot.
    const lit = typingAt(3, voice);
    expect(lit.size % 3).toBe(0);
    expect(lit.has(cellKey(2, 2))).toBe(false);
    for (const x of lit.values()) {
      expect(x.light).toBeLessThanOrEqual(TYPING.light);
      expect(x.on).toBeGreaterThanOrEqual(0);
      expect(x.on).toBeLessThanOrEqual(1);
    }
    // The same on every replay.
    expect([...typingAt(12.34, voice)]).toEqual([...typingAt(12.34, voice)]);
  });
});
