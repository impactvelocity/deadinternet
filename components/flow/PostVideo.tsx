'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

/** Keeps the thumbnail visible until a click or the feed's watch action. */
export function PostVideo({ src, poster, label, duration, watching = false }: {
  src: string;
  poster?: string;
  label: string;
  duration?: number;
  watching?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !watching) return;
    // The scripted cursor isn't a trusted browser gesture, so play silently.
    video.muted = true;
    video.currentTime = 0;
    void video.play().catch(() => { /* Keep the play button available. */ });
    return () => video.pause();
  }, [watching]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        playsInline
        controls={false}
        disablePictureInPicture
        aria-label={label}
        className="absolute inset-0 h-full w-full object-cover"
        onPlay={() => { setStarted(true); setFailed(false); }}
        onPause={() => setStarted(false)}
        onEnded={() => setStarted(false)}
        onError={() => { setStarted(false); setFailed(true); }}
      />
        <button
          type="button"
          aria-label={`${started ? 'Pause' : 'Play'} ${label}`}
          className="absolute inset-0 grid cursor-pointer place-items-center focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (!video.paused && !video.ended) {
              video.pause();
              return;
            }
            if (video.ended) video.currentTime = 0;
            video.muted = false;
            if (failed) video.load();
            void video.play().catch(() => setFailed(true));
          }}
        >
          {!started && <span className="grid size-14 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm">
            <Icon name="play" size={26} />
          </span>}
          {!started && duration !== undefined && (
            <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
            </span>
          )}
          {failed && <span role="status" className="absolute inset-x-2 bottom-9 rounded bg-black/75 p-2 text-sm text-white">Video couldn’t play. Click to retry.</span>}
        </button>
    </>
  );
}
