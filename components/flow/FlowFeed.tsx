'use client';
/**
 * Every era shares one continuous scroll surface, drawn in place: the next
 * era is already there below the fold as the feed scrolls into it, so the
 * hand-off never shows a blank stretch or pops content in. Eras that haven't
 * started yet (and the endless tail before the reveal) stay inert and hidden
 * from assistive tech.
 */
import { Fragment, memo } from 'react';
import { FILM_ERAS as FLOW_ERAS, FILM_POSTS as FLOW_POSTS } from '@/data/flow/scenes';
import { OPPORTUNITY_FACES } from '@/data/flow/images';
import { OPPORTUNITY_FOLLOWUPS } from '@/data/flow/posts';
import type { EraTokens, FlowEra, FlowEraId } from '@/data/flow/types';
import type { FlowEffects } from '@/lib/flow/timeline';
import { FlowPost } from './FlowPost';
import { OpportunityReactions } from './OpportunityUi';
import { Icon } from './icons';
import { Avatar, eraStyle, MediaBox } from './parts';

export interface FlowFeedProps {
  activeEra: FlowEraId;
  revealing: boolean;
  tokens: ReadonlyMap<FlowEraId, EraTokens>;
  wire: boolean;
  guides: boolean;
  effects: FlowEffects;
  typing: { postId: string; text: string } | null;
}

const NEIGHBOR_POSTS = [
  { name: 'Mike Chen', meta: '24 min · Public', body: 'Opened this app to check one thing. Forty minutes later, I still haven’t checked it. Anyway, how’s everyone’s Sunday? 😂', likes: 24, comments: 7 },
  { name: 'Jess Morgan', meta: '38 min · Friends', body: 'Soup on the stove, rain on the windows. Officially cancelling every plan I didn’t want to make in the first place 🍂', likes: 18, comments: 3 },
  { name: 'Olivia Brown', meta: 'Suggested for you · 1h', body: 'A little reminder: you don’t have to have it all figured out today. Keep showing up. Your future self will thank you 💛', likes: 238, comments: 24 },
  { name: 'Emma Johnson', meta: '52 min · Friends', body: 'Does anyone have a good book recommendation? Something I can’t put down. My screen time is getting embarrassing 📚', likes: 31, comments: 12 },
];

function NeighborPost({ index, wire }: { index: number; wire: boolean }) {
  const post = NEIGHBOR_POSTS[index % NEIGHBOR_POSTS.length];
  return (
    <article className="fl-neighbor-post">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <Avatar author={{ name: post.name, face: OPPORTUNITY_FACES[post.name] }} size={40} shape="circle" wire={wire} />
        <div className="min-w-0 flex-1 leading-tight"><div className="font-semibold">{post.name}</div><div className="mt-1 text-[12px] text-[#656b75]">{post.meta}</div></div>
        <Icon name="more" size={20} />
      </header>
      <p className="px-4 pb-3 leading-relaxed">{post.body}</p>
      <OpportunityReactions likes={post.likes} comments={post.comments} />
      <div className="fl-neighbor-actions">{(['like', 'comment', 'share'] as const).map((name) => <span key={name}><Icon name={name} size={19} />{name[0].toUpperCase() + name.slice(1)}</span>)}</div>
    </article>
  );
}

/**
 * Memoised so an era change only re-renders the section it reaches, and a
 * keystroke only the section being typed in: a full-feed render at either
 * moment drops frames right as the feed glides.
 */
