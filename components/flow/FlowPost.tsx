'use client';
/**
 * One post in the /flow feed, drawn in its own era's layout.
 *
 * Layouts: `bulletin` (2005 boxed tables), `wall` (2008 rows), `classic`
 * (cards, 2012 → 2025, including the 2024 professional look), `media-first`
 * (2019 photo cards) and `machine` (the box model with its markup showing).
 *
 * Post types inside a layout: status, photo, carousel, map check-in, link,
 * video, reel, a row of reels, life event, poll, document carousel, ad.
 *
 * Layout never depends on agent state: hidden things keep their space
 * (`visibility: hidden`) and the composer and the agent's posted comment share
 * one grid cell. That keeps the measured positions the timeline is compiled
 * from valid at every scroll position.
 *
 * Cursor targets carry `data-t="<postId>:<part>"`: body, media, like, share,
 * send, cta, composer, submit, react:<emoji>.
 */
import { memo, type CSSProperties, type ReactNode } from 'react';
import { viewerFor } from '@/data/flow/posts';
import type { ActionSlot, EraTokens, FlowAuthor, FlowComment, FlowEra, FlowPost as Post } from '@/data/flow/types';
import { Icon } from './icons';
import { Avatar, compact, full, MediaBox, Verified } from './parts';

export interface PostFx {
  liked: boolean;
  heart: boolean;
  palette: boolean;
  /** Emoji picked in the open palette, just before it closes. */
  picked?: string;
  reaction?: string;
  focused: boolean;
  posted?: string;
  shared: boolean;
  cta: boolean;
  watching: boolean;
  watched: boolean;
  typing?: string;
}

export interface FlowPostProps extends PostFx {
  post: Post;
  era: FlowEra;
  tokens: EraTokens;
  wire: boolean;
}

const DEFAULT_REACTIONS: [string, string][] = [
  ['👍', 'Like'],
  ['❤️', 'Love'],
  ['😆', 'Haha'],
  ['😮', 'Wow'],
  ['😢', 'Sad'],
  ['😡', 'Angry'],
];

const REACTION_COLOR: Record<string, string> = {
  '😡': '#e9710f',
  '😆': '#f7b125',
  '😮': '#f7b125',
  '😢': '#f7b125',
  '❤️': '#f33e58',
  '👏': '#44712e',
  '💡': '#915907',
};

const SMALL: CSSProperties = { fontSize: 'calc(var(--f-size) - 1px)' };
const TINY: CSSProperties = { fontSize: 'calc(var(--f-size) - 2px)' };
const MUTED: CSSProperties = { color: 'var(--f-muted)' };
const NAME: CSSProperties = { color: 'var(--f-name)', fontWeight: 700 };
const LINK: CSSProperties = { color: 'var(--f-accent)' };

function agentComment(post: Post): string | undefined {
  for (const a of post.actions ?? []) if (a.type === 'comment') return a.text;
  return undefined;
}

function hasReact(post: Post): boolean {
  return (post.actions ?? []).some((a) => a.type === 'react');
}

/* -------------------------------- Pieces ---------------------------------- */

interface Ctx extends FlowPostProps {
  viewer: FlowAuthor;
  commentText?: string;
  likes: number;
  comments: number;
  /** Comment count before the agent posts (decides whether rows exist, so layout stays put). */
  baseComments: number;
}

function Name({ author, wire }: { author: FlowAuthor; wire: boolean }) {
  return (
    <span style={NAME}>
      {author.name}
      {author.verified && <Verified wire={wire} />}
    </span>
  );
}

function Body({ c, className, children }: { c: Ctx; className?: string; children?: ReactNode }) {
  if (!c.post.body && !children) return null;
  return (
    <div data-t={`${c.post.id}:body`} className={`whitespace-pre-line ${className ?? ''}`}>
      {children ?? c.post.body}
    </div>
  );
}

