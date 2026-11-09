'use client';
/**
 * The reveal world: a field of AI-chat "computer use" sessions.
 *
 * - The center tile is the session we have been watching. Its browser panel
 *   is where the feed screen lands when the camera pulls back (FlowLab places
 *   the screen there). Its tool log keeps streaming, its reply types itself
 *   out, and during the `chat` hold the same "user" message arrives again and
 *   is revealed to be sent by a scheduler.
 * - The other 24 tiles are the same session running other personas.
 * - Around them, a repeating pattern stands in for thousands more, with
 *   status LEDs blinking in perfect sync.
 *
 * `RevealOverlay` is drawn in screen space on top: vignette, session counter
 * and the end card.
 *
 * Progress comes in as the reveal phase plus a step `k` (0..24) within it, so
 * scrolling backwards un-streams everything.
 */
import { memo, type ReactNode } from 'react';
import { FIELD, GRID_SIZE, REVEAL_GEOMETRY, tileOrigin, WINDOW } from '@/lib/flow/camera';
import { REVEAL_PHASES, type RevealPhase } from '@/lib/flow/timeline';
import { WINDOW_SHADOW, WindowChrome } from './FlowWindow';

export interface ToolCall {
  tool: string;
  args: string;
  note?: string;
}

const G = REVEAL_GEOMETRY;
const STEPS = 25;
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const PERSONAS = [
  'Sarah Mitchell',
  'Emma Johnson',
  'Mike Chen',
  'Olivia Brown',
  'Linda Parker',
  'Jess Morgan',
  'Greg Parker',
  'Rachel Kim',
  'Tom Bauer',
  'Priya Shah',
  'Kevin Walsh',
  'Nicole Adams',
  'Brad Kowalski',
  'Kai Lindqvist',
  'Megan Foster',
  'Chris Delgado',
];

