'use client';
/**
 * Lab controls for /flow: play/pause and speed, a timeline of eras and agent
 * actions you can click to seek, the current beat, and view toggles.
 *
 * Keys: space play · [ ] prev/next era · , . prev/next action ·
 * G guides · W wire · C cursor · H hide this bar.
 *
 * Under each era, a thin bar shows who is posting in it: people, brands and
 * pages, bots. That bar is the story arc; tune it in `data/flow/posts.ts`.
 */
import { memo, type Ref } from 'react';
import { FLOW_ERAS } from '@/data/flow/eras';
import { composition, FLOW_POSTS } from '@/data/flow/posts';
import type { Timeline } from '@/lib/flow/timeline';

export const HUD_HEIGHT = 56;

export interface FlowHudProps {
  timeline: Timeline | null;
  era: number;
  beatLabel: string;
  playing: boolean;
  speed: number;
  guides: boolean;
  wire: boolean;
  cursor: boolean;
  playheadRef: Ref<HTMLDivElement>;
  readoutRef: Ref<HTMLSpanElement>;
  onPlay: () => void;
  onSpeed: () => void;
  onSeek: (s: number) => void;
  onToggle: (key: 'guides' | 'wire' | 'cursor' | 'hud') => void;
}

/** Who posts in each era, as fractions: the story arc at a glance. */
const ARC = FLOW_ERAS.map((e) => {
  const c = composition(FLOW_POSTS[e.id]);
  const n = c.person + c.brand + c.bot || 1;
  return { ...c, n, label: `${c.person} people · ${c.brand} brands/pages · ${c.bot} bots` };
});

const ACTION_COLOR: Record<string, string> = {
  like: '#f472b6',
  react: '#fb923c',
  comment: '#60a5fa',
  overlay: '#facc15',
  chrome: '#a78bfa',
  cta: '#f87171',
  watch: '#34d399',
  read: '#9ca3af',
  share: '#2dd4bf',
};

function Toggle({ on, label, k, onClick }: { on: boolean; label: string; k: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${k})`}
      className={`rounded px-2 py-1 transition-colors ${on ? 'bg-white/90 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

export const FlowHud = memo(function FlowHud(props: FlowHudProps) {
  const { timeline: t, era, beatLabel, playing, speed, guides, wire, cursor, playheadRef, readoutRef, onPlay, onSpeed, onSeek, onToggle } = props;
  const total = t?.total ?? 1;
  const pct = (s: number) => `${(s / total) * 100}%`;
  const current = FLOW_ERAS[era];

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#141416]/85 px-3 font-mono text-[11px] text-white/80 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-xl"
      style={{ height: HUD_HEIGHT, width: 'min(1040px, calc(100vw - 32px))' }}
    >
      <button
        type="button"
        onClick={onPlay}
        title="Play / pause (space)"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[12px] text-black"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button type="button" onClick={onSpeed} title="Autoplay speed" className="w-9 shrink-0 rounded bg-white/5 py-1 text-center hover:bg-white/10">
        {speed}×
      </button>

      {/* Timeline */}
      <div
        className="relative h-[30px] min-w-0 flex-1 cursor-pointer select-none"
        onPointerDown={(e) => {
          if (!t) return;
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * t.total);
        }}
      >
        {t &&
          FLOW_ERAS.map((e, k) => {
            const s0 = t.eraStarts[k];
            const s1 = k + 1 < FLOW_ERAS.length ? t.eraStarts[k + 1] : t.revealStart;
            return (
              <div
                key={e.id}
                title={`${e.year} · ${e.label} (accents: ${e.reference})`}
                className="absolute top-0 h-[14px] overflow-hidden border-r border-black/60 px-1 text-[9px] leading-[14px]"
                style={{
                  left: pct(s0),
                  width: pct(s1 - s0),
                  background: k === era ? e.tokens.accent : `color-mix(in srgb, ${e.tokens.accent} 45%, #222)`,
                  color: '#fff',
                }}
              >
                {e.year}
              </div>
            );
          })}
        {t &&
          FLOW_ERAS.map((e, k) => {
            const s0 = t.eraStarts[k];
            const s1 = k + 1 < FLOW_ERAS.length ? t.eraStarts[k + 1] : t.revealStart;
            const a = ARC[k];
            return (
              <div
                key={`arc-${e.id}`}
                title={`${e.year}: ${a.label}`}
                className="absolute top-[16px] flex h-[3px] overflow-hidden"
                style={{ left: pct(s0), width: pct(s1 - s0) }}
              >
                <span style={{ flex: a.person, background: '#4ade80' }} />
                <span style={{ flex: a.brand, background: '#a3a3a3' }} />
                <span style={{ flex: a.bot, background: '#f43f5e' }} />
              </div>
            );
          })}
        {t && (
          <div
            title="Reveal: sandbox → servers"
            className="absolute top-0 h-[14px] px-1 text-[9px] leading-[14px] text-white"
            style={{ left: pct(t.revealStart), width: pct(t.total - t.revealStart), background: 'linear-gradient(90deg, #3b3b46, #7c3aed)' }}
          >
            reveal
          </div>
        )}
        {t?.beats.map((b, i) =>
          b.kind === 'act' ? (
            <span
              key={i}
              title={b.label}
              className="absolute top-[21px] h-[8px] w-[2px] rounded-sm"
              style={{ left: pct(b.s0), background: ACTION_COLOR[b.action.type] ?? '#fff' }}
            />
          ) : null,
        )}
        <div ref={playheadRef} className="pointer-events-none absolute -top-[2px] bottom-0 w-[2px] bg-white shadow-[0_0_6px_white]" style={{ left: 0 }} />
      </div>

      <div className="w-[300px] shrink-0 leading-tight">
        <div className="truncate text-white">
          {current.year} · {current.label} <span className="text-white/40">— {current.reference}</span>
        </div>
        <div className="flex gap-2 truncate text-white/50">
          <span ref={readoutRef} className="w-[54px] shrink-0 tabular-nums" />
          <span className="truncate">{beatLabel}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Toggle on={guides} label="Guides" k="G" onClick={() => onToggle('guides')} />
        <Toggle on={wire} label="Wire" k="W" onClick={() => onToggle('wire')} />
        <Toggle on={cursor} label="Cursor" k="C" onClick={() => onToggle('cursor')} />
        <button type="button" title="Hide lab bar (H)" onClick={() => onToggle('hud')} className="rounded px-2 py-1 text-white/50 hover:bg-white/10">
          ⌄
        </button>
      </div>
    </div>
  );
});
