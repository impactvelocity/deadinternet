import { describe, expect, it } from 'vitest';
import { FLOW_ERAS } from '@/data/flow/eras';
import { composition, FLOW_POSTS } from '@/data/flow/posts';
import type { CornerModule } from '@/data/flow/types';
import type { FlowMeasure, TargetRect } from '@/lib/flow/timeline';
import {
  bump,
  compileTimeline,
  deriveEffects,
  firedAt,
  FLOW_TIMING,
  glide,
  sampleTimeline,
  typedCount,
} from '@/lib/flow/timeline';

/**
 * A synthetic layout: every post is 400px tall, every target sits inside its
 * post, chrome and overlay targets sit on the screen.
 */
function fakeMeasure(): FlowMeasure {
  const viewport = { x: 300, y: 120, w: 600, h: 680 };
  const targets: Record<string, TargetRect> = {};
  const posts: FlowMeasure['posts'] = {};
  const eras: FlowMeasure['eras'] = [];
  let y = 0;
  for (const era of FLOW_ERAS) {
    eras.push({ id: era.id, top: y });
    y += 120; // section break
    for (const post of FLOW_POSTS[era.id]) {
      posts[post.id] = { top: y, height: 400 };
      const part = (name: string, dy: number) => {
        targets[`${post.id}:${name}`] = { space: 'feed', x: 40, y: y + dy, w: 80, h: 24 };
      };
      part('publish', 60);
      part('publish-submit', 240);
      targets[`${post.id}:message`] = { space: 'screen', x: 1040, y: 550, w: 200, h: 30 };
      part('body', 60);
      part('media', 140);
      part('like', 300);
      part('share', 300);
      part('cta', 280);
      part('composer', 340);
      part('submit', 370);
      for (const action of post.actions ?? []) {
        if (action.type === 'react') part(`react:${action.emoji}`, 260);
      }
      y += 400;
    }
    for (const mod of [era.platform]) {
      if (mod.kind === 'people' || mod.kind === 'requests') {
        for (const item of mod.items) {
          if (item.id) targets[`chrome:${era.id}:${item.id}`] = { space: 'screen', x: 1100, y: 300, w: 60, h: 20 };
        }
      }
    }
    if (era.overlay) {
      era.overlay.actions.forEach((_, i) => {
        targets[`overlay:${era.overlay!.id}:${i}`] = { space: 'screen', x: 600 + i * 90, y: 450, w: 80, h: 30 };
      });
    }
  }
  const feedEnd = y;
  return { viewport, contentHeight: feedEnd + 1600, feedEnd, eras, posts, targets };
}

