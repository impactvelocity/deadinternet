/**
 * Types for the /flow feed lab.
 *
 * The lab is one continuous feed with a few pinned pieces around it (date,
 * you, platform, dock, pop-ups). Their positions never move. Each era swaps
 * what is in them, and restyles the feed. Everything stays light mode.
 */
import type { IconName } from '@/components/flow/icons';

export type FlowEraId =
  | 'profile'
  | 'wall'
  | 'cards'
  | 'viral'
  | 'algorithm'
  | 'stories'
  | 'reels'
  | 'slop'
  | 'pro'
  | 'machine'
  | 'dead';

/* --------------------------------- Tokens --------------------------------- */

export interface EraTokens {
  font: string;
  /** Body size in px. */
  size: number;
  /** Page background colour. */
  bg: string;
  /** Optional full `background` shorthand (wallpapers, patterns). */
  background?: string;
  /** Post / module surface. */
  surface: string;
  /** Background of the feed column itself (row-style eras). */
  column?: string;
  /** Module title bars. */
  panel: string;
  panelText: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  line: string;
  /** Comment / inset background. */
  soft: string;
  radius: number;
  /** Post padding. */
  pad: number;
  /** Gap between posts. */
  gap: number;
  avatar: number;
  avatarShape: 'square' | 'rounded' | 'circle' | 'ring';
  shadow?: boolean;
  /** Author-name colour; defaults to `text`. */
  name?: string;
  /** Corner piece look: boxed tables, cards, plain lists, or the raw box model. */
  modules?: 'boxed' | 'card' | 'plain' | 'machine';
}

/* ---------------------------------- Posts --------------------------------- */

export type PostLayout = 'bulletin' | 'wall' | 'classic' | 'media-first' | 'machine';

export type ActionSlot = 'like' | 'comment' | 'share' | 'send';

export interface ActionLabel {
  label?: string;
  icon?: IconName;
  /** Label once the agent has done it ("Unlike", "Liked"). */
  done?: string;
  doneIcon?: IconName;
}

export interface PostStyle {
  layout: PostLayout;
  actions: ActionSlot[];
  labels: Partial<Record<ActionSlot, ActionLabel>>;
  /** How engagement numbers are shown. */
  counts: 'none' | 'sentence' | 'summary' | 'likes';
  /** Action row look. */
  actionBar: 'links' | 'bar' | 'icons';
  /** Show a comment composer on every post, or only where the agent comments. */
  composer: 'always' | 'action';
  composerPlaceholder: string;
  /** Visible submit control; null means "press Enter". */
  submit: string | null;
  /** Reaction palette [emoji, label] for this era's "react" action. */
  reactions?: [string, string][];
}

export interface FlowAuthor {
  name: string;
  handle?: string;
  /** Professional headline under the name ("Chief Synergy Officer | …"). */
  headline?: string;
  /** Avatar identity. Bots reuse one face under different names. */
  face?: string;
  bot?: boolean;
  verified?: boolean;
  brand?: boolean;
}

export interface FlowComment {
  author: FlowAuthor;
  text: string;
  meta?: string;
}

export interface FlowMedia {
  /** Distinct previews for a photo album. */
  photos?: readonly { src: string; alt: string }[];
  title?: string;
  /** width / height */
  aspect: number;
  /** Art direction note (shown with guides on). */
  note: string;
  kind?: 'photo' | 'video' | 'reel' | 'ai' | 'meme' | 'album' | 'product' | 'carousel' | 'map' | 'document';
  /** Slides in a carousel or document. */
  count?: number;
  /** Real image under /public. Without one, a placeholder is drawn. */
  src?: string;
  /**
   * `contain` shows the whole image, centred, with `fill` around it, for
   * images (like a document's slide) whose edges mustn't be cropped when the
   * box isn't their shape. Otherwise it fills the box from the top.
   */
  fit?: 'contain';
  fill?: string;
  /** Looping GIF displayed in place of the still image. */
  animatedSrc?: string;
  /** Playable video file; src remains its thumbnail. */
  videoSrc?: string;
  durationSeconds?: number;
}

export type PostKind =
  | 'status'
  | 'photo'
  | 'link'
  | 'bulletin'
  | 'ad'
  | 'sponsored'
  | 'bot'
  | 'video'
  | 'memory'
  | 'reels'
  | 'poll';

/**
 * What the agent does on a post. The compiler turns each one into cursor
 * moves, clicks, typing and effects tied to scroll position.
 */
export type AgentAction =
  | { type: 'read' }
  | { type: 'publish'; text: string }
  | { type: 'message'; text: string }
  | { type: 'like'; via?: 'button' | 'doubletap' }
  | { type: 'react'; emoji: string }
  | { type: 'comment'; text: string }
  | { type: 'share' }
  | { type: 'cta' }
  | { type: 'watch'; holdPx?: number }
  /** Click a button in this era's top-right piece (follow, poke back…). */
  | { type: 'chrome'; target: string }
  /** Click a button on this era's overlay (by index). */
  | { type: 'overlay'; choice: number };

export interface FlowPost {
  /** Editorial out-point in this era's narration, in seconds. */
  endsAtSeconds?: number;
  /** Scripted business finale: slow setup, then accelerating automation. */
  tempo?: number;
  agent?: AgentStyle;
  publishHold?: number;
  /** The final scripted post hands directly to the sandbox after publication. */
  revealAfterPublish?: boolean;
  chat?: { name: string; incoming: string };

