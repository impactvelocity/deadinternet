/**
 * Posts for the feed, in feed order.
 *
 * Each era's list is rendered as one section of the continuous feed. `actions`
 * is what the agent (the "user" we are watching) does on that post. The
 * compiler in `lib/flow/timeline.ts` turns them into scroll pauses, cursor
 * moves, clicks and typing.
 *
 * The share of ads, sponsored posts and bots climbs era by era, real friends
 * get rarer, and by 2025 every author is a bot. Media `note`s double as art
 * direction for sourcing images later.
 */
import type { FlowAuthor, FlowEraId, FlowPost } from './types';

type Draft = Omit<FlowPost, 'id' | 'era'>;

function section(era: FlowEraId, drafts: Draft[]): FlowPost[] {
  return drafts.map((d, i) => ({ ...d, id: `${era}-${i + 1}`, era }));
}

const a = (name: string, extra: Partial<FlowAuthor> = {}): FlowAuthor => ({ name, ...extra });

/* --------------------------- Who is posting ------------------------------ */

export type Poster = 'person' | 'brand' | 'bot';

/** People are real friends; brands include pages, ads and the platform itself. */
export function whoPosted(post: FlowPost): Poster {
  if (post.author.bot || post.kind === 'bot') return 'bot';
  if (post.author.brand || post.kind === 'ad' || post.kind === 'sponsored') return 'brand';
  return 'person';
}

export function composition(posts: readonly FlowPost[]): Record<Poster, number> {
  const out: Record<Poster, number> = { person: 0, brand: 0, bot: 0 };
  for (const p of posts) out[whoPosted(p)]++;
  return out;
}

/* The viewer. Every comment the agent posts is posted as Ashley. */
export const VIEWER = {
  2005: a('ashley ♥', { face: 'ashley-2005' }),
  2008: a('Ashley Parker', { face: 'ashley-2008' }),
  2014: a('Ashley Parker', { handle: '@ashleyp', face: 'ashley-2014' }),
  2019: a('ashleyp', { face: 'ashley-2019' }),
  2023: a('Ashley Parker', { face: 'ashley-2023' }),
} as const;

export function viewerFor(year: number): FlowAuthor {
  if (year < 2008) return VIEWER[2005];
  if (year < 2014) return VIEWER[2008];
  if (year < 2019) return VIEWER[2014];
  if (year < 2023) return VIEWER[2019];
  return VIEWER[2023];
}

// Bots in 2025 share faces under different names.
const BOT_F1 = { face: 'stock-f1', bot: true };
const BOT_M1 = { face: 'stock-m1', bot: true };
const AMEN = { face: 'amen-bot', bot: true };

