/**
 * The score: one piano track under the whole film.
 *
 * It starts with the voice (story position 0) and runs on the same clock, so
 * pausing, seeking and scrubbing hear exactly what playback would. It sits
 * softly under every spoken line, then swells once the last one ends (the
 * robotic subscription message), through the heart monitor, to full volume
 * as the end card arrives. The track is cut to the film's length, so its own
 * closing fade carries the end card out.
 */
import narration from '@/data/flow/narration.json';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';

export const MUSIC = {
  src: '/assets/music/sparse-piano-motif.mp3',
  durationSeconds: 139.97,
  /**
   * Bed level under the voice (linear gain, −12 dB): the track sits around
   * −28 LUFS, just under the quietest narration clip (−27 LUFS).
   */
  soft: 0.25,
  /** Level as the end card arrives. */
  loud: 1,
  /** Fade up from silence as the voice starts, in seconds. */
  fadeIn: 1.5,
} as const;

export interface MusicCues {
  /** Story position where the swell starts: the last spoken line has ended. */
  swellFrom: number;
  /** Story position where it peaks: the end card. */
  swellTo: number;
}

export function musicCues(t: Timeline): MusicCues {
  const speech = (narration.reveal.sandboxDurationSeconds + narration.reveal.subscription.durationSeconds) * PLAY_SPEED;
  const card = t.reveal.find((r) => r.phase === 'end');
  const swellTo = card?.s0 ?? t.total;
  return { swellFrom: Math.min(t.revealStart + speech, swellTo), swellTo };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Linear gain at story position `s`. */
export function musicGain(s: number, cues: MusicCues): number {
  const fade = smooth(clamp01(s / (MUSIC.fadeIn * PLAY_SPEED)));
  return fade * musicSwell(s, cues);
}

/** The level at story position `s` without the opening fade: the bed, then the swell. */
export function musicSwell(s: number, cues: MusicCues): number {
  const span = cues.swellTo - cues.swellFrom;
  const x = span > 0 ? clamp01((s - cues.swellFrom) / span) : s >= cues.swellTo ? 1 : 0;
  // Rise in decibels, not amplitude, so the swell sounds even all the way up.
  return MUSIC.soft * (MUSIC.loud / MUSIC.soft) ** smooth(x);
}

/**
 * Web Audio gain for the track: `audio.volume` is ignored on iOS. Without
 * Web Audio (tests, very old browsers) the element's own volume is used.
 */
export function createMusicGain(player: HTMLAudioElement) {
  if (typeof AudioContext === 'undefined') return null;
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0;
  const source = context.createMediaElementSource(player);
  source.connect(gain).connect(context.destination);
  return {
    /** Glide to `value`; `snap` jumps there (used to start from silence). */
    set(value: number, snap = false) {
      const now = context.currentTime;
      if (snap) gain.gain.setValueAtTime(value, now);
      else gain.gain.setTargetAtTime(value, now, 0.06);
    },
    resume: () => context.resume(),
    dispose() {
      source.disconnect();
      void context.close();
    },
  };
}
