/**
 * The film as a video (`/movie`, rendered by scripts/render-film.mjs): no
 * header, play bar or start screen, just the frame, on black.
 *
 * The score starts on the first frame, under two title cards: the
 * dead-internet mark, then who it was made for.
 * Then the browser window arrives at its small 2005 size and the story
 * starts: voice and scrolling exactly as the site plays them, the window
 * growing era by era until its screen fills the frame with `pad` px of black
 * around it. Its arrival eases into that growth without ever stopping. Once
 * it's there, a faint glow in each era's colours sits behind it
 * (`ambienceAt`); the cards stay on plain black. At the reveal the frame
 * eases out from the screen to the whole page, so the pull-back has the same
 * room it has on the site. The end title then moves up, smaller, and a few
 * lines say how the film was made; the last, "none of this is real",
 * glitches out as the skull brightens. Once the score has peaked, the title's
 * lines leave one by one, from the edges in, and a single dot is left where
 * it was; it holds alone for a moment after the score ends.
 *
 * Because the score starts under the titles, the story gets that much less
 * of it (`movieScoreSeconds`, compiled into the movie's timeline), so the
 * swell and the track's closing fade still land on the end card exactly as
 * on the site; only the title's hold before the final fade is shorter.
 *
 * Everything here is a pure function of movie time, so any frame can be
 * drawn on its own (the renderer draws them out of order, in parallel).
 */
import type { Backdrop } from '@/data/flow/types';
import { PAGE, PAGE_WINDOW, WINDOW, WINDOW_GROWTH, windowScale } from './camera';
import { titleStart } from './ending';
import { MUSIC, musicCues, musicSwell } from './music';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

export const MOVIE = {
  /** Black left around the full-size screen, in viewport px. */
  pad: 30,
  /** The opening cards, in order: seconds each holds (each fades in and out on black before the next). */
  cards: [1.8, 2] as const,
  /** Seconds each card takes to fade in, and again to fade out. */
  cardFade: 0.5,
  /** Seconds the window takes to arrive after the cards; the story starts as it lands. */
  arrive: 0.9,
  /** The window's size as it starts to arrive, relative to its opening size (grown about the screen's centre). */
  arriveScale: 0.94,
  /** Seconds one era's ambience takes to give way to the next, centred on the era change. */
  ambienceFade: 2.6,
  /** Seconds the ambience takes to come up once the window starts to arrive (the cards stay on plain black). */
  ambienceIn: 2.2,
  /** Seconds the last frame (the dot alone) holds after the story ends. */
  outro: 3,
  /**
   * The title leaving, in seconds after the score's peak (the end phase):
   * its groups of lines go one after another, outside in (the mark and
   * links, the date, the credit, then the title itself), each over `each`.
   */
  exit: { at: 1, stagger: 0.35, each: 1.3, groups: 4 },
  /**
   * How it was made, under the end title. `liftAt` seconds after the title
   * starts to appear it moves up to the top edge, smaller, and its credit
   * moves down to the foot of the frame (over `lift` seconds). In the middle
   * `lines` short lines play one at a time, each fading over `fade`; the
   * last of them fades into the final line, which holds for `last` seconds,
   * glitches out over `glitch`, and is gone `tail` seconds before the title
   * starts to leave.
   */
  made: { liftAt: 2.2, lift: 0.8, lines: 4, fade: 0.5, last: 3.2, glitch: 1.7, tail: 1.6 },
  /** How much further the field of dots dims while those lines are up (added to the title's veil)... */
  madeVeil: 0.22,
  /** ...and how much of the dimming lifts as the skull comes up under the final line, starting `skullLead` seconds before the glitch. */
  skullGlow: 0.78,
  skullLead: 1.2,
  /** The last dot fading up where the title was, in seconds after the score's peak. */
  dot: { at: 2.6, in: 1.2 },
  /** Score level under the cards (linear gain); it settles to the bed under the voice as the window arrives. */
  introLevel: 0.5,
} as const;

