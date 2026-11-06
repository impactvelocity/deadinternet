/**
 * The only route: the dead internet feed. One continuous feed with pinned
 * pieces around it; each era swaps what is in them and restyles the feed.
 * `/flow`, where this lived while it was a lab, redirects here
 * (see `next.config.ts`).
 */
import { FlowLab } from '@/components/flow/FlowLab';

export default function Home() {
  return <FlowLab />;
}
