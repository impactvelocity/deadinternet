/**
 * Era definitions for the /flow feed lab.
 *
 * The story is told by the feed: real people slowly give way to brands, then
 * bots, until nobody in it is real. Everything stays light mode, and there
 * are no headers or logos. Around the feed, every era fills the same few
 * pinned pieces:
 *
 * - `date`: shown under the era name in the page header. The night gets
 *   later every era.
 * - `tab`: the browser tab title and address. One fictional domain throughout.
 * - `context`: the era drawer's copy. Draft: fact-check before shipping.
 * - `you`: Ashley's chip, top left, with inbox / requests / alerts counts.
 * - `pings`: notifications that slide in under her chip and leave again:
 *   friends first, then famous accounts and brands, then scams, then the
 *   machine talking to itself.
 * - `platform`: the one thing the site pushes at you, top right.
 * - `dock` and `overlay`: chat/assistant bubble and pop-ups.
 *
 * `scrollRate` is story px per px of feed movement. It falls era by era, so
 * the same scroll moves the feed further: slow and warm in 2005, frantic by
 * 2025. The `machine` era drops the costume: the feed shows its box model and
 * markup, then glitches back for the last era.
 *
 * Reorder, add or remove eras here; posts live in `data/flow/posts.ts`.
 */
import { OPPORTUNITY_FACES } from './images';
import type { EraTokens, FlowEra, FlowEraId } from './types';

const SYSTEM = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* ------------------------------ Shared tokens ----------------------------- */

const SLOP_TOKENS: EraTokens = {
  font: SYSTEM,
  size: 15,
  bg: '#f0f2f5',
  surface: '#ffffff',
  panel: '#ffffff',
  panelText: '#65676b',
  text: '#050505',
  muted: '#65676b',
  accent: '#075edb',
  accentText: '#ffffff',
  line: '#e4e6eb',
  soft: '#f0f2f5',
  radius: 10,
  pad: 14,
  gap: 14,
  avatar: 40,
  avatarShape: 'circle',
  shadow: true,
};

const FB_REACTIONS: [string, string][] = [
  ['👍', 'Like'],
  ['❤️', 'Love'],
  ['😆', 'Haha'],
  ['😮', 'Wow'],
  ['😢', 'Sad'],
  ['😡', 'Angry'],
];

const BAR_LABELS = {
  like: { icon: 'like', label: 'Like' },
  comment: { icon: 'comment', label: 'Comment' },
  share: { icon: 'share', label: 'Share' },
} as const;

