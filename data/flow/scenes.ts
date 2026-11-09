/** The film edit. The full post catalogue remains available in posts.ts. */
import { FLOW_ERAS } from './eras';
import { FLOW_POSTS } from './posts';
import { sceneSeconds } from '@/lib/flow/playback';
import type { FlowEra, FlowEraId, FlowPost } from './types';

const duration = (era: FlowEraId) => sceneSeconds(era);
function shot(era: FlowEraId, number: number, end = duration(era), changes: Partial<FlowPost> = {}): FlowPost {
  const source = FLOW_POSTS[era].find((p) => p.id === `${era}-${number}`)!;
  return { ...source, endsAtSeconds: end, ...changes };
}

function publication(number: number, end: number, body: string, changes: Partial<FlowPost> = {}): FlowPost {
  return shot('dead', number, end, {
    body,
    actions: [{ type: 'publish', text: body }],
    publishHold: 700,
    ...changes,
  });
}

export const FILM_POSTS: Readonly<Record<FlowEraId, readonly FlowPost[]>> = {
  // A face, a conversation, a photograph we will see again in 2021.
  profile: [
    shot('profile', 1, 1.8, { actions: [] }),
    shot('profile', 2, 3.5, { actions: [{ type: 'comment', text: 'thx for the add! <3' }] }),
    shot('profile', 3),
  ],
  wall: [shot('wall', 1, 1.9), shot('wall', 2)],
  cards: [
    shot('cards', 1, 2.7, { life: undefined, actions: [{ type: 'comment', text: 'Welcome to the world <3' }] }),
    shot('cards', 2),
  ],
  // Friends give way to publishers during “more about something else”.
  viral: [
    shot('viral', 1, 1.55, { actions: [] }),
    shot('viral', 2, 3.2, { actions: [], link: { ...FLOW_POSTS.viral[1].link!, title: 'What Happened Next Will Restore Your Faith In Humanity' } }),
    shot('viral', 4, undefined, { actions: [] }),
  ],
  algorithm: [
    shot('algorithm', 3, 3.9),
    shot('algorithm', 4, 5.9, { actions: [{ type: 'comment', text: 'not this again' }] }),
    shot('algorithm', 3, undefined, {
      id: 'algorithm-more',
      meta: 'Because you reacted to Heartland Voice',
      label: 'Suggested for you',
      body: 'Still angry? Here’s what they’re hiding now. 😡',
      media: {
        ...FLOW_POSTS.algorithm[2].media!,
        src: '/assets/posts/algorithm-more.jpg',
        note: 'redacted documents circled in red: WHAT ARE THEY HIDING? SHARE BEFORE THIS DISAPPEARS',
      },
      actions: [],
    }),
  ],
  stories: [
    shot('stories', 1, 3.1, { actions: [{ type: 'like', via: 'doubletap' }] }),
    shot('stories', 5, undefined, { actions: [{ type: 'comment', text: 'wish i was there 😍' }] }),
  ],
  // Rush through the stream, then ease past the same friends as the opening.
  reels: [
    shot('reels', 1, 0.8),
    shot('reels', 2, 2.1, { actions: [] }),
    shot('reels', 5, 3.35, { actions: [] }),
    shot('reels', 4, undefined, { actions: [] }),
  ],
  // These lines are barely two seconds long: one image is the whole scene.
  slop: [shot('slop', 1, undefined, { actions: [] })],
  pro: [
    // "Everyone seemed to know what was best for me." Advice, and a real
    // person asking for help, scrolled straight past. "Another life lesson,"
    // a poll and an ad. "Another inspirational quote": the agent agrees.
    shot('pro', 1, 1.7, { actions: [] }),
    shot('pro', 2, 3.2, { actions: [] }),
    shot('pro', 4, 4.6, { actions: [] }),
    shot('pro', 3, 5.6, { actions: [] }),
    shot('pro', 5, undefined, { actions: [{ type: 'comment', text: 'Agree! 💡' }] }),
  ],
  // "It just wasn't fun anymore…" and then, with nobody talking, the feed
  // keeps going: template posts, faster and faster, the last one from
  // Ashley's own account.
  machine: [1.3, 2.3, 3.1, 3.8, 4.45, 5.05, 5.6, 6.1, undefined].map((end, i) => shot('machine', i + 1, end, { actions: [] })),
  dead: [
    publication(1, 4.6, 'A little life update 💛\n\nAI changed my life. Now I’m building my own digital business.\n\nMy phone. My time. My opportunity ✨'),
    publication(2, 8.4, 'I’m sharing exactly what’s working for me.\n\nNo experience needed. Just your phone and a little belief in yourself. 💸', {
      media: { ...FLOW_POSTS.dead[2].media! },
      comments: [],
      actions: [
        { type: 'publish', text: 'I’m sharing exactly what’s working for me.\n\nNo experience needed. Just your phone and a little belief in yourself. 💸' },
        { type: 'message', text: 'AI does the hard part. I’ll send you the link 💛' },
      ],
    }),
    publication(3, duration('dead'), 'Your next chapter starts here ✨\n\nComment YES and I’ll send you the free training.\n\njoin.daybreak.example/ashley', {
      media: { ...FLOW_POSTS.dead[1].media!, src: '/assets/posts/daybreak-invitation-yes.png', note: 'Daybreak invitation: Your phone. Your freedom. Comment YES' },
      publishHold: 1100,
    }),
  ],
};

/**
 * Eras left out of the film. Their posts and narration stay in the data;
 * delete an id here to bring that era back.
 */
export const HIDDEN_ERAS: readonly FlowEraId[] = ['slop', 'machine'];

/** No consent modals or notification pile-ups interrupt the short scenes. */
export const FILM_ERAS: readonly FlowEra[] = FLOW_ERAS.filter((era) => !HIDDEN_ERAS.includes(era.id)).map((era) => ({
  ...era,
  overlay: undefined,
  holdPx: era.id === 'profile' ? 380 : 160,
  pings: era.id === 'dead' ? era.pings.map((ping) => ({ ...ping, text: ping.text.replaceAll('I AM IN', 'YES') }))
    : era.id === 'slop' || era.id === 'machine' ? [] : era.pings.slice(0, 1),
  platform: era.id === 'profile' && era.platform.kind === 'grid'
    ? { ...era.platform, title: 'ashley’s Top 5', names: era.platform.names.slice(0, 5) } : era.platform,
}));

/** One short title for the gist of each era rather than spoken subtitles. */
export const FILM_TITLES: Record<FlowEraId, string> = {
  profile: 'It started with a space for us',
  wall: 'Our faces became a circle of friends',
  cards: 'We shared the little moments of life',
  viral: 'Our friends gave way to viral stories',
  algorithm: 'The feed learned to keep us angry',
  stories: 'Everyone else seemed to have it all',
  reels: 'Endless videos pushed our friends away',
  slop: 'Things started to feel a little strange',
  pro: 'Every little moment became a life lesson',
  machine: 'The scrolling continued after the fun stopped',
  dead: 'Then I had something to sell too',
};
