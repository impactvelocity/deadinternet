'use client';
/**
 * The continuous feed: one section per era, each styled by its own era, so
 * older styles stay above newer ones as you scroll. Each section ends with
 * that era's "load more" idiom, and the feed ends in an endless tail of bot
 * posts that keeps scrolling during the reveal.
 */
import { memo } from 'react';
import { FLOW_ERAS } from '@/data/flow/eras';
import { TAIL_IMAGES } from '@/data/flow/images';
import { FLOW_POSTS } from '@/data/flow/posts';
import type { EraTokens, FlowEra, FlowEraId, LoaderIdiom } from '@/data/flow/types';
import type { FlowEffects } from '@/lib/flow/timeline';
import { FlowPost } from './FlowPost';
import { Avatar, eraStyle, MediaBox } from './parts';

export interface FlowFeedProps {
  tokens: ReadonlyMap<FlowEraId, EraTokens>;
  wire: boolean;
  guides: boolean;
  effects: FlowEffects;
  typing: { postId: string; text: string } | null;
}

function Loader({ idiom }: { idiom: LoaderIdiom }) {
  const small = { fontSize: 'calc(var(--f-size) - 1px)' };
  switch (idiom) {
    case 'pager':
      return (
        <div className="py-3 text-center" style={{ ...small, color: 'var(--f-accent)' }}>
          « Prev | <b>1</b> 2 3 4 5 … 41 | Next »
        </div>
      );
    case 'older':
      return (
        <div className="my-3 px-2 py-2 text-center font-bold" style={{ ...small, background: 'var(--f-soft)', color: 'var(--f-accent)' }}>
          Older Posts
        </div>
      );
    case 'more':
      return (
        <div className="py-3 text-center" style={{ ...small, color: 'var(--f-accent)', background: 'var(--f-column)' }}>
          Load more posts
        </div>
      );
    case 'spinner':
      return (
        <div className="grid place-items-center py-5">
          <span className="fl-spin size-6 rounded-full" style={{ border: '3px solid var(--f-line)', borderTopColor: 'var(--f-accent)' }} />
        </div>
      );
    case 'skeleton':
      return (
        <div className="space-y-2 pb-4">
          {[0, 1].map((i) => (
            <div key={i} className="fl-shimmer flex gap-3 p-3" style={{ background: 'var(--f-surface)', borderRadius: 'var(--f-radius)' }}>
              <span className="size-10 rounded-full" style={{ background: 'var(--f-line)' }} />
              <span className="flex flex-1 flex-col gap-2 pt-1">
                <span className="h-2.5 w-1/3 rounded" style={{ background: 'var(--f-line)' }} />
                <span className="h-2.5 w-2/3 rounded" style={{ background: 'var(--f-line)' }} />
              </span>
            </div>
          ))}
        </div>
      );
    default:
      return <div className="h-4" />;
  }
}

function EraSection({
  era,
  tokens,
  wire,
  guides,
  effects,
  typing,
}: Omit<FlowFeedProps, 'tokens'> & { era: FlowEra; tokens: EraTokens }) {
  const posts = FLOW_POSTS[era.id];
  const column = !!tokens.column;
  return (
    <section
      data-flow-era={era.id}
      className="fl-era relative"
      style={{ ...eraStyle(tokens), paddingTop: 20 }}
    >
      <div
        aria-hidden
        className="fl-guide-tag absolute left-0 right-0 top-1 flex items-center gap-2"
        style={{ opacity: guides ? 1 : 0 }}
      >
        <span className="h-px flex-1 border-t border-dashed border-fuchsia-500/70" />
        <span className="rounded-sm bg-fuchsia-600 px-1.5 py-[1px] font-mono text-[10px] text-white">
          {era.year} · {era.label} — accents: {era.reference}
        </span>
        <span className="h-px flex-1 border-t border-dashed border-fuchsia-500/70" />
      </div>
      <div style={column ? { background: 'var(--f-column)' } : undefined}>
        {posts.map((post) => (
          <FlowPost
            key={post.id}
            post={post}
            era={era}
            tokens={tokens}
            wire={wire}
            liked={effects.liked.has(post.id)}
            heart={effects.hearts.has(post.id)}
            palette={effects.palettes.has(post.id)}
            picked={effects.picks.get(post.id)}
            reaction={effects.reactions.get(post.id)}
            focused={effects.focused.has(post.id)}
            posted={effects.posted.get(post.id)}
            shared={effects.shared.has(post.id)}
            cta={effects.cta.has(post.id)}
            watching={effects.watching.has(post.id)}
            watched={effects.watched.has(post.id)}
            typing={typing?.postId === post.id ? typing.text : undefined}
          />
        ))}
      </div>
      <Loader idiom={era.loader} />
    </section>
  );
}

/** Repeating bot posts after the real feed: the feed never actually ends. */
function EndlessTail({ tokens, wire }: { tokens: EraTokens; wire: boolean }) {
  const names = ['Grateful Hearts', 'Sarah Mitchell', 'Nature Is Amazing', 'Emma Johnson', 'Amen Daily 🙏', 'Olivia Brown'];
  return (
    <div data-flow-tail className="fl-era pt-2" style={eraStyle(tokens)}>
      {names.map((name, i) => (
        <div
          key={name}
          className="mb-3 overflow-hidden"
          style={{ background: 'var(--f-surface)', borderRadius: 'var(--f-radius)', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}
        >
          <div className="flex items-center gap-2 p-3">
            <Avatar author={{ name, face: i % 2 ? 'stock-f1' : 'amen-bot' }} size={40} shape="circle" wire={wire} />
            <div className="leading-tight">
              <div className="font-bold">{name}</div>
              <div style={{ fontSize: 12, color: 'var(--f-muted)' }}>Suggested for you · 1m</div>
            </div>
          </div>
          <div className="px-3 pb-2">Grateful for this beautiful day 🌅 What are you grateful for?</div>
          {i % 2 === 0 && (
            <MediaBox media={{ aspect: 1.6, note: 'generated, regenerated, regenerated', kind: 'ai', src: TAIL_IMAGES[i / 2] }} wire={wire} />
          )}
          <div className="px-3 py-2" style={{ fontSize: 13, color: 'var(--f-muted)' }}>
            👍❤️ 2.3K · 412 comments
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowFeedInner(props: FlowFeedProps) {
  const last = FLOW_ERAS[FLOW_ERAS.length - 1];
  return (
    <div data-flow-content className="relative px-0 pb-24 will-change-transform">
      {FLOW_ERAS.map((era) => (
        <EraSection
          key={era.id}
          era={era}
          tokens={props.tokens.get(era.id) ?? era.tokens}
          wire={props.wire}
          guides={props.guides}
          effects={props.effects}
          typing={props.typing}
        />
      ))}
      <EndlessTail tokens={props.tokens.get(last.id) ?? last.tokens} wire={props.wire} />
    </div>
  );
}

export const FlowFeed = memo(FlowFeedInner);