function Media({ c, radius = 0, className, style }: { c: Ctx; radius?: number | string; className?: string; style?: CSSProperties }) {
  const { post, wire } = c;
  if (!post.media) return null;
  const moving = post.media.kind === 'video' || post.media.kind === 'reel';
  const box = (
    <MediaBox
      media={post.media}
      wire={wire}
      radius={radius}
      className={className}
      style={style}
      target={`${post.id}:media`}
      views={post.stats?.views}
    >
      {c.heart && <span className="fl-heart-pop absolute inset-0 grid place-items-center text-[88px] text-white drop-shadow-lg">♥</span>}
      {moving && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
          <span
            className="block h-full bg-white"
            style={{
              width: c.watched || c.watching ? '100%' : '0%',
              transition: c.watching && !c.watched ? 'width 1.8s linear' : 'none',
            }}
          />
        </span>
      )}
    </MediaBox>
  );
  if (post.media.kind !== 'reel') return box;
  // Reels sit centred in a soft frame, like a phone video in a desktop feed.
  return (
    <div className="flex justify-center py-3" style={{ background: 'var(--f-soft)' }}>
      <div className="w-[292px] overflow-hidden rounded-xl shadow-sm">{box}</div>
    </div>
  );
}

function LinkCard({ c }: { c: Ctx }) {
  const { link } = c.post;
  if (!link) return null;
  return (
    <div style={{ background: 'var(--f-soft)', borderTop: '1px solid var(--f-line)', borderBottom: '1px solid var(--f-line)' }}>
      <MediaBox media={{ aspect: 2.1, note: `link preview for ${link.domain}`, kind: 'photo', src: link.src }} wire={c.wire} />
      <div className="px-3 py-2.5">
        <div className="uppercase tracking-wide" style={{ ...TINY, ...MUTED }}>
          {link.domain}
        </div>
        <div className="font-bold leading-snug" style={{ fontSize: 'calc(var(--f-size) + 1px)' }}>
          {link.title}
        </div>
      </div>
    </div>
  );
}

function LifeEvent({ c }: { c: Ctx }) {
  const { life } = c.post;
  if (!life) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-5 text-center" style={{ borderTop: '1px solid var(--f-line)' }}>
      <span className="grid size-12 place-items-center rounded-full text-white" style={{ background: c.wire ? '#999' : 'var(--f-accent)' }}>
        <Icon name={life.icon} size={24} />
      </span>
      <div className="font-bold" style={{ fontSize: 'calc(var(--f-size) + 5px)' }}>
        {life.title}
      </div>
      {life.sub && <div style={MUTED}>{life.sub}</div>}
    </div>
  );
}

