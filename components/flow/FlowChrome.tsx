'use client';
/**
 * The pinned pieces around the feed: background, Ashley's chip (top left), what the platform pushes (top right), and the
 * dock (bottom right). There is ONE of each. When the era changes they are
 * not swapped or cross-faded: the same element restyles itself, so colours,
 * borders, corner radius, shadows and padding animate from one era's look
 * to the next (see `.fl-morph` in flow.css), and the content updates in place.
 *
 * Two things are still per era:
 * - each era's pop-up (`overlay`), which only appears as an event;
 * - invisible "measuring ghosts" of each era's top-right card, so the
 *   timeline can measure the buttons the agent clicks in any era up front.
 *   Only ghosts carry `data-t` targets; the visible card has none.
 *
 * No headers or logos: the feed tells the story.
 *
 * Cursor targets: `chrome:<era>:<id>` for top-right buttons,
 * `overlay:<id>:<n>` for pop-up buttons.
 */
import { memo, type CSSProperties, type ReactNode } from 'react';
import { FLOW_ERAS } from '@/data/flow/eras';
import { viewerFor } from '@/data/flow/posts';
import type { CornerModule, DockSpec, EraTokens, FlowEra, FlowEraId, OverlaySpec, Ping, PingKind } from '@/data/flow/types';
import type { FlowEffects, PingSlot } from '@/lib/flow/timeline';
import { Icon, type IconName } from './icons';
import { Avatar, box, eraStyle, MediaBox, SCREEN, SLOTS, type SlotId } from './parts';

const SMALL: CSSProperties = { fontSize: 'calc(var(--f-size) - 1px)' };
const TINY: CSSProperties = { fontSize: 'calc(var(--f-size) - 2px)' };
const MUTED: CSSProperties = { color: 'var(--f-muted)' };
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface ModuleCtx {
  era: FlowEra;
  tokens: EraTokens;
  wire: boolean;
  effects: FlowEffects;
  /** Ghost copies carry the agent's click targets; the visible card does not. */
  targets?: boolean;
}

/* --------------------------------- Frame ---------------------------------- */

type Look = NonNullable<EraTokens['modules']>;

function frameStyle(look: Look, t: EraTokens): CSSProperties {
  switch (look) {
    case 'boxed':
      return { background: 'var(--f-surface)', border: '1px solid var(--f-line)', borderRadius: 0, boxShadow: '0 0 0 transparent' };
    case 'plain':
      return { background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--f-radius)', boxShadow: '0 0 0 transparent' };
    case 'machine':
      return { background: 'rgba(140,182,192,.12)', border: '1px dashed #8c959f', borderRadius: 0, boxShadow: '0 0 0 transparent' };
    default:
      return {
        background: 'var(--f-surface)',
        border: t.shadow ? '1px solid transparent' : '1px solid var(--f-line)',
        borderRadius: 'var(--f-radius)',
        boxShadow: t.shadow ? '0 1px 2px rgba(0,0,0,.1), 0 6px 18px rgba(0,0,0,.06)' : '0 0 0 transparent',
      };
  }
}

function titleStyle(look: Look, t: EraTokens, era: FlowEra): CSSProperties {
  switch (look) {
    case 'boxed':
      return { padding: '3px 6px', fontWeight: 700, background: 'var(--f-panel)', color: 'var(--f-panel-text)' };
    case 'plain':
      return {
        ...SMALL,
        padding: '3px 4px',
        fontWeight: 700,
        color: 'var(--f-panel-text)',
        background: era.year < 2010 ? 'var(--f-panel)' : 'transparent',
      };
    case 'machine':
      return { padding: '4px 8px 0', fontFamily: MONO, fontSize: 10, color: '#8250df', background: 'transparent' };
    default:
      return t.radius < 6
        ? { ...TINY, padding: '10px 12px 0', fontWeight: 700, color: 'var(--f-panel-text)', textTransform: 'uppercase', letterSpacing: '0.03em', background: 'transparent' }
        : { padding: '10px 12px 0', fontWeight: 700, color: 'var(--f-text)', fontSize: 'calc(var(--f-size) + 1px)', background: 'transparent' };
  }
}

