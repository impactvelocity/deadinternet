import { describe, expect, it } from 'vitest';
import { FLOW_ERAS } from '@/data/flow/eras';
import narration from '@/data/flow/narration.json';
import { MUSIC } from '@/lib/flow/music';
import { PLAY_SPEED, SCENE_PAUSE_SECONDS, sceneSeconds } from '@/lib/flow/playback';
import { composition, FLOW_POSTS } from '@/data/flow/posts';
import type { CornerModule } from '@/data/flow/types';
import {
  bump,
  compileTimeline,
  DOT_MORPH,
  REVEAL_PHASES,
  deriveEffects,
  firedAt,
  FLOW_TIMING,
  glide,
  sampleTimeline,
  typedCount,
} from '@/lib/flow/timeline';

import { SPOKEN } from '@/lib/flow/signal';
import { FILM_ERAS, FILM_POSTS } from '@/data/flow/scenes';
import { fakeMeasure } from '../fixtures/flow-measure';

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

  it('transitions immediately when each voice clip finishes, without a gap', () => {
    for (const layout of [m, { ...m, viewport: { ...m.viewport, h: 440 } }]) {
      const timeline = compileTimeline(FLOW_ERAS, FLOW_POSTS, layout);
      FLOW_ERAS.forEach((era, k) => {
        const start = timeline.eraStarts[k];
        const end = timeline.eraStarts[k + 1] ?? timeline.revealStart;
        const duration = sceneSeconds(era.id);
        expect((end - start) / PLAY_SPEED, era.id).toBeCloseTo(duration, 6);
        expect(sampleTimeline(timeline, end - 1).era).toBe(k);
        if (k + 1 < FLOW_ERAS.length) expect(sampleTimeline(timeline, end).era).toBe(k + 1);
        // "Behind the feed" is where the camera pulls back.
        else expect(sampleTimeline(timeline, end).reveal).toMatchObject({ phase: 'sandbox', u: 0 });
      });
      expect(timeline.beats.some((b) => b.kind === 'hold' && b.label.startsWith('breath'))).toBe(false);
      expect(timeline.beats.every((b) => b.s1 > b.s0)).toBe(true);
    }
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

  it('lets her post until just before "Behind the feed", then rushes, then pulls back with it', () => {
    const dead = FLOW_ERAS.length - 1;
    expect(narration.chunks.find((c) => c.era === FLOW_ERAS[dead].id)).not.toHaveProperty('pullbackAtSeconds');
    expect(t.pullbackStart).toBe(t.revealStart);
    expect(sampleTimeline(t, t.pullbackStart - 1).reveal).toBeNull();
    expect(sampleTimeline(t, t.pullbackStart).reveal?.phase).toBe('sandbox');
    // The rush is a moment, not the whole era.
    expect((t.revealStart - t.rushStart) / PLAY_SPEED).toBeCloseTo(FLOW_TIMING.revealRush, 6);
    expect(t.rushStart).toBeGreaterThan(t.eraStarts[dead]);
    // In the film, her last post is up before the rush.
    const film = compileTimeline(FILM_ERAS, FILM_POSTS, fakeMeasure(FILM_ERAS, FILM_POSTS));
    const posted = film.events.filter((e) => e.type === 'post' && e.s > film.eraStarts.at(-1)!);
    expect(posted.length).toBeGreaterThan(0);
    expect(posted.at(-1)!.s).toBeLessThan(film.rushStart);
    // Only the people write while she posts; the bots flood in during the rush, faster and faster.
    const era = FLOW_ERAS[dead];
    const mine = t.pings.filter((p) => p.era === dead);
    for (const p of mine) {
      const machine = era.pings[p.index].tone === 'machine';
      if (machine) expect(p.s0).toBeGreaterThanOrEqual(t.rushStart);
      else expect(p.s0).toBeLessThan(t.rushStart);
      expect(p.s1).toBeLessThanOrEqual(t.revealStart);
    }
    const flood = mine.filter((p) => era.pings[p.index].tone === 'machine').map((p) => p.s0);
    expect(flood.length).toBeGreaterThan(5);
    expect(flood[1] - flood[0]).toBeGreaterThan(flood.at(-1)! - flood.at(-2)!);
    expect(t.reveal.map((r) => r.phase)).toEqual(REVEAL_PHASES);
    for (let i = 1; i < t.reveal.length; i++) expect(t.reveal[i].s0).toBeCloseTo(t.reveal[i - 1].s1, 6);
  });

  it('holds on the chat long enough to read it', () => {
    const chat = t.reveal.find((r) => r.phase === 'chat')!;
    expect((chat.s1 - chat.s0) / PLAY_SPEED).toBeGreaterThan(2.5);
    const sandbox = t.reveal.find((r) => r.phase === 'sandbox')!;
    expect((sandbox.s1 - sandbox.s0) / PLAY_SPEED).toBeGreaterThan(1);
  });

  it('opens "Behind the feed" on the chat, has the field of dots by "Now it\'s just a chat agent", and fades out with the score', () => {
    const at = (phase: string) => t.reveal.find((r) => r.phase === phase)!;
    const into = (s: number) => (s - t.revealStart) / PLAY_SPEED;
    const dots = at('dots');
    expect((dots.s0 - t.pullbackStart) / PLAY_SPEED).toBeCloseTo(FLOW_TIMING.revealPullMin, 6);
    // Every session is a dot, twinkling for a moment, before the camera packs them into a screen...
    const formed = into(dots.s0) + FLOW_TIMING.revealMorph;
    expect(formed).toBeLessThan(narration.reveal.cues.signal);
    expect(sampleTimeline(t, dots.s0 + FLOW_TIMING.revealMorph * PLAY_SPEED).reveal!.u).toBeGreaterThanOrEqual(DOT_MORPH - 1e-6);
    // ...on its cue, before the first symbol.
    expect(into(at('signal').s0)).toBeCloseTo(narration.reveal.cues.signal, 6);
    expect(narration.reveal.cues.signal).toBeLessThan(SPOKEN[0].at);
    expect(into(at('end').s0)).toBeGreaterThan(narration.reveal.durationSeconds);
    expect(narration.reveal).not.toHaveProperty('foley');
    expect(t.total / PLAY_SPEED).toBeCloseTo(MUSIC.durationSeconds, 6);
    expect((t.total - at('end').s0) / PLAY_SPEED).toBeCloseTo(FLOW_TIMING.revealEndCard, 6);
    expect(sampleTimeline(t, t.total).reveal?.phase).toBe('end');
  });

  it('lets every visible result land before the feed moves on', () => {
    const minLand = PLAY_SPEED * 0.1;
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
  it('holds the final announcement before revealing the sandbox', () => {
    const publications = t.beats.filter((b) => b.kind === 'act' && b.action.type === 'publish');
    expect(publications).toHaveLength(3);
    const openingDuration = publications[0].s1 - publications[0].s0;
    // The sadder line is shorter; the first post still gets a few unhurried seconds.
    expect(openingDuration).toBeGreaterThan(1900);
    expect(openingDuration).toBeLessThan(4000);
    const firstPublished = t.events.find((e) => e.key === 'dead-1:publish' && e.type === 'post')!;
    expect(publications[0].s1 - firstPublished.s).toBeLessThan(1200);
    const last = publications.at(-1)!;
    expect(last.kind === 'act' && last.postId).toBe('dead-3');
    expect(t.revealStart - last.s1).toBeCloseTo(SCENE_PAUSE_SECONDS * PLAY_SPEED, 6);
    const announcement = t.events.find((e) => e.key === 'dead-3:publish' && e.type === 'post')!;
    expect(t.revealStart - announcement.s).toBeGreaterThan(SCENE_PAUSE_SECONDS * PLAY_SPEED);
    expect(t.revealStart - announcement.s).toBeLessThan(PLAY_SPEED);
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
