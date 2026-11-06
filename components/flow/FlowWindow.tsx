'use client';
/**
 * The browser window the site lives in: tab strip, toolbar, address bar.
 *
 * The same chrome draws the live window (around the real feed) and the
 * static windows in every other session of the reveal, so they read as the
 * same browser. During the reveal the live window shows an AGENT badge and
 * a glow (`[data-agent='on']`, see flow.css).
 *
 * The window has no frame of its own: the chrome and the site run edge to
 * edge, and the outline and depth come from `WINDOW_SHADOW`.
 */
import type { CSSProperties } from 'react';
import { WINDOW } from '@/lib/flow/camera';
import { Icon } from './icons';

const UI = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const STRIP = '#dfe3e8';
const TAB_H = 40;
const TOOLBAR_H = WINDOW.chrome - TAB_H;

/** Hairline outline plus a soft, layered drop shadow. */
export const WINDOW_SHADOW =
  '0 0 0 1px rgba(0,0,0,.14), 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.10), 0 32px 80px rgba(0,0,0,.18)';

/** The concave corner where the active tab meets the toolbar. */
function TabFoot({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className="absolute bottom-0 size-[10px]"
      style={{
        [side]: -10,
        background: `radial-gradient(circle at ${side === 'left' ? '0 0' : '100% 0'}, transparent 9.5px, #fff 10px)`,
      }}
    />
  );
}

export function WindowChrome({ title, url, style }: { title: string; url: string; style?: CSSProperties }) {
  const secure = url.startsWith('https');
  const [scheme, rest] = url.split('://');
  return (
    <div className="absolute inset-x-0 top-0 select-none" style={{ height: WINDOW.chrome, fontFamily: UI, ...style }}>
      {/* Tab strip */}
      <div className="flex items-end pl-4 pr-3" style={{ height: TAB_H, background: STRIP }}>
        <span className="mb-[14px] mr-5 flex gap-2">
          <span className="size-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_.5px_rgba(0,0,0,.18)]" />
          <span className="size-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_.5px_rgba(0,0,0,.18)]" />
          <span className="size-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_.5px_rgba(0,0,0,.18)]" />
        </span>
        <span className="relative flex h-[32px] w-[240px] items-center gap-2 rounded-t-[10px] bg-white pl-3 pr-2 text-[12.5px] text-[#1f1f1f]">
          <TabFoot side="left" />
          <span className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-[#1f1f1f] text-[9px] font-bold text-white">f</span>
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <span className="grid size-5 place-items-center rounded-full text-[#5f6368]">
            <Icon name="close" size={11} />
          </span>
          <TabFoot side="right" />
        </span>
        <span className="mb-[8px] ml-3 grid size-6 place-items-center rounded-full text-[#5f6368]">
          <Icon name="plus" size={15} />
        </span>
      </div>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 bg-white px-2 text-[#5f6368] shadow-[inset_0_-1px_0_#e3e5e8]"
        style={{ height: TOOLBAR_H }}
      >
        <span className="grid size-7 place-items-center">
          <Icon name="back" size={16} />
        </span>
        <span className="grid size-7 place-items-center opacity-40">
          <Icon name="forward" size={16} />
        </span>
        <span className="grid size-7 place-items-center">
          <Icon name="reload" size={15} />
        </span>
        <span className="mx-1 flex h-[28px] min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f1f3f4] px-3 text-[13px] text-[#1f1f1f]">
          <span className={secure ? 'text-[#5f6368]' : 'text-[#c5221f]'}>
            <Icon name="lock" size={12} />
          </span>
          {!secure && <span className="text-[11px] font-medium text-[#c5221f]">Not secure</span>}
          <span className="truncate">
            <span className="text-[#5f6368]">{scheme}://</span>
            {rest}
          </span>
        </span>
        <span className="fl-agent-badge mr-1 rounded bg-[#7c5cff] px-1.5 py-[1px] text-[10px] font-bold tracking-wide text-white">AGENT</span>
        <span aria-hidden className="mx-1 size-[22px] rounded-full bg-gradient-to-br from-[#a5b4fc] to-[#f0abfc] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" />
        <span className="grid size-7 place-items-center">
          <Icon name="kebab" size={16} />
        </span>
      </div>
    </div>
  );
}
