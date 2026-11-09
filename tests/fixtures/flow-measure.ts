import { FLOW_ERAS } from '@/data/flow/eras';
import { FLOW_POSTS } from '@/data/flow/posts';
import type { FlowEra, FlowPost } from '@/data/flow/types';
import type { FlowMeasure, TargetRect } from '@/lib/flow/timeline';

/**
 * A synthetic layout: every post is 400px tall, every target sits inside its
 * post, chrome and overlay targets sit on the screen.
 */
export function fakeMeasure(eraList: readonly FlowEra[] = FLOW_ERAS, postList: Readonly<Record<string, readonly FlowPost[]>> = FLOW_POSTS): FlowMeasure {
  const viewport = { x: 300, y: 120, w: 600, h: 680 };
  const targets: Record<string, TargetRect> = {};
  const posts: FlowMeasure['posts'] = {};
  const eras: FlowMeasure['eras'] = [];
  let y = 0;
  for (const era of eraList) {
    eras.push({ id: era.id, top: y });
    y += 120; // section break
    for (const post of postList[era.id]) {
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