describe('flow timeline', () => {
  const m = fakeMeasure();
  const t = compileTimeline(FLOW_ERAS, FLOW_POSTS, m);

  it('compiles every action without warnings', () => {
    expect(t.warnings).toEqual([]);
    const acts = t.beats.filter((b) => b.kind === 'act').length;
    const expected = Object.values(FLOW_POSTS)
      .flat()
      .reduce((n, p) => n + (p.actions?.length ?? 0), 0);
    expect(acts).toBe(expected);
  });

  it('covers story distance with contiguous beats', () => {
    for (let i = 1; i < t.beats.length; i++) {
      expect(t.beats[i].s0).toBeCloseTo(t.beats[i - 1].s1, 6);
    }
    expect(t.beats.at(-1)!.s1).toBeCloseTo(t.total, 6);
  });

  it('keeps reframing bounded and lands before an action', () => {
    for (let s = 0; s <= t.total; s += 23) {
      const f = sampleTimeline(t, s);
      expect(f.settled).toBeGreaterThanOrEqual(0);
      expect(f.settled).toBeLessThanOrEqual(m.contentHeight - m.viewport.h);
      expect(Math.abs(f.offset - f.settled)).toBeLessThanOrEqual(FLOW_TIMING.bounceMax + 1e-6);
    }
    for (let i = 0; i < t.beats.length; i++) {
      const beat = t.beats[i];
      if (beat.kind !== 'scroll' || beat.to >= beat.from) continue;
      expect(t.beats[i + 1].kind).toBe('hold');
      expect(t.beats[i + 2].kind).toBe('act');
    }
  });

  it('centers likes, reactions and comment boxes independently of the post header', () => {
    for (const beat of t.beats) {
      if (beat.kind !== 'act') continue;
      const action = beat.action;
      const part = action.type === 'comment' ? 'composer'
        : action.type === 'react' ? 'like'
        : action.type === 'like' ? (action.via === 'doubletap' ? 'media' : 'like') : null;
      if (!part) continue;
      const target = m.targets[`${beat.postId}:${part}`];
      const expected = Math.max(0, target.y + target.h / 2 - m.viewport.h / 2);
      expect(beat.offset, `${beat.postId}:${part}`).toBeCloseTo(expected, 6);
    }
  });

  it('gives interactive posts context before jumping to their controls', () => {
    const previews = t.beats.filter((b) => b.kind === 'hold' && b.label.startsWith('preview'));
    const expected = Object.values(FLOW_POSTS).flat().filter((p) => {
      const first = p.actions?.[0];
      return first && first.type !== 'read' && first.type !== 'watch' && first.type !== 'publish';
    });
    expect(previews).toHaveLength(expected.length);
  });

  it('glides: quick in the middle of a move, slow as it lands', () => {
    const b = t.beats.find((x) => x.kind === 'scroll' && x.to - x.from > 200);
    if (!b || b.kind !== 'scroll') throw new Error('no long scroll');
    const at = (u: number) => sampleTimeline(t, b.s0 + u * (b.s1 - b.s0)).settled;
    const mid = at(0.45) - at(0.4);
    const end = at(1) - at(0.95);
    expect(mid).toBeGreaterThan(end * 3);
    expect(glide(0)).toBe(0);
    expect(glide(1)).toBe(1);
    expect(bump(0)).toBe(0);
    expect(bump(1)).toBeCloseTo(0, 9);
  });

  it('makes every untouched post a focus stop', () => {
    const glances = t.beats.filter((b) => b.kind === 'hold' && b.label.startsWith('glance'));
    const untouched = Object.values(FLOW_POSTS)
      .flat()
      .filter((p) => !p.actions?.length).length;
    expect(glances).toHaveLength(untouched);
  });

  it('robots land dead on: no bounce in robot eras', () => {
    const robotTops = FLOW_ERAS.map((e, k) => (e.agent === 'robot' && !FLOW_POSTS[e.id].some((p) => p.agent && p.agent !== 'robot') ? k : -1)).filter((k) => k >= 0);
    for (const b of t.beats) {
      if (b.kind !== 'scroll') continue;
      const k = sampleTimeline(t, b.s1).era;
      if (robotTops.includes(k) && robotTops.includes(sampleTimeline(t, b.s0).era)) expect(b.bounce).toBe(0);
    }
  });

  it('activates eras in order', () => {
    for (let k = 1; k < t.eraStarts.length; k++) expect(t.eraStarts[k]).toBeGreaterThan(t.eraStarts[k - 1]);
    expect(sampleTimeline(t, 0).era).toBe(0);
    expect(sampleTimeline(t, t.revealStart).era).toBe(FLOW_ERAS.length - 1);
  });

  it('holds the feed still while the agent acts', () => {
    const act = t.beats.find((b) => b.kind === 'act')!;
    const a = sampleTimeline(t, act.s0 + 1).offset;
    const b = sampleTimeline(t, act.s1 - 1).offset;
    expect(a).toBe(b);
  });

  it('derives effects from scroll position and reverses them', () => {
    const like = t.events.find((e) => e.type === 'like')!;
    expect(deriveEffects(t.events, firedAt(t.events, like.s - 1)).liked.has(like.key)).toBe(false);
    expect(deriveEffects(t.events, firedAt(t.events, like.s)).liked.has(like.key)).toBe(true);
  });

  it('types comments progressively, then posts them', () => {
    const act = t.beats.find((b) => b.kind === 'act' && b.typing && !b.typing.paste);
    if (!act || act.kind !== 'act' || !act.typing) throw new Error('no human comment');
    const ty = act.typing;
    expect(sampleTimeline(t, ty.s0 - 1).typing).toBeNull();
    const mid = sampleTimeline(t, (ty.s0 + ty.s1) / 2).typing!;
    expect(mid.text.length).toBeGreaterThan(0);
    expect(mid.text.length).toBeLessThan(ty.text.length);
    expect(sampleTimeline(t, ty.end - 1).typing!.text).toBe(ty.text);
    const after = deriveEffects(t.events, firedAt(t.events, ty.end));
    expect(after.posted.get(ty.postId)).toBe(ty.text);
  });

  it('robot agents paste instead of typing', () => {
    expect(typedCount(Array.from('Great insight! 🙌'), 0.01, true)).toBe(Array.from('Great insight! 🙌').length);
    expect(typedCount(Array.from('hello there'), 0.5, false)).toBeLessThan(11);
  });

  it('every corner button the agent clicks exists in that era', () => {
    const ids = (m: CornerModule) => (m.kind === 'people' || m.kind === 'requests' ? m.items.map((i) => i.id) : []);
    for (const era of FLOW_ERAS) {
      for (const post of FLOW_POSTS[era.id]) {
        for (const action of post.actions ?? []) {
          if (action.type !== 'chrome') continue;
          expect(ids(era.platform), era.id).toContain(action.target);
        }
      }
    }
  });

  it('tells the story: people give way to bots', () => {
    const arc = FLOW_ERAS.map((e) => composition(FLOW_POSTS[e.id]));
    const first = arc[0];
    const last = arc[arc.length - 1];
    expect(first.brand + first.bot).toBe(0);
    expect(last.person + last.brand).toBe(0);
    // The final era is a shorter, entirely automated vignette before the reveal.
    expect(last.bot).toBe(FLOW_POSTS[FLOW_ERAS.at(-1)!.id].length);
    for (let k = 1; k < arc.length - 1; k++) {
      expect(arc[k].person, FLOW_ERAS[k].id).toBeLessThanOrEqual(arc[k - 1].person);
      expect(arc[k].bot, FLOW_ERAS[k].id).toBeGreaterThanOrEqual(arc[k - 1].bot);
    }
  });

  it('schedules notifications inside their era and counts only go up', () => {
    const total = FLOW_ERAS.reduce((n, e) => n + e.pings.length, 0);
    expect(t.pings).toHaveLength(total);
    for (const p of t.pings) {
      const start = t.eraArrivals[p.era];
      const end = p.era + 1 < FLOW_ERAS.length ? t.eraArrivals[p.era + 1] : t.revealStart;
      expect(p.s0).toBeGreaterThanOrEqual(start);
      expect(p.s1).toBeLessThanOrEqual(end + 1e-6);
      expect(p.s1).toBeGreaterThan(p.s0);
    }
    let seen = 0;
    for (let s = 0; s <= t.total; s += 101) {
      const f = sampleTimeline(t, s);
      expect(f.pingsSeen).toBeGreaterThanOrEqual(seen);
      seen = f.pingsSeen;
    }
  });

  it('glitches only around the machine era', () => {
    const k = FLOW_ERAS.findIndex((e) => e.id === 'machine');
    expect(sampleTimeline(t, 0).glitch).toBe(0);
    expect(sampleTimeline(t, t.eraStarts[k]).glitch).toBeGreaterThan(0.4);
    expect(sampleTimeline(t, t.eraStarts[k + 1]).glitch).toBeGreaterThan(0.9);
    const mid = (t.eraStarts[k] + t.eraStarts[k + 1]) / 2;
    expect(sampleTimeline(t, mid).glitch).toBe(0);
  });

  it('speeds the feed up era by era', () => {
    for (let k = 1; k < FLOW_ERAS.length; k++) {
      expect(FLOW_ERAS[k].scrollRate).toBeLessThanOrEqual(FLOW_ERAS[k - 1].scrollRate);
    }
  });

  it('ends with the reveal', () => {
    const end = sampleTimeline(t, t.total);
    expect(end.reveal?.phase).toBe('end');
    expect(sampleTimeline(t, t.revealStart - 1).reveal).toBeNull();
  });

  it('lets every visible result land before the feed moves on', () => {
    const minLand = Math.min(...Object.values(FLOW_TIMING.land)) * Math.min(...Object.values(FLOW_TIMING.landPace));
    const landing = new Set(['like', 'react', 'post', 'share', 'cta', 'chrome', 'dismiss']);
    const acts = t.beats.filter((b) => b.kind === 'act');
    let checked = 0;
    for (const e of t.events) {
      if (!landing.has(e.type)) continue;
      const act = acts.find((b) => b.s0 <= e.s && e.s <= b.s1);
      if (!act) continue; // overlays can be dismissed outside an act
      const post = Object.values(FLOW_POSTS).flat().find((p) => act.kind === 'act' && p.id === act.postId);
      expect(act.s1 - e.s).toBeGreaterThanOrEqual(minLand * (post?.tempo ?? 1) - 1e-6);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('eases the cursor off a clicked target so the result shows', () => {
    const like = t.events.find((e) => e.type === 'like')!;
    const act = t.beats.find((b) => b.kind === 'act' && b.s0 <= like.s && like.s <= b.s1)!;
    const atClick = sampleTimeline(t, like.s).cursor;
    const settled = sampleTimeline(t, act.s1 - 1).cursor;
    expect(settled.y - atClick.y).toBeCloseTo(FLOW_TIMING.drift.y);
  });

  it('shows the picked reaction before it lands on the button', () => {
    const pick = t.events.find((e) => e.type === 'pick')!;
    const react = t.events.find((e) => e.type === 'react' && e.key === pick.key)!;
    expect(react.s - pick.s).toBeGreaterThan(0);
    const between = deriveEffects(t.events, firedAt(t.events, (pick.s + react.s) / 2));
    expect(between.picks.get(pick.key)).toBe(pick.value);
    expect(between.palettes.has(pick.key)).toBe(true);
    expect(between.reactions.has(pick.key)).toBe(false);
    const landed = deriveEffects(t.events, firedAt(t.events, react.s));
    expect(landed.reactions.get(pick.key)).toBe(pick.value);
    expect(landed.palettes.has(pick.key)).toBe(false);
  });
  it('reveals the sandbox immediately after the inbox announcement is published', () => {
    const publications = t.beats.filter((b) => b.kind === 'act' && b.action.type === 'publish');
    expect(publications).toHaveLength(3);
    const openingDuration = publications[0].s1 - publications[0].s0;
    expect(openingDuration).toBeGreaterThan(2500);
    expect(openingDuration).toBeLessThan(4000);
    const firstPublished = t.events.find((e) => e.key === 'dead-1:publish' && e.type === 'post')!;
    expect(publications[0].s1 - firstPublished.s).toBeLessThan(1200);
    const last = publications.at(-1)!;
    expect(last.kind === 'act' && last.postId).toBe('dead-3');
    expect(last.s1).toBe(t.revealStart);
    const announcement = t.events.find((e) => e.key === 'dead-3:publish' && e.type === 'post')!;
    expect(t.revealStart - announcement.s).toBeLessThan(400);
    expect(sampleTimeline(t, t.revealStart).settled).toBeCloseTo(sampleTimeline(t, t.revealStart - 1).settled, 6);
    for (const post of FLOW_POSTS.dead) {
      const published = t.events.find((e) => e.key === `${post.id}:publish` && e.type === 'post')!;
      expect(deriveEffects(t.events, firedAt(t.events, published.s - 1)).posted.has(published.key)).toBe(false);
      expect(deriveEffects(t.events, firedAt(t.events, published.s)).posted.get(published.key)).toBe(post.body);
      if (!post.chat) continue;
      const message = t.events.find((e) => e.key === `${post.id}:message` && e.type === 'post')!;
      expect(message.s).toBeGreaterThan(published.s);
    }
  });

});