const EraSection = memo(function EraSection({
  era,
  tokens,
  wire,
  guides,
  effects,
  typing,
  reached,
}: Omit<FlowFeedProps, 'tokens' | 'revealing' | 'activeEra'> & { era: FlowEra; tokens: EraTokens; reached: boolean }) {
  const posts = FLOW_POSTS[era.id];
  const column = !!tokens.column;
  return (
    <section
      data-flow-era={era.id}
      aria-hidden={!reached}
      inert={!reached}
      className="fl-era relative"
      style={{ ...eraStyle(tokens), paddingTop: 12 }}
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
        {posts.map((post, index) => {
          const waiting = era.id === 'dead' && index > 0 && !effects.posted.has(`${post.id}:publish`) && !effects.focused.has(`${post.id}:publish`);
          return (
            <Fragment key={post.id}>
              <div className="relative" data-opportunity-slot={era.id === 'dead' ? post.id : undefined}>
                {era.id === 'dead' && index > 0 && (
                  <div className="fl-neighbor-placeholder" aria-hidden={!waiting} style={{ visibility: waiting ? 'visible' : 'hidden' }}>
                    {Array.from({ length: 6 }, (_, n) => <NeighborPost key={n} index={index + n} wire={wire} />)}
                  </div>
                )}
                <FlowPost
                  post={post}
                  era={era}
                  tokens={tokens}
                  wire={wire}
                  published={effects.posted.has(`${post.id}:publish`)}
                  publishingActive={effects.focused.has(`${post.id}:publish`)}
                  publishing={typing?.postId === `${post.id}:publish` ? typing.text : undefined}
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
              </div>
              {era.id === 'dead' && index < posts.length - 1 && <NeighborPost index={index} wire={wire} />}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
});

/** Repeating bot posts after the real feed: the feed never actually ends. */
const EndlessTail = memo(function EndlessTail({ tokens, wire, reached }: { tokens: EraTokens; wire: boolean; reached: boolean }) {
  const names = ['Sarah Mitchell', 'Emma Johnson', 'Mike Chen', 'Jess Morgan', 'Olivia Brown', 'Sarah Mitchell'];
  const pitches = [...OPPORTUNITY_FOLLOWUPS, FLOW_POSTS.dead[2].body].map((text) => text.replaceAll('I AM IN', 'YES'));
  // Enough outreach to sustain machine-speed scrolling throughout the pullback.
  const leads = Array.from({ length: 96 }, (_, i) => names[i % names.length]);
  return (
    <div data-flow-tail aria-hidden={!reached} inert={!reached} className="fl-era pt-2" style={eraStyle(tokens)}>
      {leads.map((name, i) => i % 5 === 4 ? <NeighborPost key={`neighbor-${i}`} index={i} wire={wire} /> : (
        <div
          key={`${name}-${i}`}
          className="mb-3 overflow-hidden"
          style={{ background: 'var(--f-surface)', borderRadius: 'var(--f-radius)', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}
        >
          <div className="flex items-center gap-2 p-3">
            <Avatar author={{ name: 'Ashley Parker', face: 'ashley-daybreak' }} size={40} shape="circle" wire={wire} />
            <div className="leading-tight">
              <div className="font-bold">Ashley Parker</div>
              <div style={{ fontSize: 12, color: 'var(--f-muted)' }}>Just now · Public</div>
            </div>
          </div>
          <div className="whitespace-pre-line px-3 pb-2">{pitches[i % pitches.length]}</div>
          {i % 3 === 0 && <MediaBox media={{ kind: 'product', aspect: 1.5, src: i % 2 ? '/assets/posts/daybreak-training.jpg' : '/assets/posts/daybreak-invitation-yes.png', note: 'Daybreak campaign creative' }} wire={wire} />}
          <OpportunityReactions likes={2341 + i * 37} comments={412 + i * 11} shares={86 + i * 3} />
          <div className="fl-neighbor-actions">{(['like', 'comment', 'share'] as const).map((action) => <span key={action}><Icon name={action} size={19} />{action[0].toUpperCase() + action.slice(1)}</span>)}</div>
          <div className="mx-3 my-2 rounded-lg bg-[#f0f2f5] p-3 text-[13px]">
            <div className="mb-1 flex items-center gap-2"><Avatar author={{ name, face: OPPORTUNITY_FACES[name] }} size={24} shape="circle" wire={wire} /><strong>{name}</strong> · YES</div>
            <span className="text-[#0866ff]">Ashley Parker</span> · Sent! Check your inbox 💛
          </div>
        </div>
      ))}
    </div>
  );
});

function FlowFeedInner(props: FlowFeedProps) {
  const last = FLOW_ERAS[FLOW_ERAS.length - 1];
  const active = FLOW_ERAS.findIndex((item) => item.id === props.activeEra);
  // Typing ids are `<post>` or `<post>:<publish|message>`.
  const typingPost = props.typing?.postId.split(':')[0];
  return (
    <div data-flow-content className="relative px-0 pb-24 will-change-transform">
      {FLOW_ERAS.map((era, k) => (
        <EraSection
          key={era.id}
          era={era}
          reached={k <= active}
          tokens={props.tokens.get(era.id) ?? era.tokens}
          wire={props.wire}
          guides={props.guides}
          effects={props.effects}
          typing={typingPost && FLOW_POSTS[era.id].some((post) => post.id === typingPost) ? props.typing : null}
        />
      ))}
      <EndlessTail tokens={props.tokens.get(last.id) ?? last.tokens} wire={props.wire} reached={props.revealing} />
    </div>
  );
}

export const FlowFeed = memo(FlowFeedInner);
