'use client';
/**
 * The page around the browser window: a soft gradient behind the window that
 * shifts colour with each era, and a full-width header at the top of the
 * viewport with the logo, the era name in the middle and links. Clicking the
 * era name opens a full-height drawer about what was happening online.
 *
 * All of this fades away when the reveal starts, leaving the browser window
 * to shrink into the AI chat it was really running in.
 *
 * Era drawer copy is draft context to fact-check before shipping.
 */
import type { CSSProperties } from 'react';
import { FILM_ERAS as FLOW_ERAS } from '@/data/flow/scenes';
import narration from '@/data/flow/narration.json';
import type { FlowEra } from '@/data/flow/types';
import { Icon } from './icons';

/** Header height in real (unscaled) px. The page is fitted below it. */
export const HEADER_H = 56;
const INK = '#1f1d1a';
const UI = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

function eraTitle(era: FlowEra) {
  return era.id === 'machine' ? 'The machine' : `${era.year} · ${era.label}`;
}

/**
 * The page behind the browser window, filling the viewport. Its colours are
 * registered custom properties (`.fl-backdrop` in flow.css), so moving to the
 * next era eases from one gradient to the next. Over it, the sandbox's own
 * black fades in with the story (`--page-dark`, lib/flow/darkness.ts).
 */
export function PageBackdrop({ era }: { era: FlowEra }) {
  const b = era.backdrop;
  return (
    <div
      aria-hidden
      className="fl-backdrop absolute inset-0"
      style={{ '--bd-base': b.base, '--bd-glow': b.glow, '--bd-glow2': b.glow2, opacity: 'var(--page-o, 1)' } as CSSProperties}
    >
      <div className="fl-backdrop-dark absolute inset-0" />
    </div>
  );
}

/** The dead-internet mark: a globe with its edge cut off by an ×. */
function BrandMark({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20.4 8.8A9 9 0 1 0 20.4 15.2M3 12h12M12 3c-4 4.5-4 13.5 0 18M12 3c2.2 2.5 3.2 5.5 3.2 9S14.2 18.5 12 21" />
      <path d="M19 10l4 4m0-4-4 4" />
    </svg>
  );
}

/**
 * The closing title, centred over the last screen of dots. Its opacity
 * (`--title-o`) is set every frame by the lab from story position
 * (lib/flow/ending.ts); it only takes clicks once it's showing.
 */
export function EndTitle() {
  return (
    <section className="fl-end-title" aria-label="Dead Internet: credits">
      <BrandMark size={34} />
      <h2>Dead Internet</h2>
      <p className="fl-end-credit">Short film by Dylan Jones for Kiroween</p>
      <p className="fl-end-date">2026 — the year the internet died</p>
      <nav className="fl-end-links" aria-label="Links">
        <a href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">
          <Icon name="globe" size={15} />
          hidylanjones.com
        </a>
        <a href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">
          <Icon name="code" size={15} />
          Kiroween on Devpost
        </a>
      </nav>
    </section>
  );
}

/** The full-width header pinned to the top of the viewport, at real size. */
export function PageHeader({
  era,
  drawerOpen,
  onToggleDrawer,
  interactive,
}: {
  era: FlowEra;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  interactive: boolean;
}) {
  return (
    <header
      className="fl-page-header absolute inset-x-0 top-0 z-30"
      inert={!interactive}
      style={
        {
          height: HEADER_H,
          fontFamily: UI,
          opacity: 'var(--page-o, 1)',
          pointerEvents: interactive ? 'auto' : 'none',
        } as CSSProperties
      }
    >
      <a href="#top" className="fl-brand" aria-label="Dead internet — back to beginning">
        <BrandMark size={19} />
        <span>dead internet</span>
      </a>

      <button
        type="button"
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        aria-controls="era-drawer"
        className="fl-era-button flex items-center rounded-lg px-2.5 py-2 leading-tight transition-colors hover:bg-black/5"
      >
        <span key={era.id} className="fl-date-in flex items-center gap-1.5 text-[14px] font-medium">
          {eraTitle(era)}
          <Icon name="chevron" size={12} style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
        </span>
      </button>

      <div className="fl-header-credits">
        <span>built by <a href="https://hidylanjones.com/" target="_blank" rel="noopener noreferrer">Dylan</a></span>
        <span aria-hidden="true" className="fl-credit-divider">|</span>
        <a href="https://kiroween.devpost.com/" target="_blank" rel="noopener noreferrer">Kiroween</a>
      </div>
    </header>
  );
}

/**
 * The era drawer: what was happening online, with jumps to the eras either
 * side. Full viewport height, over the header, at real size.
 */
export function EraDrawer({
  era,
  index,
  open,
  onClose,
  onJump,
}: {
  era: FlowEra;
  index: number;
  open: boolean;
  onClose: () => void;
  onJump: (index: number) => void;
}) {
  const prev = FLOW_ERAS[index - 1];
  const next = FLOW_ERAS[index + 1];
  return (
    <div className="absolute inset-0 z-40" style={{ pointerEvents: open ? 'auto' : 'none', fontFamily: UI, color: INK }}>
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="era-drawer"
        aria-hidden={!open}
        inert={!open}
        className="absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col bg-[#fbfaf7] shadow-[-20px_0_60px_rgba(0,0,0,.15)] transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(105%)' }}
      >
        <div className="flex items-center justify-between px-8 pt-7 text-[12px] text-[#625d56]">
          <span className="font-mono uppercase tracking-wider">
            Era {index + 1} of {FLOW_ERAS.length}
          </span>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
          <div className="font-mono text-[14px] text-[#625d56]">{era.id === 'machine' ? '—' : era.year}</div>
          <h2 className="mt-1 text-[34px] font-semibold leading-tight tracking-tight">{era.label}</h2>
          <div className="mt-1 text-[14px] text-[#625d56]">Looks like: {era.reference}</div>
          <p className="mt-6 text-[16px] leading-relaxed">{era.context.summary}</p>
          <details className="mt-5 text-[14px] leading-relaxed">
            <summary className="cursor-pointer font-medium">Ashley’s narration · transcript</summary>
            <p className="mt-2">{narration.chunks.find((chunk) => chunk.era === era.id)?.text}</p>
          </details>
          <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-wider text-[#625d56]">What was happening</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {era.context.points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: INK }} />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-black/10 px-8 pb-[104px] pt-5 text-[13px]">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onJump(index - 1)}
            className="rounded-xl border border-black/10 px-3 py-2.5 text-left hover:bg-black/5 disabled:opacity-30"
          >
            <div className="text-[#625d56]">← Previous</div>
            <div className="truncate font-semibold">{prev ? eraTitle(prev) : '—'}</div>
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onJump(index + 1)}
            className="rounded-xl border border-black/10 px-3 py-2.5 text-right hover:bg-black/5 disabled:opacity-30"
          >
            <div className="text-[#625d56]">Next →</div>
            <div className="truncate font-semibold">{next ? eraTitle(next) : '—'}</div>
          </button>
        </div>
      </aside>
    </div>
  );
}