const BODY_PAD: Record<Look, string> = { boxed: '6px', plain: '4px', machine: '8px 10px 10px', card: '8px 12px 12px' };

/**
 * The one frame every pinned card uses. Same elements in every era; only
 * their styles change, so the browser animates between looks.
 */
function Frame({ title, ctx, children, tag }: { title?: string; ctx: ModuleCtx; children: ReactNode; tag?: string }) {
  const look: Look = ctx.tokens.modules ?? 'card';
  const machine = look === 'machine';
  const label = machine ? (title ? `section[data-src="${title}"]` : tag) : title;
  return (
    <div className="w-full overflow-hidden" style={frameStyle(look, ctx.tokens)}>
      {label && (
        <div className="truncate" style={titleStyle(look, ctx.tokens, ctx.era)}>
          {label}
        </div>
      )}
      <div style={{ padding: BODY_PAD[look] }}>{children}</div>
    </div>
  );
}

function Button({ label, target, done, ctx }: { label: string; target?: string; done?: boolean; ctx: ModuleCtx }) {
  const filled = ctx.tokens.radius >= 6 || ctx.era.year >= 2014;
  return (
    <span
      data-t={target}
      className={`inline-block min-w-[72px] shrink-0 px-2.5 py-[3px] text-center font-semibold ${done ? 'fl-pop' : ''}`}
      style={{
        ...TINY,
        borderRadius: filled ? 999 : 2,
        border: `1px solid ${done ? 'var(--f-line)' : filled ? 'var(--f-accent)' : '#9aafe5'}`,
        background: done ? 'var(--f-surface)' : filled ? 'var(--f-accent)' : '#eceff6',
        color: done ? 'var(--f-text)' : filled ? 'var(--f-accent-text)' : 'var(--f-accent)',
        transition: 'background .2s, color .2s',
      }}
    >
      {done ? '✓ ' : ''}
      {label}
    </span>
  );
}

/* ----------------------------- Top right card ------------------------------ */

interface Row {
  key: string;
  name: string;
  sub?: string;
  face?: string;
  brand?: boolean;
  avatar: boolean;
  online?: boolean;
  id?: string;
  cta?: string;
  done?: string;
}

/** Every top-right module kind, as the same handful of parts. */
function partsOf(m: CornerModule) {
  let sub: string | undefined;
  let rows: Row[] = [];
  let grid = false;
  let ad: Extract<CornerModule, { kind: 'ad' }> | undefined;
  switch (m.kind) {
    case 'grid':
      sub = m.sub;
      grid = true;
      rows = m.names.map((n, i) => ({ key: String(i), name: n, avatar: true }));
      break;
    case 'people':
      rows = m.items.map((it, i) => ({ key: String(i), name: it.name, sub: it.sub, face: it.face, brand: it.brand, avatar: true, id: it.id, cta: it.cta, done: it.done }));
      break;
    case 'requests':
      rows = m.items.map((it, i) => ({ key: String(i), name: it.label, avatar: false, id: it.id, cta: it.cta, done: it.done }));
      break;
    case 'list':
      rows = m.items.map((it, i) => ({ key: String(i), name: it.label, sub: it.sub, avatar: false }));
      break;
    case 'contacts':
      rows = m.items.map((it, i) => ({ key: String(i), name: it.name, face: it.face, sub: it.status, avatar: true, online: true }));
      break;
    case 'ad':
      sub = m.label;
      ad = m;
      break;
  }
  return { title: m.title, sub, rows, grid, ad };
}