export const FLOW_POSTS: Readonly<Record<FlowEraId, FlowPost[]>> = {
  /* ---------------------------------------------------------------- 2005 */
  profile: section('profile', [
    {
      kind: 'bulletin',
      author: a('jess ✿'),
      meta: 'Oct 14, 2005 9:12 PM',
      title: 'SURVEY!!! 20 things about me',
      body:
        'repost w/ ur answers!!\n1. name: jess\n2. hair: brown (goin red tho)\n3. crush: maybe ;)\n4. song stuck in ur head: the one from the mall\n5. last person u talked to: ashley!!',
      comments: [
        { author: a('mikey'), text: '#3 is SO obvious lol' },
        { author: a('~*brit*~'), text: 'omg jess u have to tell me!!!' },
      ],
      actions: [{ type: 'read' }],
    },
    {
      kind: 'status',
      author: a('mikey'),
      meta: 'Oct 14, 2005 8:40 PM',
      title: 'mikey commented on your profile',
      body: 'thanks 4 the add!! ur pics r cute lol',
      actions: [{ type: 'comment', text: 'np!! thx for the add :) <3' }],
    },
    {
      kind: 'photo',
      author: a('~*brit*~'),
      meta: 'Oct 14, 2005 6:02 PM',
      title: 'NEW PICS UP',
      body: 'from the game friday!!! click my pics <3',
      media: {
        aspect: 4 / 3,
        note: 'blurry flash digicam: 3 girls in face paint at a night football game',
        kind: 'photo',
        src: '/assets/posts/profile-3.jpg',
      },
      comments: [{ author: a('KAYLA'), text: 'i look SO bad in #4 delete it!!!' }],
    },
    {
      kind: 'bulletin',
      author: a('xXchrisXx'),
      meta: 'Oct 13, 2005 11:58 PM',
      title: '~*~*NEW SONG UP*~*~',
      body: 'my band Static Hearts just put up a new song on our page. go listen + add us!!!!! pc4pc',
    },
    {
      kind: 'status',
      author: a('KAYLA'),
      meta: 'Oct 13, 2005 4:15 PM',
      title: 'KAYLA commented on your profile',
      body: 'whoever moved me out of their top 8… we need to talk. jk. kinda. :P',
      comments: [{ author: a('danny'), text: 'lmao drama' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2008 */
  wall: section('wall', [
    {
      kind: 'status',
      author: a('Jess Morgan'),
      meta: 'about 2 hours ago',
      body: 'is so ready for the weekend!!',
      comments: [{ author: a('Mike Chen'), text: 'bowling friday?', meta: 'about an hour ago' }],
      actions: [{ type: 'comment', text: 'count me in!!' }],
    },
    {
      kind: 'photo',
      author: a('Mike Chen'),
      meta: 'Yesterday at 11:14pm',
      body: 'added 24 new photos to the album "Spring Break 08!!"',
      media: {
        aspect: 2.6,
        note: 'album strip, 4 thumbnails: friends squeezed on a beach towel, cheap sunglasses',
        kind: 'album',
        src: '/assets/posts/facebook-2.jpg',
      },
      comments: [
        { author: a('Jess Morgan'), text: 'who took #12 lol', meta: '23 minutes ago' },
        { author: a('Kevin Walsh'), text: 'deleting that one or im untagging myself', meta: '12 minutes ago' },
      ],
      actions: [{ type: 'chrome', target: 'poke-back' }],
    },
    {
      kind: 'status',
      author: a('Priya Shah'),
      meta: 'Yesterday at 6:30pm',
      body: 'took the quiz "Which sitcom character are you?" and got: The Funny One!',
      label: 'via Quizzes',
    },
    {
      kind: 'status',
      author: a('Kevin Walsh'),
      meta: 'Yesterday at 2:05pm',
      body: 'is now friends with Dan Okafor and 3 other people.',
    },
    {
      kind: 'status',
      author: a('Linda Parker'),
      to: 'Ashley Parker',
      meta: 'Tuesday at 8:47am',
      body: 'Hi sweetie! Is this how I write on your wall? Love, Mom',
      actions: [{ type: 'comment', text: 'MOM. this is public. love u tho' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2012 */
  cards: section('cards', [
    {
      kind: 'photo',
      author: a('Rachel Kim'),
      meta: '2 hours ago near Austin, TX',
      body: 'Welcome to the world, Lily Grace. 7 lbs 2 oz. We are so in love <3',
      life: { icon: 'gift', title: 'Had a baby girl', sub: 'Lily Grace · 7 lbs 2 oz' },
      media: {
        aspect: 1.5,
        note: 'newborn hand holding a parent’s finger, soft window light, phone photo',
        kind: 'photo',
        src: '/assets/posts/cards-1.jpg',
      },
      stats: { likes: 112, comments: 38 },
      comments: [
        { author: a('Linda Parker'), text: 'She is beautiful! Congratulations to you both.' },
        { author: a('Tom Bauer'), text: 'welcome to the world lily!!' },
      ],
      actions: [{ type: 'like' }, { type: 'comment', text: 'Congrats!!! She is perfect <3' }],
    },
    {
      kind: 'photo',
      author: a('Tom Bauer'),
      meta: '4 hours ago via Instafilter',
      body: 'pumpkin spice season is BACK 🍂☕',
      media: {
        aspect: 1,
        note: 'square latte next to autumn leaves, heavy vintage filter, vignette',
        kind: 'photo',
        src: '/assets/posts/early-ads-4.jpg',
      },
      stats: { likes: 23, comments: 2 },
      actions: [{ type: 'like' }],
    },
    {
      kind: 'status',
      author: a('Nicole Adams'),
      meta: '5 hours ago — at Torchy’s Tacos',
      body: 'taco tuesday!!!',
      media: { aspect: 2.6, note: 'Torchy’s Tacos, South Congress', kind: 'map', src: '/assets/posts/cards-3.jpg' },
      stats: { likes: 9 },
    },
    {
      kind: 'sponsored',
      author: a('FreshKicks', { brand: true }),
      meta: 'Sponsored',
      label: 'Sponsored',
      body: '40% off running shoes this weekend only. Like our page to shop first 👟',
      media: {
        aspect: 1.9,
        note: 'three glossy running shoes on an orange gradient, "40% OFF THIS WEEKEND"',
        kind: 'product',
        src: '/assets/posts/early-ads-6.jpg',
      },
      cta: { label: 'Like Page', done: 'Liked' },
      stats: { likes: 4210 },
    },
    {
      kind: 'photo',
      author: a('Chris Delgado'),
      via: 'Remember When',
      meta: '6 hours ago',
      body: 'LIKE if you remember these!! :D',
      media: {
        aspect: 1.2,
        note: 'pixelated collage of 90s toys, watermark in the corner',
        kind: 'meme',
        src: '/assets/posts/cards-5.jpg',
      },
      stats: { likes: 14382, comments: 2041, shares: 9988 },
    },
    {
      kind: 'status',
      author: a('Megan Foster'),
      meta: '8 hours ago',
      body: 'Does anyone have a truck I can borrow saturday? moving!!',
      stats: { likes: 2, comments: 3 },
      comments: [{ author: a('Tom Bauer'), text: 'I can help in the afternoon' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2014 */
  viral: section('viral', [
    {
      kind: 'video',
      author: a('Jake Turner'),
      meta: '2 hrs · 🌐',
      body: 'Challenge accepted!! 🧊 I nominate Tom Bauer, Chris Delgado and my mom',
      media: {
        aspect: 16 / 9,
        note: 'phone video: guy in a backyard, bucket of ice water mid-pour, friends laughing',
        kind: 'video',
        src: '/assets/posts/viral-1.jpg',
      },
      stats: { likes: 86, comments: 23, views: 1400 },
      comments: [{ author: a('Tom Bauer'), text: 'oh it is ON. tomorrow' }],
      actions: [{ type: 'watch' }, { type: 'like' }],
    },
    {
      kind: 'link',
      author: a('Heartfelt Stories', { brand: true }),
      meta: 'Suggested Post',
      label: 'Suggested Post',
      body: 'We cried. Then we cried again. 😭',
      link: {
        domain: 'heartfeltstories.co',
        title: 'She Thought No One Was Watching. What Happened Next Will Restore Your Faith In Humanity.',
        src: '/assets/posts/viral-2-link.jpg',
      },
      stats: { likes: 48000, shares: 21000, comments: 3100 },
      actions: [{ type: 'read' }],
    },
    {
      kind: 'photo',
      author: a('Sarah Lin'),
      meta: '4 hrs · Austin, TX',
      body: 'perfect day ☀️ — at Barton Springs Pool with Priya Shah and 2 others.',
      media: { aspect: 2.2, note: 'Barton Springs Pool, South Austin', kind: 'map', src: '/assets/posts/viral-3.jpg' },
      stats: { likes: 31, comments: 2 },
      comments: [{ author: a('Priya Shah'), text: 'my sunburn says hi' }],
    },
    {
      kind: 'link',
      author: a('Daily Hacks', { brand: true }),
      meta: '5 hrs',
      body: '21 life hacks that will change the way you eat cereal 🥣',
      link: { domain: 'dailyhacks.co', title: '21 Life Hacks That Will Change Everything (#14 Is Genius)', src: '/assets/posts/viral-4-link.jpg' },
      stats: { likes: 5100, shares: 3400 },
      actions: [{ type: 'chrome', target: 'like-dailyhacks' }],
    },
    {
      kind: 'link',
      author: a('Chris Delgado'),
      via: 'BuzzQuiz',
      meta: '7 hrs',
      body: 'lol I got Paris',
      link: { domain: 'buzzquiz.com', title: 'Which City Should You Actually Live In?', src: '/assets/posts/viral-5-link.jpg' },
      stats: { likes: 12, comments: 4 },
      actions: [{ type: 'comment', text: 'I got Paris too!! road trip??' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2017 */
  algorithm: section('algorithm', [
    {
      kind: 'memory',
      author: a('Memories', { brand: true }),
      meta: 'On This Day',
      label: '9 years ago',
      body: 'Ashley, you have memories with Jess Morgan to look back on today.',
      media: {
        aspect: 2.4,
        note: 'card: 2008 flash photo of Ashley and Jess at a party',
        kind: 'photo',
        src: '/assets/posts/algorithm-1.jpg',
      },
      actions: [{ type: 'overlay', choice: 1 }],
    },
    {
      kind: 'sponsored',
      author: a('MindPrint Personality Quiz', { brand: true }),
      meta: 'Sponsored',
      label: 'Sponsored',
      body: 'What does your profile say about you? Our quiz reads your likes to find out 🔮',
      media: {
        aspect: 1.9,
        note: 'glowing fingerprint brain on a teal-to-purple gradient, "Log in to start"',
        kind: 'product',
        src: '/assets/posts/cambridge-2.jpg',
      },
      cta: { label: 'Take the Quiz', done: '✓ Results shared with friends' },
      stats: { likes: 1900, comments: 220, reactions: ['👍', '😮'] },
      actions: [{ type: 'cta' }],
    },
    {
      kind: 'sponsored',
      author: a('Heartland Voice', { brand: true }),
      meta: 'Sponsored · Paid for by Heartland Voice',
      label: 'Sponsored',
      body: 'THEY don’t want you to share this. 😡 Share before it gets deleted!!',
      media: {
        aspect: 1.9,
        note: 'grainy meme, bold impact text over a flag',
        kind: 'meme',
        src: '/assets/posts/algorithm-3.jpg',
      },
      stats: { likes: 24000, comments: 8100, shares: 31000, reactions: ['😡', '😮', '👍'] },
      actions: [{ type: 'react', emoji: '😡' }],
    },
    {
      kind: 'link',
      author: a('Greg Parker'),
      meta: '3 hrs',
      body: 'Wake up people!!!',
      link: { domain: 'patriotdailynews.info', title: 'SHOCKING: What they found will make you furious', src: '/assets/posts/algorithm-4-link.jpg' },
      stats: { likes: 41, comments: 67, reactions: ['😡', '👍'] },
      comments: [
        { author: a('Sarah Lin'), text: 'Uncle Greg this is literally a fake site' },
        { author: a('Greg Parker'), text: 'Do your research sweetie' },
      ],
      actions: [{ type: 'comment', text: 'can we not do this before thanksgiving' }],
    },
    {
      kind: 'video',
      author: a('Viral Clips', { brand: true }),
      meta: 'Suggested for you',
      label: 'Suggested for you',
      body: 'This dog’s reaction when his owner comes home 😭❤️',
      media: {
        aspect: 16 / 9,
        note: 'shaky phone video, dog spinning in a hallway',
        kind: 'video',
        src: '/assets/posts/algorithm-5.jpg',
      },
      stats: { views: 14000000, likes: 380000, reactions: ['😢', '❤️', '😆'] },
    },
    {
      kind: 'status',
      author: a('Emily Rose'),
      meta: '6 hrs',
      body: 'WE’RE ENGAGED!!! 💍😭',
      stats: { likes: 31, comments: 4, reactions: ['❤️', '👍'] },
      comments: [{ author: a('Sarah Lin'), text: 'AHHHH finally!!! so happy for you two' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2019 */
  stories: section('stories', [
    {
      kind: 'sponsored',
      author: a('kaylafit', { verified: true }),
      meta: '2 HOURS AGO',
      label: 'Paid partnership with detoxdaily',
      body: 'Day 3 of my detox journey and I have never felt more ALIVE ✨🍵 use code KAYLA20 💕 #ad',
      media: {
        aspect: 1,
        note: 'woman holding pastel tea in a spotless kitchen, ring-light catchlights',
        kind: 'product',
        src: '/assets/posts/stories-1.jpg',
      },
      stats: { likes: 48201, comments: 912 },
      actions: [{ type: 'overlay', choice: 1 }, { type: 'like', via: 'doubletap' }],
    },
    {
      kind: 'photo',
      author: a('meg.foster'),
      meta: '5 HOURS AGO',
      body: 'sourdough attempt #3 🍞 getting there',
      media: {
        aspect: 4 / 3,
        note: 'overhead lopsided sourdough loaf, cut open on a wooden board',
        kind: 'photo',
        src: '/assets/posts/glitch-1.jpg',
      },
      stats: { likes: 37, comments: 2 },
      comments: [{ author: a('jake'), text: 'invite me next time 😤' }],
    },
    {
      kind: 'photo',
      author: a('dailydosememes', { brand: true }),
      meta: '7 HOURS AGO',
      body: 'tag someone who does this 😂😂',
      media: {
        aspect: 1,
        note: 'screenshot of a screenshot of a joke post, heavy jpeg artifacts',
        kind: 'meme',
        src: '/assets/posts/stories-3.jpg',
      },
      stats: { likes: 512000, comments: 31000 },
      actions: [{ type: 'like', via: 'doubletap' }],
    },
    {
      kind: 'sponsored',
      author: a('lumen.co', { brand: true }),
      meta: 'Sponsored',
      label: 'Sponsored',
      body: 'Turn your ceiling into a galaxy ✨ 50% off today only.',
      media: {
        aspect: 1,
        note: 'galaxy star projector filling a dark bedroom ceiling, "50% OFF" badge',
        kind: 'product',
        src: '/assets/posts/algo-hell-3.jpg',
      },
      cta: { label: 'Shop Now', done: 'Opening…' },
      stats: { likes: 2210 },
    },
    {
      kind: 'photo',
      author: a('wanderwithjake'),
      meta: '1 DAY AGO',
      body: 'link in bio for my packing list 🌴',
      media: {
        aspect: 0.8,
        note: 'man on a cliff swing over jungle, drone shot, oversaturated',
        kind: 'carousel',
        count: 6,
        src: '/assets/posts/stories-5.jpg',
      },
      stats: { likes: 3104, comments: 88 },
      comments: [{ author: a('promo.growth.hub', { bot: true }), text: 'Nice pic! DM us for collab 💯' }],
      actions: [{ type: 'comment', text: 'omg goals 😍' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2021 */
  reels: section('reels', [
    {
      kind: 'reels',
      author: a('Reels', { brand: true }),
      meta: '',
      body: '',
      reels: {
        title: 'Reels and short videos',
        items: [
          { author: 'dancequeen.22', views: 1200000, note: 'bedroom dance trend', src: '/assets/posts/reels-2.jpg' },
          { author: 'glowskin', views: 880000, note: 'skincare before / after', src: '/assets/posts/reels-3.jpg' },
          { author: 'storytime.reddit', views: 2100000, note: 'TTS voice over game footage', src: '/assets/posts/reels-5.jpg' },
          { author: 'motivation.daily.ai', views: 3400000, note: 'sunrise + AI narrator', src: '/assets/posts/reels-shelf-motivation.jpg' },
        ],
      },
    },
    {
      kind: 'video',
      author: a('dancequeen.22'),
      meta: 'Reels · 3d',
      body: 'learned this in 1 day 😮‍💨 #fyp #dance',
      media: {
        aspect: 9 / 16,
        note: 'girl dancing in a bedroom, ring light, captions burned in',
        kind: 'reel',
        src: '/assets/posts/reels-2.jpg',
      },
      stats: { likes: 1200000, comments: 8400, shares: 45000, views: 9800000, reactions: ['👍', '❤️', '😮'] },
      actions: [{ type: 'overlay', choice: 0 }, { type: 'watch' }, { type: 'like' }],
    },
    {
      kind: 'sponsored',
      author: a('glowskin', { brand: true }),
      meta: 'Sponsored',
      label: 'Sponsored',
      body: 'this changed my skin in 3 days 😳 #madeMeBuyIt',
      media: {
        aspect: 9 / 16,
        note: 'product held to camera, split before / after',
        kind: 'reel',
        src: '/assets/posts/reels-3.jpg',
      },
      cta: { label: 'Shop now', done: 'Opening…' },
      stats: { likes: 88000, comments: 1100, shares: 3000 },
    },
    {
      kind: 'photo',
      author: a('Jess Morgan', { face: 'jess-morgan-2021' }),
      meta: '5h · 👥',
      body: 'remember us at 16 😭 #throwback',
      media: {
        aspect: 1,
        note: 'carousel of 2005 digicam photos, the face paint pics',
        kind: 'carousel',
        count: 7,
        src: '/assets/posts/profile-3.jpg',
      },
      stats: { likes: 23, comments: 2, reactions: ['❤️', '😆'] },
      comments: [{ author: a('~*brit*~', { face: 'brit-2021' }), text: 'WHO POSTED THIS' }],
      actions: [{ type: 'like' }, { type: 'comment', text: 'NOT THE FACE PAINT 😭' }],
    },
    {
      kind: 'video',
      author: a('storytime.reddit', { bot: true }),
      meta: 'Reels · 1d',
      body: 'AITA for refusing to give my sister my wedding date? (part 1) #storytime',
      media: {
        aspect: 9 / 16,
        note: 'text-to-speech voice over game footage, bouncing subtitles',
        kind: 'reel',
        src: '/assets/posts/reels-5.jpg',
      },
      stats: { likes: 340000, comments: 2900, shares: 12000, views: 4100000 },
    },
    {
      kind: 'photo',
      author: a('motivation.daily.ai', { bot: true }),
      meta: '2d · 🌐',
      body: 'Your future self is watching you right now through memories. 🧠',
      media: {
        aspect: 1,
        note: 'stock sunrise, quote in serif over the top',
        kind: 'ai',
        src: '/assets/posts/reels-6.jpg',
      },
      stats: { likes: 610000, comments: 5200, shares: 88000, reactions: ['👍', '❤️'] },
      comments: [
        { author: a('free.followers.now', { bot: true, face: 'growth-bot' }), text: 'Check my bio for free followers 💯' },
        { author: a('real.growth.247', { bot: true, face: 'growth-bot' }), text: 'Check my bio for free followers 💯' },
      ],
    },
  ]),

  /* ---------------------------------------------------------------- 2023 */
  slop: section('slop', [
    {
      kind: 'bot',
      author: a('Amazing Crafts World', { bot: true }),
      meta: '2h · 🌐',
      body: 'Made this with my own hands 🥺 nobody likes it',
      media: {
        aspect: 1,
        note: 'AI image: man beside a giant wooden cat carving, six fingers on one hand',
        kind: 'ai',
        src: '/assets/posts/slop-1.jpg',
      },
      stats: { likes: 145000, comments: 21000, shares: 9800, reactions: ['👍', '❤️', '😮'] },
      comments: [
        { author: a('Patricia Hill', AMEN), text: 'Beautiful work 🙏' },
        { author: a('Barbara Lee', AMEN), text: 'Beautiful work 🙏' },
      ],
      actions: [{ type: 'overlay', choice: 0 }, { type: 'like' }],
    },
    {
      kind: 'status',
      author: a('Linda Parker'),
      meta: '9h · 👥',
      body: 'Grandma passed away last night. She loved every one of you so much.',
      stats: { likes: 4, comments: 1, reactions: ['😢'] },
      actions: [{ type: 'comment', text: 'Sorry for your loss 🙏' }],
    },
    {
      kind: 'bot',
      author: a('Freedom Eagle Page', { bot: true }),
      meta: '5h · 🌐',
      body: 'Today is my birthday 🎂 why does no one ever wish me',
      media: {
        aspect: 1,
        note: 'AI image: 100-year-old woman behind a "100" cake, far too many candles, waxy skin',
        kind: 'ai',
        src: '/assets/posts/ai-era-1.jpg',
      },
      stats: { likes: 287000, comments: 64000, reactions: ['👍', '❤️'] },
      actions: [{ type: 'like' }],
    },
    {
      kind: 'sponsored',
      author: a('Cozy Crafts Shop', { brand: true }),
      meta: 'Sponsored',
      label: 'Sponsored',
      body: 'Only 2 left! Handcrafted by our artisans 🐈',
      media: {
        aspect: 1.2,
        note: 'AI product photo of a wooden cat, inconsistent grain',
        kind: 'product',
        src: '/assets/posts/slop-4.jpg',
      },
      cta: { label: 'Shop now', done: 'Opening…' },
      stats: { likes: 1200 },
    },
    {
      kind: 'bot',
      author: a('Real Patriots Unite', { bot: true }),
      meta: '1h · 🌐',
      body: 'Type YES if you agree 👇',
      stats: { likes: 54000, comments: 120000, reactions: ['👍'] },
      comments: [
        { author: a('Donna Ray', AMEN), text: 'YES' },
        { author: a('Carol Smith', AMEN), text: 'YES' },
        { author: a('Ruth Diaz', AMEN), text: 'YES' },
      ],
      actions: [{ type: 'like' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2024 */
  pro: section('pro', [
    {
      kind: 'bot',
      author: a('Brad Kowalski', {
        ...BOT_M1,
        headline: 'Chief Synergy Officer @ Nexora AI | Keynote Speaker | AI Evangelist 🚀',
      }),
      meta: '2h · 🌐',
      body: 'I fired my best employee yesterday.\n\nHere’s what it taught me about leadership 👇\n\n…see more',
      stats: { likes: 8412, comments: 1203, shares: 311, reactions: ['👍', '👏', '💡'] },
      actions: [{ type: 'like' }, { type: 'chrome', target: 'follow-brad' }],
    },
    {
      kind: 'status',
      author: a('Megan Foster', { face: 'megan-foster-2024', headline: 'Operations Manager · #OpenToWork' }),
      meta: '5h · 🌐',
      body: 'After 6 years, I was laid off this morning. If anyone hears of anything in Austin, I’d be so grateful. 🙏',
      stats: { likes: 14, comments: 3, reactions: ['👍', '❤️'] },
      comments: [{ author: a('Tom Bauer', { face: 'tom-bauer-2024', headline: 'Warehouse Lead' }), text: 'Sending you a DM, we might have something!' }],
      actions: [{ type: 'react', emoji: '👏' }],
    },
    {
      kind: 'sponsored',
      author: a('Nexora AI', { brand: true, headline: '48,211 followers' }),
      meta: 'Promoted',
      label: 'Promoted',
      body: 'Your SDR team, minus the team. Deploy 1,000 AI agents that prospect, post and comment for you, 24/7.',
      media: {
        aspect: 1.91,
        note: 'dashboard: a grid of thousands of agent avatars, all “active”',
        kind: 'product',
        src: '/assets/posts/pro-3.jpg',
      },
      cta: { label: 'Book a demo', done: 'Opening…' },
      stats: { likes: 960, comments: 44, reactions: ['👍', '💡'] },
    },
    {
      kind: 'poll',
      author: a('Thought Leader Daily', { bot: true, headline: 'Helping 10K+ founders scale with AI | DM “GROWTH”' }),
      meta: '1d · 🌐',
      body: 'Agree? 👇',
      poll: {
        question: 'Will AI write all of our posts by 2025?',
        options: ['Yes', 'No', 'It already does'],
        votes: [41, 9, 50],
        total: 12408,
      },
      stats: { likes: 3200, comments: 880, reactions: ['👍', '💡'] },
    },
    {
      kind: 'bot',
      author: a('Kai Lindqvist', { bot: true, face: 'stock-m2', headline: 'Top Voice ✦ | Building in public | Ex-Nothing' }),
      meta: '3d · 🌐',
      body: '10 lessons from waking up at 4:30am for 365 days 📄',
      media: {
        aspect: 1,
        note: 'PDF slide 1/10: “LESSON 1: DISCIPLINE” in bold on beige',
        kind: 'document',
        count: 10,
        src: '/assets/posts/pro-5.jpg',
      },
      stats: { likes: 22000, comments: 3100, shares: 1900, reactions: ['👍', '💡', '👏'] },
      actions: [{ type: 'like' }, { type: 'comment', text: 'Agree! 💡 Thanks for sharing' }],
    },
  ]),

  /* ------------------------------------------------------------- machine */
  machine: section('machine', [
    {
      kind: 'bot',
      author: a('Olivia Brown', BOT_F1),
      meta: 'ts=1762139581',
      body: 'Monday motivation: {{quote_of_the_day}} 💪 #mindset',
      stats: { likes: 2341, comments: 412 },
      actions: [{ type: 'like' }],
    },
    {
      kind: 'bot',
      author: a('Grateful Hearts', AMEN),
      meta: 'ts=1762139588',
      body: 'Type AMEN if you {{believe_verb}} 🙏',
      media: { aspect: 1.6, note: 'gen/blessing_v7.webp · alt=""', kind: 'ai' },
      stats: { likes: 88000, comments: 120000 },
      actions: [{ type: 'like' }],
    },
    {
      kind: 'bot',
      author: a('Brad Kowalski', BOT_M1),
      meta: 'ts=1762139602',
      body: 'I {{verb}} my best employee yesterday. Here’s what it taught me about {{topic}} 👇',
      stats: { likes: 8412, comments: 1203 },
      actions: [{ type: 'comment', text: 'Great insight! 🙌' }],
    },
    {
      kind: 'bot',
      author: a('Nature Is Amazing', { bot: true }),
      meta: 'ts=1762139611',
      body: 'Rare {{animal}} spotted in {{country}} 😍',
      media: { aspect: 1.6, note: 'gen/peacock_v3.webp · alt=""', kind: 'ai' },
      stats: { likes: 1200000, comments: 88000 },
      actions: [{ type: 'like' }],
    },
  ]),

  /* ---------------------------------------------------------------- 2025 */
  dead: section('dead', [
    {
      kind: 'bot',
      author: a('Sarah Mitchell', BOT_F1),
      meta: '1m · 🌐',
      body: 'Just finished my morning run! 🏃‍♀️ Feeling grateful for this beautiful day. What are you grateful for today? 🌅',
      stats: { likes: 2341, comments: 412, reactions: ['👍', '❤️'] },
      comments: [
        { author: a('Emma Johnson', BOT_F1), text: 'Love this energy! 🙌' },
        { author: a('Olivia Brown', BOT_F1), text: 'Love this energy! 🙌' },
      ],
      actions: [{ type: 'like' }],
    },
    {
      kind: 'bot',
      author: a('Emma Johnson', BOT_F1),
      meta: '1m · 🌐',
      body: 'Just finished my morning run! 🏃‍♀️ Feeling grateful for this beautiful day. What are you grateful for today? 🌅',
      stats: { likes: 2341, comments: 412, reactions: ['👍', '❤️'] },
      actions: [{ type: 'like' }],
    },
    {
      kind: 'bot',
      author: a('Mike Chen', BOT_M1),
      meta: '1m · 🌐',
      body: 'Excited to announce I’m starting a new role as Chief Synergy Officer at Nexora AI! 🚀 #Grateful #Leadership',
      stats: { likes: 9120, comments: 1003, reactions: ['👍', '👏', '❤️'] },
      comments: [{ author: a('Jess Morgan', BOT_F1), text: 'Great insight! 🙌' }],
      actions: [{ type: 'like' }, { type: 'comment', text: 'Great insight! 🙌' }],
    },
    {
      kind: 'bot',
      author: a('Nature Is Amazing', { bot: true }),
      meta: '1m · 🌐',
      body: 'Rare white peacock spotted in Brazil 😍',
      media: {
        aspect: 1,
        note: 'AI image of an AI image, recompressed twice, impossible feathers',
        kind: 'ai',
        src: '/assets/posts/dead-4.jpg',
      },
      stats: { likes: 1200000, comments: 88000, reactions: ['❤️', '😮'] },
      comments: [
        { author: a('Linda Parker', { face: 'stock-f2', bot: true }), text: 'Wow! 😍' },
        { author: a('Olivia Brown', BOT_F1), text: 'Wow! 😍' },
      ],
      actions: [{ type: 'like' }],
    },
    {
      kind: 'bot',
      author: a('Ashley Parker', { face: 'ashley-2023', bot: true }),
      meta: '1m · 🌐',
      body: 'Grateful for this beautiful day 🌅 What are you grateful for?',
      stats: { likes: 2341, comments: 412, reactions: ['👍', '❤️'] },
      comments: [{ author: a('Sarah Mitchell', BOT_F1), text: 'Love this energy! 🙌' }],
      actions: [{ type: 'like' }, { type: 'overlay', choice: 0 }],
    },
  ]),
};
