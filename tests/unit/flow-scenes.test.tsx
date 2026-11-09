import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FILM_TITLES, FILM_ERAS, FILM_POSTS, HIDDEN_ERAS } from '@/data/flow/scenes';
import { FLOW_ERAS } from '@/data/flow/eras';
import narration from '@/data/flow/narration.json';
import { FlowFeed } from '@/components/flow/FlowFeed';
import { compileTimeline, FLOW_TIMING, NO_EFFECTS, sampleTimeline } from '@/lib/flow/timeline';
import { PLAY_SPEED, sceneSeconds } from '@/lib/flow/playback';
import { fakeMeasure } from '../fixtures/flow-measure';

afterEach(cleanup);

describe('film edit', () => {
  const measure = fakeMeasure(FILM_ERAS, FILM_POSTS);
  const timeline = compileTimeline(FILM_ERAS, FILM_POSTS, measure);

  it('keeps every shot inside its narration clip', () => {
    expect(timeline.warnings).toEqual([]);
    for (const [k, era] of FILM_ERAS.entries()) {
      // The line, plus any silent tail (the machine keeps scrolling on its own).
      const duration = sceneSeconds(era.id);
      const shots = FILM_POSTS[era.id];
      let previous = 0;
      for (const post of shots) {
        expect(post.endsAtSeconds!).toBeGreaterThan(previous);
        const out = timeline.eraStarts[k] + post.endsAtSeconds! * PLAY_SPEED;
        expect(timeline.beats.some((b) => Math.abs(b.s1 - out) < 1e-6)).toBe(true);
        previous = post.endsAtSeconds!;
      }
      expect(previous).toBe(duration);
      expect((timeline.eraStarts[k + 1] ?? timeline.revealStart) - timeline.eraStarts[k]).toBeCloseTo(duration * PLAY_SPEED, 6);
    }
  });

  it('uses one short punctuation-free title for each era', () => {
    for (const era of FILM_ERAS) {
      const title = FILM_TITLES[era.id];
      expect(title).toMatch(/^[A-Za-z0-9 ]+$/);
      expect(title.split(' ').length).toBeGreaterThanOrEqual(5);
      expect(title.split(' ').length).toBeLessThanOrEqual(8);
    }
  });

  /** Feed speed in px per second, measured just either side of `s`. */
  const speed = (s: number, side: -1 | 1) => {
    const h = PLAY_SPEED * 1e-4;
    const a = side < 0 ? s - 2 * h : s + h;
    return (sampleTimeline(timeline, a + h).offset - sampleTimeline(timeline, a).offset) / (h / PLAY_SPEED);
  };

  it('moves as one smooth motion, coming to rest only where the agent acts', () => {
    for (let i = 1; i < timeline.beats.length; i++) {
      expect(timeline.beats[i].s0).toBeCloseTo(timeline.beats[i - 1].s1, 6);
    }
    for (const beat of timeline.beats) {
      expect(beat.s1).toBeGreaterThan(beat.s0);
      expect(beat.kind).not.toBe('hold');
      if (beat.kind === 'scroll') {
        expect(beat.continuous).toBe(true);
        expect(beat.to).not.toBe(beat.from);
      }
      if (beat.kind !== 'act') continue;
      for (const seg of beat.segs) {
        expect(seg.s0).toBeGreaterThanOrEqual(beat.s0 - 1e-6);
        expect(seg.s1).toBeLessThanOrEqual(beat.s1 + 1e-6);
      }
    }
    // Every join, era changes included: no jump in position or in speed.
    for (const beat of timeline.beats) {
      if (beat.s0 === 0 || beat.kind === 'tail') continue;
      const before = sampleTimeline(timeline, beat.s0 - 1e-6).offset;
      expect(sampleTimeline(timeline, beat.s0 + 1e-6).offset).toBeCloseTo(before, 3);
      const [v0, v1] = [speed(beat.s0, -1), speed(beat.s0, 1)];
      expect(Math.abs(v1 - v0), `speed jump at ${(beat.s0 / PLAY_SPEED).toFixed(2)}s`).toBeLessThan(12);
      if (beat.kind === 'act') expect(Math.abs(v1)).toBeLessThan(1e-6);
    }
    // Never a whip pan: even the longest jump stays easy to follow.
    let fastest = 0;
    for (let s = 0; s < timeline.revealStart; s += PLAY_SPEED / 120) fastest = Math.max(fastest, Math.abs(speed(s, 1)));
    expect(fastest).toBeLessThan(2200);
  });

  it('keeps the cursor out of the way, right of the feed, unless the agent is acting', () => {
    const right = measure.viewport.x + measure.viewport.w;
    for (const beat of timeline.beats) {
      if (beat.kind === 'scroll') {
        // By the end of any scroll the cursor waits in the gutter right of the feed.
        expect(sampleTimeline(timeline, beat.s1 - 1e-6).cursor.x, `scroll at ${(beat.s0 / PLAY_SPEED).toFixed(2)}s`).toBeGreaterThan(right);
      }
      if (beat.kind === 'act' && timeline.beats[timeline.beats.indexOf(beat) - 1]?.kind === 'scroll') {
        // ...and each action sets off from there.
        expect(sampleTimeline(timeline, beat.s0 + 1e-6).cursor.x).toBeGreaterThan(right - 1);
      }
    }
    expect(FILM_POSTS.pro.length).toBeGreaterThanOrEqual(5);
  });

  it('enters every era already moving, with the new era on screen', () => {
    FILM_ERAS.forEach((era, k) => {
      const start = timeline.eraStarts[k];
      expect(sampleTimeline(timeline, start).era).toBe(k);
      if (k === 0) return;
      const offset = sampleTimeline(timeline, start).offset;
      expect(sampleTimeline(timeline, start - 1e-7).offset).toBeCloseTo(offset, 4);
      // The incoming section is already visible below the outgoing posts...
      expect(measure.eras[k].top, era.id).toBeLessThan(offset + measure.viewport.h);
      // ...and the feed glides on toward it rather than starting from a park.
      const entrance = timeline.beats.find((beat) => Math.abs(beat.s0 - start) < 1e-6);
      expect(entrance?.kind).toBe('scroll');
    });
  });

  it('runs the agent close to its natural pace and frames what it touches', () => {
    for (const beat of timeline.beats) {
      if (beat.kind !== 'act') continue;
      const press = beat.segs.find((seg) => seg.kind === 'press');
      if (press) {
        const stretch = (press.s1 - press.s0) / FLOW_TIMING.press;
        // Only the tightest out-points squeeze below `actMin`.
        expect(stretch, beat.label).toBeGreaterThan(0.45);
        expect(stretch, beat.label).toBeLessThanOrEqual(FLOW_TIMING.film.actMax + 1e-6);
      }
      const a = beat.action;
      const parts = a.type === 'comment' ? ['composer'] : a.type === 'publish' ? ['publish', 'publish-submit']
        : a.type === 'like' ? [a.via === 'doubletap' ? 'media' : 'like'] : a.type === 'react' ? ['like'] : [];
      for (const part of parts) {
        const r = measure.targets[`${beat.postId}:${part}`];
        expect(r.y - beat.offset, `${beat.postId}:${part}`).toBeGreaterThanOrEqual(FLOW_TIMING.film.edge - 1e-6);
        expect(r.y + r.h - beat.offset, `${beat.postId}:${part}`).toBeLessThanOrEqual(measure.viewport.h - FLOW_TIMING.film.edge + 1e-6);
      }
    }
  });

  it('lands the return to friends on the opening photograph and ends with the spoken invitation', () => {
    expect(FILM_POSTS.reels.at(-1)!.media?.src).toBe(FILM_POSTS.profile.at(-1)!.media?.src);
    // AI Slop is hidden from the film for now (HIDDEN_ERAS), and nothing else is.
    expect(FILM_ERAS.map((era) => era.id)).not.toContain('slop');
    expect(FILM_ERAS).toHaveLength(FLOW_ERAS.length - HIDDEN_ERAS.length);
    // The machine runs on past its line: a long feed of template posts,
    // the last one from Ashley's old account, before the glitch into the new one.
    expect(FILM_POSTS.machine.length).toBeGreaterThanOrEqual(8);
    expect(FILM_POSTS.machine.at(-1)!.author.name).toBe('Ashley Parker');
    expect(sceneSeconds('machine')).toBeGreaterThan(narration.chunks.find((c) => c.era === 'machine')!.durationSeconds + 2);
    expect(FILM_POSTS.dead.at(-1)!.body).toContain('Comment YES');
    for (const post of FILM_POSTS.dead) {
      const action = post.actions!.find((a) => a.type === 'publish');
      expect(action?.type === 'publish' && action.text).toBe(post.body);
    }
  });

  it('draws every era in place (no blank gap before the next one) and keeps upcoming ones inert, including reverse seeks', () => {
    const props = { tokens: new Map(FILM_ERAS.map((era) => [era.id, era.tokens])), wire: false, guides: false, effects: NO_EFFECTS, typing: null };
    const { container, rerender } = render(<FlowFeed {...props} activeEra="profile" revealing={false} />);
    const check = (active: string, tailReached: boolean) => {
      expect(container.querySelectorAll('[data-flow-era]')).toHaveLength(FILM_ERAS.length);
      for (const era of container.querySelectorAll<HTMLElement>('[data-flow-era]')) {
        const reached = FILM_ERAS.findIndex((item) => item.id === era.dataset.flowEra) <= FILM_ERAS.findIndex((item) => item.id === active);
        expect(era.style.opacity).not.toBe('0');
        expect(era.style.visibility).not.toBe('hidden');
        expect(era.getAttribute('aria-hidden')).toBe(String(!reached));
        expect(era.hasAttribute('inert')).toBe(!reached);
        expect(era.style.display).not.toBe('none');
      }
      const tail = container.querySelector('[data-flow-tail]') as HTMLElement;
      expect(tail.style.opacity).not.toBe('0');
      expect(tail.getAttribute('aria-hidden')).toBe(String(!tailReached));
    };
    check('profile', false);
    rerender(<FlowFeed {...props} activeEra="dead" revealing={false} />);
    check('dead', false);
    rerender(<FlowFeed {...props} activeEra="dead" revealing />);
    check('dead', true);
    rerender(<FlowFeed {...props} activeEra="wall" revealing={false} />);
    check('wall', false);
  });
});
