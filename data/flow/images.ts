/**
 * Real profile pictures for the feed, keyed the same way `Avatar` keys its
 * placeholder: the author's `face`, or their name when they have none. Any
 * author not listed here keeps the drawn placeholder (or letter badge, for
 * pages and brands).
 *
 * A name shows the same picture in every era. Where someone should look
 * older later on, that post gives the author a `face` of its own
 * (`jess-morgan-2021`, `megan-foster-2024`, `tom-bauer-2024`), the same way
 * Ashley has one face per era.
 *
 * Bots share faces (`stock-f1`, `stock-m1`, `amen-bot`…), so one photo shows
 * up under several names. Notifications use the sender's exact text, so some
 * people need two keys (`kaylafit` and `kaylafit ✓`).
 *
 * Post photos, link previews and reels thumbnails are set per post with `src`
 * in `posts.ts`; sidebar ads with `src` in `eras.ts`.
 */
import type { FlowAuthor } from './types';

export interface FaceImage {
  src: string;
  /** CSS background-position for the crop; defaults to centre. */
  position?: string;
}

const AV = '/assets/avatars';
const img = (file: string, position?: string): FaceImage => ({ src: `${AV}/${file}`, position });

export const FACE_IMAGES: Readonly<Record<string, FaceImage>> = {
  /* Ashley, the viewer, as she ages. `ashley-2023` is also the bot posing as her in 2025. */
  'ashley-2005': { src: '/assets/myspace/profile.jpg', position: 'center 30%' },
  'ashley-2008': img('ashley-2010.jpg'),
  'ashley-2014': img('ashley-2014.jpg'),
  'ashley-2019': img('ashley-2020.jpg'),
  'ashley-2023': img('ashley-2023.jpg'),

  /* 2005 · MySpace friends */
  'jess ✿': img('jess-2005.jpg'),
  mikey: img('myspace-mikey.jpg'),
  '~*brit*~': img('brit-2005.jpg'),
  KAYLA: img('myspace-kayla.jpg'),
  xXchrisXx: img('chris-2005.jpg'),
  danny: img('danny-2005.jpg'),
  meg: img('meg-2005.jpg'),
  priya: img('priya-2005.jpg'),

  /* 2008 · Facebook */
  'Jess Morgan': img('jess-morgan.jpg'),
  'Mike Chen': img('mike-chen.jpg'),
  'Kevin Walsh': img('kevin-walsh.jpg'),
  'Priya Shah': img('priya-shah.jpg'),
  'Linda Parker': img('linda-parker.jpg'),

  /* 2012–2014 */
  'Rachel Kim': img('rachel-kim.jpg'),
  'Tom Bauer': img('tom-bauer.jpg'),
  'Nicole Adams': img('nicole-adams.jpg'),
  'Chris Delgado': img('chris-delgado.jpg'),
  'Megan Foster': img('megan-foster.jpg'),
  'Jake Turner': img('jake-turner.jpg'),
  jake: img('jake-turner.jpg'),
  'Sarah Lin': img('sarah-lin.jpg'),

  /* 2017 */
  'Greg Parker': img('greg-parker.jpg'),
  'Emily Rose': img('emily-rose.jpg'),

  /* 2019–2021 */
  kaylafit: img('kaylafit.jpg'),
  'kaylafit ✓': img('kaylafit.jpg'),
  'meg.foster': img('meg-foster-ig.jpg'),
  wanderwithjake: img('wanderwithjake.jpg'),
  'dancequeen.22': img('dancequeen.jpg'),
  'dancequeen.22 ✓': img('dancequeen.jpg'),
  'brit-2021': img('brit-2021.jpg'),
  'jess-morgan-2021': img('jess-morgan-2021.jpg'),

  /* 2024: real people, older */
  'megan-foster-2024': img('megan-foster-2024.jpg'),
  'tom-bauer-2024': img('tom-bauer-2024.jpg'),

  /* Scam accounts */
  'Lisa 💋': img('lisa-bot.jpg'),
  'growth-bot': img('growth-bot.jpg'),
  'free.followers.now': img('growth-bot.jpg'),
  'Gen. James Miller': img('gen-james-miller.jpg'),
  'Anna · Crypto Mentor': img('anna-crypto.jpg'),
  'Growth Hacker': img('growth-hacker.jpg'),

  /* Bot faces, reused under different names */
  'amen-bot': img('amen-bot.jpg'),
  'stock-f1': img('bot-emma-hart.jpg'),
  'stock-f2': img('bot-grace-miller.jpg'),
  'stock-m1': img('stock-m1.jpg'),
  'stock-m2': img('stock-m2.jpg'),
  'Thought Leader Daily': img('thought-leader.jpg'),

  /* Pages and brands */
  FreshKicks: img('page-freshkicks.jpg'),
  'The Night Show': img('page-the-night-show.jpg'),
  'Heartfelt Stories': img('page-heartfelt-stories.jpg'),
  'Daily Hacks': img('page-daily-hacks.jpg'),
  'MindPrint Personality Quiz': img('page-mindprint.jpg'),
  MindPrint: img('page-mindprint.jpg'),
  'Heartland Voice': img('page-heartland-voice.jpg'),
  'Viral Clips': img('page-viral-clips.jpg'),
  dailydosememes: img('page-dailydosememes.jpg'),
  'lumen.co': img('page-lumen.jpg'),
  detoxdaily: img('page-detoxdaily.jpg'),
  'brand.collab.247': img('page-brand-collab.jpg'),
  'promo.growth.hub': img('page-promo-growth.jpg'),
  glowskin: img('page-glowskin.jpg'),
  'storytime.reddit': img('page-storytime.jpg'),
  'motivation.daily.ai': img('page-motivation-ai.jpg'),
  'Amazing Crafts World': img('page-amazing-crafts.jpg'),
  'Freedom Eagle Page': img('page-freedom-eagle.jpg'),
  'Cozy Crafts Shop': img('page-cozy-crafts.jpg'),
  'Page Support': img('page-page-support.jpg'),
  'Real Patriots Unite': img('page-real-patriots.jpg'),
  'Nexora AI': img('page-nexora.jpg'),
  'Nature Is Amazing': img('page-nature-amazing.jpg'),
};

/** AI images on every other card of the endless bot feed after 2025. */
export const TAIL_IMAGES = ['/assets/posts/dead-internet-1.jpg', '/assets/posts/tail-2.jpg', '/assets/posts/tail-3.jpg'] as const;

export function faceImage(author: FlowAuthor): FaceImage | undefined {
  return FACE_IMAGES[author.face ?? author.name];
}