  id: string;
  era: FlowEraId;
  kind: PostKind;
  author: FlowAuthor;
  /** Wall-to-wall target ("Linda → Ashley"). */
  to?: string;
  /** Who reposted / shared it into the feed. */
  via?: string;
  meta: string;
  /** "Sponsored", "Promoted", "Suggested for you"… */
  label?: string;
  title?: string;
  body: string;
  media?: FlowMedia;
  /** Link preview; `src` is the preview image under /public. */
  link?: { domain: string; title: string; src?: string };
  cta?: { label: string; done: string };
  /** Life event banner ("Had a baby girl"). */
  life?: { icon: IconName; title: string; sub?: string };
  /** A row of short videos (kind `reels`). */
  reels?: { title: string; items: { author: string; views: number; note: string; src?: string }[] };
  /** A poll (kind `poll`). */
  poll?: { question: string; options: string[]; votes: number[]; total: number };
  stats?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reactions?: string[];
  };
  comments?: FlowComment[];
  actions?: AgentAction[];
}

/* --------------------------------- Chrome --------------------------------- */

/** Ashley's chip, top left. */
export interface YouSpec {
  name: string;
  lines?: string[];
  badge?: string;
  /** Unread counts when the era begins; pings add to them. */
  inbox: { messages: number; requests: number; alerts: number };
}

export type PingKind = 'request' | 'message' | 'alert';

/**
 * A notification that slides in under Ashley's chip and leaves again. Over
 * the eras they go from friends, to famous accounts and brands, to scams, to
 * the machine talking to itself.
 */
export interface Ping {
  kind: PingKind;
  from: string;
  text: string;
  face?: string;
  tone: 'friend' | 'famous' | 'brand' | 'scam' | 'machine';
}

/** The small pinned piece top right: what the platform pushes at you. */
export type CornerModule =
  | { kind: 'grid'; title: string; sub?: string; names: string[] }
  | {
      kind: 'people';
      title: string;
      items: { id?: string; name: string; sub: string; cta: string; done?: string; face?: string; brand?: boolean }[];
    }
  | { kind: 'list'; title: string; items: { label: string; sub?: string }[] }
  | {
      kind: 'ad';
      title: string;
      headline: string;
      body?: string;
      note: string;
      aspect?: number;
      /** Ad image under /public. */
      src?: string;
      cta?: string;
      label?: string;
    }
  | { kind: 'requests'; title: string; items: { id?: string; label: string; cta?: string; done?: string }[] }
  | { kind: 'contacts'; title: string; items: { name: string; face?: string; status?: string }[] };

export type DockSpec =
  | { kind: 'chatbar'; label: string }
  | { kind: 'heads'; label: string; names: string[] }
  | { kind: 'assistant'; text: string };

export interface OverlaySpec {
  id: string;
  kind: 'modal' | 'banner' | 'sheet' | 'captcha';
  title: string;
  body?: string;
  /** Button labels. A captcha's first entry is the checkbox label. */
  actions: string[];
  /** Index of the emphasised button. */
  primary?: number;
  /**
   * `arrival` (default): pops up while the era settles in.
   * `late`: pops up right before the agent's overlay action.
   */
  appear?: 'arrival' | 'late';
}

export type LoaderIdiom = 'pager' | 'older' | 'more' | 'spinner' | 'skeleton' | 'none';

export type AgentStyle = 'human' | 'quick' | 'robot';

/** Light colours for the page gradient: a base, a glow from the top left and one from the bottom right. */
export interface Backdrop {
  base: string;
  glow: string;
  glow2: string;
}

export interface FlowEra {
  id: FlowEraId;
  year: number;
  /** Short name shown in the lab ("The Wall"). */
  label: string;
  /** What this era borrows its accents from (lab note only). */
  reference: string;
  /** One-line story beat for the HUD. */
  beat: string;
  /** Date and time under the era name in the page header. */
  date: { day: string; time: string };
  /** The story line shown above the feed as this era arrives. */
  narration: string;
  /** The browser tab and address bar. One fictional domain throughout. */
  tab: { title: string; url: string };
  /** The page around the browser window: a subtle gradient in this era's colours. */
  backdrop: Backdrop;
  /** What was happening online; shown in the era drawer. Draft copy, fact-check before shipping. */
  context: { summary: string; points: string[] };
  /** Story px per px of feed movement for this era (lower = feed moves faster). */
  scrollRate: number;
  tokens: EraTokens;
  post: PostStyle;
  agent: AgentStyle;
  /** Top-left: Ashley. */
  you: YouSpec;
  /** Notifications that come and go under Ashley's chip during this era. */
  pings: Ping[];
  /** Top-right: what the platform pushes at you. */
  platform: CornerModule;
  dock?: DockSpec;
  overlay?: OverlaySpec;
  /** How "load more" looked at the end of this era's section. */
  loader: LoaderIdiom;
  /** Story px to pause on arrival. */
  holdPx?: number;
  /** Glitch strength when the feed enters and leaves this era (0..1). */
  glitch?: { in: number; out: number };
}
