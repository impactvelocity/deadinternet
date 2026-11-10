import { describe, expect, it } from 'vitest';
import narration from '@/data/flow/narration.json';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { PAGE, PAGE_WINDOW, WINDOW, WINDOW_GROWTH, windowScale } from '@/lib/flow/camera';
import {
  ambienceAt,
  blendFit,
  deepen,
  MOVIE,
  movieDuration,
  movieFrame,
  movieIntro,
  movieMusicLevel,
  movieScoreSeconds,
  movieWindowScale,
  pageFit,
  pageMix,
  screenFit,
} from '@/lib/flow/movie';
import { MUSIC, musicCues, musicGain } from '@/lib/flow/music';
import { ENDING, titleStart } from '@/lib/flow/ending';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { musicLevels, storyMusicLevel, voiceCues } from '@/lib/flow/soundtrack';
import { compileTimeline, FLOW_TIMING } from '@/lib/flow/timeline';
import { ROBOT_CUES } from '@/lib/flow/voice-effects';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const P = PLAY_SPEED;
const intro = movieIntro();

/** Where a page point lands in the viewport under `fit`. */
const place = (f: { scale: number; x: number; y: number }, x: number, y: number) => ({ x: f.x + x * f.scale, y: f.y + y * f.scale });

describe('the movie frame', () => {
  it('leaves exactly the padding around the screen on its tighter side, centred', () => {
    const [vw, vh, pad] = [1692, 1080, 30];
    const f = screenFit(vw, vh, pad);
    const tl = place(f, PAGE_WINDOW.x, PAGE_WINDOW.y + WINDOW.chrome);
    const br = place(f, PAGE_WINDOW.x + WINDOW.w, PAGE_WINDOW.y + WINDOW.h);
    expect(tl.x).toBeCloseTo(pad, 6);
    expect(tl.y).toBeCloseTo(pad, 6);
    expect(vw - br.x).toBeCloseTo(pad, 6);
    expect(vh - br.y).toBeCloseTo(pad, 6);
    // A wider frame centres the screen with even sides.
    const wide = screenFit(1920, 1080, pad);
    const l = place(wide, PAGE_WINDOW.x, 0).x;
    const r = 1920 - place(wide, PAGE_WINDOW.x + WINDOW.w, 0).x;
    expect(l).toBeCloseTo(r, 6);
    expect(place(wide, 0, PAGE_WINDOW.y + WINDOW.chrome).y).toBeCloseTo(pad, 6);
  });

  it('eases out to the whole page as a pure zoom, without jumps at either end', () => {
    const a = screenFit(1692, 1080);
    const b = pageFit(1692, 1080);
    expect(blendFit(a, b, 0)).toEqual(a);
    expect(blendFit(a, b, 1)).toEqual(b);
    // The page fits inside the frame at the end.
    expect(PAGE.w * b.scale).toBeLessThanOrEqual(1692 + 1e-6);
    expect(PAGE.h * b.scale).toBeLessThanOrEqual(1080 + 1e-6);
    // One page point stays put the whole way: the zoom's fixed point.
    const px = (b.x - a.x) / (a.scale - b.scale);
    const py = (b.y - a.y) / (a.scale - b.scale);
    const q = place(a, px, py);
    for (const k of [0.1, 0.35, 0.5, 0.8]) {
      const m = place(blendFit(a, b, k), px, py);
      expect(m.x).toBeCloseTo(q.x, 6);
      expect(m.y).toBeCloseTo(q.y, 6);
    }
    // Only the first pull-back moves it, and it lands where the rest starts.
    expect(pageMix(null)).toBe(0);
    expect(pageMix({ phase: 'sandbox', u: 0 })).toBe(0);
    expect(pageMix({ phase: 'sandbox', u: 1 })).toBeCloseTo(1, 9);
    expect(pageMix({ phase: 'chat', u: 0 })).toBe(1);
  });

  it('opens on black with the cards one at a time, then the window, then the story at 1×', () => {
    const first = movieFrame(t, 0);
    expect(first).toMatchObject({ s: 0, window: 0, rolling: false });
    expect(first.cards).toEqual(MOVIE.cards.map(() => 0));
    // Each card gets the screen to itself at the middle of its hold.
    let at = 0;
    MOVIE.cards.forEach((hold, k) => {
      const mid = movieFrame(t, at + MOVIE.cardFade + hold / 2);
      expect(mid.cards.map((o, j) => (j === k ? o : 0))).toEqual(mid.cards);
      expect(mid.cards[k]).toBe(1);
      expect(mid.window).toBe(0);
      at += 2 * MOVIE.cardFade + hold;
    });
    // No two cards (or a card and the window) ever share the screen.
    for (let x = 0; x <= intro + 1; x += 1 / 30) {
      const f = movieFrame(t, x);
      expect([...f.cards, f.window].filter((o) => o > 0.001).length).toBeLessThanOrEqual(1);
    }
    const handed = movieFrame(t, intro);
    expect(handed.window).toBe(1);
    expect(handed.s).toBe(0);
    expect(handed.rolling).toBe(true);
    expect(movieFrame(t, intro + 10).s).toBeCloseTo(10 * P, 6);
  });

  it('brings the window in quickly and carries straight on into the site’s growth, never stopping', () => {
    const start = intro - MOVIE.arrive;
    expect(movieWindowScale(t, start)).toBeCloseTo(WINDOW_GROWTH.start * MOVIE.arriveScale, 9);
    expect(movieWindowScale(t, intro)).toBeCloseTo(windowScale(0, t.pullbackStart), 9);
    const dt = 1 / 120;
    const speed = (x: number) => (movieWindowScale(t, x + dt) - movieWindowScale(t, x)) / dt;
    // Same speed either side of the story's start: no stop, no jolt.
    expect(speed(intro - dt)).toBeCloseTo(speed(intro), 3);
    // Always growing, from the arrival until the camera takes over.
    for (let x = start; x < intro + (t.pullbackStart / P) * 0.9; x += 0.05) expect(speed(x)).toBeGreaterThan(0);
    // The arrival is quicker than the growth it settles into.
    expect(speed(start)).toBeGreaterThan(3 * speed(intro + 1));
    // After that it is exactly the site's growth.
    expect(movieFrame(t, intro + 20).scale).toBeCloseTo(windowScale(20 * P, t.pullbackStart), 9);
  });

  it('glows faintly in each era’s own colours behind the window, handing over between eras', () => {
    // A glow keeps its page colour's hue; a grey era stays grey.
    const [r, g, b] = deepen('#f7d3ea'); // MySpace pink
    expect(r).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(g);
    const grey = deepen('#d6d8dc');
    expect(Math.max(...grey) - Math.min(...grey)).toBeLessThan(30);
    // Each era's own colours mid-era, and no jumps between.
    FILM_ERAS.forEach((era, k) => {
      const end = k + 1 < FILM_ERAS.length ? t.eraStarts[k + 1] : t.revealStart;
      expect(ambienceAt(t, FILM_ERAS, (t.eraStarts[k] + end) / 2).a.map(Math.round)).toEqual([...deepen(era.backdrop.glow)]);
    });
    let last = ambienceAt(t, FILM_ERAS, 0);
    for (let x = 0; x < t.revealStart; x += P / 30) {
      const now = ambienceAt(t, FILM_ERAS, x);
      for (const key of ['a', 'b'] as const) for (let i = 0; i < 3; i++) expect(Math.abs(now[key][i] - last[key][i])).toBeLessThan(6);
      last = now;
    }
    // Plain black under the cards; it only comes up with the window.
    const cardsEnd = intro - MOVIE.arrive;
    for (let x = 0; x <= cardsEnd; x += 0.1) expect(movieFrame(t, x).glow).toBe(0);
    expect(movieFrame(t, cardsEnd + MOVIE.arrive / 2).glow).toBeGreaterThan(0);
    expect(movieFrame(t, cardsEnd + MOVIE.ambienceIn).glow).toBe(1);
  });

  it('moves the end title aside for the how-it-was-made lines, one at a time, before it leaves', () => {
    const titleAt = intro + titleStart(t) / P;
    const peak = intro + t.reveal.find((r) => r.phase === 'end')!.s0 / P;
    const leaves = peak + MOVIE.exit.at;
    const M = MOVIE.made;
    // The title comes up in the middle first; nothing moves until it has.
    expect(movieFrame(t, titleAt + ENDING.fade).lift).toBe(0);
    expect(movieFrame(t, titleAt + M.liftAt + M.lift).lift).toBe(1);
    const full = Array.from({ length: M.lines + 1 }, () => 0);
    for (let x = titleAt; x <= leaves + 2; x += 1 / 30) {
      const f = movieFrame(t, x);
      expect(f.made.length).toBe(M.lines + 1);
      const up = f.made.map((m, k) => (m.o > 0.001 ? k : -1)).filter((k) => k >= 0);
      // One at a time, except the last line fading into the final one.
      if (up.length > 1) expect(up).toEqual([M.lines - 1, M.lines]);
      f.made.forEach((m, k) => {
        if (m.o === 1 && f.glitch === 0) full[k] += 1 / 30;
        // None before the title has started to move, none once it's about to leave.
        if (m.o > 0) expect(f.lift).toBeGreaterThan(0);
        if (x >= leaves - M.tail + 1e-6) expect(m.o).toBe(0);
      });
    }
    // Every line is fully up for a good few seconds.
    for (const seconds of full) expect(seconds).toBeGreaterThan(2.5);
  });

  it('holds the final line, glitches it out, and brings the skull up bright as it goes', () => {
    const peak = intro + t.reveal.find((r) => r.phase === 'end')!.s0 / P;
    const M = MOVIE.made;
    const gone = peak + MOVIE.exit.at - M.tail;
    const glitchAt = gone - M.glitch;
    const last = (x: number) => movieFrame(t, x).made[M.lines];
    // Up and steady before the glitch, with no skull held yet.
    const steady = movieFrame(t, glitchAt - MOVIE.skullLead - 0.1);
    expect(steady.made[M.lines].o).toBe(1);
    expect(steady.glitch).toBe(0);
    expect(steady.skull).toBe(0);
    // The glitch runs to the moment it's gone; the skull rises through it and stays.
    expect(movieFrame(t, glitchAt + M.glitch / 2).glitch).toBeCloseTo(0.5, 6);
    expect(last(gone - 0.01).o).toBe(1);
    expect(last(gone).o).toBe(0);
    let before = 0;
    for (let x = glitchAt - MOVIE.skullLead; x <= gone; x += 0.1) {
      const skull = movieFrame(t, x).skull;
      expect(skull).toBeGreaterThanOrEqual(before);
      before = skull;
    }
    expect(movieFrame(t, gone).skull).toBe(1);
    expect(movieFrame(t, movieDuration(t)).skull).toBe(1);
    // And the dimming under the lines lifts for it, without going past clear.
    expect(ENDING.veil + MOVIE.madeVeil - MOVIE.skullGlow).toBeGreaterThanOrEqual(0);
    expect(ENDING.veil + MOVIE.madeVeil - MOVIE.skullGlow).toBeLessThan(0.15);
  });

  it('ends by taking the title away, outside in, and leaving one dot', () => {
    const peak = intro + t.reveal.find((r) => r.phase === 'end')!.s0 / P;
    // Nothing moves before the score's peak on the end title.
    for (let x = intro; x <= peak; x += 0.5) {
      const f = movieFrame(t, x);
      expect(f.exit.every((e) => e === 0)).toBe(true);
      expect(f.dot).toBe(0);
    }
    // The groups leave in order, the title itself last, and the dot comes as it goes.
    const firstMove = (k: number) => {
      let x = peak;
      while (movieFrame(t, x).exit[k] === 0) x += 1 / 60;
      return x;
    };
    const starts = Array.from({ length: MOVIE.exit.groups }, (_, k) => firstMove(k));
    for (let k = 1; k < starts.length; k++) expect(starts[k]).toBeGreaterThan(starts[k - 1]);
    let dotAt = peak;
    while (movieFrame(t, dotAt).dot === 0) dotAt += 1 / 60;
    expect(dotAt).toBeGreaterThan(starts.at(-1)!);
    // All gone and the dot full well before the story ends, and the last frame is the dot alone.
    const storyEnd = intro + t.total / P;
    const done = movieFrame(t, storyEnd - 1);
    expect(done.exit).toEqual(Array(MOVIE.exit.groups).fill(1));
    expect(done.dot).toBe(1);
    expect(movieFrame(t, movieDuration(t)).dot).toBe(1);
  });

  it('holds the last frame for the outro once the story ends', () => {
    const d = movieDuration(t);
    expect(d).toBeCloseTo(intro + t.total / P + MOVIE.outro, 9);
    const end = movieFrame(t, d);
    expect(end.s).toBe(t.total);
    expect(end.rolling).toBe(false);
  });
});

