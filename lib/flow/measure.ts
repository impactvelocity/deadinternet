/**
 * Measures the /flow screen's DOM into a `FlowMeasure` for the timeline.
 *
 * Positions use the offsetParent chain, which ignores CSS transforms, so the
 * result is the same whatever the feed's scroll offset, the fit scale, or the
 * reveal camera. Targets inside `[data-flow-content]` are in feed-content
 * coords; everything else is in screen coords.
 */
import type { FlowMeasure, TargetRect } from './timeline';

function offsetWithin(el: HTMLElement, root: HTMLElement): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let node: Element | null = el;
  while (node && node !== root) {
    if (!(node instanceof HTMLElement)) return null;
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return node === root ? { x, y } : null;
}

export function measureFlow(screen: HTMLElement): FlowMeasure | null {
  const viewportEl = screen.querySelector<HTMLElement>('[data-flow-viewport]');
  const content = screen.querySelector<HTMLElement>('[data-flow-content]');
  if (!viewportEl || !content) return null;
  const vp = offsetWithin(viewportEl, screen);
  if (!vp) return null;

  const eras = Array.from(content.querySelectorAll<HTMLElement>('[data-flow-era]')).map((el) => ({
    id: el.dataset.flowEra ?? '',
    top: offsetWithin(el, content)?.y ?? 0,
  }));

  const posts: FlowMeasure['posts'] = {};
  content.querySelectorAll<HTMLElement>('[data-flow-post]').forEach((el) => {
    const p = offsetWithin(el, content);
    if (p && el.dataset.flowPost) posts[el.dataset.flowPost] = { top: p.y, height: el.offsetHeight };
  });

  const targets: Record<string, TargetRect> = {};
  screen.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
    const id = el.dataset.t;
    if (!id) return;
    const inFeed = content.contains(el);
    const p = offsetWithin(el, inFeed ? content : screen);
    if (!p) return;
    targets[id] = { space: inFeed ? 'feed' : 'screen', x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight };
  });

  const tail = content.querySelector<HTMLElement>('[data-flow-tail]');
  const feedEnd = tail ? (offsetWithin(tail, content)?.y ?? content.offsetHeight) : content.offsetHeight;

  return {
    viewport: { x: vp.x, y: vp.y, w: viewportEl.offsetWidth, h: viewportEl.offsetHeight },
    contentHeight: content.offsetHeight,
    feedEnd,
    eras,
    posts,
    targets,
  };
}
