import narration from '@/data/flow/narration.json';

/** Shared clock for narration and the scroll-driven timeline. */
export const PLAY_SPEED = 640;
/** Extra pause after narration, at 1× playback. Zero transitions immediately. */
export const SCENE_PAUSE_SECONDS = 0;

/**
 * How long an era's scene runs, in seconds: its narration line, plus any
 * silent `tailSeconds` after it (the machine era keeps scrolling on its own).
 */
export function sceneSeconds(era: string): number {
  const chunk = narration.chunks.find((c) => c.era === era) as { durationSeconds: number; tailSeconds?: number } | undefined;
  return chunk ? chunk.durationSeconds + (chunk.tailSeconds ?? 0) : 0;
}
