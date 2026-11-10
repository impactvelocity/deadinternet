/**
 * The last beat of the reveal: every session becomes a dot of light, and the
 * dots become a screen.
 *
 * - `dots`    each session's browser shrinks into a dot (quickly), then the
 *             rows of dots twinkle
 * - `signal`  the camera pulls back so the small round dots pack tighter, and
 *             they light up as symbols nobody is there to see (see signal.ts)
 * - `end`     the last symbol fades out with the music
 *
 * The field is never quite still. One dot, in the middle, is hers: warmer
 * than the rest, it blinks like a text cursor, solid while she talks. Her
 * voice leaves it as light and spreads out through the sessions, fading as
 * it goes (voice-levels.ts), and here and there the sessions it reaches
 * start "typing" back: three dots pulsing in turn, to no one. When the
 * robot says her credits have run out, her cursor stutters and goes out,
 * and its voice lights every dot at once instead. The typing goes on to
 * the very end, after everything else has faded.
 *
 * After the voice the symbols carry on, dimmed, under the closing title
 * (lib/flow/ending.ts), and the typing keeps clear of its words.
 *
 * Scroll position drives every step, so scrolling back undoes it. The twinkle
 * and the flicker also move with time, so a held frame is still alive.
 *
 * Drawn on a canvas in page space (design px) on top of the reveal world,
 * using the same camera, so the first dots sit exactly where their sessions
 * were.
 */
import { REVEAL_GEOMETRY as G, SIGNAL_SETTLE, type Camera } from './camera';
import type { Rect } from './ending';
import { maskOf, sampleMask, signalAt, SPOKEN } from './signal';
import { DOT_MORPH, type RevealPhase } from './timeline';
import type { VoiceTrack } from './voice-levels';

export const DOT_PHASES: readonly RevealPhase[] = ['dots', 'signal', 'end'];

