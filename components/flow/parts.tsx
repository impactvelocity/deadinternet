/**
 * Shared building blocks for the /flow lab: era tokens as CSS variables,
 * avatar and media placeholders, number formatting, and slot geometry.
 */
import type { CSSProperties, ReactNode } from 'react';
import { faceImage } from '@/data/flow/images';
import type { EraTokens, FlowAuthor, FlowMedia } from '@/data/flow/types';
import { Icon } from './icons';
import { PostVideo } from './PostVideo';

/* --------------------------------- Geometry -------------------------------- */

/** The page ("screen") is designed at a fixed size and scaled to fit. */
export const SCREEN = { w: 1280, h: 800 } as const;

export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fixed positions. Eras restyle what sits here, they never move it. The feed
 * runs the full height; everything else is small and pinned.
 */
export const SLOTS = {
  you: { x: 24, y: 24, w: 240, h: 200 },
  feed: { x: 340, y: 0, w: 600, h: 800 },
  platform: { x: 1016, y: 24, w: 240, h: 640 },
  dock: { x: 968, y: 760, w: 300, h: 40 },
} as const satisfies Record<string, SlotRect>;

export type SlotId = keyof typeof SLOTS;

export const box = (r: { x: number; y: number; w: number; h: number }): CSSProperties => ({
  position: 'absolute',
  left: r.x,
  top: r.y,
  width: r.w,
  height: r.h,
});

/* --------------------------------- Tokens ---------------------------------- */

export function eraStyle(t: EraTokens): CSSProperties {
  const vars: Record<string, string> = {
    '--f-font': t.font,
    '--f-size': `${t.size}px`,
    '--f-bg': t.bg,
    '--f-surface': t.surface,
    '--f-column': t.column ?? 'transparent',
    '--f-panel': t.panel,
    '--f-panel-text': t.panelText,
    '--f-text': t.text,
    '--f-name': t.name ?? t.text,
    '--f-muted': t.muted,
    '--f-accent': t.accent,
    '--f-accent-text': t.accentText,
    '--f-line': t.line,
    '--f-soft': t.soft,
    '--f-radius': `${t.radius}px`,
    '--f-pad': `${t.pad}px`,
    '--f-gap': `${t.gap}px`,
    '--f-avatar': `${t.avatar}px`,
  };
  return vars as CSSProperties;
}

/* --------------------------------- Numbers --------------------------------- */

export function compact(n: number): string {
  const trim = (v: string) => v.replace(/\.0$/, '');
  if (n >= 1e6) return `${trim((n / 1e6).toFixed(n >= 1e7 ? 0 : 1))}M`;
  if (n >= 1e3) return `${trim((n / 1e3).toFixed(n >= 1e4 ? 0 : 1))}K`;
  return String(n);
}

/** Thousands separators without depending on the runtime locale. */
export function full(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* --------------------------------- Avatars --------------------------------- */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hueOf(key: string): number {
  return hashString(key) % 360;
}

export interface AvatarProps {
  author: FlowAuthor;
  size: number;
  shape: EraTokens['avatarShape'];
  wire?: boolean;
  className?: string;
}

const HAIR = ['#2b1d16', '#4a3123', '#7a5232', '#b88a4e', '#1c1c1f', '#8f4a2c', '#d9c3a0'];

/**
 * A profile picture. Authors listed in `FACE_IMAGES` get their real photo;
 * everyone else gets a placeholder: a head-and-shoulders figure whose skin,
 * hair and clothing come from the face key. Bots that share a face look
 * identical under different names. Brands get a monogram. Wireframe mode
 * always draws the placeholder.
 */
export function Avatar({ author, size, shape, wire, className }: AvatarProps) {
  const key = author.face ?? author.name;
  const hash = hashString(key);
  const h = hash % 360;
  const photo = wire ? undefined : faceImage(author);
  const radius = shape === 'circle' || shape === 'ring' ? '50%' : shape === 'rounded' ? Math.round(size * 0.14) : Math.max(0, Math.round(size * 0.04));

  let inner: ReactNode;
  if (wire) {
    inner = (
      <>
        <span className="absolute rounded-full" style={{ width: '38%', height: '38%', left: '31%', top: '20%', background: '#b8b8b8' }} />
        <span className="absolute rounded-[50%]" style={{ width: '80%', height: '52%', left: '10%', top: '64%', background: '#b8b8b8' }} />
      </>
    );
  } else if (photo) {
    inner = (
      <span
        className="absolute inset-0"
        style={{ backgroundImage: `url("${photo.src}")`, backgroundSize: 'cover', backgroundPosition: photo.position ?? 'center' }}
      />
    );
  } else if (author.brand) {
    inner = (
      <span
        className="absolute inset-0 grid place-items-center font-bold text-white"
        style={{ fontSize: size * 0.44, background: `linear-gradient(140deg, hsl(${h} 62% 52%), hsl(${(h + 40) % 360} 66% 40%))` }}
      >
        {author.name.replace(/[^A-Za-z]/g, '').charAt(0)}
      </span>
    );
  } else {
    const skinL = 46 + ((hash >> 9) % 34);
    const skin = `hsl(${22 + ((hash >> 4) % 14)} ${38 + ((hash >> 6) % 18)}% ${skinL}%)`;
    const hair = HAIR[(hash >> 12) % HAIR.length];
    const shirt = `hsl(${(h + 180) % 360} ${30 + ((hash >> 3) % 30)}% ${40 + ((hash >> 7) % 25)}%)`;
    inner = (
      <>
        <span className="absolute rounded-[50%]" style={{ width: '84%', height: '54%', left: '8%', top: '66%', background: shirt }} />
        <span className="absolute rounded-full" style={{ width: '14%', height: '16%', left: '43%', top: '52%', background: skin, filter: 'brightness(.9)' }} />
        <span
          className="absolute rounded-full"
          style={{ width: '40%', height: '44%', left: '30%', top: '18%', background: `radial-gradient(circle at 42% 38%, ${skin}, color-mix(in srgb, ${skin} 78%, #000))` }}
        />
        <span className="absolute" style={{ width: '46%', height: '24%', left: '27%', top: '13%', background: hair, borderRadius: '50% 50% 35% 35%' }} />
      </>
    );
  }

  // One DOM shape for every era: shape is just border-radius, and the story
  // ring is a box-shadow, so a chip can morph from square to circle to ring.
  const ring = shape === 'ring';
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden align-middle ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: wire ? '#dcdcdc' : `linear-gradient(160deg, hsl(${h} 42% 90%), hsl(${(h + 30) % 360} 30% 76%))`,
        boxShadow: ring ? `0 0 0 2px var(--f-surface), 0 0 0 4px ${wire ? '#bdbdbd' : '#d6249f'}` : '0 0 0 0 transparent',
        transition: 'border-radius .6s ease, box-shadow .6s ease',
      }}
    >
      {inner}
    </span>
  );
}