describe('the movie soundtrack', () => {
  const cues = voiceCues(t, FILM_ERAS, intro);

  it('starts each line where its era starts, in film order, and the reveal last', () => {
    const lines = cues.slice(0, -1);
    expect(lines.map((c) => c.src)).toEqual(
      FILM_ERAS.map((era) => narration.chunks.find((c) => c.era === era.id)!.src),
    );
    lines.forEach((cue, k) => {
      expect(cue.at).toBeCloseTo(intro + t.eraStarts[k] / P, 9);
      const chunk = narration.chunks.find((c) => c.src === cue.src)!;
      expect(cue.length).toBeLessThanOrEqual(chunk.durationSeconds + 1e-9);
      // No line runs into the next one.
      const next = cues[k + 1];
      expect(cue.at + cue.length).toBeLessThanOrEqual(next.at + 1e-9);
    });
    const reveal = cues[cues.length - 1];
    expect(reveal.src).toBe(narration.reveal.src);
    expect(reveal.at).toBeCloseTo(intro + t.revealStart / P, 9);
  });

  it('turns only the opportunity line robotic, on the same cues as the live player', () => {
    const robotic = cues.filter((c) => c.robot.length);
    expect(robotic.map((c) => c.src)).toEqual([narration.chunks.find((c) => c.era === 'dead')!.src]);
    expect(robotic[0].robot).toBe(ROBOT_CUES);
  });

  it('samples a score level law over the whole track (the site’s, by default)', () => {
    const levels = musicLevels(storyMusicLevel(t));
    const music = musicCues(t);
    expect(levels.length).toBe(Math.ceil(MUSIC.durationSeconds * 100) + 1);
    expect(levels[0]).toBe(0);
    for (const x of [1, 20, 80, 130]) expect(levels[x * 100]).toBeCloseTo(musicGain(Math.min(t.total, x * P), music), 6);
  });
});

