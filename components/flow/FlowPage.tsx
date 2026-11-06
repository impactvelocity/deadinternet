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
 * Logo, links and drawer copy are placeholders to replace.
 */
import type { CSSProperties } from 'react';
import { FLOW_ERAS } from '@/data/flow/eras';
import type { FlowEra } from '@/data/flow/types';
import { Icon } from './icons';

/** Header height in real (unscaled) px. The page is fitted below it. */
export const HEADER_H = 56;
const INK = '#1f1d1a';
const UI = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const LINKS = [
  { label: 'About', href: '#about' },
  { label: 'The hackathon', href: '#hackathon' },
  { label: 'Team', href: '#team' },
  { label: 'Source ↗', href: '#source' },
];

function eraTitle(era: FlowEra) {
  return era.id === 'machine' ? 'The machine' : `${era.year} · ${era.label}`;
}

/**
 * The page behind the browser window, filling the viewport. Its colours are
 * registered custom properties (`.fl-backdrop` in flow.css), so moving to the
 * next era eases from one gradient to the next.
 */
export function PageBackdrop({ era }: { era: FlowEra }) {
  const b = era.backdrop;
  return (
    <div
      aria-hidden
      className="fl-backdrop absolute inset-0"
      style={{ '--bd-base': b.base, '--bd-glow': b.glow, '--bd-glow2': b.glow2, opacity: 'var(--page-o, 1)' } as CSSProperties}
    />
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
      className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6"
      style={
        {
          height: HEADER_H,
          color: INK,
          fontFamily: UI,
          opacity: 'var(--page-o, 1)',
          pointerEvents: interactive ? 'auto' : 'none',
        } as CSSProperties
      }
    >
      <a href="#top" className="flex items-center gap-2 text-[18px] font-bold tracking-tight">
        <span aria-hidden className="text-[22px] leading-none">
          ◐
        </span>
        dead internet
      </a>

      <button
        type="button"
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        aria-controls="era-drawer"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-xl px-4 py-1.5 leading-tight transition-colors hover:bg-black/5"
      >
        <span key={era.id} className="fl-date-in flex items-center gap-1.5 text-[16px] font-semibold">
          {eraTitle(era)}
          <Icon name="chevron" size={16} style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
        </span>
      </button>

      <nav className="flex items-center gap-6 text-[14px] text-[#5b5750]">
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} className="hover:text-[#1f1d1a] hover:underline">
            {l.label}
          </a>
        ))}
      </nav>
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
        className="absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col bg-[#fbfaf7] shadow-[-20px_0_60px_rgba(0,0,0,.15)] transition-transform duration-300 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(105%)' }}
      >
        <div className="flex items-center justify-between px-8 pt-7 text-[12px] text-[#7a756c]">
          <span className="font-mono uppercase tracking-wider">
            Era {index + 1} of {FLOW_ERAS.length}
          </span>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
          <div className="font-mono text-[14px] text-[#7a756c]">{era.id === 'machine' ? '—' : era.year}</div>
          <h2 className="mt-1 text-[34px] font-semibold leading-tight tracking-tight">{era.label}</h2>
          <div className="mt-1 text-[14px] text-[#7a756c]">Looks like: {era.reference}</div>
          <p className="mt-6 text-[16px] leading-relaxed">{era.context.summary}</p>
          <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-wider text-[#7a756c]">What was happening</h3>
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
            <div className="text-[#7a756c]">← Previous</div>
            <div className="truncate font-semibold">{prev ? eraTitle(prev) : '—'}</div>
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onJump(index + 1)}
            className="rounded-xl border border-black/10 px-3 py-2.5 text-right hover:bg-black/5 disabled:opacity-30"
          >
            <div className="text-[#7a756c]">Next →</div>
            <div className="truncate font-semibold">{next ? eraTitle(next) : '—'}</div>
          </button>
        </div>
      </aside>
    </div>
  );
}