/* ---------------------------------- Media ---------------------------------- */

const KIND_LABEL: Record<NonNullable<FlowMedia['kind']>, string> = {
  photo: 'photo',
  video: 'video',
  reel: 'reel',
  ai: 'ai image',
  meme: 'meme',
  album: 'album',
  product: 'product',
  carousel: 'carousel',
  map: 'map',
  document: 'document',
};

export interface MediaBoxProps {
  watching?: boolean;
  media: FlowMedia;
  wire?: boolean;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
  target?: string;
  /** Reel / video view count, shown in the corner. */
  views?: number;
  children?: ReactNode;
}

function photoBackground(h: number): string {
  return (
    `radial-gradient(ellipse 38% 46% at ${30 + (h % 40)}% 62%, hsl(${(h + 20) % 360} 30% 52% / .55), transparent 70%),` +
    `radial-gradient(circle at 78% 22%, hsl(${(h + 60) % 360} 70% 92% / .9), transparent 38%),` +
    `linear-gradient(180deg, hsl(${(h + 190) % 360} 45% 78%), hsl(${h} 35% 64%) 62%, hsl(${(h + 30) % 360} 30% 46%))`
  );
}

/**
 * Post media at the media's aspect ratio: the real image when `media.src` is
 * set, otherwise a placeholder drawn for its kind. Wireframe mode always draws
 * the placeholder. With guides on, the art-direction note is printed inside,
 * so the feed doubles as a shot list.
 */
