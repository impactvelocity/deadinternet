/**
 * Flow timeline: turns the era + post data and a layout measurement into one
 * scroll-driven script, then samples it at any scroll position.
 *
 * Story distance `s` is window scroll in px. The script is a list of beats
 * that cover `s` end to end:
 *
 * - `scroll`  the feed glides to the next focus stop: quick away, eased in,
 *              a small landing bounce (none for robots); long gaps go faster
 * - `hold`    the feed pauses (an era settling in, or a glance at a post)
 * - `act`     the feed pauses while the agent's cursor moves, clicks, types,
 *              then holds a moment so the result (a like, a comment) lands
 * - `reveal`  the camera pulls back from the page (sandbox, then servers)
 *
 * Everything is a pure function of `s`, so scrubbing backwards replays the
 * same frames in reverse. Effects (likes, posted comments, dismissed overlays)
 * are events with an `s` position; the state at `s` is "every event at or
 * before `s`".
 *
 * All coordinates are design px on the 1280×800 screen. Targets inside the
 * feed are measured in feed-content coordinates and converted with the feed
 * offset of the beat that uses them.
 */
import type { AgentAction, FlowEra, FlowPost } from '@/data/flow/types';
import narration from '@/data/flow/narration.json';
import { MUSIC } from './music';
import { PLAY_SPEED, SCENE_PAUSE_SECONDS, sceneSeconds } from './playback';

/* ---------------------------------- Types --------------------------------- */

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TargetRect extends Rect {
  space: 'feed' | 'screen';
}

export interface FlowMeasure {
  /** Feed viewport on the screen. */
  viewport: Rect;
  /** Full feed content height, including the endless tail. */
  contentHeight: number;
  /** Content y where the real posts end and the endless tail begins. */
  feedEnd: number;
  /** Section top per era, in era order (content coords). */
  eras: { id: string; top: number }[];
  posts: Record<string, { top: number; height: number }>;
  targets: Record<string, TargetRect>;
}

export type RevealPhase = 'sandbox' | 'chat' | 'servers' | 'farm' | 'dots' | 'signal' | 'end';

/** Share of the `dots` phase spent shrinking each session into its dot (see dots.ts). */
export const DOT_MORPH = 0.55;

/** Reveal phases in order. */
export const REVEAL_PHASES: readonly RevealPhase[] = ['sandbox', 'chat', 'servers', 'farm', 'dots', 'signal', 'end'];

export type Seg =
  | { kind: 'move'; s0: number; s1: number; from: Pt; to: Pt; curve: number; linear: boolean }
  | { kind: 'dwell'; s0: number; s1: number; at: Pt }
  | { kind: 'press'; s0: number; s1: number; at: Pt };

export interface Typing {
  s0: number;
  s1: number;
  /** When the comment is posted; the finished text shows until then. */
  end: number;
  text: string;
  postId: string;
  paste: boolean;
}

export type Beat =
  /**
   * The feed glides from `from` to `to`: quick away, eased in to land, then
   * overshoots by `bounce` px and springs back (0 for robots).
   *
   * A `continuous` scroll (the edited film) is one piece of a single smooth
   * motion instead: a cubic that leaves at velocity `v0` and arrives at `v1`
   * (feed px per story px), so consecutive scrolls join without a jolt and
   * the feed only comes to rest where the agent acts.
   */
  | {
      kind: 'scroll';
      s0: number;
      s1: number;
      from: number;
      to: number;
      bounce: number;
      cursor: Pt;
      continuous?: boolean;
      v0?: number;
      v1?: number;
    }
  | { kind: 'hold'; s0: number; s1: number; offset: number; cursor: Pt; label: string }
  | {
      kind: 'act';
      s0: number;
      s1: number;
      offset: number;
      postId: string;
      action: AgentAction;
      segs: Seg[];
      typing?: Typing;
      cursorEnd: Pt;
      label: string;
    }
  /**
   * After the last era's narration: the feed runs on through the endless tail
   * of bot posts, picking up speed from rest, until the film ends.
   */
  | { kind: 'tail'; s0: number; s1: number; from: number; to: number; ramp: number; cursor: Pt };

/**
 * One step of the camera's pull-back, on its own track: it starts during the
 * last era's narration while the feed in the window keeps playing. `warp`
 * bends progress so a phase can hold its end state longer: progress `at`
 * maps to `u = to`, linearly on both sides.
 */
export interface RevealSpan {
  phase: RevealPhase;
  s0: number;
  s1: number;
  warp?: { at: number; to: number };
}

export type EffectType =
  | 'like'
  | 'heart'
  | 'palette'
  | 'unpalette'
  | 'pick'
  | 'react'
  | 'focus'
  | 'post'
  | 'share'
  | 'cta'
  | 'watch'
  | 'watched'
  | 'chrome'
  | 'appear'
  | 'choose'
  | 'dismiss';

export interface FlowEvent {
  s: number;
  type: EffectType;
  /** Post id, `<era>:<chrome target>`, or overlay id. */
  key: string;
  value?: string;
}

/** One notification under Ashley's chip, visible while `s0 <= s < s1`. */
export interface PingSlot {
  s0: number;
  s1: number;
  /** Era index and ping index within that era's `pings`. */
  era: number;
  index: number;
}

/** A glitch burst centred on `s`. */
export interface GlitchWindow {
  s: number;
  width: number;
  strength: number;
}

export interface Timeline {
  beats: Beat[];
  events: FlowEvent[];
  total: number;
  /** `s` at which era k becomes the active era. */
  eraStarts: number[];
  /** `s` at which the feed finishes its entrance into era k and pauses. */
  eraArrivals: number[];
  /** The camera starts pulling back (during the last era's narration). */
  pullbackStart: number;
  /** "Behind the feed": the last era's narration ends and the reveal's begins. */
  revealStart: number;
  /** The camera's pull-back, in order, from `pullbackStart` to `total`. */
  reveal: RevealSpan[];
  /** Notifications, sorted by `s0`. */
  pings: PingSlot[];
  glitches: GlitchWindow[];
  warnings: string[];
}

