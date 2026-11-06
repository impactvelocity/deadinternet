/**
 * A small line-icon set for the /flow lab (24×24, stroke = currentColor).
 * Simple generic shapes drawn for this project.
 */
import type { CSSProperties } from 'react';

const PATHS = {
  like: 'M7 11v9H4v-9h3zm0 0 3.6-7.2c1.2 0 2.4 1 2.4 2.4V10h5.3a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17 20H7',
  comment: 'M20.5 11.5a8 8 0 0 1-11.7 7.1L4 19.8l1.2-4.4A8 8 0 1 1 20.5 11.5z',
  share: 'M13 5l7 6.5-7 6.5M20 11.5H10a6 6 0 0 0-6 6V19',
  send: 'M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z',
  heart: 'M12 20s-7.2-4.4-9.2-9A5 5 0 0 1 12 6.6 5 5 0 0 1 21.2 11c-2 4.6-9.2 9-9.2 9z',
  repost: 'M17 3l3 3-3 3M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M7 21l-3-3 3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4',
  bookmark: 'M6.5 3.5h11v17L12 16.5l-5.5 4v-17z',
  bell: 'M18 15.5V11a6 6 0 1 0-12 0v4.5L4 18h16l-2-2.5zM10 21h4',
  inbox: 'M3.5 5.5h17v13h-17zM3.5 6.5 12 13l8.5-6.5',
  users: 'M15 20v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20M8.7 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6',
  play: 'M8 5.5v13l10.5-6.5z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  document: 'M7 3h7l5 5v13H7V3zM14 3v5h5M10 13h6M10 17h6',
  music: 'M9 18V5.5L20 3.5V16M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus: 'M12 5v14M5 12h14',
  gift: 'M20 12v8.5H4V12M2.5 7.5h19V12h-19zM12 20.5v-13M12 7.5H8a2.3 2.3 0 1 1 0-4.5c2.8 0 4 4.5 4 4.5zm0 0h4a2.3 2.3 0 1 0 0-4.5c-2.8 0-4 4.5-4 4.5z',
  poll: 'M5 20V11M12 20V4M19 20v-6',
  briefcase: 'M3.5 8h17v11.5h-17zM9 8V5.5h6V8M3.5 13h17',
  code: 'M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15',
  reel: 'M4.5 4.5h15v15h-15zM4.5 9h15M9 4.5 11 9M14 4.5 16 9M10.5 12.5v4.5l4-2.25z',
  back: 'M19 12H5M11 18l-6-6 6-6',
  forward: 'M5 12h14M13 6l6 6-6 6',
  reload: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  home: 'M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M6 9l6 6 6-6',
  kebab: 'M12 5h.01M12 12h.01M12 19h.01',
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: ReadonlySet<IconName> = new Set<IconName>(['play']);

export function Icon({
  name,
  size = 18,
  filled,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const fill = filled || FILLED.has(name);
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ flexShrink: 0, ...style }}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'more' || name === 'kebab' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
