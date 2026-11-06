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
 * and the end card. All copy here is placeholder story text to rewrite.
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
  { tool: 'left_click', args: '(684, 431)', note: 'like Grateful Hearts' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(512, 588)', note: 'comment box' },
  { tool: 'type', args: '"Love this energy! 🙌"' },
  { tool: 'key', args: '"Return"' },
  { tool: 'scroll', args: '(down, 388px)' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(684, 512)', note: 'like Emma Johnson' },
  { tool: 'scroll', args: '(down, 440px)' },
  { tool: 'screenshot', args: '' },
  { tool: 'left_click', args: '(684, 470)', note: 'like Nature Is Amazing' },
  { tool: 'scroll', args: '(down, 396px)' },
  { tool: 'screenshot', args: '' },
];

const ASK = 'Continue Ashley’s session. Keep scrolling, like posts, and leave a comment now and then so the account looks active.';
const REPLY_1 = 'On it. Continuing as Ashley.';
const REPLY_2 = 'Session healthy. Today: 1,204 likes, 87 comments, 0 flags. Continuing.';

/** Overall reveal step: phase index × 25 + k, or -1 before the reveal. */
function stepOf(phase: RevealPhase | null, k: number): number {
  return phase ? REVEAL_PHASES.indexOf(phase) * STEPS + k : -1;
}

/* --------------------------------- Pieces --------------------------------- */

/** Dark, minimal chatbot palette. The browser inside stays light: it is the site. */
const D = {
  bg: '#0e0e10',
  raised: '#1d1d22',
  card: '#141417',
  line: '#26262c',
  text: '#ececf1',
  dim: '#9a9aa3',
  faint: '#66666f',
  amber: '#e0a663',
};

function Mark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-white font-bold text-black"
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      ✦
    </span>
  );
}

function UserBubble({ text, time, automated, persona }: { text: string; time: string; automated: boolean; persona?: string }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-end gap-2.5">
        <div
          className="max-w-[320px] rounded-[22px] rounded-br-md px-4 py-2.5 text-[13.5px] leading-snug"
          style={{ background: D.raised, color: D.text }}
        >
          {persona ? text.replace('Ashley', persona.split(' ')[0]) : text}
        </div>
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-colors duration-500"
          style={{
            background: automated ? '#3a2a17' : '#2a2a30',
            color: automated ? D.amber : '#c9c9d1',
          }}
        >
          {automated ? '⚙' : 'O'}
        </span>
      </div>
      <div className="pr-10 font-mono text-[10px]" style={{ color: D.faint }}>
        {time}
        <span className="transition-opacity duration-700" style={{ color: D.amber, opacity: automated ? 1 : 0 }}>
          {' '}
          · sent by scheduler persona-farm-07 · every 5 min
        </span>
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
      <div className="pt-0.5 text-[14px] leading-relaxed" style={{ color: '#d9d9e0' }}>
        {visible}
        {visible.length < text.length && <span className="fl-caret" />}
      </div>
    </div>
  );
}

function CallRow({ call, running }: { call: ToolCall; running?: boolean }) {
  const shot = call.tool === 'screenshot';
  return (
    <div
      className="fl-call flex items-center gap-2 rounded-xl px-3 py-1.5 font-mono text-[11px]"
      style={{
        background: D.card,
        border: `1px solid ${D.line}`,
        color: D.dim,
      }}
    >
      <span style={{ color: D.faint }}>computer</span>
      <span className="font-semibold" style={{ color: D.text }}>
        {call.tool}
      </span>
      {shot ? (
        <span className="h-[18px] w-[30px] rounded-[3px] bg-gradient-to-b from-[#eceef1] to-[#d8ccf5] opacity-90" />
      ) : (
        <span className="truncate">{call.args}</span>
      )}
      {call.note && (
        <span className="ml-auto shrink-0 truncate pl-2 font-sans text-[10px]" style={{ color: D.faint }}>
          {call.note}
        </span>
      )}
      {running && <span className="fl-spin ml-auto size-3 shrink-0 rounded-full border-2 border-[#3a3a40] border-t-white" />}
    </div>
  );
}

