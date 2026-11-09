import { describe, expect, it } from 'vitest';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { formatCount, INBOX_KINDS, inboxCounts } from '@/lib/flow/inbox';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { compileTimeline } from '@/lib/flow/timeline';
import { fakeMeasure } from '../fixtures/flow-measure';

const t = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
const at = (s: number) => inboxCounts(FILM_ERAS, t, s);
const total = (s: number) => INBOX_KINDS.reduce((n, k) => n + at(s)[k], 0);

describe('unread counts', () => {
  it('only ever go up, across era changes too, and every platform shows at least its own counts', () => {
    let previous = at(0);
    for (let s = 0; s <= t.total; s += PLAY_SPEED / 20) {
      const now = at(s);
      for (const kind of INBOX_KINDS) expect(now[kind], `${kind} at ${(s / PLAY_SPEED).toFixed(2)}s`).toBeGreaterThanOrEqual(previous[kind]);
      previous = now;
    }
    FILM_ERAS.forEach((era, k) => {
      const start = t.eraStarts[k];
      const end = t.eraStarts[k + 1] ?? t.revealStart;
      for (const kind of INBOX_KINDS) expect(at(start)[kind]).toBeGreaterThanOrEqual(era.you.inbox[kind]);
      // Something new arrives in every era, not just at the switch.
      expect(total(end - 1), era.id).toBeGreaterThan(total(start) + 2);
    });
  });

  it('gets busier era by era', () => {
    const rise = (k: number) => {
      const s = t.eraStarts[k];
      return total(s + 3 * PLAY_SPEED) - total(s);
    };
    const pro = FILM_ERAS.findIndex((era) => era.id === 'pro');
    expect(rise(pro)).toBeGreaterThan(rise(0) * 5);
  });

  it('explodes once the camera pulls back, and scrubbing back winds it down', () => {
    const before = total(t.pullbackStart);
    expect(total(t.pullbackStart + 5 * PLAY_SPEED)).toBeGreaterThan(before * 20);
    expect(total(t.pullbackStart + 15 * PLAY_SPEED)).toBeGreaterThan(1e5);
    expect(at(t.total).alerts).toBeGreaterThan(1e9);
    expect(total(t.pullbackStart - 1)).toBeLessThan(total(t.pullbackStart + PLAY_SPEED));
  });

  it('formats counts compactly once they get big', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(12_400)).toBe('12.4K');
    expect(formatCount(3_710_000)).toBe('3.71M');
    expect(formatCount(1_200_000_000)).toBe('1.20B');
  });
});
