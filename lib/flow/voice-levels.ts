/**
 * How loud the voice is at any moment, for the ending's light (dots.ts).
 *
 * data/flow/voice-levels.json holds every narration clip's loudness, one
 * digit per 50 ms (scripts/voice-levels.mjs measures them). Through the
 * last line and "Behind the feed", her voice sends light out across the
 * field from her own dot; the robot's subscription message, at the end of
 * the reveal's clip, is everywhere at once instead.
 *
 * Everything runs on story position, like the rest of the film, so the
 * light replays exactly when scrubbing.
 */
import levels from '@/data/flow/voice-levels.json';
import narration from '@/data/flow/narration.json';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

const CLIPS = levels.clips as Record<string, string>;

/** Loudness 0..1 `seconds` into the clip at `src` (eased between steps), 0 outside it or if it wasn't measured. */
export function clipLevel(src: string, seconds: number): number {
  const steps = CLIPS[src];
  if (!steps || !(seconds >= 0)) return 0;
  const f = seconds / levels.stepSeconds;
  const i = Math.floor(f);
  if (i >= steps.length) return 0;
  const a = Number(steps[i]) / 9;
  const b = i + 1 < steps.length ? Number(steps[i + 1]) / 9 : 0;
  const u = f - i;
  return Math.max(0, a + (b - a) * u * u * (3 - 2 * u));
}

export interface VoiceTrack {
  /** Her voice, `clock` seconds after "Behind the feed" (before it: the last era's line). */
  her(clock: number): number;
  /** The robot's subscription message, which ends the reveal's clip. */
  robot(clock: number): number;
  /** When the robot takes over from her, in seconds after "Behind the feed". */
  handover: number;
}

const tracks = new WeakMap<object, VoiceTrack>();

/** The voice under the reveal for this timeline; `lastEra` is the film's last era. */
export function voiceTrack(t: Pick<Timeline, 'eraStarts' | 'revealStart'>, lastEra: string): VoiceTrack {
  const known = tracks.get(t);
  if (known) return known;
  const reveal = narration.reveal;
  const line = narration.chunks.find((c) => c.era === lastEra);
  // How long before "Behind the feed" the last line started.
  const lead = (t.revealStart - (t.eraStarts.at(-1) ?? t.revealStart)) / PLAY_SPEED;
  const handover = reveal.sandboxDurationSeconds;
  const track: VoiceTrack = {
    her: (clock) =>
      clock < 0 ? (line ? clipLevel(line.src, clock + lead) : 0) : clock < handover ? clipLevel(reveal.src, clock) : 0,
    robot: (clock) => (clock >= handover ? clipLevel(reveal.src, clock) : 0),
    handover,
  };
  tracks.set(t, track);
  return track;
}
