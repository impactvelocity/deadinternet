/**
 * The only route. On a computer it is the film: one continuous feed with
 * pinned pieces around it, played by scrolling (FlowLab, behind FilmGate).
 * A phone can't play that, so it gets the film as a video and the story to
 * read instead (MobileStory). `/flow`, where the film lived while it was a
 * lab, redirects here (see `next.config.ts`).
 */
import { FilmGate } from '@/components/flow/FilmGate';
import { MobileStory } from '@/components/story/MobileStory';

export default function Home() {
  return (
    <>
      <MobileStory />
      <FilmGate />
    </>
  );
}