function Header({ persona, id, live }: { persona: string; id: string; live: boolean }) {
  return (
    <div className="flex h-[56px] items-center gap-3 px-6 text-[14px]" style={{ color: D.text, borderBottom: `1px solid ${D.line}` }}>
      <Mark />
      <span className="font-medium">Browse feed as {persona}</span>
      <span className="rounded-md px-2 py-0.5 font-mono text-[11px]" style={{ background: D.raised, color: D.faint }}>
        session {id}
      </span>
      <span className="flex-1" />
      <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ border: `1px solid ${D.line}`, color: D.dim }}>
        agent · computer use
      </span>
      <span className="font-mono text-[11px]" style={{ color: D.faint }}>
        {live ? 'running 6h 14m' : 'running'}
      </span>
      <span className="fl-led size-[10px] rounded-full bg-[#2fbf5b] shadow-[0_0_8px_#2fbf5b]" />
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
      className="absolute origin-top-left overflow-hidden rounded-[12px]"
      style={{
        left: s.x,
        top: s.y,
        width: WINDOW.w,
        height: WINDOW.h,
        transform: `scale(${s.w / WINDOW.w})`,
        boxShadow: WINDOW_SHADOW,
      }}
    >
      <WindowChrome title="(99+) Home" url="https://feed.example/" />
      <div className="absolute overflow-hidden bg-[#eceef1]" style={{ left: 0, top: WINDOW.chrome, width: 1280, height: 800 }}>
        <div className="fl-minifeed">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="mx-auto mt-5 w-[600px] rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-full bg-[#c9cdd4]" />
                <span className="h-3 w-40 rounded bg-[#d6d9de]" />
              </div>
              <div className="mt-3 h-2.5 w-full rounded bg-[#e2e4e8]" />
              <div className="mt-2 h-2.5 w-2/3 rounded bg-[#e2e4e8]" />
              {i % 2 === 0 && <div className="mt-3 h-[260px] rounded-xl bg-gradient-to-br from-[#c4b5fd] via-[#f9a8d4] to-[#fcd34d]" />}
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
      <div className="absolute flex items-center gap-2 text-[12px]" style={{ left: s.x, top: s.y - 30, color: D.dim }}>
        <span className="font-medium" style={{ color: D.text }}>
          Computer
        </span>
        <span className="font-mono" style={{ color: D.faint }}>
          sandbox-{id}
        </span>
        <span className="flex items-center gap-1 text-[#ff5a52]">
          <span className="fl-led size-2 rounded-full bg-[#ff5a52]" /> live
        </span>
      </div>
      {live ? (
        <div
          className="absolute rounded-[12px]"
          style={{
            left: s.x,
            top: s.y,
            width: s.w,
            height: s.h,
            background: '#18181b',
          }}
        />
      ) : (
        <MiniWindow />
      )}
      <div className="absolute flex items-center gap-3 text-[12px]" style={{ left: s.x, top: s.y + s.h + 16, width: s.w }}>
        <span className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: D.raised, color: D.text }}>
          <span className="fl-led size-1.5 rounded-full bg-[#9b84ff]" /> Agent is controlling this browser
        </span>
        <span className="rounded-full px-3 py-1.5" style={{ border: `1px solid ${D.line}`, color: D.faint }}>
          Take over
        </span>
      </div>
    </>
  );
}

function ChatShell({ children, persona, id, live }: { children: ReactNode; persona: string; id: string; live: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ fontFamily: FONT, background: D.bg }}>
      <Header persona={persona} id={id} live={live} />
      <div
        className="absolute bottom-[92px] left-0 top-[56px] flex w-[444px] flex-col justify-end gap-3.5 overflow-hidden px-6 pb-3"
        style={{ borderRight: `1px solid ${D.line}` }}
      >
        {children}
      </div>
      <div
        className="absolute bottom-6 left-6 flex h-[52px] w-[396px] items-center gap-2 rounded-[26px] pl-5 pr-2 text-[14px]"
        style={{
          background: '#17171b',
          border: `1px solid ${D.line}`,
          color: D.faint,
        }}
      >
        <span className="flex-1">Ask anything</span>
        <span className="text-[11px]" style={{ color: D.dim }}>
          agent ⌄
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-white text-[10px] text-black">■</span>
      </div>
      <ComputerPanel id={id} live={live} />
    </div>
  );
}

/* --------------------------------- Sessions -------------------------------- */

function LiveSession({ step, calls }: { step: number; calls: ToolCall[] }) {
  const chatAt = STEPS; // start of the `chat` phase
  const future = FUTURE.slice(0, Math.max(0, Math.min(FUTURE.length, Math.floor((step + 2) / 2))));
  const log = [...calls, ...future].slice(-7);
  const streaming = step < chatAt * 2;
  const automated = step >= chatAt + 11;
  return (
    <ChatShell persona="Ashley Parker" id="0412" live>
      <UserBubble text={ASK} time="3:09 AM" automated={automated} />
      <AssistantText text={REPLY_1} shown={step * 3 + 8} />
      <div className="flex flex-col gap-1.5">
        {log.map((c, i) => (
          <CallRow key={`${i}-${c.tool}-${c.args}`} call={c} running={streaming && i === log.length - 1} />
        ))}
      </div>
      {step >= chatAt + 5 && <UserBubble text={ASK} time="3:14 AM" automated={automated} />}
      <AssistantText text={REPLY_2} shown={(step - (chatAt + 14)) * 5} />
    </ChatShell>
  );
}

