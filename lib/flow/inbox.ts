/**
 * Ashley's unread counts (the badges under her chip, top left).
 *
 * Every era starts from its own platform's counts and keeps climbing while it
 * plays: a few messages a second on MySpace, a firehose by the machine. In
 * the rush just before "Behind the feed" the counts explode: thousands,
 * millions, billions, because nobody is reading them. Like everything else, the counts are a pure
 * function of story position, so scrubbing backwards winds them back down.
 */
import type { FlowEra } from '@/data/flow/types';
import { PLAY_SPEED } from './playback';
import { eraAt, type Timeline } from './timeline';

export const INBOX_KINDS = ['messages', 'requests', 'alerts'] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];
export type InboxCounts = Record<InboxKind, number>;

const PING_KIND = { message: 'messages', request: 'requests', alert: 'alerts' } as const;

export const INBOX = {
  /** New arrivals per second: a floor, plus a share of the era's own count. */
  base: 0.3,
  perCount: 0.05,
  /** Each later era is this much busier again. */
  perEra: 0.12,
  /** From the rush on, counts grow by e every this many seconds. */
  boomSeconds: 1,
  /** Head start for each kind's explosion (so an empty count explodes too). */
  boom: { messages: 4, requests: 1.5, alerts: 9 } as InboxCounts,
  cap: 9.99e9,
} as const;

/**
 * Arrivals by `seconds`, irregular (they bunch up and spread out) but never
 * going down: the wobble's slope never outweighs the steady rate.
 */
function arrivals(perSecond: number, seconds: number, seed: number): number {
  const x = perSecond * seconds;
  return Math.max(0, Math.floor(x + 0.35 * (Math.sin(2.3 * x + seed) - Math.sin(seed))));
}

/** Counts within era k at story position `s`, starting from `carried` (nothing is ever read). */
function eraCounts(eras: readonly FlowEra[], t: Timeline, k: number, s: number, carried: InboxCounts): InboxCounts {
  const era = eras[k];
  const seconds = Math.max(0, Math.min(s, t.rushStart) - t.eraStarts[k]) / PLAY_SPEED;
  const busy = 1 + k * INBOX.perEra;
  const out = {} as InboxCounts;
  INBOX_KINDS.forEach((kind, i) => {
    // Each platform starts at its own counts, or wherever the last one left off.
    const start = Math.max(era.you.inbox[kind], carried[kind]);
    out[kind] = start + arrivals((INBOX.base + era.you.inbox[kind] * INBOX.perCount) * busy, seconds, k * 3.1 + i * 1.7);
  });
  // The era's own notification toasts count too.
  for (const p of t.pings) if (p.era === k && p.s0 <= s) out[PING_KIND[era.pings[p.index].kind]]++;
  return out;
}

export function inboxCounts(eras: readonly FlowEra[], t: Timeline, s: number): InboxCounts {
  const k = eraAt(t, s);
  let carried: InboxCounts = { messages: 0, requests: 0, alerts: 0 };
  for (let j = 0; j < k; j++) carried = eraCounts(eras, t, j, t.eraStarts[j + 1], carried);
  const out = eraCounts(eras, t, k, s, carried);
  if (s > t.rushStart) {
    // Everything piles up from the rush on: each kind multiplies by e every `boomSeconds`.
    const boom = Math.exp((s - t.rushStart) / PLAY_SPEED / INBOX.boomSeconds);
    for (const kind of INBOX_KINDS) out[kind] = Math.min(INBOX.cap, Math.floor((out[kind] + INBOX.boom[kind]) * boom - INBOX.boom[kind]));
  }
  return out;
}

/** Badge text: exact up to 9,999, then 12.4K, 3.71M, 1.20B. */
export function formatCount(n: number): string {
  if (n < 10_000) return n.toLocaleString('en-US');
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(2)}M`;
  return `${(n / 1e9).toFixed(2)}B`;
}
