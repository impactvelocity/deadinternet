'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import script from '@/data/flow/narration.json';
import { FILM_ERAS } from '@/data/flow/scenes';
import type { FlowEraId } from '@/data/flow/types';
import { PLAY_SPEED } from '@/lib/flow/playback';
import { createVoiceEffects, opportunityRobotAt } from '@/lib/flow/voice-effects';

/** One player, controlled by the scrubber's transport and voice toggle. Always 1×: the film runs on its clock. */
export function FlowNarration({ era, revealing, playing, enabled, position, eraStart }: {
  era: FlowEraId;
  revealing: boolean;
  playing: boolean;
  enabled: boolean;
  position: RefObject<number>;
  eraStart: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const effects = useRef<ReturnType<typeof createVoiceEffects>>(null);
  const [error, setError] = useState(false);
  const chunk = revealing ? script.reveal : script.chunks.find((item) => item.era === era)!;
  // Preload the next line the film actually plays (some eras may be hidden).
  const nextEra = FILM_ERAS[FILM_ERAS.findIndex((item) => item.id === era) + 1];
  const nextChunk = revealing ? null : (nextEra && script.chunks.find((item) => item.era === nextEra.id)) || script.reveal;

  useEffect(() => {
    const player = audio.current!;
    return () => {
      // Strict Mode replays effects on the same element; keep that graph alive.
      queueMicrotask(() => {
        if (!player.isConnected) {
          effects.current?.dispose();
          effects.current = null;
        }
      });
    };
  }, []);

  useEffect(() => {
    let active = true;
    let raf = 0;
    let requested = false;
    let firstSync = true;
    const player = audio.current!;
    const changed = player.getAttribute('src') !== chunk.src;
    if (changed) {
      player.pause();
      player.src = chunk.src;
      player.currentTime = 0;
    }

    const sync = () => {
      const elapsed = Math.max(0, (position.current - eraStart) / PLAY_SPEED);
      const time = Math.min(chunk.durationSeconds, elapsed);
      // Follow seeks, pause/resume and mute/unmute without restarting the
      // sentence. The ref keeps this out of React's per-frame render path.
      const tolerance = firstSync || player.ended || !playing || !enabled ? 0.001 : 0.2;
      if (Math.abs(player.currentTime - time) > tolerance) player.currentTime = time;
      firstSync = false;
      // Let the last fraction of a second finish naturally if audio started
      // a frame late, without cutting off the end of the sentence.
      const finishing = requested && !player.ended && elapsed < chunk.durationSeconds + 0.2;
      const shouldPlay = enabled && playing && (elapsed < chunk.durationSeconds || finishing);
      if (shouldPlay && !requested) {
        requested = true;
        effects.current ??= createVoiceEffects(player);
            // Resume inside the Play interaction to unlock Web Audio in browsers.
        const resumed = effects.current?.resume();
        void Promise.all([resumed, player.play()]).catch(() => {
          if (active) setError(true);
        });
      } else if (!shouldPlay && requested) {
        player.pause();
        requested = false;
      }
      effects.current?.setRobot(era === 'dead' && !revealing && opportunityRobotAt(time));
    };
    const loop = () => {
      sync();
      raf = requestAnimationFrame(loop);
    };
    // Metadata can arrive after a seek into an unloaded clip.
    player.addEventListener('loadedmetadata', sync);
    loop();
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      player.removeEventListener('loadedmetadata', sync);
      player.pause();
    };
  }, [chunk.src, chunk.durationSeconds, era, revealing, playing, enabled, position, eraStart]);

  return (
    <>
      <audio ref={audio} preload={enabled ? 'auto' : 'none'} onPlaying={() => setError(false)} />
      {enabled && nextChunk && <audio data-flow-audio-preload src={nextChunk.src} preload="auto" aria-hidden />}
      {error && enabled && playing && (
        <p className="fl-narration-error" role="status">Audio couldn’t play. Toggle the voice off and on to retry.</p>
      )}
    </>
  );
}