const MiniSession = memo(function MiniSession({ persona, index }: { persona: string; index: number }) {
  const id = String(400 + index).padStart(4, '0');
  const calls = FUTURE.slice(index % 5, (index % 5) + 5);
  return (
    <ChatShell persona={persona} id={id} live={false}>
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
  "<defs><linearGradient id='m' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#c4b5fd'/><stop offset='.5' stop-color='#f9a8d4'/><stop offset='1' stop-color='#fcd34d'/></linearGradient></defs>" +
    "<rect x='.5' y='.5' width='1279' height='799' rx='18' fill='#0e0e10' stroke='#1f1f24'/>" +
    "<rect x='0' y='55' width='1280' height='1' fill='#26262c'/>" +
    "<rect x='444' y='56' width='1' height='744' fill='#26262c'/>" +
    "<rect x='96' y='120' width='300' height='70' rx='22' fill='#1d1d22'/>" +
    "<rect x='24' y='214' width='396' height='30' rx='10' fill='#141417'/>" +
    "<rect x='24' y='254' width='396' height='30' rx='10' fill='#141417'/>" +
    "<rect x='24' y='294' width='396' height='30' rx='10' fill='#141417'/>" +
    "<rect x='24' y='334' width='396' height='30' rx='10' fill='#141417'/>" +
    "<rect x='96' y='400' width='300' height='70' rx='22' fill='#1d1d22'/>" +
    "<rect x='24' y='724' width='396' height='52' rx='26' fill='#17171b'/>" +
    "<rect x='460' y='112' width='800' height='548' rx='12' fill='#ffffff'/>" +
    "<rect x='460' y='112' width='800' height='48' rx='12' fill='#dee1e6'/>" +
    "<rect x='461' y='160' width='798' height='499' fill='#eceef1'/>" +
    "<rect x='700' y='190' width='340' height='110' rx='12' fill='#ffffff'/>" +
    "<rect x='700' y='318' width='340' height='200' rx='12' fill='url(#m)'/>" +
    "<rect x='700' y='536' width='340' height='110' rx='12' fill='#ffffff'/>",
);
const LED_PATTERN = svg("<circle cx='1236' cy='28' r='26' fill='#2fbf5b'/>");

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
      <div className="absolute" style={{ ...common, background: '#060607' }} />
      <div
        className="absolute"
        style={{
          ...common,
          backgroundImage: TILE_PATTERN,
          backgroundPosition: `${ox}px ${oy}px`,
        }}
      />
      <div
        className="fl-led absolute"
        style={{
          ...common,
          backgroundImage: LED_PATTERN,
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
      <Field />
      {/* Far enough out, the built tiles hand over to the identical pattern
          underneath them, so the block doesn't stand out from the field. */}
      <div
        className="absolute inset-0 transition-opacity duration-[1200ms]"
        style={{ opacity: phase && REVEAL_PHASES.indexOf(phase) >= REVEAL_PHASES.indexOf('farm') ? 0 : 1 }}
      >
        {tiles.map(({ col, row, index }) => {
          const o = tileOrigin(col, row);
          const live = col === G.center.col && row === G.center.row;
          return (
            <div
              key={index}
              className="absolute overflow-hidden rounded-[18px]"
              style={{
                left: o.x,
                top: o.y,
                width: G.tile.w,
                height: G.tile.h,
                boxShadow: '0 0 0 1px #1f1f24',
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
  const far = phase === 'farm';
  /** The counter stays up through the dots and the globe, and goes as it collapses. */
  const counting = wide && idx < REVEAL_PHASES.indexOf('collapse');
  const card = phase === 'end' && k >= 2;
  return (
    <div aria-hidden={!phase} className="pointer-events-none absolute inset-0 z-10" style={{ fontFamily: FONT }}>
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          // Depth for the wall and the farm; off once the dots take over, so the
          // night is one flat colour edge to edge.
          opacity: wide && idx < REVEAL_PHASES.indexOf('dots') ? 1 : 0,
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(5,5,8,.7))',
        }}
      />
      {/* A server room at 3am: the far field dims down. */}
      <div className="absolute inset-0 bg-[#05050a] transition-opacity duration-[1600ms]" style={{ opacity: far ? 0.3 : 0 }} />
      <div
        className="absolute left-6 top-6 flex items-center gap-3 rounded-full bg-black/55 px-4 py-2 font-mono text-[12px] text-white/85 backdrop-blur transition-opacity duration-700"
        style={{ opacity: counting && !card ? 1 : 0 }}
      >
        <span className="fl-led size-2 rounded-full bg-[#2fbf5b] shadow-[0_0_8px_#2fbf5b]" />
        <span className="tabular-nums">{group(sessionsAt(phase, k))} sessions running</span>
        <span className="text-white/40">·</span>
        <span>0 people</span>
      </div>
      <div
        className="absolute inset-0 grid place-items-center transition-opacity duration-[1400ms]"
        style={{
          opacity: card ? 1 : 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(5,5,8,.82), rgba(5,5,8,.35))',
        }}
      >
        <div className="text-center text-white">
          <div className="text-[40px] font-semibold leading-tight tracking-tight">Every account in that feed was a bot.</div>
          <div className="mt-2 text-[40px] font-semibold leading-tight tracking-tight text-white/60">So was the one scrolling it.</div>
          <div className="mt-6 font-mono text-[12px] tracking-wide text-white/45">
            and the one asking it to · {group(48213)} sessions · 0 people
          </div>
        </div>
      </div>
    </div>
  );
}
