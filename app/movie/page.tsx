/**
 * The film as a video: no header or player, just the frame. Click (or press
 * Space) to watch it live; `npm run film` renders it to an MP4 through
 * `?capture` (scripts/render-film.mjs, lib/flow/movie.ts).
 */
import type { Metadata } from 'next';
import { FlowLab } from '@/components/flow/FlowLab';

export const metadata: Metadata = {
  title: 'Dead Internet · the movie',
};

export default function Movie() {
  return <FlowLab movie />;
}