function Poll({ c }: { c: Ctx }) {
  const { poll } = c.post;
  if (!poll) return null;
  const max = Math.max(...poll.votes);
  return (
    <div className="mx-[var(--f-pad)] mb-2 rounded-lg p-3" style={{ border: '1px solid var(--f-line)' }}>
      <div className="mb-2.5 font-semibold">{poll.question}</div>
      <div className="flex flex-col gap-2">
        {poll.options.map((o, i) => (
          <div key={o} className="relative overflow-hidden rounded-md" style={{ background: 'var(--f-soft)' }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${poll.votes[i]}%`,
                background:
                  poll.votes[i] === max
                    ? 'color-mix(in srgb, var(--f-accent) 28%, transparent)'
                    : 'color-mix(in srgb, var(--f-muted) 22%, transparent)',
              }}
            />
            <div className="relative flex justify-between px-3 py-1.5 font-semibold">
              <span>{o}</span>
              <span>{poll.votes[i]}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2" style={{ ...TINY, ...MUTED }}>
        {full(poll.total)} votes · Poll closed
      </div>
    </div>
  );
}

function ReelsRow({ c }: { c: Ctx }) {
  const { reels } = c.post;
  if (!reels) return null;
  return (
    <div className="px-[var(--f-pad)] pb-3.5 pt-3">
      <div className="mb-2.5 flex items-center gap-2 font-bold" style={{ fontSize: 'calc(var(--f-size) + 1px)' }}>
        <span style={{ color: 'var(--f-accent)' }}>
          <Icon name="reel" size={20} />
        </span>
        {reels.title}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {reels.items.map((r) => (
          <div key={r.author} className="relative overflow-hidden rounded-lg">
            <MediaBox media={{ aspect: 9 / 16, note: r.note, kind: 'reel', src: r.src }} wire={c.wire} views={r.views} />
            <span className="absolute left-2 top-2 flex items-center gap-1.5 text-[11px] font-semibold text-white drop-shadow">
              <Avatar author={{ name: r.author }} size={20} shape="circle" wire={c.wire} />
              <span className="max-w-[80px] truncate">{r.author}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cta({ c, look }: { c: Ctx; look: 'button' | 'strip' }) {
  const { cta } = c.post;
  if (!cta) return null;
  const label = c.cta ? cta.done : cta.label;
  if (look === 'strip') {
    return (
      <div
        data-t={`${c.post.id}:cta`}
        className={`flex items-center justify-between px-3 py-2.5 font-semibold ${c.cta ? 'fl-flash' : ''}`}
        style={{ color: c.cta ? 'var(--f-muted)' : 'var(--f-accent)', borderBottom: '1px solid var(--f-line)' }}
      >
        <span>{label}</span>
        <span>›</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 px-[var(--f-pad)] py-2.5" style={{ background: 'var(--f-soft)' }}>
      <span className="truncate font-semibold" style={SMALL}>
        {c.post.author.name}
      </span>
      <span
        data-t={`${c.post.id}:cta`}
        className={`min-w-[110px] shrink-0 px-3.5 py-1.5 text-center font-semibold ${c.cta ? 'fl-pop' : ''}`}
        style={{
          ...SMALL,
          borderRadius: c.tokens.radius >= 8 ? 999 : 'var(--f-radius)',
          border: '1px solid var(--f-line)',
          background: c.cta ? 'var(--f-accent)' : 'var(--f-surface)',
          color: c.cta ? 'var(--f-accent-text)' : 'var(--f-text)',
          transition: 'background .2s, color .2s',
        }}
      >
        {label}
      </span>
    </div>
  );
}

type CommentLook = 'table' | 'bubble' | 'inline' | 'mono';

/**
 * One comment row; `look` follows the post layout. `fresh` marks the agent's
 * own comment, which slides in when it posts.
 */
function CommentRow({ c, comment, hidden, fresh, look }: { c: Ctx; comment: FlowComment; hidden?: boolean; fresh?: boolean; look: CommentLook }) {
  const style: CSSProperties = { visibility: hidden ? 'hidden' : 'visible', opacity: hidden ? 0 : 1, transition: 'opacity .3s' };
  const arrive = fresh && !hidden ? ' fl-arrive' : '';
  const { author, text } = comment;
  if (look === 'table') {
    return (
      <div className={`flex gap-2 py-1${arrive}`} style={{ ...style, borderTop: '1px dotted var(--f-line)' }}>
        <Avatar author={author} size={24} shape="square" wire={c.wire} />
        <div>
          <span style={{ ...NAME, ...LINK }}>{author.name}</span>: {text}
        </div>
      </div>
    );
  }
  if (look === 'inline') {
    return (
      <div className={`py-[2px]${arrive}`} style={style}>
        <span className="font-semibold">{author.name}</span> {text}
      </div>
    );
  }
  if (look === 'mono') {
    return (
      <div className={`py-[2px]${arrive}`} style={style}>
        <span style={MUTED}>&lt;li&gt;</span>
        <span className="font-semibold">{author.name}</span>: {text}
        <span style={MUTED}>&lt;/li&gt;</span>
      </div>
    );
  }
  const round = c.tokens.radius >= 6;
  return (
    <div className={`flex items-start gap-2 py-1${arrive}`} style={style}>
      <Avatar author={author} size={32} shape={c.tokens.avatarShape === 'ring' ? 'circle' : c.tokens.avatarShape} wire={c.wire} />
      <div
        className={round ? 'min-w-0 rounded-2xl px-3 py-1.5' : 'px-0 py-0.5'}
        style={round ? { background: 'var(--f-soft)', borderRadius: c.era.id === 'pro' ? '0 10px 10px 10px' : undefined } : undefined}
      >
        <span style={{ ...NAME, ...(round ? SMALL : {}) }}>{author.name}</span>
        {author.headline && round && (
          <div className="truncate" style={{ ...TINY, ...MUTED }}>
            {author.headline}
          </div>
        )}{' '}
        {round ? <div>{text}</div> : <span>{text}</span>}
        {comment.meta && (
          <div style={{ ...TINY, ...MUTED }} className="mt-0.5">
            {comment.meta}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The comment composer. The agent's posted comment occupies the same grid
 * cell, so posting swaps rows without moving anything below.
 */
function Composer({ c, look }: { c: Ctx; look: 'textarea' | 'row' | 'pill' | 'bare' | 'mono' }) {
  const { post, era, viewer } = c;
  if (era.post.composer === 'action' && !c.commentText) return null;
  const value = c.typing ?? '';
  const placeholder = era.post.composerPlaceholder;
  const submit = era.post.submit;
  const commentLook: CommentLook =
    era.post.layout === 'bulletin' ? 'table' : era.post.layout === 'media-first' ? 'inline' : era.post.layout === 'machine' ? 'mono' : 'bubble';

  const caret = c.focused ? <span className="fl-caret" /> : null;
  const text = value ? <span>{value}</span> : <span style={MUTED}>{placeholder}</span>;

  let row: ReactNode;
  if (look === 'textarea') {
    row = (
      <div className="flex flex-col items-start gap-1 pt-1">
        <div data-t={`${post.id}:composer`} className="h-[34px] w-full px-1 py-0.5" style={{ border: '1px solid #7f9db9', background: '#fff', color: '#000' }}>
          {text}
          {caret}
        </div>
        {submit && (
          <span
            data-t={`${post.id}:submit`}
            className="px-2 py-[1px]"
            style={{ border: '1px solid #888', background: 'linear-gradient(#fff, #ddd)', color: '#000', ...TINY }}
          >
            {submit}
          </span>
        )}
      </div>
    );
  } else if (look === 'mono') {
    row = (
      <div data-t={`${post.id}:composer`} className="truncate px-2 py-1" style={{ border: '1px dashed var(--f-line)', background: '#fff' }}>
        <span style={MUTED}>&lt;input value=&quot;</span>
        {value || <span style={MUTED}>{placeholder}</span>}
        {caret}
        <span style={MUTED}>&quot; /&gt;</span>
      </div>
    );
  } else if (look === 'bare') {
    row = (
      <div className="flex items-center gap-2 py-2.5" style={{ borderTop: '1px solid var(--f-line)' }}>
        <div data-t={`${post.id}:composer`} className="min-w-0 flex-1 truncate">
          {text}
          {caret}
        </div>
        {submit && (
          <span
            data-t={`${post.id}:submit`}
            className="font-semibold"
            style={{ color: value ? 'var(--f-accent)' : 'color-mix(in srgb, var(--f-accent) 45%, transparent)' }}
          >
            {submit}
          </span>
        )}
      </div>
    );
  } else {
    const pill = look === 'pill';
    row = (
      <div className="flex items-center gap-2 py-1">
        <Avatar author={viewer} size={32} shape={c.tokens.avatarShape === 'ring' ? 'circle' : c.tokens.avatarShape} wire={c.wire} />
        <div
          data-t={`${post.id}:composer`}
          className="min-w-0 flex-1 truncate px-3 py-1.5"
          style={{
            background: pill ? 'var(--f-soft)' : 'var(--f-surface)',
            border: pill ? '1px solid transparent' : '1px solid var(--f-line)',
            borderRadius: pill ? 999 : 'var(--f-radius)',
            boxShadow: c.focused ? '0 0 0 2px color-mix(in srgb, var(--f-accent) 35%, transparent)' : 'none',
          }}
        >
          {text}
          {caret}
        </div>
        {submit && (
          <span
            data-t={`${post.id}:submit`}
            className="shrink-0 px-2.5 py-1 font-semibold"
            style={{ ...SMALL, borderRadius: 'var(--f-radius)', background: 'var(--f-accent)', color: 'var(--f-accent-text)' }}
          >
            {submit}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fl-stack">
      {c.commentText && (
        <CommentRow c={c} comment={{ author: viewer, text: c.commentText, meta: 'Just now' }} hidden={!c.posted} fresh look={commentLook} />
      )}
      <div style={{ visibility: c.posted ? 'hidden' : 'visible' }}>{row}</div>
    </div>
  );
}

function Comments({ c, look }: { c: Ctx; look: CommentLook }) {
  const list = c.post.comments ?? [];
  if (!list.length) return null;
  return (
    <>
      {list.map((cm, i) => (
        <CommentRow key={i} c={c} comment={cm} look={look} />
      ))}
    </>
  );
}

/* ------------------------------ Action rows ------------------------------- */

function slotLabel(c: Ctx, slot: ActionSlot) {
  const l = c.era.post.labels[slot] ?? {};
  const done = (slot === 'like' && c.liked) || (slot === 'share' && c.shared);
  return { label: done ? (l.done ?? l.label) : l.label, icon: done ? (l.doneIcon ?? l.icon) : l.icon, done };
}

function Palette({ c }: { c: Ctx }) {
  if (!hasReact(c.post)) return null;
  const set = c.era.post.reactions ?? DEFAULT_REACTIONS;
  return (
    <span
      className="absolute bottom-[calc(100%+6px)] left-0 z-10 flex gap-1.5 rounded-full px-2.5 py-1.5"
      style={{
        background: 'var(--f-surface)',
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        visibility: c.palette ? 'visible' : 'hidden',
        opacity: c.palette ? 1 : 0,
        transform: c.palette ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity .15s, transform .15s',
      }}
    >
      {set.map(([emoji]) => {
        const picked = c.picked === emoji;
        return (
          <span
            key={emoji}
            data-t={`${c.post.id}:react:${emoji}`}
            className="fl-pick text-[24px] leading-none"
            style={{ transform: picked ? 'translateY(-5px) scale(1.45)' : 'none', opacity: c.picked && !picked ? 0.45 : 1 }}
          >
            {emoji}
          </span>
        );
      })}
    </span>
  );
}

function ActionLinks({ c, extra }: { c: Ctx; extra?: ReactNode }) {
  const items = c.era.post.actions.map((slot) => {
    const { label, icon, done } = slotLabel(c, slot);
    return (
      <span
        key={slot}
        data-t={`${c.post.id}:${slot}`}
        className={`inline-flex items-center gap-1 ${done ? 'fl-flash' : ''}`}
        style={{ ...LINK, fontWeight: done ? 700 : 400 }}
      >
        {icon && <Icon name={icon} size={13} filled={done && slot === 'like'} />}
        {label}
      </span>
    );
  });
  return (
    <div className="flex flex-wrap items-center gap-x-1" style={SMALL}>
      {extra}
      {items.map((node, i) => (
        <span key={i} className="flex items-center gap-1">
          {(i > 0 || extra) && <span style={MUTED}>·</span>}
          {node}
        </span>
      ))}
    </div>
  );
}

function ActionBar({ c }: { c: Ctx }) {
  const set = new Map(c.era.post.reactions ?? DEFAULT_REACTIONS);
  return (
    <div className="mx-[var(--f-pad)] flex py-1" style={{ borderTop: '1px solid var(--f-line)' }}>
      {c.era.post.actions.map((slot) => {
        const { label, icon, done } = slotLabel(c, slot);
        const reaction = slot === 'like' ? c.reaction : undefined;
        const active = done || !!reaction;
        return (
          <span key={slot} className="relative flex flex-1 justify-center">
            {slot === 'like' && <Palette c={c} />}
            <span
              data-t={`${c.post.id}:${slot}`}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 font-semibold"
              style={{
                ...SMALL,
                color: reaction ? (REACTION_COLOR[reaction] ?? 'var(--f-accent)') : active ? 'var(--f-accent)' : 'var(--f-muted)',
                transition: 'color .15s',
              }}
            >
              {reaction ? (
                <span className="fl-pop text-[17px] leading-none">{reaction}</span>
              ) : (
                icon && (
                  <span className={`inline-flex ${active ? 'fl-pop' : ''}`}>
                    <Icon name={icon} size={19} filled={active && slot === 'like'} />
                  </span>
                )
              )}
              {reaction ? set.get(reaction) : label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ActionIcons({ c }: { c: Ctx }) {
  return (
    <div className="flex items-center gap-4">
      {c.era.post.actions.map((slot) => {
        const { icon, done } = slotLabel(c, slot);
        const hot = done && slot === 'like';
        return (
          <span
            key={slot}
            data-t={`${c.post.id}:${slot}`}
            className="grid place-items-center"
            style={{
              color: hot ? (c.wire ? '#333' : '#ed4956') : 'var(--f-text)',
              transition: 'color .15s, transform .15s',
              transform: hot ? 'scale(1.12)' : 'scale(1)',
            }}
          >
            {icon && (
              <span className={`inline-flex ${hot ? 'fl-pop' : ''}`}>
                <Icon name={icon} size={24} filled={hot} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Summary({ c }: { c: Ctx }) {
  const stats = c.post.stats ?? {};
  const icons = [...(stats.reactions ?? ['👍'])];
  if (c.reaction && !icons.includes(c.reaction)) icons.unshift(c.reaction);
  const others = stats.likes ?? 0;
  const sharesWord = c.era.post.labels.share?.label === 'Repost' ? 'reposts' : 'shares';
  return (
    <div className="mx-[var(--f-pad)] flex items-center justify-between py-2" style={{ ...SMALL, ...MUTED }}>
      <span className="flex items-center gap-1.5">
        <span className="flex">
          {icons.slice(0, 3).map((e, i) => (
            <span
              key={e}
              className={`grid size-[19px] place-items-center rounded-full text-[11px] ${e === c.reaction ? 'fl-pop' : ''}`}
              style={{ background: 'var(--f-surface)', boxShadow: '0 0 0 2px var(--f-surface)', marginLeft: i ? -5 : 0 }}
            >
              {e}
            </span>
          ))}
        </span>
        {c.liked ? `You and ${compact(others)} others` : compact(others)}
      </span>
      <span>
        {c.comments > 0 && `${compact(c.comments)} comments`}
        {stats.shares ? ` · ${compact(stats.shares)} ${sharesWord}` : ''}
        {stats.views && c.post.media?.kind !== 'reel' ? ` · ${compact(stats.views)} views` : ''}
      </span>
    </div>
  );
}

function Sentence({ c }: { c: Ctx }) {
  const n = c.post.stats?.likes ?? 0;
  const text = c.liked ? (n ? `You and ${full(n)} others like this.` : 'You like this.') : `${full(n)} ${n === 1 ? 'person likes' : 'people like'} this.`;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${c.liked ? 'fl-flash' : ''}`} style={{ ...SMALL, visibility: n || c.liked ? 'visible' : 'hidden' }}>
      <span className="grid size-4 place-items-center rounded-sm text-white" style={{ background: c.wire ? '#888' : 'var(--f-accent)' }}>
        <Icon name="like" size={11} />
      </span>
      <span>{text}</span>
    </div>
  );
}

/* -------------------------------- Layouts --------------------------------- */

function Bulletin({ c }: { c: Ctx }) {
  const { post } = c;
  return (
    <article data-flow-post={post.id} style={{ background: 'var(--f-surface)', border: '1px solid var(--f-line)', marginBottom: 'var(--f-gap)' }}>
      <header className="px-1.5 py-[3px] font-bold" style={{ background: 'var(--f-panel)', color: 'var(--f-panel-text)' }}>
        {post.title ?? `${post.author.name}'s Bulletin`}
      </header>
      <div className="flex gap-2.5 p-[var(--f-pad)]">
        <div className="flex w-[64px] shrink-0 flex-col items-center gap-1 text-center">
          <Avatar author={post.author} size={50} shape="square" wire={c.wire} />
          <span style={{ ...LINK, ...TINY }}>{post.author.name}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1" style={{ ...TINY, ...MUTED }}>
            From: <span style={LINK}>{post.author.name}</span> · Date: {post.meta}
          </div>
          <Body c={c} />
          {post.media && <Media c={c} className="mt-1.5 w-[240px]" style={{ border: '3px solid #fff', outline: '1px solid #ccc' }} />}
          <div className="mt-1.5">
            <Comments c={c} look="table" />
          </div>
          <div className="mt-1.5">
            <ActionLinks c={c} />
          </div>
          <Composer c={c} look="textarea" />
        </div>
      </div>
    </article>
  );
}

function Wall({ c }: { c: Ctx }) {
  const { post } = c;
  const showBox = (post.comments?.length ?? 0) > 0 || !!c.commentText;
  return (
    <article data-flow-post={post.id} className="flex gap-2.5 px-2 py-2.5" style={{ borderBottom: '1px solid var(--f-line)' }}>
      <Avatar author={post.author} size={50} shape="square" wire={c.wire} />
      <div className="min-w-0 flex-1">
        <Body c={c}>
          <Name author={post.author} wire={c.wire} />
          {post.to && (
            <>
              {' '}
              <span style={MUTED}>▸</span> <span style={NAME}>{post.to}</span>
            </>
          )}{' '}
          {post.body}
        </Body>
        {post.media && <Media c={c} className="mt-1.5 w-[300px]" />}
        <div className="mt-1">
          <ActionLinks
            c={c}
            extra={
              <span style={MUTED}>
                {post.meta}
                {post.label ? ` · ${post.label}` : ''}
              </span>
            }
          />
        </div>
        {showBox && (
          <div className="mt-1.5 px-1.5 py-1" style={{ background: 'var(--f-soft)', borderTop: '1px solid #e5eaf1' }}>
            <Comments c={c} look="bubble" />
            <Composer c={c} look="row" />
          </div>
        )}
      </div>
    </article>
  );
}

function ClassicHeader({ c }: { c: Ctx }) {
  const { post, tokens } = c;
  const pro = !!post.author.headline;
  return (
    <header className="mb-2.5 flex items-start gap-2.5">
      <Avatar author={post.author} size={tokens.avatar} shape={tokens.avatarShape} wire={c.wire} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate">
          <Name author={post.author} wire={c.wire} />
          {post.via && <span style={MUTED}> shared a post from {post.via}</span>}
          {pro && !post.author.brand && <span style={{ ...SMALL, ...MUTED }}> · {post.author.bot ? '3rd+' : '2nd'}</span>}
        </div>
        {pro && (
          <div className="mt-0.5 truncate" style={{ ...TINY, ...MUTED }}>
            {post.author.headline}
          </div>
        )}
        <div className="mt-0.5 flex items-center gap-1" style={{ ...TINY, ...MUTED }}>
          {post.label && post.label !== post.meta && <span>{post.label} ·</span>}
          <span>{post.meta}</span>
        </div>
      </div>
      {pro ? (
        <span className="flex shrink-0 items-center gap-1 font-semibold" style={{ ...SMALL, color: 'var(--f-accent)' }}>
          <Icon name="plus" size={16} /> Follow
        </span>
      ) : (
        <span style={MUTED}>
          <Icon name="more" size={20} />
        </span>
      )}
    </header>
  );
}

function Classic({ c }: { c: Ctx }) {
  const { post, era, tokens } = c;
  const links = era.post.actionBar === 'links';
  const card: CSSProperties = {
    background: 'var(--f-surface)',
    border: tokens.shadow ? '1px solid transparent' : '1px solid var(--f-line)',
    borderRadius: 'var(--f-radius)',
    boxShadow: tokens.shadow ? '0 1px 2px rgba(0,0,0,.1), 0 4px 16px rgba(0,0,0,.04)' : 'none',
    marginBottom: 'var(--f-gap)',
  };
  if (post.kind === 'reels') {
    return (
      <article data-flow-post={post.id} className="overflow-hidden" style={card}>
        <ReelsRow c={c} />
      </article>
    );
  }
  return (
    <article data-flow-post={post.id} className="overflow-hidden" style={card}>
      <div className="p-[var(--f-pad)] pb-2.5">
        <ClassicHeader c={c} />
        <Body c={c} />
        {links && (
          <div className="mt-2.5">
            <ActionLinks c={c} />
          </div>
        )}
      </div>
      <LifeEvent c={c} />
      <Poll c={c} />
      {post.media && <Media c={c} className="w-full" />}
      <LinkCard c={c} />
      <Cta c={c} look="button" />
      {era.post.counts === 'summary' && <Summary c={c} />}
      {!links && <ActionBar c={c} />}
      <div
        className="px-[var(--f-pad)] pb-1.5"
        style={links ? { background: 'var(--f-soft)', borderTop: '1px solid var(--f-line)' } : { borderTop: '1px solid var(--f-line)' }}
      >
        {era.post.counts === 'sentence' && <Sentence c={c} />}
        <div className="pt-1.5">
          <Comments c={c} look="bubble" />
          <Composer c={c} look={tokens.radius >= 6 ? 'pill' : 'row'} />
        </div>
      </div>
    </article>
  );
}

function MediaFirst({ c }: { c: Ctx }) {
  const { post } = c;
  return (
    <article
      data-flow-post={post.id}
      className="overflow-hidden"
      style={{ background: 'var(--f-surface)', border: '1px solid var(--f-line)', borderRadius: 'var(--f-radius)', marginBottom: 'var(--f-gap)' }}
    >
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar author={post.author} size={32} shape="ring" wire={c.wire} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold">
            {post.author.name}
            {post.author.verified && <Verified wire={c.wire} />}
          </div>
          {post.label && <div style={TINY}>{post.label}</div>}
        </div>
        <span style={MUTED}>
          <Icon name="more" size={20} />
        </span>
      </header>
      <Media c={c} className="w-full" />
      <Cta c={c} look="strip" />
      <div className="px-3 pt-2.5">
        <div className="flex items-center justify-between">
          <ActionIcons c={c} />
          <Icon name="bookmark" size={24} />
        </div>
        <div className="mt-2 font-semibold">{full(c.likes)} likes</div>
        <Body c={c} className="mt-0.5">
          <span className="font-semibold">{post.author.name}</span> {post.body}
        </Body>
        {c.baseComments > 0 && (
          <div className="mt-0.5" style={MUTED}>
            View all {full(c.comments)} comments
          </div>
        )}
        <Comments c={c} look="inline" />
        <div className="mb-2 mt-1 uppercase tracking-wide" style={{ ...TINY, ...MUTED }}>
          {post.meta}
        </div>
      </div>
      <div className="px-3">
        <Composer c={c} look="bare" />
      </div>
    </article>
  );
}

/** Body text with `{{template slots}}` highlighted. */
function Template({ text }: { text: string }) {
  return (
    <>
      {text.split(/({{[^}]+}})/).map((part, i) =>
        part.startsWith('{{') ? (
          <span key={i} className="rounded-sm px-0.5" style={{ background: '#fff8c5', color: '#9a6700' }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * The machine: no costume. Each post is its box model (margin, border,
 * padding, content) with the markup labelled, templates unfilled, and the
 * buttons as bare elements.
 */
function Machine({ c }: { c: Ctx }) {
  const { post } = c;
  const id = post.id.replace(/\D/g, '').padStart(4, '0');
  const likes = (post.stats?.likes ?? 0) + (c.liked ? 1 : 0);
  return (
    <article data-flow-post={post.id} className="fl-m-margin">
      <span className="fl-m-label">margin 10</span>
      <div className="fl-m-border">
        <div className="fl-m-padding">
          <span className="fl-m-label">padding 12</span>
          <div className="fl-m-content">
            <div className="fl-tag flex items-center gap-2" data-tag={`header.author[data-bot="${post.author.bot ? 'true' : 'false'}"]`}>
              <span className="fl-m-img" style={{ width: 32, height: 32 }} />
              <span className="font-bold">{post.author.name}</span>
              <span style={MUTED}>{post.meta}</span>
            </div>
            <div className="fl-tag" data-tag="p.body" data-t={`${post.id}:body`}>
              <Template text={post.body} />
            </div>
            {post.media && (
              <div className="fl-tag" data-tag={`img src="${post.media.note.split(' · ')[0]}" alt=""`}>
                <div className="fl-m-img w-full" data-t={`${post.id}:media`} style={{ aspectRatio: String(post.media.aspect) }} />
              </div>
            )}
            <div className="fl-tag flex flex-wrap gap-2" data-tag="footer.actions">
              {c.era.post.actions.map((slot) => {
                const pressed = slot === 'like' && c.liked;
                return (
                  <span
                    key={slot}
                    data-t={`${post.id}:${slot}`}
                    className={`px-1.5 py-0.5 ${pressed ? 'fl-pop' : ''}`}
                    style={{
                      border: '1px solid var(--f-line)',
                      background: pressed ? '#ddf4ff' : '#fff',
                      color: pressed ? 'var(--f-accent)' : 'var(--f-text)',
                    }}
                  >
                    &lt;button {slot}
                    {pressed ? ' aria-pressed' : ''}&gt;{slot === 'like' ? full(likes) : slot === 'comment' ? full(c.comments) : ''}&lt;/button&gt;
                  </span>
                );
              })}
            </div>
            {(post.comments?.length ?? 0) > 0 && (
              <div className="fl-tag" data-tag="ul.comments">
                <Comments c={c} look="mono" />
              </div>
            )}
            <div className="fl-tag" data-tag="form.reply">
              <Composer c={c} look="mono" />
            </div>
          </div>
        </div>
      </div>
      <span className="fl-m-dims">article.post#p-{id} · 600 × auto</span>
    </article>
  );
}

/* -------------------------------- Export ---------------------------------- */

function FlowPostInner(props: FlowPostProps) {
  const { post, era } = props;
  const stats = post.stats ?? {};
  const baseComments = stats.comments ?? post.comments?.length ?? 0;
  const c: Ctx = {
    ...props,
    viewer: viewerFor(era.year),
    commentText: agentComment(post),
    likes: (stats.likes ?? 0) + (props.liked ? 1 : 0),
    comments: baseComments + (props.posted ? 1 : 0),
    baseComments,
  };
  switch (era.post.layout) {
    case 'bulletin':
      return <Bulletin c={c} />;
    case 'wall':
      return <Wall c={c} />;
    case 'media-first':
      return <MediaFirst c={c} />;
    case 'machine':
      return <Machine c={c} />;
    default:
      return <Classic c={c} />;
  }
}

export const FlowPost = memo(FlowPostInner);