const PITCH = { x: G.tile.w + G.gap, y: G.tile.h + G.gap };
const TILE_C = { x: G.tile.w / 2, y: G.tile.h / 2 };
const SLOT_C = { x: G.slot.x + G.slot.w / 2, y: G.slot.y + G.slot.h / 2 };
/** Share of the dots phase spent shrinking sessions into dots... */
const MORPH = DOT_MORPH;
/** ...and then settling into the twinkle (a third of a second or so, before the camera packs them). */
const SETTLE = 0.3;
const DOT_RGB = '226, 233, 255';
/** Her dot: the session in the middle, the one that was hers. A little warmer than the rest. */
const HER_RGB = '255, 210, 186';
/** Dot size on the final screen, in page px (about 4px on screen). */
const SIGNAL_DOT = 4.6;
/** How much of the red/blue fringe shows in a symbol's colour (0 = pure white light). */
const SIGNAL_TINT = 0.35;
/** Matches the stage background, so the field fades into the same night. */
const NIGHT = '5, 5, 7';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function noise(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Slow variations in light, interpolated so the field never strobes. */
function twinkle(seed: number, now: number): number {
  const clock = now / 1100 + noise(seed) * 11;
  const slot = Math.floor(clock);
  return 0.35 + 0.55 * lerp(noise(seed * 7.31 + slot * 1.7), noise(seed * 7.31 + (slot + 1) * 1.7), smooth(clock - slot));
}

export interface DotState {
  phase: RevealPhase;
  /** Progress through the phase, 0..1. */
  u: number;
  /** Clock in ms, for the twinkle and flicker. */
  now: number;
  /** Seconds since "Behind the feed" (drives the symbols). */
  clock?: number;
  /** Seconds after "Behind the feed" when the voice stops. */
  speech?: number;
  /** 0..1: dim the screen behind the closing title. */
  veil?: number;
  /** The voice, which the field lights up with (voice-levels.ts). Without it the field only twinkles. */
  voice?: VoiceTrack;
  /** Page px kept clear of the typing while the title is up (its words sit there). */
  hush?: Rect;
  /** 0..1: hold the skull up, steady, at this level, instead of letting it blink (the movie's ending). */
  skull?: number;
}

/* ------------------------------- Grid dots -------------------------------- */

/** 0..1 through `dots`: how far the new dots have settled into the field (0 while they're still forming). */
const settled = (u: number) => smooth((u - MORPH) / SETTLE);

/** Brightness of one session dot during `dots`: bright as it forms, then twinkling. */
export function gridLight(u: number, now: number, seed: number): number {
  return lerp(0.9, twinkle(seed, now), settled(u));
}

/* ------------------------------ The voice --------------------------------- */

/** World px between a session and hers, `dc` columns and `dr` rows away. */
const apart = (dc: number, dr: number) => Math.hypot(dc * PITCH.x, dr * PITCH.y);

/**
 * Her voice as light: it leaves her dot as she speaks and travels out
 * through the sessions, fading as it goes. In world px, so it spreads
 * through the sessions themselves however far back the camera is.
 */
export const ECHO = {
  /** About nine sessions a second. */
  speed: PITCH.x * 9,
  /** The light falls to about a third this far out. */
  reach: PITCH.x * 14,
  /** Each syllable sends out a ring: light per unit of rise in her voice over `onset` seconds... */
  ring: 0.95,
  onset: 0.12,
  /** ...with a fainter glow behind it while she keeps talking. */
  glow: 0.14,
} as const;

/** Light her voice adds `d` world px from her dot, `clock` seconds after "Behind the feed". */
export function echoLight(voice: VoiceTrack, clock: number, d: number): number {
  const at = clock - d / ECHO.speed;
  const level = voice.her(at);
  const rise = Math.max(0, level - voice.her(at - ECHO.onset));
  return Math.min(1, ECHO.ring * rise + ECHO.glow * level) * Math.exp(-d / ECHO.reach);
}

/** The robot's voice is everywhere at once: every dot steps up and down with it, a dozen times a second. */
const ROBOT = { gain: 0.13, rate: 12, steps: 4 } as const;

function robotLight(voice: VoiceTrack, clock: number): number {
  const level = voice.robot(Math.floor(clock * ROBOT.rate) / ROBOT.rate);
  return (Math.round(level * ROBOT.steps) / ROBOT.steps) * ROBOT.gain;
}

/**
 * Her cursor: solid while she talks, blinking in the pauses (on the wall
 * clock, so a paused frame still blinks). When the robot takes over it
 * stutters for a moment and goes out, and her session is just another dot.
 */
export const CURSOR = { period: 1.06, on: 0.55, out: 0.2, stutter: 0.75 } as const;

/** When her cursor has gone for good, in seconds after "Behind the feed". */
export const cursorGone = (voice: VoiceTrack) => voice.handover + CURSOR.out + CURSOR.stutter;

/** How lit her dot is (0..1) at `clock` (story seconds) and `now` (wall ms). */
export function cursorLight(voice: VoiceTrack, clock: number, now: number): number {
  const out = clock - voice.handover - CURSOR.out;
  if (out >= CURSOR.stutter) return 0;
  if (out >= 0) {
    // Dropping out: 45ms flickers, fewer and fewer of them lit.
    const tick = Math.floor(out / 0.045);
    return noise(tick * 3.7 + 11) < 0.75 * (1 - out / CURSOR.stutter) ? 0.9 : 0.06;
  }
  // Talking: the loudest she's been in the last third of a second.
  const talk = Math.max(voice.her(clock), voice.her(clock - 0.15), voice.her(clock - 0.3));
  const p = (now / 1000 / CURSOR.period) % 1;
  const blink = smooth(p / 0.05) * smooth((CURSOR.on - p) / 0.05);
  return Math.max(smooth((talk - 0.2) / 0.25), blink);
}

/* ------------------------------- Typing ----------------------------------- */

/**
 * Sessions typing to no one: here and there three dots in a row pulse in
 * turn, the way a chat shows someone typing. Every quarter second one may
 * start somewhere in the field; far more often where her voice has just
 * reached, as if they heard her.
 */
export const TYPING = {
  slot: 0.25,
  /** Seconds one lasts, shortest and longest. */
  life: [1.3, 2.9],
  /** Seconds for the pulse to run along its three dots. */
  cycle: 1.1,
  /** Chance per slot with no one talking, and the extra where her voice is passing. */
  chance: 0.16,
  heard: 0.55,
  /** How bright its dots get between pulses, and at the top of one (0..1). */
  rest: 0.42,
  light: 0.95,
  /** How far from her dot one can start, in sessions. */
  cols: 28,
  rows: 26,
} as const;

/** A session's key in `typingAt`'s map. */
export const cellKey = (col: number, row: number) => (col + 4096) * 8192 + (row + 4096);

/** One typing dot: how lit it is, and how much it has taken its session over from the twinkle (both 0..1). */
export interface Typed {
  light: number;
  on: number;
}

/** Every typing dot at `clock` (seconds after "Behind the feed"), by `cellKey`. */
export function typingAt(clock: number, voice?: VoiceTrack): Map<number, Typed> {
  const lit = new Map<number, Typed>();
  const [shortest, longest] = TYPING.life;
  for (let k = Math.floor((clock - longest) / TYPING.slot); k <= Math.floor(clock / TYPING.slot); k++) {
    const born = k * TYPING.slot;
    const age = clock - born;
    const life = lerp(shortest, longest, noise(k * 2.31 + 0.5));
    if (age < 0 || age >= life) continue;
    const dc = Math.round((noise(k * 3.17 + 1.1) * 2 - 1) * TYPING.cols);
    const dr = Math.round((noise(k * 5.71 + 2.3) * 2 - 1) * TYPING.rows);
    // Not on top of her.
    if (Math.abs(dc) < 3 && Math.abs(dr) < 2) continue;
    const heard = voice ? voice.her(born - apart(dc, dr) / ECHO.speed) : 0;
    if (noise(k * 7.93 + 3.7) >= TYPING.chance + TYPING.heard * heard) continue;
    const on = smooth(age / 0.2) * smooth((life - age) / 0.3);
    for (let i = 0; i < 3; i++) {
      const p = (((age / TYPING.cycle - i * 0.18) % 1) + 1) % 1;
      const pulse = p < 0.42 ? Math.sin((Math.PI * p) / 0.42) ** 2 : 0;
      const key = cellKey(G.center.col + dc + i - 1, G.center.row + dr);
      const light = on * lerp(TYPING.rest, TYPING.light, pulse);
      const was = lit.get(key);
      if (!was || was.light < light) lit.set(key, { light, on: Math.max(on, was?.on ?? 0) });
    }
  }
  return lit;
}

/* --------------------------------- Draw ----------------------------------- */

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= 0.01) return;
  if (a > 0.6) {
    ctx.fillStyle = `rgba(${DOT_RGB}, ${(a - 0.6) * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(${DOT_RGB}, ${a})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Every session dot on screen, in page px, at this camera. */
function gridDots(cam: Camera, W: number, H: number) {
  const { z, tx, ty } = cam;
  const out: { sx: number; sy: number; ox: number; oy: number; seed: number; col: number; row: number }[] = [];
  const col0 = Math.floor((-tx / z - G.tile.w) / PITCH.x) - 1;
  const col1 = Math.ceil((W - tx) / z / PITCH.x) + 1;
  const row0 = Math.floor((-ty / z - G.tile.h) / PITCH.y) - 1;
  const row1 = Math.ceil((H - ty) / z / PITCH.y) + 1;
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const ox = col * PITCH.x;
      const oy = row * PITCH.y;
      out.push({ sx: (ox + TILE_C.x) * z + tx, sy: (oy + TILE_C.y) * z + ty, ox, oy, seed: col * 7919 + row * 104729, col, row });
    }
  }
  return out;
}

/** Draw this frame. `ctx` is already scaled to page px; W × H is the page. */
export function drawDots(ctx: CanvasRenderingContext2D, cam: Camera, st: DotState, W: number, H: number) {
  // Paint a little past the page so no half-covered edge pixel lets the
  // field behind show through.
  ctx.clearRect(-8, -8, W + 16, H + 16);
  const morph = st.phase === 'dots' ? smooth(st.u / MORPH) : 1;
  ctx.fillStyle = `rgba(${NIGHT}, ${morph})`;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  const { z } = cam;
  const dotD = Math.max(3, PITCH.x * z * 0.11);
  const clock = st.clock ?? 0;
  const voice = st.voice;
  // Once every session is a dot the field comes alive: her cursor, her voice, the others typing.
  const alive = st.phase === 'dots' ? settled(st.u) : 1;
  const typing = alive > 0 ? typingAt(clock, voice) : null;
  const cursor = voice && alive > 0 ? cursorLight(voice, clock, st.now) * alive : 0;
  // Her session stays hers (dark between blinks) until her cursor has gone; then it's just another dot.
  const hers = voice && clock < cursorGone(voice) ? alive : 0;
  const robot = voice ? robotLight(voice, clock) : 0;
  const isHer = (g: { col: number; row: number }) => g.col === G.center.col && g.row === G.center.row;
  /** Her voice reaching one dot (0..1), a little uneven from dot to dot. */
  const echoed = (g: { col: number; row: number; seed: number }) =>
    voice ? echoLight(voice, clock, apart(g.col - G.center.col, g.row - G.center.row)) * (0.75 + 0.5 * noise(g.seed * 1.37)) : 0;
  let her: { x: number; y: number } | null = null;

  if (st.phase === 'dots') {
    for (const g of gridDots(cam, W, H)) {
      const a = gridLight(st.u, st.now, g.seed);
      if (morph < 1) {
        // The session's browser shrinks into a dot at the tile's center.
        const fromX = (g.ox + SLOT_C.x) * z + cam.tx;
        const fromY = (g.oy + SLOT_C.y) * z + cam.ty;
        const w = lerp(G.slot.w * z, dotD, morph);
        const h = lerp(G.slot.h * z, dotD, morph);
        ctx.fillStyle = `rgba(${DOT_RGB}, ${smooth(morph * 2.5) * a})`;
        ctx.beginPath();
        ctx.roundRect(lerp(fromX, g.sx, morph) - w / 2, lerp(fromY, g.sy, morph) - h / 2, w, h, lerp(12 * z, dotD / 2, morph));
        ctx.fill();
        continue;
      }
      if (isHer(g)) {
        her = { x: g.sx, y: g.sy };
        dot(ctx, g.sx, g.sy, dotD / 2, a * (1 - hers));
        continue;
      }
      // Her voice brightens and swells the dots it passes; a typing dot takes its session over from the twinkle.
      const echo = alive * echoed(g);
      const typed = typing?.get(cellKey(g.col, g.row));
      const field = typed ? lerp(a, a * 0.3, typed.on * alive) : a;
      const lit = Math.max(1 - (1 - field) * (1 - Math.min(1, echo + alive * robot)), (typed?.light ?? 0) * alive);
      dot(ctx, g.sx, g.sy, (dotD / 2) * (1 + Math.max(0.45 * echo, 0.3 * (typed?.light ?? 0) * alive)), lit);
    }
    if (her) drawHer(ctx, her.x, her.y, dotD / 2, cursor);
    return;
  }

  // `signal` and `end`: the same small round dots, now showing symbols.
  const frame = signalAt(clock, st.speech ?? Infinity);
  const held = st.skull ?? 0;
  const main = held > 0 ? maskOf('skull') : frame.glyph && frame.level > 0 ? maskOf(frame.glyph) : null;
  const flash = frame.flash ? maskOf(frame.flash) : null;
  const settle = st.phase === 'signal' ? smooth(st.u / SIGNAL_SETTLE) : 1;
  // Dots stay small and round (about 4px on screen) however close the camera gets.
  const size = lerp(dotD, SIGNAL_DOT, settle);
  // The red and blue channels slip a little against the green, re-slipping every 90ms.
  const tick = Math.floor(st.now / 90);
  const split = PITCH.x * z * (0.1 + 0.12 * noise(tick * 1.3));
  // The last note takes the screen to black.
  const out = st.phase === 'end' ? 1 - smooth(st.u) : 1;
  const veil = st.veil ?? 0;
  const fade = out * (1 - veil);
  // The typing outlasts everything else: still going, faintly, as the rest goes to black.
  const typeFade = Math.sqrt(out) * (1 - veil * 0.55);
  const hush = veil > 0 ? st.hush : undefined;
  const hushed = 1 - clamp01(veil * 3);
  // Until the first symbol the rows hold their light; then they dim to let the symbols through.
  const quiet = smooth((clock - (SPOKEN[0].at - 0.5)) / 1.2);
  const idleLevel = lerp(lerp(1, 0.5, settle), 0.17, quiet);
  // Her voice carries on under the symbols, more softly.
  const voiceLevel = lerp(1, 0.6, quiet);
  // Each dot averages the symbol over its share of the screen, for soft shading.
  const radius = PITCH.y * z * 0.4;
  const glows = new Map<string, Path2D>();
  const dots = new Map<string, Path2D>();
  for (const g of gridDots(cam, W, H)) {
    const mine = isHer(g);
    if (mine) her = { x: g.sx, y: g.sy };
    // The rows keep a faint twinkle, with her voice (and later the robot's) passing through them,
    // and here and there a session typing, which takes its dot over from the twinkle.
    const echo = mine ? 0 : echoed(g) * voiceLevel;
    const typing1 = mine ? undefined : typing?.get(cellKey(g.col, g.row));
    let typed = (typing1?.light ?? 0) * typeFade;
    if (typed > 0 && hush && g.sx > hush.x && g.sx < hush.x + hush.w && g.sy > hush.y && g.sy < hush.y + hush.h) typed *= hushed;
    const twink = twinkle(g.seed, st.now) * idleLevel * (mine ? 1 - hers : 1 - 0.7 * (typing1?.on ?? 0));
    const idle = Math.min(1, twink + echo + (mine ? 0 : robot));
    const hum = 0.85 + 0.15 * noise(g.seed + tick);
    let r = 0;
    let gr = 0;
    let b = 0;
    if (main) {
      const level = Math.max(frame.level, held) * hum;
      r = sampleMask(main, g.sx - split, g.sy, radius) * level;
      gr = sampleMask(main, g.sx, g.sy, radius) * level;
      b = sampleMask(main, g.sx + split, g.sy, radius) * level;
    }
    if (flash) {
      const f = sampleMask(flash, g.sx, g.sy, radius) * 0.75;
      r = Math.max(r, f);
      gr = Math.max(gr, f);
      b = Math.max(b, f);
    }
    // Mostly white light, with only a hint of the colour fringe.
    const lum = (r + gr + b) / 3;
    const tint = (c: number) => lum + (c - lum) * SIGNAL_TINT;
    const light = Math.min(1, Math.max(idle, lum * 0.9));
    if (light * fade < 0.01 && typed < 0.01) continue;
    const R = Math.max(Math.min(255, 226 * idle + 240 * tint(r)) * fade, 226 * typed);
    const Gc = Math.max(Math.min(255, 233 * idle + 240 * tint(gr)) * fade, 233 * typed);
    const B = Math.max(Math.min(255, 255 * idle + 250 * tint(b)) * fade, 255 * typed);
    const rgb = `${step(R)},${step(Gc)},${step(B)}`;
    // A faint glow around the brightest dots.
    const bright = Math.max(lum * fade, typed);
    if (bright > 0.45) addCircle(glows, `rgba(${rgb},${(Math.round((bright - 0.45) * 0.18 * 50) / 50).toFixed(2)})`, g.sx, g.sy, size * 1.8);
    addCircle(dots, `rgb(${rgb})`, g.sx, g.sy, (size / 2) * (1 + Math.max(0.5 * echo * fade, 0.3 * typed)));
  }
  // Thousands of dots, but only a few dozen colours: one fill per colour.
  for (const [style, path] of glows) {
    ctx.fillStyle = style;
    ctx.fill(path);
  }
  for (const [style, path] of dots) {
    ctx.fillStyle = style;
    ctx.fill(path);
  }
  if (her) drawHer(ctx, her.x, her.y, size / 2, cursor * out);
}

/** Her dot, lit `a` (0..1): warm, with a soft halo, over whatever the field shows there. */
function drawHer(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= 0.01) return;
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.2);
  halo.addColorStop(0, `rgba(${HER_RGB}, ${(a * 0.3).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${HER_RGB}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${HER_RGB}, ${(a * 0.95).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
}

/** Colour channels rounded to steps of 8, so dots can share a fill. */
const step = (v: number) => Math.round(v / 8) * 8;

function addCircle(paths: Map<string, Path2D>, style: string, x: number, y: number, r: number) {
  let path = paths.get(style);
  if (!path) {
    path = new Path2D();
    paths.set(style, path);
  }
  path.moveTo(x + r, y);
  path.arc(x, y, r, 0, Math.PI * 2);
}