export interface FlowFrame {
  s: number;
  /** Feed offset on screen, including the landing bounce. */
  offset: number;
  /** Feed offset without the bounce; only ever moves forward. */
  settled: number;
  cursor: Pt;
  pressed: boolean;
  beat: number;
  era: number;
  /** Number of events at or before `s`. */
  fired: number;
  typing: { postId: string; text: string } | null;
  reveal: { phase: RevealPhase; u: number; total: number } | null;
  /** Indices into `Timeline.pings` visible now. */
  pings: number[];
  /** Number of pings with `s0 <= s` (drives the unread counts). */
  pingsSeen: number;
  /** Glitch intensity 0..1. */
  glitch: number;
}

/* --------------------------------- Timing --------------------------------- */

/** Relative pacing weights, fitted to each voice clip. Reveal lengths are story px. */
export const FLOW_TIMING = {
  /** Reference line shown by the feed's development guides. */
  readingLine: 0.4,
  /** Where an action's target is parked before the agent acts on it. */
  focusLine: 0.5,
  /** Px left above a new era's section when the feed arrives at it. */
  arriveMargin: 12,
  /** Default pause when an era arrives. */
  hold: 560,
  /**
   * Scroll moves. A move of d feed px takes (scrollBase + d^scrollExp) story
   * px, times each era's `scrollRate` and this multiplier, so long gaps go by
   * proportionally faster than short hops.
   */
  scrollRate: 1,
  scrollBase: 90,
  scrollExp: 0.9,
  /** Landing overshoot: share of the distance, capped (px), scaled by agent style. */
  bounceShare: 0.05,
  bounceMax: 10,
  bounciness: { human: 1, quick: 0.65, robot: 0 },
  /** Pause on each post the agent doesn't act on, scaled by agent pace. */
  glance: 600,
  travelBase: 90,
  travelPerPx: 0.32,
  dwell: 110,
  press: 36,
  /** Pause after an action that changes nothing on the page (reading). */
  after: 110,
  /**
   * Landing: once a click changes the page (a like, a reaction, a posted
   * comment, an answered pop-up) the feed holds still this long, so the viewer
   * sees the result before the feed scrolls on. Scaled by `landPace`, not
   * `pace`: robots act fast, but their results still have to read.
   */
  land: { like: 420, heart: 620, react: 520, comment: 780, share: 420, cta: 460, chrome: 380, overlay: 320, watch: 260 },
  landPace: { human: 1, quick: 0.85, robot: 0.6 },
  /**
   * After a click the cursor eases this far off the target (story px `len`,
   * scaled by pace) so it doesn't sit on top of the result.
   */
  drift: { x: 16, y: 30, len: 150 },
  /** A picked reaction or pop-up button stays up this long before it closes. */
  pick: 160,
  hover: 220,
  typePerChar: 16,
  typePaste: 60,
  read: 760,
  watch: 900,
  captchaWait: 420,
  lateOverlay: 320,
  /** Pause after the last post before the camera pulls back. */
  tail: 500,
  /** How long a notification stays up (story px), at most. */
  pingLife: 1500,
  /** Glitch half-widths (story px) entering and leaving a glitch era. */
  glitchIn: 260,
  glitchOut: 520,
  /**
   * Relative lengths of the pull-back while the last line plays: to the
   * chat, a short hold on it, to the wall, to the farm. The later phases are
   * set by the reveal narration's cues (data/flow/narration.json); their
   * weights here only matter without cues.
   */
  reveal: { sandbox: 2400, chat: 1500, servers: 1900, farm: 1700, dots: 1600, signal: 6000, end: 1800 } as Record<
    RevealPhase,
    number
  >,
  /**
   * The edited film (posts with `endsAtSeconds`), in seconds and feed px.
   * Each post's narration window is filled by one smooth feed motion: glide
   * in, the agent acts at close to its natural speed, then a slow drift
   * carries on into the next post. Nothing parks unless the agent is acting.
   */
  film: {
    /** Comfortable glide: `base + perK * (d / 1000)^exp` seconds for d px. */
    glide: { base: 0.3, perK: 0.62, exp: 0.85 },
    /** How far a glide may be squeezed or relaxed to fit its window. */
    glideMin: 0.75,
    glideMax: 1.5,
    /** Spare time with nowhere to drift slows the glide this far before the cursor. */
    glideLast: 2.2,
    /** How far the agent's own actions may be sped up or slowed down. */
    actMin: 0.7,
    actMax: 1.25,
    /** Acted-on targets stay this far inside the viewport. */
    edge: 48,
    /** A framed post is kept whole if it fits with this much room at each end. */
    frame: 16,
    /** Targets already within this share of the viewport from the focus line stay put. */
    settle: 0.15,
    /** A post being read drifts this fast, at least `readMin`, at most `readMax` px. */
    readSpeed: 34,
    readMin: 24,
    readMax: 200,
    readSeconds: 0.3,
    /** A drifting post may slide this far past the viewport edge. */
    crop: 40,
    /** After an action, spare time becomes a slow drift on toward the next post. */
    trailSpeed: 30,
    trailMax: 140,
    trailSeconds: 0.35,
  },
  /** Ramp (share of the reveal) over which the endless tail gets up to speed. */
  tailRamp: 0.035,
  /** Seconds the sessions take to shrink into dots, ending as "Behind the feed" starts. */
  revealMorph: 2.4,
  /** Least time (s) for the pull-back from the window to the field. */
  revealPullMin: 4,
  /** Seconds over which the screen fades out with the last note. */
  revealEndCard: 6,
  /** Dwell/travel multipliers by agent style. */
  pace: { human: 1, quick: 0.7, robot: 0.4 },
  /** Path bend by agent style (fraction of distance). */
  curve: { human: 0.18, quick: 0.1, robot: 0 },
} as const;

export type FlowTiming = typeof FLOW_TIMING;

/* --------------------------------- Helpers -------------------------------- */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Scroll glide: leaves gently but quickly, spends most of its time easing in
 * to land. Monotonic, flat at both ends.
 */
export function glide(u: number): number {
  const x = clamp(u, 0, 1) ** 1.35;
  return 1 - (1 - x) ** 3;
}

/** Landing bounce shape: 0 → 1 → 0 over the last part of a move, flat at both ends. */
export function bump(u: number): number {
  const w = clamp((u - 0.55) / 0.45, 0, 1);
  return Math.sin(Math.PI * w) ** 2;
}

/**
 * Cubic Hermite from 0 to 1 that leaves with slope `a` and arrives with slope
 * `b` (both relative to the straight line). Monotonic for 0 ≤ a, b ≤ 3.
 */
