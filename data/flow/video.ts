/**
 * The film as a plain video, for "Watch as a video" on the start screen.
 * Paste the YouTube link here once it's up (any youtube.com or youtu.be
 * form works). While it's empty, the pop-up says the video is on its way.
 */
export const FILM_VIDEO = {
  youtube: '',
  title: 'Dead Internet, the film',
} as const;

/** The privacy-friendly embed URL for a YouTube link or bare video id, or null if it isn't one. */
export function youtubeEmbed(link: string): string | null {
  const s = link.trim();
  if (!s) return null;
  let id: string | null = /^[\w-]{11}$/.test(s) ? s : null;
  if (!id) {
    try {
      const url = new URL(s);
      const host = url.hostname.replace(/^(www|m)\./, '');
      if (host === 'youtu.be') id = url.pathname.slice(1);
      else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
      }
    } catch {
      return null;
    }
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}
