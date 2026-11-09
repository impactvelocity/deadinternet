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

export type RevealPhase = 'sandbox' | 'chat' | 'servers' | 'farm' | 'dots' | 'globe' | 'collapse' | 'blink' | 'end';

/** Reveal phases in order. */
export const REVEAL_PHASES: readonly RevealPhase[] = ['sandbox', 'chat', 'servers', 'farm', 'dots', 'globe', 'collapse', 'blink', 'end'];

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
   */
  | { kind: 'scroll'; s0: number; s1: number; from: number; to: number; bounce: number; cursor: Pt }
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
  | { kind: 'reveal'; s0: number; s1: number; phase: RevealPhase; from: number; to: number; cursor: Pt };

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
  /** `s` at which the feed arrives at era k and pauses (good jump targets). */
  eraArrivals: number[];
  revealStart: number;
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

/** Every pacing knob in one place. Lengths are story px (scroll distance). */
export const FLOW_TIMING = {
  /** Where "reading" happens, as a fraction of the feed viewport. Era changes key off this. */
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
   * Reveal phase lengths: pull back to the chat, hold on it, to the wall, to
   * the farm; every session shrinks to a dot, the dots become a spinning
   * globe with waves of light, the globe collapses into one dot, it blinks;
   * end card.
   */
  reveal: { sandbox: 2400, chat: 3200, servers: 1900, farm: 1700, dots: 1600, globe: 2200, collapse: 1450, blink: 650, end: 1800 } as Record<
    RevealPhase,
    number
  >,
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

  const scrollTo = (target: number, reframe = false) => {
    const to = clamp(target, reframe ? 0 : offset, maxOffset);
    const delta = to - offset;
    const d = Math.abs(delta);
    if (d < 1) return false;
    const len = rate * (T.scrollBase + d ** T.scrollExp);
    const bounce = Math.min(T.bounceMax, d * T.bounceShare) * bounciness;
    beats.push({ kind: 'scroll', s0: s, s1: s + len, from: offset, to, bounce: bounce * Math.sign(delta), cursor });
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

  const toScreen = (r: TargetRect, aim: Pt): Pt =>
    r.space === 'feed'
      ? { x: m.viewport.x + r.x + r.w * aim.x, y: m.viewport.y + r.y - offset + r.h * aim.y }
      : { x: r.x + r.w * aim.x, y: r.y + r.h * aim.y };

  eras.forEach((era, k) => {
    const top = m.eras[k]?.top ?? 0;
    rate = T.scrollRate * era.scrollRate;
    bounciness = T.bounciness[era.agent];
    if (k > 0) scrollTo(top - T.arriveMargin);

    const holdLen = era.holdPx ?? T.hold;
    eraArrivals.push(s);
    eraSettled.push(s + holdLen);
    if (era.overlay && era.overlay.appear !== 'late') {
      events.push({ s: s + holdLen * 0.55, type: 'appear', key: era.overlay.id });
    }
    hold(holdLen, `${era.year} · ${era.label}`);

    let bend = 1;
    for (const post of posts[era.id] ?? []) {
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
      // Establish the post before interacting. Explicit reading/watching beats
      // already provide that pause; don't make the viewer sit through it twice.
      const firstAction = post.actions?.[0];
      if (box && firstAction?.type !== 'read' && firstAction?.type !== 'watch' && firstAction?.type !== 'publish') {
        scrollTo(frameOf(box));
        hold(T.glance * pace * (post.media || post.reels ? 1.25 : 1), `${firstAction ? 'preview' : 'glance'} · ${post.author.name}`);
      }
      for (const action of post.actions ?? []) {
        const id = (part: string) => `${post.id}:${part}`;
        const overlay = era.overlay;
        let lateOverlay = false;

        // Target ids this action touches, in order.
        let ids: string[];
        switch (action.type) {
          case 'publish':
            ids = [id('publish'), id('publish-submit')];
            break;
          case 'message':
            ids = [id('message')];
            break;
          case 'read':
            ids = [id('body')];
            break;
          case 'like':
            ids = [action.via === 'doubletap' ? id('media') : id('like')];
            break;
          case 'react':
            ids = [id('like'), id(`react:${action.emoji}`)];
            break;
          case 'comment':
            ids = [id('composer')];
            if (era.post.submit) ids.push(id('submit'));
            break;
          case 'share':
            ids = [id('share')];
            break;
          case 'cta':
            ids = [id('cta')];
            break;
          case 'watch':
            ids = [id('media')];
            break;
          case 'chrome':
            ids = [`chrome:${era.id}:${action.target}`];
            break;
          case 'overlay':
            if (!overlay) {
              warnings.push(`${post.id}: overlay action but era "${era.id}" has no overlay`);
              continue;
            }
            ids = [`overlay:${overlay.id}:${action.choice}`];
            lateOverlay = overlay.appear === 'late';
            break;
        }

        const rects = ids.map((t) => m.targets[t]);
        const missing = ids.filter((_, i) => !rects[i]);
        if (missing.length) {
          warnings.push(`${post.id}: missing target ${missing.join(', ')}`);
          continue;
        }

        if (action.type === 'publish') events.push({ s, type: 'focus', key: `${post.id}:publish` });

        // Reading frames the post; interactions frame the exact target.
        // A local upward adjustment is intentional (older layouts put Like
        // above the photo). Never drag the post header along with its controls.
        const feedRects = rects.filter((r) => r.space === 'feed');
        if (feedRects.length) {
          const first = feedRects[0];
          let want = action.type === 'read' && box
            ? frameOf(box)
            : first.y + first.h / 2 - vh * T.focusLine;
          const top = Math.min(...feedRects.map((r) => r.y));
          const bottom = Math.max(...feedRects.map((r) => r.y + r.h));
          // Keep companion targets (reaction palette / submit) in view. A
          // taller-than-screen image is framed at its top instead of cropped
          // on both ends; ordinary controls still land exactly at center.
          want = bottom - top <= vh - 64
            ? clamp(want, bottom + 32 - vh, top - 32)
            : top - 32;
          if (scrollTo(want, true)) hold(100 * landPace, `settle · ${action.type}`);
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
    }
  });

  // Run out the feed, then pull back. The long repeating tail keeps the
  // browser racing through outreach while the camera reveals its operator.
  const lastEra = eras.at(-1);
  const revealOnPost = lastEra && posts[lastEra.id]?.at(-1)?.revealAfterPublish;
  if (!revealOnPost) {
    scrollTo(feedEndOffset);
    hold(T.tail, 'end of the real feed');
  }
  const revealStart = s;
  const phases = REVEAL_PHASES;
  const revealLen = phases.reduce((n, p) => n + T.reveal[p], 0);
  const tailFrom = offset;
  for (const phase of phases) {
    const len = T.reveal[phase];
    const from = lerp(tailFrom, maxOffset, (s - revealStart) / revealLen);
    const to = lerp(tailFrom, maxOffset, (s + len - revealStart) / revealLen);
    beats.push({ kind: 'reveal', s0: s, s1: s + len, phase, from, to, cursor });
    s += len;
  }

  events.sort((x, y) => x.s - y.s);

  // Era k is active once its section top crosses the reading line.
  const eraStarts = eras.map((_, k) => {
    if (k === 0) return 0;
    const threshold = (m.eras[k]?.top ?? 0) - vh * T.readingLine;
    if (threshold <= 0) return 0;
    for (const b of beats) {
      if (b.kind === 'scroll' && b.to >= threshold) {
        if (b.from >= threshold) return b.s0;
        // Invert the glide (monotonic) so the switch keys off the settled
        // offset, never the bounce: an era can't flicker back and forth.
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (b.from + (b.to - b.from) * glide(mid) < threshold) lo = mid;
          else hi = mid;
        }
        return b.s0 + hi * (b.s1 - b.s0);
      }
    }
    return revealStart;
  });

  // Notifications: spread across each era, after it settles in.
  const pings: PingSlot[] = [];
  eras.forEach((era, k) => {
    const n = era.pings.length;
    if (!n) return;
    const start = eraSettled[k];
    const end = k + 1 < eras.length ? eraArrivals[k + 1] : revealStart;
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

  return { beats, events, total: s, eraStarts, eraArrivals, revealStart, pings, glitches, warnings };
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
    reveal: null,
    pings: activePings,
    pingsSeen,
    glitch,
  };
  if (!beat) return base;
  const u = beat.s1 > beat.s0 ? clamp((s - beat.s0) / (beat.s1 - beat.s0), 0, 1) : 1;

  switch (beat.kind) {
    case 'scroll': {
      const settled = lerp(beat.from, beat.to, glide(u));
      return { ...base, offset: settled + beat.bounce * bump(u), settled, cursor: beat.cursor };
    }
    case 'hold':
      return { ...base, offset: beat.offset, settled: beat.offset, cursor: beat.cursor };
    case 'reveal': {
      const span = t.total - t.revealStart;
      const tail = lerp(beat.from, beat.to, u);
      return {
        ...base,
        offset: tail,
        settled: tail,
        cursor: beat.cursor,
        reveal: { phase: beat.phase, u, total: span > 0 ? (s - t.revealStart) / span : 1 },
      };
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