export function hermite(u: number, a: number, b: number): number {
  const t = clamp(u, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  return (t3 - 2 * t2 + t) * a + (3 * t2 - 2 * t3) + (t3 - t2) * b;
}

/**
 * Shared velocity where two scroll pieces meet (Fritsch–Butland): a weighted
 * harmonic mean of their slopes, so the joined curve never overshoots or
 * reverses, and zero where the direction changes.
 */
function joinSlope(h0: number, d0: number, h1: number, d1: number): number {
  if (d0 * d1 <= 0) return 0;
  return (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
}

/** 0..1 progress that starts from rest and reaches full speed over about `ramp`. */
export function rampIn(x: number, ramp: number): number {
  const t = clamp(x, 0, 1);
  if (ramp <= 0) return t;
  const f = (v: number) => v - ramp * (1 - Math.exp(-v / ramp));
  return f(t) / f(1);
}

function bezier(from: Pt, to: Pt, curve: number, t: number): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Control point: midpoint pushed sideways by `curve` × distance.
  const cx = from.x + dx / 2 - dy * curve;
  const cy = from.y + dy / 2 + dx * curve;
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}

/** Deterministic 0..1 noise per index (no Math.random, so SSR and replays agree). */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** How many characters a human has typed at fraction `u` of the typing window. */
export function typedCount(chars: readonly string[], u: number, paste: boolean): number {
  if (u <= 0) return 0;
  if (paste || u >= 1) return chars.length;
  let total = 0;
  const w = chars.map((c, i) => {
    const weight = 0.55 + hash01(i) * 0.9 + (c === ' ' ? 0.5 : 0) + (/[.!?,]/.test(c) ? 0.8 : 0);
    total += weight;
    return weight;
  });
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += w[i] / total;
    if (acc > u) return i;
  }
  return chars.length;
}

function actionLabel(action: AgentAction, post: FlowPost): string {
  const who = post.author.name;
  switch (action.type) {
    case 'comment':
      return `comment on ${who}: “${action.text}”`;
    case 'react':
      return `react ${action.emoji} to ${who}`;
    case 'chrome':
      return `click ${action.target}`;
    case 'overlay':
      return `answer pop-up (${action.choice})`;
    case 'like':
      return action.via === 'doubletap' ? `double-tap ${who}` : `like ${who}`;
    default:
      return `${action.type} ${who}`;
  }
}

/** Target ids an action touches, in order; null when it can't run in this era. */
function actionTargets(action: AgentAction, post: FlowPost, era: FlowEra): string[] | null {
  const id = (part: string) => `${post.id}:${part}`;
  switch (action.type) {
    case 'publish':
      return [id('publish'), id('publish-submit')];
    case 'message':
      return [id('message')];
    case 'read':
      return [id('body')];
    case 'like':
      return [action.via === 'doubletap' ? id('media') : id('like')];
    case 'react':
      return [id('like'), id(`react:${action.emoji}`)];
    case 'comment':
      return era.post.submit ? [id('composer'), id('submit')] : [id('composer')];
    case 'share':
      return [id('share')];
    case 'cta':
      return [id('cta')];
    case 'watch':
      return [id('media')];
    case 'chrome':
      return [`chrome:${era.id}:${action.target}`];
    case 'overlay':
      return era.overlay ? [`overlay:${era.overlay.id}:${action.choice}`] : null;
  }
}

/* --------------------------------- Compile -------------------------------- */

