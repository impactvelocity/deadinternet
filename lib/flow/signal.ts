/**
 * The last screen: every session is one pixel, and between them they show
 * shapes nobody is there to see.
 *
 * Once "Behind the feed" starts, the camera holds on the rows of session dots
 * and pushes in until they read as a coarse screen of pixels. Then the pixels
 * light up as symbols, in step with the voice; after it, only a skull,
 * blinking on and off to the end while the music swells. Each symbol
 * flickers on, hums, and drops out; while the voice lasts, now and then
 * another flashes for a frame or two. The red and blue channels sit slightly off the green, like a
 * screen losing sync.
 *
 * Symbols are drawn once each, off screen, as a soft greyscale mask; every
 * pixel samples it, so the shading (bright brow, dark sockets) comes through
 * as different light levels. The schedule is a pure function of time since
 * "Behind the feed", so scrubbing replays it exactly.
 */

export type Glyph = 'chat' | 'smile' | 'eye' | 'you' | 'question' | 'hi' | 'help' | 'price' | 'pro' | 'forever' | 'skull' | 'yes' | 'error';

/** One symbol on screen from `at` to `until` (seconds after "Behind the feed"). */
interface Slot {
  at: number;
  until: number;
  glyph: Glyph;
}

/** In step with the reveal narration (word times from the voice clip). */
export const SPOKEN: readonly Slot[] = [
  { at: 7.7, until: 9.35, glyph: 'chat' }, //     "Now it's just a chat agent"
  { at: 9.4, until: 10.95, glyph: 'smile' }, //   "pretending to be us,"
  { at: 11.05, until: 12.55, glyph: 'eye' }, //   "pretending to be me,"
  { at: 12.6, until: 14.1, glyph: 'you' }, //     "pretending to be you."
  { at: 14.2, until: 16.25, glyph: 'question' }, // "But who are they speaking to?"
  { at: 16.35, until: 18.25, glyph: 'hi' }, //    "Is there anyone here?"
  { at: 18.35, until: 19.75, glyph: 'help' }, // "Can anyone hear me?"
  { at: 20.1, until: 23.2, glyph: 'error' }, //  "You've run out of credits. To continue being yourself,"
  { at: 23.3, until: 25.5, glyph: 'pro' }, //    "upgrade to Pro Max Plus Pro."
  { at: 25.6, until: 26.9, glyph: 'price' }, //  "Only $29 a month"
  { at: 26.95, until: 28.6, glyph: 'forever' }, // "for the rest of your life."
];

/** After the voice: only the skull, blinking on and off to the end. */
const AFTER: readonly Glyph[] = ['skull'];
const AFTER_STEP = 2.4;
const AFTER_ON = 1.6;
/** Brief flashes of another symbol, at most this often (seconds). */
const FLASH_EVERY = 1.7;

const ALL: readonly Glyph[] = ['chat', 'smile', 'eye', 'you', 'question', 'hi', 'help', 'price', 'pro', 'forever', 'skull', 'yes', 'error'];