describe('the movie score', () => {
  // The movie's own timeline: the score starts under the titles.
  const tm = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS), FLOW_TIMING, movieScoreSeconds());

  it('starts on the first frame and still ends with the story, swelling onto the end card as on the site', () => {
    expect(intro + tm.total / P).toBeCloseTo(MUSIC.durationSeconds, 6);
    // The swell peaks at the same point in the track as on the site.
    expect(intro + musicCues(tm).swellTo / P).toBeCloseTo(musicCues(t).swellTo / P, 6);
    // Everything the voice times is unchanged.
    expect(tm.revealStart).toBe(t.revealStart);
    expect(tm.eraStarts).toEqual(t.eraStarts);
  });

  it('rises from silence under the cards and settles to the bed as the voice starts, without a step', () => {
    expect(movieMusicLevel(tm, 0)).toBe(0);
    expect(movieMusicLevel(tm, 3)).toBeCloseTo(MOVIE.introLevel, 6);
    expect(movieMusicLevel(tm, intro - 1e-6)).toBeCloseTo(MUSIC.soft, 4);
    expect(movieMusicLevel(tm, intro)).toBeCloseTo(MUSIC.soft, 6);
    let last = movieMusicLevel(tm, 0);
    for (let x = 1 / 100; x < intro + 5; x += 1 / 100) {
      const v = movieMusicLevel(tm, x);
      expect(Math.abs(v - last)).toBeLessThan(0.02);
      last = v;
    }
    // Then the site's swell, at full level by the end card.
    expect(movieMusicLevel(tm, intro + musicCues(tm).swellTo / P)).toBeCloseTo(MUSIC.loud, 6);
  });
});
