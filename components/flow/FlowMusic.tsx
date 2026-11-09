'use client';
/**
 * The piano score, on the story clock: it starts with the voice, follows
 * pause and seeking, and follows the sound toggle. Levels live in
 * `lib/flow/music.ts`. When the film reaches its end the last notes ring out
 * instead of stopping with the playhead.
 */
import { type RefObject, useEffect, useRef } from 'react';
import { createMusicGain, MUSIC, musicGain, type MusicCues } from '@/lib/flow/music';
import { PLAY_SPEED } from '@/lib/flow/playback';

export function FlowMusic({ playing, enabled, position, cues, total, level: levelAt }: {
  playing: boolean;
  enabled: boolean;
  /** Story position (scroll px); 0 is where the voice starts. */
  position: RefObject<number>;
  /** Null until the timeline is compiled. */
  cues: MusicCues | null;
  /** Story length; reaching it ends the film. */
  total: number;
  /** Level at `position` instead of the story's (the movie starts the score under its titles). */
  level?: (position: number) => number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const gain = useRef<ReturnType<typeof createMusicGain>>(null);
  // Survives the effect re-running on every play/pause.
  const state = useRef({ requested: false, ringing: false, wasPlaying: false });

  useEffect(() => {
    const player = audio.current!;
    const st = state.current;
    return () => {
      player.pause();
      st.requested = false;
      st.ringing = false;
      // Strict Mode replays effects on the same element; keep its graph alive.
      queueMicrotask(() => {
        if (!player.isConnected) {
          gain.current?.dispose();
          gain.current = null;
        }
      });
    };
  }, []);

  useEffect(() => {
    const player = audio.current!;
    const st = state.current;
    let raf = 0;
    const sync = () => {
      const s = position.current;
      const time = Math.min(MUSIC.durationSeconds, Math.max(0, s / PLAY_SPEED));
      const atEnd = total > 0 && s >= total - 1;
      if (st.wasPlaying && !playing) st.ringing = st.requested && atEnd;
      st.wasPlaying = playing;
      if (playing || !enabled || !atEnd || player.ended) st.ringing = false;
      if (!st.ringing) {
        // Follow seeks and scrubbing; while playing, only correct real drift.
        const tolerance = playing ? 0.25 : 0.001;
        if (Math.abs(player.currentTime - time) > tolerance) player.currentTime = time;
      }
      const shouldPlay = enabled && cues !== null && ((playing && time < MUSIC.durationSeconds) || st.ringing);
      if (shouldPlay && !st.requested) {
        st.requested = true;
        if (!gain.current) {
          gain.current = createMusicGain(player);
          // The graph sets the level from here on; don't stack it on the element's.
          if (gain.current) player.volume = 1;
        }
        // Start from silence and glide up, so resuming mid-film never clicks.
        gain.current?.set(0, true);
        // Called from the Play interaction, which unlocks Web Audio in browsers.
        void Promise.all([gain.current?.resume(), player.play()]).catch(() => {});
      } else if (!shouldPlay && st.requested) {
        player.pause();
        st.requested = false;
      }
      const level = !cues ? 0 : levelAt ? levelAt(s) : musicGain(s, cues);
      if (gain.current) gain.current.set(level);
      // Only without Web Audio (until Play creates the graph, leave the element at full volume).
      else if (typeof AudioContext === 'undefined') player.volume = Math.min(1, level);
    };
    const loop = () => {
      sync();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [playing, enabled, position, cues, total, levelAt]);

  return <audio ref={audio} data-flow-music src={MUSIC.src} preload={enabled ? 'auto' : 'none'} aria-hidden />;
}