function noise(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface SignalFrame {
  glyph: Glyph | null;
  /** 0..1: how lit the symbol is right now (flicker in, hum, drop out). */
  level: number;
  /** A symbol flashed over it for a frame or two, if any. */
  flash: Glyph | null;
}

/** On, with a stuttering start and a hard cut. `t` is seconds into the slot. */
function envelope(t: number, length: number, seed: number): number {
  if (t < 0 || t >= length) return 0;
  // Stutter on: a few 50ms ticks that miss.
  if (t < 0.3) return noise(seed + Math.floor(t / 0.05)) < 0.35 + t * 2 ? 0.95 : 0.12;
  // Hum, with the odd dropout.
  const tick = Math.floor(t / 0.06);
  if (noise(seed * 3 + tick) < 0.04) return 0.25;
  return 0.82 + 0.18 * noise(seed * 7 + tick);
}

/**
 * What the screen shows `clock` seconds after "Behind the feed"; `speech` is
 * when the voice stops (also in seconds after it).
 */
export function signalAt(clock: number, speech: number): SignalFrame {
  let slot: Slot | undefined;
  for (const s of SPOKEN) if (clock >= s.at && clock < s.until) slot = s;
  if (!slot && clock >= speech) {
    const i = Math.floor((clock - speech) / AFTER_STEP);
    const at = speech + i * AFTER_STEP + 0.35;
    slot = { at, until: at + AFTER_ON, glyph: AFTER[i % AFTER.length] };
  }
  const glyph = slot && clock >= slot.at && clock < slot.until ? slot.glyph : null;
  const level = slot && glyph ? envelope(clock - slot.at, slot.until - slot.at, Math.round(slot.at * 100)) : 0;

  // Flashes: only while the voice lasts (after it there's only the skull), never in the first stutter.
  let flash: Glyph | null = null;
  if (clock >= SPOKEN[0].at && clock < speech) {
    const k = Math.floor(clock / FLASH_EVERY);
    const t = clock - k * FLASH_EVERY;
    const start = noise(k * 5.3) * (FLASH_EVERY - 0.2);
    const length = 0.06 + noise(k * 9.1) * 0.08;
    if (noise(k * 2.7) < 0.45 && t >= start && t < start + length) {
      const pick = ALL[Math.floor(noise(k * 11.3) * ALL.length)];
      if (pick !== glyph) flash = pick;
    }
  }
  return { glyph, level, flash };
}

/* --------------------------------- Masks ---------------------------------- */

/** Masks are drawn at this size and sampled in page space (1600 × 1020). */
export const MASK = { w: 320, h: 204, scale: 5 } as const;

const masks = new Map<Glyph, Float32Array | null>();

function text(ctx: CanvasRenderingContext2D, s: string, size: number, y = MASK.h / 2) {
  ctx.font = `900 ${size}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, MASK.w / 2, y);
}

/** Paint one symbol white-on-black, centred, filling most of the screen. */
function paint(ctx: CanvasRenderingContext2D, glyph: Glyph) {
  const cx = MASK.w / 2;
  const cy = MASK.h / 2;
  // Keep every symbol inside the part of the page that's on screen.
  ctx.translate(cx, cy);
  ctx.scale(0.85, 0.85);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (glyph) {
    case 'skull': {
      // Cranium: brightest at the brow, falling off toward the jaw.
      const head = ctx.createRadialGradient(cx, cy - 46, 8, cx, cy - 20, 110);
      head.addColorStop(0, '#fff');
      head.addColorStop(0.6, '#cfcfcf');
      head.addColorStop(1, '#5a5a5a');
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 22, 66, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cheekbones and jaw.
      ctx.beginPath();
      ctx.roundRect(cx - 50, cy + 10, 100, 58, 22);
      ctx.fill();
      ctx.fillStyle = '#000';
      // Sockets, deep and slightly uneven.
      ctx.beginPath();
      ctx.ellipse(cx - 27, cy - 2, 21, 19, -0.15, 0, Math.PI * 2);
      ctx.ellipse(cx + 27, cy - 2, 21, 19, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Nose cavity.
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14);
      ctx.lineTo(cx - 9, cy + 32);
      ctx.lineTo(cx + 9, cy + 32);
      ctx.closePath();
      ctx.fill();
      // Teeth: a dark gap and bars between them.
      ctx.fillRect(cx - 36, cy + 44, 72, 5);
      for (let i = -3; i <= 3; i++) ctx.fillRect(cx + i * 10 - 1, cy + 38, 2, 22);
      break;
    }
    case 'eye': {
      ctx.beginPath();
      ctx.moveTo(cx - 120, cy);
      ctx.quadraticCurveTo(cx, cy - 92, cx + 120, cy);
      ctx.quadraticCurveTo(cx, cy + 92, cx - 120, cy);
      ctx.fill();
      const iris = ctx.createRadialGradient(cx, cy, 6, cx, cy, 44);
      iris.addColorStop(0, '#000');
      iris.addColorStop(0.45, '#000');
      iris.addColorStop(0.5, '#444');
      iris.addColorStop(1, '#8a8a8a');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(cx, cy, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + 14, cy - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'smile': {
      // A friendly face, with a smile far too wide.
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 86, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 30, cy - 26, 11, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy - 26, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 64, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'chat': {
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.roundRect(cx - 110, cy - 64, 220, 118, 34);
      ctx.moveTo(cx - 54, cy + 54);
      ctx.lineTo(cx - 76, cy + 86);
      ctx.lineTo(cx - 20, cy + 54);
      ctx.stroke();
      for (const dx of [-46, 0, 46]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy - 6, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'error': {
      // An empty battery, nothing left.
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.roundRect(cx - 104, cy - 52, 190, 104, 14);
      ctx.stroke();
      ctx.fillRect(cx + 90, cy - 22, 20, 44);
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(cx - 88, cy - 36, 14, 72);
      break;
    }
    case 'question':
      text(ctx, '?', 230, cy + 8);
      break;
    case 'you':
      text(ctx, 'YOU', 128);
      break;
    case 'hi':
      text(ctx, 'HI?', 128);
      break;
    case 'help':
      text(ctx, 'HELP', 108);
      break;
    case 'yes':
      text(ctx, 'YES', 128);
      break;
    case 'pro':
      text(ctx, 'PRO', 128);
      break;
    case 'price':
      text(ctx, '$29', 128);
      break;
    case 'forever':
      text(ctx, '∞', 240, cy + 6);
      break;
  }
}

/** The greyscale mask of a symbol (0..1 per mask pixel), or null without a canvas. */
export function maskOf(glyph: Glyph): Float32Array | null {
  if (masks.has(glyph)) return masks.get(glyph)!;
  let out: Float32Array | null = null;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d', { willReadFrequently: true }) ?? null;
  if (canvas && ctx) {
    canvas.width = MASK.w;
    canvas.height = MASK.h;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, MASK.w, MASK.h);
    paint(ctx, glyph);
    const data = ctx.getImageData(0, 0, MASK.w, MASK.h).data;
    out = new Float32Array(MASK.w * MASK.h);
    for (let i = 0; i < out.length; i++) out[i] = data[i * 4] / 255;
  }
  masks.set(glyph, out);
  return out;
}

/** The mask's light at page point (x, y), averaged over a pixel-sized patch. */
export function sampleMask(mask: Float32Array, x: number, y: number, radius: number): number {
  const r = Math.max(0, Math.round(radius / MASK.scale));
  const mx = Math.round(x / MASK.scale);
  const my = Math.round(y / MASK.scale);
  let sum = 0;
  let n = 0;
  for (let dy = -r; dy <= r; dy += Math.max(1, r)) {
    for (let dx = -r; dx <= r; dx += Math.max(1, r)) {
      const px = mx + dx;
      const py = my + dy;
      n++;
      if (px < 0 || py < 0 || px >= MASK.w || py >= MASK.h) continue;
      sum += mask[py * MASK.w + px];
    }
  }
  return n ? sum / n : 0;
}