function PlatformCard({ ctx }: { ctx: ModuleCtx }) {
  const { era, tokens, wire, effects } = ctx;
  const { title, sub, rows, grid, ad } = partsOf(era.platform);
  const shape = tokens.avatarShape === 'ring' ? 'circle' : tokens.avatarShape;
  return (
    <div style={box(SLOTS.platform)} className="flex flex-col">
      <Frame ctx={ctx} title={title}>
        {sub && (
          <div className="mb-1.5" style={grid ? { ...TINY, fontWeight: 700, color: '#ff6600' } : { ...TINY, ...MUTED }}>
            {sub}
          </div>
        )}
        {ad && (
          <>
            <MediaBox media={{ aspect: ad.aspect ?? 1.6, note: ad.note, kind: 'product', src: ad.src }} wire={wire} radius={Math.min(tokens.radius, 8)} />
            <div className="mt-1.5 font-bold" style={SMALL}>
              {ad.headline}
            </div>
            {ad.body && <div style={{ ...TINY, ...MUTED }}>{ad.body}</div>}
            {ad.cta && (
              <div className="mt-1.5">
                <Button label={ad.cta} ctx={ctx} />
              </div>
            )}
          </>
        )}
        {rows.length > 0 && (
          <div className={grid ? 'grid grid-cols-4 gap-x-1 gap-y-2' : 'flex flex-col gap-2'}>
            {rows.map((r) => {
              const done = !!r.id && !ctx.targets && effects.chrome.has(`${era.id}:${r.id}`);
              return (
                <div key={r.key} className={grid ? 'flex flex-col items-center gap-0.5 text-center' : 'flex items-center gap-2'} style={SMALL}>
                  {grid && (
                    <span className="max-w-[64px] truncate" style={{ ...TINY, color: 'var(--f-accent)' }}>
                      {r.name}
                    </span>
                  )}
                  {r.avatar && (
                    <span className="relative">
                      <Avatar author={{ name: r.name, face: r.face, brand: r.brand }} size={grid ? 52 : r.online ? 28 : 32} shape={grid ? 'square' : shape} wire={wire} />
                      {r.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 bg-[#31a24c]" style={{ borderColor: 'var(--f-surface)' }} />
                      )}
                    </span>
                  )}
                  {!grid && (
                    <div className="min-w-0 flex-1 leading-tight">
                      <div
                        className={`truncate ${r.avatar ? 'font-semibold' : r.name.startsWith('#') ? 'font-bold' : ''}`}
                        style={!r.avatar && (r.cta || r.name.startsWith('#')) ? { color: 'var(--f-accent)' } : undefined}
                      >
                        {r.name}
                      </div>
                      {r.sub && (
                        <div className="truncate" style={{ ...TINY, ...MUTED }}>
                          {r.sub}
                        </div>
                      )}
                    </div>
                  )}
                  {r.cta && !grid && (
                    <Button
                      label={done ? (r.done ?? r.cta) : r.cta}
                      done={done}
                      target={ctx.targets && r.id ? `chrome:${era.id}:${r.id}` : undefined}
                      ctx={ctx}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Frame>
    </div>
  );
}

/* --------------------------------- You chip -------------------------------- */

const PING_ICON: Record<PingKind, IconName> = { request: 'users', message: 'inbox', alert: 'bell' };
const fmtCount = (n: number) => (n > 99 ? '99+' : String(n));

function Count({ icon, n, machine, label }: { icon: IconName; n: number; machine: boolean; label: string }) {
  return (
    <span className="relative flex items-center gap-1" style={{ color: 'var(--f-text)' }}>
      <Icon name={icon} size={machine ? 14 : 20} />
      <span
        className="text-center font-bold"
        style={
          machine
            ? { fontFamily: MONO, fontSize: 10, color: 'var(--f-text)', background: 'transparent', padding: 0, boxShadow: 'none' }
            : {
                position: 'absolute',
                right: -10,
                top: -6,
                minWidth: 17,
                padding: '0 4px',
                borderRadius: 999,
                fontSize: 10,
                lineHeight: '16px',
                color: '#fff',
                background: n > 0 ? '#e41e3f' : 'transparent',
                opacity: n > 0 ? 1 : 0,
                boxShadow: '0 0 0 2px var(--f-surface)',
              }
        }
      >
        {machine ? `${label}=${n}` : fmtCount(n)}
      </span>
    </span>
  );
}

function Toast({ ping, ctx }: { ping: Ping; ctx: ModuleCtx }) {
  const machine = ctx.tokens.modules === 'machine';
  const scam = ping.tone === 'scam';
  return (
    <div
      className="fl-toast flex w-full items-center gap-2.5 px-2.5 py-2"
      style={{
        ...SMALL,
        background: machine ? '#fff' : 'var(--f-surface)',
        borderRadius: machine ? 0 : Math.max(4, ctx.tokens.radius),
        border: machine ? '1px dashed #8c959f' : '1px solid var(--f-line)',
        boxShadow: machine ? 'none' : '0 6px 20px rgba(0,0,0,.10)',
        color: 'var(--f-text)',
        fontFamily: machine ? MONO : undefined,
      }}
    >
      <span className="relative shrink-0">
        <Avatar
          author={{ name: ping.from, face: ping.face, brand: ping.tone === 'brand' || ping.tone === 'machine' }}
          size={32}
          shape={ctx.tokens.avatarShape === 'ring' ? 'circle' : ctx.tokens.avatarShape}
          wire={ctx.wire}
        />
        <span
          className="absolute -bottom-1 -right-1 grid size-[17px] place-items-center rounded-full text-white"
          style={{ background: scam && !ctx.wire ? '#e41e3f' : 'var(--f-accent)', boxShadow: '0 0 0 2px var(--f-surface)' }}
        >
          <Icon name={PING_ICON[ping.kind]} size={10} />
        </span>
      </span>
      <span className="min-w-0 leading-snug">
        <b>{ping.from}</b> <span style={MUTED}>{ping.text}</span>
      </span>
    </div>
  );
}

function YouChip({ ctx, counts, toasts }: { ctx: ModuleCtx; counts: { messages: number; requests: number; alerts: number }; toasts: Ping[] }) {
  const { era, tokens, wire } = ctx;
  const machine = tokens.modules === 'machine';
  return (
    <div style={box(SLOTS.you)} className="flex flex-col items-start gap-2">
      <div className="max-w-full">
        <Frame ctx={ctx} tag="div.you">
          <div className="flex items-center gap-2.5 pr-2">
            <span className="relative shrink-0">
              <Avatar author={viewerFor(era.year)} size={44} shape={tokens.avatarShape} wire={wire} />
              <span className="fl-m-img absolute inset-0" style={{ opacity: machine ? 1 : 0, transition: 'opacity .6s' }} />
            </span>
            <div className="min-w-0 leading-snug">
              <div className="truncate font-bold" style={{ color: 'var(--f-name)' }}>
                {era.you.name}
              </div>
              {era.you.lines?.map((l, i) => (
                <div key={i} className="truncate" style={{ ...TINY, ...MUTED }}>
                  {l}
                </div>
              ))}
              {era.you.badge && (
                <div className="font-bold italic" style={{ ...TINY, color: '#ff9900' }}>
                  ● {era.you.badge}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 pl-1 pt-2" style={{ borderTop: '1px solid var(--f-line)' }}>
            <Count icon="inbox" label="messages" n={counts.messages} machine={machine} />
            <Count icon="users" label="requests" n={counts.requests} machine={machine} />
            <Count icon="bell" label="alerts" n={counts.alerts} machine={machine} />
          </div>
        </Frame>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {toasts.map((p) => (
          <Toast key={`${p.from}-${p.text}`} ping={p} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Dock ---------------------------------- */

/** One pill for chat bar, messenger heads and the AI assistant. */
function Dock({ spec, ctx }: { spec: DockSpec | undefined; ctx: ModuleCtx }) {
  const kind = spec?.kind;
  const label = !spec ? '' : spec.kind === 'assistant' ? spec.text : spec.label;
  const bar = kind === 'chatbar';
  return (
    <div style={{ ...box(SLOTS.dock), overflow: 'visible' }} className="flex items-end justify-end pr-2">
      <span
        className="flex items-center gap-2 whitespace-nowrap px-3 py-1.5 font-semibold"
        style={{
          ...SMALL,
          opacity: spec ? 1 : 0,
          minWidth: bar ? 210 : 0,
          marginBottom: bar ? 0 : 10,
          background: bar ? 'var(--f-panel)' : 'var(--f-surface)',
          color: 'var(--f-text)',
          border: bar ? '1px solid var(--f-line)' : '1px solid transparent',
          borderRadius: bar ? '4px 4px 0 0' : 999,
          boxShadow: bar ? '0 0 0 transparent' : '0 6px 20px rgba(0,0,0,.14)',
        }}
      >
        {kind === 'chatbar' && <span className="size-2 rounded-full bg-[#31a24c]" />}
        {spec?.kind === 'heads' &&
          spec.names.map((n, i) => (
            <span key={n} style={{ marginLeft: i ? -10 : 0 }}>
              <Avatar author={{ name: n }} size={26} shape="circle" wire={ctx.wire} />
            </span>
          ))}
        {kind === 'assistant' && (
          <span
            className="grid size-6 place-items-center rounded-full text-[11px] text-white"
            style={{ background: ctx.wire ? '#888' : 'conic-gradient(from 200deg, #5b8cff, #b56bff, #ff6fb1, #5b8cff)' }}
          >
            ✦
          </span>
        )}
        {label}
      </span>
    </div>
  );
}

/* -------------------------------- Overlay --------------------------------- */

function Overlay({ spec, ctx }: { spec: OverlaySpec; ctx: ModuleCtx }) {
  const state = ctx.effects.overlays.get(spec.id);
  const visible = !!state && state.state !== 'done';
  const chosen = state?.choice;
  const wrap: CSSProperties = {
    visibility: visible ? 'visible' : 'hidden',
    opacity: visible ? 1 : 0,
    transition: visible ? 'opacity .25s' : 'opacity .2s, visibility 0s .2s',
  };
  const btn = (label: string, i: number, full = false) => {
    const primary = i === spec.primary;
    return (
      <span
        key={i}
        data-t={`overlay:${spec.id}:${i}`}
        className={`inline-block rounded-md px-4 py-2 text-center font-semibold ${full ? 'w-full' : ''} ${chosen === i ? 'fl-pop' : ''}`}
        style={{
          ...SMALL,
          background: primary ? 'var(--f-accent)' : 'var(--f-soft)',
          color: primary ? 'var(--f-accent-text)' : 'var(--f-text)',
          outline: chosen === i ? '3px solid color-mix(in srgb, var(--f-accent) 40%, transparent)' : 'none',
        }}
      >
        {label}
      </span>
    );
  };

  if (spec.kind === 'banner') {
    return (
      <div style={{ ...wrap, position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 }} className="z-30">
        <div className="mx-auto flex h-full w-[1176px] items-center gap-6" style={{ background: 'var(--f-surface)', boxShadow: '0 -4px 24px rgba(0,0,0,.12)', padding: '0 24px' }}>
          <div className="flex-1">
            <div className="font-bold">{spec.title}</div>
            <div style={{ ...SMALL, ...MUTED }}>{spec.body}</div>
          </div>
          {spec.actions.map((a, i) => btn(a, i))}
        </div>
      </div>
    );
  }

  if (spec.kind === 'sheet') {
    return (
      <div style={{ ...wrap, position: 'absolute', inset: 0 }} className="z-30">
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="absolute bottom-0 left-1/2 flex w-[440px] -translate-x-1/2 flex-col gap-2.5 rounded-t-2xl p-6 text-center"
          style={{ background: 'var(--f-panel)', color: 'var(--f-text)' }}
        >
          <div className="text-[18px] font-bold">{spec.title}</div>
          <div style={{ ...SMALL, ...MUTED }}>{spec.body}</div>
          {[...spec.actions].reverse().map((a) => btn(a, spec.actions.indexOf(a), true))}
        </div>
      </div>
    );
  }

  if (spec.kind === 'captcha') {
    const checked = chosen === 0;
    return (
      <div style={{ ...wrap, position: 'absolute', inset: 0 }} className="z-30">
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute left-1/2 top-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5"
          style={{ background: 'var(--f-surface)', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}
        >
          <div className="text-[17px] font-bold">{spec.title}</div>
          <div className="mb-4 mt-1" style={{ ...SMALL, ...MUTED }}>
            {spec.body}
          </div>
          <div className="flex items-center gap-3 rounded-md px-3 py-3.5" style={{ background: '#f9f9f9', border: '1px solid #d3d3d3' }}>
            <span
              data-t={`overlay:${spec.id}:0`}
              className="grid size-7 place-items-center rounded-sm text-[18px] font-bold"
              style={{ border: checked ? '2px solid transparent' : '2px solid #c1c1c1', background: '#fff', color: '#0f9d58' }}
            >
              {checked ? '✓' : ''}
            </span>
            <span className="flex-1 text-[14px] text-black">{spec.actions[0]}</span>
            <span className="text-center text-[9px] leading-tight text-[#555]">
              <span className="block text-[20px] leading-none">⛨</span>
              privacy · terms
            </span>
          </div>
          <div className="mt-4 text-right">{btn(spec.actions[1], 1)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrap, position: 'absolute', inset: 0 }} className="z-30">
      <div className="absolute inset-0 bg-black/45" />
      <div
        className="absolute left-1/2 top-[38%] w-[420px] -translate-x-1/2 -translate-y-1/2 p-5"
        style={{ background: 'var(--f-surface)', borderRadius: Math.max(6, ctx.tokens.radius), boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}
      >
        <div className="text-[18px] font-bold">{spec.title}</div>
        <div className="mt-1.5" style={{ ...SMALL, ...MUTED }}>
          {spec.body}
        </div>
        <div className="mt-5 flex justify-end gap-2">{spec.actions.map((a, i) => btn(a, i))}</div>
      </div>
    </div>
  );
}

/* --------------------------------- Layers --------------------------------- */

export interface ChromeProps {
  active: number;
  tokens: ReadonlyMap<FlowEraId, EraTokens>;
  wire: boolean;
  effects: FlowEffects;
  /** All scheduled notifications, the ones on screen, and how many have arrived. */
  pings: readonly PingSlot[];
  activePings: readonly number[];
  pingsSeen: number;
}

/**
 * The page background below the feed: one surface whose colour animates
 * between eras, plus the two eras that have a texture (2005 wallpaper, the
 * machine's graph paper) fading in and out on it.
 */
export const ChromeBackground = memo(function ChromeBackground({ active, tokens }: Pick<ChromeProps, 'active' | 'tokens'>) {
  const era = FLOW_ERAS[active];
  const t = tokens.get(era.id) ?? era.tokens;
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0" style={{ backgroundColor: t.bg, transition: 'background-color .8s ease' }} />
      {FLOW_ERAS.map((e) => {
        const et = tokens.get(e.id) ?? e.tokens;
        if (!et.background) return null;
        return (
          <div
            key={e.id}
            className="absolute inset-0"
            style={{ background: et.background, opacity: e.id === era.id ? 1 : 0, transition: 'opacity .8s ease' }}
          />
        );
      })}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 95% at 50% 45%, transparent 45%, rgba(0,0,0,.12))' }} />
    </div>
  );
});

/** Date pill, you chip, top-right card and dock (one of each), plus each era's pop-up. */
export const ChromeLayers = memo(function ChromeLayers({ active, tokens, wire, effects, pings, activePings, pingsSeen }: ChromeProps) {
  const era = FLOW_ERAS[active];
  const t = tokens.get(era.id) ?? era.tokens;
  const ctx: ModuleCtx = { era, tokens: t, wire, effects };

  const seen = { request: 0, message: 0, alert: 0 };
  for (let n = 0; n < pingsSeen; n++) {
    const p = pings[n];
    if (p?.era === active) seen[era.pings[p.index].kind]++;
  }
  const counts = {
    messages: era.you.inbox.messages + seen.message,
    requests: era.you.inbox.requests + seen.request,
    alerts: era.you.inbox.alerts + seen.alert,
  };
  const toasts = activePings
    .map((n) => pings[n])
    .filter((p) => p?.era === active)
    .map((p) => era.pings[p.index])
    .reverse();

  return (
    <>
      <div data-flow-chrome="" data-era={era.id} className="fl-era fl-morph pointer-events-none absolute inset-0" style={eraStyle(t)}>
        <YouChip ctx={ctx} counts={counts} toasts={toasts} />
        <PlatformCard ctx={ctx} />
        <Dock spec={era.dock} ctx={ctx} />
      </div>

      {/* Measuring ghosts: every era's top-right card, invisible, so the
          timeline can find the buttons the agent clicks in any era. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ visibility: 'hidden' }}>
        {FLOW_ERAS.map((e) => {
          const et = tokens.get(e.id) ?? e.tokens;
          return (
            <div key={e.id} className="fl-era absolute inset-0" style={eraStyle(et)}>
              <PlatformCard ctx={{ era: e, tokens: et, wire, effects, targets: true }} />
            </div>
          );
        })}
      </div>

      {/* Pop-ups are events, not fixtures: each era's own, shown when it fires. */}
      {FLOW_ERAS.map((e) => {
        if (!e.overlay) return null;
        const et = tokens.get(e.id) ?? e.tokens;
        return (
          <div key={e.id} className="fl-era pointer-events-none absolute inset-0 z-30" style={eraStyle(et)}>
            <Overlay spec={e.overlay} ctx={{ era: e, tokens: et, wire, effects }} />
          </div>
        );
      })}
    </>
  );
});

/* --------------------------------- Guides --------------------------------- */

const SLOT_LABELS: Record<SlotId, string> = {
  you: 'YOU',
  feed: 'FEED',
  platform: 'PLATFORM · what it pushes',
  dock: 'DOCK',
};

export function Guides({ visible, readingLine, focusLine }: { visible: boolean; readingLine: number; focusLine: number }) {
  const feed = SLOTS.feed;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40" style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}>
      {(Object.keys(SLOTS) as SlotId[]).map((k) => (
        <div key={k} style={{ ...box(SLOTS[k]), outline: '1px dashed rgba(217,70,239,.75)', outlineOffset: -1 }}>
          <span className="absolute left-0 top-0 bg-fuchsia-600/90 px-1 font-mono text-[9px] leading-[14px] text-white">{SLOT_LABELS[k]}</span>
        </div>
      ))}
      <div className="absolute border-t border-dashed border-cyan-400" style={{ left: feed.x - 40, width: feed.w + 80, top: feed.y + feed.h * readingLine }}>
        <span className="absolute -top-[14px] right-0 bg-cyan-500 px-1 font-mono text-[9px] leading-[13px] text-white">reading line · eras switch here</span>
      </div>
      <div className="absolute border-t border-dotted border-amber-400" style={{ left: feed.x - 40, width: feed.w + 80, top: feed.y + feed.h * focusLine }}>
        <span className="absolute -top-[14px] right-0 bg-amber-500 px-1 font-mono text-[9px] leading-[13px] text-white">focus line · agent acts here</span>
      </div>
      <div className="absolute bottom-[8px] left-[8px] font-mono text-[9px] leading-tight text-fuchsia-400">
        {SCREEN.w}×{SCREEN.h}
      </div>
    </div>
  );
}