/** Where the page box sits in the viewport: `translate(x, y) scale(scale)`. */
export interface Fit {
  scale: number;
  x: number;
  y: number;
}

/** The fit that puts the full-size screen in the viewport with `pad` px around it, centred. */
export function screenFit(vw: number, vh: number, pad: number = MOVIE.pad): Fit {
  const screenH = WINDOW.h - WINDOW.chrome;
  const scale = Math.max(1e-3, Math.min((vw - 2 * pad) / WINDOW.w, (vh - 2 * pad) / screenH));
  return {
    scale,
    x: vw / 2 - (PAGE_WINDOW.x + WINDOW.w / 2) * scale,
    y: vh / 2 - (PAGE_WINDOW.y + WINDOW.chrome + screenH / 2) * scale,
  };
}

/** The fit that shows the whole page box, centred: room for the reveal's pull-back. */
export function pageFit(vw: number, vh: number): Fit {
  const scale = Math.max(1e-3, Math.min(vw / PAGE.w, vh / PAGE.h));
  return { scale, x: (vw - PAGE.w * scale) / 2, y: (vh - PAGE.h * scale) / 2 };
}

/**
 * From fit `a` (k = 0) to fit `b` (k = 1) as a pure zoom about the one point
 * both leave in place, like the reveal camera, so nothing slides sideways.
 */
export function blendFit(a: Fit, b: Fit, k: number): Fit {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const scale = Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * k);
  if (Math.abs(a.scale - b.scale) < 1e-9) return { scale, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  // Page point P lands on the same viewport point Q under both fits.
  const px = (b.x - a.x) / (a.scale - b.scale);
  const py = (b.y - a.y) / (a.scale - b.scale);
  const qx = a.scale * px + a.x;
  const qy = a.scale * py + a.y;
  return { scale, x: qx - scale * px, y: qy - scale * py };
}

export const fitTransform = (f: Fit) => `translate(${f.x}px, ${f.y}px) scale(${f.scale})`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/**
 * How far the movie has eased out from the screen fit (0) to the page fit
 * (1): over the reveal's first pull-back, on the camera's own easing, so the
 * two zooms read as one.
 */