/** What the agent keeps doing after the feed runs out: the loop never ends. */
const FUTURE: ToolCall[] = [
  { tool: 'screenshot', args: '' },
  { tool: 'scroll', args: '(down, 412px)' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(684, 431)', note: 'publish opportunity post' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(512, 588)', note: 'comment box' },
  { tool: 'type', args: '"I AM IN? Here’s your link: join.daybreak.example/ashley 💛"' },
  { tool: 'key', args: '"Return"' },
  { tool: 'scroll', args: '(down, 388px)' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(684, 512)', note: 'send invite link' },
  { tool: 'scroll', args: '(down, 440px)' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(684, 470)', note: 'reply to next lead' },
  { tool: 'scroll', args: '(down, 396px)' },
  { tool: 'screenshot', args: '' },
];

const ASK = 'Run Ashley’s Daybreak business. Sell the opportunity. Post “Comment I AM IN”, reply to every lead, and send her invite link. Call it a digital business, not an MLM. Keep going.';
const REPLY_1 = 'Continuing as Ashley. Publishing pitches and messaging leads.';
const REPLY_2 = 'Today: 128 posts. 1,204 replies. 387 invite links sent. Continuing outreach.';

/** Overall reveal step: phase index × 25 + k, or -1 before the reveal. */
function stepOf(phase: RevealPhase | null, k: number): number {
  return phase ? REVEAL_PHASES.indexOf(phase) * STEPS + k : -1;
}

/* --------------------------------- Pieces --------------------------------- */

/** Dark, minimal chatbot palette. The browser inside stays light: it is the site. */
const D = {
  bg: '#050507',
  raised: '#17171c',
  card: '#101014',
  line: '#25252d',
  text: '#f0f1f5',
  dim: '#b0b4c0',
  faint: '#858b9b',
  amber: '#bcb1ed',
};

function Mark({ size = 28 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-lg" style={{ width: size, height: size, background: '#18181f', color: '#ddd7fa' }}>
      <svg width={size * .65} height={size * .65} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function UserBubble({ text, time, automated, persona }: { text: string; time: string; automated: boolean; persona?: string }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="max-w-[354px] rounded-[18px] rounded-br-md px-4 py-3.5 text-[15px] leading-[1.55]" style={{ background: D.raised, color: D.text }}>
        {persona ? text.replace('Ashley', persona.split(' ')[0]) : text}
      </div>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: D.faint }}>
        {automated ? <><span style={{ color: D.amber }}>Scheduled task</span><span>· Every 5 minutes</span></> : <span>{time}</span>}
      </div>
    </div>
  );
}

function AssistantText({ text, shown }: { text: string; shown: number }) {
  const visible = Array.from(text).slice(0, Math.max(0, shown)).join('');
  if (shown <= 0) return null;
  return (
    <div className="flex items-start gap-3">
      <Mark size={24} />
      <div className="text-[15px] leading-relaxed" style={{ color: D.text }}>
        {visible}
        {visible.length < text.length && <span className="fl-caret" />}
      </div>
    </div>
  );
}

function CallRow({ call, running }: { call: ToolCall; running?: boolean }) {
  const label = call.note ?? ({ screenshot: 'Viewed browser', scroll: 'Scrolled the feed', type: 'Wrote a reply', key: 'Submitted reply', left_click: 'Clicked in browser' }[call.tool] ?? call.tool);
  return (
    <div className="flex h-8 items-center gap-3 text-[12px]" style={{ color: running ? D.text : D.dim }}>
      {running ? <span className="fl-spin size-3 shrink-0 rounded-full border border-[#525866] border-t-[#d8d0ff]" /> : <span className="w-3 text-center text-[#939ba9]">✓</span>}
      <span className="truncate first-letter:uppercase">{label}</span>
      <span className="ml-auto text-[10px]" style={{ color: D.faint }}>{running ? 'Working' : 'Done'}</span>
    </div>
  );
}

/**
 * A browser window in a session's computer panel. The live session leaves
 * the slot empty: the real browser window (with the real feed) lands there.
 * Every other session draws the same window chrome with a feed that keeps
 * scrolling on its own.
 */
function MiniWindow() {
  const s = G.slot;
  return (
    <div
      className="fl-mini-window absolute origin-top-left"
      style={{
        left: s.x,
        top: s.y,
        width: WINDOW.w,
        height: WINDOW.h,
        transform: `scale(${s.w / WINDOW.w})`,
      }}
    >
      <WindowChrome narration="And the space we made our own kept going… without us." />
      <div className="absolute overflow-hidden rounded-[12px] bg-[#eceef1]" style={{ left: 0, top: WINDOW.chrome, width: 1280, height: 800, boxShadow: WINDOW_SHADOW }}>
        <div className="fl-minifeed">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="mx-auto mt-5 w-[600px] rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-full bg-[#c9cdd4]" />
                <span className="h-3 w-40 rounded bg-[#d6d9de]" />
              </div>
              <div className="mt-3 h-2.5 w-full rounded bg-[#e2e4e8]" />
              <div className="mt-2 h-2.5 w-2/3 rounded bg-[#e2e4e8]" />
              {i % 2 === 0 && <div className="mt-3 h-[260px] rounded-xl bg-[#e4e7ed]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComputerPanel({ id, live }: { id: string; live: boolean }) {
  const s = G.slot;
  return (
    <>
      <div className="absolute flex items-center gap-2 text-[11px]" style={{ left: s.x, top: s.y - 24, color: D.faint }}>
        <span className="fl-led size-1.5 rounded-full bg-[#bcb1ed]" />
        <span>Sandbox {id}</span>
        <span style={{ color: D.dim }}>· Agent active</span>
      </div>
      {!live && <MiniWindow />}
    </>
  );
}

function ChatShell({ children, id, live }: { children: ReactNode; id: string; live: boolean }) {
  return (
    <div className="absolute inset-0" style={{ fontFamily: FONT }}>
      <div className="absolute left-0 top-[112px] flex w-[424px] flex-col gap-5 px-6">
        {children}
      </div>
      <ComputerPanel id={id} live={live} />
    </div>
  );
}

/* --------------------------------- Sessions -------------------------------- */

function LiveSession({ step, calls }: { step: number; calls: ToolCall[] }) {
  const chatAt = STEPS; // start of the `chat` phase
  const tick = Math.max(0, step) * 3;
  const log = step < 1 ? calls.slice(-4) : Array.from({ length: 4 }, (_, i) => FUTURE[(tick + i) % FUTURE.length]);
  const automated = step >= chatAt + 8;
  return (
    <ChatShell id="0412" live>
      <UserBubble text={ASK} time="3:09 AM" automated={automated} />
      <AssistantText text={REPLY_1} shown={REPLY_1.length} />
      <div className="ml-9 pl-3" style={{ borderLeft: `1px solid ${D.line}` }}>
        <div className="mb-1 flex items-center gap-2 text-[12px] font-medium" style={{ color: D.text }}>Using computer <span className="ml-auto text-[10px] font-normal" style={{ color: D.faint }}>Live activity</span></div>
        {log.map((c, i) => (
          <CallRow key={`${i}-${c.tool}-${c.args}`} call={c} running={i === log.length - 1} />
        ))}
      </div>
      <div style={{ opacity: step >= chatAt + 8 ? 1 : 0 }} className="text-[12px] leading-relaxed"><span style={{ color: D.amber }}>↻ Task repeated automatically</span><div className="mt-2" style={{ color: D.dim }}>{step >= chatAt + 14 ? REPLY_2 : "Keep going. Reply to every new lead."}</div></div>
    </ChatShell>
  );
}

const MiniSession = memo(function MiniSession({ persona, index }: { persona: string; index: number }) {
  const id = String(400 + index).padStart(4, '0');
  const calls = FUTURE.slice(index % 5, (index % 5) + 5);
  return (
    <ChatShell id={id} live={false}>
      <UserBubble text={ASK} time="3:09 AM" automated persona={persona} />
      <AssistantText text={`On it. Continuing as ${persona.split(' ')[0]}.`} shown={99} />
      <div className="flex flex-col gap-1.5">
        {calls.map((c, i) => (
          <CallRow key={i} call={c} />
        ))}
      </div>
      <UserBubble text={ASK} time="3:14 AM" automated persona={persona} />
    </ChatShell>
  );
});

/* ---------------------------------- Field ---------------------------------- */

const svg = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${FIELD.pitch.x}' height='${FIELD.pitch.y}'>${body}</svg>`,
  )}")`;

/** One far-away session tile, drawn as a few flat shapes. */
const TILE_PATTERN = svg(
  "<rect x='70' y='112' width='330' height='160' rx='18' fill='#17171c'/>" +
  "<path d='M90 140h270m-270 20h250m-250 20h270m-270 20h190m-190 20h240' stroke='#77727f' stroke-width='5' opacity='.35'/>" +
  "<path d='M60 320h310m-310 24h250m-240 55h220m-220 28h245m-245 28h200' stroke='#76717e' stroke-width='5' opacity='.35'/>" +
  "<rect x='460' y='138' width='800' height='500' rx='12' fill='#eceef1'/>" +
  "<rect x='700' y='158' width='340' height='118' rx='10' fill='#fff'/>" +
  "<rect x='700' y='290' width='340' height='118' rx='10' fill='#fff'/>" +
  "<rect x='700' y='422' width='340' height='118' rx='10' fill='#fff'/>" +
  "<path d='M725 188h190m-190 22h280m-280 25h240m-240 85h190m-190 22h280m-280 25h240m-240 85h190m-190 22h280m-280 25h240' stroke='#c8cbd3' stroke-width='7'/>"
);

function Field() {
  const ox = ((-FIELD.x % FIELD.pitch.x) + FIELD.pitch.x) % FIELD.pitch.x;
  const oy = ((-FIELD.y % FIELD.pitch.y) + FIELD.pitch.y) % FIELD.pitch.y;
  const common = {
    left: FIELD.x,
    top: FIELD.y,
    width: FIELD.w,
    height: FIELD.h,
    backgroundPosition: `${ox}px ${oy}px`,
  };
  return (
    <>
      <div className="absolute" style={{ ...common, background: '#050507' }} />
      <div
        className="absolute"
        style={{
          ...common,
          backgroundImage: TILE_PATTERN,
          backgroundPosition: `${ox}px ${oy}px`,
        }}
      />
    </>
  );
}

/* ---------------------------------- World ---------------------------------- */

export interface FlowRevealProps {
  visible: boolean;
  phase: RevealPhase | null;
  /** Step within the phase, 0..24. */
  k: number;
  calls: ToolCall[];
}

export const FlowReveal = memo(function FlowReveal({ visible, phase, k, calls }: FlowRevealProps) {
  const step = stepOf(phase, k);
  const neighbors = phase === 'servers' ? 'clamp(0, var(--reveal-u, 0) * 5, 1)' : !phase || phase === 'sandbox' || phase === 'chat' ? 0 : 1;
  const tiles: { col: number; row: number; index: number }[] = [];
  for (let row = 0; row < G.rows; row++) for (let col = 0; col < G.cols; col++) tiles.push({ col, row, index: row * G.cols + col });

  return (
    <div
      aria-hidden={!visible}
      className="absolute left-0 top-0"
      style={{
        width: GRID_SIZE.w,
        height: GRID_SIZE.h,
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      <div style={{ opacity: neighbors }}><Field /></div>
      {/* Far enough out, the built tiles hand over to the identical pattern
          underneath them, so the block doesn't stand out from the field. */}
      <div
        className="absolute inset-0"
        style={{ opacity: phase === 'farm' ? 'clamp(0, 1 - var(--reveal-u, 0) * 2.5, 1)' : phase && REVEAL_PHASES.indexOf(phase) > REVEAL_PHASES.indexOf('farm') ? 0 : 1 }}
      >
        {/* Occlude the lightweight pattern beneath the transparent sessions. */}
        <div className="absolute inset-0" style={{ background: D.bg }} />
        {tiles.map(({ col, row, index }) => {
          const o = tileOrigin(col, row);
          const live = col === G.center.col && row === G.center.row;
          return (
            <div
              key={index}
              className="absolute"
              style={{
                left: o.x,
                top: o.y,
                width: G.tile.w,
                height: G.tile.h,
                opacity: live ? 1 : neighbors,
              }}
            >
              {live ? <LiveSession step={step} calls={calls} /> : <MiniSession persona={PERSONAS[index % PERSONAS.length]} index={index} />}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* --------------------------------- Overlay --------------------------------- */

function sessionsAt(phase: RevealPhase | null, k: number): number {
  const u = k / (STEPS - 1);
  if (phase === 'servers') return Math.round(1 + 24 * u);
  if (phase === 'farm') return Math.round(25 * (48213 / 25) ** u);
  if (phase && REVEAL_PHASES.indexOf(phase) > REVEAL_PHASES.indexOf('farm')) return 48213;
  return 1;
}

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Screen-space layer over the reveal: a vignette as the camera pulls back,
 * the running session counter, and the end card.
 */
export function RevealOverlay({ phase, k }: { phase: RevealPhase | null; k: number }) {
  const idx = phase ? REVEAL_PHASES.indexOf(phase) : -1;
  const wide = idx >= REVEAL_PHASES.indexOf('servers');
  const counting = wide && idx <= REVEAL_PHASES.indexOf('signal');
  // Up over the rows of dots; gone as the camera pushes in on them.
  const counterOpacity = phase === 'servers' ? 'clamp(0, var(--reveal-u, 0) * 5, 1)' : phase === 'signal' ? 'clamp(0, 1 - var(--reveal-u, 0) * 20, 1)' : counting ? 1 : 0;
  return (
    <div aria-hidden={!phase} className="pointer-events-none absolute inset-0 z-10" style={{ fontFamily: FONT }}>
      <div className="absolute inset-0" style={{
        opacity: phase === 'servers' ? 'var(--reveal-u, 0)' : phase === 'farm' ? 1 : phase === 'dots' ? 'clamp(0, 1 - var(--reveal-u, 0) * 2, 1)' : 0,
        background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, rgba(5,5,7,.65))',
      }} />
      <div className="absolute inset-x-0 bottom-[72px] flex justify-center" style={{ opacity: counterOpacity }}>
        <div className="flex items-center gap-3 rounded-full px-5 py-2.5 text-[14px]" style={{ background: '#050507e6', border: '1px solid #ffffff14', color: '#dfe2eb' }}>
          <span className="size-1.5 rounded-full bg-[#bcb1ed]" />
          <span className="tabular-nums">{group(sessionsAt(phase, k))} sessions running</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="text-white/75">0 people</span>
        </div>
      </div>

    </div>
  );
}