export function compileTimeline(
  eras: readonly FlowEra[],
  posts: Readonly<Record<string, readonly FlowPost[]>>,
  m: FlowMeasure,
  T: FlowTiming = FLOW_TIMING,
): Timeline {
  const beats: Beat[] = [];
  const events: FlowEvent[] = [];
  const warnings: string[] = [];
  const vh = m.viewport.h;
  const maxOffset = Math.max(0, m.contentHeight - vh);
  const feedEndOffset = clamp(m.feedEnd - vh * 0.85, 0, maxOffset);

  let s = 0;
  let offset = 0;
  let cursor: Pt = { x: m.viewport.x + m.viewport.w * 0.82, y: m.viewport.y + vh * 0.72 };

  // Per-era scroll feel, set as each era is compiled.
  let rate: number = T.scrollRate;
  let bounciness = 1;

  const scrollTo = (target: number, reframe = false, continuous = false) => {
    const to = clamp(target, reframe ? 0 : offset, maxOffset);
    const delta = to - offset;
    const d = Math.abs(delta);
    if (d < 1) return false;
    const len = rate * (T.scrollBase + d ** T.scrollExp);
    const bounce = continuous ? 0 : Math.min(T.bounceMax, d * T.bounceShare) * bounciness;
    beats.push({ kind: 'scroll', s0: s, s1: s + len, from: offset, to, bounce: bounce * Math.sign(delta), cursor, continuous });
    s += len;
    offset = to;
    return true;
  };

  /** Where to park a post: centred if it fits, otherwise its top near the top. */
  const frameOf = (box: { top: number; height: number }) =>
    box.height < vh * 0.82 ? box.top + box.height / 2 - vh * 0.5 : box.top - 36;

  const hold = (len: number, label: string) => {
    beats.push({ kind: 'hold', s0: s, s1: s + len, offset, cursor, label });
    s += len;
  };

  const eraArrivals: number[] = [];
  const eraSettled: number[] = [];
  const eraStarts: number[] = [];
  const eraEnds: number[] = [];

  const toScreen = (r: TargetRect, aim: Pt): Pt =>
    r.space === 'feed'
      ? { x: m.viewport.x + r.x + r.w * aim.x, y: m.viewport.y + r.y - offset + r.h * aim.y }
      : { x: r.x + r.w * aim.x, y: r.y + r.h * aim.y };

  /* ----------------------- The edited film: framing ------------------------ */

  const F = T.film;
  /** Story px planned for each film beat, by beat index; applied per era. */
  const planned = new Map<number, number>();

  /** Comfortable glide time (s) for d px: short hops are quick, long ones take longer but go faster. */
  const glideSeconds = (d: number, feel: number) => (F.glide.base + F.glide.perK * (Math.abs(d) / 1000) ** F.glide.exp) * feel;

  const inView = (rects: readonly Rect[], at: number) =>
    rects.every((r) => r.y >= at + F.edge && r.y + r.h <= at + vh - F.edge);

  /**
   * Offset that brings the targets as close to the focus line as keeping the
   * whole post in view allows. A post taller than the screen centres the
   * targets themselves.
   */
  const focusOn = (box: { top: number; height: number }, rects: readonly Rect[]) => {
    const tTop = rects.length ? Math.min(...rects.map((r) => r.y)) : box.top;
    const tBottom = rects.length ? Math.max(...rects.map((r) => r.y + r.h)) : box.top + box.height;
    const want = (tTop + tBottom) / 2 - vh * T.focusLine;
    const lo = box.top + box.height + F.frame - vh;
    const hi = box.top - F.frame;
    return lo <= hi ? clamp(want, lo, hi) : clamp(want, tBottom + F.edge - vh, tTop - F.edge);
  };

  /**
   * Fill one post's narration window. Glides get a comfortable duration for
   * their distance, the agent's own actions run close to their natural speed,
   * and spare time keeps the feed drifting gently instead of parking it or
   * playing the cursor in slow motion. Durations land in `planned`.
   */
  const planWindow = (first: number, seconds: number, feel: number, readTo: number | null, trailRoom: number, label: string) => {
    const glides: number[] = [];
    const acts: number[] = [];
    for (let i = first; i < beats.length; i++) (beats[i].kind === 'scroll' ? glides : acts).push(i);
    const natural = glides.map((i) => {
      const b = beats[i];
      return b.kind === 'scroll' ? glideSeconds(b.to - b.from, feel) : 0;
    });
    const naturalGlide = natural.reduce((n, x) => n + x, 0);
    const naturalActs = acts.reduce((n, i) => n + beats[i].s1 - beats[i].s0, 0) / PLAY_SPEED;
    const readTarget = readTo === null ? null : clamp(readTo, offset, maxOffset);
    const reads = readTarget !== null && readTarget - offset >= 1;

    // Start from the tightest acceptable timing, then hand out the rest.
    let glide = naturalGlide * F.glideMin;
    let pace = F.actMin;
    let read = reads ? F.readSeconds : 0;
    const need = glide + naturalActs * pace + read;
    let rem = seconds - need;
    if (rem < 0 && need > 0) {
      const f = seconds / need;
      glide *= f;
      pace *= f;
      read *= f;
      rem = 0;
    }
    const give = (cap: number) => {
      const g = clamp(cap, 0, rem);
      rem -= g;
      return g;
    };
    glide += give(naturalGlide - glide);
    if (naturalActs > 0) pace += give(naturalActs * (1 - pace)) / naturalActs;
    if (reads) read += give(rem);
    glide += give(naturalGlide * F.glideMax - glide);
    if (naturalActs > 0) pace += give(naturalActs * (F.actMax - pace)) / naturalActs;
    let trail = 0;
    let trailTo = offset;
    if (naturalActs > 0 && rem >= F.trailSeconds) {
      trailTo = clamp(offset + Math.min(trailRoom, F.trailMax, F.trailSpeed * rem), offset, maxOffset);
      if (trailTo - offset >= 1) trail = give(rem);
    }
    // Nowhere left to drift: a gentler glide shows less than a slower cursor.
    glide += give(naturalGlide * F.glideLast - glide);
    if (naturalActs > 0) pace += give(rem) / naturalActs;
    else if (naturalGlide > 0) glide += give(rem);

    glides.forEach((i, j) => planned.set(i, (natural[j] / naturalGlide) * glide * PLAY_SPEED));
    for (const i of acts) planned.set(i, (beats[i].s1 - beats[i].s0) * pace);
    if (reads && scrollTo(readTarget, false, true)) planned.set(beats.length - 1, read * PLAY_SPEED);
    if (trail > 0 && scrollTo(trailTo, false, true)) planned.set(beats.length - 1, trail * PLAY_SPEED);
    if (rem > 0) {
      hold(rem * PLAY_SPEED, label);
      planned.set(beats.length - 1, rem * PLAY_SPEED);
    }
  };

  eras.forEach((era, k) => {
    const start = s;
    const firstBeat = beats.length;
    const firstEvent = events.length;
    eraStarts.push(start);
    const top = m.eras[k]?.top ?? 0;
    const scenePosts = posts[era.id] ?? [];
    // The film: every shot has an out-point in the narration. One continuous
    // feed carries straight on from the previous era; nothing is hidden.
    const edited = scenePosts.length > 0 && scenePosts.every((post) => post.endsAtSeconds !== undefined);
    let windowStart = 0;
    rate = T.scrollRate * era.scrollRate;
    bounciness = T.bounciness[era.agent];
    if (k > 0 && !edited) scrollTo(top - T.arriveMargin);

    const holdLen = edited ? 0 : era.holdPx ?? T.hold;
    eraArrivals.push(s);
    eraSettled.push(s + holdLen);
    if (era.overlay && era.overlay.appear !== 'late') {
      events.push({ s: s + holdLen * 0.55, type: 'appear', key: era.overlay.id });
    }
    if (holdLen > 0) hold(holdLen, `${era.year} · ${era.label}`);

    let bend = 1;
    for (const post of scenePosts) {
      const agent = post.agent ?? era.agent;
      const tempo = post.tempo ?? 1;
      const pace = T.pace[agent] * tempo;
      const landPace = T.landPace[agent] * tempo;
      const curve = T.curve[agent];
      const human = agent !== 'robot';
      const aim: Pt = human ? { x: 0.42, y: 0.56 } : { x: 0.5, y: 0.5 };
      rate = T.scrollRate * era.scrollRate * tempo;
      bounciness = T.bounciness[agent];
      const box = m.posts[post.id];
      const postFirst = beats.length;
      const feel = clamp(era.scrollRate * tempo, 0.8, 1.2);
      // Everything the agent will touch on this post, so it's framed once.
      const postRects = edited
        ? (post.actions ?? [])
            .flatMap((a) => actionTargets(a, post, era) ?? [])
            .map((t) => m.targets[t])
            .filter((r) => r && r.space === 'feed')
        : [];
      let readTo: number | null = null;
      // Establish the post before interacting. Explicit reading/watching beats
      // already provide that pause; don't make the viewer sit through it twice.
      const firstAction = post.actions?.[0];
      if (edited) {
        // The composer opens as the feed sets off toward it.
        if (firstAction?.type === 'publish') events.push({ s, type: 'focus', key: `${post.id}:publish` });
        if (box && !firstAction) {
          // Read while moving: glide in until the post sits centred, then let
          // it drift slowly past for the rest of its line.
          const centre = box.top + box.height / 2 - vh * T.focusLine;
          const lo = box.top + box.height - F.crop - vh;
          const hi = box.top + F.crop;
          const seconds = post.endsAtSeconds! - windowStart;
          const drift = clamp(F.readSpeed * Math.max(F.readSeconds, seconds - glideSeconds(centre - offset, feel)), F.readMin, F.readMax);
          let from: number;
          let to: number;
          if (hi - lo >= F.readMin) {
            const d = Math.min(drift, hi - lo);
            from = clamp(centre - d / 2, lo, hi - d);
            to = from + d;
          } else {
            // Taller than the screen: read it top to bottom.
            from = box.top - F.edge;
            to = Math.max(from + F.readMin, box.top + box.height + F.edge - vh);
          }
          const arrive = clamp(Math.max(from, offset), 0, maxOffset);
          readTo = Math.max(to, arrive + Math.min(drift, to - from));
          scrollTo(arrive, false, true);
        } else if (box) {
          // Frame the post once, as central as its targets allow. Close
          // enough is left alone: a nudge of a few px reads as a fidget.
          const want = focusOn(box, postRects);
          if (!(inView(postRects, offset) && Math.abs(want - offset) <= vh * F.settle)) scrollTo(want, true, true);
        }
      } else if (box && firstAction?.type !== 'read' && firstAction?.type !== 'watch' && firstAction?.type !== 'publish') {
        scrollTo(frameOf(box));
        hold(T.glance * pace * (post.media || post.reels ? 1.25 : 1), `${firstAction ? 'preview' : 'glance'} · ${post.author.name}`);
      }
      for (const action of post.actions ?? []) {
        const overlay = era.overlay;
        // Target ids this action touches, in order.
        const ids = actionTargets(action, post, era);
        if (!ids) {
          warnings.push(`${post.id}: overlay action but era "${era.id}" has no overlay`);
          continue;
        }
        const lateOverlay = action.type === 'overlay' && overlay?.appear === 'late';

        const rects = ids.map((t) => m.targets[t]);
        const missing = ids.filter((_, i) => !rects[i]);
        if (missing.length) {
          warnings.push(`${post.id}: missing target ${missing.join(', ')}`);
          continue;
        }

        if (action.type === 'publish' && !edited) events.push({ s, type: 'focus', key: `${post.id}:publish` });

        // Reading frames the post; interactions frame the exact target.
        // A local upward adjustment is intentional (older layouts put Like
        // above the photo). Never drag the post header along with its controls.
        const feedRects = rects.filter((r) => r.space === 'feed');
        if (feedRects.length) {
          const first = feedRects[0];
          const top = Math.min(...feedRects.map((r) => r.y));
          const bottom = Math.max(...feedRects.map((r) => r.y + r.h));
          if (edited) {
            // Already framed with its post; only move if a target is out of view.
            if (!inView(feedRects, offset)) {
              scrollTo(clamp((top + bottom) / 2 - vh * T.focusLine, bottom + F.edge - vh, top - F.edge), true, true);
            }
          } else {
            let want = action.type === 'read' && box ? frameOf(box) : first.y + first.h / 2 - vh * T.focusLine;
            // Keep companion targets (reaction palette / submit) in view. A
            // taller-than-screen image is framed at its top instead of cropped
            // on both ends; ordinary controls still land exactly at center.
            want = bottom - top <= vh - 64 ? clamp(want, bottom + 32 - vh, top - 32) : top - 32;
            if (scrollTo(want, true)) hold(100 * landPace, `settle · ${action.type}`);
          }
          for (const r of feedRects) {
            if (r.h <= vh - 64 && (r.y - offset < 0 || r.y + r.h - offset > vh)) warnings.push(`${post.id}: ${action.type} target off screen`);
          }
        }

        // Build the cursor segments.
        const segs: Seg[] = [];
        const s0 = s;
        let at = s;
        let pos = cursor;
        let typing: Typing | undefined;

        const move = (to: Pt) => {
          const dist = Math.hypot(to.x - pos.x, to.y - pos.y);
          const len = (T.travelBase + T.travelPerPx * dist) * pace;
          bend = -bend;
          segs.push({ kind: 'move', s0: at, s1: at + len, from: pos, to, curve: curve * bend, linear: !human });
          at += len;
          pos = to;
        };
        const dwell = (len: number) => {
          segs.push({ kind: 'dwell', s0: at, s1: at + len, at: pos });
          at += len;
        };
        const press = () => {
          segs.push({ kind: 'press', s0: at, s1: at + T.press, at: pos });
          at += T.press;
          return at - T.press * 0.5;
        };
        const point = (i: number) => toScreen(rects[i], aim);
        /**
         * Let a click land: ease the cursor off the target so it doesn't
         * cover the result, then hold still until the viewer has seen it.
         */
        const land = (len: number) => {
          const total = len * landPace;
          const ease = Math.min(T.drift.len * pace, total / 2);
          const to = { x: pos.x + T.drift.x, y: pos.y + T.drift.y };
          segs.push({ kind: 'move', s0: at, s1: at + ease, from: pos, to, curve: 0, linear: !human });
          at += ease;
          pos = to;
          dwell(total - ease);
        };

        if (lateOverlay && overlay) {
          events.push({ s: at, type: 'appear', key: overlay.id });
          dwell(T.lateOverlay);
        }

        switch (action.type) {
          case 'publish':
          case 'message': {
            const key = `${post.id}:${action.type}`;
            if (action.type === 'message') {
              events.push({ s: at, type: 'focus', key });
              dwell(650 * tempo);
            }
            move(point(0));
            events.push({ s: press(), type: 'focus', key });
            const len = human ? Array.from(action.text).length * T.typePerChar * tempo : T.typePaste;
            const ts = at;
            dwell(len);
            typing = { s0: ts, s1: at, end: 0, text: action.text, postId: key, paste: !human };
            if (action.type === 'publish') move(point(1));
            const sent = press();
            typing.end = sent;
            events.push({ s: sent, type: 'post', key, value: action.text });
            // Publication has its own reading pause; don't stack the comment
            // landing pause on top of it.
            if (action.type === 'publish') land((post.publishHold ?? 800) / landPace);
            else land(T.land.comment);
            break;
          }
          case 'read':
            move(point(0));
            dwell(T.read * pace);
            dwell(T.after * pace);
            break;
          case 'like': {
            move(point(0));
            dwell(T.dwell * pace);
            if (action.via === 'doubletap') {
              press();
              dwell(24);
              const t = press();
              events.push({ s: t, type: 'heart', key: post.id }, { s: t, type: 'like', key: post.id });
              land(T.land.heart);
            } else {
              events.push({ s: press(), type: 'like', key: post.id });
              land(T.land.like);
            }
            break;
          }
          case 'react': {
            move(point(0));
            events.push({ s: at, type: 'palette', key: post.id });
            dwell(T.hover * pace);
            move(point(1));
            dwell(T.dwell * 0.5 * pace);
            // The picked emoji swells in the palette, then the palette closes
            // and the reaction drops into the button.
            events.push({ s: press(), type: 'pick', key: post.id, value: action.emoji });
            dwell(T.pick);
            events.push({ s: at, type: 'react', key: post.id, value: action.emoji }, { s: at, type: 'unpalette', key: post.id });
            land(T.land.react);
            break;
          }
          case 'comment': {
            move(point(0));
            dwell(T.dwell * pace);
            events.push({ s: press(), type: 'focus', key: post.id });
            const chars = Array.from(action.text);
            const len = human ? chars.length * T.typePerChar * (agent === 'quick' ? 0.8 : 1) * tempo : T.typePaste;
            const ts = at + 30;
            dwell(len + 30);
            typing = { s0: ts, s1: ts + len, end: 0, text: action.text, postId: post.id, paste: !human };
            let postAt: number;
            if (era.post.submit) {
              move(point(1));
              dwell(T.dwell * 0.6 * pace);
              postAt = press();
            } else {
              dwell(T.dwell * pace); // "press Enter"
              postAt = at;
            }
            typing.end = postAt;
            events.push({ s: postAt, type: 'post', key: post.id, value: action.text });
            land(T.land.comment);
            break;
          }
          case 'share':
          case 'cta':
            move(point(0));
            dwell(T.dwell * pace);
            events.push({ s: press(), type: action.type, key: post.id });
            land(T.land[action.type]);
            break;
          case 'watch':
            move(point(0));
            events.push({ s: at, type: 'watch', key: post.id });
            dwell(action.holdPx !== undefined ? action.holdPx * pace : post.media?.videoSrc && post.media.durationSeconds ? post.media.durationSeconds * 1000 : T.watch * pace);
            events.push({ s: at, type: 'watched', key: post.id });
            land(T.land.watch);
            break;
          case 'chrome':
            move(point(0));
            dwell(T.dwell * pace);
            events.push({ s: press(), type: 'chrome', key: `${era.id}:${action.target}` });
            land(T.land.chrome);
            break;
          case 'overlay': {
            move(point(0));
            dwell(T.dwell * pace);
            const t = press();
            const oid = overlay!.id;
            events.push({ s: t, type: 'choose', key: oid, value: String(action.choice) });
            // Leave the chosen button highlighted for a beat before it closes.
            dwell(overlay!.kind === 'captcha' ? T.captchaWait : T.pick);
            events.push({ s: at, type: 'dismiss', key: oid });
            land(T.land.overlay);
            break;
          }
        }

        beats.push({
          kind: 'act',
          s0,
          s1: at,
          offset,
          postId: post.id,
          action,
          segs,
          typing,
          cursorEnd: pos,
          label: actionLabel(action, post),
        });
        s = at;
        cursor = pos;
      }
      if (edited) {
        // Drift on after the action without carrying its targets off screen.
        const room = postRects.length ? Math.min(...postRects.map((r) => r.y)) - offset - F.edge : F.trailMax;
        planWindow(postFirst, post.endsAtSeconds! - windowStart, feel, readTo, room, `pause · ${post.author.name}`);
        windowStart = post.endsAtSeconds!;
      }
    }

    if (!edited && k === eras.length - 1 && !posts[era.id]?.at(-1)?.revealAfterPublish) {
      scrollTo(feedEndOffset);
      hold(T.tail, 'end of the real feed');
    }

    // Fit the measured layout to the voice clip. All nested cursor, typing
    // and effect times use the same mapping, so scrubbing stays reversible.
    // The film retimes beat by beat to its plan; otherwise everything scales.
    const duration = sceneSeconds(era.id) * PLAY_SPEED;
    const scale = duration / (s - start);
    const olds = [start];
    const news = [start];
    if (edited) {
      for (let i = firstBeat; i < beats.length; i++) {
        olds.push(beats[i].s1);
        news.push(news[news.length - 1] + (planned.get(i) ?? 0));
      }
    }
    const time = (value: number) => {
      if (!edited) return start + (value - start) * scale;
      let lo = 0;
      let hi = olds.length - 1;
      if (value <= olds[lo]) return news[lo];
      if (value >= olds[hi]) return news[hi];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (olds[mid] <= value) lo = mid;
        else hi = mid;
      }
      return news[lo] + ((value - olds[lo]) / (olds[hi] - olds[lo])) * (news[hi] - news[lo]);
    };
    for (let i = firstBeat; i < beats.length; i++) {
      const beat = beats[i];
      beat.s0 = time(beat.s0);
      beat.s1 = time(beat.s1);
      if (beat.kind !== 'act') continue;
      for (const seg of beat.segs) {
        seg.s0 = time(seg.s0);
        seg.s1 = time(seg.s1);
      }
      if (beat.typing) {
        beat.typing.s0 = time(beat.typing.s0);
        beat.typing.s1 = time(beat.typing.s1);
        beat.typing.end = time(beat.typing.end);
      }
    }
    for (let i = firstEvent; i < events.length; i++) events[i].s = time(events[i].s);
    eraArrivals[k] = time(eraArrivals[k]);
    eraSettled[k] = time(eraSettled[k]);
    if (edited) {
      // The era has arrived once its first glide lands.
      const entrance = beats[firstBeat];
      eraArrivals[k] = eraSettled[k] = entrance?.kind === 'scroll' ? entrance.s1 : start;
    }
    s = start + duration;
    eraEnds.push(s);
    if (SCENE_PAUSE_SECONDS > 0) hold(SCENE_PAUSE_SECONDS * PLAY_SPEED, `breath · ${era.label}`);
  });

  /*
   * The reveal. "Behind the feed" starts when the last era's line ends
   * (`revealStart`), but the camera sets off earlier, on a cue inside that
   * line ("It was the only thing anyone wanted…"), while the agent keeps
   * working in the window:
   *
   *   pullbackStart  sandbox → chat → servers → farm, then every session
   *                  shrinks into a dot, finishing as the line ends
   *   revealStart    rows of blinking dots ("The internet used to be our
   *                  sandbox,"), then the camera pushes in until they read as
   *                  pixels, which show symbols in step with the voice and
   *                  after it, through the music's swell (signal.ts)
   *   total          the score's last note, as the screen fades to black
   */
  const revealStart = s;
  const P = PLAY_SPEED;
  const voice = narration.reveal;
  const lastLine = narration.chunks.find((c) => c.era === eras.at(-1)?.id) as { pullbackAtSeconds?: number } | undefined;
  const lastStart = eraStarts.at(-1) ?? 0;
  const cue = lastLine?.pullbackAtSeconds;
  const pullbackStart = cue === undefined ? revealStart : Math.min(revealStart, lastStart + cue * P);
  // Sessions finish shrinking into dots as the line ends (or soon after, without a cue).
  const dotsStart = Math.max(pullbackStart + T.revealPullMin * P, revealStart - T.revealMorph * P);
  const morphEnd = dotsStart + T.revealMorph * P;
  const signalAt = Math.max(morphEnd + P, revealStart + voice.cues.signal * P);
  const speechEnd = revealStart + voice.durationSeconds * P;
  // The film runs until the score finishes (it starts with the first word).
  const total = Math.max(MUSIC.durationSeconds * P, speechEnd + T.revealEndCard * P, signalAt + 2 * T.revealEndCard * P);
  const cardAt = total - T.revealEndCard * P;

  const reveal: RevealSpan[] = [];
  const pull = ['sandbox', 'chat', 'servers', 'farm'] as const;
  const weight = pull.reduce((n, phase) => n + T.reveal[phase], 0);
  let at = pullbackStart;
  for (const phase of pull) {
    const len = ((dotsStart - pullbackStart) * T.reveal[phase]) / weight;
    reveal.push({ phase, s0: at, s1: at + len });
    at += len;
  }
  reveal.push(
    // The shrink takes `revealMorph`; the rest of the phase is the twinkling rows.
    { phase: 'dots', s0: dotsStart, s1: signalAt, warp: { at: (morphEnd - dotsStart) / (signalAt - dotsStart), to: DOT_MORPH } },
    { phase: 'signal', s0: signalAt, s1: cardAt },
    { phase: 'end', s0: cardAt, s1: total },
  );

  // Meanwhile the feed in the window plays out the last era; after its line
  // the endless tail takes over, picking up speed from rest.
  beats.push({ kind: 'tail', s0: revealStart, s1: total, from: offset, to: maxOffset, ramp: T.tailRamp, cursor });
  s = total;

  // Join each run of film scrolls into one smooth motion: neighbours share
  // their velocity where they meet, and the feed eases to rest only where
  // the agent acts (or the run ends).
  for (let i = 0; i < beats.length; ) {
    const run: Extract<Beat, { kind: 'scroll' }>[] = [];
    for (let b = beats[i]; b?.kind === 'scroll' && b.continuous; b = beats[++i]) run.push(b);
    if (!run.length) {
      i++;
      continue;
    }
    const len = (b: (typeof run)[number]) => b.s1 - b.s0;
    const slope = (b: (typeof run)[number]) => (b.to - b.from) / len(b);
    run.forEach((b, j) => {
      const prev = run[j - 1];
      const next = run[j + 1];
      b.v0 = prev ? joinSlope(len(prev), slope(prev), len(b), slope(b)) : 0;
      b.v1 = next ? joinSlope(len(b), slope(b), len(next), slope(next)) : 0;
    });
  }

  events.sort((x, y) => x.s - y.s);

  // Notifications: spread across each era, after it settles in.
  const pings: PingSlot[] = [];
  eras.forEach((era, k) => {
    const n = era.pings.length;
    if (!n) return;
    const start = eraSettled[k];
    const end = eraEnds[k];
    const step = Math.max(1, (end - start) / n);
    const life = Math.min(T.pingLife, step * 1.35);
    era.pings.forEach((_, i) => {
      const s0 = start + (end - start) * (era.id === 'dead' ? ((i + 0.15) / n) ** 0.45 : (i + 0.15) / n);
      pings.push({ s0, s1: Math.min(end, s0 + life), era: k, index: i });
    });
  });
  pings.sort((x, y) => x.s0 - y.s0);

  // Glitch bursts where the feed enters and leaves a glitch era.
  const glitches: GlitchWindow[] = [];
  eras.forEach((era, k) => {
    if (!era.glitch) return;
    glitches.push({ s: eraStarts[k], width: T.glitchIn, strength: era.glitch.in });
    const out = k + 1 < eras.length ? eraStarts[k + 1] : revealStart;
    glitches.push({ s: out, width: T.glitchOut, strength: era.glitch.out });
  });

  return { beats, events, total: s, eraStarts, eraArrivals, pullbackStart, revealStart, reveal, pings, glitches, warnings };
}