export function pageMix(reveal: { phase: string; u: number } | null): number {
  if (!reveal) return 0;
  if (reveal.phase !== 'sandbox') return 1;
  const u = clamp01(reveal.u);
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/** Movie seconds each card starts at, and when the last one has gone. */
function cardStarts(): { starts: number[]; end: number } {
  const starts: number[] = [];
  let at = 0;
  for (const hold of MOVIE.cards) {
    starts.push(at);
    at += 2 * MOVIE.cardFade + hold;
  }
  return { starts, end: at };
}

/** Movie seconds before the story starts: the cards, then the window's arrival. */
export const movieIntro = () => cardStarts().end + MOVIE.arrive;

/**
 * Seconds of score the movie's story runs to (compileTimeline's
 * `scoreSeconds`): the score starts with the first card, so its last note
 * still ends the story.
 */
export const movieScoreSeconds = () => MUSIC.durationSeconds - movieIntro();

/** Movie seconds from the first frame to the last. */
export function movieDuration(t: Pick<Timeline, 'total'>): number {
  return movieIntro() + t.total / PLAY_SPEED + MOVIE.outro;
}

export interface MovieFrame {
  /** Story position (the site's scroll px). */
  s: number;
  /** The window's size (windowScale's units). */
  scale: number;
  /** How strong the ambience behind the window is (0..1). */
  glow: number;
  /** Each opening card's opacity, in order. */
  cards: number[];
  /** The window's arrival, 0 (not there) to 1 (in place). */
  window: number;
  /** The story clock is running: the voice plays. */
  rolling: boolean;
  /** How far each group of the end title's lines has left, outside in (0 = there, 1 = gone). */
  exit: number[];
  /** The last dot, 0..1. */
  dot: number;
  /** 0..1: the end title moved up and smaller, its credit down, making room for the scenes. */
  lift: number;
  /** Each how-it-was-made line, the final one last: opacity `o`, and `p`, 0..1 through its time on screen. */
  made: { o: number; p: number }[];
  /** 0..1: how far the final line has glitched out. */
  glitch: number;
  /** 0..1: the skull held up in the dots under the final line, brightening. */
  skull: number;
}

/**
 * The window's size at `seconds` (windowScale's units). It arrives quickly,
 * slowing steadily to exactly the site's growth rate as the story starts, so
 * the motion carries straight on into the growth instead of stopping.
 */
export function movieWindowScale(t: Pick<Timeline, 'pullbackStart'>, seconds: number): number {
  const intro = movieIntro();
  if (seconds >= intro) return windowScale((seconds - intro) * PLAY_SPEED, t.pullbackStart);
  const g1 = windowScale(0, t.pullbackStart);
  const g0 = WINDOW_GROWTH.start * MOVIE.arriveScale;
  // The growth is steady at first: its rate over the first quarter second is its rate.
  const rate = (windowScale(0.25 * PLAY_SPEED, t.pullbackStart) - g1) / 0.25;
  const u = clamp01((seconds - (intro - MOVIE.arrive)) / MOVIE.arrive);
  // Constant deceleration from v0 to v1 (per unit of u) covers g0 → g1.
  const v1 = rate * MOVIE.arrive;
  const v0 = Math.max(v1, 2 * (g1 - g0) - v1);
  return g0 + v0 * u + ((v1 - v0) * u * u) / 2;
}

/** What the movie shows at `seconds`. */
export function movieFrame(t: Pick<Timeline, 'total' | 'pullbackStart' | 'reveal' | 'revealStart'>, seconds: number): MovieFrame {
  const { starts, end } = cardStarts();
  const intro = end + MOVIE.arrive;
  const f = MOVIE.cardFade;
  const cards = MOVIE.cards.map((hold, k) => {
    const x = seconds - starts[k];
    return smooth(x / f) * (1 - smooth((x - f - hold) / f));
  });
  const s = Math.min(t.total, Math.max(0, (seconds - intro) * PLAY_SPEED));
  return {
    s,
    scale: movieWindowScale(t, seconds),
    glow: ambienceLevel(seconds),
    cards,
    window: smooth((seconds - end) / MOVIE.arrive),
    rolling: seconds >= intro && s < t.total,
    ...movieEnding(t, seconds),
  };
}

/**
 * The end. Once the title is up it moves aside for a few lines on how the
 * film was made, the last of which glitches out as the skull brightens
 * behind it; then, from the score's peak (the start of the `end` phase), the
 * title's lines leave, outside in, and one dot is left.
 */
export function movieEnding(
  t: Pick<Timeline, 'total' | 'reveal' | 'revealStart'>,
  seconds: number,
): Pick<MovieFrame, 'exit' | 'dot' | 'lift' | 'made' | 'glitch' | 'skull'> {
  const peak = movieIntro() + (t.reveal.find((r) => r.phase === 'end')?.s0 ?? t.total) / PLAY_SPEED;
  const x = seconds - peak;
  const { at, stagger, each, groups } = MOVIE.exit;
  // Worked back from the title's leaving: the final line gone, its glitch, its hold.
  const M = MOVIE.made;
  const liftAt = movieIntro() + titleStart(t) / PLAY_SPEED + M.liftAt;
  const gone = peak + at - M.tail;
  const glitchAt = gone - M.glitch;
  const lastAt = glitchAt - M.last - M.fade;
  // The other lines share the time from the title settling to the final line.
  const first = liftAt + M.lift * 0.6;
  const span = (lastAt + M.fade - first) / M.lines;
  // Too little time for them (a much shorter ending): leave them all out.
  const room = span >= 4 * M.fade;
  const made = Array.from({ length: M.lines }, (_, k) => {
    const y = seconds - (first + k * span);
    return { o: room ? smooth(y / M.fade) * (1 - smooth((y - (span - M.fade)) / M.fade)) : 0, p: clamp01(y / span) };
  });
  // The final line comes up through the end of the one before it, and holds until it has glitched away.
  made.push({
    o: room && seconds < gone ? smooth((seconds - lastAt - M.fade * 0.4) / M.fade) : 0,
    p: clamp01((seconds - lastAt) / (gone - lastAt)),
  });
  return {
    exit: Array.from({ length: groups }, (_, k) => smooth((x - at - k * stagger) / each)),
    dot: smooth((x - MOVIE.dot.at) / MOVIE.dot.in),
    lift: smooth((seconds - liftAt) / M.lift),
    made,
    glitch: room ? clamp01((seconds - glitchAt) / M.glitch) : 0,
    skull: room ? smooth((seconds - (glitchAt - MOVIE.skullLead)) / (M.glitch + MOVIE.skullLead)) : 0,
  };
}

/**
 * The score's level at `seconds` into the movie (the track starts on the
 * first frame): up from silence under the cards, settling to the site's bed
 * as the window arrives, then the site's swell on story position.
 */
export function movieMusicLevel(t: Timeline, seconds: number): number {
  const intro = movieIntro();
  const fade = smooth(seconds / MUSIC.fadeIn);
  if (seconds >= intro) return fade * musicSwell(Math.min(t.total, (seconds - intro) * PLAY_SPEED), musicCues(t));
  // Settle in decibels, so the step down sounds even.
  const settle = smooth((seconds - (intro - MOVIE.arrive)) / MOVIE.arrive);
  return fade * MOVIE.introLevel * (MUSIC.soft / MOVIE.introLevel) ** settle;
}

/* -------------------------------- Ambience -------------------------------- */

export type Rgb = readonly [number, number, number];

export interface Ambience {
  /** Glow up from the top left: the era's first backdrop colour, deepened for black. */
  a: Rgb;
  /** Glow up from the bottom right: its second. */
  b: Rgb;
}

function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A pastel page colour as a glow on black: the same hue, its saturation
 * deepened in proportion (so a grey era stays grey), at mid lightness.
 */
export function deepen(hex: string): Rgb {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  if (h < 0) h += 6;
  const S = Math.min(0.78, sat * 1.15);
  const L = 0.46;
  // HSL back to RGB.
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = L - c / 2;
  const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

const mixRgb = (p: Rgb, q: Rgb, m: number): Rgb => [p[0] + (q[0] - p[0]) * m, p[1] + (q[1] - p[1]) * m, p[2] + (q[2] - p[2]) * m];

/**
 * The glow behind the window at story position `s`, for the film's `eras`
 * (in timeline order): each era's backdrop colours, handing over to the
 * next era's around each era change.
 */
export function ambienceAt(t: Pick<Timeline, 'eraStarts'>, eras: readonly { backdrop: Backdrop }[], s: number): Ambience {
  if (!eras.length) return { a: [0, 0, 0], b: [0, 0, 0] };
  const of = (k: number): Ambience => ({ a: deepen(eras[k].backdrop.glow), b: deepen(eras[k].backdrop.glow2) });
  const half = (MOVIE.ambienceFade * PLAY_SPEED) / 2;
  let out = of(0);
  for (let k = 1; k < eras.length && k < t.eraStarts.length; k++) {
    const m = smooth((s - (t.eraStarts[k] - half)) / (2 * half));
    if (m <= 0) break;
    const next = of(k);
    out = { a: mixRgb(out.a, next.a, m), b: mixRgb(out.b, next.b, m) };
  }
  return out;
}

/** How strong the ambience is: none under the cards, then up slowly as the window arrives. */
export function ambienceLevel(seconds: number): number {
  return smooth((seconds - cardStarts().end) / MOVIE.ambienceIn);
}