export const FLOW_ERAS: readonly FlowEra[] = [
  /* -------------------------------- 2005 -------------------------------- */
  {
    id: 'profile',
    narration: "This used to be my little corner of the internet. My music. My friends. My space...",
    year: 2005,
    label: 'Profile pages',
    reference: 'MySpace',
    beat: 'Everyone you see is a real friend. The page is yours to decorate.',
    date: { day: 'Friday, October 14, 2005', time: '9:12 PM' },
    tab: { title: "ashley ♥ | Profile", url: "http://feed.example/profile.cfm?friendid=4471" },
    backdrop: { base: '#ece4ec', glow: '#f7d3ea', glow2: '#d3dcf4' }, // MySpace pink and blue
    context: {
      summary:
        "Social networking meant a profile page you built yourself. People hand-edited HTML and CSS to add glitter backgrounds and autoplaying songs, ranked friends in a public Top 8, and left comments on each other’s pages.",
      points: [
        "MySpace launched in 2003 and by mid-2006 was the most visited website in the US.",
        "Profiles were customised by pasting HTML and CSS into the “About me” box.",
        "Your Top 8 friends were public, and reordering them could start real drama.",
        "Bulletins went to every friend at once: surveys, band promos, chain posts.",
      ],
    },
    scrollRate: 1.5,
    agent: 'human',
    loader: 'pager',
    holdPx: 700,
    tokens: {
      font: 'Verdana, Tahoma, Geneva, sans-serif',
      size: 12,
      bg: '#fdf2fa',
      background:
        'radial-gradient(circle at 50% 50%, #ffc2e6 0 1.6px, transparent 2.2px) 0 0/22px 22px,' +
        'radial-gradient(circle at 50% 50%, #c7e3ff 0 1.3px, transparent 1.9px) 11px 11px/22px 22px,' +
        'linear-gradient(180deg, #fff5fb, #f4efff)',
      surface: '#ffffff',
      panel: '#426b99',
      panelText: '#ffffff',
      text: '#000000',
      muted: '#666666',
      accent: '#003399',
      accentText: '#ffffff',
      line: '#6699cc',
      soft: '#e5ecf9',
      radius: 0,
      pad: 6,
      gap: 12,
      avatar: 50,
      avatarShape: 'square',
      name: '#003399',
      modules: 'boxed',
    },
    post: {
      layout: 'bulletin',
      actions: ['comment', 'share'],
      labels: { comment: { label: 'Add Comment' }, share: { label: 'Repost Bulletin' } },
      counts: 'none',
      actionBar: 'links',
      composer: 'action',
      composerPlaceholder: '',
      submit: 'Post Comment',
    },
    you: { name: 'ashley ♥', lines: ['Mood: bored :P'], badge: 'Online Now!', inbox: { messages: 1, requests: 0, alerts: 2 } },
    pings: [
      { kind: 'request', from: 'jess ✿', text: 'wants to be your friend!', tone: 'friend' },
      { kind: 'message', from: 'mikey', text: 'did u finish the bio homework??', tone: 'friend' },
      { kind: 'alert', from: 'KAYLA', text: 'left you a comment!', tone: 'friend' },
    ],
    platform: {
      kind: 'grid',
      title: "ashley's Friend Space",
      sub: 'ashley has 213 friends.',
      names: ['jess ✿', 'mikey', '~*brit*~', 'danny', 'KAYLA', 'xXchrisXx', 'meg', 'priya'],
    },
  },

  /* -------------------------------- 2008 -------------------------------- */
  {
    id: 'wall',
    narration: "Then our little corners came together. We posted on each other’s walls, and made new friends.",
    year: 2008,
    label: 'The Wall',
    reference: 'early Facebook',
    beat: 'Real names, real friends. Status updates start with "is".',
    date: { day: 'Thursday, May 15, 2008', time: '7:52 PM' },
    tab: { title: "Home", url: "http://feed.example/home.php" },
    backdrop: { base: '#e5e8ef', glow: '#d5ddf0', glow2: '#f1f2f6' }, // crisp blue and white
    context: {
      summary:
        "Real names replaced screen names. Your feed was your friends, roughly in the order they posted, and the pushiest thing in it was a quiz app asking you to invite people.",
      points: [
        "Facebook opened to anyone with an email address in September 2006.",
        "In 2008 it passed MySpace in worldwide monthly visitors.",
        "The News Feed (2006) turned friends’ updates into a stream for the first time.",
        "Pokes, wall posts and third-party apps were how people played.",
      ],
    },
    scrollRate: 1.35,
    agent: 'human',
    loader: 'older',
    tokens: {
      font: '"Lucida Grande", Tahoma, Verdana, Arial, sans-serif',
      size: 12,
      bg: '#ffffff',
      surface: '#ffffff',
      column: '#ffffff',
      panel: '#eceff5',
      panelText: '#333333',
      text: '#333333',
      muted: '#626872',
      accent: '#3b5998',
      accentText: '#ffffff',
      line: '#e9e9e9',
      soft: '#edeff4',
      radius: 0,
      pad: 10,
      gap: 0,
      avatar: 50,
      avatarShape: 'square',
      name: '#3b5998',
      modules: 'plain',
    },
    post: {
      layout: 'wall',
      actions: ['comment'],
      labels: { comment: { label: 'Comment' } },
      counts: 'none',
      actionBar: 'links',
      composer: 'action',
      composerPlaceholder: 'Write a comment...',
      submit: 'Comment',
    },
    you: { name: 'Ashley Parker', lines: ['213 friends'], inbox: { messages: 3, requests: 1, alerts: 2 } },
    pings: [
      { kind: 'request', from: 'Rachel Kim', text: 'sent you a friend request', tone: 'friend' },
      { kind: 'alert', from: 'Mike Chen', text: 'tagged you in a photo', tone: 'friend' },
      { kind: 'message', from: 'Jess Morgan', text: 'bowling friday or nah', tone: 'friend' },
    ],
    platform: {
      kind: 'requests',
      title: 'Requests',
      items: [
        { label: '1 friend request' },
        { id: 'poke-back', label: 'Kevin Walsh poked you.', cta: 'Poke back', done: 'Poked!' },
      ],
    },
    dock: { kind: 'chatbar', label: 'Chat (14)' },
  },

  /* -------------------------------- 2012 -------------------------------- */
  {
    id: 'cards',
    narration: "It became part of everyday life. The big news, the little updates. A way to feel close, even when we were miles apart.",
    year: 2012,
    label: 'Cards & likes',
    reference: 'Facebook timeline',
    beat: 'Life events, likes, and the first ads slipping in.',
    date: { day: 'Monday, September 17, 2012', time: '10:18 PM' },
    tab: { title: "(3) Home", url: "http://feed.example/" },
    backdrop: { base: '#e4e6eb', glow: '#d6ddee', glow2: '#efe9df' }, // timeline grey-blue, warm photos
    context: {
      summary:
        "The feed became the product. Life events, photos and likes filled it, and in 2012 the first ads appeared directly between friends’ posts.",
      points: [
        "Facebook went public in May 2012 and passed one billion monthly users that October.",
        "Timeline (late 2011) reorganised profiles around life events.",
        "Facebook bought Instagram in April 2012.",
        "Sponsored posts started appearing inside the News Feed in 2012.",
      ],
    },
    scrollRate: 1.2,
    agent: 'human',
    loader: 'spinner',
    tokens: {
      font: 'Helvetica, Arial, "Lucida Grande", sans-serif',
      size: 12,
      bg: '#e9eaed',
      surface: '#ffffff',
      panel: '#f6f7f8',
      panelText: '#4e5665',
      text: '#141823',
      muted: '#626a76',
      accent: '#3b5998',
      accentText: '#ffffff',
      line: '#dfe0e4',
      soft: '#f6f7f8',
      radius: 3,
      pad: 12,
      gap: 12,
      avatar: 40,
      avatarShape: 'square',
      name: '#3b5998',
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: { like: { label: 'Like', done: 'Unlike' }, comment: { label: 'Comment' }, share: { label: 'Share' } },
      counts: 'sentence',
      actionBar: 'links',
      composer: 'always',
      composerPlaceholder: 'Write a comment...',
      submit: null,
    },
    you: { name: 'Ashley Parker', lines: ['412 friends'], inbox: { messages: 2, requests: 1, alerts: 3 } },
    pings: [
      { kind: 'request', from: 'Tom Bauer', text: 'sent you a friend request', tone: 'friend' },
      { kind: 'alert', from: 'Rachel Kim', text: 'likes your comment', tone: 'friend' },
      { kind: 'alert', from: 'Megan Foster', text: 'invited you to play Candy Kingdom', tone: 'friend' },
    ],
    platform: {
      kind: 'ad',
      title: 'Sponsored',
      headline: 'FreshKicks',
      body: 'Lace up for summer. Like our page for 20% off.',
      note: 'sneaker on white seamless',
      aspect: 1.9,
      src: '/assets/posts/early-ads-6.jpg',
      cta: 'Like Page',
    },
    dock: { kind: 'chatbar', label: 'Chat (32)' },
  },

  /* -------------------------------- 2014 -------------------------------- */
  {
    id: 'viral',
    narration: "It started to feel less about us... and more about something else.",
    year: 2014,
    label: 'Going viral',
    reference: 'Facebook 2014: shares, autoplay video, clickbait',
    beat: 'Friends share things instead of saying things. Pages learn to farm the click.',
    date: { day: 'Thursday, August 21, 2014', time: '11:02 PM' },
    tab: { title: "(9) Home", url: "https://feed.example/" },
    backdrop: { base: '#ebe6df', glow: '#f5d9c3', glow2: '#dbe2f1' }, // clickbait orange
    context: {
      summary:
        "Sharing beat saying. Autoplaying video, viral challenges and headline-tested links spread fast, and publishers learned exactly which words made people click.",
      points: [
        "The Ice Bucket Challenge took over feeds in the summer of 2014.",
        "Videos started autoplaying silently in the News Feed in 2013–14.",
        "“You won’t believe what happened next” headlines were tuned with A/B tests.",
        "In August 2014 Facebook said it would start demoting clickbait.",
      ],
    },
    scrollRate: 1.05,
    agent: 'human',
    loader: 'spinner',
    tokens: {
      font: 'Helvetica, Arial, sans-serif',
      size: 13,
      bg: '#e9ebee',
      surface: '#ffffff',
      panel: '#f6f7f9',
      panelText: '#4b4f56',
      text: '#1d2129',
      muted: '#626873',
      accent: '#4267b2',
      accentText: '#ffffff',
      line: '#dddfe2',
      soft: '#f6f7f9',
      radius: 4,
      pad: 12,
      gap: 12,
      avatar: 40,
      avatarShape: 'square',
      name: '#365899',
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: {
        like: { icon: 'like', label: 'Like' },
        comment: { icon: 'comment', label: 'Comment' },
        share: { icon: 'share', label: 'Share' },
      },
      counts: 'sentence',
      actionBar: 'links',
      composer: 'always',
      composerPlaceholder: 'Write a comment...',
      submit: null,
    },
    you: { name: 'Ashley Parker', lines: ['512 friends'], inbox: { messages: 4, requests: 2, alerts: 9 } },
    pings: [
      { kind: 'alert', from: 'FreshKicks', text: 'invited you to like their Page', tone: 'brand' },
      { kind: 'request', from: 'Chris Delgado', text: 'sent you a friend request', tone: 'friend' },
      { kind: 'alert', from: 'The Night Show', text: 'is live now. Watch!', tone: 'famous' },
    ],
    platform: {
      kind: 'people',
      title: 'Suggested Pages',
      items: [
        { id: 'like-dailyhacks', name: 'Daily Hacks', sub: '2.4M people like this', cta: 'Like Page', done: 'Liked', brand: true },
        { name: 'Heartfelt Stories', sub: '6.1M people like this', cta: 'Like Page', brand: true },
      ],
    },
    dock: { kind: 'chatbar', label: 'Chat (41)' },
  },

  /* -------------------------------- 2017 -------------------------------- */
  {
    id: 'algorithm',
    narration: "Something more divisive... More bitter and angry... And the more we reacted, the more we saw...",
    year: 2017,
    label: 'The algorithm',
    reference: 'Facebook, reactions + quiz apps',
    beat: 'Outrage gets the reach. Your friends get buried. Quizzes take your data.',
    date: { day: 'Wednesday, November 22, 2017', time: '11:46 PM' },
    tab: { title: "(12) Home", url: "https://feed.example/?sk=nf" },
    backdrop: { base: '#ebe6e3', glow: '#f4e1b8', glow2: '#f0cfd2' }, // reaction yellow and red
    context: {
      summary:
        "The feed was ranked for engagement, and outrage engaged best. Quiz apps quietly collected data on the people who took them and on their friends.",
      points: [
        "Reactions (Love, Haha, Wow, Sad, Angry) launched in February 2016.",
        "Data from a personality-quiz app reached Cambridge Analytica; it became public in March 2018.",
        "In 2017 platforms disclosed that foreign influence campaigns had bought political ads.",
        "In late 2017 Facebook started demoting “engagement bait” posts.",
      ],
    },
    scrollRate: 0.95,
    agent: 'human',
    loader: 'skeleton',
    tokens: {
      font: SYSTEM,
      size: 14,
      bg: '#e9ebee',
      surface: '#ffffff',
      panel: '#f5f6f7',
      panelText: '#4b4f56',
      text: '#1d2129',
      muted: '#626873',
      accent: '#4267b2',
      accentText: '#ffffff',
      line: '#dddfe2',
      soft: '#f2f3f5',
      radius: 4,
      pad: 12,
      gap: 10,
      avatar: 40,
      avatarShape: 'circle',
      name: '#365899',
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: BAR_LABELS,
      counts: 'summary',
      actionBar: 'bar',
      composer: 'always',
      composerPlaceholder: 'Write a comment...',
      submit: null,
      reactions: FB_REACTIONS,
    },
    you: { name: 'Ashley Parker', lines: ['1,209 friends'], inbox: { messages: 4, requests: 2, alerts: 12 } },
    pings: [
      { kind: 'alert', from: 'MindPrint', text: 'wants access to your friends list', tone: 'brand' },
      { kind: 'alert', from: 'Heartland Voice', text: 'invited you to like their Page', tone: 'brand' },
      { kind: 'alert', from: 'Greg Parker', text: 'tagged you in 4 posts', tone: 'friend' },
    ],
    platform: {
      kind: 'ad',
      title: 'Sponsored',
      label: 'Paid for by Heartland Voice',
      headline: 'They don’t want you to see this.',
      note: 'grainy flag photo with bold impact text',
      aspect: 1.9,
      src: '/assets/posts/algorithm-3.jpg',
    },
    dock: { kind: 'heads', label: 'Messenger', names: ['Jess Morgan', 'Sarah Lin', 'Greg Parker'] },
    overlay: {
      id: 'notifications',
      kind: 'modal',
      title: 'Turn on notifications?',
      body: 'Get notified about the posts and friends that matter most to you.',
      actions: ['Not Now', 'Turn On'],
      primary: 1,
    },
  },

  /* -------------------------------- 2019 -------------------------------- */
  {
    id: 'stories',
    narration: "The people became more polished. More perfect. And I started wondering why my life didn’t look like theirs...",
    year: 2019,
    label: 'Influencers',
    reference: 'Instagram',
    beat: 'Everything is a photo, and every photo is selling something.',
    date: { day: 'Saturday, June 8, 2019', time: '12:31 AM' },
    tab: { title: "(9) Explore", url: "https://feed.example/explore/" },
    backdrop: { base: '#f0e8ea', glow: '#f8d8c6', glow2: '#e7d0ee' }, // a sunset gradient
    context: {
      summary:
        "The feed turned into a storefront. Influencers sold products in posts marked #ad, brands bought placement, and every site asked you to accept its cookies.",
      points: [
        "In 2017 the FTC wrote to influencers about disclosing paid posts.",
        "GDPR came into force in May 2018, bringing cookie banners everywhere.",
        "Instagram began testing hidden like counts in 2019.",
        "Stories became the default way to post casually.",
      ],
    },
    scrollRate: 0.85,
    agent: 'quick',
    loader: 'spinner',
    tokens: {
      font: SYSTEM,
      size: 14,
      bg: '#fafafa',
      surface: '#ffffff',
      panel: '#ffffff',
      panelText: '#666666',
      text: '#262626',
      muted: '#666666',
      accent: '#0875bd',
      accentText: '#ffffff',
      line: '#dbdbdb',
      soft: '#fafafa',
      radius: 4,
      pad: 14,
      gap: 24,
      avatar: 32,
      avatarShape: 'ring',
      modules: 'plain',
    },
    post: {
      layout: 'media-first',
      actions: ['like', 'comment', 'send'],
      labels: { like: { icon: 'heart', doneIcon: 'heart' }, comment: { icon: 'comment' }, send: { icon: 'send' } },
      counts: 'likes',
      actionBar: 'icons',
      composer: 'always',
      composerPlaceholder: 'Add a comment…',
      submit: 'Post',
    },
    you: { name: 'ashleyp', lines: ['2,104 followers'], inbox: { messages: 3, requests: 5, alerts: 9 } },
    pings: [
      { kind: 'request', from: 'kaylafit ✓', text: 'started following you', tone: 'famous' },
      { kind: 'message', from: 'brand.collab.247', text: 'Love your feed! DM us for a collab 💯', tone: 'scam' },
      { kind: 'alert', from: 'wanderwithjake', text: 'liked your photo', tone: 'famous' },
    ],
    platform: {
      kind: 'people',
      title: 'Suggested for you',
      items: [
        { name: 'detoxdaily', sub: 'Followed by kaylafit', cta: 'Follow', brand: true },
        { name: 'wanderwithjake', sub: 'Suggested for you', cta: 'Follow' },
      ],
    },
    overlay: {
      id: 'cookies',
      kind: 'banner',
      title: 'We use cookies',
      body: 'We and our 412 partners use cookies to personalise content and ads, and to measure how you use our service.',
      actions: ['Manage options', 'Accept all'],
      primary: 1,
    },
  },

  /* -------------------------------- 2021 -------------------------------- */
  {
    id: 'reels',
    narration: "Then came an endless stream of posts and videos... I started to miss my friends.",
    year: 2021,
    label: 'Reels',
    reference: 'Facebook / Instagram reels',
    beat: 'You stop choosing what to see. Voices start to sound synthetic.',
    date: { day: 'Sunday, March 14, 2021', time: '1:58 AM' },
    tab: { title: "(41) Reels", url: "https://feed.example/reels/" },
    backdrop: { base: '#e7e6ee', glow: '#d5dff7', glow2: '#f5d2e2' }, // loud blue and pink
    context: {
      summary:
        "You stopped choosing who to follow and started watching whatever a recommendation engine picked. Short videos with synthetic voices and recycled clips spread fast.",
      points: [
        "TikTok passed one billion monthly users in September 2021.",
        "Instagram launched Reels in August 2020; Facebook followed in 2021.",
        "Text-to-speech narration over unrelated gameplay became a format of its own.",
        "Follower-selling and engagement bots filled comment sections.",
      ],
    },
    scrollRate: 0.75,
    agent: 'quick',
    loader: 'skeleton',
    tokens: {
      font: SYSTEM,
      size: 15,
      bg: '#f0f2f5',
      surface: '#ffffff',
      panel: '#ffffff',
      panelText: '#65676b',
      text: '#050505',
      muted: '#65676b',
      accent: '#1266d6',
      accentText: '#ffffff',
      line: '#e4e6eb',
      soft: '#f0f2f5',
      radius: 8,
      pad: 14,
      gap: 14,
      avatar: 40,
      avatarShape: 'circle',
      shadow: true,
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: BAR_LABELS,
      counts: 'summary',
      actionBar: 'bar',
      composer: 'always',
      composerPlaceholder: 'Write a comment…',
      submit: null,
      reactions: FB_REACTIONS,
    },
    you: { name: 'Ashley Parker', lines: ['3.4K followers'], inbox: { messages: 6, requests: 12, alerts: 41 } },
    pings: [
      { kind: 'request', from: 'dancequeen.22 ✓', text: 'followed you back', tone: 'famous' },
      { kind: 'request', from: 'free.followers.now', text: 'started following you', tone: 'scam' },
      { kind: 'message', from: 'Lisa 💋', text: 'hey cutie, wanna chat? 😘', tone: 'scam' },
    ],
    platform: {
      kind: 'people',
      title: 'Creators for you',
      items: [
        { name: 'dancequeen.22', sub: '2.4M followers', cta: 'Follow' },
        { name: 'motivation.daily.ai', sub: '3.1M followers', cta: 'Follow' },
      ],
    },
    overlay: {
      id: 'get-app',
      kind: 'sheet',
      title: 'It’s better in the app',
      body: 'Get the full experience in the app.',
      actions: ['Not now', 'Open app'],
      primary: 1,
    },
  },

  /* -------------------------------- 2023 -------------------------------- */
  {
    id: 'slop',
    narration: "Then it got a little weird. The stories, the pictures... the people — was any of it real?",
    year: 2023,
    label: 'AI slop',
    reference: 'Facebook, AI image farms',
    beat: 'AI images farm likes. Real posts sink. The agent starts acting like the bots.',
    date: { day: 'Tuesday, June 13, 2023', time: '2:33 AM' },
    tab: { title: "(63) Home", url: "https://feed.example/" },
    backdrop: { base: '#ece6da', glow: '#f3dfb4', glow2: '#e0d3ee' }, // AI golden hour and lilac
    context: {
      summary:
        "Generative AI made images free to produce. Pages posting uncanny AI pictures collected huge engagement, while posts from actual friends reached fewer people.",
      points: [
        "Image generators went mainstream in 2022–23.",
        "AI image pages grew large followings by farming likes and comments.",
        "Many of the commenters were bots too, replying “Amen” or “Beautiful work”.",
        "Paid verification arrived on major platforms in 2022–23.",
      ],
    },
    scrollRate: 0.68,
    agent: 'robot',
    loader: 'skeleton',
    tokens: SLOP_TOKENS,
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: BAR_LABELS,
      counts: 'summary',
      actionBar: 'bar',
      composer: 'always',
      composerPlaceholder: 'Write a comment…',
      submit: null,
      reactions: FB_REACTIONS,
    },
    you: { name: 'Ashley Parker', lines: ['✦ Suggested replies on'], inbox: { messages: 27, requests: 8, alerts: 63 } },
    pings: [
      { kind: 'request', from: 'Gen. James Miller', text: 'sent you a friend request', tone: 'scam' },
      { kind: 'message', from: 'Page Support', text: 'Your page will be disabled. Verify now ⚠️', tone: 'scam' },
      { kind: 'message', from: 'Anna · Crypto Mentor', text: 'Hello dear, how was your day?', tone: 'scam' },
    ],
    platform: {
      kind: 'ad',
      title: 'Sponsored',
      headline: 'Hand-carved wooden cats 🐈',
      body: 'Only 2 left! Made by artisans.',
      note: 'AI product photo, paws slightly wrong',
      aspect: 1.2,
      src: '/assets/posts/slop-4.jpg',
    },
    dock: { kind: 'assistant', text: '✦ Need help writing a comment?' },
    overlay: {
      id: 'verified',
      kind: 'modal',
      title: 'Get verified ✓',
      body: 'Stand out with a verified badge, more reach and protection. $11.99/month.',
      actions: ['Maybe later', 'Subscribe'],
      primary: 1,
    },
  },

  /* -------------------------------- 2024 -------------------------------- */
  {
    id: 'pro',
    narration: "Everyone seemed to know what was best for me. Another life lesson. Another inspirational quote.",
    year: 2024,
    label: 'Thought leadership',
    reference: 'LinkedIn',
    beat: 'Everyone is humbled to announce something. Nobody wrote their own post.',
    date: { day: 'Tuesday, October 8, 2024', time: '2:51 AM' },
    tab: { title: "(99+) Feed", url: "https://feed.example/feed/" },
    backdrop: { base: '#ece9e2', glow: '#d5e3f3', glow2: '#efe8db' }, // office beige and blue
    context: {
      summary:
        "Professional networks filled with AI-written thought leadership: every post a lesson, every lesson a hook. Writing assistants were built straight into the post box.",
      points: [
        "LinkedIn added AI-assisted post writing in 2023.",
        "One late-2024 analysis estimated more than half of longer English posts were likely AI-written.",
        "Companies started selling AI agents that prospect, post and comment automatically.",
        "Engagement pods and automated comments became routine.",
      ],
    },
    scrollRate: 0.62,
    agent: 'robot',
    loader: 'skeleton',
    tokens: {
      font: SYSTEM,
      size: 14,
      bg: '#f4f2ee',
      surface: '#ffffff',
      panel: '#ffffff',
      panelText: '#666666',
      text: '#1f1f1f',
      muted: '#666666',
      accent: '#0a66c2',
      accentText: '#ffffff',
      line: '#e0dfdc',
      soft: '#f3f2ef',
      radius: 8,
      pad: 16,
      gap: 10,
      avatar: 48,
      avatarShape: 'circle',
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share', 'send'],
      labels: {
        like: { icon: 'like', label: 'Like' },
        comment: { icon: 'comment', label: 'Comment' },
        share: { icon: 'repost', label: 'Repost' },
        send: { icon: 'send', label: 'Send' },
      },
      counts: 'summary',
      actionBar: 'bar',
      composer: 'always',
      composerPlaceholder: 'Add a comment…',
      submit: null,
      reactions: [
        ['👍', 'Like'],
        ['👏', 'Celebrate'],
        ['❤️', 'Support'],
        ['💡', 'Insightful'],
        ['😂', 'Funny'],
      ],
    },
    you: { name: 'Ashley Parker', lines: ['Open to opportunities'], inbox: { messages: 14, requests: 31, alerts: 99 } },
    pings: [
      { kind: 'request', from: 'Brad Kowalski', text: 'wants to connect: “I help leaders 10x…”', face: 'stock-m1', tone: 'famous' },
      { kind: 'message', from: 'Growth Hacker', text: 'Quick question, Ashley 👋', tone: 'scam' },
      { kind: 'alert', from: 'Search', text: 'You appeared in 41 searches this week', tone: 'brand' },
    ],
    platform: {
      kind: 'people',
      title: 'Add to your feed',
      items: [
        { id: 'follow-brad', name: 'Brad Kowalski', sub: 'Chief Synergy Officer @ Nexora AI', cta: 'Follow', done: 'Following', face: 'stock-m1' },
        { name: 'Nexora AI', sub: 'Company · Software', cta: 'Follow', brand: true },
      ],
    },
    dock: { kind: 'chatbar', label: 'Messaging' },
  },

  /* ------------------------------- machine ------------------------------- */
  {
    id: 'machine',
    narration: "It just wasn’t fun anymore...",
    year: 2025,
    label: 'The machine',
    reference: 'no costume: the box model, the markup',
    beat: 'The page stops pretending to be a place. It is templates, boxes and a job queue.',
    date: { day: 'ts=1762139640', time: '03:14:00.000Z' },
    tab: { title: "feed.json", url: "https://feed.example/api/v3/feed?render=raw" },
    backdrop: { base: '#e6eaed', glow: '#d4e5ee', glow2: '#dfe9e4' }, // cool and sterile
    context: {
      summary:
        "Behind the styling, the feed is templates, ranking scores and scheduled jobs. Much of the traffic hitting it isn’t human either.",
      points: [
        "Imperva reported that in 2024 automated traffic overtook human traffic online for the first time in a decade.",
        "Bots fill templates, post on schedules and like each other’s posts.",
        "Recommendation systems rank everything by predicted engagement.",
        "Nobody has to be watching for the numbers to go up.",
      ],
    },
    scrollRate: 0.6,
    agent: 'robot',
    loader: 'none',
    holdPx: 640,
    glitch: { in: 0.55, out: 1 },
    tokens: {
      font: MONO,
      size: 12,
      bg: '#fbfcfd',
      background:
        'linear-gradient(#e7ebf0 1px, transparent 1px) 0 0/24px 24px,' +
        'linear-gradient(90deg, #e7ebf0 1px, transparent 1px) 0 0/24px 24px,' +
        '#fbfcfd',
      surface: '#ffffff',
      panel: '#f6f8fa',
      panelText: '#57606a',
      text: '#24292f',
      muted: '#59636e',
      accent: '#0969da',
      accentText: '#ffffff',
      line: '#d0d7de',
      soft: '#f6f8fa',
      radius: 0,
      pad: 10,
      gap: 14,
      avatar: 36,
      avatarShape: 'square',
      modules: 'machine',
    },
    post: {
      layout: 'machine',
      actions: ['like', 'comment', 'share'],
      labels: { like: { label: 'like' }, comment: { label: 'comment' }, share: { label: 'share' } },
      counts: 'none',
      actionBar: 'links',
      composer: 'always',
      composerPlaceholder: 'autocomplete=on',
      submit: null,
    },
    you: { name: 'usr_ashley_parker', lines: ['session: active', 'persona: v14'], inbox: { messages: 812, requests: 3311, alerts: 9999 } },
    pings: [
      { kind: 'request', from: 'usr_88213', text: '{ type: "friend_request", score: 0.97 }', tone: 'machine' },
      { kind: 'message', from: 'svc-outreach-04', text: 'template_17 sent (n=4,000)', tone: 'machine' },
      { kind: 'alert', from: 'cron', text: 'engagement_job ok · 14ms', tone: 'machine' },
    ],
    platform: {
      kind: 'list',
      title: 'recommendations.json',
      items: [
        { label: '{ "id": "usr_8821", "score": 0.97 }' },
        { label: '{ "id": "pg_amen_daily", "score": 0.95 }' },
        { label: '{ "id": "ad_cozy_cats", "bid": 0.42 }' },
      ],
    },
  },

  /* -------------------------------- 2025 -------------------------------- */
  {
    id: 'dead',
    narration: "So I stopped sharing my life... and started selling it. It was the only thing anyone wanted. And every time someone said YES... it almost felt like having friends again...",
    year: 2025,
    label: 'The opportunity',
    reference: 'Ashley’s new business',
    beat: 'Ashley sells the opportunity. The pitches, replies and inboxes multiply until the person cannot keep up.',
    date: { day: 'Monday, November 3, 2025', time: '3:14 AM' },
    tab: { title: "(99+) Home", url: "https://feed.example/" },
    backdrop: { base: '#dfe0e3', glow: '#d6d8dc', glow2: '#e6e6e8' }, // drained of colour
    context: {
      summary:
        "The dead internet theory says most of what you see online is bots talking to bots. Here, every account in the feed is one.",
      points: [
        "The “dead internet theory” spread from a 2021 forum post.",
        "AI agents can now operate a browser: scroll, click and type like a person.",
        "Accounts run as personas, posting and replying around the clock.",
        "The feed still looks alive. It just isn’t anyone’s.",
      ],
    },
    scrollRate: 0.55,
    agent: 'robot',
    loader: 'none',
    holdPx: 800,
    tokens: {
      ...SLOP_TOKENS,
      bg: '#eceef1',
      text: '#1b1c1f',
      muted: '#626873',
      accent: '#2d65d3',
      line: '#e1e3e8',
      radius: 14,
    },
    post: {
      layout: 'classic',
      actions: ['like', 'comment', 'share'],
      labels: BAR_LABELS,
      counts: 'summary',
      actionBar: 'bar',
      composer: 'action',
      composerPlaceholder: 'Write a reply…',
      submit: null,
      reactions: FB_REACTIONS,
    },
    you: { name: 'Ashley Parker', lines: ['Digital business owner ✨', 'Helping you find freedom'], inbox: { messages: 2, requests: 1, alerts: 3 } },
    pings: [
      { kind: 'alert', from: 'Sarah Mitchell', text: 'commented: I AM IN', face: OPPORTUNITY_FACES['Sarah Mitchell'], tone: 'friend' },
      { kind: 'message', from: 'Jess Morgan', face: OPPORTUNITY_FACES['Jess Morgan'], text: 'Ash… what is this?', tone: 'friend' },
      { kind: 'alert', from: 'Emma Johnson', text: 'commented: I AM IN 🙋‍♀️', face: OPPORTUNITY_FACES['Emma Johnson'], tone: 'friend' },
      ...Array.from({ length: 20 }, (_, i) => ({
        kind: (i % 3 === 0 ? 'message' : 'alert') as 'message' | 'alert',
        from: ['Sarah Mitchell', 'Emma Johnson', 'Olivia Brown', 'Mike Chen'][i % 4],
        text: ['I AM IN 💸', 'sent you a message', 'commented: READY', 'shared your opportunity'][i % 4],
        face: OPPORTUNITY_FACES[['Sarah Mitchell', 'Emma Johnson', 'Olivia Brown', 'Mike Chen'][i % 4]], tone: 'machine' as const,
      })),
    ],
    platform: {
      kind: 'list', title: 'Your business', items: [
        { label: 'Daybreak · with Ashley', sub: 'Independent opportunity partner' },
        { label: 'join.daybreak.example/ashley', sub: 'Your personal invite link' },
      ],
    },
    dock: { kind: 'chatbar', label: 'Business inbox · Active now' },
  },
];

export const FLOW_ERA_INDEX: ReadonlyMap<FlowEraId, number> = new Map(FLOW_ERAS.map((e, i) => [e.id, i]));

/** Greyscale tokens for wire mode: structure stays, colour goes. */
export function wireTokens(t: EraTokens): EraTokens {
  return {
    ...t,
    font: t.modules === 'machine' ? t.font : 'ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif',
    bg: '#ededed',
    background: undefined,
    surface: '#ffffff',
    column: t.column ? '#ffffff' : undefined,
    panel: '#e3e3e3',
    panelText: '#444444',
    text: '#222222',
    muted: '#656b73',
    accent: '#555555',
    accentText: '#ffffff',
    line: '#d4d4d4',
    soft: '#f3f3f3',
    name: undefined,
  };
}