/* --------------------------------- Sample --------------------------------- */

function findBeat(beats: readonly Beat[], s: number): number {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (beats[mid].s0 <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Number of events with `e.s <= s`. */
export function firedAt(events: readonly FlowEvent[], s: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].s <= s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function eraAt(t: Timeline, s: number): number {
  let k = 0;
  for (let i = 0; i < t.eraStarts.length; i++) if (t.eraStarts[i] <= s) k = i;
  return k;
}

/** Where the camera's pull-back is at `s`, or null before it starts. */
function revealAt(t: Timeline, s: number): FlowFrame['reveal'] {
  if (s < t.pullbackStart || !t.reveal.length) return null;
  let span = t.reveal[0];
  for (const r of t.reveal) if (r.s0 <= s) span = r;
  let u = span.s1 > span.s0 ? clamp((s - span.s0) / (span.s1 - span.s0), 0, 1) : 1;
  if (span.warp) {
    const { at, to } = span.warp;
    u = u < at ? (u / at) * to : to + ((u - at) / (1 - at)) * (1 - to);
  }
  const run = t.total - t.pullbackStart;
  return { phase: span.phase, u, total: run > 0 ? (s - t.pullbackStart) / run : 1 };
}

export function sampleTimeline(t: Timeline, sIn: number): FlowFrame {
  const s = clamp(sIn, 0, t.total);
  const index = t.beats.length ? findBeat(t.beats, s) : 0;
  const beat = t.beats[index];
  const activePings: number[] = [];
  let pingsSeen = 0;
  t.pings.forEach((p, i) => {
    if (p.s0 <= s) pingsSeen = i + 1;
    if (p.s0 <= s && s < p.s1) activePings.push(i);
  });
  let glitch = 0;
  for (const g of t.glitches) {
    const d = Math.abs(s - g.s) / g.width;
    if (d < 1) glitch = Math.max(glitch, g.strength * (1 - d) ** 1.5);
  }
  const base: FlowFrame = {
    s,
    offset: 0,
    settled: 0,
    cursor: { x: 1000, y: 600 },
    pressed: false,
    beat: index,
    era: eraAt(t, s),
    fired: firedAt(t.events, s),
    typing: null,
    reveal: revealAt(t, s),
    pings: activePings,
    pingsSeen,
    glitch,
  };
  if (!beat) return base;
  const u = beat.s1 > beat.s0 ? clamp((s - beat.s0) / (beat.s1 - beat.s0), 0, 1) : 1;

  switch (beat.kind) {
    case 'scroll': {
      let progress: number;
      if (beat.continuous) {
        // Slopes relative to the straight line, so the cubic meets its neighbours' speed.
        const line = (beat.to - beat.from) / (beat.s1 - beat.s0);
        progress = line ? hermite(u, (beat.v0 ?? 0) / line, (beat.v1 ?? 0) / line) : u;
      } else progress = glide(u);
      const settled = lerp(beat.from, beat.to, progress);
      return { ...base, offset: settled + beat.bounce * bump(u), settled, cursor: beat.cursor };
    }
    case 'hold':
      return { ...base, offset: beat.offset, settled: beat.offset, cursor: beat.cursor };
    case 'tail': {
      const tail = lerp(beat.from, beat.to, rampIn(u, beat.ramp));
      return { ...base, offset: tail, settled: tail, cursor: beat.cursor };
    }
    case 'act': {
      let cursor = beat.cursorEnd;
      let pressed = false;
      for (const seg of beat.segs) {
        if (s < seg.s0 || s > seg.s1) continue;
        const k = seg.s1 > seg.s0 ? (s - seg.s0) / (seg.s1 - seg.s0) : 1;
        if (seg.kind === 'move') cursor = bezier(seg.from, seg.to, seg.curve, seg.linear ? k : easeInOut(k));
        else cursor = seg.at;
        pressed = seg.kind === 'press';
        break;
      }

      let typing: FlowFrame['typing'] = null;
      const ty = beat.typing;
      if (ty && s >= ty.s0 && s < ty.end) {
        const chars = Array.from(ty.text);
        const n = typedCount(chars, (s - ty.s0) / Math.max(1, ty.s1 - ty.s0), ty.paste);
        typing = { postId: ty.postId, text: chars.slice(0, n).join('') };
      }
      return { ...base, offset: beat.offset, settled: beat.offset, cursor, pressed, typing };
    }
  }
}

/* --------------------------------- Effects -------------------------------- */

export interface OverlayState {
  state: 'shown' | 'chosen' | 'done';
  choice?: number;
}

export interface FlowEffects {
  liked: ReadonlySet<string>;
  hearts: ReadonlySet<string>;
  palettes: ReadonlySet<string>;
  /** Emoji picked in a still-open palette, by post. */
  picks: ReadonlyMap<string, string>;
  reactions: ReadonlyMap<string, string>;
  focused: ReadonlySet<string>;
  posted: ReadonlyMap<string, string>;
  shared: ReadonlySet<string>;
  cta: ReadonlySet<string>;
  watching: ReadonlySet<string>;
  watched: ReadonlySet<string>;
  chrome: ReadonlySet<string>;
  overlays: ReadonlyMap<string, OverlayState>;
}

export function deriveEffects(events: readonly FlowEvent[], fired: number): FlowEffects {
  const liked = new Set<string>();
  const hearts = new Set<string>();
  const palettes = new Set<string>();
  const picks = new Map<string, string>();
  const reactions = new Map<string, string>();
  const focused = new Set<string>();
  const posted = new Map<string, string>();
  const shared = new Set<string>();
  const cta = new Set<string>();
  const watching = new Set<string>();
  const watched = new Set<string>();
  const chrome = new Set<string>();
  const overlays = new Map<string, OverlayState>();

  for (let i = 0; i < Math.min(fired, events.length); i++) {
    const e = events[i];
    switch (e.type) {
      case 'like':
        liked.add(e.key);
        break;
      case 'heart':
        hearts.add(e.key);
        break;
      case 'palette':
        palettes.add(e.key);
        break;
      case 'unpalette':
        palettes.delete(e.key);
        break;
      case 'pick':
        picks.set(e.key, e.value ?? '');
        break;
      case 'react':
        reactions.set(e.key, e.value ?? '');
        liked.add(e.key);
        break;
      case 'focus':
        focused.add(e.key);
        break;
      case 'post':
        focused.delete(e.key);
        posted.set(e.key, e.value ?? '');
        break;
      case 'share':
        shared.add(e.key);
        break;
      case 'cta':
        cta.add(e.key);
        break;
      case 'watch':
        watching.add(e.key);
        break;
      case 'watched':
        watched.add(e.key);
        break;
      case 'chrome':
        chrome.add(e.key);
        break;
      case 'appear':
        overlays.set(e.key, { state: 'shown' });
        break;
      case 'choose':
        overlays.set(e.key, { state: 'chosen', choice: Number(e.value) });
        break;
      case 'dismiss':
        overlays.set(e.key, { ...(overlays.get(e.key) ?? {}), state: 'done' });
        break;
    }
  }
  return { liked, hearts, palettes, picks, reactions, focused, posted, shared, cta, watching, watched, chrome, overlays };
}

export const NO_EFFECTS: FlowEffects = deriveEffects([], 0);