export function MediaBox({ media, wire, radius = 0, className, style, target, views, children, watching }: MediaBoxProps) {
  const kind = media.kind ?? 'photo';
  const h = hueOf(media.note);
  const src = wire ? undefined : (media.animatedSrc ?? media.src);
  const playable = !wire && !!media.videoSrc;
  let background: string;
  if (wire) background = 'repeating-linear-gradient(135deg, #e4e4e4 0 10px, #ececec 10px 20px)';
  // Albums render their distinct previews below.
  else if (kind === 'album') background = '#f7f7f7';
  else if (src) background = `url("${src}") center top / cover no-repeat #e5e5e5`;
  else if (kind === 'ai')
    background = `radial-gradient(circle at 30% 25%, hsl(${h} 90% 84%), transparent 55%), radial-gradient(circle at 75% 70%, hsl(${(h + 120) % 360} 85% 72%), transparent 60%), linear-gradient(135deg, hsl(${(h + 200) % 360} 70% 62%), hsl(${(h + 40) % 360} 80% 58%))`;
  else if (kind === 'meme') background = 'linear-gradient(#f7f7f7, #e2e2e2)';
  else if (kind === 'product')
    background = `radial-gradient(ellipse 30% 28% at 50% 50%, hsl(${h} 50% 64%), hsl(${h} 45% 74%) 60%, transparent 63%), radial-gradient(ellipse 34% 7% at 50% 78%, rgba(0,0,0,.16), transparent), linear-gradient(hsl(${h} 25% 95%), hsl(${h} 18% 87%))`;
  else if (kind === 'map')
    background =
      'radial-gradient(ellipse 22% 30% at 72% 30%, #cfe8c6, transparent 70%), radial-gradient(ellipse 30% 18% at 20% 80%, #bcd9f2, transparent 70%),' +
      'linear-gradient(28deg, transparent 47%, #fff 47% 51%, transparent 51%), linear-gradient(-62deg, transparent 58%, #fff 58% 61%, transparent 61%),' +
      'repeating-linear-gradient(0deg, transparent 0 34px, #ffffffaa 34px 36px), repeating-linear-gradient(90deg, transparent 0 46px, #ffffffaa 46px 48px), #e9eef2';
  else if (kind === 'document') background = 'linear-gradient(#f4ecdf, #efe4d2)';
  else background = photoBackground(h);

  return (
    <div
      data-t={target}
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: String(media.aspect), borderRadius: radius, background, ...style }}
    >
      {kind === 'album' && (
        <>
          <div className="absolute inset-x-[5px] top-[5px] bottom-[39px] grid grid-cols-2 grid-rows-2 gap-[4px]">
            {(media.photos ?? [{ src: media.src ?? '', alt: media.note }]).slice(0, 4).map((photo, i) => (
              <div
                key={photo.src || i}
                role="img"
                aria-label={photo.alt}
                className="relative border border-white"
                style={{ background: wire ? '#d8d8d8' : photo.src ? `url("${photo.src}") center top / cover no-repeat` : photoBackground(h) }}
              >
                {i === 3 && !!media.count && media.count > 4 && (
                  <span className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 text-[11px] text-white">+{media.count - 4}</span>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[36px] px-2 py-1 text-[11px] leading-[14px]">
            <div className="font-bold" style={{ color: 'var(--f-accent)' }}>{media.title ?? 'Photo album'}</div>
            <div style={{ color: 'var(--f-muted)' }}>{media.count ?? media.photos?.length ?? 1} photos</div>
          </div>
        </>
      )}
      {kind === 'meme' && !wire && !src && (
        <>
          <div className="absolute inset-x-[8%] top-[7%] h-[8%] rounded-sm bg-black/85" />
          <div className="absolute inset-[22%_18%_24%] rounded" style={{ background: photoBackground(h) }} />
          <div className="absolute inset-x-[14%] bottom-[8%] h-[8%] rounded-sm bg-black/85" />
        </>
      )}
      {kind === 'document' && !src && (
        <div className="absolute inset-[10%] flex flex-col justify-center gap-[6%]">
          <div className="h-[9%] w-[30%] rounded-sm" style={{ background: wire ? '#c8c8c8' : '#c2410c' }} />
          <div className="h-[13%] w-[88%] rounded-sm bg-black/80" />
          <div className="h-[13%] w-[64%] rounded-sm bg-black/80" />
          <div className="mt-[4%] h-[4%] w-[76%] rounded-sm bg-black/25" />
          <div className="h-[4%] w-[58%] rounded-sm bg-black/25" />
        </div>
      )}
      {kind === 'map' && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-white/70 p-1 shadow" style={{ color: '#e53935' }}>
            <Icon name="pin" size={26} filled />
          </span>
        </div>
      )}
      {playable && <PostVideo src={media.videoSrc!} poster={src} label={media.note} duration={media.durationSeconds} watching={watching} />}
      {!playable && (media.animatedSrc || kind === 'video' || kind === 'reel') && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm">
            <Icon name="play" size={26} />
          </span>
        </div>
      )}
      {!playable && !media.animatedSrc && kind === 'video' && (
        <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">0:42</span>
      )}
      {kind === 'reel' && (
        <span className="absolute bottom-3 left-3 flex items-center gap-1 text-[12px] font-semibold text-white drop-shadow">
          <Icon name="play" size={12} /> {views ? compact(views) : ''}
        </span>
      )}
      {(kind === 'carousel' || kind === 'document') && media.count && (
        <>
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            1/{media.count}
          </span>
          {kind === 'carousel' && (
            <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
              {Array.from({ length: Math.min(media.count, 7) }, (_, i) => (
                <span key={i} className="size-1.5 rounded-full" style={{ background: i ? 'rgba(255,255,255,.55)' : '#fff' }} />
              ))}
            </span>
          )}
        </>
      )}
      <div
        className="fl-note absolute inset-x-0 top-0 px-2 py-1.5 font-mono text-[10px] leading-tight text-black/70"
        style={{ background: 'linear-gradient(rgba(255,255,255,.8), rgba(255,255,255,0))' }}
      >
        <span className="font-semibold uppercase tracking-wide">{KIND_LABEL[kind]}</span> · {media.note}
      </div>
      {children}
    </div>
  );
}

export function Verified({ wire }: { wire?: boolean }) {
  return (
    <span
      aria-label="verified"
      className="ml-1 inline-grid size-[13px] place-items-center rounded-full align-[-1px] text-[9px] text-white"
      style={{ background: wire ? '#888' : 'var(--f-accent)' }}
    >
      ✓
    </span>
  );
}
