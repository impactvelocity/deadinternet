'use client';
/**
 * The one interactive piece of the phone page: the film as a video.
 */
import { useState } from 'react';
import { FILM_VIDEO, youtubeEmbed } from '@/data/flow/video';

const PLAY_PATH = 'M8.5 6.3v11.4c0 .9 1 1.5 1.8 1l9-5.7c.7-.4.7-1.5 0-1.9l-9-5.7c-.8-.5-1.8.1-1.8.9z';

/**
 * The film's poster with a play button; the player (and anything from
 * YouTube) only loads once it's pressed, and starts playing straight away.
 */
export function StoryVideo() {
  const [playing, setPlaying] = useState(false);
  const embed = youtubeEmbed(FILM_VIDEO.youtube);
  return (
    <div className="ms-video">
      {playing && embed ? (
        <iframe
          src={embed}
          title={FILM_VIDEO.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="ms-video-poster" onClick={() => setPlaying(true)} disabled={!embed} aria-label="Play the film">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/story/poster.jpg" alt="" width={1280} height={853} loading="lazy" decoding="async" />
          {embed ? (
            <span className="ms-video-play">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
                <path d={PLAY_PATH} fill="currentColor" />
              </svg>
              Watch the film <span>{FILM_VIDEO.runtime}</span>
            </span>
          ) : (
            <span className="ms-video-label">The video is on its way</span>
          )}
        </button>
      )}
    </div>
  );
}
