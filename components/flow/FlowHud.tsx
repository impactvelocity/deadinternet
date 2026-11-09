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
import { memo, useState, type Ref } from 'react';
import { FLOW_ERAS } from '@/data/flow/eras';
import { composition, FLOW_POSTS } from '@/data/flow/posts';
import type { Timeline } from '@/lib/flow/timeline';

export const HUD_HEIGHT = 56;

export interface FlowHudProps {
  browserWidth: number;
  readingNotes: boolean;
  timeline: Timeline | null;
  era: number;
  beatLabel: string;
  playing: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
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
      aria-pressed={on}
      className={`rounded px-2 py-1 transition-colors ${on ? 'bg-white/90 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

export const FlowHud = memo(function FlowHud(props: FlowHudProps) {
  const { timeline: t, era, beatLabel, playing, speed, guides, wire, cursor, playheadRef, readoutRef, onPlay, onSpeed, onSeek, onToggle } = props;
  const [devOpen, setDevOpen] = useState(false);
  const total = t?.total ?? 1;
  const pct = (s: number) => `${(s / total) * 100}%`;
  const current = FLOW_ERAS[era];
  const revealing = beatLabel.includes('reveal:');

  return (
    <>
      <div className="fl-player" style={{ height: HUD_HEIGHT, width: props.browserWidth }}>
        <button type="button" onClick={onPlay} className="fl-player-play" aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (space)">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            {playing ? <path d="M4 3h3v10H4zm5 0h3v10H9z" /> : <path d="M5 2.5 13 8l-8 5.5z" />}
          </svg>
        </button>
        <button
          type="button"
          className="fl-player-voice"
          aria-label="Ashley narration"
          aria-pressed={props.voiceEnabled}
          title={props.voiceEnabled ? 'Turn narration off' : 'Turn narration on'}
          onClick={props.onToggleVoice}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {props.voiceEnabled ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 6 6m0-6-6 6" />}
          </svg>
        </button>
        <div className="fl-player-story">
          <div className="fl-player-caption">
            <span>{revealing ? 'Behind the feed' : current.label}</span>
            <span className="fl-player-year">{revealing || current.id === 'machine' ? '—' : current.year}</span>
          </div>
          <div
            className="fl-player-track"
            role="slider"
            aria-label="Story progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const r = e.currentTarget.getBoundingClientRect();
              onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total);
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              const r = e.currentTarget.getBoundingClientRect();
              onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total);
            }}
            onKeyDown={(e) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              e.stopPropagation();
              const value = Number(e.currentTarget.getAttribute('aria-valuenow') ?? 0) / 100;
              onSeek((e.key === 'Home' ? 0 : e.key === 'End' ? 1 : Math.max(0, Math.min(1, value + (e.key === 'ArrowRight' ? .01 : -.01)))) * total);
            }}
          >
            <div className="fl-player-rail">
              {t && [...FLOW_ERAS.map((e, k) => ({
                id: e.id,
                label: `${e.year} · ${e.label}`,
                start: t.eraStarts[k],
                end: t.eraStarts[k + 1] ?? t.revealStart,
                active: !revealing && k === era,
              })), {
                id: 'reveal', label: 'Behind the feed',
                start: t.revealStart, end: t.total, active: revealing,
              }].map((segment, index, segments) => (
                <span
                  key={segment.id}
                  className="fl-player-segment"
                  data-active={segment.active}
                  style={{ left: pct(segment.start), width: pct(segment.end - segment.start) }}
                >
                  <span className="fl-player-segment-fill" />
                  <span className="fl-player-tooltip" style={index === 0 ? { left: 0, transform: 'none' } : index === segments.length - 1 ? { left: 'auto', right: 0, transform: 'none' } : undefined}>
                    {segment.label}
                  </span>
                </span>
              ))}
              <div ref={playheadRef} className="fl-player-head" style={{ left: 0 }} />
            </div>
          </div>
        </div>
        <button type="button" onClick={onSpeed} title="Playback speed" aria-label={`Playback speed: ${speed} times. Change speed`} className="fl-player-speed">{speed}×</button>
      </div>

      <button type="button" className="fl-dev-button" style={{ visibility: props.readingNotes ? 'hidden' : undefined }} aria-label="Developer controls" aria-expanded={devOpen} aria-controls="flow-dev-panel" onClick={() => setDevOpen((v) => !v)}>
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18" />
        </svg>
      </button>
      <div id="flow-dev-panel" className="fl-dev-panel" hidden={!devOpen || props.readingNotes}>
        <div className="mb-4 flex items-center justify-between text-[12px]">
          <span className="font-semibold text-white">Developer controls</span>
          <button type="button" aria-label="Close developer controls" onClick={() => setDevOpen(false)} className="px-2 py-1 text-white/60">✕</button>
        </div>
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
        <div  className="pointer-events-none absolute -top-[2px] bottom-0 w-[2px] bg-white shadow-[0_0_6px_white]" style={{ display: 'none' }} />
      </div>

        <div className="my-4 flex gap-2 text-[11px] text-white/60">
          <span ref={readoutRef} className="tabular-nums" />
          <span className="truncate">{beatLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Toggle on={guides} label="Guides" k="G" onClick={() => onToggle('guides')} />
          <Toggle on={wire} label="Wireframe" k="W" onClick={() => onToggle('wire')} />
          <Toggle on={cursor} label="Cursor" k="C" onClick={() => onToggle('cursor')} />
          <button type="button" onClick={() => onToggle('hud')} className="px-2 py-1 text-white/60">Hide controls</button>
        </div>
        <p className="mt-4 text-[11px] text-white/65">[ / ] era · , / . action · H show / hide controls</p>
      </div>
    </>
  );
});
