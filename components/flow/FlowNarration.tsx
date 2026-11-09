'use client';

import { useEffect, useRef, useState } from 'react';
import script from '@/data/flow/narration.json';
import type { FlowEraId } from '@/data/flow/types';

/** One player, controlled by the scrubber's transport and voice toggle. */
export function FlowNarration({ era, revealing, playing, enabled }: {
  era: FlowEraId;
  revealing: boolean;
  playing: boolean;
  enabled: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState(false);
  const chunk = script.chunks.find((item) => item.era === era)!;

  useEffect(() => {
    let active = true;
    const player = audio.current!;
    const changed = player.getAttribute('src') !== chunk.src;
    if (changed) {
      player.pause();
      player.src = chunk.src;
      player.currentTime = 0;
    }
    if (enabled && playing && !revealing) {
      if (player.ended) player.currentTime = 0;
      void player.play().catch(() => {
        if (active) setError(true);
      });
    } else player.pause();
    return () => { active = false; player.pause(); };
  }, [chunk.src, revealing, playing, enabled]);

  return (
    <>
      <audio ref={audio} preload="none" onPlaying={() => setError(false)} />
      {error && enabled && playing && !revealing && (
        <p className="fl-narration-error" role="status">Audio couldn’t play. Toggle the voice off and on to retry.</p>
      )}
    </>
  );
}
