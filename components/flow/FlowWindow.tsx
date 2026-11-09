'use client';
/**
 * The browser window the site lives in: floating browser cues above the page.
 *
 * The same chrome draws the live window (around the real feed) and the
 * static windows in every other session of the reveal, so they read as the
 * same browser. During the reveal the live window shows an AGENT badge and
 * a glow (`[data-agent='on']`, see flow.css).
 *
 * The chrome is transparent; only the page surface carries WINDOW_SHADOW.
 */
import type { CSSProperties } from 'react';
import { WINDOW } from '@/lib/flow/camera';
import { Icon } from './icons';

const UI = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Hairline outline plus a soft, layered drop shadow. */
export const WINDOW_SHADOW =
  '0 0 0 1px rgba(0,0,0,.14), 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.10), 0 32px 80px rgba(0,0,0,.18)';

/** Just enough browser framing to establish the scene without competing with it. */
export function WindowChrome({ narration, style }: { narration: string; style?: CSSProperties }) {
  return (
    <div
      className="fl-window-chrome absolute inset-x-0 top-0 flex select-none items-center gap-4 px-3 pb-2 text-[#68616e]"
      style={{ height: WINDOW.chrome, fontFamily: UI, ...style }}
    >
      <span aria-hidden="true" className="flex shrink-0 gap-1.5">
        <span className="size-2 rounded-full bg-[#d78183]" />
        <span className="size-2 rounded-full bg-[#d7b879]" />
        <span className="size-2 rounded-full bg-[#86ad98]" />
      </span>
      <span
        className="fl-window-narration absolute left-1/2 w-[72%] -translate-x-1/2 pb-4 text-center text-[24px] font-medium leading-tight tracking-[-0.015em]"
      >
        <span key={narration} className="fl-narration-in block">{narration}</span>
      </span>
      <span className="fl-agent-badge ml-auto rounded-full bg-[#393343] px-2 py-[2px] text-[10px] font-medium text-[#e1daf6]">Agent active</span>
      <span aria-hidden="true" className="flex items-center gap-3">
        <Icon name="back" size={13} />
        <span className="opacity-40"><Icon name="forward" size={13} /></span>
      </span>
    </div>
  );
}
